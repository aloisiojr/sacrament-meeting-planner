# PLAN_CR3_F027 - About Screen + Logout Button (CR-32, CR-43)

## PLAN_SUMMARY

```yaml
type: plan_summary
total_steps: 5
parallel_tracks: 2
estimated_commits: 5
coverage:
  acceptance_criteria: 12/12
  edge_cases: 5/5
critical_path:
  - "STEP-01: Add credits and support link rows to About screen (CR-32)"
  - "STEP-03: Add Sign Out button with confirmation to Settings screen (CR-43)"
main_risks:
  - "CR-43: signOut must clear React Query cache to prevent stale data on re-login"
  - "CR-43: after signOut, back navigation must not return to authenticated screens (handled by existing auth guard)"
  - "CR-32: support URL row must be hidden when URL is empty"
```

---

## PLAN

```yaml
type: plan
version: 1

goal: "Enhance About screen with credits and optional support link (CR-32), and add Sign Out button with confirmation dialog to Settings screen (CR-43). Both CRs are UI-focused with no database changes."

strategy:
  order: "CR-32 and CR-43 are independent and can be implemented in parallel. i18n keys for both CRs are added in a shared step to avoid merge conflicts in locale files."
  commit_strategy: "1 commit per step, conventional commits (feat: for UI changes, chore: for i18n)"
  test_strategy: "No automated tests required (UI components). Manual verification of rendering and interaction."
```

---

## Steps

### STEP-01: CR-32 -- Add Credits and Support Link Rows to About Screen

```yaml
- id: STEP-01
  description: |
    Enhance the existing About screen (about.tsx) with two new information rows:

    1. Credits row: below the version row
       - Label: t('about.credits') -- "Desenvolvido por" / "Developed by" / "Desarrollado por"
       - Value: t('about.creditsValue') -- configurable author name via i18n key

    2. Support row (conditional): below credits row
       - Only rendered if t('about.supportUrl') is non-empty
       - Label: t('about.support') -- "Suporte e Feedback" / "Support & Feedback" / "Soporte y Comentarios"
       - On tap: Linking.openURL(supportUrl)
       - Import Linking from 'expo-linking' or 'react-native' (whichever is used in the codebase)

    Layout after changes:
      ┌──────────────────────────────────┐
      │    {appName}                     │
      │ ─────────────────────────────── │
      │ Version          {version}       │
      │ ─────────────────────────────── │
      │ Credits          {creditsValue}  │
      │ ─────────────────────────────── │
      │ Support          {supportUrl} >  │  (only if URL defined)
      └──────────────────────────────────┘

    The existing info row styling should be reused (same card pattern as version row).
  files:
    - "src/app/(tabs)/settings/about.tsx"
  dependencies: ["STEP-02"]
  parallelizable_with: ["STEP-03"]
  done_when:
    - "Credits row is visible below version row with translated label and value"
    - "Support row is visible ONLY when about.supportUrl i18n value is non-empty"
    - "Tapping support row opens URL via Linking.openURL"
    - "When about.supportUrl is empty, support row is NOT rendered"
    - "Existing back button and version display are unchanged"
  tests:
    - type: manual
      description: "Navigate to About screen -- credits row visible with author name"
    - type: manual
      description: "Support row hidden by default (empty URL)"
  covers:
    acceptance_criteria: ["AC-32.1", "AC-32.2", "AC-32.3", "AC-32.4", "AC-32.5"]
    edge_cases: ["EC-32.1", "EC-32.2"]
  risks:
    - risk: "Linking.openURL may fail for invalid URLs"
      mitigation: "Support URL is hidden when empty; when set, it should be validated by the developer"
```

### STEP-02: Add i18n Keys for Both CRs (CR-32 + CR-43)

```yaml
- id: STEP-02
  description: |
    Add all new i18n keys for both CR-32 and CR-43 to all 3 locale files.
    This is done as a single step to avoid merge conflicts in the locale files.

    CR-32 keys (About screen):
      about.credits:      "Desenvolvido por" / "Developed by" / "Desarrollado por"
      about.creditsValue: "" (empty by default, configurable)
      about.support:      "Suporte e Feedback" / "Support & Feedback" / "Soporte y Comentarios"
      about.supportUrl:   "" (empty by default, hidden when empty)

    CR-43 keys (Sign Out):
      settings.signOut:        "Sair" / "Sign Out" / "Cerrar Sesion"
      settings.signOutTitle:   "Sair" / "Sign Out" / "Cerrar Sesion"
      settings.signOutMessage: "Deseja realmente sair?" / "Are you sure you want to sign out?" / "Esta seguro de que desea cerrar sesion?"

    Note: Check if auth.logout key already exists. If so, settings.signOut can
    reuse it or be a new dedicated key under the settings namespace.
  files:
    - "src/i18n/locales/pt-BR.json"
    - "src/i18n/locales/en.json"
    - "src/i18n/locales/es.json"
  dependencies: []
  parallelizable_with: []
  done_when:
    - "All 7 new i18n keys exist in all 3 locale files"
    - "about.creditsValue has a placeholder or configurable value"
    - "about.supportUrl is empty string in all 3 locales"
    - "Existing i18n keys are unchanged"
  tests:
    - type: unit
      description: "Verify JSON files are valid (no syntax errors)"
  covers:
    acceptance_criteria: ["AC-32.5", "AC-43.2"]
    edge_cases: []
  risks:
    - risk: "JSON syntax errors from manual editing"
      mitigation: "Validate JSON after editing"
```

### STEP-03: CR-43 -- Add Sign Out Button with Confirmation to Settings Screen

```yaml
- id: STEP-03
  description: |
    Add a Sign Out button at the bottom of the Settings screen ScrollView.

    1. Destructure signOut from useAuth():
       const { hasPermission, wardId, signOut } = useAuth();

    2. Get queryClient:
       const queryClient = useQueryClient(); (already imported if used elsewhere)

    3. Add handleSignOut function:
       const handleSignOut = useCallback(() => {
         Alert.alert(
           t('settings.signOutTitle'),
           t('settings.signOutMessage'),
           [
             { text: t('common.cancel'), style: 'cancel' },
             {
               text: t('settings.signOut'),
               style: 'destructive',
               onPress: async () => {
                 try {
                   queryClient.clear();
                   await signOut();
                 } catch (err) {
                   Alert.alert(t('common.error'), String(err));
                 }
               },
             },
           ]
         );
       }, [signOut, queryClient, t]);

    4. Add button at bottom of ScrollView, after last section:
       <Pressable
         style={[styles.signOutButton, { borderColor: colors.destructive }]}
         onPress={handleSignOut}
         accessibilityRole="button"
       >
         <Text style={[styles.signOutText, { color: colors.destructive }]}>
           {t('settings.signOut')}
         </Text>
       </Pressable>

    5. Add styles:
       signOutButton: {
         marginHorizontal: 16, marginTop: 24, marginBottom: 40,
         paddingVertical: 14, borderRadius: 12, borderWidth: 1,
         alignItems: 'center',
       }
       signOutText: { fontSize: 16, fontWeight: '600' }

    Note: colors.destructive may not exist. Check existing theme colors.
    Use colors.error or a hardcoded red (#FF3B30) if needed.
  files:
    - "src/app/(tabs)/settings/index.tsx"
  dependencies: ["STEP-02"]
  parallelizable_with: ["STEP-01"]
  done_when:
    - "Sign Out button is visible at bottom of Settings screen"
    - "Button uses destructive styling (red/error color)"
    - "Tapping button shows confirmation Alert with Cancel and Sign Out options"
    - "Confirming calls queryClient.clear() then signOut()"
    - "On success, user is redirected to login screen (via auth guard)"
    - "On error, Alert shows error message and user stays on Settings"
    - "All roles see the Sign Out button (no permission check)"
  tests:
    - type: manual
      description: "Tap Sign Out -> confirmation dialog appears"
    - type: manual
      description: "Confirm sign out -> redirected to login screen"
    - type: manual
      description: "Cancel sign out -> dialog dismissed, stays on Settings"
  covers:
    acceptance_criteria: ["AC-43.1", "AC-43.3", "AC-43.4", "AC-43.5", "AC-43.6", "AC-43.7"]
    edge_cases: ["EC-43.1", "EC-43.2", "EC-43.3"]
  risks:
    - risk: "signOut() may throw on network error"
      mitigation: "Wrapped in try/catch with error Alert"
    - risk: "queryClient.clear() before signOut means if signOut fails, cache is already cleared"
      mitigation: "Acceptable -- user can re-login and cache will be rebuilt. Alternative is to clear after, but then stale data could appear briefly."
```

### STEP-04: Verify Auth Guard and Navigation After Sign Out

```yaml
- id: STEP-04
  description: |
    Verify that the existing auth guard in the root layout correctly handles
    the sign-out scenario:

    1. Read src/app/_layout.tsx or root layout to confirm session guard logic
    2. Confirm that when session becomes null, the app redirects to /(auth)/login
    3. Confirm that after sign out, pressing device back button does NOT return
       to authenticated screens

    This is a verification step -- no code changes expected. If issues are found,
    fix them in this step.
  files:
    - "src/app/_layout.tsx"
    - "src/contexts/AuthContext.tsx"
  dependencies: ["STEP-03"]
  parallelizable_with: []
  done_when:
    - "Auth guard in root layout redirects to login when session is null"
    - "signOut() in AuthContext calls supabase.auth.signOut() correctly"
    - "No back navigation possible after sign out (auth guard blocks it)"
  tests:
    - type: manual
      description: "Sign out -> verify login screen shown, back button does not return to Settings"
  covers:
    acceptance_criteria: ["AC-43.4"]
    edge_cases: ["EC-43.3"]
  risks:
    - risk: "None expected -- existing auth guard should handle this"
      mitigation: "N/A"
```

### STEP-05: Final Consistency Check

```yaml
- id: STEP-05
  description: |
    Final verification:
    1. TypeScript compiles without errors: npx tsc --noEmit
    2. All i18n keys present in all 3 locales
    3. About screen renders correctly (credits + conditional support)
    4. Sign Out button renders correctly with destructive styling
    5. No regressions in existing Settings screen functionality
  files:
    - "src/app/(tabs)/settings/about.tsx"
    - "src/app/(tabs)/settings/index.tsx"
    - "src/i18n/locales/pt-BR.json"
    - "src/i18n/locales/en.json"
    - "src/i18n/locales/es.json"
  dependencies: ["STEP-01", "STEP-02", "STEP-03", "STEP-04"]
  parallelizable_with: []
  done_when:
    - "TypeScript compiles without errors"
    - "All new i18n keys exist in all 3 locales"
    - "About screen and Settings screen render correctly"
  tests:
    - type: integration
      description: "Full build and verification"
  covers:
    acceptance_criteria: []
    edge_cases: []
  risks:
    - risk: "None -- verification-only step"
      mitigation: "N/A"
```

---

## Validation

```yaml
validation:
  - ac_id: AC-32.1
    how_to_verify: "Navigate to About screen. App name, version, and credits are displayed in order."
    covered_by_steps: ["STEP-01"]

  - ac_id: AC-32.2
    how_to_verify: "Credits row shows label and value below version row."
    covered_by_steps: ["STEP-01"]

  - ac_id: AC-32.3
    how_to_verify: "Set about.supportUrl to a URL in locale file. Tap support row -> URL opens."
    covered_by_steps: ["STEP-01"]

  - ac_id: AC-32.4
    how_to_verify: "about.supportUrl is empty -> support row is hidden."
    covered_by_steps: ["STEP-01"]

  - ac_id: AC-32.5
    how_to_verify: "Switch language to each of 3 locales. All labels are translated."
    covered_by_steps: ["STEP-01", "STEP-02"]

  - ac_id: AC-43.1
    how_to_verify: "Scroll to bottom of Settings screen. Sign Out button is visible."
    covered_by_steps: ["STEP-03"]

  - ac_id: AC-43.2
    how_to_verify: "Button text matches locale: Sair / Sign Out / Cerrar Sesion."
    covered_by_steps: ["STEP-02", "STEP-03"]

  - ac_id: AC-43.3
    how_to_verify: "Tap Sign Out -> Alert dialog with title, message, Cancel, Confirm."
    covered_by_steps: ["STEP-03"]

  - ac_id: AC-43.4
    how_to_verify: "Confirm sign out -> session cleared, redirected to login."
    covered_by_steps: ["STEP-03", "STEP-04"]

  - ac_id: AC-43.5
    how_to_verify: "Code review: handleSignOut calls signOut() from useAuth()."
    covered_by_steps: ["STEP-03"]

  - ac_id: AC-43.6
    how_to_verify: "Button has red/destructive text color, centered, with border."
    covered_by_steps: ["STEP-03"]

  - ac_id: AC-43.7
    how_to_verify: "Login as each role (bishopric, secretary, observer). Sign Out button visible for all."
    covered_by_steps: ["STEP-03"]
```

---

## Execution Order Diagram

```
Phase 1 (shared dependency):
  STEP-02 (i18n keys for both CRs) ──┐
                                       │
Phase 2 (parallel, depend on STEP-02): │
  STEP-01 (About screen - CR-32) ─────┤
  STEP-03 (Sign Out button - CR-43) ──┤
                                       │
Phase 3 (depends on STEP-03):         │
  STEP-04 (verify auth guard) ────────┤
                                       │
Phase 4 (depends on all):             │
  STEP-05 (final check) <─────────────┘
```

### File Conflict Map

| File | Steps | Sections Modified |
|------|-------|-------------------|
| `src/app/(tabs)/settings/about.tsx` | STEP-01 | Add credits row + conditional support row |
| `src/app/(tabs)/settings/index.tsx` | STEP-03 | Add handleSignOut + Sign Out button at bottom |
| `src/i18n/locales/pt-BR.json` | STEP-02 | Add 7 new keys (about.*, settings.*) |
| `src/i18n/locales/en.json` | STEP-02 | Same keys |
| `src/i18n/locales/es.json` | STEP-02 | Same keys |

No file conflicts -- each file is modified by only one step (except locale files which are only in STEP-02).
