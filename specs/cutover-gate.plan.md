# Plan: Wave 4B — prontidão de cutover (spec: specs/cutover-gate.md)

## Steps (1 step = 1 commit)
1. **Spec + plano:** `specs/cutover-gate.md` + este arquivo. — AC8 (base)
2. **CONF-08:** reescrever `useVersionGate` (primeira resolução vence por checagem com
   id de execução, rechecagem em `AppState 'active'`, versão ausente = fail-open logado
   sem `invoke`) + reescrever/estender `version-gate.test.tsx` (mock dinâmico de
   `expoConfig`, AppState capturável, fake timers). — AC1, AC2, AC3
3. **DEC-08:** migration `057_cutover_write_barrier.sql` (estende `app_config`,
   `app_write_allowed()`, 13 policies RESTRICTIVE, default desligada) + header global
   `x-app-version` em `src/lib/supabase.ts` (expo-constants; sem versão ⇒ sem header) +
   teste novo `supabase-client-header.test.ts` (createClient mockado captura opções).
   `app-config` já lê `app_config` (036) — sem mudança, conferido. — AC4, AC5
4. **CONF-12:** migration `058_public_rate_limits.sql` (tabela fechada + função
   SECURITY DEFINER) + `send-reset-email` (lookup via `generateLink` por e-mail, sem
   `listUsers`; env nomeado na subida) + helpers `missingEnv`/`enforceRateLimit`
   duplicados nas 3 públicas (429 acima de 20/h por função+IP+e-mail, fail-open logado)
   + atualizar `edge-send-reset-email.test.ts` (sem scan: `listUsers` não chamado,
   desconhecido via erro not-found) e testes novos de 429/env nas três suítes edge. — AC6, AC7
5. **CONF-06:** `docs/CUTOVER_RUNBOOK.md` + `scripts/cutover/preflight-name-collisions.sql`
   (READ-ONLY) + migration `059_versioned_crons.sql` (DO guardado: pg_cron ⇒ SQL jobs;
   pg_net+settings ⇒ process-notifications; senão NOTICE nomeado). — AC8
6. **Fechamento:** PROGRESS.md + gates uma rodada (tsc, lint, jest `--maxWorkers=2`).

## AC → coverage
| AC | Step | Test |
|----|------|------|
| AC1 | 2 | version-gate: timer vence e `blocked` tardio ignorado; invoke rápido vence |
| AC2 | 2 | version-gate: AppState active recheca / background não |
| AC3 | 2 | version-gate: expoConfig nulo ⇒ ok + warn + sem invoke |
| AC4 | 3 | supabase-client-header: header com/sem versão |
| AC5 | 3 | leitura da 057 (sem banco p/ aplicar — estacionado) |
| AC6 | 4 | edge-send-reset-email: sem listUsers, canônico, anti-enumeração, env nomeado |
| AC7 | 4 | edge-*: rpc do limiter devolvendo false ⇒ 429; erro ⇒ segue |
| AC8 | 5 | arquivos conferidos por leitura; suíte não lê source (regra do repo) |
| AC9 | 6 | rodada única de gates no fechamento |

## Reuse
- Semver: `src/lib/semver.ts` (`isBelowMinimum`) no cliente; SQL inline na 057.
- Padrão de cron guardado: 045/048 (`pg_extension` + unschedule/schedule idempotente).
- Helpers SQL: `public.current_ward_id()`/`can_write()` (044/049) como espelho de estilo.
- Testes edge: `src/__tests__/helpers/edgeFunctionHarness.ts` (rpc gravado em `rpcCalls`).
- Harness default do limiter: rpc sem resposta configurada devolve `data: null` ⇒
  fail-open, então as suítes edge existentes não quebram.

## Risks
- `generateLink` p/ e-mail inexistente: o erro do GoTrue ("User not found") é o sinal de
  anti-enumeração — qualquer outro erro continua 500 p/ não mascarar falha real.
- AppState no jest-expo: capturar o listener registrado em vez de simular o SO.
- RESTRICTIVE + BYPASSRLS: service_role fora da barreira é desenho (edge/cron), não furo.
