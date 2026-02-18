# ARCH_M002 - WardDataModule

```yaml
type: arch
version: 1
status: complete
module: WardDataModule
features: [F002, F003, F004, F005, F006, F007, F013, F014, F015, F019]
```

## Overview

```yaml
goal: "Manage all ward-scoped master data: members, topics, collections, sunday types, actors, hymns, prayers, and activity log"
principles:
  - "All data scoped by ward_id with RLS enforcement"
  - "Snapshot pattern for denormalized references in speeches/agendas"
  - "Auto-save on blur (no explicit Save buttons)"
  - "Swipe-to-reveal for edit/delete actions"
```

## Diagram

```
┌──────────────────────────────────────────────────┐
│                  Settings Tab                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │ Members  │ │  Topics  │ │  Agenda  │  ...     │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘         │
└───────┼────────────┼────────────┼────────────────┘
        │            │            │
        ▼            ▼            ▼
┌──────────────────────────────────────────────────┐
│          TanStack Query (cache + mutations)       │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│         Supabase PostgREST (RLS enforced)         │
│  members │ ward_topics │ general_collections      │
│  sunday_exceptions │ meeting_actors │ hymns       │
│  ward_collection_config │ activity_log            │
└──────────────────────────────────────────────────┘
```

## Components

| # | Component | Responsibility | Dependencies |
|---|-----------|----------------|--------------|
| 1 | MemberManagementScreen | CRUD members with search, swipe-to-reveal, auto-save | TanStack Query, Supabase |
| 2 | MemberImportExport | CSV import (overwrite) and export for members | TanStack Query, Supabase |
| 3 | TopicManagementScreen | CRUD ward topics; activate/deactivate general collections | TanStack Query, Supabase |
| 4 | SundayTypeManager | Auto-assign sunday types; dropdown override in card | TanStack Query, Supabase |
| 5 | ActorSelectorDialog | Inline actor management via selector in agenda cards (no dedicated screen) | TanStack Query, Supabase |
| 6 | HymnsCatalog | Read-only hymn lookup; admin script import | Supabase (global table) |
| 7 | PrayerSelector | Select member or type custom name for prayers | Members query |
| 8 | ActivityLogScreen | Read-only paginated log with search | TanStack Query, Supabase |
| 9 | WardSettingsScreen | Edit ward language, timezone, WhatsApp template | TanStack Query, Supabase |

## Contracts

### MemberService (via TanStack Query hooks)

```typescript
// hooks/useMembers.ts
function useMembers(search?: string): UseQueryResult<Member[]>;
function useCreateMember(): UseMutationResult<Member, Error, CreateMemberInput>;
function useUpdateMember(): UseMutationResult<Member, Error, UpdateMemberInput>;
function useDeleteMember(): UseMutationResult<void, Error, string>;
function useImportMembers(): UseMutationResult<ImportResult, Error, string>;  // CSV content string (via expo-document-picker + expo-file-system)
function useExportMembers(): UseMutationResult<void, Error, void>;  // Generates CSV file via expo-file-system + expo-sharing
```

### TopicService

```typescript
// hooks/useTopics.ts
function useWardTopics(search?: string): UseQueryResult<WardTopic[]>;
function useActiveTopics(): UseQueryResult<TopicWithCollection[]>;  // ward + active general
function useCreateWardTopic(): UseMutationResult<WardTopic, Error, CreateTopicInput>;
function useToggleCollection(): UseMutationResult<void, Error, {collectionId, active}>;
```

### SundayTypeService

```typescript
// hooks/useSundayTypes.ts
function useSundayExceptions(dateRange: DateRange): UseQueryResult<SundayException[]>;
function useAutoAssignSundayTypes(): UseMutationResult<void, Error, Date[]>;
function useSetSundayType(): UseMutationResult<void, Error, {date, reason}>;
```

### ActorService

```typescript
// hooks/useActors.ts
function useActors(roleFilter?: ActorRole): UseQueryResult<MeetingActor[]>;
function useCreateActor(): UseMutationResult<MeetingActor, Error, CreateActorInput>;
function useUpdateActor(): UseMutationResult<MeetingActor, Error, UpdateActorInput>;
function useDeleteActor(): UseMutationResult<void, Error, string>;
```

### ActivityLogService

```typescript
// hooks/useActivityLog.ts
function useActivityLog(search?: string): UseInfiniteQueryResult<ActivityLogEntry[]>;
```

## Data Model

```yaml
tables:
  wards:
    columns: [id, name, stake_name, language, timezone, whatsapp_template, created_at, updated_at]
    unique: [(stake_name, name)]
    rls: "id = auth.jwt().app_metadata.ward_id"

  members:
    columns: [id, ward_id, full_name, country_code, phone, created_at, updated_at]
    unique: [(ward_id, country_code, phone)]
    rls: "ward_id = auth.jwt().app_metadata.ward_id"

  ward_topics:
    columns: [id, ward_id, title, link, created_at, updated_at]
    rls: "ward_id = auth.jwt().app_metadata.ward_id"

  general_collections:
    columns: [id, name, language]
    rls: "SELECT for all authenticated users"  # global

  general_topics:
    columns: [id, collection_id, title, link]
    rls: "SELECT for all authenticated users"  # global

  ward_collection_config:
    columns: [id, ward_id, collection_id, active]
    rls: "ward_id = auth.jwt().app_metadata.ward_id"

  sunday_exceptions:
    columns: [id, ward_id, date, reason, custom_reason]
    unique: [(ward_id, date)]
    check: "date is a Sunday; reason IN ('speeches','testimony_meeting','general_conference','stake_conference','ward_conference','primary_presentation','other')"
    rls: "ward_id = auth.jwt().app_metadata.ward_id"
    notes:
      - "'speeches' is the default reason and is persisted for all regular sundays"
      - "'custom_reason' is nullable, only used when reason='other'"

  meeting_actors:
    columns: [id, ward_id, name, can_preside, can_conduct, can_recognize, can_music, created_at, updated_at]
    rls: "ward_id = auth.jwt().app_metadata.ward_id"
    notes: "Actor roles are independent; can_conduct does NOT imply can_preside (per CR-71)"

  hymns:
    columns: [id, language, number, title, is_sacramental]
    unique: [(language, number)]
    rls: "SELECT for all authenticated users"  # global

  activity_log:
    columns: [id, ward_id, user_id, user_email, action_type, description, created_at]
    rls: "ward_id = auth.jwt().app_metadata.ward_id; INSERT only"
    retention: "2 years (cron job)"
```

## Flows

### Member CSV Import Flow

```
1. User selects CSV file
2. Parse CSV: extract full_name, country_code, phone per row
3. Validate all rows (non-empty name, valid phone)
4. Supabase transaction: DELETE all ward members, INSERT new list
5. Invalidate TanStack Query cache for members
6. Log activity: member:import
```

### Auto-assign Sunday Types Flow

```
1. Load sunday list for date range (tab open or scroll)
2. For each sunday without entry in sunday_exceptions:
   a. Check month rules (1st Sunday = testimony, April/October = conference, etc.)
   b. Default: "speeches" (Discursos)
3. Batch INSERT all missing entries (including "speeches" as a regular reason)
4. All sunday types are persisted in the database, including the default "speeches"
5. User can override any type via dropdown in the sunday card
```

## ADRs

```yaml
adrs:
  - id: ADR-003
    title: "Snapshot pattern for denormalized speaker/topic data in speeches"
    context: "Deleting a member or topic must not break historical speech records"
    decision: "Store speaker_name, speaker_phone, topic_title as text snapshots alongside FK"
    consequences:
      - "Historical data preserved after deletion"
      - "Name edits do NOT propagate to existing speeches (by design)"

  - id: ADR-004
    title: "CSV import overwrites entire member list"
    context: "Merge logic adds complexity and edge cases; users expect CSV to be source of truth"
    decision: "DELETE all + INSERT new within transaction"
    consequences:
      - "Simple and predictable"
      - "Speech snapshots preserved (snapshot pattern)"
```
