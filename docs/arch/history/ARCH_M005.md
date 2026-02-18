# ARCH_M005 - NotificationModule

```yaml
type: arch
version: 1
status: complete
module: NotificationModule
features: [F017]
```

## Overview

```yaml
goal: "Deliver push notifications for speech workflow events using a queue-based approach with Expo Push and Supabase Edge Functions"
principles:
  - "Queue-based: all notifications go through notification_queue table"
  - "Delayed + grouped: assignment notifications wait 5 min and group by sunday"
  - "Timezone-aware: weekly reminders use ward's IANA timezone"
  - "Observers excluded: only Bishopric and Secretary receive pushes"
```

## Diagram

```
┌──────────────┐     ┌──────────────────┐
│ Speech event │────>│ notification_queue│
│ (DB trigger) │     │ (status=pending)  │
└──────────────┘     └────────┬─────────┘
                              │
                    ┌─────────▼──────────┐
                    │ Edge Function (cron)│
                    │ every 1 minute      │
                    │ WHERE send_after<=  │
                    │        now()        │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │ Group by (ward_id,  │
                    │ sunday_date, type)  │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │ device_push_tokens  │
                    │ (lookup by role)    │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │ Expo Push API       │
                    │ (send to devices)   │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │ Mark status=sent    │
                    │ Remove invalid      │
                    │ tokens              │
                    └────────────────────┘
```

## Components

| # | Component | Responsibility | Dependencies |
|---|-----------|----------------|--------------|
| 1 | TokenRegistrar | Register/update Expo push token on login/app open | expo-notifications, Supabase |
| 2 | NotificationEnqueuer | DB triggers that INSERT into notification_queue on speech events | PostgreSQL triggers |
| 3 | NotificationProcessor | Edge Function (cron) that processes pending queue entries | Expo Push API, device_push_tokens |
| 4 | NotificationHandler | Client-side handler: navigate to Home on tap | expo-notifications |
| 5 | WeeklyReminderScheduler | DB function that creates weekly reminder entries every Sunday | PostgreSQL scheduled function |

## Contracts

### Client-side (TokenRegistrar + Handler)

```typescript
// hooks/useNotifications.ts
function useRegisterPushToken(): void;  // called on app mount
function useNotificationHandler(): void;  // handles tap -> navigate Home
```

### NotificationQueue (DB-level)

```typescript
// Types for notification_queue entries
interface NotificationQueueEntry {
  id: string;
  wardId: string;
  type: 'designation' | 'weekly_assignment' | 'weekly_confirmation' | 'speaker_confirmed' | 'speaker_withdrew';
  sundayDate: Date;
  speechPosition?: number;  // 1,2,3 for confirmed/withdrew
  speakerName?: string;
  targetRole: 'secretary' | 'bishopric' | 'secretary_and_bishopric';
  status: 'pending' | 'sent' | 'cancelled';
  sendAfter: Date;
}
```

### NotificationProcessor (Edge Function)

```yaml
process-notifications:
  trigger: "cron every 1 minute"
  steps:
    1: "SELECT * FROM notification_queue WHERE status='pending' AND send_after <= now()"
    2: "Group designation entries by (ward_id, sunday_date)"
    3: "For each group: lookup device_push_tokens by target_role + ward_id"
    4: "Build message text in ward language (pt-BR, en, es)"
    5: "Send via Expo Push API"
    6: "Mark status='sent'; remove invalid tokens on error"
```

## Data Model

```yaml
tables:
  device_push_tokens:
    columns: [id, user_id, ward_id, expo_push_token, created_at, updated_at]
    unique: [(user_id, expo_push_token)]
    rls: "user_id = auth.uid()"
    notes:
      - "Observers do NOT register tokens"
      - "Updated on every login/app open"
      - "Invalid tokens removed after send failure"

  notification_queue:
    columns: [id, ward_id, type, sunday_date, speech_position, speaker_name,
              target_role, status, send_after, created_at]
    rls: "INSERT via DB triggers only"
    notes:
      - "designation: send_after = created_at + 5 min"
      - "speaker_confirmed/withdrew: send_after = created_at (immediate)"
      - "weekly: send_after = next Sunday 18:00 in ward timezone"
```

## Flows

### 5 Notification Cases

```
Case 1 - Assignment (delayed, grouped):
  Trigger: INSERT/UPDATE on speeches (status changes to assigned_not_invited)
  Queue: type=designation, send_after=now+5min, target=secretary
  Processing: group by (ward_id, sunday_date) -> single push with all names

Case 2 - Weekly unassigned (Bishopric):
  Trigger: DB scheduled function every Sunday
  Condition: next sunday type="Discursos" AND any speech status=not_assigned
  Queue: type=weekly_assignment, send_after=Sunday 18:00 ward TZ, target=bishopric

Case 3 - Weekly unconfirmed (Secretary):
  Trigger: DB scheduled function every Sunday
  Condition: next sunday type="Discursos" AND any speech status!=assigned_confirmed
  Queue: type=weekly_confirmation, send_after=Sunday 18:00 ward TZ, target=secretary

Case 4 - Speaker confirmed (immediate):
  Trigger: UPDATE on speeches (status -> assigned_confirmed)
  Queue: type=speaker_confirmed, send_after=now, target=secretary_and_bishopric

Case 5 - Speaker gave up (immediate):
  Trigger: UPDATE on speeches (status -> gave_up)
  Queue: type=speaker_withdrew, send_after=now, target=bishopric
```

### Cancellation Logic

```
If speech returns to not_assigned before send_after:
  UPDATE notification_queue SET status='cancelled'
  WHERE ward_id=X AND sunday_date=Y AND type='designation' AND status='pending'
```

## ADRs

```yaml
adrs:
  - id: ADR-007
    title: "Queue-based push notifications via DB triggers"
    context: "Need delayed/grouped notifications and timezone-aware scheduling"
    decision: "Use notification_queue table with DB triggers for enqueue and cron Edge Function for dequeue/send"
    consequences:
      - "Reliable: survives Edge Function restarts"
      - "Grouping/delay logic is simple SQL"
      - "Requires cron Edge Function (1min interval)"
```
