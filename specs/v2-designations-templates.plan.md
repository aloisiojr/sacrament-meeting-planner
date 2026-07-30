# Plan: Designation templates in Settings (spec: specs/v2-designations-templates.md)

## Reuse (extend these, don't recreate)
- `src/app/(tabs)/settings/whatsapp.tsx` — editor pattern: `useQuery(['ward', wardId])` → init local
  state, per-field auto-save `useMutation` updating a ward column + `logAction`, `null → default`
  fallback. Mirror it for the 4 designation templates.
- `src/app/(tabs)/settings/index.tsx` — settings list; add an entry gated by `hasPermission(...)`.
- `src/lib/designations.ts::buildDesignationReadText(item, { wardName, template? }, t)` — already
  takes an override; the defaults are i18n `agenda.designations.readText.*` (read via `t()` for the
  editor prefill; no new defaults lib needed).
- `src/components/DesignationReadModal.tsx` + `src/app/presentation.tsx` — Spec 2 interstitial; pass
  ward overrides in.
- `src/hooks/useWard.ts` — add the templates hook alongside `useWardName`.
- `src/lib/permissions.ts` + `Permission` union in `src/types/database.ts` — add the new permission.

## Steps (1 step = 1 commit)
1. **Schema + types + permission.** Migration `supabase/migrations/042_designation_templates.sql`:
   `ALTER TABLE wards ADD COLUMN IF NOT EXISTS designation_template_{sustain,release,priesthood,new_member} TEXT;`
   (additive, nullable — ADR 003). Add the 4 fields to `Ward` (`string | null`). Add
   `settings:designations` to the `Permission` union and to bishopric + secretary in
   `PERMISSIONS_MAP` + `ALL_PERMISSIONS`.
   — covers: AC1, AC2, permission; tests: update `permissions.test.ts` (26 → 27; new perm in
   bishopric/secretary, absent in observer) + any full-`Ward` fixtures.
2. **Override resolution → Play.** Add `useWardDesignationTemplates()` in `src/hooks/useWard.ts`
   (queryKey `['ward', wardId, 'designationTemplates']`, selects the 4 columns → typed map). Add a
   `templates?` prop to `DesignationReadModal`; per item use the override when non-blank, else let
   the helper fall back to the default. Pass the map from `presentation.tsx`.
   — covers: AC7; tests: extend `designation-read-modal.test.tsx` (override used when provided;
   blank/absent → default) and `v2-presentation-designations.test.tsx` (templates threaded).
3. **Settings editor + index entry + i18n.** New `src/app/(tabs)/settings/designations.tsx`: for each
   of the 4 types a labelled multiline field pre-filled with override ?? current-language default
   (`t('agenda.designations.readText.<type>')`), auto-save mutation per type (invalidating
   `['ward', wardId, 'designationTemplates']` + `['ward', wardId]`), a per-template "restore default"
   that sets the column NULL, and a placeholder-token hint. Add the index entry gated by
   `settings:designations`. Add i18n (title, index label, restore label, placeholder hint) to 3 locales.
   — covers: AC3, AC4, AC5, AC6, AC8; tests: `src/__tests__/v2-designations-templates-screen.test.tsx`
   (prefill override vs default; edit → mutation with the column; restore → null) +
   `src/__tests__/settings-designations-gating.test.tsx` OR extend an existing settings-index test
   for AC3/AC8 gating.

## AC → coverage matrix
| AC  | Step(s) | Test(s) |
|-----|---------|---------|
| AC1 | 1       | migration + Ward type (database-types) |
| AC2 | 1       | database-types (Ward fields) |
| AC3 | 3       | settings-index gating (perm present → entry shown) |
| AC4 | 3       | templates-screen (prefill override vs default) |
| AC5 | 3       | templates-screen (edit → mutation updates column) |
| AC6 | 3       | templates-screen (restore → column NULL) |
| AC7 | 2       | designation-read-modal (override used / blank→default); presentation (threaded) |
| AC8 | 1,3     | permissions.test (observer lacks perm); settings-index gating (no entry without perm) |

## Risks / deploys
- **DEPLOY — migration 042** (ADDITIVE, nullable columns on `wards`). Forward-compatible; safe for
  v1. Apply to **staging** first; prod at the v2 cutover (ADR 001/003).
- **Ward fixtures:** adding 4 required `Ward` fields may break full-`Ward` test literals — update them.
- **Permissions count test** must move 26 → 27; keep bishopric/secretary in sync, observer unchanged.
- **Cache coherence:** editor mutations must invalidate the templates query key so the Play
  interstitial reflects edits; offline-safe via existing React Query persistence.

## Rollback
- `git revert` steps 1–3. DB (staging pre-cutover): down migration drops the 4 columns.
