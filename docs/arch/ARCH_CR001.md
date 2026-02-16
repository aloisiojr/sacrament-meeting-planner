# ARCH_CR001 - Change Requests Batch 1 (10 CRs)

```yaml
type: arch
version: 1
status: complete
module: ChangeRequests_Batch1
features: [CR-01, CR-02, CR-03, CR-04, CR-05, CR-06, CR-07, CR-08, CR-09, CR-10]
```

## Overview

```yaml
goal: "Fix 10 bugs and UI issues across existing modules without adding new tables, components, or Edge Functions"
principles:
  - "All changes are localized to existing files - no new modules or components"
  - "Sunday type enum must be corrected across all layers (DB, types, i18n, hooks, tests)"
  - "Translation keys solve both label and display issues consistently"
  - "UI-only fixes stay in the component layer; data fixes propagate through all layers"
```

## Diagram

```
  Affected Modules & Files per CR
  ================================

  CR-01 (Home title)          --> UIShell: index.tsx, i18n locales
  CR-02 (Language mismatch)   --> AuthModule: register.tsx, i18n/index.ts
  CR-03 (Empty agenda)        --> AgendaModule: presentation.tsx, usePresentationMode.ts
  CR-04 (Exception display)   --> SpeechModule: SundayCard.tsx (use i18n key)
  CR-05 (Speech labels)       --> SpeechModule: SpeechSlot.tsx, i18n locales
  CR-06 (Sunday options)      --> WardDataModule: database.ts, useSundayTypes.ts,
                                  001_initial_schema.sql, i18n locales,
                                  SundayCard.tsx, SPEC_F007.md,
                                  003_notification_triggers.sql
  CR-07 (Hide speeches)       --> SpeechModule: SundayCard.tsx
  CR-08 (Collection scroll)   --> WardDataModule: topics.tsx
  CR-09 (Settings flash)      --> UIShell: settings/_layout.tsx
  CR-10 (Theme/About buttons) --> UIShell: settings/index.tsx, settings/theme.tsx (new),
                                  settings/about.tsx (new)
```

## Change Request Analysis

### CR-01: Home Tab Title for Meeting Button

**Module:** UIShell (M008)
**Affected files:** `src/app/(tabs)/index.tsx`, `src/i18n/locales/*.json`
**Impact:** UI-only

```yaml
problem: "When 'Start Sacrament Meeting' button is visible (Sundays), there is no
  section title above it like other sections ('Next Assignments', etc.)"
solution: "Add a section title 'Agenda da Reuniao Sacramental' (i18n key:
  home.meetingAgendaTitle) above the button, styled identically to
  home.nextAssignments section header"
changes:
  - file: src/app/(tabs)/index.tsx
    action: "Wrap meeting button in a section with title Text component above it"
  - file: src/i18n/locales/pt-BR.json
    action: "Add home.meetingAgendaTitle = 'Agenda da Reuniao Sacramental'"
  - file: src/i18n/locales/en.json
    action: "Add home.meetingAgendaTitle = 'Sacrament Meeting Agenda'"
  - file: src/i18n/locales/es.json
    action: "Add home.meetingAgendaTitle = 'Agenda de la Reunion Sacramental'"
```

### CR-02: Language Mismatch on Ward Creation

**Module:** AuthModule (M001)
**Affected files:** `src/app/(auth)/register.tsx`, `src/i18n/index.ts`
**Impact:** i18n initialization flow

```yaml
problem: "User creates ward selecting pt-BR but UI renders in en-US because i18n
  initializes from device locale, not from the selected ward language"
solution: "After successful registration, call changeLanguage(language) with the
  ward language selected in the registration form BEFORE navigating to Home"
changes:
  - file: src/app/(auth)/register.tsx
    action: "After supabase.auth.setSession(), call changeLanguage(language) where
      'language' is the selected form value"
  - file: src/i18n/index.ts
    action: "No change needed - changeLanguage() already exists"
contract:
  flow: |
    1. User fills registration form with language = 'pt-BR'
    2. Edge Function creates ward + user
    3. Client receives session
    4. Client calls changeLanguage('pt-BR')
    5. AuthContext triggers navigation to Home
    6. Home renders in pt-BR
```

### CR-03: Empty Agenda Rendering in Presentation Mode

**Module:** AgendaModule (M004)
**Affected files:** `src/app/presentation.tsx`, `src/hooks/usePresentationMode.ts`
**Impact:** Presentation Mode render logic

```yaml
problem: "Clicking 'Start Sacrament Meeting' shows 'No results found' when agenda
  is empty. Should render the agenda structure with empty fields."
solution: "PresentationMode must render the accordion structure even when the agenda
  record does not exist or all fields are null. The query hook should return a
  default empty agenda object instead of null/undefined."
changes:
  - file: src/hooks/usePresentationMode.ts
    action: "When no agenda record exists for today, return a default empty
      PresentationData object with all fields null but structure intact"
  - file: src/app/presentation.tsx
    action: "Remove any 'no results' guard and always render the accordion
      sections. Empty fields render as empty/placeholder text."
contract:
  default_presentation_data:
    presiding: null  # renders as empty field, not 'no results'
    conducting: null
    speeches: []     # 3 empty slots
    hymns: {}        # all null
    prayers: {}      # all null
```

### CR-04: Exception Display Text

**Module:** SpeechModule (M003) / SundayCard component
**Affected files:** `src/components/SundayCard.tsx`
**Impact:** UI-only (translation key already exists)

```yaml
problem: "Collapsed SundayCard shows raw enum value 'general_conference' instead
  of translated text 'Conferencia Geral'"
solution: "In SundayCard header, use t('sundayExceptions.${currentType}') instead
  of raw currentType value"
changes:
  - file: src/components/SundayCard.tsx
    action: "Replace line 231 (currentType) with t('sundayExceptions.${currentType}')
      to use the existing i18n translation key"
    before: "currentType"
    after: "t(`sundayExceptions.${currentType}`)"
```

### CR-05: Speech Labels

**Module:** SpeechModule (M003) / SpeechSlot component
**Affected files:** `src/components/SpeechSlot.tsx`, `src/i18n/locales/*.json`
**Impact:** i18n keys only

```yaml
problem: "Speech slot labels show 'VAGA 1o' instead of '1o Discurso'.
  Current i18n key speeches.slot = 'Vaga {{number}}' is wrong."
solution: "Change i18n key to use ordinal + 'Discurso' pattern"
changes:
  - file: src/i18n/locales/pt-BR.json
    action: "Change speeches.slot from 'Vaga {{number}}' to '{{number}} Discurso'"
  - file: src/i18n/locales/en.json
    action: "Change speeches.slot from 'Slot {{number}}' to '{{number}} Speech'"
  - file: src/i18n/locales/es.json
    action: "Change speeches.slot from 'Espacio {{number}}' to '{{number}} Discurso'"
  - file: src/components/SpeechSlot.tsx
    action: "No change needed - getPositionLabel already uses speeches.slot with
      {{number}} interpolation and appends the ordinal suffix"
```

### CR-06: Sunday Options List (CRITICAL)

**Module:** WardDataModule (M002) -- cross-cutting (DB, types, hooks, i18n, tests, specs)
**Affected files:** Multiple layers
**Impact:** Database schema change + full-stack type propagation

```yaml
problem: "Sunday type options are wrong. Current list includes invalid types
  (fast_sunday, special_program, no_meeting) and is missing the correct type
  (primary_presentation). The correct list is: speeches, testimony_meeting,
  general_conference, stake_conference, ward_conference,
  primary_presentation, other"
solution: "Replace the enum values across ALL layers"
```

#### Correct Sunday Type Enum

```yaml
old_values:
  - speeches
  - testimony_meeting
  - general_conference
  - stake_conference
  - ward_conference
  - fast_sunday        # REMOVE
  - special_program    # REMOVE
  - no_meeting         # REMOVE
  - other              # KEEP (was missing from SundayExceptionReason type)

new_values:
  - speeches                # Default type (with speeches)
  - testimony_meeting       # Reuniao de Testemunho
  - general_conference      # Conferencia Geral
  - stake_conference        # Conferencia de Estaca
  - ward_conference         # Conferencia de Ala
  - primary_presentation    # ADD: Reuniao Especial da Primaria
  - other                   # ADD to type: Outro (user types custom reason)
```

#### Changes by Layer

```yaml
database:
  - file: supabase/migrations/008_fix_sunday_type_enum.sql (NEW)
    action: |
      ALTER TABLE sunday_exceptions DROP CONSTRAINT sunday_exceptions_reason_check;
      ALTER TABLE sunday_exceptions ADD CONSTRAINT sunday_exceptions_reason_check
        CHECK (reason IN (
          'testimony_meeting',
          'general_conference',
          'stake_conference',
          'ward_conference',
          'primary_presentation',
          'other'
        ));
      -- Migrate any existing data:
      UPDATE sunday_exceptions SET reason = 'other'
        WHERE reason IN ('fast_sunday', 'special_program', 'no_meeting');

types:
  - file: src/types/database.ts
    action: |
      Replace SundayExceptionReason type:
      export type SundayExceptionReason =
        | 'testimony_meeting'
        | 'general_conference'
        | 'stake_conference'
        | 'ward_conference'
        | 'primary_presentation'
        | 'other';

hooks:
  - file: src/hooks/useSundayTypes.ts
    action: |
      Replace SUNDAY_TYPE_OPTIONS:
      export const SUNDAY_TYPE_OPTIONS = [
        SUNDAY_TYPE_SPEECHES,
        'testimony_meeting',
        'general_conference',
        'stake_conference',
        'ward_conference',
        'primary_presentation',
        'other',
      ] as const;

i18n:
  - file: src/i18n/locales/pt-BR.json
    action: |
      Replace sundayExceptions:
      {
        "testimony_meeting": "Reuniao de Testemunho",
        "general_conference": "Conferencia Geral",
        "stake_conference": "Conferencia de Estaca",
        "ward_conference": "Conferencia da Ala",
        "primary_presentation": "Reuniao Especial da Primaria",
        "other": "Outro",
        "speeches": "Domingo com Discursos"
      }
  - file: src/i18n/locales/en.json
    action: |
      Replace sundayExceptions:
      {
        "testimony_meeting": "Testimony Meeting",
        "general_conference": "General Conference",
        "stake_conference": "Stake Conference",
        "ward_conference": "Ward Conference",
        "primary_presentation": "Primary Special Presentation",
        "other": "Other",
        "speeches": "Sunday with Speeches"
      }
  - file: src/i18n/locales/es.json
    action: |
      Replace sundayExceptions:
      {
        "testimony_meeting": "Reunion de Testimonios",
        "general_conference": "Conferencia General",
        "stake_conference": "Conferencia de Estaca",
        "ward_conference": "Conferencia de Barrio",
        "primary_presentation": "Presentacion Especial de la Primaria",
        "other": "Otro",
        "speeches": "Domingo con Discursos"
      }

component:
  - file: src/components/SundayCard.tsx
    action: |
      In SundayTypeDropdown.getTypeLabel():
      - For SUNDAY_TYPE_SPEECHES: use t('sundayExceptions.speeches')
        instead of t('speechStatus.not_assigned')
      In handleSelect():
      - When 'other' is selected: show Alert.prompt (or TextInput modal)
        asking for custom reason text, then call onSelect('other')
        with the reason text

notifications:
  - file: supabase/migrations/003_notification_triggers.sql
    action: "Update any references to old enum values in trigger conditions"

specs:
  - file: docs/specs/SPEC_F007.md
    action: "Update Technical Notes dropdown options list"

tests:
  - All test files referencing old enum values must be updated
```

#### "Other" Option Dialog Flow

```yaml
flow:
  1: "User selects 'Other' from dropdown"
  2: "Modal dialog opens with TextInput for custom reason"
  3: "User types reason (e.g., 'Reuniao com Setenta') and taps OK"
  4: "onTypeChange called with reason='other'"
  5: "Custom text stored in a new 'custom_reason' column on sunday_exceptions"
  6: "Collapsed card shows custom reason text instead of 'Outro'"

schema_change:
  table: sunday_exceptions
  add_column: "custom_reason TEXT"
  note: "Only populated when reason='other'; displayed in collapsed card header"
```

### CR-07: Hide Speeches for Non-Speech Sundays (CRITICAL)

**Module:** SpeechModule (M003) / SundayCard component
**Affected files:** `src/components/SundayCard.tsx`
**Impact:** Conditional rendering in expanded card

```yaml
problem: "When a non-speeches option is selected, the 3 speech slots and topic
  fields still show. Only 'speeches' type should show speech content."
solution: "In SundayCard expanded content, conditionally render children (speech
  slots) only when currentType === SUNDAY_TYPE_SPEECHES"
changes:
  - file: src/components/SundayCard.tsx
    action: |
      In the expanded content section, wrap {children} in a condition:
      {expanded && (
        <View style={styles.expandedContent}>
          <SundayTypeDropdown ... />
          {isSpeechesType && children}
        </View>
      )}
    note: "isSpeechesType is already computed on line 190"
```

### CR-08: Topics Collection Scroll (CRITICAL)

**Module:** WardDataModule (M002) / TopicsScreen
**Affected files:** `src/app/(tabs)/settings/topics.tsx`
**Impact:** UI layout / scroll behavior

```yaml
problem: "The General Collections FlatList has scrollEnabled={false} and the parent
  KeyboardAvoidingView does not scroll, so collections below the fold are
  unreachable"
solution: "Replace the outer KeyboardAvoidingView with a ScrollView wrapper,
  or set scrollEnabled={true} on the collections FlatList. Preferred: wrap
  both sections in a ScrollView instead of nested FlatLists."
changes:
  - file: src/app/(tabs)/settings/topics.tsx
    action: |
      Option A (preferred): Replace KeyboardAvoidingView as outer wrapper with
      ScrollView, and keep both FlatLists with scrollEnabled={false}
      (FlatLists inside ScrollView).

      Option B: Change collections FlatList to scrollEnabled={true} and
      give it a fixed maxHeight or use flex.

      Recommended: Option A - wrap everything in a ScrollView and keep
      FlatLists as non-scrolling lists inside it.
    before: |
      <KeyboardAvoidingView style={styles.flex} ...>
        {/* Ward Topics */}
        <FlatList scrollEnabled={false} ... />
        {/* Collections */}
        <FlatList scrollEnabled={false} ... />
      </KeyboardAvoidingView>
    after: |
      <ScrollView style={styles.flex}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}>
        <KeyboardAvoidingView ...>
          {/* Ward Topics */}
          <FlatList scrollEnabled={false} ... />
          {/* Collections */}
          <FlatList scrollEnabled={false} ... />
        </KeyboardAvoidingView>
      </ScrollView>
```

### CR-09: Settings Navigation Flash

**Module:** UIShell (M008) / Settings layout
**Affected files:** `src/app/(tabs)/settings/_layout.tsx`
**Impact:** Navigation animation

```yaml
problem: "When navigating from a sub-screen (Members, Topics, etc.) back to
  Settings index by tapping the Settings tab, there is a white flash
  and horizontal slide animation"
solution: "Add animation='none' or animation='fade' to the Stack screenOptions
  to eliminate the slide transition. The flash is caused by the default
  slide animation exposing the background between screens."
changes:
  - file: src/app/(tabs)/settings/_layout.tsx
    action: |
      Add animation: 'none' (or 'fade') to screenOptions:
      <Stack screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'none',
      }} />
    note: "animation: 'none' eliminates the transition entirely.
      'fade' provides a subtle crossfade. Both fix the white flash."
```

### CR-10: Theme and About Buttons

**Module:** UIShell (M008) / Settings
**Affected files:** `src/app/(tabs)/settings/index.tsx`, new files for screens
**Impact:** New screens + navigation wiring

```yaml
problem: "Theme and About buttons in Settings have onPress={() => {}} (no-op)"
solution: "Create two new screens: theme selector and about screen.
  Wire navigation from Settings index."
```

#### Theme Screen

```yaml
file: src/app/(tabs)/settings/theme.tsx (NEW)
behavior: |
  - Display 3 radio-style options: Automatic, Light, Dark
  - Each option shows an icon (phone, sun, moon)
  - Current selection highlighted
  - On select: calls setPreference() from ThemeContext
  - Persists to AsyncStorage (already handled by ThemeContext)
  - Observer: show system mode only (no manual override per spec)
contract:
  uses:
    - ThemeContext.preference
    - ThemeContext.setPreference
  options:
    - { key: 'automatic', icon: phone, label: t('theme.automatic') }
    - { key: 'light', icon: sun, label: t('theme.light') }
    - { key: 'dark', icon: moon, label: t('theme.dark') }
```

#### About Screen

```yaml
file: src/app/(tabs)/settings/about.tsx (NEW)
behavior: |
  - Display app name, version (from app.json), and basic info
  - Static read-only screen
  - No permissions gating (all roles can view)
contract:
  displays:
    - App name from i18n common.appTitle
    - Version from expo-constants or app.json
    - Build info if available
i18n_keys:
  - about.version: "Versao" / "Version" / "Version"
  - about.appDescription: (optional brief description)
```

#### Settings Navigation Update

```yaml
file: src/app/(tabs)/settings/index.tsx
changes:
  - Theme button: onPress={() => router.push('/(tabs)/settings/theme')}
  - About button: onPress={() => router.push('/(tabs)/settings/about')}
```

## Data Model Changes

```yaml
migrations:
  - id: "008_fix_sunday_type_enum.sql"
    changes:
      - "Drop and recreate CHECK constraint on sunday_exceptions.reason"
      - "Add column: custom_reason TEXT (for 'other' type)"
      - "Migrate existing data: fast_sunday, special_program, no_meeting -> other"

tables_affected:
  sunday_exceptions:
    reason_values_removed: [fast_sunday, special_program, no_meeting]
    reason_values_added: [primary_presentation, other]
    columns_added:
      - custom_reason: "TEXT, nullable, stores user-typed reason when reason='other'"
```

## Impact on Existing Modules

| Module | CRs | Severity |
|--------|-----|----------|
| M001 AuthModule | CR-02 | Low (1 line change in register.tsx) |
| M002 WardDataModule | CR-06, CR-08 | High (schema change, type change, enum migration) |
| M003 SpeechModule | CR-04, CR-05, CR-07 | Medium (UI fixes, i18n key changes) |
| M004 AgendaModule | CR-03 | Medium (empty state handling) |
| M005 NotificationModule | CR-06 | Low (update trigger conditions for new enum) |
| M006 SyncEngine | - | None |
| M007 OfflineManager | - | None |
| M008 UIShell | CR-01, CR-09, CR-10 | Medium (new screens, nav fix, title) |

## Cross-cutting Changes

| Area | Changes |
|------|---------|
| i18n (all 3 locales) | CR-01 (new key), CR-05 (fix label), CR-06 (new enum labels + speeches label) |
| Types (database.ts) | CR-06 (SundayExceptionReason enum change + SundayException.custom_reason) |
| Database (migrations) | CR-06 (008_fix_sunday_type_enum.sql) |
| Tests | CR-06 (update all tests referencing old enum values) |
| Specs | CR-06 (update SPEC_F007 dropdown options) |

## Execution Order (Dependencies)

```
Phase 1 (no dependencies - can be done in any order):
  CR-01  Home tab title
  CR-02  Language mismatch
  CR-04  Exception display text
  CR-05  Speech labels
  CR-08  Collection scroll
  CR-09  Settings navigation flash

Phase 2 (CR-06 first, then dependents):
  CR-06  Sunday options list (MUST be done before CR-07)
  CR-07  Hide speeches for non-speech sundays (depends on CR-06 enum)

Phase 3 (independent but benefits from CR-06):
  CR-03  Empty agenda rendering
  CR-10  Theme and About buttons
```

## ADRs

```yaml
adrs:
  - id: ADR-010
    title: "Replace sunday type enum with corrected list"
    context: "Original enum included wrong types (fast_sunday, special_program, no_meeting)
      and was missing primary_presentation and other"
    decision: "Migration 008 drops and recreates CHECK constraint; adds custom_reason
      column; migrates existing data to 'other'"
    consequences:
      - "Existing data with removed types automatically migrated"
      - "All layers (DB, types, hooks, i18n, tests, specs) must be updated atomically"

  - id: ADR-011
    title: "Use ScrollView wrapper for Topics screen instead of nested scrollable lists"
    context: "Nested FlatLists with scrollEnabled=false inside non-scrollable container
      makes content below fold unreachable"
    decision: "Wrap entire content in ScrollView; keep FlatLists as non-scrolling
      rendered lists"
    consequences:
      - "All content becomes scrollable"
      - "FlatList virtualization is effectively disabled (acceptable for small lists)"
```
