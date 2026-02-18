# PLAN_CR4_F005 - CSV & Members Screen Fixes

## PLAN_SUMMARY

```yaml
type: plan_summary
total_steps: 5
parallel_tracks: 2
estimated_commits: 5
coverage:
  acceptance_criteria: 10/10
  edge_cases: 5/5
critical_path:
  - "STEP-01: i18n keys for CSV errors"
  - "STEP-02: Fix CSV export (cancel detection + empty export)"
  - "STEP-03: Fix CSV import (i18n errors + informative validation)"
main_risks:
  - "Share sheet cancellation detection varies between iOS and Android"
  - "CSV parse error messages must cover all 3 languages without exposing technical details"
```

## PLAN

```yaml
type: plan
version: 1

goal: "Fix CSV export/import error handling, empty-export behavior, and Members screen header alignment"

strategy:
  order: "i18n keys first -> Export fixes -> Import fixes -> Header spacer -> Tests"
  commit_strategy: "1 commit per step, conventional commit messages"
  test_strategy: "Tests created alongside fixes; Vitest unit tests for csvUtils, component behavior"

steps:
  - id: STEP-01
    description: "Add all new i18n keys for CSV import/export error messages in all 3 languages"
    files:
      - "src/i18n/locales/pt-BR.json"
      - "src/i18n/locales/en.json"
      - "src/i18n/locales/es.json"
    dependencies: []
    parallelizable_with: []
    done_when:
      - "pt-BR.json contains keys: members.importEmpty, members.importErrorLine, members.exportFailed"
      - "en.json contains the same keys with English translations"
      - "es.json contains the same keys with Spanish translations"
      - "members.importErrorLine uses interpolation: {line}, {field}, {error}"
    tests:
      - type: unit
        description: "Verify all 3 locale files have the new keys and that interpolation placeholders are present"
    covers:
      acceptance_criteria: ["AC-9"]
      edge_cases: []
    risks:
      - risk: "Typo in i18n key names causing runtime fallback"
        mitigation: "Use exact key names from ARCH_CR4_F005 contract"

  - id: STEP-02
    description: "Fix CSV export: allow empty export (headers only), detect share sheet cancel silently, guard against double-tap"
    files:
      - "src/app/(tabs)/settings/members.tsx"
      - "src/lib/csvUtils.ts"
    dependencies: ["STEP-01"]
    parallelizable_with: []
    done_when:
      - "generateCsv handles empty array: returns BOM + header row ('Nome,Telefone Completo\\n') with no data rows"
      - "handleExport removes the guard `if (!members || members.length === 0) return` - always allows export"
      - "Export CSV button is never disabled (remove `disabled={!members || members.length === 0}` prop)"
      - "catch block in handleExport detects share sheet cancel: checks err.message for 'User did not share' or 'cancelled' (case-insensitive) and returns silently"
      - "Real export errors show Alert with t('members.exportFailed')"
      - "A loading/exporting guard ref prevents double-tap (only one share sheet at a time)"
    tests:
      - type: unit
        description: "Test generateCsv([]) returns header-only CSV"
      - type: unit
        description: "Test share sheet cancel detection logic (mock error with 'User did not share')"
      - type: unit
        description: "Test real error still triggers Alert"
    covers:
      acceptance_criteria: ["AC-1", "AC-2", "AC-7", "AC-8", "AC-10"]
      edge_cases: ["EC-1", "EC-4"]
    risks:
      - risk: "Platform-specific cancel message strings"
        mitigation: "Check both 'user did not share' and 'cancelled' in lowercased error message"

  - id: STEP-03
    description: "Fix CSV import: use i18n for all error messages, show informative validation errors with line numbers, handle empty CSV"
    files:
      - "src/app/(tabs)/settings/members.tsx"
    dependencies: ["STEP-01"]
    parallelizable_with: ["STEP-02"]
    done_when:
      - "handleImport catch block uses t('members.importFailed') instead of hardcoded 'Failed to read file'"
      - "importMutation mutationFn: when parseCsv returns errors, format each error using t('members.importErrorLine', { line, field, error }) and join with newline"
      - "importMutation mutationFn: when parseCsv returns success but members.length === 0, show t('members.importEmpty') instead of proceeding"
      - "Import error dialog shows all validation errors at once (already collected by parseCsv), formatted per line"
      - "No hardcoded English strings remain in import flow"
    tests:
      - type: unit
        description: "Test import with corrupted file shows t('members.importFailed')"
      - type: unit
        description: "Test import with validation errors shows line-by-line errors in current language"
      - type: unit
        description: "Test import with empty CSV (headers only, no data) shows t('members.importEmpty')"
    covers:
      acceptance_criteria: ["AC-3", "AC-4", "AC-5"]
      edge_cases: ["EC-2", "EC-3"]
    risks:
      - risk: "Error message string might be too long for Alert on small screens"
        mitigation: "Join errors with newlines; Alert.alert handles scrollable content natively on iOS/Android"

  - id: STEP-04
    description: "Fix Members screen header: add transparent spacer when canWrite=false to keep title centered"
    files:
      - "src/app/(tabs)/settings/members.tsx"
    dependencies: []
    parallelizable_with: ["STEP-01", "STEP-02", "STEP-03"]
    done_when:
      - "When canWrite=false, a <View style={{ width: 36 }} /> is rendered in place of the add button"
      - "Header uses 3-element row: [back button] [title] [add button OR spacer]"
      - "Title remains centered with flexDirection: 'row', justifyContent: 'space-between'"
      - "When canWrite=true, layout is identical to current behavior (no regression)"
    tests:
      - type: unit
        description: "Test that when canWrite=false, spacer element exists with width 36"
      - type: unit
        description: "Test that when canWrite=true, add button renders and no spacer exists"
    covers:
      acceptance_criteria: ["AC-6"]
      edge_cases: ["EC-5"]
    risks:
      - risk: "Width mismatch between spacer and actual button"
        mitigation: "Both use width: 36 (add button already has width: 36 in styles.addButton)"

  - id: STEP-05
    description: "Add comprehensive tests for all CSV and header fixes"
    files:
      - "src/__tests__/cr004-f005-csv-members.test.ts"
    dependencies: ["STEP-02", "STEP-03", "STEP-04"]
    parallelizable_with: []
    done_when:
      - "Tests cover: generateCsv with empty array, share sheet cancel detection, import error i18n, validation error formatting, empty CSV import, header spacer"
      - "All tests pass with vitest"
      - "No regressions in existing csvUtils tests"
    tests:
      - type: unit
        description: "generateCsv([]) returns BOM + header only"
      - type: unit
        description: "parseCsv with headers-only returns appropriate error"
      - type: unit
        description: "Cancel detection ignores 'User did not share' errors"
      - type: unit
        description: "Import errors formatted with line numbers using i18n"
      - type: unit
        description: "Header spacer width matches add button width"
    covers:
      acceptance_criteria: ["AC-1", "AC-2", "AC-3", "AC-4", "AC-5", "AC-6", "AC-7", "AC-8", "AC-9", "AC-10"]
      edge_cases: ["EC-1", "EC-2", "EC-3", "EC-4", "EC-5"]
    risks: []

validation:
  - ac_id: AC-1
    how_to_verify: "Export CSV, cancel share sheet -> no error alert shown"
    covered_by_steps: ["STEP-02", "STEP-05"]
  - ac_id: AC-2
    how_to_verify: "Export CSV with simulated real error -> Alert shows t('members.exportFailed')"
    covered_by_steps: ["STEP-02", "STEP-05"]
  - ac_id: AC-3
    how_to_verify: "Import CSV with corrupted file -> Alert shows t('members.importFailed')"
    covered_by_steps: ["STEP-03", "STEP-05"]
  - ac_id: AC-4
    how_to_verify: "Import CSV with validation errors -> Alert shows specific line/field errors in current language"
    covered_by_steps: ["STEP-03", "STEP-05"]
  - ac_id: AC-5
    how_to_verify: "Import CSV with headers only -> Alert shows t('members.importEmpty')"
    covered_by_steps: ["STEP-03", "STEP-05"]
  - ac_id: AC-6
    how_to_verify: "Login as observer, navigate to Members -> title is centered with spacer"
    covered_by_steps: ["STEP-04", "STEP-05"]
  - ac_id: AC-7
    how_to_verify: "With 0 members, Export CSV produces file with header row only"
    covered_by_steps: ["STEP-02", "STEP-05"]
  - ac_id: AC-8
    how_to_verify: "With 0 members, Export CSV button is enabled and tappable"
    covered_by_steps: ["STEP-02", "STEP-05"]
  - ac_id: AC-9
    how_to_verify: "Switch language to pt-BR/en/es and trigger import errors -> messages in correct language"
    covered_by_steps: ["STEP-01", "STEP-05"]
  - ac_id: AC-10
    how_to_verify: "Export CSV on iOS, cancel share sheet -> no error (check for 'User did not share')"
    covered_by_steps: ["STEP-02", "STEP-05"]
```
