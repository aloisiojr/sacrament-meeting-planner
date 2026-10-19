# Plano — Pacote A: nenhuma escrita some em silêncio

Spec: `specs/fix-silent-writes.md` · Branch: `muse/smp-fix-queue-writes` · Base: `main` @178bac4

## Baseline (medido 2026-10-19)

`npm ci` 0 · `npx tsc --noEmit` 0 erros · `npm run lint` 0 erros/5 warnings ·
`npx jest --ci` 312 suites/5582 testes verdes (1ª rodada com 1 falha flaky; reruns verdes).

## Passos (commit atômico por grupo)

1. **EST-04 — `src/lib/offlineQueue.ts` endurecida + processor**
   - Mutex em memória serializando todo read-modify-write (enqueue/dequeue/increment/dead-letter/clear).
   - Parse falho/não-array → quarentena em `@offline_mutation_queue_quarantine` (payload preservado).
   - Dead-letter em `@offline_mutation_dead_letter`: `readDeadLetter`, `getDeadLetterCount`,
     movimento ao exaurir retries; emissor de mudança para a badge.
   - `QueuedMutation` ganha operação `UPSERT` + `onConflict?`.
   - `src/lib/offlineMutation.ts`: id UUID (`createClientId`); INSERT injeta `data.id`.
   - `useOfflineQueueProcessor`: INSERT→`upsert(onConflict 'id')`, UPSERT→`upsert(onConflict)`;
     exaurir → dead-letter + continua drenando + `reportHealthEvent('offline_dead_letter')`;
     drena também no mount online; `processQueue().catch` com health event.
   - Badge: `SyncIssuesBanner` + `useDeadLetterCount` no `SyncProvider` (i18n `offline.unsyncedCount`).
   - Testes: fila (mutex sob enfileiramentos concorrentes, quarentena, dead-letter contável),
     processor (upsert, mount online, dead-letter desbloqueia, health). Atualizar 2 expectativas
     antigas que a spec muda (mount online drena; INSERT replaya via upsert).

2. **EST-05 — sign-out limpa a fila**
   - `AuthContext`: em `SIGNED_OUT`, `clearQueue()` + `AsyncStorage.removeItem(CACHE_STORAGE_KEY)`.
   - Teste comportamental: enfileirar → disparar `SIGNED_OUT` → fila e cache vazios.

3. **EST-01 + EST-11 — `designations/[date].tsx`**
   - Loading enquanto `agenda === undefined` (sem form, sem salvar); hidratação única dos campos
     quando o item existente chega; `persist` async com `mutateAsync`, erro inline
     (`designation-edit-error`), `back` só em sucesso; update do member também aguardado.
   - Testes: erro mantém na tela com estado; cache frio não abre em branco; salvar após
     hidratar preserva campos. Mocks existentes ganham `mutateAsync`.

4. **EST-02 — `speeches/[date].tsx`**
   - Remover writes diretas com `.then()`; sequência `removeAssignment → assignTopic(limpar) →
     updateAgenda` com `mutateAsync`, abortando em erro + erro inline.
   - Teste: passo 1 rejeita ⇒ agenda não é atualizada e o erro aparece.

5. **EST-09 — `TemplateEditorScreen`**
   - `editsRef` como fonte do flush; `flushAll` síncrono no botão voltar e no cleanup do
     unmount; limpar todos os timers.
   - Testes: editar e voltar antes do debounce salva; unmount salva pendente.

6. **EST-03 — classificação + fila nova nos hooks da reunião**
   - `src/lib/mutationClassification.ts` (registro das 32) + `OfflineBlockedError` em
     `offlineGuard.ts` + `useClassifiedMutation` (bloqueia offline via `OnlineStatusContext`).
   - Trocar os 32 `useMutation` por `useClassifiedMutation('<nome>', …)`.
   - Fila nova: `useUpdateAgendaByDate` (UPSERT `ward_id,sunday_date`), `useChangeStatus`,
     `useCreateMember` (INSERT com id do cliente).
   - `queryConfig.shouldAlertMutationError` + `_layout`: `offline_blocked` alerta mesmo offline,
     com a mensagem i18n do bloqueio.
   - Testes de contrato: nome desconhecido lança; bloqueada offline rejeita sem tocar o servidor;
     enfileirada offline chama a função (que enfileira); registro cobre as 32. Teste de hooks:
     designação/agenda offline enfileira e o processor sincroniza ao voltar a rede.

7. **i18n + gates**
   - Chaves novas nos 3 locales: `offline.blockedEdit`, `offline.unsyncedCount`,
     `agenda.designations.saveFailed`, `speeches.saveFailed`.
   - `npx tsc --noEmit` 0 · `npm run lint` 0 erros · `npx jest --ci` 100% (inclui novos testes).

## Fora

`supabase/migrations`, `supabase/functions`, `src/lib/permissions.ts` (pacote B).
Não fazer push nem merge.
