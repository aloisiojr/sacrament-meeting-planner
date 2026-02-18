# SPEC_CR4_F005 - CSV & Members Screen Fixes

## SPEC_SUMMARY

```yaml
type: spec_summary
goal: "Fix CSV export/import bugs and Members screen header alignment when read-only"
in_scope:
  - "Fix CSV export error on share sheet cancel (CR-54)"
  - "Fix hardcoded English error message on CSV import failure (CR-54)"
  - "Fix Members screen header title misalignment when add button hidden (CR-55)"
  - "Fix CSV export doing nothing when no members exist (CR-66)"
  - "Fix CSV import showing uninformative error dialog (CR-66)"
out_of_scope:
  - "Redesign Members screen layout"
  - "Add new CSV fields or formats"
  - "Change import/export business logic beyond bug fixes"
main_risks:
  - "Share sheet cancellation detection varies by platform (iOS vs Android)"
  - "CSV parse error messages must be informative without exposing technical details"
ac_count: 10
edge_case_count: 5
has_open_questions: false
has_unconfirmed_assumptions: true
```

## SPEC

```yaml
type: spec
version: 1
goal: "Fix CSV export/import error handling, Members screen header alignment, and empty export behavior"

scope:
  in:
    - "CR-54: CSV export - distinguish user cancel from real errors on share sheet"
    - "CR-54: CSV import - replace hardcoded English error with i18n key"
    - "CR-55: Members screen - add header spacer when add button not rendered (canWrite=false)"
    - "CR-66: CSV export - allow export when members list is empty (export headers only)"
    - "CR-66: CSV import - show informative validation error messages instead of generic dialog"
  out:
    - "Changing CSV column format or adding new columns"
    - "Changing member CRUD business logic"
    - "Changing member search or sort behavior"

acceptance_criteria:
  - id: AC-1
    given: "User has members and clicks Export CSV on mobile"
    when: "The share sheet appears and the user cancels/dismisses it"
    then: "No error alert is shown; the action is silently ignored"
    priority: must

  - id: AC-2
    given: "User clicks Export CSV on mobile"
    when: "A real error occurs during file write or sharing (e.g., disk full, permission denied)"
    then: "An error alert is shown using the i18n key t('members.exportFailed')"
    priority: must

  - id: AC-3
    given: "User clicks Import CSV on mobile"
    when: "The file read fails (e.g., corrupted file, permission denied)"
    then: "An error alert is shown using the i18n key t('members.importFailed') instead of hardcoded 'Failed to read file'"
    priority: must

  - id: AC-4
    given: "User clicks Import CSV and selects a file"
    when: "The CSV has validation errors (missing columns, empty names, invalid phone format)"
    then: "The error dialog shows specific line numbers and field names indicating what is wrong, translated into the current language"
    priority: must

  - id: AC-5
    given: "User clicks Import CSV and selects a file"
    when: "The CSV is empty (no data rows, only headers or nothing)"
    then: "An informative message is shown: t('members.importEmpty') - no crash, no generic error"
    priority: must

  - id: AC-6
    given: "User is on Members screen with canWrite=false (Observer role)"
    when: "The add button (+) is not rendered"
    then: "A transparent spacer element with width 36 occupies the add button position, keeping the title centered in the header"
    priority: must

  - id: AC-7
    given: "User is on Members screen with no members (members list is empty)"
    when: "User clicks Export CSV"
    then: "A CSV file is generated and shared containing only the header row (full_name,phone columns) with no data rows"
    priority: must

  - id: AC-8
    given: "User is on Members screen with no members"
    when: "The Export CSV button is rendered"
    then: "The Export CSV button is enabled (not disabled/grayed out) regardless of member count"
    priority: must

  - id: AC-9
    given: "Error messages for CSV import validation failures"
    when: "The app language is pt-BR, en, or es"
    then: "All error messages are translated in all 3 supported languages"
    priority: must

  - id: AC-10
    given: "Share sheet cancel detection"
    when: "On iOS the cancel results in err?.message containing 'User did not share' and on Android it may throw differently"
    then: "The code checks for cancellation patterns from expo-sharing on both platforms and does not show error"
    priority: should

edge_cases:
  - id: EC-1
    case: "User rapidly taps Export CSV multiple times"
    expected: "Only one share sheet opens; subsequent taps are ignored until share completes"

  - id: EC-2
    case: "Import CSV file is not actually CSV (e.g., .xlsx renamed to .csv)"
    expected: "Parse error is caught and an informative i18n error is shown, not a crash"

  - id: EC-3
    case: "Import CSV with mixed valid and invalid rows"
    expected: "All validation errors are collected and displayed together (not just the first one)"

  - id: EC-4
    case: "Export CSV when members have names with commas, quotes, or newlines"
    expected: "CSV is properly escaped per RFC 4180 (existing behavior - no regression)"

  - id: EC-5
    case: "Members screen with canWrite=true shows the + button"
    expected: "No spacer is added; the header layout remains identical to current behavior"

assumptions:
  - id: A-1
    description: "expo-sharing throws an error with message containing 'User did not share' when user cancels on iOS"
    confirmed: false
    default_if_not_confirmed: "Check for both 'User did not share' and 'cancelled' in error message string"

  - id: A-2
    description: "The CSV header row for empty export uses the same columns as the current generateCsv function"
    confirmed: true
    default_if_not_confirmed: "Use 'full_name,phone' as the header"

  - id: A-3
    description: "CSV import validation error messages should show all errors at once, not fail on first error"
    confirmed: false
    default_if_not_confirmed: "Show all errors - this matches the existing parseCsv behavior that collects errors"

open_questions: []

definition_of_done:
  - "Export CSV with 0 members produces a valid CSV file with headers only"
  - "Export CSV cancel on share sheet produces no error alert"
  - "Import CSV file read failure shows i18n translated error message"
  - "Import CSV validation failure shows specific line/field errors in current language"
  - "Members screen title is centered when add button is hidden"
  - "All error strings use i18n keys (no hardcoded English)"
  - "All 3 languages (pt-BR, en, es) have the new i18n keys"
  - "No regressions in existing CSV import/export functionality"
```
