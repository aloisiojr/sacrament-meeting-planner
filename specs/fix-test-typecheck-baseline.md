# Clean up baseline TypeScript errors (test files)

## Problem / intent
`npx tsc --noEmit` reports **51 pre-existing errors, all in `src/__tests__/*`** (0 in production
code, 0 in `supabase/functions`). This dirty baseline blocks the whole-project typecheck gate (the
per-edit hook and CI) — the very regression protection we want. Fix the test type errors so `tsc`
is clean, restoring typecheck as a strong gate. No production behavior change.

## In scope / Out of scope
- **In:** fix the type errors in the ~17 affected test files so `tsc --noEmit` passes; keep the
  full suite green; keep behavior identical.
- **Out:** production (non-test) code changes; loosening `tsconfig` strictness; masking errors with
  broad `any` or blanket `@ts-ignore`; deleting/skipping tests to force green.

## Baseline (evidence)
51 errors across 17 files in `src/__tests__/` (incl. `integration/`). Codes: TS2352×12 (casts),
TS2367×10 (comparisons flagged unintentional), TS2339×6 (missing property), TS2322×5, TS2353×4,
TS2345×4, TS7016×3 (missing declaration file), TS2769×2, TS2532×2, TS18047×2, TS2873×1.
`tsc --noEmit` runs in ~3s.

## Acceptance criteria (EARS)
- **AC1:** WHEN `npx tsc --noEmit` runs, it SHALL report 0 errors.
- **AC2:** WHEN `npm run test:run` runs, all tests SHALL pass (≥1832), with no test removed or
  skipped to achieve it.
- **AC3:** Fixes SHALL use precise types. Broad `any` or blanket `@ts-ignore` SHALL NOT be used;
  where a test intentionally exercises invalid input, `@ts-expect-error` with a one-line reason MAY
  be used. TS2367 comparisons SHALL be inspected for real test smell, not just silenced.
- **AC4:** No production (non-test) file SHALL change.

## Plan (execution)
- Delegate the mechanical fixing to a subagent (context hygiene); it fixes per file, grouped by
  error pattern (type the i18n/supabase mocks; guard possibly-undefined; add missing type decls;
  inspect TS2367 comparisons). It must keep the suite green and follow AC3.
- Verify (me): `npx tsc --noEmit` → 0 errors, `npm run test:run` → all green, `git diff` touches
  only test files.
- Commit: one cohesive `test:`/`chore:` commit (or grouped by area).

## Notes
- After green: confirm typecheck as a BLOCKING step in CI, and add `--incremental` to the per-edit
  hook for speed (separate small change; the hook edit needs explicit approval).
- Unblocks the queued `reset-email-error-visibility` change (which edits `src/`).
