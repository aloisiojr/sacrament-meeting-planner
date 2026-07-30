# Supports & Releases — configurable templates in Settings (Spec 3 of 3)

## Problem / intent
Let a ward customize the four designation read-texts (shown in the Play interstitial, Spec 2)
instead of only using the built-in defaults. Mirrors the existing per-ward WhatsApp templates:
a new Settings screen edits per-ward override columns; NULL/blank ⇒ the built-in localized default.

## In scope / Out of scope
- **In:**
  - 4 nullable per-ward override columns on `wards` (ADR 003); `Ward` type updated.
  - New permission `settings:designations` (bishopric + secretary, mirroring `settings:whatsapp`).
  - New Settings screen listing the 4 templates, each editable (auto-save), pre-filled with the
    override or the current-display-language default, with a per-template "restore default"
    (clears the override → NULL), and placeholder-token guidance ({name}/{calling}/{office}/{ward}).
  - Settings-index entry gated by the new permission.
  - Wire the override into the Play interstitial (Spec 2's `buildDesignationReadText` already accepts
    a `template`): use the ward override when present, else the localized default.
- **Out:**
  - Per-language overrides (single set per ward — ADR 003). 
  - Token/grammar validation of the custom text (the ward owns the wording).
  - Any change to entry (Spec 1) or the interstitial UI itself (Spec 2).

## Baseline (evidence)
- Precedent: `src/app/(tabs)/settings/whatsapp.tsx` edits `wards.whatsapp_template_*` with auto-save
  mutations and `null → getDefault(wardLanguage)` fallback; listed in
  `src/app/(tabs)/settings/index.tsx` gated by `hasPermission('settings:whatsapp')`.
- `Ward` type: `src/types/database.ts` (has `whatsapp_template_*`, `name`, `language`).
- Permissions: `src/lib/permissions.ts` — `settings:whatsapp` in bishopric + secretary sets;
  `Permission` union in `database.ts`.
- Read-text helper: `src/lib/designations.ts::buildDesignationReadText(item, { wardName, template? }, t)`
  already supports an override; defaults live under i18n `agenda.designations.readText.*`.
- Play interstitial: `src/components/DesignationReadModal.tsx` (currently calls the helper with no
  template); mounted in `src/app/presentation.tsx`.

## Acceptance criteria (EARS)
- **AC1:** The system SHALL persist per-ward overrides in 4 nullable `wards` columns
  (`designation_template_{sustain,release,priesthood,new_member}`).
- **AC2:** The `Ward` type SHALL include those 4 fields.
- **AC3:** WHERE the user has `settings:designations`, the Settings index SHALL show an entry that
  opens the templates editor; IF the user lacks it, THEN the entry SHALL NOT appear.
- **AC4:** WHEN the editor opens, for each type it SHALL pre-fill the field with the ward override if
  set, otherwise the current-display-language built-in default.
- **AC5:** WHEN the user edits a template, the system SHALL persist it to the corresponding ward
  column (auto-save).
- **AC6:** WHEN the user activates "restore default" for a template, the system SHALL set that
  column to NULL and the field SHALL show the localized default again.
- **AC7:** WHEN the Play interstitial renders a designation AND the ward has a non-blank override for
  that type, the system SHALL use the override text; ELSE it SHALL use the localized default.
- **AC8:** The editor SHALL display the available placeholder tokens ({name}/{calling}/{office}/{ward})
  as guidance.

## Open questions
- None. (Resolved at gate: single-set override like WhatsApp; new `settings:designations`
  permission for bishopric + secretary; per-template restore-default.)

## Notes
- **Permissions:** add `settings:designations` to the `Permission` union and to bishopric + secretary
  in `PERMISSIONS_MAP`; update the permissions count test.
- **i18n:** screen title, index label, per-type labels (reuse `agenda.designations.typeOption.*`),
  placeholder hint, restore-default label — add to pt-BR/en-US/es-LA.
- **Offline:** ward-update mutation is offline-capable like the WhatsApp screen.
- **Resolver rule:** NULL or blank/whitespace override ⇒ use the localized default (ADR 003).
- **Release:** ADDITIVE migration (nullable columns), forward-compatible with v1 (ADR 003); ships
  with the v2 cutover, can go to staging immediately.
