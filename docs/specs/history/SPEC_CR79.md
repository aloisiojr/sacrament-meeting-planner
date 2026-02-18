# SPEC_CR79 - Back Button on Users Screen

## SPEC_SUMMARY

```yaml
type: spec_summary
goal: "Add a back button to the Users screen (settings/users) to match the navigation pattern of all other settings sub-screens"
in_scope:
  - "Add back button to Users screen header, following the existing pattern used by all other settings sub-screens"
  - "Restructure Users screen header to include back button, title (centered), and invite button"
out_of_scope:
  - "Changing the back button pattern used by other screens"
  - "Adding native header/navigation bar (headerShown remains false)"
  - "Changing any Users screen functionality beyond navigation"
main_risks:
  - "Header layout change may affect alignment of title and invite button on small screens"
ac_count: 5
edge_case_count: 2
has_open_questions: false
has_unconfirmed_assumptions: true
```

## SPEC

```yaml
type: spec
version: 1
goal: "Add a back button to the Users screen header so users can navigate back to Settings, consistent with all other settings sub-screens"

scope:
  in:
    - "Add a text-based back button (using common.back i18n key) to the Users screen header"
    - "Restructure Users screen header layout to accommodate: [Back] [Title] [Invite]"
    - "Back button calls router.back() to return to the Settings index screen"
  out:
    - "Changing the back button visual style or pattern used across the app"
    - "Enabling the Stack navigator header (headerShown stays false)"
    - "Modifying any other screen's navigation behavior"

acceptance_criteria:
  - id: AC-1
    given: "User is on the Users screen (settings/users)"
    when: "The screen renders"
    then: "A back button labeled with the translated 'common.back' text is visible in the top-left area of the header"
    priority: must

  - id: AC-2
    given: "User is on the Users screen"
    when: "User taps the back button"
    then: "The app navigates back to the Settings index screen (settings/index) via router.back()"
    priority: must

  - id: AC-3
    given: "User is on the Users screen"
    when: "The screen renders"
    then: "The header shows: back button (left), screen title (center), invite button (right), following the same layout pattern as members.tsx, topics.tsx, history.tsx, and other settings sub-screens"
    priority: must

  - id: AC-4
    given: "User is on the Users screen with the back button visible"
    when: "The back button is rendered"
    then: "The back button has accessibilityRole='button' for screen reader support"
    priority: should

  - id: AC-5
    given: "User is on the Users screen"
    when: "The screen renders in dark mode or light mode"
    then: "The back button text uses colors.primary for its color, consistent with the pattern in other settings sub-screens"
    priority: must

edge_cases:
  - id: EC-1
    case: "User navigates directly to /settings/users via deep link without prior Settings screen in the stack"
    expected: "router.back() navigates to the nearest available screen in the navigation stack (default expo-router behavior); no crash or error"

  - id: EC-2
    case: "Screen title and invite button text are long (e.g., in a verbose language)"
    expected: "Header elements remain visible and do not overlap; title may truncate if necessary"

assumptions:
  - id: A-1
    description: "The back button pattern follows the same visual style as all other settings sub-screens (text-only Pressable, fontSize 16, fontWeight 600, colors.primary)"
    confirmed: true
    default_if_not_confirmed: "Use the exact pattern from about.tsx or history.tsx"

  - id: A-2
    description: "The header layout will use flexDirection row with space-between, placing back button left, title center, and invite button right"
    confirmed: false
    default_if_not_confirmed: "Follow the same header layout pattern as members.tsx which also has a three-element header (back, title, add button)"

open_questions: []

definition_of_done:
  - "Back button is visible on the Users screen header, left-aligned"
  - "Tapping the back button navigates to the Settings index"
  - "Back button uses i18n key common.back"
  - "Back button has proper accessibility attributes"
  - "Visual style matches other settings sub-screens (colors.primary, fontSize 16, fontWeight 600)"
  - "Header layout is consistent with the established pattern (back left, title center, action right)"
  - "Works correctly in light and dark modes"
  - "Works in all three supported languages (pt-BR, en, es)"
```
