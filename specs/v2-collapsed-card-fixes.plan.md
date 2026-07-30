# Plan: Collapsed card fixes — item 3 (spec: specs/v2-collapsed-card-fixes.md)

Items 1 (AC1 centering) + 2 (AC2 label) are already committed. This plan covers item 3 (AC3–AC9).

## Reuse (extend these, don't recreate)
- `src/components/UnifiedSundayCard.tsx` — change `showBlock2`, refactor the Block-2 (`block2Names`)
  content, reuse the existing row markup + `StatusLED` + `colors.warning` (same yellow the Block-1
  `unified-testimony` label uses). `buildUnifiedCardData` (`src/lib/unifiedCard.ts`) already yields the
  right `nameRows` (testimony w/ prayers = [prayer0, prayer4]; testimony w/o prayers = []) — no change.
- i18n `agenda.noAssignments` (generic) + `sundayExceptions.testimony_meeting`.

## Steps (1 step = 1 commit)
1. **Names-block empty message + testimony display.**
   - `showBlock2 = !isNoSacrament && (!isTestimony || managePrayers || hideStatusBlock)`.
   - Extract the per-row markup into a local `renderNameRow(row)`; restructure `block2Names`:
     - `isTestimony` → render `nameRows[0]` (open prayer, only if managePrayers), then (only if
       `hideStatusBlock`) a yellow "Reunião de testemunho" line (`testID="unified-block2-testimony"`,
       `colors.warning`), then `nameRows[1]` (close prayer, only if managePrayers).
     - else `allUnassigned` → empty row with `t(managePrayers ? 'agenda.noAssignments' : 'agenda.noSpeakers')`.
     - else → `nameRows.map(renderNameRow)` (unchanged; blanks already render a gray StatusLED + space).
   - Add `agenda.noSpeakers` to pt-BR/en-US/es-LA.
   — covers: AC3–AC9; tests: extend `src/__tests__/unified-sunday-card.test.tsx`.

## AC → coverage matrix
| AC  | Test |
|-----|------|
| AC3 | testimony w/o prayers + hideStatusBlock shows block2; testimony w/o prayers + NOT hideStatusBlock hides block2 |
| AC4 | regular, prayers off, all-unassigned → `agenda.noSpeakers` |
| AC5 | regular, prayers on, all-unassigned → `agenda.noAssignments` |
| AC6 | regular, ≥1 assigned → rows rendered (blank = gray dot, no text) |
| AC7 | testimony, prayers off, hideStatusBlock → single `unified-block2-testimony` line |
| AC8 | testimony, prayers on, hideStatusBlock → prayer row + testimony line + prayer row |
| AC9 | testimony, NOT hideStatusBlock → no `unified-block2-testimony` (Block 1 unchanged) |

## Risks / deploys
- No schema/deploy (render only). UnifiedSundayCard is shared by Home + Agendas; only the testimony
  path gated by `hideStatusBlock` changes, so Agendas/hero behavior is preserved.

## Rollback
- `git revert` the step commit.
