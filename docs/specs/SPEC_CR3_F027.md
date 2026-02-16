# Change Requests Batch 3 - About Screen + Logout Button (SPEC_CR3_F027)

Feature: F027 - About Screen + Logout Button
Type: UI Enhancement + New Feature

---

## SPEC_SUMMARY

```yaml
type: spec_summary
goal: "Define About screen content (CR-32) and add Sign Out button to Settings tab (CR-43)"
in_scope:
  - "CR-32: Enhance About screen with credits/author and optional support/feedback link"
  - "CR-43: Add Sign Out button with confirmation dialog in Settings tab"
out_of_scope:
  - "Changes to authentication flow or AuthContext logic (signOut already exists)"
  - "Changes to navigation guards or protected routes"
  - "Changes to other settings sub-screens"
main_risks:
  - "CR-43: signOut must clear React Query cache to avoid stale data on re-login"
  - "CR-43: after signOut, back navigation must not return to authenticated screens"
ac_count: 12
edge_case_count: 5
has_open_questions: true
has_unconfirmed_assumptions: true
```

---

## CR-32: Define About Screen Content

- **Type:** SPEC MISSING
- **Description:** The About screen (`src/app/(tabs)/settings/about.tsx`) currently displays only the app name and version. It was created as part of CR-10 (About button did nothing) but no content specification existed. The screen should be enhanced with: developer/author credits and an optional support/feedback link.
- **Current State:**
  - `about.tsx` renders: back button, title ("Sobre" / "About" / "Acerca de"), app name (from i18n `about.appName`), version (from `expo-constants`, fallback "1.0.0").
  - i18n keys exist: `about.title`, `about.appName`, `about.version` (all 3 languages).
  - No credits or support link is displayed.
- **Required Changes:**
  1. Add a new row below the version row displaying the developer/author credits (i18n key: `about.credits`).
  2. Add an optional support/feedback row below credits (i18n key: `about.support`). When tapped, opens the device's default email client or browser with the support URL.
  3. Add corresponding i18n keys in all 3 locale files.
- **Acceptance Criteria:**
  - AC-32.1: Given the user navigates to Settings > About, when the screen loads, then the following information is displayed in order: app name (translated via `about.appName`), app version (from expo-constants), developer/author credits. Priority: must.
  - AC-32.2: Given the About screen is visible, when viewing credits, then the developer/team name is displayed in a dedicated row below the version, using the same card styling as other rows with label "about.credits" and a text value. Priority: must.
  - AC-32.3: Given the About screen is visible, when a support/feedback link is configured (non-empty `about.supportUrl` i18n value), then tapping it opens the device's default handler via `Linking.openURL()`. Priority: should.
  - AC-32.4: Given the support URL is not configured (empty string), when viewing the About screen, then the support row is hidden (not rendered). Priority: must.
  - AC-32.5: Given all 3 supported languages, when viewing the About screen, then all labels are translated: `about.title`, `about.appName`, `about.version`, `about.credits`, `about.support`. Priority: must.
- **Edge Cases:**
  - EC-32.1: If the app version cannot be read from expo-constants, display "1.0.0" as fallback (already implemented via `Constants.expoConfig?.version ?? '1.0.0'`).
  - EC-32.2: If the support URL is empty or undefined in i18n, the support row must be hidden entirely (not show a broken link or empty row).
- **i18n Keys to Add:**

  | Key | pt-BR | en | es |
  |-----|-------|----|----|
  | `about.credits` | `Desenvolvido por` | `Developed by` | `Desarrollado por` |
  | `about.creditsValue` | (author name - configurable) | (author name - configurable) | (author name - configurable) |
  | `about.support` | `Suporte e Feedback` | `Support & Feedback` | `Soporte y Comentarios` |
  | `about.supportUrl` | (email or URL - empty by default) | (email or URL - empty by default) | (email or URL - empty by default) |

- **Files Impacted:**
  - `src/app/(tabs)/settings/about.tsx` (add credits row, optional support row)
  - `src/i18n/locales/pt-BR.json` (add `about.credits`, `about.creditsValue`, `about.support`, `about.supportUrl`)
  - `src/i18n/locales/en.json` (same keys)
  - `src/i18n/locales/es.json` (same keys)

---

## CR-43: Add Logout Button in Settings Tab

- **Type:** NEW FEATURE
- **Description:** There is no way for the user to log out of the application from within the app. A "Sign Out" / "Sair" / "Cerrar Sesion" button must be added to the Settings tab so the user can disconnect from the current session and return to the login screen. The SPEC.final.md section 7.12 already defines this feature (with confirmation dialog, i18n, destructive styling) and section 9.10 has acceptance criteria, but it was never implemented in the Settings screen code.
- **Current State:**
  - `AuthContext.tsx` already has a working `signOut()` function (line 117-122) that calls `supabase.auth.signOut()` and throws on error.
  - `settings/index.tsx` does NOT render any Sign Out button.
  - SPEC.final.md section 7.12 specifies: destructive-style button, confirmation dialog with "Sair" title and "Deseja realmente sair?" message, Cancel/Confirm options, i18n support.
  - Section 9.10 has acceptance criteria: AC-CR023-1 through AC-CR023-3.
  - i18n files already have `auth.logout` key: "Sair" (pt-BR), "Sign Out" (en), "Cerrar Sesion" (es).
- **Required Changes:**
  1. Add a Sign Out button at the bottom of the Settings screen ScrollView, below the last section.
  2. On tap, show a confirmation `Alert.alert` dialog with translated title and message.
  3. On confirm, call `signOut()` from `useAuth()` and clear the React Query cache via `queryClient.clear()`.
  4. On cancel, dismiss the dialog (no action).
  5. On error, show an error alert and keep the user on the Settings screen.
- **Acceptance Criteria:**
  - AC-43.1: Given the user is on the Settings screen, when scrolling to the bottom, then a "Sign Out" button is visible below the last settings section (About). Priority: must.
  - AC-43.2: Given the Sign Out button, when rendered, then it displays the translated text using the `settings.signOut` i18n key: "Sair" (pt-BR), "Sign Out" (en), "Cerrar Sesion" (es). Priority: must.
  - AC-43.3: Given the user taps the Sign Out button, when tapped, then a confirmation `Alert.alert` dialog appears with title from `settings.signOutTitle` and message from `settings.signOutMessage`, with Cancel (`common.cancel`) and Confirm (`common.confirm`) options. Priority: must.
  - AC-43.4: Given the user confirms the sign out, when the sign out completes, then the Supabase session is terminated (via `AuthContext.signOut()`), the React Query cache is cleared (`queryClient.clear()`), and the user is redirected to the login screen automatically (the `onAuthStateChange` listener in AuthContext sets session to null, which triggers the auth guard redirect). Priority: must.
  - AC-43.5: Given the Sign Out button styling, when rendered, then it is displayed as a destructive-style button: red/error-color text, centered, with adequate padding, visually distinct from regular settings items. Priority: should.
  - AC-43.6: Given any user role (bishopric, secretary, observer), when viewing Settings, then the Sign Out button is visible (no permission restriction). Priority: must.
  - AC-43.7: Given the sign out process fails (network error), when the error occurs, then an error alert is displayed (`common.error` title) and the user remains on the Settings screen. Priority: must.
- **Edge Cases:**
  - EC-43.1: If the sign out fails due to network error, an error alert should be displayed and the user stays on the Settings screen (do not navigate away).
  - EC-43.2: If the user is offline when tapping sign out, the local session should still be cleared and the user redirected to login. The `supabase.auth.signOut()` clears the local session even if the server request fails (Supabase SDK behavior). If it throws, catch the error and still navigate away.
  - EC-43.3: After sign out, pressing the device back button must NOT return to the authenticated screens. This is handled automatically by the auth guard in the root layout (session becomes null, auth layout renders).
- **i18n Keys to Add:**

  | Key | pt-BR | en | es |
  |-----|-------|----|----|
  | `settings.signOut` | `Sair` | `Sign Out` | `Cerrar Sesion` |
  | `settings.signOutTitle` | `Sair` | `Sign Out` | `Cerrar Sesion` |
  | `settings.signOutMessage` | `Deseja realmente sair?` | `Are you sure you want to sign out?` | `Esta seguro de que desea cerrar sesion?` |

- **Files Impacted:**
  - `src/app/(tabs)/settings/index.tsx` (add Sign Out button and confirmation handler)
  - `src/i18n/locales/pt-BR.json` (add `settings.signOut`, `settings.signOutTitle`, `settings.signOutMessage`)
  - `src/i18n/locales/en.json` (same keys)
  - `src/i18n/locales/es.json` (same keys)

---

## Assumptions

```yaml
assumptions:
  - id: A-CR32-1
    description: "The About screen already exists and works at settings/about.tsx with basic content (app name, version, back button)"
    confirmed: true
    default_if_not_confirmed: "N/A"

  - id: A-CR32-2
    description: "The credits value (author name) should use an i18n key so it can be customized per deployment"
    confirmed: false
    default_if_not_confirmed: "Use a hardcoded i18n value that can be changed later"

  - id: A-CR32-3
    description: "The support link row should be hidden by default until a URL is configured"
    confirmed: false
    default_if_not_confirmed: "Set about.supportUrl to empty string in all 3 locale files; the row is hidden when empty"

  - id: A-CR43-1
    description: "AuthContext.signOut() (line 117-122) works correctly and calls supabase.auth.signOut()"
    confirmed: true
    default_if_not_confirmed: "N/A"

  - id: A-CR43-2
    description: "After signOut clears the session, the auth state listener (onAuthStateChange) sets session to null, and the root layout auth guard automatically redirects to the login screen"
    confirmed: true
    default_if_not_confirmed: "Add explicit navigation to login screen after signOut"

  - id: A-CR43-3
    description: "React Query cache should be cleared on signOut to prevent stale data from the previous user appearing if a different user logs in"
    confirmed: false
    default_if_not_confirmed: "Call queryClient.clear() after successful signOut"
```

---

## Open Questions

```yaml
open_questions:
  - id: Q-CR32-1
    question: "What specific name or text should appear in the credits field? A person's name, a team name, or an organization?"
    proposed_default: "Use a generic i18n key (about.creditsValue) with a placeholder value that can be customized. Default: empty or app author name from app.json."

  - id: Q-CR32-2
    question: "What URL or email should be used for the support/feedback link?"
    proposed_default: "Leave about.supportUrl empty by default. The support row is hidden when the URL is empty. Can be configured later."

  - id: Q-CR43-1
    question: "Should the app clear AsyncStorage (theme preference) on sign out, or only clear the Supabase session and React Query cache?"
    proposed_default: "Keep AsyncStorage theme preference. Only clear Supabase session and React Query cache. Theme is a device-level preference, not user-level."
```

---

## Implementation Notes

### CR-32 (About Screen)

The implementation is straightforward since the About screen already exists with the correct layout structure. Changes are additive:

1. Add a new `infoRow` for credits below the version row.
2. Add a conditional `infoRow` for support link (only renders if `about.supportUrl` is non-empty).
3. Use `Linking.openURL()` from React Native to open the support URL.
4. Add 4 new i18n keys in all 3 locale files.

### CR-43 (Sign Out Button)

The implementation leverages existing infrastructure:

1. `useAuth()` provides `signOut()` function (already implemented in `AuthContext.tsx:117-122`).
2. `useQueryClient()` from React Query provides `queryClient.clear()` for cache cleanup.
3. `Alert.alert()` from React Native provides the confirmation dialog.
4. The auth guard in the root layout handles the redirect to login when session becomes null.
5. The button should be placed after the last `<View style={styles.section}>` block in the ScrollView.
6. Existing i18n key `auth.logout` exists but new dedicated keys under `settings.*` namespace are preferred for consistency.

### Shared Files

Both CRs require changes to the same 3 i18n locale files:
- `src/i18n/locales/pt-BR.json`
- `src/i18n/locales/en.json`
- `src/i18n/locales/es.json`

---

## Definition of Done

- [ ] About screen displays credits row below version (CR-32)
- [ ] About screen conditionally displays support/feedback link row (CR-32)
- [ ] Support link opens device handler via Linking.openURL when tapped (CR-32)
- [ ] Support row is hidden when URL is empty (CR-32)
- [ ] All About screen labels translated in 3 languages (CR-32)
- [ ] Sign Out button visible at bottom of Settings screen for all roles (CR-43)
- [ ] Sign Out button uses destructive styling (red/error color text) (CR-43)
- [ ] Tapping Sign Out shows confirmation dialog with i18n text (CR-43)
- [ ] Confirming sign out calls AuthContext.signOut() and queryClient.clear() (CR-43)
- [ ] Canceling sign out dismisses dialog with no action (CR-43)
- [ ] Sign out error shows error alert, user stays on Settings (CR-43)
- [ ] All Sign Out labels translated in 3 languages (CR-43)
- [ ] After sign out, user is redirected to login screen (CR-43)
- [ ] After sign out, back navigation does not return to authenticated screens (CR-43)
- [ ] Existing tests pass after changes
