-- Migration 057: barreira server-side do cutover (DEC-08, spec specs/cutover-gate.md).
--
-- ⚠️ ORDEM DE RELEASE — leia antes de aplicar.
-- Esta migration é ADITIVA e nasce DESLIGADA: enquanto `app_config.writes_blocked_below`
-- for NULL, `public.app_write_allowed()` devolve TRUE sempre e as policies RESTRICTIVE
-- abaixo não negam escrita alguma — o comportamento é idêntico ao atual para todo
-- cliente em campo (1.0.0, 1.1.0, 2.0.0). A barreira só passa a existir quando o dono,
-- NA JANELA DO CUTOVER (gate 1.1.0 ativo → 2.0.0 publicado → min_supported_version em
-- 2.0.0 → só então migrations que quebram a 1.x), ligar explicitamente:
--   UPDATE app_config SET writes_blocked_below = '2.0.0' WHERE id = 1;
-- Desligar de novo (rollback da barreira, sem restore): SET writes_blocked_below = NULL.
--
-- O que ela faz quando ligada: escrita (INSERT/UPDATE/DELETE) via PostgREST de cliente
-- cuja versão do app (header `x-app-version`, enviado por src/lib/supabase.ts) é menor
-- que `writes_blocked_below` é recusada pelas policies RESTRICTIVE. Sem header ou com
-- header ilegível = PERMITIDO, de propósito: clientes anteriores ao header (o 1.0.0 sem
-- gate, o rabo conhecido do cutover) não podem ser barrados por uma versão que eles
-- nem declaram, e quebrá-los ANTES da janela seria o pior dos mundos. service_role tem
-- BYPASSRLS e nunca é afetado: edge functions e crons seguem escrevendo.
--
-- `app_config` JÁ EXISTE (036, singleton por colunas, semeada com o valor atual do
-- gate; a edge function `app-config` já lê `min_supported_version` dela — fonte única).
-- Esta migration ALTERA/ESTENDE a tabela; não a recria.

-- =============================================================================
-- CONFIG: nova chave da barreira (NULL = desligada)
-- =============================================================================
ALTER TABLE app_config ADD COLUMN IF NOT EXISTS writes_blocked_below TEXT;

-- As chaves de gate são públicas por desenho (o endpoint `app-config` é público e o
-- gate roda antes do login): leitura liberada também para `anon`. Escrita segue sem
-- policy alguma para anon/authenticated — só service_role escreve (036).
DROP POLICY IF EXISTS app_config_select_anon ON app_config;
CREATE POLICY app_config_select_anon ON app_config
  FOR SELECT TO anon USING (true);

-- =============================================================================
-- FUNÇÃO: esta escrita é permitida na janela do cutover?
-- =============================================================================
-- Lê a versão que o PostgREST expõe em `request.headers` (JSON; chaves em minúsculas).
-- Comparação semver numérica major.minor.patch, sufixos -/+ ignorados — espelha
-- src/lib/semver.ts. Qualquer dúvida (sem setting, JSON inválido, sem header, versão
-- ilegível, barreira desligada) = permitido: a função só nega com prova de versão velha.
CREATE OR REPLACE FUNCTION public.app_write_allowed()
RETURNS boolean AS $$
DECLARE
  headers jsonb;
  raw_version text;
  barrier text;
  version_parts text[];
  barrier_parts text[];
  i int;
  v_num int;
  b_num int;
BEGIN
  SELECT writes_blocked_below INTO barrier FROM app_config WHERE id = 1;
  IF barrier IS NULL THEN
    RETURN true;
  END IF;

  BEGIN
    headers := current_setting('request.headers', true)::jsonb;
  EXCEPTION WHEN others THEN
    RETURN true;
  END;
  IF headers IS NULL THEN
    RETURN true;
  END IF;

  raw_version := headers ->> 'x-app-version';
  IF raw_version IS NULL OR btrim(raw_version) = '' THEN
    RETURN true;
  END IF;

  version_parts := string_to_array(split_part(split_part(raw_version, '-', 1), '+', 1), '.');
  barrier_parts := string_to_array(split_part(split_part(barrier, '-', 1), '+', 1), '.');

  FOR i IN 1..3 LOOP
    BEGIN
      v_num := COALESCE(NULLIF(version_parts[i], '')::int, 0);
      b_num := COALESCE(NULLIF(barrier_parts[i], '')::int, 0);
    EXCEPTION WHEN others THEN
      RETURN true; -- versão ilegível não é prova de versão velha
    END;
    IF v_num < b_num THEN
      RETURN false;
    END IF;
    IF v_num > b_num THEN
      RETURN true;
    END IF;
  END LOOP;
  RETURN true; -- igual à barreira = permitido (a barreira é "abaixo de")
END;
$$ LANGUAGE plpgsql STABLE
SET search_path = '';

-- Policies chamam a função a cada escrita; o chamador precisa de EXECUTE (default PUBLIC
-- já cobre, mantido explícito de propósito — diferente das funções de poda de 045/048,
-- esta é feita para ser invocada no caminho de escrita de qualquer cliente).
GRANT EXECUTE ON FUNCTION public.app_write_allowed() TO anon, authenticated;

-- =============================================================================
-- POLICIES RESTRICTIVE: somam-se (AND) às policies existentes, sem reescrevê-las.
-- Tabelas de dados da ala existentes no ponto do cutover (pós 037/043: meeting_actors e
-- ward_collection_config já não existem e não são tocadas). Fora por desenho:
--   - app_config: escrita já é service-only;
--   - app_health_events: canal de diagnóstico com INSERT aberto deliberado (ADR-007) —
--     barrá-lo emudeceria justamente os relatos dos clientes velhos durante a janela;
--   - general_collections/general_topics: catálogos globais de leitura.
-- =============================================================================
-- Só escrita (INSERT/UPDATE/DELETE): leitura nunca é barrada. Uma policy por comando
-- (RESTRICTIVE não aceita agrupar comandos sem cair no FOR ALL, que incluiria SELECT).
-- O laço mantém a lista de tabelas num lugar só; cada policy é drop-if-exists + create.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'wards', 'members', 'ward_topics', 'sunday_exceptions', 'speeches', 'hymns',
    'sunday_agendas', 'activity_log', 'invitations', 'device_push_tokens',
    'notification_queue'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS cutover_write_barrier_insert ON %I', t);
    EXECUTE format(
      'CREATE POLICY cutover_write_barrier_insert ON %I AS RESTRICTIVE FOR INSERT '
      'TO authenticated WITH CHECK (public.app_write_allowed())', t);
    EXECUTE format('DROP POLICY IF EXISTS cutover_write_barrier_update ON %I', t);
    EXECUTE format(
      'CREATE POLICY cutover_write_barrier_update ON %I AS RESTRICTIVE FOR UPDATE '
      'TO authenticated USING (public.app_write_allowed()) '
      'WITH CHECK (public.app_write_allowed())', t);
    EXECUTE format('DROP POLICY IF EXISTS cutover_write_barrier_delete ON %I', t);
    EXECUTE format(
      'CREATE POLICY cutover_write_barrier_delete ON %I AS RESTRICTIVE FOR DELETE '
      'TO authenticated USING (public.app_write_allowed())', t);
  END LOOP;
END $$;
