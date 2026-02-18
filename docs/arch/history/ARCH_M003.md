# ARCH_M003 - SpeechModule

```yaml
type: arch
version: 1
status: complete
module: SpeechModule
features: [F008, F010, F024]
```

## Overview

```yaml
goal: "Manage the speech lifecycle (assignment, status tracking, removal) and WhatsApp invitation integration"
principles:
  - "Each sunday has exactly 3 speech slots (1st, 2nd, 3rd)"
  - "Lazy creation: speech records created when card is expanded"
  - "Snapshot pattern: speaker name/phone and topic stored as text"
  - "Status lifecycle: not_assigned -> assigned_not_invited -> assigned_invited -> assigned_confirmed | gave_up"
```

## Diagram

```
┌─────────────────────────────────────────────────┐
│              Speeches Tab (infinite scroll)       │
│  ┌──────────────────────────────────────────┐    │
│  │ SundayCard (DateBlock + 3 LEDs)          │    │
│  │  ├─ SpeechSlot (1st) [speaker, topic]    │    │
│  │  ├─ SpeechSlot (2nd) [speaker, topic]    │    │
│  │  └─ SpeechSlot (3rd) [speaker, topic]    │    │
│  └──────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────┐    │
│  │ SundayCard ...                           │    │
│  └──────────────────────────────────────────┘    │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│         TanStack Query + Realtime subscriptions   │
└──────────────────┬───────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
┌──────────────┐     ┌──────────────┐
│  speeches    │     │  WhatsApp    │
│  (PostgREST) │     │  (wa.me URL) │
└──────────────┘     └──────────────┘
```

## Components

| # | Component | Responsibility | Dependencies |
|---|-----------|----------------|--------------|
| 1 | SpeechesTab | Infinite scroll list of sundays (12mo past + 12mo future, +6 on scroll) | TanStack Query |
| 2 | SundayCard | Expandable card with DateBlock header, 3 LED indicators, sunday type dropdown | SpeechSlot, SundayTypeManager |
| 3 | SpeechSlot | Single speech position: speaker selector, topic selector, status LED, remove button | MemberSelector, TopicSelector |
| 4 | MemberSelectorModal | Modal: alphabetical member list with search | useMembers hook |
| 5 | TopicSelectorModal | Modal: topics from active collections, format "Collection : Title" | useActiveTopics hook |
| 6 | StatusChangeModal | Modal: status options based on current state | useSpeechMutation |
| 7 | WhatsAppLauncher | Generate wa.me link with template; open via Linking | Ward settings (template) |
| 8 | LEDIndicator | 3D animated LED showing speech status color | react-native-reanimated |

## Contracts

### SpeechService

```typescript
// hooks/useSpeeches.ts
function useSpeeches(dateRange: DateRange): UseQueryResult<SpeechBySunday[]>;
function useLazyCreateSpeeches(): UseMutationResult<Speech[], Error, Date>;
function useAssignSpeaker(): UseMutationResult<Speech, Error, {
  speechId: string;
  memberId: string;
  speakerName: string;
  speakerPhone: string;
}>;
function useAssignTopic(): UseMutationResult<Speech, Error, {
  speechId: string;
  topicTitle: string;
  topicLink?: string;
  topicCollection: string;
}>;
function useChangeStatus(): UseMutationResult<Speech, Error, {
  speechId: string;
  status: SpeechStatus;
}>;
function useRemoveAssignment(): UseMutationResult<Speech, Error, string>;
```

### WhatsAppService

```typescript
// lib/whatsapp.ts
function buildWhatsAppUrl(
  phone: string,
  countryCode: string,
  template: string,
  variables: { speakerName: string; date: string; topic: string; position: string }
): string;

function openWhatsApp(url: string): Promise<void>;
```

### InfiniteScrollManager

```typescript
// hooks/useSundayList.ts
function useSundayList(): {
  sundays: SundayDate[];
  loadMoreFuture(): void;
  loadMorePast(): void;
  hasMoreFuture: boolean;
  hasMorePast: boolean;
};
```

## Data Model

```yaml
tables:
  speeches:
    columns:
      - id: uuid PK
      - ward_id: uuid FK->wards
      - sunday_date: date
      - position: smallint (1,2,3)
      - member_id: uuid FK->members (nullable)
      - speaker_name: text (snapshot, nullable)
      - speaker_phone: text (snapshot, nullable)
      - topic_title: text (snapshot, nullable)
      - topic_link: text (snapshot, nullable)
      - topic_collection: text (snapshot, nullable)
      - status: text (not_assigned | assigned_not_invited | assigned_invited | assigned_confirmed | gave_up)
      - created_at, updated_at: timestamptz
    unique: [(ward_id, sunday_date, position)]
    rls: "ward_id = auth.jwt().app_metadata.ward_id"
```

## Flows

### Speech Assignment Flow

```
1. Bishopric expands SundayCard
2. Lazy creation: 3 speech records inserted if not exist (status: not_assigned)
3. Bishopric clicks Speaker field -> MemberSelectorModal
4. Selects member -> mutation: set member_id, snapshot speaker_name/phone, status = assigned_not_invited
5. Bishopric clicks Topic field -> TopicSelectorModal
6. Selects topic -> mutation: set topic_title, topic_link, topic_collection (snapshots)
7. Notification enqueued (Case 1: designation, send_after = now + 5min)
8. Realtime pushes update to all tabs
```

### WhatsApp Invitation Flow

```
1. Secretary sees speech with status assigned_not_invited in Home > Invite Management
2. Clicks invite button
3. App builds wa.me URL using ward's whatsapp_template + speaker phone
4. Opens WhatsApp via Linking.openURL
5. Status changes to assigned_invited
```

### Status Lifecycle

```
not_assigned
  └─[assign speaker]─> assigned_not_invited
                          └─[send WhatsApp]─> assigned_invited
                                                ├─[confirm]─> assigned_confirmed
                                                └─[give up]─> gave_up

At any point, Bishopric can [remove assignment] -> not_assigned (resets all)
```

### Status Change Permissions

```yaml
roles:
  bishopric:
    can_change_status: true
    can_change_to_invited: true  # Can set status to assigned_invited freely
    sees_whatsapp_invite_section_on_home: false  # Does NOT see invitation management on Home
  secretary:
    can_change_status: true
    sees_whatsapp_invite_section_on_home: true  # Sees and manages WhatsApp invitations on Home
  observer:
    can_change_status: false
```

## ADRs

```yaml
adrs:
  - id: ADR-005
    title: "Lazy creation of speech records"
    context: "Pre-creating speeches for all visible sundays would create thousands of unused records"
    decision: "Create 3 speech records when card is first expanded"
    consequences:
      - "No orphan records for unexpanded sundays"
      - "First expand has a small write latency"
```
