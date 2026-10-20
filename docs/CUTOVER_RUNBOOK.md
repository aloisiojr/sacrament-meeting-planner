# Runbook do cutover v2 — executável, na ordem do CLAUDE.md

> A ordem **não é negociável**: gate 1.1.0 ativo → publicar 2.0.0 → subir
> `min_supported_version` para `2.0.0` → **só então** aplicar as migrations que
> quebram a 1.x. Aplicar o lote destrutivo antes disso quebra todo cliente em
> campo sem mensagem. Spec: `specs/cutover-gate.md` (CONF-06/08/12, DEC-08).
>
> Convenções: `[ ]` = checkbox executado por uma pessoa, na ordem. Cada passo tem
> critério de **abortar/rollback**. Nada aqui foi executado pela wave 4B — este
> runbook é o artefato ensaiável; staging é o palco do ensaio.

## Passo 0 — Pré-condições (todas, antes de qualquer escrita)

- [ ] **Gate 1.1.0 ativo de verdade:** conferir em produção que clientes 1.1.0 têm o
  gate (`useVersionGate` + edge `app-config`) e que o valor vigente é o esperado:
  `SELECT min_supported_version, latest_version, writes_blocked_below FROM app_config WHERE id = 1;`
  (esperado antes da janela: `writes_blocked_below IS NULL` — barreira desligada, 057).
- [ ] **Conjunto aplicado conferido no banco, não nos arquivos:** o conjunto aplicado
  não é rastreado no repo. Listar as migrations aplicadas em produção
  (`supabase migration list` ou o histórico do projeto) e anotar aqui: ______.
  Este runbook assume pendentes 049–059 + o lote destrutivo; ajuste os lotes ao real.
- [ ] **Deploy key / EAS:** acesso EAS válido e perfil `production` conferido em
  `eas.json` — **sem** disparar build ainda (passo 3). Lembrar: grupos internos de
  TestFlight recebem todo build automaticamente; o build de produção só sobe na janela.
- [ ] **`CRON_SECRET` configurado** nos dois ambientes e os jobs de dashboard
  enviando o header `x-cron-secret` (CONF-03; ver `supabase/functions/README.md`):
  `process-notifications` (5 min) e `push-update-nudge`. Sem o header, ambos dão 401
  e o push para em silêncio — conferir o log de uma execução de cada job.
- [ ] **Checklist de crons pendentes do PROGRESS fechado ou agendado:**
  - [ ] `pg_cron` **não está instalado no staging**: a poda de `app_health_events`
    (048) existe mas **não está agendada** — agendar pelo dashboard
    (`SELECT public.prune_app_health_events();`, `30 4 * * *`) ou instalar `pg_cron`
    e deixar a 059 agendar. Em produção, idem até a 059 rodar com `pg_cron` presente.
  - [ ] Cron do **push-update-nudge** existe no dashboard (agendamento + header
    `x-cron-secret`) — ele não é agendado por migration (059 cobre só o que é SQL e,
    com `pg_net` + settings, o `process-notifications`).
  - [ ] Se a 059 emitir `RAISE NOTICE` de peça faltando (`pg_cron`/`pg_net`/settings),
    o item correspondente acima vira obrigatório manual — anotar o notice: ______.
- [ ] **Janela marcada e comunicada:** horário de baixo uso; usuários avisados de que
  o app pedirá atualização. Rabo conhecido: quem está em **1.0.0 não tem gate** e
  simplesmente quebra no passo 5 — medir o tamanho desse rabo (tokens
  `device_push_tokens.app_version`) antes de decidir prosseguir: `______` aparelhos.

**Abortar se:** qualquer item acima falhar. Nada foi escrito; reagende.

## Passo 1 — Backup e RESTORE ensaiado (o restore é o plano B)

- [ ] Backup/snapshot de produção tirado **agora** (dashboard Supabase → Database →
  Backups, ou `pg_dump`); anotar id/hora: ______.
- [ ] **Ensaio de restore em staging (obrigatório, não opcional):** restaurar o
  backup num projeto/branch de ensaio e abrir o checklist de sanidade nele —
  login, lista de membros, agenda do próximo domingo renderizam. Um backup nunca
  restaurado é uma hipótese, não um plano B.
- [ ] Tempo de restore medido: ______ min (é o seu RTO se o passo 5 falhar).

**Abortar se:** o restore do ensaio falhar ou o backup não puder ser confirmado.

## Passo 2 — Saneamento pré-lote (READ-ONLY)

- [ ] Rodar `scripts/cutover/preflight-name-collisions.sql` em produção (só SELECT).
  Consultas A/B com **zero linhas** para prosseguir; C é informativa.
- [ ] Cada linha de A/B saneada à mão (mesclar membros duplicados / corrigir nome
  para o match exato pretendido) e o relatório reexecutado até zerar A/B.
  A 037 casa por `lower(trim(name))` sem normalizar acento: sem este passo,
  "José"×"Jose" vira membro duplicado em alas pt/es.

**Abortar se:** restar colisão sem decisão registrada. Nada destrutivo rodou ainda.

## Passo 3 — Lote aditivo (não quebra ninguém) + publicar 2.0.0

Aplicar **na ordem numérica** as migrations pendentes aditivas/seguras — conforme o
conjunto conferido no passo 0, tipicamente: **049, 050, 051, 052** (waves anteriores),
**053, 054, 055, 056** (4A), **057, 058, 059** (4B). (037/040/041/043 **não** entram
aqui — são o passo 5.)

- [ ] Aplicadas uma a uma; após cada uma, smoke mínimo do passo 4 antes da próxima.
- [ ] Edge functions atualizadas deployadas (`app-config` já lê `app_config`; as três
  públicas ganham o freio da CONF-12 junto da 058).
- [ ] **Publicar o 2.0.0** nas lojas (build `production`) e confirmar a versão
  disponível para atualização.

**Smoke (passo 4 vale aqui):** app 1.1.0 e 2.0.0 abrem, leem e escrevem (a barreira
está desligada: escrita de qualquer versão continua passando — se um 1.1.0 for
recusado aqui, PARE: a 057 foi ligada por engano, `SET writes_blocked_below = NULL`).
**Rollback deste passo:** migrations aditivas não se desfazem — o rollback é não
prosseguir; nenhuma quebra cliente em campo por desenho.

## Passo 4 — Smoke tests pós-lote (repetir após cada lote)

- [ ] Login + abertura da agenda do próximo domingo (1.1.0 e 2.0.0).
- [ ] Escrita real: criar/editar um discurso de teste e confirmar no banco.
- [ ] Push: enfileirar uma notificação de teste e ver `process-notifications`
  processá-la (status sai de `pending`).
- [ ] `SELECT event_type, count(*) FROM app_health_events WHERE created_at > now() - INTERVAL '1 hour' GROUP BY 1;`
  — sem tipo novo inesperado (baseline anotada: ______).

## Passo 5 — Virada do gate, barreira e lote destrutivo

Nesta ordem, sem pular:

- [ ] **Ativar a barreira DEC-08:**
  `UPDATE app_config SET writes_blocked_below = '2.0.0' WHERE id = 1;`
  Smoke: com um aparelho 1.1.0, uma escrita deve ser recusada (e a leitura, não);
  com 2.0.0, escrever normalmente. (Sem header/`service_role` não são barrados —
  desenho registrado na 057.)
- [ ] **Subir o mínimo:** `UPDATE app_config SET min_supported_version = '2.0.0' WHERE id = 1;`
  Smoke: 1.1.0 cai na `UpdateRequiredScreen`; 2.0.0 entra. O nudge
  (`push-update-nudge`) passa a alcançar quem ficou para trás.
- [ ] Aguardar a janela de propagação definida no passo 0 (sugestão: ≥ 24 h com o
  gate barrando, monitorando o passo 6) — **só então** o lote destrutivo:
  **037, 040, 041, 043, nesta ordem**, uma a uma, smoke do passo 4 entre elas.
  037 primeiro consome `meeting_actors`; 043 por último (drop de coleções).

**Critérios de abortar/rollback por sub-passo:**
- Barreira recusando 2.0.0 ou liberando escrita 1.1.0 → `SET writes_blocked_below = NULL`
  (rollback instantâneo da barreira, sem restore) e investigar antes de religar.
- Gate não barrando 1.1.0 após subir o mínimo → voltar `min_supported_version` ao
  valor anterior; o lote destrutivo **não** começa.
- Qualquer migration do lote destrutivo falhando no meio ou smoke reprovado →
  **restore do backup do passo 1** (037/041/043 dropam colunas/tabelas: não há
  rollback SQL). Aceita-se perder o escrito entre o backup e o restore — é o custo
  registrado da janela; por isso o lote roda colado no gate/barreira.

## Passo 6 — Monitoramento pós-cutover (primeiras 72 h)

- [ ] `app_health_events` a cada poucas horas:
  `SELECT event_type, count(*) FROM app_health_events WHERE created_at > now() - INTERVAL '24 hours' GROUP BY 1 ORDER BY 2 DESC;`
  — crescimento anômalo de um tipo novo = investigar antes de declarar sucesso.
- [ ] Fila de push sem acúmulo: `notification_queue` com `pending`/`failed` velhos
  parados = cron/`CRON_SECRET` quebrado (401 em silêncio) — conferir os jobs.
- [ ] Rabo 1.0.0: aparelhos que sumiram vs. atualizaram (`device_push_tokens.app_version`).
- [ ] Encerrar a janela: registrar neste arquivo data/hora de cada passo, desvios e
  o destino do backup do ensaio. Apagar o projeto de ensaio do restore.

## Pendências que este runbook não executa (estacionadas por credencial)

Aplicação real em staging/produção, configuração do `CRON_SECRET`, builds EAS e
provas com JWT/dispositivo pertencem ao dono na janela — a wave 4B entregou este
runbook, o preflight READ-ONLY, as migrations 057–059 (não aplicadas) e os freios
de cliente/funções testados em jest.
