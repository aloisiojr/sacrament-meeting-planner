# PLAN_CR79 - Back Button on Users Screen

## PLAN_SUMMARY

```yaml
type: plan_summary
total_steps: 3
parallel_tracks: 0
estimated_commits: 3
coverage:
  acceptance_criteria: 5/5
  edge_cases: 2/2
critical_path:
  - "STEP-01: Add useRouter import and back button Pressable to users.tsx header"
  - "STEP-02: Restructure header layout and update styles to match settings sub-screen pattern"
  - "STEP-03: Add QA tests for CR-79"
main_risks:
  - "Minimal risk: follows the exact same pattern used by 7 other settings sub-screens"
```

## PLAN

```yaml
type: plan
version: 1

goal: "Add a back button to the Users screen header so users can navigate back to Settings, consistent with all other settings sub-screens"

strategy:
  order: "Import + hook → Header restructure + styles → QA tests"
  commit_strategy: "1 commit per step, conventional commit messages (fix:, test:)"
  test_strategy: "QA test in final step; pattern is already proven across 7 other screens"

steps:
  - id: STEP-01
    description: |
      Modify users.tsx to add the back button and restructure the header:
      1. ADD import: `import { useRouter } from 'expo-router';`
      2. ADD hook call inside component: `const router = useRouter();`
      3. RESTRUCTURE header JSX from 2-element [Title | Invite] to 3-element [Back | Title | Invite]:
         - Left: Add `<Pressable onPress={() => router.back()} accessibilityRole="button"><Text style={[styles.backButton, { color: colors.primary }]}>{t('common.back')}</Text></Pressable>`
         - Center: Keep title but change style from `styles.title` to `styles.headerTitle` (new style)
         - Right: Keep existing invite button Pressable (unchanged)
      4. UPDATE StyleSheet:
         - ADD `backButton` style: `{ fontSize: 16, fontWeight: '600' }` (matches about.tsx:91-94, members.tsx pattern)
         - RENAME `title` to `headerTitle` and change fontSize from 28 to 22, fontWeight from 'bold' to '700' (matches members.tsx headerTitle pattern of ~18-22px)
         - The existing `header` style already has `flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'` which is the correct layout — no change needed
    files:
      - path: "src/app/(tabs)/settings/users.tsx"
        action: MODIFY
        details: |
          Line 1: Add `useRouter` to imports (new import line: `import { useRouter } from 'expo-router';`)
          Line ~68: Add `const router = useRouter();` after `const queryClient = useQueryClient();`
          Lines 225-237: Restructure header JSX to add back button before title
          Lines 526-529: Rename 'title' style to 'headerTitle', change fontSize 28->22, fontWeight 'bold'->'700'
          Add new 'backButton' style: { fontSize: 16, fontWeight: '600' }
    dependencies: []
    parallelizable_with: []
    done_when:
      - "useRouter is imported from expo-router in users.tsx"
      - "router = useRouter() is called inside the component"
      - "Back button Pressable with t('common.back') text is rendered as first child of header View"
      - "Back button has accessibilityRole='button'"
      - "Back button text uses [styles.backButton, { color: colors.primary }]"
      - "Back button calls router.back() on press"
      - "Title uses headerTitle style with fontSize 22 and fontWeight '700'"
      - "Invite button remains as third element on the right (unchanged functionality)"
      - "backButton style has fontSize 16 and fontWeight '600'"
      - "No other functionality is changed"
    tests:
      - type: manual
        description: "Navigate to Settings > Users and verify: back button is visible on left, title centered, invite button on right"
    covers:
      acceptance_criteria: ["AC-1", "AC-2", "AC-3", "AC-4", "AC-5"]
      edge_cases: ["EC-1", "EC-2"]
    risks:
      - risk: "Title fontSize change from 28 to 22 may look different"
        mitigation: "This aligns with all other settings sub-screens; 28px was the outlier"

  - id: STEP-02
    description: |
      Verify the fix works correctly across themes and languages:
      1. Verify the back button text color uses colors.primary (works in both light and dark mode)
      2. Verify t('common.back') key already exists in all 3 locale files (pt-BR, en, es) — no new i18n keys needed
      3. Verify the invite button still opens the invite modal (no regression)
      4. Verify the header layout does not overlap on small screens
    files: []
    dependencies: ["STEP-01"]
    parallelizable_with: []
    done_when:
      - "Back button is visible and styled correctly in both light and dark themes"
      - "Back button text is properly translated in pt-BR, en, and es"
      - "Invite button still functions correctly"
      - "Header elements do not overlap"
    tests:
      - type: manual
        description: "Toggle theme to dark mode and verify back button text uses colors.primary"
    covers:
      acceptance_criteria: ["AC-5"]
      edge_cases: ["EC-2"]
    risks: []

  - id: STEP-03
    description: |
      Add QA tests for CR-79:
      1. Create test file at src/__tests__/qa/cr79.test.tsx
      2. Test AC-1: Render users.tsx and verify a Pressable with accessibilityRole='button' containing text matching t('common.back') exists
      3. Test AC-2: Mock useRouter, simulate press on the back button Pressable, verify router.back() was called
      4. Test AC-3: Verify header has 3 children: back button, title, invite button (in that order)
      5. Test AC-4: Verify the invite button still opens the invite modal after header restructure
      6. Test AC-5: Verify back button Pressable has accessibilityRole='button'
      7. Test EC-1: Verify router.back() is called without errors (deep link scenario handled by expo-router)
    files:
      - path: "src/__tests__/qa/cr79.test.tsx"
        action: CREATE
        details: "QA test suite for CR-79 covering all 5 ACs and 2 edge cases"
    dependencies: ["STEP-01"]
    parallelizable_with: ["STEP-02"]
    done_when:
      - "Test file exists at src/__tests__/qa/cr79.test.tsx"
      - "Tests cover all 5 acceptance criteria"
      - "Tests cover both edge cases"
      - "All tests pass with vitest"
    tests:
      - type: unit
        description: "Full QA test suite for CR-79"
    covers:
      acceptance_criteria: ["AC-1", "AC-2", "AC-3", "AC-4", "AC-5"]
      edge_cases: ["EC-1", "EC-2"]
    risks:
      - risk: "Mocking useRouter and supabase may require setup already used in other test files"
        mitigation: "Follow existing test patterns from src/__tests__/qa/ directory"

validation:
  - ac_id: AC-1
    how_to_verify: "Render Users screen and confirm back button with t('common.back') text is visible in top-left header area"
    covered_by_steps: ["STEP-01", "STEP-03"]

  - ac_id: AC-2
    how_to_verify: "Tap back button and confirm router.back() navigates to Settings index"
    covered_by_steps: ["STEP-01", "STEP-03"]

  - ac_id: AC-3
    how_to_verify: "Inspect header layout: back button (left), title (center), invite button (right) — matches members.tsx pattern"
    covered_by_steps: ["STEP-01", "STEP-03"]

  - ac_id: AC-4
    how_to_verify: "Tap invite button and confirm modal opens as before (no regression)"
    covered_by_steps: ["STEP-01", "STEP-03"]

  - ac_id: AC-5
    how_to_verify: "Inspect back button Pressable and confirm accessibilityRole='button' is set"
    covered_by_steps: ["STEP-01", "STEP-02", "STEP-03"]

  - ec_id: EC-1
    how_to_verify: "router.back() uses expo-router default behavior; same pattern as all other sub-screens"
    covered_by_steps: ["STEP-01", "STEP-03"]

  - ec_id: EC-2
    how_to_verify: "Header uses flexDirection row with space-between; same pattern as members.tsx which also has 3 elements"
    covered_by_steps: ["STEP-01", "STEP-02"]
```

## Dependency Graph

```
STEP-01 (Add back button + restructure header + update styles)
  |
  ├── STEP-02 (Verify themes, i18n, no regression)
  |
  └── STEP-03 (QA Tests)
```

## Step Execution Order

| Phase | Steps | Description |
|-------|-------|-------------|
| 1 - Implementation | STEP-01 | Add back button, restructure header, update styles |
| 2 - Verification | STEP-02, STEP-03 | Manual verification + automated QA tests (parallel) |

## Notes

### Pattern Reference

The back button pattern is identical across all settings sub-screens. Reference implementation from `about.tsx`:

```tsx
<View style={styles.header}>
  <Pressable onPress={() => router.back()} accessibilityRole="button">
    <Text style={[styles.backButton, { color: colors.primary }]}>
      {t('common.back')}
    </Text>
  </Pressable>
  <Text style={[styles.title, { color: colors.text }]}>{t('about.title')}</Text>
  <View style={styles.headerSpacer} />
</View>
```

For the Users screen, the third element is the Invite button instead of a spacer, matching the `members.tsx` pattern which has `[Back | Title | Add button]`.

### No New Dependencies

- No new npm packages required
- No new i18n keys required (`common.back` already exists in all 3 locales)
- No backend/Edge Function changes
- No database changes
- Single file modification: `src/app/(tabs)/settings/users.tsx`
