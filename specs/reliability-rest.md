# Wave 4A — confiabilidade restante (CONF-04/09/10/11/13/14/15)

## Problem / intent
Fechar os achados de confiabilidade restantes do `AUDIT-INPUT.md` (CONF-04, 09, 10, 11, 13, 14, 15)
sobre `main` @b7f049a. Baseline: tsc 0, lint 0 erros/5 warnings, jest 352 suítes/5.842 testes.
Migrations existentes até 052; esta wave cria 053–056, uma por preocupação, **nunca aplicadas**
em nenhum banco. Tipos de banco novos: declarados localmente e anotados (DEC-03 formal é wave 6).

## In scope / Out of scope
- **In:** CONF-04 (push honesto + claim atômico), CONF-10 (papel do designador no servidor),
  CONF-13 (token de push com dono único), CONF-14 (listas completas paginadas), CONF-11 (delete
  de membro loga ao pousar), CONF-09 (conflito de agenda visível) + CONF-15 (publication limpa).
- **Out:** gate de versão/cutover (4B: `useVersionGate`, `appStore`, `app_config`), CONF-06/08/12,
  beleza (wave 5), tipos gerados/gate de typecheck de Edge Functions (wave 6, BAS-04).

## Design

### CONF-04 — push não mente (`process-notifications` + migration 053)
- 053: `notification_queue.status` ganha `processing`/`failed`; colunas `attempts INT NOT NULL
  DEFAULT 0` e `last_error TEXT`. Cleanup de 7 dias passa a varrer também `failed`.
- Claim atômico: `UPDATE … SET status='processing' WHERE id IN (SELECT … WHERE status='pending'
  AND send_after<=now ORDER BY created_at LIMIT 200) RETURNING *` via supabase-js
  (`.update().eq('status','pending').lte('send_after',…).order().limit(200).select()`); só linhas
  retornadas são processadas — cron concorrente recebe 0 ou outro lote.
- `sendPush` devolve por destinatário: checa `response.ok` **e** ticket Expo. Função pura
  `classifyPushOutcome(httpOk, tickets, tokenCount)` extraída no próprio arquivo da Edge Function
  (o repo já importa Edge Functions em jest via `edgeFunctionHarness` — ver
  `edge-process-notifications.test.ts` — então a decisão é testada dirigindo o handler real, sem
  criar módulo compartilhado Deno↔RN). `sent` só se houver ≥1 ticket `ok` e nenhum erro fatal de
  transporte; sem destinatários, a entrada é aposentada como `sent` (ninguém a notificar — retry
  não muda). Erro de transporte/HTTP/tickets de erro ⇒ `failed`, `attempts+1`, `last_error` com o
  motivo. Tokens `DeviceNotRegistered`/`InvalidCredentials` continuam apagados.
- Grupo designation: o desfecho é por grupo; falha marca todas as entradas do grupo `failed`.

### CONF-10 — papel de quem designou é do servidor (migration 054)
- Trigger `BEFORE INSERT OR UPDATE OF assigned_by_role ON speeches` sobrescreve
  `NEW.assigned_by_role := public.current_user_role()` quando `auth.uid() IS NOT NULL`
  (mesmo padrão de 051). service_role/sem JWT passa intacto (lado confiável).
- **Sobrescrever > revogar:** revogar escrita (REVOKE UPDATE de coluna) quebraria clientes em
  campo que já enviam a coluna (erro em toda designação); sobrescrever mantém o payload válido
  e torna o valor forjado inócuo. O trigger de notificação de 031 passa a ler só valor derivado.

### CONF-13 — token de push tem um dono só (migration 055 + `useNotifications`)
- 055: dedup por `expo_push_token` mantendo a linha mais recente (`updated_at`, desempate
  `created_at`, `id`), drop do UNIQUE `(user_id, expo_push_token)`, UNIQUE em `expo_push_token`.
  O trigger de limpeza de 035 fica redundante mas inofensivo (mantido; documentado).
- Cliente: upsert `onConflict: 'expo_push_token'` — aparelho que trocou de usuário transfere
  `user_id`/`ward_id`/`role` para o dono atual em vez de duplicar. Limpeza por token inválido
  apaga a linha única (sem mudança).

### CONF-14 — lista de membros não trunca em 1.000
- Novo `src/lib/fetchAllPages.ts`: laço `.range(from, from+999)` até página parcial (<1000).
- Aplicado às listas completas: `useMembers`, `useHymns`/`useSacramentalHymns` (queryFn
  compartilhada) e `useWardTopics`. Listas já limitadas por data (`useSpeeches`,
  `useSundayExceptions`, `useAgendaRange`) ou paginadas (`useActivityLog`) estão fora — o teto
  de 1000 por janela de datas é aceito e registrado aqui.

### CONF-11 — delete de membro loga quando a escrita pousa
- Nenhum mecanismo de log-no-replay existia (irmãos só comentam "logged when it lands"). Mínimo:
  `QueuedMutation.logIntent?: { actionType, description, memberName? }` — na prática carrega os
  campos do log de delete (`wardId/userId/userEmail/userName/memberName` resolvidos na
  enfileiração). `useDeleteMember`: retorno `null` de `withOfflineQueue` ⇒ **não** loga na hora
  (mutationFn devolve `null`); online ⇒ loga como hoje. `useOfflineQueueProcessor`: após replay
  `accepted` de item com `logIntent`, emite `logAction(...)` uma vez (antes do `dequeue`? não —
  depois do aceite e junto ao dequeue, uma única vez por item aceito).
- Justificativa: trigger server-side exigiria replicar descrição/i18n do cliente no SQL; a
  intenção na fila usa o `logAction` existente e pousa exatamente uma vez por aceite.

### CONF-09 + CONF-15 — conflito visível e publication honesta
- `useUpdateAgenda`: input ganha `expectedUpdatedAt?`; `AgendaForm` passa `agenda.updated_at`.
  Online: `UPDATE … eq('id').eq('updated_at', expected)` com `maybeSingle()`; 0 linhas ⇒
  `AgendaConflictError` (erro tratável via mutation state) + health event
  `agenda_update_conflict`. Sem `expectedUpdatedAt`, comportamento atual.
- `useUpdateAgendaByDate`: no caminho online já lê a linha existente — guarda o UPDATE com
  `eq('updated_at', existing.updated_at)` (0 linhas ⇒ mesmo erro/health event).
- Fila: `QueuedMutation.expectedUpdatedAt?` carregado na enfileiração (agenda por id). Replay
  UPDATE com guarda: 0 linhas ⇒ outcome `conflict` ⇒ item vai para dead-letter (visível no badge)
  + health event `offline_queue_conflict`, sem gastar retry e sem sucesso silencioso.
- Migration 056 (publication): `DROP TABLE ward_collection_config, meeting_actors` da
  publication (mortas desde 037/043 — `DROP` pode falhar se a linha já não estiver na
  publication em algum ambiente; usar bloco `DO` tolerante), `ADD TABLE wards, activity_log`.
  Comentários `COMMENT ON POLICY` nas policies de catálogo `USING(true)` de 002
  (`general_collections`, `general_topics`, `hymns`) marcando-as intencionais (catálogos
  globais somente-leitura), anti-"correção".
- `useRealtimeSync`/`lib/sync`: `SYNCED_TABLES` ganha `wards` e `activity_log`.
  `wards` não tem `ward_id` — filtro realtime é `id=eq.<wardId>` (tratado no hook: filtro por
  tabela); invalida `['ward', wardId]` (nome/info/idioma/fuso/templates).
  `activity_log` tem `ward_id` — invalida `activityLogKeys.all` (tela de histórico).

## Acceptance criteria
- AC1 (CONF-04): lote é claimado `processing` com `.limit(200)`; concorrente não reprocessa.
- AC2 (CONF-04): Expo HTTP não-ok, exceção de fetch ou ticket de erro ⇒ `failed` com
  `attempts` incrementado e `last_error`; `sent` só com ticket `ok` (ou zero destinatários).
- AC3 (CONF-10): cliente que forja `assigned_by_role` tem o valor sobrescrito pelo papel do JWT.
- AC4 (CONF-13): banco não admite 2 linhas com mesmo `expo_push_token`; upsert do cliente
  conflita em `expo_push_token`.
- AC5 (CONF-14): mock de 2 páginas (>1000) retorna o excedente em membros (e irmãs paginadas).
- AC6 (CONF-11): offline, delete enfileirado não loga; após replay aceito, loga exatamente 1 vez.
- AC7 (CONF-09): UPDATE de agenda com `updated_at` esperado divergente ⇒ erro visível +
  health event, online e no replay (dead-letter + health event).
- AC8 (CONF-15): publication sem tabelas mortas, com `wards`/`activity_log`; realtime invalida
  `['ward', …]` e `activity-log`.

## Verification
Testes comportamentais jest por item (handler real da Edge Function; hooks com mock supabase;
processor com fila real em memória). Gates no fechamento (uma rodada): `npx tsc --noEmit`,
`npm run lint`, `npx jest --ci --maxWorkers=2`.

## Risks
- Migrations nunca aplicadas: conferência é por leitura; staging é autoridade só na wave de apply.
- `wards` no realtime expõe eventos da própria ala (RLS de realtime respeita policies SELECT).
