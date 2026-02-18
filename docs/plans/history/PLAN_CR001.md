# PLAN_CR001 - Change Requests Batch 1 (10 CRs)

## PLAN_SUMMARY

```yaml
type: plan_summary
total_steps: 14
parallel_tracks: 3
estimated_commits: 14
coverage:
  acceptance_criteria: 29/29
  edge_cases: 10/10
critical_path:
  - "STEP-01: DB migration for sunday type enum fix (CR-06 foundation)"
  - "STEP-02: Type system + hooks update for new enum (CR-06 types layer)"
  - "STEP-06: SundayCard dropdown + 'Other' dialog (CR-06 UI)"
  - "STEP-07: Hide speeches for non-speech sundays (CR-07)"
main_risks:
  - "CR-06 migration must handle existing data with removed enum values (fast_sunday, special_program, no_meeting)"
  - "CR-07 depends on CR-06 enum being correct first"
  - "CR-03 buildPresentationCards returns [] when agenda is null -- must provide default empty agenda"
  - "CR-08 nested FlatList inside ScrollView may affect virtualization performance (acceptable for small lists)"
```

---

## PLAN

```yaml
type: plan
version: 1

goal: "Fix 10 bugs and UI issues across existing modules. CR-06 (sunday enum fix) is the most cross-cutting change, touching DB, types, hooks, i18n, components, and tests. All other CRs are localized to 1-3 files each."

strategy:
  order: "CR-06 DB+Types first (foundation) -> Independent UI fixes (CR-01,02,04,05,08,09) in parallel -> CR-06 UI + CR-07 (dependent) -> CR-03 (presentation) -> CR-10 (new screens)"
  commit_strategy: "1 commit per step, conventional commits (fix:, feat:, chore:)"
  test_strategy: "Update existing tests that reference old enum values; add targeted tests for new behavior"
```

---

## Steps

### STEP-01: CR-06 Database Migration -- Fix Sunday Type Enum

```yaml
- id: STEP-01
  description: "Create migration 008_fix_sunday_type_enum.sql that drops the old CHECK constraint on sunday_exceptions.reason, adds the corrected constraint (removing fast_sunday, special_program, no_meeting; adding primary_presentation, other), adds a custom_reason TEXT column, and migrates existing data with removed values to 'other'."
  files:
    - "supabase/migrations/008_fix_sunday_type_enum.sql"
  dependencies: []
  parallelizable_with: []
  done_when:
    - "Migration file exists with ALTER TABLE dropping old constraint"
    - "New CHECK constraint allows: testimony_meeting, general_conference, stake_conference, ward_conference, primary_presentation, other"
    - "custom_reason TEXT column added (nullable)"
    - "UPDATE statement migrates fast_sunday, special_program, no_meeting rows to 'other' with custom_reason set to original value"
    - "Migration applies cleanly on a fresh database and on one with existing data"
  tests:
    - type: integration
      description: "Verify migration applies without error. Verify old values are rejected by constraint. Verify new values are accepted."
  covers:
    acceptance_criteria: ["CR-06-AC-7"]
    edge_cases: ["EC-CR06-1: Existing data with removed values migrated correctly"]
  risks:
    - risk: "Existing production data may have fast_sunday, special_program, or no_meeting values"
      mitigation: "UPDATE statement runs BEFORE new constraint is applied; migrated values preserved as custom_reason"
```

### STEP-02: CR-06 Type System + Hooks + i18n -- Update Enum Across All Layers

```yaml
- id: STEP-02
  description: "Update SundayExceptionReason type in database.ts (remove fast_sunday, special_program, no_meeting; add primary_presentation, other). Add custom_reason field to SundayException interface. Update SUNDAY_TYPE_OPTIONS in useSundayTypes.ts. Update EXCLUDED_EXCEPTION_TYPES and isSpecialMeeting in useAgenda.ts. Update all 3 i18n locale files with corrected sundayExceptions keys (add speeches, primary_presentation, other; remove fast_sunday, special_program, no_meeting). Update useSetSundayType to support custom_reason field."
  files:
    - "src/types/database.ts"
    - "src/hooks/useSundayTypes.ts"
    - "src/hooks/useAgenda.ts"
    - "src/i18n/locales/pt-BR.json"
    - "src/i18n/locales/en.json"
    - "src/i18n/locales/es.json"
  dependencies: ["STEP-01"]
  parallelizable_with: []
  done_when:
    - "SundayExceptionReason type = 'testimony_meeting' | 'general_conference' | 'stake_conference' | 'ward_conference' | 'primary_presentation' | 'other'"
    - "SundayException interface has optional custom_reason: string | null field"
    - "SUNDAY_TYPE_OPTIONS = [speeches, testimony_meeting, general_conference, stake_conference, ward_conference, primary_presentation, other]"
    - "EXCLUDED_EXCEPTION_TYPES updated: no_meeting removed (no longer exists)"
    - "isSpecialMeeting updated: includes primary_presentation and other as special types (no speeches shown)"
    - "All 3 locale files have sundayExceptions.speeches, sundayExceptions.primary_presentation, sundayExceptions.other; old keys removed"
    - "useSetSundayType mutation accepts and persists custom_reason when reason='other'"
    - "TypeScript compiles without errors"
  tests:
    - type: unit
      description: "Verify SUNDAY_TYPE_OPTIONS contains exactly 7 items with correct values"
    - type: unit
      description: "Verify SundayExceptionReason does not include fast_sunday, special_program, no_meeting"
    - type: unit
      description: "Verify isSpecialMeeting returns true for testimony_meeting, ward_conference, primary_presentation, other"
    - type: unit
      description: "Verify all 3 locale files have sundayExceptions.speeches key"
  covers:
    acceptance_criteria: ["CR-06-AC-1", "CR-06-AC-2", "CR-06-AC-3", "CR-06-AC-5", "CR-06-AC-6", "CR-06-AC-8", "CR-06-AC-9"]
    edge_cases: []
  risks:
    - risk: "7 test files reference old enum values and will fail"
      mitigation: "STEP-03 updates all tests"
```

### STEP-03: CR-06 Test Updates -- Fix All Tests Referencing Old Enum Values

```yaml
- id: STEP-03
  description: "Update all 7 test files that reference fast_sunday, special_program, or no_meeting to use the new enum values. Update assertions for SUNDAY_TYPE_OPTIONS, SundayExceptionReason, isSpecialMeeting, EXCLUDED_EXCEPTION_TYPES, and i18n keys."
  files:
    - "src/__tests__/useSundayTypes-utils.test.ts"
    - "src/__tests__/phase02-database-types.test.ts"
    - "src/__tests__/phase02-sundayTypes-validation.test.ts"
    - "src/__tests__/database-types.test.ts"
    - "src/__tests__/i18n.test.ts"
    - "src/__tests__/useAgenda-utils.test.ts"
    - "src/__tests__/phase04-agenda-presentation.test.ts"
  dependencies: ["STEP-02"]
  parallelizable_with: []
  done_when:
    - "No test file references fast_sunday, special_program, or no_meeting as valid values"
    - "Tests assert primary_presentation and other exist in enum/options"
    - "Tests assert sundayExceptions.speeches key exists in i18n"
    - "All existing tests pass: npx vitest run"
  tests:
    - type: unit
      description: "Run full test suite, all tests green"
  covers:
    acceptance_criteria: []
    edge_cases: ["EC-CR06-2: Test suite remains green after enum change"]
  risks:
    - risk: "Some tests may have indirect references to old values"
      mitigation: "Grep entire test directory for old values before marking done"
```

### STEP-04: CR-01 Home Tab Title + CR-04 Exception Display Text + CR-05 Speech Labels

```yaml
- id: STEP-04
  description: "Three small, independent UI/i18n fixes bundled together:
    (a) CR-01: Add section title above 'Start Meeting' button in HomeTab. Add i18n key home.meetingAgendaTitle in all 3 locales. Title visible only on Sundays, styled like NextSundaysSection title.
    (b) CR-04: In SundayCard header, replace raw currentType with t(`sundayExceptions.${currentType}`) to show translated exception text.
    (c) CR-05: Change i18n key speeches.slot values: pt-BR '{{number}} Discurso', en '{{number}} Speech', es '{{number}} Discurso'."
  files:
    - "src/app/(tabs)/index.tsx"
    - "src/i18n/locales/pt-BR.json"
    - "src/i18n/locales/en.json"
    - "src/i18n/locales/es.json"
    - "src/components/SundayCard.tsx"
  dependencies: ["STEP-02"]
  parallelizable_with: ["STEP-05", "STEP-08", "STEP-09"]
  done_when:
    - "CR-01: Section title 'Agenda da Reuniao Sacramental' appears above Start Meeting button on Sundays"
    - "CR-01: Title styled with fontSize 20, fontWeight 700, paddingHorizontal 16, paddingVertical 12"
    - "CR-01: Title hidden on non-Sundays"
    - "CR-01: home.meetingAgendaTitle key exists in all 3 locales"
    - "CR-04: SundayCard header shows translated exception text (e.g., 'Conferencia Geral' not 'general_conference')"
    - "CR-05: Speech slot labels show '1o Discurso' not 'VAGA 1o' (all 3 languages)"
  tests:
    - type: unit
      description: "Verify home.meetingAgendaTitle i18n key exists in all 3 locales"
    - type: unit
      description: "Verify speeches.slot i18n values use 'Discurso'/'Speech' pattern"
  covers:
    acceptance_criteria: ["CR-01-AC-1", "CR-01-AC-2", "CR-01-AC-3", "CR-01-AC-4", "CR-04-AC-1", "CR-04-AC-2", "CR-04-AC-3", "CR-05-AC-1", "CR-05-AC-2", "CR-05-AC-3", "CR-05-AC-4"]
    edge_cases: []
  risks:
    - risk: "None significant -- these are small, localized changes"
      mitigation: "N/A"
```

### STEP-05: CR-02 Language Mismatch on Ward Creation

```yaml
- id: STEP-05
  description: "After successful registration (session set), call changeLanguage(language) with the selected form language value BEFORE the auth state change triggers navigation. This ensures the UI immediately displays in the language the user selected during ward creation."
  files:
    - "src/app/(auth)/register.tsx"
  dependencies: []
  parallelizable_with: ["STEP-04", "STEP-08", "STEP-09"]
  done_when:
    - "After supabase.auth.setSession() succeeds, changeLanguage(language) is called with the form's language value"
    - "UI renders in selected language immediately after registration"
    - "No regression: if language is already the device locale, no double-change occurs"
  tests:
    - type: unit
      description: "Verify register flow calls changeLanguage with the selected language after setSession"
  covers:
    acceptance_criteria: ["CR-02-AC-1", "CR-02-AC-2", "CR-02-AC-3", "CR-02-AC-4"]
    edge_cases: ["EC-CR02-1: Device locale matches ward language -- no-op is acceptable"]
  risks:
    - risk: "changeLanguage called before navigation might cause brief flicker"
      mitigation: "changeLanguage is synchronous (i18n.changeLanguage); React re-renders happen before navigation"
```

### STEP-06: CR-06 UI -- SundayCard Dropdown Labels + 'Other' Custom Reason Dialog

```yaml
- id: STEP-06
  description: "Update SundayTypeDropdown in SundayCard.tsx:
    (a) Change getTypeLabel for SUNDAY_TYPE_SPEECHES to use t('sundayExceptions.speeches') instead of t('speechStatus.not_assigned').
    (b) When 'other' is selected from dropdown, show a TextInput dialog (Alert.prompt on iOS, custom modal on Android) asking for the custom reason text. Store custom_reason alongside reason='other'.
    (c) In collapsed card header, when exception.reason is 'other' and custom_reason exists, display custom_reason text instead of 'Outro'.
    (d) Update SundayCardProps onTypeChange signature to accept optional customReason parameter."
  files:
    - "src/components/SundayCard.tsx"
  dependencies: ["STEP-02"]
  parallelizable_with: ["STEP-04", "STEP-05"]
  done_when:
    - "'Speeches' option label shows translated 'Domingo com Discursos' (not 'Nao designado')"
    - "Selecting 'Outro' from dropdown opens a text input dialog"
    - "Custom reason text is passed to onTypeChange callback"
    - "Collapsed card header for 'other' type shows the custom_reason text"
    - "All dropdown labels are translated via sundayExceptions.* i18n keys"
  tests:
    - type: unit
      description: "Verify getTypeLabel returns translated text for all 7 options"
    - type: integration
      description: "Verify 'other' selection triggers dialog flow"
  covers:
    acceptance_criteria: ["CR-06-AC-4"]
    edge_cases: ["EC-CR06-3: User cancels 'Other' dialog -- no change applied", "EC-CR06-4: User enters empty reason for 'Other' -- dialog stays open or rejects"]
  risks:
    - risk: "Alert.prompt not available on Android"
      mitigation: "Use custom Modal with TextInput that works cross-platform"
```

### STEP-07: CR-07 Hide Speeches for Non-Speech Sundays

```yaml
- id: STEP-07
  description: "In SundayCard.tsx expanded content, wrap {children} with a conditional: only render children (SpeechSlot components) when isSpeechesType is true. When a non-speeches type is selected, the expanded card shows only the type dropdown. Also verify this works correctly in NextSundaysSection.tsx and speeches.tsx tab where SundayCard is used."
  files:
    - "src/components/SundayCard.tsx"
  dependencies: ["STEP-02"]
  parallelizable_with: ["STEP-04", "STEP-05"]
  done_when:
    - "When exception.reason is not null (non-speeches type), expanded SundayCard shows only the type dropdown, no SpeechSlot children"
    - "When exception is null or currentType === SUNDAY_TYPE_SPEECHES, expanded card shows dropdown + children normally"
    - "LEDs in header still visible for all types (they show not_assigned status)"
    - "Behavior consistent in Speeches tab and Home tab NextSundaysSection"
  tests:
    - type: unit
      description: "Verify SundayCard with exception.reason='testimony_meeting' does not render children"
    - type: unit
      description: "Verify SundayCard with no exception renders children"
  covers:
    acceptance_criteria: ["CR-07-AC-1", "CR-07-AC-2", "CR-07-AC-3", "CR-07-AC-4"]
    edge_cases: ["EC-CR07-1: Switching between speeches and non-speeches type while card is expanded"]
  risks:
    - risk: "None significant -- single conditional render"
      mitigation: "N/A"
```

### STEP-08: CR-08 Topics Collection List Scrollable

```yaml
- id: STEP-08
  description: "Wrap the entire content of TopicsScreen in a ScrollView. Keep both FlatLists with scrollEnabled={false} (they render as non-scrolling lists inside the ScrollView). Add keyboardShouldPersistTaps='handled' and paddingBottom to the ScrollView. Move KeyboardAvoidingView inside or restructure to ScrollView as the main scrollable container."
  files:
    - "src/app/(tabs)/settings/topics.tsx"
  dependencies: []
  parallelizable_with: ["STEP-04", "STEP-05", "STEP-09"]
  done_when:
    - "All collections in the list are reachable by scrolling"
    - "Ward topics section is also scrollable when it grows long"
    - "Swipe-to-edit on ward topics still works within ScrollView"
    - "Toggle switches on collections still work"
    - "Keyboard avoiding behavior still works when adding/editing topics"
    - "No nested scroll warnings in console"
  tests:
    - type: integration
      description: "Verify all collections render and are scrollable"
    - type: integration
      description: "Verify swipe-to-edit remains functional within ScrollView wrapper"
  covers:
    acceptance_criteria: ["CR-08-AC-1", "CR-08-AC-2", "CR-08-AC-3", "CR-08-AC-4"]
    edge_cases: ["EC-CR08-1: Very long list (20+ collections) scrolls smoothly"]
  risks:
    - risk: "FlatList inside ScrollView loses virtualization"
      mitigation: "Collection and topic lists are small (< 50 items); virtualization not needed"
```

### STEP-09: CR-09 Settings Navigation Flash Fix

```yaml
- id: STEP-09
  description: "Add animation: 'none' to the Stack screenOptions in settings/_layout.tsx. This eliminates the default slide animation that causes a white flash when navigating between settings sub-screens and the settings index via tab re-press."
  files:
    - "src/app/(tabs)/settings/_layout.tsx"
  dependencies: []
  parallelizable_with: ["STEP-04", "STEP-05", "STEP-08"]
  done_when:
    - "Tapping Settings tab while on a sub-screen returns to index without white flash"
    - "No visible horizontal sliding animation on back-navigation"
    - "Forward navigation to sub-screens still works correctly (no animation, which is acceptable)"
  tests:
    - type: e2e
      description: "Manual: Navigate to Members, tap Settings tab, verify no flash"
  covers:
    acceptance_criteria: ["CR-09-AC-1", "CR-09-AC-2", "CR-09-AC-3"]
    edge_cases: []
  risks:
    - risk: "Removing animation may feel abrupt for forward navigation"
      mitigation: "Could use 'fade' instead of 'none' if a softer transition is preferred"
```

### STEP-10: CR-10 Theme Screen

```yaml
- id: STEP-10
  description: "Create settings/theme.tsx screen with 3 radio-style options: Automatic, Light, Dark. Each option shows the translated label from existing i18n keys (theme.automatic, theme.light, theme.dark). On select, calls setPreference() from ThemeContext (which already persists to AsyncStorage). Wire the Theme button in settings/index.tsx to navigate to this screen."
  files:
    - "src/app/(tabs)/settings/theme.tsx"
    - "src/app/(tabs)/settings/index.tsx"
  dependencies: []
  parallelizable_with: ["STEP-11"]
  done_when:
    - "Theme screen renders 3 options: Automatic, Light, Dark"
    - "Current selection is highlighted"
    - "Selecting an option immediately applies the theme and persists"
    - "Settings index Theme button navigates to /(tabs)/settings/theme"
    - "Back navigation returns to Settings index"
    - "Screen works in all 3 languages"
  tests:
    - type: unit
      description: "Verify theme screen renders 3 options"
    - type: unit
      description: "Verify selecting an option calls setPreference with correct value"
  covers:
    acceptance_criteria: ["CR-10-AC-1", "CR-10-AC-2", "CR-10-AC-3", "CR-10-AC-5"]
    edge_cases: ["EC-CR10-1: System theme is null/undefined (already handled by ThemeContext)"]
  risks:
    - risk: "None -- ThemeContext already handles all persistence logic"
      mitigation: "N/A"
```

### STEP-11: CR-10 About Screen

```yaml
- id: STEP-11
  description: "Create settings/about.tsx screen showing app name (from i18n common.appTitle), version (from app.json expo.version), and basic information. Static read-only screen, no permissions gating. Wire the About button in settings/index.tsx to navigate to this screen. Add about.version i18n key to all 3 locales if not already present."
  files:
    - "src/app/(tabs)/settings/about.tsx"
    - "src/app/(tabs)/settings/index.tsx"
    - "src/i18n/locales/pt-BR.json"
    - "src/i18n/locales/en.json"
    - "src/i18n/locales/es.json"
  dependencies: []
  parallelizable_with: ["STEP-10"]
  done_when:
    - "About screen renders with app name, version number"
    - "Settings index About button navigates to /(tabs)/settings/about"
    - "Back navigation returns to Settings index"
    - "Screen works in all 3 languages"
    - "about.version i18n key exists in all 3 locales"
  tests:
    - type: unit
      description: "Verify about screen renders app name and version"
  covers:
    acceptance_criteria: ["CR-10-AC-4", "CR-10-AC-5"]
    edge_cases: []
  risks:
    - risk: "Expo Constants API may differ between managed/bare workflow"
      mitigation: "Use app.json directly via require or expo-constants getConstants()"
```

### STEP-12: CR-03 Empty Agenda Rendering in Presentation Mode

```yaml
- id: STEP-12
  description: "Fix the presentation screen to render the agenda structure even when no agenda record exists. In buildPresentationCards(), instead of returning [] when agenda is null, construct default cards with all fields empty (value = ''). In presentation.tsx, remove the 'no results found' empty state (accordionCards.length === 0 check) or ensure it never triggers because buildPresentationCards always returns cards."
  files:
    - "src/hooks/usePresentationMode.ts"
    - "src/app/presentation.tsx"
  dependencies: ["STEP-02"]
  parallelizable_with: ["STEP-10", "STEP-11"]
  done_when:
    - "Pressing 'Start Meeting' renders the accordion with all sections visible, even if agenda is null"
    - "No 'Nenhum resultado encontrado' message is shown"
    - "Empty fields render as '---' (the existing fallback in PresentationFieldRow)"
    - "When agenda exists with data, it renders normally (no regression)"
    - "Special meeting types still render correctly (3 cards instead of 4)"
  tests:
    - type: unit
      description: "Verify buildPresentationCards returns non-empty array when agenda is null"
    - type: unit
      description: "Verify buildPresentationCards returns correct structure for null agenda with no exception"
    - type: unit
      description: "Verify buildPresentationCards returns correct structure for null agenda with special exception"
  covers:
    acceptance_criteria: ["CR-03-AC-1", "CR-03-AC-2", "CR-03-AC-3", "CR-03-AC-4"]
    edge_cases: ["EC-CR03-1: Agenda record exists but all fields are null", "EC-CR03-2: No agenda record at all (null)"]
  risks:
    - risk: "Null agenda may cause issues in hymn lookup"
      mitigation: "hymnLookup(null) already returns '' -- safe"
```

### STEP-13: CR-06 Spec Update -- Update SPEC_F007 Documentation

```yaml
- id: STEP-13
  description: "Update SPEC_F007.md to reflect the corrected sunday type dropdown options list. Remove references to fast_sunday, special_program, no_meeting. Add primary_presentation and other. Document the 'Other' option's custom reason text behavior."
  files:
    - "docs/specs/SPEC_F007.md"
  dependencies: ["STEP-02"]
  parallelizable_with: ["STEP-04", "STEP-05", "STEP-06", "STEP-07"]
  done_when:
    - "SPEC_F007 dropdown options list matches: Domingo com Discursos, Reuniao de Testemunho, Conferencia Geral, Conferencia de Estaca, Conferencia de Ala, Reuniao Especial da Primaria, Outro"
    - "Technical notes reflect the new SundayExceptionReason type"
    - "'Other' option behavior documented (custom reason text input)"
  tests:
    - type: unit
      description: "N/A (documentation)"
  covers:
    acceptance_criteria: []
    edge_cases: []
  risks:
    - risk: "None"
      mitigation: "N/A"
```

### STEP-14: Full Regression Test Run + Hardening

```yaml
- id: STEP-14
  description: "Run the complete test suite (npx vitest run) to verify all changes are green. Fix any remaining test failures. Verify TypeScript compilation (npx tsc --noEmit). Do a manual spot-check of the key flows."
  files: []
  dependencies: ["STEP-01", "STEP-02", "STEP-03", "STEP-04", "STEP-05", "STEP-06", "STEP-07", "STEP-08", "STEP-09", "STEP-10", "STEP-11", "STEP-12", "STEP-13"]
  parallelizable_with: []
  done_when:
    - "npx vitest run exits with 0 failures"
    - "npx tsc --noEmit exits with 0 errors"
    - "No runtime warnings or errors in console for the modified files"
  tests:
    - type: integration
      description: "Full test suite green"
    - type: e2e
      description: "Manual verification of all 10 CRs"
  covers:
    acceptance_criteria: []
    edge_cases: ["EC-ALL: Full regression across all modules"]
  risks:
    - risk: "Unforeseen test interactions"
      mitigation: "Fix immediately as part of this step"
```

---

## Validation

```yaml
validation:
  - ac_id: CR-01
    how_to_verify: "Open Home tab on a Sunday. Section title 'Agenda da Reuniao Sacramental' visible above button. Try all 3 languages."
    covered_by_steps: ["STEP-04"]

  - ac_id: CR-02
    how_to_verify: "Create a new ward selecting pt-BR. After registration, UI should be in Portuguese immediately."
    covered_by_steps: ["STEP-05"]

  - ac_id: CR-03
    how_to_verify: "Press 'Start Meeting' when no agenda exists. Accordion renders with empty fields (---), no 'no results' message."
    covered_by_steps: ["STEP-12"]

  - ac_id: CR-04
    how_to_verify: "Set a sunday to 'Conferencia Geral'. Collapse the card. Header shows 'Conferencia Geral' not 'general_conference'."
    covered_by_steps: ["STEP-04"]

  - ac_id: CR-05
    how_to_verify: "Expand a sunday card. Speech slots show '1o DISCURSO', '2o DISCURSO', '3o DISCURSO' (uppercase applied by CSS)."
    covered_by_steps: ["STEP-04"]

  - ac_id: CR-06
    how_to_verify: "Open dropdown: shows exactly 7 options (Domingo com Discursos, Reuniao de Testemunho, Conferencia Geral, Conferencia de Estaca, Conferencia de Ala, Reuniao Especial da Primaria, Outro). Select 'Outro', type reason, verify it persists."
    covered_by_steps: ["STEP-01", "STEP-02", "STEP-03", "STEP-06", "STEP-13"]

  - ac_id: CR-07
    how_to_verify: "Select 'Reuniao de Testemunho' from dropdown. Expand card. Only dropdown visible, no speech slots."
    covered_by_steps: ["STEP-07"]

  - ac_id: CR-08
    how_to_verify: "Go to Settings > Topics. Scroll down. All general collections visible and toggleable."
    covered_by_steps: ["STEP-08"]

  - ac_id: CR-09
    how_to_verify: "Go to Settings > Members. Tap Settings tab again. Screen returns instantly, no white flash or slide."
    covered_by_steps: ["STEP-09"]

  - ac_id: CR-10
    how_to_verify: "Tap Theme button in Settings: shows 3 options, selection applies immediately. Tap About button: shows app name and version."
    covered_by_steps: ["STEP-10", "STEP-11"]
```

---

## Execution Order Diagram

```
STEP-01 (DB migration)
  |
  v
STEP-02 (Types + Hooks + i18n)
  |
  v
STEP-03 (Test updates)
  |
  ├──> STEP-04 (CR-01 + CR-04 + CR-05) ──┐
  ├──> STEP-06 (CR-06 UI dropdown)  ──────┤
  ├──> STEP-07 (CR-07 hide speeches) ─────┤
  ├──> STEP-12 (CR-03 empty agenda) ──────┤
  └──> STEP-13 (SPEC_F007 update) ────────┤
                                           |
STEP-05 (CR-02 language) ─────────────────┤  (independent)
STEP-08 (CR-08 scroll) ──────────────────┤  (independent)
STEP-09 (CR-09 nav flash) ────────────────┤  (independent)
STEP-10 (CR-10 theme screen) ─────────────┤  (independent)
STEP-11 (CR-10 about screen) ─────────────┤  (independent)
                                           |
                                           v
                                     STEP-14 (Regression)
```

### Parallel Tracks

- **Track A (critical path):** STEP-01 -> STEP-02 -> STEP-03 -> STEP-06 -> STEP-07
- **Track B (independent fixes):** STEP-05, STEP-08, STEP-09 (can start immediately)
- **Track C (new screens):** STEP-10, STEP-11 (can start immediately)

Steps 04, 12, 13 depend on STEP-02 (i18n keys) but run parallel with each other and with Track B/C.
