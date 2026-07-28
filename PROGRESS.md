# Progress

## Now
- Branch: `main` (baseline restored 2026-07-27 from the 2026-03-29 state).
- Adopted the **dev-flow** engine; removed the old devteam metadata. Thin layer installed
  (CLAUDE.md, .claude/settings.json hooks, CI, specs/, this file).
- No change in flight. Next: pick the first real change and run **spec-first**.

## Decisions
- 2026-07-27: Discarded UX-2.0 (463 commits) and returned to the main baseline. Recoverable via
  branch `UX-2.0` and tag `archive/UX-2.0-2026-06-07` (tip `9b652db`).
- 2026-07-27: Replaced devteam with dev-flow. Deleted `.devteam/` and
  `docs/{specs,arch,plans,qa,tests,reviews,code}` + `docs/CHANGE_REQUESTS.yaml` (recoverable via git history).

## Open issues
- Rotate the Supabase keys that were present in `.claude/settings.local.json` (now gitignored) as
  a precaution — they were committed to the local-only `UX-2.0`/archive snapshot.
- `main` is 1 commit ahead of `origin/main` (pre-existing, not from this work).
