# Supports & Releases — structured entry (Spec 1 of 3)

## Problem / intent
Today "Apoios e Desobrigações" is a free-text list; the person conducting the meeting gets no
help with what to say. We are rebuilding it as **structured** data so that (later) the app can
show the exact verbatim text to read. This first spec covers only the **data model, the L3
selection screen, and the expanded-card display**. The Play interstitial with the read-texts
(Spec 2) and the Settings template editor (Spec 3) are separate, sequential specs.

## In scope / Out of scope
- **In:**
  - New structured `designations` list on the agenda (ADR 002); `sustaining_releasing` dropped.
  - New single-item **edit screen** for one designation: choose type → person → type-specific
    fields. (No separate list screen — the expanded card keeps today's multi-row list dynamic.)
  - Optional "update this member's calling" confirmation on sustain/release.
  - Expanded-card display of designations: same multi-row list layout as today (rows + an add
    affordance + per-row remove), each row rendered on up to 2 lines.
- **Out (later specs / explicitly not now):**
  - Play interstitial and the verbatim read-texts → **Spec 2**.
  - Configurable templates in Settings → **Spec 3**.
  - Back-migrating existing free-text into structured items (clean cutover, ADR 001/002).

## Baseline (evidence)
- `sundays_agenda.sustaining_releasing: string | null` (`src/types/database.ts:201`), edited via
  `EditableListField` inside `AgendaForm.tsx` (FieldRow `t('agenda.wardBusiness')`, ~line 411).
- Members have free-text `calling: string | null` (`src/types/database.ts:111`, migration 039).
- People selection uses `PeoplePicker` (`src/components/PeoplePicker.tsx`), already used across
  `AgendaForm.tsx`.
- L3 push-screen pattern to mirror: `src/app/speeches/[date].tsx` (list + edit, reached from the
  expanded card).
- `Ward` has `name` / `stake_name` (used later in Spec 2/3 placeholders).

## Data model (per ADR 002)
Add `sundays_agenda.designations jsonb NOT NULL DEFAULT '[]'` — ordered array of:
`{ type, person_name, member_id|null, calling|null, office|null }`.
- `type ∈ {sustain, release, priesthood, new_member}`
- `calling` (snapshot) used for `sustain`/`release`; `office ∈ {deacon, teacher, priest}` for
  `priesthood`. All values are **plain-text snapshots**, never FKs.

## Acceptance criteria (EARS)
- **AC1:** The system SHALL persist each Sunday's supports/releases as an ordered `designations`
  list on the agenda, each item carrying a `type`, a `person_name` snapshot, and the
  type-specific `calling` (sustain/release) or `office` (priesthood).
- **AC2:** The system SHALL store `calling` and `office` as plain-text snapshots on the item, not
  as foreign-key references.
- **AC3:** WHEN the expanded agenda card renders a designation, the system SHALL show it on up to
  two lines as `"[Name] — [TypeLabel] — [Calling|Office]"`, and for `new_member` as
  `"[Name] — [TypeLabel]"` with no third segment.
- **AC4:** The expanded card SHALL render designations using the same multi-row list dynamic as
  today's Apoios e Desobrigações (one row per existing item, an add affordance for the next, and
  a per-row remove control) — NOT a separate list screen and NOT inline text editing.
- **AC5:** WHEN a non-observer taps an existing designation row, the system SHALL open the
  designation edit screen pre-filled with that item; WHEN a non-observer taps the add affordance,
  the system SHALL open the edit screen for a new item; WHEN the user saves, the system SHALL
  return to the card with the item added/updated in place and an empty add affordance remaining.
- **AC5b:** WHEN a non-observer activates a row's remove control, the system SHALL delete that
  item from the list.
- **AC6:** WHEN the user adds or edits an item, the edit screen SHALL first require choosing a
  type from exactly: Apoio (Chamado), Desobrigação (Chamado), Avanço no Sacerdócio, Novo Membro.
- **AC7:** WHEN a type is chosen, the system SHALL require choosing a person via the existing
  `PeoplePicker`.
- **AC8:** WHERE the type is sustain or release, the system SHALL show an editable "calling"
  field pre-populated with the selected member's current `calling`.
- **AC9:** WHERE the type is priesthood, the system SHALL show an office selector offering exactly
  Deacon (pt Diácono / es Diácono), Teacher (pt Mestre / es Maestro), Priest (pt Sacerdote /
  es Presbítero), and SHALL NOT show a calling field.
- **AC10:** WHERE the type is new_member, the system SHALL show no additional field.
- **AC11:** WHEN the user confirms a sustain or release item that is linked to a member, the
  system SHALL ask whether to update that member's calling; IF confirmed AND type=sustain THEN it
  SHALL set `members.calling` to the entered value; IF confirmed AND type=release THEN it SHALL
  set `members.calling` to NULL; IF declined THEN it SHALL leave `members.calling` unchanged.
- **AC12:** The system SHALL always save the item snapshot to the agenda regardless of the
  member-calling choice in AC11.
- **AC13:** IF the selected person is not a linked member, THEN the system SHALL save the snapshot
  and SHALL NOT show the calling-update prompt.
- **AC14:** WHILE the current user is an observer, the system SHALL render designations read-only
  (no add/edit/remove and no navigation into the editor).

## Open questions
- None. (OQ1 resolved: no list screen — the card keeps today's multi-row dynamic, each row opens
  the single-item edit screen. OQ2 resolved: no backward compatibility — drop `sustaining_releasing`
  in this migration; v1.1 forces update, per ADR 001/002.)

## Notes
- **Permissions:** editing gated by the existing agenda edit path (`isObserver` → read-only); no
  new permission string in this spec.
- **i18n:** add type labels, office labels, screen title/buttons, and the update-calling prompt to
  pt-BR, en-US, es-LA. (Verbatim read-texts are Spec 2/3, not here.)
- **Offline:** the agenda `designations` update and the optional `members.calling` update must
  survive offline via the existing React Query + offline-queue path.
- **Release:** migration adds `designations` and drops `sustaining_releasing` (clean replace, no
  back-migration); breaking cutover governed by ADR 001 / ADR 002 (v1.1 forced update).
