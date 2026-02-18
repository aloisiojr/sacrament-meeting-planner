# REVIEW_CR76 - Fix Users Screen HTTP 401 (Regression CR-64)

```yaml
type: review
version: 2
verdict: APPROVED
features: [CR-76]
regression_of: CR-64
commits_reviewed:
  # v2 commits (current review)
  - 9a3f81a: "fix(users): remove manual Authorization header override in callEdgeFunction (CR-76)"
  - 2efcc61: "test(users): update CR-76 and CR-64 tests for manual auth header removal (CR-76 v2)"
  # v1 commits (previously reviewed, still in history)
  - c9bb592: "fix(users): extract server-side error details from FunctionsHttpError context (CR-76)"
  - d7456c8: "test(users): add QA tests for CR-76 error extraction fix"
files_reviewed:
  - src/app/(tabs)/settings/users.tsx (MODIFIED)
  - src/__tests__/cr076-users-error-extraction.test.ts (MODIFIED)
  - src/__tests__/cr004-f007-auth-fixes.test.ts (MODIFIED)
  - supabase/functions/list-users/index.ts (VERIFIED - no changes)
  - supabase/migrations/006_list_ward_users_rpc.sql (VERIFIED - no changes)
  - docs/SPEC_CR76.yaml (v2)
  - docs/arch/ARCH_CR76.md (v2)
  - docs/PLAN_CR76.md (v2)
qa_status: "2077/2077 tests pass (28 cr076 + 123 cr004-f007 + rest), no regressions"
```

## Verdict: APPROVED

No issues found. The v2 fix correctly identifies and addresses the real root cause (stale JWT from manual `getSession()` override). The implementation is a clean removal of harmful code, not an addition of new complexity.

## Review History

```yaml
v1_review:
  verdict: APPROVED
  what_was_reviewed: "ADR-022 error extraction logic (error.context.json())"
  problem: "v1 assumed root cause was Edge Function not redeployed (HTTP 403). User confirmed actual error is HTTP 401."
  status: "v1 error extraction logic is PRESERVED in v2 and still correct"

v2_review:
  verdict: APPROVED
  what_was_reviewed: "ADR-023 removal of manual Authorization header (getAccessToken + Bearer override)"
  root_cause: "RCA-AUTH-1: callEdgeFunction sent stale/expired JWT via manual header override, causing HTTP 401"
  fix: "Remove getAccessToken() and manual Authorization header. Let SDK handle auth automatically."
```

## Issues Found

**None.** No P0, P1, P2, or P3 issues identified.

## Checklist Results

### 1. getAccessToken() Removal -- PASS

- `getAccessToken()` function (previously at lines 38-41) is **completely removed** from `users.tsx`.
- No references to `supabase.auth.getSession()` remain in the file.
- No references to `session?.access_token` remain in the file.
- The diff in commit `9a3f81a` shows clean removal: 4 lines for the function, 1 line for the `const token` call, 1 line for the `headers` parameter.

### 2. callEdgeFunction No Manual Authorization Header -- PASS

- The `supabase.functions.invoke()` call (line 42-44) now passes only `{ body }` with no `headers` parameter.
- No `Authorization`, `Bearer`, or token construction exists in `callEdgeFunction`.
- The SDK's automatic auth header injection (via `autoRefreshToken: true` in `src/lib/supabase.ts`) handles authentication with properly refreshed tokens.
- This is consistent with other Edge Function calls in the codebase (e.g., `register-first-user`, `register-invited-user`) that already rely on automatic auth.

### 3. Error Extraction (ADR-022) Preserved -- PASS

- The error extraction logic (lines 45-55 of current `users.tsx`) is **unchanged** from v1:
  1. Check `error.context` existence
  2. Verify `typeof error.context.json === 'function'`
  3. Await `error.context.json()` to read response body
  4. Extract `errorBody?.error` for the server-side message
  5. Fall back to `error.message` if extraction fails
- `try/catch` wraps the extraction. `serverMessage || error.message` ensures a message is always present.

### 4. ADR-023 Adherence -- PASS

- ADR-023 decision: "Remove getAccessToken() and the manual Authorization header. Let supabase.functions.invoke() handle auth automatically via its built-in header injection."
- Implementation follows this exactly:
  - `getAccessToken()` removed entirely
  - Manual `headers: { Authorization: ... }` removed from `invoke()` call
  - No new code added -- purely a removal
  - All 4 Edge Function calls (`list-users`, `create-invitation`, `update-user-role`, `delete-user`) benefit since they all go through `callEdgeFunction`

### 5. Tests Updated Correctly -- PASS

- **cr076 tests** (`src/__tests__/cr076-users-error-extraction.test.ts`): 28 tests total
  - **NEW section added** (5 tests): "CR-76 v2: callEdgeFunction does NOT manually override auth (ADR-023)"
    - Verifies `getAccessToken` function does not exist
    - Verifies `supabase.auth.getSession()` not called
    - Verifies `Authorization` not in `callEdgeFunction` body (scoped check using `indexOf`)
    - Verifies no `Bearer` token construction
    - Verifies `invoke` called with only `{ body }` and no `headers:`
  - **ADR-022 tests preserved** (7 tests): error extraction logic unchanged
  - **Edge Function + RPC tests preserved** (10 tests): server-side correctness unchanged
  - **UI and mutation tests preserved** (6 tests): error handling, retry button, onError guards

- **cr004-f007 tests** (`src/__tests__/cr004-f007-auth-fixes.test.ts`): 123 tests total
  - 2 tests **inverted** to match v2 behavior:
    - `"should NOT have getAccessToken helper (removed in CR-76 v2)"` -- was `toContain`, now `not.toContain`
    - `"should NOT pass manual Authorization header to edge functions (CR-76 v2)"` -- was `toContain`, now `not.toContain`
  - Test descriptions updated to explain WHY the assertion changed (references CR-76 v2 and SDK auto-auth).
  - All other 121 tests unchanged.

- **All 151 tests pass** across both files. 2077/2077 total tests pass with no regressions.

### 6. Security -- PASS

- The fix **improves** security:
  - Eliminates the risk of sending expired JWTs that fail silently.
  - The SDK's `autoRefreshToken` mechanism ensures fresh tokens are always used.
  - No risk of empty token from `resilientStorage` null returns (CF-1 from SPEC).
- No new attack surfaces introduced. The change is purely a removal of code.
- Server-side permission checks remain correct and unchanged.
- Error extraction does not expose sensitive data to the UI (UI shows `t('users.loadError')`).

### 7. Regression Risk -- PASS

- **All 4 Edge Function calls benefit**: `list-users`, `create-invitation`, `update-user-role`, and `delete-user` all use `callEdgeFunction` and now get proper auto-refreshed JWT auth.
- **Mutation onError handlers** (lines 120-127, 140-147): The `err?.message || err?.context?.body?.error` pattern still works. After the fix, `callEdgeFunction` throws `new Error(serverMessage)` where `serverMessage` is extracted from the server response. `err.message` now contains the server-side message directly, so the first branch matches correctly.
- **No UI changes**: All rendering, query keys, mutation logic, and component structure are unchanged.
- **Consistent with codebase**: Other Edge Function calls (`register-first-user`, `register-invited-user`) already use automatic auth. This fix makes `callEdgeFunction` consistent.

### 8. Commits -- PASS

- **Atomic commits**: one for the fix (`9a3f81a`), one for the tests (`2efcc61`).
- **Conventional commit messages**: `fix(users):` and `test(users):` prefixes with CR reference.
- **Accurate descriptions**: Commit messages explain what was removed and why (stale JWT, SDK auto-auth).
- **Fix commit** modifies only `src/app/(tabs)/settings/users.tsx` (1 file, net -7 lines).
- **Test commit** modifies 2 test files: cr076 (adds ADR-023 tests) and cr004-f007 (inverts 2 assertions).

## Minor Observations (P3 -- informational, no action required)

1. **Dead code in mutation onError handlers**: The `err?.context?.body?.error` fallback in `changeRoleMutation.onError` (line 121) and `deleteUserMutation.onError` (line 141) is effectively unreachable since `callEdgeFunction` already extracts the server message into `err.message`. This is harmless and could be cleaned up in a future refactor.

2. **Pre-existing Edge Function comment**: Line 3 of `supabase/functions/list-users/index.ts` says "Requires JWT with Bishopric role" but secretary is also allowed since CR-64 (commit `d7daf13`). Pre-existing inaccuracy, not introduced by CR-76.

## Server-Side Verification Summary

| File | Status | Notes |
|------|--------|-------|
| `supabase/functions/list-users/index.ts` | CODE CORRECT | Secretary in `ALLOWED_ROLES` since CR-64. No code changes or redeployment needed for v2 fix. |
| `supabase/migrations/006_list_ward_users_rpc.sql` | CODE CORRECT | `SECURITY DEFINER`, correct column selection, `ward_id` filter. |

## Summary

| Area | Status |
|------|--------|
| getAccessToken() removed | PASS |
| No manual Authorization header | PASS |
| ADR-022 error extraction preserved | PASS |
| ADR-023 manual auth removal followed | PASS |
| Security (improved -- fresh tokens) | PASS |
| Tests updated (28 cr076 + 123 cr004-f007) | PASS |
| Regression risk (mutations, UI, queries) | PASS |
| Commit quality (atomic, conventional) | PASS |

**APPROVED** -- CR-76 v2 correctly identifies the root cause (stale JWT from manual `getSession()` override), removes the harmful code, preserves the error extraction improvement from v1, and updates all tests consistently.
