# SPEC_CR81 - User Name Field

## SPEC_SUMMARY

```yaml
type: spec_summary
goal: "Add mandatory Name field to users for improved actor auto-creation, activity log readability, and users screen display"
in_scope:
  - "F1: Add Name input to self-registration screen (register.tsx) -- mandatory field"
  - "F2: Add Name input to invite registration screen ([token].tsx) -- mandatory field"
  - "F3: Update register-first-user edge function to store full_name in app_metadata and auto-create actor for bishopric"
  - "F4: Update register-invited-user edge function to store full_name in app_metadata"
  - "F5: Update list_ward_users RPC to return full_name from raw_app_meta_data"
  - "F6: Update list-users edge function WardUser interface to include full_name"
  - "F7: Display user name as primary text in Users screen cards (email as secondary)"
  - "F8: Allow users to edit their own name from the expanded user card"
  - "F9: Create update-user-name edge function for self-name-update"
  - "F10: Add user_name column to activity_log table (nullable)"
  - "F11: Update logAction/createLogger utility to accept and store user_name"
  - "F12: Display user_name in Activity Log screen (with email fallback)"
  - "F13: Update auto-actor creation in update-user-role to use full_name from app_metadata"
  - "F14: i18n keys for name field in pt-BR, en, es"
out_of_scope:
  - "Validating that the name contains multiple words (explicitly excluded by CR-81)"
  - "Profile photos or avatars"
  - "Separate profile/settings screen for name editing"
  - "Changes to login or forgot-password flows"
  - "Admin editing another user's name (only self-edit)"
  - "Backfilling names for existing activity_log entries"
  - "Updating actor name in create-invitation (name unknown at invite time)"
  - "Auto-updating Meeting Actor name when user edits their name"
main_risks:
  - "Backward compatibility for existing users with no full_name in app_metadata"
  - "Historical activity_log entries will show email only (no backfill)"
  - "Edge functions and RPC must be updated atomically to avoid inconsistencies"
ac_count: 20
edge_case_count: 7
has_open_questions: true
has_unconfirmed_assumptions: true
```

## SPEC

```yaml
type: spec
version: 1
cr_id: CR-81
category: FEATURE
priority: MEDIUM

title: >
  Add mandatory Name field to users for improved actor auto-creation,
  activity log readability, and users screen display

goal: >
  Add a mandatory "Name" (full name) field to each user account so that:
  (1) Meeting Actors for Presiding and Conducting can be auto-created using the
  user's real name instead of the email prefix; (2) Activity Log entries display
  the user's name instead of their email; (3) the Users screen shows user names
  as the primary identifier instead of email. The name field must be collected
  during registration (both self-registration and invite flow) and must be
  editable by the user themselves.

scope:
  in:
    - "Add full_name to user app_metadata in Supabase Auth (stored as app_metadata.full_name)"
    - "Add Name input field to self-registration screen (register.tsx) -- mandatory, before Email"
    - "Add Name input field to invited-user registration screen ([token].tsx) -- mandatory"
    - "Update register-first-user edge function to accept/store fullName and auto-create actor for bishopric role"
    - "Update register-invited-user edge function to accept/store fullName in app_metadata"
    - "Update list_ward_users RPC to return full_name from raw_app_meta_data"
    - "Update list-users edge function WardUser interface to include full_name"
    - "Update Users screen (users.tsx) to display name as primary text in user cards"
    - "Allow users to edit their own name from the expanded user card in Users screen"
    - "Create new edge function update-user-name for self-name-update"
    - "Add user_name nullable column to activity_log table"
    - "Update logAction/createLogger utility to accept and store user_name"
    - "Update Activity Log screen (history.tsx) to show user_name instead of user_email"
    - "Update auto-actor creation in update-user-role to use full_name from app_metadata"
    - "i18n keys for name field label, placeholder, and validation in pt-BR, en, es"
  out:
    - "Validating that the name contains multiple words (explicitly excluded by CR-81)"
    - "Profile photos or avatars"
    - "Separate profile screen (editing happens inline in the Users screen expanded card)"
    - "Changes to the login flow or forgot-password flow"
    - "Admin editing another user's name (only the user themselves can edit their name)"
    - "Backfilling names for existing activity_log entries (historical entries keep email only)"
    - "Updating auto-actor in create-invitation (user name not known at invite time)"
    - "Auto-updating Meeting Actor name when a user edits their own name"

personas:
  - id: P-1
    description: >
      Bishopric member: registers as first user or via invite, manages ward.
      Their name is used for auto-creating preside/conduct Meeting Actors.
  - id: P-2
    description: >
      Secretary: registers as first user or via invite, manages day-to-day
      operations. Name appears in activity log and users screen.
  - id: P-3
    description: >
      Observer: registers via invite only. Name appears in users screen
      (read-only, as they cannot access the Users screen themselves).

user_stories:
  - id: US-1
    as_a: "new user registering for the first time (self-registration)"
    i_want: "to enter my full name during registration"
    so_that: "my name is stored and used throughout the app instead of my email"

  - id: US-2
    as_a: "user registering via an invitation link"
    i_want: "to enter my full name during the invite registration"
    so_that: "my name is stored and used throughout the app instead of my email"

  - id: US-3
    as_a: "Bishopric or Secretary viewing the Users screen"
    i_want: "to see each user's name as the primary identifier in the user card"
    so_that: "I can easily identify who each user is without decoding emails"

  - id: US-4
    as_a: "user viewing my own card in the Users screen"
    i_want: "to be able to edit my own name"
    so_that: "I can correct my name if it was entered incorrectly"

  - id: US-5
    as_a: "Bishopric or Secretary viewing the Activity Log"
    i_want: "to see the user's name instead of their email in log entries"
    so_that: "I can quickly identify who performed each action"

  - id: US-6
    as_a: "Bishopric member who just registered via self-registration"
    i_want: "my real name to be used when auto-creating Meeting Actors"
    so_that: "the preside/conduct actors have my actual name, not my email prefix"

# =============================================================================
# ACCEPTANCE CRITERIA
# =============================================================================
acceptance_criteria:
  # --- F1: Self-registration screen ---
  - id: AC-1
    given: "The self-registration screen (register.tsx)"
    when: "The screen is displayed"
    then: >
      A mandatory 'Name' text input field is visible as the first field in the
      form (before Email). The field uses i18n key 'auth.fullName' for the label,
      has a placeholder for full name, and uses autoCapitalize='words'.
    priority: must

  - id: AC-2
    given: "The self-registration screen with the Name field empty"
    when: "The user submits the form"
    then: >
      A validation error is displayed using i18n key 'auth.nameRequired'.
      The form is not submitted.
    priority: must

  - id: AC-3
    given: "The self-registration form with all fields filled including a valid name"
    when: "The user submits the form"
    then: >
      The register-first-user edge function receives fullName in the request
      body and stores it as app_metadata.full_name on the created Supabase
      Auth user.
    priority: must

  # --- F2: Invite registration screen ---
  - id: AC-4
    given: "The invite registration screen ([token].tsx)"
    when: "The invitation is validated and the registration form is shown"
    then: >
      A mandatory 'Name' text input field is visible between the read-only
      invitation fields (email/stake/ward/role) and the password fields.
      The field uses i18n key 'auth.fullName' for the label, is editable and
      mandatory, with autoCapitalize='words'.
    priority: must

  - id: AC-5
    given: "The invite registration form with the Name field empty"
    when: "The user submits the form"
    then: >
      A validation error is displayed using i18n key 'auth.nameRequired'.
      The form is not submitted.
    priority: must

  - id: AC-6
    given: "The invite registration form with all fields filled including a valid name"
    when: "The user submits the form"
    then: >
      The register-invited-user edge function receives fullName in the request
      body and stores it as app_metadata.full_name on the created Supabase
      Auth user.
    priority: must

  # --- F3: register-first-user auto-actor ---
  - id: AC-7
    given: "A new user registers with role 'bishopric' via self-registration"
    when: "The register-first-user edge function creates the user"
    then: >
      A Meeting Actor is auto-created (best-effort) with the user's fullName
      from the registration input, with can_preside=true and can_conduct=true.
      The actor name is the user's provided name, NOT the email prefix.
      NOTE: register-first-user currently has no auto-actor creation; this is
      new behavior.
    priority: must

  # --- F5/F6: list_ward_users RPC and list-users edge function ---
  - id: AC-8
    given: "The list_ward_users RPC function"
    when: "Called by the list-users edge function"
    then: >
      The function returns full_name (extracted from
      raw_app_meta_data->>'full_name') for each user, in addition to id, email,
      role, and created_at. The field may be null for legacy users.
    priority: must

  # --- F7: Users screen display name ---
  - id: AC-9
    given: "The Users screen (settings/users.tsx)"
    when: "The list of users is displayed"
    then: >
      Each user card shows the user's full_name as the primary text (where
      email was previously shown). The email is shown as secondary text below
      the name. The role label remains visible below.
    priority: must

  - id: AC-10
    given: "A user card for a user who has no name stored (legacy user)"
    when: "The card is rendered"
    then: >
      The email is shown as the primary text (fallback behavior), maintaining
      backward compatibility with users created before this feature.
    priority: must

  # --- F8: Users screen edit own name ---
  - id: AC-11
    given: "The Users screen with the current user's card expanded"
    when: "The expanded card is displayed"
    then: >
      A 'Name' field is shown (editable TextInput) pre-filled with the user's
      current full_name. The field uses i18n key 'users.name' for the label.
      The user can modify the text.
    priority: must

  - id: AC-12
    given: "The current user edits their name in the expanded card and confirms"
    when: "The save/confirm action is triggered"
    then: >
      The update-user-name edge function is called to update
      app_metadata.full_name for the current user. The user list is refreshed
      to show the updated name. A success message is shown.
    priority: must

  - id: AC-13
    given: "The Users screen with another user's card expanded (not self)"
    when: "The expanded card is displayed"
    then: >
      The Name field is read-only (not editable). Users can only edit their
      own name, not other users' names.
    priority: must

  # --- F9: update-user-name edge function ---
  - id: AC-14
    given: "A valid JWT from an authenticated user"
    when: "The update-user-name edge function is called with { fullName }"
    then: >
      The function updates only the caller's own app_metadata.full_name.
      Returns success. Rejects if fullName is empty/whitespace (HTTP 400).
    priority: must

  # --- F10/F11: Activity log database and utility ---
  - id: AC-15
    given: "The activity_log database table"
    when: "A new activity log entry is created after this feature is deployed"
    then: >
      The entry includes a user_name column containing the user's full_name
      (from app_metadata). The user_email column is retained. The logAction
      utility sends both user_name and user_email.
    priority: must

  # --- F12: Activity Log screen ---
  - id: AC-16
    given: "The Activity Log screen (history.tsx)"
    when: "Log entries are displayed"
    then: >
      Each entry shows user_name (when available) instead of user_email in
      the entry header. For legacy entries where user_name is null, the email
      is shown as fallback.
    priority: must

  # --- F13: update-user-role auto-actor ---
  - id: AC-17
    given: "A user's role is changed TO 'bishopric' via update-user-role"
    when: "The edge function processes the role change"
    then: >
      The auto-created Meeting Actor uses the user's full_name from
      app_metadata (instead of deriving from email prefix). If full_name is
      not set (legacy user), the existing email-prefix behavior is used as
      fallback.
    priority: must

  # --- create-invitation auto-actor (unchanged) ---
  - id: AC-18
    given: "An invitation is created for a bishopric role via create-invitation"
    when: "The edge function creates the invitation"
    then: >
      The auto-actor creation continues to use the email prefix as the actor
      name (since the invited user hasn't registered yet and has no name).
      No changes to create-invitation are needed for this feature.
    priority: should

  # --- F14: i18n ---
  - id: AC-19
    given: "The app with any of the three supported languages (pt-BR, en, es)"
    when: "Name-related UI elements are displayed"
    then: >
      All name-related labels, placeholders, and validation messages are
      properly translated. At minimum: auth.fullName, auth.fullNamePlaceholder,
      auth.nameRequired, users.name, users.nameUpdated, users.nameUpdateFailed.
    priority: must

  # --- Activity log search ---
  - id: AC-20
    given: "The Activity Log screen with search enabled"
    when: "The user searches by a person's name"
    then: >
      The search includes the user_name field so entries can be found by
      the actor's name (in addition to email and description).
    priority: should

# =============================================================================
# EDGE CASES
# =============================================================================
edge_cases:
  - id: EC-1
    case: "Existing users created before this feature (no full_name in app_metadata)"
    expected: >
      The system falls back gracefully: Users screen shows email as primary
      text, Activity Log shows email, auto-actor creation uses email prefix.
      No errors or crashes when full_name is null/undefined.

  - id: EC-2
    case: "User enters only whitespace or empty string as name during registration"
    expected: >
      Client-side validation rejects with 'auth.nameRequired' error. The edge
      function also validates that trimmed name is non-empty and returns
      HTTP 400 as server-side safety net.

  - id: EC-3
    case: "User enters a very long name (>200 characters)"
    expected: >
      The name is accepted (no strict length validation per CR-81). The UI
      handles long names gracefully with text truncation (numberOfLines=1
      or ellipsis) in user cards and activity log entries.

  - id: EC-4
    case: "User edits their name to be the same as current name (no change)"
    expected: >
      No API call is made. The edit is silently ignored (no error, no success
      message).

  - id: EC-5
    case: "User edits their name and the API call fails (network error)"
    expected: >
      An error message is shown (Alert). The name field reverts to the
      previous value. The user can retry.

  - id: EC-6
    case: "Activity log entries created before the migration (user_name is NULL)"
    expected: >
      The Activity Log screen falls back to displaying user_email for these
      entries. No error or blank display.

  - id: EC-7
    case: "Two users have the same full_name"
    expected: >
      This is allowed. Names are display-only and not unique identifiers.
      Email remains the unique identifier.

# =============================================================================
# DATA CONTRACTS
# =============================================================================
data_contracts:
  inputs:
    - name: "register-first-user request body (updated)"
      format: >
        { email, password, stakeName, wardName, role, language, timezone, fullName }
        -- fullName is a new required string field
    - name: "register-invited-user request body (updated)"
      format: >
        { token, password, fullName }
        -- fullName is a new required string field (when password is provided)
    - name: "update-user-name request body (new endpoint)"
      format: >
        { fullName }
        -- Updates the caller's own app_metadata.full_name
  outputs:
    - name: "list-users response (updated)"
      format: >
        { users: [{ id, email, role, created_at, full_name }] }
        -- full_name is a new nullable string field
    - name: "list_ward_users RPC result (updated)"
      format: >
        TABLE (id uuid, email text, role text, created_at timestamptz, full_name text)
        -- full_name is new nullable text column extracted from raw_app_meta_data

non_functional:
  security:
    - "Users can only edit their own name, not other users' names"
    - "update-user-name edge function validates JWT and only updates caller's metadata"
  privacy:
    - "User names are visible to all users in the same ward with Users screen access"
    - "User names stored in app_metadata and activity_log (within ward scope)"
  performance:
    - "No additional queries needed -- full_name comes from same app_metadata already read"

# =============================================================================
# AFFECTED FILES / COMPONENTS
# =============================================================================
affected_components:
  frontend:
    - path: "src/app/(auth)/register.tsx"
      change: "Add fullName state, TextInput, validation, send in request body"
    - path: "src/app/(auth)/invite/[token].tsx"
      change: "Add fullName state, TextInput, validation, send in request body"
    - path: "src/app/(tabs)/settings/users.tsx"
      change: "Display full_name as primary text; add name edit field for self; add WardUser.full_name"
    - path: "src/app/(tabs)/settings/history.tsx"
      change: "Show user_name instead of user_email (with fallback)"
    - path: "src/lib/activityLog.ts"
      change: "Add userName parameter to logAction and createLogger"
    - path: "src/types/database.ts"
      change: "Add user_name to ActivityLog interface"
    - path: "src/i18n/locales/pt-BR.json"
      change: "Add auth.fullName, auth.fullNamePlaceholder, auth.nameRequired, users.name, users.nameUpdated, users.nameUpdateFailed"
    - path: "src/i18n/locales/en.json"
      change: "Same i18n keys"
    - path: "src/i18n/locales/es.json"
      change: "Same i18n keys"
    - path: "src/hooks/*.ts (all hooks calling logAction)"
      change: "Pass userName to logAction calls"
  backend:
    - path: "supabase/functions/register-first-user/index.ts"
      change: "Accept fullName, store in app_metadata, auto-create actor for bishopric"
    - path: "supabase/functions/register-invited-user/index.ts"
      change: "Accept fullName, store in app_metadata"
    - path: "supabase/functions/list-users/index.ts"
      change: "Update WardUser interface to include full_name"
    - path: "supabase/functions/update-user-role/index.ts"
      change: "Use full_name from app_metadata for auto-actor (with email fallback)"
    - path: "supabase/functions/update-user-name/index.ts"
      change: "NEW edge function for self-name-update"
  database:
    - path: "supabase/migrations/NNN_add_user_name.sql"
      change: "Add user_name TEXT DEFAULT NULL to activity_log; update list_ward_users RPC to return full_name"

# =============================================================================
# ASSUMPTIONS
# =============================================================================
assumptions:
  - id: A-1
    description: >
      full_name is stored in app_metadata.full_name in Supabase Auth,
      alongside existing ward_id and role fields.
    confirmed: false
    default_if_not_confirmed: >
      Use app_metadata.full_name. Consistent with existing pattern.

  - id: A-2
    description: >
      The Name field appears as the first input in self-registration
      (before Email), as it is the primary personal identifier.
    confirmed: false
    default_if_not_confirmed: >
      Place Name field first, before Email.

  - id: A-3
    description: >
      Users can only edit their own name. Bishopric and Secretary cannot
      edit another user's name from the Users screen.
    confirmed: false
    default_if_not_confirmed: >
      Only self-editing allowed.

  - id: A-4
    description: >
      activity_log.user_name is nullable TEXT with default NULL, allowing
      legacy entries to remain with NULL user_name.
    confirmed: false
    default_if_not_confirmed: >
      Add user_name TEXT DEFAULT NULL. Display falls back to user_email.

  - id: A-5
    description: >
      Name editing in Users screen uses inline TextInput in the expanded
      card, similar to the existing email display field.
    confirmed: false
    default_if_not_confirmed: >
      Use inline TextInput with explicit save button for self-edit.

  - id: A-6
    description: >
      A new edge function 'update-user-name' is created rather than
      extending an existing one.
    confirmed: false
    default_if_not_confirmed: >
      Create new edge function for clarity and single-responsibility.

  - id: A-7
    description: >
      The invite registration screen Name field is editable (not read-only).
    confirmed: true
    evidence: >
      CR-81 states name must be collected during registration. The invitee
      enters their own name.

  - id: A-8
    description: >
      create-invitation auto-actor keeps using email prefix (name not known
      at invite time). No retroactive update when user registers.
    confirmed: false
    default_if_not_confirmed: >
      Keep email-prefix behavior. User can edit actor name manually.

  - id: A-9
    description: >
      register-first-user currently does NOT auto-create actors. This
      feature adds auto-actor creation for bishopric role using fullName.
    confirmed: true
    evidence: >
      Code inspection of register-first-user/index.ts confirms no actor
      creation logic exists. Only create-invitation and update-user-role
      have auto-actor creation.

# =============================================================================
# OPEN QUESTIONS
# =============================================================================
open_questions:
  - id: Q-1
    question: >
      Should the Name field use a single 'fullName' field or separate
      'firstName'/'lastName' fields?
    proposed_default: >
      Single fullName field. CR-81 says "O campo Nome e esperado que receba
      o nome completo da pessoa" confirming a single field.

  - id: Q-2
    question: >
      Where exactly should the Name field be positioned in the invite
      registration form? After the read-only fields and before password?
    proposed_default: >
      After the read-only fields (stake, ward, role, email), before password.
      This groups editable fields together.

  - id: Q-3
    question: >
      When a user edits their name, should the corresponding Meeting Actor
      name (if one exists) also be updated automatically?
    proposed_default: >
      No. User name and actor name are separate concepts. User edits actor
      name via ActorSelector independently.

  - id: Q-4
    question: >
      Should the activity_log search in history.tsx also search the user_name
      field?
    proposed_default: >
      Yes. The useActivityLog hook should include user_name in the search
      filter for consistency.

  - id: Q-5
    question: >
      Should the existing logAction callers (useActors, useMembers,
      useSpeeches, useAgenda, useTopics, useSundayTypes) be updated to
      pass user_name, or should logAction fetch it from the session?
    proposed_default: >
      Update callers to pass user_name. The user's app_metadata.full_name is
      available from the AuthContext (user.app_metadata.full_name). This keeps
      logAction a simple insert function without auth dependencies.

# =============================================================================
# DEFINITION OF DONE
# =============================================================================
definition_of_done:
  - "Name field is present and mandatory in self-registration screen"
  - "Name field is present and mandatory in invite registration screen"
  - "register-first-user accepts/stores fullName and auto-creates actor for bishopric"
  - "register-invited-user accepts/stores fullName in app_metadata"
  - "list_ward_users RPC returns full_name from app_metadata"
  - "list-users edge function response includes full_name"
  - "Users screen displays user name as primary text, email as secondary"
  - "Users can edit their own name from expanded user card"
  - "update-user-name edge function created and functional"
  - "activity_log table has user_name column (nullable)"
  - "logAction utility sends user_name alongside user_email"
  - "Activity Log screen shows user_name (with email fallback for legacy)"
  - "Auto-actor in update-user-role uses full_name (with email fallback)"
  - "Auto-actor in register-first-user uses fullName for bishopric"
  - "All new i18n keys translated in pt-BR, en, and es"
  - "Backward compat: no crashes for existing users without a name"
  - "No regressions in existing registration, user management, or activity log"
```
