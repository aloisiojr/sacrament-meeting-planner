# PLAN_CR3_F026 - CSV Export/Import Fix (CR-42) [CRITICAL]

## PLAN_SUMMARY

```yaml
type: plan_summary
total_steps: 5
parallel_tracks: 1
estimated_commits: 5
coverage:
  acceptance_criteria: 13/13
  edge_cases: 6/6
critical_path:
  - "STEP-01: Replace dynamic imports with static imports in members.tsx"
  - "STEP-02: Rewrite handleExport using expo-file-system + expo-sharing"
  - "STEP-03: Rewrite handleImport using static DocumentPicker + FileSystem"
  - "STEP-04: Add BOM stripping to csvUtils.ts + test"
main_risks:
  - "Dynamic imports are the likely root cause of silent failures on mobile -- static imports should fix it"
  - "expo-sharing must be available on target devices (isAvailableAsync check recommended)"
  - "BOM in CSV files from Excel could cause header validation to fail if not stripped"
```

---

## PLAN

```yaml
type: plan
version: 1

goal: "Fix non-functional CSV export and import buttons on the Members management screen. Replace dynamic imports with static imports, use expo-file-system + expo-sharing for export, add proper error handling, and add BOM stripping to CSV parser."

strategy:
  order: "Sequential -- each step builds on the previous. STEP-01 must come first (import changes). STEP-02 and STEP-03 can be parallelized. STEP-04 is independent. STEP-05 verifies everything."
  commit_strategy: "1 commit per step, conventional commits (fix: for STEP-01 to STEP-04, test: for STEP-04 test addition)"
  test_strategy: "Unit test for BOM handling in csvUtils.test.ts. Manual testing on mobile device required for export/import flows."
```

---

## Steps

### STEP-01: Replace Dynamic Imports with Static Imports

```yaml
- id: STEP-01
  description: |
    Replace all dynamic `await import(...)` calls in members.tsx with static
    imports at the top of the file. This is the primary fix for the silent
    failure on mobile -- Metro bundler does not reliably resolve native
    modules via dynamic import().

    Add static imports at top of file:
      import * as FileSystem from 'expo-file-system';
      import * as Sharing from 'expo-sharing';
      import * as DocumentPicker from 'expo-document-picker';

    Remove all occurrences of:
      - await import('react-native') for Share
      - await import('expo-document-picker')
      - await import('expo-file-system')

    Note: The web branch may use a different approach (Blob download, file input)
    that does not need these Expo imports. Use Platform.OS to conditionally
    execute the correct branch.
  files:
    - "src/app/(tabs)/settings/members.tsx"
  dependencies: []
  parallelizable_with: []
  done_when:
    - "No dynamic import() calls remain in handleExport or handleImport"
    - "Static imports for FileSystem, Sharing, and DocumentPicker are at the top of the file"
    - "TypeScript compiles without errors"
  tests:
    - type: unit
      description: "TypeScript compilation check (npx tsc --noEmit)"
  covers:
    acceptance_criteria: ["AC-42.11"]
    edge_cases: []
  risks:
    - risk: "Removing dynamic imports may affect web platform behavior"
      mitigation: "Keep Platform.OS branching for web vs mobile code paths"
```

### STEP-02: Rewrite handleExport Using expo-file-system + expo-sharing

```yaml
- id: STEP-02
  description: |
    Rewrite the mobile branch of handleExport to use expo-file-system and
    expo-sharing instead of React Native's Share.share().

    New mobile export flow:
    1. Generate CSV string via existing generateCsv()
    2. Write CSV to temp file: FileSystem.cacheDirectory + 'membros.csv'
    3. Write using FileSystem.writeAsStringAsync(fileUri, csv, { encoding: UTF8 })
    4. Share via Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'membros.csv', UTI: 'public.comma-separated-values-text' })

    Keep existing web branch (Blob download) unchanged.

    Replace empty catch block with proper error handling:
    - If error message is 'User did not share' or similar cancellation, ignore
    - Otherwise, show Alert.alert(t('common.error'), err.message)
  files:
    - "src/app/(tabs)/settings/members.tsx"
  dependencies: ["STEP-01"]
  parallelizable_with: ["STEP-03"]
  done_when:
    - "handleExport mobile branch writes CSV to FileSystem.cacheDirectory"
    - "handleExport mobile branch uses Sharing.shareAsync to open share sheet"
    - "Export errors are shown to user via Alert.alert (not silently swallowed)"
    - "Web export branch (Blob download) remains unchanged"
    - "Empty member list: export button is disabled (existing behavior verified)"
  tests:
    - type: manual
      description: "On mobile device: tap Export CSV with members -> share sheet opens with .csv file"
    - type: manual
      description: "On mobile device: tap Export CSV with empty list -> button is disabled"
  covers:
    acceptance_criteria: ["AC-42.1", "AC-42.2", "AC-42.3", "AC-42.4", "AC-42.9"]
    edge_cases: ["EC-42.3"]
  risks:
    - risk: "expo-sharing may not be available on all devices"
      mitigation: "Add Sharing.isAvailableAsync() check with fallback to RN Share.share()"
```

### STEP-03: Rewrite handleImport Using Static Imports

```yaml
- id: STEP-03
  description: |
    Rewrite the mobile branch of handleImport to use the static imports
    from STEP-01 instead of dynamic imports.

    New mobile import flow:
    1. Open file picker: DocumentPicker.getDocumentAsync({
         type: ['text/csv', 'text/comma-separated-values', 'application/csv'],
         copyToCacheDirectory: true,
       })
    2. Check for cancellation: if (result.canceled || !result.assets?.[0]) return
    3. Read file: FileSystem.readAsStringAsync(result.assets[0].uri)
    4. Pass content to existing importMutation.mutate(content)

    Keep existing web branch (file input + FileReader) unchanged.
    Keep existing error handling in importMutation onError callback.

    The import RPC (import_members) call, CSV parsing (parseCsv), validation,
    and success/error alerts are already implemented correctly in the mutation.
  files:
    - "src/app/(tabs)/settings/members.tsx"
  dependencies: ["STEP-01"]
  parallelizable_with: ["STEP-02"]
  done_when:
    - "handleImport mobile branch uses static DocumentPicker.getDocumentAsync"
    - "handleImport mobile branch uses static FileSystem.readAsStringAsync"
    - "File picker opens with CSV MIME types including 'application/csv' for broad compatibility"
    - "Import success shows count alert (existing behavior)"
    - "Import error shows error details (existing behavior)"
    - "ActivityIndicator shown during mutation (existing behavior)"
    - "Web import branch (file input) remains unchanged"
  tests:
    - type: manual
      description: "On mobile device: tap Import CSV -> file picker opens -> select valid CSV -> members replaced"
    - type: manual
      description: "On mobile device: tap Import CSV -> select invalid CSV -> error alert with details"
  covers:
    acceptance_criteria: ["AC-42.5", "AC-42.6", "AC-42.7", "AC-42.8", "AC-42.10", "AC-42.12", "AC-42.13"]
    edge_cases: ["EC-42.1", "EC-42.2", "EC-42.4", "EC-42.5", "EC-42.6"]
  risks:
    - risk: "File MIME types vary across file managers on different Android devices"
      mitigation: "Use broad MIME type array including text/csv, text/comma-separated-values, application/csv"
```

### STEP-04: Add BOM Stripping to csvUtils.ts + Test

```yaml
- id: STEP-04
  description: |
    Add BOM (byte order mark) stripping to the parseCsv function in csvUtils.ts.
    CSV files exported from Excel on Windows often have a BOM character (\uFEFF)
    at the beginning, which would cause the header validation to fail.

    In parseCsv function, add as the first line of processing:
      csvContent = csvContent.replace(/^\uFEFF/, '');

    Add a test case in csvUtils.test.ts:
      test('parseCsv handles BOM in CSV content', () => {
        const csvWithBom = '\uFEFFNome,Telefone Completo\nMaria Silva,+5511999999999';
        const result = parseCsv(csvWithBom);
        expect(result.success).toBe(true);
        // verify parsed data is correct
      });
  files:
    - "src/lib/csvUtils.ts"
    - "src/__tests__/csvUtils.test.ts"
  dependencies: []
  parallelizable_with: ["STEP-01", "STEP-02", "STEP-03"]
  done_when:
    - "parseCsv strips BOM character before processing"
    - "Test for BOM handling exists and passes"
    - "All existing csvUtils tests still pass"
  tests:
    - type: unit
      description: "npx jest csvUtils -- all tests pass including new BOM test"
  covers:
    acceptance_criteria: []
    edge_cases: ["EC-42.4"]
  risks:
    - risk: "None -- BOM stripping is a simple string operation"
      mitigation: "N/A"
```

### STEP-05: Verification and Regression Check

```yaml
- id: STEP-05
  description: |
    Final verification step:
    1. Run TypeScript compilation: npx tsc --noEmit
    2. Run csvUtils tests: npx jest csvUtils
    3. Verify no dynamic import() calls remain in members.tsx
    4. Verify static imports are correctly declared
    5. Verify package.json has all 3 expo packages:
       - expo-document-picker
       - expo-file-system
       - expo-sharing
    6. Verify handleExport uses FileSystem + Sharing (not RN Share)
    7. Verify handleImport uses DocumentPicker + FileSystem (not dynamic imports)
    8. Verify error handling: export errors show Alert, import errors show details
  files:
    - "src/app/(tabs)/settings/members.tsx"
    - "src/lib/csvUtils.ts"
    - "src/__tests__/csvUtils.test.ts"
    - "package.json"
  dependencies: ["STEP-01", "STEP-02", "STEP-03", "STEP-04"]
  parallelizable_with: []
  done_when:
    - "TypeScript compiles without errors"
    - "All csvUtils tests pass"
    - "No dynamic import() in members.tsx"
    - "All 3 expo packages in package.json"
    - "Export uses FileSystem + Sharing"
    - "Import uses DocumentPicker + FileSystem"
    - "Proper error handling in both handlers"
  tests:
    - type: integration
      description: "Full build and test verification"
  covers:
    acceptance_criteria: []
    edge_cases: []
  risks:
    - risk: "None -- verification-only step"
      mitigation: "N/A"
```

---

## Validation

```yaml
validation:
  - ac_id: AC-42.1
    how_to_verify: "Manual test on mobile: tap Export CSV with members -> share sheet opens with .csv file"
    covered_by_steps: ["STEP-02"]

  - ac_id: AC-42.2
    how_to_verify: "Manual test on web: tap Export CSV -> browser downloads membros.csv"
    covered_by_steps: ["STEP-02"]

  - ac_id: AC-42.3
    how_to_verify: "Open exported CSV: header is 'Nome,Telefone Completo', rows have name + phone"
    covered_by_steps: ["STEP-02"]

  - ac_id: AC-42.4
    how_to_verify: "With empty member list, export button is disabled (existing behavior)"
    covered_by_steps: ["STEP-02"]

  - ac_id: AC-42.5
    how_to_verify: "Manual test on mobile: tap Import CSV -> file picker opens"
    covered_by_steps: ["STEP-03"]

  - ac_id: AC-42.6
    how_to_verify: "Select valid CSV -> members replaced, success alert shows count"
    covered_by_steps: ["STEP-03"]

  - ac_id: AC-42.7
    how_to_verify: "Select invalid CSV -> error alert shows line/field details"
    covered_by_steps: ["STEP-03"]

  - ac_id: AC-42.8
    how_to_verify: "During import mutation, button shows ActivityIndicator and is disabled"
    covered_by_steps: ["STEP-03"]

  - ac_id: AC-42.9
    how_to_verify: "Simulate file system error -> Alert.alert shown with error message"
    covered_by_steps: ["STEP-02", "STEP-03"]

  - ac_id: AC-42.10
    how_to_verify: "Login as user without member:import -> CSV buttons not rendered"
    covered_by_steps: ["STEP-03"]

  - ac_id: AC-42.11
    how_to_verify: "Check package.json: expo-document-picker, expo-file-system, expo-sharing all listed"
    covered_by_steps: ["STEP-01", "STEP-05"]

  - ac_id: AC-42.12
    how_to_verify: "Import valid CSV -> RPC import_members called with correct params -> members replaced atomically"
    covered_by_steps: ["STEP-03"]

  - ac_id: AC-42.13
    how_to_verify: "After successful import, activity log entry created with member:import action"
    covered_by_steps: ["STEP-03"]
```

---

## Execution Order Diagram

```
Phase 1 (independent):
  STEP-01 (static imports) ──────────┐
  STEP-04 (BOM stripping + test) ────┤
                                      │
Phase 2 (depends on STEP-01):        │
  STEP-02 (rewrite export) ──────────┤
  STEP-03 (rewrite import) ──────────┤
                                      │
Phase 3 (depends on all):            │
  STEP-05 (verification) <───────────┘
```

### File Conflict Map

| File | Steps | Sections Modified |
|------|-------|-------------------|
| `src/app/(tabs)/settings/members.tsx` | STEP-01, STEP-02, STEP-03 | Imports (top), handleExport (~line 340), handleImport (~line 409) |
| `src/lib/csvUtils.ts` | STEP-04 | parseCsv function (add BOM strip at start) |
| `src/__tests__/csvUtils.test.ts` | STEP-04 | Add new test case for BOM handling |

Note: STEP-01, STEP-02, STEP-03 all touch members.tsx but modify different sections.
STEP-01 must run first since STEP-02 and STEP-03 depend on the static imports.
STEP-04 is fully independent (different file).
