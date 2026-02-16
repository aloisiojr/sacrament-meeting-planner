# PLAN_CR3_F030 - Ward Topics Search (CR-39)

## PLAN_SUMMARY

```yaml
type: plan_summary
total_steps: 3
parallel_tracks: 1
estimated_commits: 3
coverage:
  acceptance_criteria: 6/6
  edge_cases: 2/2
critical_path:
  - "STEP-01: Add search state and filter logic to topics.tsx"
  - "STEP-02: Add search TextInput UI to Ward Topics section"
main_risks:
  - "Search must only filter Ward Topics, not Collections section"
  - "Special regex characters in search text must be treated as literal (use .includes, not regex)"
```

---

## PLAN

```yaml
type: plan
version: 1

goal: "Add a search/filter text input to the Ward Topics screen that filters Ward Topics in real-time by title (CR-39). Collections section remains unfiltered."

strategy:
  order: "Sequential -- add state/logic first, then UI, then verify."
  commit_strategy: "1 commit per step: feat: for code changes"
  test_strategy: "Manual verification. No automated tests (UI component with simple filter logic)."
```

---

## Steps

### STEP-01: Add Search State, Filter Logic, and TextInput to topics.tsx

```yaml
- id: STEP-01
  description: |
    Add search/filter functionality to the Ward Topics section of the Topics screen.

    Changes to src/app/(tabs)/settings/topics.tsx:

    1. Add state:
       const [topicSearch, setTopicSearch] = useState('');

    2. Add filtered topics memo:
       const filteredTopics = useMemo(() => {
         if (!topicSearch.trim()) return wardTopics;
         const query = topicSearch.toLowerCase();
         return wardTopics?.filter(t =>
           t.title.toLowerCase().includes(query)
         ) ?? [];
       }, [wardTopics, topicSearch]);

    3. Add search TextInput below the Ward Topics section header, above the list:
       <TextInput
         style={[styles.searchInput, {
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

    4. Replace wardTopics with filteredTopics in the rendering map.
       Wherever the current code maps over wardTopics to render the list,
       use filteredTopics instead.

    5. Add searchInput style matching Members screen:
       searchInput: {
         height: 40,
         borderWidth: 1,
         borderRadius: 8,
         paddingHorizontal: 12,
         fontSize: 15,
         marginHorizontal: 16,
         marginBottom: 8,
       }

    6. Ensure the Collections section rendering is NOT affected by the search.
       The search state only filters wardTopics, not collections.

    Important: Use .includes() for filtering (not regex) to avoid issues with
    special characters in search text.
  files:
    - "src/app/(tabs)/settings/topics.tsx"
  dependencies: []
  parallelizable_with: []
  done_when:
    - "Search TextInput is visible above the Ward Topics list"
    - "Typing in search filters Ward Topics in real-time (case-insensitive)"
    - "Empty search shows all Ward Topics"
    - "No matches shows empty state"
    - "Collections section is always fully visible (not filtered)"
    - "Search uses .includes() (not regex)"
    - "Search input styling matches Members screen"
    - "Search state resets when navigating away (local useState)"
  tests:
    - type: manual
      description: "Navigate to Topics -> search input visible above Ward Topics"
    - type: manual
      description: "Type search text -> Ward Topics filtered, Collections unchanged"
    - type: manual
      description: "Clear search -> all Ward Topics visible again"
    - type: manual
      description: "Type text matching no topics -> empty state shown"
  covers:
    acceptance_criteria: ["AC-39.1", "AC-39.2", "AC-39.3", "AC-39.4", "AC-39.5", "AC-39.6"]
    edge_cases: ["EC-39.1", "EC-39.2"]
  risks:
    - risk: "Need to identify correct variable names for wardTopics in the existing code"
      mitigation: "Read topics.tsx to find the actual variable names used for ward topics vs collections"
```

### STEP-02: TypeScript Compilation Check

```yaml
- id: STEP-02
  description: |
    Verify TypeScript compiles without errors after the changes.
    Run: npx tsc --noEmit

    Check that:
    1. useState and useMemo are imported (add if needed)
    2. TextInput is imported from react-native (add if needed)
    3. The filteredTopics type matches what the rendering expects
    4. No unused imports from the changes
  files:
    - "src/app/(tabs)/settings/topics.tsx"
  dependencies: ["STEP-01"]
  parallelizable_with: []
  done_when:
    - "TypeScript compiles without errors"
    - "All required imports are present"
  tests:
    - type: unit
      description: "npx tsc --noEmit succeeds"
  covers:
    acceptance_criteria: []
    edge_cases: []
  risks:
    - risk: "None"
      mitigation: "N/A"
```

### STEP-03: Final Verification

```yaml
- id: STEP-03
  description: |
    Final verification:
    1. TypeScript compiles without errors
    2. Search input renders correctly with proper styling
    3. Ward Topics filter works (case-insensitive substring match)
    4. Collections section is not affected by search
    5. Empty search shows all Ward Topics
    6. No matches shows empty state
    7. Special characters in search text don't cause errors
    8. Search state resets when navigating away and returning
  files:
    - "src/app/(tabs)/settings/topics.tsx"
  dependencies: ["STEP-01", "STEP-02"]
  parallelizable_with: []
  done_when:
    - "All verification checks pass"
  tests:
    - type: integration
      description: "Full manual verification of search functionality"
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
  - ac_id: AC-39.1
    how_to_verify: "Navigate to Settings > Topics. Search input visible above Ward Topics list."
    covered_by_steps: ["STEP-01"]

  - ac_id: AC-39.2
    how_to_verify: "Type in search field. Ward Topics list filters in real-time (case-insensitive)."
    covered_by_steps: ["STEP-01"]

  - ac_id: AC-39.3
    how_to_verify: "Clear search field. All Ward Topics displayed (sorted alphabetically)."
    covered_by_steps: ["STEP-01"]

  - ac_id: AC-39.4
    how_to_verify: "Type text that matches no topics. Empty state message displayed."
    covered_by_steps: ["STEP-01"]

  - ac_id: AC-39.5
    how_to_verify: "Compare search input styling with Members screen. Same height, border, radius, padding, font size."
    covered_by_steps: ["STEP-01"]

  - ac_id: AC-39.6
    how_to_verify: "Type search text. Collections section below is fully visible and unaffected."
    covered_by_steps: ["STEP-01"]
```

---

## Execution Order Diagram

```
STEP-01 (add search + filter) ──> STEP-02 (TypeScript check) ──> STEP-03 (verification)
```

### File Conflict Map

| File | Steps | Sections Modified |
|------|-------|-------------------|
| `src/app/(tabs)/settings/topics.tsx` | STEP-01 | Add state, memo, TextInput, style; replace wardTopics with filteredTopics in render |

Only one file is modified. No conflicts.
