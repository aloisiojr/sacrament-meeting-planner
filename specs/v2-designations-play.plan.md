# Plan: Supports & Releases — Play interstitial (spec: specs/v2-designations-play.md)

## Reuse (extend these, don't recreate)
- `src/components/SacramentPrayerModal.tsx` — clone its structure/styles (Modal + BlurView backdrop,
  dismiss layer behind a plain-View panel, header X, ScrollView, `fontSizes` prop) for the new modal.
- `src/app/presentation.tsx` — the sacrament-prayer wiring to mirror: `prayerModalVisible` state,
  `openPrayerModal`/`closePrayerModal`, the `ScrollTextIcon` button on the field, `onPrayerPress`
  threaded into `PresentationFieldRow`. `usePresentationData` already returns raw `agenda` (so
  `agenda.designations` is in hand — no need to thread structured data through PresentationField).
- `src/hooks/usePresentationMode.ts` — the designations `bullet_list` field (label
  `agenda.wardBusiness`); add a flag to it.
- `src/lib/designations.ts` — add the read-text builder next to `formatDesignationSummary`.
- `src/hooks/useSpeeches.ts::useWardManagePrayers` + `useAuth().wardId` + `wardKeys` — pattern for a
  small `useWardName()` ward query.
- `src/components/icons` (`ScrollTextIcon`, `XIcon`), `expo-blur` (`BlurView`).

## Steps (1 step = 1 commit)
1. **Read-text helper + default templates.** In `src/lib/designations.ts` add
   `buildDesignationReadText(item, { wardName, template? }, t)`: resolves the template
   (`template` override → else i18n default `agenda.designations.readText.<type>`) and substitutes
   `{name}`→person_name, `{calling}`→calling, `{office}`→localized office label, `{ward}`→wardName;
   everything else verbatim. Add the FINAL templates (spec Appendix A) to pt-BR/en-US/es-LA.
   Also add `orderDesignations(items)` (canonical order release→sustain→priesthood→new_member,
   stable within type; non-mutating).
   — covers: AC4, AC5, AC6, AC7, AC9 (helper); tests: `src/__tests__/designations-readtext.test.ts`
   (per type; token substitution; `[Pausa Breve]`/`[his or her]` preserved; override respected;
   ordering).
2. **DesignationReadModal component.** New `src/components/DesignationReadModal.tsx` cloned from
   SacramentPrayerModal: props `{ visible, onClose, designations, wardName, fontSizes }`; renders a
   scrollable list of each designation's read-text (small label = person summary line, then the
   full text) via `buildDesignationReadText`; X + tap-outside dismiss; blurred backdrop.
   — covers: AC2, AC3, AC6; tests: `src/__tests__/designation-read-modal.test.tsx` (renders one
   block per item, in order; close via X and backdrop; hidden when `visible=false`).
3. **Wire into Play.** Add `useWardName()` (`src/hooks/useWard.ts`); flag the designations field in
   `usePresentationMode.ts` (e.g. `readText: true`) and order its bullet list via `orderDesignations`
   (AC9); in `presentation.tsx` add `designationsModalVisible` state, render a `ScrollTextIcon` button
   in the `bullet_list` branch of `PresentationFieldRow` when the flag is set (→ `onDesignationsPress`),
   and mount `DesignationReadModal` with `agenda.designations` + ward name + fontSizes.
   — covers: AC1, AC2, AC3, AC8, AC9 (bullet list); tests:
   `src/__tests__/v2-presentation-designations.test.tsx` (icon present when ≥1 designation; tapping
   opens the modal; no icon when designations empty).

## AC → coverage matrix
| AC  | Step(s) | Test(s) |
|-----|---------|---------|
| AC1 | 3       | v2-presentation-designations (icon shown w/ designations) |
| AC2 | 2,3     | designation-read-modal (scheme/dismiss/fontSizes); v2-presentation-designations (opens) |
| AC3 | 1,2     | designations-readtext; designation-read-modal (one block per item, ordered) |
| AC4 | 1       | designations-readtext (locale template used) |
| AC5 | 1       | designations-readtext (token substitution per type) |
| AC6 | 1,2     | designations-readtext (verbatim preserved) |
| AC7 | 1       | designations-readtext (default used; override respected) |
| AC8 | 3       | v2-presentation-designations (no icon when empty) |
| AC9 | 1,2,3   | designations-readtext (orderDesignations); designation-read-modal (order); usePresentationMode bullet order |

## Risks / deploys
- **No schema change, no deploy.** Client-only render from already-loaded agenda + a ward-name query.
- **i18n parity:** the 3 locale files must all get `agenda.designations.readText.*` with matching keys.
- **Shared Play tests:** adding an icon to the designations `bullet_list` field must not regress
  `v2-presentation-sacrament-prayer.test.tsx` or other presentation tests — use distinct testIDs and
  gate the icon on the new flag only.
- **Ward name fetch:** `useWardName` adds one lightweight query; offline-safe via the existing
  React Query cache (no new mutation).

## Rollback
- `git revert` steps 1–3 (each atomic). No data/migration to undo.
