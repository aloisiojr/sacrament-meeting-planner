# PLAN_PHASE_03 - Speech Lifecycle

```yaml
type: plan
version: 1
phase: 3
title: "Speech Lifecycle (Speech CRUD, Home tab, WhatsApp Integration)"

goal: "Implement the full speech management lifecycle: infinite scroll list of sundays with speeches, speaker/topic assignment, status tracking with 3D LEDs, WhatsApp invitation flow, and the Home tab with role-aware sections."

strategy:
  order: "Speech hooks -> SundayCard + SpeechSlot -> LED component -> Status modal -> Speeches tab -> Home tab sections -> WhatsApp integration"
  commit_strategy: "1 commit per step, conventional commits"
  test_strategy: "Unit tests for hooks and components; integration tests for status lifecycle"
```

## Steps

```yaml
steps:
  - id: STEP-03-01
    description: "Create useSpeeches and useSundayList hooks. useSpeeches: query speeches by date range with TanStack Query. useSundayList: manage infinite scroll (12 months past + 12 months future, +6 on scroll). useLazyCreateSpeeches: create 3 speech records when card first expanded."
    files:
      - "src/hooks/useSpeeches.ts"
      - "src/hooks/useSundayList.ts"
    dependencies: ["STEP-02-05"]
    parallelizable_with: []
    done_when:
      - "useSpeeches(dateRange) returns speeches grouped by sunday date"
      - "useSundayList(): sundays array, loadMoreFuture(), loadMorePast(), hasMore flags"
      - "Initial window: 12 months past + 12 months future"
      - "Scroll extend: +6 months in each direction"
      - "useLazyCreateSpeeches(date): creates 3 records (position 1,2,3) with status not_assigned"
      - "Lazy creation only if records don't exist for that sunday"
      - "All mutations invalidate cache"
    tests:
      - type: unit
        description: "Test speech hooks: date range queries, lazy creation, infinite scroll boundaries"
    covers:
      acceptance_criteria: ["AC-023"]
      edge_cases: ["EC-CR010-1"]
    risks:
      - risk: "Performance with 24+ months of data"
        mitigation: "Query only visible range; use TanStack Query pagination"

  - id: STEP-03-02
    description: "Create useAssignSpeaker, useAssignTopic, useChangeStatus, useRemoveAssignment mutation hooks. Implement snapshot pattern: store speaker_name, speaker_phone, topic_title, topic_link, topic_collection as text alongside FKs."
    files:
      - "src/hooks/useSpeeches.ts"
    dependencies: ["STEP-03-01"]
    parallelizable_with: []
    done_when:
      - "useAssignSpeaker(): sets member_id + snapshot fields + status = assigned_not_invited"
      - "useAssignTopic(): sets topic_title, topic_link, topic_collection (all snapshots)"
      - "useChangeStatus(): transitions status per lifecycle rules"
      - "useRemoveAssignment(): resets speaker fields + status = not_assigned, topic remains"
      - "All mutations respect snapshot pattern (ADR-003)"
      - "Bishopric-only: assign/unassign speaker"
      - "Bishopric + Secretary: change status"
      - "Permission checks in hooks"
    tests:
      - type: unit
        description: "Test mutations: snapshot storage, status transitions, permission enforcement"
    covers:
      acceptance_criteria: []
      edge_cases: ["EC-003"]
    risks:
      - risk: "Snapshot data diverges from source"
        mitigation: "Snapshots are intentional by design (ADR-003); test that edits don't propagate"

  - id: STEP-03-03
    description: "Create LEDIndicator component: 3D animated LED showing speech status color. Colors: off (not_assigned), yellow (assigned_not_invited), blue (assigned_invited), green (assigned_confirmed), red (gave_up). Pressable to open status menu. Maintain visibility in both dark and light mode."
    files:
      - "src/components/LEDIndicator.tsx"
    dependencies: ["STEP-01-10"]
    parallelizable_with: ["STEP-03-01", "STEP-03-02"]
    done_when:
      - "LED renders as 3D circle with glow effect"
      - "5 states with distinct colors: off, yellow, blue, green, red"
      - "Pressable: calls onPress callback"
      - "Visible in both dark and light modes"
      - "Smooth animation on color change via react-native-reanimated"
      - "3 LEDs render side by side in SundayCard header"
    tests:
      - type: unit
        description: "Test LEDIndicator: renders correct color per status; pressable; visible in both themes"
    covers:
      acceptance_criteria: []
      edge_cases: []
    risks:
      - risk: "3D effect performance on low-end devices"
        mitigation: "Use simple shadow/gradient; test on older devices"

  - id: STEP-03-04
    description: "Create StatusChangeModal component. Shows status options based on current state. LED or status text click opens modal. Status lifecycle: not_assigned -> assigned_not_invited -> assigned_invited -> assigned_confirmed | gave_up."
    files:
      - "src/components/StatusChangeModal.tsx"
    dependencies: ["STEP-03-02", "STEP-03-03"]
    parallelizable_with: []
    done_when:
      - "Modal opens when LED or status text clicked"
      - "Shows available transitions based on current status"
      - "On select: status updated, LED changes color"
      - "Bishopric and Secretary can change status"
      - "Observer: LED not pressable"
      - "Status names translated (i18n)"
    tests:
      - type: unit
        description: "Test StatusChangeModal: transitions per lifecycle, role-based access, i18n"
    covers:
      acceptance_criteria: ["AC-026"]
      edge_cases: []
    risks:
      - risk: "Invalid status transitions"
        mitigation: "Validate transitions in hook; test all paths"

  - id: STEP-03-05
    description: "Create DateBlock component (zero-padded day, 3-letter month abbreviation, year). Create SundayCard with expandable header (DateBlock + 3 LEDs), sunday type dropdown at top of expanded area, and 3 SpeechSlot children. Past sundays: reduced opacity when collapsed. Next sunday: primary border."
    files:
      - "src/components/DateBlock.tsx"
      - "src/components/SundayCard.tsx"
    dependencies: ["STEP-03-03", "STEP-02-06"]
    parallelizable_with: []
    done_when:
      - "DateBlock: day zero-padded, month 3-letter (i18n), year"
      - "SundayCard collapsed: DateBlock left, 3 LEDs right"
      - "SundayCard expanded: header fixed position, content below"
      - "Exception sundays: show reason text instead of LEDs (collapsed)"
      - "Past sundays: reduced opacity when collapsed"
      - "Next sunday: primary border highlighted"
      - "Year separators intercalated in list"
      - "Expand: smooth scroll to fully visible"
      - "Sunday type dropdown at top of expanded area"
      - "Lazy creation of speeches on first expand"
    tests:
      - type: unit
        description: "Test SundayCard: collapsed/expanded states, exception display, opacity, border highlight"
    covers:
      acceptance_criteria: ["AC-023"]
      edge_cases: []
    risks:
      - risk: "Scroll performance with many cards"
        mitigation: "Use FlatList with windowSize optimization"

  - id: STEP-03-06
    description: "Create SpeechSlot component within SundayCard. Speaker field with dropdown arrow, topic field with dropdown arrow, LED indicator, remove (X) button. Labels: '1o Discurso', '2o Discurso', '3o Discurso'. Clicking speaker/topic opens respective selector modals. Bishopric can assign/unassign; Secretary can change status only; Observer read-only."
    files:
      - "src/components/SpeechSlot.tsx"
    dependencies: ["STEP-03-05", "STEP-03-04", "STEP-02-08"]
    parallelizable_with: []
    done_when:
      - "3 slots per SundayCard: 1o, 2o, 3o Discurso (Unicode U+00BA)"
      - "Speaker field: dropdown arrow, shows name when assigned"
      - "Topic field: dropdown arrow, shows 'Collection : Title' when assigned"
      - "LED indicator: clickable for status change"
      - "Remove (X) button: confirmation dialog, resets to not_assigned, topic remains"
      - "Bishopric: can assign/unassign speaker, assign topic, change status"
      - "Secretary: cannot assign, can change status"
      - "Observer: read-only, no interactions"
      - "On assign speaker: status -> assigned_not_invited"
    tests:
      - type: unit
        description: "Test SpeechSlot: assignment flow, removal, status change, role-based UI"
    covers:
      acceptance_criteria: ["AC-024", "AC-025", "AC-027"]
      edge_cases: []
    risks:
      - risk: "Complex interaction between speaker/topic/status fields"
        mitigation: "Clear state management in hook; test each interaction independently"

  - id: STEP-03-07
    description: "Create Speeches tab (full screen) with infinite scroll. Render SundayCards from 12 months past to 12 months future. Next sunday scrolled to top on initial render (no animation). +6 months on scroll ends. Year separators. Smooth loading without list disappearing."
    files:
      - "src/app/(tabs)/speeches.tsx"
    dependencies: ["STEP-03-06"]
    parallelizable_with: []
    done_when:
      - "Speeches tab renders infinite scroll list of SundayCards"
      - "Initial: 12 months past + 12 months future"
      - "Next sunday at top on initial render, no scroll animation"
      - "Scroll to end: +6 months future loaded smoothly"
      - "Scroll to start: +6 months past loaded smoothly"
      - "Year separators between years"
      - "Loading state: skeleton placeholders"
      - "Data preserved on scroll (no disappearing)"
      - "Auto-assignment runs on list load and on scroll extend"
    tests:
      - type: unit
        description: "Test Speeches tab: initial positioning, infinite scroll both directions, data persistence"
    covers:
      acceptance_criteria: ["AC-023", "AC-028", "AC-029"]
      edge_cases: ["EC-CR011-1", "EC-CR011-2"]
    risks:
      - risk: "Scroll position jumps when loading more data"
        mitigation: "Use onEndReached with proper threshold; maintain scroll position on prepend"

  - id: STEP-03-08
    description: "Create Home tab NextSundaysSection: 3 collapsed cards (all roles). DateBlock left, 3D LEDs right. Expandable with speech slots. Sundays with exceptions show reason text. Card header fixed on expand. Auto-scroll for visibility."
    files:
      - "src/app/(tabs)/index.tsx"
      - "src/components/NextSundaysSection.tsx"
    dependencies: ["STEP-03-06"]
    parallelizable_with: []
    done_when:
      - "Home tab shows 'Next 3 Sundays' section for all roles"
      - "3 cards: DateBlock left, 3 LEDs right"
      - "Exceptions show reason text instead of LEDs"
      - "Expandable: content below fixed header"
      - "Sunday type dropdown at top of expanded area"
      - "Bishopric: assign speakers/topics + change status"
      - "Secretary: change status only"
      - "Observer: view only"
      - "Auto-scroll on expand for visibility"
    tests:
      - type: unit
        description: "Test NextSundaysSection: 3 cards rendered, role-based interactions, exception display"
    covers:
      acceptance_criteria: ["AC-031", "AC-032", "AC-033", "AC-034"]
      edge_cases: []
    risks:
      - risk: "Home tab data not synced with Speeches tab"
        mitigation: "Same TanStack Query keys; same cache"

  - id: STEP-03-09
    description: "Create Home tab NextAssignmentsSection (Bishopric only). Shows when all 9 speeches of next 3 sundays are assigned. Displays next sunday with pending assignments. Disappears when no more pending."
    files:
      - "src/components/NextAssignmentsSection.tsx"
    dependencies: ["STEP-03-08"]
    parallelizable_with: []
    done_when:
      - "Section visible only for Bishopric"
      - "Appears when all 9 speeches of next 3 sundays have speaker+topic+status != not_assigned/gave_up"
      - "Shows 4th sunday or first after next 3 with pending speeches"
      - "Expandable card with assignment capabilities"
      - "Disappears when no more pending assignments"
    tests:
      - type: unit
        description: "Test NextAssignmentsSection: visibility logic, role check, pending detection"
    covers:
      acceptance_criteria: ["AC-035", "AC-036"]
      edge_cases: []
    risks:
      - risk: "Complex condition for showing section"
        mitigation: "Extract visibility logic to pure function; test thoroughly"

  - id: STEP-03-10
    description: "Create Home tab InviteManagementSection (Secretary only). List speeches with status 'assigned_not_invited' and 'assigned_invited', sorted by date. Each item: compact date, speech number, action button."
    files:
      - "src/components/InviteManagementSection.tsx"
    dependencies: ["STEP-03-08"]
    parallelizable_with: ["STEP-03-09"]
    done_when:
      - "Section visible only for Secretary"
      - "Lists speeches with status assigned_not_invited or assigned_invited"
      - "Sorted by date (closest first)"
      - "Each item: compact date ('18 FEB'), speech number, action button"
      - "Not-Invited: action opens WhatsApp"
      - "Invited: action opens 3-option selector"
      - "Bishopric and Observer do NOT see this section"
    tests:
      - type: unit
        description: "Test InviteManagementSection: list filtering, sorting, role visibility"
    covers:
      acceptance_criteria: ["AC-037"]
      edge_cases: []
    risks:
      - risk: "Status changes from other tabs not reflected"
        mitigation: "Shared TanStack Query cache ensures consistency"

  - id: STEP-03-11
    description: "Create WhatsApp integration (lib/whatsapp.ts). Build wa.me URL from template + variables. Handle Not-Invited (open WhatsApp, status -> Invited) and Invited (3 options: WhatsApp, Confirmed, Gave Up). Confirmed/Gave Up: removed from list after 3 seconds."
    files:
      - "src/lib/whatsapp.ts"
    dependencies: ["STEP-03-10"]
    parallelizable_with: []
    done_when:
      - "buildWhatsAppUrl(): generates wa.me/{phone}?text={encoded_message}"
      - "Template placeholders resolved: {nome}, {data}, {posicao}, {duracao}, {colecao}, {titulo}, {link}"
      - "Not-Invited click: opens WhatsApp, status -> assigned_invited"
      - "Invited click: 3-option selector"
      - "Option 1: Go to WhatsApp (opens wa.me with same template)"
      - "Option 2: Mark Confirmed (status -> assigned_confirmed, removed after 3s)"
      - "Option 3: Mark Gave Up (status -> gave_up, removed after 3s)"
      - "Bishopric can set status to assigned_invited directly (F008 status change)"
    tests:
      - type: unit
        description: "Test WhatsApp: URL building, placeholder resolution, status transitions, 3-second delay"
    covers:
      acceptance_criteria: ["AC-038", "AC-039"]
      edge_cases: []
    risks:
      - risk: "WhatsApp not installed on device"
        mitigation: "Handle Linking.openURL error gracefully; show toast"
```

## Validation

```yaml
validation:
  - ac_id: AC-023
    how_to_verify: "Speeches tab shows sundays from 12 months past to 12 future; next sunday on top; DateBlock + 3 LEDs"
    covered_by_steps: ["STEP-03-01", "STEP-03-05", "STEP-03-07"]
  - ac_id: AC-024
    how_to_verify: "Bishopric clicks Speaker -> modal -> select -> name shown, LED yellow"
    covered_by_steps: ["STEP-03-06"]
  - ac_id: AC-025
    how_to_verify: "Bishopric clicks Topic -> modal -> topics from active collections in 'Collection : Title' format"
    covered_by_steps: ["STEP-03-06"]
  - ac_id: AC-026
    how_to_verify: "Click LED or status text -> modal with status options -> LED changes"
    covered_by_steps: ["STEP-03-04"]
  - ac_id: AC-027
    how_to_verify: "Click X + confirm -> speaker removed, LED off, topic remains"
    covered_by_steps: ["STEP-03-06"]
  - ac_id: AC-028
    how_to_verify: "Scroll to end -> +6 months future loaded without disappearing"
    covered_by_steps: ["STEP-03-07"]
  - ac_id: AC-029
    how_to_verify: "Scroll to start -> +6 months past loaded without disappearing"
    covered_by_steps: ["STEP-03-07"]
  - ac_id: AC-030
    how_to_verify: "Change in any tab reflected in another within 5 seconds"
    covered_by_steps: ["STEP-03-08"]
  - ac_id: AC-031
    how_to_verify: "Home shows next 3 sundays with DateBlock and LEDs"
    covered_by_steps: ["STEP-03-08"]
  - ac_id: AC-032
    how_to_verify: "Bishopric can assign from Home"
    covered_by_steps: ["STEP-03-08"]
  - ac_id: AC-033
    how_to_verify: "Secretary can only change status from Home"
    covered_by_steps: ["STEP-03-08"]
  - ac_id: AC-034
    how_to_verify: "Observer: view only from Home"
    covered_by_steps: ["STEP-03-08"]
  - ac_id: AC-035
    how_to_verify: "Bishopric sees next assignments section when all 9 assigned"
    covered_by_steps: ["STEP-03-09"]
  - ac_id: AC-036
    how_to_verify: "Section disappears when all resolved"
    covered_by_steps: ["STEP-03-09"]
  - ac_id: AC-037
    how_to_verify: "Secretary sees invite management with Not-Invited and Invited items"
    covered_by_steps: ["STEP-03-10"]
  - ac_id: AC-038
    how_to_verify: "Not-Invited action: opens WhatsApp, status -> Invited"
    covered_by_steps: ["STEP-03-11"]
  - ac_id: AC-039
    how_to_verify: "Invited action: 3 options (WhatsApp, Confirmed, Gave Up)"
    covered_by_steps: ["STEP-03-11"]
```
