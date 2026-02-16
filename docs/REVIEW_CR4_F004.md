# REVIEW_CR4_F004 -- F004 Error Handling Overhaul (CR-57, CR-58, CR-59, CR-60, CR-61) -- Iteration 1

```yaml
type: review
iteration: 1
verdict: changes_required
date: 2026-02-16
tests_passing: 154 / 154
test_files: 1 (cr004-f004-error-handling.test.ts)
files_reviewed: 14
```

## Verdict: changes_required

The F004 error handling overhaul makes significant progress. The global QueryClient configuration (CR-61) is well-implemented with QueryCache and MutationCache error handlers, smart retry logic, and the suppressGlobalError escape hatch. ErrorBoundary (CR-59) now uses i18n and supports theme colors via ThemedErrorBoundary. QueryErrorView (CR-58) is a clean, reusable component. Per-tab ThemedErrorBoundary wrapping (CR-60) is done for all 3 tabs.

However, 3 issues were found: 1 P0 blocker (mutation errors expose raw Supabase messages to users, violating AC-57.7), 1 P1 (Home tab does not use QueryErrorView, violating AC-58.2), and 1 P2 (AgendaForm not wrapped in ErrorBoundary per AC-60.2).

---

## Issues

### R-1 [P0, security/i18n] -- CR-57: mutationCache.onError exposes raw error.message to users

- **Location:** `src/app/_layout.tsx:28`
- **Category:** security, correction
- **Description:** The global `mutationCache.onError` handler passes `error.message` directly into the i18n template:
  ```typescript
  i18n.t('errors.mutationFailed', { message: error.message })
  ```
  The i18n templates in all 3 locales use `{{message}}`:
  - pt-BR: `"Operacao falhou: {{message}}"`
  - en: `"Operation failed: {{message}}"`
  - es: `"La operacion fallo: {{message}}"`

  This means the RAW Supabase error message (e.g., `"duplicate key value violates unique constraint \"members_pkey\""`, `"new row violates check constraint \"sunday_exceptions_reason_check\""`, or PostgreSQL stack traces) is shown directly to the user.

  **AC-57.7** explicitly states: "the message is translated in all 3 languages and NEVER shows stack traces, Supabase error codes, or technical messages."

  This is a P0 because it exposes internal database structure to users and violates the explicit AC requirement.

- **Suggestion:** Remove the `{{message}}` interpolation from the global handler. Use a generic user-friendly message instead. The error.message should only be logged to console in `__DEV__` mode:
  ```typescript
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if ((mutation as any).meta?.suppressGlobalError) return;
      if (__DEV__) {
        console.error('[MutationCache] Error:', error.message);
      }
      Alert.alert(
        i18n.t('common.error'),
        i18n.t('errors.mutationFailed')
      );
    },
  }),
  ```
  And update the i18n keys to remove the `{{message}}` placeholder:
  - pt-BR: `"Falha ao salvar. Verifique sua conexao e tente novamente."`
  - en: `"Failed to save. Please check your connection and try again."`
  - es: `"Error al guardar. Verifique su conexion e intentelo de nuevo."`

### R-2 [P1, correction] -- CR-58: Home tab does NOT show QueryErrorView on query failure

- **Location:** `src/app/(tabs)/index.tsx`
- **Category:** correction
- **Description:** AC-58.2 requires: "Given the Home tab, when any query fails (isError=true), then QueryErrorView is shown instead of empty content."

  The Home tab (`index.tsx`) wraps its content in `ThemedErrorBoundary` (good, satisfies CR-60) but does NOT import or use `QueryErrorView`. It does not destructure `isError` or `error` from any query. The sub-components (`NextSundaysSection`, `NextAssignmentsSection`, `InviteManagementSection`) also do NOT check `isError` -- confirmed via grep showing zero matches for `isError` or `QueryErrorView` in any of them.

  If the speeches query, exceptions query, or members query fails in the Home tab, the user sees an empty list with no error indication and no retry option.

  The Speeches tab (line 318) and Agenda tab (line 192) both correctly check `isError` and render `QueryErrorView`. The Home tab is the only one missing this.

- **Suggestion:** The Home tab's queries are spread across sub-components, making it harder to add a top-level QueryErrorView. Two approaches:
  1. **Per-section**: Add `QueryErrorView` inside each sub-component (NextSundaysSection, NextAssignmentsSection) when their queries fail.
  2. **Lift queries up**: Lift the key queries to `HomeTabContent`, check `isError`, and render `QueryErrorView` at the tab level (same pattern as Speeches/Agenda tabs).

  Approach 1 is more granular and allows partial rendering (one section errors, others still show). Recommended approach:
  ```typescript
  // In NextSundaysSection.tsx
  const { data: speeches, isError, error, refetch } = useSpeeches(...);
  if (isError) {
    return <QueryErrorView error={error} onRetry={refetch} />;
  }
  ```

### R-3 [P2, reliability] -- CR-60: AgendaForm not wrapped in ErrorBoundary

- **Location:** `src/components/AgendaForm.tsx`
- **Category:** reliability
- **Description:** AC-60.2 states (priority: should): "Given critical components (AgendaForm, SundayCard, PresentationMode), when wrapped, then each has its own ErrorBoundary."

  `AgendaForm` is a complex component with multiple modals, selectors, and mutations. A render error in AgendaForm would propagate up and potentially crash the entire Agenda tab (caught by the tab-level ThemedErrorBoundary, which would blank the entire tab).

  Wrapping AgendaForm in its own ThemedErrorBoundary would isolate crashes to the expanded card, leaving the rest of the agenda list functional.

  This is P2 because the tab-level boundary already prevents a full app crash -- this is about granularity.

- **Suggestion:** In `src/app/(tabs)/agenda.tsx`, wrap the `<AgendaForm>` inside `AgendaSundayCard` with a `ThemedErrorBoundary`:
  ```tsx
  {expandable && isExpanded && (
    <View style={styles.expandedContent}>
      <ThemedErrorBoundary>
        <AgendaForm sundayDate={date} exceptionReason={exception?.reason ?? null} customReason={exception?.custom_reason ?? null} />
      </ThemedErrorBoundary>
    </View>
  )}
  ```

---

## Checklist Verification

### 1. Correction
- [x] AC-57.1 through AC-57.6 (mutation error feedback): Implemented via global mutationCache.onError. All mutations across all hooks (useMembers, useActors, useSpeeches, useTopics, useAgenda, useSundayTypes) are covered because the handler is global -- no per-hook onError needed.
- [ ] AC-57.7 (no technical messages shown to users): **FAILS** -- raw error.message is interpolated into the user-facing alert (R-1).
- [x] AC-57.8 (i18n error keys in all 3 locales): `errors.mutationFailed`, `errors.queryFailed`, `errors.queryFailedMessage`, `errors.boundaryTitle`, `errors.boundaryMessage`, `errors.whatsappNotInstalled`, `errors.whatsappFailed` all present in pt-BR, en, es.
- [x] AC-58.1 (QueryErrorView component): Implemented at `src/components/QueryErrorView.tsx` with i18n, theme colors, retry button.
- [ ] AC-58.2 (Home tab QueryErrorView): **FAILS** -- Home tab does not use QueryErrorView (R-2).
- [x] AC-58.3 (Speeches tab QueryErrorView): Lines 318-327 check `speechesError || exceptionsError` and render QueryErrorView.
- [x] AC-58.4 (Agenda tab QueryErrorView): Lines 192-201 check `exceptionsError` and render QueryErrorView.
- [x] AC-58.5 (QueryErrorView dark mode): Uses `colors.background`, `colors.text`, `colors.textSecondary`, `colors.primary`, `colors.onPrimary` from ThemeContext.
- [x] AC-59.1 through AC-59.3 (ErrorBoundary i18n): Uses `i18n.t('errors.boundaryTitle')`, `i18n.t('errors.boundaryMessage')`, `i18n.t('common.retry')`.
- [x] AC-59.4 (ErrorBoundary theme): ThemedErrorBoundary passes theme colors via props. ErrorBoundary uses `c?.background`, `c?.text`, `c?.textSecondary`, `c?.primary`, `c?.onPrimary` with sensible fallbacks.
- [x] AC-59.5 (WhatsApp i18n): `whatsapp.ts` uses `i18n.t('errors.whatsappNotInstalled')` and `i18n.t('errors.whatsappFailed')`.
- [x] AC-59.6 (Members import i18n): `members.tsx:461` uses `t('members.importFailed')`.
- [x] AC-60.1 (per-tab ErrorBoundary): All 3 tabs wrap content in `ThemedErrorBoundary` -- Home (line 58), Speeches (line 395), Agenda (line 324).
- [ ] AC-60.2 (critical component boundaries): AgendaForm not wrapped (R-3, P2/should priority).
- [x] AC-60.4 (granular boundary uses same i18n/theme): ThemedErrorBoundary reuses the same ErrorBoundary class with theme colors.
- [x] AC-61.1 (queryCache.onError): Logs via `console.error('[QueryCache] Error:', error.message)`.
- [x] AC-61.2 (mutationCache.onError): Shows Alert.alert with i18n message.
- [x] AC-61.3 (query retry with backoff): Smart retry function: `failureCount < 2` with 4xx exclusion.
- [x] AC-61.4 (mutation retry: 0): `mutations: { retry: 0 }`.
- [x] AC-61.5 (401/403 no retry): `error?.status >= 400 && error?.status < 500` returns false (no retry).

### 2. Scope
- [x] No features added beyond the error handling CRs.
- [x] Changes are focused and minimal.

### 3. Architecture
- [x] QueryClient configuration follows TanStack Query best practices.
- [x] ErrorBoundary class component + ThemedErrorBoundary wrapper correctly solves the hooks-in-class-component problem (EC-59.1).
- [x] suppressGlobalError meta pattern allows per-mutation opt-out without coupling hooks to the global handler.

### 4. Clarity
- [x] Code is readable with clear separation of concerns.
- [x] QueryErrorView is a clean, reusable component with good props interface.
- [x] ErrorBoundary has clear JSDoc and TypeScript interfaces.

### 5. Security
- [ ] **FAIL**: Raw Supabase error messages exposed to users via mutationFailed (R-1).

### 6. Reliability
- [x] onError in useSundayTypes (lines 284, 335) correctly reverts optimistic updates.
- [x] suppressGlobalError prevents double-alert for auto-assign mutations.
- [x] ThemedErrorBoundary prevents full app crashes.

### 7. Performance
- [x] No performance concerns. Error handlers are on error paths only.

### 8. Tests
- [x] 154 tests in cr004-f004-error-handling.test.ts, all passing.
- [x] Tests cover QueryClient config, QueryErrorView, ErrorBoundary, i18n keys, per-tab wrapping.

### 9. Observability
- [x] queryCache logs errors to console.error.
- [x] __DEV__ error details shown in ErrorBoundary and QueryErrorView.

---

## Positive Points

- The global mutationCache.onError pattern is elegant -- it covers all 17+ mutations without adding onError to each hook individually. This is better than the per-hook approach suggested in the SPEC because it's DRY and ensures no mutation is missed in the future.
- The suppressGlobalError meta escape hatch for auto-assign is well thought out -- prevents confusing error alerts for background operations.
- ThemedErrorBoundary solves the class-component-hooks limitation cleanly with a simple wrapper.
- QueryErrorView is well-designed with warning icon, i18n title, i18n message, dev-only error details, and themed retry button.
- Smart retry logic that skips 4xx errors prevents futile retries on auth/permission failures.
- All 3 locale files have consistent error key structures.

---

## Stats

```yaml
stats:
  p0_count: 1
  p1_count: 1
  p2_count: 1
  files_reviewed: 14
  tests_passing: 154
  test_files: 1
```

## Decision

```yaml
decision:
  can_merge: false
  blocking_issues: ["R-1"]
  required_fixes: ["R-1", "R-2"]
  optional_fixes: ["R-3"]
```

R-1 is a P0 blocker because it exposes internal database error messages to end users. R-2 is a P1 must-fix because the Home tab is missing error handling that the other two tabs have. R-3 is a P2 optional improvement for granular error isolation.
