# Change Requests Batch 3 - Ward Topics Search (SPEC_CR3_F030)

Feature: F030 - Ward Topics Search
Type: UI Enhancement (code changes required)

---

## SPEC_SUMMARY

```yaml
type: spec_summary
goal: "Add search/filter field to the Ward Topics screen for consistency with Members screen and improved usability (CR-39)"
in_scope:
  - "CR-39: Add search text input above the Ward Topics list that filters topics in real-time"
  - "CR-39: Search filters Ward Topics only, not General Collections"
  - "CR-39: Match styling with Members screen search input"
out_of_scope:
  - "Changes to General Collections section (toggle behavior, ordering)"
  - "Changes to topic CRUD operations"
  - "Server-side search or filtering"
  - "Search for topics within collections"
main_risks:
  - "None significant -- simple client-side filter on existing data"
ac_count: 7
edge_case_count: 3
has_open_questions: false
has_unconfirmed_assumptions: false
```

---

## CR-39: Add Search/Filter Field to Ward Topics Screen

- **Type:** UI Enhancement
- **Description:** The Ward Topics screen (`src/app/(tabs)/settings/topics.tsx`) does not have a search/filter field. The Members screen has a search field for filtering members in real-time. For consistency and usability when the list of ward topics grows large, a search field should be added above the Ward Topics list.

### Current State (Code Investigation)

**`topics.tsx` (lines 175-355):**
- The screen uses `useWardTopics()` hook to fetch all ward topics
- Topics are rendered in a `ScrollView` (not `FlatList`) via `.map()` (line 302-316)
- No search state or filtering logic exists
- The General Collections section (line 327-350) is rendered below the Ward Topics section
- The Members screen (`members.tsx`) implements search with state `const [search, setSearch] = useState('')` and passes it to `useMembers(search)` which filters server-side

For the Topics screen, the search should be client-side (filter the `wardTopics` array locally) since topics are already fully loaded. This matches the approach described in SPEC_CR3.md.

### Required Changes

#### Change 1: Add search state and filtered topics

```typescript
const [search, setSearch] = useState('');

const filteredTopics = useMemo(() => {
  if (!wardTopics || !search.trim()) return wardTopics;
  const query = search.toLowerCase();
  return wardTopics.filter((t) => t.title.toLowerCase().includes(query));
}, [wardTopics, search]);
```

#### Change 2: Add search input above Ward Topics list

Add a `TextInput` inside the Ward Topics section, between the section header and the topic list:

```typescript
<TextInput
  style={[styles.searchInput, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
  value={search}
  onChangeText={setSearch}
  placeholder={t('common.search')}
  placeholderTextColor={colors.placeholder}
  autoCapitalize="none"
  autoCorrect={false}
/>
```

#### Change 3: Add search input styling

```typescript
searchInput: {
  height: 40,
  borderWidth: 1,
  borderRadius: 8,
  paddingHorizontal: 12,
  fontSize: 15,
  marginHorizontal: 16,
  marginBottom: 8,
},
```

#### Change 4: Use `filteredTopics` instead of `wardTopics` in render

Replace `wardTopics` references in the topic list rendering (line 302) with `filteredTopics`.

### Acceptance Criteria

- AC-39.1: Given the user navigates to Settings > Topics, when the screen loads, then a search/filter text input is visible above the Ward Topics list (below the section header with the "+" button). Priority: must.
- AC-39.2: Given the user types in the search field, when characters are entered, then the Ward Topics list filters in real-time to show only topics whose title contains the search text (case-insensitive substring match). Priority: must.
- AC-39.3: Given the search field is empty, when viewing the list, then all Ward Topics are displayed (in their original order, alphabetically sorted by the hook). Priority: must.
- AC-39.4: Given the search field has text and matches no topics, when viewing the list, then the empty state message (`common.noResults`) is displayed. Priority: must.
- AC-39.5: Given the search field, when rendered, then it uses the same styling as the Members screen search input (height: 40, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 15). Priority: should.
- AC-39.6: Given the search filters the Ward Topics only, when the Collections section is below, then the Collections section is NOT affected by the search filter (collections are always fully visible). Priority: must.
- AC-39.7: Given the search field uses `String.includes()` for matching, when the search text contains regex special characters (e.g., `(`, `.`, `*`), then they are treated as literal characters (no regex errors). Priority: must.

### Edge Cases

- EC-39.1: If the search text contains special regex characters (e.g., `.`, `*`, `(`), the filter uses `String.includes()` which treats them as literal characters -- no regex is used, so no crash.
- EC-39.2: The search state is local (`useState`) and resets when navigating away and returning to the screen, which is the expected behavior.
- EC-39.3: If the user is in the middle of editing a topic (inline editor visible) and types in the search field, the filtering should not affect the editing state. The `editingId` state is independent of the search filter.

### Files Impacted

| File | Change Type | Description |
|------|-------------|-------------|
| `src/app/(tabs)/settings/topics.tsx` | Modify | Add `search` state, `filteredTopics` memo, search `TextInput`, `searchInput` style; use `filteredTopics` in render |

### Files NOT Changed

| File | Reason |
|------|--------|
| `src/hooks/useTopics.ts` | No server-side search needed; client-side filtering is sufficient |
| `docs/SPEC.final.md` | No spec section exists for the Topics screen layout details; this is an additive UI enhancement |

---

## Assumptions

```yaml
assumptions:
  - id: A-CR39-1
    description: "Client-side filtering is sufficient for Ward Topics (topics are already fully loaded by useWardTopics hook)"
    confirmed: true
    default_if_not_confirmed: "Implement client-side filtering with String.includes()"

  - id: A-CR39-2
    description: "The search field should use the same i18n key as Members screen: common.search"
    confirmed: true
    default_if_not_confirmed: "Use t('common.search') as placeholder text"

  - id: A-CR39-3
    description: "The search field should be placed between the section header (Ward Topics title + add button) and the topic list"
    confirmed: true
    default_if_not_confirmed: "Place below section header, above first topic row"

  - id: A-CR39-4
    description: "The topics screen uses ScrollView, not FlatList, so useMemo for filtering is appropriate (no virtualization impact)"
    confirmed: true
    default_if_not_confirmed: "N/A -- verified from topics.tsx code"
```

---

## Open Questions

```yaml
open_questions: []
```

No open questions. The CR has a straightforward scope: add a search field with client-side filtering, matching the Members screen pattern.

---

## Definition of Done

- [ ] Search `TextInput` rendered above Ward Topics list in `topics.tsx`
- [ ] Typing in search field filters Ward Topics by title (case-insensitive `includes`)
- [ ] Empty search shows all Ward Topics
- [ ] No-match search shows empty state message
- [ ] Collections section is NOT filtered by the search
- [ ] Search input styling matches Members screen (height 40, borderWidth 1, borderRadius 8, paddingHorizontal 12, fontSize 15)
- [ ] Special characters in search text do not cause errors
- [ ] Existing topic CRUD operations work correctly with search active
