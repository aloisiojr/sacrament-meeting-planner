# ARCH_CR5 - Batch 5: Actor Icons, CSV Fixes, Members UX, Users Screen Name Feature

```yaml
type: arch
version: 1
status: complete
module: WardDataModule_Patch + AuthModule_Patch
features: [CR-70, CR-77, CR-78, CR-79, CR-80]
spec: SPEC_CR70, SPEC_CR77, SPEC_CR78, SPEC_CR79, SPEC_CR80
```

## ARCH_SUMMARY

```yaml
type: arch_summary
status: complete
components_count: 10
main_components:
  - "ActorSelector (CR-70: icon size/touch area increase)"
  - "MemberManagementScreen CSV Export (CR-77: empty list fix)"
  - "MemberManagementScreen CSV Import (CR-78: i18n error codes)"
  - "csvUtils parseCsv (CR-78: error codes instead of English strings)"
  - "MemberManagementScreen InfoSection (CR-79: explanatory texts)"
  - "UsersScreen header (CR-80a: back button)"
  - "UsersScreen name display + edit (CR-80b: name field)"
  - "Registration flows (CR-80b: name input in register + invite)"
  - "Edge Functions (CR-80b: name in app_metadata + actor + update-user)"
  - "Activity log (CR-80b: user_name column)"
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
goal: "Fix actor icon usability, CSV export/import regressions, add members screen help texts, add back button and Name field to Users screen"
principles:
  - "Style-only changes for CR-70 (no logic changes)"
  - "Defensive guards for CR-77 (empty export must succeed)"
  - "Error codes in csvUtils for CR-78 (i18n at UI layer, not in util)"
  - "Informational UI for CR-79 (non-intrusive, translatable)"
  - "Follow ADR-018 pattern for CR-80a back button"
  - "Name stored in app_metadata (consistent with role/ward_id pattern)"
  - "Rename update-user-role EF to update-user (handles role + name)"
```

## Diagram

```
  CR-70: ActorSelector (style only)
  ┌──────────────────────┐
  │ ActorSelector.tsx     │  fontSize: 24→28, padding: 4→8
  │   ✎  ✖ icons         │  gap: 20→28, hitSlop: 12→16
  └──────────────────────┘

  CR-77 + CR-78: CSV Export/Import fixes
  ┌─────────────┐       ┌──────────────┐       ┌──────────┐
  │ members.tsx │──────>│ csvUtils.ts  │──────>│ i18n     │
  │ handleExport│       │ generateCsv  │       │ locales  │
  │ handleImport│       │ parseCsv     │       │ (3 langs)│
  └─────────────┘       │ (error codes)│       └──────────┘
                        └──────────────┘

  CR-79: Members info section
  ┌──────────────────┐       ┌──────────┐
  │ members.tsx      │──────>│ i18n     │
  │ InfoCard section │       │ locales  │
  └──────────────────┘       └──────────┘

  CR-80a + CR-80b: Users screen + Name field
  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
  │ register.tsx │     │ invite/      │     │ users.tsx    │
  │ + name input │     │ [token].tsx  │     │ + back btn   │
  │              │     │ + name input │     │ + name field │
  └──────┬───────┘     └──────┬───────┘     │ + name edit  │
         │                    │             └──────┬───────┘
         ▼                    ▼                    ▼
  ┌──────────────────────────────────────────────────────┐
  │ Supabase Edge Functions                              │
  │ register-first-user: + name in app_metadata          │
  │ register-invited-user: + name in app_metadata        │
  │ update-user (renamed): role + name updates           │
  │ list-users: returns name from RPC                    │
  └──────────────────────────┬───────────────────────────┘
                             ▼
  ┌──────────────────────────────────────────────────────┐
  │ PostgreSQL                                           │
  │ list_ward_users RPC: + name column from app_metadata │
  │ activity_log: + user_name nullable column            │
  │ + migration: set names for 2 existing users          │
  └──────────────────────────────────────────────────────┘
```

## Components

| # | Component | Responsibility | CRs | Change Type |
|---|-----------|----------------|-----|-------------|
| 1 | ActorSelector.tsx | Actor selection bottom-sheet with edit/delete icons | CR-70 | MODIFY (style only) |
| 2 | members.tsx (export) | CSV export of member list | CR-77 | MODIFY (fix empty export) |
| 3 | members.tsx (import) | CSV import with error display | CR-78 | MODIFY (i18n error messages) |
| 4 | csvUtils.ts | CSV parsing and validation | CR-78 | MODIFY (error codes) |
| 5 | members.tsx (info section) | Explanatory texts for members screen | CR-79 | MODIFY (add info card) |
| 6 | users.tsx (header) | Users screen header | CR-80a | MODIFY (add back button) |
| 7 | users.tsx (name) | Users screen name display and edit | CR-80b | MODIFY (name field + edit) |
| 8 | register.tsx + invite/[token].tsx | Registration forms | CR-80b | MODIFY (add name input) |
| 9 | Edge Functions (4 EFs) | Server-side user management | CR-80b | MODIFY (name in metadata) |
| 10 | activityLog.ts | Activity logging utility | CR-80b | MODIFY (accept userName) |

## Contracts

### C1: ActorSelector Icon Sizing (CR-70)

```yaml
file: src/components/ActorSelector.tsx
change_type: STYLE_ONLY

changes:
  actionIcon:
    fontSize: "24 → 28"
    padding: "4 → 8"
  actorActions:
    gap: "20 → 28"
  Pressable_hitSlop: "12 → 16"

no_logic_changes: true
no_new_dependencies: true
```

### C2: CSV Empty Export Fix (CR-77)

```yaml
file: src/app/(tabs)/settings/members.tsx
function: handleExport

problem: |
  When members list is empty (null/undefined from useMembers hook),
  the export fails with an error dialog instead of generating a
  headers-only CSV file. The generateCsv function correctly handles
  empty arrays, but the error may occur in the file write/share chain.

fix: |
  1. Ensure members fallback: const memberList = members ?? [];
  2. Verify generateCsv([]) produces valid output (BOM + header)
  3. Verify FileSystem.writeAsStringAsync handles the small file
  4. Verify Sharing.shareAsync handles the file on mobile
  5. On web: verify Blob creation works with header-only content
  6. Add explicit guard: if csvContent is a valid non-empty string,
     proceed with write/share. The generateCsv always returns at
     minimum the BOM + header row, so this should always pass.

verify_file: src/lib/csvUtils.ts
verify: |
  generateCsv([]) must return "\uFEFFNome,Telefone Completo\n"
  (UTF-8 BOM + header row). If it does not, fix generateCsv.
```

### C3: CSV Import Error Codes (CR-78)

```yaml
file: src/lib/csvUtils.ts
function: parseCsv

problem: |
  parseCsv returns CsvValidationError[] with hardcoded English
  message strings (e.g., "Name is required", "Invalid phone format").
  These messages are displayed to the user via Alert.alert but are
  not translated because they bypass i18n.

fix: |
  Change parseCsv to return error CODES instead of English strings
  in the message field. The UI layer (members.tsx) maps these codes
  to i18n keys.

  Error codes:
    - "empty_file" → file has no content
    - "invalid_header" → header has fewer than 2 columns
    - "name_required" → name column is empty on a row
    - "invalid_phone" → phone does not match +xx format
    - "duplicate_phone" → phone appears more than once
    - "no_data_rows" → only header row, no data

  Each error retains line number and field name.

  The message field becomes the error code string.

contract:
  input: "csvContent: string"
  output: |
    CsvParseResult {
      success: boolean;
      members: CsvMember[];
      errors: CsvValidationError[];  // message field is now an error code
    }

file_2: src/app/(tabs)/settings/members.tsx
function: importMutation (onSuccess/onError handlers)

fix_2: |
  Map parseCsv error codes to i18n keys:
    t(`members.csvError.${error.message}`, { line: error.line, field: error.field, ... })

  Limit displayed errors to first 5, with a "...and N more errors"
  suffix when there are more.

  Add specific i18n keys per error code in all 3 locale files.
```

### C3b: CSV Import i18n Keys (CR-78)

```yaml
new_i18n_keys:
  members.csvError:
    empty_file:
      pt-BR: "Arquivo CSV vazio. Nenhum dado encontrado."
      en: "Empty CSV file. No data found."
      es: "Archivo CSV vacío. No se encontraron datos."
    invalid_header:
      pt-BR: "Formato CSV inválido. O arquivo deve ter pelo menos 2 colunas: Nome, Telefone Completo."
      en: "Invalid CSV format. The file must have at least 2 columns: Nome, Telefone Completo."
      es: "Formato CSV inválido. El archivo debe tener al menos 2 columnas: Nome, Telefone Completo."
    name_required:
      pt-BR: "Nome é obrigatório"
      en: "Name is required"
      es: "Nombre es obligatorio"
    invalid_phone:
      pt-BR: "Formato de telefone inválido. Esperado: +xxyyyyyyyy"
      en: "Invalid phone format. Expected: +xxyyyyyyyy"
      es: "Formato de teléfono inválido. Esperado: +xxyyyyyyyy"
    duplicate_phone:
      pt-BR: "Telefone duplicado"
      en: "Duplicate phone number"
      es: "Teléfono duplicado"
    no_data_rows:
      pt-BR: "O arquivo CSV contém apenas o cabeçalho. Nenhum dado para importar."
      en: "The CSV file contains only the header row. No data to import."
      es: "El archivo CSV contiene solo el encabezado. No hay datos para importar."
    invalid_file:
      pt-BR: "Formato de arquivo inválido. Selecione um arquivo CSV (.csv)."
      en: "Invalid file format. Please select a CSV (.csv) file."
      es: "Formato de archivo inválido. Seleccione un archivo CSV (.csv)."
    file_read_error:
      pt-BR: "Erro ao ler o arquivo. Tente novamente."
      en: "Error reading the file. Please try again."
      es: "Error al leer el archivo. Inténtelo de nuevo."

  members.csvError.moreErrors:
    pt-BR: "...e mais {{count}} erro(s)"
    en: "...and {{count}} more error(s)"
    es: "...y {{count}} error(es) más"

  members.csvError.lineError:
    pt-BR: "Linha {{line}}, {{field}}: {{error}}"
    en: "Line {{line}}, {{field}}: {{error}}"
    es: "Línea {{line}}, {{field}}: {{error}}"
```

### C4: Members Screen Info Section (CR-79)

```yaml
file: src/app/(tabs)/settings/members.tsx

change: |
  Add an informational card section below the CSV buttons and above
  the member list. The section uses a subtle background
  (colors.surfaceVariant or colors.card) and smaller text
  (colors.textSecondary) to be non-intrusive.

  Content structure:
    1. Purpose heading + description
    2. Export CSV explanation
    3. Import CSV explanation (with "replaces all" warning)
    4. CSV format description

  Visibility rules:
    - For users with canWrite permission: show all 4 sections
    - For observers: show only purpose description (no import/export)

  All text via i18n keys under members.info namespace.

i18n_keys:
  members.info:
    purpose:
      pt-BR: "Gerencie a lista de membros da ala que podem ser designados para discursos, orações e outros papéis na reunião sacramental."
      en: "Manage the ward member list for speech, prayer, and role assignments in sacrament meetings."
      es: "Gestione la lista de miembros del barrio para asignaciones de discursos, oraciones y otros roles en las reuniones sacramentales."
    exportTitle:
      pt-BR: "Exportar CSV"
      en: "Export CSV"
      es: "Exportar CSV"
    exportDescription:
      pt-BR: "Gera um arquivo com todos os membros cadastrados (nome e telefone). Útil para backup ou para editar em planilha e reimportar."
      en: "Generates a file with all registered members (name and phone). Useful for backup or for editing in a spreadsheet and re-importing."
      es: "Genera un archivo con todos los miembros registrados (nombre y teléfono). Útil para respaldo o para editar en hoja de cálculo y reimportar."
    importTitle:
      pt-BR: "Importar CSV"
      en: "Import CSV"
      es: "Importar CSV"
    importDescription:
      pt-BR: "Substitui TODA a lista de membros atual pelos nomes do arquivo importado. Discursos e agendas já designados NÃO são afetados — membros previamente atribuídos continuam aparecendo normalmente."
      en: "Replaces ALL the current member list with the names from the imported file. Previously assigned speeches and agendas are NOT affected — members already assigned continue appearing normally."
      es: "Reemplaza TODA la lista de miembros actual con los nombres del archivo importado. Los discursos y agendas ya asignados NO se ven afectados — los miembros previamente asignados continúan apareciendo normalmente."
    formatTitle:
      pt-BR: "Formato do CSV"
      en: "CSV Format"
      es: "Formato del CSV"
    formatDescription:
      pt-BR: "O arquivo deve ter duas colunas: \"Nome\" (nome completo) e \"Telefone Completo\" (com código do país, ex: +5511999999999). A coluna de telefone é opcional."
      en: "The file must have two columns: \"Nome\" (full name) and \"Telefone Completo\" (with country code, e.g., +5511999999999). The phone column is optional."
      es: "El archivo debe tener dos columnas: \"Nome\" (nombre completo) y \"Telefone Completo\" (con código de país, ej: +5511999999999). La columna de teléfono es opcional."
```

### C5: Users Screen Back Button (CR-80a)

```yaml
file: src/app/(tabs)/settings/users.tsx

problem: |
  The Users screen header has no back button. All other Settings
  sub-screens follow ADR-018 with a per-screen back button using
  Pressable + router.back() + t('common.back'). The Users screen
  was added in CR-64 without this pattern.

fix: |
  1. Import useRouter from expo-router
  2. Add backButton Pressable to the header, matching the pattern
     from members.tsx
  3. Restructure header to 3-element row:
     [back button] [title] [invite button]
  4. Add backButton style to StyleSheet
  5. Use justifyContent: 'space-between' for the header row

reference_pattern: |
  <View style={styles.header}>
    <Pressable onPress={() => router.back()} accessibilityRole="button">
      <Text style={[styles.backButton, { color: colors.primary }]}>
        {t('common.back')}
      </Text>
    </Pressable>
    <Text style={[styles.title, { color: colors.text }]}>{t('users.title')}</Text>
    <Pressable ... inviteButton ... />
  </View>

no_new_i18n_keys: true  # common.back already exists in all 3 languages
```

### C6: Users Screen Name Display and Edit (CR-80b - Client)

```yaml
file: src/app/(tabs)/settings/users.tsx

changes:
  interface_update: |
    interface WardUser {
      id: string;
      email: string;
      role: string;
      name: string;       // NEW: from app_metadata.name
      created_at: string;
    }

  display: |
    In user card rendering:
    - Show name as primary text (larger, bold) when available
    - Show email as secondary text below the name
    - If name is empty (legacy user), show email as primary (current behavior)

  self_edit: |
    When user views their own card (isSelf = true):
    - Add an editable name TextInput below the role selector
    - "Save name" button triggers update-user EF with newName field
    - Validation: name cannot be empty after trimming
    - Success: show toast t('users.nameUpdateSuccess')
    - Error: show toast t('users.nameUpdateFailed')

  name_edit_mutation: |
    const updateNameMutation = useMutation({
      mutationFn: async (newName: string) => {
        return callEdgeFunction('update-user', {
          targetUserId: currentUser.id,
          newName: newName.trim(),
        });
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: userManagementKeys.users });
        // Also refresh the session to update app_metadata in AuthContext
        supabase.auth.refreshSession();
      },
    });
```

### C7: Registration Forms Name Input (CR-80b - Client)

```yaml
files:
  - src/app/(auth)/register.tsx
  - src/app/(auth)/invite/[token].tsx

changes_register: |
  1. Add 'name' state variable (string)
  2. Add TextInput for name (label: t('auth.name'), required)
  3. Position name input BEFORE email input in the form
  4. Validate: name.trim() cannot be empty before submission
  5. Send name in the Edge Function call body:
     supabase.functions.invoke('register-first-user', {
       body: { ...currentBody, name: name.trim() }
     })

changes_invite: |
  1. Add 'name' state variable (string)
  2. Add TextInput for name (label: t('auth.name'), required)
  3. Validate: name.trim() cannot be empty before submission
  4. Send name in the Edge Function call body:
     supabase.functions.invoke('register-invited-user', {
       body: { token, password, name: name.trim() }
     })

i18n_keys:
  auth.name:
    pt-BR: "Nome"
    en: "Name"
    es: "Nombre"
  auth.namePlaceholder:
    pt-BR: "Seu nome completo"
    en: "Your full name"
    es: "Su nombre completo"
  auth.nameRequired:
    pt-BR: "Nome é obrigatório"
    en: "Name is required"
    es: "Nombre es obligatorio"
```

### C8: Edge Functions (CR-80b - Server)

```yaml
# --- register-first-user ---
file: supabase/functions/register-first-user/index.ts

changes: |
  1. Add 'name' to RegisterInput interface:
     interface RegisterInput {
       email: string;
       password: string;
       stakeName: string;
       wardName: string;
       role: 'bishopric' | 'secretary';
       language: string;
       timezone: string;
       name: string;  // NEW
     }

  2. Validate name is present and not empty (after trim):
     if (!input.name?.trim()) {
       return 400 { error: 'Name is required' };
     }

  3. Store name in app_metadata:
     app_metadata: {
       ward_id: ward.id,
       role: input.role,
       name: input.name.trim(),  // NEW
     }

  4. Use real name for auto-actor creation (if bishopric):
     const actorName = input.name.trim();
     // (instead of email-derived name)

# --- register-invited-user ---
file: supabase/functions/register-invited-user/index.ts

changes: |
  1. Add 'name' to RegisterInvitedInput interface:
     interface RegisterInvitedInput {
       token: string;
       password: string;
       name: string;  // NEW
     }

  2. Validate name:
     if (!input.name?.trim()) {
       return 400 { error: 'Name is required' };
     }

  3. Store name in app_metadata:
     app_metadata: {
       ward_id: invitation.ward_id,
       role: invitation.role,
       name: input.name.trim(),  // NEW
     }

  4. Auto-create actor for bishopric using real name:
     if (invitation.role === 'bishopric') {
       // Same actor creation logic as register-first-user
       // but using input.name.trim() for the actor name
     }

# --- update-user (renamed from update-user-role) ---
file: supabase/functions/update-user/index.ts (NEW path; delete old update-user-role/)

changes: |
  1. Rename function from update-user-role to update-user
  2. Extend input to accept optional newName:
     interface UpdateUserInput {
       targetUserId: string;
       newRole?: 'bishopric' | 'secretary' | 'observer';
       newName?: string;
     }

  3. Self-edit name:
     - If targetUserId === caller.id AND newName is provided:
       - Validate newName is not empty after trim
       - Update app_metadata.name via admin.updateUserById
       - Skip role change if newRole is not provided
       - Return success with updated name

  4. Admin role change + optional name:
     - If targetUserId !== caller.id AND newRole is provided:
       - Existing role change logic (unchanged)
       - If newName is also provided AND caller has permission:
         update target's name too (optional, lower priority)

  5. Auto-actor creation uses target user's app_metadata.name
     (already there after name is stored) instead of email-derived name

  6. Rename validation: at least one of newRole or newName must be provided

# --- list-users ---
file: supabase/functions/list-users/index.ts

changes: |
  1. Update WardUser interface:
     interface WardUser {
       id: string;
       email: string;
       role: string;
       name: string;  // NEW
       created_at: string;
     }

  2. No logic changes needed -- the RPC already returns the data,
     just need to update the RPC to include the name column (see C9).
```

### C9: Database Migrations (CR-80b)

```yaml
# --- Migration 011: Add user_name to activity_log + update RPC + set existing names ---
file: supabase/migrations/011_user_name_support.sql

changes:
  1_activity_log_column: |
    ALTER TABLE activity_log
    ADD COLUMN user_name TEXT;

  2_update_rpc: |
    CREATE OR REPLACE FUNCTION list_ward_users(target_ward_id uuid)
    RETURNS TABLE (
      id uuid,
      email text,
      role text,
      name text,       -- NEW column
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
        COALESCE(u.raw_app_meta_data->>'name', '') AS name,
        u.created_at
      FROM auth.users u
      WHERE u.raw_app_meta_data->>'ward_id' = target_ward_id::text
      ORDER BY u.created_at ASC;
    $$;

  3_set_existing_user_names: |
    -- Set names for existing users (test data)
    -- This is a one-time migration for the 2 existing test users.
    -- Production users will set their names during registration.
    -- NOTE: app_metadata is in auth.users.raw_app_meta_data (JSONB)
    UPDATE auth.users
    SET raw_app_meta_data = raw_app_meta_data || '{"name": "Aloisio Almeida Jr"}'::jsonb
    WHERE email = 'aloisiojr@gmail.com';

    UPDATE auth.users
    SET raw_app_meta_data = raw_app_meta_data || '{"name": "Bispo Teste"}'::jsonb
    WHERE email = 'bispo@teste.com';
```

### C10: Activity Log Name Support (CR-80b)

```yaml
file: src/lib/activityLog.ts

changes: |
  1. Update logAction signature to accept optional userName:
     export async function logAction(
       wardId: string,
       userId: string,
       userEmail: string,
       actionType: string,
       description: string,
       userName?: string  // NEW optional parameter
     ): Promise<void>

  2. Include user_name in the insert:
     await supabase.from('activity_log').insert({
       ward_id: wardId,
       user_id: userId,
       user_email: userEmail,
       user_name: userName ?? null,  // NEW
       action_type: actionType,
       description,
     });

  3. Update createLogger to accept userName:
     export function createLogger(
       wardId: string,
       userId: string,
       userEmail: string,
       userName?: string
     ) {
       return (actionType: string, description: string) =>
         logAction(wardId, userId, userEmail, actionType, description, userName);
     }

file_2: src/contexts/AuthContext.tsx

changes: |
  Expose userName from app_metadata for use by activity logging
  and other components:

  1. Add userName to AuthContextValue interface:
     userName: string;

  2. Extract userName:
     function extractUserName(user: User | null): string {
       if (!user) return '';
       return user.app_metadata?.name ?? '';
     }

  3. Add to provider value:
     const userName = extractUserName(user);
     // ... in value:
     userName,

callers_update: |
  All hooks that call createLogger need to pass userName.
  The userName comes from useAuth().userName.
  This is a pass-through change in each mutation hook that logs actions.
  Example in useMembers.ts:
    const { wardId, user, userName } = useAuth();
    const logger = createLogger(wardId, user?.id ?? '', user?.email ?? '', userName);
```

### C11: Users Screen i18n Keys (CR-80b)

```yaml
new_i18n_keys:
  users.name:
    pt-BR: "Nome"
    en: "Name"
    es: "Nombre"
  users.editName:
    pt-BR: "Editar nome"
    en: "Edit name"
    es: "Editar nombre"
  users.nameRequired:
    pt-BR: "Nome é obrigatório"
    en: "Name is required"
    es: "Nombre es obligatorio"
  users.nameUpdateSuccess:
    pt-BR: "Nome atualizado com sucesso"
    en: "Name updated successfully"
    es: "Nombre actualizado con éxito"
  users.nameUpdateFailed:
    pt-BR: "Falha ao atualizar nome"
    en: "Failed to update name"
    es: "Error al actualizar nombre"
  users.namePlaceholder:
    pt-BR: "Nome completo"
    en: "Full name"
    es: "Nombre completo"
```

## Data Model Changes

```yaml
migration: 011_user_name_support.sql

changes:
  - table: activity_log
    action: ADD_COLUMN
    column: "user_name TEXT (nullable)"
    reason: "Display user name instead of email in history screen"

  - function: list_ward_users
    action: ALTER (CREATE OR REPLACE)
    change: "Add 'name' column: COALESCE(raw_app_meta_data->>'name', '') AS name"
    reason: "Return user names to the Users screen"

  - data: auth.users
    action: UPDATE (one-time)
    change: "Set raw_app_meta_data.name for 2 existing test users"
    reason: "Pre-populate names for existing users"

no_new_tables: true
no_schema_breaking_changes: true
```

## Flows

### F1: Actor Icon Tap (CR-70)

```
1. User opens ActorSelector bottom sheet
2. Icons ✎ and ✖ render at 28px (was 24px) with 8px padding (was 4px)
3. Gap between icons is 28px (was 20px)
4. hitSlop extends touch area by 16px (was 12px) on each side
5. User taps edit or delete → same behavior as before
6. No functional changes, only visual/touch improvements
```

### F2: Empty CSV Export (CR-77)

```
1. User on Members screen with 0 members
2. Taps "Export CSV"
3. handleExport: memberList = members ?? [] (empty array)
4. generateCsv([]) → "\uFEFFNome,Telefone Completo\n"
5. FileSystem.writeAsStringAsync writes the small file
6. Sharing.shareAsync presents the share sheet (mobile)
   OR Blob download triggers (web)
7. User receives valid CSV with header row only
8. No error dialog
```

### F3: CSV Import Error Display (CR-78)

```
1. User taps "Import CSV", selects a file with errors
2. parseCsv returns { success: false, errors: [
     { line: 3, field: 'Nome', message: 'name_required' },
     { line: 5, field: 'Telefone', message: 'invalid_phone' },
   ]}
3. members.tsx maps error codes to translated messages:
   t('members.csvError.lineError', {
     line: 3,
     field: 'Nome',
     error: t('members.csvError.name_required')
   })
4. Alert.alert shows translated, specific error messages
5. If >5 errors: show first 5 + "...and N more errors"
```

### F4: User Registration with Name (CR-80b)

```
1. New user opens register screen
2. Fills in: Name, Email, Password, Stake, Ward, Role
3. Form validates: name.trim() is not empty
4. Calls register-first-user EF with { ...fields, name }
5. EF validates name is non-empty
6. EF creates ward
7. EF creates user with app_metadata: { ward_id, role, name }
8. If role=bishopric: auto-creates meeting actor with real name
9. EF signs in user, returns session
10. Client sets session, AuthContext picks up name from app_metadata
```

### F5: User Name Edit (CR-80b)

```
1. User navigates to Settings > Users
2. Taps their own user card (isSelf = true)
3. Card expands showing name TextInput with current name
4. User modifies name, taps "Save"
5. updateNameMutation calls update-user EF:
   { targetUserId: self.id, newName: "New Name" }
6. EF validates: caller.id === targetUserId → self-edit allowed
7. EF validates: newName.trim() is not empty
8. EF updates app_metadata.name via admin.updateUserById
9. Client invalidates users query, refreshes session
10. AuthContext picks up new name from refreshed session
```

### F6: Activity Log with Name (CR-80b)

```
1. User performs an action (e.g., creates a member)
2. useMembers hook calls logAction with userName from useAuth()
3. logAction inserts into activity_log with user_name column
4. History screen reads activity_log
5. Displays: user_name when available, falls back to user_email
```

## Security

```yaml
no_new_security_risks: true

notes:
  - "CR-70: Style-only changes, no security impact"
  - "CR-77: No new data access, only fixes empty export"
  - "CR-78: No new data access, only improves error messages"
  - "CR-79: Static UI text, no new data access"
  - "CR-80a: Back button, no security impact"
  - "CR-80b name edit security:"
    - "Name stored in app_metadata (writable only via admin API / Edge Functions)"
    - "Self-edit: EF verifies caller.id === targetUserId"
    - "Name visible only to same-ward users (list-users requires auth + permission)"
    - "Name field has no sensitive data implications"
  - "update-user EF retains all existing permission checks from update-user-role"
  - "Activity log user_name is ward-scoped, visible only via ward-scoped queries"
```

## File Impact Summary

| File | CRs | Change Type | Description |
|------|-----|-------------|-------------|
| `src/components/ActorSelector.tsx` | CR-70 | MODIFY | Increase icon fontSize, padding, gap, hitSlop |
| `src/app/(tabs)/settings/members.tsx` | CR-77, CR-78, CR-79 | MODIFY | Fix empty export, i18n error display, add info section |
| `src/lib/csvUtils.ts` | CR-78 | MODIFY | Return error codes instead of English strings |
| `src/app/(tabs)/settings/users.tsx` | CR-80a, CR-80b | MODIFY | Add back button, name display, name edit |
| `src/app/(auth)/register.tsx` | CR-80b | MODIFY | Add name input field |
| `src/app/(auth)/invite/[token].tsx` | CR-80b | MODIFY | Add name input field |
| `src/lib/activityLog.ts` | CR-80b | MODIFY | Accept and store userName |
| `src/contexts/AuthContext.tsx` | CR-80b | MODIFY | Expose userName from app_metadata |
| `supabase/functions/register-first-user/index.ts` | CR-80b | MODIFY | Accept name, store in app_metadata, use for actor |
| `supabase/functions/register-invited-user/index.ts` | CR-80b | MODIFY | Accept name, store in app_metadata |
| `supabase/functions/update-user/index.ts` | CR-80b | NEW (replaces update-user-role/) | Handle role + name updates |
| `supabase/functions/update-user-role/` | CR-80b | DELETE | Replaced by update-user |
| `supabase/functions/list-users/index.ts` | CR-80b | MODIFY | Update WardUser interface to include name |
| `supabase/migrations/011_user_name_support.sql` | CR-80b | NEW | Add user_name column, update RPC, set existing names |
| `src/i18n/locales/pt-BR.json` | CR-78, CR-79, CR-80b | MODIFY | Add CSV error codes, info section, name field keys |
| `src/i18n/locales/en.json` | CR-78, CR-79, CR-80b | MODIFY | Mirror pt-BR |
| `src/i18n/locales/es.json` | CR-78, CR-79, CR-80b | MODIFY | Mirror pt-BR |
| `src/hooks/useMembers.ts` | CR-80b | MODIFY | Pass userName to createLogger |
| `src/hooks/useSpeeches.ts` | CR-80b | MODIFY | Pass userName to createLogger |
| `src/hooks/useActors.ts` | CR-80b | MODIFY | Pass userName to createLogger |
| `src/hooks/useAgenda.ts` | CR-80b | MODIFY | Pass userName to createLogger |
| `src/hooks/useTopics.ts` | CR-80b | MODIFY | Pass userName to createLogger |

## ADRs

```yaml
adrs:
  - id: ADR-026
    title: "Use error codes in csvUtils.ts instead of English strings"
    context: "parseCsv returns hardcoded English error messages that bypass i18n. Users see untranslated errors."
    decision: "parseCsv returns error code strings (e.g., 'name_required') in the message field. The UI layer maps codes to i18n keys."
    consequences:
      - "csvUtils.ts remains pure (no i18n dependency)"
      - "All error messages are translatable"
      - "Requires mapping in members.tsx but follows existing i18n patterns"

  - id: ADR-027
    title: "Rename update-user-role Edge Function to update-user"
    context: "The EF now handles both role changes and name updates. The old name is too specific."
    decision: "Create new supabase/functions/update-user/ directory with the extended EF. Delete the old update-user-role/ directory. Update client-side callEdgeFunction calls to use 'update-user'."
    consequences:
      - "Requires redeployment of the renamed function"
      - "Old 'update-user-role' function must be deleted from Supabase Dashboard"
      - "Client code must reference the new function name"
      - "At least one of newRole or newName must be provided (validation)"
```

## Risk Assessment

```yaml
risks:
  - id: R-1
    severity: LOW
    cr: CR-77
    description: "Empty CSV file may confuse users who expect member data"
    mitigation: "The export is intentionally headers-only for empty lists. CR-79 adds explanatory text."

  - id: R-2
    severity: LOW
    cr: CR-78
    description: "Error code mapping may miss a code if csvUtils adds new validations"
    mitigation: "Fallback: if i18n key not found, display the raw error code. Add TypeScript const for error codes."

  - id: R-3
    severity: LOW
    cr: CR-80b
    description: "Renaming update-user-role to update-user requires coordinated deployment"
    mitigation: "Deploy new function first, update client, then delete old function."

  - id: R-4
    severity: VERY_LOW
    cr: CR-80b
    description: "Legacy users without name in app_metadata"
    mitigation: "All code uses COALESCE/fallback to empty string. Email is shown as fallback."

  - id: R-5
    severity: LOW
    cr: CR-80b
    description: "refreshSession() after name update may fail silently"
    mitigation: "Even if refresh fails, the next login or app restart will pick up the new name from the server."
```
