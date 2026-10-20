# Plan: Wave 4A — confiabilidade restante (spec: specs/reliability-rest.md)

## Steps (1 step = 1 commit)
1. **CONF-04:** migration 053 (status processing/failed + attempts/last_error) +
   `process-notifications` (claim atômico limit 200, `classifyPushOutcome` pura, sent/failed
   por desfecho) + testes no handler real (atualiza o teste que aposentava em outage). — AC1, AC2
2. **CONF-10:** migration 054 (trigger sobrescreve `assigned_by_role` via `current_user_role()`).
   — AC3 (SQL conferido por leitura; sem banco para aplicar)
3. **CONF-13:** migration 055 (dedup + UNIQUE `expo_push_token`) + upsert
   `onConflict: 'expo_push_token'` em `useNotifications` + teste do payload. — AC4
4. **CONF-14:** `lib/fetchAllPages` + `useMembers`/`useHymns`/`useWardTopics` + teste 2 páginas. — AC5
5. **CONF-11:** `logIntent` na fila + `useDeleteMember` (null não loga) + processor loga ao
   aceitar + teste offline→replay. — AC6
6. **CONF-09/15:** `expectedUpdatedAt` em `useAgenda` (+ `AgendaForm`), guarda no replay,
   migration 056 (publication + comentários), `SYNCED_TABLES` wards/activity_log + testes. — AC7, AC8
7. **Fechamento:** PROGRESS.md + gates (tsc, lint, jest `--maxWorkers=2`, uma rodada).

## AC → coverage
| AC | Step | Test |
|----|------|------|
| AC1/AC2 | 1 | edge-process-notifications (claim, limit, failed/sent) |
| AC3 | 2 | leitura da migration (sem apply) |
| AC4 | 3 | useNotifications upsert payload |
| AC5 | 4 | fetchAllPages/useMembers 2 páginas |
| AC6 | 5 | offline-queue-processor + useMembers delete |
| AC7 | 6 | useAgenda conflito + processor conflict |
| AC8 | 6 | use-realtime-sync/sync keys |
