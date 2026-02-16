# Change Requests Batch 2 - Structured Requirements (SPEC_CR2)

Source: `docs/CHANGE_REQUESTS_2.txt`

---

## SPEC_SUMMARY

```yaml
type: spec_summary
goal: "Implement 20 change requests (CR-11 to CR-30) covering bug fixes, UI improvements, and a major actors solution redesign"
in_scope:
  - "CR-11: Fix app language defaulting to EN on Expo start"
  - "CR-12: Rename WhatsApp template screen title"
  - "CR-13: Remove {tema} placeholder from default WhatsApp template"
  - "CR-14: Set correct default WhatsApp template text"
  - "CR-15: Make WhatsApp placeholders clickable (insert into template)"
  - "CR-16: Improve WhatsApp template screen space usage"
  - "CR-17: Add back button to WhatsApp template screen"
  - "CR-18: Fix sunday type change not logged in activity history"
  - "CR-19: Add back button to History screen"
  - "CR-20: Add back button to Topics screen"
  - "CR-21: Move Topics add button inside Ward Topics section"
  - "CR-22: Make activity log entries human-readable"
  - "CR-23: Fix secretary missing user management permission"
  - "CR-24: Fix sunday type dropdown selection being ignored"
  - "CR-25: Fix Agenda tab initial scroll position showing past date"
  - "CR-26: Redesign actors solution (inline management in agenda cards)"
  - "CR-27: Fix text input letter-eating bug and resize announcements field"
  - "CR-28: Use 2/3 screen dialog for hymn selection in agenda cards"
  - "CR-29: Rename agenda section labels and add dynamic sections for special meetings"
  - "CR-30: Rename 'Numero musical' to 'Apresentacao especial' across all locales"
out_of_scope:
  - "New features not described in the 20 CRs"
  - "Changes to the registration flow beyond language initialization"
  - "Database schema changes beyond what CRs require"
main_risks:
  - "CR-26 is a major architectural change to actors management (removing settings screen, adding inline management)"
  - "CR-24 may indicate a deeper issue with the SundayCard/useSundayTypes mutation flow"
  - "CR-27 text input letter-eating may be a React Native performance issue requiring careful investigation"
  - "CR-22 requires changing how activity log descriptions are generated across all mutation hooks"
ac_count: 47
edge_case_count: 15
has_open_questions: true
has_unconfirmed_assumptions: true
```

---

## SPEC (Complete)

```yaml
type: spec
version: 1
goal: "Fix 20 bugs and implement UI improvements for the Sacrament Meeting Planner app (CR-11 to CR-30)"

scope:
  in:
    - "App language initialization on Expo start (CR-11)"
    - "WhatsApp template screen improvements: rename, template, placeholders, layout, back button (CR-12 to CR-17)"
    - "Activity log: missing entries and human-readable descriptions (CR-18, CR-22)"
    - "Back buttons for History and Topics screens (CR-19, CR-20)"
    - "Topics screen add button repositioning (CR-21)"
    - "Secretary user management permission (CR-23)"
    - "Sunday type dropdown fix (CR-24)"
    - "Agenda tab initial scroll position (CR-25)"
    - "Complete actors solution redesign (CR-26)"
    - "Text input letter-eating fix and announcements field sizing (CR-27)"
    - "Hymn selector dialog sizing in agenda cards (CR-28)"
    - "Agenda section label renaming and dynamic sections (CR-29)"
    - "Musical number label rename to special presentation (CR-30)"
  out:
    - "New features not described in the CRs"
    - "Performance optimization beyond fixing the text input bug"
    - "Changes to database RLS policies"
    - "Changes to Edge Functions"
```

---

## CR-11: App Language Defaults to English on Expo Start

- **Type:** BUG
- **Description:** Every time Expo Go starts, the app appears in English regardless of the ward's configured language. The `initI18n()` at the bottom of `src/i18n/index.ts` runs before the AuthContext has loaded the ward data, so it defaults to device locale detection. The ward language should be applied as soon as ward data is available.
- **Acceptance Criteria:**
  - AC-11.1: Given a ward configured with language "pt-BR", when the app starts via Expo Go, then the UI displays in Portuguese after the auth/ward data loads (within the normal loading time). Priority: must.
  - AC-11.2: Given a ward configured with language "es", when the app starts, then the UI displays in Spanish after auth/ward loads. Priority: must.
  - AC-11.3: Given the app is loading and ward data is not yet available, when `initI18n()` runs initially, then the device locale is used as a temporary fallback until ward data is loaded. Priority: must.
  - AC-11.4: Given the ward language changes (via Settings), when the user restarts the app, then the new language is applied on startup. Priority: must.
- **Edge Cases:**
  - EC-11.1: If the user is not logged in (pre-auth), the device locale should be used; no ward language is available.
  - EC-11.2: If the ward language value is null or invalid, fall back to 'pt-BR'.
- **Files Likely Impacted:**
  - `src/i18n/index.ts` (already supports `wardLanguage` param)
  - `src/contexts/AuthContext.tsx` (must call `initI18n(ward.language)` after ward data loads)
  - `src/app/_layout.tsx` (ensure the i18n re-init propagates)

---

## CR-12: Rename WhatsApp Template Screen Title

- **Type:** UI
- **Description:** Rename the screen title from "Modelo WhatsApp" to "Modelo de Convite pelo WhatsApp" in all 3 supported languages.
- **Acceptance Criteria:**
  - AC-12.1: Given the user navigates to the WhatsApp template screen, when the screen loads, then the title displays "Modelo de Convite pelo WhatsApp" (pt-BR), "WhatsApp Invitation Template" (en), "Modelo de Invitacion por WhatsApp" (es). Priority: must.
  - AC-12.2: Given the Settings index screen, when the item for WhatsApp template is shown, then it also uses the updated label. Priority: must.
- **Files Likely Impacted:**
  - `src/i18n/locales/pt-BR.json` (`settings.whatsappTemplate`)
  - `src/i18n/locales/en.json`
  - `src/i18n/locales/es.json`
  - `src/app/(tabs)/settings/whatsapp.tsx` (title reference)

---

## CR-13: Remove {tema} from Default WhatsApp Template

- **Type:** BUG
- **Description:** The placeholder `{tema}` is not a valid placeholder. It should be removed from the default template stored in the ward record. The valid placeholders are: `{nome}`, `{data}`, `{posicao}`, `{duracao}`, `{colecao}`, `{titulo}`, `{link}`.
- **Acceptance Criteria:**
  - AC-13.1: Given the PLACEHOLDERS constant in `whatsapp.tsx`, when listing placeholders, then `{tema}` is NOT included. Priority: must.
  - AC-13.2: Given a new ward is created, when the default `whatsapp_template` is stored, then it does not contain `{tema}`. Priority: must.
- **Edge Cases:**
  - EC-13.1: Existing wards that already have `{tema}` in their template should not be automatically modified -- the user can edit manually.
- **Files Likely Impacted:**
  - `src/app/(tabs)/settings/whatsapp.tsx` (PLACEHOLDERS constant, if `{tema}` is there)
  - `supabase/migrations/` (default template in ward creation, if hardcoded)
  - `supabase/functions/register-first-user/` (if template default is set there)

---

## CR-14: Set Correct Default WhatsApp Template

- **Type:** UI
- **Description:** The default WhatsApp template text should be: "Ola {nome}, voce foi designado(a) para o {posicao} discurso no dia {data} sobre o tema {colecao} - {titulo} ({link}). Podemos confirmar o seu discurso? Obrigado!"
- **Acceptance Criteria:**
  - AC-14.1: Given a new ward is created, when the default `whatsapp_template` is set, then it contains the exact template text above. Priority: must.
  - AC-14.2: Given the `SAMPLE_DATA` for preview, when rendering the preview, then all placeholders in the new template are correctly replaced with sample values. Priority: must.
- **Edge Cases:**
  - EC-14.1: Existing wards keep their current template; only new wards get the updated default.
- **Files Likely Impacted:**
  - `supabase/functions/register-first-user/` (default template on ward creation)
  - `supabase/migrations/` (if default is defined in migration)
  - `src/app/(tabs)/settings/whatsapp.tsx` (sample data alignment)

---

## CR-15: Make WhatsApp Placeholders Clickable

- **Type:** UI Enhancement
- **Description:** When a placeholder chip is tapped, it should insert the placeholder text at the current cursor position in the template TextInput (or append to the end if no cursor position is tracked).
- **Acceptance Criteria:**
  - AC-15.1: Given the user is on the WhatsApp template screen, when they tap a placeholder chip (e.g., `{nome}`), then the placeholder text is inserted into the template TextInput at the current cursor position. Priority: must.
  - AC-15.2: Given the template input has no selection/cursor, when a placeholder is tapped, then the placeholder is appended at the end of the template text. Priority: should.
  - AC-15.3: Given a placeholder is inserted, when the preview section is visible, then the preview immediately updates to reflect the new template. Priority: must.
- **Edge Cases:**
  - EC-15.1: If the same placeholder is tapped multiple times, each tap inserts another copy.
- **Files Likely Impacted:**
  - `src/app/(tabs)/settings/whatsapp.tsx` (placeholder chips onPress, TextInput selection tracking)

---

## CR-16: Improve WhatsApp Template Screen Space Usage

- **Type:** UI Enhancement
- **Description:** The current WhatsApp template screen wastes half the screen. Improvements: make placeholder chips larger, increase the template editor font size, and increase the preview text font size.
- **Acceptance Criteria:**
  - AC-16.1: Given the WhatsApp template screen is shown, when looking at placeholders, then the chips are visually larger (fontSize >= 15, padding >= 8 vertical / 14 horizontal). Priority: must.
  - AC-16.2: Given the template editor, when viewing it, then the text is larger (fontSize >= 17) and the editor has a minimum height of at least 160px. Priority: must.
  - AC-16.3: Given the preview section, when viewing it, then the text is larger (fontSize >= 17). Priority: must.
- **Files Likely Impacted:**
  - `src/app/(tabs)/settings/whatsapp.tsx` (StyleSheet adjustments)

---

## CR-17: Add Back Button to WhatsApp Template Screen

- **Type:** UI
- **Description:** The WhatsApp template screen has no back button. Add a back button consistent with the About screen's back button style (text-based, top-left).
- **Acceptance Criteria:**
  - AC-17.1: Given the user is on the WhatsApp template screen, when viewing the header area, then a back button is visible at the top-left. Priority: must.
  - AC-17.2: Given the user taps the back button, when navigating, then the app returns to the Settings index screen. Priority: must.
  - AC-17.3: The back button label uses the `common.back` i18n key and matches the style of the About screen back button. Priority: must.
- **Files Likely Impacted:**
  - `src/app/(tabs)/settings/whatsapp.tsx` (add header with back button)

---

## CR-18: Sunday Type Change Not Logged in Activity History

- **Type:** BUG
- **Description:** When the user changes a sunday type (e.g., from "Domingo com Discursos" to "Reuniao de Testemunho"), the change is not recorded in the activity log. The `useSetSundayType` mutation in `useSundayTypes.ts` calls `logAction` but the activity log description uses raw enum values instead of human-readable text. Additionally, the `useRemoveSundayException` mutation does not log at all.
- **Acceptance Criteria:**
  - AC-18.1: Given a user changes a sunday type via the dropdown, when the mutation succeeds, then an entry appears in the activity history. Priority: must.
  - AC-18.2: Given a user reverts a sunday to "Domingo com Discursos" (removes exception), when the mutation succeeds, then an entry appears in the activity history. Priority: must.
  - AC-18.3: The activity log description uses human-readable text (not raw enum keys). See CR-22 for format details. Priority: must.
- **Edge Cases:**
  - EC-18.1: Auto-assigned sunday types (batch assignment on page load) should NOT be logged -- only user-initiated changes.
- **Files Likely Impacted:**
  - `src/hooks/useSundayTypes.ts` (`useSetSundayType` and `useRemoveSundayException` mutations)
  - `src/lib/activityLog.ts` (no changes needed, just ensure called correctly)

---

## CR-19: Add Back Button to History Screen

- **Type:** UI
- **Description:** The Activity History screen has no back button. Add a back button matching the About screen style.
- **Acceptance Criteria:**
  - AC-19.1: Given the user is on the History screen, when viewing the header, then a back button is visible at the top-left. Priority: must.
  - AC-19.2: Given the user taps the back button, then the app returns to the Settings index. Priority: must.
  - AC-19.3: The back button uses `common.back` i18n key and matches the About screen style. Priority: must.
- **Files Likely Impacted:**
  - `src/app/(tabs)/settings/history.tsx` (add header with back button)

---

## CR-20: Add Back Button to Topics Screen

- **Type:** UI
- **Description:** The Topics screen has no back button. Add a back button matching the About screen style.
- **Acceptance Criteria:**
  - AC-20.1: Given the user is on the Topics screen, when viewing the header, then a back button is visible at the top-left. Priority: must.
  - AC-20.2: Given the user taps the back button, then the app returns to the Settings index. Priority: must.
  - AC-20.3: The back button uses `common.back` i18n key and matches the About screen style. Priority: must.
- **Files Likely Impacted:**
  - `src/app/(tabs)/settings/topics.tsx` (modify header to include back button)

---

## CR-21: Move Topics Add Button Inside Ward Topics Section

- **Type:** UI
- **Description:** The "+" button to add a new ward topic is currently in the screen title header area. It should be inside the "Ward Topics" section header, next to the section title. This makes it clearer that the add button creates a ward topic, not a collection.
- **Acceptance Criteria:**
  - AC-21.1: Given the user is on the Topics screen, when viewing the main header, then there is NO "+" button next to the screen title. Priority: must.
  - AC-21.2: Given the Ward Topics section header, when viewing it, then the "+" button is placed to the right of the "Ward Topics" section title. Priority: must.
  - AC-21.3: The "+" button functionality (creating a new ward topic) remains the same. Priority: must.
- **Files Likely Impacted:**
  - `src/app/(tabs)/settings/topics.tsx` (move add button from header to section)

---

## CR-22: Make Activity Log Entries Human-Readable

- **Type:** UI Enhancement
- **Description:** Activity log descriptions currently display raw/machine-readable text like "Tipo de Domingo alterado: 2026-02-15 -> testimony_meeting". Instead, they should display human-friendly text like "Domingo dia 15 de Fevereiro de 2026 foi ajustado para ser Reuniao de Testemunho". The timestamp and email formatting are good and should be kept.
- **Acceptance Criteria:**
  - AC-22.1: Given a sunday type change log entry, when displayed, then the description reads in the format: "Domingo dia [DD] de [Month] de [YYYY] foi ajustado para ser [translated type name]" (in the ward's language). Priority: must.
  - AC-22.2: Given a member creation/edit/deletion log entry, when displayed, then the description uses a friendly format with the member name (not just IDs). Priority: should.
  - AC-22.3: Given a speech assignment log entry, when displayed, then the description mentions the speaker name and sunday date in readable format. Priority: should.
  - AC-22.4: Given any log entry, when displayed, then the timestamp and email remain in their current format (working correctly). Priority: must.
  - AC-22.5: The human-readable descriptions must be generated in the ward's configured language at the time the action is logged. Priority: must.
- **Edge Cases:**
  - EC-22.1: Historical log entries (already stored with raw text) will continue to display the old format -- only new entries will use the human-readable format.
  - EC-22.2: If the ward language changes, old entries retain their original language.
- **Files Likely Impacted:**
  - `src/hooks/useSundayTypes.ts` (update `logAction` description in `useSetSundayType`, `useRemoveSundayException`)
  - `src/hooks/useMembers.ts` (update logAction descriptions)
  - `src/hooks/useSpeeches.ts` (update logAction descriptions)
  - `src/hooks/useActors.ts` (update logAction descriptions)
  - `src/hooks/useTopics.ts` (update logAction descriptions)
  - `src/hooks/useAgenda.ts` (update logAction descriptions)
  - `src/lib/dateUtils.ts` (may need a helper to format dates as "DD de Month de YYYY")

---

## CR-23: Secretary Missing User Management Permission

- **Type:** BUG
- **Description:** The secretary role cannot see the "Users" menu item in Settings because it lacks the `settings:users` permission. According to the SPEC (section 4.2), only Bishopric can manage users (CRUD). However, the user reports the secretary should have this access. This is a change to the permission model.
- **Acceptance Criteria:**
  - AC-23.1: Given a user with the "secretary" role, when viewing the Settings screen, then the "Users" menu item is visible. Priority: must.
  - AC-23.2: Given a secretary navigates to the Users screen, when viewing the list, then they can see all users in the ward. Priority: must.
  - AC-23.3: Given the permission model, when checking the secretary's permissions, then `settings:users` is included. Priority: must.
- **Edge Cases:**
  - EC-23.1: The secretary should be able to list users but the scope of what they can edit (role changes, deletions) may differ. Assumed: full user management for secretary, same as bishopric.
- **Files Likely Impacted:**
  - `src/lib/permissions.ts` (add `settings:users` to secretary role)
  - `src/types/database.ts` (no changes needed, permission type already includes `settings:users`)

---

## CR-24: Sunday Type Dropdown Selection Being Ignored

- **Type:** CRITICAL BUG
- **Description:** When selecting any option other than "Domingo com Discursos" in the sunday type dropdown, the selection is ignored and reverts. This means the `useSetSundayType` mutation is either failing silently or the UI is not correctly handling the mutation result.
- **Acceptance Criteria:**
  - AC-24.1: Given a user expands a SundayCard and selects "Reuniao de Testemunho" from the dropdown, when the mutation completes, then the card shows "Reuniao de Testemunho" as the selected type persistently. Priority: must.
  - AC-24.2: Given a user selects any non-speeches type, when they collapse and re-expand the card, then the selected type persists. Priority: must.
  - AC-24.3: Given a user selects "Outro" and enters a custom reason, when they confirm, then the custom reason is saved and displayed. Priority: must.
  - AC-24.4: Given the mutation succeeds, when the query cache is invalidated, then the SundayCard re-renders with the new type from the server. Priority: must.
- **Edge Cases:**
  - EC-24.1: If the mutation fails (network error), the dropdown should revert to the previous value and show an error toast.
- **Files Likely Impacted:**
  - `src/components/SundayCard.tsx` (SundayTypeDropdown, mutation wiring)
  - `src/hooks/useSundayTypes.ts` (useSetSundayType mutation, useRemoveSundayException)
  - `src/app/(tabs)/speeches.tsx` (how onTypeChange is wired to the mutation)
  - `src/components/NextSundaysSection.tsx` (same wiring)

---

## CR-25: Agenda Tab Initial Scroll Position Shows Past Date

- **Type:** BUG
- **Description:** When clicking the Agenda tab for the first time, the list scrolls to a date in June of the previous year instead of the next upcoming Sunday. The `initialIndex` calculation or `scrollToIndex` call is not working correctly.
- **Acceptance Criteria:**
  - AC-25.1: Given the user taps the Agenda tab for the first time, when the list renders, then it scrolls to the next upcoming Sunday (or today if today is Sunday). Priority: must.
  - AC-25.2: Given the user scrolls away and returns to the Agenda tab, when the tab is re-selected, then the position is maintained (not reset to the past). Priority: should.
- **Edge Cases:**
  - EC-25.1: If there is no upcoming Sunday within the loaded range, scroll to the last available Sunday.
- **Files Likely Impacted:**
  - `src/app/(tabs)/agenda.tsx` (initialIndex calculation, scrollToIndex timing)
  - `src/hooks/useSundayList.ts` (nextSunday calculation)

---

## CR-26: Redesign Actors Solution (Inline Management in Agenda Cards)

- **Type:** MAJOR REDESIGN
- **Description:** The current actors management is done via a separate Settings > Actors screen. This is incorrect. The correct solution:
  1. Remove the Actors card from Settings.
  2. All actor management (add, edit, delete) is done inline within the agenda card fields.
  3. When clicking an actor field (e.g., "Presiding", "Conducting", "Pianist", "Conductor"), open a 2/3-screen-height dialog with search and a list of existing actors for that role.
  4. The dialog includes a button to add a new actor (asking only for the name; the role/type is inferred from the field that was clicked).
  5. Each actor in the dialog list has edit and delete options.
  6. The word "Actor" / "Atores" must NOT appear anywhere in the UI. Use functional labels instead (e.g., "Presidir", "Dirigir", "Pianista", "Regente", labels for the fields).
- **Acceptance Criteria:**
  - AC-26.1: Given the Settings screen, when viewing the menu items, then there is NO "Actors" / "Atores" menu item. Priority: must.
  - AC-26.2: Given the user taps an actor-type field in an agenda card (presiding, conducting, pianist, conductor), when the dialog opens, then it occupies approximately 2/3 of the screen height and includes a search input at the top. Priority: must.
  - AC-26.3: Given the actor selector dialog is open for a "presiding" field, when showing the list, then only actors with `can_preside=true` are displayed. Priority: must.
  - AC-26.4: Given the actor selector dialog, when the user taps "Add" ("+") button, then a name input appears. After entering the name and confirming, the new actor is created with the appropriate role flag set based on the field context (e.g., if opened from "pianist" field, set `can_music=true`). Priority: must.
  - AC-26.5: Given the actor list in the dialog, when each actor row is shown, then it has an edit button and a delete button (or swipe actions). Priority: must.
  - AC-26.6: Given the user taps edit on an actor in the dialog, when the edit UI appears, then only the name is editable (the role is managed by which fields reference the actor). Priority: must.
  - AC-26.7: Given the user taps delete on an actor, when confirming, then the actor is removed. Priority: must.
  - AC-26.8: Given the user selects an actor from the dialog, when the selection is made, then the field is populated with the actor's name and the dialog closes. Priority: must.
  - AC-26.9: Given any screen in the app, when displayed, then the word "Ator" or "Atores" (or "Actor" / "Actors") does NOT appear in any label, title, or button text. Priority: must.
  - AC-26.10: Given the recognized_names field in the agenda, when the user interacts with it, then it also uses the actor selector dialog filtered by `can_recognize=true`, and supports multiple selections. Priority: should.
- **Edge Cases:**
  - EC-26.1: If the actor list for a specific role is empty, the dialog shows an empty state with an add button.
  - EC-26.2: Deleting an actor that is currently assigned to a field in an existing agenda should NOT remove the snapshot name from the agenda (snapshot pattern).
  - EC-26.3: An actor can have multiple role flags (e.g., can_preside AND can_conduct). Adding an actor from the "presiding" field only sets `can_preside=true` but does not change other existing flags.
- **Files Likely Impacted:**
  - `src/app/(tabs)/settings/index.tsx` (remove Actors menu item)
  - `src/app/(tabs)/settings/actors.tsx` (deprecate/remove)
  - `src/components/AgendaForm.tsx` (replace ActorSelectorModal with new InlineActorSelector)
  - `src/components/ActorSelector.tsx` (rewrite: 2/3-screen dialog with search, add, edit, delete)
  - `src/hooks/useActors.ts` (ensure create/update/delete hooks work for inline usage)
  - `src/i18n/locales/pt-BR.json` (remove "Atores" labels, add field-specific labels)
  - `src/i18n/locales/en.json`
  - `src/i18n/locales/es.json`
- **Open Questions:**
  - Q-26.1: When adding an actor from the "conducting" field, should both `can_conduct` AND `can_preside` be set (since conducting implies presiding)?
    - Proposed default: Yes, maintain the existing business rule.
  - Q-26.2: Should the "recognized_names" field continue to store free-text names, or should it use actor references?
    - Proposed default: Use actor selector with `can_recognize` filter, storing names as snapshot.
  - Q-26.3: For the "edit" action on an actor in the dialog, should the user be able to toggle other role flags, or only edit the name?
    - Proposed default: Only name editing in the inline dialog. For role flag management, the actor inherits roles from the fields where they are used (additive).

---

## CR-27: Fix Text Input Letter-Eating and Resize Announcements Field

- **Type:** CRITICAL BUG + UI
- **Description:** Two issues: (1) Text inputs in agenda form fields appear to "eat" letters while typing (characters disappear or lag). This is likely caused by the auto-save pattern triggering re-renders on every keystroke. (2) The Announcements field should have a minimum height of 3 text lines.
- **Acceptance Criteria:**
  - AC-27.1: Given the user types in the Announcements field, when typing at normal speed, then all characters appear correctly without being dropped or eaten. Priority: must.
  - AC-27.2: Given the user types in any text field in the agenda form, when the auto-save triggers, then the cursor position is maintained and no characters are lost. Priority: must.
  - AC-27.3: Given the Announcements field is visible, when empty, then it has a minimum height of approximately 3 lines of text (~66px minimum height). Priority: must.
  - AC-27.4: Given any text input in the AgendaForm, when the user types, then there is a debounce of at least 500ms before auto-save fires (to prevent excessive re-renders). Priority: must.
- **Edge Cases:**
  - EC-27.1: Fast typing (more than 5 characters per second) should not drop characters.
  - EC-27.2: If the user clears the field entirely, the empty string should be saved correctly.
- **Files Likely Impacted:**
  - `src/components/AgendaForm.tsx` (debounce text input auto-save, adjust announcements minHeight)

---

## CR-28: Use 2/3 Screen Dialog for Hymn Selection in Agenda Cards

- **Type:** UI Enhancement
- **Description:** The hymn selector in agenda cards currently uses a floating modal dialog. Change it to a 2/3-screen-height bottom sheet style dialog (similar to the actor selector from CR-26) for better usability.
- **Acceptance Criteria:**
  - AC-28.1: Given the user taps a hymn field in an agenda card, when the hymn selector opens, then it occupies approximately 2/3 of the screen height. Priority: must.
  - AC-28.2: Given the hymn selector dialog, when displayed, then it includes a search input at the top and a scrollable list of hymns below. Priority: must.
  - AC-28.3: Given the user searches for a hymn, when typing in the search input, then the list filters by hymn number or title. Priority: must.
  - AC-28.4: Given the user selects a hymn, when tapping it, then the field is populated and the dialog closes. Priority: must.
- **Files Likely Impacted:**
  - `src/components/AgendaForm.tsx` (HymnSelectorModal styling)

---

## CR-29: Rename Agenda Section Labels and Add Dynamic Sections

- **Type:** UI Enhancement
- **Description:** Change the agenda section labels:
  - Section 1: "Boas-vindas, Anuncios e Reconhecimentos" (currently "Presiding")
  - Section 2: "Designacoes e Sacramento" (currently "Ward Business")
  - Section 3 (normal meeting): "Primeiros Discursos" (currently "Speeches")
  - Section 4 (normal meeting): "Ultimo Discurso" (currently none, the 3rd speech is just after the intermediate hymn)

  For special meeting types:
  - Testimony meeting: Sections 3 and 4 are replaced by a single section "Testemunhos"
  - Primary presentation: Sections 3 and 4 are replaced by a single section "Apresentacao Especial da Primaria"
- **Acceptance Criteria:**
  - AC-29.1: Given a normal Sunday (speeches), when the agenda card is expanded, then section labels are: "Boas-vindas, Anuncios e Reconhecimentos", "Designacoes e Sacramento", "Primeiros Discursos", "Ultimo Discurso". Priority: must.
  - AC-29.2: Given a Testimony Meeting sunday, when the agenda card is expanded, then sections 3 and 4 are replaced by a single section "Testemunhos". Priority: must.
  - AC-29.3: Given a Primary Presentation sunday, when the agenda card is expanded, then sections 3 and 4 are replaced by a single section "Apresentacao Especial da Primaria". Priority: must.
  - AC-29.4: All section labels are translated in all 3 languages (pt-BR, en, es). Priority: must.
  - AC-29.5: Given the en locale, section labels are: "Welcome, Announcements & Recognitions", "Assignments & Sacrament", "First Speeches", "Final Speech", and for special: "Testimonies", "Primary Special Presentation". Priority: must.
  - AC-29.6: Given the es locale, section labels are: "Bienvenida, Anuncios y Reconocimientos", "Asignaciones y Sacramento", "Primeros Discursos", "Ultimo Discurso", and for special: "Testimonios", "Presentacion Especial de la Primaria". Priority: must.
- **Edge Cases:**
  - EC-29.1: For "other" type meetings or ward_conference, sections 3 and 4 are replaced by the section with the translated meeting type name (same as current behavior for special meetings).
- **Files Likely Impacted:**
  - `src/components/AgendaForm.tsx` (section headers, conditional rendering)
  - `src/i18n/locales/pt-BR.json` (new agenda section keys)
  - `src/i18n/locales/en.json`
  - `src/i18n/locales/es.json`

---

## CR-30: Rename "Numero Musical" to "Apresentacao Especial"

- **Type:** UI
- **Description:** The label "Numero musical" (Musical Number) in the agenda form should be renamed to "Apresentacao especial" (Special Presentation) in all 3 languages.
- **Acceptance Criteria:**
  - AC-30.1: Given a normal Sunday agenda card is expanded, when the user sees the toggle for the presentation between speeches 2 and 3, then it reads "Apresentacao Especial" (pt-BR), "Special Presentation" (en), "Presentacion Especial" (es). Priority: must.
  - AC-30.2: Given the toggle is enabled and a text input appears, when the placeholder is shown, then it also says "Apresentacao Especial". Priority: must.
- **Files Likely Impacted:**
  - `src/i18n/locales/pt-BR.json` (`agenda.musicalNumber` key rename or new key)
  - `src/i18n/locales/en.json`
  - `src/i18n/locales/es.json`
  - `src/components/AgendaForm.tsx` (if key name changes)

---

## Assumptions

```yaml
assumptions:
  - id: A-1
    description: "CR-11: The AuthContext already loads ward data including language on login"
    confirmed: true
    default_if_not_confirmed: "Add ward language loading to AuthContext"

  - id: A-2
    description: "CR-13: The {tema} placeholder was never a valid placeholder in the PLACEHOLDERS constant"
    confirmed: false
    default_if_not_confirmed: "If it exists, remove it. If not, this CR only affects the default template text."

  - id: A-3
    description: "CR-14: The default template is set in the register-first-user Edge Function or in a migration default"
    confirmed: false
    default_if_not_confirmed: "Update wherever the default template is defined"

  - id: A-4
    description: "CR-22: Activity log descriptions are generated at write time and stored as-is in the database"
    confirmed: true
    default_if_not_confirmed: "N/A"

  - id: A-5
    description: "CR-23: The secretary should have full user management (create, edit role, delete) -- same as bishopric"
    confirmed: false
    default_if_not_confirmed: "Grant full settings:users permission to secretary"

  - id: A-6
    description: "CR-24: The sunday type dropdown bug is in the mutation wiring, not in the SundayCard UI itself"
    confirmed: false
    default_if_not_confirmed: "Debug the full flow from dropdown select -> mutation -> cache invalidation -> re-render"

  - id: A-7
    description: "CR-26: The conducting-implies-presiding business rule is maintained in inline actor creation"
    confirmed: false
    default_if_not_confirmed: "Yes, maintain the rule"

  - id: A-8
    description: "CR-27: The letter-eating bug is caused by the auto-save pattern triggering re-renders via updateField on every keystroke"
    confirmed: false
    default_if_not_confirmed: "Add debouncing to text input auto-save in AgendaForm"

  - id: A-9
    description: "CR-26: Settings > Actors screen file (actors.tsx) is removed or kept as dead code"
    confirmed: false
    default_if_not_confirmed: "Remove the file and its route"

  - id: A-10
    description: "CR-29: Ward conference uses the same section replacement as testimony_meeting (no speech sections)"
    confirmed: false
    default_if_not_confirmed: "Ward conference replaces sections 3+4 with a section titled with the translated ward conference name"
```

---

## Open Questions

```yaml
open_questions:
  - id: Q-1
    question: "CR-23: Should the secretary have full user CRUD or just read-only access to the users list?"
    proposed_default: "Full CRUD (same as bishopric) since the user explicitly says 'secretario nao tem a opcao para gerenciar usuarios do app'"

  - id: Q-2
    question: "CR-26: When adding an actor from the 'conducting' field, should can_preside also be automatically set to true?"
    proposed_default: "Yes, maintain the existing can_conduct implies can_preside rule"

  - id: Q-3
    question: "CR-26: Should the recognized_names field use the actor selector (can_recognize filter) or remain free-text?"
    proposed_default: "Use actor selector with can_recognize filter and multiple selection support"

  - id: Q-4
    question: "CR-26: Should existing actors data be migrated or is it acceptable to have actors without the new inline-management behavior?"
    proposed_default: "Keep existing actors data; just change the UI to manage them inline instead of from Settings"

  - id: Q-5
    question: "CR-14: Should the default template be per-language or always in Portuguese (since it includes Portuguese text)?"
    proposed_default: "The template is per-ward (stored in ward record). New wards get the template in the ward's configured language."

  - id: Q-6
    question: "CR-29: For 'other' type sundays, what should the section header be?"
    proposed_default: "Use the custom_reason text as the section header, or the translated 'Other' label if no custom reason"
```

---

## Definition of Done

- [ ] All 20 CRs have been implemented and tested
- [ ] All acceptance criteria pass manual testing
- [ ] All 3 languages (pt-BR, en, es) render correctly for changed labels
- [ ] Activity log entries use human-readable descriptions for new entries
- [ ] Actor management works entirely inline within agenda cards
- [ ] The word "Ator" / "Atores" / "Actor" / "Actors" does not appear in the UI
- [ ] Text inputs in agenda form do not eat/drop characters
- [ ] Back buttons work on WhatsApp, History, and Topics screens
- [ ] Sunday type dropdown selections persist correctly
- [ ] Agenda tab scrolls to the next upcoming Sunday on first load
- [ ] Secretary can access user management
- [ ] Existing functionality not affected by the changes (regression check)
- [ ] All existing tests pass
- [ ] New tests added for critical fixes (CR-24, CR-26, CR-27)
