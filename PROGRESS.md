# Progress

## How to drive dev-flow (entry commands)
- **New change:** describe it — e.g. *"New change on SMP: <description>. Use dev-flow."* → runs `spec-first`.
- **Resume after a context clear:** *"Read PROGRESS.md and continue the change in flight."* → picks up from the stage in **Now**.
- **Force a stage by name:** `spec-first` · `plan-change` · `build-change` · `verify-change` · `mobile-release-advisor`.
- Engine docs: `~/.claude/dev-flow/README.md`. Per-change docs: `specs/<slug>.md` (+ `.plan.md`).

## Now
- **IN FLIGHT — `specs/v2-supports-releases.md` (Spec 1 of 3): structured Apoios e Desobrigações.**
  Branch `v2.0`. Stage: **build-change**. Plan: `specs/v2-supports-releases.plan.md` (5 steps).
  - Step 1 ✅ types + `src/lib/designations.ts` (formatDesignationLines/Summary).
  - Step 2 ✅ edit screen `src/app/designations/[date].tsx` (type→person→fields, calling prompt) + i18n.
  - Step 3 ✅ `DesignationListField` display component.
  - Step 4 ✅ wired into AgendaForm (replaces free-text wardBusiness field).
  - Step 5 ✅ removed `sustaining_releasing` (type + Play builder + fixtures); migration
    `041_designations.sql` (add `designations jsonb`, drop old column). Obsolete f067/f068/f071
    free-text tests converted to `designations` (3 vacuous f067 tests removed). 1984 tests green.
  - **Spec 1 COMPLETE + verified (APPROVED).** Migration 041 applied to STAGING (designations jsonb
    added, sustaining_releasing dropped). Prod only at v2 cutover (ADR 001/002).
  - **Spec 2 (`specs/v2-designations-play.md`) build COMPLETE** — Play interstitial:
    - Step 1 ✅ `buildDesignationReadText` + verbatim templates (3 locales) + `orderDesignations`.
    - Step 2 ✅ `DesignationReadModal` (clone of SacramentPrayerModal) + canonical ordering.
    - Step 3 ✅ `useWardName`; flagged/ordered Play bullet list; icon + modal wiring in presentation.tsx.
    - Order: release→sustain→priesthood→new_member. Grouping deferred (too custom). 2002 tests green.
    - **Next: verify-change (Spec 2), then GATE 3.**
  - **Spec 2 verified (APPROVED)** — client-only, no deploy.
  - Post-Spec-2 polish (committed): dim non-selected type/office options; highlight person/calling
    fields when filled; interstitial title → "Assuntos de Ala".
  - **Spec 3 (`specs/v2-designations-templates.md`) build COMPLETE** — configurable templates:
    - Step 1 ✅ migration 042 (4 nullable `wards.designation_template_*`, additive/ADR 003) + Ward
      type + `settings:designations` perm (bishopric+secretary); perm-count tests 26→27.
    - Step 2 ✅ `useWardDesignationTemplates` + override applied in the Play interstitial.
    - Step 3 ✅ Settings "Ward Business Templates" editor (prefill override/default, auto-save,
      restore-default, token hint) + index entry gated by the perm. 2013 tests green.
    - **Spec 3 verified (APPROVED)** after a fix round (P1 prefill race + P2 blur-overwrite fixed;
      AC8 hint test added). Migration 042 APPLIED to STAGING (4 designation_template_* columns).
  - **v2 Supports & Releases feature COMPLETE across all 3 specs** (entry + Play interstitial +
    Settings templates). 2017 tests green. Nothing merged to main; prod at v2 cutover (ADR 001).
- Branch: `main` (baseline restored 2026-07-27 from the 2026-03-29 state).
- Adopted the **dev-flow** engine; removed the old devteam metadata. Thin layer installed
  (CLAUDE.md, .claude/settings.json hooks, CI, specs/, this file).
- Password reset bug (root cause = Resend had no verified domain):
  1. `specs/reset-email-gmail-smtp.md` — **DONE & VERIFIED IN PROD.** Switched transport
     Resend → Gmail SMTP (denomailer). Code committed (f09bbe6); secrets set
     (`GMAIL_USER=sacr.meet.plan@gmail.com`, `GMAIL_APP_PASSWORD`); function deployed. Live test:
     external user igor 500 → 200, email delivered. Server-side only, shipped apps unaffected.
  2. `specs/reset-email-error-visibility.md` — client error hardening (APPROVED, actionable
     wording). **Queued** — blocked until the tsc baseline is clean (it edits `src/`).
- **`specs/fix-test-typecheck-baseline.md` — DONE & COMMITTED (`544138a`).** All 51 tsc errors
  fixed (incl. the `src/app/(tabs)/_layout.tsx` `tabBarTestID`→`tabBarButtonTestID` prod bug,
  accepted by user); `tsc --noEmit` = 0, 1832 tests green. Per-edit typecheck gate now GREEN.
- **`specs/reset-email-error-visibility.md` — DONE & COMMITTED (`18dc9cf`).** Client logs the real
  error in the `catch` (was swallowed) + shows an actionable, enumeration-safe message; success
  path unchanged. `auth.resetFailed` reworded in all 3 locales. Built the project's first
  component render-test infra: `react-native` aliased to a local stub
  (`src/__tests__/stubs/react-native.tsx`) in `vitest.config.ts` → screens render via
  react-test-renderer in `node` (no jsdom, no new deps); added a behavioral test for
  ForgotPasswordScreen (failure logs+message, success). Adversarially verified (APPROVED; AC1
  assertion tightened per the P2). Suite now **68 files / 1834 tests green**, tsc 0.

- **`specs/fix-lint-baseline.md` — DONE & COMMITTED (`31b3ed1`).** All 166 ESLint problems fixed
  (3 errors + 163 warnings) → `npm run lint` = 0 problems. exhaustive-deps: 11 real deps added (all
  stable refs) + 8 justified disables; no behavior change. tsc 0; 68 files / 1834 tests green.

Password-reset bug resolved (Gmail SMTP live) + tsc/lint baselines clean, on `origin/main`.

## v2.0 (branch `v2.0`) — BUILD COMPLETE & VERIFIED (deploy gated by v1.x adoption)
Unified people model: actors+speakers → `members` with capability flags + contact-delegation;
people management moved into the unified `PeoplePicker`; settings CSV-only. Built in 6 phases (fresh
subagent per phase, expand→migrate→contract, verify each handoff) per
`~/.claude/dev-flow/build-orchestration.md`. Spec `specs/v2-member-management.md`; migrations **037**
(destructive model change) + **038** (import RPC) — apply at cutover with backup (ADR 001). v1.x
foundation merged in (`4eee51e`). Final adversarial verify-change: **APPROVED**, all AC1–AC14, no
P0/P1. **tsc 0 / lint 0 / 1843 tests / 77 files.** `app.json` → 2.0.0. Deploy/merge to main gated by
v1.x store adoption.
Open P2 (non-blocking): (1) member-edit cascades `speaker_*` to future speeches but NOT the frozen
delegation snapshot (`contact_*`) — product decision: freeze vs. cascade; (2) orphan
responsible-with-no-phone wraps as delegated with empty `{responsavel}`; (3) migrated actor-only
members get `informal_name` NULL; (4) PersonEditor empty country code stores `''` vs the `+55` default.

## v1.x (branch `v1.x`, off main) — BUILD COMPLETE, awaiting deploy (GATE 3)
Prerequisite release before v2.0 (see `docs/decisions/001-v2-release-cutover.md`). Spec:
`specs/v1x-version-gate.md`. All steps built + adversarially verified (APPROVED, no P0/P1);
tsc 0, lint 0, 71 files / 1850 tests. `app.json` → 1.1.0.
- Migration 036 (additive: `app_config` + push `app_version`/`platform`/`last_update_nudge_at`).
- `app-config` edge function (fail-open) + launch version gate + `UpdateRequiredScreen` (iOS store
  link; Android pre-launch shows message). `semver.ts`.
- `app_version`/`platform` on push token upsert; `push-update-nudge` scheduled edge function.
- WhatsApp `buildFullPhone` fix (new snapshots carry country code).
**Deploy status (GATE 3):** ✅ functions deployed (`app-config`, `push-update-nudge`); ✅ migration
036 applied (via `migration repair` for 001–035 then `db push`) — VERIFIED: `app-config` returns
seeded `min_supported_version=1.0.0`; ✅ branch `v1.x` pushed. **Remaining (user):** Supabase cron
for the nudge (SQL provided in chat); EAS build + App Store submit (v1.1.0). 5 P2 findings left as-is.
Two independent levers:
- **Gate** (in-app update screen) exists ONLY in 1.1.0+; `min_supported_version` gates clients that
  HAVE the gate. It can NEVER affect 1.0.0 (no gate code there).
- **Nudge** (push) reaches 1.0.0 too (they receive push). 1.0.0 tokens have `app_version=NULL`,
  which the nudge treats as outdated → they get nudged once the cron runs, regardless of `min`.
Rollout: to move 1.0.0 users to 1.1.0, publish 1.1.0 then SCHEDULE THE CRON (keep `min=1.0.0`; do
NOT schedule before 1.1.0 exists). At v2 cutover, raise `min` to the v2 build → 1.1.0 is
force-gated; 1.0.0 can't be gated (breaks at the v2 schema migration — accepted per ADR). iOS store
URL wired; Android not published yet.

## v2.0 (branch `v2.0`) — plan-change (GATE 2)
Merged the v1.x foundation into `v2.0` (`4eee51e`). Spec + ADR approved (GATE 1). Atomic plan:
`specs/v2-member-management.plan.md` — 5 phases: (1) model + migration 037 (destructive; applied at
cutover), (2) hooks/sync (retire actors), (3) unified People picker + editor, (4) settings CSV-only
+ full-dump import, (5) i18n/version/verify. Awaiting GATE 2. Deploy/merge waits for v1.x adoption
(ADR 001). Base green: tsc 0 / 71 files / 1850 tests.

## v2.0 People Refinements (branch `v2.0`) — BUILD COMPLETE & VERIFIED (2026-07-28)
Spec `specs/v2-people-refinements.md` (+`.plan.md`). Follow-up polish on the unified people model.
Built in 6 atomic commits (`27c01e3`..`aa68757`), fresh subagent per step, kept green:
- **Schema:** `members.calling` (chamado) — additive migration `039_add_member_calling.sql` (+ `calling`
  in `import_members` RPC + CSV full dump). Applied to STAGING via Management API; sample callings set.
- **PeoplePicker:** fixed title "Selecionar Pessoa" + per-context subtitle; per-context 2nd line
  (speaker/prayer = 6mo speech + responsável; preside/conduct/lead_music/play_piano = name only;
  be_recognized = calling + functions); "Ver todos" = subtitle+Switch (capability contexts); no trash
  icon (delete moved to editor); informal in parens; keep-selected under filter. New `context` prop
  wired from AgendaForm + speeches.
- **PersonEditor:** informal label, country picker (reuses `countryCodes.ts`), "Permissões" section
  (icon + Switch rows), `calling` field, read-only "Responsável por" list, destructive "Excluir
  pessoa".
- **Presentation:** recognized people show "Nome — Chamado" (unique name match with calling).
- Adversarial verify-change: **APPROVED**, all ACs (S1/S2, P1–P7, E1–E5, PR1), no P0/P1. Suite
  **79 files / 1879 tests**, tsc 0, lint 0. Not pushed. Deploy to prod gated by v1.x adoption (ADR 001);
  `039` ships to prod at the v2 cutover with 037/038.

## Decisions
- 2026-07-27: Discarded UX-2.0 (463 commits) and returned to the main baseline. Recoverable via
  branch `UX-2.0` and tag `archive/UX-2.0-2026-06-07` (tip `9b652db`).
- 2026-07-27: Replaced devteam with dev-flow. Deleted `.devteam/` and
  `docs/{specs,arch,plans,qa,tests,reviews,code}` + `docs/CHANGE_REQUESTS.yaml` (recoverable via git history).

## Resolved
- `RESEND_*` secrets removed from Supabase (unused after Gmail SMTP switch).
- Gmail App Password rotation: **user declined** (deliberate) — current password stays in use.
- Lint + tsc baselines clean; all work pushed to `origin/main`.

## Open issues
- The archived `UX-2.0` snapshot (`9b652db`) committed `.claude/settings.local.json` with Supabase
  keys locally (never pushed). Rotate if desired — low priority, local-only.
- `f021-topic-library-overhaul.test.ts` asserts source text (`function normalizeForSearch`) via
  fs/string-matching — against the "behavioral tests only" rule; keeps dead code alive in
  `useTopics.ts`. Worth revisiting (test + dead code) as a future cleanup.
