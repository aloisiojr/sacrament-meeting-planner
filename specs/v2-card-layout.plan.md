# Plan: Card layout tweaks (spec: specs/v2-card-layout.md)

## Reuse (extend these, don't recreate)
- `src/components/UnifiedSundayCard.tsx` — add a `hideStatusBlock` prop; gate the `statusRow`
  Pressable (Block 1) on it in the regular/testimony layout only (no-sacrament branch untouched).
- `src/app/(tabs)/index.tsx` — `renderCard` passes `hideStatusBlock` for the 2 upcoming cards.
- `src/app/(tabs)/agenda.tsx` `AgendaSundayCard` (~439-509) — restructure the expanded header and add
  a top "Tipo de Domingo" section; reuse `SundayTypeDropdown`, `DateBlock`, `AttendanceBlock`,
  `PlayIcon`, and `ChevronUpIcon` (add import).

## Steps (1 step = 1 commit)
1. **Item 1 — hide Block 1 on Home upcoming cards.** Add `hideStatusBlock?: boolean` to
   `UnifiedSundayCardProps`; in the regular layout wrap the `statusRow` Pressable in
   `{!hideStatusBlock && (...)}` (right column then shows only Block 2). No-sacrament layout and the
   hero/Agendas cards unchanged. In `index.tsx`, pass `hideStatusBlock` from `renderCard` opts and set
   it for the upcoming (`cards.slice(1)`) cards only.
   — covers: AC1, AC2, AC3, AC4; tests: `agenda-unified-card.test.tsx` or a focused card test
   (hideStatusBlock hides `unified-status-*`, keeps `unified-speakers-*`); `v2-home-unified-cards.test.tsx`
   (hero not hidden; upcoming hidden).
2. **Item 2 — expanded header + Tipo de Domingo section.** In `AgendaSundayCard`:
   - Header row: left = DateBlock + (past sacrament) AttendanceBlock laid out **side by side** (row,
     not stacked); a flex spacer in the middle; right = Play control (PlayIcon + "Iniciar" text,
     `!noSacrament`) then a collapse **chevron** (`ChevronUpIcon`, testID `agenda-collapse-${date}`,
     onPress `onToggle`). Remove `SundayTypeDropdown` from the header. Header press still collapses (AC8).
   - Below the header, for ALL Sundays, render a "Tipo de Domingo" section: a section label
     (`t('agenda.sundayTypeLabel')`) + the `SundayTypeDropdown` (same props). Then the existing
     `{!noSacrament && <AgendaForm/>}`.
   - i18n: add `agenda.sundayTypeLabel` ("Tipo de Domingo") and `agenda.start` ("Iniciar") to 3 locales.
   — covers: AC5, AC6, AC7, AC8, AC9, AC10; tests: update the expanded-header test in
   `agenda-unified-card.test.tsx` (header has DateBlock + Play "Iniciar" + collapse chevron, NO
   dropdown; a "Tipo de Domingo" section with the dropdown renders below, incl. no-sacrament; tapping
   the chevron toggles).

## AC → coverage matrix
| AC   | Step | Test |
|------|------|------|
| AC1  | 1 | card test — status row hidden when hideStatusBlock |
| AC2  | 1 | card test — speakers row still present/tappable |
| AC3  | 1 | v2-home-unified-cards — hero unaffected; agenda-unified-card unaffected |
| AC4  | 1 | card test — no-sacrament card unchanged |
| AC5  | 2 | agenda-unified-card — header layout (DateBlock, Play "Iniciar", chevron) |
| AC6  | 2 | agenda-unified-card — no dropdown in header |
| AC7  | 2 | agenda-unified-card — attendance beside DateBlock (past) |
| AC8  | 2 | agenda-unified-card — chevron toggles (onToggle) + header press |
| AC9  | 2 | agenda-unified-card — "Tipo de Domingo" section + dropdown for all Sundays |
| AC10 | 2 | agenda-unified-card — Play present (sacrament) / absent (no-sacrament) |

## Risks / deploys
- No schema/deploy — presentational only.
- `UnifiedSundayCard` is shared by Home + Agendas; `hideStatusBlock` defaults false so Agendas is
  unaffected. `SundayTypeDropdown` behavior unchanged (same props, moved location).
- Update the existing expanded-header test that asserts the OLD header (dropdown in header).

## Rollback
- `git revert` steps 1-2.
