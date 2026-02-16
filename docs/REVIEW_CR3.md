# REVIEW_CR3 -- CR-3 Batch (F025-F031, CRs 31-43) -- Iteration 2

```yaml
type: review
iteration: 2
verdict: changes_required
date: 2026-02-16
commits_reviewed: d7a8d52..38588be
tests_passing: 1225 / 1225
test_files: 39
files_reviewed: 18
```

## Verdict: changes_required

Iteration 2: All 5 previous issues (R-1 through R-5) have been fixed. However, 2 new issues found during the fix verification -- one P0 that was EXPOSED by the R-1 fix, and one P1 residual from the original code that was NOT caught in iteration 1.

---

## Previous Issues Status

```yaml
previous_issues_status:
  - id: R-1
    status: fixed
    notes: "Dynamic imports replaced with static imports at file top (FileSystem, Sharing, DocumentPicker). Verified at members.tsx lines 30-32."

  - id: R-2
    status: fixed
    notes: "Catch block in handleExport now shows Alert.alert with i18n error message (members.tsx:370-372). However, it still catches ALL errors -- see new R-7 below."

  - id: R-3
    status: fixed
    notes: "signOutButton now has borderWidth: 1, borderRadius: 12, and borderColor: colors.error applied via style array (index.tsx:227, 359-360)."

  - id: R-4
    status: fixed
    notes: "members.exportFailed and members.importFailed keys added to all 3 locale files (pt-BR, en, es)."

  - id: R-5
    status: fixed
    notes: "Topic filtering now uses useMemo with [wardTopics, search] deps (topics.tsx:191-196). useMemo correctly imported at line 6."
```

---

## New Issues Found

### R-7 [P0, reliability] -- CR-42: Export error handler does not distinguish cancellation from real errors

- **File:** `src/app/(tabs)/settings/members.tsx:370-371`
- **Problem:** The R-2 fix replaced the silent swallow with an Alert.alert for ALL errors, but it still does not distinguish user cancellation from real errors. When the user taps "Share" and then dismisses the share sheet (cancels), `Sharing.shareAsync` throws with `message === 'User did not share'`. The current code shows an error alert to the user in this case, which is wrong -- cancellation is an intentional action and should not show an error.

  Current code:
  ```typescript
  } catch {
    Alert.alert(t('common.error'), t('members.exportFailed'));
  }
  ```

  The SPEC (AC-54.1) explicitly states: "detect cancellation by checking `err?.message !== 'User did not share'` or equivalent". The R-2 suggestion in the previous REVIEW included exactly this pattern but only half of it was implemented.

- **Fix:** Add the cancellation check:
  ```typescript
  } catch (err: any) {
    if (err?.message !== 'User did not share') {
      Alert.alert(t('common.error'), t('members.exportFailed'));
    }
  }
  ```

### R-8 [P1, i18n] -- CR-42: Import handler still uses hardcoded English error string

- **File:** `src/app/(tabs)/settings/members.tsx:446-447`
- **Problem:** The import handler's catch block still uses a hardcoded English string `'Failed to read file'` instead of using the i18n key `t('members.importFailed')` that was just added in the R-4 fix. This means the i18n key exists in all 3 locale files but is only used by the export handler, not the import handler.

  Current code:
  ```typescript
  } catch {
    Alert.alert(t('common.error'), 'Failed to read file');
  }
  ```

- **Fix:** Replace with the i18n key:
  ```typescript
  } catch {
    Alert.alert(t('common.error'), t('members.importFailed'));
  }
  ```

---

## Advisory Notes (NOT blocking, for awareness)

### Pre-existing issues NOT introduced by CR-3 batch (tracked in CR-4)

These were noted in iteration 1 and remain -- they are tracked as CR-54 through CR-66 in the CHANGE_REQUESTS_4.txt and will be addressed in F004/F005 of CR-4 batch:

1. **ErrorBoundary.tsx** uses hardcoded English strings ('Something went wrong', 'Try Again') and hardcoded colors (#333, #666, #007AFF) -- tracked as CR-59.
2. **whatsapp.ts** uses hardcoded English strings ('WhatsApp is not installed on this device', 'Failed to open WhatsApp') -- tracked as CR-59.
3. **whatsapp.tsx** has hardcoded labels ('Placeholders:', 'Template:', 'Preview:', '(empty)', 'Saving...') -- tracked as CR-59 (pre-existing, noted as R-6 in iteration 1).
4. **Members screen header** has no spacer when `canWrite=false`, causing title misalignment -- tracked as CR-55.

---

## Positive Points

- All 5 previous issues (R-1 through R-5) were correctly fixed in a single focused commit
- Test suite grew from 1204 to 1225 tests (39 test files, all passing)
- Static imports for expo-file-system, expo-sharing, expo-document-picker are clean and at the top of the file
- Sign-out button now properly styled with destructive border (borderWidth: 1, borderRadius: 12, borderColor: colors.error)
- The useMemo for topic filtering has correct dependencies
- The i18n keys for exportFailed/importFailed have proper translations in all 3 locales

---

## Stats

| Metric | Value |
|--------|-------|
| P0 issues | 1 (R-7) |
| P1 issues | 1 (R-8) |
| P2 issues | 0 |
| Files reviewed | 18 |
| Tests passing | 1225 / 1225 |
| Test files | 39 |
| Previous issues fixed | 5/5 |
| New issues found | 2 |

## Decision

```yaml
can_merge: false
blocking_issues: [R-7]
required_fixes: [R-7, R-8]
```

Both R-7 and R-8 are trivial one-line fixes in `src/app/(tabs)/settings/members.tsx`. After fixing, iteration 3 should approve.
