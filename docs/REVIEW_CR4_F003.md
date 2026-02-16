# REVIEW_CR4_F003 - Connect SyncEngine, OfflineManager & Notifications

```yaml
type: review
version: 1
verdict: APPROVED
features: [CR-52, CR-53]
files_reviewed:
  - src/providers/SyncProvider.tsx (NEW)
  - src/app/_layout.tsx (MODIFIED)
  - src/hooks/useConnection.ts (EXISTS, unchanged)
  - src/hooks/useRealtimeSync.ts (EXISTS, unchanged)
  - src/hooks/useNotifications.ts (EXISTS, unchanged)
  - src/hooks/useOfflineQueueProcessor.ts (EXISTS, unchanged)
  - src/components/OfflineBanner.tsx (EXISTS, unchanged)
  - docs/arch/ARCH_CR4_F003.md
  - docs/plan/PLAN_CR4_F003.md
  - src/__tests__/cr004-f003-sync-offline.test.ts
```

## Verdict: APPROVED

The implementation is correct, minimal, and faithful to the architecture document. No findings require blocking changes.

## Checklist Results

### 1. SyncProvider.tsx -- Correct

- New file at `src/providers/SyncProvider.tsx` (42 lines).
- Orchestrates exactly 5 hooks in the correct dependency order:
  1. `useConnection()` -- provides `isOnline`, `showOfflineBanner`, `setWebSocketConnected`
  2. `useRealtimeSync({ isOnline, setWebSocketConnected })` -- depends on #1
  3. `useOfflineQueueProcessor(isOnline)` -- depends on #1
  4. `useRegisterPushToken(isOnline)` -- depends on #1
  5. `useNotificationHandler()` -- independent
- Renders `<OfflineBanner visible={showOfflineBanner} />` above `{children}` via React Fragment.
- Clean, minimal component. No unnecessary state, context, or side effects of its own.

### 2. _layout.tsx -- Correct

- SyncProvider is imported and inserted inside `AuthProvider`, wrapping `NavigationGuard`.
- Actual provider nesting order in the tree:
  ```
  ErrorBoundary > QueryClientProvider > I18nextProvider > ThemeProvider > AuthProvider > SyncProvider > NavigationGuard > StatusBar + Slot
  ```
- This matches the expected order from ARCH_CR4_F003.md.

### 3. Hook Execution Order -- Correct

- `useConnection` runs first, providing `isOnline` to all subsequent hooks.
- `useRealtimeSync` receives both `isOnline` and `setWebSocketConnected`.
- `useOfflineQueueProcessor` receives `isOnline` for offline-to-online transition detection.
- `useRegisterPushToken` receives `isOnline` to defer registration when offline.
- `useNotificationHandler` is independent (no connection dependency).
- Numbered comments in the source clearly document the ordering rationale.

### 4. Provider Nesting Order -- Correct

SyncProvider is placed inside AuthProvider (so `useAuth()` is available to internal hooks like `useRealtimeSync` and `useRegisterPushToken`) and inside QueryClientProvider (so `useQueryClient()` is available to `useRealtimeSync` and `useOfflineQueueProcessor`).

### 5. Existing Hooks -- NOT Modified

Git log confirms no recent changes to any of the existing hooks:
- `useConnection.ts` -- last changed in commit `46f03cf` (original infra commit)
- `useRealtimeSync.ts` -- last changed in commit `3119515` (per-table subscribe fix)
- `useNotifications.ts` -- last changed in commit `65827c7` (original infra commit)
- `useOfflineQueueProcessor.ts` -- no recent changes
- `OfflineBanner.tsx` -- no recent changes

### 6. Security, Reliability, Performance

**Security:** No concerns. No new data flows, no user input handling, no new network calls. All hooks were previously reviewed.

**Reliability:**
- `useConnection` properly cleans up NetInfo listener and banner timeout on unmount.
- `useRealtimeSync` properly removes Supabase channel on unmount and stops polling.
- `useRegisterPushToken` uses `cancelled` flag pattern to avoid state updates after unmount.
- `useNotificationHandler` removes listener subscription on unmount.
- `useOfflineQueueProcessor` uses `processingRef` to prevent concurrent queue drains.
- All hooks have proper cleanup in their useEffect return functions.

**Performance:** No concerns. SyncProvider adds zero re-render overhead beyond what the individual hooks already produce. The Fragment wrapper is lightweight.

### 7. Tests

- 178 tests in `src/__tests__/cr004-f003-sync-offline.test.ts`, all passing.
- Tests are source-level verification (reading file contents), not runtime integration tests.
- Coverage is thorough: imports, hook calls, props, interfaces, i18n keys, provider ordering, and all sub-module contracts.

## Non-Blocking Observations

### N-1: ARCH Doc Minor Discrepancy (Cosmetic)

The ARCH_CR4_F003.md contract block for SyncProvider shows 4 hooks (omits `useOfflineQueueProcessor`), while the actual implementation has 5 hooks. The ARCH diagram and file impact table correctly list the offlineQueue as EXISTS/unchanged, and the deferred work section clarifies that queue _integration with mutations_ is deferred (not the processor itself). The implementation is correct -- the processor hook was already complete and wiring it is appropriate. The ARCH contract code snippet is just slightly stale.

### N-2: _layout.tsx Comment Stale (Cosmetic)

Line 102 of `_layout.tsx` says:
```
Provider order: QueryClient > I18n > Theme > Auth > Navigation
```
This comment predates the SyncProvider addition and should include `Sync` between `Auth` and `Navigation`. Non-blocking since the actual code is correct.

### N-3: PLAN File Location Discrepancy (Cosmetic)

PLAN_CR4_F003.md STEP-01 references `src/app/(tabs)/_layout.tsx` as the target file, but the actual implementation correctly places SyncProvider in `src/app/_layout.tsx` (root layout). The root layout is the right choice since it ensures sync/offline/notifications work across all screens including auth screens. The ARCH doc correctly specifies the root layout.

## Summary

| Area | Status |
|------|--------|
| SyncProvider.tsx correctness | PASS |
| _layout.tsx integration | PASS |
| Hook execution order | PASS |
| Provider nesting order | PASS |
| No existing hooks modified | PASS |
| Security | PASS |
| Reliability | PASS |
| Performance | PASS |
| Tests (178/178) | PASS |

**APPROVED** -- no blocking findings. Three cosmetic observations noted for future cleanup.
