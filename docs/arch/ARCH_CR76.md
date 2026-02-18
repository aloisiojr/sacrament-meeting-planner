# ARCH_CR76 - Fix Users Screen HTTP 401 (Regression CR-64)

```yaml
type: arch
version: 2
status: complete
module: AuthModule_Patch
features: [CR-76]
spec: SPEC_CR76 (v2)
regression_of: CR-64
```

## ARCH_SUMMARY

```yaml
type: arch_summary
status: complete
components_count: 2
main_components:
  - "callEdgeFunction (remove manual Authorization header override)"
  - "getAccessToken (remove -- redundant and harmful)"
tech_stack:
  - "Supabase JS Client v2 (functions.invoke automatic auth)"
  - "TanStack Query (error handling)"
  - "react-i18next"
estimated_iterations: 1
```

## Overview

```yaml
goal: "Fix the Users screen HTTP 401 regression by removing the manual Authorization header override in callEdgeFunction, letting supabase.functions.invoke() handle auth automatically"
principles:
  - "No new features -- only remove the harmful manual auth override"
  - "Trust the Supabase SDK automatic token management (autoRefreshToken: true)"
  - "Keep the existing error extraction logic (error.context.json) from ADR-022"
  - "Server-side code is correct -- no Edge Function or RPC changes needed"
```

## Diagram

```
  Secretary clicks "Users"
          |
          v
  BEFORE (BROKEN):
  +---------------------+     stale JWT override     +-------------------+
  | users.tsx            | ----------------------->   | list-users EF     |
  | getAccessToken()     |     invoke('list-users',   | getUser(token)    |
  |   -> getSession()    |     headers: {Auth:stale}) |   -> EXPIRED!     |
  |   -> expired token   | <--------- 401 ---------- | returns 401       |
  +---------------------+                            +-------------------+

  AFTER (FIXED):
  +---------------------+     auto-refreshed JWT     +-------------------+
  | users.tsx            | ----------------------->   | list-users EF     |
  | NO getAccessToken()  |     invoke('list-users',   | getUser(token)    |
  | NO manual header     |     { body })              |   -> VALID!       |
  |                      | <--------- 200 ---------- | returns users     |
  +---------------------+                            +-------------------+
```

## Root Cause Analysis

```yaml
confirmed_root_cause:
  id: RCA-AUTH-1
  title: "callEdgeFunction sends stale JWT by manually overriding Authorization header"
  description: |
    1. getAccessToken() calls supabase.auth.getSession() which reads from
       AsyncStorage (via resilientStorage). It returns the CACHED session
       WITHOUT validating or refreshing the token.

    2. The manual `headers: { Authorization: \`Bearer ${token}\` }` in
       supabase.functions.invoke() OVERRIDES the SDK's automatic Authorization
       header, which would use the properly refreshed in-memory token.

    3. If the JWT has expired (>1 hour, default lifetime), the Edge Function
       receives an expired token, supabaseAdmin.auth.getUser(token) fails,
       and the function returns HTTP 401.

  evidence:
    - "Supabase logs confirm HTTP 401 (Unauthorized), NOT 403"
    - "getSession() docs: 'reads from local storage, may return expired session'"
    - "autoRefreshToken: true in supabase.ts handles refresh via internal state"
    - "Manual header overrides the SDK's automatic header injection"

previous_analysis_was_wrong: |
  ARCH_CR76 v1 assumed the root cause was "Edge Function not redeployed" (RCA-1).
  The user verified in Supabase logs that the error is HTTP 401, not 403. This
  means authentication fails BEFORE the permission check is reached. The root
  cause is client-side, not server-side.

code_status:
  list_users_ef: "CORRECT -- no changes needed"
  list_ward_users_rpc: "CORRECT -- no changes needed"
  client_getAccessToken: "REMOVE -- redundant and harmful"
  client_callEdgeFunction: "FIX -- remove manual Authorization header"
```

## Components

| # | Component | Responsibility | Change Type |
|---|-----------|----------------|-------------|
| 1 | getAccessToken() | Fetch cached JWT from getSession() | REMOVE -- root cause of 401 |
| 2 | callEdgeFunction() | Invoke Edge Functions with auth | FIX -- remove manual header, keep error extraction |

## Contracts

### C1: callEdgeFunction -- Remove Manual Auth Header (FIX)

```yaml
file: src/app/(tabs)/settings/users.tsx
function: callEdgeFunction(functionName, body)

problem: |
  The function manually fetches a JWT via getAccessToken() -> getSession()
  and passes it as a custom Authorization header. This OVERRIDES the
  automatic auth header that supabase.functions.invoke() would set using
  the current (auto-refreshed) session token from internal state.

  getSession() returns the locally cached session from AsyncStorage without
  validating or refreshing it. If the JWT expired (default: 1 hour), the
  stale token is sent, causing HTTP 401.

fix: |
  1. REMOVE the getAccessToken() function entirely (lines 38-41)
  2. REMOVE the `const token = await getAccessToken();` call (line 47)
  3. REMOVE the `headers: { Authorization: \`Bearer ${token}\` }` (line 50)
  4. KEEP the error extraction logic (lines 53-63) -- it is a valid improvement
  5. The invoke call becomes: supabase.functions.invoke(functionName, { body })

contract:
  input: "functionName: string, body: Record<string, unknown>"
  output: "Promise<any> -- resolved data on success"
  error: "Throws Error with server-side message extracted from error.context.json()"

implementation_after_fix: |
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

lines_removed:
  - "38-41: getAccessToken() function (entire function)"
  - "47: const token = await getAccessToken();"
  - "50: headers: { Authorization: \`Bearer ${token}\` }"
  - "Note: The comma after 'body' on line 49 also needs adjustment"

lines_kept:
  - "53-63: error.context.json() extraction logic (ADR-022)"
```

### C2: Server-Side Components (NO CHANGES)

```yaml
files:
  - supabase/functions/list-users/index.ts
  - supabase/functions/create-invitation/index.ts
  - supabase/functions/update-user-role/index.ts
  - supabase/functions/delete-user/index.ts
  - supabase/migrations/006_list_ward_users_rpc.sql

status: ALL_CORRECT
reason: |
  The Edge Function correctly validates JWTs and includes secretary in
  ALLOWED_ROLES. The 401 error is caused by receiving an expired token
  from the client, not by server-side logic errors. Once the client stops
  overriding the Authorization header, the SDK sends a fresh token and
  the Edge Function works correctly.

no_code_changes_needed: true
no_redeployment_needed: true
```

## Data Model Changes

```yaml
migrations: none
database_changes: none
edge_function_changes: none
```

## Flows

### F1: Successful Users Screen Load (after fix)

```
1. Secretary navigates to Settings > Users
2. users.tsx queryFn calls callEdgeFunction('list-users', {})
3. callEdgeFunction calls supabase.functions.invoke('list-users', { body: {} })
4. Supabase SDK automatically attaches the current session's JWT
   (auto-refreshed via autoRefreshToken: true) as the Authorization header
5. list-users EF receives a valid, non-expired JWT
6. EF validates JWT via supabaseAdmin.auth.getUser(token) -- SUCCESS
7. EF extracts ward_id and role from app_metadata
8. EF checks role -- secretary is in ALLOWED_ROLES, passes
9. EF calls list_ward_users RPC with ward_id
10. RPC queries auth.users, returns matching users
11. EF returns 200 { users: [...] }
12. callEdgeFunction returns data (no error)
13. queryFn returns data.users
14. users.tsx renders user cards including the secretary
```

### F2: Error with Detailed Message (preserved from ADR-022)

```
1. Secretary calls list-users, but something fails server-side
2. EF returns 500 { error: "Failed to list users" }
3. supabase.functions.invoke sets error = FunctionsHttpError
4. callEdgeFunction catches error
5. Extracts "Failed to list users" from error.context.json()
6. Throws Error("Failed to list users")
7. TanStack Query catches error, sets usersError
8. users.tsx renders error state with t('users.loadError') + retry button
```

### F3: Edge Case -- Session Expired, SDK Auto-Refreshes

```
1. Secretary has been on the app for >1 hour (JWT expired)
2. Secretary navigates to Settings > Users
3. supabase.functions.invoke() detects expired token in internal state
4. SDK triggers automatic token refresh via autoRefreshToken
5. SDK sends request with the FRESH token
6. EF receives valid JWT, returns 200 with users
7. (With the old code, getSession() would return the expired token,
   override the SDK's fresh token, and cause 401)
```

## Security

```yaml
no_changes: true
improvement: |
  Removing the manual Authorization header override actually IMPROVES
  security because:
  1. The SDK's automatic token management ensures fresh tokens are used
  2. No risk of sending expired JWTs that fail silently
  3. The SDK handles edge cases (token refresh, storage failures) better
     than the manual getSession() approach
  4. Other Edge Function calls (register-first-user, register-invited-user)
     already rely on automatic auth -- this fix makes all EF calls consistent
notes:
  - "Permission check in list-users EF is already correct (bishopric + secretary)"
  - "Error extraction does NOT expose sensitive data to UI"
  - "UI shows translated i18n error, not raw server message"
```

## File Impact Summary

| File | Change Type | Lines Affected | Description |
|------|-------------|----------------|-------------|
| `src/app/(tabs)/settings/users.tsx` | FIX | 38-41, 47, 50 | Remove `getAccessToken()` function, remove manual `Authorization` header from `callEdgeFunction`, keep error extraction logic |

**No other files are impacted.** Server-side code is correct and does not need changes or redeployment.

## ADRs

```yaml
adrs:
  - id: ADR-022
    title: "Extract server-side error details from FunctionsHttpError"
    context: "supabase.functions.invoke returns generic 'non-2xx status code' message. Server returns specific error JSON but it is lost."
    decision: "Parse error.context (Response) JSON in callEdgeFunction to extract server error message. Fall back to generic message on parse failure."
    consequences:
      - "Better debugging -- console shows specific server error"
      - "Foundation for showing more specific user-facing error messages in the future"
    status: "KEEP -- this was implemented in ARCH_CR76 v1 and is already in the code. Do not remove."

  - id: ADR-023
    title: "Remove manual Authorization header from Edge Function calls"
    context: "callEdgeFunction manually fetches JWT via getSession() and overrides the automatic SDK auth header. getSession() returns cached (possibly expired) tokens. The SDK's autoRefreshToken handles token lifecycle correctly."
    decision: "Remove getAccessToken() and the manual Authorization header. Let supabase.functions.invoke() handle auth automatically via its built-in header injection."
    consequences:
      - "Fixes HTTP 401 regression by using fresh, auto-refreshed tokens"
      - "Simpler code -- 4 lines removed, no new code added"
      - "Consistent with other EF calls (register-first-user, register-invited-user) that already use automatic auth"
```

## Risk Assessment

```yaml
risks:
  - id: R-1
    severity: VERY_LOW
    description: "supabase.functions.invoke() may not include auth header automatically"
    mitigation: |
      This is well-documented Supabase JS v2 behavior. The SDK automatically
      attaches the current session's JWT as the Authorization header for all
      requests including functions.invoke(). This is already working for
      register-first-user and register-invited-user calls in the codebase
      (they don't use callEdgeFunction and don't set manual headers).
    likelihood: "Negligible -- documented SDK behavior"

  - id: R-2
    severity: LOW
    description: "error.context.json() may differ between supabase-js versions"
    mitigation: "Wrapped in try/catch. Falls back to generic message on failure."
```
