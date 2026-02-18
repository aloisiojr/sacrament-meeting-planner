# SPEC_CR4_F008 - Agenda & Actors Enhancements

## SPEC_SUMMARY

```yaml
type: spec_summary
goal: "Enhance agenda form: remove auto-preside rule, auto-add bishopric actors, make Recognizing use ActorSelector, allow custom prayer names, show non-expandable cards for excluded sundays"
in_scope:
  - "CR-71: Remove enforceActorRules auto-preside when conducting is selected"
  - "CR-72: Auto-add bishopric users as actors with preside/conduct roles"
  - "CR-73: [BUG] Make Recognizing field use ActorSelector instead of DebouncedTextInput"
  - "CR-74: Allow prayer fields to accept custom names not persisted as members"
  - "CR-75: Show non-expandable cards for sundays without agenda (gen conf, stake conf)"
out_of_scope:
  - "Changing agenda section structure"
  - "Modifying hymn selection logic"
  - "Changing speech assignment logic"
  - "Changing the SundayCard used in Speeches/Home tabs"
main_risks:
  - "CR-72: Auto-creating actors on user registration may create duplicates if name already exists"
  - "CR-74: Custom prayer names need careful UX for the MemberSelectorModal to allow free-text entry"
  - "CR-75: Removing the filter in agenda.tsx changes list size, may affect getItemLayout/scroll"
ac_count: 24
edge_case_count: 13
has_open_questions: true
has_unconfirmed_assumptions: true
```

## SPEC

```yaml
type: spec
version: 3
goal: "Enhance the agenda form and actor management with 5 improvements: remove auto-preside rule, auto-add bishopric actors, recognizing field uses actors, custom prayer names, and non-expandable agenda cards"

scope:
  in:
    - "CR-71: Remove enforceActorRules logic in src/hooks/useActors.ts:37-43 that forces can_preside=true when can_conduct=true"
    - "CR-71: Remove comment at useActors.ts:4 referencing the old business rule"
    - "CR-71: Remove the can_preside override in ActorSelector.tsx:86 handleAdd (line 86: can_preside includes roleFilter === 'can_conduct')"
    - "CR-72: When a bishopric user is created/invited, auto-create a meeting_actor with can_preside=true and can_conduct=true"
    - "CR-73: Change the Recognizing field in AgendaForm.tsx:232-244 from DebouncedTextInput to ActorSelector with roleFilter='can_recognize'"
    - "CR-74: Enhance MemberSelectorModal to allow typing a custom name that is NOT an existing member"
    - "CR-74: Custom prayer names are saved in opening_prayer_name/closing_prayer_name with member_id=NULL"
    - "CR-75: Remove the filter in agenda.tsx:75-80 that excludes gen_conf/stake_conf sundays"
    - "CR-75: Show excluded sundays as non-expandable cards with yellow exception label"
  out:
    - "Changing actor role capabilities beyond can_preside/can_conduct/can_recognize/can_music"
    - "Changing the SundayCard component used in Speeches tab or Home tab"
    - "Adding new agenda sections or fields"
    - "Modifying speech assignment or status logic"
    - "DB schema migration for prayer fields (existing opening_prayer_name/closing_prayer_name fields already support custom names with member_id=NULL)"

files_to_change:
  - path: "src/hooks/useActors.ts"
    changes:
      - "CR-71: Remove or no-op the enforceActorRules function (lines 37-43). The function currently checks if can_conduct===true and forces can_preside=true. Simply make it return input unchanged, or remove the conditional block."
      - "CR-71: Update JSDoc comment at line 4 to remove 'Business rule: can_conduct=true implies can_preside=true'"
      - "CR-71: Update useCreateActor JSDoc at line 94 to remove 'Enforces can_conduct -> can_preside rule'"
      - "CR-71: Update useUpdateActor JSDoc at line 129 to remove 'Enforces can_conduct -> can_preside rule'"

  - path: "src/components/ActorSelector.tsx"
    changes:
      - "CR-71: In handleAdd (line 84-90), remove the logic 'can_preside: roleFilter === 'can_preside' || roleFilter === 'can_conduct''. Change to 'can_preside: roleFilter === 'can_preside''. The conducting role should NOT auto-set presiding."

  - path: "src/components/AgendaForm.tsx"
    changes:
      - "CR-73: Replace lines 232-244 (DebouncedTextInput for Recognizing field) with a SelectorField that opens an ActorSelector with roleFilter='can_recognize'. When an actor is selected, store the actor name in recognized_names array (single-element). The field should show the currently recognized names joined by comma."
      - "CR-73: Add a new selectorModal type case or use the existing 'actor' type with field='recognizing' and roleFilter='can_recognize'"
      - "CR-73: Handle actor selection for recognizing: update recognized_names to [actor.name]"
      - "CR-74: Prayer selector modals (lines 505-516 for opening, same pattern for closing) currently use MemberSelectorModal. Replace with enhanced MemberSelectorModal that supports allowCustomName prop, or switch to PrayerSelector component (which already exists at src/components/PrayerSelector.tsx and supports custom names)"

  - path: "src/components/MemberSelectorModal.tsx"
    changes:
      - "CR-74: Add an optional prop 'allowCustomName?: boolean' and 'onCustomName?: (name: string) => void'"
      - "CR-74: When allowCustomName=true, add a button/row at the top of the list that allows the user to submit the current search text as a custom name (e.g., 'Use [typed name]' button visible when search text is non-empty)"
      - "CR-74: The onCustomName callback receives just the string, not a Member object"

  - path: "src/app/(tabs)/agenda.tsx"
    changes:
      - "CR-75: Remove the filter at lines 75-80 that calls isExcludedFromAgenda to filter out sundays"
      - "CR-75: In AgendaSundayCard, add an 'expandable' check: if the exception reason is in EXCLUDED_EXCEPTION_TYPES (gen_conf, stake_conf), render the card without a chevron and don't call onToggle on press"
      - "CR-75: Non-expandable cards show the exception label in warning color (already done for exceptions, just need to skip chevron+expand)"

  - path: "src/app/(tabs)/settings/users.tsx"
    changes:
      - "CR-72: After inviteMutation.onSuccess or changeRoleMutation.onSuccess (when new role is 'bishopric'), call a helper to auto-create a meeting_actor. This requires either: (a) a new Edge Function endpoint, or (b) a client-side Supabase insert to meeting_actors table."

  - path: "supabase/functions/create-invitation/index.ts"
    changes:
      - "CR-72 (option A - preferred): After creating the invitation, if role='bishopric', auto-insert a meeting_actor record with can_preside=true, can_conduct=true, using the email local part as name. Use ON CONFLICT DO NOTHING or check for existing actor with same name."

acceptance_criteria:
  # =========================================================================
  # CR-71: Remove Auto-Preside Rule
  # =========================================================================
  - id: AC-1
    given: "The enforceActorRules function in src/hooks/useActors.ts"
    when: "A new actor is created with can_conduct=true and can_preside=false"
    then: "The actor is saved with can_conduct=true and can_preside=false; no automatic override"
    priority: must
    code_ref: "src/hooks/useActors.ts:37-43"

  - id: AC-2
    given: "User opens ActorSelector with roleFilter='can_conduct' and adds a new actor"
    when: "handleAdd creates the actor input object"
    then: "can_preside is NOT automatically set to true (only set if roleFilter is 'can_preside')"
    priority: must
    code_ref: "src/components/ActorSelector.tsx:84-90"

  - id: AC-3
    given: "An existing actor has can_conduct=true"
    when: "User edits the actor to set can_preside=false via useUpdateActor"
    then: "The update is accepted; can_conduct and can_preside are independent fields"
    priority: must
    code_ref: "src/hooks/useActors.ts:132-157"

  - id: AC-4
    given: "Existing actors in the database with can_conduct=true AND can_preside=true (due to old rule)"
    when: "The enforceActorRules change is deployed"
    then: "Existing actor records are NOT retroactively modified. No data migration is needed"
    priority: must

  # =========================================================================
  # CR-72: Auto-Add Bishopric Users as Actors
  # =========================================================================
  - id: AC-5
    given: "A new user is invited with role='bishopric'"
    when: "The invitation is created via create-invitation Edge Function"
    then: "A meeting_actor record is automatically created for that ward with the user's name, can_preside=true, can_conduct=true"
    priority: must
    code_ref: "supabase/functions/create-invitation/index.ts"

  - id: AC-6
    given: "A bishopric user is being auto-added as an actor"
    when: "An actor with the same name (case-insensitive) already exists in the ward"
    then: "No duplicate actor is created; the existing actor's can_preside and can_conduct are updated to true if they were false"
    priority: must

  - id: AC-7
    given: "A user registers or accepts an invitation with role='secretary' or role='observer'"
    when: "The user account is created"
    then: "No actor record is automatically created for them"
    priority: must

  - id: AC-8
    given: "A user's role is changed from non-bishopric to bishopric via update-user-role"
    when: "The role change is saved"
    then: "An actor is auto-created (or updated) for that user with can_preside=true and can_conduct=true"
    priority: should
    code_ref: "src/app/(tabs)/settings/users.tsx"

  - id: AC-9
    given: "The auto-created actor from bishopric invitation/registration"
    when: "The actor is viewed in the ActorSelector"
    then: "The actor appears in both can_preside and can_conduct filtered lists and can be edited or deleted like any other actor"
    priority: must

  # =========================================================================
  # CR-73: Recognizing Presence Field Uses ActorSelector
  # =========================================================================
  - id: AC-10
    given: "User opens an agenda card and looks at the 'Recognizing Presence' (Reconhecendo a Presenca) field"
    when: "The field is tapped"
    then: "An ActorSelector bottom-sheet opens (not a free-text DebouncedTextInput)"
    priority: must
    code_ref: "src/components/AgendaForm.tsx:232-244"

  - id: AC-11
    given: "User selects an actor from the Recognizing ActorSelector"
    when: "The actor is selected"
    then: "The actor's name is stored in recognized_names array and the ActorSelector closes"
    priority: must

  - id: AC-12
    given: "The 'Recognizing Presence' field already has one or more actor names"
    when: "The user taps the field again"
    then: "The ActorSelector opens, allowing the user to add another actor. Previously selected names are preserved"
    priority: should

  - id: AC-13
    given: "The 'Recognizing Presence' field displays selected actor names (comma-separated)"
    when: "The user wants to clear or remove names"
    then: "There is a way to clear the entire field (e.g., a clear button or clearing the displayed value)"
    priority: should

  # =========================================================================
  # CR-74: Custom Prayer Names
  # =========================================================================
  - id: AC-14
    given: "User taps the 'Opening Prayer' (Oracao de Abertura) field in the agenda form"
    when: "The MemberSelectorModal opens"
    then: "There is an option to type a custom name (e.g., search text can be submitted as a custom name via a 'Use custom name' button)"
    priority: must
    code_ref: "src/components/AgendaForm.tsx:505-516"

  - id: AC-15
    given: "User types a custom name for opening/closing prayer"
    when: "They confirm the custom name"
    then: "opening_prayer_name (or closing_prayer_name) is set to the custom name; opening_prayer_member_id (or closing_prayer_member_id) is set to NULL"
    priority: must

  - id: AC-16
    given: "A custom prayer name is entered"
    when: "The agenda is saved"
    then: "The custom name is NOT persisted as a new member in the members table"
    priority: must

  - id: AC-17
    given: "User opens the prayer field for an agenda that already has a custom name (member_id=NULL, name not null)"
    when: "The field is displayed"
    then: "The previously entered custom name is shown as the current value"
    priority: must

  - id: AC-18
    given: "User selects a member from the member list for a prayer"
    when: "The member is selected"
    then: "Behavior remains unchanged: member_id is set and name is populated from member.full_name"
    priority: must

  - id: AC-19
    given: "The 'Closing Prayer' (Oracao de Encerramento) field in the agenda form"
    when: "The user taps it"
    then: "The same custom name behavior applies as for Opening Prayer"
    priority: must

  # =========================================================================
  # CR-75: Non-Expandable Cards for Excluded Sundays
  # =========================================================================
  - id: AC-20
    given: "The Agenda tab renders the list of sundays"
    when: "A sunday has exception reason 'general_conference' or 'stake_conference'"
    then: "The sunday appears as a non-expandable card (no chevron, no expand on tap)"
    priority: must
    code_ref: "src/app/(tabs)/agenda.tsx:75-80 (remove filter), lines 260-308 (AgendaSundayCard)"

  - id: AC-21
    given: "A non-expandable agenda card is rendered"
    when: "The card is displayed"
    then: "The exception label is shown in yellow/warning color (uses colors.warning). No chevron/arrow icon is shown"
    priority: must

  - id: AC-22
    given: "A non-expandable agenda card is rendered"
    when: "The user taps on the card"
    then: "Nothing happens (card does not expand, no AgendaForm is rendered, no useLazyCreateAgenda is triggered)"
    priority: must

  - id: AC-23
    given: "The Agenda tab currently filters out sundays with gen conf/stake conf (agenda.tsx:75-80)"
    when: "CR-75 is implemented"
    then: "These sundays are NO LONGER filtered out; they appear in the list but as non-expandable cards"
    priority: must

  - id: AC-24
    given: "Testimony meeting sundays (which DO have agendas) and normal speeches sundays"
    when: "Displayed in the Agenda tab"
    then: "They continue to be expandable with chevron and show AgendaForm when tapped (no change from current behavior)"
    priority: must

edge_cases:
  # CR-71
  - id: EC-1
    case: "Existing actors have can_conduct=true and can_preside=true due to the old auto-preside rule"
    expected: "No migration needed; existing data is valid. Users can now independently toggle can_preside to false if desired"

  - id: EC-2
    case: "User adds a new actor from the conducting context and later wants them to also preside"
    expected: "The user must open the ActorSelector from the presiding context and add the actor there, or edit the actor's capabilities"

  # CR-72
  - id: EC-3
    case: "Bishopric user is invited but never accepts the invitation"
    expected: "Actor may be created at invitation time (per Q-1 proposed default). If created, it remains valid for manual use. If implementation defers to acceptance time, no actor is created until acceptance."

  - id: EC-4
    case: "Bishopric user is removed from the ward or their role is changed to non-bishopric"
    expected: "The auto-created actor is NOT automatically deleted. It remains as a regular actor for manual management"

  - id: EC-5
    case: "Multiple bishopric users have the same full name"
    expected: "Only one actor record exists. Deduplication is case-insensitive by name within the ward. Subsequent registrations find the existing actor and ensure can_preside/can_conduct are true"

  - id: EC-6
    case: "Bishopric user has no name metadata (only email). Auto-actor creation needs a name"
    expected: "Use the email local part (before @) as fallback name, replacing dots/underscores with spaces and capitalizing words. The actor can be renamed later"

  # CR-73
  - id: EC-7
    case: "Ward has no actors with can_recognize=true (or no actors at all)"
    expected: "ActorSelector opens showing empty list with '+ Add' button. User can create a new actor inline (existing ActorSelector behavior)"

  - id: EC-8
    case: "Agenda has recognized_names from before this change (free-text comma-separated values)"
    expected: "Existing values are displayed as-is in the field. When the user edits via the new ActorSelector, the selection replaces the array content"

  # CR-74
  - id: EC-9
    case: "User types a name in the prayer selector that exactly matches a ward member name"
    expected: "The ward member appears in the filtered list AND the custom name option is also available. User can choose either"

  - id: EC-10
    case: "User selects a custom name for prayer, then later a member with that name is added to the ward"
    expected: "The agenda prayer field retains the custom name (member_id=null). No auto-linking to the new member"

  # CR-75
  - id: EC-11
    case: "A sunday transitions from general_conference to speeches (exception removed via Speeches tab)"
    expected: "The card becomes expandable in the Agenda tab since it is no longer in EXCLUDED_EXCEPTION_TYPES"

  - id: EC-12
    case: "Year separator is immediately before a non-expandable conference card"
    expected: "The year separator renders normally. The conference card renders below it as a non-expandable card"

  - id: EC-13
    case: "Scroll position may shift after adding excluded sundays back to the list (CR-75 changes list item count)"
    expected: "getItemLayout estimated height remains 64px. scrollToIndex for nextSunday recalculates correctly with the new item count. Verify scrollToIndex still targets the correct date"

assumptions:
  - id: A-1
    description: "The auto-preside rule removal (CR-71) does not require a data migration; existing actors with both can_conduct=true and can_preside=true remain valid"
    confirmed: true
    default_if_not_confirmed: "No migration needed"

  - id: A-2
    description: "For CR-72, the bishopric user's name for auto-actor creation comes from: (a) a name field in invitation metadata, or (b) the email local part as fallback. Currently, create-invitation only receives email+role (no name field)."
    confirmed: false
    default_if_not_confirmed: "Add an optional 'name' field to create-invitation input. If not provided, use email local part. The invite modal in users.tsx already has the email - could add a name field."

  - id: A-3
    description: "The Recognizing field will switch from free-text multi-name input to a single actor selection via ActorSelector. Previous recognized_names data (comma-separated text) may not match actor names."
    confirmed: false
    default_if_not_confirmed: "Single-select via ActorSelector. The field displays the selected actor name. Old comma-separated values will still render correctly in read mode."

  - id: A-4
    description: "Custom prayer names use the existing opening_prayer_name/closing_prayer_name TEXT fields in sunday_agendas and set corresponding member_id to NULL. No DB schema change needed."
    confirmed: true
    default_if_not_confirmed: "Use existing fields; no schema change needed"
    evidence: "DB schema at 001_initial_schema.sql shows opening_prayer_member_id UUID REFERENCES members ON DELETE SET NULL + opening_prayer_name TEXT. Setting member_id=NULL with a custom name works."

  - id: A-5
    description: "Non-expandable cards in the Agenda tab use the same AgendaSundayCard component with a conditional prop. No new component needed."
    confirmed: true
    default_if_not_confirmed: "Same component with expandable=false behavior"
    evidence: "AgendaSundayCard at agenda.tsx:238-308 already has conditional rendering. Just need to add expandable check."

  - id: A-6
    description: "The existing PrayerSelector component (src/components/PrayerSelector.tsx) already supports custom names, but it is NOT currently used by AgendaForm. AgendaForm uses MemberSelectorModal for prayers instead."
    confirmed: true
    default_if_not_confirmed: "Either switch to PrayerSelector or add custom name support to MemberSelectorModal"
    evidence: "PrayerSelector.tsx:66-73 has handleCustomName. AgendaForm.tsx:505-516 uses MemberSelectorModal for prayers."

open_questions:
  - id: Q-1
    question: "For CR-72, where should auto-actor creation happen? Options: (a) in create-invitation Edge Function, (b) in a new register-user or accept-invitation flow, (c) client-side after role change."
    proposed_default: "Option (a) in create-invitation Edge Function is simplest. When role='bishopric', insert into meeting_actors after creating the invitation. For role changes (AC-8), add it to update-user-role Edge Function."

  - id: Q-2
    question: "For CR-72, the create-invitation only receives email+role (no name). Should we add a name field to the invitation flow, or derive the name from the email?"
    proposed_default: "Add an optional 'name' field to the invite modal UI and Edge Function input. If not provided, derive from email local part (e.g., 'joao.silva' from 'joao.silva@email.com', replacing dots with spaces and capitalizing)."

  - id: Q-3
    question: "For CR-73, should the Recognizing field support selecting multiple actors (multi-select in one session), or single-select only?"
    proposed_default: "Single-select for V1. The recognized_names field is TEXT[] but for simplicity, selecting one actor replaces the array. If multiple authorities need recognition, the user opens the selector multiple times."

  - id: Q-4
    question: "For CR-74, what UX pattern for custom name entry in MemberSelectorModal? Options: (a) a 'Use custom name' button below search when text doesn't match, (b) a separate text field, (c) typing any text and pressing a submit button."
    proposed_default: "Option (a): When search text is entered and doesn't exactly match any member, show a row at the top of the list: 'Use [typed text] as custom name'. Tapping this calls onCustomName(searchText). This mirrors the existing PrayerSelector.tsx pattern at lines 142-155."

definition_of_done:
  - "enforceActorRules no longer forces can_preside=true when can_conduct=true"
  - "ActorSelector handleAdd does NOT set can_preside=true when roleFilter is 'can_conduct'"
  - "Existing actor records are not retroactively modified (no migration)"
  - "Bishopric users get auto-created as actors with can_preside=true and can_conduct=true"
  - "Duplicate actor names (case-insensitive) are handled gracefully during auto-creation"
  - "Non-bishopric users (secretary, observer) do NOT trigger auto-actor creation"
  - "Recognizing field opens ActorSelector instead of DebouncedTextInput"
  - "Selected actor names stored in recognized_names array"
  - "Prayer fields accept custom names via enhanced MemberSelectorModal"
  - "Custom prayer names saved to agenda with member_id=NULL, NOT persisted as members"
  - "Sundays with gen conf/stake conf appear as non-expandable cards in Agenda tab"
  - "Non-expandable cards show exception label in yellow warning color, no chevron"
  - "Tapping non-expandable cards does not trigger expansion or lazy-create"
  - "Testimony meeting and normal sundays continue to be expandable (no regression)"
  - "Scroll-to-next-sunday still works after adding excluded sundays back to the list"
  - "All new i18n keys translated in pt-BR, en, es"
  - "No regressions in existing agenda form, actor CRUD, or prayer functionality"
```
