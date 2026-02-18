# ARCH_M006 - SyncEngine

```yaml
type: arch
version: 1
status: complete
module: SyncEngine
features: [F011]
```

## Overview

```yaml
goal: "Keep all clients synchronized within 5 seconds using Supabase Realtime with polling fallback"
principles:
  - "WebSocket (Supabase Realtime) is the primary sync mechanism"
  - "Polling fallback (2-3s interval) when WebSocket unavailable"
  - "Granular updates: only changed data refreshed (no full reload)"
  - "TanStack Query cache invalidation drives UI updates"
```

## Diagram

```
┌──────────────┐         ┌──────────────┐
│  Client A    │         │  Client B    │
│  (mutates)   │         │  (reads)     │
└──────┬───────┘         └──────▲───────┘
       │                        │
       ▼                        │
┌──────────────┐    Realtime    │
│  Supabase    │───WebSocket───>│
│  PostgreSQL  │                │
└──────────────┘    (or poll)   │
                                │
                   ┌────────────┴──────┐
                   │  TanStack Query   │
                   │  invalidateQueries│
                   └───────────────────┘
```

## Components

| # | Component | Responsibility | Dependencies |
|---|-----------|----------------|--------------|
| 1 | RealtimeSubscriber | Subscribe to Supabase Realtime channels for ward-scoped tables | Supabase Realtime, AuthContext |
| 2 | PollingFallback | Poll changed data every 2-3s when WebSocket disconnected | TanStack Query |
| 3 | CacheInvalidator | Map Realtime events to TanStack Query invalidation keys | TanStack Query |
| 4 | ConnectionMonitor | Track WebSocket status; switch between Realtime and polling | Supabase Realtime |

## Contracts

### RealtimeSubscriber

```typescript
// hooks/useRealtimeSync.ts
function useRealtimeSync(options: {
  isOnline: boolean;
  setWebSocketConnected: (connected: boolean) => void;
}): void;

// Internal: subscribes to these tables
const SYNCED_TABLES = [
  'members',
  'ward_topics',
  'ward_collection_config',
  'sunday_exceptions',
  'speeches',
  'sunday_agendas',
  'meeting_actors',
] as const;
```

### CacheInvalidator

```typescript
// lib/sync.ts
const TABLE_TO_QUERY_KEY: Record<string, string[]> = {
  members: ['members'],
  ward_topics: ['topics', 'activeTopics'],
  ward_collection_config: ['collections', 'activeTopics'],
  sunday_exceptions: ['sundayTypes'],
  speeches: ['speeches'],
  sunday_agendas: ['agenda'],
  meeting_actors: ['actors'],
};

function handleRealtimeEvent(table: string, event: RealtimeEvent): void;
```

## Flows

### Realtime Sync Flow

```
1. On mount, RealtimeSubscriber opens Supabase channel for ward_id
2. Channel subscribes to INSERT/UPDATE/DELETE on all SYNCED_TABLES
3. On event received:
   a. CacheInvalidator maps table to TanStack Query keys
   b. Calls queryClient.invalidateQueries(keys)
   c. TanStack Query refetches only affected queries
4. UI updates within < 5 seconds
```

### Fallback Polling Flow

```
1. ConnectionMonitor detects WebSocket disconnect
2. Switches to polling mode: refetchInterval = 2500ms on active queries
3. On WebSocket reconnect:
   a. Immediately refetch all active queries
   b. Disable polling intervals
   c. Resume Realtime subscriptions
```


## Integration

### Where modules are connected (added by CR-46)

```
┌─────────────────────────────────────────────┐
│  src/app/_layout.tsx                         │
│                                             │
│  InnerLayout component:                     │
│    <AuthProvider>                            │
│      <SyncProvider>         ← providers/    │
│        <NavigationGuard>     SyncProvider.tsx│
│          ...                                │
│        </NavigationGuard>                   │
│      </SyncProvider>                        │
│    </AuthProvider>                           │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  src/providers/SyncProvider.tsx              │
│                                             │
│  const { isOnline, showOfflineBanner,       │
│          setWebSocketConnected }            │
│        = useConnection();                   │
│  useRealtimeSync({ isOnline,                │
│                    setWebSocketConnected }); │
│  useOfflineQueueProcessor(isOnline);        │
│  useRegisterPushToken(isOnline);            │
│  useNotificationHandler();                  │
│                                             │
│  return (                                   │
│    <>                                       │
│      <OfflineBanner visible={...} />        │
│      {children}                             │
│    </>                                      │
│  );                                         │
└─────────────────────────────────────────────┘
```

### Initialization flow

```
1. App mounts RootLayout → InnerLayout → AuthProvider → SyncProvider → NavigationGuard
2. SyncProvider calls useConnection() to start NetInfo monitoring
3. useRealtimeSync() subscribes to Supabase Realtime for ward-scoped tables
4. On WebSocket SUBSCRIBED → invalidates all queries, stops polling
5. On WebSocket CLOSED/ERROR → starts polling fallback (2.5s interval)
6. OfflineBanner renders above children when device goes offline
7. useOfflineQueueProcessor drains queued mutations on reconnect
```
