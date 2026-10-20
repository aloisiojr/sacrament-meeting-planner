# Fix — integridade de estado restante (Wave 2B, relançamento)

Pacote 2B da auditoria v2.0 (`AUDIT-INPUT.md`, insumo não commitado). Achados:
EST-12, EST-14, EST-16, EST-17, EST-18, EST-21, EST-22, EST-24, EST-25.
Fora de escopo (wave 2A, em paralelo): Home/Presentation/AuthContext/_layout/
useNotifications/dateUtils/useTopics/useMembers. Migrations/functions/permissions intocados.

Nota de reconciliação: onde o brief parafraseou um achado e o código atual (pós-wave 1)
não contém o defeito parafraseado, vale o defeito medido no relatório com arquivo:linha.
Cada caso está anotado abaixo.

## EST-12 — `src/lib/activityLog.ts` (logAction)
Hoje: `await supabase.from('activity_log').insert(...)` sem ler `{error}`; supabase-js
resolve com erro em vez de lançar, então a trilha de auditoria fura em silêncio.
Correção: ler `{error}`; em erro (retornado ou lançado), emitir health event
`activity_log_failed` e manter o contrato não-bloqueante (nunca lança).
(O brief citava "teto de 500/delete" — não existe lista nem delete neste arquivo;
o defeito real medido é o insert sem checagem.)

## EST-14 — `src/app/(tabs)/settings/history.tsx`
- Datas formatadas no fuso da ala (`wards.timezone`, mesma queryKey
  `['ward-timezone', wardId]` de `settings/timezone.tsx`) via `Intl.DateTimeFormat`
  com `timeZone`; fallback para horário do aparelho sem timezone carregado.
- Refetch ao focar a tela (`useFocusEffect`) e pull-to-refresh (`RefreshControl`).
- Banner offline lendo `useOnlineStatus()` real.

## EST-16 — `src/hooks/useSpeeches.ts` (useWardManagePrayers)
`.single()` transforma "ala não encontrada" (0 linhas) em exceção; o erro some e
`managePrayers` cai para `false`, escondendo as orações da UI. Correção:
`.maybeSingle()` e expor `error` no retorno (aditivo — os 8 callers não mudam),
para que a falha da query de orações seja visível como a de discursos.

## EST-17 — `src/hooks/useOfflineQueueProcessor.ts`
401 (sessão expirada: `status === 401`, código `PGRST301` ou mensagem de JWT)
**não consome retry**: a drenagem pausa sem gastar o item, com health event
`offline_queue_paused_auth`. Rejeições comuns seguem gastando o orçamento.

## EST-18 + EST-24 — `src/hooks/useRealtimeSync.ts`
- Canal nomeado por ala+usuário (`ward-sync-<wardId>-<userId>`), para não colidir
  com outra sessão do mesmo aparelho; cleanup remove exatamente o canal criado
  naquele efeito (instância local, não a ref que pode já apontar para outro).
- EST-24: comentário dizia polling de 2,5 s; o real é `POLLING_INTERVAL_MS = 10000`.
  (`RealtimeChannel` já é `import type`.)

## EST-21 — `src/app/designations/[date].tsx`
- Um só `handleBack`: botão Voltar do cabeçalho e hardware back do Android
  (`BackHandler`) executam o mesmo caminho.
- Listener de teclado de foco: removido no unmount e antes de re-registrar
  (hoje só sai se o teclado aparecer).

## EST-22 — `src/components/HomeMemberImportPrompt.tsx`
O único `.catch(() => {})` vazio do codebase vira health event. O componente já
não usa `supabase.from()` direto (usa `useMembers`/`isSuccess`); adiciona guard
para não ler/gravar a chave de dispensa sem `wardId` (perfis ainda carregando).

## EST-25 — `src/components/DebouncedTextInput.tsx`
Um só caminho de flush via refs: timer, blur e unmount chamam o mesmo
`flushPending()`, que compara `latestValueRef` com `savedValueRef` (o `value`
persistido manda) e marca como salvo ao emitir — sem saves duplicados e com
flush garantido no unmount.

## Verificação
- `npx tsc --noEmit`, `npm run lint`, `npx jest --ci --maxWorkers=2`.
- Baseline 2026-10-19: 320 suítes / 5.680 testes verdes.
- Testes comportamentais novos que falham no código antigo: 401 sem gastar
  retry; erro de orações visível; flush no unmount sem duplicar.
