# Audit remediation plan — CLOSED

Written after the adversarial audit of 2026-08-03; completed the same night. Ordered by **effect
on app stability**, which was the stated goal — not by coverage percentage.

Every claim below was verified by mutation or direct inspection before being listed, and every fix
was verified by mutation afterwards: the production change is reverted, a mutation is applied, and
the suite must go red. A fix that did not produce a red is not recorded as done.

---

## Phase B — production defects — DONE

| # | Defect | Outcome |
|---|--------|---------|
| B1 | `offlineQueue.enqueue()` had no callers, so every offline edit was lost | **Fixed.** New `lib/offlineMutation.ts` wires writes to the queue on transport failure only. Wired into agenda updates, speaker/topic assign and remove, member update and delete. |
| B2 | Replay never detected failure — supabase-js v2 resolves `{data,error}` and never throws, so an RLS denial was dequeued as a success | **Fixed.** The processor inspects `error`. The test mock gained a resolve-with-`{error}` mode; modelling only the throwing mode is what let this hide. |
| B3 | Retry budget was dead code — `incrementRetry()` had no callers and the processor dequeued *before* replaying | **Fixed.** Peek → replay → dequeue only on acceptance; spend one retry and stop on rejection; `incrementRetry` drops the entry after MAX_RETRIES so a poison message cannot wedge the queue. |
| B4 | `offlineGuard.throwIfOffline()` had no callers — the six Edge Function operations failed offline with a generic "role change failed" | **Fixed.** `callEdgeFunction` guards first. The error now carries a stable `code`, because the message is translated and matching it would break in two of the three locales. |
| B5 | Unreachable polling branch: `if (isOnline && wardId)` nested inside `if (!wardId \|\| !isOnline)` | **Removed**, not "repaired" — with no ward there is nothing to refetch, so a live timer would only wake the device. Reasoning recorded in a comment and a test. |
| B6 | Claimed unguarded array access at `speeches/[date].tsx:124` | **WITHDRAWN — the auditor was wrong.** `members` comes from `useMembers()` typed `Member[]`; null *entries* cannot occur, and `?? []` already covers loading. A guard would be defensive noise contradicting the type. |

B1+B2+B3 together are what turned the two intentionally-red tests green.

## Phase A — my own tests that could not fail — DONE

All nine fixed and mutation-verified. The mutations listed below all **survived** before the fix.

| # | Problem | Killing mutation |
|---|---------|------------------|
| A1 | Asserted a testID that does not exist | drop `canManageUsers` from the error gate |
| A2 | Realtime **ward filter** unasserted — deleting `filter: ward_id=eq.` left 16 tests green while every ward's row changes broadcast to every client | delete the filter |
| A3 | Modelled the templates gate as AND where production is `access && (whatsapp \|\| designations)`; the `member:read` half was undeletable in theory but deletable in fact | AND the OR (kills 4), drop `member:read` (1), drop `history:read` (2) |
| A4 | `toBeGreaterThan(0)` where the exact count is computable | — |
| A5 | `toBeTruthy()` on role/language/timezone, which passes on role `observer` | — |
| A6 | Test name asserted the opposite of its assertion | — |
| A7 | "Loading lockout" claimed in the header, never tested | — |
| A8 | AuthContext language chain executed but unasserted; `signIn`/`signOut`/`updateAppLanguage` error branches untested | swallow signIn's error; apply a language before its write succeeds; let the ward language beat the user preference |
| A9 | Role change and delete — the screen's stated stakes — untested | drop the bishopric check; skip sign-out after self-delete; drop the `!isSelf` role-selector guard |

A5 also removed a test that passed for the wrong reason: it drove the timezone with `changeText`,
but the control is a `Pressable` that opens a picker, so the call was a no-op and the assertion
held only because this machine sits in the asserted timezone.

## Phase C — legacy rot — DONE

| # | Problem | Outcome |
|---|---------|---------|
| C1 | 5 hand-copied `parseItems`/`joinItems`, 134 it-blocks asserting the copies | Logic moved to `lib/listField.ts`; all five import it. **Measuring caught that this was not enough**: none of them ever passes an ARRAY, so the migration-032 shim still survived deletion. `list-field.test.ts` covers it; deleting the branch now fails 5 tests. |
| C2 | `f052` simulated an authz gate that does not exist | File deleted (20 self-asserting blocks). Its genuine claims are render assertions in `settings-role-matrix`. |
| C3 | 76 `readFileSync` source-text assertions | **0 remain.** Replaced by behaviour throughout; the largest slice became real Edge Function execution. |
| C4 | 6 files importing nothing from `src/` | All resolved: F047 by extracting `lib/queryConfig.ts` and asserting the shipped config, f057 by rendering `SpeechSlot`, the rest deleted. |
| C5 | 90 `simulateTrigger()` blocks re-implementing PL/pgSQL | Deleted. `src/__tests__/README-sql-triggers.md` records the gap honestly and names two routes to real SQL coverage. |
| C6 | Self-asserting tautologies | 16 deleted. ~14 type-level ones KEPT — `tsc --noEmit` is their real assertion and they document DB CHECK constraints. |

## Beyond the plan: the Edge Functions

The audit did not raise these because they looked untestable. They are the security boundary — they
run with the **service-role key**, so RLS does not apply to them — and 11 of 13 had no test at all.

`src/__tests__/helpers/edgeFunctionHarness.ts` makes them executable from jest: a `virtual`
jest.mock supplies the `https://esm.sh/...` import, a `Deno.serve` stub captures the handler, and a
recording fake stands in for the admin client. All 13 functions now have behavioural coverage
(~250 tests), mutation-verified with **50+ mutations, all killed**, including:

- an observer promoting themselves to bishopric
- a secretary changing their own role
- deleting a user from another ward
- demoting the last bishopric
- clobbering `app_metadata` (which would strip `ward_id` and break every RLS policy for that user)
- taking the role, ward or email of a new account from the request body instead of the invitation
- redeeming an invitation token twice, or after expiry
- returning 404 for an unknown address in the reset flow, turning it into a membership oracle
- merging two wards' member names into one push notification
- failing *closed* in `app-config`, which would brick every client on a config outage

One genuine defect surfaced while writing them and is now pinned: if `listUsers` fails mid-count in
`delete-user`, the function must abort without deleting anything — guessing there either orphans a
ward or destroys a populated one.

---

## Corrections to the auditors, and to myself

- The bias-auditor's finding that the offline test modelled an error mode Supabase cannot produce
  was correct and important — my own "known defect" note had understated B2.
- The legacy-auditor's "delete the `Array.isArray` line and zero tests fail" was confirmed, but only
  after re-running on a clean tree: the first measurement was taken while a background mutation
  campaign still had three files mutated, which produced 16 phantom failures.
- **B6 was a false finding** and is withdrawn rather than "fixed".
- My own mutation harness initially reported 3 false survivors by mutating docstrings. Fixed by
  masking comments and string literals.
- One commit claimed "every Edge Function now has coverage" while `push-update-nudge` did not. The
  next commit corrected it and covered the function.
- While rewriting f057 my own factory dropped its overrides (`makeSpeech(over)` never spread
  `over`). Three field-presence tests passed anyway; only the one asserting rendered TEXT caught
  it — the same failure mode as the file being replaced.

## What is still not covered, deliberately

- **The PL/pgSQL notification trigger.** Only observable against a real Postgres. See
  `src/__tests__/README-sql-triggers.md`.
- **The `manage-prayers` Switch** in settings has neither testID nor accessibility label, so it has
  no reachable handle. Left alone rather than adding a testID purely for a test — though the
  missing label is a real accessibility gap worth fixing on its own terms.
- **`register.tsx`'s `timezone || DEFAULT_TIMEZONES[language]` fallback** is unreachable: the lazy
  initialiser and the picker both always yield a non-empty string. Noted rather than tested with a
  fake.
