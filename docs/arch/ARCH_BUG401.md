# ARCH_BUG401 - Fix Systemic HTTP 401 on All Authenticated Edge Functions

```yaml
type: arch
version: 2
status: complete
module: AuthModule_Patch
features: [BUG-401]
spec: SPEC_BUG401
related_to: CR-76
updated: "2026-02-17 -- Added H-5 gateway-level JWT verification analysis"
```

## ARCH_SUMMARY

```yaml
type: arch_summary
status: complete
root_cause: "TWO LAYERS -- H-5 (gateway) is the PRIMARY blocker, RCA-401-1 (SDK fallback) is the SECONDARY defense gap"
fix_approach: "STEP-1: Dashboard config change (disable legacy JWT verification). STEP-2: Client-side defense-in-depth guards."
components_count: 4
main_components:
  - "Supabase Dashboard: disable 'Verify JWT with legacy secret' per function (PRIMARY FIX)"
  - "callEdgeFunction: add session validation guard before invoke (DEFENSE-IN-DEPTH)"
  - "Users screen useQuery: add enabled: !!session guard (DEFENSE-IN-DEPTH)"
  - "Edge Functions config.toml: add verify_jwt = false per function (ALTERNATIVE to dashboard)"
tech_stack:
  - "Supabase Dashboard (Edge Functions settings)"
  - "Supabase JS Client v2.95.3 (functions.invoke automatic auth)"
  - "TanStack Query (enabled option for query guards)"
  - "React Context (AuthContext session state)"
estimated_iterations: 1
```

## Overview

```yaml
goal: >
  Fix the systemic 401 error on all authenticated Edge Functions by addressing
  BOTH the gateway-level JWT verification conflict (H-5, PRIMARY) and the
  SDK-level silent ANON key fallback (RCA-401-1, SECONDARY defense gap).
principles:
  - "Fix the gateway first: the Supabase relay is rejecting valid user JWTs before function code runs"
  - "Defense-in-depth: also guard against SDK's silent ANON key fallback for robustness"
  - "No silent failures: if session is unavailable, surface a clear error instead of sending ANON key"
  - "Wait for auth: queries that call Edge Functions must not fire until auth session is confirmed"
  - "Server-side Edge Function code is correct: no changes needed"
```

## Diagram

```
  TWO-LAYER PROBLEM:

  LAYER 1 -- Gateway (H-5, PRIMARY BLOCKER):
  +----------+     User JWT (valid)    +------------------+
  | Client   | ----------------------> | Supabase Gateway |
  | SDK      |     Authorization:      | "Verify JWT with |
  |          |     Bearer <user_jwt>   |  legacy secret"  |
  +----------+                         |  is ON           |
                                       |                  |
                                       | Verifies JWT     |
                                       | signature with   |
                                       | LEGACY secret    |
                                       | User JWT signed  |
                                       | with CURRENT     |
                                       | secret           |
                                       | -> MISMATCH!     |
                                       | -> 401 REJECTED  |
                                       | (function code   |
                                       |  NEVER executes) |
                                       +------------------+

  LAYER 2 -- SDK Fallback (RCA-401-1, SECONDARY):
  +----------+     ANON key           +------------------+    +------------------+
  | Client   | ---------------------> | Gateway          | -> | Edge Function    |
  | SDK      |     (when session is   | ANON key passes  |    | auth.getUser(    |
  | (no      |      null, SDK falls   | gateway because  |    |   ANON_KEY)      |
  |  session)|      back to ANON key) | it IS signed     |    | -> NOT a user    |
  +----------+                        | with legacy      |    |    JWT -> 401    |
                                      | secret           |    +------------------+
                                      +------------------+

  AFTER FIX (both layers):
  +----------+     User JWT (valid)    +------------------+    +------------------+
  | Client   | ----------------------> | Supabase Gateway |    | Edge Function    |
  | SDK      |     Authorization:      | verify_jwt OFF   | -> | auth.getUser(    |
  | (session |     Bearer <user_jwt>   | (or legacy OFF)  |    |   valid_jwt)     |
  |  guard)  |                         | Passes through   |    | -> SUCCESS       |
  +----------+                         +------------------+    | -> 200 OK        |
       |                                                       +------------------+
       |
       +-- If no session: throws Error('auth/no-session')
           instead of sending ANON key (defense-in-depth)
```

## Root Cause Analysis

```yaml
root_causes:
  - id: RCA-H5
    title: "PRIMARY: Gateway 'Verify JWT with legacy secret' rejects valid user JWTs"
    severity: CRITICAL
    confirmed: HIGHLY_LIKELY
    description: |
      The Supabase Dashboard has "Verify JWT with legacy secret" set to ON for
      Edge Functions. This means the Supabase relay/gateway verifies the JWT
      signature in the Authorization header BEFORE the Edge Function code runs.

      KEY INSIGHT: Supabase projects can have TWO JWT secrets:
      1. The LEGACY JWT secret (original project secret, used to sign anon/service_role keys)
      2. The CURRENT JWT secret (may differ from legacy if JWT signing was updated)

      When "Verify JWT with legacy secret" is ON:
      - The gateway verifies the Authorization Bearer token using the LEGACY secret
      - User JWTs issued by Supabase Auth are signed with the CURRENT secret
      - If legacy secret != current secret, the signature check FAILS
      - The gateway returns 401 BEFORE the Edge Function code even executes
      - The Edge Function's own auth.getUser() never gets a chance to run

      WHY ANON KEY WOULD PASS (but still fail at code level):
      - The ANON key is a long-lived JWT generated at project creation time
      - It was signed with the LEGACY secret (same secret the gateway checks)
      - So ANON key passes the gateway's signature verification
      - But then the Edge Function code calls auth.getUser(ANON_KEY)
      - auth.getUser() fails because ANON key is not a user JWT
      - Result: still 401, but from the function code, not the gateway

      WHY process-notifications WORKS:
      - process-notifications is a cron job invoked by Supabase's internal scheduler
      - It does NOT go through the same gateway JWT verification
      - It uses SUPABASE_SERVICE_ROLE_KEY directly within the function
      - No client-side Authorization header is involved

      WHY register-first-user and register-invited-user WORK:
      - These functions were likely deployed with --no-verify-jwt (or
        verify_jwt = false in config), since they are designed to be called
        by unauthenticated users during registration
      - OR they work because the client sends the ANON key (no user session
        during registration), which passes the legacy secret check, and the
        function code does not check the Authorization header

    evidence:
      - "User confirmed 'Verify JWT with legacy secret' is ON in Supabase Dashboard"
      - "Dashboard description says 'The easy to obtain anon key can be used to satisfy this requirement'"
      - "ALL authenticated EFs fail (list-users, create-invitation, update-user-role, delete-user)"
      - "ALL non-authenticated EFs work (process-notifications, register-first-user, register-invited-user)"
      - "The pattern is consistent: JWT-required functions ALL fail, non-JWT functions ALL work"

    fix: |
      OPTION A (Recommended): Turn OFF "Verify JWT with legacy secret" in Supabase Dashboard
      - Dashboard > Edge Functions > Settings > Verify JWT with legacy secret > OFF
      - The Edge Function code ALREADY implements proper JWT validation via auth.getUser()
      - The gateway-level check is redundant and actively harmful
      - Supabase's own recommendation (in the setting description) is: OFF

      OPTION B (Alternative): Deploy functions with --no-verify-jwt flag
      - supabase functions deploy list-users --no-verify-jwt
      - supabase functions deploy create-invitation --no-verify-jwt
      - supabase functions deploy update-user-role --no-verify-jwt
      - supabase functions deploy delete-user --no-verify-jwt
      - This disables the relay JWT check per function
      - The functions still have their own auth.getUser() validation

      OPTION C (config.toml): Add verify_jwt = false in config.toml
      - [functions.list-users]
        verify_jwt = false
      - [functions.create-invitation]
        verify_jwt = false
      - [functions.update-user-role]
        verify_jwt = false
      - [functions.delete-user]
        verify_jwt = false

  - id: RCA-401-1
    title: "SECONDARY: SDK silently falls back to ANON key when session is null"
    severity: MEDIUM
    confirmed: true
    description: |
      The Supabase JS SDK's _getAccessToken() method (SupabaseClient.ts:339-347)
      calls this.auth.getSession(). If getSession() returns { session: null }
      (for ANY reason -- storage failure, expired refresh token, never logged in),
      _getAccessToken returns this.supabaseKey (the ANON key).

      fetchWithAuth (fetch.ts:23) then uses this ANON key as the Authorization
      Bearer token. The Edge Function receives the ANON key, calls
      auth.getUser(ANON_KEY), which fails because the ANON key is not a user JWT.
      Result: HTTP 401.

      NOTE: Even after fixing H-5, this secondary issue should be addressed
      for defense-in-depth. Without the guard, if the session is ever lost
      (storage failure, token expiry, etc.), the SDK will silently send the
      ANON key, resulting in a confusing 401 error instead of a clear
      "not authenticated" message.

    sdk_code_chain: |
      1. supabase.functions.invoke('list-users', { body })
      2. -> FunctionsClient uses this.fetch (which is fetchWithAuth)
      3. -> fetchWithAuth calls getAccessToken()
      4. -> _getAccessToken() calls this.auth.getSession()
      5. -> getSession() awaits initializePromise, then calls __loadSession()
      6. -> __loadSession() reads from storage via getItemAsync(this.storage, key)
      7. -> resilientStorage.getItem() may return null on error
      8. -> If no session found, getSession returns { data: { session: null } }
      9. -> _getAccessToken returns this.supabaseKey (ANON key)
      10. -> fetchWithAuth sets Authorization: Bearer <ANON_KEY>
      11. -> Edge Function: auth.getUser(ANON_KEY) -> 401

    possible_triggers:
      - id: T-1
        title: "resilientStorage silently swallowing errors"
        description: |
          resilientStorage.getItem() wraps AsyncStorage.getItem() in try/catch
          and returns null on ANY error. If AsyncStorage fails (Android cold
          start, native module not initialized, web storage issues), the session
          data is lost silently. The SDK sees no session and falls back to ANON key.
        likelihood: MEDIUM

      - id: T-2
        title: "Refresh token expired (inactive > 7 days)"
        description: |
          If the user has been inactive for more than the Supabase project's
          refresh token expiry (default: 7 days), __loadSession() detects the
          expired access token, calls _callRefreshToken(), which fails because
          the refresh token is also expired. The session is cleared, and
          _getAccessToken returns the ANON key.
        likelihood: MEDIUM

      - id: T-3
        title: "Session never properly persisted after registration"
        description: |
          After register-first-user, the client calls supabase.auth.setSession()
          with the tokens from the EF response. If setSession() fails silently
          (e.g., storage error), the session is never persisted. On next app
          launch or when getSession() is called, storage returns null.
        likelihood: MEDIUM

      - id: T-4
        title: "useQuery fires before SDK initialization completes"
        description: |
          Although getSession() awaits initializePromise, and AuthContext awaits
          getSession() before setting loading=false, and NavigationGuard blocks
          rendering until loading=false, TanStack Query's useQuery fires on
          component mount. If there is any timing window where the component
          renders but the session is not yet available to the SDK's internal
          _getAccessToken, the ANON key is sent.
        likelihood: LOW

  relationship_between_causes: |
    H-5 (gateway) and RCA-401-1 (SDK fallback) are INDEPENDENT causes that
    can BOTH produce 401 errors, but H-5 is likely the PRIMARY blocker
    in the user's current situation:

    SCENARIO A: Session exists + H-5 ON (CURRENT SITUATION):
    - SDK has a valid session, sends a valid user JWT
    - Gateway rejects the user JWT because it's signed with current secret,
      not legacy secret
    - Result: 401 from gateway, function code never executes
    - This explains why ALL authenticated EFs fail even when the user IS logged in

    SCENARIO B: Session lost + H-5 OFF:
    - SDK has no session, falls back to ANON key
    - Gateway passes the ANON key through (no verification or ANON key passes)
    - Function code calls auth.getUser(ANON_KEY) -> 401
    - Result: 401 from function code
    - This is the RCA-401-1 scenario, addressed by defense-in-depth guards

    SCENARIO C: Session exists + H-5 OFF (TARGET STATE):
    - SDK has a valid session, sends a valid user JWT
    - Gateway passes the user JWT through (no verification)
    - Function code calls auth.getUser(valid_jwt) -> success
    - Result: 200 OK

  no_changes_needed:
    - "All Edge Function server-side code is correct"
    - "The CR-76 fix (removing manual Authorization header) was correct"
    - "The SDK's automatic auth mechanism works correctly WHEN a valid session exists AND the gateway does not reject it"

solution_strategy: |
  TWO-STEP FIX:

  STEP 1 (PRIMARY -- infrastructure/config change):
  Disable "Verify JWT with legacy secret" in the Supabase Dashboard for
  all Edge Functions. This removes the gateway-level JWT verification
  that is rejecting valid user JWTs. The Edge Functions already implement
  their own auth validation via auth.getUser(), making the gateway check
  redundant.

  STEP 2 (SECONDARY -- code change, defense-in-depth):
  Add client-side guards to prevent the SDK's silent ANON key fallback:
  a) Add session validation guard in callEdgeFunction before invoke()
  b) Add enabled: !!session guard on useQuery
  c) Destructure session from useAuth()

  Both steps should be implemented. Step 1 fixes the immediate blocker.
  Step 2 prevents future silent 401s when sessions are lost.
```

## Components

| # | Component | Responsibility | Change Type |
|---|-----------|----------------|-------------|
| 1 | Supabase Dashboard config | Disable legacy JWT verification at gateway | CONFIG CHANGE (manual, no code) |
| 2 | callEdgeFunction() | Invoke Edge Functions with validated session | MODIFY -- add session pre-check |
| 3 | useQuery (users list) | Fetch users only when auth session is ready | MODIFY -- add `enabled: !!session` |
| 4 | AuthContext | Provide session state to components | NO CHANGE -- already exposes session |

## Contracts

### C0: Supabase Dashboard -- Disable Legacy JWT Verification (PRIMARY FIX)

```yaml
location: "Supabase Dashboard > Edge Functions > Settings"
setting: "Verify JWT with legacy secret"
current_value: ON
target_value: OFF

problem: |
  When this setting is ON, the Supabase relay/gateway verifies the JWT
  signature in the Authorization header using the LEGACY JWT secret
  BEFORE the Edge Function code executes. If the project's JWT signing
  was updated (legacy secret != current secret), user JWTs signed with
  the CURRENT secret fail the gateway's signature check and are rejected
  with 401. The Edge Function code never runs.

  This creates a paradox:
  - The ANON key (signed with legacy secret) PASSES the gateway check
  - But then FAILS in the function code (auth.getUser rejects it)
  - User JWTs (signed with current secret) FAIL the gateway check
  - So they never reach the function code at all
  - Result: NOTHING works. 401 regardless of what token is sent.

fix: |
  Turn OFF "Verify JWT with legacy secret" in the Dashboard.

  The recommendation text in the Dashboard itself says:
  "Recommendation: OFF with JWT and additional authorization logic
  implemented inside your function's code."

  All Edge Functions in this project already implement authorization
  via auth.getUser(token) + role/ward_id checks. The gateway-level
  check is redundant and actively harmful.

alternative_fix: |
  If per-function control is preferred, deploy each authenticated
  function with --no-verify-jwt:

    supabase functions deploy list-users --no-verify-jwt
    supabase functions deploy create-invitation --no-verify-jwt
    supabase functions deploy update-user-role --no-verify-jwt
    supabase functions deploy delete-user --no-verify-jwt

  Or add to supabase/config.toml:

    [functions.list-users]
    verify_jwt = false

    [functions.create-invitation]
    verify_jwt = false

    [functions.update-user-role]
    verify_jwt = false

    [functions.delete-user]
    verify_jwt = false

  NOTE: register-first-user and register-invited-user likely already
  have this setting since they work without JWT auth.
  process-notifications is a cron job and bypasses the gateway.

security_impact: |
  NONE. Turning off gateway-level JWT verification does NOT reduce security.
  The Edge Function code performs its own JWT validation:
  1. Extracts Authorization header
  2. Calls auth.getUser(token) -- validates the JWT against Supabase Auth
  3. Checks user role and ward_id from app_metadata
  4. Returns 401/403 for invalid/unauthorized tokens

  The gateway check is a DUPLICATE of what the function code does.
  Removing the duplicate does not create any security gap.
```

### C1: callEdgeFunction -- Add Session Validation Guard

```yaml
file: src/app/(tabs)/settings/users.tsx
function: callEdgeFunction(functionName, body)

problem: |
  Currently, callEdgeFunction calls supabase.functions.invoke() directly.
  If the SDK has no valid session in storage, it silently falls back to
  sending the ANON key as the Bearer token. The Edge Function rejects
  it with 401. The user sees a generic error with no indication that
  re-authentication is needed.

fix: |
  1. Before calling invoke(), call supabase.auth.getSession()
  2. If session is null, throw a descriptive error immediately
  3. This prevents the SDK from silently falling back to the ANON key
  4. The thrown error can be caught by TanStack Query and displayed as
     a re-authentication prompt

contract:
  input: "functionName: string, body: Record<string, unknown>"
  output: "Promise<any> -- resolved data on success"
  error: |
    Throws Error with:
    - "auth/no-session" message if no valid session is available
    - Server-side error message extracted from error.context.json() (ADR-022)
    - Generic error message as fallback

implementation_after_fix: |
  async function callEdgeFunction(
    functionName: string,
    body: Record<string, unknown>
  ) {
    // Guard: verify session before calling invoke
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('auth/no-session');
    }

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

notes: |
  - The getSession() call here is NOT redundant with the SDK's internal
    _getAccessToken -> getSession(). The purpose is different:
    1. This call VALIDATES that a session exists and throws if not
    2. The SDK's call SILENTLY falls back to ANON key if not
  - getSession() also triggers token refresh if the access token is expired
    (via __loadSession -> _callRefreshToken), so by the time invoke()
    runs, the SDK's internal getSession() will find a fresh token
  - This adds ~1 extra getSession() call per Edge Function invocation,
    which reads from local storage (no network round-trip unless refresh
    is needed). Performance impact is negligible.
```

### C2: useQuery Guard -- Wait for Auth Session

```yaml
file: src/app/(tabs)/settings/users.tsx
hook: useQuery({ queryKey, queryFn, enabled })

problem: |
  The useQuery hook for fetching users fires immediately on component
  mount, regardless of whether the auth session is available. While
  the NavigationGuard prevents unauthenticated users from reaching the
  tabs, there is no query-level guard that ensures the session is ready
  before invoking the Edge Function.

fix: |
  Add `enabled: !!session` to the useQuery options, where `session` comes
  from useAuth(). This ensures the query only fires when AuthContext has
  a valid session.

  Note: The `session` here is from React state (AuthContext), not from
  the SDK's storage. AuthContext sets session from getSession() during
  mount. If AuthContext has a session, the SDK's storage should also
  have it (they read from the same source).

implementation: |
  // In component: get session from auth context
  const { user: currentUser, session } = useAuth();

  // In useQuery: add enabled guard
  const { data: users = [], isLoading, error: usersError, refetch } = useQuery({
    queryKey: userManagementKeys.users,
    queryFn: async (): Promise<WardUser[]> => {
      const result = await callEdgeFunction('list-users', {});
      return result.users ?? [];
    },
    enabled: !!session,  // Only fetch when session is available
  });
```

### C3: Error Handling for No-Session State

```yaml
file: src/app/(tabs)/settings/users.tsx

problem: |
  When callEdgeFunction throws 'auth/no-session', the current error
  display shows a generic "users.loadError" message with a retry button.
  This is misleading -- the user needs to re-authenticate, not retry.

fix: |
  Recommended approach (simpler, less invasive):
  - Keep the existing error display with retry button
  - The 'auth/no-session' error message will show as the generic load error
  - If the user retries and session is still unavailable, they can close
    and reopen the app (which triggers auth re-initialization)
  - For a future enhancement, add a specific "session expired" message
    and auto-redirect to login

  For this fix, we use the simpler approach to minimize changes.
```

## Data Model Changes

```yaml
migrations: none
database_changes: none
edge_function_changes: none
```

## Flows

### F0: Fix Applied -- Gateway Config Change (Step 1)

```
1. Admin opens Supabase Dashboard > Edge Functions > Settings
2. Finds "Verify JWT with legacy secret" toggle -- currently ON
3. Toggles to OFF
4. Gateway immediately stops verifying JWT signatures at relay level
5. User JWTs now pass through the gateway to the Edge Function code
6. Edge Function code validates the JWT via auth.getUser(token)
7. Valid user JWT -> auth.getUser succeeds -> function returns data
8. ALL authenticated Edge Functions start working immediately
```

### F1: Successful Users Screen Load (after both fixes)

```
1. Secretary navigates to Settings > Users
2. users.tsx renders, useAuth() provides { session, user }
3. useQuery checks enabled: !!session -> session exists -> query is enabled
4. queryFn calls callEdgeFunction('list-users', {})
5. callEdgeFunction calls supabase.auth.getSession()
6.   -> SDK reads from storage, finds valid session
7.   -> Returns { data: { session: { access_token: 'valid-jwt', ... } } }
8. Session is valid -> proceed with invoke()
9. supabase.functions.invoke('list-users', { body: {} })
10.  -> SDK's fetchWithAuth calls _getAccessToken() -> getSession()
11.  -> Finds same valid session (or refreshed token), sets Authorization header
12.  -> Gateway: verify_jwt OFF -> passes through
13. list-users EF receives valid JWT
14. EF validates via auth.getUser(token) -- SUCCESS
15. EF returns 200 { users: [...] }
16. callEdgeFunction returns data
17. users.tsx renders user cards
```

### F2: No Session Available (guard prevents ANON key)

```
1. Secretary navigates to Users (but session was lost from storage)
2. users.tsx renders, useAuth() provides { session: null }
3. useQuery checks enabled: !!session -> session is null -> query DISABLED
4. No Edge Function call is made
5. isLoading remains false, no error, empty users list
6. Screen shows "No users" state (benign)
7. Meanwhile, AuthContext detects session is null
8. NavigationGuard in _layout.tsx detects !isAuthenticated
9. NavigationGuard redirects to /(auth)/login
10. User re-authenticates, session is restored
11. NavigationGuard redirects back to /(tabs)
12. User navigates to Users again, session is now valid, query fires successfully
```

### F3: Session Exists in AuthContext but Storage Fails (defense-in-depth)

```
1. AuthContext loaded session successfully on mount (session in React state)
2. User navigates to Users, useQuery fires (enabled: !!session is true)
3. callEdgeFunction calls supabase.auth.getSession()
4.   -> SDK reads from storage, but resilientStorage.getItem() fails
5.   -> Returns null, no session found
6.   -> getSession returns { data: { session: null } }
7. callEdgeFunction guard: session is null -> throw Error('auth/no-session')
8. TanStack Query catches error, sets usersError
9. users.tsx shows error state with retry button
10. User retries -> storage may have recovered, session found -> success
    OR storage still failing -> error again -> user closes/reopens app
```

### F4: Refresh Token Expired (7+ days inactive)

```
1. User opens app after 7+ days of inactivity
2. AuthContext calls getSession()
3.   -> SDK reads session from storage, finds expired access_token
4.   -> SDK calls _callRefreshToken() with refresh_token
5.   -> Supabase server rejects: refresh token expired
6.   -> SDK removes session from storage, returns { session: null }
7. AuthContext sets session = null, loading = false
8. NavigationGuard detects !isAuthenticated, redirects to login
9. User never reaches Users screen -> no 401 error
```

## Security

```yaml
no_regressions: true
improvement: |
  1. Disabling gateway-level JWT verification does NOT reduce security:
     - All Edge Functions implement their own JWT validation via auth.getUser()
     - The gateway check was REDUNDANT and actually HARMFUL (rejecting valid tokens)
     - Supabase's own recommendation is to set this to OFF

  2. The session validation guard in callEdgeFunction IMPROVES security by:
     - Preventing the ANON key from being sent as a user JWT
     - Making authentication failures explicit rather than silent
     - Ensuring the user is properly authenticated before making
       privileged API calls (list users, invite, change roles, delete)

notes:
  - "The ANON key fallback in the SDK is designed for public endpoints, not for authenticated Edge Functions"
  - "The guard does not change how auth works -- it just validates before calling"
  - "All Edge Function server-side auth validation remains unchanged"
  - "The gateway JWT check was duplicating what the function code already does"
```

## File Impact Summary

| Target | Change Type | Description |
|--------|-------------|-------------|
| Supabase Dashboard | CONFIG | Disable "Verify JWT with legacy secret" (Edge Functions settings) |
| `src/app/(tabs)/settings/users.tsx` | MODIFY | Add session pre-check in callEdgeFunction; add `enabled: !!session` to useQuery; destructure `session` from useAuth() |

**No other files are impacted.** AuthContext already exposes `session`. Edge Functions are correct. No migrations needed.

## ADRs

```yaml
adrs:
  - id: ADR-023
    title: "Disable gateway-level 'Verify JWT with legacy secret' for Edge Functions"
    context: |
      The Supabase Dashboard has "Verify JWT with legacy secret" set to ON.
      This causes the gateway/relay to verify JWT signatures using the legacy
      JWT secret BEFORE the Edge Function code executes. If the project's JWT
      signing was updated (as happens during Supabase upgrades or key rotation),
      user JWTs signed with the current secret are rejected by the gateway
      because they don't match the legacy secret. This produces 401 errors
      even though the Edge Function code would have accepted the valid JWT.
    decision: |
      Turn OFF "Verify JWT with legacy secret" in the Supabase Dashboard.
      All Edge Functions in this project already implement proper JWT validation
      via auth.getUser(token) + role/ward_id checks inside the function code.
      The gateway-level check is redundant and harmful. Supabase's own
      recommendation (shown in the setting description) is: OFF.
    consequences:
      - "Immediately fixes all 401 errors on authenticated Edge Functions"
      - "No code changes required for this part of the fix"
      - "Gateway no longer rejects valid user JWTs"
      - "The ANON key is no longer 'validated' at the gateway level either, but this is fine because the function code validates tokens itself"
      - "Consistent with Supabase best practices for Edge Functions"

  - id: ADR-024
    title: "Validate session before Edge Function invoke to prevent ANON key fallback"
    context: "Supabase SDK silently falls back to sending the ANON key as Bearer token when getSession() returns null. Edge Functions reject the ANON key with 401 because it is not a user JWT."
    decision: "Add explicit getSession() check in callEdgeFunction before invoke(). If session is null, throw immediately instead of letting SDK send ANON key. Add enabled: !!session guard on useQuery."
    consequences:
      - "Prevents silent 401 errors caused by ANON key fallback"
      - "Makes auth failures explicit and debuggable"
      - "One extra getSession() call per EF invocation (reads from local storage, negligible cost)"

  - id: ADR-025
    title: "Guard useQuery with enabled: !!session for authenticated queries"
    context: "TanStack Query's useQuery fires on component mount regardless of auth state. If the session is not yet available or has been lost, the query fires and fails with 401."
    decision: "Add enabled: !!session from useAuth() to all useQuery hooks that call authenticated Edge Functions. This prevents the query from firing until the auth session is confirmed."
    consequences:
      - "Queries only fire when auth session is available"
      - "If session is lost, NavigationGuard handles redirect to login"
      - "Consistent pattern that can be applied to other authenticated queries"
```

## Risk Assessment

```yaml
risks:
  - id: R-0
    severity: VERY_LOW
    description: "Disabling gateway JWT verification removes a security layer"
    mitigation: |
      The gateway JWT check is DUPLICATED by the function code's own
      auth.getUser() call. Removing the gateway check removes REDUNDANCY,
      not security. The function code's validation is actually MORE thorough
      (it checks role, ward_id, etc.) than the gateway's simple signature check.
      Supabase itself recommends turning this setting OFF.

  - id: R-1
    severity: VERY_LOW
    description: "getSession() call in callEdgeFunction adds overhead"
    mitigation: |
      getSession() reads from local storage (AsyncStorage). It does NOT make
      a network request unless the token needs refresh. The overhead is a
      single async storage read, which is negligible compared to the network
      round-trip of the Edge Function call itself.

  - id: R-2
    severity: LOW
    description: "enabled: !!session may cause the query to not fire if session object shape changes"
    mitigation: |
      AuthContext.session comes directly from Supabase SDK's getSession() result.
      The session object is defined by @supabase/auth-js and is well-documented.
      !!session correctly evaluates to true when a session exists and false when null.

  - id: R-3
    severity: LOW
    description: "If resilientStorage consistently fails, user gets stuck in a loop of errors"
    mitigation: |
      If storage consistently fails, getSession() returns null, AuthContext
      sets session = null, and NavigationGuard redirects to login. The user
      re-authenticates, which creates a fresh session via signInWithPassword.
      If storage continues to fail, the session is not persisted, but the
      in-memory session (via onAuthStateChange) should still work for the
      current app session. This is an existing limitation of resilientStorage
      and is outside the scope of this fix.
```

## Appendix: Hypothesis Analysis Summary

```yaml
hypotheses:
  - id: H-5
    title: "Gateway 'Verify JWT with legacy secret' rejects valid user JWTs"
    status: PRIMARY_ROOT_CAUSE (highly likely)
    evidence:
      - "User confirmed setting is ON in Dashboard"
      - "ALL authenticated EFs fail, ALL non-authenticated EFs work"
      - "Dashboard description confirms anon key satisfies the check (signed with legacy secret)"
      - "User JWTs would be signed with current secret, not legacy"
    fix: "Dashboard config change -- no code needed"

  - id: RCA-401-1
    title: "SDK silently falls back to ANON key when session is null"
    status: SECONDARY_DEFENSE_GAP (confirmed but may not be the active blocker)
    evidence:
      - "Verified in SDK source code"
      - "Would cause 401 when session is lost, but H-5 causes 401 even WITH valid session"
    fix: "Code change -- session guard in callEdgeFunction + enabled guard on useQuery"

  - id: H-1a
    title: "resilientStorage silently failing"
    status: POSSIBLE_CONTRIBUTOR (would trigger RCA-401-1)
    likelihood: MEDIUM

  - id: H-1b
    title: "Race condition -- useQuery fires before session loads"
    status: POSSIBLE_CONTRIBUTOR (would trigger RCA-401-1)
    likelihood: LOW (SDK awaits initializePromise)

  - id: H-1c
    title: "Session never persisted after login/registration"
    status: POSSIBLE_CONTRIBUTOR (would trigger RCA-401-1)
    likelihood: MEDIUM

  - id: H-2
    title: "Refresh token expired (7+ days inactive)"
    status: UNLIKELY (user reports 2-6 days, within 7-day window)
    likelihood: LOW

  - id: H-3
    title: "Environment variables not configured"
    status: RULED_OUT (app can log in, so env vars are set)
    likelihood: VERY_LOW

  - id: H-4
    title: "Platform-specific storage issue"
    status: POSSIBLE (iOS device/simulator, but unlikely)
    likelihood: LOW
```
