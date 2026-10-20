# Wave 4B — prontidão de cutover (CONF-06 plano/scripts + DEC-08 + CONF-08 + CONF-12)

## Problem / intent
Fechar os achados de cutover do `AUDIT-INPUT.md` (CONF-06, CONF-08, CONF-12, DEC-08) sobre
`main` @c576bf4 (waves 1–3 + 4A; baseline: tsc 0, lint 0/5, jest 358 suítes/5.872 testes;
última migration existente: 056 → esta wave cria **057–059, nunca aplicadas em nenhum
banco**). A ordem de cutover do `CLAUDE.md` é a lei: gate 1.1.0 ativo → publicar 2.0.0 →
subir `min_supported_version` p/ 2.0.0 → só então as migrations que quebram a 1.x.

## In scope / Out of scope
- **In:** CONF-08 (gate cliente honesto), DEC-08 (barreira server-side desligada por
  default + header de versão do cliente), CONF-06 (runbook ensaiável, relatório de
  colisões pré-lote, crons versionados e guardados), CONF-12 (funções públicas com
  freio: lookup direto, env nomeado na subida, rate-limit generoso).
- **Out:** aplicar qualquer migration em staging/prod, configurar `CRON_SECRET`, build
  EAS, prova com JWT/dispositivo (estacionado por credencial — registrado como pendência),
  beleza (wave 5), tipos (wave 6), faxina de docs (wave 7; o runbook novo é deste pacote).

## Design

### CONF-08 — gate de versão cliente honesto (`src/hooks/useVersionGate.ts`)
- **Primeira resolução vence por checagem:** cada checagem tem uma flag `settled` e um
  id de execução. O timer de 4 s e a resposta do `invoke('app-config')` disputam; quem
  chegar primeiro decide e o perdedor é ignorado (um `blocked` tardio nunca troca a tela
  sob o usuário depois que o timer liberou, e vice-versa). Execuções sobrepostas
  (foreground durante uma checagem em voo) são invalidadas pelo id.
- **Rechecagem em foreground:** `AppState` `change → 'active'` dispara nova checagem
  (sessão de dias reavalia quando o usuário volta ao app). A rechecagem não volta para
  `'checking'` (sem flicker); só substitui a decisão quando resolve.
- **Versão ausente = fail-open explícito e logado:** `Constants.expoConfig?.version`
  ausente/nulo ⇒ `console.warn` nomeado + `'ok'`, sem invocar a edge function e sem
  comparar contra `'0.0.0'` espúria (o risco inverso: `UpdateRequiredScreen` sem saída).

### DEC-08 — barreira server-side do cutover (migration 057 + cliente)
Fatos conferidos no repo: `app_config` **já existe** (036) como singleton por colunas
(`id=1`, `min_supported_version` etc.), semeada com o valor atual do gate, e a edge
function `app-config` **já lê `min_supported_version` dela** — fonte única já vale;
o contrato de resposta não muda. A 057 portanto ALTERA/ESTENDE, não recria:
- `ALTER TABLE app_config ADD COLUMN writes_blocked_below TEXT` (NULL = barreira
  desligada) + policy de SELECT para `anon` (as chaves de gate são públicas por desenho:
  o endpoint `app-config` é público; escrita segue só `service_role`, sem policy de
  escrita para `anon`/`authenticated`).
- `public.app_write_allowed()` (STABLE, `search_path=''`, espelha o padrão de
  `current_ward_id()`/`can_write()` de 049): lê `current_setting('request.headers', true)`
  como JSON, extrai `x-app-version`; **sem header, header malformado, barreira NULL ou
  versão ≥ barreira ⇒ permitido** (clientes antigos, anteriores ao header, não quebram
  ANTES da janela — a barreira só morde quando o dono liga na janela do cutover, e aí
  cliente sem header continua permitido por desenho: quem não manda versão é o 1.0.0
  sem gate, que a barreira não alcança via PostgREST autenticado… ver "Limites").
  Comparação semver numérica `major.minor.patch` inline (sufixos `-`/`+` ignorados,
  como `src/lib/semver.ts`).
- Policies **RESTRICTIVE** `cutover_write_barrier` FOR INSERT/UPDATE/DELETE TO
  authenticated chamando a função, nas tabelas de dados da ala existentes no ponto do
  cutover: `wards`, `members`, `ward_topics`, `sunday_exceptions`, `speeches`, `hymns`,
  `sunday_agendas`, `activity_log`, `invitations`, `device_push_tokens`,
  `notification_queue` (11 tabelas; designações são JSONB em `sunday_agendas`, 041).
  RESTRICTIVE soma-se
  (AND) às policies existentes sem reescrevê-las; `service_role` tem BYPASSRLS e não é
  afetado (edge functions/crons seguem escrevendo). Fora por desenho: `app_config`
  (config, escrita já é service-only), `app_health_events` (canal de diagnóstico com
  INSERT deliberadamente aberto — ADR-007; bloqueá-lo emudece justamente os relatos dos
  clientes velhos na janela) e catálogos globais (`general_*`, leitura).
- **Default desligada ⇒ comportamento idêntico ao atual** até o UPDATE da janela
  (provado nos comentários da migration e travado por este spec: nenhuma policy nova
  nega nada enquanto `writes_blocked_below IS NULL`).
- Cliente: `src/lib/supabase.ts` envia o header global `x-app-version` com
  `Constants.expoConfig.version` via `global.headers` do `createClient`; versão ausente
  ⇒ nenhum header (nunca um valor espúrio). É o mesmo header que o PostgREST expõe à
  função acima.
- **Limites (declarados, não escondidos):** a barreira cobre escrita via PostgREST com
  JWT de usuário. Cliente 1.0.0 (sem gate e sem header) não é barrado por versão — ele
  é o rabo conhecido do `CLAUDE.md` ("simplesmente quebra"); a barreira protege contra
  o 1.1.0 gated que ignora/offline-escreve, que é o caso do DEC-08. Prova SQL em staging
  fica estacionada (credencial).

### CONF-12 — funções públicas com freio (migration 058 + 3 edge functions)
- **Sem `_shared/`:** o repo não tem `supabase/functions/_shared/`; o padrão vigente é
  duplicação mínima e consistente por função (ex.: `cronSecretOk` duplicado com
  comentário explícito). Esta wave segue o padrão: helpers pequenos e idênticos nas
  três funções públicas (`send-reset-email`, `register-first-user`, `create-invitation`).
- **Rate-limit (058):** tabela `public_rate_limits` (`function_name`, `ip`, `email`,
  `window_started_at`, `hit_count`; PK composta) com RLS ativa e **nenhuma policy**
  (acesso só `service_role`, mesmo padrão fechado da 048). Função
  `public.check_rate_limit(p_function, p_ip, p_email, p_max_hits, p_window_seconds)`
  SECURITY DEFINER: janela fixa — reseta a janela vencida, incrementa e devolve
  `true`/`false` (permitido ou não); EXECUTE revogado de `public`/`anon`/`authenticated`.
  As três funções chamam via service_role com **limite generoso: 20 hits/hora por
  (função, IP, e-mail)** — acima ⇒ **429** `{ error, code: 'rate-limit/exceeded' }`.
  IP de `x-forwarded-for` (1º salto) com fallback `'unknown'`; e-mail normalizado
  (trim/lowercase) quando o payload o traz. **Falha da infra do limiter ⇒ fail-open
  logado** (o freio nunca derruba o fluxo legítimo por estar ele mesmo quebrado).
  `create-invitation` é autenticada, mas é pública no sentido do achado (CORS `*` +
  expõe criação); o freio vale igual, chaveado também pelo e-mail convidado.
- **`send-reset-email` sem scan:** some o laço `listUsers({page, perPage:50})`. O lookup
  passa a ser a Admin API por e-mail: `auth.admin.generateLink({ type:'recovery', email })`
  resolve o usuário pelo e-mail no servidor (índice de `auth.users`) e devolve `user`
  (metadados p/ idioma e endereço canônico do `to`). Erro "user not found" (mensagem
  `not found`/status 404) ⇒ sucesso anti-enumeração idêntico ao de hoje; qualquer outro
  erro ⇒ 500 como hoje.
- **Env nomeado na subida:** cada uma das três funções valida as envs que consome logo
  na entrada (após o preflight) via `missingEnv([...])` e responde 500
  `{ error: 'Missing required environment variable: <NOME>', code: 'config/missing-env' }`
  com `console.error` nomeando a variável — em vez de 500 opaco em runtime.
  `send-reset-email`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GMAIL_USER`,
  `GMAIL_APP_PASSWORD` (a checagem de Gmail, hoje tardia, sobe p/ a entrada; o ramo
  'Email service not configured' some). `register-first-user`/`create-invitation`:
  `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- **CORS `*` mantido, decisão documentada:** app mobile não envia `Origin`; restringir
  CORS não protege estas funções e quebraria o cliente web. A proteção é a que esta
  wave adiciona (auth onde há, rate-limit, anti-enumeração). Registrado aqui e no
  cabeçalho das três funções.

### CONF-06 — runbook ensaiável + scripts (docs + SQL, sem executar nada)
- `docs/CUTOVER_RUNBOOK.md`: executável na ordem do `CLAUDE.md` — pré-condições com
  checkbox (gate 1.1.0 ativo/`min_supported_version` conferido, deploy key/EAS,
  `CRON_SECRET` configurado + jobs do dashboard enviando `x-cron-secret`), backup e
  **como restaurar** (restore é o plano B; **ensaiar o restore em staging é passo
  explícito com checkbox**, antes de qualquer lote), saneamento pré-lote (rodar o
  relatório de colisões e resolver), aplicação das migrations por lote na ordem
  (049–052 já versionadas + 053–056 da 4A + 057–059 desta wave e o lote destrutivo
  037/041/043 no seu passo), smoke tests pós-lote, ativação da barreira DEC-08
  (`UPDATE app_config SET writes_blocked_below = '2.0.0'`), subida do
  `min_supported_version`, monitoramento via `app_health_events`, e **critérios de
  abortar/rollback por passo**. Checklist cobre as pendências do PROGRESS: `pg_cron`
  da poda da 048 (não instalado no staging — agendar no dashboard) e o cron do
  `push-update-nudge` (dashboard + header do CRON_SECRET).
- `scripts/cutover/preflight-name-collisions.sql`: relatório **READ-ONLY** (só SELECT):
  pares ator→membro que colidem após normalização de acento/caso por ala — o matching
  da 037 usa `lower(trim(name))` sem normalizar acento, então "José"≠"Jose" hoje casa
  com membros distintos ou cria duplicado. O relatório usa `unaccent` com fallback
  documentado (translate de acentos quando a extensão falta — o script não cria
  extensão nem escreve nada) e lista: (a) atores cujo nome normalizado casa com 2+
  membros distintos da ala, (b) membros da mesma ala cujos nomes normalizados colidem
  entre si. Rodar e sanear ANTES do lote destrutivo.
- **Migration 059 — crons versionados e guardados:** DO block no padrão de 045/048:
  somente se `pg_cron` existir em `pg_extension`, agenda (unschedule+schedule,
  idempotente) `create_weekly_reminders` (`0 12 * * 0`, o horário do comentário
  original da 004), `prune_app_health_events` (`30 4 * * *`, reafirma a 048) e
  `process-notifications`. Este último é Edge Function: só é agendado se `pg_net`
  existir **e** as settings `app.settings.edge_base_url`/`app.settings.cron_secret`
  estiverem presentes (lidas com `current_setting(..., true)`) — o job chama
  `net.http_post` p/ `/functions/v1/process-notifications` com o header
  `x-cron-secret`; sem qualquer peça, `RAISE NOTICE` explícito nomeando o que falta
  (rebuild nasce com os crons **ou com o aviso**, nunca em silêncio). Sem `pg_cron`:
  notice nomeando os três jobs p/ agendamento no dashboard e a migration não falha.
  `push-update-nudge` segue job de dashboard (não é SQL nem tem settings versionadas)
  — coberto pelo checklist do runbook, não por esta migration.

## Acceptance criteria
1. Gate: com `invoke` pendente, aos 4 s o status é `'ok'` e um `blocked` tardio não o
   altera; com `invoke` rápido, o timer não sobrepõe a decisão.
2. Gate: `AppState` p/ `'active'` reexecuta a checagem (decisão nova vale); p/
   `'background'` não reexecuta.
3. Gate: `expoConfig` nulo/versão ausente ⇒ `'ok'`, `console.warn` nomeado, `invoke`
   não chamado, nenhuma tela de update por `'0.0.0'`.
4. Cliente: `createClient` recebe header global `x-app-version` igual à versão do
   `expoConfig`; sem versão, nenhum header `x-app-version` é enviado.
5. DEC-08 (SQL, conferido por leitura — sem banco): 057 estende `app_config` sem
   recriar, função lê `request.headers`, NULL/sem header libera, policies RESTRICTIVE
   nas 11 tabelas listadas, default desligada documentada.
6. `send-reset-email`: nenhum `listUsers`; usuário achado pela Admin API por e-mail
   recebe o e-mail no endereço canônico; desconhecido ⇒ mesma resposta de sucesso;
   env ausente ⇒ 500 nomeando a variável.
7. As três públicas: acima de 20 hits/hora por (função, IP, e-mail) ⇒ 429; abaixo,
   fluxo inalterado; falha do limiter não bloqueia (fail-open logado).
8. Runbook + preflight + 059 existem, são READ-ONLY/versionados/guardados como acima;
   `AUDIT-INPUT.md` não é commitado; nenhuma migration é aplicada.
9. Gates de fechamento (uma rodada): `npx tsc --noEmit`, `npm run lint`,
   `npx jest --ci --maxWorkers=2`.

## Pendências estacionadas (credencial/dispositivo — não executadas)
- Aplicar 057–059 (e o restante do lote) em staging/prod; prova SQL da barreira e do
  rate-limit com JWT real; ensaio de backup/restore em staging (vira passo do runbook).
- Configurar `CRON_SECRET` e os jobs de dashboard (`process-notifications`,
  `push-update-nudge`, poda da 048 enquanto `pg_cron` faltar) nos ambientes.
- Build/publicação EAS 1.1.0/2.0.0 e a virada de `min_supported_version` (janela do dono).
