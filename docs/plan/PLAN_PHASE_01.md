# PLAN_PHASE_01 - Foundation

```yaml
type: plan
version: 1
phase: 1
title: "Foundation (Database, Auth, Permissions, i18n, Theme)"

goal: "Establish the project skeleton, database schema with RLS, authentication flows, permissions system, internationalization, and theming -- the base upon which all features depend."

strategy:
  order: "Project setup -> DB schema -> Auth context -> Login -> Self-registration -> Invite registration -> Permissions -> i18n -> Theme -> App shell"
  commit_strategy: "1 commit per step, conventional commits"
  test_strategy: "Unit tests for pure functions (permissions, date utils); integration tests for auth flows"
```

## Steps

```yaml
steps:
  - id: STEP-01-01
    description: "Initialize Expo project with SDK 54, TypeScript, Expo Router, and core dependencies (TanStack Query, Supabase client, react-i18next, react-native-reanimated, react-native-gesture-handler, expo-linking, AsyncStorage)"
    files:
      - "package.json"
      - "tsconfig.json"
      - "app.json"
      - "babel.config.js"
      - "src/app/_layout.tsx"
    dependencies: []
    parallelizable_with: []
    done_when:
      - "npx expo start runs without errors"
      - "TypeScript compiles cleanly"
      - "All dependencies listed in package.json"
      - "Root _layout.tsx renders a placeholder"
    tests:
      - type: unit
        description: "Smoke test: app renders root layout"
    covers:
      acceptance_criteria: []
      edge_cases: []
    risks:
      - risk: "Expo SDK 54 version conflicts with some libraries"
        mitigation: "Pin exact versions; verify compatibility matrix"

  - id: STEP-01-02
    description: "Create Supabase project configuration and database migration for ALL tables: wards, members, ward_topics, general_collections, general_topics, ward_collection_config, sunday_exceptions, speeches, meeting_actors, hymns, sunday_agendas, activity_log, invitations, device_push_tokens, notification_queue. Include all constraints, indexes, and unique keys."
    files:
      - "supabase/config.toml"
      - "supabase/migrations/001_initial_schema.sql"
      - "src/lib/supabase.ts"
    dependencies: ["STEP-01-01"]
    parallelizable_with: []
    done_when:
      - "supabase db push applies migration without errors"
      - "All tables created with correct columns and types"
      - "Unique constraints in place: (stake_name, name), (ward_id, country_code, phone), (ward_id, date), (language, number), (ward_id, sunday_date, position), (ward_id, sunday_date) for agendas, (token) for invitations"
      - "Supabase client initialized in lib/supabase.ts"
    tests:
      - type: integration
        description: "Verify migration applies; tables exist with correct columns"
    covers:
      acceptance_criteria: []
      edge_cases: []
    risks:
      - risk: "Missing column or wrong type discovered later"
        mitigation: "Create comprehensive migration covering all ARCH data models; use numbered migrations for changes"

  - id: STEP-01-03
    description: "Create Row-Level Security (RLS) policies for all tables. Ward-scoped tables: SELECT/INSERT/UPDATE/DELETE where ward_id = auth.jwt()->app_metadata->ward_id. Global tables (hymns, general_collections, general_topics): SELECT only for authenticated users. Activity log: ward-scoped SELECT + INSERT only. Device push tokens: user_id = auth.uid()."
    files:
      - "supabase/migrations/002_rls_policies.sql"
    dependencies: ["STEP-01-02"]
    parallelizable_with: []
    done_when:
      - "RLS enabled on all tables"
      - "Ward-scoped tables filter by ward_id from JWT app_metadata"
      - "Global tables allow only SELECT for authenticated"
      - "Cross-ward access returns 0 rows (not error)"
      - "Unauthenticated requests return 401"
    tests:
      - type: integration
        description: "Test RLS: user A cannot see user B's ward data; unauthenticated gets 401"
    covers:
      acceptance_criteria: ["AC-040", "AC-008"]
      edge_cases: ["EC-008"]
    risks:
      - risk: "RLS policy misconfiguration leaks data"
        mitigation: "Automated tests with two different ward users; test cross-ward access"

  - id: STEP-01-04
    description: "Create AuthContext with Supabase session management. Extract role and wardId from app_metadata. Provide signIn, signOut, hasPermission. Handle session refresh automatically. Redirect unauthenticated users to login."
    files:
      - "src/contexts/AuthContext.tsx"
      - "src/lib/permissions.ts"
    dependencies: ["STEP-01-02"]
    parallelizable_with: ["STEP-01-03"]
    done_when:
      - "AuthContext provides session, user, role, wardId, loading, signIn, signOut, hasPermission"
      - "signIn calls supabase.auth.signInWithPassword"
      - "signOut calls supabase.auth.signOut"
      - "Session refresh handled by Supabase SDK"
      - "Unauthenticated state detected and redirects to login"
    tests:
      - type: unit
        description: "Test AuthContext: signIn sets session; signOut clears; hasPermission returns correct values per role"
    covers:
      acceptance_criteria: ["AC-041"]
      edge_cases: []
    risks:
      - risk: "app_metadata not available on first render"
        mitigation: "Wait for onAuthStateChange before rendering children"

  - id: STEP-01-05
    description: "Implement permissions map (lib/permissions.ts) with all Permission types and role-to-permission mapping. All 24 permissions for 3 roles (bishopric, secretary, observer)."
    files:
      - "src/lib/permissions.ts"
    dependencies: ["STEP-01-04"]
    parallelizable_with: []
    done_when:
      - "Role type: 'bishopric' | 'secretary' | 'observer'"
      - "24 Permission types defined"
      - "hasPermission(role, perm) returns correct boolean for every combination"
      - "getPermissions(role) returns all permissions for a role"
      - "Bishopric: speech:assign, speech:unassign, speech:change_status, member:read, member:write, member:import, topic:write, collection:toggle, sunday_type:write, settings:access, settings:language, settings:whatsapp, settings:users, invite:manage, home:next_assignments, agenda:read, agenda:write, agenda:assign_speaker, presentation:start, push:receive, invitation:create, history:read"
      - "Secretary: same minus speech:assign, speech:unassign, settings:users, home:next_assignments; plus home:invite_mgmt"
      - "Observer: member:read, agenda:read, presentation:start only"
    tests:
      - type: unit
        description: "Exhaustive test of all role-permission combinations from F023 permission matrix"
    covers:
      acceptance_criteria: []
      edge_cases: []
    risks:
      - risk: "Permission missed or wrong"
        mitigation: "Test every cell of the F023 permission matrix"

  - id: STEP-01-06
    description: "Create LoginScreen with email/password fields, password manager support (textContentType, autoComplete), and sign-in flow. Include login title/subtitle from i18n. Add 'Create account for first user of a Ward' link."
    files:
      - "src/app/(auth)/login.tsx"
    dependencies: ["STEP-01-04"]
    parallelizable_with: ["STEP-01-05"]
    done_when:
      - "Email field: textContentType='emailAddress', autoComplete='email'"
      - "Password field: textContentType='password', autoComplete='password', secureTextEntry"
      - "Login title: 'Gerenciador da Reuniao Sacramental' (i18n)"
      - "Login subtitle: 'discursos e agenda' (i18n)"
      - "Successful login -> navigates to Home (tabs)"
      - "Failed login -> error message"
      - "'Create account' link navigates to register screen"
      - "Password manager autofill works on iOS and Android"
    tests:
      - type: unit
        description: "Test login screen renders correct fields; submit calls signIn; error handling"
    covers:
      acceptance_criteria: ["AC-CR024-1", "AC-CR025-1", "AC-CR025-2"]
      edge_cases: []
    risks:
      - risk: "Password manager autofill varies by OS"
        mitigation: "Use standard textContentType values; test on both platforms"

  - id: STEP-01-07
    description: "Create Edge Function 'register-first-user' and SelfRegistrationScreen. Form: email, password, confirm password, stake, ward, role (Bishopric/Secretary only), language, timezone (auto-detect). EF creates ward + user + Ward Topics collection."
    files:
      - "supabase/functions/register-first-user/index.ts"
      - "src/app/(auth)/register.tsx"
    dependencies: ["STEP-01-06"]
    parallelizable_with: []
    done_when:
      - "Self-registration form renders all fields"
      - "Role dropdown: only Bishopric and Secretary (no Observer)"
      - "Timezone auto-detected from device, editable, IANA format"
      - "Edge Function: validates email uniqueness, stake+ward uniqueness"
      - "Edge Function: creates ward record with language/timezone/default whatsapp template"
      - "Edge Function: creates user with app_metadata {ward_id, role}"
      - "Edge Function: creates 'Temas da Ala' collection (ward_collection_config active=true)"
      - "On success: auto-login + redirect to Home"
      - "Password < 6 chars: validation prevents submission"
      - "Passwords don't match: validation prevents submission"
    tests:
      - type: integration
        description: "Test register flow: valid data -> ward + user created; duplicate email -> error; duplicate stake+ward -> error; password validation"
    covers:
      acceptance_criteria: ["AC-REG-001", "AC-REG-002", "AC-REG-003", "AC-REG-004", "AC-REG-005", "AC-REG-006"]
      edge_cases: ["EC-REG-001", "EC-REG-002", "EC-REG-007"]
    risks:
      - risk: "Race condition on stake+ward uniqueness check"
        mitigation: "Database unique constraint (stake_name, name) as final guard"

  - id: STEP-01-08
    description: "Create Edge Function 'register-invited-user' and InviteRegistrationScreen. Handle deep link wardmanager://invite/{token}. Screen shows read-only data from invitation (stake, ward, role, email). User sets password."
    files:
      - "supabase/functions/register-invited-user/index.ts"
      - "src/app/(auth)/invite/[token].tsx"
    dependencies: ["STEP-01-07"]
    parallelizable_with: []
    done_when:
      - "Deep link wardmanager://invite/{token} routes to InviteRegistrationScreen"
      - "Screen validates token via Edge Function -> shows read-only fields (stake, ward, role, email)"
      - "User fills password + confirm password"
      - "On Create: EF validates token not expired (30 days), not used"
      - "EF creates user, sets used_at on invitation"
      - "On success: auto-login + redirect to Home"
      - "Expired token: error 'Invitation expired. Request a new invitation.'"
      - "Used token: error 'This invitation has already been used.'"
      - "Invalid token: error 'Invalid invitation.'"
    tests:
      - type: integration
        description: "Test invite registration: valid token -> user created; expired -> error; used -> error; invalid -> error"
    covers:
      acceptance_criteria: ["AC-REG-008", "AC-REG-009", "AC-REG-010", "AC-REG-011"]
      edge_cases: ["EC-REG-003", "EC-REG-004", "EC-REG-006", "EC-REG-008"]
    risks:
      - risk: "Deep link not working on all platforms"
        mitigation: "Test expo-linking on iOS and Android; configure URL scheme in app.json"

  - id: STEP-01-09
    description: "Set up react-i18next with locale files for pt-BR, en, es. Include all UI strings: buttons, labels, placeholders, error messages, status names, exception names, date formats. Language detection: ward setting -> device locale -> pt-BR default."
    files:
      - "src/i18n/index.ts"
      - "src/i18n/locales/pt-BR.json"
      - "src/i18n/locales/en.json"
      - "src/i18n/locales/es.json"
    dependencies: ["STEP-01-01"]
    parallelizable_with: ["STEP-01-02", "STEP-01-03", "STEP-01-04"]
    done_when:
      - "react-i18next initialized with 3 locales"
      - "All static UI text uses t() function"
      - "Login title/subtitle translated"
      - "Status names translated: Not-assigned, Assigned/Not-Invited, Assigned/Invited, Assigned/Confirmed, Gave Up"
      - "Exception names translated: Testimony Meeting, General Conference, etc."
      - "Date formats adapted: '08 FEV' (pt), 'FEB 08' (en), '08 FEB' (es)"
      - "Language detection chain: ward -> device -> pt-BR"
    tests:
      - type: unit
        description: "Test i18n: each locale loads; key coverage across all 3 languages; date format helpers"
    covers:
      acceptance_criteria: ["AC-019"]
      edge_cases: []
    risks:
      - risk: "Missing translation keys in some language"
        mitigation: "Test that all keys in pt-BR exist in en and es"

  - id: STEP-01-10
    description: "Implement ThemeContext with dark/light mode. System detection via useColorScheme, manual toggle (Automatic/Light/Dark), persist preference in AsyncStorage. WCAG AA contrast for both modes."
    files:
      - "src/contexts/ThemeContext.tsx"
    dependencies: ["STEP-01-01"]
    parallelizable_with: ["STEP-01-02", "STEP-01-03", "STEP-01-04", "STEP-01-09"]
    done_when:
      - "ThemeContext provides mode, toggleMode, colors"
      - "3 options: Automatic, Light, Dark"
      - "Automatic follows OS theme in real-time via useColorScheme"
      - "Preference persisted in AsyncStorage (per device)"
      - "useColorScheme returning null -> fallback to light with log"
      - "Smooth transition between modes (no flash)"
      - "Observer uses system mode only"
    tests:
      - type: unit
        description: "Test ThemeContext: mode changes; persistence; null fallback; color contrast meets WCAG AA"
    covers:
      acceptance_criteria: ["AC-CR002-1", "AC-CR002-2", "AC-CR002-3", "AC-CR002-4", "AC-CR002-5"]
      edge_cases: ["EC-CR022-1"]
    risks:
      - risk: "Color flash on app start before AsyncStorage loads"
        mitigation: "Show splash screen until theme loaded"

  - id: STEP-01-11
    description: "Create App Shell with Expo Router tab navigator (Home, Agenda, Speeches, Settings). Settings tab hidden for Observer. Auth layout group for login/register. Root layout with providers (AuthContext, ThemeContext, I18nProvider, QueryClientProvider)."
    files:
      - "src/app/_layout.tsx"
      - "src/app/(auth)/_layout.tsx"
      - "src/app/(tabs)/_layout.tsx"
      - "src/app/(tabs)/index.tsx"
      - "src/app/(tabs)/agenda.tsx"
      - "src/app/(tabs)/speeches.tsx"
      - "src/app/(tabs)/settings/_layout.tsx"
      - "src/app/(tabs)/settings/index.tsx"
    dependencies: ["STEP-01-04", "STEP-01-09", "STEP-01-10"]
    parallelizable_with: []
    done_when:
      - "Root layout wraps all providers: QueryClient, AuthContext, ThemeContext, I18nProvider"
      - "Unauthenticated -> (auth) layout with login/register"
      - "Authenticated -> (tabs) layout with 4 tabs"
      - "Settings tab hidden when role === 'observer'"
      - "Tab icons and labels translated"
      - "Navigation between tabs works"
    tests:
      - type: unit
        description: "Test navigation: unauthenticated goes to login; authenticated sees tabs; observer has no Settings"
    covers:
      acceptance_criteria: []
      edge_cases: []
    risks:
      - risk: "Expo Router group nesting complexity"
        mitigation: "Follow Expo Router docs precisely; test navigation flows"

  - id: STEP-01-12
    description: "Create utility functions: dateUtils.ts (sunday detection, date formatting per locale, date range generation, month abbreviations), Supabase type definitions for all tables."
    files:
      - "src/lib/dateUtils.ts"
      - "src/types/database.ts"
    dependencies: ["STEP-01-02"]
    parallelizable_with: ["STEP-01-04", "STEP-01-09", "STEP-01-10"]
    done_when:
      - "isSunday(date) correctly detects sundays"
      - "formatDate(date, locale) returns locale-specific format ('08 FEV', 'FEB 08', '08 FEB')"
      - "generateSundayRange(start, end) returns all sundays in range"
      - "getMonthAbbr(month, locale) returns 3-letter abbreviation"
      - "zeroPadDay(day) returns '08' for 8"
      - "TypeScript types for all DB tables match migration schema"
    tests:
      - type: unit
        description: "Test dateUtils: sunday detection, formatting across locales, range generation, edge cases (year boundaries)"
    covers:
      acceptance_criteria: []
      edge_cases: []
    risks:
      - risk: "Timezone issues with date calculations"
        mitigation: "Use IANA timezone throughout; test with multiple timezones"
```

## Validation

```yaml
validation:
  - ac_id: AC-041
    how_to_verify: "Unauthenticated user accessing any route is redirected to login"
    covered_by_steps: ["STEP-01-04", "STEP-01-11"]
  - ac_id: AC-CR024-1
    how_to_verify: "Login screen shows translated title and subtitle"
    covered_by_steps: ["STEP-01-06"]
  - ac_id: AC-CR025-1
    how_to_verify: "iOS password manager shows autofill on login"
    covered_by_steps: ["STEP-01-06"]
  - ac_id: AC-CR025-2
    how_to_verify: "Android password manager shows autofill on login"
    covered_by_steps: ["STEP-01-06"]
  - ac_id: AC-REG-001
    how_to_verify: "Clicking 'Create account' on login navigates to self-registration"
    covered_by_steps: ["STEP-01-07"]
  - ac_id: AC-REG-002
    how_to_verify: "Valid self-registration creates ward + user + auto-login + redirect Home"
    covered_by_steps: ["STEP-01-07"]
  - ac_id: AC-REG-003
    how_to_verify: "Duplicate stake+ward returns error"
    covered_by_steps: ["STEP-01-07"]
  - ac_id: AC-REG-004
    how_to_verify: "Duplicate email returns error"
    covered_by_steps: ["STEP-01-07"]
  - ac_id: AC-REG-005
    how_to_verify: "Password < 6 chars prevents submission"
    covered_by_steps: ["STEP-01-07"]
  - ac_id: AC-REG-006
    how_to_verify: "Mismatched passwords prevent submission"
    covered_by_steps: ["STEP-01-07"]
  - ac_id: AC-REG-008
    how_to_verify: "Deep link opens invite registration with read-only fields"
    covered_by_steps: ["STEP-01-08"]
  - ac_id: AC-REG-009
    how_to_verify: "Valid invite registration creates user + auto-login + redirect"
    covered_by_steps: ["STEP-01-08"]
  - ac_id: AC-REG-010
    how_to_verify: "Expired token shows error"
    covered_by_steps: ["STEP-01-08"]
  - ac_id: AC-REG-011
    how_to_verify: "Used token shows error"
    covered_by_steps: ["STEP-01-08"]
  - ac_id: AC-040
    how_to_verify: "Backend filters all requests by ward_id"
    covered_by_steps: ["STEP-01-03"]
  - ac_id: AC-008
    how_to_verify: "Cross-ward access returns 403"
    covered_by_steps: ["STEP-01-03"]
  - ac_id: AC-019
    how_to_verify: "Language selector shows 3 options"
    covered_by_steps: ["STEP-01-09"]
  - ac_id: AC-CR002-1
    how_to_verify: "System dark mode -> app dark"
    covered_by_steps: ["STEP-01-10"]
  - ac_id: AC-CR002-2
    how_to_verify: "System light mode -> app light"
    covered_by_steps: ["STEP-01-10"]
  - ac_id: AC-CR002-3
    how_to_verify: "Settings shows 3 theme options"
    covered_by_steps: ["STEP-01-10"]
  - ac_id: AC-CR002-4
    how_to_verify: "Selecting Dark persists and applies"
    covered_by_steps: ["STEP-01-10"]
  - ac_id: AC-CR002-5
    how_to_verify: "Automatic follows system in real-time"
    covered_by_steps: ["STEP-01-10"]
```
