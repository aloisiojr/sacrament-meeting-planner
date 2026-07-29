# Plan — v2 People Refinements

Spec: `specs/v2-people-refinements.md` (GATE 1 approved 2026-07-28) · Branch: `v2.0`
Base green: v2.0 tip (tsc 0 / lint 0). Each step = one atomic commit that keeps the suite green.
Build orchestration: fresh subagent per step, expand→migrate→contract, verify each handoff
(`~/.claude/dev-flow/build-orchestration.md`).

## Reuse (do NOT recreate)
- `src/lib/countryCodes.ts` — `COUNTRY_CODES` (~200, flag emoji, Brazil first), `getFlagForCode`,
  `splitPhoneNumber`. Country picker consumes this.
- `getResponsibleForMap`, `filterMembers` (`src/hooks/useMembers.ts`); `useDeleteMember`.
- Responsible-picker modal in `PersonEditor` is the template for the new country picker.
- `PeopleCapability`, `CAPABILITY_ORDER`, `CAPABILITY_FIELD` (`PersonEditor.tsx`).

## Key facts from exploration
- Picker call sites: `AgendaForm.tsx` (role / recognize / prayer render sites at ~654/666/677) and
  `speeches.tsx:641` (speaker+prayer). Role capability set at trigger sites (preside 241, conduct 259,
  play_piano 313, lead_music 331). speeches.tsx derives context from `speech.position` (0/4=prayer).
- `useCreateMember` **whitelists** columns → must add `calling` to the insert; `useUpdateMember` is
  pass-through (auto once in `UpdateMemberInput`).
- Presentation: `recognized_names` is a newline-joined string of `full_name`s (no member ids);
  `usePresentationMode.buildPresentationCards:79-85`. Calling must be resolved by name→Member
  (best-effort; name collisions possible; no match / no calling → name only).
- Icons barrel (`src/components/icons/index.tsx`) has no fit for the 5 functions → add Lucide paths.

---

## Step 1 — Foundation: schema + types + i18n  (commit: `feat(v2-people): add calling field + i18n scaffolding`)
- `supabase/migrations/039_add_member_calling.sql`: additive, `ALTER TABLE members ADD COLUMN IF NOT
  EXISTS calling TEXT;` (header: "additive only — safe for live v1.0 clients"). *(S1, S2)*
- `src/types/database.ts`: add `calling: string | null` to `Member`; `calling?: string | null` to
  `CreateMemberInput` and `UpdateMemberInput`.
- `src/hooks/useMembers.ts`: add `calling` to the `useCreateMember` insert object (update pass-through
  needs nothing).
- i18n (all 3 locales) — add: `personEditor.permissions` ("Permissões"/"Permissions"/"Permisos"),
  `personEditor.callingLabel`+`callingPlaceholder`, `personEditor.informalNameLabel`
  ("Mais conhecido por"), `personEditor.responsibleForList` (header), `personEditor.deletePerson`
  ("Excluir pessoa"), `personEditor.deletePersonConfirm`, `personEditor.countryCodeSelect`+
  `countrySearch`, `people.pickerTitle` ("Selecionar Pessoa"), `people.subtitles.{speaker,
  opening_prayer,closing_prayer,preside,conduct,lead_music,play_piano,be_recognized}`.
- Tests: `useCreateMember`/`useUpdateMember` persist `calling` (behavioral).
- **After commit:** apply `039` to staging via Management API; set sample callings (Ricardo=Bispo,
  Paulo=1º Conselheiro, Élder Carvalho=Presidente de Estaca) so recognition/presentation are testable.

## Step 2 — PersonEditor  (commit: `feat(v2-people): PersonEditor — permissions switches, country picker, calling, responsible list, delete`)
- **E1** label above informal-name field (`personEditor.informalNameLabel`).
- **E2** replace country-code `TextInput` with a selector (Pressable → modal list of `COUNTRY_CODES`,
  searchable by label/code, shows `flag  label  code`); store the dial `code`. Reuse the responsible
  picker modal pattern.
- **E3** section header → `personEditor.permissions`; render `CAPABILITY_ORDER` as one row per
  function = leading icon + label + trailing RN `Switch` (replace checkbox rows). Add 5 icons to the
  icons barrel (Lucide paths): preside (crown), conduct (user-cog), lead_music (music), play_piano
  (piano), be_recognized (badge-check).
- **E3b** add `calling` free-text field (label + placeholder) in the identity section.
- **E4** when editing an existing member with dependents (`getResponsibleForMap`), show a read-only
  "Responsável por: …" block.
- **E5** when editing existing + `member:write`, a destructive "Excluir pessoa" button (footer) →
  confirm → `useDeleteMember` → close. Not shown in create mode.
- Tests: informal label present; country picker opens/selects and persists dial code; permission
  switches toggle + save; calling saves; responsible-for list renders only with dependents; delete
  button present only when editing + confirms.

## Step 3 — PeoplePicker  (commit: `feat(v2-people): PeoplePicker — context title/subtitle, per-context 2nd line, ver-todos toggle, keep-selected`)
- Add `context: PickerContext` prop (`speaker|opening_prayer|closing_prayer|preside|conduct|
  lead_music|play_piano|be_recognized`); keep `capability` derivable or map internally.
- **P2** fixed title `people.pickerTitle` + per-context subtitle (`people.subtitles.*`).
- **P1** remove per-row trash icon (delete lives in editor now); keep per-row edit (pencil).
- **P3** informal in parentheses: `Full Name (Informal)`.
- **P4** speaker/opening_prayer/closing_prayer: 2nd line = speech count (6mo, >0) + "Responsável por…".
- **P5** preside/conduct/lead_music/play_piano: name (+informal) only, no 2nd line.
- **P5b** be_recognized: 2nd line = `calling` (when set) + functions (`capabilitiesShort` · list).
- **P6** capability contexts: row below title = subtitle left + right-aligned "Ver todos" toggle
  (Switch); speaker/prayer: no toggle.
- **P7** multiSelect + non-empty search: always include already-`selectedIds` members in `rows`.
- Tests: title+subtitle per context; 2nd-line content per context (speaker vs preside vs recognize);
  no trash icon; ver-todos toggle filters; selected members stay visible when filtered out.

## Step 4 — Wire `context` at call sites  (commit: `feat(v2-people): pass picker context from agenda + speeches`)
- `AgendaForm.tsx`: role sites → `preside|conduct|lead_music|play_piano`; recognize → `be_recognized`;
  prayer → `opening_prayer|closing_prayer` (from `position` 0/4).
- `speeches.tsx`: derive `speaker` vs `opening_prayer|closing_prayer` from `speech.position`.
- Tests: each call site passes the expected context (unit/integration; update existing picker tests).

## Step 5 — Presentation calling  (commit: `feat(v2-people): show calling for recognized people in presentation`)
- `usePresentationMode.ts` (+`usePresentationData`): resolve each recognized `full_name` → Member via
  `useMembers()`; render "Nome — Chamado" when a unique match has a `calling`; else name only. *(PR1)*
- Tests: recognized bullet shows "Name — Calling" when set; plain name when unset/unmatched.

## Step 6 — Verify + staging  (no code unless fixes)
- Full suite + `tsc --noEmit` + `npm run lint` green. Adversarial `verify-change` vs all ACs
  (fresh context, diff + ACs only). Confirm `039` applied to staging + sample callings set.

## Notes / out of scope
- **CSV:** the full-dump CSV (`csvUtils.ts`) does NOT yet include `calling`. Spec scoped CSV out, but
  the earlier "CSV = full dump" requirement suggests adding a `calling` column for consistency.
  **Decision needed at GATE 2:** include `calling` in CSV export/import (+`import_members` RPC in 039)?
  Default in this plan: **not included** (matches spec scope).
- `calling` is not a speech snapshot → no change to `useUpdateMember`'s future-speech cascade.
