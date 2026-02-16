# ARCH_CR4_F005 - CSV & Members Screen Fixes

```yaml
type: arch
version: 1
status: complete
module: WardDataModule_Patch
features: [CR-54, CR-55, CR-66]
spec: SPEC_CR4_F005
```

## Overview

```yaml
goal: "Fix CSV export/import error handling, empty-export behavior, and Members screen header alignment"
principles:
  - "Distinguish user cancellation from real errors on share sheet"
  - "All error messages use i18n keys, never hardcoded English"
  - "Export CSV works even with 0 members (headers only)"
  - "Header layout uses 3-element pattern for centering"
```

## Diagram

```
  Affected Files per CR
  ======================

  CR-54 (CSV error handling):
  members.tsx ──> handleExport: catch share-sheet cancel silently
  members.tsx ──> handleImport: use t('members.importFailed') instead of hardcoded string

  CR-55 (Header spacer):
  members.tsx ──> header: add headerSpacer (width 36) when canWrite=false

  CR-66 (Empty export + informative import errors):
  members.tsx ──> handleExport: allow export when members=[]
  members.tsx ──> handleImport: show specific line/field validation errors
  i18n locales ──> add members.importEmpty, members.importErrorLine keys
```

## Components

| # | Component | Responsibility | Changes |
|---|-----------|----------------|---------|
| 1 | MemberManagementScreen | CSV export/import + member list | Fix export/import error handling, header spacer |

## Contracts

### CSV Export Flow (updated)

```yaml
flow:
  1: "User taps Export CSV"
  2: "generateCsv() creates CSV from members array"
  3: "If members is empty, generateCsv returns header-only CSV ('full_name,phone\\n')"
  4: "Write CSV to documentDirectory/membros.csv via expo-file-system"
  5: "Call expo-sharing shareAsync"
  6: "If user cancels share sheet (err.message contains 'User did not share' or 'cancelled'): silently ignore"
  7: "If real error: show Alert with t('members.exportFailed')"

cancel_detection: |
  catch (err: any) {
    const msg = err?.message?.toLowerCase() ?? '';
    if (msg.includes('user did not share') || msg.includes('cancelled')) return;
    Alert.alert(t('common.error'), t('members.exportFailed'));
  }

empty_export: |
  // generateCsv must handle empty array:
  if (members.length === 0) return 'full_name,phone\n';
  // Export button is always enabled regardless of member count
```

### CSV Import Flow (updated)

```yaml
flow:
  1: "User taps Import CSV"
  2: "expo-document-picker getDocumentAsync"
  3: "Read file content via expo-file-system"
  4: "parseCsv validates: collect ALL errors (not fail-fast)"
  5: "If no data rows: show t('members.importEmpty')"
  6: "If validation errors: show detailed message with line numbers"
  7: "If file read fails: show t('members.importFailed')"
  8: "All messages translated in current language"

validation_error_format: |
  // Collect all errors, format with line numbers:
  errors.map(e => t('members.importErrorLine', { line: e.line, field: e.field, error: e.message }))
  // Show joined errors in Alert body

error_display: |
  Alert.alert(
    t('common.error'),
    errors.join('\n')
  );
```

### Header Layout (updated for CR-55)

```yaml
header_pattern: |
  <View style={styles.header}>
    <Pressable onPress={() => router.back()}>
      <Text style={[styles.backButton, { color: colors.primary }]}>
        {t('common.back')}
      </Text>
    </Pressable>
    <Text style={[styles.headerTitle, { color: colors.text }]}>
      {t('members.title')}
    </Text>
    {canWrite ? (
      <Pressable style={styles.addButton} onPress={handleAdd}>
        <Text style={styles.addButtonText}>+</Text>
      </Pressable>
    ) : (
      <View style={{ width: 36 }} />
    )}
  </View>

spacer_rule: |
  When canWrite=false, a transparent View with width=36 occupies
  the right position to keep the title centered.
  36 matches the add button's occupied width.
```

## i18n Keys (new)

```yaml
pt-BR:
  members.importEmpty: "O arquivo CSV está vazio. Nenhum dado para importar."
  members.importErrorLine: "Linha {line}: {field} - {error}"

en:
  members.importEmpty: "The CSV file is empty. No data to import."
  members.importErrorLine: "Line {line}: {field} - {error}"

es:
  members.importEmpty: "El archivo CSV está vacío. No hay datos para importar."
  members.importErrorLine: "Línea {line}: {field} - {error}"
```

## File Impact Summary

| File | CRs | Change Type |
|------|-----|-------------|
| `src/app/(tabs)/settings/members.tsx` | CR-54, CR-55, CR-66 | Fix export cancel handling, import error i18n, header spacer, empty export |
| `src/i18n/locales/pt-BR.json` | CR-54, CR-66 | Add importEmpty, importErrorLine keys |
| `src/i18n/locales/en.json` | CR-54, CR-66 | Mirror pt-BR |
| `src/i18n/locales/es.json` | CR-54, CR-66 | Mirror pt-BR |

## Risk Assessment

```yaml
risks:
  - id: R-1
    severity: LOW
    cr: CR-54
    description: "Share sheet cancellation detection varies by platform"
    mitigation: "Check for both 'User did not share' (iOS) and 'cancelled' in error message"

  - id: R-2
    severity: LOW
    cr: CR-66
    description: "Empty CSV export might confuse users"
    mitigation: "Headers-only CSV is valid. Users can use it as a template for import."

  - id: R-3
    severity: LOW
    cr: CR-66
    description: "Validation error messages must be translated in all 3 languages"
    mitigation: "Use i18n interpolation (t('key', { line, field, error })) for all messages"
```
