# Plano — Wave 2A: visibilidade de erros + "hoje" local

Spec: `specs/fix-visibility-time.md` · Branch: `muse/smp-fix-visibility-time` · Base: `main` @7ccdea1

## Baseline (medido 2026-10-19)

`npm ci` 0 · `npx tsc --noEmit` 0 · `npm run lint` 0 erros/5 warnings ·
`npx jest --ci` 320 suites/5680 testes (5679 verdes + 1 flaky pré-existente
`editable-list-field-render-label` ios, verde isolado).

## Passos (commit atômico por achado)

1. ✅ **docs: spec+plan** (`31eeb4e`) desta onda.
2. ✅ **EST-08 + EST-13 — hoje local** (`660ae39`)
   - `dateUtils`: `getMonthBounds` local (+ teste `dateUtils.test.ts`).
   - 5 sites → `toISODateString`: `useMembers` (cascata + `checkFutureSpeeches`),
     `useTopics.checkTopicFutureSpeeches`, `useSpeechCounts` (cutoff + today).
   - Teste novo `local-today.test.ts{x}` com `process.env.TZ='America/Sao_Paulo'`,
     relógio às 22h locais: as funções públicas filtram pelo dia local. Rodar antes do fix
     (falha) e depois (passa).
3. ✅ **EST-06 + EST-19 — Home/Presentation veem erro** (`9a6cba5`)
   - Home: consumir `isLoading/isError/error/refetch` dos 3 hooks; loading próprio;
     erro total → `QueryErrorView` (retry = refetch do que falhou); erro parcial → cards +
     aviso com retry (`home-partial-error`).
   - `usePresentationData`: expor `isError/error/refetch`; Presentation: `QueryErrorView`.
   - Testes: Home em erro mostra erro+retry e retry chama refetch; falha de 1 hook mantém
     cards dos demais; Presentation em erro não renderiza cartões `---`.
4. ✅ **EST-07 — errorReporter** (`3e4751f`)
   - `src/lib/errorReporter.ts` (throttle 1/assinatura/60s, teto 5/min, `suppressed`,
     ward via setter) + teste unitário (payload sem texto, throttle, teto).
   - `ErrorBoundary.componentDidCatch` → `reportAppError`; console só em `__DEV__`.
   - `_layout`: instalar handler global delegando ao anterior; `AuthProvider` registra ward.
   - Teste: boundary reporta 1× sob erro repetido.
5. ✅ **EST-26 — QueryClient único** (`25b4342`)
   - Mover a criação de `_layout` para `src/lib/queryClient.ts`; `_layout` importa.
   - Teste: sign-out limpa o singleton importado de `lib/queryClient`.
6. ✅ **EST-10 + EST-15 — AuthContext** (`f8ff03b` + mock `d050bb4`)
   - `INITIAL_SESSION` nulo ignorado enquanto carrega; `cancelled` no `getSession`.
   - Idioma: efeito de boot impõe `user_metadata.language`; efeito da ala com deps primitivas,
     `cancelled`, guarda de já-aplicado, `{error}` mantém idioma.
   - `settings/users.tsx`: `signOut` do `useAuth`.
   - Testes: boot impõe idioma salvo sem fetch da ala resolver; `INITIAL_SESSION` nulo não
     derruba sessão; erro da ala mantém idioma; token refresh não refaz fetch/aplicação.
7. ✅ **EST-20 — decisão única de startup** (`a860c29`)
   - `getStartupGateState` em `lib/` + teste puro; `NavigationGuard` consome nos dois lugares.
8. ✅ **EST-23 — token de push visível** (`9430e2f`)
   - Erro de upsert/catch → `reportHealthEvent('push_token_register_failed')`; guardas
     explícitas no lugar de `user!.id`.
   - Teste: upsert com erro registra evento e não marca registrado.
9. ✅ **i18n (se preciso) + gates**: nenhuma string nova (sem toque em locales);
   `npx tsc --noEmit` 0 · `npm run lint` 0 erros/5 warnings (baseline) ·
   `npx jest --ci --maxWorkers=2` 338 suites/5742 testes verdes. Sem push, sem merge.
