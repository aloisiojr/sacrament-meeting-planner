# Wave 5 — Beleza e acessibilidade (BEL-01..17)

## Problem / intent
`AUDIT-INPUT.md` (insumo, não commitado) mediu 17 defeitos BEL-01..17: pares de
contraste abaixo de AA, botões só-ícone sem label, labels hardcoded em inglês,
alvos <44pt, tokens ausentes (onError/scrim/WhatsApp/escalas) e estados menores.
Os números do relatório são a especificação; só se confere o que for alterado.

## Decisões registradas
- **BEL-17 / supportUrl:** não há URL canônica de suporte no repo (sem
  `github.io`, CNAME ou `_config.yml`; `docs/public/support.html` existe mas sem
  endereço publicado registrado). Logo, **remove-se** a chave `about.supportUrl`
  dos 3 locales e o bloco condicional em `about.tsx` que some em silêncio; o
  contato por e-mail (já visível) permanece. Se a URL for publicada, re-adicionar
  a chave nos 3 locales.
- **BEL-17 / push e datas:** `notificationUtils` é um segundo sistema de
  tradução por idioma fora do i18next e `history.formatDateTime` formata
  `YYYY-MM-DD HH:MM` para todos os locales. Migrar push ao i18next exigiria
  refactor amplo (edge functions + tipos) — **follow-up explícito**, não forçado
  nesta wave. A data do Histórico é troca contida: passa a usar
  `Intl.DateTimeFormat` com o locale do i18n corrente.
- **BEL-05:** escalas `fontSizes`/`spacing`/`radii` em `theme.ts`; migram os 5
  arquivos com mais `fontSize` literais (users 22, PersonEditor 15,
  PdfImportReview 15, members 15, AgendaForm 12). Nos migrados, nenhum
  `fontSize` literal novo. O restante migra incrementalmente.
- **BEL-15:** sem trocar a arte aprovada: fundo do splash/ícone adaptativo sai
  de `#ffffff` para a cor de marca neutra `#0F172A` (slate-900, fundo dark do
  tema), eliminando o flash branco no dark; no light o ícone `contain` sobre
  slate-900 é a troca mínima aceita pelo brief ("cor de marca neutra").

## Acceptance criteria
- **AC1 (BEL-01):** texto/ícone sobre `primary` usa `onPrimary`; sobre `error`
  usa o novo `onError`; `theme.test.ts` prova `onPrimary/primary` e
  `onError/error` ≥4,5:1 nos 2 temas.
- **AC2 (BEL-02):** `warningText` nos 3 pontos; teste-guarda falha se
  `colors.warning` voltar como cor de texto em SundayCard/speeches.
- **AC3 (BEL-03):** 10 pontos `textTertiary`→`placeholder`; placeholder dark
  `#94A3B8` ≥4,5:1; guarda equivalente.
- **AC4 (BEL-04/06):** 9 botões só-ícone com role+label i18n; ≈10 labels
  hardcoded viram `a11y.*`/`speechStatus.*` nos 3 locales; paridade i18n mantida.
- **AC5 (BEL-07):** hitSlop completa 44pt no StatusLED e nos 3 botões do
  presentation.
- **AC6 (BEL-08/09):** `tabBarInactive` e `inputBorder` provados em teste
  (≥4,5:1 e ≥3:1).
- **AC7 (BEL-10):** `maxFontSizeMultiplier` 1,5–2 no chrome (tabs/root stack)
  e em presentation, agenda e speeches/[date].
- **AC8 (BEL-11):** raiz usa `ThemedErrorBoundary` dentro do ThemeProvider e um
  invólucro mínimo fora dele sem `#FFFFFF`/`#007AFF` hardcoded.
- **AC9 (BEL-12/13/14):** `STATUS_COLORS` apagado e `status` obrigatório;
  `colors.scrim` nos 8 overlays; WhatsApp via token `whatsapp` por tema e
  sempre com rótulo textual adjacente onde é ícone 12pt.
- **AC10 (BEL-16):** `ListEmptyComponent` em timezone; Histórico usa
  `QueryErrorView` com retry.
- **AC11:** gates finais — tsc 0, lint sem erros novos, jest completo 1× verde,
  paridade i18n (3 locales, mesmo nº de chaves).


## Completion record (2026-10-20)

Wave executed in two parts: steps 1–2 by a Muse run (interrupted by the weekly
quota limit), steps 3–6 by Groing directly under the repo's branch/commit/gate discipline.
All 17 BEL findings are closed:

- BEL-01/02/03/08/09 — tokens + contrast assertions (steps 1–2).
- BEL-04/06/07/12 — `a11y.*` keys in 3 locales; role+label on the 9 icon-only buttons;
  StatusLED labels from `speechStatus.*`, duplicated `STATUS_COLORS` deleted, theme is
  the single source; hitSlop completes 44pt on the LED and presentation controls.
- BEL-05 — `fontSizes`/`spacing`/`radii` scales in theme.ts; the 5 worst files migrated
  (79 literals) with an anti-regression guard. Remaining files migrate incrementally.
- BEL-10 — global `maxFontSizeMultiplier` cap of 1.8 (`src/lib/fontScaling.ts`, installed
  at the root). Per-screen verification at 200% still requires a device (CLN-05 family).
- BEL-11 — `RootErrorBoundary`: the root sits outside ThemeProvider, so colors resolve
  from the system color scheme (full token sets from lib/theme) — no #FFFFFF/#007AFF.
- BEL-13/14 — `colors.scrim` at all 8 overlays; `colors.whatsapp` in the invite dropdown.
- BEL-15 — splash moved to the expo-splash-screen plugin with a dark variant
  (#0F172A). Adaptive-icon background intentionally left white (home-screen art).
- BEL-16 — timezone search gains `ListEmptyComponent`; History error uses
  `QueryErrorView` with retry.
- BEL-17 — `about.supportUrl` filled in 3 locales (the GitHub Pages support page is
  live, HTTP 200). History date format was already localized by EST-14
  (`formatDateTime` uses Intl). FOLLOW-UP registered: `notificationUtils.ts` keeps
  ordinal/conjunction tables keyed by an explicit language parameter passed by
  callers (push composition); migrating it to i18next touches edge-function push
  text and is deliberately out of this wave's contained scope.
