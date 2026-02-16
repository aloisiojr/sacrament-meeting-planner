# Change Requests Batch 3 - Structured Requirements (SPEC_CR3)

Source: `docs/CHANGE_REQUESTS_3.txt`

---

## SPEC_SUMMARY

```yaml
type: spec_summary
goal: "Fix 13 issues (CR-31 to CR-43) covering spec contradictions, missing specs, outdated docs, bugs, and new features for the Sacrament Meeting Planner app"
in_scope:
  - "CR-31: Fix ASM-009 contradiction about Secretary designation permission"
  - "CR-32: Define About screen content (name, version, credits, support link)"
  - "CR-33: Global back button convention for all Stack-navigated screens"
  - "CR-34: Update PRODUCT_SPECIFICATION and SPEC.final.md to reflect CR-26 actor changes (no checkboxes)"
  - "CR-35: Remove invalid {duracao} placeholder from WhatsApp template system"
  - "CR-36: Define debounce rules for auto-save text fields in agenda"
  - "CR-37: Update docs to reflect Secretary user management permission (CR-23)"
  - "CR-38: Define presentation mode date header format"
  - "CR-39: Add search/filter field to Ward Topics screen"
  - "CR-40: Resolve add-member button position inconsistency (header vs FAB)"
  - "CR-41: Define timezone selector UI details"
  - "CR-42: Fix non-functional CSV export and import buttons in Members screen"
  - "CR-43: Add logout button in Settings tab"
out_of_scope:
  - "New features not described in the 13 CRs"
  - "Changes to database schema beyond what CRs require"
  - "Changes to Edge Functions beyond what CRs require"
  - "Performance optimization beyond debounce definition"
main_risks:
  - "CR-42 (CSV export/import) is critical — buttons exist but do not function, blocking data management"
  - "CR-31 (ASM-009 contradiction) can cause implementers to block Secretary from designating in Agenda tab"
  - "CR-35 (remove {duracao}) changes the WhatsApp template placeholder API contract, potentially breaking existing templates"
  - "CR-43 (logout) touches AuthContext and session management, must not accidentally clear local data or cause navigation issues"
ac_count: 67
edge_case_count: 25
has_open_questions: true
has_unconfirmed_assumptions: true
```

---

## SPEC (Complete)

```yaml
type: spec
version: 1
goal: "Fix 13 bugs, spec issues, and implement new features for the Sacrament Meeting Planner app (CR-31 to CR-43)"

scope:
  in:
    - "Spec correction: ASM-009 Secretary designation permission contradiction (CR-31)"
    - "About screen content definition (CR-32)"
    - "Global back button navigation convention (CR-33)"
    - "Spec update: actor management without checkboxes, reflecting CR-26 (CR-34)"
    - "Remove invalid {duracao} placeholder from WhatsApp templates (CR-35)"
    - "Debounce rule for auto-save text fields (CR-36)"
    - "Spec update: Secretary user management permission, reflecting CR-23 (CR-37)"
    - "Presentation mode date header format (CR-38)"
    - "Search/filter for Ward Topics screen (CR-39)"
    - "Resolve add-member button position inconsistency (CR-40)"
    - "Timezone selector UI definition (CR-41)"
    - "Fix CSV export and import buttons (CR-42)"
    - "Add logout button to Settings tab (CR-43)"
  out:
    - "New features not described in the CRs"
    - "Database migrations beyond what CR-42 requires"
    - "Changes to RLS policies"
    - "Changes to push notification Edge Functions"
```

---

## CR-31: Fix ASM-009 Contradiction About Secretary Designation Permission

- **Type:** SPEC BUG (CRITICAL)
- **Description:** The ASM-009 in SPEC.final.md states "Secretary does NOT designate on ANY screen", but ASM-AGD-003 and section 4.2 document that the Secretary CAN designate via the Agenda tab. This contradiction can cause implementers to block the Secretary from designating in the Agenda tab. ASM-009 must be corrected to explicitly note the Agenda tab exception.
- **Acceptance Criteria:**
  - AC-31.1: Given the SPEC.final.md document, when reading ASM-009, then the text reads: "Secretary does NOT designate via the Speeches tab nor Home, but CAN designate via the Agenda tab (exception documented in ASM-AGD-003)". Priority: must.
  - AC-31.2: Given the SPEC_F023.md (Permissions), when reading the permission matrix, then the Secretary row for `agenda:assign_speaker` is `Yes` and the Secretary row for `speech:assign` is `No`. Priority: must.
  - AC-31.3: Given the codebase (`src/lib/permissions.ts`), when checking the Secretary permissions, then `agenda:assign_speaker` is present and `speech:assign` is absent in the secretary set. Priority: must.
- **Edge Cases:**
  - EC-31.1: Observer role must NOT have `agenda:assign_speaker` — the exception is only for Secretary.
- **Files Likely Impacted:**
  - `docs/SPEC.final.md` (ASM-009 text correction)
  - `docs/specs/SPEC_F023.md` (verify matrix is correct)
  - No code changes needed — `src/lib/permissions.ts` already has the correct permissions.

---

## CR-32: Define About Screen Content

- **Type:** SPEC MISSING
- **Description:** The About screen has no specification in any input document or derived spec. The current implementation (about.tsx) shows only app name and version. The screen should also display: author/credits, and a link for support or feedback. The existing About screen structure should be enhanced with these additional fields.
- **Acceptance Criteria:**
  - AC-32.1: Given the user navigates to Settings > About, when the screen loads, then the following information is displayed: app name (translated via `about.appName`), app version (from expo-constants), author/developer credits. Priority: must.
  - AC-32.2: Given the About screen is visible, when viewing credits, then the developer/team name is displayed in a dedicated row below the version. Priority: must.
  - AC-32.3: Given the About screen is visible, when a support/feedback link is present, then tapping it opens the device's default email client or browser with the support URL. Priority: should.
  - AC-32.4: Given all 3 supported languages, when viewing the About screen, then all labels are translated (about.title, about.appName, about.version, about.credits, about.support). Priority: must.
  - AC-32.5: Given the About screen, when viewing the layout, then the back button remains in the top-left using `common.back` i18n key, consistent with other settings sub-screens. Priority: must.
- **Edge Cases:**
  - EC-32.1: If the app version cannot be read from expo-constants, display "1.0.0" as fallback (already implemented).
  - EC-32.2: Support link URL should be configurable. If not defined, the support row should be hidden (not show a broken link).
- **Files Likely Impacted:**
  - `src/app/(tabs)/settings/about.tsx` (add credits and support link rows)
  - `src/i18n/locales/pt-BR.json` (add `about.credits`, `about.support` keys)
  - `src/i18n/locales/en.json`
  - `src/i18n/locales/es.json`

---

## CR-33: Global Back Button Convention for Stack-Navigated Screens

- **Type:** SPEC MISSING (CONVENTION)
- **Description:** There is no global convention for back buttons. The PRODUCT_SPECIFICATION only defines a back button for the Members screen (RF-01). This caused 3 separate bugs (CRs 17, 19, 20 — WhatsApp, History, Topics screens missing back buttons). A global rule must be established: every screen accessed via Stack navigation MUST have a back button in the header.
- **Acceptance Criteria:**
  - AC-33.1: Given any screen accessed via Expo Router Stack navigation (not tab navigation), when the screen renders, then a back button is visible in the top-left area of the header. Priority: must.
  - AC-33.2: Given the back button, when tapped, then the app navigates back to the previous screen (using `router.back()`). Priority: must.
  - AC-33.3: Given the back button, when rendered, then it uses the `common.back` i18n key for the label text. Priority: must.
  - AC-33.4: Given the back button style, when rendered, then it matches the established pattern: fontSize 16, fontWeight '600', color `colors.primary`, positioned in the header row with flexDirection 'row', paddingHorizontal 16, paddingVertical 12. Priority: must.
  - AC-33.5: Given the settings sub-screens (members, topics, users, history, whatsapp, timezone, theme, about), when any of them renders, then each has a back button following this convention. Priority: must.
- **Edge Cases:**
  - EC-33.1: The Presentation Mode screen uses a "close" button instead of "back" — this is an intentional exception and not subject to the back button convention.
  - EC-33.2: Modal screens (e.g., language selector) do not need a back button since they have overlay dismiss behavior.
- **Files Likely Impacted:**
  - `docs/SPEC.final.md` (add navigation convention section)
  - `src/app/(tabs)/settings/members.tsx` (verify: currently has no back button — add one)
  - `src/app/(tabs)/settings/_layout.tsx` (could configure Stack.Screen headerLeft globally)
- **Open Questions:**
  - Q-33.1: Should the back button be configured globally via `settings/_layout.tsx` Stack screenOptions (headerLeft), or should each screen implement its own?
    - Proposed default: Implement globally in `_layout.tsx` to avoid repetition and ensure consistency.

---

## CR-34: Update Specs to Reflect CR-26 Actor Changes (No Checkboxes)

- **Type:** SPEC OUTDATED
- **Description:** After CR-26 (actors redesign), the PRODUCT_SPECIFICATION (RF-22) and SPEC.final.md (section 7.13.4) still describe checkboxes for role selection when adding an actor. But CR-26 changed this: now only the name is asked, and the role is inferred from the field that was clicked. The docs must be updated to reflect this change.
- **Acceptance Criteria:**
  - AC-34.1: Given the PRODUCT_SPECIFICATION RF-22, when reading the actor creation flow, then it describes: "User taps an actor field (e.g., Presiding, Conducting) > bottom-sheet dialog opens > user taps Add (+) > name input appears > role is inferred from the field context". Priority: must.
  - AC-34.2: Given the SPEC.final.md section 7.13.4, when reading the actor inline management, then it describes the bottom-sheet pattern (2/3 screen height) with search, add (name only), edit (name only), delete. Priority: must.
  - AC-34.3: Given both documents, when reading them, then the word "checkbox" does NOT appear in the actor creation flow. Priority: must.
  - AC-34.4: Given both documents, when reading them, then the word "actor" / "ator" / "atores" is NOT used as a UI-visible label. Priority: must.
- **Edge Cases:**
  - EC-34.1: The database schema still uses `actors` table name — this is acceptable. Only UI-facing labels must avoid the word.
- **Files Likely Impacted:**
  - `docs/PRODUCT_SPECIFICATION.md` (RF-22 section)
  - `docs/SPEC.final.md` (section 7.13.4)
  - `docs/specs/SPEC_F013.md` (actor management spec)

---

## CR-35: Remove Invalid {duracao} Placeholder from WhatsApp Template System

- **Type:** BUG
- **Description:** The placeholder `{duracao}` is listed in the WhatsApp template PLACEHOLDERS constant (`src/app/(tabs)/settings/whatsapp.tsx`) and in SPEC.final.md section 7.9 and SPEC_F024. However, the `speeches` table does NOT have a `duration` column in the database. Duration is derived from position (1=5min, 2=10min, 3=15min) per PRODUCT_SPECIFICATION section 5.1, but this derivation is not implemented anywhere. The correct fix is to remove `{duracao}` entirely since it is not a valid placeholder and the derived value is not useful in a WhatsApp invitation message.
- **Acceptance Criteria:**
  - AC-35.1: Given the PLACEHOLDERS constant in `whatsapp.tsx`, when listing placeholders, then `{duracao}` is NOT included. Priority: must.
  - AC-35.2: Given the SAMPLE_DATA object in `whatsapp.tsx`, when listing sample values, then `{duracao}` is NOT included. Priority: must.
  - AC-35.3: Given the SPEC.final.md section 7.9, when listing valid placeholders, then `{duracao}` is NOT included. Priority: must.
  - AC-35.4: Given the SPEC_F024.md, when listing valid placeholders, then `{duracao}` is NOT included. Priority: must.
  - AC-35.5: Given the `whatsappUtils.ts` file, when the `resolveTemplate` function processes a template, then it does NOT attempt to resolve `{duracao}`. Priority: must.
  - AC-35.6: Given the valid placeholder list displayed in the UI, then only the following 6 placeholders appear: `{nome}`, `{data}`, `{posicao}`, `{colecao}`, `{titulo}`, `{link}`. Priority: must.
- **Edge Cases:**
  - EC-35.1: Existing wards that already have `{duracao}` in their custom template will see the literal string `{duracao}` in sent messages (not resolved). This is acceptable — users can manually remove it from their template.
  - EC-35.2: The SAMPLE_DATA and resolveTemplate function in `whatsappUtils.ts` must also be updated if they reference `{duracao}`.
- **Files Likely Impacted:**
  - `src/app/(tabs)/settings/whatsapp.tsx` (PLACEHOLDERS constant, SAMPLE_DATA)
  - `src/lib/whatsappUtils.ts` (resolveTemplate, WhatsAppVariables type if applicable)
  - `docs/SPEC.final.md` (section 7.9 placeholder list)
  - `docs/specs/SPEC_F024.md` (placeholder list)

---

## CR-36: Define Debounce Rules for Auto-Save Text Fields in Agenda

- **Type:** SPEC MISSING (CONVENTION)
- **Description:** There is no specification for debounce behavior on auto-save text fields in the agenda. SPEC_F012 says "auto-save on all field changes" but does not define debounce timing, throttle, or local state management. This caused CR-27 (letter-eating bug). A minimum debounce of 500ms must be defined, and text inputs must manage state locally with useState.
- **Acceptance Criteria:**
  - AC-36.1: Given the SPEC_F012.md, when reading the auto-save specification, then it includes: "Text fields with auto-save MUST use a debounce of at least 500ms. The input state MUST be managed locally (useState) and only synchronized with the server after the debounce expires." Priority: must.
  - AC-36.2: Given the DebouncedTextInput component exists in the codebase (`src/components/DebouncedTextInput.tsx`), when it is used in the AgendaForm, then it implements the 500ms debounce pattern. Priority: must.
  - AC-36.3: Given any multiline text field in the agenda form (announcements, recognized names, etc.), when empty, then it has a minimum height of approximately 3 lines of text (~66px). Priority: must.
  - AC-36.4: Given a user types in any debounced text field, when typing at any speed, then no characters are dropped or "eaten". Priority: must.
- **Edge Cases:**
  - EC-36.1: If the user navigates away from the agenda while a debounce is pending, the pending value should be saved (flush on unmount).
  - EC-36.2: Fast typing (more than 5 characters per second) must not drop characters.
- **Files Likely Impacted:**
  - `docs/specs/SPEC_F012.md` (add debounce specification)
  - `src/components/DebouncedTextInput.tsx` (verify implementation)
  - `src/components/AgendaForm.tsx` (verify debounced inputs are used)

---

## CR-37: Update Docs to Reflect Secretary User Management Permission

- **Type:** SPEC OUTDATED
- **Description:** After CR-23 gave the Secretary access to manage users, the SPEC.final.md section 7.8 still says "Users card visible only for Bishopric" and section 4.2 says "Manage users: Secretary=No". Both need to be updated to reflect that the Secretary now has access. The code is already correct (`src/lib/permissions.ts` has `settings:users` in the secretary set).
- **Acceptance Criteria:**
  - AC-37.1: Given the SPEC.final.md section 7.8, when reading user management visibility, then it states: "Users card visible for Bishopric and Secretary (permission settings:users)". Priority: must.
  - AC-37.2: Given the SPEC.final.md section 4.2 permission matrix, when reading the Secretary row for "Manage users (CRUD)", then it says "Yes". Priority: must.
  - AC-37.3: Given the SPEC_F023.md permission matrix, when reading the Secretary permissions, then `settings:users` is listed as granted. Priority: must.
  - AC-37.4: Given the SPEC_F018.md (User Management), when reading the visibility rule, then it states the Users card is visible for Bishopric and Secretary roles. Priority: must.
- **Edge Cases:**
  - EC-37.1: The Observer role must NOT gain `settings:users` — only Secretary is updated.
- **Files Likely Impacted:**
  - `docs/SPEC.final.md` (section 7.8 and section 4.2)
  - `docs/specs/SPEC_F023.md` (permission matrix)
  - `docs/specs/SPEC_F018.md` (visibility rule)
  - No code changes needed — already implemented correctly.

---

## CR-38: Define Presentation Mode Date Header Format

- **Type:** SPEC MISSING
- **Description:** The format of the date displayed in the Presentation Mode header is not specified in any document. It should show the full date in the ward's language (e.g., pt-BR: "Domingo, 16 de Fevereiro de 2026"; en: "Sunday, February 16, 2026"; es: "Domingo, 16 de Febrero de 2026").
- **Acceptance Criteria:**
  - AC-38.1: Given the Presentation Mode screen is open on a Sunday, when viewing the header, then the date is displayed in full format in the ward's configured language. Priority: must.
  - AC-38.2: Given the ward language is "pt-BR", when viewing the header date, then it displays in the format: "Domingo, DD de [Mes por extenso] de YYYY" (e.g., "Domingo, 16 de Fevereiro de 2026"). Priority: must.
  - AC-38.3: Given the ward language is "en", when viewing the header date, then it displays in the format: "Sunday, [Month] DD, YYYY" (e.g., "Sunday, February 16, 2026"). Priority: must.
  - AC-38.4: Given the ward language is "es", when viewing the header date, then it displays in the format: "Domingo, DD de [Mes] de YYYY" (e.g., "Domingo, 16 de Febrero de 2026"). Priority: must.
  - AC-38.5: Given the date formatting, when generating the formatted date, then it uses the `dateUtils.ts` helper or a new locale-aware date formatting function. Priority: must.
- **Edge Cases:**
  - EC-38.1: If the Presentation Mode is opened on a non-Sunday (e.g., testing), the day name should still reflect the actual day of the week (not hardcode "Sunday").
  - EC-38.2: The date formatting should use the ward language, not the device locale.
- **Files Likely Impacted:**
  - `src/app/presentation.tsx` (header date display)
  - `src/lib/dateUtils.ts` (add locale-aware full date formatter if not present)
  - `docs/specs/SPEC_F016.md` (add date format specification)

---

## CR-39: Add Search/Filter Field to Ward Topics Screen

- **Type:** UI Enhancement
- **Description:** The Ward Topics screen does not have a search/filter field. The PRODUCT_SPECIFICATION defines only a list sorted alphabetically. For consistency with the Members screen (which has search) and usability when the list of topics grows large, a search field should be added above the Ward Topics list.
- **Acceptance Criteria:**
  - AC-39.1: Given the user navigates to Settings > Topics, when the screen loads, then a search/filter text input is visible above the Ward Topics list. Priority: must.
  - AC-39.2: Given the user types in the search field, when characters are entered, then the Ward Topics list filters in real-time to show only topics whose title contains the search text (case-insensitive). Priority: must.
  - AC-39.3: Given the search field is empty, when viewing the list, then all Ward Topics are displayed (sorted alphabetically). Priority: must.
  - AC-39.4: Given the search field has text and matches no topics, when viewing the list, then the empty state message is displayed. Priority: must.
  - AC-39.5: Given the search field, when rendered, then it uses the same styling as the Members screen search input (height 40, borderWidth 1, borderRadius 8, paddingHorizontal 12, fontSize 15). Priority: should.
  - AC-39.6: Given the search filters the Ward Topics only, when the Collections section is below, then it is NOT filtered by the search (collections are always fully visible). Priority: must.
- **Edge Cases:**
  - EC-39.1: If the search text contains special regex characters, the filter should treat them as literal characters (use string includes, not regex).
  - EC-39.2: The search should clear when navigating away and returning.
- **Files Likely Impacted:**
  - `src/app/(tabs)/settings/topics.tsx` (add search state and filter logic)

---

## CR-40: Resolve Add-Member Button Position Inconsistency

- **Type:** SPEC INCONSISTENCY
- **Description:** The PRODUCT_SPECIFICATION (RF-01) says the "+" button to add a member is "to the right of the search field" (in the header). The SPEC.final.md (section 7.4.1) says "FAB (+) button at the bottom-right corner". These are different positions. The current implementation places the "+" button in the header next to the title (neither of the two documented positions). A decision must be made and documented.
- **Acceptance Criteria:**
  - AC-40.1: Given the Members screen, when viewing the header area, then the "+" add button is positioned to the right of the screen title in the header row (consistent with current implementation and the Topics screen pattern). Priority: must.
  - AC-40.2: Given the SPEC.final.md section 7.4.1, when reading the description, then it says "'+' button at the right side of the header, next to the title" (not FAB at bottom-right). Priority: must.
  - AC-40.3: Given the PRODUCT_SPECIFICATION RF-01, when reading the description, then it is updated to be consistent with AC-40.1. Priority: must.
  - AC-40.4: Given the Members screen and the Topics screen, when comparing their add button positions, then they are consistent (both in the header area). Priority: must.
- **Edge Cases:**
  - EC-40.1: The "+" button is only visible to users with `member:write` permission — this behavior must remain unchanged.
- **Files Likely Impacted:**
  - `docs/SPEC.final.md` (section 7.4.1 — update button position description)
  - `docs/PRODUCT_SPECIFICATION.md` (RF-01 — align with implementation)
  - No code changes — current implementation is already the correct pattern.

---

## CR-41: Define Timezone Selector UI Details

- **Type:** SPEC MISSING
- **Description:** The timezone selector (RF-31, SPEC.final.md section 7.10.1) does not have a dedicated derived spec. It is mentioned in SPEC_F017 (push notifications) and SPEC_F002 (ward management) but there is no definition of how the selector works in the UI. The current implementation (`timezone.tsx`) already provides a functional selector with search, current timezone display, and a list of IANA timezones. This CR formalizes the existing implementation into the spec.
- **Acceptance Criteria:**
  - AC-41.1: Given the SPEC_F002.md (Ward Management), when reading timezone configuration, then it includes a reference to the timezone selector screen details. Priority: must.
  - AC-41.2: Given the timezone selector screen, when loaded, then it displays: (a) back button in header, (b) screen title, (c) current timezone highlighted, (d) search field, (e) scrollable list of IANA timezone strings. Priority: must.
  - AC-41.3: Given the user types in the search field, when characters are entered, then the list filters to show only timezones matching the search text (case-insensitive substring match). Priority: must.
  - AC-41.4: Given the user taps a timezone, when it is different from the current, then it saves to the ward record and navigates back. Priority: must.
  - AC-41.5: Given the user taps the currently selected timezone, when tapped, then it navigates back without saving (no-op). Priority: must.
  - AC-41.6: Given a save failure, when the mutation errors, then an error alert is shown and the user stays on the screen. Priority: must.
- **Edge Cases:**
  - EC-41.1: The timezone list should cover at least the major time zones for all regions where the app is expected to be used (Americas, Europe, Asia, Africa, Oceania).
  - EC-41.2: The default timezone for new wards should be based on the ward's language: pt-BR -> America/Sao_Paulo, en -> America/New_York, es -> America/Mexico_City.
- **Files Likely Impacted:**
  - `docs/specs/SPEC_F002.md` (add timezone selector section or reference)
  - No code changes — current implementation is already functional.

---

## CR-42: Fix Non-Functional CSV Export and Import Buttons in Members Screen

- **Type:** CRITICAL BUG
- **Description:** On the Members management screen, the CSV export button and CSV import button do not function when tapped. The buttons render correctly and are visible to users with `member:import` permission, but tapping them produces no result. The handlers (`handleExport` and `handleImport`) exist in the code but may have issues with platform detection, file system APIs, or the Supabase RPC `import_members`.
- **Acceptance Criteria:**
  - AC-42.1: Given the user taps the "Export CSV" button on mobile (Expo Go/production), when the member list is not empty, then the device's share sheet opens with the CSV content available for sharing/saving. Priority: must.
  - AC-42.2: Given the user taps the "Export CSV" button on web, when the member list is not empty, then a file named "membros.csv" is downloaded. Priority: should.
  - AC-42.3: Given the exported CSV file, when opened, then it contains the header "Nome,Telefone Completo" followed by one row per member with full_name and concatenated country_code+phone. Priority: must.
  - AC-42.4: Given the user taps the "Import CSV" button on mobile, when tapped, then a file picker opens allowing selection of a .csv file. Priority: must.
  - AC-42.5: Given a valid CSV file is selected for import, when the file is parsed and the RPC succeeds, then all existing members are replaced with the imported members and a success alert shows the count. Priority: must.
  - AC-42.6: Given a CSV file with validation errors, when parsing fails, then an error alert shows the specific line and field errors. Priority: must.
  - AC-42.7: Given the import button, when a mutation is in progress, then the button shows an ActivityIndicator and is disabled. Priority: must.
  - AC-42.8: Given the member list is empty, when the user taps "Export CSV", then nothing happens (button is disabled). Priority: must.
- **Edge Cases:**
  - EC-42.1: If the `expo-document-picker` or `expo-file-system` packages are not installed or have version incompatibilities with the current Expo SDK, the import will fail silently. Verify package availability.
  - EC-42.2: If the Supabase RPC `import_members` does not exist or has a different signature, the import mutation will fail. Verify the RPC exists and accepts `target_ward_id` and `new_members` parameters.
  - EC-42.3: If React Native `Share.share` fails or is not available in the current environment, the export should show an error alert instead of failing silently.
  - EC-42.4: CSV files with BOM (byte order mark) at the beginning should still parse correctly.
- **Files Likely Impacted:**
  - `src/app/(tabs)/settings/members.tsx` (handleExport, handleImport handlers)
  - `src/lib/csvUtils.ts` (parseCsv, generateCsv — verify correctness)
  - `supabase/migrations/` (verify `import_members` RPC exists)
  - `package.json` (verify expo-document-picker and expo-file-system are installed)

---

## CR-43: Add Logout Button in Settings Tab

- **Type:** NEW FEATURE
- **Description:** There is no way for the user to log out of the application. A "Sign Out" / "Sair" button must be added to the Settings tab so the user can disconnect from the current session and return to the login screen.
- **Acceptance Criteria:**
  - AC-43.1: Given the user is on the Settings screen, when scrolling to the bottom, then a "Sign Out" button is visible below the last settings section. Priority: must.
  - AC-43.2: Given the Sign Out button, when rendered, then it displays the translated text: "Sair" (pt-BR), "Sign Out" (en), "Cerrar sesion" (es). Priority: must.
  - AC-43.3: Given the user taps the Sign Out button, when tapped, then a confirmation dialog appears asking the user to confirm the action (with Cancel and Confirm options). Priority: must.
  - AC-43.4: Given the user confirms the sign out, when the sign out completes, then the Supabase session is terminated and the user is redirected to the login screen. Priority: must.
  - AC-43.5: Given the sign out process, when it executes, then the AuthContext `signOut` function is called, which calls `supabase.auth.signOut()`. Priority: must.
  - AC-43.6: Given the Sign Out button styling, when rendered, then it is displayed as a destructive-style button (red text or red-tinted background) to indicate it is an irreversible action. Priority: should.
  - AC-43.7: Given any user role (bishopric, secretary, observer), when viewing Settings, then the Sign Out button is visible (no permission restriction). Priority: must.
- **Edge Cases:**
  - EC-43.1: If the sign out fails (network error), an error alert should be displayed and the user should remain on the Settings screen.
  - EC-43.2: If the user is offline when tapping sign out, the local session should still be cleared and the user redirected to login. The server-side session will expire naturally.
  - EC-43.3: After sign out, pressing the back button should NOT return to the authenticated screens.
- **Files Likely Impacted:**
  - `src/app/(tabs)/settings/index.tsx` (add Sign Out button at bottom of ScrollView)
  - `src/contexts/AuthContext.tsx` (verify signOut function exists and works correctly)
  - `src/i18n/locales/pt-BR.json` (add `settings.signOut`, `settings.signOutConfirm` keys)
  - `src/i18n/locales/en.json`
  - `src/i18n/locales/es.json`

---

## Assumptions

```yaml
assumptions:
  - id: A-1
    description: "CR-31: The code in permissions.ts already has the correct Secretary permissions (agenda:assign_speaker=Yes, speech:assign=No)"
    confirmed: true
    default_if_not_confirmed: "Update permissions.ts to match the corrected ASM-009"

  - id: A-2
    description: "CR-32: The About screen already exists as a working route at settings/about.tsx with basic content (app name and version)"
    confirmed: true
    default_if_not_confirmed: "Create the about.tsx file from scratch"

  - id: A-3
    description: "CR-33: All settings sub-screens use Expo Router Stack navigation (not modals)"
    confirmed: true
    default_if_not_confirmed: "Verify the settings/_layout.tsx to confirm Stack navigation"

  - id: A-4
    description: "CR-35: The {duracao} placeholder in whatsappUtils.ts resolveTemplate will show literal {duracao} in messages if not removed from the template by the user"
    confirmed: false
    default_if_not_confirmed: "Remove {duracao} from PLACEHOLDERS constant and SAMPLE_DATA; existing ward templates are user responsibility to update"

  - id: A-5
    description: "CR-36: The DebouncedTextInput component already exists and implements the debounce pattern"
    confirmed: true
    default_if_not_confirmed: "Create DebouncedTextInput component with 500ms debounce"

  - id: A-6
    description: "CR-42: The expo-document-picker and expo-file-system packages are listed in package.json dependencies"
    confirmed: false
    default_if_not_confirmed: "Install the packages: npx expo install expo-document-picker expo-file-system"

  - id: A-7
    description: "CR-42: The Supabase RPC import_members exists and accepts target_ward_id (uuid) and new_members (jsonb array)"
    confirmed: false
    default_if_not_confirmed: "Create the RPC function in a new migration"

  - id: A-8
    description: "CR-43: The AuthContext already has a signOut function that calls supabase.auth.signOut()"
    confirmed: true
    default_if_not_confirmed: "Add signOut function to AuthContext"

  - id: A-9
    description: "CR-43: After signOut, Expo Router automatically redirects to the auth layout (login screen) because the session becomes null"
    confirmed: false
    default_if_not_confirmed: "Add explicit navigation to /(auth)/login after signOut"

  - id: A-10
    description: "CR-40: The current implementation of the add-member button in the header (next to title) is the correct pattern, and specs should align to it"
    confirmed: false
    default_if_not_confirmed: "Keep current implementation; update docs to match"
```

---

## Open Questions

```yaml
open_questions:
  - id: Q-1
    question: "CR-32: What specific content should the credits/author field display? A personal name, a team name, or an organization?"
    proposed_default: "Display the app developer/author name as a simple text string. Configurable via an i18n key so it can be customized."

  - id: Q-2
    question: "CR-32: Should the About screen include a support email or URL? If so, what is the support address?"
    proposed_default: "Include a support row only if a support URL/email is configured. Default: hide the row until a value is defined."

  - id: Q-3
    question: "CR-33: Should the back button be implemented globally in settings/_layout.tsx or individually in each screen?"
    proposed_default: "Implement globally in settings/_layout.tsx via Stack screenOptions headerLeft, since all settings sub-screens follow the same pattern."

  - id: Q-4
    question: "CR-39: Should the search field filter the General Collections section as well, or only Ward Topics?"
    proposed_default: "Filter only Ward Topics. Collections have toggle switches and are typically few, so filtering is not needed."

  - id: Q-5
    question: "CR-42: Are the expo-document-picker and expo-file-system packages actually installed in the project?"
    proposed_default: "Verify in package.json. If not installed, add them via npx expo install."

  - id: Q-6
    question: "CR-42: Does the Supabase RPC import_members exist? If not, what is the expected signature?"
    proposed_default: "Verify in supabase/migrations/. Expected: import_members(target_ward_id uuid, new_members jsonb) returns integer (count of imported members)."

  - id: Q-7
    question: "CR-43: After sign out, should the app clear any local cache (AsyncStorage, React Query cache) or just terminate the session?"
    proposed_default: "Clear the React Query cache (queryClient.clear()) and terminate the session. AsyncStorage theme preference can remain."
```

---

## Definition of Done

- [ ] ASM-009 in SPEC.final.md corrected to note the Agenda tab exception for Secretary
- [ ] About screen enhanced with credits and optional support link
- [ ] Global back button convention documented and verified across all settings sub-screens
- [ ] PRODUCT_SPECIFICATION and SPEC.final.md updated to remove checkbox references from actor creation
- [ ] {duracao} placeholder removed from PLACEHOLDERS, SAMPLE_DATA, and spec docs
- [ ] Debounce rule (500ms minimum) added to SPEC_F012.md for auto-save text fields
- [ ] Secretary user management permission updated in SPEC.final.md sections 7.8 and 4.2
- [ ] Presentation mode date header format defined and implemented in all 3 languages
- [ ] Ward Topics search/filter field added and functional
- [ ] Add-member button position inconsistency resolved in documentation
- [ ] Timezone selector UI details documented in spec
- [ ] CSV export and import buttons working correctly on mobile
- [ ] Sign Out button added to Settings tab with confirmation dialog
- [ ] All 3 languages (pt-BR, en, es) render correctly for new/changed labels
- [ ] Existing tests pass after changes
- [ ] New tests added for critical fixes (CR-42, CR-43)
