# ARCH_CR4_F003 - Connect SyncEngine, OfflineManager & Notifications

```yaml
type: arch
version: 1
status: complete
module: SyncProvider
features: [CR-52, CR-53]
spec: CHANGE_REQUESTS_4 (items 52, 53)
```

## Overview

```yaml
goal: "Connect existing dead-code modules (RealtimeSync, ConnectionMonitor, Notifications) to the app layout"
principles:
  - "All hooks already exist, tested, and complete -- only wiring needed"
  - "Single SyncProvider component encapsulates all connection/sync/notification hooks"
  - "SyncProvider placed inside AuthProvider so wardId/role are available"
  - "OfflineBanner rendered above Slot in NavigationGuard"
  - "offlineQueue integration with mutations is DEFERRED (not in scope)"
```

## Diagram

```
  Provider Stack (src/app/_layout.tsx)
  =====================================

  ErrorBoundary
    QueryClientProvider
      I18nextProvider
        ThemeProvider
          AuthProvider
            SyncProvider  ← NEW (wraps connection + realtime + notifications)
              NavigationGuard
                OfflineBanner  ← NEW (rendered above Slot)
                StatusBar
                Slot
```

## Components

| # | Component | File | Status | Changes |
|---|-----------|------|--------|---------|
| 1 | SyncProvider | `src/providers/SyncProvider.tsx` | **NEW** | Encapsulates useConnection + useRealtimeSync + useNotifications |
| 2 | InnerLayout | `src/app/_layout.tsx` | MODIFY | Import and wrap with SyncProvider |
| 3 | NavigationGuard | `src/app/_layout.tsx` | MODIFY | Add OfflineBanner rendering |
| 4 | useConnection | `src/hooks/useConnection.ts` | EXISTS | No changes |
| 5 | useRealtimeSync | `src/hooks/useRealtimeSync.ts` | EXISTS | No changes |
| 6 | useRegisterPushToken | `src/hooks/useNotifications.ts` | EXISTS | No changes |
| 7 | useNotificationHandler | `src/hooks/useNotifications.ts` | EXISTS | No changes |
| 8 | OfflineBanner | `src/components/OfflineBanner.tsx` | EXISTS | No changes |

## Contracts

### SyncProvider (NEW)

```typescript
// NEW FILE: src/providers/SyncProvider.tsx

import React from 'react';
import { useConnection } from '../hooks/useConnection';
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import { useRegisterPushToken, useNotificationHandler } from '../hooks/useNotifications';
import { OfflineBanner } from '../components/OfflineBanner';

interface SyncProviderProps {
  children: React.ReactNode;
}

/**
 * SyncProvider: orchestrates connection monitoring, realtime sync,
 * and push notifications. Must be placed inside AuthProvider
 * (needs wardId/role) and QueryClientProvider (needs queryClient).
 *
 * Renders OfflineBanner above children when device is offline.
 */
export function SyncProvider({ children }: SyncProviderProps) {
  // 1. Connection monitoring (must be first -- provides isOnline)
  const { isOnline, showOfflineBanner, setWebSocketConnected } = useConnection();

  // 2. Realtime sync (depends on isOnline from useConnection)
  useRealtimeSync({ isOnline, setWebSocketConnected });

  // 3. Push token registration (depends on isOnline)
  useRegisterPushToken(isOnline);

  // 4. Notification tap handler (independent)
  useNotificationHandler();

  return (
    <>
      <OfflineBanner visible={showOfflineBanner} />
      {children}
    </>
  );
}
```

### _layout.tsx Changes

```yaml
file: src/app/_layout.tsx
changes:
  - import: "import { SyncProvider } from '../providers/SyncProvider';"
  - InnerLayout: |
      Wrap NavigationGuard with SyncProvider inside AuthProvider:

      // BEFORE (line 61-72):
      function InnerLayout() {
        const { mode } = useTheme();
        return (
          <AuthProvider>
            <NavigationGuard>
              <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
              <Slot />
            </NavigationGuard>
          </AuthProvider>
        );
      }

      // AFTER:
      function InnerLayout() {
        const { mode } = useTheme();
        return (
          <AuthProvider>
            <SyncProvider>
              <NavigationGuard>
                <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
                <Slot />
              </NavigationGuard>
            </SyncProvider>
          </AuthProvider>
        );
      }
```

## Hook Execution Order

```yaml
order:
  1_useConnection: |
    Initializes NetInfo listener. Provides isOnline state.
    Sets showOfflineBanner on connectivity changes.
    Must run FIRST (other hooks depend on isOnline).

  2_useRealtimeSync: |
    Subscribes to Supabase Realtime channel for ward tables.
    Falls back to polling (2.5s) when WebSocket fails.
    Calls setWebSocketConnected from useConnection.
    Depends on: isOnline, wardId (from useAuth inside the hook).

  3_useRegisterPushToken: |
    Registers Expo push token with Supabase.
    Skips for observer role. Defers if offline.
    Depends on: isOnline, user/role/wardId (from useAuth inside the hook).

  4_useNotificationHandler: |
    Listens for notification taps and navigates to Home.
    Independent -- no dependencies on connection state.
```

## Data Model Changes

```yaml
migrations: none
edge_functions: none
new_tables: none
```

## Where OfflineBanner Renders

```yaml
position: |
  OfflineBanner renders ABOVE the NavigationGuard/Slot content.
  It sits between SyncProvider and NavigationGuard in the component tree.
  When visible=true, it shows a red bar at the top with offline message.
  When visible=false, it returns null (zero layout impact).

  The banner is app-wide (covers all tabs and auth screens).
  This is intentional: if the user is offline on the login screen,
  they should see the banner too.
```

## File Impact Summary

| File | CRs | Change Type |
|------|-----|-------------|
| `src/providers/SyncProvider.tsx` | CR-52, CR-53 | **NEW**: orchestrator component |
| `src/app/_layout.tsx` | CR-52, CR-53 | MODIFY: wrap with SyncProvider (lines 61-72) |

**No changes to existing hooks or components** -- they are all already complete and tested:
- `src/hooks/useConnection.ts` -- unchanged
- `src/hooks/useRealtimeSync.ts` -- unchanged
- `src/hooks/useNotifications.ts` -- unchanged
- `src/components/OfflineBanner.tsx` -- unchanged
- `src/lib/offlineQueue.ts` -- unchanged (integration DEFERRED)
- `src/lib/sync.ts` -- unchanged
- `src/lib/connectionUtils.ts` -- unchanged

## Deferred Work

```yaml
deferred:
  - id: DEFER-1
    description: "offlineQueue integration with mutation hooks"
    reason: "Too many mutations across 6+ hooks. Each would need to wrap
      its mutationFn with offlineQueue.enqueue when offline. Complex, error-prone.
      Deferred to a dedicated CR."
    impact: "Mutations will fail silently when offline (current behavior).
      User sees no feedback. The offlineQueue code exists but is unused."
```

## Risk Assessment

```yaml
risks:
  - id: R-1
    severity: LOW
    cr: CR-52
    description: "useRealtimeSync subscribes to all 7 ward tables via single channel.
      High-frequency updates could cause excessive invalidation."
    mitigation: "Already mitigated by TanStack Query's dedup and staleTime(5min).
      Polling fallback is every 2.5s which is reasonable."

  - id: R-2
    severity: LOW
    cr: CR-52
    description: "OfflineBanner renders above all content including auth screens.
      User sees offline message even before logging in."
    mitigation: "This is correct behavior. Login requires network.
      The banner helps the user understand why login might fail."

  - id: R-3
    severity: LOW
    cr: CR-53
    description: "useNotificationHandler calls router.replace('/(tabs)') on tap.
      If user is not authenticated, this could conflict with NavigationGuard."
    mitigation: "NavigationGuard will redirect back to login if unauthenticated.
      The notification tap is a no-op in practice for unauthenticated users."

  - id: R-4
    severity: LOW
    cr: CR-53
    description: "Push token registration requires Expo project ID.
      Uses undefined (default from app.json)."
    mitigation: "Standard Expo pattern. Works when app.json has correct owner/slug."
```
