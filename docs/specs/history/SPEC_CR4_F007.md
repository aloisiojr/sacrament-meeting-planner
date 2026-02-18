# SPEC_CR4_F007 - Auth Fixes: Users Screen Bug + Forgot Password

## SPEC_SUMMARY

```yaml
type: spec_summary
goal: "Fix Users screen error for secretary role and implement forgot password functionality"
in_scope:
  - "Fix Users screen showing error when secretary accesses it (CR-64)"
  - "Fix secretary not appearing in the user list (CR-64)"
  - "Implement forgot password flow with email reset (CR-67)"
out_of_scope:
  - "Changing role/permission model"
  - "Implementing OAuth or social login"
  - "Implementing password change from within the app (only forgot/reset)"
main_risks:
  - "Edge Function list-users may have RLS or query issue excluding certain roles"
  - "Supabase password reset email delivery depends on email provider configuration"
ac_count: 14
edge_case_count: 6
has_open_questions: true
has_unconfirmed_assumptions: true
```

## SPEC

```yaml
type: spec
version: 1
goal: "Fix the Users screen to correctly list all ward users including the secretary, and add a Forgot Password flow to the login screen"

scope:
  in:
    - "CR-64: Debug and fix why secretary sees an error on Users screen"
    - "CR-64: Ensure secretary appears in the user list"
    - "CR-67: Add 'Forgot password?' link on login screen"
    - "CR-67: Implement forgot password screen with email input"
    - "CR-67: Integrate with Supabase Auth resetPasswordForEmail"
    - "CR-67: Add success/error feedback to user"
    - "CR-67: Add i18n keys for all forgot password strings in 3 languages"
  out:
    - "Change password from settings while logged in"
    - "Two-factor authentication"
    - "Email verification flow changes"
    - "Modifying the registration flow"

personas:
  - id: P-1
    description: "Secretary - ward user with secretary role who manages the ward"
  - id: P-2
    description: "Any user who forgot their password and needs to reset it"

user_stories:
  - id: US-1
    as_a: "Secretary"
    i_want: "to access the Users screen and see all ward users including myself"
    so_that: "I can manage user roles and invitations"

  - id: US-2
    as_a: "User who forgot their password"
    i_want: "to request a password reset email from the login screen"
    so_that: "I can regain access to my account"

acceptance_criteria:
  # CR-64: Users screen bug
  - id: AC-1
    given: "A secretary user is logged in"
    when: "They navigate to Settings > Users"
    then: "The Users screen loads without showing any error message"
    priority: must

  - id: AC-2
    given: "A ward has a single user (the secretary)"
    when: "The secretary opens the Users screen"
    then: "The secretary's email and role appear in the user list"
    priority: must

  - id: AC-3
    given: "A ward has multiple users (bishopric, secretary, observers)"
    when: "Any user with settings:users permission opens the Users screen"
    then: "All ward users are listed with their correct emails and roles"
    priority: must

  - id: AC-4
    given: "The list-users Edge Function is called"
    when: "There is a query or RLS issue"
    then: "The error is caught and a user-friendly i18n error message is displayed, not a bare red 'Erro' text"
    priority: must

  # CR-67: Forgot password flow
  - id: AC-5
    given: "User is on the login screen"
    when: "They look below the login button"
    then: "A 'Forgot password?' link is visible, positioned between the Login button and the Create Account link"
    priority: must

  - id: AC-6
    given: "User taps 'Forgot password?'"
    when: "The forgot password screen opens"
    then: "The screen shows a title, explanatory text, an email input field, and a 'Send Reset Email' button"
    priority: must

  - id: AC-7
    given: "User enters a valid email on the forgot password screen"
    when: "They press 'Send Reset Email'"
    then: "Supabase Auth resetPasswordForEmail is called with the entered email"
    priority: must

  - id: AC-8
    given: "resetPasswordForEmail call succeeds"
    when: "The API returns successfully"
    then: "A success message is shown: 'Check your email for the reset link' (i18n translated), and the user can navigate back to login"
    priority: must

  - id: AC-9
    given: "resetPasswordForEmail call fails"
    when: "There is a network error or API error"
    then: "An error message is shown using i18n (e.g., t('auth.resetFailed')), not a technical error"
    priority: must

  - id: AC-10
    given: "User enters an empty email"
    when: "They press 'Send Reset Email'"
    then: "A validation message is shown: t('auth.emailRequired'), the API is not called"
    priority: must

  - id: AC-11
    given: "The forgot password screen"
    when: "User wants to go back to login"
    then: "A back button or link navigates back to the login screen"
    priority: must

  - id: AC-12
    given: "The 'Send Reset Email' button"
    when: "The request is in progress"
    then: "The button shows a loading spinner and is disabled to prevent double-submit"
    priority: must

  - id: AC-13
    given: "Forgot password screen and success feedback"
    when: "The app language is pt-BR, en, or es"
    then: "All strings are translated in all 3 supported languages"
    priority: must

  - id: AC-14
    given: "The forgot password screen"
    when: "It is rendered"
    then: "It respects the current theme (dark/light mode) using colors from ThemeContext"
    priority: must

edge_cases:
  - id: EC-1
    case: "User enters an email that does not exist in Supabase"
    expected: "Supabase returns success anyway (security best practice - no email enumeration). The success message is shown."

  - id: EC-2
    case: "User rapidly taps 'Send Reset Email' multiple times"
    expected: "Only one request is sent; the button is disabled while loading"

  - id: EC-3
    case: "User navigates away from forgot password screen while request is pending"
    expected: "No crash; request completes silently"

  - id: EC-4
    case: "Ward has zero users returned from list-users"
    expected: "The empty state message t('users.noUsers') is shown, not an error"

  - id: EC-5
    case: "The list-users Edge Function returns users with unexpected role values"
    expected: "Users are still listed; unknown roles display as-is without crash"

  - id: EC-6
    case: "User enters email with leading/trailing spaces"
    expected: "The email is trimmed before calling the API"

assumptions:
  - id: A-1
    description: "The list-users Edge Function bug is a server-side issue (RLS policy or query) that prevents the secretary from seeing users, and the fix must be applied both client-side (error handling) and server-side (Edge Function)"
    confirmed: false
    default_if_not_confirmed: "Investigate the Edge Function response. If the Edge Function needs fixing, document the required change. If it is client-side only, fix the error handling."

  - id: A-2
    description: "Supabase Auth resetPasswordForEmail is available and configured for this project"
    confirmed: false
    default_if_not_confirmed: "Use supabase.auth.resetPasswordForEmail() which is the standard Supabase method"

  - id: A-3
    description: "The password reset email and landing page are handled by Supabase's built-in flow (no custom landing page needed)"
    confirmed: false
    default_if_not_confirmed: "Use Supabase default reset flow. User receives email with link, clicks it, Supabase handles the password change page."

  - id: A-4
    description: "The forgot password screen should be a new route under (auth) group"
    confirmed: false
    default_if_not_confirmed: "Create src/app/(auth)/forgot-password.tsx"

open_questions:
  - id: Q-1
    question: "Does the list-users Edge Function need to be fixed server-side, or is the error purely client-side (e.g., the Edge Function returns data but the client mishandles it)?"
    proposed_default: "Investigate the Edge Function. If it returns an error for secretary, fix the Edge Function. If it returns empty array, fix to include all users. If it returns data but client errors, fix client."

  - id: Q-2
    question: "Should the password reset redirect URL point to a deep link in the app, or use Supabase's default web-based reset page?"
    proposed_default: "Use Supabase's default web-based reset page for simplicity. The user resets password in browser, then returns to the app to log in."

definition_of_done:
  - "Secretary can access Users screen without errors"
  - "Secretary appears in the user list"
  - "All ward users (bishopric, secretary, observer) appear in the user list"
  - "'Forgot password?' link visible on login screen"
  - "Forgot password screen allows entering email and requesting reset"
  - "Success message shown after reset request"
  - "Error message shown if reset request fails"
  - "Loading state prevents double-submit"
  - "All new strings translated in pt-BR, en, es"
  - "Dark/light theme respected on forgot password screen"
  - "No regressions in login or registration flows"
```
