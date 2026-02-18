# ARCH_INDEX - Gerenciador da Reuniao Sacramental

## Architecture Summary

```yaml
type: arch_summary
status: complete
components_count: 8
main_components:
  - "AuthModule"
  - "WardDataModule"
  - "SpeechModule"
  - "AgendaModule"
  - "NotificationModule"
  - "SyncEngine"
  - "OfflineManager"
  - "UIShell"
tech_stack:
  - "React Native + Expo SDK 54 (TypeScript)"
  - "Expo Router (file-based routing)"
  - "TanStack Query (server state)"
  - "React Context (theme, auth, locale)"
  - "Supabase (Auth, PostgREST, Realtime, Edge Functions)"
  - "PostgreSQL with RLS"
  - "react-i18next (pt-BR, en, es)"
  - "Vitest (unit + integration tests)"
  - "AsyncStorage (offline queue)"
  - "Expo Push Notifications"
  - "react-native-gesture-handler + react-native-reanimated (gestures)"
  - "expo-linking (deep links)"
estimated_iterations: 4
```

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     React Native + Expo SDK 54                   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  UIShell (M008)                                          │   │
│  │  Expo Router: (auth)/ | (tabs)/Home,Agenda,Speeches,Set  │   │
│  │  ThemeContext | I18nProvider | ExitConfirmation            │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│                         │                                        │
│  ┌──────────┐  ┌────────┴───────┐  ┌────────────┐  ┌────────┐  │
│  │ Auth     │  │  SpeechModule  │  │ Agenda     │  │ Ward   │  │
│  │ Module   │  │  (M003)        │  │ Module     │  │ Data   │  │
│  │ (M001)   │  │  Speech CRUD   │  │ (M004)     │  │ Module │  │
│  │ Login    │  │  Status cycle  │  │ Agenda form│  │ (M002) │  │
│  │ Register │  │  WhatsApp      │  │ Presentat. │  │ Members│  │
│  │ Users    │  │  LEDs          │  │ Accordion  │  │ Topics │  │
│  │ Perms    │  └────────────────┘  └────────────┘  │ Actors │  │
│  └──────────┘                                       │ Hymns  │  │
│                                                     │ Log    │  │
│  ┌───────────────────┐  ┌──────────────────────┐   └────────┘  │
│  │ SyncEngine (M006) │  │ OfflineManager (M007)│               │
│  │ Realtime WebSocket│  │ MutationQueue        │               │
│  │ Polling fallback  │  │ Optimistic UI        │               │
│  │ Cache invalidation│  │ Connection detect     │               │
│  └───────────────────┘  └──────────────────────┘               │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  TanStack Query (server state cache + mutations)         │   │
│  └──────────────────────────┬───────────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Supabase                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │   Auth   │  │ PostgREST│  │ Realtime │  │ Edge Functions │  │
│  │  (JWT)   │  │  (CRUD)  │  │  (WS)    │  │ 6 user mgmt   │  │
│  └──────────┘  └──────────┘  └──────────┘  │ 1 push cron   │  │
│                                             └────────────────┘  │
│  ┌──────────────────────────────────────┐                       │
│  │  PostgreSQL (RLS on ward_id)          │                       │
│  │  wards | members | speeches | agendas │                       │
│  │  topics | actors | hymns | notif_queue│                       │
│  │  invitations | activity_log | tokens  │                       │
│  └──────────────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

## Architecture Modules

| ID | Module | SPEC Features | Status | Doc |
|----|--------|---------------|--------|-----|
| M001 | AuthModule | F001, F018, F023 | Complete | [ARCH_M001](ARCH_M001.md) |
| M002 | WardDataModule | F002, F003, F004, F005, F006, F007, F013, F014, F015, F019 | Complete | [ARCH_M002](ARCH_M002.md) |
| M003 | SpeechModule | F008, F010, F024 | Complete | [ARCH_M003](ARCH_M003.md) |
| M004 | AgendaModule | F012, F016 | Complete | [ARCH_M004](ARCH_M004.md) |
| M005 | NotificationModule | F017 | Complete | [ARCH_M005](ARCH_M005.md) |
| M006 | SyncEngine | F011 | Complete | [ARCH_M006](ARCH_M006.md) |
| M007 | OfflineManager | F022 | Complete | [ARCH_M007](ARCH_M007.md) |
| M008 | UIShell | F009, F020, F021 | Complete | [ARCH_M008](ARCH_M008.md) |

## Change Request Architectures

| ID | Scope | CRs | Status | Doc |
|----|-------|-----|--------|-----|
| CR001 | Batch 1 Bug Fixes | CR-01 to CR-10 | Complete | [ARCH_CR001](ARCH_CR001.md) |
| CR002 | Batch 2 Bug Fixes & Actors Redesign | CR-11 to CR-30 | Complete | [ARCH_CR002](ARCH_CR002.md) |
| CR003 | Batch 3 Spec Fixes, CSV, About, Logout | CR-31 to CR-43 | Complete | [ARCH_CR003](ARCH_CR003.md) |
| CR4_F005 | CSV & Members Screen Fixes | CR-54, CR-55, CR-66 | Complete | [ARCH_CR4_F005](ARCH_CR4_F005.md) |
| CR4_F007 | Auth Fixes: Users Screen + Forgot Password | CR-64, CR-67 | Complete | [ARCH_CR4_F007](ARCH_CR4_F007.md) |
| CR4_F008 | Agenda & Actors Enhancements | CR-71, CR-72, CR-73, CR-74, CR-75 | Complete | [ARCH_CR4_F008](ARCH_CR4_F008.md) |
| CR4_F003 | Infrastructure Integration (Sync, Offline, Notifications) | CR-52, CR-53 | Complete | [ARCH_CR4_F003](ARCH_CR4_F003.md) |
| CR4_F009 | Import Hymns CLI Script | CR-51 | Complete | [ARCH_CR4_F009](ARCH_CR4_F009.md) |
| CR76 | Fix Users Screen Edge Function Error (Regression CR-64) | CR-76 | Complete | [ARCH_CR76](ARCH_CR76.md) |
| BUG401 | Fix Systemic HTTP 401 on All Authenticated Edge Functions | BUG-401 | Complete | [ARCH_BUG401](ARCH_BUG401.md) |
| CR5 | Batch 5: Actor Icons, CSV Fixes, Members UX, Users Name | CR-70, CR-77, CR-78, CR-79, CR-80 | Complete | [ARCH_CR5](ARCH_CR5.md) |

## Module Dependencies

```
M008 (UIShell) ──> M001 (Auth)      # session, role, permissions
M008 (UIShell) ──> M003 (Speech)    # Home tab sections
M008 (UIShell) ──> M004 (Agenda)    # Presentation Mode button
M003 (Speech)  ──> M002 (WardData)  # members, topics, sunday types
M004 (Agenda)  ──> M002 (WardData)  # actors, hymns, members
M004 (Agenda)  ──> M003 (Speech)    # speech assignment from Agenda
M005 (Notif)   ──> M003 (Speech)    # speech events trigger notifications
M005 (Notif)   ──> M001 (Auth)      # device tokens, role targeting
M006 (Sync)    ──> M002 (WardData)  # cache invalidation for all tables
M007 (Offline) ──> M006 (Sync)      # reconnect triggers queue processing
```

## Cross-cutting Concerns

| Concern | Approach |
|---------|----------|
| Multi-tenancy | PostgreSQL RLS on ward_id; user's ward_id in auth.users app_metadata |
| i18n | react-i18next with locale files (pt-BR, en, es); general_collections per language |
| Permissions | Central permissions map in lib/permissions.ts; role from app_metadata |
| Theme | React Context with system detection + manual toggle (dark/light) |
| Error handling | Per-module error boundaries; toast notifications for user-facing errors |
| Gestures | react-native-gesture-handler + react-native-reanimated for swipe-to-reveal |
| Deep links | expo-linking for wardmanager://invite/{token} |

## Project Structure

```
src/
  app/                          # Expo Router pages
    _layout.tsx                 # Root layout (providers + SyncProvider)
    (auth)/                     # Auth screens
      login.tsx
      register.tsx
      invite/[token].tsx
      forgot-password.tsx
    (tabs)/                     # Tab navigator
      _layout.tsx
      index.tsx                 # Home
      agenda.tsx
      speeches.tsx
      settings/
        _layout.tsx
        index.tsx
        members.tsx
        topics.tsx
        users.tsx
        history.tsx
        whatsapp.tsx
        theme.tsx
        about.tsx
        timezone.tsx
    presentation.tsx            # Presentation Mode (modal)

  providers/                    # React Providers
    SyncProvider.tsx             # Sync, offline, notifications orchestrator

  components/                   # Shared UI components
    SundayCard.tsx
    SpeechSlot.tsx
    LEDIndicator.tsx
    DateBlock.tsx
    AccordionCard.tsx
    MemberSelectorModal.tsx
    TopicSelectorModal.tsx
    ActorSelector.tsx
    HymnSelectorField.tsx
    PrayerSelectorField.tsx
    StatusChangeModal.tsx
    OfflineBanner.tsx
    QueryErrorView.tsx
    ErrorBoundary.tsx

  contexts/                     # React Contexts
    AuthContext.tsx
    ThemeContext.tsx

  hooks/                        # Custom hooks (TanStack Query wrappers)
    useMembers.ts
    useTopics.ts
    useSpeeches.ts
    useAgenda.ts
    useActors.ts
    useSundayTypes.ts
    useActivityLog.ts
    useHymns.ts
    usePresentationMode.ts
    useRealtimeSync.ts
    useConnection.ts
    useNotifications.ts
    useOfflineQueueProcessor.ts
    useSundayList.ts

  lib/                          # Pure functions and utilities
    permissions.ts
    whatsapp.ts
    offlineQueue.ts
    offlineGuard.ts
    sync.ts
    connectionUtils.ts
    supabase.ts
    dateUtils.ts

  i18n/                         # Internationalization
    index.ts
    locales/
      pt-BR.json
      en.json
      es.json

supabase/
  migrations/                   # Database schema
  functions/                    # Edge Functions
    register-first-user/
    create-invitation/
    register-invited-user/
    list-users/
    update-user-role/
    delete-user/
    process-notifications/

scripts/                          # Admin CLI scripts (not Edge Functions)
  import-hymns.ts                 # pnpm import-hymns hymnal.csv
  import-general-collections.ts   # pnpm import-themes themes.csv
```

## ADR Summary

| ADR | Title | Module |
|-----|-------|--------|
| ADR-001 | Store role in app_metadata | M001 |
| ADR-002 | Edge Functions for user management | M001 |
| ADR-003 | Snapshot pattern for speech data | M002 |
| ADR-004 | CSV import overwrites member list | M002 |
| ADR-005 | Lazy creation of speech records | M003 |
| ADR-006 | Speeches referenced by date JOIN in agenda | M004 |
| ADR-007 | Queue-based push notifications | M005 |
| ADR-008 | Last-write-wins conflict resolution | M007 |
| ADR-009 | Expo Router file-based routing | M008 |
| ADR-010 | Replace sunday type enum with corrected list | CR001 |
| ADR-011 | ScrollView wrapper for Topics screen | CR001 |
| ADR-012 | Debounced auto-save for AgendaForm text inputs | CR002 |
| ADR-013 | Inline actor management via bottom-sheet dialog | CR002 |
| ADR-017 | Static imports for Expo SDK modules in CSV handlers | CR003 |
| ADR-018 | Per-screen back buttons instead of global headerLeft | CR003 |
| ADR-019 | Use Supabase built-in password reset flow | CR4_F007 |
| ADR-020 | Independent can_conduct and can_preside actor fields | CR4_F008 |
| ADR-021 | Auto-create actors for bishopric users in Edge Functions | CR4_F008 |
| ADR-022 | Extract server-side error details from FunctionsHttpError | CR76 |
| ADR-023 | Remove manual Authorization header from Edge Function calls | CR76 |
| ADR-024 | Validate session before Edge Function invoke to prevent ANON key fallback | BUG401 |
| ADR-025 | Guard useQuery with enabled: !!session for authenticated queries | BUG401 |
| ADR-026 | Use error codes in csvUtils.ts instead of English strings | CR5 |
| ADR-027 | Rename update-user-role Edge Function to update-user | CR5 |

## Security Model

```yaml
authentication:
  provider: "Supabase Auth (email/password)"
  session: "JWT with app_metadata (role, ward_id)"
  token_refresh: "Automatic via Supabase SDK"

authorization:
  rls: "All ward-scoped tables filtered by ward_id from JWT"
  permissions: "Central role-to-permission map checked in UI and hooks"
  edge_functions: "Verify JWT; validate role before executing"

data_isolation:
  mechanism: "PostgreSQL Row-Level Security"
  policy: "Users can only SELECT/INSERT/UPDATE/DELETE rows where ward_id matches their app_metadata.ward_id"
  global_tables: "hymns, general_collections, general_topics (SELECT only for authenticated users)"

input_validation:
  client: "Zod or similar for form validation"
  server: "Edge Functions validate all inputs; PostgREST respects DB constraints"
```

## Observability

```yaml
logging:
  activity_log: "User actions logged to activity_log table (ward-scoped, 2-year retention)"
  not_logged: "Auto-assignments, lazy creation, push processing, token registration"

monitoring:
  push_queue: "notification_queue status tracking (pending/sent/cancelled)"
  offline_queue: "Client-side queue size monitoring"
  realtime: "ConnectionMonitor tracks WebSocket status"
```
