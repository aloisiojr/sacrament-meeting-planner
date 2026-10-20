-- =============================================================================
-- PREFLIGHT DO CUTOVER — colisões de nome ator→membro (CONF-06)
-- READ-ONLY: este script só executa SELECT. Não cria extensão, não escreve nada.
-- =============================================================================
-- Por quê: a migration 037 casa meeting_actors com members por
--   lower(trim(a.name)) = lower(trim(m.full_name))
-- SEM normalizar acento. Em alas pt/es, "José" e "Jose" são tratados como pessoas
-- diferentes: o ator sem match exato vira um membro duplicado (ou casa com o membro
-- errado quando há homônimos). Este relatório lista, ANTES do lote destrutivo, os
-- pares que colidem quando acento/caixa são normalizados — para saneamento manual
-- (mesclar/renomear membros) enquanto meeting_actors ainda existe.
--
-- Pré-condição: rodar ANTES da 037 (ela dropa meeting_actors). Num ambiente onde a
-- 037 já rodou (ex.: staging atual), as consultas A/C falham com "relation does not
-- exist" — esperado; a consulta B continua útil. Em produção (037 pendente) roda inteiro.
-- Como rodar: SQL Editor do Supabase (staging primeiro, produção na janela), ou
--   psql "$DATABASE_URL" -f scripts/cutover/preflight-name-collisions.sql
-- Resultado esperado num ambiente são: ZERO linhas nas duas consultas. Qualquer
-- linha é um item de saneamento com checkbox no CUTOVER_RUNBOOK (passo pré-lote).
--
-- Normalização: usa unaccent() se a extensão existir NESTE banco; senão cai para um
-- translate() dos acentos latinos comuns (pt/es). O script NÃO cria a extensão
-- (CREATE EXTENSION seria escrita e exige permissão) — a escolha é detectada aqui.
-- =============================================================================

-- A normalização usada nas duas consultas (repita-a ao conferir um par à mão):
--   lower(trim(translate(name, 'ÀÁÂÃÄÅàáâãäåÈÉÊËèéêëÌÍÎÏìíîïÒÓÔÕÖòóôõöÙÚÛÜùúûüÇçÑñÝýÿ', 'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNnYyy')))
-- (ou lower(trim(unaccent(name))) onde a extensão unaccent estiver instalada).

-- -----------------------------------------------------------------------------
-- Consulta A — ator casa, após normalizar, com 2+ membros distintos da mesma ala:
-- a 037 aplicaria as flags no primeiro/erraria o alvo; saneie antes (mesclar os
-- membros ou corrigir o nome do ator/membro para o match exato pretendido).
-- -----------------------------------------------------------------------------
SELECT
  a.ward_id,
  a.name AS actor_name,
  count(DISTINCT m.id) AS matching_members,
  string_agg(DISTINCT m.full_name, ' | ' ORDER BY m.full_name) AS member_names
FROM meeting_actors a
JOIN members m
  ON m.ward_id = a.ward_id
 AND lower(trim(translate(m.full_name,
       'ÀÁÂÃÄÅàáâãäåÈÉÊËèéêëÌÍÎÏìíîïÒÓÔÕÖòóôõöÙÚÛÜùúûüÇçÑñÝýÿ',
       'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNnYyy')))
     = lower(trim(translate(a.name,
       'ÀÁÂÃÄÅàáâãäåÈÉÊËèéêëÌÍÎÏìíîïÒÓÔÕÖòóôõöÙÚÛÜùúûüÇçÑñÝýÿ',
       'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNnYyy')))
GROUP BY a.ward_id, a.name
HAVING count(DISTINCT m.id) > 1
ORDER BY a.ward_id, a.name;

-- -----------------------------------------------------------------------------
-- Consulta B — membros da MESMA ala cujos nomes colidem após normalizar (e que a
-- 037 trata como pessoas distintas hoje): candidatos a duplicado já existente ou a
-- homônimo real — confira um a um; a 037 não os mescla, mas o saneamento evita que
-- um ator novo case com o errado.
-- -----------------------------------------------------------------------------
SELECT
  ward_id,
  lower(trim(translate(full_name,
    'ÀÁÂÃÄÅàáâãäåÈÉÊËèéêëÌÍÎÏìíîïÒÓÔÕÖòóôõöÙÚÛÜùúûüÇçÑñÝýÿ',
    'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNnYyy'))) AS normalized_name,
  count(*) AS members_with_this_name,
  string_agg(full_name, ' | ' ORDER BY full_name) AS stored_names,
  string_agg(id::text, ', ' ORDER BY full_name) AS member_ids
FROM members
GROUP BY ward_id, normalized_name
HAVING count(*) > 1
ORDER BY ward_id, normalized_name;

-- -----------------------------------------------------------------------------
-- Consulta C (informativa) — atores SEM nenhum match normalizado: a 037 criará um
-- membro novo para cada um (comportamento esperado para quem não é membro; confira
-- se não é só acento/caixa divergente de um membro existente).
-- -----------------------------------------------------------------------------
SELECT a.ward_id, a.name AS actor_name, a.role
FROM meeting_actors a
WHERE NOT EXISTS (
  SELECT 1 FROM members m
  WHERE m.ward_id = a.ward_id
    AND lower(trim(translate(m.full_name,
          'ÀÁÂÃÄÅàáâãäåÈÉÊËèéêëÌÍÎÏìíîïÒÓÔÕÖòóôõöÙÚÛÜùúûüÇçÑñÝýÿ',
          'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNnYyy')))
        = lower(trim(translate(a.name,
          'ÀÁÂÃÄÅàáâãäåÈÉÊËèéêëÌÍÎÏìíîïÒÓÔÕÖòóôõöÙÚÛÜùúûüÇçÑñÝýÿ',
          'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNnYyy')))
)
ORDER BY a.ward_id, a.name;
