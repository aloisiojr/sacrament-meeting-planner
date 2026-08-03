# Audit remediation plan

Written after the adversarial audit of 2026-08-03. Ordered by **effect on app stability**, which
is the stated goal — not by coverage percentage.

Every claim below was verified by mutation or direct inspection before being listed. Where an
auditor's claim turned out wrong, that is noted.

---

## Phase B — production defects (highest value: these are real bugs)

| # | Defect | Evidence | Effect if unfixed |
|---|---|---|---|
| B1 | `offlineQueue.enqueue()` has no callers | `grep enqueue(` → 1 hit, its own definition | Every offline edit is lost. `CLAUDE.md` promises the opposite. |
| B2 | Replay never detects failure | `useOfflineQueueProcessor.ts:39-46` discards the `{data,error}` result; supabase-js v2 **never throws** | A server rejection (RLS, FK, duplicate) silently discards the mutation. The `catch` is unreachable. |
| B3 | Retry budget is dead code | `incrementRetry()` has no callers; processor dequeues before replaying | A failed mutation is never retried. |
| B4 | `offlineGuard.throwIfOffline()` has no callers | `grep` → definition only | The 6 `ONLINE_ONLY_OPERATIONS` fail with a raw network error offline instead of "requires connection". |
| B5 | Unreachable polling branch | `useRealtimeSync.ts:85-87`: `if (isOnline && wardId)` nested inside `if (!wardId \|\| !isOnline)` | Dead code; the intended no-ward polling fallback never runs. |
| B6 | Unguarded array access | `app/speeches/[date].tsx:124` `(members ?? []).find((m) => m.id === …)` guards a null list, not null entries | Crash on a sparse member list. |

B1+B2+B3 together are what make the two intentionally-red tests pass.

## Phase A — tests that do not test (found in MY new files)

| # | Problem | File |
|---|---|---|
| A1 | Asserts a testID that does not exist → can never fail | `users-screen-role-gates.test.tsx:124` |
| A2 | Realtime **ward filter** not asserted; deleting `filter: ward_id=eq.` keeps 16 tests green | `use-realtime-sync.test.tsx` |
| A3 | Role matrix models AND where production is OR; `member:read` gate removable with 23 green | `settings-role-matrix.test.tsx` |
| A4 | `toBeGreaterThan(0)` where the exact count is known and computed elsewhere in the same file | `use-realtime-sync.test.tsx:156,179,193,226,238` |
| A5 | `toBeTruthy()` on knowable payload fields; the titled fallback branch never runs | `register-screen.test.tsx:158` |
| A6 | Test name asserts the opposite of its assertion | `offline-queue-processor.test.tsx:187` |
| A7 | Login "loading lockout" claimed in the header, never tested | `login-screen.test.tsx` |
| A8 | AuthContext language chain executed but unasserted; `signIn`/`signOut`/`updateAppLanguage` error branches untested | `auth-context-lifecycle.test.tsx` |
| A9 | Users screen: role change / delete / `cannotChangeOwnRole` untested — the screen's stated stakes | `users-screen-role-gates.test.tsx` |

## Phase C — legacy rot (≈550-650 it-blocks prove nothing)

| # | Problem | Scale |
|---|---|---|
| C1 | 5 drifted `parseItems` copies omit the `Array.isArray` branch (migration-032 shim). **Verified: deleting the branch fails 0 tests.** | 134 it-blocks |
| C2 | `f052` simulates an authz gate that does not exist (`settings:users` absent from `settings/index.tsx`) and contradicts the new role-matrix test | 20 it-blocks |
| C3 | `readFileSync` source-text assertions | 76 calls / ~149 it-blocks |
| C4 | Files importing nothing from `src/` while claiming to cover a module | 8 files |
| C5 | Hand-rolled `simulateTrigger()` for SQL that is never executed | 54 it-blocks |
| C6 | Tautologies (`const x = true; expect(x).toBe(true)`) | ~25-30 |

**C1 first**: moving `parseItems`/`joinItems` into `src/lib/` (where CLAUDE.md says pure logic
belongs) and importing them makes 134 it-blocks real and restores coverage of a shipped migration.

---

## Corrections to the auditors

- The bias-auditor's finding that the offline test models an error mode Supabase cannot produce is
  correct and important — it means my own "known defect" note understated B2.
- The legacy-auditor's "delete the Array.isArray line and zero tests fail" was confirmed, but only
  after re-running on a clean tree: my first measurement was taken while a background mutation
  campaign still had three files mutated, which produced 16 phantom failures.
- My own mutation harness initially reported 3 false survivors by mutating docstrings. Fixed by
  masking comments and strings.
