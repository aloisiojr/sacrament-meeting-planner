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
- **`specs/fix-test-typecheck-baseline.md` — done & verified, but UNCOMMITTED, NEEDS DECISION.**
  Subagent fixed all 51 errors: `tsc --noEmit` = 0 errors, 1832 tests green, no `any`/`@ts-ignore`
  added. **Correction to earlier scoping (which was wrong):** 4 of the 51 were in PRODUCTION, not
  tests — `src/app/(tabs)/_layout.tsx` used `tabBarTestID`, which is invalid in
  `@react-navigation/bottom-tabs` 7.x (correct: `tabBarButtonTestID`); the tab testIDs were being
  silently dropped (real latent bug). The fix (4-line rename) is user-invisible and nothing
  references the old IDs. This deviates from AC4 (no prod changes), so it was left UNCOMMITTED for
  the user to accept/handle. Recommendation: accept — it's correct and low-risk. The 17 test-file
  fixes + new `src/__tests__/types/react-test-renderer.d.ts` are safe/in-scope.

## Needs your decision (paused per instruction)
- Accept the `src/app/(tabs)/_layout.tsx` production fix (testID rename)? Once decided, commit the
  tsc cleanup, then build the queued `reset-email-error-visibility` hardening (blocked until the
  tsc gate is green). Nothing pushed/deployed.

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
