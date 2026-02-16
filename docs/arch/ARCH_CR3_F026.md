# ARCH_CR3_F026 - CSV Export/Import Fix [CRITICAL]

Feature: F026 (CR-42)
Modules Affected: M002 (WardDataModule) - MemberManagementScreen
Priority: CRITICAL

---

## Overview

The CSV export and import buttons on the Members management screen (`src/app/(tabs)/settings/members.tsx`) do not work on mobile. The buttons render correctly and are visible to users with `member:import` permission, but tapping either button produces no visible result.

**Root cause:** Two issues combine to make both operations fail silently on mobile:

1. **Export** uses `await import('react-native')` (dynamic import) to get `Share`, then calls `Share.share({ message: csv })` which sends CSV as raw text, not as a file. The dynamic import itself may fail silently in Metro bundler.
2. **Import** uses `await import('expo-document-picker')` and `await import('expo-file-system')` as dynamic imports. Metro bundler does not reliably support dynamic `import()` for native modules -- it resolves all imports at build time.

**Fix:** Replace all dynamic imports with static imports. Use `expo-file-system` + `expo-sharing` for export (write to temp file, then share). Use static `expo-document-picker` + `expo-file-system` for import.

---

## Architecture Decision: ADR-017

**Title:** Static imports for Expo SDK modules in CSV handlers

**Context:** Dynamic imports (`await import('expo-document-picker')`) fail silently in Expo/Metro because Metro resolves all imports at build time, not runtime. The current code uses dynamic imports for platform-conditional module loading, but this pattern does not work with React Native.

**Decision:** Use static imports at file top for `expo-document-picker`, `expo-file-system`, and `expo-sharing`. Use `Platform.OS` for conditional logic branching, not conditional imports.

**Consequences:**
- CSV export and import work correctly on mobile
- Slightly larger initial bundle (Expo modules loaded even on web), but negligible since these are lightweight packages
- No silent failures -- errors are caught and displayed to the user

---

## Root Cause Analysis

### Export (lines 342-364 of `members.tsx`)

```typescript
// CURRENT CODE (broken):
const { Share: RNShare } = await import('react-native');  // Dynamic import
await RNShare.share({ message: csv, title: 'membros.csv' });  // Sends as text, not file
```

**Problems:**
1. `await import('react-native')` may not resolve correctly in Metro bundler
2. `Share.share({ message: csv })` shares CSV as plain text in the share sheet, not as a `.csv` file attachment
3. The catch block (line 360) is empty (`catch { // User cancelled }`), silently swallowing ALL errors

**PRODUCT_SPECIFICATION RF-04 requires:** `expo-file-system` + `expo-sharing` for mobile export.

### Import (lines 411-439 of `members.tsx`)

```typescript
// CURRENT CODE (broken):
const DocumentPicker = await import('expo-document-picker');  // Dynamic import
const FileSystem = await import('expo-file-system');          // Dynamic import
```

**Problems:**
1. Dynamic imports fail silently in Metro bundler
2. MIME type `'text/csv'` alone (line 429) may not work on all Android versions/file managers
3. Error catch (line 436-438) shows generic "Failed to read file" but the error may be swallowed before reaching the catch

### BOM Issue in `csvUtils.ts`

The `parseCsv` function does not strip BOM (byte order mark `\uFEFF`) from CSV files. Excel on Windows adds BOM to UTF-8 CSV files, which causes the header validation to fail because the first column name would be `\uFEFFNome` instead of `Nome`.

---

## Dependencies Verification

All three required Expo packages are already installed (confirmed in `package.json`):

| Package | Version | Status |
|---------|---------|--------|
| `expo-document-picker` | ~14.0.8 | Installed |
| `expo-file-system` | ~19.0.21 | Installed |
| `expo-sharing` | ~14.0.8 | Installed |

The Supabase RPC `import_members` exists in `supabase/migrations/007_import_members_rpc.sql`:
- Signature: `import_members(target_ward_id uuid, new_members jsonb) -> integer`
- Behavior: atomic DELETE all + INSERT new members in a single transaction
- Returns: count of inserted members

---

## Change Plan

### Change 1: Static imports in `members.tsx`

**File: `src/app/(tabs)/settings/members.tsx`**

Add static imports at top of file (no new dependencies -- packages already installed):

```typescript
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
```

Remove all `await import(...)` calls from `handleExport` and `handleImport`.

### Change 2: Rewrite `handleExport` mobile branch

**File: `src/app/(tabs)/settings/members.tsx`** (lines 355-362)

Replace the mobile export block:

```typescript
// FROM (broken):
try {
  const { Share: RNShare } = await import('react-native');
  await RNShare.share({ message: csv, title: 'membros.csv' });
} catch {
  // User cancelled
}

// TO (fixed):
try {
  const fileUri = FileSystem.cacheDirectory + 'membros.csv';
  await FileSystem.writeAsStringAsync(fileUri, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  await Sharing.shareAsync(fileUri, {
    mimeType: 'text/csv',
    dialogTitle: t('members.exportCsv'),
    UTI: 'public.comma-separated-values-text',
  });
} catch (err: unknown) {
  if (err instanceof Error && err.message !== 'User did not share') {
    Alert.alert(t('common.error'), t('members.exportFailed'));
  }
}
```

**Key decisions:**
- Use `FileSystem.cacheDirectory` (not `documentDirectory`) for temporary export files -- cacheDirectory is auto-cleaned by the OS
- Use `Sharing.shareAsync` instead of `Share.share` to share as a file attachment, not text
- Set `UTI: 'public.comma-separated-values-text'` for iOS to properly identify CSV
- Include `mimeType: 'text/csv'` for Android
- Properly handle errors: show alert on failure, ignore "User did not share" (user cancelled)

### Change 3: Rewrite `handleImport` mobile branch

**File: `src/app/(tabs)/settings/members.tsx`** (lines 424-438)

Replace the mobile import block:

```typescript
// FROM (broken):
try {
  const DocumentPicker = await import('expo-document-picker');
  const result = await DocumentPicker.getDocumentAsync({
    type: 'text/csv',
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) return;
  const FileSystem = await import('expo-file-system');
  const content = await FileSystem.readAsStringAsync(result.assets[0].uri);
  importMutation.mutate(content);
} catch {
  Alert.alert(t('common.error'), 'Failed to read file');
}

// TO (fixed):
try {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['text/csv', 'text/comma-separated-values', 'application/csv', 'text/plain'],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) return;
  const content = await FileSystem.readAsStringAsync(result.assets[0].uri);
  importMutation.mutate(content);
} catch {
  Alert.alert(t('common.error'), t('members.importFailed'));
}
```

**Key decisions:**
- Use static `DocumentPicker` and `FileSystem` references
- Broaden MIME type array to `['text/csv', 'text/comma-separated-values', 'application/csv', 'text/plain']` for Android compatibility (different file managers report different MIME types for `.csv` files)
- Use i18n key for error message instead of hardcoded English string

### Change 4: Add BOM stripping to `parseCsv`

**File: `src/lib/csvUtils.ts`** (line 33)

```typescript
// FROM:
const lines = csvContent.trim().split(/\r?\n/);

// TO:
const lines = csvContent.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
```

This strips the UTF-8 BOM character if present at the start of the file. Excel on Windows prepends BOM to UTF-8 CSV files, which would cause header validation to fail (`\uFEFFNome` !== `Nome`).

### Change 5: Add i18n keys for error messages

**Files: `src/i18n/locales/{pt-BR,en,es}.json`**

Add to `members` section:

| Key | pt-BR | en | es |
|-----|-------|----|----|
| `members.exportFailed` | `Falha ao exportar arquivo` | `Failed to export file` | `Error al exportar archivo` |
| `members.importFailed` | `Falha ao importar arquivo` | `Failed to import file` | `Error al importar archivo` |

### Change 6: Add BOM test to `csvUtils.test.ts`

**File: `src/__tests__/csvUtils.test.ts`**

Add test case to the `parseCsv` describe block:

```typescript
it('handles CSV with BOM (byte order mark)', () => {
  const csv = '\uFEFFNome,Telefone Completo\nJoao Silva,+5511999999999';
  const result = parseCsv(csv);
  expect(result.success).toBe(true);
  expect(result.members).toHaveLength(1);
  expect(result.members[0]).toEqual({ full_name: 'Joao Silva', phone: '+5511999999999' });
});
```

---

## Data Flow Diagrams

### Export Flow (after fix)

```
User taps "Export CSV"
  │
  ├── members empty? → return (button disabled)
  │
  └── generateCsv(members) → csv string
      │
      ├── Platform.OS === 'web'
      │   └── Blob download (existing, works correctly)
      │       new Blob([csv]) → URL.createObjectURL → link.click → download 'membros.csv'
      │
      └── Platform.OS !== 'web' (mobile)
          └── FileSystem.writeAsStringAsync(cacheDirectory + 'membros.csv', csv)
              └── Sharing.shareAsync(fileUri, { mimeType: 'text/csv' })
                  └── Native share sheet opens with CSV file
                      ├── User shares/saves → success
                      └── User cancels → silently ignored
                      └── Error → Alert.alert(error)
```

### Import Flow (after fix)

```
User taps "Import CSV"
  │
  ├── Platform.OS === 'web'
  │   └── document.createElement('input') → file picker (existing, works)
  │       └── file.text() → importMutation.mutate(text)
  │
  └── Platform.OS !== 'web' (mobile)
      └── DocumentPicker.getDocumentAsync({ type: ['text/csv', ...] })
          ├── User cancels → return
          └── User picks file
              └── FileSystem.readAsStringAsync(uri)
                  └── importMutation.mutate(content)
                      │
                      └── mutationFn:
                          ├── parseCsv(content) → strips BOM → validates
                          │   ├── errors? → throw Error(details)
                          │   └── success → members[]
                          │
                          ├── splitPhoneNumber() per member
                          │
                          └── supabase.rpc('import_members', { target_ward_id, new_members })
                              ├── Error → onError → Alert.alert(error)
                              └── Success → onSuccess:
                                  ├── queryClient.invalidateQueries(memberKeys.list)
                                  ├── Alert.alert("X members imported")
                                  └── logAction('member:import', ...)
```

---

## Files Changed

| File | Change Type | Description |
|------|-------------|-------------|
| `src/app/(tabs)/settings/members.tsx` | **Modify** | Replace dynamic imports with static; rewrite handleExport (expo-file-system + expo-sharing); rewrite handleImport (static DocumentPicker + FileSystem, broader MIME types); add error handling |
| `src/lib/csvUtils.ts` | **Modify** | Add BOM stripping (`\uFEFF` removal) to parseCsv function |
| `src/__tests__/csvUtils.test.ts` | **Modify** | Add test for CSV with BOM |
| `src/i18n/locales/pt-BR.json` | **Modify** | Add `members.exportFailed`, `members.importFailed` |
| `src/i18n/locales/en.json` | **Modify** | Add `members.exportFailed`, `members.importFailed` |
| `src/i18n/locales/es.json` | **Modify** | Add `members.exportFailed`, `members.importFailed` |

**New files:** None
**Deleted files:** None
**New dependencies:** None (all Expo packages already installed)
**Database changes:** None (import_members RPC already exists)

---

## Files NOT Changed (Verified Correct)

| File | Reason |
|------|--------|
| `package.json` | `expo-document-picker` (~14.0.8), `expo-file-system` (~19.0.21), `expo-sharing` (~14.0.8) already installed |
| `supabase/migrations/007_import_members_rpc.sql` | RPC `import_members(target_ward_id uuid, new_members jsonb) -> integer` exists with correct signature and atomic behavior |
| `src/lib/csvUtils.ts` (generateCsv, splitPhoneNumber, parseCsvLine) | Functions are correct and well-tested (10 passing tests) |
| `src/hooks/useMembers.ts` (memberKeys) | Query key factory is correct; used by `importMutation.onSuccess` |
| `src/lib/activityLog.ts` (logAction) | Activity logging function works correctly; used by `importMutation.onSuccess` |

---

## Edge Cases

| ID | Scenario | Expected Behavior |
|----|----------|-------------------|
| EC-1 | CSV file with BOM (`\uFEFF`) from Excel | BOM stripped before parsing; file processed normally |
| EC-2 | User cancels share sheet (export) | `Sharing.shareAsync` throws "User did not share"; silently caught, no error alert |
| EC-3 | User cancels file picker (import) | `result.canceled === true`; handler returns early, no error |
| EC-4 | File picker returns non-CSV file | `readAsStringAsync` reads content; `parseCsv` header validation rejects it with descriptive error |
| EC-5 | `expo-sharing` unavailable on device | Unlikely on modern iOS/Android; if occurs, error caught and alert shown |
| EC-6 | Large CSV (>1000 members) | `parseCsv` is synchronous; acceptable for MVP. May cause brief UI freeze on very large files |
| EC-7 | CSV with `;` delimiter (European Excel) | Not supported; spec defines `,` as delimiter. Parser returns header format error |
| EC-8 | Supabase RPC `import_members` not deployed | RPC call fails with "function not found"; error surfaces via `importMutation.onError` alert |
| EC-9 | Empty member list, user taps Export | Button has `disabled={!members || members.length === 0}`; no action |
| EC-10 | Network error during import RPC | Supabase error caught by `importMutation.onError`; alert shown with error message |

---

## Testing Strategy

### Unit Tests

1. **BOM handling** (new test in `csvUtils.test.ts`): Verify `parseCsv` strips BOM and parses correctly
2. **Existing tests**: All 15 tests in `csvUtils.test.ts` must continue passing

### Manual Tests (device required)

1. **Export on iOS:** Tap Export CSV with members loaded → share sheet opens with `membros.csv` file → save to Files app → open and verify CSV content
2. **Export on Android:** Same as iOS but verify share sheet shows file sharing options
3. **Import on iOS:** Tap Import CSV → file picker opens → select valid CSV → success alert with member count → verify members list updated
4. **Import on Android:** Same as iOS, verify file picker accepts `.csv` files
5. **Import invalid CSV:** Select a file with wrong format → error alert with line/field details
6. **Export with empty list:** Verify button is disabled (not tappable)
7. **Import during mutation:** Verify ActivityIndicator spinner shown, button disabled

### Regression

- Web export (Blob download) must continue working
- Web import (file input element) must continue working
- Activity log entry created on successful import
- Permission gating (`member:import`) still controls button visibility

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Dynamic imports are the wrong root cause; something else prevents button handler from firing | HIGH | Code inspection confirms dynamic imports are the only async operations before file I/O. Static imports eliminate this variable. If still broken after fix, investigate `Platform.OS` detection. |
| `FileSystem.cacheDirectory` is null on some devices | LOW | `cacheDirectory` is guaranteed non-null by Expo SDK on iOS and Android. Only null on web, where we use the Blob path instead. |
| `Sharing.shareAsync` behavior differs between iOS and Android | LOW | Both platforms support file sharing via `shareAsync`. The `mimeType` and `UTI` parameters ensure proper file type identification on both platforms. |
| BOM stripping breaks non-BOM files | NONE | `replace(/^\uFEFF/, '')` is a no-op on strings that don't start with BOM. No risk to existing files. |
