# Collapsed card fixes — centering + label (Spec of items 1-2; item 3 PAUSED)

## Problem / intent
Two small fixes to the collapsed Sunday cards: (1) vertically center the names block on the Home
"próximos domingos" cards (top-aligned looks off now that the status block is hidden); (2) rename the
Home section label. UI only — no schema.

**Item 3 (names-block "no one assigned" / testimony logic) is PAUSED** by the user: applying it to all
collapsed cards would duplicate the testimony label (which still lives in the status block on
hero/Agendas). The ACs are kept below (AC3–AC9) for when it resumes, but are OUT of this build.

## In scope / Out of scope
- **In:** item 1 (AC1 centering) + item 2 (AC2 label).
- **Out (for now):** item 3 (AC3–AC9, PAUSED); no-sacrament layout; expanded agenda card; hymn
  scrubber (separate spec); the "Outros" type-input bug (separate fix).

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
- **AC3:** The names block SHALL render for ALL sacrament Sundays — regular AND testimony —
  regardless of `managePrayers` (no-sacrament Sundays unchanged: names block omitted).
- **AC4:** WHILE `managePrayers` is OFF, IF a regular Sunday has no assigned speakers, THEN the names
  block SHALL show "Não há discursantes designados" (new speaker-specific message).
- **AC5:** WHILE `managePrayers` is ON, IF a regular Sunday has no assignments, THEN the names block
  SHALL show the generic "Não há pessoas designadas".
- **AC6:** WHEN a regular Sunday has ≥1 assignment, the names block SHALL show the rows (3 speaker
  rows when prayers off; 5 rows = open-prayer + 3 speakers + close-prayer when prayers on); each
  unassigned row a gray StatusLED with no name text.
- **AC7:** WHILE `managePrayers` is OFF, WHEN the Sunday is a testimony meeting, the names block SHALL
  show a single "Reunião de testemunho" line in the yellow/warning style (same as conference reasons).
- **AC8:** WHILE `managePrayers` is ON, WHEN the Sunday is a testimony meeting, the names block SHALL
  show 3 lines: opening-prayer row (StatusLED + name if any), a yellow "Reunião de testemunho" line,
  then the closing-prayer row.
- **AC9:** To avoid duplication, the status block (Block 1) SHALL NOT show the testimony label anymore
  (it now lives in the names block); Block 1 keeps its role line + speaker/prayer/hymn counts.

## Open questions
- None. (Resolved at gate: item 3 applies to all collapsed cards; testimony label relocates from the
  status block to the names block to avoid duplication — confirm at GATE 1.)

## Notes
- **i18n:** add `agenda.noSpeakers` ("Não há discursantes designados" / "No speakers assigned" /
  "No hay oradores asignados") to 3 locales; reuse `agenda.noAssignments` + `sundayExceptions.testimony_meeting`.
- **Shared:** UnifiedSundayCard + buildUnifiedCardData feed both Home and Agendas — verify both.
- **Offline/schema:** none (render only).
