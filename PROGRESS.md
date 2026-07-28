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

**No change in flight.** The password-reset bug is fully resolved (transport fix live in prod +
client hardening committed) and the tsc baseline is clean. All work is in local commits on `main`
— nothing pushed. Next: push when ready; optionally the follow-ups under Open issues.

## Decisions
- 2026-07-27: Discarded UX-2.0 (463 commits) and returned to the main baseline. Recoverable via
  branch `UX-2.0` and tag `archive/UX-2.0-2026-06-07` (tip `9b652db`).
- 2026-07-27: Replaced devteam with dev-flow. Deleted `.devteam/` and
  `docs/{specs,arch,plans,qa,tests,reviews,code}` + `docs/CHANGE_REQUESTS.yaml` (recoverable via git history).

## Open issues
- Rotate the Supabase keys that were present in `.claude/settings.local.json` (now gitignored) as
  a precaution — they were committed to the local-only `UX-2.0`/archive snapshot.
- `main` is 1 commit ahead of `origin/main` (pre-existing, not from this work).
- The Gmail App Password was shared in chat — optional to rotate later (regenerate in Google +
  `supabase secrets set GMAIL_APP_PASSWORD=...`).
- `RESEND_API_KEY` / `RESEND_FROM_EMAIL` secrets are now unused — safe to delete from Supabase.
