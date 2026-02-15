# PLAN_PHASE_06 - Admin & Polish

```yaml
type: plan
version: 1
phase: 6
title: "Admin & Polish (User Management, Activity Log, CSV Import/Export, WhatsApp Template, Hardening)"

goal: "Implement administrative features: user management (list, invite, role change, delete), activity log with search, member CSV import/export, WhatsApp template editor, and final hardening (error boundaries, exit confirmation, timezone/settings screens)."

strategy:
  order: "User management Edge Functions -> User management screen -> Activity log hooks -> Activity log screen -> CSV import/export -> WhatsApp template editor -> Settings screens -> Hardening"
  commit_strategy: "1 commit per step, conventional commits"
  test_strategy: "Integration tests for Edge Functions; unit tests for components; E2E for full user flows"
```

## Steps

```yaml
steps:
  - id: STEP-06-01
    description: "Create Edge Functions for user management: create-invitation (generate token + deep link), list-users (ward users with email/role), update-user-role (change role, cannot change own), delete-user (hard delete from auth). All verify JWT and validate role/ward_id."
    files:
      - "supabase/functions/create-invitation/index.ts"
      - "supabase/functions/list-users/index.ts"
      - "supabase/functions/update-user-role/index.ts"
      - "supabase/functions/delete-user/index.ts"
    dependencies: ["STEP-01-02", "STEP-01-04"]
    parallelizable_with: []
    done_when:
      - "create-invitation: validates JWT, creates invitation with token + deep link (wardmanager://invite/{token}), 30-day expiry"
      - "list-users: returns all ward users with email and role, sorted by creation date"
      - "update-user-role: validates not changing own role, warns on last Bishopric, updates app_metadata"
      - "delete-user: validates not deleting self, hard deletes from Supabase Auth"
      - "All functions: verify JWT, extract ward_id and role from app_metadata"
      - "Resend invitation: new token for same email, previous remains"
    tests:
      - type: integration
        description: "Test each Edge Function: valid calls, error cases, authorization checks"
    covers:
      acceptance_criteria: ["AC-042", "AC-REG-007", "AC-REG-012"]
      edge_cases: ["EC-CR003-1", "EC-CR003-2", "EC-CR003-3", "EC-CR003-4", "EC-CR003-5", "EC-CR003-6", "EC-REG-005"]
    risks:
      - risk: "Race condition on last Bishopric check"
        mitigation: "Use transaction to check + update atomically"

  - id: STEP-06-02
    description: "Create UserManagementScreen in Settings tab. List all ward users (email + role), sorted by creation. Expandable card: email (read-only), role selector, 'Remove' button. Own user: role selector disabled, remove hidden. Invite button: form with email + role dropdown."
    files:
      - "src/app/(tabs)/settings/users.tsx"
    dependencies: ["STEP-06-01"]
    parallelizable_with: []
    done_when:
      - "Users card visible only for Bishopric (permission settings:users)"
      - "Lists all ward users with email and role"
      - "Expandable: email read-only, role selector, Remove button"
      - "Own user: selector disabled, remove hidden"
      - "Invite button: email (required) + role dropdown (Bishopric, Secretary, Observer)"
      - "On invite: deep link generated and copied/shared"
      - "Secretary: can invite (invitation:create) but NOT see Users card"
      - "Remove: confirmation dialog, hard delete"
      - "Removed user logged in elsewhere: 401 on next request -> redirect to login"
      - "Role change: via Edge Function, warns on last Bishopric"
      - "Offline: error 'Requires connection'"
    tests:
      - type: unit
        description: "Test UserManagementScreen: role visibility, invite flow, role change, self-protection"
    covers:
      acceptance_criteria: ["AC-042", "AC-REG-007", "AC-REG-012"]
      edge_cases: ["EC-CR003-1", "EC-CR003-2", "EC-CR003-3", "EC-CR003-4", "EC-CR003-5", "EC-CR003-6", "EC-REG-005"]
    risks:
      - risk: "Deleted user's active session not immediately invalidated"
        mitigation: "Session check on next API call returns 401; redirect to login"

  - id: STEP-06-03
    description: "Create useActivityLog hook with infinite scroll pagination and real-time search. Search filters: datetime, email, description (case-insensitive, accent-insensitive, debounce 200-300ms). Permission: history:read (Bishopric + Secretary only)."
    files:
      - "src/hooks/useActivityLog.ts"
    dependencies: ["STEP-01-02", "STEP-01-04"]
    parallelizable_with: ["STEP-06-01"]
    done_when:
      - "useActivityLog(search?) returns paginated entries sorted by datetime DESC"
      - "Infinite scroll pagination (useInfiniteQuery)"
      - "Search filters on 3 fields: datetime, email, description"
      - "Case-insensitive, accent-insensitive"
      - "Debounce 200-300ms"
      - "Permission check: history:read"
    tests:
      - type: unit
        description: "Test useActivityLog: pagination, search filtering, permission check"
    covers:
      acceptance_criteria: ["AC-HIST-003", "AC-HIST-004"]
      edge_cases: ["EC-HIST-001"]
    risks:
      - risk: "Performance with thousands of entries"
        mitigation: "Index on (ward_id, created_at DESC); server-side pagination"

  - id: STEP-06-04
    description: "Create ActivityLogScreen in Settings tab. Display entries: datetime (YYYY-MM-DD HH:MM in ward TZ), email, description (multiline). Read-only (no edit/delete). Visible for Bishopric and Secretary; Observer does NOT see. Search field at top."
    files:
      - "src/app/(tabs)/settings/history.tsx"
    dependencies: ["STEP-06-03"]
    parallelizable_with: []
    done_when:
      - "History card visible for Bishopric and Secretary (history:read)"
      - "Observer: History card NOT visible"
      - "List sorted by datetime DESC (most recent first)"
      - "Entry display: datetime (YYYY-MM-DD HH:MM ward TZ), email, description"
      - "Description: multiple lines (no truncation)"
      - "No edit/delete controls (read-only)"
      - "Search field at top: filters real-time"
      - "No results: message 'No results found'"
    tests:
      - type: unit
        description: "Test ActivityLogScreen: visibility per role, entry rendering, search, read-only"
    covers:
      acceptance_criteria: ["AC-HIST-001", "AC-HIST-002", "AC-HIST-003", "AC-HIST-004", "AC-HIST-007", "AC-HIST-008"]
      edge_cases: ["EC-HIST-002"]
    risks:
      - risk: "Large list rendering performance"
        mitigation: "FlatList with getItemLayout; server-side pagination"

  - id: STEP-06-05
    description: "Implement activity logging throughout the application. Log all user actions that persist to DB. Generate readable description in ward language. DO NOT log automatic system actions (auto-assignment, lazy creation, push processing, token registration)."
    files:
      - "src/lib/activityLog.ts"
      - "src/hooks/useMembers.ts"
      - "src/hooks/useTopics.ts"
      - "src/hooks/useSpeeches.ts"
      - "src/hooks/useAgenda.ts"
      - "src/hooks/useActors.ts"
      - "src/hooks/useSundayTypes.ts"
    dependencies: ["STEP-06-04"]
    parallelizable_with: []
    done_when:
      - "activityLog.ts: logAction(type, description) helper"
      - "Logged: member:create/update/delete/import, topic:create/update/delete, collection:activate/deactivate"
      - "Logged: sunday_type:change, speech:assign/unassign/status_change"
      - "Logged: user:self_register/invite/register_via_invite/role_change/delete"
      - "Logged: settings:language/timezone/whatsapp_template"
      - "Logged: agenda:edit, actor:create/update/delete"
      - "NOT logged: auto-assignment, lazy creation, push processing, token registration, invalid token cleanup"
      - "Description in ward language at time of action (snapshot)"
      - "Offline: log created when mutation syncs with server"
    tests:
      - type: integration
        description: "Test logging: each action type creates entry; auto actions do NOT create entry"
    covers:
      acceptance_criteria: ["AC-HIST-005", "AC-HIST-006"]
      edge_cases: ["EC-HIST-003", "EC-HIST-004"]
    risks:
      - risk: "Missed logging for some action"
        mitigation: "Centralize logging in hooks; test each action type"

  - id: STEP-06-06
    description: "Implement activity log retention: 2-year automatic removal via PostgreSQL scheduled job. Remove entries with created_at < now() - 2 years."
    files:
      - "supabase/migrations/005_activity_log_retention.sql"
    dependencies: ["STEP-06-05"]
    parallelizable_with: []
    done_when:
      - "PostgreSQL scheduled function runs periodically (daily or weekly)"
      - "Deletes activity_log entries older than 2 years"
      - "Newer entries intact"
      - "No user-facing impact"
    tests:
      - type: integration
        description: "Test retention: entries older than 2 years removed; newer preserved"
    covers:
      acceptance_criteria: ["AC-HIST-009"]
      edge_cases: ["EC-HIST-005"]
    risks:
      - risk: "Retention job deletes too much if clock is wrong"
        mitigation: "Use server time (now()); test with known dates"

  - id: STEP-06-07
    description: "Create Member CSV Import/Export screen. Export: generates CSV (Nome, Telefone Completo) downloadable on web (Blob) and mobile (expo-file-system + expo-sharing). Import: total overwrite (DELETE all + INSERT new) within transaction; validate format, required fields, phone format, no duplicates; error with line/field on invalid."
    files:
      - "src/app/(tabs)/settings/members.tsx"
      - "src/hooks/useMembers.ts"
    dependencies: ["STEP-02-02"]
    parallelizable_with: ["STEP-06-01", "STEP-06-03"]
    done_when:
      - "Import/Export section accessible from Settings > 'Overwrite Members List' card"
      - "Export: CSV with 'Nome' and 'Telefone Completo' columns"
      - "Web export: Blob download as 'membros.csv'"
      - "Mobile export: expo-file-system + expo-sharing"
      - "Import: file picker (web: file input .csv; mobile: expo-document-picker)"
      - "Validation: required fields, phone format (+xxyyyyyyyy), no duplicates"
      - "Invalid CSV: no changes + detailed error with line/field"
      - "Valid CSV: DELETE all + INSERT new (transaction)"
      - "Success message on import"
      - "Speech snapshots preserved (ADR-004)"
    tests:
      - type: unit
        description: "Test CSV: export format, import validation, overwrite logic, error reporting"
    covers:
      acceptance_criteria: ["AC-009", "AC-010", "AC-011"]
      edge_cases: ["EC-002", "EC-007"]
    risks:
      - risk: "Large CSV file handling on mobile"
        mitigation: "Process in chunks; show progress indicator"

  - id: STEP-06-08
    description: "Create WhatsApp Template editor screen in Settings. Real-time preview with placeholders. Placeholders: {nome}, {data}, {posicao}, {duracao}, {colecao}, {titulo}, {link}. Template saved per ward (wards.whatsapp_template). Default template per language."
    files:
      - "src/app/(tabs)/settings/whatsapp.tsx"
    dependencies: ["STEP-01-04", "STEP-03-11"]
    parallelizable_with: ["STEP-06-01", "STEP-06-03"]
    done_when:
      - "WhatsApp Template card in Settings (Bishopric + Secretary)"
      - "Text editor with real-time preview"
      - "Preview resolves placeholders with sample data"
      - "7 placeholders supported: {nome}, {data}, {posicao}, {duracao}, {colecao}, {titulo}, {link}"
      - "Auto-save on changes"
      - "Template stored in wards.whatsapp_template"
      - "Default template per language set on ward creation"
    tests:
      - type: unit
        description: "Test WhatsApp template: editor, preview, placeholder resolution, save"
    covers:
      acceptance_criteria: ["AC-043"]
      edge_cases: []
    risks:
      - risk: "Malformed template breaks WhatsApp message"
        mitigation: "Preview shows exactly what user will send; validate placeholders"

  - id: STEP-06-09
    description: "Final hardening: add error boundaries per module, toast notifications for user-facing errors, exit confirmation dialog, timezone selector in Settings, and Settings index screen with all cards (Members, Topics, Users, History, WhatsApp Template, Language, Theme, Timezone)."
    files:
      - "src/app/(tabs)/settings/index.tsx"
      - "src/components/ErrorBoundary.tsx"
      - "src/components/ExitConfirmation.tsx"
    dependencies: ["STEP-06-02", "STEP-06-04", "STEP-06-07", "STEP-06-08"]
    parallelizable_with: []
    done_when:
      - "Settings index: all cards listed with correct visibility per role"
      - "Members, Topics, Actors: Bishopric + Secretary"
      - "Users: Bishopric only"
      - "History: Bishopric + Secretary"
      - "WhatsApp Template: Bishopric + Secretary"
      - "Language, Timezone, Theme: Bishopric + Secretary"
      - "Observer: no Settings tab access"
      - "Error boundaries: per module, graceful error display"
      - "Toast notifications: user-facing error messages"
      - "Exit confirmation: dialog before closing app (BackHandler)"
      - "Timezone selector: IANA format, editable"
      - "Invite button accessible to Secretary (outside Users card)"
    tests:
      - type: e2e
        description: "Test Settings screen: all cards visible per role; error boundary catches; exit dialog works"
    covers:
      acceptance_criteria: []
      edge_cases: []
    risks:
      - risk: "Missing card or wrong visibility"
        mitigation: "Test all 3 roles against permission matrix"
```

## Validation

```yaml
validation:
  - ac_id: AC-042
    how_to_verify: "Bishopric/Secretary invites user: deep link generated"
    covered_by_steps: ["STEP-06-01", "STEP-06-02"]
  - ac_id: AC-REG-007
    how_to_verify: "Invite creates invitation with deep link"
    covered_by_steps: ["STEP-06-01", "STEP-06-02"]
  - ac_id: AC-REG-012
    how_to_verify: "Resend invitation creates new token"
    covered_by_steps: ["STEP-06-01"]
  - ac_id: AC-HIST-001
    how_to_verify: "History card visible for Bishopric/Secretary"
    covered_by_steps: ["STEP-06-04"]
  - ac_id: AC-HIST-002
    how_to_verify: "History card NOT visible for Observer"
    covered_by_steps: ["STEP-06-04"]
  - ac_id: AC-HIST-003
    how_to_verify: "History entries sorted by datetime DESC"
    covered_by_steps: ["STEP-06-03", "STEP-06-04"]
  - ac_id: AC-HIST-004
    how_to_verify: "History search filters on datetime, email, description"
    covered_by_steps: ["STEP-06-03", "STEP-06-04"]
  - ac_id: AC-HIST-005
    how_to_verify: "User actions logged with readable description"
    covered_by_steps: ["STEP-06-05"]
  - ac_id: AC-HIST-006
    how_to_verify: "Auto actions NOT logged"
    covered_by_steps: ["STEP-06-05"]
  - ac_id: AC-HIST-007
    how_to_verify: "Long description displayed multiline"
    covered_by_steps: ["STEP-06-04"]
  - ac_id: AC-HIST-008
    how_to_verify: "History is read-only"
    covered_by_steps: ["STEP-06-04"]
  - ac_id: AC-HIST-009
    how_to_verify: "Entries > 2 years removed"
    covered_by_steps: ["STEP-06-06"]
  - ac_id: AC-009
    how_to_verify: "Download CSV with Name and Full Phone"
    covered_by_steps: ["STEP-06-07"]
  - ac_id: AC-010
    how_to_verify: "Upload valid CSV replaces all members"
    covered_by_steps: ["STEP-06-07"]
  - ac_id: AC-011
    how_to_verify: "Upload invalid CSV: no changes, error with line/field"
    covered_by_steps: ["STEP-06-07"]
  - ac_id: AC-043
    how_to_verify: "Edit and save WhatsApp template"
    covered_by_steps: ["STEP-06-08"]
```
