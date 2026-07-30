# Collapsed card fixes — centering, label, names-block logic (items 1-3)

## Status
- Items 1 (centering) + 2 (label) — **DONE & committed**.
- Item 3 (names-block logic) — **this build**, with corrected scope: the testimony display in the
  names block is **only** for the Home "próximos domingos" collapsed cards (`hideStatusBlock`), so it
  never duplicates the testimony label the status block still shows on hero/Agendas. Block 1 is NOT
  changed (AC9 dropped).

## Problem / intent
Fix the names block's "no one assigned" / testimony display. The empty-message wording + partial rows
apply to the names block on ALL collapsed cards; the testimony line in the names block is Home-upcoming
only.

## In scope / Out of scope
- **In (item 3):** names-block empty message (speaker-specific vs generic by managePrayers); partial
  rows (blanks = gray dot, no text); testimony display in the names block ONLY when `hideStatusBlock`.
- **Out:** Block 1 (status block) unchanged; no-sacrament layout; expanded agenda card; hymn scrubber;
  the "Outros" type-input bug (separate fixes).

## Baseline (evidence)
- `src/components/UnifiedSundayCard.tsx`: `mainRow` (styles ~354) `alignItems:'flex-start'` top-aligns
  the right column; `hideStatusBlock` hides Block 1 (`statusRow`, ~266). Block 2 = `block2Press`
  (~285) with `block2Names` rows; empty state `unified-empty-row` (~293) uses `t('agenda.noAssignments')`.
  Block 1 `statusInner` (~155-172): line 2 shows speakers count OR `unified-testimony` yellow label
  (`t('sundayExceptions.${reason}')`, `colors.warning`) OR `unified-reason`.
  `showBlock2 = !isNoSacrament && (!isTestimony || managePrayers)` (~116).
- `src/lib/unifiedCard.ts` `buildUnifiedCardData`: builds `nameRows` (kind 'prayer'|'speaker', name,
  status) — regular = [prayer0?, speakers, prayer4?]; testimony = [prayer0, prayer4] only if
  managePrayers; no-sacrament = [].
- Home: `src/app/(tabs)/index.tsx` — `t('home.upcomingSundays')` label; upcoming cards pass
  `hideStatusBlock`.
- i18n: `agenda.noAssignments` (generic), `sundayExceptions.testimony_meeting`, `prayers.prayerPrefix`.

## Acceptance criteria (EARS)
- **AC1:** WHEN a collapsed card has `hideStatusBlock` set, the names block SHALL be vertically
  centered against the DateBlock (not top-aligned).
- **AC2:** The Home upcoming-section label SHALL read "Designações dos Próximos Domingos" (updated in
  pt-BR/en-US/es-LA).
- **AC3:** The names block SHALL render for regular sacrament Sundays regardless of `managePrayers`;
  for testimony meetings it SHALL additionally render when `hideStatusBlock` is set (Home upcoming).
  No-sacrament Sundays unchanged: names block omitted.
- **AC4:** WHILE `managePrayers` is OFF, IF a regular Sunday has no assigned speakers, THEN the names
  block SHALL show "Não há discursantes designados" (new speaker-specific message).
- **AC5:** WHILE `managePrayers` is ON, IF a regular Sunday has no assignments, THEN the names block
  SHALL show the generic "Não há pessoas designadas".
- **AC6:** WHEN a regular Sunday has ≥1 assignment, the names block SHALL show the rows (3 speaker
  rows when prayers off; 5 rows = open-prayer + 3 speakers + close-prayer when prayers on); each
  unassigned row a gray StatusLED with no name text.
- **AC7:** WHILE `managePrayers` is OFF AND `hideStatusBlock` is set (Home upcoming card), WHEN the
  Sunday is a testimony meeting, the names block SHALL show a single "Reunião de testemunho" line in
  the yellow/warning style (same as conference reasons).
- **AC8:** WHILE `managePrayers` is ON AND `hideStatusBlock` is set (Home upcoming card), WHEN the
  Sunday is a testimony meeting, the names block SHALL show 3 lines: opening-prayer row (StatusLED +
  name if any), a yellow "Reunião de testemunho" line, then the closing-prayer row.
- **AC9:** Block 1 (status block) is UNCHANGED — the names-block testimony display is gated to
  `hideStatusBlock`, so it never duplicates the status block's testimony label (shown on hero/Agendas).

## Open questions
- None. (Testimony-in-names-block scoped to Home upcoming cards — no duplication; Block 1 untouched.)

## Notes
- **i18n:** add `agenda.noSpeakers` ("Não há discursantes designados" / "No speakers assigned" /
  "No hay oradores asignados") to 3 locales; reuse `agenda.noAssignments` + `sundayExceptions.testimony_meeting`.
- **Shared:** UnifiedSundayCard + buildUnifiedCardData feed both Home and Agendas — verify both.
- **Offline/schema:** none (render only).
