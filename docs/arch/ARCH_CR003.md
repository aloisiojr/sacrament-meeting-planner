# ARCH_CR003 - Change Requests Batch 3 (13 CRs)

```yaml
type: arch
version: 2
status: complete
module: ChangeRequests_Batch3
features: [CR-31, CR-32, CR-33, CR-34, CR-35, CR-36, CR-37, CR-38, CR-39, CR-40, CR-41, CR-42, CR-43]
grouped_as:
  F025: [CR-31, CR-34, CR-36, CR-37]  # Spec corrections batch (docs-only)
  F026: [CR-42]                         # CSV export/import fix (CRITICAL)
  F027: [CR-32, CR-43]                  # About screen + Logout button
  F028: [CR-33, CR-40]                  # Navigation & UI conventions
  F029: [CR-35, CR-38]                  # Template & display fixes
  F030: [CR-39]                         # Ward Topics search
  F031: [CR-41]                         # Timezone selector (already implemented)
```

## Overview

```yaml
goal: "Fix critical CSV import/export, add logout button, establish navigation conventions, fix template placeholders, add topics search, and correct spec documentation"
principles:
  - "F025 is docs-only -- no code changes required"
  - "F026 (CSV) is the highest priority -- requires fixing file I/O on mobile using expo-file-system and expo-sharing with static imports"
  - "F027 adds logout to Settings and improves About screen content"
  - "F028 establishes a global back-button convention and resolves add-member button positioning"
  - "F029 removes invalid {duracao} placeholder and adds formatted date to Presentation Mode header"
  - "F030 adds search/filter field to Ward Topics section"
  - "F031 timezone selector already implemented (settings/timezone.tsx) -- verify completeness only"
  - "No new database tables, migrations, or Edge Functions needed"
  - "No new modules -- all changes fit existing M001, M002, M004, M008"
open_questions_resolved:
  - "Q-1: Credits on About screen show developer name via i18n key (customizable per locale)"
  - "Q-2: Support link on About screen hidden by default until configured"
  - "Q-3: Back button implemented per-screen (headerShown: false remains in _layout.tsx)"
  - "Q-4: Ward Topics search filters only Ward Topics, not Collections"
  - "Q-5: expo-document-picker, expo-file-system, expo-sharing already in package.json (confirmed)"
  - "Q-6: import_members RPC exists in migration 007 (confirmed, accepts target_ward_id + new_members)"
  - "Q-7: On sign out, clear React Query cache; keep AsyncStorage theme preference"
```

## Diagram

```
  Affected Modules & Files per CR
  ================================

  F025 (Spec corrections -- docs only):
  CR-31 (ASM-009 fix)             --> docs/specs only (no code)
  CR-34 (Actors spec update)      --> docs/specs only (no code)
  CR-36 (Debounce spec)           --> docs/specs only (no code)
  CR-37 (Secretary spec update)   --> docs/specs only (no code)

  F026 (CSV fix -- CRITICAL):
  CR-42 (CSV import/export)       --> UIShell: members.tsx (static imports,
                                       export via expo-file-system + expo-sharing,
                                       import via expo-document-picker + expo-file-system)

  F027 (About + Logout):
  CR-32 (About screen content)    --> UIShell: about.tsx (credits, support link)
  CR-43 (Logout button)           --> UIShell: settings/index.tsx (add signOut item),
                                       AuthModule: AuthContext.tsx (signOut function)

  F028 (Navigation conventions):
  CR-33 (Global back button)      --> UIShell: members.tsx (add back button),
                                       docs/SPEC.final.md (convention rule)
  CR-40 (Add member button)       --> Spec only: resolve PRODUCT_SPECIFICATION vs
                                       SPEC.final.md inconsistency

  F029 (Template & display fixes):
  CR-35 (Remove {duracao})        --> UIShell: whatsapp.tsx (PLACEHOLDERS, SAMPLE_DATA),
                                       lib/whatsappUtils.ts (interface + resolver),
                                       SPEC_F024.md
  CR-38 (Presentation date)       --> AgendaModule: presentation.tsx (formatted header),
                                       lib/dateUtils.ts (formatFullDate function)

  F030 (Topics search):
  CR-39 (Ward Topics search)      --> UIShell: topics.tsx (add search TextInput + filter)

  F031 (Timezone selector):
  CR-41 (Timezone spec)           --> Already implemented (settings/timezone.tsx) -- docs only
```

## Change Request Analysis

### F025: Spec Corrections (CR-31, CR-34, CR-36, CR-37) -- DOCS ONLY

**Impact:** Documentation only -- zero code changes

```yaml
cr-31:
  title: "Fix ASM-009 Contradiction About Secretary Designation Permission"
  problem: "ASM-009 says 'Secretario NAO designa em NENHUMA tela' but ASM-AGD-003
    and section 4.2 say Secretary CAN designate via Agenda tab."
  action: |
    Update ASM-009 text from:
      'Secretario NAO designa em nenhuma tela'
    To:
      'Secretario NAO designa pela aba Discursos nem Home, mas PODE
       designar pela aba Agenda (excecao documentada em ASM-AGD-003)'
  files:
    - docs/specs/SPEC_F023.md (clarify ASM-009 note)

cr-34:
  title: "Update Specs to Reflect CR-26 Actor Changes"
  problem: "RF-22 and SPEC 7.13.4 still describe checkboxes for actor role selection.
    CR-26 changed this to name-only input with role inference."
  action: "Update both input documents to describe the new flow: name-only input,
    role inferred from clicked field, bottom-sheet dialog pattern."
  files:
    - docs/specs/SPEC_F013.md (update AC for actor creation)

cr-36:
  title: "Define Debounce Rules for Auto-Save Text Fields"
  problem: "No debounce spec for auto-save text fields. CR-27 implemented
    DebouncedTextInput but the spec was never updated."
  action: "Add rule to SPEC_F012.md: 500ms minimum debounce, local state with
    useState, cursor and selection preserved, flush on blur/unmount."
  files:
    - docs/specs/SPEC_F012.md (add Technical Note)

cr-37:
  title: "Update Docs for Secretary User Management Permission"
  problem: "SPEC.final.md section 7.8 says 'Users card visible only for Bishopric'.
    Section 4.2 says 'Manage users: Secretary=No'. Both outdated after CR-23."
  action: "Update both sections and the derived specs to reflect Secretary access."
  files:
    - docs/specs/SPEC_F023.md (update permission matrix)
    - docs/specs/SPEC_F018.md (update visibility note)
  note: "src/lib/permissions.ts already has settings:users in the secretary set."
```

---

### F026: CSV Export/Import Fix (CR-42) -- CRITICAL

**Module:** WardDataModule (M002) / MemberManagementScreen
**Affected files:** `src/app/(tabs)/settings/members.tsx`
**Impact:** Fix platform file I/O

```yaml
problem: "Both CSV export and import buttons do not work on mobile.
  Root cause: dynamic imports (await import('react-native'), await import('expo-document-picker'),
  await import('expo-file-system')) fail silently in Expo/Metro bundler because
  Metro resolves all imports at build time. Additionally, export uses RN Share
  which sends CSV as plain text, not as a file attachment."

root_cause_analysis:
  export:
    current_code: |
      // Line 356-358: Dynamic import of RN Share
      const { Share: RNShare } = await import('react-native');
      await RNShare.share({ message: csv, title: 'membros.csv' });
    problems:
      - "await import('react-native') may not resolve correctly in Metro"
      - "RN Share.share({message}) sends as plain text, not as a file"
    fix: "Static import + write to temp file + expo-sharing"

  import:
    current_code: |
      // Lines 424-432: Dynamic imports of Expo modules
      const DocumentPicker = await import('expo-document-picker');
      const FileSystem = await import('expo-file-system');
    problems:
      - "Dynamic imports may fail silently in Metro bundler"
      - "MIME type 'text/csv' may not work on all Android versions"
    fix: "Static imports + broader MIME type array"

solution: "Replace ALL dynamic imports with static imports at file top.
  Use expo-sharing instead of RN Share for proper file export."

changes:
  - file: src/app/(tabs)/settings/members.tsx
    section: imports
    action: |
      Add static imports at top of file (replace dynamic imports):
        import * as DocumentPicker from 'expo-document-picker';
        import * as FileSystem from 'expo-file-system';
        import * as Sharing from 'expo-sharing';

  - file: src/app/(tabs)/settings/members.tsx
    section: handleExport (lines 340-362)
    action: |
      Replace mobile export block (lines 353-361) with:
        try {
          const fileUri = FileSystem.documentDirectory + 'membros.csv';
          await FileSystem.writeAsStringAsync(fileUri, csv, {
            encoding: FileSystem.EncodingType.UTF8,
          });
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: t('members.exportCsv'),
            UTI: 'public.comma-separated-values-text',
          });
        } catch (err: any) {
          if (err?.message !== 'User did not share') {
            Alert.alert(t('common.error'), t('members.exportFailed'));
          }
        }

  - file: src/app/(tabs)/settings/members.tsx
    section: handleImport (lines 408-438)
    action: |
      Replace mobile import block with direct references to static imports:
        try {
          const result = await DocumentPicker.getDocumentAsync({
            type: ['text/csv', 'text/comma-separated-values',
                   'application/csv', 'text/plain'],
            copyToCacheDirectory: true,
          });
          if (result.canceled || !result.assets?.[0]) return;
          const content = await FileSystem.readAsStringAsync(result.assets[0].uri);
          importMutation.mutate(content);
        } catch {
          Alert.alert(t('common.error'), t('members.importFailed'));
        }

  - file: src/i18n/locales/pt-BR.json
    action: |
      Add keys:
      "members.exportFailed": "Falha ao exportar arquivo"
      "members.importFailed": "Falha ao importar arquivo"

  - file: src/i18n/locales/en.json
    action: |
      Add keys:
      "members.exportFailed": "Failed to export file"
      "members.importFailed": "Failed to import file"

  - file: src/i18n/locales/es.json
    action: |
      Add keys:
      "members.exportFailed": "Error al exportar archivo"
      "members.importFailed": "Error al importar archivo"

contract:
  export_flow: |
    1. User taps "Export CSV"
    2. generateCsv() creates CSV string from members array
    3. Web: Blob download (existing code, works)
    4. Mobile: write CSV to documentDirectory/membros.csv via expo-file-system
    5. expo-sharing opens native share sheet with the CSV file
    6. User can save to Files, AirDrop, email, etc.
  import_flow: |
    1. User taps "Import CSV"
    2. expo-document-picker opens file picker (broad MIME types)
    3. User selects .csv or .txt file
    4. expo-file-system reads file content as string
    5. parseCsv() validates and parses
    6. RPC import_members_overwrite executes atomic overwrite (migration 007)
    7. Success: invalidate query cache, show alert with imported count
    8. Error: show error alert with validation details

dependencies_verified:
  - "expo-file-system: ~19.0.21 (in package.json)"
  - "expo-sharing: ~14.0.8 (in package.json)"
  - "expo-document-picker: ~14.0.8 (in package.json)"
  - "import_members RPC: migration 007 (supabase/migrations/007_import_members_rpc.sql)"
```

---

### F027: About Screen + Logout Button (CR-32, CR-43)

**Module:** UIShell (M008) + AuthModule (M001)
**Affected files:** `src/app/(tabs)/settings/about.tsx`, `src/app/(tabs)/settings/index.tsx`
**Impact:** New UI elements, auth flow

#### CR-32: About Screen Content

```yaml
problem: "About screen only shows app name and version. Missing: credits,
  author info, support link."
solution: "Add credits and optional support link rows to existing about.tsx."
changes:
  - file: src/app/(tabs)/settings/about.tsx
    action: |
      Add two new info rows to the existing section View:

      1. Credits row:
         <View style={[styles.infoRow, { borderTopColor: colors.divider, borderTopWidth: StyleSheet.hairlineWidth }]}>
           <Text style={[styles.label, { color: colors.textSecondary }]}>
             {t('about.credits')}
           </Text>
           <Text style={[styles.value, { color: colors.text }]}>
             {t('about.creditsValue')}
           </Text>
         </View>

      2. Support row (optional, only if URL is configured):
         Import Linking from expo-linking.
         Define SUPPORT_URL constant (can be email mailto: or https:).
         Only render if SUPPORT_URL is defined.

  - file: src/i18n/locales/pt-BR.json
    action: |
      Add keys:
      "about.credits": "Creditos"
      "about.creditsValue": "Desenvolvido por [Nome do Desenvolvedor]"
      "about.support": "Suporte"

  - file: src/i18n/locales/en.json
    action: |
      Add keys:
      "about.credits": "Credits"
      "about.creditsValue": "Developed by [Developer Name]"
      "about.support": "Support"

  - file: src/i18n/locales/es.json
    action: |
      Add keys:
      "about.credits": "Creditos"
      "about.creditsValue": "Desarrollado por [Nombre del Desarrollador]"
      "about.support": "Soporte"
```

#### CR-43: Logout Button

```yaml
problem: "No way to log out from the app."
solution: "Add a 'Sign Out' button at the bottom of the Settings screen
  with confirmation dialog. Uses supabase.auth.signOut()."
changes:
  - file: src/app/(tabs)/settings/index.tsx
    action: |
      1. Import Alert at top (already imported? verify).
         Import supabase from lib/supabase.

      2. Add handleSignOut function:
         const handleSignOut = useCallback(() => {
           Alert.alert(
             t('settings.signOutConfirmTitle'),
             t('settings.signOutConfirmMessage'),
             [
               { text: t('common.cancel'), style: 'cancel' },
               {
                 text: t('settings.signOut'),
                 style: 'destructive',
                 onPress: async () => {
                   try {
                     queryClient.clear();
                     await supabase.auth.signOut();
                   } catch (err) {
                     Alert.alert(t('common.error'), String(err));
                   }
                 },
               },
             ]
           );
         }, [queryClient, t]);

      3. Add Sign Out button AFTER the last settings section, inside ScrollView:
         <Pressable
           style={[styles.signOutButton, { borderColor: colors.destructive ?? colors.error ?? '#FF3B30' }]}
           onPress={handleSignOut}
           accessibilityRole="button"
         >
           <Text style={[styles.signOutText, { color: colors.destructive ?? colors.error ?? '#FF3B30' }]}>
             {t('settings.signOut')}
           </Text>
         </Pressable>

      4. Add styles:
         signOutButton: {
           marginHorizontal: 16,
           marginTop: 24,
           marginBottom: 40,
           paddingVertical: 14,
           borderRadius: 12,
           borderWidth: 1,
           alignItems: 'center',
         },
         signOutText: {
           fontSize: 16,
           fontWeight: '600',
         },

  - file: src/i18n/locales/pt-BR.json
    action: |
      Add keys:
      "settings.signOut": "Sair"
      "settings.signOutConfirmTitle": "Sair"
      "settings.signOutConfirmMessage": "Tem certeza que deseja sair da sua conta?"

  - file: src/i18n/locales/en.json
    action: |
      Add keys:
      "settings.signOut": "Sign Out"
      "settings.signOutConfirmTitle": "Sign Out"
      "settings.signOutConfirmMessage": "Are you sure you want to sign out?"

  - file: src/i18n/locales/es.json
    action: |
      Add keys:
      "settings.signOut": "Cerrar Sesion"
      "settings.signOutConfirmTitle": "Cerrar Sesion"
      "settings.signOutConfirmMessage": "Esta seguro de que desea cerrar sesion?"

contract:
  flow: |
    1. User scrolls to bottom of Settings screen
    2. Taps "Sign Out" button (destructive/red style, outlined)
    3. Confirmation dialog: Cancel / Sign Out
    4. User taps "Sign Out"
    5. queryClient.clear() removes all cached data
    6. supabase.auth.signOut() clears session
    7. AuthContext.onAuthStateChange detects SIGNED_OUT event
    8. AuthContext sets session to null
    9. Root _layout.tsx session guard redirects to (auth)/login

  edge_cases:
    - "If signOut fails (network error): error alert, user stays on Settings"
    - "If offline: local session cleared, redirect to login. Server session expires naturally."
    - "After sign out: back navigation cannot return to authenticated screens (session guard)"
    - "All roles see the Sign Out button (no permission restriction)"
    - "Pending offline mutations lost on sign-out (acceptable per ADR-008)"
    - "AsyncStorage theme preference preserved (desirable)"
```

---

### F028: Navigation & UI Conventions (CR-33, CR-40)

**Module:** UIShell (M008)
**Affected files:** `src/app/(tabs)/settings/members.tsx`, documentation

#### CR-33: Global Back Button Convention

```yaml
problem: "No global convention for back buttons. Members screen is the only
  settings sub-screen WITHOUT a back button. All other screens (about, history,
  whatsapp, topics, users, timezone, theme) already have back buttons
  following the About screen pattern."
solution: "Add back button to Members screen. Document the convention in specs."
changes:
  - file: src/app/(tabs)/settings/members.tsx
    action: |
      1. useRouter is already available (check) or add:
         import { useRouter } from 'expo-router';
         const router = useRouter();

      2. Restructure header from:
         <View style={styles.header}>
           <Text style={[styles.title, ...]}>Members</Text>
           {canWrite && <Pressable ...>+</Pressable>}
         </View>

         To (3-element layout matching about.tsx):
         <View style={styles.header}>
           <Pressable onPress={() => router.back()} accessibilityRole="button">
             <Text style={[styles.backButton, { color: colors.primary }]}>
               {t('common.back')}
             </Text>
           </Pressable>
           <Text style={[styles.headerTitle, { color: colors.text }]}>
             {t('members.title')}
           </Text>
           {canWrite ? (
             <Pressable style={[styles.addButton, ...]} onPress={handleAdd}>
               <Text ...>+</Text>
             </Pressable>
           ) : (
             <View style={styles.headerSpacer} />
           )}
         </View>

      3. Update header styles:
         header: {
           flexDirection: 'row',
           alignItems: 'center',
           justifyContent: 'space-between',
           paddingHorizontal: 16,
           paddingVertical: 12,
         },
         backButton: { fontSize: 16, fontWeight: '600' },
         headerTitle: { fontSize: 18, fontWeight: '700' },
         headerSpacer: { width: 36 },  // matches addButton width

  - file: docs/specs (convention documentation)
    action: |
      Document global rule:
        "Every screen accessed via Stack navigation MUST have a back button
         in the header. Pattern: Pressable with t('common.back') text,
         onPress={() => router.back()}, left-aligned.
         Exceptions: tab root screens and Presentation Mode."

note: "settings/_layout.tsx remains unchanged (headerShown: false stays).
  Each screen implements its own back button per the established pattern."
```

#### CR-40: Add Member Button Position

```yaml
problem: "PRODUCT_SPECIFICATION says '+' to the right of search field.
  SPEC.final.md says FAB in bottom-right. Code has it in header (right of title)."
solution: "Keep current implementation. Resolve spec inconsistency in docs."
changes:
  - file: docs/specs/SPEC_F003.md
    action: "Add note: '+' button is in the header row to the right of the title
      (matching PRODUCT_SPECIFICATION RF-01). SPEC.final.md FAB reference is superseded."
code_changes: none
```

---

### F029: Template & Display Fixes (CR-35, CR-38)

**Module:** UIShell (M008), AgendaModule (M004)

#### CR-35: Remove {duracao} Placeholder

```yaml
problem: "Placeholder {duracao} is listed in PLACEHOLDERS constant (whatsapp.tsx line 23)
  and in specs, but speeches table has no duration column. Duration is derived from
  position (1=5min, 2=10min, 3=15min) but this derivation is NOT implemented in
  whatsappUtils.ts resolveTemplate()."
solution: "Remove {duracao} from all locations."
changes:
  - file: src/app/(tabs)/settings/whatsapp.tsx
    action: |
      1. Remove '{duracao}' from PLACEHOLDERS array (line 23):
         Before: ['{nome}', '{data}', '{posicao}', '{duracao}', '{colecao}', '{titulo}', '{link}']
         After:  ['{nome}', '{data}', '{posicao}', '{colecao}', '{titulo}', '{link}']

      2. Remove '{duracao}' entry from SAMPLE_DATA object

  - file: src/lib/whatsappUtils.ts
    action: |
      1. Remove duration? field from WhatsAppVariables interface
      2. Remove the line: result = result.replace(/\{duracao\}/g, vars.duration ?? '');
      3. Update file header comment to list 6 placeholders (not 7)

  - file: docs/specs/SPEC_F024.md
    action: "Remove {duracao} from placeholder list"

edge_cases:
  - "Existing wards with {duracao} in custom template: literal '{duracao}' will
    appear in sent messages. Users edit manually. NOT auto-migrated."
```

#### CR-38: Presentation Mode Date Header

```yaml
problem: "Presentation Mode header does not show the meeting date in a
  human-readable format. Should show 'Domingo, 16 de Fevereiro de 2026'."
solution: "Add formatFullDate() to dateUtils.ts. Display in presentation header."
changes:
  - file: src/lib/dateUtils.ts
    action: |
      Add DAY_NAMES constant and formatFullDate function.

      MONTH_NAMES already exists (added by CR-22 for formatDateHumanReadable).

      const DAY_NAMES: Record<SupportedLanguage, string[]> = {
        'pt-BR': ['Domingo','Segunda-feira','Terca-feira','Quarta-feira',
                  'Quinta-feira','Sexta-feira','Sabado'],
        en: ['Sunday','Monday','Tuesday','Wednesday',
             'Thursday','Friday','Saturday'],
        es: ['Domingo','Lunes','Martes','Miercoles',
             'Jueves','Viernes','Sabado'],
      };

      export function formatFullDate(
        dateStr: string,
        language: SupportedLanguage = 'pt-BR'
      ): string {
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const dayName = DAY_NAMES[language][date.getDay()];
        const humanDate = formatDateHumanReadable(dateStr, language);
        return `${dayName}, ${humanDate}`;
      }

  - file: src/app/presentation.tsx
    action: |
      1. Import formatFullDate from '../lib/dateUtils'
      2. Import getCurrentLanguage from '../i18n'
      3. Compute formatted date:
         const formattedDate = formatFullDate(sundayDate, getCurrentLanguage());
      4. Display in header (below title or as subtitle):
         <Text style={[styles.dateHeader, { color: colors.textSecondary }]}>
           {formattedDate}
         </Text>
      5. Add style:
         dateHeader: { fontSize: 16, textAlign: 'center', marginBottom: 8 }

contract:
  examples:
    - input: ("2026-02-15", "pt-BR")
      output: "Domingo, 15 de Fevereiro de 2026"
    - input: ("2026-02-15", "en")
      output: "Sunday, February 15, 2026"
    - input: ("2026-02-15", "es")
      output: "Domingo, 15 de Febrero de 2026"

edge_cases:
  - "If opened on a non-Sunday, day name reflects the actual day"
  - "Uses ward language (getCurrentLanguage()), not device locale"
  - "Reuses MONTH_NAMES from CR-22 -- no duplication"
```

---

### F030: Ward Topics Search (CR-39)

**Module:** UIShell (M008) / TopicsManagementScreen
**Affected files:** `src/app/(tabs)/settings/topics.tsx`
**Impact:** UI enhancement -- search/filter for ward topics list

```yaml
problem: "Ward Topics screen has no search/filter field. Users with many
  custom topics cannot quickly find a specific one."
solution: "Add a search TextInput above the Ward Topics list. Filter by title
  (case-insensitive substring match). Collections section NOT affected."
changes:
  - file: src/app/(tabs)/settings/topics.tsx
    action: |
      1. Add state:
         const [topicSearch, setTopicSearch] = useState('');

      2. Add filtered topics memo:
         const filteredTopics = useMemo(() => {
           if (!topicSearch.trim()) return wardTopics;
           const query = topicSearch.toLowerCase();
           return wardTopics?.filter((topic) =>
             topic.title.toLowerCase().includes(query)
           ) ?? [];
         }, [wardTopics, topicSearch]);

      3. Add search TextInput below the Ward Topics section title row,
         above the topic cards list:
         <TextInput
           style={[styles.topicSearchInput, {
             color: colors.text,
             borderColor: colors.inputBorder,
             backgroundColor: colors.inputBackground,
           }]}
           value={topicSearch}
           onChangeText={setTopicSearch}
           placeholder={t('common.search')}
           placeholderTextColor={colors.placeholder}
           autoCapitalize="none"
           autoCorrect={false}
         />

      4. Replace wardTopics with filteredTopics in the rendering map/FlatList.

      5. Add style (matching members.tsx searchInput pattern):
         topicSearchInput: {
           height: 40,
           borderWidth: 1,
           borderRadius: 8,
           paddingHorizontal: 12,
           fontSize: 15,
           marginHorizontal: 16,
           marginBottom: 8,
         },

contract:
  behavior: |
    - Search field appears above Ward Topics list (below section header)
    - Typing filters topics by title (case-insensitive, substring match)
    - Empty search shows all topics (sorted alphabetically)
    - No matches: topic list is empty (existing empty state applies)
    - Collections section always fully visible (not affected by search)
    - Search state resets on navigation away (local useState)
  edge_cases:
    - "Special regex characters treated as literal (.includes, not regex)"
    - "Adding a new topic while search is active: new topic appears if it
       matches the current filter"
```

---

### F031: Timezone Selector (CR-41) -- ALREADY IMPLEMENTED

**Module:** UIShell (M008) / TimezoneScreen
**Impact:** Documentation only

```yaml
status: "ALREADY IMPLEMENTED"
verification: |
  The file src/app/(tabs)/settings/timezone.tsx (300 lines) provides:
  - Back button in header (matching About screen pattern)
  - Screen title: t('timezoneSelector.title')
  - Current timezone displayed in a highlight card
  - Search/filter TextInput with case-insensitive matching
  - FlatList of 60+ IANA timezone strings sorted alphabetically
  - Radio-style selection with checkmark for current timezone
  - Save via Supabase: wards.timezone update
  - Activity log entry on change
  - Error alert on save failure
  - Success alert + router.back() on save

  Settings index has the menu item gated by hasPermission('settings:timezone')

  No code changes needed. Only spec documentation needs updating.

changes:
  - file: docs/specs/SPEC_F002.md
    action: "Add timezone selector section documenting the existing implementation"
```

---

## Data Model Changes

```yaml
migrations: none
tables_affected: none
edge_functions_affected: none
note: "All CRs in batch 3 work with existing schema.
  import_members RPC exists in migration 007.
  No new tables, columns, or constraints needed."
```

---

## Impact on Existing Modules

| Module | CRs | Severity |
|--------|-----|----------|
| M001 AuthModule | CR-43 | Low (signOut via supabase.auth.signOut()) |
| M002 WardDataModule | CR-42 | **High** (fix CSV handlers, static imports) |
| M003 SpeechModule | CR-35 | Low (remove 1 placeholder from whatsappUtils) |
| M004 AgendaModule | CR-38 | Low (add date display in presentation header) |
| M005 NotificationModule | - | None |
| M006 SyncEngine | - | None |
| M007 OfflineManager | - | None |
| M008 UIShell | CR-32, CR-33, CR-39 | Medium (About, back button, Topics search) |
| Specs only | CR-31, CR-34, CR-36, CR-37, CR-40, CR-41 | None (documentation) |

---

## Cross-cutting Changes

| Area | Changes |
|------|---------|
| i18n (all 3 locales) | CR-32 (about credits/support), CR-42 (export/import errors), CR-43 (sign out) |
| DateUtils | CR-38 (add DAY_NAMES + formatFullDate) |
| WhatsApp template | CR-35 (remove {duracao} from PLACEHOLDERS, SAMPLE_DATA, whatsappUtils) |
| Navigation | CR-33 (Members back button + global convention documentation) |
| Specs/Docs | CR-31, CR-34, CR-36, CR-37, CR-40, CR-41 (documentation only) |

---

## Feature Grouping

| Feature | CRs | Type | Priority |
|---------|-----|------|----------|
| F025: Spec corrections batch | CR-31, CR-34, CR-36, CR-37 | Doc only | Normal |
| F026: CSV export/import fix | CR-42 | Critical bug | **High** |
| F027: About screen + Logout | CR-32, CR-43 | UI + Feature | Normal |
| F028: Navigation & UI conventions | CR-33, CR-40 | UI + Doc | Normal |
| F029: Template & display fixes | CR-35, CR-38 | Code + Doc | Normal |
| F030: Ward Topics search | CR-39 | UI enhancement | Normal |
| F031: Timezone selector | CR-41 | Doc only | Low |

---

## Execution Order (Dependencies)

```
Phase 0 (docs-only -- can be done anytime, no code):
  F025  Spec corrections (CR-31, CR-34, CR-36, CR-37)
  F031  Timezone selector spec (CR-41)

Phase 1 (CRITICAL -- highest priority, no dependencies):
  F026  CSV export/import fix (CR-42)

Phase 2 (independent code changes, any order):
  F027  About screen + Logout (CR-32, CR-43)
  F029  Template & display fixes (CR-35, CR-38)
  F030  Ward Topics search (CR-39)

Phase 3 (benefits from Phase 2 being done):
  F028  Navigation & UI conventions (CR-33, CR-40)
         -- CR-33 adds back button to Members screen
         -- Should be done after other members.tsx changes (CR-42)
         -- CR-40 is docs only

Note: All code features are independent of each other. Phases are advisory
for optimal ordering. The only practical constraint is that CR-33 (Members
back button) and CR-42 (Members CSV fix) both modify members.tsx, so doing
CR-42 first and CR-33 second avoids merge conflicts.
```

---

## Risk Assessment

```yaml
risks:
  - id: R-1
    severity: HIGH
    cr: CR-42
    description: "CSV export/import is non-functional. Root cause is dynamic
      imports failing silently in Expo/Metro bundler."
    mitigation: "Replace dynamic imports with static imports at file top.
      Use expo-sharing (already in package.json) instead of RN Share.
      expo-file-system, expo-document-picker, expo-sharing all confirmed
      in package.json dependencies."

  - id: R-2
    severity: MEDIUM
    cr: CR-43
    description: "Sign out must clear React Query cache and redirect correctly.
      If session guard in _layout.tsx doesn't trigger, user stays on
      authenticated screens with stale data."
    mitigation: "AuthContext.onAuthStateChange already handles SIGNED_OUT event
      and sets session to null. queryClient.clear() called before signOut()
      to prevent stale data on re-login. Session guard in root layout
      already tested with initial login flow."

  - id: R-3
    severity: MEDIUM
    cr: CR-38
    description: "Date formatting must use ward language, not device locale.
      formatFullDate depends on MONTH_NAMES from CR-22 existing in dateUtils.ts."
    mitigation: "MONTH_NAMES already exists (verified in dateUtils.ts).
      getCurrentLanguage() is well-tested throughout the app."

  - id: R-4
    severity: LOW
    cr: CR-35
    description: "Removing {duracao} from WhatsAppVariables interface may
      break existing code that passes duration."
    mitigation: "Search for 'duration' usage confirms no call site provides
      a duration value. The field was always optional (duration?: string)."

  - id: R-5
    severity: LOW
    cr: CR-33
    description: "Adding back button to Members screen changes header layout.
      The '+' add button must remain accessible."
    mitigation: "Follow the same 3-element header pattern as About screen:
      back button (left), title (center), add button or spacer (right).
      Pattern is proven in 7+ existing screens."
```

---

## ADRs

```yaml
adrs:
  - id: ADR-017
    title: "Static imports for Expo SDK modules in CSV handlers"
    context: "Dynamic imports (await import('expo-document-picker')) fail silently
      in Expo/Metro because Metro resolves all imports at build time, not runtime."
    decision: "Use static imports at file top for expo-document-picker,
      expo-file-system, and expo-sharing. Use Platform.OS for conditional logic."
    consequences:
      - "CSV export and import work correctly on both mobile and web"
      - "Slightly larger initial bundle (modules loaded even on web)"
      - "No silent failures -- errors are caught and displayed"

  - id: ADR-018
    title: "Per-screen back buttons instead of global headerLeft"
    context: "Settings _layout.tsx has headerShown: false for custom screen layouts.
      Global headerLeft in screenOptions cannot work without native headers."
    decision: "Each screen implements its own back button following the About
      screen pattern. Convention documented in specs."
    consequences:
      - "Consistent pattern across all 8+ settings sub-screens"
      - "Slight duplication (~6 lines per screen)"
      - "Screens retain full control over header layout (e.g. Members screen
        has back + title + add button)"
```

---

## File Impact Summary

| File | CRs | Change Type |
|------|-----|-------------|
| `src/app/(tabs)/settings/members.tsx` | CR-33, CR-42 | **CRITICAL**: Fix CSV (static imports, expo-sharing) + add back button |
| `src/app/(tabs)/settings/index.tsx` | CR-43 | Add Sign Out button with confirmation |
| `src/app/(tabs)/settings/about.tsx` | CR-32 | Add credits and optional support link rows |
| `src/app/(tabs)/settings/topics.tsx` | CR-39 | Add search TextInput + filter logic |
| `src/app/(tabs)/settings/whatsapp.tsx` | CR-35 | Remove {duracao} from PLACEHOLDERS + SAMPLE_DATA |
| `src/app/presentation.tsx` | CR-38 | Add formatted date header |
| `src/lib/dateUtils.ts` | CR-38 | Add DAY_NAMES constant + formatFullDate() |
| `src/lib/whatsappUtils.ts` | CR-35 | Remove {duracao} from interface + resolver |
| `src/i18n/locales/pt-BR.json` | CR-32, CR-42, CR-43 | about.credits, export/import errors, signOut |
| `src/i18n/locales/en.json` | CR-32, CR-42, CR-43 | Mirror pt-BR |
| `src/i18n/locales/es.json` | CR-32, CR-42, CR-43 | Mirror pt-BR |
| `docs/specs/SPEC_F002.md` | CR-41 | Timezone selector spec |
| `docs/specs/SPEC_F003.md` | CR-40 | Resolve button positioning note |
| `docs/specs/SPEC_F012.md` | CR-36 | Add debounce technical note |
| `docs/specs/SPEC_F013.md` | CR-34 | Update actor creation flow |
| `docs/specs/SPEC_F018.md` | CR-37 | Update secretary visibility |
| `docs/specs/SPEC_F023.md` | CR-31, CR-37 | Fix ASM-009, update permissions |
| `docs/specs/SPEC_F024.md` | CR-35 | Remove {duracao} placeholder |
