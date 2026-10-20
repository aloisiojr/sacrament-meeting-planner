# Plano — fix-state-integrity (Wave 2B)

Regra de memória: toda invocação de jest usa `--maxWorkers=2`; suíte completa
só no baseline e no fechamento.

## Commits atômicos (um por achado)
1. `docs(specs): spec+plan fix-state-integrity`
2. `fix(activity-log): EST-12 — erro de insert vira health event`
3. `fix(speeches): EST-16 — maybeSingle + erro visível em useWardManagePrayers`
4. `fix(offline-queue): EST-17 — 401 pausa a drenagem sem gastar retry`
5. `fix(history): EST-14 — fuso da ala, refetch no foco/pull, banner offline real`
6. `fix(realtime): EST-18/24 — canal por ala+usuário, cleanup exato, comentário de polling`
7. `fix(designations): EST-21 — hardware back = Voltar; listener de teclado com cleanup`
8. `fix(home-prompt): EST-22 — catch vazio vira health event; guard de wardId`
9. `fix(debounced-input): EST-25 — um só flush via refs (timer/blur/unmount)`

## Testes por achado (falham antes, passam depois)
- EST-12: `activityLog.test.ts` — insert com `{error}` emite health e resolve.
- EST-16: hook test — erro da query exposto; 0 linhas ⇒ `false` sem erro.
- EST-17: `offline-queue-processor.test.tsx` — replay 401 não chama
  `incrementRetry` nem `dequeue`; pausa com health event.
- EST-14: history — banner aparece offline; pull dispara refetch; data no fuso da ala.
- EST-18: `use-realtime-sync.test.tsx` — nome do canal contém ala+usuário;
  unmount remove a instância exata.
- EST-21: designations — handler de hardware back chama o mesmo `router.back()`.
- EST-22: `home-import-prompt.test.tsx` — falha ao persistir dispensa emite health.
- EST-25: `debounced-text-input.test.tsx` — unmount antes do delay salva 1×;
  timer+blur não duplicam.

## Fechamento
tsc + lint + jest full (`--maxWorkers=2`), ≥ 5.680 testes. Sem push, sem merge.
