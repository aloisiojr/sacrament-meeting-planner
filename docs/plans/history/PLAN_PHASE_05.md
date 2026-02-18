# PLAN_PHASE_05 - Infrastructure

```yaml
type: plan
version: 1
phase: 5
title: "Infrastructure (Real-time Sync, Push Notifications, Offline Support)"

goal: "Implement the infrastructure layer: real-time synchronization via Supabase Realtime with polling fallback, push notification system with queue-based delivery, and offline support with mutation queue and optimistic UI."

strategy:
  order: "Connection monitor -> Realtime sync -> Polling fallback -> Push token registration -> Notification queue (DB triggers) -> Notification processor (Edge Function cron) -> Offline queue -> Offline guard"
  commit_strategy: "1 commit per step, conventional commits"
  test_strategy: "Unit tests for sync logic; integration tests for notification flow; mock tests for offline queue"
```

## Steps

```yaml
steps:
  - id: STEP-05-01
    description: "Create ConnectionMonitor (useConnection hook). Monitor network status via React Native NetInfo. Show/hide 'Offline' banner. Track WebSocket connection status for Supabase Realtime."
    files:
      - "src/hooks/useConnection.ts"
      - "src/components/OfflineBanner.tsx"
    dependencies: ["STEP-01-01"]
    parallelizable_with: []
    done_when:
      - "useConnection() returns { isOnline, showOfflineBanner }"
      - "Detects network status changes via NetInfo"
      - "OfflineBanner component: shown when offline, hidden when online"
      - "Banner text translated (i18n)"
      - "Tracks WebSocket status for sync module"
    tests:
      - type: unit
        description: "Test useConnection: online/offline transitions, banner visibility"
    covers:
      acceptance_criteria: []
      edge_cases: []
    risks:
      - risk: "NetInfo may report false positives on some networks"
        mitigation: "Use actual request test as fallback confirmation"

  - id: STEP-05-02
    description: "Create RealtimeSubscriber (useRealtimeSync hook). Subscribe to Supabase Realtime channels for all synced tables (members, ward_topics, ward_collection_config, sunday_exceptions, speeches, sunday_agendas, meeting_actors). Map events to TanStack Query cache invalidation."
    files:
      - "src/hooks/useRealtimeSync.ts"
      - "src/lib/sync.ts"
    dependencies: ["STEP-05-01", "STEP-01-04"]
    parallelizable_with: []
    done_when:
      - "Subscribes to Supabase Realtime channel filtered by ward_id"
      - "Listens for INSERT/UPDATE/DELETE on 7 synced tables"
      - "On event: maps table to TanStack Query keys (sync.ts TABLE_TO_QUERY_KEY)"
      - "Calls queryClient.invalidateQueries() for affected keys"
      - "Granular updates: only changed data refreshed"
      - "< 5 second sync time"
      - "Cleanup on unmount"
    tests:
      - type: unit
        description: "Test realtime sync: subscription setup, event handling, cache invalidation mapping"
    covers:
      acceptance_criteria: ["AC-030"]
      edge_cases: []
    risks:
      - risk: "Supabase Realtime channel limits"
        mitigation: "Use single channel with multiple listeners; monitor connection count"

  - id: STEP-05-03
    description: "Create polling fallback for when WebSocket is unavailable. Refetch active queries every 2.5s during WebSocket disconnect. On reconnect: immediately refetch all, disable polling, resume Realtime."
    files:
      - "src/hooks/useRealtimeSync.ts"
    dependencies: ["STEP-05-02"]
    parallelizable_with: []
    done_when:
      - "Detects WebSocket disconnect via ConnectionMonitor"
      - "Switches to polling: refetchInterval = 2500ms on active queries"
      - "On WebSocket reconnect: immediate refetch of all active queries"
      - "Disables polling intervals after reconnect"
      - "Resumes Realtime subscriptions"
      - "Transition is seamless to user"
    tests:
      - type: unit
        description: "Test polling fallback: activation on disconnect, polling interval, reconnection refetch"
    covers:
      acceptance_criteria: ["AC-030"]
      edge_cases: []
    risks:
      - risk: "Excessive API calls during polling"
        mitigation: "Limit to active queries; use reasonable interval (2.5s)"

  - id: STEP-05-04
    description: "Create push notification token registration (useNotifications hook). Register Expo push token on login/app open. Store in device_push_tokens table. Observers do NOT register. Handle multiple devices per user. Register on next opening if offline."
    files:
      - "src/hooks/useNotifications.ts"
    dependencies: ["STEP-01-04", "STEP-05-01"]
    parallelizable_with: ["STEP-05-02"]
    done_when:
      - "useRegisterPushToken() called on app mount"
      - "Requests notification permissions"
      - "Gets Expo push token"
      - "Stores token in device_push_tokens (upsert by user_id + token)"
      - "Observer: does NOT register (check role)"
      - "Multiple devices: separate entries per token"
      - "Offline: deferred to next app opening with connection"
      - "Token updated on every login/app open"
    tests:
      - type: unit
        description: "Test token registration: observer exclusion, upsert, offline deferral"
    covers:
      acceptance_criteria: ["AC-PN-009", "AC-PN-010"]
      edge_cases: ["EC-PN-005", "EC-PN-006"]
    risks:
      - risk: "Token expiration/rotation by Expo"
        mitigation: "Re-register on every app open; remove invalid tokens on send failure"

  - id: STEP-05-05
    description: "Create notification queue DB triggers. INSERT into notification_queue on speech events: (1) designation (assign speaker, send_after=now+5min), (4) speaker_confirmed (immediate), (5) speaker_withdrew (immediate). Cancellation trigger: if speech returns to not_assigned before send_after, mark notification cancelled."
    files:
      - "supabase/migrations/003_notification_triggers.sql"
    dependencies: ["STEP-01-02"]
    parallelizable_with: ["STEP-05-04"]
    done_when:
      - "DB trigger on speeches INSERT/UPDATE"
      - "Status -> assigned_not_invited: INSERT designation (send_after = now + 5min, target = secretary)"
      - "Status -> assigned_confirmed: INSERT speaker_confirmed (send_after = now, target = secretary_and_bishopric)"
      - "Status -> gave_up: INSERT speaker_withdrew (send_after = now, target = bishopric)"
      - "Status -> not_assigned: UPDATE notification_queue SET status=cancelled WHERE pending designation for same ward+sunday"
      - "Separate entries for different sundays"
    tests:
      - type: integration
        description: "Test triggers: designation queue, immediate notifications, cancellation on unassign"
    covers:
      acceptance_criteria: ["AC-PN-001", "AC-PN-002", "AC-PN-003", "AC-PN-007", "AC-PN-008"]
      edge_cases: ["EC-PN-003"]
    risks:
      - risk: "Trigger complexity with multiple status changes"
        mitigation: "Test all status transition paths; verify queue entries"

  - id: STEP-05-06
    description: "Create weekly reminder DB scheduled function and notification processor Edge Function. Weekly: create queue entries every Sunday for unassigned (Bishopric) and unconfirmed (Secretary) at 18:00 ward timezone. Processor: cron every 1 minute, process pending where send_after <= now, group designations by sunday, send via Expo Push API, handle invalid tokens."
    files:
      - "supabase/migrations/004_weekly_reminder_function.sql"
      - "supabase/functions/process-notifications/index.ts"
    dependencies: ["STEP-05-05", "STEP-05-04"]
    parallelizable_with: []
    done_when:
      - "Weekly function: runs every Sunday, checks next sunday type='Discursos'"
      - "Case 2: any not_assigned speech -> queue entry for bishopric at 18:00 ward TZ"
      - "Case 3: any not confirmed speech -> queue entry for secretary at 18:00 ward TZ"
      - "Suppressed if next sunday has exception (type != 'Discursos')"
      - "Processor Edge Function: cron every 1 minute"
      - "SELECT pending WHERE send_after <= now()"
      - "Group designation entries by (ward_id, sunday_date)"
      - "Build message text in ward language"
      - "Send via Expo Push API to target role devices"
      - "Mark status = sent"
      - "Remove invalid tokens on error"
    tests:
      - type: integration
        description: "Test weekly reminders: conditions, timezone, suppression; processor: grouping, sending, token cleanup"
    covers:
      acceptance_criteria: ["AC-PN-004", "AC-PN-005", "AC-PN-006", "AC-PN-012-014"]
      edge_cases: ["EC-PN-001", "EC-PN-002", "EC-PN-004", "EC-PN-007"]
    risks:
      - risk: "Timezone calculation for 18:00 in ward TZ"
        mitigation: "Use PostgreSQL AT TIME ZONE; test with multiple timezones"

  - id: STEP-05-07
    description: "Create client-side notification handler. Navigate to Home tab on notification tap. Handle notification text in ward language (pt-BR, en, es) for all 5 cases."
    files:
      - "src/hooks/useNotifications.ts"
    dependencies: ["STEP-05-04"]
    parallelizable_with: ["STEP-05-06"]
    done_when:
      - "useNotificationHandler() registered on app mount"
      - "On notification tap: navigates to Home tab"
      - "Notification text matches ward language"
      - "All 5 notification cases display correct text"
      - "Ordinals: '1o'/'2o'/'3o' (pt), '1st'/'2nd'/'3rd' (en), '1er'/'2do'/'3er' (es)"
    tests:
      - type: unit
        description: "Test notification handler: navigation on tap, text formatting per language"
    covers:
      acceptance_criteria: ["AC-PN-011", "AC-PN-012-014"]
      edge_cases: []
    risks:
      - risk: "Notification handler not triggered when app is killed"
        mitigation: "Use expo-notifications background handler"

  - id: STEP-05-08
    description: "Create OfflineManager: mutation queue (AsyncStorage, max 100 entries), optimistic UI updates (TanStack Query cache), queue processor (FIFO on reconnect, last-write-wins), and offline guard (block Edge Function operations with 'Requires connection' error)."
    files:
      - "src/lib/offlineQueue.ts"
      - "src/lib/offlineGuard.ts"
    dependencies: ["STEP-05-01", "STEP-01-04"]
    parallelizable_with: ["STEP-05-02"]
    done_when:
      - "MutationQueue: enqueue/dequeue mutations in AsyncStorage"
      - "Max 100 entries in queue; reject with warning at limit"
      - "OptimisticUpdater: apply mutations to TanStack cache immediately"
      - "QueueProcessor: on reconnect, replay FIFO"
      - "Conflict resolution: last-write-wins via updated_at comparison"
      - "Retry: up to 3 times, then discard with user notification"
      - "OfflineGuard: ONLINE_ONLY_OPERATIONS list (5 Edge Functions)"
      - "requiresConnection() returns boolean"
      - "throwIfOffline() shows 'Requires connection' error toast (i18n)"
      - "Blocked operations: register-first-user, register-invited-user, create-invitation, update-user-role, delete-user"
    tests:
      - type: unit
        description: "Test offline: queue CRUD, max limit, FIFO replay, conflict resolution, guard blocking"
    covers:
      acceptance_criteria: []
      edge_cases: ["EC-014", "EC-CR003-6", "EC-REG-007", "EC-REG-008", "EC-PN-005", "EC-HIST-003"]
    risks:
      - risk: "Queue corruption if app crashes during write"
        mitigation: "Use atomic AsyncStorage operations; validate queue on read"
```

## Validation

```yaml
validation:
  - ac_id: AC-030
    how_to_verify: "Change in any tab reflected in another within 5 seconds"
    covered_by_steps: ["STEP-05-02", "STEP-05-03"]
  - ac_id: AC-PN-001
    how_to_verify: "5 min after assignment, push sent to Secretary"
    covered_by_steps: ["STEP-05-05"]
  - ac_id: AC-PN-002
    how_to_verify: "Multiple assignments for same sunday grouped in single push"
    covered_by_steps: ["STEP-05-05"]
  - ac_id: AC-PN-003
    how_to_verify: "Different sundays -> separate pushes"
    covered_by_steps: ["STEP-05-05"]
  - ac_id: AC-PN-004
    how_to_verify: "Sunday 18:00: push to Bishopric for unassigned"
    covered_by_steps: ["STEP-05-06"]
  - ac_id: AC-PN-005
    how_to_verify: "Sunday 18:00: push to Secretary for unconfirmed"
    covered_by_steps: ["STEP-05-06"]
  - ac_id: AC-PN-006
    how_to_verify: "Exception sunday: no weekly push"
    covered_by_steps: ["STEP-05-06"]
  - ac_id: AC-PN-007
    how_to_verify: "Confirmed: immediate push to Secretary + Bishopric"
    covered_by_steps: ["STEP-05-05"]
  - ac_id: AC-PN-008
    how_to_verify: "Gave up: immediate push to Bishopric"
    covered_by_steps: ["STEP-05-05"]
  - ac_id: AC-PN-009
    how_to_verify: "Token registered on login/app open"
    covered_by_steps: ["STEP-05-04"]
  - ac_id: AC-PN-010
    how_to_verify: "Observer: token NOT registered"
    covered_by_steps: ["STEP-05-04"]
  - ac_id: AC-PN-011
    how_to_verify: "Tap notification -> Home tab"
    covered_by_steps: ["STEP-05-07"]
  - ac_id: AC-PN-012-014
    how_to_verify: "Push text in ward language"
    covered_by_steps: ["STEP-05-06", "STEP-05-07"]
```
