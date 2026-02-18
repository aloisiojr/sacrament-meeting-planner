# PLAN_PHASE_02 - Core Data

```yaml
type: plan
version: 1
phase: 2
title: "Core Data (Members, Topics, Collections, Sunday Types, Actors, Hymns, Prayers)"

goal: "Implement all ward-scoped master data management: CRUD for members, topics, actors; general collections management; sunday type auto-assignment and exceptions; hymn catalog; prayer selection -- the data layer that Speech and Agenda modules depend on."

strategy:
  order: "Members CRUD -> Topics CRUD -> General Collections -> Sunday Types -> Actors -> Hymns -> Prayers"
  commit_strategy: "1 commit per step, conventional commits"
  test_strategy: "Unit tests for hooks and utils; integration tests for mutations with RLS"
```

## Steps

```yaml
steps:
  - id: STEP-02-01
    description: "Create useMembers TanStack Query hook (list with search, create, update, delete). Implement search with real-time filter (<=300ms debounce, case-insensitive, accent-insensitive). All operations scoped by ward_id via RLS."
    files:
      - "src/hooks/useMembers.ts"
    dependencies: ["STEP-01-02", "STEP-01-04"]
    parallelizable_with: ["STEP-02-05", "STEP-02-09"]
    done_when:
      - "useMembers(search?) returns sorted member list (alphabetical by full_name)"
      - "useCreateMember() inserts member with ward_id from AuthContext"
      - "useUpdateMember() updates member fields"
      - "useDeleteMember() deletes member; handles future speeches check"
      - "Search: debounce <=300ms, case-insensitive, accent-insensitive"
      - "TanStack Query cache invalidation on mutations"
    tests:
      - type: unit
        description: "Test useMembers: CRUD operations, search filtering, cache invalidation"
    covers:
      acceptance_criteria: []
      edge_cases: []
    risks:
      - risk: "Accent-insensitive search may not work with all Unicode characters"
        mitigation: "Use normalize('NFD').replace for diacritics removal"

  - id: STEP-02-02
    description: "Create MemberManagementScreen with search field, alphabetically sorted listing, add member inline, edit with auto-save on blur, delete via swipe-to-reveal. Country code selector with emoji flags. No Save/Cancel buttons."
    files:
      - "src/app/(tabs)/settings/members.tsx"
      - "src/components/MemberCard.tsx"
    dependencies: ["STEP-02-01"]
    parallelizable_with: []
    done_when:
      - "Members listed alphabetically with search at top"
      - "'+' button opens inline new member card"
      - "Member card: Name (full width), Country Code (compact + emoji flag), Phone (full width)"
      - "Auto-save on blur (clicking outside) for both new and existing"
      - "Cancel dialog if Name or Phone empty on blur"
      - "Error dialog if edit clears Name or Phone (reverts to original)"
      - "Swipe-to-reveal: only 1 card revealed at a time"
      - "Swipe minimum horizontal threshold ~20px"
      - "Delete via swipe: confirmation dialog"
      - "Delete with future speeches: dialog shows count; on confirm snapshots preserved"
      - "Tap on card does NOT open editing (swipe only)"
      - "Observer: swipe disabled"
      - "Empty list: informative message"
      - "Country code dropdown: ~195 countries, sorted, emoji flags"
    tests:
      - type: unit
        description: "Test MemberManagementScreen: rendering, search, add, edit auto-save, delete with/without speeches"
    covers:
      acceptance_criteria: ["AC-001", "AC-002", "AC-003", "AC-004", "AC-005", "AC-006", "AC-007", "AC-008"]
      edge_cases: ["EC-001", "EC-005", "EC-CR013-1", "EC-CR014-1", "EC-CR014-2", "EC-015"]
    risks:
      - risk: "Swipe gesture conflicts with scroll"
        mitigation: "Use react-native-gesture-handler with horizontal threshold"

  - id: STEP-02-03
    description: "Create useTopics and useToggleCollection hooks. useWardTopics for ward-specific CRUD. useActiveTopics joins ward topics + active general collections. useToggleCollection toggles collection active/inactive."
    files:
      - "src/hooks/useTopics.ts"
    dependencies: ["STEP-01-02", "STEP-01-04"]
    parallelizable_with: ["STEP-02-01", "STEP-02-05", "STEP-02-09"]
    done_when:
      - "useWardTopics(search?) returns ward topics sorted alphabetically"
      - "useActiveTopics() returns ward topics + topics from active general collections"
      - "useCreateWardTopic() inserts topic with ward_id"
      - "useUpdateWardTopic() updates topic title/link"
      - "useDeleteWardTopic() deletes topic; handles future speeches check"
      - "useToggleCollection() updates ward_collection_config.active"
      - "Cache invalidated on all mutations"
    tests:
      - type: unit
        description: "Test useTopics: CRUD, active topics join, toggle collection"
    covers:
      acceptance_criteria: []
      edge_cases: []
    risks:
      - risk: "Active topics query complexity with multiple joins"
        mitigation: "Use Supabase .select() with foreign key joins"

  - id: STEP-02-04
    description: "Create TopicManagementScreen. Shows: Ward Topics (first, expandable), Active General collections, Inactive General collections. Ward Topics: inline CRUD with auto-save, swipe-to-reveal. General Collections: checkbox toggle. Filter by ward language."
    files:
      - "src/app/(tabs)/settings/topics.tsx"
      - "src/components/TopicCard.tsx"
    dependencies: ["STEP-02-03"]
    parallelizable_with: []
    done_when:
      - "Collections listed: (1) Ward Topics first, (2) Active Generals newest first, (3) Inactive Generals newest first"
      - "Ward Topics expandable: shows topic list"
      - "General Collections: checkbox only (not expandable)"
      - "Ward topic add: title (required) + link (optional), auto-save on blur"
      - "Ward topic edit: auto-save on blur, no Save/Cancel"
      - "Ward topic delete: swipe-to-reveal, confirmation"
      - "Topic with future speeches: dialog shows count, snapshots preserved"
      - "Toggle collection: activate -> topics available; deactivate with future speeches -> warning dialog"
      - "General Collections filtered by ward language"
      - "Add without title: error + cancel option"
    tests:
      - type: unit
        description: "Test TopicManagementScreen: collection ordering, CRUD, toggle with warnings"
    covers:
      acceptance_criteria: ["AC-012", "AC-013", "AC-014", "AC-015", "AC-016", "AC-017", "AC-044"]
      edge_cases: ["EC-009", "EC-010", "EC-012", "EC-013"]
    risks:
      - risk: "Collection ordering logic with multiple data sources"
        mitigation: "Sort in hook, not component; test ordering explicitly"

  - id: STEP-02-05
    description: "Create useSundayTypes hook with auto-assignment logic. Auto-assign types for sundays without entry: 'Discursos' default; 1st Sun Jan-Mar,May-Sep,Nov-Dec -> 'Testimony Meeting'; 1st Sun Apr/Oct -> 'General Conference'; 2nd Sun Apr/Oct -> 'Testimony Meeting'. Batch persist immediately."
    files:
      - "src/hooks/useSundayTypes.ts"
    dependencies: ["STEP-01-02", "STEP-01-04", "STEP-01-12"]
    parallelizable_with: ["STEP-02-01", "STEP-02-03", "STEP-02-09"]
    done_when:
      - "useSundayExceptions(dateRange) returns exceptions for date range"
      - "useAutoAssignSundayTypes() calculates and persists types for sundays without entries"
      - "useSetSundayType() updates or inserts exception for a specific date"
      - "Auto-assignment rules correctly implemented per F007 spec"
      - "Manual change persisted; auto-assignment does NOT reapply (entry exists)"
      - "Batch INSERT all missing entries immediately"
    tests:
      - type: unit
        description: "Test auto-assignment: default 'Discursos', testimony meetings, general conference months, manual override respected"
    covers:
      acceptance_criteria: ["AC-021"]
      edge_cases: ["EC-006", "EC-CR019-1"]
    risks:
      - risk: "Month/day calculation edge cases across year boundaries"
        mitigation: "Test with dates spanning December -> January"

  - id: STEP-02-06
    description: "Create SundayTypeManager component: dropdown in expanded SundayCard. Options: Discursos, Reuniao de Testemunho, Conferencia Geral, Conferencia de Estaca, Conferencia de Ala, Apresentacao Especial da Primaria, Outro (with custom reason dialog). Handle type changes with speech creation/deletion logic."
    files:
      - "src/components/SundayTypeDropdown.tsx"
    dependencies: ["STEP-02-05"]
    parallelizable_with: []
    done_when:
      - "Dropdown renders all 7 options (i18n translated)"
      - "Selecting 'Outro' opens dialog for custom reason + OK button"
      - "Selecting exception on sunday with speeches: confirms deletion dialog"
      - "Changing to 'Discursos' from exception: 3 empty speeches created immediately"
      - "Collapsed card shows exception text instead of LEDs"
      - "Observer: dropdown visible but disabled"
      - "Bishopric and Secretary can edit"
    tests:
      - type: unit
        description: "Test dropdown: option selection, speech creation/deletion on type change, custom reason, role-based disable"
    covers:
      acceptance_criteria: ["AC-020", "AC-022", "AC-022b", "AC-022c", "AC-022d"]
      edge_cases: ["EC-004", "EC-011"]
    risks:
      - risk: "Race condition between deleting speeches and creating new ones"
        mitigation: "Use transaction or sequential mutations"

  - id: STEP-02-07
    description: "Create useActors hook and ActorSelectorField component. CRUD for meeting actors with roles (Preside, Conduct, Recognize, Music). Inline add/edit/delete in selector modal. Enforce: can_conduct=true implies can_preside=true."
    files:
      - "src/hooks/useActors.ts"
      - "src/components/ActorSelectorField.tsx"
    dependencies: ["STEP-01-02", "STEP-01-04"]
    parallelizable_with: ["STEP-02-01", "STEP-02-03"]
    done_when:
      - "useActors(roleFilter?) returns actors filtered by role"
      - "useCreateActor() creates actor with name + role checkboxes"
      - "useUpdateActor() updates name/roles"
      - "useDeleteActor() deletes with confirmation; name preserved as snapshot in agendas"
      - "ActorSelectorField: opens selector filtered by required role"
      - "Selector shows: list, search, 'Add new actor', trash icon per actor"
      - "Add new: mini form with name + role checkboxes"
      - "can_conduct=true -> can_preside=true enforced"
      - "Multi-select for Recognize role"
    tests:
      - type: unit
        description: "Test actors: CRUD, role filtering, conduct implies preside, deletion snapshot"
    covers:
      acceptance_criteria: ["AC-AGD-005", "AC-AGD-006", "AC-AGD-007", "AC-AGD-008"]
      edge_cases: ["EC-AGD-001", "EC-AGD-007"]
    risks:
      - risk: "Role enforcement not synchronized between UI and DB"
        mitigation: "Enforce in hook mutation + DB check constraint"

  - id: STEP-02-08
    description: "Create MemberSelectorModal and TopicSelectorModal shared components. MemberSelectorModal: alphabetical list with search, accent-insensitive. TopicSelectorModal: topics from active collections, format 'Collection : Title', alphabetically sorted."
    files:
      - "src/components/MemberSelectorModal.tsx"
      - "src/components/TopicSelectorModal.tsx"
    dependencies: ["STEP-02-01", "STEP-02-03"]
    parallelizable_with: []
    done_when:
      - "MemberSelectorModal: sorted alphabetically, search (case-insensitive, accent-insensitive)"
      - "TopicSelectorModal: shows 'Collection : Title' format, sorted alphabetically by concatenated string"
      - "Both: modal overlay with close button"
      - "Both: selection callback returns selected item"
      - "TopicSelector shows only topics from active collections"
    tests:
      - type: unit
        description: "Test modals: rendering, search filtering, selection callback, topic format"
    covers:
      acceptance_criteria: []
      edge_cases: []
    risks:
      - risk: "Performance with large member/topic lists"
        mitigation: "Use FlatList with keyExtractor and memo"

  - id: STEP-02-09
    description: "Create admin script import-hymns.ts for CSV hymn import. Format: Lingua,Numero,Titulo,Sacramental(S/N). Upsert by (language, number). Validate CSV format with detailed error reporting."
    files:
      - "scripts/import-hymns.ts"
    dependencies: ["STEP-01-02"]
    parallelizable_with: ["STEP-02-01", "STEP-02-03", "STEP-02-05"]
    done_when:
      - "Script reads CSV file from argument"
      - "Validates format: 4 columns (Lingua, Numero, Titulo, Sacramental)"
      - "Invalid CSV: detailed error with line/field, no hymns imported"
      - "Valid CSV: upsert by (language, number)"
      - "Duplicate number in same language: updates title/sacramental"
      - "Displays summary: 'Imported X hymns for language Y'"
    tests:
      - type: unit
        description: "Test import-hymns: valid CSV parsed; invalid rejected with line info; upsert logic"
    covers:
      acceptance_criteria: ["AC-AGD-027", "AC-AGD-028", "AC-AGD-029"]
      edge_cases: ["EC-AGD-008"]
    risks:
      - risk: "CSV encoding issues (UTF-8 BOM)"
        mitigation: "Strip BOM if present; force UTF-8 parsing"

  - id: STEP-02-10
    description: "Create HymnSelectorField component. Search by number or title. Display format: 'Number -- Title'. Sacramental filter for sacrament hymn field (shows ONLY is_sacramental=true). Filter by ward language."
    files:
      - "src/components/HymnSelectorField.tsx"
    dependencies: ["STEP-02-09"]
    parallelizable_with: []
    done_when:
      - "HymnSelectorField: opens selector with search"
      - "Search by number (e.g. '123') or title (e.g. 'Conta as')"
      - "Display format: 'Number -- Title' (e.g. '123 -- Conta as Bencaos')"
      - "Sorted by number"
      - "Sacramental prop: when true, shows ONLY hymns with is_sacramental=true"
      - "Filtered by ward language from AuthContext"
      - "Stored as FK in agenda (not snapshot)"
    tests:
      - type: unit
        description: "Test HymnSelectorField: search by number and title, sacramental filter, display format"
    covers:
      acceptance_criteria: ["AC-AGD-009", "AC-AGD-010"]
      edge_cases: ["EC-AGD-003"]
    risks:
      - risk: "Large hymn list performance (~300 per language)"
        mitigation: "FlatList with initialNumToRender; search debounce"

  - id: STEP-02-11
    description: "Create PrayerSelectorField component. Shows member list (alphabetical, searchable) + 'Different name' option for custom text. Member: stores snapshot name + FK. Custom: stores name only (no FK)."
    files:
      - "src/components/PrayerSelectorField.tsx"
    dependencies: ["STEP-02-01"]
    parallelizable_with: ["STEP-02-10"]
    done_when:
      - "PrayerSelectorField: opens selector with ward members sorted alphabetically"
      - "Search field: case-insensitive, accent-insensitive"
      - "'Different name' field at end of list"
      - "Member selection: stores member_id FK + name as snapshot"
      - "Custom name: stores only name text (FK = null)"
      - "NOT persisted in members or actors table"
    tests:
      - type: unit
        description: "Test PrayerSelectorField: member selection, custom name, data storage pattern"
    covers:
      acceptance_criteria: ["AC-AGD-011", "AC-AGD-012"]
      edge_cases: ["EC-AGD-002"]
    risks:
      - risk: "Confusion between member reference and custom name"
        mitigation: "Clear UI distinction; test both paths"

  - id: STEP-02-12
    description: "Create admin script import-general-collections.ts for CSV import. Format: Idioma,Colecao,Titulo,Link. Creates collections per language (if not existing), creates topics within collections. Display import summary."
    files:
      - "scripts/import-general-collections.ts"
    dependencies: ["STEP-01-02"]
    parallelizable_with: ["STEP-02-09"]
    done_when:
      - "Script reads CSV file from argument"
      - "Format: Idioma, Colecao, Titulo, Link"
      - "Creates general_collections per language if not existing"
      - "Creates general_topics within collections"
      - "Collections appear automatically for wards of same language (inactive by default)"
      - "Displays summary: 'Imported N collections (pt-BR: X, en: Y), Z topics'"
      - "General Collections are NOT editable by users"
    tests:
      - type: unit
        description: "Test import-general-collections: valid CSV, collection creation, topic creation, summary"
    covers:
      acceptance_criteria: ["AC-012"]
      edge_cases: []
    risks:
      - risk: "Duplicate collection names across imports"
        mitigation: "Upsert by (name, language)"
```

## Validation

```yaml
validation:
  - ac_id: AC-001
    how_to_verify: "Settings > Members shows search and alphabetically sorted listing"
    covered_by_steps: ["STEP-02-02"]
  - ac_id: AC-002
    how_to_verify: "Search filters real-time (<=300ms), case-insensitive, accent-insensitive"
    covered_by_steps: ["STEP-02-02"]
  - ac_id: AC-003
    how_to_verify: "Add member: save on click outside with phone format"
    covered_by_steps: ["STEP-02-02"]
  - ac_id: AC-004
    how_to_verify: "Empty Name or Phone on blur shows cancel dialog"
    covered_by_steps: ["STEP-02-02"]
  - ac_id: AC-005
    how_to_verify: "Edit member auto-saves on blur, no Save/Cancel"
    covered_by_steps: ["STEP-02-02"]
  - ac_id: AC-006
    how_to_verify: "Empty Name/Phone on edit: error, reverts"
    covered_by_steps: ["STEP-02-02"]
  - ac_id: AC-007
    how_to_verify: "Delete member with future speeches: dialog + snapshots"
    covered_by_steps: ["STEP-02-02"]
  - ac_id: AC-008
    how_to_verify: "Delete member without speeches: simple confirmation"
    covered_by_steps: ["STEP-02-02"]
  - ac_id: AC-012
    how_to_verify: "Topics section: Ward Topics first, active Generals, inactive Generals"
    covered_by_steps: ["STEP-02-04"]
  - ac_id: AC-013
    how_to_verify: "Activate general collection: topics available"
    covered_by_steps: ["STEP-02-04"]
  - ac_id: AC-014
    how_to_verify: "Deactivate collection with future speeches: warning dialog"
    covered_by_steps: ["STEP-02-04"]
  - ac_id: AC-015
    how_to_verify: "Ward topic auto-save on blur"
    covered_by_steps: ["STEP-02-04"]
  - ac_id: AC-016
    how_to_verify: "Ward topic edit auto-saves"
    covered_by_steps: ["STEP-02-04"]
  - ac_id: AC-017
    how_to_verify: "Ward topic delete via swipe, snapshots preserved"
    covered_by_steps: ["STEP-02-04"]
  - ac_id: AC-044
    how_to_verify: "Topic in future speeches: dialog shows count"
    covered_by_steps: ["STEP-02-04"]
  - ac_id: AC-020
    how_to_verify: "Sunday type dropdown changes type and persists"
    covered_by_steps: ["STEP-02-06"]
  - ac_id: AC-021
    how_to_verify: "Auto-assignment runs on list load with correct rules"
    covered_by_steps: ["STEP-02-05"]
  - ac_id: AC-022
    how_to_verify: "Changing to 'Speeches' creates 3 empty speeches"
    covered_by_steps: ["STEP-02-06"]
  - ac_id: AC-022b
    how_to_verify: "Exception on sunday with speeches: deletion dialog"
    covered_by_steps: ["STEP-02-06"]
  - ac_id: AC-022c
    how_to_verify: "Selecting 'Outro' opens custom reason dialog"
    covered_by_steps: ["STEP-02-06"]
  - ac_id: AC-022d
    how_to_verify: "Observer sees dropdown disabled"
    covered_by_steps: ["STEP-02-06"]
  - ac_id: AC-AGD-005
    how_to_verify: "Actor selector filtered by role with add/delete"
    covered_by_steps: ["STEP-02-07"]
  - ac_id: AC-AGD-006
    how_to_verify: "Add actor inline: created and selected"
    covered_by_steps: ["STEP-02-07"]
  - ac_id: AC-AGD-007
    how_to_verify: "Delete actor: snapshot preserved in agendas"
    covered_by_steps: ["STEP-02-07"]
  - ac_id: AC-AGD-008
    how_to_verify: "Recognize: multi-select actors"
    covered_by_steps: ["STEP-02-07"]
  - ac_id: AC-AGD-009
    how_to_verify: "Hymn selector: search by number or title"
    covered_by_steps: ["STEP-02-10"]
  - ac_id: AC-AGD-010
    how_to_verify: "Sacrament hymn: only sacramental hymns shown"
    covered_by_steps: ["STEP-02-10"]
  - ac_id: AC-AGD-011
    how_to_verify: "Prayer selector: member list + custom name"
    covered_by_steps: ["STEP-02-11"]
  - ac_id: AC-AGD-012
    how_to_verify: "Custom prayer name: saved in agenda only"
    covered_by_steps: ["STEP-02-11"]
  - ac_id: AC-AGD-027
    how_to_verify: "import-hymns: valid CSV imports hymns"
    covered_by_steps: ["STEP-02-09"]
  - ac_id: AC-AGD-028
    how_to_verify: "import-hymns: invalid CSV shows error"
    covered_by_steps: ["STEP-02-09"]
  - ac_id: AC-AGD-029
    how_to_verify: "import-hymns: existing language -> upsert"
    covered_by_steps: ["STEP-02-09"]
```
