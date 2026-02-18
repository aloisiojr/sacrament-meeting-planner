# Change Requests - Structured Requirements (SPEC_CR)

Source: `docs/CHANGE_REQUESTS_1.txt`

---

## CR-01: Home Tab Title for "Start Meeting" Button

- **Type:** UI
- **Description:** When the "Start Sacrament Meeting" button is visible on the Home tab (on Sundays), a section title "Agenda da Reuniao Sacramental" (translated per locale) should appear above it, styled consistently with other section titles like "Proximas Designacoes".
- **Acceptance Criteria:**
  1. On Sundays, a title text appears above the "Start Meeting" button using the same style as `NextSundaysSection` title (fontSize 20, fontWeight 700, paddingHorizontal 16, paddingVertical 12).
  2. Title text uses `t('agenda.startPresentation')` (pt-BR: "Iniciar Reuniao Sacramental", en: "Start Sacrament Meeting", es: "Iniciar Reunion Sacramental").
  3. On non-Sundays (when the button is hidden), the title is also hidden.
  4. Title renders correctly in all 3 supported languages.
- **Files Likely Impacted:**
  - `src/app/(tabs)/index.tsx`
- **Open Questions:**
  - Should the title use `home.startMeeting` or `agenda.startPresentation`? Both map to similar text. The CR says "Agenda da Reuniao Sacramental", which matches `common.appTitle` in pt-BR. Clarify exact i18n key or add a new one like `home.meetingTitle`.

---

## CR-02: Ward Created in PT-BR but UI Appeared in EN-US

- **Type:** BUG
- **Description:** When creating a new ward and selecting PT-BR as the language, the UI appears in EN-US after registration. The user has to manually change the language in settings. The app should detect the ward's language from the database and apply it to i18n on login.
- **Acceptance Criteria:**
  1. After ward creation with language "pt-BR", the UI immediately displays in Portuguese.
  2. After login to an existing ward, the UI language matches `ward.language` from the database.
  3. The `initI18n()` function receives the ward language from the auth context once the ward data is loaded.
  4. If `ward.language` is not yet available (pre-login), device locale detection is used as fallback.
- **Files Likely Impacted:**
  - `src/i18n/index.ts` (initI18n already supports wardLanguage param)
  - `src/contexts/AuthContext.tsx` (needs to call `initI18n(ward.language)` after login/ward load)
  - `src/app/_layout.tsx` or root component (ensure initI18n is called with ward language)
- **Open Questions:**
  - Is the issue in the registration flow (language not passed to initI18n) or in the login flow (ward.language not read)?

---

## CR-03: "Start Meeting" Returns "No Results Found" Instead of Empty Agenda

- **Type:** BUG
- **Description:** Pressing "Start Sacrament Meeting" on the Home tab navigates to `/presentation`, which shows "Nenhum resultado encontrado" (No results found) instead of rendering an empty agenda form. Even when the agenda has no entries, the screen should render the agenda structure with empty fields.
- **Acceptance Criteria:**
  1. Pressing "Start Meeting" navigates to the presentation screen and renders the agenda form with all sections visible (even if all fields are empty/null).
  2. No "No results found" message is shown when the agenda exists but has empty fields.
  3. If no agenda record exists for today, one is lazy-created before rendering.
  4. The agenda form renders correctly with all null/default values.
- **Files Likely Impacted:**
  - `src/app/presentation.tsx`
  - `src/hooks/useAgenda.ts` (lazy creation logic)
  - `src/components/AgendaForm.tsx` (null handling in render)
- **Open Questions:**
  - Where is the "No results found" message displayed -- in the presentation screen or AgendaForm? The AgendaForm returns `null` when `!agenda` (line 191), which could trigger an empty state in the parent.

---

## CR-04: Exception Displayed as Raw Key "general_conference" Instead of Translated Text

- **Type:** BUG
- **Description:** In the SundayCard header (collapsed state), exception reasons are displayed as raw enum keys (e.g., "general_conference") instead of the translated human-readable text (e.g., "Conferencia Geral" in pt-BR).
- **Acceptance Criteria:**
  1. Exception text in SundayCard header displays the translated label from `sundayExceptions.*` i18n keys.
  2. Works correctly for all exception types: `testimony_meeting`, `general_conference`, `stake_conference`, `ward_conference`, `fast_sunday`, `special_program`, `no_meeting`.
  3. Translation respects the currently selected language.
- **Files Likely Impacted:**
  - `src/components/SundayCard.tsx` (lines 225-234: uses raw `currentType` instead of `t()`)
- **Open Questions:** None. The bug is clear: line 231 renders `currentType` (the raw string) instead of using `t(`sundayExceptions.${currentType}`)`.

---

## CR-05: Speech Labels Showing "VAGA 1o" Instead of "1o Discurso"

- **Type:** BUG
- **Description:** The speech slot labels in expanded SundayCards show "VAGA 1o" (using `speeches.slot` i18n key: "Vaga {{number}}") instead of "1o Discurso" (should be "1o Discurso", "2o Discurso", "3o Discurso"). Fix across all 3 languages.
- **Acceptance Criteria:**
  1. Speech slot labels display as "1o Discurso", "2o Discurso", "3o Discurso" in pt-BR.
  2. Speech slot labels display as "1st Speech", "2nd Speech", "3rd Speech" in en.
  3. Speech slot labels display as "1er Discurso", "2do Discurso", "3er Discurso" in es.
  4. Labels are uppercase as per the existing `textTransform: 'uppercase'` style.
- **Files Likely Impacted:**
  - `src/components/SpeechSlot.tsx` (line 53: `getPositionLabel` function uses `speeches.slot`)
  - `src/i18n/locales/pt-BR.json` (change `speeches.slot` or add new key)
  - `src/i18n/locales/en.json` (same)
  - `src/i18n/locales/es.json` (same)
- **Open Questions:**
  - Should we replace the `speeches.slot` key entirely or add a new `speeches.speech` key? The current `speeches.slot` key is "Vaga {{number}}" -- the word "Vaga" (Slot/Vacancy) is wrong; it should be "Discurso" (Speech). The cleanest fix: change the i18n values and/or the label format in `getPositionLabel`.

---

## CR-06: Sunday Options List Is Wrong

- **Type:** CRITICAL BUG
- **Description:** The dropdown options for sunday types are incorrect. The current list includes: Nao Designado (not_assigned/speeches), Reuniao de Testemunho, Conferencia Geral, Conferencia de Estaca, Conferencia da Ala, Domingo de Jejum, Programa Especial, Sem Reuniao, other. The correct list should be: Domingo com Discursos, Reuniao de Testemunho, Conferencia Geral, Conferencia de Estaca, Conferencia de Ala, Reuniao Especial da Primaria, Outro (with text input for reason).
- **Acceptance Criteria:**
  1. The dropdown options are exactly (in pt-BR): "Domingo com Discursos", "Reuniao de Testemunho", "Conferencia Geral", "Conferencia de Estaca", "Conferencia de Ala", "Reuniao Especial da Primaria", "Outro".
  2. "Domingo de Jejum", "Programa Especial", "Sem Reuniao", and "Nao Designado" are removed.
  3. "Reuniao Especial da Primaria" is added as a new option (new enum value: `primary_special_meeting`).
  4. "Outro" (Other) option, when selected, shows a text input field for the user to write the reason.
  5. The `SundayExceptionReason` type in `database.ts` is updated to reflect the new set.
  6. All i18n files are updated with correct translations for the new/changed options.
  7. Supabase migration updates the enum constraint if applicable.
  8. The `SUNDAY_TYPE_OPTIONS` array in `useSundayTypes.ts` is updated.
  9. The first option label changes from "Nao designado" to "Domingo com Discursos" (en: "Sunday with Speeches", es: "Domingo con Discursos").
- **Files Likely Impacted:**
  - `src/types/database.ts` (`SundayExceptionReason` type)
  - `src/hooks/useSundayTypes.ts` (`SUNDAY_TYPE_OPTIONS` array)
  - `src/components/SundayCard.tsx` (dropdown rendering, handle "other" with text input)
  - `src/i18n/locales/pt-BR.json` (`sundayExceptions` section)
  - `src/i18n/locales/en.json` (`sundayExceptions` section)
  - `src/i18n/locales/es.json` (`sundayExceptions` section)
  - `supabase/migrations/` (new migration to update enum)
  - `src/hooks/useAgenda.ts` (`isSpecialMeeting`, `EXCLUDED_EXCEPTION_TYPES`)
- **Open Questions:**
  - Does "Outro" (Other) need to store a free-text reason? If so, does the `sunday_exceptions` table need a `custom_reason` text column?
  - Should selecting "Outro" still count as a special meeting (hide speeches)?
  - Does `fast_sunday` need a data migration to `testimony_meeting` for existing records?

---

## CR-07: Hide Speeches Section When Non-Speech Sunday Type Selected

- **Type:** CRITICAL BUG
- **Description:** When a sunday type other than "Domingo com Discursos" (speeches) is selected, the expanded card still shows the 3 speech slots (speaker, topic fields). Only the "Domingo com Discursos" type should display the speech-related UI; all other types should hide it.
- **Acceptance Criteria:**
  1. When `exception.reason` is not null (i.e., not a speeches-type sunday), the speech slots (SpeechSlot components) are hidden in the expanded SundayCard.
  2. In the Speeches tab, expanded cards for non-speeches sundays show only the type dropdown (no SpeechSlot children).
  3. In the Home tab NextSundaysSection, same behavior applies.
  4. In the Agenda tab, the `AgendaForm` already handles this via `isSpecialMeeting()` -- verify it works correctly with the new sunday types from CR-06.
- **Files Likely Impacted:**
  - `src/app/(tabs)/speeches.tsx` (lines 258-272: conditionally render SpeechSlot children)
  - `src/components/NextSundaysSection.tsx` (lines 152-166: conditionally render SpeechSlot children)
  - `src/components/SundayCard.tsx` (may need to control children rendering)
  - `src/hooks/useAgenda.ts` (`isSpecialMeeting` function may need updating for new types)
- **Open Questions:**
  - Should the LEDs in the card header also be hidden for non-speeches sundays?

---

## CR-08: Topics Collection List Not Scrollable

- **Type:** CRITICAL BUG
- **Description:** In Settings > Topics, the collections list (general topic collections with toggle switches) cannot be scrolled. Collections that are off-screen cannot be reached or selected. This is because both the Ward Topics FlatList and the Collections FlatList have `scrollEnabled={false}`, and the parent `KeyboardAvoidingView` does not have a `ScrollView` wrapper.
- **Acceptance Criteria:**
  1. The collections list is scrollable and all collections can be reached.
  2. Ward topics list is also scrollable if it grows long.
  3. Both sections remain functional (swipe-to-edit, toggle switches).
  4. Keyboard avoiding behavior still works when adding/editing topics.
- **Files Likely Impacted:**
  - `src/app/(tabs)/settings/topics.tsx` (change layout to support scrolling; either wrap in ScrollView or enable scroll on FlatLists, or convert to SectionList)
- **Open Questions:**
  - Best approach: (a) wrap both FlatLists in a parent ScrollView (with `nestedScrollEnabled`), (b) use a single SectionList with both sections, or (c) enable `scrollEnabled={true}` on each FlatList and give them fixed heights?

---

## CR-09: Settings Sub-Screen Navigation Causes White Flash

- **Type:** BUG (UI)
- **Description:** When the user navigates into a settings sub-screen (Members, Topics, etc.) and then taps the "Settings" tab again, the screen slides to the left with a white background flash before returning to the settings index. This is likely caused by the Stack navigator animation in the settings layout.
- **Acceptance Criteria:**
  1. Tapping the Settings tab while on a sub-screen returns to the settings index without any visible white flash or horizontal sliding animation.
  2. Navigation back to settings index is instantaneous (no animation artifacts).
  3. Normal forward navigation (tapping a settings item) still animates correctly.
- **Files Likely Impacted:**
  - `src/app/(tabs)/settings/_layout.tsx` (Stack animation config)
  - `src/app/(tabs)/_layout.tsx` (tab press handler for Settings tab)
- **Open Questions:**
  - Should we reset the settings Stack to its root on tab re-press? Or disable the slide animation entirely? A common pattern is to use `navigation.popToTop()` on tab press for stacks.

---

## CR-10: Theme and About Buttons Do Nothing

- **Type:** CRITICAL BUG
- **Description:** The "Theme" and "About" settings items have empty `onPress` handlers (`onPress={() => {}}`). They need to be implemented. Theme should show a theme picker (Automatic/Light/Dark). About should show app version and credits.
- **Acceptance Criteria:**
  1. Tapping "Theme" opens a modal or navigates to a screen that allows selecting between Automatic, Light, and Dark themes.
  2. Selected theme is applied immediately and persisted.
  3. Theme options use i18n keys already defined: `theme.automatic`, `theme.light`, `theme.dark`.
  4. Tapping "About" opens a modal or screen showing app name, version, and basic credits.
  5. Both buttons work in all 3 languages.
- **Files Likely Impacted:**
  - `src/app/(tabs)/settings/index.tsx` (lines 199-208: implement onPress handlers)
  - `src/contexts/ThemeContext.tsx` (may need theme preference persistence)
  - Possibly new file: `src/app/(tabs)/settings/about.tsx` or inline modal
- **Open Questions:**
  - Should Theme be a modal (like language selector) or a separate screen?
  - Should About be a modal or a separate screen?
  - Where is the theme preference stored? AsyncStorage? Supabase ward settings?
  - What info should the About screen contain? App version, build number, developer info?
