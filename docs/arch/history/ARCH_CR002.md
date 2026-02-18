# ARCH_CR002 - Change Requests Batch 2 (20 CRs)

```yaml
type: arch
version: 2
status: complete
module: ChangeRequests_Batch2
features: [CR-11, CR-12, CR-13, CR-14, CR-15, CR-16, CR-17, CR-18, CR-19, CR-20, CR-21, CR-22, CR-23, CR-24, CR-25, CR-26, CR-27, CR-28, CR-29, CR-30]
```

## Overview

```yaml
goal: "Fix 20 bugs and UI improvements including a major actors-management redesign, text input fixes, agenda section relabeling, and multiple navigation/UX enhancements"
principles:
  - "No new database tables -- only a possible unique constraint migration for UPSERT (CR-24)"
  - "Edge Function updated only for default WhatsApp template (CR-13/14)"
  - "ActorSelector rewrite is the only structural component change; all other CRs are localized fixes"
  - "Debounced auto-save pattern replaces keystroke-level mutation calls to fix text input bugs"
  - "Back buttons and navigation fixes follow existing About screen pattern for consistency"
  - "Activity log descriptions generated at write time in the ward's language"
open_questions_resolved:
  - "Q-1: Secretary gets full CRUD for user management (settings:users added)"
  - "Q-2: Adding actor from conducting field sets can_conduct=true AND can_preside=true"
  - "Q-3: recognized_names stays free-text (NOT actor selector)"
  - "Q-5: Default WhatsApp template kept in Portuguese (ward language); users customize via screen"
  - "Q-6: For 'other' type sundays, custom_reason used as section header"
```

## Diagram

```
  Affected Modules & Files per CR
  ================================

  CR-11 (Language on start)        --> AuthModule: AuthContext.tsx, i18n/index.ts
  CR-12 (WhatsApp title)           --> UIShell: i18n locales
  CR-13 (Remove {tema})            --> UIShell: whatsapp.tsx, Edge Function default
  CR-14 (Default template)         --> UIShell: Edge Function default, whatsapp.tsx
  CR-15 (Clickable placeholders)   --> UIShell: whatsapp.tsx (TextInput selection)
  CR-16 (WhatsApp layout)          --> UIShell: whatsapp.tsx (styles)
  CR-17 (WhatsApp back button)     --> UIShell: whatsapp.tsx (header)
  CR-18 (Log sunday type change)   --> WardDataModule: useSundayTypes.ts
  CR-19 (History back button)      --> UIShell: history.tsx (header)
  CR-20 (Topics back button)       --> UIShell: topics.tsx (header)
  CR-21 (Topics add button)        --> UIShell: topics.tsx (section header)
  CR-22 (Human-readable log)       --> WardDataModule: useSundayTypes.ts, useMembers.ts,
                                       useSpeeches.ts, useActors.ts, useTopics.ts,
                                       useAgenda.ts, dateUtils.ts
  CR-23 (Secretary permissions)    --> AuthModule: permissions.ts
  CR-24 (Sunday dropdown fix)      --> SpeechModule: useSundayTypes.ts (upsert fix)
  CR-25 (Agenda scroll position)   --> AgendaModule: agenda.tsx
  CR-26 (Actors redesign)          --> AgendaModule: AgendaForm.tsx (ActorSelectorDialog),
                                       settings/index.tsx, settings/actors.tsx (REMOVE),
                                       useActors.ts, i18n locales
  CR-27 (Text input fix)           --> AgendaModule: AgendaForm.tsx (DebouncedTextInput)
  CR-28 (Hymn dialog sizing)       --> AgendaModule: AgendaForm.tsx (modal style)
  CR-29 (Agenda section labels)    --> AgendaModule: AgendaForm.tsx, agenda.tsx, i18n locales
  CR-30 (Musical number rename)    --> AgendaModule: AgendaForm.tsx, i18n locales
```

## Change Request Analysis

### CR-11: App Language Defaults to English on Expo Start

**Module:** AuthModule (M001)
**Affected files:** `src/contexts/AuthContext.tsx`, `src/i18n/index.ts`
**Impact:** i18n initialization lifecycle

```yaml
problem: "initI18n() runs at module import time (i18n/index.ts line 106) before
  AuthContext loads ward data, so it always uses device locale. The ward language
  is never applied on startup."
solution: "In AuthContext, after session loads and wardId is available, fetch
  ward.language and call changeLanguage(ward.language) to override the
  initial device-locale choice."
changes:
  - file: src/contexts/AuthContext.tsx
    action: |
      Add useEffect that watches wardId. When wardId becomes available,
      fetch ward.language from Supabase and call initI18n(language):
      useEffect(() => {
        if (!wardId) return;
        supabase.from('wards').select('language').eq('id', wardId).single()
          .then(({ data }) => {
            if (data?.language) {
              initI18n(data.language as SupportedLanguage);
            }
          });
      }, [wardId]);
  - file: src/i18n/index.ts
    action: "No change needed -- initI18n() already handles re-initialization
      via i18n.changeLanguage() when already initialized (line 86-88)"
contract:
  flow: |
    1. App starts -> initI18n() uses device locale (temporary)
    2. AuthContext loads session + derives wardId from app_metadata
    3. useEffect fires -> fetch ward.language from Supabase
    4. Call initI18n(ward.language) -> triggers i18n.changeLanguage()
    5. UI re-renders in the correct language
  edge_cases:
    - "Pre-auth (no wardId): device locale is used (correct)"
    - "Null/invalid ward language: fall back to 'pt-BR' (initI18n handles this)"
    - "Language change via Settings: already calls changeLanguage() directly"
```

---

### CR-12: Rename WhatsApp Template Screen Title

**Module:** UIShell (M008)
**Affected files:** `src/i18n/locales/*.json`
**Impact:** i18n only

```yaml
problem: "Screen title says 'Modelo WhatsApp' -- too short and unclear"
solution: "Change i18n key settings.whatsappTemplate value in all 3 locales"
changes:
  - file: src/i18n/locales/pt-BR.json
    action: "Change settings.whatsappTemplate to 'Modelo de Convite pelo WhatsApp'"
  - file: src/i18n/locales/en.json
    action: "Change to 'WhatsApp Invitation Template'"
  - file: src/i18n/locales/es.json
    action: "Change to 'Modelo de Invitacion por WhatsApp'"
note: "settings/index.tsx (line 177) and whatsapp.tsx (line 117) both use
  t('settings.whatsappTemplate') -- both will update automatically."
```

---

### CR-13: Remove {tema} from Default WhatsApp Template

**Module:** UIShell (M008)
**Affected files:** `supabase/functions/register-first-user/index.ts`
**Impact:** Edge Function default template

```yaml
problem: "{tema} is not a valid placeholder but appears in default template
  (register-first-user/index.ts line 79-80)"
solution: "Update the default template in the Edge Function to remove {tema}.
  PLACEHOLDERS constant in whatsapp.tsx already excludes {tema} (correct)."
changes:
  - file: supabase/functions/register-first-user/index.ts
    action: "Update defaultWhatsappTemplate (line 79-80). Combined with CR-14."
  - file: src/app/(tabs)/settings/whatsapp.tsx
    action: "No change needed -- PLACEHOLDERS (line 17-25) already excludes {tema}"
edge_cases:
  - "Existing wards with {tema}: NOT auto-migrated; users edit manually"
```

---

### CR-14: Set Correct Default WhatsApp Template

**Module:** UIShell (M008)
**Affected files:** `supabase/functions/register-first-user/index.ts`
**Impact:** Default template for new wards

```yaml
problem: "Default WhatsApp template text is wrong. Current (line 79-80):
  'Ola {nome}, voce foi designado(a) para discursar no dia {data} sobre o
  tema \"{tema}\" (posicao: {posicao}). Podemos contar com voce?'"
solution: "Replace with correct template text"
changes:
  - file: supabase/functions/register-first-user/index.ts
    action: |
      Replace line 79-80 with:
      const defaultWhatsappTemplate =
        'Ola {nome}, voce foi designado(a) para o {posicao} discurso no dia {data} sobre o tema {colecao} - {titulo} ({link}). Podemos confirmar o seu discurso? Obrigado!';
note: "Only affects new wards. SAMPLE_DATA in whatsapp.tsx already has values
  for all placeholders used in the new template."
```

---

### CR-15: Make WhatsApp Placeholders Clickable

**Module:** UIShell (M008)
**Affected files:** `src/app/(tabs)/settings/whatsapp.tsx`
**Impact:** Placeholder chip interaction + TextInput cursor tracking

```yaml
problem: "Placeholder chips are display-only View elements (line 127-134)"
solution: "Track cursor position. On chip press, insert placeholder at cursor."
changes:
  - file: src/app/(tabs)/settings/whatsapp.tsx
    action: |
      1. Add state: const [selection, setSelection] = useState({start: 0, end: 0});
      2. Add onSelectionChange to TextInput to track cursor
      3. Replace View with Pressable for placeholder chips
      4. On chip press: insert placeholder text at selection.start
      5. If no cursor (field not focused): append to end
      6. Auto-save triggers via existing debounce (handleChange)
    detail: |
      const handlePlaceholderPress = (placeholder: string) => {
        const pos = selection.start;
        const before = template.substring(0, pos);
        const after = template.substring(pos);
        const newTemplate = before + placeholder + after;
        handleChange(newTemplate);
        const newPos = pos + placeholder.length;
        setSelection({ start: newPos, end: newPos });
      };
edge_cases:
  - "Multiple taps insert multiple copies (correct per spec)"
  - "Preview updates immediately via re-render"
```

---

### CR-16: Improve WhatsApp Template Screen Space Usage

**Module:** UIShell (M008)
**Affected files:** `src/app/(tabs)/settings/whatsapp.tsx`
**Impact:** Style-only changes

```yaml
problem: "Chips too small (fontSize 13, padding 4/10). Editor/preview too small."
solution: "Increase sizes per AC specifications"
changes:
  - file: src/app/(tabs)/settings/whatsapp.tsx
    action: |
      Style updates:
      - placeholderChip: paddingHorizontal 14, paddingVertical 8
      - placeholderText: fontSize 15
      - editor: fontSize 17, minHeight 160
      - previewText: fontSize 17
```

---

### CR-17: Add Back Button to WhatsApp Template Screen

**Module:** UIShell (M008)
**Affected files:** `src/app/(tabs)/settings/whatsapp.tsx`
**Impact:** Header UI

```yaml
problem: "No back button on WhatsApp template screen"
solution: "Add header with back button matching About screen pattern
  (about.tsx lines 21-31)"
changes:
  - file: src/app/(tabs)/settings/whatsapp.tsx
    action: |
      1. Import useRouter from expo-router
      2. Replace plain title Text (line 117-119) with header row:
         <View style={styles.header}>
           <Pressable onPress={() => router.back()}>
             <Text style={[styles.backButton, { color: colors.primary }]}>
               {t('common.back')}
             </Text>
           </Pressable>
           <Text style={[styles.headerTitle, { color: colors.text }]}>
             {t('settings.whatsappTemplate')}
           </Text>
           <View style={styles.headerSpacer} />
         </View>
      3. Add matching styles from about.tsx (header, backButton, headerSpacer)
      4. Reduce title fontSize to 18 to match About screen
```

---

### CR-18: Sunday Type Change Not Logged in Activity History

**Module:** WardDataModule (M002)
**Affected files:** `src/hooks/useSundayTypes.ts`
**Impact:** Activity log completeness

```yaml
problem: "useSetSundayType logs with raw enum values (line 219).
  useRemoveSundayException does NOT log at all (lines 228-245)."
solution: "Fix both mutations with human-readable descriptions (see CR-22)"
changes:
  - file: src/hooks/useSundayTypes.ts
    action: |
      1. useSetSundayType: change logAction description to human-readable format
      2. useRemoveSundayException: add useAuth() + logAction call in onSuccess:
         if (user) {
           logAction(wardId, user.id, user.email ?? '', 'sunday_type:change',
             `Domingo dia ${formatDateHumanReadable(date, locale)} ajustado para ${t('sundayExceptions.speeches')}`);
         }
note: "Auto-assigned types (batch on page load) are NOT logged"
dependencies: ["CR-22 (human-readable format helper)"]
```

---

### CR-19: Add Back Button to History Screen

**Module:** UIShell (M008)
**Affected files:** `src/app/(tabs)/settings/history.tsx`
**Impact:** Header UI

```yaml
problem: "No back button on Activity History screen (plain title, line 89-91)"
solution: "Add back button matching About screen pattern"
changes:
  - file: src/app/(tabs)/settings/history.tsx
    action: |
      1. Import useRouter from expo-router
      2. Replace title Text with header row:
         <View style={styles.header}>
           <Pressable onPress={() => router.back()}>
             <Text style={[styles.backButton, { color: colors.primary }]}>
               {t('common.back')}
             </Text>
           </Pressable>
           <Text style={[styles.headerTitle, { color: colors.text }]}>
             {t('activityLog.title')}
           </Text>
           <View style={styles.headerSpacer} />
         </View>
      3. Add header/backButton/headerSpacer styles
```

---

### CR-20: Add Back Button to Topics Screen

**Module:** UIShell (M008)
**Affected files:** `src/app/(tabs)/settings/topics.tsx`
**Impact:** Header UI

```yaml
problem: "No back button on Topics screen (header has title + add button only)"
solution: "Add back button to the left of the existing header"
changes:
  - file: src/app/(tabs)/settings/topics.tsx
    action: |
      1. Import useRouter from expo-router
      2. Add back button Pressable to the left of the title
      3. Add backButton style matching about.tsx
```

---

### CR-21: Move Topics Add Button Inside Ward Topics Section

**Module:** UIShell (M008)
**Affected files:** `src/app/(tabs)/settings/topics.tsx`
**Impact:** UI layout rearrangement

```yaml
problem: "'+' add button is in the main header (line 270-279). Should be inside
  the 'Ward Topics' section header."
solution: "Move the '+' button from the header to the Ward Topics section title row"
changes:
  - file: src/app/(tabs)/settings/topics.tsx
    action: |
      1. Remove + button from main header (lines 270-279)
      2. Wrap Ward Topics section title (line 284) in a row:
         <View style={styles.sectionTitleRow}>
           <Text style={[styles.sectionTitle, ...]}>
             {t('topics.wardTopics')}
           </Text>
           {canWrite && (
             <Pressable style={[styles.sectionAddButton, ...]} onPress={handleAdd}>
               <Text style={styles.sectionAddButtonText}>+</Text>
             </Pressable>
           )}
         </View>
      3. Add sectionTitleRow style: flexDirection: 'row', alignItems: 'center',
         justifyContent: 'space-between', paddingHorizontal: 16
```

---

### CR-22: Make Activity Log Entries Human-Readable

**Module:** WardDataModule (M002) -- cross-cutting
**Affected files:** Multiple hooks + `src/lib/dateUtils.ts`
**Impact:** All logAction calls across the application

```yaml
problem: "Activity log descriptions show raw data like
  'Tipo de Domingo alterado: 2026-02-15 -> testimony_meeting'"
solution: "Create date formatting helper + update all logAction calls"
```

#### Date Formatting Helper

```yaml
file: src/lib/dateUtils.ts
add_function: |
  formatDateHumanReadable(dateStr: string, language: SupportedLanguage): string

  Examples:
    ("2026-02-15", "pt-BR") => "15 de Fevereiro de 2026"
    ("2026-02-15", "en")    => "February 15, 2026"
    ("2026-02-15", "es")    => "15 de Febrero de 2026"

  Requires MONTH_NAMES constant (full month names per locale):
  const MONTH_NAMES: Record<SupportedLanguage, string[]> = {
    'pt-BR': ['Janeiro','Fevereiro','Marco','Abril','Maio','Junho',
              'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
    en: ['January','February','March','April','May','June',
         'July','August','September','October','November','December'],
    es: ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
         'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
  };
```

#### Changes by Hook

```yaml
hooks_to_update:
  - file: src/hooks/useSundayTypes.ts
    actions:
      - "useSetSundayType: 'Domingo dia {formatted_date} ajustado para {translated_type}'"
      - "useRemoveSundayException: 'Domingo dia {formatted_date} ajustado para Domingo com Discursos'"

  - file: src/hooks/useMembers.ts
    actions:
      - "create: '{member_name} adicionado como membro'"
      - "update: '{member_name} atualizado'"
      - "delete: '{member_name} removido'"

  - file: src/hooks/useSpeeches.ts
    actions:
      - "assign: '{speaker_name} designado para {position}o discurso dia {formatted_date}'"

  - file: src/hooks/useActors.ts
    actions:
      - "create: '{name} adicionado' (avoid word 'Ator' per CR-26)"
      - "update: '{name} atualizado'"
      - "delete: '{name} removido'"

  - file: src/hooks/useTopics.ts
    actions:
      - "create: 'Tema adicionado: {title}'"
      - "delete: 'Tema removido: {title}'"

  - file: src/hooks/useAgenda.ts
    actions:
      - "update: 'Agenda editada: dia {formatted_date}'"

note: "Descriptions generated at write time in ward's current language via
  getCurrentLanguage(). Historical entries retain original format."
```

---

### CR-23: Secretary Missing User Management Permission

**Module:** AuthModule (M001)
**Affected files:** `src/lib/permissions.ts`
**Impact:** Permission model change (1 line)

```yaml
problem: "Secretary role missing 'settings:users' permission (line 42-63)"
solution: "Add 'settings:users' to the secretary permission set"
changes:
  - file: src/lib/permissions.ts
    action: |
      Add 'settings:users' to the secretary Set (after 'settings:timezone'):
      secretary: new Set<Permission>([
        ...existing...,
        'settings:timezone',
        'settings:users',    // <-- ADD
        'invite:manage',
        ...
      ]),
note: "Settings index (line 160) already checks hasPermission('settings:users').
  This will now return true for secretary."
```

---

### CR-24: Sunday Type Dropdown Selection Being Ignored (CRITICAL)

**Module:** SpeechModule (M003)
**Affected files:** `src/hooks/useSundayTypes.ts`, possibly `supabase/migrations/`
**Impact:** Mutation fix

```yaml
problem: "Selecting a non-speeches type reverts. Root cause analysis:
  useSetSundayType (lines 190-214) does SELECT then conditionally INSERT/UPDATE.
  Race condition: auto-assign (useAutoAssignSundayTypes on page load) may create
  an entry while the user is changing the type. The SELECT finds no record,
  tries INSERT, but auto-assign already created one -> conflict -> silent failure."
solution: "Replace SELECT-then-INSERT/UPDATE with single UPSERT on (ward_id, date)"
changes:
  - file: src/hooks/useSundayTypes.ts
    action: |
      Replace useSetSundayType mutationFn (lines 190-214) with:
      mutationFn: async ({ date, reason, custom_reason }) => {
        const { error } = await supabase
          .from('sunday_exceptions')
          .upsert(
            {
              ward_id: wardId,
              date,
              reason,
              custom_reason: reason === 'other' ? (custom_reason ?? null) : null,
            },
            { onConflict: 'ward_id,date' }
          );
        if (error) throw error;
      }

  - file: supabase/migrations/009_sunday_exceptions_unique.sql (NEW, if needed)
    action: |
      Add UNIQUE constraint on (ward_id, date) if not already present:
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'sunday_exceptions_ward_date_unique'
        ) THEN
          ALTER TABLE sunday_exceptions
            ADD CONSTRAINT sunday_exceptions_ward_date_unique
            UNIQUE (ward_id, date);
        END IF;
      END $$;
    note: "Check if migration 008 already added this constraint. If so, skip."

  - file: src/components/SundayCard.tsx
    action: "No changes needed -- dropdown logic is correct. Fix is in mutation layer."
```

---

### CR-25: Agenda Tab Initial Scroll Position Shows Past Date

**Module:** AgendaModule (M004)
**Affected files:** `src/app/(tabs)/agenda.tsx`
**Impact:** Scroll initialization logic

```yaml
problem: "Agenda tab scrolls to June of previous year. The useEffect (lines 117-124)
  may fire before exceptions are loaded, causing filteredSundays to change and
  invalidate the index. Also, getItemLayout is undefined (line 208) so
  scrollToIndex needs items to be rendered first."
solution: "Guard scroll on exceptions being loaded. Increase timeout. Add
  getItemLayout for reliable scrolling."
changes:
  - file: src/app/(tabs)/agenda.tsx
    action: |
      1. Guard the scroll effect on exceptions being loaded:
         useEffect(() => {
           if (!hasScrolled.current && initialIndex > 0 && listItems.length > 0
               && exceptions !== undefined) {
             hasScrolled.current = true;
             setTimeout(() => {
               flatListRef.current?.scrollToIndex({
                 index: initialIndex, animated: false
               });
             }, 300);
           }
         }, [initialIndex, listItems.length, exceptions]);

      2. Add getItemLayout for reliable scrolling:
         const ITEM_HEIGHT = 62;  // collapsed card height
         getItemLayout={(_, index) => ({
           length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index
         })}

      3. The existing onScrollToIndexFailed handler (lines 177-182) provides fallback.
```

---

### CR-26: Redesign Actors Solution (MAJOR)

**Module:** AgendaModule (M004) + UIShell (M008)
**Affected files:** Multiple
**Impact:** Major component rewrite, screen removal, i18n changes

```yaml
problem: "Actors are managed in Settings > Actors screen. Should be inline
  within agenda card fields via a 2/3-screen dialog."
solution: |
  1. Remove Settings > Actors menu item and screen
  2. Rewrite ActorSelectorModal in AgendaForm as 2/3-screen bottom-sheet
     with search, inline add, edit, and delete
  3. Remove all "Ator"/"Atores" labels from i18n
  4. recognized_names stays free-text (per resolved Q-3)
```

#### Settings Screen Changes

```yaml
file: src/app/(tabs)/settings/index.tsx
changes:
  - "Remove the 'Actors'/'Atores' menu item (lines 150-156)"

file: src/app/(tabs)/settings/actors.tsx
action: "DELETE this file entirely"
```

#### ActorSelectorDialog (replaces ActorSelectorModal in AgendaForm)

```yaml
location: "Inline in src/components/AgendaForm.tsx (replaces lines 634-678)"
  alternative: "Extract to src/components/ActorSelectorDialog.tsx if complexity warrants"

behavior: |
  2/3-screen-height bottom-sheet modal:
  1. Search input at top (filters actors by name)
  2. '+' Add button (opens inline name input)
  3. Actor list with each row: name | edit icon | delete icon
  4. On add: name only; role flags inferred from roleFilter prop
  5. On edit: inline name editing (role flags NOT changed)
  6. On delete: confirmation alert, then remove
  7. On select: populate parent field, close dialog
  8. Close button/tap-outside to dismiss

contract:
  props:
    visible: boolean
    actors: MeetingActor[]
    roleFilter: ActorRoleFilter
    fieldLabel: string  # e.g. "Presidindo", "Conduzindo" (used as dialog title)
    onSelect: (actor: MeetingActor) => void
    onClose: () => void

  layout: |
    ┌────────────────────────────────────┐
    │ {fieldLabel}              [Close]  │
    │ [Search input]                     │
    │ [+ Add New]                        │
    │ ──────────────────────────────────│
    │ Actor Name 1        [Edit] [Del]   │
    │ Actor Name 2        [Edit] [Del]   │
    │ ...                                │
    └────────────────────────────────────┘

  height: "Dimensions.get('window').height * 0.67"
  position: "Bottom-anchored (overlay justifyContent: 'flex-end')"

  role_mapping:
    presiding_field:  { can_preside: true }
    conducting_field: { can_conduct: true, can_preside: true }  # Q-2 resolved
    pianist_field:    { can_music: true }
    conductor_field:  { can_music: true }

  add_flow: |
    1. User taps '+ Add'
    2. TextInput appears inline (name only)
    3. User types name, confirms
    4. createActor.mutate({ name, [roleFilter]: true })
    5. enforceActorRules() handles can_conduct -> can_preside
    6. New actor appears in filtered list

  edit_flow: |
    1. User taps edit on actor row
    2. Row switches to TextInput with current name
    3. User edits, confirms
    4. updateActor.mutate({ id, name })

  delete_flow: |
    1. User taps delete on actor row
    2. Alert.alert confirmation
    3. deleteActor.mutate({ actorId, actorName })
    4. Snapshot names in existing agendas NOT affected
```

#### AgendaForm Changes

```yaml
file: src/components/AgendaForm.tsx
changes:
  - "Import useCreateActor, useUpdateActor, useDeleteActor from hooks/useActors"
  - "Replace ActorSelectorModal (lines 634-678) with ActorSelectorDialog"
  - "Pass roleFilter and fieldLabel from the SelectorState context"
  - "Add fieldRoleMap for creating actors with correct role flags"
  - "recognized_names: remains a plain TextInput (free-text, per Q-3)"
```

#### Pianist and Conductor Fields

```yaml
note: |
  The current AgendaForm does NOT have pianist/conductor fields.
  The useActors('can_music') is fetched (line 75) but not used in
  any field. The agenda table likely has pianist_name/pianist_actor_id
  and conductor_name/conductor_actor_id columns.

  CR-26 specifies these fields should use the actor selector.
  Add pianist and conductor fields to Section 1 (Welcome) or Section 2
  (Assignments) with ActorSelectorDialog using can_music filter.

  If the DB schema does not have these columns, they need to be added.
  Check existing schema before implementation.
```

#### i18n Changes for Actors

```yaml
i18n_changes:
  remove_or_update:
    - "settings.actors: REMOVE (menu label in Settings)"
    - "actors.title: REMOVE or repurpose"
    - "actors.addActor: change to actors.addName = 'Adicionar Nome'"
    - "actors.actorName: change to actors.personName = 'Nome'"
    - "actors.deleteConfirm: reword without 'ator'"
  keep_internal:
    - "actors.canPreside, actors.canConduct (internal logic, not user-visible)"
    - "actors.conductImpliesPreside (internal)"
  constraint: "The word 'Ator'/'Atores'/'Actor'/'Actors' must NOT appear
    anywhere in the rendered UI"
```

---

### CR-27: Fix Text Input Letter-Eating and Resize Announcements

**Module:** AgendaModule (M004)
**Affected files:** `src/components/AgendaForm.tsx`
**Impact:** Text input auto-save pattern + styles

```yaml
problem: "Auto-save on every keystroke (updateField, line 94-103) triggers
  mutation -> cache invalidation -> re-render, overwriting local TextInput
  value mid-typing. Announcements minHeight is 36px (line 792), too small."
solution: "Create DebouncedTextInput sub-component with local state + debounce"
changes:
  - file: src/components/AgendaForm.tsx
    action: |
      Create DebouncedTextInput:
      function DebouncedTextInput({
        value, onSave, debounceMs = 800, ...props
      }: {
        value: string;
        onSave: (text: string) => void;
        debounceMs?: number;
      } & Omit<TextInputProps, 'value' | 'onChangeText'>) {
        const [localValue, setLocalValue] = useState(value);
        const timerRef = useRef<NodeJS.Timeout>();
        const isEditingRef = useRef(false);

        useEffect(() => {
          if (!isEditingRef.current) setLocalValue(value);
        }, [value]);

        const handleChange = (text: string) => {
          isEditingRef.current = true;
          setLocalValue(text);
          clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            onSave(text);
            isEditingRef.current = false;
          }, debounceMs);
        };

        const handleBlur = () => {
          clearTimeout(timerRef.current);
          if (localValue !== value) onSave(localValue);
          isEditingRef.current = false;
        };

        return <TextInput value={localValue} onChangeText={handleChange}
          onBlur={handleBlur} {...props} />;
      }

      Replace all text field TextInputs with DebouncedTextInput:
      - announcements, ward_business, baby_blessing_names,
        baptism_confirmation_names, special_presentation_description

      Set announcements minHeight to 66 (3 lines * ~22px).
contract:
  debounce_ms: 800
  behavior: |
    - User types "abc" (3 keystrokes in 300ms)
    - Only 1 mutation fires 800ms after last keystroke
    - No re-render interrupts typing
    - isEditingRef prevents server value from overwriting during typing
    - On blur: immediate save of pending changes
```

---

### CR-28: Use 2/3 Screen Dialog for Hymn Selection

**Module:** AgendaModule (M004)
**Affected files:** `src/components/AgendaForm.tsx`
**Impact:** Modal styling change

```yaml
problem: "HymnSelectorModal uses centered floating modal (maxHeight 500)"
solution: "Change to 2/3-screen-height bottom-sheet style, matching CR-26"
changes:
  - file: src/components/AgendaForm.tsx
    action: |
      Update HymnSelectorModal styles:
      - modalOverlay: justifyContent 'flex-end' (bottom-anchored)
      - hymnModal: height Dimensions.get('window').height * 0.67,
        borderTopLeftRadius 16, borderTopRightRadius 16,
        remove maxHeight: 500
      - Keep search input and FlatList as-is
design_decision: "Share bottom-sheet style constants between
  ActorSelectorDialog and HymnSelectorModal to ensure consistency."
```

---

### CR-29: Rename Agenda Section Labels + Dynamic Sections

**Module:** AgendaModule (M004)
**Affected files:** `src/components/AgendaForm.tsx`, `src/app/(tabs)/agenda.tsx`, i18n locales
**Impact:** Section headers + conditional rendering

```yaml
problem: "Section labels are generic. Need specific labels and dynamic sections
  for special meeting types."
solution: "Add new i18n keys and update AgendaForm section headers with
  conditional rendering based on exceptionReason."
changes:
  - file: src/i18n/locales/pt-BR.json
    action: |
      Add keys:
      "agenda.sectionWelcome": "Boas-vindas, Anuncios e Reconhecimentos"
      "agenda.sectionAssignments": "Designacoes e Sacramento"
      "agenda.sectionFirstSpeeches": "Primeiros Discursos"
      "agenda.sectionFinalSpeech": "Ultimo Discurso"
      "agenda.sectionTestimonies": "Testemunhos"
      "agenda.sectionPrimaryPresentation": "Apresentacao Especial da Primaria"

  - file: src/i18n/locales/en.json
    action: |
      Add keys:
      "agenda.sectionWelcome": "Welcome, Announcements & Recognitions"
      "agenda.sectionAssignments": "Assignments & Sacrament"
      "agenda.sectionFirstSpeeches": "First Speeches"
      "agenda.sectionFinalSpeech": "Final Speech"
      "agenda.sectionTestimonies": "Testimonies"
      "agenda.sectionPrimaryPresentation": "Primary Special Presentation"

  - file: src/i18n/locales/es.json
    action: |
      Add keys:
      "agenda.sectionWelcome": "Bienvenida, Anuncios y Reconocimientos"
      "agenda.sectionAssignments": "Asignaciones y Sacramento"
      "agenda.sectionFirstSpeeches": "Primeros Discursos"
      "agenda.sectionFinalSpeech": "Ultimo Discurso"
      "agenda.sectionTestimonies": "Testimonios"
      "agenda.sectionPrimaryPresentation": "Presentacion Especial de la Primaria"

  - file: src/components/AgendaForm.tsx
    action: |
      1. Section 1 header (line 203):
         From: t('agenda.presiding')
         To: t('agenda.sectionWelcome')

      2. Section 2 header (line 280):
         From: t('agenda.wardBusiness')
         To: t('agenda.sectionAssignments')

      3. Section 3 header for normal (line 356):
         From: t('speeches.title')
         To: t('agenda.sectionFirstSpeeches')

      4. Add Section 4 header before 3rd speech (before line 407):
         <SectionHeader title={t('agenda.sectionFinalSpeech')} colors={colors} />

      5. Special meeting section header (line 418):
         Dynamic based on exceptionReason:
         - testimony_meeting: t('agenda.sectionTestimonies')
         - primary_presentation: t('agenda.sectionPrimaryPresentation')
         - ward_conference: t('sundayExceptions.ward_conference')
         - other: customReason || t('sundayExceptions.other')

  - file: src/components/AgendaForm.tsx (props)
    action: |
      Add customReason to AgendaFormProps:
      export interface AgendaFormProps {
        sundayDate: string;
        exceptionReason: SundayExceptionReason | null;
        customReason?: string | null;  // ADD for CR-29 "other" section headers
      }

  - file: src/app/(tabs)/agenda.tsx
    action: |
      Pass custom_reason to AgendaForm (line 288):
      <AgendaForm
        sundayDate={date}
        exceptionReason={exception?.reason ?? null}
        customReason={exception?.custom_reason ?? null}
      />
```

---

### CR-30: Rename "Numero Musical" to "Apresentacao Especial"

**Module:** AgendaModule (M004)
**Affected files:** `src/i18n/locales/*.json`, `src/components/AgendaForm.tsx`
**Impact:** i18n key value change

```yaml
problem: "Toggle label says 'Numero Musical' instead of 'Apresentacao Especial'"
solution: "Update the i18n key value. Keep the key name agenda.musicalNumber
  to minimize code changes (references at lines 375 and 386)."
changes:
  - file: src/i18n/locales/pt-BR.json
    action: "Change agenda.musicalNumber to 'Apresentacao Especial'"
  - file: src/i18n/locales/en.json
    action: "Change agenda.musicalNumber to 'Special Presentation'"
  - file: src/i18n/locales/es.json
    action: "Change agenda.musicalNumber to 'Presentacion Especial'"
  - file: src/components/AgendaForm.tsx
    action: "No code change needed -- existing t('agenda.musicalNumber')
      references will pick up the new value"
```

---

## Data Model Changes

```yaml
migrations:
  - id: "009_sunday_exceptions_unique.sql (conditional)"
    purpose: "Enable UPSERT for CR-24"
    changes:
      - "Add UNIQUE constraint on (ward_id, date) if not already present"
    note: "Check if migration 008 already created this constraint before adding"

tables_affected:
  sunday_exceptions:
    possible_new_constraints:
      - "UNIQUE (ward_id, date) -- enables UPSERT for CR-24"

edge_functions_affected:
  register-first-user:
    change: "Update default whatsapp_template text (CR-13, CR-14)"
```

---

## Impact on Existing Modules

| Module | CRs | Severity |
|--------|-----|----------|
| M001 AuthModule | CR-11, CR-23 | Low (ward language init + 1-line permission) |
| M002 WardDataModule | CR-18, CR-22, CR-24 | Medium (log descriptions, upsert fix) |
| M003 SpeechModule | CR-22 | Low (update log descriptions) |
| M004 AgendaModule | CR-25, CR-26, CR-27, CR-28, CR-29, CR-30 | **High** (ActorSelectorDialog, debounce, sections, dialog sizing) |
| M005 NotificationModule | - | None |
| M006 SyncEngine | - | None |
| M007 OfflineManager | - | None |
| M008 UIShell | CR-12-17, CR-19-21 | Medium (WhatsApp screen, back buttons, Topics layout) |

---

## Cross-cutting Changes

| Area | Changes |
|------|---------|
| i18n (all 3 locales) | CR-12 (whatsapp title), CR-26 (remove Atores), CR-29 (section labels), CR-30 (special presentation) |
| Permissions | CR-23 (add settings:users to secretary) |
| DateUtils | CR-22 (add formatDateHumanReadable helper) |
| Edge Functions | CR-13, CR-14 (default WhatsApp template) |
| Database | CR-24 (unique constraint for UPSERT, conditional) |
| Activity Log (hooks) | CR-18, CR-22 (human-readable descriptions) |
| Navigation | CR-17, CR-19, CR-20 (back buttons using About screen pattern) |

---

## Execution Order (Dependencies)

```
Phase 1 (no dependencies - can be done in any order):
  CR-11  Language on Expo start
  CR-12  WhatsApp template title rename
  CR-23  Secretary permission (1 line)
  CR-25  Agenda tab scroll position fix
  CR-30  Musical number label rename

Phase 2 (WhatsApp screen cluster):
  CR-17  WhatsApp back button (adds header structure first)
  CR-13+14  Remove {tema} + correct default template (combined, Edge Function)
  CR-15  Clickable placeholders
  CR-16  Space usage improvements (styles)

Phase 3 (Back buttons + Topics):
  CR-19  History back button
  CR-20  Topics back button
  CR-21  Topics add button repositioning (after CR-20 header)

Phase 4 (Activity log - CR-22 first):
  CR-22  Human-readable log descriptions (adds dateUtils helper)
  CR-18  Sunday type change logging (uses CR-22 format)

Phase 5 (Sunday type fix):
  CR-24  Sunday type dropdown fix (migration + upsert)

Phase 6 (Major AgendaForm changes - do in this order):
  CR-27  Text input debounce fix (DebouncedTextInput)
  CR-29  Section labels + dynamic sections
  CR-28  Hymn selector 2/3 screen dialog
  CR-26  Actors redesign (LARGEST - ActorSelectorDialog + remove Settings screen)

Note: Phase 6 items all modify AgendaForm.tsx. Order minimizes conflicts:
  CR-27 first (adds DebouncedTextInput, changes text fields)
  CR-29 (section headers)
  CR-28 (hymn dialog restyle)
  CR-26 last (biggest - replaces actor modal, adds CRUD dialog)
```

---

## Risk Assessment

```yaml
risks:
  - id: R-1
    severity: HIGH
    cr: CR-26
    description: "Actors redesign is the largest change. Replaces Settings screen
      with inline CRUD dialog in AgendaForm (~150+ lines of new UI code)."
    mitigation: "Reuse existing useActors hooks. Build dialog as self-contained
      sub-component. Test each CRUD operation independently."

  - id: R-2
    severity: HIGH
    cr: CR-27
    description: "DebouncedTextInput must handle sync between local state and
      server state. Edge cases: rapid typing, blur during debounce, server
      value arriving during active editing."
    mitigation: "Use isEditingRef to prevent server->local sync during typing.
      Use useRef for timer cleanup. onBlur as final save trigger."

  - id: R-3
    severity: MEDIUM
    cr: CR-24
    description: "UPSERT requires unique constraint on (ward_id, date). If
      constraint doesn't exist, migration needed before fix works."
    mitigation: "Add conditional migration with IF NOT EXISTS guard."

  - id: R-4
    severity: MEDIUM
    cr: CR-22
    description: "All hooks need getCurrentLanguage() for localized descriptions.
      Adds coupling between hooks and i18n module."
    mitigation: "getCurrentLanguage() is already used in components.
      Coupling is acceptable for write-time localization."

  - id: R-5
    severity: LOW
    cr: CR-11
    description: "Ward language fetch adds extra Supabase query on app start."
    mitigation: "Single-row, single-field query. Runs once when wardId available."

  - id: R-6
    severity: LOW
    cr: CR-29
    description: "Dynamic section headers for special meetings require
      passing customReason through component tree."
    mitigation: "Add customReason prop to AgendaFormProps. Data already
      available from exception object."
```

---

## ADRs

```yaml
adrs:
  - id: ADR-012
    title: "Debounced auto-save for AgendaForm text inputs"
    context: "Direct onChangeText -> mutation -> cache invalidation -> re-render
      cycle causes character dropping in text inputs"
    decision: "Maintain local state in text inputs; debounce mutations by 800ms;
      force-save on blur; use isEditingRef to prevent server overwrite"
    consequences:
      - "Characters no longer dropped during fast typing"
      - "Small delay (800ms) before changes are persisted"
      - "On blur, any pending changes save immediately"

  - id: ADR-013
    title: "Inline actor management via bottom-sheet dialog"
    context: "Users expect to manage actors directly from agenda fields,
      not from a separate Settings screen"
    decision: "Remove Settings > Actors screen; replace ActorSelectorModal with
      2/3-screen bottom-sheet with search + CRUD capabilities"
    consequences:
      - "More intuitive UX -- manage actors where they are used"
      - "Role flags inferred from field context (no manual toggling)"
      - "Settings screen has one fewer menu item"
      - "actors.tsx file deleted"

  - id: ADR-014
    title: "UPSERT pattern for sunday type changes"
    context: "SELECT-then-INSERT/UPDATE has race condition with auto-assignment"
    decision: "Replace with single UPSERT on (ward_id, date) unique constraint"
    consequences:
      - "Eliminates race condition"
      - "Requires unique constraint migration (conditional)"
      - "Simpler mutation code"

  - id: ADR-015
    title: "Bottom-sheet dialog pattern for selectors"
    context: "Actor and hymn selectors used small centered floating modals"
    decision: "Standardize on 2/3-screen bottom-sheet dialog for all selectors"
    consequences:
      - "Consistent UI pattern across actor and hymn selectors"
      - "Better mobile usability (more list items visible)"
      - "Shared style constants reduce duplication"

  - id: ADR-016
    title: "Write-time localization for activity log descriptions"
    context: "Activity log descriptions need to be human-readable in ward language"
    decision: "Generate localized descriptions at write time using
      getCurrentLanguage() and i18n translations. Stored as-is in DB."
    consequences:
      - "Historical entries retain their original language"
      - "No migration needed for existing data"
      - "Hooks gain dependency on i18n module"
```

---

## File Impact Summary

| File | CRs | Change Type |
|------|-----|-------------|
| `src/components/AgendaForm.tsx` | CR-26, CR-27, CR-28, CR-29, CR-30 | **MAJOR**: DebouncedTextInput, ActorSelectorDialog, sections, hymn dialog, label |
| `src/i18n/locales/pt-BR.json` | CR-12, CR-26, CR-29, CR-30 | i18n: whatsapp title, remove Atores, section labels, presentation |
| `src/i18n/locales/en.json` | CR-12, CR-26, CR-29, CR-30 | Mirror pt-BR |
| `src/i18n/locales/es.json` | CR-12, CR-26, CR-29, CR-30 | Mirror pt-BR |
| `src/app/(tabs)/settings/whatsapp.tsx` | CR-15, CR-16, CR-17 | Clickable placeholders, sizing, back button |
| `src/app/(tabs)/settings/topics.tsx` | CR-20, CR-21 | Back button, move add button |
| `src/app/(tabs)/settings/history.tsx` | CR-19 | Back button |
| `src/app/(tabs)/settings/index.tsx` | CR-26 | Remove Actors menu item |
| `src/app/(tabs)/settings/actors.tsx` | CR-26 | **DELETE** |
| `src/hooks/useSundayTypes.ts` | CR-18, CR-22, CR-24 | Logging, human-readable, upsert |
| `src/hooks/useActors.ts` | CR-22 | Human-readable log descriptions |
| `src/hooks/useSpeeches.ts` | CR-22 | Human-readable log descriptions |
| `src/hooks/useMembers.ts` | CR-22 | Human-readable log descriptions |
| `src/hooks/useTopics.ts` | CR-22 | Human-readable log descriptions |
| `src/hooks/useAgenda.ts` | CR-22 | Human-readable log descriptions |
| `src/lib/dateUtils.ts` | CR-22 | Add formatDateHumanReadable helper |
| `src/lib/permissions.ts` | CR-23 | Add settings:users to secretary |
| `src/contexts/AuthContext.tsx` | CR-11 | Ward language init on session load |
| `src/app/(tabs)/agenda.tsx` | CR-25, CR-29 | Scroll fix, pass customReason |
| `supabase/functions/register-first-user/index.ts` | CR-13, CR-14 | Update default template |
| `supabase/migrations/009_*.sql` | CR-24 | Unique constraint (conditional) |
