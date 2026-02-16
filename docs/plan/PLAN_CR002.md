# PLAN_CR002 - Change Requests Batch 2 (20 CRs: CR-11 to CR-30)

## PLAN_SUMMARY

```yaml
type: plan_summary
total_steps: 18
parallel_tracks: 4
estimated_commits: 18
coverage:
  acceptance_criteria: 47/47
  edge_cases: 15/15
critical_path:
  - "STEP-01: Quick i18n + permission fixes (CR-12, CR-23, CR-30)"
  - "STEP-05: DebouncedTextInput for AgendaForm (CR-27, foundation for CR-26)"
  - "STEP-12: ActorSelector rewrite + Settings removal (CR-26)"
  - "STEP-14: Agenda section label renaming + dynamic sections (CR-29)"
main_risks:
  - "CR-26 is a major component rewrite touching ActorSelector, AgendaForm, Settings, and all 3 i18n locales"
  - "CR-27 text input letter-eating fix (DebouncedTextInput) must land before CR-26 and CR-29 since all modify AgendaForm.tsx"
  - "CR-24 sunday dropdown bug requires debugging mutation flow in useSundayTypes + SundayCard + speeches.tsx"
  - "CR-22 human-readable activity log touches 6+ hook files -- risk of merge conflicts if done in parallel with other hook changes"
```

---

## PLAN

```yaml
type: plan
version: 1

goal: "Fix 20 bugs and implement UI improvements (CR-11 to CR-30). CR-26 (actors redesign) and CR-27 (text input fix) are the most impactful. Strategy: do simple independent fixes first, then the AgendaForm-heavy changes in careful order."

strategy:
  order: |
    Phase 1 (independent, simple fixes): CR-11, CR-12, CR-13+14, CR-23, CR-30, CR-17+19+20, CR-21, CR-16
    Phase 2 (CR-22 foundation + dependent fixes): CR-22 dateUtils helper, then CR-18+22 hook updates
    Phase 3 (AgendaForm changes -- sequential): CR-27 (DebouncedTextInput), then CR-15, CR-24, CR-25
    Phase 4 (major AgendaForm rework -- sequential): CR-26 (actors redesign), CR-28 (hymn dialog), CR-29 (section labels)
    Phase 5: Full regression
  commit_strategy: "1 commit per step, conventional commits (fix:, feat:, chore:, refactor:)"
  test_strategy: "Existing tests must pass. Add targeted tests for critical fixes (CR-24, CR-26, CR-27)."
  merge_strategy: "CR-27 must land before CR-26, CR-28, CR-29 since all modify AgendaForm.tsx heavily."
```

---

## Steps

### STEP-01: CR-12 + CR-23 + CR-30 -- Simple i18n and Permission Fixes

```yaml
- id: STEP-01
  description: |
    Three independent, small changes bundled together:
    (a) CR-12: Change settings.whatsappTemplate i18n key value in all 3 locales:
        pt-BR: "Modelo de Convite pelo WhatsApp"
        en: "WhatsApp Invitation Template"
        es: "Modelo de Invitacion por WhatsApp"
    (b) CR-23: Add 'settings:users' to the secretary permission set in permissions.ts.
    (c) CR-30: Change agenda.musicalNumber i18n key value in all 3 locales:
        pt-BR: "Apresentacao Especial"
        en: "Special Presentation"
        es: "Presentacion Especial"
  files:
    - "src/i18n/locales/pt-BR.json"
    - "src/i18n/locales/en.json"
    - "src/i18n/locales/es.json"
    - "src/lib/permissions.ts"
  dependencies: []
  parallelizable_with: ["STEP-02", "STEP-03", "STEP-04", "STEP-05", "STEP-06", "STEP-07"]
  done_when:
    - "CR-12: Screen title reads 'Modelo de Convite pelo WhatsApp' in pt-BR, equivalent in en/es"
    - "CR-12: Settings index item also uses the updated label"
    - "CR-23: Secretary role has 'settings:users' permission"
    - "CR-23: Secretary can see the Users menu item in Settings"
    - "CR-30: Toggle label reads 'Apresentacao Especial' in pt-BR, 'Special Presentation' in en, 'Presentacion Especial' in es"
  tests:
    - type: unit
      description: "Verify secretary has settings:users permission"
    - type: unit
      description: "Verify i18n keys have updated values in all 3 locales"
  covers:
    acceptance_criteria: ["AC-12.1", "AC-12.2", "AC-23.1", "AC-23.2", "AC-23.3", "AC-30.1", "AC-30.2"]
    edge_cases: ["EC-23.1"]
  risks:
    - risk: "None -- isolated, small changes"
      mitigation: "N/A"
```

### STEP-02: CR-11 -- Fix App Language Defaulting to English on Expo Start

```yaml
- id: STEP-02
  description: |
    In AuthContext.tsx, add a useEffect that watches the ward data. When ward data is
    available and contains a language field, call changeLanguage(ward.language) to override
    the initial device-locale detection from initI18n().

    The current flow:
    1. initI18n() runs at import time -> uses device locale
    2. AuthContext loads session -> no language change

    Fixed flow:
    1. initI18n() runs at import time -> uses device locale (temporary)
    2. AuthContext loads session + fetches ward data
    3. useEffect fires -> changeLanguage(ward.language)
    4. UI re-renders in correct language

    Need to also fetch ward data including language field. Currently AuthContext
    extracts ward_id from user metadata but does not fetch the ward record.
    Add a query for the ward's language setting.
  files:
    - "src/contexts/AuthContext.tsx"
  dependencies: []
  parallelizable_with: ["STEP-01", "STEP-03", "STEP-04", "STEP-05", "STEP-06", "STEP-07"]
  done_when:
    - "Ward configured as pt-BR -> app shows Portuguese after auth loads"
    - "Ward configured as es -> app shows Spanish after auth loads"
    - "Pre-auth state uses device locale as temporary fallback"
    - "Null/invalid ward language falls back to pt-BR"
    - "Changing ward language via Settings -> restarting -> new language applied"
  tests:
    - type: unit
      description: "Verify AuthContext calls changeLanguage with ward.language after session loads"
  covers:
    acceptance_criteria: ["AC-11.1", "AC-11.2", "AC-11.3", "AC-11.4"]
    edge_cases: ["EC-11.1", "EC-11.2"]
  risks:
    - risk: "Brief flash of device-locale language before ward language applies"
      mitigation: "Acceptable -- same pattern used in batch 1 for registration"
```

### STEP-03: CR-13 + CR-14 -- Fix Default WhatsApp Template

```yaml
- id: STEP-03
  description: |
    (a) CR-13: Verify PLACEHOLDERS constant does not include {tema} -- already confirmed
        it does not (PLACEHOLDERS = [{nome}, {data}, {posicao}, {duracao}, {colecao}, {titulo}, {link}]).
        Update the default template in the Edge Function to remove any {tema} reference.
    (b) CR-14: Set the default template text in the Edge Function (register-first-user)
        to the exact text specified by the user:
        "Ola {nome}, voce foi designado(a) para o {posicao} discurso no dia {data} sobre o tema {colecao} - {titulo} ({link}). Podemos confirmar o seu discurso? Obrigado!"
    Also verify SAMPLE_DATA in whatsapp.tsx covers {posicao} (already covers {posicao}: '1').
  files:
    - "supabase/functions/register-first-user/index.ts"
    - "src/app/(tabs)/settings/whatsapp.tsx" (verify only, minimal changes)
  dependencies: []
  parallelizable_with: ["STEP-01", "STEP-02", "STEP-04", "STEP-05", "STEP-06", "STEP-07"]
  done_when:
    - "CR-13: Default template for new wards does not contain {tema}"
    - "CR-14: Default template matches the exact text specified"
    - "CR-14: Preview renders correctly with all placeholders from the new template"
    - "Existing wards are NOT modified"
  tests:
    - type: unit
      description: "Verify PLACEHOLDERS array does not contain {tema}"
    - type: unit
      description: "Verify SAMPLE_DATA covers all placeholders in the new template"
  covers:
    acceptance_criteria: ["AC-13.1", "AC-13.2", "AC-14.1", "AC-14.2"]
    edge_cases: ["EC-13.1", "EC-14.1"]
  risks:
    - risk: "Edge Function deployment required for template change"
      mitigation: "Supabase functions deploy via CLI"
```

### STEP-04: CR-17 + CR-19 + CR-20 -- Add Back Buttons to WhatsApp, History, and Topics Screens

```yaml
- id: STEP-04
  description: |
    Add a back button to 3 screens matching the About screen pattern:
    <View style={styles.header}>
      <Pressable onPress={() => router.back()}>
        <Text style={[styles.backButton, { color: colors.primary }]}>
          {t('common.back')}
        </Text>
      </Pressable>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <View style={styles.headerSpacer} />
    </View>

    (a) CR-17: whatsapp.tsx -- replace bare <Text> title with header row containing back button
    (b) CR-19: history.tsx -- add header row with back button before FlatList
    (c) CR-20: topics.tsx -- add header row with back button before content

    Copy the header/backButton styles from about.tsx for consistency.
  files:
    - "src/app/(tabs)/settings/whatsapp.tsx"
    - "src/app/(tabs)/settings/history.tsx"
    - "src/app/(tabs)/settings/topics.tsx"
  dependencies: []
  parallelizable_with: ["STEP-01", "STEP-02", "STEP-03", "STEP-05", "STEP-06", "STEP-07"]
  done_when:
    - "CR-17: WhatsApp template screen has a back button at top-left"
    - "CR-17: Tapping back returns to Settings index"
    - "CR-19: History screen has a back button at top-left"
    - "CR-19: Tapping back returns to Settings index"
    - "CR-20: Topics screen has a back button at top-left"
    - "CR-20: Tapping back returns to Settings index"
    - "All 3 back buttons use t('common.back') and match About screen style"
  tests:
    - type: e2e
      description: "Manual: verify back button exists and works on all 3 screens"
  covers:
    acceptance_criteria: ["AC-17.1", "AC-17.2", "AC-17.3", "AC-19.1", "AC-19.2", "AC-19.3", "AC-20.1", "AC-20.2", "AC-20.3"]
    edge_cases: []
  risks:
    - risk: "None -- simple UI additions following existing pattern"
      mitigation: "N/A"
```

### STEP-05: CR-27 -- Fix Text Input Letter-Eating + DebouncedTextInput

```yaml
- id: STEP-05
  description: |
    The letter-eating bug is caused by the updateField() callback in AgendaForm.tsx
    calling updateAgenda.mutate() on every keystroke, which triggers a query cache
    invalidation -> re-render -> TextInput value reset that drops characters.

    Fix:
    1. Create a DebouncedTextInput sub-component within AgendaForm.tsx:
       - Maintains local state for the text value
       - Debounces the save callback by 800ms
       - On blur: immediately saves pending changes
       - Syncs with external value via useEffect

    2. Replace all TextInput fields in AgendaForm that use updateField with
       DebouncedTextInput (announcements, sustaining_releasing, baby_blessing_names,
       baptism_confirmation_names, special_presentation_description).

    3. Set announcements DebouncedTextInput minHeight to ~66px (3 lines of text).

    This MUST be done before CR-26, CR-28, CR-29 which also modify AgendaForm.tsx.
  files:
    - "src/components/AgendaForm.tsx"
  dependencies: []
  parallelizable_with: ["STEP-01", "STEP-02", "STEP-03", "STEP-04", "STEP-06", "STEP-07"]
  done_when:
    - "All text inputs in AgendaForm use DebouncedTextInput instead of raw TextInput + updateField"
    - "Typing at normal speed does not drop characters"
    - "Announcements field has minHeight ~66px (3 lines)"
    - "Auto-save fires 800ms after the last keystroke"
    - "On blur, pending changes save immediately"
    - "All existing behavior (field values saved to server) still works"
  tests:
    - type: unit
      description: "Verify DebouncedTextInput debounces save by 800ms"
    - type: unit
      description: "Verify DebouncedTextInput saves immediately on blur"
    - type: integration
      description: "Fast typing does not drop characters"
  covers:
    acceptance_criteria: ["AC-27.1", "AC-27.2", "AC-27.3", "AC-27.4"]
    edge_cases: ["EC-27.1", "EC-27.2"]
  risks:
    - risk: "DebouncedTextInput useEffect syncing with external value may cause cursor jump"
      mitigation: "Only sync when external value differs AND no local edits are pending"
```

### STEP-06: CR-21 -- Move Topics Add Button Inside Ward Topics Section

```yaml
- id: STEP-06
  description: |
    Move the '+' add button from the screen-level title area to inside the
    "Ward Topics" section header. The '+' button should appear to the right of
    the "Ward Topics" section title text.

    In topics.tsx:
    1. Find the current header area that has the '+' button and remove the button from there
    2. Add a section header row for "Ward Topics" with flexDirection: 'row',
       justifyContent: 'space-between', and place the '+' button on the right
    3. Keep the same onPress handler (handleAdd)
  files:
    - "src/app/(tabs)/settings/topics.tsx"
  dependencies: ["STEP-04"]
  parallelizable_with: ["STEP-01", "STEP-02", "STEP-03", "STEP-05", "STEP-07"]
  done_when:
    - "No '+' button appears next to the screen title"
    - "'+' button appears within the Ward Topics section header, to the right"
    - "Button functionality (creating a new ward topic) is unchanged"
  tests:
    - type: e2e
      description: "Manual: verify add button is inside Ward Topics section"
  covers:
    acceptance_criteria: ["AC-21.1", "AC-21.2", "AC-21.3"]
    edge_cases: []
  risks:
    - risk: "None -- simple layout rearrangement"
      mitigation: "N/A"
```

### STEP-07: CR-16 -- Improve WhatsApp Template Screen Space Usage

```yaml
- id: STEP-07
  description: |
    Style-only changes to the WhatsApp template screen:
    - Placeholder chips: paddingHorizontal 14, paddingVertical 8, fontSize 15
    - Template editor: fontSize 17, minHeight 160
    - Preview text: fontSize 17
    The screen currently has small chips (pH 10, pV 4, fs 13), small editor
    (fs 15, minH 120), and small preview (fs 15).
  files:
    - "src/app/(tabs)/settings/whatsapp.tsx"
  dependencies: ["STEP-04"]
  parallelizable_with: ["STEP-01", "STEP-02", "STEP-03", "STEP-05", "STEP-06"]
  done_when:
    - "Placeholder chips are visually larger (fontSize >= 15, padding >= 8/14)"
    - "Template editor text is larger (fontSize >= 17, minHeight >= 160)"
    - "Preview text is larger (fontSize >= 17)"
  tests:
    - type: e2e
      description: "Manual: verify WhatsApp template screen uses space better"
  covers:
    acceptance_criteria: ["AC-16.1", "AC-16.2", "AC-16.3"]
    edge_cases: []
  risks:
    - risk: "None -- style-only changes"
      mitigation: "N/A"
```

### STEP-08: CR-15 -- Make WhatsApp Placeholders Clickable

```yaml
- id: STEP-08
  description: |
    In whatsapp.tsx:
    1. Add state for cursor position: const [selection, setSelection] = useState({ start: 0, end: 0 })
    2. Add onSelectionChange to the template TextInput to track cursor position
    3. Wrap each placeholder chip in Pressable with onPress handler
    4. On press: insert placeholder text at selection.start position in the template
    5. Update template state and trigger auto-save

    Implementation:
    function insertPlaceholder(placeholder: string) {
      const before = template.slice(0, selection.start);
      const after = template.slice(selection.end);
      const newTemplate = before + placeholder + after;
      handleChange(newTemplate);
      // Move cursor after inserted text
      const newPos = selection.start + placeholder.length;
      setSelection({ start: newPos, end: newPos });
    }
  files:
    - "src/app/(tabs)/settings/whatsapp.tsx"
  dependencies: ["STEP-07"]
  parallelizable_with: []
  done_when:
    - "Tapping a placeholder chip inserts the placeholder at cursor position in the template"
    - "If no cursor, placeholder appends to end"
    - "Preview updates immediately after insertion"
    - "Multiple taps insert multiple copies"
  tests:
    - type: unit
      description: "Verify insertPlaceholder correctly inserts at cursor position"
  covers:
    acceptance_criteria: ["AC-15.1", "AC-15.2", "AC-15.3"]
    edge_cases: ["EC-15.1"]
  risks:
    - risk: "TextInput selection tracking may behave differently on Android vs iOS"
      mitigation: "Use onSelectionChange event which is cross-platform"
```

### STEP-09: CR-22 + CR-18 -- Human-Readable Activity Log + Sunday Type Logging Fix

```yaml
- id: STEP-09
  description: |
    Two related changes:
    (a) CR-22: Add a formatDateHumanReadable() helper to dateUtils.ts that formats
        dates as "DD de Month de YYYY" (pt-BR), "Month DD, YYYY" (en), "DD de Month de YYYY" (es).
        Add full month name maps for all 3 languages.
        Then update logAction descriptions in all mutation hooks to use human-readable text.
    (b) CR-18: Fix useSundayTypes.ts:
        - useSetSundayType: change logAction description from raw
          "Tipo de domingo alterado: {date} -> {reason}" to
          "Domingo dia {formatted_date} ajustado para {translated_type}"
        - useRemoveSundayException: add logAction call with description
          "Domingo dia {formatted_date} ajustado para Domingo com Discursos"

    Hook-by-hook updates:
    - useSundayTypes.ts: useSetSundayType, useRemoveSundayException
    - useActors.ts: useCreateActor, useUpdateActor, useDeleteActor
    - useTopics.ts: useCreateWardTopic, useDeleteWardTopic
    - useAgenda.ts: useUpdateAgenda
    - useSpeeches.ts: useAssignSpeaker (if logAction exists there)
    - useMembers.ts: useCreateMember, useUpdateMember, useDeleteMember (if logAction exists)

    All descriptions generated in the ward's language using getCurrentLanguage().
  files:
    - "src/lib/dateUtils.ts"
    - "src/hooks/useSundayTypes.ts"
    - "src/hooks/useActors.ts"
    - "src/hooks/useTopics.ts"
    - "src/hooks/useAgenda.ts"
    - "src/hooks/useSpeeches.ts"
    - "src/hooks/useMembers.ts"
  dependencies: []
  parallelizable_with: ["STEP-01", "STEP-02", "STEP-03", "STEP-04", "STEP-05"]
  done_when:
    - "CR-22: formatDateHumanReadable('2026-02-15', 'pt-BR') returns '15 de Fevereiro de 2026'"
    - "CR-22: formatDateHumanReadable('2026-02-15', 'en') returns 'February 15, 2026'"
    - "CR-22: formatDateHumanReadable('2026-02-15', 'es') returns '15 de Febrero de 2026'"
    - "CR-22: All logAction calls across hooks use human-readable descriptions in ward language"
    - "CR-18: useSetSundayType logs with formatted description"
    - "CR-18: useRemoveSundayException logs an activity entry"
    - "Timestamp and email in history entries remain unchanged"
  tests:
    - type: unit
      description: "Verify formatDateHumanReadable produces correct output for all 3 locales"
    - type: unit
      description: "Verify useSetSundayType logs human-readable description"
    - type: unit
      description: "Verify useRemoveSundayException logs an activity entry"
  covers:
    acceptance_criteria: ["AC-22.1", "AC-22.2", "AC-22.3", "AC-22.4", "AC-22.5", "AC-18.1", "AC-18.2", "AC-18.3"]
    edge_cases: ["EC-22.1", "EC-22.2", "EC-18.1"]
  risks:
    - risk: "Touching 6+ hook files increases risk of merge conflicts"
      mitigation: "Changes are limited to logAction description strings -- no structural changes"
```

### STEP-10: CR-24 -- Fix Sunday Type Dropdown Selection Being Ignored (CRITICAL)

```yaml
- id: STEP-10
  description: |
    Debug and fix the sunday type dropdown issue where selecting a non-speeches type
    is ignored/reverted.

    Investigation plan based on code review:
    1. SundayCard.tsx: The SundayTypeDropdown looks correct. It calls onSelect/onRevertToSpeeches
       based on the selected type. The currentType is derived from exception?.reason ?? SUNDAY_TYPE_SPEECHES.

    2. speeches.tsx: handleTypeChange calls setSundayType.mutate({date, reason, custom_reason}).
       handleRemoveException calls removeSundayException.mutate(date). Both look correct.

    3. useSundayTypes.ts: useSetSundayType does upsert (check existing then update/insert).
       onSuccess invalidates the sundayTypes query cache. BUT it logs BEFORE invalidation finishes.
       The real issue: useRemoveSundayException DELETES the exception record. But the auto-assign
       logic (useAutoAssignSundayTypes) may re-create it on re-render if the date qualifies for
       auto-assignment (e.g., 1st Sunday of the month).

    Likely root causes:
    A. Race condition: After setSundayType.mutate succeeds, the query cache invalidation
       triggers a refetch, but the auto-assign hook fires too and may overwrite the change.
    B. The speeches.tsx renderItem uses !exception to gate children rendering. When exception
       transitions from null -> non-null, the re-render may not pick up the new exception
       immediately due to stale data in the closure.
    C. The useSundayExceptions query key includes start/end dates. If the invalidation
       doesn't match the right query key, the stale data persists.

    Fix approach:
    1. In useSetSundayType: ensure onSuccess invalidates ALL sundayTypes queries (not just
       specific key). Currently uses { queryKey: sundayTypeKeys.all } which is ['sundayTypes'] --
       this should match all queries starting with 'sundayTypes'. Verify this works.
    2. In useAutoAssignSundayTypes: ensure it does NOT overwrite user-set exceptions.
       The current code fetches existing dates first, so it should skip dates that already
       have entries. But the timing between mutation onSuccess and auto-assign firing matters.
    3. Add optimistic update in useSetSundayType to immediately update the local cache
       so the UI reflects the change without waiting for the refetch.
  files:
    - "src/hooks/useSundayTypes.ts"
    - "src/app/(tabs)/speeches.tsx"
    - "src/components/SundayCard.tsx"
    - "src/components/NextSundaysSection.tsx"
  dependencies: []
  parallelizable_with: ["STEP-01", "STEP-02", "STEP-03", "STEP-04", "STEP-05", "STEP-09"]
  done_when:
    - "Selecting 'Reuniao de Testemunho' from dropdown persists after mutation completes"
    - "Selecting any non-speeches type persists after collapse/re-expand"
    - "Selecting 'Outro' with custom reason persists"
    - "Reverting to 'Domingo com Discursos' works correctly"
    - "Query cache is properly invalidated on mutation success"
    - "Auto-assign does NOT overwrite user-set exceptions"
  tests:
    - type: unit
      description: "Verify setSundayType mutation correctly upserts exception record"
    - type: unit
      description: "Verify cache invalidation pattern is correct"
    - type: integration
      description: "Full flow: select type -> mutation -> refetch -> UI shows new type"
  covers:
    acceptance_criteria: ["AC-24.1", "AC-24.2", "AC-24.3", "AC-24.4"]
    edge_cases: ["EC-24.1"]
  risks:
    - risk: "May require optimistic cache update to prevent flicker"
      mitigation: "Implement setQueryData in onMutate for instant UI feedback"
```

### STEP-11: CR-25 -- Fix Agenda Tab Initial Scroll Position

```yaml
- id: STEP-11
  description: |
    The Agenda tab scrolls to June of the previous year instead of the next upcoming Sunday.

    Current code (agenda.tsx):
    - initialIndex is computed from listItems.findIndex matching nextSunday
    - useEffect fires scrollToIndex after a 100ms setTimeout
    - onScrollToIndexFailed provides a fallback using averageItemLength

    The issue is likely that:
    1. The 100ms timeout fires before the FlatList has measured enough items
    2. Or nextSunday is correct but the listItems array hasn't been populated yet
    3. Or the year separator items throw off the index calculation

    Fix approach:
    - Add a getItemLayout callback so FlatList can compute scroll offsets without
      measuring items. Since items have variable heights (year separator vs sunday card),
      use an estimated item size and rely on onScrollToIndexFailed as a backup.
    - Alternatively, increase the timeout and add a guard to retry if the initial
      scroll fails.
    - Best approach: use initialScrollIndex prop combined with getItemLayout for
      approximate positioning, then let onScrollToIndexFailed fine-tune.
  files:
    - "src/app/(tabs)/agenda.tsx"
  dependencies: []
  parallelizable_with: ["STEP-01", "STEP-02", "STEP-03", "STEP-04", "STEP-05", "STEP-09", "STEP-10"]
  done_when:
    - "Tapping the Agenda tab for the first time scrolls to the next upcoming Sunday"
    - "If no upcoming Sunday in range, scrolls to the last available Sunday"
    - "Returning to the tab maintains scroll position"
  tests:
    - type: e2e
      description: "Manual: open Agenda tab, verify first visible card is next Sunday"
  covers:
    acceptance_criteria: ["AC-25.1", "AC-25.2"]
    edge_cases: ["EC-25.1"]
  risks:
    - risk: "getItemLayout with variable item heights may cause slight scroll offset errors"
      mitigation: "onScrollToIndexFailed corrects any offset errors"
```

### STEP-12: CR-26 -- Redesign Actors Solution (MAJOR)

```yaml
- id: STEP-12
  description: |
    This is the largest change in the batch. It involves:

    Part A: Remove Actors from Settings
    1. In settings/index.tsx: remove the "Actors" menu item and its navigation
    2. Delete src/app/(tabs)/settings/actors.tsx file
    3. Remove settings.actors i18n key from all 3 locales (the label shown in UI)

    Part B: Rewrite ActorSelector component
    Rewrite src/components/ActorSelector.tsx as a 2/3-screen-height bottom-sheet dialog:
    - Modal height: 67% of screen (Dimensions.get('window').height * 0.67)
    - Bottom-anchored (justifyContent: 'flex-end' on overlay)
    - Search input at top
    - '+' Add button (name-only input; role flags inferred from roleFilter prop)
    - Actor list with each row showing: name | edit icon | delete icon
    - On select: populate parent field, close dialog
    - On add: create actor with appropriate role flag based on roleFilter
    - On edit: inline name editing
    - On delete: Alert confirmation, then delete

    Part C: Update AgendaForm to use rewritten ActorSelector
    Replace the inline ActorSelectorModal in AgendaForm.tsx with the standalone
    ActorSelector component. The current ActorSelectorModal (lines 634-678) is a
    simple list modal -- replace it with ActorSelector which now has full CRUD.

    For actor fields (presiding, conducting, pianist/regente, recognized_names):
    - When the SelectorField is tapped, open ActorSelector with the correct roleFilter
    - ActorSelector handles selection internally and calls onSelect callback
    - Remove the old ActorSelectorModal from AgendaForm

    Part D: Remove "Ator"/"Atores" from UI
    Scan all i18n locale files and component code for any user-visible reference to
    "Ator", "Atores", "Actor", "Actors" and replace with functional labels.
    - settings.actors key: remove (no longer used)
    - actors.title: remove
    - actors.addActor: remove
    - actors.actorName: remove
    - Any remaining references: replace with context-appropriate labels

    Business rules for inline actor creation:
    - roleFilter='can_preside' -> sets can_preside=true
    - roleFilter='can_conduct' -> sets can_conduct=true AND can_preside=true
    - roleFilter='can_recognize' -> sets can_recognize=true
    - roleFilter='can_music' -> sets can_music=true
    - Edit only changes name, not role flags
    - Deleting an actor does NOT remove snapshot names from existing agendas
  files:
    - "src/app/(tabs)/settings/index.tsx"
    - "src/app/(tabs)/settings/actors.tsx" (DELETE)
    - "src/components/ActorSelector.tsx" (REWRITE)
    - "src/components/AgendaForm.tsx"
    - "src/hooks/useActors.ts" (verify CRUD hooks; may need useUpdateActor, useDeleteActor)
    - "src/i18n/locales/pt-BR.json"
    - "src/i18n/locales/en.json"
    - "src/i18n/locales/es.json"
  dependencies: ["STEP-05"]
  parallelizable_with: []
  done_when:
    - "Settings screen has NO 'Actors'/'Atores' menu item"
    - "actors.tsx file is deleted"
    - "Actor fields in agenda card open a 2/3-screen bottom-sheet dialog"
    - "Dialog has search, add (+), edit, delete functionality"
    - "Adding actor from 'presiding' field sets can_preside=true"
    - "Adding actor from 'conducting' field sets can_conduct=true AND can_preside=true"
    - "Adding actor from 'recognized' field sets can_recognize=true"
    - "Adding actor from 'music' field sets can_music=true"
    - "Edit changes name only"
    - "Delete shows confirmation alert"
    - "The word 'Ator'/'Atores'/'Actor'/'Actors' does NOT appear anywhere in the UI"
    - "Old ActorSelectorModal in AgendaForm is removed"
    - "Snapshot names in existing agendas are not affected by actor deletion"
  tests:
    - type: unit
      description: "Verify ActorSelector filters actors by roleFilter"
    - type: unit
      description: "Verify adding actor from 'can_conduct' field also sets can_preside"
    - type: unit
      description: "Verify 'Ator'/'Atores' does not appear in any i18n visible label"
    - type: integration
      description: "Full flow: open actor field -> search -> add -> select -> close"
  covers:
    acceptance_criteria: ["AC-26.1", "AC-26.2", "AC-26.3", "AC-26.4", "AC-26.5", "AC-26.6", "AC-26.7", "AC-26.8", "AC-26.9", "AC-26.10"]
    edge_cases: ["EC-26.1", "EC-26.2", "EC-26.3"]
  risks:
    - risk: "Major component rewrite may introduce regressions"
      mitigation: "Keep existing useActors hooks; only change the UI layer"
    - risk: "useActors hooks may not have update/delete mutations"
      mitigation: "Add them if missing; check useActors.ts for existing CRUD"
```

### STEP-13: CR-28 -- Use 2/3 Screen Dialog for Hymn Selection

```yaml
- id: STEP-13
  description: |
    Change the HymnSelectorModal in AgendaForm.tsx from a floating centered modal
    to a 2/3-screen-height bottom-sheet dialog, matching the ActorSelector from CR-26.

    Current modal (AgendaForm.tsx lines 680-744):
    - modalOverlay: justifyContent 'center' (centered)
    - modalContent + hymnModal: maxHeight 500
    - Transparent overlay with fade animation

    New style:
    - modalOverlay: justifyContent 'flex-end' (bottom-anchored)
    - modalContent: height 67% of screen, borderTopLeftRadius 16, borderTopRightRadius 16
    - Remove maxHeight, use fixed height from Dimensions
    - Change animationType to 'slide' for bottom-sheet feel
    - Keep search input and FlatList as-is
  files:
    - "src/components/AgendaForm.tsx"
  dependencies: ["STEP-12"]
  parallelizable_with: []
  done_when:
    - "Hymn selector dialog occupies ~2/3 of screen height"
    - "Dialog is bottom-anchored (slides up from bottom)"
    - "Search input still works for filtering hymns"
    - "Selecting a hymn populates the field and closes the dialog"
  tests:
    - type: e2e
      description: "Manual: tap hymn field, verify dialog is 2/3 screen bottom-sheet"
  covers:
    acceptance_criteria: ["AC-28.1", "AC-28.2", "AC-28.3", "AC-28.4"]
    edge_cases: []
  risks:
    - risk: "None significant -- style-only change on modal"
      mitigation: "N/A"
```

### STEP-14: CR-29 -- Rename Agenda Section Labels + Dynamic Sections

```yaml
- id: STEP-14
  description: |
    Change the agenda form section headers and add dynamic section rendering for
    special meeting types.

    Current section headers in AgendaForm.tsx:
    - Section 1: t('agenda.presiding') -> "Presidir"
    - Section 2: t('agenda.wardBusiness') -> "Assuntos da Ala"
    - Section 3 (normal): t('speeches.title') -> "Discursos"
    - Section 4: (no header -- 3rd speech just follows intermediate hymn)

    New section headers:
    - Section 1: t('agenda.sectionWelcome') -> "Boas-vindas, Anuncios e Reconhecimentos"
    - Section 2: t('agenda.sectionSacrament') -> "Designacoes e Sacramento"
    - Section 3 (normal): t('agenda.sectionFirstSpeeches') -> "Primeiros Discursos"
    - Section 4 (normal): t('agenda.sectionLastSpeech') -> "Ultimo Discurso"

    Special meeting types:
    - testimony_meeting: replace sections 3+4 with t('agenda.sectionTestimonies') -> "Testemunhos"
    - primary_presentation: replace sections 3+4 with t('agenda.sectionPrimaryPresentation')
      -> "Apresentacao Especial da Primaria"
    - ward_conference / other: use existing t(`sundayExceptions.${reason}`) or custom_reason

    Add new i18n keys in all 3 locales (6 new keys per locale).

    In AgendaForm.tsx, restructure the sections:
    1. Replace SectionHeader titles with new i18n keys
    2. Add SectionHeader for section 4 (before the 3rd speech)
    3. For special meetings, the isSpecial branch already renders a single section --
       just update the section header to use the appropriate key based on exceptionReason
  files:
    - "src/components/AgendaForm.tsx"
    - "src/i18n/locales/pt-BR.json"
    - "src/i18n/locales/en.json"
    - "src/i18n/locales/es.json"
  dependencies: ["STEP-13"]
  parallelizable_with: []
  done_when:
    - "Normal meeting sections: Welcome, Sacrament, First Speeches, Final Speech"
    - "Testimony meeting: sections 3+4 replaced by 'Testemunhos'"
    - "Primary presentation: sections 3+4 replaced by 'Apresentacao Especial da Primaria'"
    - "All 3 languages have correct translations for all 6 new section keys"
    - "Ward conference / other types use their translated type name as section header"
  tests:
    - type: unit
      description: "Verify new i18n keys exist in all 3 locales"
    - type: e2e
      description: "Manual: open agenda for normal meeting, verify 4 section headers"
    - type: e2e
      description: "Manual: open agenda for testimony meeting, verify 'Testemunhos' section"
  covers:
    acceptance_criteria: ["AC-29.1", "AC-29.2", "AC-29.3", "AC-29.4", "AC-29.5", "AC-29.6"]
    edge_cases: ["EC-29.1"]
  risks:
    - risk: "Changing section boundaries may affect field grouping"
      mitigation: "The fields themselves don't move -- only the section header labels change"
```

### STEP-15: Test Updates -- Fix Any Tests Broken by Batch 2 Changes

```yaml
- id: STEP-15
  description: |
    Update all existing tests that may be broken by the changes in steps 01-14:
    - Tests referencing settings.actors menu item
    - Tests referencing old i18n key values (musicalNumber, whatsappTemplate)
    - Tests checking permissions for secretary role
    - Tests for dateUtils (add tests for new formatDateHumanReadable function)
    - Tests for ActorSelector (update to match new 2/3-screen dialog behavior)
    - Any tests that import from actors.tsx (file deleted)
    Run npx vitest run and fix all failures.
  files:
    - "src/__tests__/*"
  dependencies: ["STEP-01", "STEP-02", "STEP-03", "STEP-04", "STEP-05", "STEP-06", "STEP-07", "STEP-08", "STEP-09", "STEP-10", "STEP-11", "STEP-12", "STEP-13", "STEP-14"]
  parallelizable_with: []
  done_when:
    - "npx vitest run exits with 0 failures"
    - "All new features have basic test coverage"
  tests:
    - type: unit
      description: "Full test suite green"
  covers:
    acceptance_criteria: []
    edge_cases: []
  risks:
    - risk: "Unforeseen test interactions"
      mitigation: "Fix immediately as part of this step"
```

### STEP-16: TypeScript Compilation Check

```yaml
- id: STEP-16
  description: |
    Run npx tsc --noEmit to verify no TypeScript errors were introduced.
    Fix any type errors.
  files: []
  dependencies: ["STEP-15"]
  parallelizable_with: []
  done_when:
    - "npx tsc --noEmit exits with 0 errors"
  tests:
    - type: integration
      description: "TypeScript compiles cleanly"
  covers:
    acceptance_criteria: []
    edge_cases: []
  risks:
    - risk: "None"
      mitigation: "N/A"
```

### STEP-17: Full Regression Test Run + Manual Verification

```yaml
- id: STEP-17
  description: |
    Run the complete test suite and perform manual verification of all 20 CRs.
    Fix any remaining issues.
  files: []
  dependencies: ["STEP-16"]
  parallelizable_with: []
  done_when:
    - "npx vitest run exits with 0 failures"
    - "npx tsc --noEmit exits with 0 errors"
    - "All 20 CRs verified manually"
  tests:
    - type: integration
      description: "Full test suite green"
    - type: e2e
      description: "Manual verification of all 20 CRs"
  covers:
    acceptance_criteria: []
    edge_cases: ["EC-ALL: Full regression across all modules"]
  risks:
    - risk: "Unforeseen interactions between changes"
      mitigation: "Fix immediately as part of this step"
```

### STEP-18: QA Tests for All 20 CRs

```yaml
- id: STEP-18
  description: |
    Add comprehensive QA tests for all 20 CRs (similar to cr001-qa.test.ts from batch 1).
    Create src/__tests__/cr002-qa.test.ts with test cases covering all acceptance criteria.
  files:
    - "src/__tests__/cr002-qa.test.ts"
  dependencies: ["STEP-17"]
  parallelizable_with: []
  done_when:
    - "cr002-qa.test.ts file exists with tests for all 20 CRs"
    - "All QA tests pass"
    - "Tests cover critical paths: CR-24 dropdown, CR-26 actors inline, CR-27 debounce"
  tests:
    - type: unit
      description: "All QA tests green"
  covers:
    acceptance_criteria: ["ALL"]
    edge_cases: ["ALL"]
  risks:
    - risk: "None"
      mitigation: "N/A"
```

---

## Validation

```yaml
validation:
  - ac_id: CR-11
    how_to_verify: "Start Expo Go. App should display in ward's configured language after auth loads."
    covered_by_steps: ["STEP-02"]

  - ac_id: CR-12
    how_to_verify: "Navigate to Settings > WhatsApp template. Title reads 'Modelo de Convite pelo WhatsApp'."
    covered_by_steps: ["STEP-01"]

  - ac_id: CR-13
    how_to_verify: "Create a new ward. Default template does not contain {tema}."
    covered_by_steps: ["STEP-03"]

  - ac_id: CR-14
    how_to_verify: "Create a new ward. Default template matches specified text."
    covered_by_steps: ["STEP-03"]

  - ac_id: CR-15
    how_to_verify: "On WhatsApp template screen, tap a placeholder chip. Placeholder inserts at cursor position."
    covered_by_steps: ["STEP-08"]

  - ac_id: CR-16
    how_to_verify: "On WhatsApp template screen, chips are larger, editor text is larger, preview text is larger."
    covered_by_steps: ["STEP-07"]

  - ac_id: CR-17
    how_to_verify: "On WhatsApp template screen, back button visible at top-left. Tap it to return to Settings."
    covered_by_steps: ["STEP-04"]

  - ac_id: CR-18
    how_to_verify: "Change a sunday type. Check History screen for new entry with human-readable text."
    covered_by_steps: ["STEP-09"]

  - ac_id: CR-19
    how_to_verify: "On History screen, back button visible. Tap to return to Settings."
    covered_by_steps: ["STEP-04"]

  - ac_id: CR-20
    how_to_verify: "On Topics screen, back button visible. Tap to return to Settings."
    covered_by_steps: ["STEP-04"]

  - ac_id: CR-21
    how_to_verify: "On Topics screen, '+' button is inside Ward Topics section, not in title."
    covered_by_steps: ["STEP-06"]

  - ac_id: CR-22
    how_to_verify: "Check History screen. New entries show human-readable text like 'Domingo dia 15 de Fevereiro de 2026 foi ajustado para ser Reuniao de Testemunho'."
    covered_by_steps: ["STEP-09"]

  - ac_id: CR-23
    how_to_verify: "Login as secretary. Settings shows Users menu item. Navigate to Users screen."
    covered_by_steps: ["STEP-01"]

  - ac_id: CR-24
    how_to_verify: "Select 'Reuniao de Testemunho' from dropdown. It persists after collapse/re-expand and after reloading."
    covered_by_steps: ["STEP-10"]

  - ac_id: CR-25
    how_to_verify: "Tap Agenda tab. First visible card is the next upcoming Sunday."
    covered_by_steps: ["STEP-11"]

  - ac_id: CR-26
    how_to_verify: "Settings has no Actors item. Tap actor field in agenda -> 2/3 screen dialog with search/add/edit/delete. No 'Ator'/'Atores' in UI."
    covered_by_steps: ["STEP-12"]

  - ac_id: CR-27
    how_to_verify: "Type in Announcements field quickly. No characters dropped. Field has 3-line minimum height."
    covered_by_steps: ["STEP-05"]

  - ac_id: CR-28
    how_to_verify: "Tap hymn field in agenda card. Hymn selector opens as 2/3 screen bottom-sheet."
    covered_by_steps: ["STEP-13"]

  - ac_id: CR-29
    how_to_verify: "Open normal agenda: sections are Welcome, Sacrament, First Speeches, Final Speech. Open testimony: sections 3+4 replaced by 'Testemunhos'."
    covered_by_steps: ["STEP-14"]

  - ac_id: CR-30
    how_to_verify: "Toggle in agenda shows 'Apresentacao Especial' not 'Numero musical'."
    covered_by_steps: ["STEP-01"]
```

---

## Execution Order Diagram

```
Phase 1 (Independent, can all run in parallel):
  STEP-01 (CR-12+23+30 i18n+perm) ────────────┐
  STEP-02 (CR-11 language on start) ───────────┤
  STEP-03 (CR-13+14 WhatsApp template) ────────┤
  STEP-04 (CR-17+19+20 back buttons) ──────────┤
  STEP-05 (CR-27 DebouncedTextInput) ──────────┤
  STEP-09 (CR-22+18 human-readable log) ───────┤
  STEP-10 (CR-24 dropdown fix) ────────────────┤
  STEP-11 (CR-25 scroll position) ─────────────┤
                                                |
Phase 2 (depends on STEP-04):                  |
  STEP-06 (CR-21 topics add button) ───────────┤
  STEP-07 (CR-16 WhatsApp layout) ─────────────┤
    |                                           |
  STEP-08 (CR-15 clickable placeholders) ──────┤
                                                |
Phase 3 (sequential, depends on STEP-05):      |
  STEP-12 (CR-26 actors redesign) ─────────────┤
    |                                           |
  STEP-13 (CR-28 hymn dialog sizing) ──────────┤
    |                                           |
  STEP-14 (CR-29 section labels) ──────────────┤
                                                |
Phase 4 (final):                               |
  STEP-15 (test updates) <─────────────────────┘
    |
  STEP-16 (TypeScript check)
    |
  STEP-17 (full regression)
    |
  STEP-18 (QA tests)
```

### Parallel Tracks

- **Track A (i18n + permissions):** STEP-01
- **Track B (auth + WhatsApp):** STEP-02, STEP-03, STEP-04 -> STEP-06, STEP-07 -> STEP-08
- **Track C (AgendaForm pipeline):** STEP-05 -> STEP-12 -> STEP-13 -> STEP-14
- **Track D (debugging + hooks):** STEP-09, STEP-10, STEP-11

STEP-05 (DebouncedTextInput) is on the critical path because STEP-12, STEP-13, and STEP-14 all modify AgendaForm.tsx and should be done sequentially after the text input fix.

### File Conflict Map

Files modified by multiple steps (must be done sequentially):

| File | Steps | Resolution |
|------|-------|------------|
| `src/components/AgendaForm.tsx` | STEP-05, STEP-12, STEP-13, STEP-14 | Sequential: 05 -> 12 -> 13 -> 14 |
| `src/i18n/locales/pt-BR.json` | STEP-01, STEP-12, STEP-14 | STEP-01 first (non-conflicting keys), then 12, then 14 |
| `src/i18n/locales/en.json` | STEP-01, STEP-12, STEP-14 | Same |
| `src/i18n/locales/es.json` | STEP-01, STEP-12, STEP-14 | Same |
| `src/app/(tabs)/settings/whatsapp.tsx` | STEP-04, STEP-07, STEP-08 | Sequential: 04 -> 07 -> 08 |
| `src/app/(tabs)/settings/topics.tsx` | STEP-04, STEP-06 | Sequential: 04 -> 06 |
| `src/hooks/useSundayTypes.ts` | STEP-09, STEP-10 | Independent sections (logAction vs mutation logic) |
