# Plan: Supports & Releases — structured entry (spec: specs/v2-supports-releases.md)

## Reuse (extend these, don't recreate)
- `src/components/PeoplePicker.tsx` — person selection; `onSelect(member: Member)` returns the full
  member (id + `calling`). Reuse as-is in the edit screen.
- `src/app/speeches/[date].tsx` — scaffold pattern for the new L3 edit screen (file-based route,
  `useLocalSearchParams`, custom back header, `ThemedErrorBoundary`, modal-driven picker).
- `src/hooks/useAgenda.ts` — `useAgenda(date)`, `useUpdateAgendaByDate()` (edit screen),
  `useUpdateAgenda()` (AgendaForm `updateField`). `AgendaUpdateInput` auto-includes new columns.
- `src/hooks/useMembers.ts` — `useMembers()`, `useUpdateMember({id, calling})` for AC11.
- `src/components/EditableListField.tsx` — copy its read/select **visual** (Pressable rows, dashed
  add affordance, `XIcon` remove) into the new component; do NOT overload its string-only `onSave`.
- `src/components/icons` — `XIcon`, `PencilIcon`, `PlusIcon` (already present).
- AgendaForm's `recognizing` row (`src/components/AgendaForm.tsx:271`) + `ReadOnlySpeakerRow`
  (~798) — the "read-only row that routes a tap to another screen" pattern.

## Steps (1 step = 1 commit)
1. **Add types + formatting lib.** In `src/types/database.ts` add `DesignationType`
   (`'sustain'|'release'|'priesthood'|'new_member'`), `PriesthoodOffice`
   (`'deacon'|'teacher'|'priest'`), `Designation` (`{type, person_name, member_id, calling, office}`),
   and add `designations: Designation[]` to `SundayAgenda` (keep `sustaining_releasing` for now →
   stays green). New `src/lib/designations.ts`: label-key maps + pure `formatDesignationLines(item, t)`
   → `{ line1, line2? }` (`Nome — Tipo — Chamado|Ofício`; new_member has no 3rd segment).
   — covers: AC1, AC2, AC3 (formatting); tests: `src/__tests__/designations-format.test.ts` (new).
2. **Edit screen** `src/app/designations/[date].tsx` (+ `?index=` query for edit vs new). Local
   form: type selector (4 options) → `PeoplePicker` person → sustain/release calling field
   (prefilled from member.calling) / priesthood office selector (3 offices) / new_member none. On
   save: build snapshot item, write back the whole `designations` array via `useUpdateAgendaByDate`;
   for sustain/release linked to a member, `Alert` to update calling → `useUpdateMember` (sustain=set,
   release=null, decline=skip); `router.back()`. i18n keys added to all 3 locales.
   — covers: AC5, AC6, AC7, AC8, AC9, AC10, AC11, AC12, AC13; tests:
   `src/__tests__/v2-designations-edit-screen.test.tsx` (new).
3. **Display component** `src/components/DesignationListField.tsx` — read-only multi-row list over
   `Designation[]`: one row per item (up to 2 lines via `formatDesignationLines`), a dashed add
   affordance, a per-row `XIcon` remove; `disabled` → no add/remove/tap. Props `{ value, onItemPress,
   onAddPress, onRemove, disabled }`.
   — covers: AC3 (render), AC4, AC5b; tests: `src/__tests__/designation-list-field.test.tsx` (new).
4. **Wire AgendaForm.** Replace the `wardBusiness` `EditableListField` (AgendaForm.tsx:411) with
   `DesignationListField` bound to `agenda.designations`; row/add tap → `router.push('/designations/[date]'
   , {date, index?})`; remove → `updateField('designations', next)`; gate on `isObserver` (AC14).
   Drop the `sustaining_releasing` reference. Update the AgendaForm test fixture.
   — covers: AC4, AC5 (nav), AC14; tests: extend `src/__tests__/agenda-recognized-calling.test.tsx`
   or new `src/__tests__/agenda-designations.test.tsx`.
5. **Finalize data model.** Remove `sustaining_releasing` from `SundayAgenda` + all test fixtures;
   add migration `supabase/migrations/041_designations.sql`:
   `ALTER TABLE sunday_agendas ADD COLUMN IF NOT EXISTS designations JSONB NOT NULL DEFAULT '[]'::jsonb;`
   then `ALTER TABLE sunday_agendas DROP COLUMN IF EXISTS sustaining_releasing;` (per ADR 002).
   — covers: AC1 (persistence), AC2; tests: `src/__tests__/database-types.test.ts` update.

## AC → coverage matrix
| AC   | Step(s) | Test(s) |
|------|---------|---------|
| AC1  | 1,5     | designations-format, database-types |
| AC2  | 1,2,5   | designations-format, edit-screen |
| AC3  | 1,3     | designations-format, designation-list-field |
| AC4  | 3,4     | designation-list-field, agenda-designations |
| AC5  | 2,4     | edit-screen (prefill), agenda-designations (nav) |
| AC5b | 3,4     | designation-list-field (remove) |
| AC6  | 2       | edit-screen |
| AC7  | 2       | edit-screen |
| AC8  | 2       | edit-screen |
| AC9  | 2       | edit-screen |
| AC10 | 2       | edit-screen |
| AC11 | 2       | edit-screen (sustain sets / release nulls / decline unchanged) |
| AC12 | 2       | edit-screen |
| AC13 | 2       | edit-screen (non-member: no prompt) |
| AC14 | 4       | agenda-designations (observer read-only) |

## Risks / deploys
- **DEPLOY — migration 041** (breaking: drops `sustaining_releasing`, adds `designations`). Table is
  `sunday_agendas`. Governed by ADR 001/002 (v1.1 forced update). Apply to **staging** first; prod
  only at v2 cutover. Existing free-text is discarded (accepted).
- **useUpdateMember cascade:** any member update cascades a snapshot refresh to future speeches +
  writes an activity-log entry; updating only `calling` is benign (extra writes).
- **Offline:** mutations are non-optimistic → the card row reflects a change after invalidate/refetch;
  acceptable (offlineFirst).
- **Simplification vs. today:** designations list has **no drag-reorder** (EditableListField had it
  for free-text; spec doesn't require it). Flagging in case order matters — items keep insertion order.
- **Migration numbering:** confirm the stray untracked `037_renumber_hymns_to_official.sql` doesn't
  collide before adding `041` (not this change's job, just verify).

## Rollback
- Code: `git revert` steps 1–5 (each atomic).
- DB (staging only pre-cutover): down migration re-adds `sustaining_releasing TEXT` and drops
  `designations`. Not deployed to prod until v2 cutover, so blast radius is staging.
