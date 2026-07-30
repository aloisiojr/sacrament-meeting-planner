# Card layout tweaks — Home upcoming cards + expanded header (Spec 1 of 2)

## Problem / intent
Two focused card UI changes: (1) declutter the two "próximos domingos" collapsed cards on Home by
hiding their status/roles block; (2) restructure the expanded agenda card header (DateBlock left,
Play "Iniciar" + collapse chevron right) and move the sunday-type selector out of the header into a
"Tipo de Domingo" section at the top of the expanded body. UI only — no schema.

## In scope / Out of scope
- **In:**
  - Home: hide Block 1 (status/roles) on the 2 non-hero "próximos domingos" collapsed cards.
  - Expanded agenda card header restructured; sunday-type selector relocated to a top section.
- **Out:**
  - Topics/themes overhaul (Spec 2).
  - Any change to the hero card, the Agendas-tab collapsed cards, or no-sacrament reason display.

## Baseline (evidence)
- `src/components/UnifiedSundayCard.tsx`: collapsed card = left column (DateBlock + optional
  AttendanceBlock) + right column with **Block 1** = status/roles Pressable (`statusRow`, ~263-277,
  tap → `onPressStatus`) and **Block 2** = names Pressable (~280-322, tap → `onPressSpeakers`).
  No-sacrament layout (~226-244) is a single Pressable showing only the reason (Block 1).
- Home `src/app/(tabs)/index.tsx`: `renderCard` (~113-133); hero = index 0 (highlighted); the 2
  upcoming = `cards.slice(1)` (~162-171), not highlighted, no attendance.
- Expanded header: `src/app/(tabs)/agenda.tsx` local `AgendaSundayCard` (~367-534): `compactHeader`
  Pressable (~450-493) = DateBlock (+AttendanceBlock below, past only) | `SundayTypeDropdown`
  (middle) | Play button (right, `!noSacrament`). Collapse = tapping the header (no chevron today).
  `AgendaForm` renders below only when `!noSacrament`.
- `SundayTypeDropdown` in `src/components/SundayCard.tsx`; wired in agenda.tsx via `handleTypeSelect`
  etc.; gated by `sunday_type:write`. `AgendaForm` first section is "Welcome" (SectionHeader).
- Icons: `ChevronUpIcon`, `PlayIcon` available.

## Acceptance criteria (EARS)
- **AC1:** WHILE a non-hero "próximos domingos" collapsed card is shown on Home AND it is a
  sacrament Sunday (regular/testimony), the system SHALL hide Block 1 (status/roles) and show only
  the DateBlock and the names block (Block 2).
- **AC2:** On those cards the names block SHALL remain tappable (→ speeches screen); no status-block
  tap (agenda open) SHALL be present.
- **AC3:** The hero card and the Agendas-tab collapsed cards SHALL be unaffected (Block 1 still shown).
- **AC4:** IF an upcoming card is a no-sacrament Sunday, THEN it SHALL keep showing its reason (its
  only block is not hidden).
- **AC5:** The expanded agenda card header SHALL lay out, left→right: DateBlock; empty middle; at the
  far right a collapse **chevron**; and immediately left of the chevron the **Play control (icon +
  "Iniciar" text)** — the Play control shown only for sacrament Sundays.
- **AC6:** The expanded header SHALL NOT contain the sunday-type selector.
- **AC7:** WHEN the Sunday is past AND has a sacrament meeting, the AttendanceBlock SHALL appear to
  the RIGHT of the DateBlock (not below it).
- **AC8:** Tapping the chevron OR the header SHALL collapse the card.
- **AC9:** WHEN a card is expanded, the system SHALL render a "Tipo de Domingo" section (section
  label + the sunday-type selector) as the first section below the header, for ALL Sundays
  including no-sacrament.
- **AC10:** The Play control SHALL start the presentation for that date (unchanged) and SHALL be
  absent for no-sacrament Sundays.

## Open questions
- None. (Resolved at gate: upcoming cards keep only names→speeches, no agenda-open; "Tipo de
  Domingo" section shows for all Sundays; chevron + header tap both collapse.)

## Notes
- **Permissions:** sunday-type selector still gated by `sunday_type:write` (unchanged); no new perms.
- **i18n:** add the section label ("Tipo de Domingo") and the Play "Iniciar" text to pt-BR/en-US/es-LA.
- **Offline / data:** presentational only; no data or schema change.
- **Reuse:** add a prop to `UnifiedSundayCard` (e.g. `hideStatusBlock`) for item 1; restructure the
  `AgendaSundayCard` header + a new top section in `agenda.tsx`; reuse `SundayTypeDropdown`,
  `DateBlock`, `AttendanceBlock`, `PlayIcon`, `ChevronUpIcon`.
