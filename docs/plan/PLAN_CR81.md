# PLAN_CR81 - User Name Field

## PLAN_SUMMARY

```yaml
type: plan_summary
total_steps: 13
parallel_tracks: 3
estimated_commits: 13
coverage:
  acceptance_criteria: 20/20
  edge_cases: 7/7
critical_path:
  - "STEP-01: Database migration (user_name column + list_ward_users RPC update)"
  - "STEP-03: register-first-user EF (fullName + auto-actor for bishopric)"
  - "STEP-06: AuthContext (expose userName from app_metadata)"
  - "STEP-08: Users screen (name display + self-edit)"
  - "STEP-10: Activity log hooks (pass userName to logAction)"
main_risks:
  - "Migration must be deployed before Edge Functions that depend on the new RPC return shape"
  - "All logAction callers (5 hooks) must be updated to pass userName -- partial rollout would leave gaps"
  - "refreshSession() after self-name-edit may fail silently if Supabase token is near expiry"
```

## PLAN

```yaml
type: plan
version: 1

goal: >
  Add a mandatory Name field to user accounts, collected during registration
  (self and invite flows), displayed in Users screen and Activity Log, and
  used for auto-actor creation. Users can edit their own name inline.

strategy:
  order: "Database/i18n foundation -> Edge Functions -> AuthContext -> UI screens -> Activity log pipeline -> Hardening -> QA tests"
  commit_strategy: "1 commit per step, conventional commit messages (feat:, fix:, test:)"
  test_strategy: "QA tests in final step covering all ACs and ECs; each step has done_when criteria for incremental verification"

steps:
  # =========================================================================
  # PHASE 1: Foundation (database + types + i18n)
  # =========================================================================

  - id: STEP-01
    description: |
      Create database migration 011_add_user_name_support.sql:
      1. ALTER TABLE activity_log ADD COLUMN user_name TEXT (nullable, default NULL)
      2. CREATE OR REPLACE FUNCTION list_ward_users to add full_name column
         extracted from raw_app_meta_data->>'full_name' (COALESCE to empty string)
    files:
      - "supabase/migrations/011_add_user_name_support.sql"
    dependencies: []
    parallelizable_with: ["STEP-02"]
    done_when:
      - "Migration file exists at supabase/migrations/011_add_user_name_support.sql"
      - "activity_log table has user_name TEXT column (nullable)"
      - "list_ward_users RPC returns 5 columns: id, email, role, full_name, created_at"
      - "full_name uses COALESCE(raw_app_meta_data->>'full_name', '') for backward compat"
    tests:
      - type: integration
        description: "Migration applies without error; RPC returns full_name for existing users (empty string)"
    covers:
      acceptance_criteria: ["AC-8", "AC-15"]
      edge_cases: ["EC-1", "EC-6"]
    risks:
      - risk: "Migration must run before EFs that depend on new RPC shape"
        mitigation: "Migration is STEP-01 (first step); EFs deploy after"

  - id: STEP-02
    description: |
      Add i18n keys and update TypeScript types:
      1. Add to pt-BR.json: auth.fullName, auth.fullNamePlaceholder, auth.nameRequired,
         users.name, users.nameUpdated, users.nameUpdateFailed
      2. Add same keys to en.json and es.json with proper translations
      3. Update ActivityLog interface in database.ts: add user_name: string | null
    files:
      - "src/i18n/locales/pt-BR.json"
      - "src/i18n/locales/en.json"
      - "src/i18n/locales/es.json"
      - "src/types/database.ts"
    dependencies: []
    parallelizable_with: ["STEP-01"]
    done_when:
      - "pt-BR.json contains auth.fullName='Nome', auth.fullNamePlaceholder='Seu nome completo', auth.nameRequired='Nome é obrigatório'"
      - "pt-BR.json contains users.name='Nome', users.nameUpdated='Nome atualizado com sucesso', users.nameUpdateFailed='Falha ao atualizar nome'"
      - "en.json contains equivalent keys in English"
      - "es.json contains equivalent keys in Spanish"
      - "ActivityLog interface has user_name: string | null field"
    tests:
      - type: unit
        description: "TypeScript compiles without errors after interface change"
    covers:
      acceptance_criteria: ["AC-19"]
      edge_cases: []
    risks: []

  # =========================================================================
  # PHASE 2: Edge Functions (backend)
  # =========================================================================

  - id: STEP-03
    description: |
      Update register-first-user Edge Function:
      1. Add fullName to RegisterInput interface (required string)
      2. Validate fullName is present and non-empty (trimmed)
      3. Store full_name in app_metadata alongside ward_id and role
      4. Add auto-actor creation for bishopric role:
         - Use fullName as actor name
         - Check for existing actor with ilike match
         - Create with can_preside=true, can_conduct=true if not exists
         - Update flags if exists but lacks preside/conduct
         - Best-effort: catch errors, do not fail registration
    files:
      - "supabase/functions/register-first-user/index.ts"
    dependencies: ["STEP-01"]
    parallelizable_with: ["STEP-04"]
    done_when:
      - "RegisterInput interface has fullName: string field"
      - "Server-side validation rejects empty/whitespace fullName with 400"
      - "app_metadata includes full_name key when creating user"
      - "Bishopric role triggers auto-actor creation with fullName"
      - "Auto-actor is best-effort (errors caught, registration succeeds)"
      - "Secretary role does NOT trigger auto-actor creation"
    tests:
      - type: integration
        description: "Register with role=bishopric creates user + actor with real name"
    covers:
      acceptance_criteria: ["AC-3", "AC-7"]
      edge_cases: ["EC-2"]
    risks:
      - risk: "Actor name collision if same name already exists"
        mitigation: "ilike check updates existing actor's flags instead of creating duplicate"

  - id: STEP-04
    description: |
      Update register-invited-user Edge Function:
      1. Add fullName to RegisterInvitedInput interface (required string)
      2. Validate fullName is present and non-empty in handleRegister
      3. Store full_name in app_metadata when creating user
      4. No auto-actor creation (per SPEC_CR81 AC-18)
    files:
      - "supabase/functions/register-invited-user/index.ts"
    dependencies: ["STEP-01"]
    parallelizable_with: ["STEP-03"]
    done_when:
      - "RegisterInvitedInput interface has fullName: string field"
      - "handleRegister validates fullName (400 if empty/whitespace)"
      - "app_metadata includes full_name when creating invited user"
      - "Token validation (no password) path is unchanged"
    tests:
      - type: integration
        description: "Register invited user stores full_name in app_metadata"
    covers:
      acceptance_criteria: ["AC-6"]
      edge_cases: ["EC-2"]
    risks: []

  - id: STEP-05
    description: |
      Create new update-user-name Edge Function + update existing EFs:
      1. Create supabase/functions/update-user-name/index.ts:
         - CORS headers
         - Verify JWT from Authorization header
         - Get caller user from JWT token
         - Validate fullName (non-empty after trim, return 400 if invalid)
         - Update caller's own app_metadata.full_name via admin.updateUserById
         - Spread existing app_metadata to preserve ward_id and role
         - Return { success: true }
      2. Update update-user-role/index.ts:
         - Replace email-derived actorName with full_name from app_metadata
         - Fall back to email-prefix derivation if full_name is absent
      3. Update list-users/index.ts:
         - Add full_name to WardUser interface
    files:
      - "supabase/functions/update-user-name/index.ts"
      - "supabase/functions/update-user-role/index.ts"
      - "supabase/functions/list-users/index.ts"
    dependencies: ["STEP-01"]
    parallelizable_with: ["STEP-03", "STEP-04"]
    done_when:
      - "update-user-name/index.ts exists with CORS, JWT verification, fullName validation"
      - "update-user-name only updates the caller's own metadata (no targetUserId param)"
      - "update-user-name spreads existing app_metadata to preserve ward_id/role"
      - "update-user-role uses full_name from app_metadata for auto-actor when available"
      - "update-user-role falls back to email prefix when full_name is absent"
      - "list-users WardUser interface includes full_name: string"
    tests:
      - type: integration
        description: "Call update-user-name with valid JWT updates caller's name; call update-user-role with full_name user creates actor with real name"
    covers:
      acceptance_criteria: ["AC-14", "AC-17", "AC-18"]
      edge_cases: ["EC-1"]
    risks:
      - risk: "update-user-name must spread existing metadata to not lose ward_id/role"
        mitigation: "Explicitly read current app_metadata and spread before setting full_name"

  # =========================================================================
  # PHASE 3: AuthContext (bridge between backend and frontend)
  # =========================================================================

  - id: STEP-06
    description: |
      Update AuthContext to expose userName:
      1. Add userName: string to AuthContextValue interface
      2. Add extractUserName function: returns user.app_metadata?.full_name ?? ''
      3. Derive userName in AuthProvider using extractUserName(user)
      4. Add userName to provider value object and useMemo dependency array
    files:
      - "src/contexts/AuthContext.tsx"
    dependencies: []
    parallelizable_with: ["STEP-01", "STEP-02"]
    done_when:
      - "AuthContextValue has userName: string field"
      - "extractUserName function returns full_name from app_metadata or empty string"
      - "userName is in the provider value and useMemo deps"
      - "useAuth() returns userName"
    tests:
      - type: unit
        description: "useAuth() returns userName from app_metadata; returns empty string when no metadata"
    covers:
      acceptance_criteria: []
      edge_cases: ["EC-1"]
    risks: []

  # =========================================================================
  # PHASE 4: Frontend screens (UI changes)
  # =========================================================================

  - id: STEP-07
    description: |
      Add Name input to registration screens:
      1. register.tsx:
         - Add fullName state variable (useState(''))
         - Add TextInput as FIRST field (before Email) with label t('auth.fullName'),
           placeholder t('auth.fullNamePlaceholder'), autoCapitalize='words'
         - Update validate(): add fullName.trim() check as first rule,
           return t('auth.nameRequired') if empty
         - Send fullName: fullName.trim() in edge function body
      2. invite/[token].tsx:
         - Add fullName state variable (useState(''))
         - Add TextInput AFTER read-only fields (email) and BEFORE password fields
           with label t('auth.fullName'), placeholder t('auth.fullNamePlaceholder'),
           autoCapitalize='words', editable
         - Update handleRegister: add fullName.trim() check before password check,
           setError(t('auth.nameRequired')) if empty
         - Send fullName: fullName.trim() in edge function body
    files:
      - "src/app/(auth)/register.tsx"
      - "src/app/(auth)/invite/[token].tsx"
    dependencies: ["STEP-02", "STEP-03", "STEP-04"]
    parallelizable_with: []
    done_when:
      - "register.tsx has Name TextInput as first form field (before Email)"
      - "register.tsx validates fullName before submission"
      - "register.tsx sends fullName in the edge function call body"
      - "[token].tsx has Name TextInput between read-only fields and password"
      - "[token].tsx validates fullName before password check"
      - "[token].tsx sends fullName in the edge function call body"
      - "Both inputs use autoCapitalize='words'"
    tests:
      - type: unit
        description: "Render registration forms; verify Name input exists; verify validation rejects empty name"
    covers:
      acceptance_criteria: ["AC-1", "AC-2", "AC-3", "AC-4", "AC-5", "AC-6"]
      edge_cases: ["EC-2"]
    risks: []

  - id: STEP-08
    description: |
      Update Users screen for name display and self-edit:
      1. Update WardUser interface to include full_name: string
      2. Update user card header (collapsed):
         - Primary text: u.full_name || u.email (fallback for legacy)
         - Add secondary text below: u.email (only shown when full_name exists)
         - Add userName style for primary text (fontSize 16, fontWeight '500')
         - Update existing userEmail style to secondary text styling
      3. Add self-edit name feature in expanded card (when isSelf):
         - Add editingName local state, initialized to u.full_name when expanding
         - Show editable TextInput with label t('users.name'), autoCapitalize='words'
         - Show Save button (disabled when no change or empty)
         - Create updateNameMutation using callEdgeFunction('update-user-name', { fullName })
         - On success: invalidate users query, refresh session, Alert success
         - On error: Alert failure, revert editingName
         - No-change guard: skip API call if trimmed name equals current
      4. Show name as read-only text when expanded and NOT self
      5. Add new styles: userName, userEmailSecondary, nameInput, saveButton, saveButtonText
    files:
      - "src/app/(tabs)/settings/users.tsx"
    dependencies: ["STEP-05", "STEP-06"]
    parallelizable_with: []
    done_when:
      - "WardUser interface has full_name: string"
      - "User card shows full_name as primary text (email as fallback)"
      - "Email shown as secondary text when full_name exists"
      - "Legacy users (no name) show email as primary, no secondary"
      - "Self card expanded: editable name TextInput with save button"
      - "Other users' expanded card: name shown as read-only"
      - "Save calls update-user-name, invalidates query, refreshes session"
      - "No API call when name unchanged"
    tests:
      - type: unit
        description: "Render users with/without names; verify display hierarchy; verify self-edit flow"
    covers:
      acceptance_criteria: ["AC-9", "AC-10", "AC-11", "AC-12", "AC-13"]
      edge_cases: ["EC-1", "EC-3", "EC-4", "EC-5", "EC-7"]
    risks:
      - risk: "refreshSession() may fail if token near expiry"
        mitigation: "Non-blocking; next login picks up new name; query invalidation already refreshes UI"

  # =========================================================================
  # PHASE 5: Activity Log pipeline
  # =========================================================================

  - id: STEP-09
    description: |
      Update activity log utility and display:
      1. Update logAction in activityLog.ts:
         - Add userName optional parameter (6th parameter)
         - Include user_name: userName ?? null in insert payload
         - Update JSDoc
      2. Update createLogger in activityLog.ts:
         - Add userName optional parameter (4th parameter)
         - Pass it through to logAction
      3. Update useActivityLog hook search filter:
         - Add user_name.ilike.%${term}% to the .or() filter string
      4. Update history.tsx ActivityLogEntry component:
         - Change {item.user_email} to {item.user_name || item.user_email}
    files:
      - "src/lib/activityLog.ts"
      - "src/hooks/useActivityLog.ts"
      - "src/app/(tabs)/settings/history.tsx"
    dependencies: ["STEP-02"]
    parallelizable_with: ["STEP-06", "STEP-07"]
    done_when:
      - "logAction accepts optional userName as 6th parameter"
      - "logAction inserts user_name: userName ?? null"
      - "createLogger accepts optional userName as 4th parameter"
      - "createLogger passes userName to logAction"
      - "useActivityLog search includes user_name in .or() filter"
      - "history.tsx shows user_name with email fallback"
    tests:
      - type: unit
        description: "logAction inserts user_name; search matches user_name; history shows name with fallback"
    covers:
      acceptance_criteria: ["AC-15", "AC-16", "AC-20"]
      edge_cases: ["EC-6"]
    risks: []

  - id: STEP-10
    description: |
      Update all hooks calling logAction to pass userName:
      1. Each hook (useActors, useMembers, useSpeeches, useAgenda, useTopics,
         useSundayTypes) calls logAction directly (not createLogger).
      2. For each hook:
         - Import userName from useAuth() where the hook already destructures auth
         - Add userName as the 6th argument to every logAction call
         - Pattern: logAction(wardId, user.id, user.email ?? '', actionType, description, userName)
      3. Each hook already has: const { wardId, user } = useAuth() or similar.
         Update to: const { wardId, user, userName } = useAuth()
    files:
      - "src/hooks/useActors.ts"
      - "src/hooks/useMembers.ts"
      - "src/hooks/useSpeeches.ts"
      - "src/hooks/useAgenda.ts"
      - "src/hooks/useTopics.ts"
      - "src/hooks/useSundayTypes.ts"
    dependencies: ["STEP-06", "STEP-09"]
    parallelizable_with: []
    done_when:
      - "useActors destructures userName from useAuth()"
      - "All logAction calls in useActors pass userName as 6th arg"
      - "useMembers destructures userName from useAuth()"
      - "All logAction calls in useMembers pass userName as 6th arg"
      - "useSpeeches destructures userName from useAuth()"
      - "All logAction calls in useSpeeches pass userName as 6th arg"
      - "useAgenda destructures userName from useAuth()"
      - "All logAction calls in useAgenda pass userName as 6th arg"
      - "useTopics destructures userName from useAuth()"
      - "All logAction calls in useTopics pass userName as 6th arg"
      - "useSundayTypes destructures userName from useAuth()"
      - "All logAction calls in useSundayTypes pass userName as 6th arg"
    tests:
      - type: unit
        description: "Verify each hook passes userName to logAction"
    covers:
      acceptance_criteria: ["AC-15"]
      edge_cases: []
    risks:
      - risk: "Missing one logAction call would leave a gap in user_name logging"
        mitigation: "Grep for all logAction calls and verify each has 6 args"

  # =========================================================================
  # PHASE 6: Hardening (edge cases + backward compat verification)
  # =========================================================================

  - id: STEP-11
    description: |
      Verify backward compatibility and edge case handling:
      1. Verify all UI code handles null/empty full_name gracefully:
         - users.tsx: || operator for fallback
         - history.tsx: || operator for fallback
      2. Verify update-user-role uses email-prefix fallback when full_name absent
      3. Verify name inputs do NOT enforce multi-word or length constraints
         (per CR-81 explicit exclusion)
      4. Verify create-invitation is NOT modified (AC-18)
      5. Verify long names render with text truncation (numberOfLines={1}) in
         user cards and activity log entries
    files:
      - "src/app/(tabs)/settings/users.tsx"
      - "src/app/(tabs)/settings/history.tsx"
    dependencies: ["STEP-08", "STEP-09"]
    parallelizable_with: ["STEP-12"]
    done_when:
      - "User cards with empty full_name show email as primary text"
      - "Activity log entries with null user_name show user_email"
      - "No crashes or blank text for legacy users"
      - "Long names truncated gracefully with ellipsis (numberOfLines=1)"
    tests:
      - type: unit
        description: "Render components with null/empty/long names and verify fallback behavior"
    covers:
      acceptance_criteria: ["AC-10", "AC-18"]
      edge_cases: ["EC-1", "EC-3", "EC-6", "EC-7"]
    risks: []

  - id: STEP-12
    description: |
      Update existing tests for backward compatibility:
      1. Update activityLog.test.ts:
         - Add test for logAction with userName parameter
         - Update createLogger tests to include userName parameter
         - Verify logAction inserts user_name: null when userName not provided
      2. Update phase06-admin-polish.test.ts:
         - Update createLogger calls to match new signature (with optional userName)
    files:
      - "src/__tests__/activityLog.test.ts"
      - "src/__tests__/phase06-admin-polish.test.ts"
    dependencies: ["STEP-09"]
    parallelizable_with: ["STEP-11"]
    done_when:
      - "activityLog tests pass with updated logAction/createLogger signatures"
      - "phase06-admin-polish tests pass with updated createLogger calls"
      - "New test verifies user_name is included in insert payload"
      - "Backward compat test: logAction without userName inserts user_name: null"
    tests:
      - type: unit
        description: "Existing test suites pass after signature updates"
    covers:
      acceptance_criteria: ["AC-15"]
      edge_cases: []
    risks: []

  # =========================================================================
  # PHASE 7: QA Tests
  # =========================================================================

  - id: STEP-13
    description: |
      Create comprehensive QA test suite for CR-81:
      1. Create src/__tests__/qa/cr81.test.tsx
      2. Test groups:
         a. Registration Name Field:
            - AC-1: register.tsx renders Name input as first field
            - AC-2: Validation rejects empty name
            - AC-4: [token].tsx renders Name input after read-only fields
            - AC-5: Invite validation rejects empty name
         b. Users Screen Display:
            - AC-9: User card shows full_name as primary text
            - AC-10: Legacy user (no name) shows email as primary
            - EC-3: Long name renders with truncation
            - EC-7: Duplicate names allowed
         c. Users Screen Self-Edit:
            - AC-11: Self card shows editable name input
            - AC-12: Save calls update-user-name and refreshes
            - AC-13: Other user card shows name as read-only
            - EC-4: No API call when name unchanged
            - EC-5: Error handling reverts name on failure
         d. Activity Log:
            - AC-16: History shows user_name with email fallback
            - AC-20: Search matches user_name field
            - EC-6: Legacy entries (null user_name) show email
         e. Activity Log Utility:
            - AC-15: logAction includes user_name in insert
         f. AuthContext:
            - userName from app_metadata
            - Empty string when no metadata
      3. Use vitest mocking patterns consistent with existing qa/ tests
    files:
      - "src/__tests__/qa/cr81.test.tsx"
    dependencies: ["STEP-07", "STEP-08", "STEP-09", "STEP-10", "STEP-11"]
    parallelizable_with: []
    done_when:
      - "Test file exists at src/__tests__/qa/cr81.test.tsx"
      - "Tests cover all 20 acceptance criteria"
      - "Tests cover all 7 edge cases"
      - "All tests pass with vitest"
    tests:
      - type: unit
        description: "Full QA test suite for CR-81"
    covers:
      acceptance_criteria: ["AC-1", "AC-2", "AC-3", "AC-4", "AC-5", "AC-6", "AC-7", "AC-8", "AC-9", "AC-10", "AC-11", "AC-12", "AC-13", "AC-14", "AC-15", "AC-16", "AC-17", "AC-18", "AC-19", "AC-20"]
      edge_cases: ["EC-1", "EC-2", "EC-3", "EC-4", "EC-5", "EC-6", "EC-7"]
    risks:
      - risk: "Large test file may be slow"
        mitigation: "Group tests by describe blocks; use beforeEach for common setup"

# =============================================================================
# VALIDATION
# =============================================================================

validation:
  - ac_id: AC-1
    how_to_verify: "Render register.tsx; confirm Name TextInput is the first input field before Email"
    covered_by_steps: ["STEP-07", "STEP-13"]

  - ac_id: AC-2
    how_to_verify: "Submit register form with empty name; confirm validation error with t('auth.nameRequired')"
    covered_by_steps: ["STEP-07", "STEP-13"]

  - ac_id: AC-3
    how_to_verify: "Submit register form with valid name; verify fullName is sent in edge function body and stored in app_metadata"
    covered_by_steps: ["STEP-03", "STEP-07", "STEP-13"]

  - ac_id: AC-4
    how_to_verify: "Render [token].tsx with valid invitation; confirm Name TextInput between read-only fields and password"
    covered_by_steps: ["STEP-07", "STEP-13"]

  - ac_id: AC-5
    how_to_verify: "Submit invite form with empty name; confirm validation error with t('auth.nameRequired')"
    covered_by_steps: ["STEP-07", "STEP-13"]

  - ac_id: AC-6
    how_to_verify: "Submit invite form with valid name; verify fullName sent to EF and stored in app_metadata"
    covered_by_steps: ["STEP-04", "STEP-07", "STEP-13"]

  - ac_id: AC-7
    how_to_verify: "Register with role=bishopric; verify meeting_actors table has actor with user's fullName, can_preside=true, can_conduct=true"
    covered_by_steps: ["STEP-03", "STEP-13"]

  - ac_id: AC-8
    how_to_verify: "Call list_ward_users RPC; verify response includes full_name column for each user"
    covered_by_steps: ["STEP-01", "STEP-13"]

  - ac_id: AC-9
    how_to_verify: "Render Users screen with users that have full_name; verify name is primary text, email is secondary"
    covered_by_steps: ["STEP-08", "STEP-13"]

  - ac_id: AC-10
    how_to_verify: "Render user card for legacy user (no full_name); verify email is primary text, no secondary line"
    covered_by_steps: ["STEP-08", "STEP-11", "STEP-13"]

  - ac_id: AC-11
    how_to_verify: "Expand current user's card; verify editable Name TextInput pre-filled with current full_name"
    covered_by_steps: ["STEP-08", "STEP-13"]

  - ac_id: AC-12
    how_to_verify: "Edit name and save; verify API call to update-user-name, query invalidation, session refresh, success alert"
    covered_by_steps: ["STEP-08", "STEP-13"]

  - ac_id: AC-13
    how_to_verify: "Expand another user's card; verify name is read-only (no TextInput, no save button)"
    covered_by_steps: ["STEP-08", "STEP-13"]

  - ac_id: AC-14
    how_to_verify: "Call update-user-name EF with valid JWT; verify caller's app_metadata.full_name is updated; verify empty name returns 400"
    covered_by_steps: ["STEP-05", "STEP-13"]

  - ac_id: AC-15
    how_to_verify: "Trigger any logged action; verify activity_log entry has user_name column set from app_metadata"
    covered_by_steps: ["STEP-09", "STEP-10", "STEP-12", "STEP-13"]

  - ac_id: AC-16
    how_to_verify: "Render history.tsx with entries that have user_name; verify name displayed instead of email"
    covered_by_steps: ["STEP-09", "STEP-13"]

  - ac_id: AC-17
    how_to_verify: "Change user role to bishopric when user has full_name; verify auto-actor uses full_name instead of email prefix"
    covered_by_steps: ["STEP-05", "STEP-13"]

  - ac_id: AC-18
    how_to_verify: "Verify create-invitation edge function is NOT modified; auto-actor still uses email prefix"
    covered_by_steps: ["STEP-11", "STEP-13"]

  - ac_id: AC-19
    how_to_verify: "Check all 3 locale files contain auth.fullName, auth.fullNamePlaceholder, auth.nameRequired, users.name, users.nameUpdated, users.nameUpdateFailed"
    covered_by_steps: ["STEP-02", "STEP-13"]

  - ac_id: AC-20
    how_to_verify: "Search for a user name in Activity Log; verify results include entries matching user_name"
    covered_by_steps: ["STEP-09", "STEP-13"]
```

## Dependency Graph

```
STEP-01 (Migration: user_name col + RPC)     STEP-02 (i18n + types)     STEP-06 (AuthContext)
   |                                              |                          |
   ├──> STEP-03 (register-first-user EF)          |                          |
   |                                              |                          |
   ├──> STEP-04 (register-invited-user EF)        |                          |
   |                                              |                          |
   ├──> STEP-05 (update-user-name + role + list)  |                          |
   |         |                                    |                          |
   |         └──────────────┐                     ├──> STEP-09 (activityLog  |
   |                        |                     |    utility + display)    |
   |                        |                     |         |                |
   |                        |                     |         ├──> STEP-12     |
   |                        |                     |         |   (update      |
   |                        |                     |         |    tests)      |
   |    STEP-03 + STEP-04 + STEP-02               |         |                |
   |         |                                    |         |                |
   |         └──> STEP-07 (Registration screens)  |         |                |
   |                                              |         |                |
   |              STEP-05 + STEP-06               |         |                |
   |                  |                           |         |                |
   |                  └──> STEP-08 (Users screen) |         |                |
   |                            |                 |         |                |
   |                            |   STEP-06 + STEP-09      |                |
   |                            |       |                   |                |
   |                            |       └──> STEP-10 (hooks logAction)      |
   |                            |                 |         |                |
   |                            └──> STEP-11 (hardening)    |                |
   |                                       |                |                |
   |                                       └──> STEP-13 (QA tests) <────────┘
   |                                                  ^
   |                                                  |
   └────── STEP-07, STEP-08, STEP-09, STEP-10, STEP-11
```

## Step Execution Order

| Phase | Steps | Description |
|-------|-------|-------------|
| 1 - Foundation | STEP-01, STEP-02, STEP-06 | Database migration, i18n/types, AuthContext (parallel) |
| 2 - Backend | STEP-03, STEP-04, STEP-05 | Edge Functions (parallel after STEP-01) |
| 3 - Frontend Registration | STEP-07 | Registration screen name inputs (after EFs) |
| 4 - Frontend Users + Activity | STEP-08, STEP-09 | Users screen display/edit, Activity log utility (parallel) |
| 5 - Activity Hooks | STEP-10 | Update all hooks to pass userName (after STEP-06 + STEP-09) |
| 6 - Hardening | STEP-11, STEP-12 | Backward compat verification, existing test updates (parallel) |
| 7 - QA | STEP-13 | Comprehensive QA test suite |

## Notes

### No New Dependencies

- No new npm packages required
- No new database tables (only ALTER TABLE + CREATE OR REPLACE FUNCTION)
- One new Edge Function: update-user-name (standard pattern)

### Backward Compatibility Strategy

All code paths that read `full_name` use fallback patterns:
- SQL: `COALESCE(raw_app_meta_data->>'full_name', '')`
- TypeScript UI: `u.full_name || u.email`
- TypeScript log: `item.user_name || item.user_email`
- Edge Function: `fullName ? fullName : emailDerivedName`

This ensures existing users without names continue to work seamlessly.

### Files Modified (22 total)

| File | Change Type |
|------|-------------|
| `supabase/migrations/011_add_user_name_support.sql` | **NEW** |
| `supabase/functions/update-user-name/index.ts` | **NEW** |
| `src/__tests__/qa/cr81.test.tsx` | **NEW** |
| `src/i18n/locales/pt-BR.json` | MODIFY |
| `src/i18n/locales/en.json` | MODIFY |
| `src/i18n/locales/es.json` | MODIFY |
| `src/types/database.ts` | MODIFY |
| `src/contexts/AuthContext.tsx` | MODIFY |
| `src/app/(auth)/register.tsx` | MODIFY |
| `src/app/(auth)/invite/[token].tsx` | MODIFY |
| `src/app/(tabs)/settings/users.tsx` | MODIFY |
| `src/app/(tabs)/settings/history.tsx` | MODIFY |
| `src/lib/activityLog.ts` | MODIFY |
| `src/hooks/useActivityLog.ts` | MODIFY |
| `src/hooks/useActors.ts` | MODIFY |
| `src/hooks/useMembers.ts` | MODIFY |
| `src/hooks/useSpeeches.ts` | MODIFY |
| `src/hooks/useAgenda.ts` | MODIFY |
| `src/hooks/useTopics.ts` | MODIFY |
| `src/hooks/useSundayTypes.ts` | MODIFY |
| `src/__tests__/activityLog.test.ts` | MODIFY |
| `src/__tests__/phase06-admin-polish.test.ts` | MODIFY |
| `supabase/functions/register-first-user/index.ts` | MODIFY |
| `supabase/functions/register-invited-user/index.ts` | MODIFY |
| `supabase/functions/update-user-role/index.ts` | MODIFY |
| `supabase/functions/list-users/index.ts` | MODIFY |
