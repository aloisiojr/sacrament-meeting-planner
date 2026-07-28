# Progress

## How to drive dev-flow (entry commands)
- **New change:** describe it — e.g. *"New change on SMP: <description>. Use dev-flow."* → runs `spec-first`.
- **Resume after a context clear:** *"Read PROGRESS.md and continue the change in flight."* → picks up from the stage in **Now**.
- **Force a stage by name:** `spec-first` · `plan-change` · `build-change` · `verify-change` · `mobile-release-advisor`.
- Engine docs: `~/.claude/dev-flow/README.md`. Per-change docs: `specs/<slug>.md` (+ `.plan.md`).

## Now
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

Password-reset bug fully resolved (Gmail SMTP live in prod + client hardening); tsc + lint baselines
clean; pushed to `origin/main`.

## v2.0 (branch `v2.0`)
- **In flight:** `specs/v2-member-management.md` — unify actors+speakers into `members` (capability
  flags + contact-delegation), move people management into the picker, CSV stays in Settings.
  Breaking DB change → release cutover in `docs/decisions/001-v2-release-cutover.md` (forced update).
  Stage: **spec-first done, awaiting GATE 1**. Interview P1–P18 resolved.
- **Prerequisite (separate change, on `main`):** a **v1.x min-version gate** must ship + be adopted
  before v2.0 is deployed (see ADR). Not started.

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
