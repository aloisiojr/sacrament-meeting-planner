# PLAN_BUG401 - Fix Systemic HTTP 401 on All Authenticated Edge Functions

## PLAN_SUMMARY

```yaml
type: plan_summary
version: 1
total_steps: 6
parallel_tracks: 1
estimated_commits: 5
coverage:
  acceptance_criteria: 7/7  # AC-1 through AC-7
  edge_cases: 5/5  # EC-1 through EC-5
critical_path:
  - "STEP-00: Disable 'Verify JWT with legacy secret' in Supabase dashboard (MANUAL)"
  - "STEP-01: Add session validation guard in callEdgeFunction (defense-in-depth)"
  - "STEP-02: Add enabled: !!session guard on useQuery for users list"
  - "STEP-05: Add QA tests for BUG-401 fix"
main_risks:
  - "VERY_LOW: Extra getSession() call per EF invocation adds negligible overhead (local storage read)"
  - "LOW: If resilientStorage consistently fails, user enters error loop until re-auth via NavigationGuard"
  - "MEDIUM: If 'Verify JWT with legacy secret' remains ON, gateway may still reject valid JWTs signed with the current secret"
```

## PLAN

```yaml
type: plan
version: 1

goal: >
  Fix systemic HTTP 401 on all authenticated Edge Functions by adding
  defense-in-depth session validation before invoke() and preventing
  useQuery from firing before auth session is available. This prevents
  the Supabase SDK from silently falling back to sending the ANON key
  as a Bearer token when getSession() returns null.

strategy:
  order: "Happy path (session guard + query guard) -> Edge cases (no-session error handling) -> Hardening (auth/no-session detection) -> Tests"
  commit_strategy: "1 commit per step, conventional commit messages"
  test_strategy: "Source-level verification tests (same pattern as cr076-users-error-extraction.test.ts)"

context:
  confirmed_root_cause: |
    RCA-401-1: The Supabase JS SDK's _getAccessToken() method falls back to
    this.supabaseKey (the ANON key) when getSession() returns { session: null }.
    The ANON key is NOT a valid user JWT. Edge Functions call auth.getUser(ANON_KEY)
    which fails with HTTP 401 because the ANON key cannot be validated as a user token.

    This happens when:
    - resilientStorage.getItem() silently returns null on error (T-1)
    - Refresh token has expired after 7+ days of inactivity (T-2)
    - Session was never properly persisted after registration (T-3)
    - useQuery fires before SDK initialization completes (T-4, unlikely)

  architecture_decision: |
    Defense-in-depth: do NOT rely solely on the SDK's silent ANON key fallback.
    Instead:
    1. Validate session in callEdgeFunction BEFORE calling invoke() (ADR-024)
    2. Guard useQuery with enabled: !!session from useAuth() (ADR-025)
    3. If no session, throw 'auth/no-session' error (clear, debuggable)

  server_side_status: |
    All Edge Function server-side code is CORRECT -- no changes needed.
    The 401 occurs because the TOKEN received is invalid (ANON key),
    not because of a server-side logic error.

  files_unchanged:
    - "src/contexts/AuthContext.tsx -- already exposes session via useAuth()"
    - "src/lib/supabase.ts -- resilientStorage behavior is correct for its scope"
    - "supabase/functions/* -- all Edge Functions verified correct"

steps:
  - id: STEP-00
    description: >
      MANUAL STEP: Disable "Verify JWT with legacy secret" in the Supabase dashboard.
      Navigate to Edge Functions > Settings and turn OFF "Verify JWT with legacy secret".
      This setting makes the Supabase GATEWAY validate the JWT BEFORE the edge function
      executes. If user JWTs are signed with the current secret (not the legacy one),
      the gateway rejects them with 401 even though the session is valid.
      The edge functions already implement their own JWT validation via auth.getUser(),
      so the gateway-level validation is redundant and potentially conflicting.
    files: []
    dependencies: []
    parallelizable_with: []
    done_when:
      - "In Supabase dashboard: Edge Functions > Settings > 'Verify JWT with legacy secret' is OFF"
      - "User has confirmed the setting change was applied"
    implementation:
      manual_steps: |
        1. Go to the Supabase dashboard for the project
        2. Navigate to: Edge Functions > Settings
        3. Find: "Verify JWT with legacy secret"
        4. Set it to: OFF
        5. Confirm the change is saved

        WHY: The edge functions already validate JWTs in code via:
          const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        The gateway-level check is redundant. When enabled, it validates JWTs using
        the LEGACY secret. If the project was created after a secret rotation or
        never used the legacy secret, ALL valid user JWTs are rejected at the gateway
        level, causing the systemic 401 errors.
    tests: []
    covers:
      acceptance_criteria: ["AC-1"]
      edge_cases: ["EC-3"]
    risks:
      - risk: "Disabling gateway JWT verification removes one layer of defense"
        severity: LOW
        mitigation: "Edge functions already validate JWT via auth.getUser() which is the authoritative check. The gateway check was causing false rejections, not providing real security value."

  - id: STEP-01
    description: >
      Add session validation guard in callEdgeFunction: call supabase.auth.getSession()
      before invoke(), and throw Error('auth/no-session') if session is null.
      This prevents the SDK from silently falling back to sending the ANON key.
    files:
      - "src/app/(tabs)/settings/users.tsx"
    dependencies: ["STEP-00"]
    parallelizable_with: []
    done_when:
      - "callEdgeFunction contains `const { data: { session } } = await supabase.auth.getSession();` BEFORE the invoke() call"
      - "callEdgeFunction contains `if (!session) { throw new Error('auth/no-session'); }` after the getSession() call"
      - "The invoke() call remains unchanged: `supabase.functions.invoke(functionName, { body })`"
      - "The error extraction logic (ADR-022) is PRESERVED unchanged after the invoke() call"
      - "The getSession() call is the FIRST line inside the function body"
    implementation:
      current_code: |
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

      target_code: |
        async function callEdgeFunction(
          functionName: string,
          body: Record<string, unknown>
        ) {
          // Guard: verify session before calling invoke (ADR-024)
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
        - Overhead is negligible: 1 async storage read per EF invocation
    tests:
      - type: source_check
        description: "callEdgeFunction contains supabase.auth.getSession() call"
      - type: source_check
        description: "callEdgeFunction contains 'auth/no-session' error throw"
      - type: source_check
        description: "getSession() call appears BEFORE invoke() call in callEdgeFunction"
    covers:
      acceptance_criteria: ["AC-1", "AC-3"]
      edge_cases: ["EC-1", "EC-3"]
    risks:
      - risk: "Extra getSession() call adds overhead"
        severity: VERY_LOW
        mitigation: "getSession() reads from local storage (AsyncStorage), no network request unless token needs refresh. Cost is negligible vs. the EF network round-trip."

  - id: STEP-02
    description: >
      Add enabled: !!session guard on the useQuery hook for the users list.
      Destructure session from useAuth() and pass it as the enabled condition.
      This prevents the query from firing when no auth session is available
      (during auth loading or after session loss).
    files:
      - "src/app/(tabs)/settings/users.tsx"
    dependencies: ["STEP-01"]
    parallelizable_with: []
    done_when:
      - "useAuth() destructure includes `session`: `const { user: currentUser, session } = useAuth();`"
      - "useQuery options include `enabled: !!session`"
      - "No other changes to the useQuery hook (queryKey, queryFn remain unchanged)"
    implementation:
      current_code_useAuth: |
        const { user: currentUser } = useAuth();

      target_code_useAuth: |
        const { user: currentUser, session } = useAuth();

      current_code_useQuery: |
        const {
          data: users = [],
          isLoading,
          error: usersError,
          refetch,
        } = useQuery({
          queryKey: userManagementKeys.users,
          queryFn: async (): Promise<WardUser[]> => {
            const result = await callEdgeFunction('list-users', {});
            return result.users ?? [];
          },
        });

      target_code_useQuery: |
        const {
          data: users = [],
          isLoading,
          error: usersError,
          refetch,
        } = useQuery({
          queryKey: userManagementKeys.users,
          queryFn: async (): Promise<WardUser[]> => {
            const result = await callEdgeFunction('list-users', {});
            return result.users ?? [];
          },
          enabled: !!session,
        });

      notes: |
        - AuthContext already exposes `session` via useAuth() -- no changes needed there
        - When session is null, the query is disabled (never fires)
        - When session becomes available (after auth loads), the query auto-fires
        - If session is lost, NavigationGuard in _layout.tsx detects !isAuthenticated
          and redirects to login, so the user never stays on a screen with no session
    tests:
      - type: source_check
        description: "useAuth() destructure includes session"
      - type: source_check
        description: "useQuery includes enabled: !!session option"
    covers:
      acceptance_criteria: ["AC-2", "AC-7"]
      edge_cases: ["EC-5"]
    risks:
      - risk: "enabled: !!session may cause query to not fire if session object shape changes"
        severity: LOW
        mitigation: "AuthContext.session comes directly from Supabase SDK's getSession() result. The Session type is well-defined by @supabase/auth-js. !!session correctly evaluates to true when session exists."

  - id: STEP-03
    description: >
      Ensure the 'auth/no-session' error from callEdgeFunction integrates
      with the existing UI error handling. The current error display already
      shows t('users.loadError') with a retry button when usersError is set.
      This is sufficient for now -- the user can retry (which may succeed if
      session was recovered), or NavigationGuard will redirect to login if
      session is definitively lost. No UI changes needed in this step, but
      verify the integration is correct.
    files:
      - "src/app/(tabs)/settings/users.tsx"
    dependencies: ["STEP-01", "STEP-02"]
    parallelizable_with: []
    done_when:
      - "The existing error display (`{usersError && ...}`) correctly handles the 'auth/no-session' error"
      - "The retry button (`onPress={() => refetch()}`) can recover if session becomes available"
      - "No NEW UI changes needed -- existing error handling is sufficient"
      - "This step is a VERIFICATION step, not a code change step"
    implementation:
      verification: |
        The existing code at lines 238-252 handles errors:

        {usersError && (
          <View style={styles.centered}>
            <Text style={[styles.errorText, { color: colors.error }]}>
              {t('users.loadError')}
            </Text>
            <Pressable
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={() => refetch()}
              ...
            >
              <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
            </Pressable>
          </View>
        )}

        This works because:
        1. When callEdgeFunction throws Error('auth/no-session'), TanStack Query
           catches it and sets usersError
        2. The error display shows t('users.loadError') (generic, appropriate)
        3. The retry button calls refetch() which re-triggers the queryFn
        4. On retry, callEdgeFunction's getSession() guard runs again:
           - If session recovered (storage became available) -> success
           - If session still null -> throws 'auth/no-session' again
        5. Meanwhile, AuthContext detects null session -> NavigationGuard redirects to login

        For AC-6 (redirect to login on expired session), this is already handled
        by the existing NavigationGuard pattern -- no changes needed.
    tests:
      - type: source_check
        description: "Error display section shows t('users.loadError') when usersError is set"
      - type: source_check
        description: "Retry button calls refetch() to re-attempt the query"
    covers:
      acceptance_criteria: ["AC-6"]
      edge_cases: ["EC-2", "EC-4"]
    risks:
      - risk: "User may be confused by generic 'load error' when the real issue is authentication"
        severity: LOW
        mitigation: "NavigationGuard will redirect to login if session is definitively lost. The retry button allows recovery if session was temporarily unavailable. A future enhancement could show a specific 'session expired' message."

  - id: STEP-04
    description: >
      Verify that all 4 authenticated Edge Function calls (list-users,
      create-invitation, update-user-role, delete-user) benefit from the
      session validation guard in callEdgeFunction. Since all 4 calls go
      through callEdgeFunction, the fix in STEP-01 applies to all of them.
      This is a verification step -- confirm no direct invoke() calls exist
      outside callEdgeFunction.
    files:
      - "src/app/(tabs)/settings/users.tsx"
    dependencies: ["STEP-01"]
    parallelizable_with: ["STEP-02", "STEP-03"]
    done_when:
      - "All Edge Function calls in users.tsx go through callEdgeFunction"
      - "No direct supabase.functions.invoke() calls exist outside callEdgeFunction"
      - "list-users, create-invitation, update-user-role, delete-user all use callEdgeFunction"
    implementation:
      verification: |
        The current code already routes all EF calls through callEdgeFunction:
        - useQuery queryFn: callEdgeFunction('list-users', {})
        - inviteMutation: callEdgeFunction('create-invitation', { email, role })
        - changeRoleMutation: callEdgeFunction('update-user-role', { targetUserId, newRole })
        - deleteUserMutation: callEdgeFunction('delete-user', { targetUserId })

        No changes needed. This step verifies the architecture is correct.
    tests:
      - type: source_check
        description: "users.tsx calls callEdgeFunction('list-users', ...)"
      - type: source_check
        description: "users.tsx calls callEdgeFunction('create-invitation', ...)"
      - type: source_check
        description: "users.tsx calls callEdgeFunction('update-user-role', ...)"
      - type: source_check
        description: "users.tsx calls callEdgeFunction('delete-user', ...)"
      - type: source_check
        description: "No direct supabase.functions.invoke() calls outside callEdgeFunction"
    covers:
      acceptance_criteria: ["AC-4"]
      edge_cases: []
    risks: []

  - id: STEP-05
    description: >
      Add QA tests for BUG-401 fix. Create source-level verification tests
      following the same pattern as cr076-users-error-extraction.test.ts.
      Tests verify: (1) session validation guard exists in callEdgeFunction,
      (2) useQuery has enabled: !!session guard, (3) session is destructured
      from useAuth(), (4) auth/no-session error is thrown when session is null,
      (5) all 4 EF calls go through callEdgeFunction, (6) existing error
      handling is preserved, (7) no regressions in error extraction (ADR-022).
    files:
      - "src/__tests__/bug401-auth-session-guard.test.ts"
    dependencies: ["STEP-01", "STEP-02"]
    parallelizable_with: []
    done_when:
      - "Test file exists at src/__tests__/bug401-auth-session-guard.test.ts"
      - "Tests verify callEdgeFunction contains supabase.auth.getSession() call"
      - "Tests verify callEdgeFunction contains 'auth/no-session' error throw"
      - "Tests verify getSession() appears BEFORE invoke() in callEdgeFunction"
      - "Tests verify session is destructured from useAuth()"
      - "Tests verify useQuery includes enabled: !!session"
      - "Tests verify all 4 EF calls go through callEdgeFunction"
      - "Tests verify existing error extraction (ADR-022) is preserved"
      - "Tests verify existing UI error handling (retry button) is preserved"
      - "All tests pass with `npx vitest run src/__tests__/bug401-auth-session-guard.test.ts`"
    implementation:
      test_structure: |
        describe('BUG-401: Fix Systemic HTTP 401 on Authenticated Edge Functions')
          describe('Session validation guard in callEdgeFunction (ADR-024)')
            - callEdgeFunction calls supabase.auth.getSession() before invoke
            - callEdgeFunction throws Error('auth/no-session') when session is null
            - getSession() call appears BEFORE invoke() in callEdgeFunction body
            - session guard does NOT affect error extraction logic (ADR-022)
          describe('useQuery enabled guard (ADR-025)')
            - useAuth() destructure includes session
            - useQuery includes enabled: !!session option
          describe('All authenticated EFs use callEdgeFunction wrapper')
            - callEdgeFunction('list-users', ...) is called in queryFn
            - callEdgeFunction('create-invitation', ...) is called in inviteMutation
            - callEdgeFunction('update-user-role', ...) is called in changeRoleMutation
            - callEdgeFunction('delete-user', ...) is called in deleteUserMutation
            - No direct supabase.functions.invoke() outside callEdgeFunction
          describe('Existing error handling preserved')
            - error extraction (ADR-022) still present: error.context.json()
            - UI error display: t('users.loadError') on usersError
            - Retry button: onPress={() => refetch()}
    tests:
      - type: unit
        description: "All source-level verification tests pass for BUG-401 fix"
    covers:
      acceptance_criteria: ["AC-1", "AC-2", "AC-3", "AC-4", "AC-5", "AC-6", "AC-7"]
      edge_cases: ["EC-1", "EC-2", "EC-3", "EC-4", "EC-5"]
    risks:
      - risk: "Source-level tests may be fragile if code formatting changes"
        severity: VERY_LOW
        mitigation: "Tests use .toContain() for key patterns, not exact string matches. This is resilient to whitespace and formatting changes."

validation:
  - ac_id: AC-1
    how_to_verify: >
      callEdgeFunction calls supabase.auth.getSession() before invoke().
      If session exists, the SDK's own getSession() (called by fetchWithAuth)
      will find the same valid session and attach the JWT. The Edge Function
      receives a valid JWT, not the ANON key.
    covered_by_steps: ["STEP-01", "STEP-05"]

  - ac_id: AC-2
    how_to_verify: >
      useQuery has enabled: !!session guard. The query only fires when
      AuthContext has confirmed a valid session exists (loaded from
      AsyncStorage via getSession() during mount). Session persists
      across app restarts via resilientStorage -> AsyncStorage.
    covered_by_steps: ["STEP-02", "STEP-05"]

  - ac_id: AC-3
    how_to_verify: >
      callEdgeFunction throws Error('auth/no-session') immediately when
      getSession() returns null. The SDK's invoke() is never called, so
      the ANON key is never sent. This replaces the silent fallback with
      an explicit, debuggable error.
    covered_by_steps: ["STEP-01", "STEP-05"]

  - ac_id: AC-4
    how_to_verify: >
      All 4 authenticated Edge Functions (list-users, create-invitation,
      update-user-role, delete-user) go through callEdgeFunction. The
      session guard in STEP-01 applies to all of them. Verified in
      STEP-04 and tested in STEP-05.
    covered_by_steps: ["STEP-01", "STEP-04", "STEP-05"]

  - ac_id: AC-5
    how_to_verify: >
      Session persistence is handled by the existing resilientStorage ->
      AsyncStorage mechanism. The session guard in callEdgeFunction
      validates that the session was successfully recovered from storage
      before calling invoke(). getSession() also triggers token refresh
      if the access token is expired but the refresh token is still valid.
    covered_by_steps: ["STEP-01", "STEP-02"]

  - ac_id: AC-6
    how_to_verify: >
      When session is null:
      (a) useQuery is disabled (enabled: !!session), so no EF call is made
      (b) AuthContext detects null session, NavigationGuard redirects to login
      (c) If somehow the EF call runs, callEdgeFunction throws 'auth/no-session'
          and the UI shows t('users.loadError') with a retry button
    covered_by_steps: ["STEP-02", "STEP-03"]

  - ac_id: AC-7
    how_to_verify: >
      useQuery fires only after enabled: !!session is true, which requires
      AuthContext to have set session from getSession() (which awaits
      initializePromise in the SDK). This prevents the race condition
      where a query fires before the session is loaded from storage.
    covered_by_steps: ["STEP-02", "STEP-05"]
```
