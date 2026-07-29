# Spec — v2 People Refinements

Status: **draft (GATE 1 — awaiting approval)** · Branch: `v2.0` · Date: 2026-07-28

Refinements to the v2.0 unified people model (picker + editor + presentation), plus one additive
schema field (`calling`). Builds on `specs/v2-member-management.md`. UI-only except the additive
`calling` column.

## Context & scope
The unified `PeoplePicker` and `PersonEditor` shipped in v2.0 (not yet in prod). This change polishes
the selection/edit UX and adds a person's **calling** (chamado), used when recognizing people and on
the presentation screen. In scope: `PeoplePicker`, `PersonEditor`, the presentation/play recognition
display, `members.calling` column + hooks/types, i18n (3 locales), and the CSV full-dump export/import +
`import_members` RPC (calling column — added per GATE 2 decision 2026-07-28). Out of scope:
controlled calling vocabulary (free text for now), delegation logic changes.

## Decisions (locked with user 2026-07-28)
- "Ver todos" = context subtitle (left) + right-aligned toggle, below the title (capability contexts).
- Functions section label = **"Permissões"** (user choice; kept distinct from app role-permissions,
  which live only in Settings › Users).
- Functions UI = one row per function with a leading icon + trailing switch.
- `calling` = free text, optional, empty by default.

## Acceptance criteria (EARS)

### Schema — calling
- **S1** WHEN creating or editing a person, the system SHALL accept an optional free-text `calling`
  (chamado), empty by default.
- **S2** The `calling` column SHALL be added by an additive migration (`039_add_member_calling.sql`),
  `TEXT` nullable, not breaking existing/older clients (backward compatible).

### Picker (PeoplePicker)
- **P1** The picker SHALL NOT render a per-row delete (trash) icon.
- **P2** WHEN opened, the picker SHALL show a fixed top title **"Selecionar Pessoa"** plus a
  per-context subtitle: speaker → "Selecione o discursante" · opening prayer → "Oração inicial" ·
  closing prayer → "Oração final" · preside → "Pessoas que podem presidir" · conduct → "…dirigir" ·
  lead_music → "…reger" · play_piano → "…tocar piano" · be_recognized → "…ser reconhecidas".
  (Requires a new `context` prop passed by each call site; prayers must distinguish opening/closing.)
- **P3** WHEN a member's informal name is present and differs from the full name, the row SHALL show
  it in parentheses after the full name: `João Vasconcelos (João)`.
- **P4** WHILE in speaker/prayer context, each row's secondary line SHALL show the last-6-months
  speech count (only when > 0) and the "Responsável por …" text (when any), and SHALL NOT show
  functions/capabilities.
- **P5** WHILE in the preside/conduct/lead_music/play_piano contexts, rows SHALL show only name
  (+ informal), with NO secondary line (the "Ver todos" toggle only changes which members are
  listed). Functions (· list) SHALL appear ONLY in the be_recognized context.
- **P5b** WHILE in the be_recognized context, each row's secondary line SHALL show the member's
  `calling` (when set) — always, regardless of "Ver todos" — and the member's functions (· list).
- **P6** In capability contexts (preside/conduct/lead_music/play_piano/be_recognized), a row below the
  title/subtitle SHALL place the subtitle on the left and a right-aligned "Ver todos" toggle; toggling
  it lists everyone (vs only members with the capability). In speaker/prayer contexts there SHALL be
  no toggle (lists everyone).
- **P7** WHILE in multi-select (recognition) with a non-empty search filter, members already selected
  SHALL remain visible even when they don't match the filter.

### Editor (PersonEditor)
- **E1** The informal-name field SHALL have a visible label ("Mais conhecido por").
- **E2** The country code SHALL be chosen via a searchable selector listing flag emoji + country name
  + dial code; the persisted value remains the dial code (e.g. `+55`). No new native dependency
  (emoji flags + a local `countries` list).
- **E3** The functions section SHALL be labeled "Permissões" and rendered as one row per function
  with a leading icon and a trailing switch (replacing the checkbox rows).
- **E3b** The editor SHALL include a `calling` (chamado) free-text field, optional.
- **E4** WHILE editing an existing member who is responsible for others, the editor SHALL show a
  read-only "Responsável por: …" list.
- **E5** WHILE editing an existing member with `member:write`, the editor SHALL show a destructive
  "Excluir pessoa" action (with confirmation) that deletes the person; creation mode SHALL NOT show
  it. The picker's per-row delete is removed (see P1).

### Presentation
- **PR1** On the presentation/play screen, each recognized person SHALL display their name and their
  `calling` (when set), e.g. "Ricardo Almeida — Bispo".

## Release note (mobile-release-advisor)
`calling` is additive and backward compatible — old clients ignore the new column; no gate needed.
Apply `039` to staging now (Management API); it ships to prod at the v2 cutover with 037/038.

## Open questions
- (none blocking) Icons for each function (E3): reuse existing `src/components/icons` where possible,
  add minimal ones if missing — resolved during plan-change.
