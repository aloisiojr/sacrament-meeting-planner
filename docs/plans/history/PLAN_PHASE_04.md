# PLAN_PHASE_04 - Agenda & Presentation

```yaml
type: plan
version: 1
phase: 4
title: "Agenda & Presentation Mode"

goal: "Implement the full agenda management tab (normal and special meeting forms with all field selectors) and the read-only Presentation Mode with accordion layout for live meeting use."

strategy:
  order: "Agenda hooks -> Agenda tab list -> Normal meeting form -> Special meeting form -> Speaker assignment from Agenda -> Presentation Mode data -> Accordion component -> Presentation Mode screen"
  commit_strategy: "1 commit per step, conventional commits"
  test_strategy: "Unit tests for form logic and hooks; integration tests for agenda-speech sync"
```

## Steps

```yaml
steps:
  - id: STEP-04-01
    description: "Create useAgenda hook: query agenda by sunday date, lazy create agenda, update agenda fields. Auto-save on every field change. All fields nullable (nothing required)."
    files:
      - "src/hooks/useAgenda.ts"
    dependencies: ["STEP-01-02", "STEP-01-04"]
    parallelizable_with: []
    done_when:
      - "useAgenda(sundayDate) returns SundayAgenda or null"
      - "useLazyCreateAgenda() creates empty agenda record if not exists"
      - "useUpdateAgenda() updates any field, auto-save pattern"
      - "All fields nullable, no validation required"
      - "Cache invalidated on mutations"
      - "Lazy creation when sunday clicked in Agenda tab"
    tests:
      - type: unit
        description: "Test useAgenda: lazy creation, field updates, auto-save"
    covers:
      acceptance_criteria: ["AC-AGD-002"]
      edge_cases: []
    risks:
      - risk: "Race condition on lazy creation"
        mitigation: "Check if agenda exists before INSERT; use ON CONFLICT DO NOTHING"

  - id: STEP-04-02
    description: "Create Agenda tab with infinite scroll list of sundays. Exclude sundays with Gen Conf / Stake Conf / Other exceptions. Include Testimony Meeting, Ward Conference, Primary Presentation. 12 months past + 12 months future, +6 on scroll."
    files:
      - "src/app/(tabs)/agenda.tsx"
    dependencies: ["STEP-04-01", "STEP-03-01"]
    parallelizable_with: []
    done_when:
      - "Agenda tab renders infinite scroll list of sundays"
      - "Sundays with Gen Conf / Stake Conf / Other are EXCLUDED"
      - "Sundays with Testimony Meeting / Ward Conf / Primary Presentation are INCLUDED"
      - "12 months past + 12 months future, +6 on scroll"
      - "Click sunday -> lazy creation of agenda + opens form"
      - "Past agendas editable (no temporal restriction)"
    tests:
      - type: unit
        description: "Test Agenda tab: filtering logic, excluded vs included sundays, lazy creation"
    covers:
      acceptance_criteria: ["AC-AGD-001", "AC-AGD-018"]
      edge_cases: ["EC-AGD-004"]
    risks:
      - risk: "Filtering logic mismatch with exception types"
        mitigation: "Define explicit exclusion list; test all exception types"

  - id: STEP-04-03
    description: "Create AgendaForm for normal meetings (type 'Discursos'). 4 sections: (1) Welcome & Announcements, (2) Designations & Sacrament, (3) First & Second Speech, (4) Last Speech. All field selectors integrated. Auto-save on all changes. Observer: all fields disabled."
    files:
      - "src/components/AgendaForm.tsx"
    dependencies: ["STEP-04-01", "STEP-02-07", "STEP-02-10", "STEP-02-11"]
    parallelizable_with: []
    done_when:
      - "4 sections render for normal meetings"
      - "Section 1: presiding (actor), conducting (actor), recognize (multi-select actor), announcements (text), pianist (actor), conductor (actor), opening hymn (hymn selector), opening prayer (prayer selector)"
      - "Section 2: sustaining/releasing (text), baby blessing (toggle + names), baptism confirmation (toggle + names), stake announcements (toggle), sacrament hymn (sacramental-only hymn selector)"
      - "Section 3: 1st speech (from speeches), 2nd speech (from speeches), special presentation (toggle + description), intermediate hymn (visible ONLY if special=no)"
      - "Section 4: 3rd speech (from speeches), closing hymn, closing prayer"
      - "All changes auto-save"
      - "Observer: all fields disabled"
      - "No fields required"
    tests:
      - type: unit
        description: "Test AgendaForm: all 4 sections render, field interactions, auto-save, observer disabled"
    covers:
      acceptance_criteria: ["AC-AGD-003", "AC-AGD-015", "AC-AGD-016", "AC-AGD-017"]
      edge_cases: []
    risks:
      - risk: "Many fields in one form may cause performance issues"
        mitigation: "Use React.memo on sections; debounce auto-save"

  - id: STEP-04-04
    description: "Create AgendaForm for special meetings (Testimony Meeting, Ward Conference, Primary Presentation). 3 sections: Welcome, Designations, Special Meeting. Meeting type auto-filled and read-only. Speech and intermediate hymn fields hidden."
    files:
      - "src/components/AgendaForm.tsx"
    dependencies: ["STEP-04-03"]
    parallelizable_with: []
    done_when:
      - "3 sections render for special meetings"
      - "Section 1: same as normal Welcome"
      - "Section 2: same as normal Designations"
      - "Section 3: meeting type (auto from exception, read-only), closing hymn, closing prayer"
      - "Speech fields hidden in special layout"
      - "Intermediate hymn hidden in special layout"
      - "Data preserved if exception type changes back to normal"
    tests:
      - type: unit
        description: "Test special meeting form: 3 sections, type auto-fill, hidden fields, data preservation"
    covers:
      acceptance_criteria: ["AC-AGD-004"]
      edge_cases: ["EC-AGD-005", "EC-AGD-010"]
    risks:
      - risk: "Data loss when switching between normal and special"
        mitigation: "Keep all data in DB; hide/show fields based on type"

  - id: STEP-04-05
    description: "Implement speaker assignment from Agenda tab. Both Bishopric AND Secretary can assign speakers (permission exception). On assign: status = assigned_confirmed (bypasses invitation flow). Topic NOT visible/editable in Agenda tab. Syncs with Speeches tab."
    files:
      - "src/components/AgendaForm.tsx"
      - "src/hooks/useSpeeches.ts"
    dependencies: ["STEP-04-03", "STEP-03-02"]
    parallelizable_with: []
    done_when:
      - "Speaker fields in Agenda form: click opens MemberSelectorModal"
      - "Both Bishopric AND Secretary can assign (unlike Speeches tab)"
      - "On assign: speeches.status = assigned_confirmed (automatic)"
      - "Topic NOT visible in Agenda tab"
      - "Changes sync with Speeches tab (same TanStack Query keys)"
      - "1st Speech, 2nd Speech, 3rd Speech fields from speeches table"
    tests:
      - type: integration
        description: "Test Agenda speaker assignment: both roles, auto-confirmed status, sync with Speeches tab"
    covers:
      acceptance_criteria: ["AC-AGD-013", "AC-AGD-014"]
      edge_cases: ["EC-AGD-009"]
    risks:
      - risk: "Conflicting assignments from Speeches and Agenda tabs"
        mitigation: "Last-write-wins (ADR-008); same data source via JOIN"

  - id: STEP-04-06
    description: "Create usePresentationMode hook and PresentationData types. Load agenda + speeches for today's sunday. Determine meeting type (normal vs special). Check if today is Sunday for button visibility."
    files:
      - "src/hooks/usePresentationMode.ts"
    dependencies: ["STEP-04-01", "STEP-03-01"]
    parallelizable_with: ["STEP-04-05"]
    done_when:
      - "usePresentationData(sundayDate) returns full agenda + speeches"
      - "isSunday() checks if today is Sunday (00:00-23:59)"
      - "Meeting type determined from sunday_exceptions table"
      - "Normal: 4 cards data. Special: 3 cards data"
      - "All data read-only"
    tests:
      - type: unit
        description: "Test usePresentationMode: sunday detection, data loading, meeting type determination"
    covers:
      acceptance_criteria: ["AC-AGD-019", "AC-AGD-020"]
      edge_cases: []
    risks:
      - risk: "Timezone affects Sunday detection"
        mitigation: "Use ward timezone for Sunday check"

  - id: STEP-04-07
    description: "Create AccordionCard component. Exactly 1 card expanded at a time. Collapsed cards before expanded: stacked at top. Collapsed cards after expanded: stacked at bottom. All collapsed cards ALWAYS visible. Expanded card has internal scroll if content exceeds space. Smooth animation on transitions."
    files:
      - "src/components/AccordionCard.tsx"
    dependencies: ["STEP-01-01"]
    parallelizable_with: ["STEP-04-01", "STEP-04-06"]
    done_when:
      - "AccordionCard: receives array of card configs"
      - "1 card expanded at a time"
      - "Collapsed cards pinned: above expanded at top, below expanded at bottom"
      - "All collapsed cards always visible (never leave screen)"
      - "Expanded card fills space between collapsed groups"
      - "Internal scroll if content exceeds available space"
      - "Click collapsed -> smooth animation: previous collapses, clicked expands"
      - "Uses react-native-reanimated for animations"
    tests:
      - type: unit
        description: "Test AccordionCard: single expansion, pinned cards, scroll, animations"
    covers:
      acceptance_criteria: ["AC-AGD-024", "AC-AGD-025"]
      edge_cases: []
    risks:
      - risk: "Complex layout calculation for pinned cards"
        mitigation: "Use Animated.View with absolute positioning; measure collapsed card heights"

  - id: STEP-04-08
    description: "Create PresentationMode screen (full-screen modal). Normal meeting: 4 accordion cards (Welcome, Designations, Speeches 1+2, Last Speech). Special meeting: 3 cards. Starts with Welcome expanded. All fields read-only. Close button in header."
    files:
      - "src/app/presentation.tsx"
    dependencies: ["STEP-04-06", "STEP-04-07"]
    parallelizable_with: []
    done_when:
      - "PresentationMode opens as full-screen modal"
      - "Normal meeting: 4 cards with correct content per section"
      - "Special meeting: 3 cards with correct content"
      - "Welcome section expanded by default"
      - "All fields read-only (no editing)"
      - "Hymns show: 'Number -- Title'"
      - "Close button in header returns to Home"
      - "Smooth animations on card transitions"
    tests:
      - type: unit
        description: "Test PresentationMode: card count by type, read-only, welcome expanded, close navigation"
    covers:
      acceptance_criteria: ["AC-AGD-021", "AC-AGD-022", "AC-AGD-023", "AC-AGD-026"]
      edge_cases: ["EC-AGD-006"]
    risks:
      - risk: "Empty agenda fields create poor UX"
        mitigation: "Show placeholders for empty fields; don't block access"

  - id: STEP-04-09
    description: "Add 'Start Sacrament Meeting' button to Home tab. Visible only on Sundays (00:00-23:59) at top of Home. All 3 roles can see it. Opens PresentationMode."
    files:
      - "src/app/(tabs)/index.tsx"
    dependencies: ["STEP-04-08", "STEP-03-08"]
    parallelizable_with: []
    done_when:
      - "Button visible at top of Home tab on Sundays only"
      - "All roles can see the button"
      - "Click opens PresentationMode modal"
      - "Not visible on non-Sunday days"
      - "Button text translated (i18n)"
    tests:
      - type: unit
        description: "Test Presentation button: Sunday visibility, all roles, navigation to modal"
    covers:
      acceptance_criteria: ["AC-AGD-019", "AC-AGD-020"]
      edge_cases: []
    risks:
      - risk: "Date check may use wrong timezone"
        mitigation: "Use ward timezone for Sunday check"

  - id: STEP-04-10
    description: "Implement language change behavior in Settings. Warning dialog before changing. On confirm: update ward language, deactivate previous language collections, make new language collections available (inactive by default). Ward Topics unaffected."
    files:
      - "src/app/(tabs)/settings/index.tsx"
    dependencies: ["STEP-01-09", "STEP-02-04"]
    parallelizable_with: ["STEP-04-01", "STEP-04-02"]
    done_when:
      - "Language selector shows 3 options (pt-BR, en, es)"
      - "Warning dialog before changing"
      - "On confirm: ward.language updated"
      - "Previous language General Collections deactivated"
      - "New language General Collections become available (inactive by default)"
      - "UI language changes immediately"
      - "Date formats adapt"
      - "Ward Topics unaffected"
      - "Future speeches with deactivated collection topics: snapshots preserved"
    tests:
      - type: integration
        description: "Test language change: collection deactivation, new availability, UI change, snapshot preservation"
    covers:
      acceptance_criteria: ["AC-019b"]
      edge_cases: ["EC-010"]
    risks:
      - risk: "Orphaned data after language change"
        mitigation: "Ward Topics and snapshots are language-independent; test data integrity"
```

## Validation

```yaml
validation:
  - ac_id: AC-AGD-001
    how_to_verify: "Agenda tab shows infinite scroll, excludes Gen Conf/Stake/Other"
    covered_by_steps: ["STEP-04-02"]
  - ac_id: AC-AGD-002
    how_to_verify: "Click sunday -> agenda created automatically"
    covered_by_steps: ["STEP-04-01"]
  - ac_id: AC-AGD-003
    how_to_verify: "Normal meeting: 4 sections visible"
    covered_by_steps: ["STEP-04-03"]
  - ac_id: AC-AGD-004
    how_to_verify: "Special meeting: 3 sections with auto-filled type"
    covered_by_steps: ["STEP-04-04"]
  - ac_id: AC-AGD-013
    how_to_verify: "Click speech field -> member selector -> assigns speaker"
    covered_by_steps: ["STEP-04-05"]
  - ac_id: AC-AGD-014
    how_to_verify: "Agenda assignment: status = assigned_confirmed, syncs with Speeches"
    covered_by_steps: ["STEP-04-05"]
  - ac_id: AC-AGD-015
    how_to_verify: "Special presentation toggle: description appears, hymn hidden"
    covered_by_steps: ["STEP-04-03"]
  - ac_id: AC-AGD-016
    how_to_verify: "Special presentation off: hymn appears, description hidden"
    covered_by_steps: ["STEP-04-03"]
  - ac_id: AC-AGD-017
    how_to_verify: "Observer: all fields read-only"
    covered_by_steps: ["STEP-04-03"]
  - ac_id: AC-AGD-018
    how_to_verify: "Past agendas editable"
    covered_by_steps: ["STEP-04-02"]
  - ac_id: AC-AGD-019
    how_to_verify: "Sunday -> button visible at top of Home"
    covered_by_steps: ["STEP-04-09"]
  - ac_id: AC-AGD-020
    how_to_verify: "Not Sunday -> button NOT visible"
    covered_by_steps: ["STEP-04-09"]
  - ac_id: AC-AGD-021
    how_to_verify: "Click Start Meeting -> full-screen, Welcome expanded"
    covered_by_steps: ["STEP-04-08"]
  - ac_id: AC-AGD-022
    how_to_verify: "Normal meeting: 4 accordion cards"
    covered_by_steps: ["STEP-04-08"]
  - ac_id: AC-AGD-023
    how_to_verify: "Special meeting: 3 accordion cards"
    covered_by_steps: ["STEP-04-08"]
  - ac_id: AC-AGD-024
    how_to_verify: "Click collapsed -> expands, previous collapses"
    covered_by_steps: ["STEP-04-07"]
  - ac_id: AC-AGD-025
    how_to_verify: "Expanded card has internal scroll; collapsed always visible"
    covered_by_steps: ["STEP-04-07"]
  - ac_id: AC-AGD-026
    how_to_verify: "All fields in Presentation Mode read-only"
    covered_by_steps: ["STEP-04-08"]
  - ac_id: AC-019b
    how_to_verify: "Language change: collections deactivated, interface changes"
    covered_by_steps: ["STEP-04-10"]
```
