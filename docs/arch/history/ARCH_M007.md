# ARCH_M007 - OfflineManager

```yaml
type: arch
version: 1
status: complete
module: OfflineManager
features: [F022]
```

## Overview

```yaml
goal: "Enable offline usage with optimistic UI updates and mutation queue that syncs on reconnect"
principles:
  - "Optimistic UI: mutations applied to local cache immediately"
  - "Mutation queue persisted in AsyncStorage (survives app restart)"
  - "FIFO processing on reconnect; last-write-wins conflict resolution"
  - "User management operations (Edge Functions) blocked offline with error message"
```

## Diagram

```
┌─────────────────────────────────────────────┐
│  User Action (mutation)                      │
└──────────┬──────────────────────────────────┘
           │
     ┌─────▼─────┐
     │  Online?   │
     ├─Yes────────┼─No──────────────┐
     ▼            │                 ▼
┌──────────┐     │      ┌──────────────────┐
│ Supabase │     │      │ MutationQueue    │
│ (direct) │     │      │ (AsyncStorage)   │
└──────────┘     │      │ max 100 entries  │
                 │      └────────┬─────────┘
                 │               │
                 │      ┌────────▼─────────┐
                 │      │ Optimistic UI    │
                 │      │ (TanStack cache) │
                 │      └──────────────────┘
                 │               │
                 │      On reconnect:
                 │      ┌────────▼─────────┐
                 │      │ Process FIFO     │
                 │      │ last-write-wins  │
                 └──────┴──────────────────┘
```

## Components

| # | Component | Responsibility | Dependencies |
|---|-----------|----------------|--------------|
| 1 | ConnectionDetector | Monitor network status; show/hide "Offline" banner | React Native NetInfo |
| 2 | MutationQueue | Persist pending mutations in AsyncStorage; FIFO replay | AsyncStorage |
| 3 | OptimisticUpdater | Apply mutations to TanStack Query cache for immediate UI feedback | TanStack Query |
| 4 | QueueProcessor | On reconnect: replay queue FIFO, handle conflicts (last-write-wins) | MutationQueue, Supabase |
| 5 | OfflineGuard | Block Edge Function operations with "Requires connection" error | ConnectionDetector |

## Contracts

### MutationQueue

```typescript
// lib/offlineQueue.ts
interface QueuedMutation {
  id: string;
  table: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

function enqueue(mutation: QueuedMutation): Promise<void>;
function dequeue(): Promise<QueuedMutation | null>;
function getQueueSize(): Promise<number>;
function clearQueue(): Promise<void>;
```

### ConnectionDetector

```typescript
// hooks/useConnection.ts
interface ConnectionState {
  isOnline: boolean;
  showOfflineBanner: boolean;
  isWebSocketConnected: boolean;
  setWebSocketConnected: (connected: boolean) => void;
}

function useConnection(): ConnectionState;
```

### OfflineGuard

```typescript
// lib/offlineGuard.ts
const ONLINE_ONLY_OPERATIONS = [
  'register-first-user',
  'register-invited-user',
  'create-invitation',
  'update-user-role',
  'delete-user',
] as const;

function requiresConnection(operation: string): boolean;
function throwIfOffline(operation: string): void;  // throws with i18n message
```

## Flows

### Offline Mutation Flow

```
1. User performs action (e.g., edit member) while offline
2. OptimisticUpdater applies change to TanStack cache (UI updates)
3. MutationQueue persists mutation to AsyncStorage
4. If queue size >= 100, reject new mutations with warning
5. On reconnect:
   a. QueueProcessor reads queue FIFO
   b. Each mutation sent to Supabase
   c. Conflict: server compares updated_at timestamps (last-write-wins)
   d. On success: remove from queue
   e. On failure: retry up to 3 times, then discard with user notification
```

### Online-only Operation Flow

```
1. User attempts Edge Function operation (e.g., delete user) while offline
2. OfflineGuard detects operation is in ONLINE_ONLY_OPERATIONS
3. Shows error toast: "Requires connection" (i18n)
4. Mutation NOT queued
```

## ADRs

```yaml
adrs:
  - id: ADR-008
    title: "Last-write-wins conflict resolution"
    context: "App is not designed for simultaneous multi-user editing; conflicts are rare"
    decision: "Use updated_at timestamp comparison; latest write wins"
    consequences:
      - "Simple implementation, no merge logic"
      - "Acceptable for single-active-user-per-ward model"
```


## Integration

### Where modules are connected (added by CR-46)

```
src/app/_layout.tsx → InnerLayout → AuthProvider → SyncProvider → NavigationGuard

src/providers/SyncProvider.tsx:
  useConnection()          → Monitors NetInfo, shows/hides OfflineBanner
  useRealtimeSync()        → Subscribes to Supabase Realtime (SyncEngine)
  useOfflineQueueProcessor → Drains mutation queue on reconnect
  useRegisterPushToken     → Registers push token (NotificationModule)
  useNotificationHandler   → Handles notification taps

src/components/OfflineBanner.tsx:
  Rendered by SyncProvider above {children}
  Shows translated "offline" message with red banner

src/hooks/useOfflineQueueProcessor.ts:
  Watches isOnline transitions (offline → online)
  Processes queued mutations FIFO via supabase client
  Supports INSERT, UPDATE, DELETE operations
  Invalidates all queries after queue drain
```

### OfflineBanner rendering

```
┌──────────────────────────────────┐
│  OfflineBanner (red, top)        │ ← visible when showOfflineBanner=true
│  "Sem conexão"                   │
│  "Alterações serão sincronizadas │
│   quando a conexão for           │
│   restaurada."                   │
├──────────────────────────────────┤
│  Tab Content (Slot)              │
│  ...                             │
└──────────────────────────────────┘
```
