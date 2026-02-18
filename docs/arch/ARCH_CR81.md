# ARCH_CR81 - User Name Field

```yaml
type: arch
version: 1
status: complete
module: AuthModule_Patch + WardDataModule_Patch
features: [CR-81]
spec: SPEC_CR81
```

## ARCH_SUMMARY

```yaml
type: arch_summary
status: complete
components_count: 10
main_components:
  - "RegisterScreen (name input)"
  - "InviteRegistrationScreen (name input)"
  - "register-first-user Edge Function (name + auto-actor)"
  - "register-invited-user Edge Function (name in metadata)"
  - "update-user-name Edge Function (NEW, self-name-update)"
  - "list-users Edge Function (name in response)"
  - "list_ward_users RPC (name from app_metadata)"
  - "UsersScreen (name display + self-edit)"
  - "ActivityLog system (user_name column + utility + display)"
  - "AuthContext (userName from app_metadata)"
tech_stack:
  - "React Native + Expo SDK 54 (TypeScript)"
  - "Supabase Edge Functions (Deno)"
  - "PostgreSQL (migration for activity_log + list_ward_users RPC)"
  - "react-i18next (pt-BR, en, es)"
  - "TanStack Query"
estimated_iterations: 1
```

## Overview

```yaml
goal: "Add mandatory Name field to users for actor auto-creation, activity log readability, and Users screen display"
principles:
  - "Name stored in app_metadata.full_name (consistent with role/ward_id pattern)"
  - "Single fullName field (not first/last), matching CR-81 requirements"
  - "New update-user-name EF for self-name-update (single responsibility)"
  - "Keep update-user-role EF unchanged (no renaming, avoid deployment risk)"
  - "Backward compat: all code uses fallback for legacy users without full_name"
  - "Activity log adds user_name column; display prefers name over email"
```

## Diagram

```
  Registration flows (add fullName input):
  ┌──────────────┐     ┌──────────────┐
  │ register.tsx │     │ invite/      │
  │ + fullName   │     │ [token].tsx  │
  │   input      │     │ + fullName   │
  └──────┬───────┘     │   input      │
         │             └──────┬───────┘
         ▼                    ▼
  ┌──────────────────────────────────────────────────────┐
  │ Supabase Edge Functions                              │
  │ register-first-user: + fullName in app_metadata      │
  │                      + auto-actor for bishopric      │
  │ register-invited-user: + fullName in app_metadata    │
  │ update-user-name (NEW): self-name-update only        │
  │ update-user-role: use full_name for auto-actor       │
  │ list-users: returns full_name from RPC               │
  └──────────────────────────┬───────────────────────────┘
                             ▼
  ┌──────────────────────────────────────────────────────┐
  │ PostgreSQL                                           │
  │ list_ward_users RPC: + full_name from app_metadata   │
  │ activity_log: + user_name nullable column            │
  └──────────────────────────────────────────────────────┘

  Users screen (name display + self-edit):
  ┌──────────────────────┐
  │ users.tsx            │
  │ - full_name primary  │
  │ - email secondary    │
  │ - self-edit name     │──> update-user-name EF
  └──────────────────────┘

  Activity Log (name display):
  ┌──────────────────────┐     ┌──────────────────┐
  │ history.tsx          │     │ activityLog.ts   │
  │ show user_name       │     │ + userName param │
  │ fallback to email    │     │ + insert column  │
  └──────────────────────┘     └──────────────────┘
```

## Components

| # | Component | Responsibility | Change Type |
|---|-----------|----------------|-------------|
| 1 | register.tsx | Self-registration form | MODIFY (add fullName input as first field) |
| 2 | invite/[token].tsx | Invite registration form | MODIFY (add fullName input between read-only fields and password) |
| 3 | register-first-user EF | Create ward + first user | MODIFY (accept fullName, store in app_metadata, auto-create actor for bishopric) |
| 4 | register-invited-user EF | Create invited user | MODIFY (accept fullName, store in app_metadata) |
| 5 | update-user-name EF | Self-name-update | NEW (validates JWT, updates caller's own app_metadata.full_name) |
| 6 | update-user-role EF | Change user role | MODIFY (use full_name from app_metadata for auto-actor instead of email prefix) |
| 7 | list-users EF | List ward users | MODIFY (update WardUser interface to include full_name) |
| 8 | users.tsx | Users screen | MODIFY (name display as primary, self-edit name, call update-user-name) |
| 9 | activityLog.ts | Activity logging utility | MODIFY (accept userName, insert into user_name column) |
| 10 | AuthContext.tsx | Auth state provider | MODIFY (expose userName from app_metadata.full_name) |

## Contracts

### C1: Self-Registration Name Input (register.tsx)

```yaml
file: src/app/(auth)/register.tsx

changes: |
  1. Add 'fullName' state variable (string, default '').
  2. Add TextInput for fullName as FIRST field in the form (before Email):
     - Label: t('auth.fullName')
     - Placeholder: t('auth.fullNamePlaceholder')
     - autoCapitalize: 'words'
     - Required (validated before submission)
  3. Update validate() function:
     - Add check: if (!fullName.trim()) return t('auth.nameRequired');
     - Insert this check as the first validation rule.
  4. Send fullName in the Edge Function call body:
     supabase.functions.invoke('register-first-user', {
       body: { ...currentBody, fullName: fullName.trim() }
     })
```

### C2: Invite Registration Name Input (invite/[token].tsx)

```yaml
file: src/app/(auth)/invite/[token].tsx

changes: |
  1. Add 'fullName' state variable (string, default '').
  2. Add TextInput for fullName AFTER the read-only fields (stake, ward,
     role, email) and BEFORE the password fields:
     - Label: t('auth.fullName')
     - Placeholder: t('auth.fullNamePlaceholder')
     - autoCapitalize: 'words'
     - Editable (not read-only)
     - Required (validated before submission)
  3. Update handleRegister validation:
     - Add check: if (!fullName.trim()) → setError(t('auth.nameRequired'))
     - Insert before password length check.
  4. Send fullName in the Edge Function call body:
     supabase.functions.invoke('register-invited-user', {
       body: { token, password, fullName: fullName.trim() }
     })
```

### C3: register-first-user Edge Function

```yaml
file: supabase/functions/register-first-user/index.ts

changes: |
  1. Add 'fullName' to RegisterInput interface:
     interface RegisterInput {
       email: string;
       password: string;
       stakeName: string;
       wardName: string;
       role: 'bishopric' | 'secretary';
       language: string;
       timezone: string;
       fullName: string;  // NEW
     }

  2. Validate fullName is present and non-empty:
     if (!input.fullName?.trim()) {
       return 400 { error: 'Name is required' };
     }

  3. Store full_name in app_metadata:
     app_metadata: {
       ward_id: ward.id,
       role: input.role,
       full_name: input.fullName.trim(),  // NEW
     }

  4. Auto-create meeting actor for bishopric (NEW behavior):
     if (input.role === 'bishopric') {
       try {
         const actorName = input.fullName.trim();
         // Check if actor with same name already exists
         const { data: existing } = await supabaseAdmin
           .from('meeting_actors')
           .select('id, can_preside, can_conduct')
           .eq('ward_id', ward.id)
           .ilike('name', actorName)
           .maybeSingle();

         if (existing) {
           // Update flags if needed
           if (!existing.can_preside || !existing.can_conduct) {
             await supabaseAdmin
               .from('meeting_actors')
               .update({ can_preside: true, can_conduct: true })
               .eq('id', existing.id);
           }
         } else {
           await supabaseAdmin
             .from('meeting_actors')
             .insert({
               ward_id: ward.id,
               name: actorName,
               can_preside: true,
               can_conduct: true,
               can_recognize: false,
               can_music: false,
             });
         }
       } catch (actorErr) {
         console.error('Auto-actor creation failed:', actorErr);
         // Best-effort: do not fail registration
       }
     }
```

### C4: register-invited-user Edge Function

```yaml
file: supabase/functions/register-invited-user/index.ts

changes: |
  1. Add 'fullName' to RegisterInvitedInput interface:
     interface RegisterInvitedInput {
       token: string;
       password: string;
       fullName: string;  // NEW
     }

  2. Validate fullName in handleRegister:
     if (!input.fullName?.trim()) {
       return 400 { error: 'Name is required' };
     }

  3. Store full_name in app_metadata (in the createUser call):
     app_metadata: {
       ward_id: invitation.ward_id,
       role: invitation.role,
       full_name: input.fullName.trim(),  // NEW
     }

  Note: No auto-actor creation in register-invited-user.
  The create-invitation EF already handles actor creation using
  email prefix at invite time. Per SPEC_CR81 AC-18, this is
  unchanged because the user's name is not known at invite time.
```

### C5: update-user-name Edge Function (NEW)

```yaml
file: supabase/functions/update-user-name/index.ts
status: NEW

contract: |
  Input: { fullName: string }
  Auth: JWT required (caller updates their OWN name only)
  Output: { success: true } | { error: string }

implementation: |
  1. Verify JWT from Authorization header.
  2. Get caller user from JWT token.
  3. Validate fullName:
     - Must be present and non-empty after trim
     - Return 400 if invalid
  4. Update caller's own app_metadata.full_name:
     await supabaseAdmin.auth.admin.updateUserById(caller.id, {
       app_metadata: {
         ...caller.app_metadata,
         full_name: fullName.trim(),
       },
     });
  5. Return { success: true }.

security: |
  - No targetUserId parameter -- always updates the caller's own data.
  - No role-based permission check needed (any authenticated user can
    edit their own name).
  - Caller identity comes from JWT, not from request body.
```

### C6: update-user-role Edge Function (auto-actor fix)

```yaml
file: supabase/functions/update-user-role/index.ts

changes: |
  1. In the auto-actor creation block (line ~164-201), replace
     email-derived name with full_name from app_metadata:

     // BEFORE:
     const actorName = (targetUser.email ?? '')
       .split('@')[0]
       .replace(/[._]/g, ' ')
       .replace(/\b\w/g, (c: string) => c.toUpperCase());

     // AFTER:
     const fullName = targetUser.app_metadata?.full_name;
     const actorName = fullName
       ? fullName.trim()
       : (targetUser.email ?? '')
           .split('@')[0]
           .replace(/[._]/g, ' ')
           .replace(/\b\w/g, (c: string) => c.toUpperCase());

  2. No other changes. Function name, input contract, and role
     change logic remain the same.
```

### C7: list-users Edge Function + list_ward_users RPC

```yaml
file_1: supabase/functions/list-users/index.ts

changes: |
  1. Update WardUser interface:
     interface WardUser {
       id: string;
       email: string;
       role: string;
       full_name: string;  // NEW
       created_at: string;
     }

  2. No logic changes needed -- the RPC returns the data,
     and the EF passes it through directly.

file_2: supabase/migrations/011_add_user_name_support.sql

rpc_update: |
  CREATE OR REPLACE FUNCTION list_ward_users(target_ward_id uuid)
  RETURNS TABLE (
    id uuid,
    email text,
    role text,
    full_name text,    -- NEW column
    created_at timestamptz
  )
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  AS $$
    SELECT
      u.id,
      u.email,
      COALESCE(u.raw_app_meta_data->>'role', 'observer') AS role,
      COALESCE(u.raw_app_meta_data->>'full_name', '') AS full_name,
      u.created_at
    FROM auth.users u
    WHERE u.raw_app_meta_data->>'ward_id' = target_ward_id::text
    ORDER BY u.created_at ASC;
  $$;
```

### C8: Users Screen Name Display and Edit (users.tsx)

```yaml
file: src/app/(tabs)/settings/users.tsx

changes:
  interface_update: |
    interface WardUser {
      id: string;
      email: string;
      role: string;
      full_name: string;  // NEW: from app_metadata.full_name
      created_at: string;
    }

  display: |
    In user card rendering (the collapsed header area):
    - Primary text: u.full_name when non-empty, otherwise u.email (fallback)
    - Secondary text below: u.email (always shown)
    - Role label: unchanged (t(`roles.${u.role}`))

    Implementation:
      <Text style={[styles.userName, { color: colors.text }]}>
        {u.full_name || u.email}
      </Text>
      <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
        {u.full_name ? u.email : ''}
      </Text>
      <Text style={[styles.userRole, { color: colors.textSecondary }]}>
        {t(`roles.${u.role}`)}
        {isSelf ? ` (${t('common.you') || 'you'})` : ''}
      </Text>

    Note: When full_name is empty (legacy), email is the primary text
    and secondary email line is hidden (empty string) to avoid
    duplicating the same email.

  self_edit: |
    When card is expanded AND isSelf === true:
    1. Show editable name TextInput:
       - Label: t('users.name')
       - Pre-filled with user's current full_name
       - Local state: editingName (string)
       - autoCapitalize: 'words'
    2. Show "Save" button when name has changed:
       - Disabled if editingName.trim() is empty
       - Disabled if editingName.trim() === u.full_name (no change)
    3. On save: call update-user-name EF
    4. On success: invalidate users query, refresh session, show
       Alert with t('users.nameUpdated')
    5. On error: show Alert with t('users.nameUpdateFailed'),
       revert editingName to previous value

    When card is expanded AND isSelf === false:
    - Show name as read-only text (not TextInput)

  name_edit_mutation: |
    const updateNameMutation = useMutation({
      mutationFn: async (newName: string) => {
        return callEdgeFunction('update-user-name', {
          fullName: newName.trim(),
        });
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: userManagementKeys.users });
        supabase.auth.refreshSession();
        Alert.alert(t('common.success'), t('users.nameUpdated'));
      },
      onError: () => {
        Alert.alert(t('common.error'), t('users.nameUpdateFailed'));
      },
    });

  no_change_guard: |
    Before calling mutation, check:
    if (editingName.trim() === u.full_name) return; // No API call
```

### C9: AuthContext Name Exposure

```yaml
file: src/contexts/AuthContext.tsx

changes: |
  1. Add userName to AuthContextValue interface:
     export interface AuthContextValue {
       session: Session | null;
       user: User | null;
       role: Role;
       wardId: string;
       userName: string;   // NEW
       loading: boolean;
       signIn(email: string, password: string): Promise<void>;
       signOut(): Promise<void>;
       hasPermission(perm: Permission): boolean;
     }

  2. Add extractUserName function:
     function extractUserName(user: User | null): string {
       if (!user) return '';
       return user.app_metadata?.full_name ?? '';
     }

  3. In AuthProvider, derive userName:
     const userName = extractUserName(user);

  4. Add userName to the provider value object and useMemo deps.
```

### C10: Activity Log System (Database + Utility + Display)

```yaml
# --- Database Migration ---
file: supabase/migrations/011_add_user_name_support.sql

sql: |
  -- 1. Add user_name column to activity_log
  ALTER TABLE activity_log
  ADD COLUMN user_name TEXT;

  -- 2. Update list_ward_users RPC to return full_name
  CREATE OR REPLACE FUNCTION list_ward_users(target_ward_id uuid)
  RETURNS TABLE (
    id uuid,
    email text,
    role text,
    full_name text,
    created_at timestamptz
  )
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  AS $$
    SELECT
      u.id,
      u.email,
      COALESCE(u.raw_app_meta_data->>'role', 'observer') AS role,
      COALESCE(u.raw_app_meta_data->>'full_name', '') AS full_name,
      u.created_at
    FROM auth.users u
    WHERE u.raw_app_meta_data->>'ward_id' = target_ward_id::text
    ORDER BY u.created_at ASC;
  $$;

# --- Activity Log Utility ---
file: src/lib/activityLog.ts

changes: |
  1. Update logAction signature:
     export async function logAction(
       wardId: string,
       userId: string,
       userEmail: string,
       actionType: string,
       description: string,
       userName?: string     // NEW optional parameter
     ): Promise<void>

  2. Include user_name in the insert:
     await supabase.from('activity_log').insert({
       ward_id: wardId,
       user_id: userId,
       user_email: userEmail,
       user_name: userName ?? null,   // NEW
       action_type: actionType,
       description,
     });

  3. Update createLogger:
     export function createLogger(
       wardId: string,
       userId: string,
       userEmail: string,
       userName?: string     // NEW optional parameter
     ) {
       return (actionType: string, description: string) =>
         logAction(wardId, userId, userEmail, actionType, description, userName);
     }

# --- Database Types ---
file: src/types/database.ts

changes: |
  Update ActivityLog interface:
    export interface ActivityLog {
      id: string;
      ward_id: string;
      user_id: string;
      user_email: string;
      user_name: string | null;   // NEW
      action_type: string;
      description: string;
      created_at: string;
    }

# --- Activity Log Hook (search) ---
file: src/hooks/useActivityLog.ts

changes: |
  Update the search filter to include user_name:
    q = q.or(
      `user_email.ilike.%${term}%,description.ilike.%${term}%,created_at::text.ilike.%${term}%,user_name.ilike.%${term}%`
    );

# --- Activity Log Screen (display) ---
file: src/app/(tabs)/settings/history.tsx

changes: |
  Update ActivityLogEntry component:
    <Text style={[styles.entryEmail, { color: colors.textSecondary }]}>
      {item.user_name || item.user_email}
    </Text>

  This shows user_name when available, falling back to user_email
  for legacy entries where user_name is null.

# --- Hook callers update ---
files:
  - src/hooks/useMembers.ts
  - src/hooks/useSpeeches.ts
  - src/hooks/useActors.ts
  - src/hooks/useAgenda.ts
  - src/hooks/useTopics.ts
  - src/hooks/useSundayTypes.ts (if it logs)

changes: |
  All hooks that call createLogger need to pass userName.
  The userName comes from useAuth().userName.

  Pattern for each hook:
    const { wardId, user, userName } = useAuth();
    const logger = createLogger(
      wardId,
      user?.id ?? '',
      user?.email ?? '',
      userName    // NEW parameter
    );
```

### C11: i18n Keys

```yaml
new_i18n_keys:
  auth.fullName:
    pt-BR: "Nome"
    en: "Name"
    es: "Nombre"
  auth.fullNamePlaceholder:
    pt-BR: "Seu nome completo"
    en: "Your full name"
    es: "Su nombre completo"
  auth.nameRequired:
    pt-BR: "Nome é obrigatório"
    en: "Name is required"
    es: "Nombre es obligatorio"
  users.name:
    pt-BR: "Nome"
    en: "Name"
    es: "Nombre"
  users.nameUpdated:
    pt-BR: "Nome atualizado com sucesso"
    en: "Name updated successfully"
    es: "Nombre actualizado con éxito"
  users.nameUpdateFailed:
    pt-BR: "Falha ao atualizar nome"
    en: "Failed to update name"
    es: "Error al actualizar nombre"

files:
  - src/i18n/locales/pt-BR.json
  - src/i18n/locales/en.json
  - src/i18n/locales/es.json
```

## Data Model Changes

```yaml
migration: 011_add_user_name_support.sql

changes:
  - table: activity_log
    action: ADD_COLUMN
    column: "user_name TEXT (nullable, default NULL)"
    reason: "Display user name in history screen entries"

  - function: list_ward_users
    action: ALTER (CREATE OR REPLACE)
    change: "Add full_name column: COALESCE(raw_app_meta_data->>'full_name', '')"
    reason: "Return user names to Users screen via list-users EF"

  - data: auth.users.app_metadata
    action: CONVENTION
    change: "New field full_name added to app_metadata alongside ward_id and role"
    reason: "Store user's display name for all downstream uses"

no_new_tables: true
no_schema_breaking_changes: true
```

## Flows

### F1: Self-Registration with Name

```
1. User opens register screen
2. Fills in: Name (first field), Email, Password, Confirm, Stake, Ward, Role, Language, Timezone
3. Form validates: fullName.trim() is not empty (first check)
4. Calls register-first-user EF with { ...fields, fullName }
5. EF validates fullName is non-empty
6. EF creates ward
7. EF creates user with app_metadata: { ward_id, role, full_name }
8. If role=bishopric: auto-creates meeting actor with full_name
   (can_preside=true, can_conduct=true)
9. EF signs in user, returns session
10. Client sets session; AuthContext picks up full_name from app_metadata
```

### F2: Invite Registration with Name

```
1. User opens invite link, token is validated, read-only fields shown
2. User enters: Name (between read-only fields and password), Password, Confirm
3. Form validates: fullName.trim() is not empty
4. Calls register-invited-user EF with { token, password, fullName }
5. EF validates fullName is non-empty
6. EF creates user with app_metadata: { ward_id, role, full_name }
7. EF marks invitation as used
8. EF signs in user, returns session
9. Client sets session; AuthContext picks up full_name from app_metadata
```

### F3: Users Screen Name Display

```
1. User navigates to Settings > Users
2. list-users EF calls list_ward_users RPC
3. RPC returns full_name from raw_app_meta_data for each user
4. Each user card shows full_name as primary text, email as secondary
5. Legacy users (no full_name): email shown as primary, no secondary
```

### F4: Self-Edit Name

```
1. User taps their own card in Users screen (isSelf = true)
2. Card expands showing editable name TextInput pre-filled with current full_name
3. User modifies name
4. Taps "Save" (only enabled if name changed and non-empty)
5. Client calls update-user-name EF with { fullName: editedName.trim() }
6. EF validates JWT, confirms caller identity
7. EF updates app_metadata.full_name via admin.updateUserById
8. Client invalidates users query, refreshes auth session
9. AuthContext picks up updated full_name
10. Success alert shown
```

### F5: Activity Log with Name

```
1. User performs an action (e.g., creates a member)
2. Hook calls createLogger with userName from useAuth().userName
3. logAction inserts into activity_log with user_name column set
4. History screen reads activity_log
5. Displays: user_name when available, falls back to user_email
6. Search also matches user_name field
```

### F6: Auto-Actor on Role Change

```
1. Admin changes a user's role TO 'bishopric' via update-user-role
2. EF reads target user's app_metadata.full_name
3. If full_name exists: use it as actor name
4. If full_name is empty/null (legacy): fall back to email-prefix derivation
5. Check for existing actor with same name (ilike match)
6. Create or update actor with can_preside=true, can_conduct=true
```

## Security

```yaml
no_new_security_risks: true

notes:
  - "Name stored in app_metadata (writable only via admin API / Edge Functions)"
  - "update-user-name EF: always updates caller's own metadata (no targetUserId)"
  - "Self-edit only: users cannot edit other users' names"
  - "Name visible only to same-ward users (list-users requires auth + permission)"
  - "Name field has no sensitive data implications"
  - "Activity log user_name is ward-scoped, visible only via ward-scoped queries"
  - "update-user-role retains all existing permission checks"
  - "Registration EFs validate fullName server-side as safety net"
```

## File Impact Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/app/(auth)/register.tsx` | MODIFY | Add fullName state, TextInput (first field), validation |
| `src/app/(auth)/invite/[token].tsx` | MODIFY | Add fullName state, TextInput (after read-only, before password), validation |
| `src/app/(tabs)/settings/users.tsx` | MODIFY | Display full_name as primary text; add self-edit name with save mutation |
| `src/app/(tabs)/settings/history.tsx` | MODIFY | Show user_name with email fallback |
| `src/contexts/AuthContext.tsx` | MODIFY | Add userName to context from app_metadata.full_name |
| `src/lib/activityLog.ts` | MODIFY | Accept userName param, insert into user_name column |
| `src/types/database.ts` | MODIFY | Add user_name to ActivityLog interface |
| `src/hooks/useActivityLog.ts` | MODIFY | Include user_name in search filter |
| `src/hooks/useMembers.ts` | MODIFY | Pass userName to createLogger |
| `src/hooks/useSpeeches.ts` | MODIFY | Pass userName to createLogger |
| `src/hooks/useActors.ts` | MODIFY | Pass userName to createLogger |
| `src/hooks/useAgenda.ts` | MODIFY | Pass userName to createLogger |
| `src/hooks/useTopics.ts` | MODIFY | Pass userName to createLogger |
| `src/hooks/useSundayTypes.ts` | MODIFY | Pass userName to createLogger (if applicable) |
| `src/i18n/locales/pt-BR.json` | MODIFY | Add auth.fullName, auth.fullNamePlaceholder, auth.nameRequired, users.name, users.nameUpdated, users.nameUpdateFailed |
| `src/i18n/locales/en.json` | MODIFY | Same i18n keys |
| `src/i18n/locales/es.json` | MODIFY | Same i18n keys |
| `supabase/functions/register-first-user/index.ts` | MODIFY | Accept fullName, store in app_metadata, auto-create actor for bishopric |
| `supabase/functions/register-invited-user/index.ts` | MODIFY | Accept fullName, store in app_metadata |
| `supabase/functions/update-user-name/index.ts` | **NEW** | Self-name-update edge function |
| `supabase/functions/update-user-role/index.ts` | MODIFY | Use full_name from app_metadata for auto-actor (with email fallback) |
| `supabase/functions/list-users/index.ts` | MODIFY | Update WardUser interface to include full_name |
| `supabase/migrations/011_add_user_name_support.sql` | **NEW** | Add user_name column to activity_log, update list_ward_users RPC |

## ADRs

```yaml
adrs:
  - id: ADR-028
    title: "Use full_name in app_metadata and a separate update-user-name EF"
    context: >
      ARCH_CR5 proposed renaming update-user-role to update-user and combining
      role + name updates. However, this introduces deployment coordination
      risk and mixes two unrelated concerns (admin role change vs self-name-edit).
      SPEC_CR81 explicitly defines a separate update-user-name endpoint.
    decision: >
      Keep update-user-role unchanged. Create new update-user-name EF that
      only handles self-name-update. Use app_metadata key 'full_name' (matching
      SPEC_CR81 naming) instead of 'name' (from ARCH_CR5).
    consequences:
      - "Simpler deployment: no function renaming needed"
      - "Clear separation: role changes (admin) vs name edits (self-service)"
      - "One additional Edge Function to deploy"
      - "ARCH_CR5 ADR-027 (rename to update-user) is superseded"

  - id: ADR-029
    title: "Auto-create actor in register-first-user for bishopric role"
    context: >
      register-first-user currently has NO auto-actor creation.
      update-user-role and create-invitation have auto-actor logic.
      With the name field available, first-registration bishopric users
      should also get an actor auto-created with their real name.
    decision: >
      Add best-effort auto-actor creation in register-first-user when
      role is bishopric, using the provided fullName. Same pattern as
      update-user-role (check existing, create or update flags).
    consequences:
      - "Bishopric users get Preside/Conduct actor immediately after registration"
      - "Actor uses real name, not email prefix"
      - "Best-effort: failure does not block registration"
```

## Risk Assessment

```yaml
risks:
  - id: R-1
    severity: LOW
    description: "Legacy users without full_name in app_metadata"
    mitigation: >
      All code uses fallback patterns: COALESCE in SQL, || in JS,
      ?? '' in TypeScript. No crashes for null/undefined full_name.

  - id: R-2
    severity: LOW
    description: "Historical activity_log entries have user_name = NULL"
    mitigation: >
      history.tsx uses (item.user_name || item.user_email) fallback.
      No backfill needed; existing entries display email as before.

  - id: R-3
    severity: LOW
    description: "refreshSession() after name edit may fail silently"
    mitigation: >
      Even if refresh fails, next login or app restart picks up new
      name from server. Users screen also re-fetches via query invalidation.

  - id: R-4
    severity: VERY_LOW
    description: "New update-user-name EF requires deployment"
    mitigation: >
      Standard Supabase Edge Function deployment. No coordination
      needed with other EFs since it is a new independent function.
```
