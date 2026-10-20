# Plan: Wave 5 — Beleza e acessibilidade (BEL-01..17)
(spec: `specs/beauty-a11y-wave5.md`)

## Steps (1 step = 1 commit)
1. `fix(theme): tokens onError/whatsapp/scrim + contraste BEL-01/08/09` — theme.ts
   (onError, whatsapp, scrim, placeholder dark, tabBarInactive, inputBorder) +
   theme.test.ts (pares AC1/AC6) + users.tsx/SwipeableCard onPrimary/onError.
2. `fix(a11y): warningText e placeholder corretos + guardas BEL-02/03` —
   SundayCard, speeches/[date], 10 placeholderTextColor; guardas em teste novo
   `beauty-a11y-guards.test.ts` (comportamental via tokens + varredura dos
   componentes nomeados no relatório).
3. `feat(a11y): labels/roles/hitSlop BEL-04/06/07/12` — 9 botões só-ícone,
   SearchInput/StatusLED/SwipeableCard/presentation/agenda labels i18n,
   chaves `a11y.*` nos 3 locales, StatusLED sem STATUS_COLORS, hitSlop 44pt.
4. `feat(theme): escalas BEL-05` — fontSizes/spacing/radii + migração dos 5
   piores arquivos (users, PersonEditor, PdfImportReview, members, AgendaForm).
5. `fix(a11y): font scaling, ErrorBoundary, scrim, WhatsApp, splash BEL-10/11/13/14/15`
   — maxFontSizeMultiplier, ThemedErrorBoundary na raiz, colors.scrim ×8,
   token whatsapp, app.json fundo neutro.
6. `fix(ux): estados e i18n BEL-16/17` — ListEmptyComponent timezone,
   QueryErrorView history, remoção supportUrl, data localizada no Histórico.
7. Fechamento: gates 1× (tsc, lint, jest completo), PROGRESS.md, RESULT_JSON.

## AC → coverage
| AC | Steps | Test |
|----|-------|------|
| AC1/AC6 | 1 | theme.test.ts pares de contraste |
| AC2/AC3 | 2 | beauty-a11y-guards.test.ts |
| AC4/AC5 | 3 | render tests existentes + guards; i18n.test.ts paridade |
| BEL-05 | 4 | guarda: sem fontSize literal nos 5 migrados |
| AC7–AC10 | 5, 6 | testes existentes das telas + guards |
| AC11 | 7 | suíte completa 1× |
