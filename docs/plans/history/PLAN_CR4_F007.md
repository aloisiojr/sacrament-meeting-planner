# PLAN_CR4_F007 - Auth Fixes: Users Screen Bug + Forgot Password

## PLAN_SUMMARY

```yaml
type: plan_summary
total_steps: 7
parallel_tracks: 2
estimated_commits: 7
coverage:
  acceptance_criteria: 14/14
  edge_cases: 6/6
critical_path:
  - "STEP-01: Fix list-users Edge Function to allow secretary"
  - "STEP-02: Fix Users screen error handling"
  - "STEP-04: Create forgot-password screen"
  - "STEP-05: Add forgot password link to login"
main_risks:
  - "list-users Edge Function restricts to bishopric role only; secretary is blocked server-side"
  - "Supabase resetPasswordForEmail depends on email provider configuration in the project"
  - "Password reset email delivery and landing page depend on Supabase project settings"
```

## PLAN

```yaml
type: plan
version: 1

goal: "Fix Users screen to work for secretary role, and implement forgot password flow on login screen"

strategy:
  order: "Server-side fix -> Client-side error handling -> i18n -> Forgot password screen -> Login integration -> Tests"
  commit_strategy: "1 commit per step, conventional commit messages"
  test_strategy: "Tests alongside code; unit tests for Edge Function fix, component tests for forgot password"

steps:
  - id: STEP-01
    description: "Fix list-users Edge Function to allow secretary role access (CR-64 root cause)"
    files:
      - "supabase/functions/list-users/index.ts"
    dependencies: []
    parallelizable_with: ["STEP-03"]
    done_when:
      - "Permission check changed from `userRole !== 'bishopric'` to `!['bishopric', 'secretary'].includes(userRole)`"
      - "Secretary users can call list-users and get back all ward users including themselves"
      - "Observer users are still denied (403)"
      - "The RPC list_ward_users returns all users in the ward regardless of calling user's role"
    tests:
      - type: unit
        description: "Test that secretary role passes permission check"
      - type: unit
        description: "Test that observer role is denied"
      - type: unit
        description: "Test that bishopric role still passes"
    covers:
      acceptance_criteria: ["AC-1", "AC-2", "AC-3"]
      edge_cases: ["EC-4", "EC-5"]
    risks:
      - risk: "The list_ward_users RPC function may itself have a role check that excludes secretary"
        mitigation: "The RPC uses service_role_key (admin client), so it bypasses RLS. The permission check is solely in the Edge Function."

  - id: STEP-02
    description: "Improve Users screen error handling: show user-friendly i18n message instead of bare 'Erro'"
    files:
      - "src/app/(tabs)/settings/users.tsx"
    dependencies: ["STEP-01"]
    parallelizable_with: []
    done_when:
      - "Error display uses t('users.loadError') or similar i18n key instead of just t('common.error')"
      - "Error view includes a 'Try Again' button that calls refetch()"
      - "When users array is empty, t('users.noUsers') is shown (existing behavior confirmed working)"
      - "Unknown role values from server display as-is without crash"
    tests:
      - type: unit
        description: "Test error state renders user-friendly message with retry button"
      - type: unit
        description: "Test empty users list shows noUsers message"
      - type: unit
        description: "Test unknown role values render without crash"
    covers:
      acceptance_criteria: ["AC-4"]
      edge_cases: ["EC-4", "EC-5"]
    risks:
      - risk: "refetch function reference from useQuery may need to be extracted"
        mitigation: "Destructure refetch from useQuery return value alongside data, isLoading, error"

  - id: STEP-03
    description: "Add all i18n keys for forgot password and Users screen improvements in 3 languages"
    files:
      - "src/i18n/locales/pt-BR.json"
      - "src/i18n/locales/en.json"
      - "src/i18n/locales/es.json"
    dependencies: []
    parallelizable_with: ["STEP-01"]
    done_when:
      - "Keys added: auth.forgotPassword, auth.forgotPasswordTitle, auth.forgotPasswordDescription, auth.sendResetEmail, auth.resetEmailSent, auth.resetFailed, auth.emailRequired (already exists), auth.backToLogin"
      - "Keys added: users.loadError (or enhanced common error key)"
      - "All keys translated in pt-BR, en, es"
    tests:
      - type: unit
        description: "Verify all 3 locale files contain the new auth.* and users.* keys"
    covers:
      acceptance_criteria: ["AC-13"]
      edge_cases: []
    risks:
      - risk: "Inconsistent key naming with existing auth keys"
        mitigation: "Follow existing pattern: auth.loginTitle, auth.loginSubtitle, auth.email, etc."

  - id: STEP-04
    description: "Create forgot-password screen with email input, loading state, success/error feedback"
    files:
      - "src/app/(auth)/forgot-password.tsx"
    dependencies: ["STEP-03"]
    parallelizable_with: []
    done_when:
      - "New file src/app/(auth)/forgot-password.tsx exists"
      - "Screen renders: title (t('auth.forgotPasswordTitle')), description text, email input, 'Send Reset Email' button"
      - "Email input trims whitespace before submission"
      - "Empty email shows validation error t('auth.emailRequired') without calling API"
      - "Button calls supabase.auth.resetPasswordForEmail(email.trim())"
      - "During request: button shows ActivityIndicator and is disabled (prevents double-submit)"
      - "On success: shows success message t('auth.resetEmailSent') and a 'Back to Login' link"
      - "On error: shows error message t('auth.resetFailed')"
      - "Back button/link navigates to /(auth)/login"
      - "Screen respects current theme (dark/light) using colors from ThemeContext"
      - "Layout follows existing auth screen patterns (KeyboardAvoidingView, ScrollView, centered form)"
    tests:
      - type: unit
        description: "Test empty email submission shows validation error"
      - type: unit
        description: "Test loading state disables button"
      - type: unit
        description: "Test success message rendered after API success"
      - type: unit
        description: "Test error message rendered after API failure"
    covers:
      acceptance_criteria: ["AC-6", "AC-7", "AC-8", "AC-9", "AC-10", "AC-11", "AC-12", "AC-14"]
      edge_cases: ["EC-1", "EC-2", "EC-3", "EC-6"]
    risks:
      - risk: "supabase.auth.resetPasswordForEmail may not be configured in project"
        mitigation: "This is a standard Supabase Auth method. If email provider is not configured, the API returns success but no email is sent. Document this as a deployment consideration."
      - risk: "User navigates away while request is pending"
        mitigation: "Use isMounted ref check or AbortController to prevent state update on unmounted component"

  - id: STEP-05
    description: "Add 'Forgot password?' link to login screen, positioned between Login button and Create Account"
    files:
      - "src/app/(auth)/login.tsx"
    dependencies: ["STEP-04"]
    parallelizable_with: []
    done_when:
      - "A TouchableOpacity with text t('auth.forgotPassword') is rendered between the login button and the create account link"
      - "Tapping navigates to /(auth)/forgot-password via router.push"
      - "Link is disabled while login is loading"
      - "Style follows the existing createAccountLink pattern (centered, smaller text, primary color)"
    tests:
      - type: unit
        description: "Test forgot password link renders on login screen"
      - type: unit
        description: "Test tapping link navigates to forgot-password route"
    covers:
      acceptance_criteria: ["AC-5"]
      edge_cases: []
    risks: []

  - id: STEP-06
    description: "Update (auth) layout to include forgot-password route (if needed by expo-router)"
    files:
      - "src/app/(auth)/_layout.tsx"
    dependencies: ["STEP-04"]
    parallelizable_with: ["STEP-05"]
    done_when:
      - "The (auth) layout supports the forgot-password route (expo-router file-based routing should auto-detect)"
      - "Navigation from login to forgot-password and back works without errors"
      - "If _layout.tsx uses Stack with explicit screens, add the forgot-password screen to the stack"
    tests:
      - type: integration
        description: "Test navigation flow: login -> forgot-password -> login"
    covers:
      acceptance_criteria: ["AC-5", "AC-11"]
      edge_cases: ["EC-3"]
    risks:
      - risk: "Expo Router file-based routing may auto-discover the new file without layout changes"
        mitigation: "Check if _layout.tsx defines explicit <Stack.Screen> entries. If yes, add the new screen. If it uses <Slot/>, no change needed."

  - id: STEP-07
    description: "Add comprehensive tests for Users screen fix and forgot password flow"
    files:
      - "src/__tests__/cr004-f007-auth-fixes.test.ts"
    dependencies: ["STEP-02", "STEP-05", "STEP-06"]
    parallelizable_with: []
    done_when:
      - "Tests cover: list-users allows secretary, Users screen error handling, forgot password screen, login forgot password link"
      - "All tests pass with vitest"
      - "No regressions in existing auth or user management tests"
    tests:
      - type: unit
        description: "list-users permission check includes secretary"
      - type: unit
        description: "Users screen error state shows i18n message with retry"
      - type: unit
        description: "Forgot password screen validates email, calls API, shows success/error"
      - type: unit
        description: "Login screen has forgot password link navigating to correct route"
      - type: unit
        description: "Email trimming on forgot password screen"
    covers:
      acceptance_criteria: ["AC-1", "AC-2", "AC-3", "AC-4", "AC-5", "AC-6", "AC-7", "AC-8", "AC-9", "AC-10", "AC-11", "AC-12", "AC-13", "AC-14"]
      edge_cases: ["EC-1", "EC-2", "EC-3", "EC-4", "EC-5", "EC-6"]
    risks: []

validation:
  - ac_id: AC-1
    how_to_verify: "Login as secretary, navigate to Settings > Users -> screen loads without error"
    covered_by_steps: ["STEP-01", "STEP-07"]
  - ac_id: AC-2
    how_to_verify: "Ward with only secretary -> secretary appears in user list"
    covered_by_steps: ["STEP-01", "STEP-07"]
  - ac_id: AC-3
    how_to_verify: "Ward with multiple users (bishopric, secretary, observer) -> all appear in list"
    covered_by_steps: ["STEP-01", "STEP-07"]
  - ac_id: AC-4
    how_to_verify: "Simulate Edge Function error -> user-friendly i18n message with retry button"
    covered_by_steps: ["STEP-02", "STEP-07"]
  - ac_id: AC-5
    how_to_verify: "Login screen shows 'Forgot password?' link between Login button and Create Account"
    covered_by_steps: ["STEP-05", "STEP-07"]
  - ac_id: AC-6
    how_to_verify: "Tap 'Forgot password?' -> screen shows title, description, email input, send button"
    covered_by_steps: ["STEP-04", "STEP-07"]
  - ac_id: AC-7
    how_to_verify: "Enter valid email, press send -> supabase.auth.resetPasswordForEmail called"
    covered_by_steps: ["STEP-04", "STEP-07"]
  - ac_id: AC-8
    how_to_verify: "After successful API call -> success message shown with back to login link"
    covered_by_steps: ["STEP-04", "STEP-07"]
  - ac_id: AC-9
    how_to_verify: "Simulate API failure -> error message t('auth.resetFailed') shown"
    covered_by_steps: ["STEP-04", "STEP-07"]
  - ac_id: AC-10
    how_to_verify: "Submit empty email -> validation message shown, API not called"
    covered_by_steps: ["STEP-04", "STEP-07"]
  - ac_id: AC-11
    how_to_verify: "Forgot password screen has back button/link that navigates to login"
    covered_by_steps: ["STEP-04", "STEP-06", "STEP-07"]
  - ac_id: AC-12
    how_to_verify: "Press send -> button shows spinner and is disabled"
    covered_by_steps: ["STEP-04", "STEP-07"]
  - ac_id: AC-13
    how_to_verify: "Switch language -> all forgot password strings translated in pt-BR, en, es"
    covered_by_steps: ["STEP-03", "STEP-07"]
  - ac_id: AC-14
    how_to_verify: "Toggle dark/light theme -> forgot password screen respects ThemeContext colors"
    covered_by_steps: ["STEP-04", "STEP-07"]
```
