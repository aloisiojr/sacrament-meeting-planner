# Change Requests Batch 3 - CSV Export/Import Fix (SPEC_CR3_F026)

Feature: F026 - CSV Export/Import Fix
Type: CRITICAL BUG fix (code changes required)

---

## SPEC_SUMMARY

```yaml
type: spec_summary
goal: "Fix non-functional CSV export and import buttons on the Members management screen (CR-42)"
in_scope:
  - "CR-42: Fix CSV export button - currently tapping produces no visible result on mobile"
  - "CR-42: Fix CSV import button - currently tapping produces no visible result on mobile"
  - "Align export implementation with PRODUCT_SPECIFICATION RF-04 (expo-file-system + expo-sharing)"
  - "Ensure import uses expo-document-picker + expo-file-system correctly"
  - "Verify Supabase RPC import_members is deployed and functional"
out_of_scope:
  - "Changes to CSV format (Nome, Telefone Completo)"
  - "Changes to member:import permission model"
  - "Changes to the import_members RPC logic"
  - "Web platform behavior (web export/import appears structurally correct)"
  - "UI redesign of the CSV buttons"
main_risks:
  - "Dynamic imports (await import(...)) may fail silently in Metro bundler for native modules"
  - "expo-file-system writeAsStringAsync may require specific directory permissions on iOS/Android"
  - "Supabase RPC import_members may not be deployed to the remote database yet"
  - "BOM (byte order mark) in CSV files from Excel could cause header validation to fail"
ac_count: 13
edge_case_count: 6
has_open_questions: true
has_unconfirmed_assumptions: true
```

---

## CR-42: Fix Non-Functional CSV Export and Import Buttons in Members Screen

- **Type:** CRITICAL BUG
- **Description:** On the Members management screen (`src/app/(tabs)/settings/members.tsx`), the CSV export and import buttons are visible and render correctly for users with `member:import` permission, but tapping either button produces no visible result on mobile. The handlers `handleExport` (line 340) and `handleImport` (line 409) exist but have issues that prevent them from working.

### Root Cause Analysis

After investigating the code, the following issues were identified:

#### Issue 1: Export uses `Share.share()` instead of `expo-file-system` + `expo-sharing`

The current export handler (lines 340-362) uses React Native's built-in `Share.share({ message: csv })` on mobile. This shares the CSV as raw text in the share sheet, not as a `.csv` file. Additionally, it uses a dynamic import (`await import('react-native')`) to get `Share`, which is unnecessary since `react-native` is already imported at the top of the file.

The PRODUCT_SPECIFICATION (RF-04) specifies:
> "Em Mobile: usa `expo-file-system` + `expo-sharing` para compartilhar"

The correct approach is:
1. Write the CSV content to a temporary file using `expo-file-system`
2. Share the file using `expo-sharing`

#### Issue 2: Import uses dynamic imports that may fail with Metro bundler

The import handler (lines 409-438) uses `await import('expo-document-picker')` and `await import('expo-file-system')` as dynamic imports. Metro bundler (React Native's bundler) does not reliably support dynamic `import()` for native modules. When the dynamic import fails, the `catch` block (line 434) catches the error and shows a generic "Failed to read file" alert, but this alert may not be reaching the user if the dynamic import itself throws in a way that is silently swallowed.

The correct approach is to use static imports at the top of the file.

#### Issue 3: Silent error swallowing in export

The export handler's catch block (line 358) is empty (`catch { // User cancelled }`). Any error (not just user cancellation) is silently swallowed, making debugging impossible.

### Acceptance Criteria

- AC-42.1: Given the user taps "Export CSV" on mobile (iOS or Android), when the member list is not empty, then a file named "membros.csv" is written to the device's cache directory and the device's share sheet opens allowing the user to share/save the file. Priority: must.
- AC-42.2: Given the user taps "Export CSV" on web, when the member list is not empty, then a file named "membros.csv" is downloaded via the browser. Priority: should.
- AC-42.3: Given the exported CSV file, when opened, then it contains the header "Nome,Telefone Completo" followed by one row per member with `full_name` and concatenated `country_code + phone`. Priority: must.
- AC-42.4: Given the member list is empty, when the user taps "Export CSV", then the button is visually disabled and does nothing (no error alert). Priority: must.
- AC-42.5: Given the user taps "Import CSV" on mobile, when tapped, then a file picker opens allowing selection of a `.csv` file. Priority: must.
- AC-42.6: Given a valid CSV file is selected for import, when the file is parsed and the RPC succeeds, then all existing members are replaced with the imported members and a success alert shows the count of imported members. Priority: must.
- AC-42.7: Given a CSV file with validation errors (invalid format, missing name, invalid phone, duplicates), when parsing fails, then an error alert displays the specific line number and field causing each error. Priority: must.
- AC-42.8: Given the import button, when a mutation is in progress, then the button shows an `ActivityIndicator` spinner and is disabled to prevent double-submission. Priority: must.
- AC-42.9: Given the export or import operation, when an unexpected error occurs (file system error, network error, RPC error), then an error alert is displayed to the user with the error message. Priority: must.
- AC-42.10: Given the CSV buttons area, when the user does not have `member:import` permission, then the export and import buttons are not rendered. Priority: must.
- AC-42.11: Given the `expo-document-picker`, `expo-file-system`, and `expo-sharing` packages, when checking `package.json`, then all three are listed as dependencies. Priority: must.
- AC-42.12: Given the Supabase RPC `import_members`, when called with `target_ward_id` (uuid) and `new_members` (jsonb array of `{full_name, country_code, phone}`), then it atomically deletes all existing members for the ward and inserts the new members, returning the count of inserted members. Priority: must.
- AC-42.13: Given the import operation succeeds, when the mutation completes, then an activity log entry is created with action `member:import` and description including the member count. Priority: must.

### Required Changes

#### Change 1: Replace dynamic imports with static imports

Add static imports at the top of `members.tsx`:

```typescript
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
```

Remove the dynamic `await import(...)` calls inside `handleExport` and `handleImport`.

#### Change 2: Rewrite `handleExport` for mobile using `expo-file-system` + `expo-sharing`

Replace the mobile branch of `handleExport`:

```typescript
// Mobile: write to temp file and share
const fileUri = FileSystem.cacheDirectory + 'membros.csv';
await FileSystem.writeAsStringAsync(fileUri, csv, {
  encoding: FileSystem.EncodingType.UTF8,
});
await Sharing.shareAsync(fileUri, {
  mimeType: 'text/csv',
  dialogTitle: 'membros.csv',
  UTI: 'public.comma-separated-values-text',
});
```

#### Change 3: Rewrite `handleImport` for mobile using static imports

Replace the mobile branch of `handleImport`:

```typescript
const result = await DocumentPicker.getDocumentAsync({
  type: ['text/csv', 'text/comma-separated-values', 'application/csv'],
  copyToCacheDirectory: true,
});
if (result.canceled || !result.assets?.[0]) return;
const content = await FileSystem.readAsStringAsync(result.assets[0].uri);
importMutation.mutate(content);
```

Note: The MIME type array should include common CSV MIME types since different file managers report different types.

#### Change 4: Add proper error handling in export

Replace the empty catch block with a user-visible error alert:

```typescript
} catch (err: unknown) {
  if (err instanceof Error && err.message !== 'User did not share') {
    Alert.alert(t('common.error'), err.message);
  }
}
```

### Edge Cases

- EC-42.1: CSV files with BOM (byte order mark `\uFEFF`) at the beginning. The `parseCsv` function in `csvUtils.ts` should strip BOM before processing. Currently it does NOT handle BOM -- the header validation could fail if a BOM is present.
  - **Fix:** Add BOM stripping to `parseCsv`: `csvContent = csvContent.replace(/^\uFEFF/, '')`
- EC-42.2: If the Supabase RPC `import_members` is not yet deployed to the remote database, the import will fail with a "function not found" error. The migration file exists (`supabase/migrations/007_import_members_rpc.sql`) but may not have been applied.
  - **Fix:** Ensure migration is applied. The error message from the RPC call will surface to the user via the existing `onError` handler.
- EC-42.3: If `expo-sharing` `isAvailableAsync()` returns false (unlikely on modern devices), the export should fall back to `Share.share()` with the CSV text.
- EC-42.4: Large CSV files (>1000 members) could cause UI lag during parsing. The `parseCsv` function is synchronous. For MVP this is acceptable; future optimization could use web workers or chunked parsing.
- EC-42.5: CSV files exported from Excel on Windows may use `;` as delimiter instead of `,`. The current parser only handles `,`. This is acceptable for MVP -- the spec defines `,` as the delimiter.
- EC-42.6: If the user picks a file that is not actually CSV (e.g., a `.txt` file renamed to `.csv`, or a binary file), `readAsStringAsync` will return garbage. The `parseCsv` function's header validation will catch this and return an error.

### Files Impacted

| File | Change Type | Description |
|------|-------------|-------------|
| `src/app/(tabs)/settings/members.tsx` | Modify | Replace dynamic imports with static imports; rewrite handleExport to use expo-file-system + expo-sharing; rewrite handleImport to use static DocumentPicker + FileSystem; add proper error handling |
| `src/lib/csvUtils.ts` | Modify | Add BOM stripping to parseCsv function |
| `src/__tests__/csvUtils.test.ts` | Modify | Add test for BOM handling |

### Files NOT Changed (Verified Correct)

| File | Reason |
|------|--------|
| `package.json` | `expo-document-picker` (^14.0.8), `expo-file-system` (^19.0.21), `expo-sharing` (^14.0.8) are already installed |
| `supabase/migrations/007_import_members_rpc.sql` | RPC `import_members(target_ward_id uuid, new_members jsonb) -> integer` exists with correct signature |
| `src/lib/csvUtils.ts` (generateCsv, splitPhoneNumber) | Functions are correct and well-tested |
| `src/hooks/useMembers.ts` (memberKeys) | Query key factory is correct |

---

## Assumptions

```yaml
assumptions:
  - id: A-CR42-1
    description: "expo-document-picker (^14.0.8), expo-file-system (^19.0.21), and expo-sharing (^14.0.8) are installed and compatible with the current Expo SDK version"
    confirmed: true
    default_if_not_confirmed: "Install via npx expo install expo-document-picker expo-file-system expo-sharing"

  - id: A-CR42-2
    description: "The Supabase RPC import_members exists in the remote database (migration 007 has been applied)"
    confirmed: false
    default_if_not_confirmed: "Run supabase db push or apply migration manually. RPC file exists at supabase/migrations/007_import_members_rpc.sql"

  - id: A-CR42-3
    description: "The dynamic import() calls are the primary cause of failure on mobile -- Metro bundler does not reliably resolve native modules via dynamic import()"
    confirmed: false
    default_if_not_confirmed: "Switch to static imports and verify fix on device. If still failing, investigate platform-specific file system permissions."

  - id: A-CR42-4
    description: "expo-sharing is available on both iOS and Android target devices (Sharing.isAvailableAsync() returns true)"
    confirmed: false
    default_if_not_confirmed: "Add isAvailableAsync() check with fallback to Share.share() if unavailable"

  - id: A-CR42-5
    description: "The web platform export/import handlers work correctly (they use browser-native APIs that don't depend on expo packages)"
    confirmed: false
    default_if_not_confirmed: "Test web platform separately. Web uses Blob download and file input element."
```

---

## Open Questions

```yaml
open_questions:
  - id: Q-CR42-1
    question: "Has the Supabase migration 007_import_members_rpc.sql been applied to the remote database?"
    proposed_default: "Verify with: supabase db push --linked. If not applied, apply it before testing import."

  - id: Q-CR42-2
    question: "Should the export filename be localized (e.g., 'membros.csv' for pt-BR, 'members.csv' for en, 'miembros.csv' for es)?"
    proposed_default: "Keep 'membros.csv' as the fixed filename for now (spec says 'membros.csv'). Can be localized in a future CR."

  - id: Q-CR42-3
    question: "Should the import support additional MIME types beyond text/csv (e.g., application/vnd.ms-excel for .csv files misidentified by file managers)?"
    proposed_default: "Yes. Use type array: ['text/csv', 'text/comma-separated-values', 'application/csv'] for broader compatibility."
```

---

## Spec References

| Document | Section | Relevance |
|----------|---------|-----------|
| `docs/PRODUCT_SPECIFICATION.md` | RF-04 (line ~189) | Defines export behavior: expo-file-system + expo-sharing on mobile, Blob download on web |
| `docs/PRODUCT_SPECIFICATION.md` | RF-05 (line ~208) | Defines import behavior: expo-document-picker on mobile, file input on web |
| `docs/SPEC.final.md` | Section 7.5 (line ~651) | Repeats RF-04/RF-05 requirements for CSV export/import |
| `docs/SPEC.final.md` | Section 9.2 (line ~1224) | Acceptance criteria AC-009 to AC-011 for CSV operations |
| `docs/specs/SPEC_F003.md` | Full | Member CRUD spec (F004 depends on F003 for member data model) |
| `docs/specs/SPEC_F004.md` | Full | Member Import/Export spec with user stories US-006, AC-009 to AC-011 |
| `docs/specs/SPEC_INDEX.md` | F004 row | Feature decomposition: F004 depends on F003 |

---

## Definition of Done

- [ ] Static imports for `expo-file-system`, `expo-sharing`, and `expo-document-picker` replace dynamic `await import()` calls
- [ ] Export button on mobile writes CSV to cache directory and opens share sheet with the `.csv` file
- [ ] Export button on web downloads `membros.csv` via Blob (existing behavior, verified working)
- [ ] Import button on mobile opens file picker for `.csv` files using static `DocumentPicker` import
- [ ] Import button reads file content via static `FileSystem` import and calls `importMutation.mutate()`
- [ ] BOM stripping added to `parseCsv` function in `csvUtils.ts`
- [ ] Error handling: export errors show alert (not silently swallowed)
- [ ] Error handling: import parse errors show line/field details
- [ ] Error handling: RPC errors show error message
- [ ] ActivityIndicator shown on import button during mutation
- [ ] Activity log entry created on successful import
- [ ] Test added for CSV BOM handling in `csvUtils.test.ts`
- [ ] Existing `csvUtils.test.ts` tests still pass
- [ ] Manual test on mobile device: export produces shareable CSV file
- [ ] Manual test on mobile device: import replaces members from CSV file
