# PLAN_CR76 - Fix Users Screen HTTP 401 (Regression CR-64)

## PLAN_SUMMARY

```yaml
type: plan_summary
version: 2
total_steps: 2
parallel_tracks: 1
estimated_commits: 2
coverage:
  acceptance_criteria: 7/7
  edge_cases: 6/6
critical_path:
  - "STEP-01: Remove getAccessToken() and manual Authorization header from callEdgeFunction"
  - "STEP-02: Update QA tests for CR-76 v2 (remove manual auth assertions, add no-manual-auth assertions)"
main_risks:
  - "VERY_LOW: supabase.functions.invoke() may not include auth header automatically -- confirmed SDK documented behavior, already used by register-first-user/register-invited-user in the codebase"
previous_plan_superseded: |
  PLAN_CR76 v1 assumed root cause was Edge Function not redeployed (RCA-1, HTTP 403).
  User verified via Supabase logs that the actual error is HTTP 401 (Unauthorized).
  The root cause is client-side: callEdgeFunction manually overrides the Authorization
  header with a stale/expired JWT from getSession(). The fix is to remove this override
  and let the SDK handle auth automatically.
```

## PLAN

```yaml
type: plan
version: 2

goal: "Fix Users screen HTTP 401 regression by removing the manual Authorization header override in callEdgeFunction, letting supabase.functions.invoke() handle auth automatically via autoRefreshToken"

strategy:
  order: "Fix client-side auth -> Update tests"
  commit_strategy: "1 commit per step, conventional commit messages"
  test_strategy: "Source-level verification tests (same pattern as cr004-f007-auth-fixes.test.ts and existing cr076 tests)"

context:
  confirmed_root_cause: |
    RCA-AUTH-1 (CONFIRMED via Supabase logs -- HTTP 401, NOT 403):
    callEdgeFunction in users.tsx manually fetches JWT via getAccessToken() -> getSession()
    and passes it as a custom Authorization header. This OVERRIDES the SDK's automatic
    auth header (which uses the auto-refreshed in-memory token).

    getSession() reads from AsyncStorage (via resilientStorage) and returns the CACHED
    session WITHOUT validating or refreshing the token. If the JWT expired (>1 hour),
    the stale token is sent. The Edge Function validates it via supabaseAdmin.auth.getUser(token),
    which fails, returning HTTP 401 "Invalid or expired token".

  what_already_exists: |
    The error extraction logic (ADR-022) was already implemented in PLAN v1:
    - users.tsx lines 52-64: error.context.json() extraction with try/catch
    - This logic is CORRECT and must be KEPT
    - Only the manual auth header (lines 38-41, 47, 50) needs to be removed

  server_side_status: |
    Server-side code is CORRECT -- no changes needed:
    - list-users/index.ts: secretary in ALLOWED_ROLES, calls list_ward_users RPC
    - 006_list_ward_users_rpc.sql: SECURITY DEFINER, filters by ward_id
    - The 401 occurs BEFORE the permission check is reached
    - No redeployment needed to fix this issue

  supabase_sdk_verification: |
    Confirmed from node_modules/@supabase/functions-js/src/FunctionsClient.ts:
    - Line 157: headers merge order is `{ ..._headers, ...this.headers, ...headers }`
    - this.headers contains the Authorization header set by the SDK (auto-refreshed)
    - If user passes custom headers with Authorization, it OVERRIDES this.headers
    - Removing the custom Authorization header lets the SDK's auto-managed header through
    - autoRefreshToken: true in src/lib/supabase.ts ensures token is refreshed before expiry

steps:
  - id: STEP-01
    description: "Remove getAccessToken() and manual Authorization header from callEdgeFunction in users.tsx (ADR-023)"
    files:
      - "src/app/(tabs)/settings/users.tsx"
    dependencies: []
    parallelizable_with: []
    done_when:
      - "getAccessToken() function (lines 38-41) is COMPLETELY REMOVED"
      - "The `const token = await getAccessToken();` line (line 47) is REMOVED"
      - "The `headers: { Authorization: \\`Bearer ${token}\\` }` (line 50) is REMOVED"
      - "The invoke call is simplified to: `supabase.functions.invoke(functionName, { body })`"
      - "The error extraction logic (lines 52-64) is PRESERVED unchanged"
      - "No other changes to the file -- all UI, mutations, queries remain intact"
      - "All 4 Edge Function calls (list-users, create-invitation, update-user-role, delete-user) benefit from this fix since they all go through callEdgeFunction"
    implementation:
      what_to_remove: |
        1. REMOVE entire getAccessToken() function (lines 38-41):
           ```
           async function getAccessToken(): Promise<string> {
             const { data: { session } } = await supabase.auth.getSession();
             return session?.access_token ?? '';
           }
           ```

        2. REMOVE token fetching and manual header from callEdgeFunction (lines 47, 50):
           BEFORE:
           ```
           const token = await getAccessToken();
           const { data, error } = await supabase.functions.invoke(functionName, {
             body,
             headers: { Authorization: `Bearer ${token}` },
           });
           ```
           AFTER:
           ```
           const { data, error } = await supabase.functions.invoke(functionName, {
             body,
           });
           ```

      what_to_keep: |
        The error extraction logic (ADR-022) must be PRESERVED exactly as-is:
        ```
        if (error) {
          let serverMessage: string | undefined;
          try {
            if (error.context && typeof error.context.json === 'function') {
              const errorBody = await error.context.json();
              serverMessage = errorBody?.error;
            }
          } catch {
            // Extraction failed, fall through to generic message
          }
          throw new Error(serverMessage || error.message);
        }
        return data;
        ```

      final_callEdgeFunction: |
        async function callEdgeFunction(
          functionName: string,
          body: Record<string, unknown>
        ) {
          const { data, error } = await supabase.functions.invoke(functionName, {
            body,
          });
          if (error) {
            let serverMessage: string | undefined;
            try {
              if (error.context && typeof error.context.json === 'function') {
                const errorBody = await error.context.json();
                serverMessage = errorBody?.error;
              }
            } catch {
              // Extraction failed, fall through to generic message
            }
            throw new Error(serverMessage || error.message);
          }
          return data;
        }
    tests:
      - type: source_check
        description: "callEdgeFunction does NOT contain 'getAccessToken'"
      - type: source_check
        description: "callEdgeFunction does NOT contain 'Authorization'"
      - type: source_check
        description: "callEdgeFunction does NOT contain 'Bearer'"
      - type: source_check
        description: "callEdgeFunction does NOT contain 'getSession'"
      - type: source_check
        description: "callEdgeFunction calls supabase.functions.invoke with only { body }"
      - type: source_check
        description: "error.context.json() extraction logic is preserved"
    covers:
      acceptance_criteria: ["AC-1", "AC-2", "AC-3", "AC-4", "AC-5", "AC-6", "AC-7"]
      edge_cases: ["EC-1", "EC-2", "EC-3", "EC-4", "EC-5", "EC-6"]
    risks:
      - risk: "supabase.functions.invoke() may not include auth header automatically"
        severity: VERY_LOW
        mitigation: "Documented SDK behavior. Already working for register-first-user and register-invited-user calls in the codebase. SDK sets Authorization from this.headers which includes the auto-managed token."

  - id: STEP-02
    description: "Update QA tests for CR-76 v2: add no-manual-auth assertions, remove stale assertions, verify error extraction preserved"
    files:
      - "src/__tests__/cr076-users-error-extraction.test.ts"
    dependencies: ["STEP-01"]
    parallelizable_with: []
    done_when:
      - "Test file updated at src/__tests__/cr076-users-error-extraction.test.ts"
      - "NEW tests added: verify getAccessToken() function does NOT exist in users.tsx"
      - "NEW tests added: verify callEdgeFunction does NOT contain 'Authorization', 'Bearer', or 'getSession'"
      - "NEW tests added: verify invoke call does NOT pass headers with Authorization"
      - "EXISTING tests preserved: error.context.json() extraction logic assertions"
      - "EXISTING tests preserved: Edge Function and RPC code correctness assertions"
      - "EXISTING tests preserved: UI error handling (t('users.loadError'), retry button) assertions"
      - "Test for 'Authorization: \\`Bearer ${token}\\`' presence is REMOVED or inverted to expect NOT present"
      - "All tests pass with `npx vitest run src/__tests__/cr076-users-error-extraction.test.ts`"
    tests_to_add:
      - "users.tsx should NOT contain getAccessToken function"
      - "users.tsx should NOT contain supabase.auth.getSession in callEdgeFunction context"
      - "callEdgeFunction should NOT pass Authorization header to invoke"
      - "callEdgeFunction should NOT contain Bearer token construction"
      - "callEdgeFunction should invoke with only { body } (no headers)"
    tests_to_keep:
      - "callEdgeFunction contains error.context check"
      - "callEdgeFunction contains error.context.json method check"
      - "callEdgeFunction contains try/catch for error extraction"
      - "callEdgeFunction throws Error with serverMessage fallback"
      - "list-users Edge Function includes secretary in allowed roles"
      - "list-users Edge Function calls list_ward_users RPC"
      - "006 migration defines list_ward_users function with SECURITY DEFINER"
      - "users.tsx shows t('users.loadError') on error"
      - "users.tsx has retry button with refetch()"
      - "changeRoleMutation and deleteUserMutation onError check err?.message"
    tests_from_cr004_f007_to_update:
      note: |
        The existing test in src/__tests__/cr004-f007-auth-fixes.test.ts line 494-497 asserts:
        "should pass Authorization header with Bearer token to edge functions"
        -> expect(source).toContain('Authorization: `Bearer ${token}`')

        This test WILL FAIL after STEP-01 removes the manual Authorization header.
        It must be UPDATED to assert the OPPOSITE -- that callEdgeFunction does NOT
        manually set Authorization headers, relying on SDK automatic auth instead.
    covers:
      acceptance_criteria: ["AC-1", "AC-2", "AC-3", "AC-4", "AC-5", "AC-6", "AC-7"]
      edge_cases: ["EC-1", "EC-2", "EC-3", "EC-4", "EC-5", "EC-6"]

validation:
  - ac_id: AC-1
    how_to_verify: "callEdgeFunction does NOT set manual Authorization header -- SDK handles auth automatically with auto-refreshed token. Tested in STEP-02."
    covered_by_steps: ["STEP-01", "STEP-02"]
  - ac_id: AC-2
    how_to_verify: "getAccessToken() function is removed. Tested in STEP-02."
    covered_by_steps: ["STEP-01", "STEP-02"]
  - ac_id: AC-3
    how_to_verify: "Secretary navigates to Settings > Users, Edge Function receives valid JWT, returns 200 with users array. Requires manual end-to-end test after deployment."
    covered_by_steps: ["STEP-01"]
  - ac_id: AC-4
    how_to_verify: "Secretary appears in user list. Requires manual end-to-end test."
    covered_by_steps: ["STEP-01"]
  - ac_id: AC-5
    how_to_verify: "callEdgeFunction extracts server error message from error.context.json() -- preserved from v1 fix. Tested in STEP-02."
    covered_by_steps: ["STEP-01", "STEP-02"]
  - ac_id: AC-6
    how_to_verify: "Users screen shows t('users.loadError') with retry button on error -- already implemented by CR-64. Tested in STEP-02."
    covered_by_steps: ["STEP-02"]
  - ac_id: AC-7
    how_to_verify: "All 4 Edge Function calls (list-users, create-invitation, update-user-role, delete-user) go through callEdgeFunction and benefit from the fix. No regressions."
    covered_by_steps: ["STEP-01", "STEP-02"]
```
