# Wave 2A — o app enxerga os próprios erros, e "hoje" é hoje (EST-06/07/08/10/13/15/19/20/23/26)

## Problem / intent

A auditoria adversarial da v2.0 (`AUDIT-INPUT.md`, insumo não commitado) provou duas cegueiras:
(1) erro de query é invisível na Home e na Apresentação (EST-06/19) e crash de render não é
reportado a ninguém (EST-07) — em produção o dono não vê o app quebrar; (2) "hoje" calculado em
UTC em 5 sites erra o dia toda noite no Brasil (EST-08/13). Completam a onda: o efeito de idioma
do `AuthContext` ignora erro, re-dispara por objeto e não impõe o idioma salvo no boot (EST-10);
`INITIAL_SESSION` pode derrubar a sessão restaurada e há `supabase.auth.signOut()` direto em
tela (EST-15); a decisão de startup do `_layout` é duplicada (EST-20); o erro ao registrar o
token de push é engolido (EST-23); e a unicidade do `QueryClient` é convenção, não estrutura
(EST-26).

## Baseline (evidence)

- Medido em 2026-10-19 nesta máquina (branch `muse/smp-fix-visibility-time`, base `main`
  @7ccdea1): `npm ci` 0; `npx tsc --noEmit` 0 erros; `npm run lint` 0 erros/5 warnings;
  `npx jest --ci` 320 suites / 5680 testes — 5679 verdes, 1 falha flaky pré-existente
  (`editable-list-field-render-label`, projeto ios) que passa isolada (8/8).
- Inventário conferido por grep: `toISOString()` como "hoje" em exatamente 5 sites de produção
  (`useMembers.ts:203,240`, `useTopics.ts:138`, `useSpeechCounts.ts:29,32`); `new QueryClient`
  em 1 site (`_layout.tsx:37`); `ErrorUtils` 0 sites; `QueryErrorView` em 4 telas (Home e
  Presentation fora).

## Divergências brief × código (medidas, não presumidas)

O brief desta onda descreve alguns sites com nomes que não existem nesta base. Registra-se o
equivalente real adotado, sem inventar o que não há:

- **EST-13 / `getMonthBounds`**: não existe função com esse nome (grep + `git log -S` vazios).
  O "limite de mês" em UTC real é o cutoff de 6 meses de `useSpeechCounts`. A onda cria
  `getMonthBounds` em `dateUtils` calculando em hora local (helper canônico, testado) e corrige
  o site UTC via `toISODateString`.
- **EST-15 / Presentation**: `presentation.tsx` não tem logout. O `supabase.auth.signOut()`
  direto em tela é de `settings/users.tsx` (apagar a própria conta) — é ele que passa a usar o
  `signOut` do `AuthContext`. Também não há timer de 100 ms de idioma no `AuthContext`; a
  propagação é refeita por estado (efeito sobre `userId`+idioma salvo), que é o espírito do item.
- **EST-20 / splash**: não há `StartupGate`/splash; a decisão duplicada é a do `NavigationGuard`
  (efeito de redirect e render de loading decidindo separadamente). Vira uma função pura única.
- **EST-26**: já há um só `new QueryClient`, mas a unicidade depende de o `AuthProvider` estar
  dentro do provider certo. A criação sai do `_layout` para `lib/queryClient.ts` (singleton
  importável e testável); `AuthContext` segue via `useQueryClient()` — agora o mesmo objeto por
  construção, travado por teste de identidade comportamental (sign-out limpa o singleton).
- **EST-19 / `data: any`**: os hooks da Home já retornam `useQuery` tipado
  (`Promise<SundayAgenda[]>` etc.); o que falta é a Home consumir `isLoading/isError/refetch`
  por hook (erro tratado por hook, sem `Promise.all` a corrigir).

## Decisão EST-07 — reporter próprio, sem SDK novo

Sem Sentry (nenhum SDK novo). Reusa `app_health_events` via `reportHealthEvent`
(`lib/appHealth`), no padrão `offline_dead_letter` da wave 1. Novo `src/lib/errorReporter.ts`:

- `reportAppError(error, source)` — nunca lança; chamado pelo `ErrorBoundary.componentDidCatch`
  e pelo handler global (`ErrorUtils.setGlobalHandler`, instalado no `_layout`, delegando ao
  handler anterior depois de registrar).
- **Formato do evento**: `event_type = 'app_error'`; `details` só com números/booleanos (o
  sanitizador de `appHealth` recusa texto por privacidade — mensagem/stack **nunca** saem do
  aparelho): `{ fromBoundary: boolean, fromGlobalHandler: boolean, isFatal: boolean,
  messageLength: number, stackLines: number, suppressed: number }`.
  `app_version`/`platform` já vão pelo `reportHealthEvent`.
- **Throttle anti-flood**: no máximo 1 evento por assinatura (nome+tamanho da mensagem) a cada
  60 s e teto global de 5 eventos/min por processo; o excedente é contado e vai como
  `suppressed` no próximo evento emitido. Loop determinístico de render não vira flood na tabela.
- `wardId` corrente é registrado via `setErrorReporterWardId` (chamado pelo `AuthProvider`);
  sem ala (pré-login) o evento é descartado — a tabela é `ward_id`-escopada e injetar ward falsa
  poluiria o diagnóstico de outra ala.
- O `ErrorBoundary` para de dumpar erro/info em `console.error` fora de `__DEV__` (o dump
  incluía `componentStack`; em produção só o reporter registra).

## In scope / Out of scope

- **In:** EST-06, EST-07, EST-08, EST-10, EST-13, EST-15, EST-19, EST-20, EST-23, EST-26
  conforme os ACs abaixo.
- **Out:** `useRealtimeSync` (EST-18/24), `activityLog` (EST-12), `useSpeeches` internals
  (EST-16), `useOfflineQueueProcessor` (EST-17), designations (EST-21) — wave 2B.
  Migrations, edge functions e `permissions.ts` intocados. Performance (wave 3), beleza (wave 5).

## Acceptance criteria

- AC1 (EST-06/19): a Home distingue loading (indicador próprio, sem cards), erro total
  (`QueryErrorView` com retry chamando `refetch()` das queries falhadas; a query mantém
  `retry: 2` via `shouldRetryQuery`) e vazio (cards renderizados sem dados). Erro parcial
  (um hook falha, outros trazem dados) **não apaga** as seções boas: os cards ficam e um aviso
  com retry rebusca só o que falhou.
- AC2 (EST-06): a Presentation expõe `isError`/`refetch` (via `usePresentationData`) e mostra
  `QueryErrorView` com retry em vez de conduzir a reunião com `---` sobre backend quebrado;
  loading e vazio seguem distintos.
- AC3 (EST-07): erro de render capturado pelo boundary e erro global geram `app_error` em
  `app_health_events` no formato acima, com throttle; nenhum texto de mensagem/stack no payload.
- AC4 (EST-08): os 5 sites passam a usar `toISODateString` (hora local). Às 22h em
  `America/Sao_Paulo`, "hoje" é o dia local — travado por teste comportamental com `TZ` real
  sobre as funções públicas (`checkFutureSpeeches`, `checkTopicFutureSpeeches`, `useSpeechCounts`)
  que falha no código antigo. Varredura: nenhum `toISOString()` restante em `src/` fora de testes.
- AC5 (EST-13): `getMonthBounds(date)` retorna primeiro/último dia do mês em hora **local**
  (teste em `America/Sao_Paulo` e em fuso positivo extremo); o cutoff de `useSpeechCounts`
  deixa de passar por UTC (coberto pelo AC4).
- AC6 (EST-10): o efeito de idioma usa deps primitivas (`user?.id` + string do idioma salvo),
  guarda `cancelled`, guarda de "já aplicado" (mesmo usuário+ala+idioma não reaplica nem
  refaz fetch a cada refresh de token) e, em erro da query da ala, **mantém** o idioma atual
  em vez de cair para `en-US`. O idioma salvo em `user_metadata` é imposto no boot por efeito
  próprio sobre a sessão — sem depender do fetch da ala.
- AC7 (EST-15): `INITIAL_SESSION` com sessão nula não derruba sessão restaurada nem encerra o
  `loading` antes do `getSession()` resolver; `getSession()` tem guarda `cancelled`; o logout
  de `settings/users.tsx` usa o `signOut` do `AuthContext`.
- AC8 (EST-26): um único `QueryClient`, criado em `lib/queryClient.ts` e importado pelo
  `_layout`; o sign-out limpa esse mesmo cliente (teste comportamental de identidade).
- AC9 (EST-20): a decisão de startup (loading × redirect × pronto) é uma função pura única
  (`getStartupGateState`) consumida pelo render e pelo efeito do `NavigationGuard`.
- AC10 (EST-23): erro ao registrar o token de push gera health event
  `push_token_register_failed` (visível para diagnóstico) e não marca como registrado (tenta de
  novo na próxima abertura); `user!.id` nas queries de preferência vira guarda explícita.
- AC11: nenhuma string nova hardcoded — reaproveita chaves i18n existentes
  (`errors.queryFailed*`, `common.retry`) ou adiciona aos 3 locales; os 4 gates verdes ao final
  com os testes novos; testes novos falham no código antigo (verificado antes do fix onde seguro).

## Notes

- `useSpeechCounts` mantém janela "mesmo dia, 6 meses atrás" — só troca a conversão UTC→local;
  `getMonthBounds` não muda a semântica da contagem.
- O handler global delega ao handler anterior: reportar nunca muda o comportamento de crash
  (redbox em dev, relatório do RN em produção).
- Health events continuam fora da fila offline (decisão de `lib/appHealth`): crash sem rede
  perde o evento — aceito, documentado, e o throttle é por processo.
