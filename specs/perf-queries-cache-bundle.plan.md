# Plan — perf-queries-cache-bundle (Wave 3B)

Spec: `specs/perf-queries-cache-bundle.md`. Um commit por achado, sem push.
Testes direcionados durante; suíte completa **uma vez** no fechamento
(`npx jest --ci --maxWorkers=2`), + tsc, lint e `expo export` (RAP-06).

| # | Passo | AC | Testes |
|---|-------|-----|--------|
| 1 | RAP-04/DEC-02: `shouldPersistQuery` + `cacheBuster(version, wardId)` + `CACHE_MAX_BYTES`/poda em `queryConfig`; `_layout` com sessão→ward, `dehydrateOptions`, storage podador com telemetria; teste de sign-out no AuthContext | AC1, AC2 | `query-config.test.ts` (novos), auth sign-out (novo/existente) |
| 2 | RAP-03/DEC-06: `useSundayList` 3+6 + `windows`; `useAgendaWindowData` (useQueries por segmento); `AGENDA_LIST_COLUMNS` em `useAgendaRange`; `agenda.tsx` troca a fonte | AC3, AC4 | `useSundayList-utils.test.ts` (atualizar 12+12→3+6 + windows), novo teste de segmentos/delta |
| 3 | RAP-02: remover `initialNumToRender={filtered.length}` em `AgendaForm.tsx` | AC5 | suíte existente do AgendaForm/hymn scrubber |
| 4 | RAP-09: `useSacramentalHymns` via `list`+`select`; remover chave `sacramental` | AC5 | `useHymns-utils.test.ts` |
| 5 | RAP-11: `POLLING_INTERVAL_MS=45_000`, `POLLING_TABLES=[speeches, sunday_agendas]`, `SUBSCRIBED` sem `invalidateAll` | AC5 | `use-realtime-sync.test.tsx` (atualizar expectativas) |
| 6 | RAP-13: `useMemo` no `value` do `OnlineStatusContext` | AC5 | `f048-online-status-*.test.*` |
| 7 | RAP-12: mover 4 pacotes p/ `devDependencies`, `npm install`, conferir export | AC6 | gates do fechamento |
| 8 | RAP-05: `scripts/generate-icons.mjs` (fonte única → favicon 192/48 + recompressão), mover artes p/ `assets/store/` | AC7 | script roda; `file assets/*.png` confere dimensões; grep de referências |
| 9 | RAP-10/14: migration `052_perf_search_indexes.sql`; `useActivityLog` com range de data (`parseActivitySearchDate`) | AC8 | `activityLog.test.ts` (helper de data) |
| 10 | RAP-06+15: medir `expo export`, registrar nºs e decisão na spec; PROGRESS.md | AC9 | — |

## Reuso (não duplicar)

- QueryKeys existentes: `agendaKeys.byDateRange`, `speechKeys.byDateRange`,
  `sundayTypeKeys.exceptions`, `hymnKeys.list`, `memberKeys.list`,
  `topicKeys.*` — allowlist e janelas consomem as mesmas chaves.
- `reportHealthEvent` (`lib/appHealth`) para a poda — payload só numérico.
- `CACHE_STORAGE_KEY` e a limpeza de sign-out já existente no `AuthContext`
  (waves 1/2): este pacote trava com teste, não reimplementa.
- `pngjs` (já em devDependencies) para derivar/recomprimir ícones.

## Riscos

- Troca de ala sem sign-out: o buster muda e o provider remonta — cache da
  ala anterior é descartado, não restaurado (comportamento desejado; AC1).
- `useQueries` com nº variável de segmentos: chaves estáveis por segmento
  garantem que só o delta busca rede (AC3).
- `AGENDA_LIST_COLUMNS` esquecer coluna do card: conferir contra
  `buildUnifiedCardData` + `UnifiedSundayCard` antes de fechar o passo 2.
- `npm install` pode reescrever o lock além do passo 7: conferir
  `git status` e manter só o movimento de dependências.
