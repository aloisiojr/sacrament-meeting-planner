# ARCH_M001 - AuthModule

```yaml
type: arch
version: 1
status: complete
module: AuthModule
features: [F001, F018, F023]
```

## Overview

```yaml
goal: "Manage user authentication, registration flows, and role-based permissions"
principles:
  - "Supabase Auth handles all credential storage and session management"
  - "Role and ward_id stored in app_metadata (server-side, not editable by client)"
  - "Central permissions map drives all UI and API access decisions"
  - "Edge Functions handle registration flows (no direct DB writes from client)"
```

## Diagram

```
                        ┌─────────────┐
                        │  LoginScreen │
                        └──────┬──────┘
                               │
              ┌────────────────┼─────────────────┐
              ▼                ▼                  ▼
     ┌────────────┐   ┌──────────────┐   ┌───────────────┐
     │ SelfRegForm │   │ InviteRegForm│   │supabase.auth  │
     └──────┬─────┘   └──────┬───────┘   │  .signIn()    │
            │                │           └───────┬───────┘
            ▼                ▼                   │
  ┌──────────────────────────────────┐           │
  │  Edge Functions (Supabase)       │           │
  │  - register-first-user           │           │
  │  - create-invitation             │           │
  │  - register-invited-user         │           │
  │  - list-users                    │           │
  │  - update-user-role              │           │
  │  - delete-user                   │           │
  └──────────────┬───────────────────┘           │
                 │                               │
                 ▼                               ▼
        ┌────────────────────────────────────────────┐
        │  Supabase Auth (auth.users + app_metadata) │
        └────────────────────────────────────────────┘
                 │
                 ▼
        ┌──────────────────┐
        │  AuthContext      │
        │  (session, role,  │
        │   wardId, perms)  │
        └──────────────────┘
```

## Components

| # | Component | Responsibility | Dependencies |
|---|-----------|----------------|--------------|
| 1 | AuthContext | Hold session, role, wardId; provide `hasPermission()` | Supabase Auth |
| 2 | LoginScreen | Email/password login with password-manager support | AuthContext |
| 3 | SelfRegistrationScreen | First user registration (creates ward + user) | Edge Function `register-first-user` |
| 4 | InviteRegistrationScreen | Registration via deep link token | Edge Function `register-invited-user`, expo-linking |
| 5 | UserManagementScreen | CRUD users (list, invite, change role, delete) | Edge Functions, AuthContext |
| 6 | PermissionsMap | Central role-to-permissions mapping | None (pure function) |

## Contracts

### AuthContext

```typescript
interface AuthContextValue {
  session: Session | null;
  user: User | null;
  role: Role;                    // 'bishopric' | 'secretary' | 'observer'
  wardId: string;
  loading: boolean;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  hasPermission(perm: Permission): boolean;
}
```

### PermissionsMap

```typescript
// lib/permissions.ts
function hasPermission(role: Role, perm: Permission): boolean;
function getPermissions(role: Role): Permission[];
```

### Edge Functions (Supabase)

```yaml
register-first-user:
  input: { email, password, stakeName, wardName, role, language, timezone }
  output: { user, ward, session }
  side_effects:
    - "Creates ward record"
    - "Creates ward_collection_config entry for 'Temas da Ala' collection (active=true)"
    - "Creates the 'Temas da Ala' ward-specific collection in ward_topics scope"
  errors: [email_exists, stake_ward_exists]

create-invitation:
  input: { email, role }  # ward_id from auth context
  output: { invitation, deepLink }
  errors: [unauthorized]

register-invited-user:
  input: { token, password }
  output: { user, session }
  errors: [token_expired, token_used, token_invalid]

list-users:
  input: {}  # ward_id from auth context
  output: { users: Array<{id, email, role}> }

update-user-role:
  input: { userId, newRole }
  output: { success }
  errors: [unauthorized, cannot_change_own_role]

delete-user:
  input: { userId }
  output: { success }
  errors: [unauthorized, cannot_delete_self]
```

## Data Model

```yaml
tables:
  auth.users:
    managed_by: "Supabase Auth"
    app_metadata:
      ward_id: "uuid"
      role: "bishopric | secretary | observer"

  invitations:
    columns: [id, ward_id, email, role, token, expires_at, used_at, created_by, created_at]
    rls: "ward_id = auth.users.app_metadata.ward_id"
    unique: [token]
```

## Flows

### Self-Registration Flow

```
1. User fills form (email, password, stake, ward, role, language, timezone)
2. Client calls Edge Function `register-first-user`
3. EF checks: email not exists, stake+ward combo not exists
4. EF creates ward record, then creates user with app_metadata
5. EF creates "Temas da Ala" collection (ward_collection_config active=true)
6. EF returns session -> client stores in AuthContext
7. Navigate to Home
```

### Invite Registration Flow

```
1. User opens deep link: wardmanager://invite/{token}
2. expo-linking routes to InviteRegistrationScreen
3. Screen calls Edge Function to validate token -> shows read-only fields
4. User sets password, clicks Create
5. EF validates: not expired, not used
6. EF creates user, sets used_at
7. Returns session -> navigate to Home
```

## Security

```yaml
auth:
  provider: "Supabase Auth (email/password)"
  session: "JWT stored by Supabase client SDK"
  metadata: "role and ward_id in app_metadata (server-only)"

rls:
  principle: "All tables filtered by ward_id = auth.jwt().app_metadata.ward_id"
  exception: "hymns and general_collections are global (no ward_id)"

edge_functions:
  auth: "Verify JWT; extract ward_id and role from app_metadata"
  validation: "All input validated server-side"
```

## ADRs

```yaml
adrs:
  - id: ADR-001
    title: "Store role in app_metadata instead of separate profiles table"
    context: "Need role-based access; profiles table adds complexity and sync issues"
    decision: "Use Supabase app_metadata for role and ward_id"
    consequences:
      - "Simpler: no extra table, role available in JWT"
      - "Role changes require Edge Function (admin API only)"

  - id: ADR-002
    title: "Edge Functions for all user management operations"
    context: "Creating users and changing roles requires admin API; cannot be done via PostgREST"
    decision: "6 Edge Functions for user lifecycle"
    consequences:
      - "Secure: client never touches auth admin API"
      - "Requires Supabase Edge Functions deployment"
```
