-- 048_app_health_events.sql
-- Canal de diagnóstico do app: o cliente registra "isto precisa de atenção do desenvolvedor".
-- Spec: specs/app-health-events.md · Decisão: docs/decisions/007-app-health-events.md
--
-- ⚠️ ORDEM DE RELEASE — leia antes de aplicar.
-- Esta migration é ADITIVA e NÃO quebra clientes em campo: 1.0.0 e 1.1.0 nunca referenciam esta
-- tabela. Ela NÃO pertence ao lote do cutover pelo motivo do 043_drop_collection_config.sql, que é
-- perigo; ela está adiada por ESCOLHA DE ROLLOUT do usuário (2026-08-17): aplicar só em staging
-- por enquanto.
-- Consequência que precisa ser lembrada: em staging não se importa PDF real, então o canal fica
-- INERTE até chegar em produção. **Aplicar esta migration em produção é item do cutover v2.**
--
-- Motivação: o import de PDF cai num fallback silencioso quando a grade desenhada da tabela do LCR
-- não explica o documento. Sem este canal, uma mudança de layout do relatório degrada o import e
-- ninguém fica sabendo até um secretário estranhar um nome.

CREATE TABLE app_health_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ward_id UUID NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  -- Tipo do evento, do emissor. Texto livre de propósito: o canal nasce genérico e o import de PDF
  -- é só o primeiro emissor; enum obrigaria uma migration por evento novo.
  event_type TEXT NOT NULL,
  -- Payload específico do emissor. ⚠️ SOMENTE números e valores de conjunto fechado. Nunca texto
  -- extraído de um PDF: o relatório do LCR que motiva este canal carrega nome, telefone, e-mail e
  -- data de nascimento de membros reais. O cliente filtra (src/lib/appHealth.ts); aqui fica o
  -- registro do porquê.
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  app_version TEXT,
  platform TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A consulta é sempre "o que aconteceu recentemente", e a poda varre por data.
CREATE INDEX idx_app_health_events_created_at ON app_health_events(created_at DESC);
CREATE INDEX idx_app_health_events_type ON app_health_events(event_type, created_at DESC);

ALTER TABLE app_health_events ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS
-- =============================================================================
-- INSERT: qualquer usuário autenticado, para a PRÓPRIA ala.
--
-- ⚠️ A AUSÊNCIA de public.can_write() AQUI É DELIBERADA — não é esquecimento, e contraria de
-- propósito o padrão que ADR-005 estabeleceu para todas as outras tabelas de ala.
-- Um canal de diagnóstico que exige permissão de escrita perde exatamente os relatos vindos de
-- telas que um `observer` usa, que são os mais difíceis de reproduzir. O risco aceito é um usuário
-- autenticado inserir lixo na própria ala; numa tabela que ninguém lê pelo app, isso é ruído, não
-- dano. Se um dia isto for "corrigido" para incluir can_write(), o canal emudece em silêncio para
-- uma parte dos usuários.
CREATE POLICY "Users can insert ward health events"
  ON app_health_events FOR INSERT TO authenticated
  WITH CHECK (ward_id = public.current_ward_id());

-- Sem policy de SELECT, UPDATE ou DELETE, de propósito: com RLS ativo e nenhuma policy, o PostgREST
-- não devolve nem altera nada para cliente algum, em qualquer papel. A leitura é exclusiva do
-- service_role (Management API), que é como o desenvolvedor consulta o banco. É também o que impede
-- este diagnóstico de vazar para a tela de histórico da ala.
--
-- ⚠️ CONSEQUÊNCIA QUE MORDE: sem policy de SELECT, um `INSERT ... RETURNING` é RECUSADO — o Postgres
-- aplica as policies de SELECT à cláusula RETURNING. No cliente isso significa que a escrita NÃO
-- pode pedir a linha de volta: `.insert(...)` sozinho funciona, `.insert(...).select()` falha sempre.
-- E falha da pior maneira, porque o report é fire-and-forget: o erro é engolido, o canal fica mudo,
-- e nada indica isso. Verificado contra staging em 2026-08-17 — foi assim que descobri.

-- =============================================================================
-- PODA — 180 dias
-- =============================================================================
-- Mesmo padrão de 045_auto_revoke_expired_invitations.sql: a função existe sempre, e o agendamento
-- só acontece onde pg_cron está instalado; caso contrário agenda-se pelo dashboard do Supabase.
CREATE OR REPLACE FUNCTION public.prune_app_health_events()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM app_health_events WHERE created_at < now() - INTERVAL '180 days';
$$;

-- Só um job agendado (postgres/service role) deve invocar.
REVOKE EXECUTE ON FUNCTION public.prune_app_health_events() FROM public;
REVOKE EXECUTE ON FUNCTION public.prune_app_health_events() FROM anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('prune-app-health-events')
    WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'prune-app-health-events'
    );
    PERFORM cron.schedule(
      'prune-app-health-events',
      '30 4 * * *',
      $cron$SELECT public.prune_app_health_events();$cron$
    );
  END IF;
END;
$$;
