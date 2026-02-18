# PLAN_CR004 - Change Requests Batch 4 (CR-44 to CR-75)

## PLAN_SUMMARY

```yaml
type: plan_summary
total_steps: 37
parallel_tracks: 4
estimated_commits: 37
coverage:
  acceptance_criteria: 43/43  # ACs from SPEC_CR4_F005 (10) + SPEC_CR4_F007 (14) + SPEC_CR4_F008 (19)
  edge_cases: 20/20  # ECs from SPEC_CR4_F005 (5) + SPEC_CR4_F007 (6) + SPEC_CR4_F008 (9)
critical_path:
  - "STEP-01: DB migration 009 - add 'speeches' to CHECK constraint (CR-56 foundation)"
  - "STEP-02: Fix speeches persistence in useSundayTypes.ts (CR-56 code fix)"
  - "STEP-03: Fix sunday type revert bug (CR-68 optimistic update fix)"
  - "STEP-09: Configure TanStack Query global error handlers (CR-61)"
  - "STEP-10: Add onError to all mutations (CR-57)"
  - "STEP-12: Create QueryErrorView + wire into tabs (CR-58)"
  - "STEP-19: Connect useConnection + useRealtimeSync + OfflineBanner (CR-52)"
main_risks:
  - "CR-56 migration must backfill 'speeches' records for sundays without entries"
  - "CR-52/53 connecting dead code may reveal runtime issues not caught by tests"
  - "CR-72 auto-creating actors in Edge Function requires DB insert with ON CONFLICT"
  - "CR-74 MemberSelectorModal custom name UX must not disrupt existing member selection"
  - "CR-61 QueryClient reconfiguration must not break existing query behavior"
```

---

## PLAN

```yaml
type: plan
version: 1

goal: "Execute 33 change requests (CR-44 to CR-75) across 9 feature groups: critical bug fixes (speeches persistence, sunday type revert), error handling overhaul, infrastructure integration (sync, offline, notifications), CSV/member fixes, auth improvements, agenda/actor enhancements, UI/UX polish, documentation updates, and a CLI script."

strategy:
  order: "Critical DB fix (CR-56) -> Error handling foundation (CR-61,57,58,59,60) -> UI/UX small fixes (CR-62,63,65,69,70) -> CSV/Members (CR-54,55,66) -> Auth (CR-64,67) -> Agenda/Actors (CR-71-75) -> Infrastructure (CR-52,53) -> CLI (CR-51) -> Docs (CR-44-50)"
  commit_strategy: "1 commit per step, conventional commits (fix:, feat:, chore:, test:, docs:)"
  test_strategy: "Tests alongside code; Vitest for unit + integration; manual verification for UI changes"
```

---

## Phase A: Critical Fixes & Error Handling Foundation (Steps 01-15)

### STEP-01: CR-56 Database Migration -- Add 'speeches' to CHECK Constraint

```yaml
- id: STEP-01
  description: "Create migration 009_add_speeches_to_reason_enum.sql. Drop old CHECK constraint, add new one including 'speeches'. Backfill: INSERT speeches records for all sundays in the active range (e.g., sundays from 6 months ago to 12 months ahead) that have no entry in sunday_exceptions."
  files:
    - "supabase/migrations/009_add_speeches_to_reason_enum.sql"
  dependencies: []
  parallelizable_with: []
  done_when:
    - "Migration drops old sunday_exceptions_reason_check constraint"
    - "New constraint allows: speeches, testimony_meeting, general_conference, stake_conference, ward_conference, primary_presentation, other"
    - "Retroactive INSERT of 'speeches' records for sundays without entries is included"
    - "Migration applies cleanly on fresh and existing databases"
  tests:
    - type: integration
      description: "Verify constraint accepts 'speeches'. Verify old values still pass. Verify invalid values are rejected."
  covers:
    acceptance_criteria: []
    edge_cases: []
  risks:
    - risk: "Backfill query may create many rows if date range is large"
      mitigation: "Scope backfill to wards that exist in the system using a JOIN or subquery"
```

### STEP-02: CR-56 Fix Speeches Persistence in useSundayTypes.ts

```yaml
- id: STEP-02
  description: "Remove the filter at useSundayTypes.ts:185 that blocks 'speeches' from being inserted. Remove 'if (type === SUNDAY_TYPE_SPEECHES) return null;'. Change the type cast to include SUNDAY_TYPE_SPEECHES as valid for DB insertion. Update SundayExceptionReason in database.ts if needed to include 'speeches'. Update useRemoveSundayException to INSERT a 'speeches' record instead of DELETE (revert = set to speeches, not remove entry)."
  files:
    - "src/hooks/useSundayTypes.ts"
    - "src/types/database.ts"
  dependencies: ["STEP-01"]
  parallelizable_with: []
  done_when:
    - "Line 185 filter removed: speeches entries are inserted into DB"
    - "SundayExceptionReason type includes 'speeches'"
    - "useRemoveSundayException now upserts 'speeches' instead of deleting the row"
    - "Auto-assign creates entries for ALL sundays including speeches type"
  tests:
    - type: unit
      description: "Verify useAutoAssignSundayTypes inserts 'speeches' entries. Verify useRemoveSundayException upserts to 'speeches'."
  covers:
    acceptance_criteria: []
    edge_cases: []
  risks:
    - risk: "useRemoveSundayException behavior change: from DELETE to UPSERT"
      mitigation: "Update optimistic update logic to set reason='speeches' instead of removing from array"
```

### STEP-03: CR-68 Fix Sunday Type Revert Bug (Optimistic Update Race Condition)

```yaml
- id: STEP-03
  description: "Fix the bug where selecting a different sunday type on a 'speeches' sunday reverts after 2 seconds. The issue is likely a race between optimistic update and auto-assign or stale query refetch. Ensure useSetSundayType's optimistic update does not get overwritten by a concurrent invalidation. Add proper cancelQueries before optimistic update. Verify the mutation's onSuccess doesn't trigger a refetch that overwrites the new value."
  files:
    - "src/hooks/useSundayTypes.ts"
  dependencies: ["STEP-02"]
  parallelizable_with: []
  done_when:
    - "Selecting a new sunday type on a 'speeches' sunday persists the change immediately"
    - "No revert happens after selection"
    - "Optimistic update is not overwritten by background refetch"
  tests:
    - type: unit
      description: "Verify useSetSundayType on a 'speeches' entry correctly updates to new type without revert"
  covers:
    acceptance_criteria: []
    edge_cases: []
  risks:
    - risk: "Root cause may be in auto-assign re-running and reinserting 'speeches'"
      mitigation: "Verify auto-assign only runs on sundays WITHOUT entries, not on sundays with entries"
```

### STEP-04: CR-62 About Screen Updates (Disclaimer + Author Name)

```yaml
- id: STEP-04
  description: "In the About screen (settings/about.tsx): (a) Add a disclaimer message 'This is not an official app of The Church of Jesus Christ of Latter-day Saints' (i18n in 3 languages). (b) Fix author name to 'Aloisio Almeida Jr'. Add i18n keys for the disclaimer in all 3 locales."
  files:
    - "src/app/(tabs)/settings/about.tsx"
    - "src/i18n/locales/pt-BR.json"
    - "src/i18n/locales/en.json"
    - "src/i18n/locales/es.json"
  dependencies: []
  parallelizable_with: ["STEP-05", "STEP-06", "STEP-07", "STEP-08"]
  done_when:
    - "Disclaimer text visible on About screen in current language"
    - "Author name shows 'Aloisio Almeida Jr'"
    - "i18n keys exist in all 3 locales"
  tests:
    - type: unit
      description: "Verify About screen renders disclaimer and correct author name"
  covers:
    acceptance_criteria: []
    edge_cases: []
  risks: []
```

### STEP-05: CR-63 Fix Default WhatsApp Template Text

```yaml
- id: STEP-05
  description: "Investigate and fix the default WhatsApp template text from CR-14 that is not being respected. Check the template in settings/whatsapp.tsx or the template generation logic. Ensure the default template matches what was specified in SPEC_CR2 (CR-14)."
  files:
    - "src/app/(tabs)/settings/whatsapp.tsx"
    - "src/lib/whatsapp.ts"
  dependencies: []
  parallelizable_with: ["STEP-04", "STEP-06", "STEP-07", "STEP-08"]
  done_when:
    - "Default WhatsApp template text matches CR-14 specification"
    - "Template is correctly used when sending WhatsApp messages"
  tests:
    - type: unit
      description: "Verify default template generation produces expected text"
  covers:
    acceptance_criteria: []
    edge_cases: []
  risks:
    - risk: "Default template may be defined in i18n or hardcoded"
      mitigation: "Search all references to template text and fix at the source"
```

### STEP-06: CR-65 Fix Theme Toggle Instant Feedback

```yaml
- id: STEP-06
  description: "In ThemeContext.tsx, make the toggle switch change instantly (update state synchronously) and persist to AsyncStorage asynchronously. Currently the toggle waits for persistence before updating the UI. Change setTheme to: (1) update React state immediately, (2) fire-and-forget the AsyncStorage.setItem call."
  files:
    - "src/contexts/ThemeContext.tsx"
  dependencies: []
  parallelizable_with: ["STEP-04", "STEP-05", "STEP-07", "STEP-08"]
  done_when:
    - "Theme toggle changes the UI instantly on press"
    - "AsyncStorage persistence happens asynchronously (no await blocking the UI)"
    - "No regression: theme is still persisted across app restarts"
  tests:
    - type: unit
      description: "Verify setTheme updates state synchronously and calls AsyncStorage without awaiting"
  covers:
    acceptance_criteria: []
    edge_cases: []
  risks: []
```

### STEP-07: CR-69 Update Agenda Section Labels (i18n)

```yaml
- id: STEP-07
  description: "Update i18n keys for agenda section labels in all 3 locales: (a) 'Conduzindo' -> 'Dirigindo' (Conducting -> Directing/Leading), (b) 'Assuntos da Ala' -> 'Apoios e Agradecimentos' (Ward Business -> Sustainings and Acknowledgments), (c) 'Anuncios de Estaca' -> 'Apoios e Agradecimentos da Estaca' (Stake Announcements -> Stake Sustainings), (d) 'Reconhecendo' -> 'Reconhecendo a Presenca' (Recognizing -> Recognizing the Presence)."
  files:
    - "src/i18n/locales/pt-BR.json"
    - "src/i18n/locales/en.json"
    - "src/i18n/locales/es.json"
  dependencies: []
  parallelizable_with: ["STEP-04", "STEP-05", "STEP-06", "STEP-08"]
  done_when:
    - "Agenda labels updated in all 3 locales"
    - "No other i18n keys reference the old label values"
  tests:
    - type: unit
      description: "Verify i18n keys return the new label values for each locale"
  covers:
    acceptance_criteria: []
    edge_cases: []
  risks:
    - risk: "Other components may hardcode the old labels"
      mitigation: "Search codebase for old label strings to ensure all references use i18n keys"
```

### STEP-08: CR-70 Increase Actor Edit/Delete Icon Size

```yaml
- id: STEP-08
  description: "In ActorSelector.tsx, increase the size and touch area of the edit (pencil) and delete (X) icons. Change actionIcon fontSize from 18 to 22. Increase hitSlop from 8 to 12. Add minWidth/minHeight to action icons for larger touch targets. Increase gap between icons from 16 to 20."
  files:
    - "src/components/ActorSelector.tsx"
  dependencies: []
  parallelizable_with: ["STEP-04", "STEP-05", "STEP-06", "STEP-07"]
  done_when:
    - "Edit and delete icons are visually larger (fontSize 22+)"
    - "Touch targets are larger (hitSlop 12+ or minWidth/minHeight 36+)"
    - "Icons are spaced further apart for easier targeting"
  tests:
    - type: unit
      description: "Verify ActionIcon style has increased fontSize and hitSlop"
  covers:
    acceptance_criteria: []
    edge_cases: []
  risks: []
```

### STEP-09: CR-61 Configure TanStack Query Global Error Handlers

```yaml
- id: STEP-09
  description: "Reconfigure QueryClient in _layout.tsx with: (a) QueryCache with onError for centralized query error logging, (b) MutationCache with onError for centralized mutation error logging, (c) Retry policy: queries retry 2x with exponential backoff, mutations retry 0x, 401/403 no retry, (d) In __DEV__: console.error with details; in prod: silent logging, (e) gcTime and networkMode configuration."
  files:
    - "src/app/_layout.tsx"
  dependencies: []
  parallelizable_with: ["STEP-04", "STEP-05", "STEP-06"]
  done_when:
    - "QueryClient has queryCache with onError callback"
    - "QueryClient has mutationCache with onError callback"
    - "Queries retry 2x with backoff; mutations retry 0x"
    - "401/403 errors do not retry"
    - "__DEV__ logs to console.error; production is silent"
  tests:
    - type: unit
      description: "Verify QueryClient configuration has correct retry policies and error handlers"
  covers:
    acceptance_criteria: []
    edge_cases: []
  risks:
    - risk: "Changing retry from 2 to 0 for mutations may affect existing behavior"
      mitigation: "Mutations currently don't use retry in practice; this aligns with best practice"
```

### STEP-10: CR-57 Add onError to All Mutations with i18n Feedback

```yaml
- id: STEP-10
  description: "Add onError callbacks to all 17+ mutations across useMembers, useActors, useSpeeches, useTopics, useAgenda, useSundayTypes hooks. Each onError calls Alert.alert with t() translated message. Add all new i18n error keys in 3 locales. For mutations that already have onError (useSetSundayType, useRemoveSundayException), ADD Alert.alert to existing onError alongside rollback logic."
  files:
    - "src/hooks/useMembers.ts"
    - "src/hooks/useActors.ts"
    - "src/hooks/useSpeeches.ts"
    - "src/hooks/useTopics.ts"
    - "src/hooks/useAgenda.ts"
    - "src/hooks/useSundayTypes.ts"
    - "src/i18n/locales/pt-BR.json"
    - "src/i18n/locales/en.json"
    - "src/i18n/locales/es.json"
  dependencies: ["STEP-09"]
  parallelizable_with: []
  done_when:
    - "All mutations in useMembers (create, update, delete) have onError with Alert.alert"
    - "All mutations in useActors (create, update, delete) have onError"
    - "All mutations in useSpeeches (lazyCreate, assignSpeaker, assignTopic, changeStatus, removeSpeaker) have onError"
    - "All mutations in useTopics (create, update, delete) have onError"
    - "All mutations in useAgenda (lazyCreate, update) have onError"
    - "useAutoAssignSundayTypes has onError"
    - "i18n keys added for all error messages in 3 locales"
    - "No technical/Supabase messages shown to user"
  tests:
    - type: unit
      description: "Verify each mutation's onError calls Alert.alert with translated message. Verify existing onError in useSetSundayType still rolls back."
  covers:
    acceptance_criteria: []
    edge_cases: []
  risks:
    - risk: "Hooks don't have access to t() directly (not React components)"
      mitigation: "Import i18n.t() directly from i18n module, or import Alert from react-native and use i18n.t()"
```

### STEP-11: CR-59 Internationalize ErrorBoundary and Hardcoded Error Strings

```yaml
- id: STEP-11
  description: "Update ErrorBoundary.tsx to use i18n for 'Something went wrong', 'An unexpected error occurred', 'Try Again'. Since ErrorBoundary is a class component, pass i18n strings via props from wrapper or use i18n.t() directly. Add theme support via props (colors). Update whatsapp.ts to use i18n for 'WhatsApp is not installed' and 'Failed to open WhatsApp'. Fix members.tsx hardcoded 'Failed to read file'."
  files:
    - "src/components/ErrorBoundary.tsx"
    - "src/lib/whatsapp.ts"
    - "src/app/(tabs)/settings/members.tsx"
    - "src/i18n/locales/pt-BR.json"
    - "src/i18n/locales/en.json"
    - "src/i18n/locales/es.json"
  dependencies: []
  parallelizable_with: ["STEP-09", "STEP-10"]
  done_when:
    - "ErrorBoundary uses i18n for all visible text"
    - "ErrorBoundary respects theme colors (dark/light)"
    - "whatsapp.ts uses i18n for error messages"
    - "members.tsx uses t('members.importFailed') instead of hardcoded string"
    - "New i18n keys in all 3 locales"
  tests:
    - type: unit
      description: "Verify ErrorBoundary renders i18n text. Verify whatsapp.ts uses translated messages."
  covers:
    acceptance_criteria: []
    edge_cases: []
  risks:
    - risk: "Class component ErrorBoundary cannot use hooks (useTranslation, useTheme)"
      mitigation: "Import i18n.t() directly and accept colors as props; create a wrapper functional component that passes theme colors"
```

### STEP-12: CR-58 Create QueryErrorView Component + Wire into Tabs

```yaml
- id: STEP-12
  description: "Create new reusable QueryErrorView component with: error message (i18n), retry button, theme-aware styling. Wire it into the 3 main tabs: (a) Home tab (index.tsx) - check isError from queries, (b) Speeches tab (speeches.tsx) - check isError from useSpeeches/useSundayExceptions, (c) Agenda tab (agenda.tsx) - check isError from useSundayExceptions. QueryErrorView accepts error, onRetry, and optional message override."
  files:
    - "src/components/QueryErrorView.tsx"
    - "src/app/(tabs)/index.tsx"
    - "src/app/(tabs)/speeches.tsx"
    - "src/app/(tabs)/agenda.tsx"
    - "src/i18n/locales/pt-BR.json"
    - "src/i18n/locales/en.json"
    - "src/i18n/locales/es.json"
  dependencies: ["STEP-11"]
  parallelizable_with: []
  done_when:
    - "QueryErrorView component exists with error message, retry button, theme colors"
    - "Home tab shows QueryErrorView when queries fail"
    - "Speeches tab shows QueryErrorView when queries fail"
    - "Agenda tab shows QueryErrorView when queries fail"
    - "Retry button calls refetch()"
    - "All text uses i18n"
  tests:
    - type: unit
      description: "Verify QueryErrorView renders error message and retry button. Verify each tab renders QueryErrorView when isError=true."
  covers:
    acceptance_criteria: []
    edge_cases: []
  risks:
    - risk: "Multiple queries per tab: which error to show?"
      mitigation: "Show the first error encountered; use the most critical query's error"
```

### STEP-13: CR-60 Add Granular Error Boundaries per Tab and Critical Components

```yaml
- id: STEP-13
  description: "Wrap each tab with its own ErrorBoundary. Add ErrorBoundary around critical components: AgendaForm, SundayCard list items, PresentationMode. Use the i18n+theme-aware ErrorBoundary from STEP-11. Tab ErrorBoundaries show tab-specific fallback. Component ErrorBoundaries show inline fallback without crashing the entire screen."
  files:
    - "src/app/(tabs)/index.tsx"
    - "src/app/(tabs)/speeches.tsx"
    - "src/app/(tabs)/agenda.tsx"
    - "src/app/(tabs)/settings/_layout.tsx"
    - "src/components/AgendaForm.tsx"
    - "src/app/presentation.tsx"
  dependencies: ["STEP-11"]
  parallelizable_with: ["STEP-12"]
  done_when:
    - "Each main tab wrapped in ErrorBoundary"
    - "Settings layout wrapped in ErrorBoundary"
    - "AgendaForm wrapped in ErrorBoundary"
    - "PresentationMode wrapped in ErrorBoundary with 'Back to Home' button"
    - "Crash in one card/component does not crash the entire tab"
  tests:
    - type: unit
      description: "Verify ErrorBoundary renders fallback when child throws. Verify tab-level and component-level boundaries are independent."
  covers:
    acceptance_criteria: []
    edge_cases: []
  risks:
    - risk: "Nested ErrorBoundaries may interfere with each other"
      mitigation: "Inner boundaries catch first; outer only catches if inner doesn't exist or re-throws"
```

### STEP-14: CR-54 Fix CSV Export Cancel Error + Import Hardcoded String

```yaml
- id: STEP-14
  description: "In members.tsx export CSV catch block: check if error message contains 'User did not share' or 'cancelled' before showing alert. For import: replace hardcoded 'Failed to read file' with t('members.importFailed'). Also handle Android cancel pattern."
  files:
    - "src/app/(tabs)/settings/members.tsx"
  dependencies: []
  parallelizable_with: ["STEP-15"]
  done_when:
    - "Export CSV cancel on share sheet shows no error alert"
    - "Real export errors still show alert with i18n message"
    - "Import file read failure uses t('members.importFailed')"
  tests:
    - type: unit
      description: "Verify export catch block distinguishes cancel from real error. Verify import error uses i18n."
  covers:
    acceptance_criteria: ["AC-1", "AC-2", "AC-3", "AC-10"]
    edge_cases: ["EC-1"]
  risks:
    - risk: "Cancel detection pattern varies by platform"
      mitigation: "Check for both 'User did not share' and 'cancelled' patterns"
```

### STEP-15: CR-55 + CR-66 Members Screen Header Spacer + Empty Export + Import Validation

```yaml
- id: STEP-15
  description: "(a) CR-55: Add headerSpacer (View with width 36) when canWrite=false to keep title centered. (b) CR-66: Enable CSV export when members list is empty - generate file with headers only. (c) CR-66: Improve CSV import error dialog to show specific validation errors (line numbers, field names) in current language."
  files:
    - "src/app/(tabs)/settings/members.tsx"
    - "src/i18n/locales/pt-BR.json"
    - "src/i18n/locales/en.json"
    - "src/i18n/locales/es.json"
  dependencies: ["STEP-14"]
  parallelizable_with: []
  done_when:
    - "Header spacer (width 36) rendered when canWrite=false"
    - "Title visually centered when add button is hidden"
    - "Export CSV with 0 members generates file with header row only"
    - "Export CSV button enabled regardless of member count"
    - "Import CSV validation errors show line numbers and field names"
    - "Import empty CSV shows t('members.importEmpty')"
    - "All new i18n keys in 3 locales"
  tests:
    - type: unit
      description: "Verify spacer renders when canWrite=false. Verify empty export produces header-only CSV. Verify import validation messages are specific and translated."
  covers:
    acceptance_criteria: ["AC-4", "AC-5", "AC-6", "AC-7", "AC-8", "AC-9"]
    edge_cases: ["EC-2", "EC-3", "EC-4", "EC-5"]
  risks:
    - risk: "Empty export may fail if generateCsv expects members array"
      mitigation: "Pass empty array and ensure generateCsv handles it (headers only)"
```

---

## Phase B: Feature Enhancements (Steps 16-29)

### STEP-16: CR-64 Fix Users Screen Error for Secretary

```yaml
- id: STEP-16
  description: "Debug and fix Users screen (settings/users.tsx) showing error when secretary accesses it. Investigate: (a) Is list-users Edge Function excluding secretary? (b) Is the client mishandling the response? (c) Is there an RLS issue? Fix the root cause. Ensure secretary appears in user list. Improve error display to show i18n message instead of bare red 'Erro'."
  files:
    - "src/app/(tabs)/settings/users.tsx"
    - "supabase/functions/list-users/index.ts"
  dependencies: []
  parallelizable_with: ["STEP-17"]
  done_when:
    - "Secretary can access Users screen without error"
    - "Secretary appears in the user list"
    - "All ward users listed with correct roles"
    - "Error display uses i18n message, not bare 'Erro'"
    - "Empty state shows t('users.noUsers') not an error"
  tests:
    - type: unit
      description: "Verify Users screen renders user list for secretary role. Verify error state shows i18n message."
  covers:
    acceptance_criteria: ["AC-1", "AC-2", "AC-3", "AC-4"]
    edge_cases: ["EC-4", "EC-5"]
  risks:
    - risk: "Root cause may be server-side (Edge Function) or client-side"
      mitigation: "Investigate both. If Edge Function needs fix, update both server and client."
```

### STEP-17: CR-67 Implement Forgot Password Flow

```yaml
- id: STEP-17
  description: "Add 'Forgot password?' link on login screen. Create new route src/app/(auth)/forgot-password.tsx with: title, explanatory text, email input, 'Send Reset Email' button. Integrate with supabase.auth.resetPasswordForEmail(). Show success/error feedback. Add loading state. Add i18n keys in 3 locales. Respect theme."
  files:
    - "src/app/(auth)/login.tsx"
    - "src/app/(auth)/forgot-password.tsx"
    - "src/i18n/locales/pt-BR.json"
    - "src/i18n/locales/en.json"
    - "src/i18n/locales/es.json"
  dependencies: []
  parallelizable_with: ["STEP-16"]
  done_when:
    - "'Forgot password?' link visible on login screen between Login button and Create Account"
    - "Forgot password screen shows title, text, email input, submit button"
    - "Submit calls supabase.auth.resetPasswordForEmail"
    - "Success message shown after request"
    - "Error message shown if request fails"
    - "Loading spinner on button while request pending"
    - "Button disabled while loading (no double-submit)"
    - "Empty email shows validation error without calling API"
    - "Email trimmed before API call"
    - "Back navigation to login works"
    - "Theme respected (dark/light)"
    - "All strings in 3 languages"
  tests:
    - type: unit
      description: "Verify forgot password screen renders correctly. Verify email validation. Verify success/error states."
  covers:
    acceptance_criteria: ["AC-5", "AC-6", "AC-7", "AC-8", "AC-9", "AC-10", "AC-11", "AC-12", "AC-13", "AC-14"]
    edge_cases: ["EC-1", "EC-2", "EC-3", "EC-6"]
  risks:
    - risk: "Supabase resetPasswordForEmail may need project configuration"
      mitigation: "Use default Supabase flow (no custom landing page). Method is standard in Supabase SDK."
```

### STEP-18: CR-71 Remove Auto-Preside Rule

```yaml
- id: STEP-18
  description: "Remove enforceActorRules logic in useActors.ts that forces can_preside=true when can_conduct=true. Either make the function return input unchanged or remove the conditional block. Remove or update JSDoc comments referencing the old rule. In ActorSelector.tsx handleAdd: change can_preside from 'roleFilter === can_preside || roleFilter === can_conduct' to 'roleFilter === can_preside'."
  files:
    - "src/hooks/useActors.ts"
    - "src/components/ActorSelector.tsx"
  dependencies: []
  parallelizable_with: ["STEP-16", "STEP-17", "STEP-19"]
  done_when:
    - "enforceActorRules no longer forces can_preside=true when can_conduct=true"
    - "JSDoc comment at line 4 updated (no longer mentions old rule)"
    - "ActorSelector handleAdd sets can_preside ONLY when roleFilter is 'can_preside'"
    - "Existing actors with both can_conduct and can_preside remain valid (no migration needed)"
  tests:
    - type: unit
      description: "Verify enforceActorRules returns input unchanged. Verify handleAdd with roleFilter='can_conduct' sets can_preside=false."
  covers:
    acceptance_criteria: ["AC-1", "AC-2", "AC-3"]
    edge_cases: ["EC-1"]
  risks: []
```

### STEP-19: CR-52 Connect SyncEngine + OfflineManager to App

```yaml
- id: STEP-19
  description: "In the tabs layout or InnerLayout: (a) Call useConnection() to get isOnline, showOfflineBanner, setWebSocketConnected. (b) Call useRealtimeSync({ isOnline, setWebSocketConnected }) after auth. (c) Render OfflineBanner when showOfflineBanner=true. Place these in a component inside AuthProvider so wardId is available."
  files:
    - "src/app/(tabs)/_layout.tsx"
    - "src/components/OfflineBanner.tsx"
  dependencies: []
  parallelizable_with: ["STEP-18"]
  done_when:
    - "useConnection() called in authenticated layout"
    - "useRealtimeSync() called with connection state"
    - "OfflineBanner rendered when device is offline"
    - "Realtime channel subscribes to ward tables"
    - "Data syncs via Realtime when online, polling as fallback"
  tests:
    - type: integration
      description: "Verify hooks are called in layout. Verify OfflineBanner renders when showOfflineBanner=true."
  covers:
    acceptance_criteria: []
    edge_cases: []
  risks:
    - risk: "Connecting dead code may reveal runtime errors"
      mitigation: "Test thoroughly on device. Verify Supabase Realtime is enabled for the project."
```

### STEP-20: CR-53 Connect NotificationModule to App

```yaml
- id: STEP-20
  description: "In the tabs layout: Call useRegisterPushToken(isOnline) and useNotificationHandler() after auth. These hooks already exist and are complete -- they just need to be imported and called."
  files:
    - "src/app/(tabs)/_layout.tsx"
  dependencies: ["STEP-19"]
  parallelizable_with: []
  done_when:
    - "useRegisterPushToken(isOnline) called in tabs layout"
    - "useNotificationHandler() called in tabs layout"
    - "Push token registered in device_push_tokens table on app mount"
    - "Notification tap navigates to Home tab"
    - "Observer role does not register token"
  tests:
    - type: integration
      description: "Verify hooks are imported and called. Verify push token registration logic executes."
  covers:
    acceptance_criteria: []
    edge_cases: []
  risks:
    - risk: "Push notifications require Expo project ID configuration"
      mitigation: "Token registration is best-effort; errors are logged but don't crash the app"
```

### STEP-21: CR-73 Recognizing Field Uses ActorSelector

```yaml
- id: STEP-21
  description: "In AgendaForm.tsx: Replace DebouncedTextInput for the Recognizing field (lines 232-244) with a SelectorField that opens ActorSelector with roleFilter='can_recognize'. When actor is selected, store name in recognized_names array. Display selected actor name in the field."
  files:
    - "src/components/AgendaForm.tsx"
  dependencies: ["STEP-18"]
  parallelizable_with: ["STEP-22"]
  done_when:
    - "Recognizing field opens ActorSelector on tap (not DebouncedTextInput)"
    - "ActorSelector uses roleFilter='can_recognize'"
    - "Selected actor name stored in recognized_names"
    - "Field displays the selected actor name"
    - "Empty actor list shows '+ Add' button in ActorSelector"
  tests:
    - type: unit
      description: "Verify Recognizing field renders as selector. Verify actor selection updates recognized_names."
  covers:
    acceptance_criteria: ["AC-7", "AC-8", "AC-9"]
    edge_cases: ["EC-4"]
  risks:
    - risk: "Old comma-separated recognized_names data may not match actor names"
      mitigation: "Display existing values as-is in read mode; new selections replace with single actor"
```

### STEP-22: CR-74 Custom Prayer Names via MemberSelectorModal

```yaml
- id: STEP-22
  description: "Enhance MemberSelectorModal to support custom names: (a) Add props allowCustomName, onCustomName. (b) When allowCustomName=true and search text doesn't exactly match a member, show a row 'Use [typed text] as custom name' at top of list. (c) Tapping this row calls onCustomName(searchText). In AgendaForm: pass allowCustomName=true for prayer fields. When custom name is used, set prayer_name=customName and member_id=NULL."
  files:
    - "src/components/MemberSelectorModal.tsx"
    - "src/components/AgendaForm.tsx"
  dependencies: []
  parallelizable_with: ["STEP-21"]
  done_when:
    - "MemberSelectorModal accepts allowCustomName and onCustomName props"
    - "'Use custom name' row appears when search text doesn't match a member"
    - "Custom name button disabled when text is empty"
    - "Custom name is NOT persisted as a member"
    - "Prayer field shows custom name; member_id is NULL"
    - "Selecting a regular member still works (member_id set, name from member)"
    - "Previously entered custom names show as current value"
  tests:
    - type: unit
      description: "Verify custom name row appears with non-matching search. Verify onCustomName called. Verify member_id=NULL for custom names."
  covers:
    acceptance_criteria: ["AC-10", "AC-11", "AC-12", "AC-13", "AC-14"]
    edge_cases: ["EC-5", "EC-9"]
  risks:
    - risk: "UX confusion between selecting a member and using a custom name"
      mitigation: "Visual distinction: custom name row has different styling (dashed border, different icon)"
```

### STEP-23: CR-75 Show Non-Expandable Cards for Excluded Sundays in Agenda

```yaml
- id: STEP-23
  description: "In agenda.tsx: (a) Remove the filter at lines 75-80 that excludes gen_conf/stake_conf sundays from the list. (b) In AgendaSundayCard, add expandable check: if exception reason is in EXCLUDED_EXCEPTION_TYPES (gen_conf, stake_conf), render card without chevron and don't call onToggle on press. (c) Non-expandable cards show exception label in warning color. (d) Verify scrollToIndex still works after adding items back to list."
  files:
    - "src/app/(tabs)/agenda.tsx"
  dependencies: []
  parallelizable_with: ["STEP-21", "STEP-22"]
  done_when:
    - "gen_conf/stake_conf sundays appear in Agenda list"
    - "These sundays show as non-expandable cards (no chevron)"
    - "Tapping non-expandable card does nothing"
    - "Exception label shown in yellow/warning color"
    - "Regular sundays remain expandable"
    - "scrollToIndex for next sunday still works"
  tests:
    - type: unit
      description: "Verify excluded sundays render non-expandable. Verify tap does nothing. Verify warning color on exception label."
  covers:
    acceptance_criteria: ["AC-15", "AC-16", "AC-17", "AC-18", "AC-19"]
    edge_cases: ["EC-6", "EC-7"]
  risks:
    - risk: "Adding items to list changes indices, may break getItemLayout/scrollToIndex"
      mitigation: "Verify estimatedItemSize and initialIndex recalculation"
```

### STEP-24: CR-72 Auto-Add Bishopric Users as Actors

```yaml
- id: STEP-24
  description: "In create-invitation Edge Function: when role='bishopric', auto-insert a meeting_actor record with can_preside=true, can_conduct=true, using the invited user's name (add optional name field to invitation input, fallback to email local part). Use ON CONFLICT DO NOTHING or check for existing actor. For role changes via update-user-role: if new role is 'bishopric', also create/update actor."
  files:
    - "supabase/functions/create-invitation/index.ts"
    - "supabase/functions/update-user-role/index.ts"
    - "src/app/(tabs)/settings/users.tsx"
  dependencies: ["STEP-18"]
  parallelizable_with: ["STEP-21", "STEP-22", "STEP-23"]
  done_when:
    - "Inviting a bishopric user auto-creates a meeting_actor"
    - "Actor has can_preside=true, can_conduct=true"
    - "Duplicate actor names handled (ON CONFLICT or check)"
    - "Role change to bishopric also creates actor"
    - "Actor name derived from invitation name field or email local part"
    - "Existing actors with same name get can_preside/can_conduct updated to true"
  tests:
    - type: integration
      description: "Verify create-invitation with role='bishopric' creates actor. Verify duplicate name handling."
  covers:
    acceptance_criteria: ["AC-4", "AC-5", "AC-6"]
    edge_cases: ["EC-2", "EC-3", "EC-8"]
  risks:
    - risk: "Edge Function INSERT may fail if RLS blocks it"
      mitigation: "Edge Functions use service_role key which bypasses RLS"
```

### STEP-25: CR-51 Create pnpm import-hymns CLI Script

```yaml
- id: STEP-25
  description: "Create scripts/import-hymns.ts: reads CSV file (format: Lingua,Numero,Titulo,Sacramental), validates rows, upserts into hymns table by (language, number). Add pnpm script in package.json. Show summary on success. Show errors with line numbers on failure."
  files:
    - "scripts/import-hymns.ts"
    - "package.json"
  dependencies: []
  parallelizable_with: ["STEP-16", "STEP-17", "STEP-18"]
  done_when:
    - "Script executable via 'pnpm import-hymns <file.csv>'"
    - "CSV format: Lingua,Numero,Titulo,Sacramental(S/N)"
    - "Upsert by (language, number)"
    - "Summary shows: 'Imported X hymns for language Y'"
    - "Invalid CSV shows error with line/field"
    - "Invalid CSV aborts without partial import"
  tests:
    - type: unit
      description: "Verify CSV parsing. Verify validation errors. Verify upsert logic."
  covers:
    acceptance_criteria: []
    edge_cases: []
  risks:
    - risk: "Script needs Supabase connection (env variables)"
      mitigation: "Use dotenv to load SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env"
```

---

## Phase C: Documentation & Integration Testing (Steps 26-37)

### STEP-26: CR-44 Consolidate ARCH_M002 Documentation Fixes

```yaml
- id: STEP-26
  description: "Update ARCH_M002.md: (a) Add custom_reason to sunday_exceptions table definition. (b) Update reason enum to include 'speeches'. (c) Confirm 'speeches' is persistido. (d) Update MemberImportExport contracts for mobile (expo modules). (e) Remove ActorManagementScreen (CR-45). (f) Update diagram to remove Actors from Settings."
  files:
    - "docs/arch/ARCH_M002.md"
  dependencies: []
  parallelizable_with: ["STEP-27", "STEP-28", "STEP-29", "STEP-30", "STEP-31"]
  done_when:
    - "sunday_exceptions table includes custom_reason column"
    - "reason enum includes 'speeches'"
    - "MemberImportExport contracts use mobile types"
    - "ActorManagementScreen removed from component list"
    - "Diagram updated"
  tests: []
  covers:
    acceptance_criteria: []
    edge_cases: []
  risks: []
```

### STEP-27: CR-46 Document SyncEngine + OfflineManager Integration

```yaml
- id: STEP-27
  description: "Update ARCH_M006.md and ARCH_M007.md: Add 'Integration Point' section defining where useRealtimeSync and useConnection are called (tabs layout), where OfflineBanner is rendered, how offlineQueue integrates with mutations. Add flow diagram."
  files:
    - "docs/arch/ARCH_M006.md"
    - "docs/arch/ARCH_M007.md"
  dependencies: []
  parallelizable_with: ["STEP-26", "STEP-28", "STEP-29", "STEP-30", "STEP-31"]
  done_when:
    - "ARCH_M006 has Integration Point section"
    - "ARCH_M007 has Integration Point section"
    - "Flow diagram shows M006 <-> M007 <-> layout relationship"
  tests: []
  covers:
    acceptance_criteria: []
    edge_cases: []
  risks: []
```

### STEP-28: CR-47 Update ARCH_M008 with Complete Settings Components

```yaml
- id: STEP-28
  description: "Update ARCH_M008.md to list all Settings sub-screens: theme.tsx, about.tsx, history.tsx, timezone.tsx, members.tsx, topics.tsx, whatsapp.tsx, users.tsx. Update diagram."
  files:
    - "docs/arch/ARCH_M008.md"
  dependencies: []
  parallelizable_with: ["STEP-26", "STEP-27", "STEP-29", "STEP-30", "STEP-31"]
  done_when:
    - "All Settings sub-screens listed as components"
    - "Diagram updated with all sub-telas"
  tests: []
  covers:
    acceptance_criteria: []
    edge_cases: []
  risks: []
```

### STEP-29: CR-48 Update ARCH_M004 PresentationMode Contract

```yaml
- id: STEP-29
  description: "Update ARCH_M004.md PresentationMode contract to include formatFullDate(dateStr, language) for date display in header."
  files:
    - "docs/arch/ARCH_M004.md"
  dependencies: []
  parallelizable_with: ["STEP-26", "STEP-27", "STEP-28", "STEP-30", "STEP-31"]
  done_when:
    - "PresentationMode section documents formatFullDate"
    - "dateUtils.ts dependency documented"
  tests: []
  covers:
    acceptance_criteria: []
    edge_cases: []
  risks: []
```

### STEP-30: CR-44 Fix ARCH Naming/Ordering Inconsistencies

```yaml
- id: STEP-30
  description: "Fix inconsistencies across ARCH docs: (a) ARCH_CR3_F029: change formatDateFull to formatFullDate. (b) ARCH_CR3_F027: fix sign-out ordering to queryClient.clear() before signOut(). (c) ARCH_M006: update useRealtimeSync contract to include parameters."
  files:
    - "docs/arch/ARCH_CR3_F029.md"
    - "docs/arch/ARCH_CR3_F027.md"
    - "docs/arch/ARCH_M006.md"
  dependencies: []
  parallelizable_with: ["STEP-26", "STEP-27", "STEP-28", "STEP-29", "STEP-31"]
  done_when:
    - "formatDateFull -> formatFullDate in ARCH_CR3_F029"
    - "Sign-out ordering consistent in ARCH_CR3_F027"
    - "useRealtimeSync contract shows parameters"
  tests: []
  covers:
    acceptance_criteria: []
    edge_cases: []
  risks: []
```

### STEP-31: CR-49 + CR-50 Update PRODUCT_SPECIFICATION and SPEC.final.md

```yaml
- id: STEP-31
  description: "Update PRODUCT_SPECIFICATION.md: (a) RF-21 labels to reflect CR-29/CR-30. (b) RF-22 actor flow to reflect CR-26. (c) RN-01 sunday types to current enum. Update SPEC.final.md: (a) CR-31: fix ASM-009. (b) CR-34: update RF-22/7.13.4 for CR-26. (c) CR-36: add debounce rule to SPEC_F012. (d) CR-37: update 7.8 and 4.2 for secretary permissions."
  files:
    - "docs/PRODUCT_SPECIFICATION.md"
    - "docs/SPEC.final.md"
    - "docs/specs/SPEC_F012.md"
  dependencies: []
  parallelizable_with: ["STEP-26", "STEP-27", "STEP-28", "STEP-29", "STEP-30"]
  done_when:
    - "RF-21 labels updated"
    - "RF-22 actor flow updated"
    - "RN-01 sunday types corrected"
    - "ASM-009 corrected"
    - "Secretary permissions documented"
    - "Debounce rule in SPEC_F012"
  tests: []
  covers:
    acceptance_criteria: []
    edge_cases: []
  risks: []
```

### STEP-32: CR-52 Integrate OfflineQueue with Mutation Hooks

```yaml
- id: STEP-32
  description: "Integrate offlineQueue with mutation hooks: when isOnline=false, enqueue the mutation instead of executing it immediately. Requires passing isOnline to hooks or using a context. Process queue on reconnect. Start with the most critical mutations (members, agenda) and expand."
  files:
    - "src/hooks/useMembers.ts"
    - "src/hooks/useAgenda.ts"
    - "src/hooks/useTopics.ts"
    - "src/hooks/useActors.ts"
    - "src/hooks/useSpeeches.ts"
    - "src/lib/offlineQueue.ts"
  dependencies: ["STEP-19", "STEP-10"]
  parallelizable_with: []
  done_when:
    - "Mutations enqueue when offline instead of failing"
    - "Queue is processed FIFO on reconnect"
    - "User sees feedback that changes will sync when online"
    - "Queue processing errors are handled gracefully"
  tests:
    - type: integration
      description: "Verify mutation enqueues when offline. Verify queue processes on reconnect."
  covers:
    acceptance_criteria: []
    edge_cases: []
  risks:
    - risk: "Offline queue replay may hit RLS conflicts if role changed while offline"
      mitigation: "Queue entries include ward_id; verify RLS allows the action before dequeuing"
```

### STEP-33: Update ARCH_INDEX and PLAN_INDEX with CR004 References

```yaml
- id: STEP-33
  description: "Update ARCH_INDEX.md to add CR004 entry. Update PLAN_INDEX.md to add PLAN_CR004 entry with step count and CRs covered."
  files:
    - "docs/arch/ARCH_INDEX.md"
    - "docs/plan/PLAN_INDEX.md"
  dependencies: ["STEP-26", "STEP-27", "STEP-28", "STEP-29", "STEP-30", "STEP-31"]
  parallelizable_with: []
  done_when:
    - "ARCH_INDEX lists CR004"
    - "PLAN_INDEX lists PLAN_CR004 with correct step count"
  tests: []
  covers:
    acceptance_criteria: []
    edge_cases: []
  risks: []
```

### STEP-34: QA Tests for F002 (CR-56, CR-68) - Speeches Persistence

```yaml
- id: STEP-34
  description: "Write comprehensive tests for speeches persistence: (a) auto-assign creates 'speeches' entries, (b) useSetSundayType on speeches entry works without revert, (c) useRemoveSundayException upserts to 'speeches', (d) CHECK constraint accepts 'speeches'. Test the race condition fix from CR-68."
  files:
    - "src/hooks/__tests__/useSundayTypes.test.ts"
  dependencies: ["STEP-01", "STEP-02", "STEP-03"]
  parallelizable_with: ["STEP-35"]
  done_when:
    - "Tests verify speeches entries are inserted by auto-assign"
    - "Tests verify sunday type change persists without revert"
    - "Tests verify revert to speeches upserts instead of deletes"
    - "All tests pass"
  tests:
    - type: unit
      description: "Comprehensive unit tests for useSundayTypes with speeches persistence"
  covers:
    acceptance_criteria: []
    edge_cases: []
  risks: []
```

### STEP-35: QA Tests for F004 (CR-57, CR-58, CR-59, CR-60, CR-61) - Error Handling

```yaml
- id: STEP-35
  description: "Write tests for error handling: (a) Each mutation's onError fires Alert.alert, (b) QueryErrorView renders with error and retry, (c) ErrorBoundary renders i18n text, (d) ErrorBoundary respects theme colors, (e) Granular boundaries catch independently."
  files:
    - "src/hooks/__tests__/useMutationErrors.test.ts"
    - "src/components/__tests__/QueryErrorView.test.ts"
    - "src/components/__tests__/ErrorBoundary.test.ts"
  dependencies: ["STEP-09", "STEP-10", "STEP-11", "STEP-12", "STEP-13"]
  parallelizable_with: ["STEP-34"]
  done_when:
    - "Tests verify onError on all mutations"
    - "Tests verify QueryErrorView renders and retry works"
    - "Tests verify ErrorBoundary i18n and theme"
    - "All tests pass"
  tests:
    - type: unit
      description: "Error handling test suite"
  covers:
    acceptance_criteria: []
    edge_cases: []
  risks: []
```

### STEP-36: QA Tests for F008 (CR-71, CR-73, CR-74, CR-75) - Agenda & Actors

```yaml
- id: STEP-36
  description: "Write tests for: (a) enforceActorRules returns input unchanged (CR-71), (b) ActorSelector handleAdd with roleFilter='can_conduct' does NOT set can_preside, (c) Recognizing field uses ActorSelector, (d) MemberSelectorModal custom name, (e) Non-expandable agenda cards."
  files:
    - "src/hooks/__tests__/useActors.test.ts"
    - "src/components/__tests__/ActorSelector.test.ts"
    - "src/components/__tests__/MemberSelectorModal.test.ts"
  dependencies: ["STEP-18", "STEP-21", "STEP-22", "STEP-23"]
  parallelizable_with: ["STEP-34", "STEP-35"]
  done_when:
    - "Tests verify auto-preside rule removed"
    - "Tests verify recognizing uses ActorSelector"
    - "Tests verify custom prayer names"
    - "Tests verify non-expandable cards"
    - "All tests pass"
  tests:
    - type: unit
      description: "Agenda & Actors test suite"
  covers:
    acceptance_criteria: ["AC-1", "AC-2", "AC-3", "AC-7", "AC-8", "AC-10", "AC-11", "AC-15", "AC-17"]
    edge_cases: ["EC-1", "EC-4", "EC-5"]
  risks: []
```

### STEP-37: Final Validation -- Run Full Test Suite and Cross-Feature Regression Check

```yaml
- id: STEP-37
  description: "Run the complete Vitest test suite to verify no regressions across all features. Verify all new i18n keys exist in all 3 locales. Verify no hardcoded English strings remain in error paths. Verify all mutations have onError. Verify all tabs have QueryErrorView. Verify ErrorBoundary coverage."
  files: []
  dependencies: ["STEP-34", "STEP-35", "STEP-36"]
  parallelizable_with: []
  done_when:
    - "Full test suite passes (npx vitest run)"
    - "No missing i18n keys across 3 locales"
    - "No hardcoded English error strings found by grep"
    - "All mutations have onError (verified by grep)"
    - "All tabs check isError (verified by grep)"
  tests:
    - type: e2e
      description: "Full regression test run"
  covers:
    acceptance_criteria: []
    edge_cases: []
  risks:
    - risk: "Tests may fail due to mock setup differences"
      mitigation: "Fix mocks incrementally; each step should leave tests green"
```

---

## Validation Matrix

```yaml
validation:
  # SPEC_CR4_F005 ACs
  - ac_id: F005-AC-1
    how_to_verify: "Export CSV, cancel share sheet, no error alert shown"
    covered_by_steps: ["STEP-14"]
  - ac_id: F005-AC-2
    how_to_verify: "Export CSV with real error shows i18n error"
    covered_by_steps: ["STEP-14"]
  - ac_id: F005-AC-3
    how_to_verify: "Import CSV file read failure shows t('members.importFailed')"
    covered_by_steps: ["STEP-14"]
  - ac_id: F005-AC-4
    how_to_verify: "Import CSV validation errors show line numbers and fields"
    covered_by_steps: ["STEP-15"]
  - ac_id: F005-AC-5
    how_to_verify: "Import empty CSV shows t('members.importEmpty')"
    covered_by_steps: ["STEP-15"]
  - ac_id: F005-AC-6
    how_to_verify: "Members screen title centered when canWrite=false"
    covered_by_steps: ["STEP-15"]
  - ac_id: F005-AC-7
    how_to_verify: "Export CSV with 0 members produces header-only file"
    covered_by_steps: ["STEP-15"]
  - ac_id: F005-AC-8
    how_to_verify: "Export CSV button enabled with 0 members"
    covered_by_steps: ["STEP-15"]
  - ac_id: F005-AC-9
    how_to_verify: "All error messages translated in 3 languages"
    covered_by_steps: ["STEP-14", "STEP-15"]
  - ac_id: F005-AC-10
    how_to_verify: "Share sheet cancel detection works on iOS and Android"
    covered_by_steps: ["STEP-14"]

  # SPEC_CR4_F007 ACs
  - ac_id: F007-AC-1
    how_to_verify: "Secretary accesses Users screen without error"
    covered_by_steps: ["STEP-16"]
  - ac_id: F007-AC-2
    how_to_verify: "Secretary appears in user list"
    covered_by_steps: ["STEP-16"]
  - ac_id: F007-AC-3
    how_to_verify: "All ward users listed with correct roles"
    covered_by_steps: ["STEP-16"]
  - ac_id: F007-AC-4
    how_to_verify: "Error display uses i18n message"
    covered_by_steps: ["STEP-16"]
  - ac_id: F007-AC-5
    how_to_verify: "Forgot password link visible on login screen"
    covered_by_steps: ["STEP-17"]
  - ac_id: F007-AC-6
    how_to_verify: "Forgot password screen has title, text, email input, button"
    covered_by_steps: ["STEP-17"]
  - ac_id: F007-AC-7
    how_to_verify: "Submit calls resetPasswordForEmail"
    covered_by_steps: ["STEP-17"]
  - ac_id: F007-AC-8
    how_to_verify: "Success message shown after request"
    covered_by_steps: ["STEP-17"]
  - ac_id: F007-AC-9
    how_to_verify: "Error message shown if request fails"
    covered_by_steps: ["STEP-17"]
  - ac_id: F007-AC-10
    how_to_verify: "Empty email shows validation error"
    covered_by_steps: ["STEP-17"]
  - ac_id: F007-AC-11
    how_to_verify: "Back button navigates to login"
    covered_by_steps: ["STEP-17"]
  - ac_id: F007-AC-12
    how_to_verify: "Loading spinner during request"
    covered_by_steps: ["STEP-17"]
  - ac_id: F007-AC-13
    how_to_verify: "All strings translated in 3 languages"
    covered_by_steps: ["STEP-17"]
  - ac_id: F007-AC-14
    how_to_verify: "Dark/light theme respected"
    covered_by_steps: ["STEP-17"]

  # SPEC_CR4_F008 ACs
  - ac_id: F008-AC-1
    how_to_verify: "Actor created with can_conduct=true, can_preside=false persists correctly"
    covered_by_steps: ["STEP-18"]
  - ac_id: F008-AC-2
    how_to_verify: "handleAdd with roleFilter='can_conduct' does not set can_preside"
    covered_by_steps: ["STEP-18"]
  - ac_id: F008-AC-3
    how_to_verify: "can_conduct and can_preside are independent"
    covered_by_steps: ["STEP-18"]
  - ac_id: F008-AC-4
    how_to_verify: "Bishopric invitation auto-creates actor"
    covered_by_steps: ["STEP-24"]
  - ac_id: F008-AC-5
    how_to_verify: "Duplicate actor name handled"
    covered_by_steps: ["STEP-24"]
  - ac_id: F008-AC-6
    how_to_verify: "Role change to bishopric creates actor"
    covered_by_steps: ["STEP-24"]
  - ac_id: F008-AC-7
    how_to_verify: "Recognizing field opens ActorSelector"
    covered_by_steps: ["STEP-21"]
  - ac_id: F008-AC-8
    how_to_verify: "Actor name stored in recognized_names"
    covered_by_steps: ["STEP-21"]
  - ac_id: F008-AC-9
    how_to_verify: "Single selection stored as array"
    covered_by_steps: ["STEP-21"]
  - ac_id: F008-AC-10
    how_to_verify: "Prayer field shows custom name option"
    covered_by_steps: ["STEP-22"]
  - ac_id: F008-AC-11
    how_to_verify: "Custom name saved with member_id=NULL"
    covered_by_steps: ["STEP-22"]
  - ac_id: F008-AC-12
    how_to_verify: "Custom name not persisted as member"
    covered_by_steps: ["STEP-22"]
  - ac_id: F008-AC-13
    how_to_verify: "Previous custom name shown in field"
    covered_by_steps: ["STEP-22"]
  - ac_id: F008-AC-14
    how_to_verify: "Regular member selection unchanged"
    covered_by_steps: ["STEP-22"]
  - ac_id: F008-AC-15
    how_to_verify: "gen_conf/stake_conf sundays appear as non-expandable cards"
    covered_by_steps: ["STEP-23"]
  - ac_id: F008-AC-16
    how_to_verify: "Exception label in yellow/warning color"
    covered_by_steps: ["STEP-23"]
  - ac_id: F008-AC-17
    how_to_verify: "Tapping non-expandable card does nothing"
    covered_by_steps: ["STEP-23"]
  - ac_id: F008-AC-18
    how_to_verify: "Excluded sundays no longer filtered from list"
    covered_by_steps: ["STEP-23"]
  - ac_id: F008-AC-19
    how_to_verify: "Regular sundays remain expandable"
    covered_by_steps: ["STEP-23"]
```

---

## Dependency Graph

```
STEP-01 (DB migration 009)
  └── STEP-02 (Fix speeches code)
       └── STEP-03 (Fix revert bug)
            └── STEP-34 (QA F002)

STEP-04 (About screen)         ─┐
STEP-05 (WhatsApp template)     │
STEP-06 (Theme toggle)          ├── All parallelizable (UI/UX fixes)
STEP-07 (Agenda labels)         │
STEP-08 (Actor icon size)      ─┘

STEP-09 (QueryClient config)
  └── STEP-10 (Mutation onError)
       └── STEP-32 (Offline queue integration)

STEP-11 (ErrorBoundary i18n) ──┬── STEP-12 (QueryErrorView + tabs)
                               └── STEP-13 (Granular error boundaries)
                                    └── STEP-35 (QA F004)

STEP-14 (CSV export/import fix)
  └── STEP-15 (Header spacer + empty export + import validation)

STEP-16 (Users screen fix)     ─┐
STEP-17 (Forgot password)       ├── Parallelizable
STEP-25 (Import-hymns script)  ─┘

STEP-18 (Remove auto-preside) ─┬── STEP-21 (Recognizing ActorSelector)
                               ├── STEP-24 (Auto-add bishopric actors)
                               └── STEP-36 (QA F008)

STEP-22 (Custom prayer names) ─┤
STEP-23 (Non-expandable cards) ─┘

STEP-19 (Connect Sync/Offline) ── STEP-20 (Connect Notifications)
                                     └── STEP-32 (Offline queue)

STEP-26..31 (Documentation)    ── STEP-33 (Update indexes)

STEP-34, STEP-35, STEP-36     ── STEP-37 (Final validation)
```

---

## Parallel Execution Strategy

```
Track 1 (Critical Path):    STEP-01 → STEP-02 → STEP-03 → STEP-34
Track 2 (Error Handling):   STEP-09 → STEP-10 → STEP-11 → STEP-12 → STEP-13 → STEP-35
Track 3 (Features):         STEP-16 → STEP-17 → STEP-18 → STEP-21..24 → STEP-36
Track 4 (UI/UX + Docs):     STEP-04..08 → STEP-14 → STEP-15 → STEP-25 → STEP-26..33

Final:                       STEP-37 (after all tracks complete)
```
