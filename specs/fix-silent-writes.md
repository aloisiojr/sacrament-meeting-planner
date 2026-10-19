# Pacote A — nenhuma escrita some em silêncio (EST-01/02/04/05/09/11 + DEC-01)

## Problem / intent

A auditoria adversarial da v2.0 (`AUDIT-INPUT.md`, insumo não commitado) provou que escritas
podem desaparecer com aparência de sucesso: a tela de designações volta sem aguardar o servidor
(EST-01), discursos têm escritas com `.then()` vazio (EST-02), a fila offline descarta após
retries sem sinal e pode perder/duplicar entradas (EST-04), a fila sobrevive ao sign-out e é
reaplicada sob o próximo usuário (EST-05), o editor de templates perde edição ao voltar rápido
(EST-09) e a edição com cache frio abre em branco e sobrescreve (EST-11). Apenas 7 das 32
mutações usam a fila (EST-03) — a promessa "offline-first" é parcial.

## Baseline (evidence)

- Medido em 2026-10-19 nesta máquina (branch `muse/smp-fix-queue-writes`, base `main` @178bac4):
  `npm ci` 0; `npx tsc --noEmit` 0 erros; `npm run lint` 0 erros/5 warnings;
  `npx jest --ci` 312 suites / 5582 testes verdes (1ª rodada: 1 falha; 2 re-rodadas verdes —
  flaky pré-existente, sem suite identificada no rerun).
- Inventário conferido por grep: 32 sites de `useMutation` (23 em `src/hooks/*`, 9 nas telas
  de settings), 7 chamadas a `withOfflineQueue` (useSpeeches ×4, useMembers ×2, useAgenda ×1).

## Decisão do dono (DEC-01, variante híbrida — não renegociar)

- **Fluxos da reunião** (agenda, speeches/orações, designações): escrita offline funciona via
  fila de verdade — ou é aguardada com erro visível. Nunca some em silêncio.
- **Todo o resto** (settings, import, admin/usuários, temas fora do fluxo da reunião): offline,
  a edição é **bloqueada com aviso claro** (i18n nos 3 locales), em vez de fingir sucesso.

## In scope / Out of scope

- **In:** EST-01, EST-02, EST-04, EST-05, EST-09, EST-11 e o recorte de inventário/classificação
  de EST-03 descrito abaixo.
- **Out:** segurança/RLS/permissões (pacote B) — não tocar `supabase/migrations`,
  `supabase/functions`, `src/lib/permissions.ts`; performance; beleza; tipos gerados.

## Classificação das 32 mutações (EST-03)

**Fila (`queued`) — fluxos da reunião e irmãos já enfileirados:**
`useUpdateAgenda`, `useUpdateAgendaByDate` (novo), `useAssignSpeaker`, `useAssignTopic`,
`useChangeStatus` (novo), `useUpdateSpeechContact`, `useRemoveAssignment`, `useCreateMember`
(novo — irmão de update/delete, que já enfileiram; `useUpdateMember` é usado no fluxo de
designações), `useUpdateMember`, `useDeleteMember`.

**Bloqueadas offline (`blocked-offline`) — todo o resto:** lazy-creates
(`useLazyCreateAgenda`, `useLazyCreateSpeeches` — disparados ao abrir a tela, já gateados por
`isOnline` nos callers), `useDeleteSpeechesByDate` (delete multi-linha por posição, não
expressável no replay por id), tipos de domingo (`useAutoAssignSundayTypes`, `useSetSundayType`,
`useRemoveSundayException`), temas da biblioteca (`useCreateWardTopic`, `useUpdateWardTopic`,
`useDeleteWardTopic`), ala/templates (`useUpdateWardInfo`, `useUpdateWardDesignationTemplate`),
`useSetNotificationsEnabled`, `useApplyMemberImport` e as 9 mutações inline de settings
(orações/idioma da ala, templates de WhatsApp, import de membros, usuários ×4, timezone).

Mecanismo único: registro `MUTATION_OFFLINE_CLASS` em `src/lib/mutationClassification.ts` +
`useClassifiedMutation(name, options)` em `src/hooks/useClassifiedMutation.ts`. Nome sem
registro lança erro na hora do hook (falha alta em dev/teste). Mutação bloqueada offline lança
`OfflineBlockedError` (código estável `offline_blocked`, mensagem i18n `offline.blockedEdit`)
**antes** de chamar o servidor; o alerta global mostra a mensagem mesmo offline (exceção
explícita em `shouldAlertMutationError`). Contrato travado por teste comportamental do wrapper
+ do registro (o projeto proíbe assert sobre texto-fonte; a trava é em runtime).

## Acceptance criteria

- AC1 (EST-01): salvar designação aguarda `mutateAsync`; `router.back()` só em sucesso
  (inclui sucesso "enfileirado offline"); erro mantém o usuário na tela, com erro inline e
  estado preservado.
- AC2 (EST-11): com cache frio (`agenda === undefined`) a tela mostra loading e não permite
  salvar; ao chegar, a edição existente hidrata os campos — salvar nunca sobrescreve campo
  não visto.
- AC3 (EST-02): o toggle do 2º discurso executa remover orador → limpar tema → atualizar
  agenda em sequência com hooks existentes; erro em um passo aborta os seguintes e mostra erro.
- AC4 (EST-04): a fila serializa read-modify-write com mutex em memória; payload corrompido vai
  para quarentena (nunca é cristalizado como `[]`); INSERT ganha id UUID do cliente e o replay
  usa `upsert`; agenda-por-data replaya como upsert em `(ward_id, sunday_date)`.
- AC5 (EST-04): exaurido o orçamento de retries, a mutação vai para **dead-letter persistida**,
  a fila segue para os próximos itens na mesma drenagem, um evento `offline_dead_letter` é
  registrado em `app_health_events` e a UI mostra "N não sincronizadas".
- AC6 (EST-04): a drenagem acontece na transição offline→online **e no mount já online**;
  rejeição do processamento é capturada (health event), nunca unhandled.
- AC7 (EST-05): `SIGNED_OUT` chama `clearQueue()` (fila + dead-letter do usuário que sai) e
  remove o cache persistido de queries (`@query_cache`), além do `queryClient.clear()` atual.
- AC8 (EST-09): `TemplateEditorScreen` faz flush síncrono (a partir de ref, não de updater de
  `setState`) das edições pendentes ao voltar e no unmount, e limpa todos os timers.
- AC9 (EST-03): toda mutação nasce via `useClassifiedMutation` com nome registrado; offline,
  mutação bloqueada rejeita com aviso visível e não chama o servidor; mutação enfileirada
  persiste e sincroniza ao voltar a rede.
- AC10: toda string nova nos 3 locales; os 4 gates (`npm ci`, `tsc`, `lint`, `jest --ci`)
  verdes ao final; testes comportamentais novos falham no código antigo e passam no novo.

## Notes

- `incrementRetry` mantém a API e o orçamento de 3; o que muda é o destino ao exaurir
  (dead-letter, não descarte) e a continuação da drenagem. Item que falha com orçamento
  restante continua bloqueando a fila naquela drenagem (FIFO é o contrato: itens posteriores
  podem depender dele) — o travamento permanente é que deixa de existir.
- `useChangeStatus` offline: a validação de transição exige leitura; com falha de transporte a
  escrita enfileira o status pedido sem a guarda otimista (a UI de speeches já desabilita
  offline; o caso real é o flap no meio do gesto).
- Health events só aceitam números/booleanos em `details` (ver `lib/appHealth`) — o evento de
  dead-letter registra contagens, nunca payload de membro.
