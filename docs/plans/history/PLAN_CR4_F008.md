# PLAN_CR4_F008 - Agenda & Actors Enhancements

## PLAN_SUMMARY

```yaml
type: plan_summary
total_steps: 10
parallel_tracks: 3
estimated_commits: 10
coverage:
  acceptance_criteria: 24/24
  edge_cases: 13/13
critical_path:
  - "STEP-01: Remove auto-preside rule (CR-71)"
  - "STEP-04: Recognizing field uses ActorSelector (CR-73)"
  - "STEP-05: Custom prayer names in MemberSelectorModal (CR-74)"
  - "STEP-08: Non-expandable cards for excluded sundays (CR-75)"
main_risks:
  - "CR-72: Auto-creating actors may produce duplicates if name collision is not handled properly"
  - "CR-74: PrayerSelector already supports custom names but AgendaForm uses MemberSelectorModal instead"
  - "CR-75: Removing the filter changes list size, which may break getItemLayout/scrollToIndex"
```

## PLAN

```yaml
type: plan
version: 1

goal: "Enhance agenda form and actor management: remove auto-preside rule, auto-add bishopric actors, recognizing uses ActorSelector, custom prayer names, non-expandable conference cards"

strategy:
  order: "Independent bug fix (CR-71) -> Server-side actor creation (CR-72) -> AgendaForm enhancements (CR-73, CR-74) -> Agenda list changes (CR-75) -> Tests"
  commit_strategy: "1 commit per step, conventional commit messages"
  test_strategy: "Tests alongside code; unit tests for hooks/utils, integration tests for form behavior"

steps:
  # =========================================================================
  # CR-71: Remove Auto-Preside Rule (2 steps)
  # =========================================================================
  - id: STEP-01
    description: "Remove enforceActorRules logic from useActors.ts: stop forcing can_preside=true when can_conduct=true"
    files:
      - "src/hooks/useActors.ts"
    dependencies: []
    parallelizable_with: ["STEP-03", "STEP-08"]
    done_when:
      - "enforceActorRules function body changed to simply return input unchanged (identity function) OR the function is removed and calls to it replaced with direct input usage"
      - "JSDoc comment at line 4 no longer mentions 'can_conduct=true implies can_preside=true'"
      - "useCreateActor JSDoc no longer mentions 'Enforces can_conduct -> can_preside rule'"
      - "useUpdateActor JSDoc no longer mentions 'Enforces can_conduct -> can_preside rule'"
      - "Creating an actor with can_conduct=true and can_preside=false saves correctly"
      - "Updating an actor's can_preside to false while can_conduct is true is accepted"
    tests:
      - type: unit
        description: "Test createActor with can_conduct=true, can_preside=false saves as-is"
      - type: unit
        description: "Test updateActor can set can_preside=false independently of can_conduct"
    covers:
      acceptance_criteria: ["AC-1", "AC-3", "AC-4"]
      edge_cases: ["EC-1"]
    risks:
      - risk: "Existing tests may assert enforceActorRules behavior"
        mitigation: "Update existing tests to reflect new independent behavior"

  - id: STEP-02
    description: "Fix ActorSelector.tsx handleAdd: stop setting can_preside=true when roleFilter is 'can_conduct'"
    files:
      - "src/components/ActorSelector.tsx"
    dependencies: ["STEP-01"]
    parallelizable_with: []
    done_when:
      - "In handleAdd (line 84-90), can_preside is ONLY set to true when roleFilter === 'can_preside'"
      - "The old logic `can_preside: roleFilter === 'can_preside' || roleFilter === 'can_conduct'` is changed to `can_preside: roleFilter === 'can_preside'`"
      - "Adding an actor from the conducting context does NOT auto-set can_preside"
    tests:
      - type: unit
        description: "Test handleAdd with roleFilter='can_conduct' creates actor with can_preside=false"
      - type: unit
        description: "Test handleAdd with roleFilter='can_preside' still creates actor with can_preside=true"
    covers:
      acceptance_criteria: ["AC-2"]
      edge_cases: ["EC-2"]
    risks: []

  # =========================================================================
  # CR-72: Auto-Add Bishopric Users as Actors (2 steps)
  # =========================================================================
  - id: STEP-03
    description: "Update create-invitation Edge Function to auto-create meeting_actor when role='bishopric'"
    files:
      - "supabase/functions/create-invitation/index.ts"
    dependencies: []
    parallelizable_with: ["STEP-01", "STEP-08"]
    done_when:
      - "After successful invitation insert, if input.role === 'bishopric', insert into meeting_actors"
      - "Actor name derived from email local part: extract part before @, replace dots/underscores with spaces, capitalize each word"
      - "Actor created with can_preside=true, can_conduct=true, can_recognize=false, can_music=false"
      - "Use ON CONFLICT DO NOTHING or check for existing actor with same name (case-insensitive) in the same ward"
      - "If actor with same name exists, update can_preside=true and can_conduct=true (upsert behavior)"
      - "Non-bishopric invitations (secretary, observer) do NOT trigger actor creation"
      - "Invitation creation still succeeds even if actor creation fails (actor creation is best-effort, not blocking)"
    tests:
      - type: unit
        description: "Test bishopric invitation creates actor with correct capabilities"
      - type: unit
        description: "Test secretary invitation does NOT create actor"
      - type: unit
        description: "Test duplicate name does not create duplicate actor"
      - type: unit
        description: "Test email local part to name conversion"
    covers:
      acceptance_criteria: ["AC-5", "AC-6", "AC-7", "AC-9"]
      edge_cases: ["EC-3", "EC-5", "EC-6"]
    risks:
      - risk: "Email local part may produce poor names (e.g., 'user123')"
        mitigation: "Best-effort conversion; actor can be renamed by users later. Log the email-to-name mapping."

  - id: STEP-04-pre
    description: "Update update-user-role Edge Function to auto-create actor when changing role TO bishopric"
    files:
      - "supabase/functions/update-user-role/index.ts"
    dependencies: ["STEP-03"]
    parallelizable_with: []
    done_when:
      - "After successfully updating user role to bishopric, insert meeting_actor with same logic as STEP-03"
      - "Actor name derived from targetUser email or metadata name"
      - "ON CONFLICT / upsert handles existing actors"
      - "If changing FROM bishopric to another role, do NOT delete the actor (per EC-4)"
    tests:
      - type: unit
        description: "Test role change to bishopric creates actor"
      - type: unit
        description: "Test role change from bishopric does not delete actor"
    covers:
      acceptance_criteria: ["AC-8"]
      edge_cases: ["EC-4"]
    risks:
      - risk: "update-user-role does not have the user's name, only email"
        mitigation: "Same email local part extraction as create-invitation"

  # =========================================================================
  # CR-73: Recognizing Field Uses ActorSelector (1 step)
  # =========================================================================
  - id: STEP-04
    description: "Replace Recognizing field DebouncedTextInput with ActorSelector in AgendaForm"
    files:
      - "src/components/AgendaForm.tsx"
    dependencies: []
    parallelizable_with: ["STEP-01", "STEP-03"]
    done_when:
      - "Lines 232-244 (DebouncedTextInput for Recognizing) replaced with a SelectorField that opens ActorSelector"
      - "SelectorField shows current recognized_names joined by comma (or placeholder)"
      - "Tapping opens ActorSelector with roleFilter='can_recognize'"
      - "On actor selection: recognized_names updated to include the selected actor name ([...current, actor.name])"
      - "A clear button or mechanism exists to reset recognized_names to null/empty"
      - "Old comma-separated values from before this change still display correctly"
      - "selectorModal state handles type 'actor' with field 'recognizing' and roleFilter 'can_recognize'"
    tests:
      - type: unit
        description: "Test Recognizing field opens ActorSelector (not DebouncedTextInput)"
      - type: unit
        description: "Test actor selection updates recognized_names array"
      - type: unit
        description: "Test existing comma-separated values display correctly"
    covers:
      acceptance_criteria: ["AC-10", "AC-11", "AC-12", "AC-13"]
      edge_cases: ["EC-7", "EC-8"]
    risks:
      - risk: "Old recognized_names data (free-text) may not match any actor names"
        mitigation: "Display old values as-is in the SelectorField. New selections from ActorSelector replace the array."

  # =========================================================================
  # CR-74: Custom Prayer Names (2 steps)
  # =========================================================================
  - id: STEP-05
    description: "Switch AgendaForm prayer fields from MemberSelectorModal to PrayerSelector component (which already supports custom names)"
    files:
      - "src/components/AgendaForm.tsx"
    dependencies: []
    parallelizable_with: ["STEP-01", "STEP-03", "STEP-04"]
    done_when:
      - "Opening prayer field (lines 505-516) uses PrayerSelector instead of MemberSelectorModal"
      - "Closing prayer field uses PrayerSelector instead of MemberSelectorModal"
      - "PrayerSelector.onSelect receives PrayerSelection with memberId and name"
      - "When PrayerSelection.memberId is not null: set prayer_name to selection.name and prayer_member_id to selection.memberId (member selected from list)"
      - "When PrayerSelection.memberId is null: set prayer_name to selection.name and prayer_member_id to null (custom name entered)"
      - "Custom prayer names are NOT persisted as new members in members table"
      - "Existing prayer names (member or custom) display correctly in the SelectorField"
      - "PrayerSelector 'selected' prop constructed from agenda's current prayer_name and prayer_member_id"
    tests:
      - type: unit
        description: "Test opening prayer uses PrayerSelector component"
      - type: unit
        description: "Test custom name selection sets member_id to null"
      - type: unit
        description: "Test member selection from list sets member_id correctly"
      - type: unit
        description: "Test existing custom name (member_id=null) displays in field"
    covers:
      acceptance_criteria: ["AC-14", "AC-15", "AC-16", "AC-17", "AC-18", "AC-19"]
      edge_cases: ["EC-9", "EC-10"]
    risks:
      - risk: "PrayerSelector component has hardcoded '(custom name)' hint text in English"
        mitigation: "Update PrayerSelector to use i18n key for the hint text (t('agenda.customName'))"

  - id: STEP-06
    description: "Update PrayerSelector custom name hint to use i18n and add i18n keys"
    files:
      - "src/components/PrayerSelector.tsx"
      - "src/i18n/locales/pt-BR.json"
      - "src/i18n/locales/en.json"
      - "src/i18n/locales/es.json"
    dependencies: ["STEP-05"]
    parallelizable_with: []
    done_when:
      - "PrayerSelector line 152 '(custom name)' replaced with t('agenda.customName')"
      - "i18n key agenda.customName added in all 3 languages: 'nome personalizado' (pt-BR), 'custom name' (en), 'nombre personalizado' (es)"
      - "Any other i18n keys needed for CR-73/CR-74/CR-75 added here"
    tests:
      - type: unit
        description: "Test PrayerSelector custom name hint uses i18n"
    covers:
      acceptance_criteria: ["AC-14"]
      edge_cases: []
    risks: []

  # =========================================================================
  # CR-75: Non-Expandable Cards for Excluded Sundays (2 steps)
  # =========================================================================
  - id: STEP-08
    description: "Remove filter for excluded sundays in agenda.tsx and make conference cards non-expandable"
    files:
      - "src/app/(tabs)/agenda.tsx"
    dependencies: []
    parallelizable_with: ["STEP-01", "STEP-03", "STEP-04"]
    done_when:
      - "Filter at lines 75-80 that calls isExcludedFromAgenda to exclude sundays is REMOVED"
      - "All sundays appear in filteredSundays, including gen_conf and stake_conf"
      - "AgendaSundayCard receives a new prop 'expandable' (boolean) defaulting to true"
      - "expandable is false when exception?.reason is in EXCLUDED_EXCEPTION_TYPES ('general_conference', 'stake_conference')"
      - "When expandable=false: chevron is NOT rendered, onPress does NOT call onToggle, no AgendaForm is rendered inside"
      - "Non-expandable cards still show the exception label in warning color (colors.warning) - this is existing behavior"
      - "Testimony meeting and normal sundays remain expandable (no regression)"
      - "Year separators render correctly before non-expandable cards"
    tests:
      - type: unit
        description: "Test general_conference sunday appears in list (not filtered out)"
      - type: unit
        description: "Test non-expandable card has no chevron"
      - type: unit
        description: "Test tapping non-expandable card does NOT trigger expansion"
      - type: unit
        description: "Test testimony meeting card remains expandable"
    covers:
      acceptance_criteria: ["AC-20", "AC-21", "AC-22", "AC-23", "AC-24"]
      edge_cases: ["EC-11", "EC-12"]
    risks:
      - risk: "List item count changes, getItemLayout offset calculations may be off"
        mitigation: "getItemLayout uses estimated height (64px) which is the same for all card types. scrollToIndex recalculates with new item count."

  - id: STEP-09
    description: "Fix scrollToIndex for next sunday after list size change from CR-75"
    files:
      - "src/app/(tabs)/agenda.tsx"
    dependencies: ["STEP-08"]
    parallelizable_with: []
    done_when:
      - "initialIndex calculation accounts for newly visible conference sundays in listItems"
      - "scrollToIndex still targets the correct next sunday date"
      - "onScrollToIndexFailed handler still works correctly with new list size"
      - "No visible scroll jump or misalignment when opening Agenda tab"
    tests:
      - type: unit
        description: "Test initialIndex targets correct next sunday with conference sundays in list"
      - type: unit
        description: "Test onScrollToIndexFailed handles new list size"
    covers:
      acceptance_criteria: ["AC-23"]
      edge_cases: ["EC-13"]
    risks:
      - risk: "Adding conference sundays changes index positions for all subsequent sundays"
        mitigation: "initialIndex is recalculated from listItems which now includes conference sundays. The findIndex logic is by date match, not by position."

  - id: STEP-10
    description: "Add comprehensive tests for all CR-71 through CR-75 changes"
    files:
      - "src/__tests__/cr004-f008-agenda-actors.test.ts"
    dependencies: ["STEP-02", "STEP-04-pre", "STEP-04", "STEP-06", "STEP-09"]
    parallelizable_with: []
    done_when:
      - "Tests cover: enforceActorRules removal, ActorSelector handleAdd, auto-actor on bishopric invite, Recognizing ActorSelector, PrayerSelector custom names, non-expandable conference cards, scroll index"
      - "All tests pass with vitest"
      - "No regressions in existing agenda, actor, or prayer tests"
    tests:
      - type: unit
        description: "enforceActorRules returns input unchanged"
      - type: unit
        description: "ActorSelector handleAdd with can_conduct does not set can_preside"
      - type: unit
        description: "create-invitation with bishopric role creates actor"
      - type: unit
        description: "update-user-role to bishopric creates actor"
      - type: unit
        description: "Recognizing field uses ActorSelector"
      - type: unit
        description: "PrayerSelector custom name sets member_id=null"
      - type: unit
        description: "Non-expandable cards for gen_conf/stake_conf"
      - type: unit
        description: "Expandable cards for testimony/speeches sundays"
      - type: integration
        description: "Scroll-to-next-sunday with conference sundays in list"
    covers:
      acceptance_criteria: ["AC-1", "AC-2", "AC-3", "AC-4", "AC-5", "AC-6", "AC-7", "AC-8", "AC-9", "AC-10", "AC-11", "AC-12", "AC-13", "AC-14", "AC-15", "AC-16", "AC-17", "AC-18", "AC-19", "AC-20", "AC-21", "AC-22", "AC-23", "AC-24"]
      edge_cases: ["EC-1", "EC-2", "EC-3", "EC-4", "EC-5", "EC-6", "EC-7", "EC-8", "EC-9", "EC-10", "EC-11", "EC-12", "EC-13"]
    risks: []

validation:
  # CR-71
  - ac_id: AC-1
    how_to_verify: "Create actor with can_conduct=true, can_preside=false -> saves correctly"
    covered_by_steps: ["STEP-01", "STEP-10"]
  - ac_id: AC-2
    how_to_verify: "Add actor from conducting context -> can_preside is NOT auto-set"
    covered_by_steps: ["STEP-02", "STEP-10"]
  - ac_id: AC-3
    how_to_verify: "Edit existing actor: set can_preside=false while can_conduct=true -> accepted"
    covered_by_steps: ["STEP-01", "STEP-10"]
  - ac_id: AC-4
    how_to_verify: "Existing actors with both flags true remain unchanged after deployment"
    covered_by_steps: ["STEP-01", "STEP-10"]

  # CR-72
  - ac_id: AC-5
    how_to_verify: "Invite user with role=bishopric -> meeting_actor auto-created"
    covered_by_steps: ["STEP-03", "STEP-10"]
  - ac_id: AC-6
    how_to_verify: "Invite bishopric with name matching existing actor -> no duplicate, capabilities updated"
    covered_by_steps: ["STEP-03", "STEP-10"]
  - ac_id: AC-7
    how_to_verify: "Invite user with role=secretary -> no actor created"
    covered_by_steps: ["STEP-03", "STEP-10"]
  - ac_id: AC-8
    how_to_verify: "Change user role to bishopric -> actor auto-created/updated"
    covered_by_steps: ["STEP-04-pre", "STEP-10"]
  - ac_id: AC-9
    how_to_verify: "Auto-created actor appears in ActorSelector for preside and conduct"
    covered_by_steps: ["STEP-03", "STEP-10"]

  # CR-73
  - ac_id: AC-10
    how_to_verify: "Tap Recognizing field -> ActorSelector opens (not text input)"
    covered_by_steps: ["STEP-04", "STEP-10"]
  - ac_id: AC-11
    how_to_verify: "Select actor -> name stored in recognized_names array"
    covered_by_steps: ["STEP-04", "STEP-10"]
  - ac_id: AC-12
    how_to_verify: "Tap field with existing selection -> can add another actor"
    covered_by_steps: ["STEP-04", "STEP-10"]
  - ac_id: AC-13
    how_to_verify: "Clear mechanism resets recognized_names"
    covered_by_steps: ["STEP-04", "STEP-10"]

  # CR-74
  - ac_id: AC-14
    how_to_verify: "Tap opening prayer -> PrayerSelector with custom name option"
    covered_by_steps: ["STEP-05", "STEP-10"]
  - ac_id: AC-15
    how_to_verify: "Type custom name, confirm -> prayer_name set, member_id=null"
    covered_by_steps: ["STEP-05", "STEP-10"]
  - ac_id: AC-16
    how_to_verify: "Custom name NOT added to members table"
    covered_by_steps: ["STEP-05", "STEP-10"]
  - ac_id: AC-17
    how_to_verify: "Agenda with custom prayer name -> name displayed in field"
    covered_by_steps: ["STEP-05", "STEP-10"]
  - ac_id: AC-18
    how_to_verify: "Select member from list -> member_id set, behavior unchanged"
    covered_by_steps: ["STEP-05", "STEP-10"]
  - ac_id: AC-19
    how_to_verify: "Closing prayer has same custom name behavior as opening"
    covered_by_steps: ["STEP-05", "STEP-10"]

  # CR-75
  - ac_id: AC-20
    how_to_verify: "Gen conf sunday appears as non-expandable card in Agenda tab"
    covered_by_steps: ["STEP-08", "STEP-10"]
  - ac_id: AC-21
    how_to_verify: "Non-expandable card shows exception label in warning color, no chevron"
    covered_by_steps: ["STEP-08", "STEP-10"]
  - ac_id: AC-22
    how_to_verify: "Tap non-expandable card -> nothing happens"
    covered_by_steps: ["STEP-08", "STEP-10"]
  - ac_id: AC-23
    how_to_verify: "Conference sundays no longer filtered out of list"
    covered_by_steps: ["STEP-08", "STEP-09", "STEP-10"]
  - ac_id: AC-24
    how_to_verify: "Testimony/speeches sundays still expandable with chevron"
    covered_by_steps: ["STEP-08", "STEP-10"]
```
