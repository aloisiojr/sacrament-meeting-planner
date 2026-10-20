# Perf — queries, cache e bundle (Wave 3B)

Baseline: `main` @ad110b5 (waves 1+2+3A mergeadas). Gates de referência:
tsc 0, lint 0 erros/5 warnings, jest 5.794 testes verdes. Última migration: 051
— este pacote cria a **052** (nunca aplicada em banco nenhum nesta wave).
Insumo: `AUDIT-INPUT.md` (não commitado) — RAP-02/03/04/05/06/09/10/11/12/13/14/15
+ DEC-02/DEC-06. Fora de escopo: caminho do PDF (3A), beleza/a11y (wave 5),
tipos gerados (wave 6), reescrever a tela da Agenda além do item RAP-03.

## RAP-04 + DEC-02 — cache persistido com allowlist

Hoje (`src/app/_layout.tsx`, `src/lib/queryConfig.ts`): `PersistQueryClientProvider`
sem `dehydrateOptions` — toda query bem-sucedida vai para `@query_cache`
(gcTime/maxAge 7 dias, throttle 1 s), sem teto e sem `ward_id` na chave/buster;
dado de outra ala/usuário pode ser restaurado no aparelho.

Correção:
- `shouldDehydrateQuery` puro em `queryConfig` (`shouldPersistQuery(queryKey, wardId)`):
  só persistem agendas, discursos, membros, hinos e tópicos **da ala atual**
  (o `ward_id` precisa estar na queryKey quando a chave o carrega; hinos são
  globais por idioma). Nunca `activity-log` (paginado), nunca chaves com
  segmento de busca, nunca query de outra ala, nunca query sem sucesso.
- Buster = `cacheBuster(appVersion, wardId)` (`<versão>:<wardId|anon>`): cache
  gravado por outra ala/versão é descartado na restauração, nunca restaurado.
  O `_layout` acompanha a sessão (listener próprio do supabase, mesma derivação
  de `ward_id` do `AuthContext`) e remonta o provider ao trocar a ala.
- Teto de tamanho (`CACHE_MAX_BYTES` = 2 MiB): o storage do persister poda as
  queries persistidas mais antigas até caber e emite `reportHealthEvent`
  (`query_cache_pruned`, só números — contrato de `appHealth`) ao podar.
- Sign-out: o `AuthContext` já limpa QueryClient + fila offline no `SIGNED_OUT`
  (waves 1/2); ele já remove também `CACHE_STORAGE_KEY` — este pacote trava
  esse comportamento com teste (o cache persistido some no sign-out).

Testes: query fora da allowlist não é serializada; query de outra ala não é
serializada nem restaurada (buster diverge); sign-out remove o cache persistido.

## RAP-03 + DEC-06 — Agenda abre leve e pagina por delta

Hoje: janela inicial de 12+12 meses (≈104 domingos × 3 tabelas com
`select('*')`); cada `loadMore` muda a queryKey para a janela cumulativa e
refaz a janela inteira no servidor.

Correção:
- Janela inicial: 3 meses atrás + 6 à frente (`INITIAL_MONTHS_PAST=3`,
  `INITIAL_MONTHS_FUTURE=6`). Extensão continua de 6 em 6 meses, teto de 60.
- `useSundayList` expõe `windows`: segmentos `{start,end}` **não cumulativos**
  (a abertura é um segmento; cada `loadMore` acrescenta só o delta ao lado).
- Novo `useAgendaWindowData(windows)`: `useQueries` por segmento × tabela
  (exceções, discursos, agendas) reaproveitando as queryKeys existentes
  (`sundayTypeKeys.exceptions`, `speechKeys.byDateRange`,
  `agendaKeys.byDateRange`) — estender busca **só o segmento novo**; os
  anteriores vêm do cache. Resultados mesclados e deduplicados por id/data.
- Colunas do card colapsado só no `select` da lista de agendas
  (`AGENDA_LIST_COLUMNS` em `useAgenda.ts`: identificadores, nomes de
  presidência/piano/regência, ids de hinos, flags de discurso/hino
  intermediário/apresentação, overrides de orador, `attendance`). A linha
  completa continua vindo de `useAgenda` (bySunday) ao expandir — o formulário
  expandido não lê a lista, então nenhuma coluna some da edição.
- A tela `agenda.tsx` só troca a fonte de dados (3 hooks de faixa →
  `useAgendaWindowData`); layout e comportamento não mudam.

Testes: abertura monta a janela curta (3+6); `loadMore` acrescenta um segmento
delta sem alterar os segmentos/queryKeys já buscados.

## RAP-02 — `AgendaForm.tsx`

Remover `initialNumToRender={filtered.length}` (≈311 linhas de hinos de uma
vez); usar o default do FlatList. O `getItemLayout` existente fica.

## RAP-09 — `useSacramentalHymns` deriva da `list`

`useSacramentalHymns` passa a usar `queryKey: hymnKeys.list(language)` com
`select:` filtrando `is_sacramental` (+ busca) — uma busca só, um cache só.
A chave `hymnKeys.sacramental` sai (nenhum outro chamador a referencia).

## RAP-11 — polling do realtime com escopo e ritmo

Hoje: fallback invalida **todas** as tabelas a cada 10 s e `SUBSCRIBED`
dispara `invalidateAll`. Correção: `POLLING_INTERVAL_MS` 10 s → 45 s; o
polling invalida só speeches/agendas (`POLLING_TABLES`); `SUBSCRIBED` apenas
para o polling e marca conectado (queries respeitam o `staleTime` de 5 min —
nada de refetch em rajada a cada reconexão). Eventos realtime por tabela não
mudam.

## RAP-13 — contextos quentes memoizados

`OnlineStatusContext` cria `value` novo a cada render: memoizar com
`useMemo` em `[isOnline]`. `AuthContext` e `ThemeContext` já memoizam
(verificado) — sem mudança.

## RAP-12 — toolchain fora de `dependencies`

Mover `jest`, `jest-expo`, `babel-preset-expo` e `pdfjs-dist` (só usado pelo
script `copy-pdfjs`) para `devDependencies`; regenerar o lock com
`npm install`; gates verdes e `expo export` funcionando. Sem `audit fix`.

## RAP-05 — ícones honestos

Hoje: `icon.png`, `adaptive-icon.png`, `splash-icon.png` e `favicon.png` são
o mesmo PNG 1024×1024 de 1.747.217 B; favicon web de 1,7 MB.
- Fonte única: `assets/icon.png` (1024×1024) — dela derivam todas as demais
  (script `scripts/generate-icons.mjs`, pngjs): `favicon.png` 192×192 +
  `favicon-48.png` 48×48; `adaptive-icon.png`/`splash-icon.png` recomprimidos
  na mesma dimensão (deflate máximo, sem perda visual — mesmos pixels).
- `icon-512.png` (512×512) e `feature-graphic.png` (1024×500) são artes de
  loja (Play Console), sem referência em código (conferido em src/app.json/
  scripts/docs): movem para `assets/store/`, documentado aqui.
- `app.json` continua apontando para os mesmos caminhos de ícone/splash/
  favicon — nenhum caminho de código muda.

## RAP-10 + RAP-14 — índices que faltam (migration 052)

- `pg_trgm` + índices GIN trigram em `activity_log(user_email, user_name,
  description)` — as três colunas do `ilike '%term%'`.
- A busca em `useActivityLog` troca o `created_at::text ilike` por range de
  data: termo em formato de data (`YYYY-MM-DD` ou `DD/MM/YYYY`) vira
  `created_at >= dia` e `< dia+1`; os demais termos seguem nos 3 `ilike`.
- Índices: `members(responsible_id)`, `general_collections(language)`,
  `speeches(member_id)`.
- `select('*')`: só `sunday_agendas` na lista (junto do RAP-03). Os demais
  `select('*')` ficam registrados aqui como conhecidos e fora deste pacote —
  sem caçada difusa.

## RAP-06 — medição, sem chute

No fechamento: `npx expo export --platform ios` e registrar aqui o `.hbc`
(tamanho + módulos) contra a baseline 5.460.946 B / 2.046 módulos. Nenhuma
troca de config (`inlineRequires` etc.) neste pacote.

_Resultado (preenchido no fechamento): —_

## RAP-15 — registro: `useActiveTopics` como está

Decisão: **aceitar como está**, sem código. A biblioteca geral
(≈479 tópicos/idioma) é catálogo global versionado pelo conteúdo, não pela
ala; baixá-la inteira numa query cacheada (staleTime 5 min, persistida pela
allowlist do RAP-04 como `topics`) custa uma transferência por janela de
frescor, não por abertura. Biblioteca versionada (ETag/versão) só se
justifica quando o catálogo crescer a ponto de esse payload competir com o
orçamento offline — gatilho registrado: payload > ~500 KB por idioma ou
> 2.000 tópicos/idioma. Até lá, versionar seria otimização sem medição.

## ACs

- AC1: Query fora da allowlist (activity-log, busca, outra ala, sem sucesso)
  nunca é serializada; cache de outra ala nunca é restaurado (buster).
- AC2: Cache persistido acima do teto é podado com telemetria
  `query_cache_pruned`; sign-out remove o cache persistido (teste).
- AC3: Agenda abre com 3 meses atrás + 6 à frente; `loadMore` busca só o
  delta (segmentos/queryKeys anteriores intactos).
- AC4: Lista de agendas busca só as colunas do card colapsado; expandir
  continua com a linha completa.
- AC5: `AgendaForm` sem `initialNumToRender={filtered.length}`, com
  `getItemLayout` preservado. `useSacramentalHymns` compartilha a query
  `list` (um fetch). Polling 45 s só em speeches/agendas; `SUBSCRIBED` não
  invalida tudo. `OnlineStatusContext` com `value` memoizado.
- AC6: `jest`/`jest-expo`/`babel-preset-expo`/`pdfjs-dist` em
  `devDependencies`, lock regenerado, gates + export verdes.
- AC7: Favicon dedicado pequeno derivado da fonte única; PNGs de 1,7 MB
  recomprimidos sem mudar dimensão; artes de loja em `assets/store/` sem
  quebrar referência.
- AC8: Migration 052 criada (trigram + 3 índices), **não aplicada**; busca
  do activity log por data usa range, não cast de timestamp.
- AC9: Medição do bundle registrada nesta spec (RAP-06); decisão RAP-15
  registrada, sem código.
