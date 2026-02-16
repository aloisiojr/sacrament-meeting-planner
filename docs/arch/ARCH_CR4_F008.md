# ARCH_CR4_F008 - Agenda & Actors Enhancements

```yaml
type: arch
version: 1
status: complete
module: AgendaModule_Patch + WardDataModule_Patch
features: [CR-71, CR-72, CR-73, CR-74, CR-75]
spec: SPEC_CR4_F008
```

## Overview

```yaml
goal: "Enhance agenda form: remove auto-preside rule, auto-add bishopric actors, make Recognizing use ActorSelector, allow custom prayer names, show non-expandable cards for excluded sundays"
principles:
  - "can_conduct and can_preside are independent fields (CR-71)"
  - "Bishopric users automatically get actor records (CR-72)"
  - "Recognizing field uses ActorSelector with can_recognize filter (CR-73)"
  - "Prayer fields accept custom names without creating member records (CR-74)"
  - "All sundays appear in Agenda tab; excluded ones are non-expandable (CR-75)"
```

## Diagram

```
  CR-71: Remove auto-preside rule
  ================================
  useActors.ts ──> enforceActorRules: make no-op (return input unchanged)
  ActorSelector.tsx ──> handleAdd: can_preside only when roleFilter='can_preside'

  CR-72: Auto-add bishopric actors
  =================================
  create-invitation (EF) ──> if role='bishopric': INSERT meeting_actors
  update-user-role (EF) ──> if newRole='bishopric': INSERT meeting_actors

  CR-73: Recognizing uses ActorSelector
  ======================================
  AgendaForm.tsx ──> Replace DebouncedTextInput with SelectorField + ActorSelector
                     roleFilter='can_recognize'

  CR-74: Custom prayer names
  ===========================
  MemberSelectorModal.tsx ──> Add allowCustomName + onCustomName props
                              "Use [typed text]" row when no exact match
  AgendaForm.tsx ──> Pass allowCustomName=true for prayer fields
                     Save: member_id=NULL, name=customText

  CR-75: Non-expandable cards for excluded sundays
  ==================================================
  agenda.tsx ──> Remove isExcludedFromAgenda filter
                 Add expandable check in AgendaSundayCard
                 Non-expandable: no chevron, no onToggle, yellow exception label
```

## Components

| # | Component | Responsibility | Changes |
|---|-----------|----------------|---------|
| 1 | useActors hook | Actor CRUD + business rules | CR-71: Remove enforceActorRules logic |
| 2 | ActorSelector | Bottom-sheet actor selection | CR-71: Fix handleAdd can_preside logic |
| 3 | AgendaForm | Full agenda form | CR-73: Recognizing -> ActorSelector; CR-74: custom prayers |
| 4 | MemberSelectorModal | Member selection with search | CR-74: Add custom name support |
| 5 | AgendaTab | Sunday list with expandable cards | CR-75: Show all sundays, non-expandable for excluded |
| 6 | create-invitation EF | Create user invitation | CR-72: Auto-create actor for bishopric |
| 7 | update-user-role EF | Change user role | CR-72: Auto-create actor when role -> bishopric |

## Contracts

### CR-71: Remove Auto-Preside Rule

```yaml
useActors.ts:
  enforceActorRules:
    before: |
      if ('can_conduct' in result && result.can_conduct === true) {
        result.can_preside = true;
      }
    after: |
      // No-op: return input unchanged.
      // can_conduct and can_preside are independent fields.
      return input;

  jsdoc_updates:
    - "Line 4: Remove 'Business rule: can_conduct=true implies can_preside=true'"
    - "Line 94: Remove 'Enforces can_conduct -> can_preside rule'"
    - "Line 129: Remove 'Enforces can_conduct -> can_preside rule'"

ActorSelector.tsx:
  handleAdd_line_86:
    before: |
      can_preside: roleFilter === 'can_preside' || roleFilter === 'can_conduct',
    after: |
      can_preside: roleFilter === 'can_preside',

  note: "This means adding an actor from the 'Conducting' field only sets
    can_conduct=true. Presiding must be explicitly assigned."
```

### CR-72: Auto-Add Bishopric Actors

```yaml
create-invitation_EF:
  change: |
    After creating the invitation (line 117), if role='bishopric':
    1. Derive actor name from email (or optional 'name' field):
       const actorName = input.name?.trim()
         || input.email.split('@')[0]
              .replace(/[._-]/g, ' ')
              .replace(/\b\w/g, c => c.toUpperCase());
    2. Check for existing actor (case-insensitive):
       const { data: existing } = await supabaseAdmin
         .from('meeting_actors')
         .select('id, can_preside, can_conduct')
         .eq('ward_id', wardId)
         .ilike('name', actorName)
         .maybeSingle();
    3. If existing: update can_preside/can_conduct to true if needed
    4. If not existing: insert new meeting_actor
    5. Errors here are logged but don't fail the invitation.

  input_extension: |
    interface CreateInvitationInput {
      email: string;
      role: 'bishopric' | 'secretary' | 'observer';
      name?: string;  // Optional: used for actor creation
    }

update-user-role_EF:
  change: |
    After updating the role (line 152), if newRole='bishopric':
    1. Get the user's email from targetUser.email
    2. Derive name from email local part
    3. SELECT+INSERT or UPDATE meeting_actor

  note: "When a user's role changes FROM bishopric, the actor record is NOT deleted.
    It remains for manual management."

actor_dedup_strategy: |
  Use SELECT + conditional INSERT/UPDATE instead of UPSERT,
  because meeting_actors has no unique constraint on (ward_id, name).
  Adding such a constraint via migration is avoided for simplicity.

  const { data: existing } = await supabaseAdmin
    .from('meeting_actors')
    .select('id, can_preside, can_conduct')
    .eq('ward_id', wardId)
    .ilike('name', actorName)
    .maybeSingle();

  if (existing) {
    if (!existing.can_preside || !existing.can_conduct) {
      await supabaseAdmin
        .from('meeting_actors')
        .update({ can_preside: true, can_conduct: true })
        .eq('id', existing.id);
    }
  } else {
    await supabaseAdmin
      .from('meeting_actors')
      .insert({
        ward_id: wardId,
        name: actorName,
        can_preside: true,
        can_conduct: true,
        can_recognize: false,
        can_music: false,
      });
  }
```

### CR-73: Recognizing Field Uses ActorSelector

```yaml
AgendaForm.tsx:
  change: |
    Replace the DebouncedTextInput for recognized_names (currently free-text)
    with a SelectorField that opens ActorSelector with roleFilter='can_recognize'.

  current_code_location: "Lines ~232-244 (DebouncedTextInput for Recognizing)"

  new_implementation: |
    // Add 'recognizing' to SelectorState types:
    type SelectorField = 'presiding' | 'conducting' | 'pianist' | 'conductor' | 'recognizing' | ...;

    // Recognizing field render:
    <Pressable
      style={[styles.selectorField, { borderColor: colors.inputBorder }]}
      onPress={() => openSelector({ type: 'actor', field: 'recognizing', roleFilter: 'can_recognize' })}
    >
      <Text style={[styles.selectorLabel, { color: colors.textSecondary }]}>
        {t('agenda.recognizing')}
      </Text>
      <Text style={[styles.selectorValue, { color: colors.text }]}>
        {agenda.recognized_names?.[0] ?? t('common.select')}
      </Text>
    </Pressable>

    // On actor selection for recognizing:
    if (selectorState.field === 'recognizing') {
      updateField('recognized_names', [actor.name]);
      closeSelector();
      return;
    }

  note: |
    Single-select for V1. recognized_names is TEXT[] in DB but stores [actor.name].
    Old comma-separated values still render correctly in read mode.
    ActorSelector already supports can_recognize filter.
```

### CR-74: Custom Prayer Names in MemberSelectorModal

```yaml
MemberSelectorModal.tsx:
  new_props: |
    export interface MemberSelectorModalProps {
      visible: boolean;
      onSelect: (member: Member) => void;
      onClose: () => void;
      selectedId?: string | null;
      allowCustomName?: boolean;       // NEW
      onCustomName?: (name: string) => void;  // NEW
      currentCustomName?: string;      // NEW: show current custom value
    }

  custom_name_ui: |
    When allowCustomName=true and search text is entered:
    1. Check if search text exactly matches any member name (case-insensitive)
    2. If no exact match AND trimmed search is not empty, show a special row at top:
       <Pressable
         style={[styles.customNameRow, { borderBottomColor: colors.divider }]}
         onPress={() => {
           onCustomName?.(search.trim());
           setSearch('');
         }}
       >
         <Text style={[styles.customNameText, { color: colors.primary }]}>
           {t('members.useCustomName', { name: search.trim() })}
         </Text>
       </Pressable>
    3. Tapping calls onCustomName(searchText) and clears search

  visibility_logic: |
    const showCustomButton = allowCustomName
      && search.trim().length > 0
      && !(members ?? []).some(
        m => m.full_name.toLowerCase() === search.trim().toLowerCase()
      );

AgendaForm.tsx:
  prayer_integration: |
    When opening MemberSelectorModal for opening/closing prayer:
    - Pass allowCustomName={true}
    - Pass onCustomName handler:

    const handleCustomPrayerName = (name: string) => {
      if (selectorField === 'opening_prayer') {
        updateField('opening_prayer_name', name);
        updateField('opening_prayer_member_id', null);
      } else {
        updateField('closing_prayer_name', name);
        updateField('closing_prayer_member_id', null);
      }
      closeSelector();
    };

    // Pass to MemberSelectorModal:
    <MemberSelectorModal
      visible={memberSelectorVisible}
      onSelect={handleMemberSelect}
      onClose={closeMemberSelector}
      allowCustomName={true}
      onCustomName={handleCustomPrayerName}
    />

  display_logic: |
    // Prayer field shows the name regardless of source:
    const prayerName = agenda.opening_prayer_name || t('agenda.openingPrayer');
    // Same pattern for closing_prayer_name

  note: "DB already supports this. opening_prayer_member_id is UUID REFERENCES
    members ON DELETE SET NULL. Setting it to NULL with a custom name works."
```

### CR-75: Non-Expandable Cards for Excluded Sundays

```yaml
agenda.tsx:
  remove_filter: |
    // BEFORE (lines 74-80):
    const filteredSundays = sundays.filter((date) => {
      const ex = exceptionMap.get(date);
      if (ex && isExcludedFromAgenda(ex.reason)) return false;
      return true;
    }).map(...)

    // AFTER:
    const filteredSundays = sundays.map((date) => {
      const [yearStr] = date.split('-');
      return {
        date,
        exception: exceptionMap.get(date) ?? null,
        year: parseInt(yearStr, 10),
      };
    });

  excluded_types: |
    const EXCLUDED_EXCEPTION_TYPES = ['general_conference', 'stake_conference'];

    function isExcludedSunday(exception: SundayException | null): boolean {
      if (!exception) return false;
      return EXCLUDED_EXCEPTION_TYPES.includes(exception.reason);
    }

  card_rendering: |
    const excluded = isExcludedSunday(item.data.exception);

    // If excluded:
    // 1. No chevron icon
    // 2. No onPress handler (disabled)
    // 3. Show exception label in warning color
    // 4. Do NOT call lazyCreateAgenda
    // 5. Card stays collapsed (non-expandable)

    <Pressable
      style={[styles.sundayCard, { backgroundColor: colors.card }]}
      onPress={excluded ? undefined : () => handleToggle(date)}
      disabled={excluded}
    >
      <View style={styles.cardContent}>
        <View style={styles.dateBlock}>
          <Text style={styles.dayNumber}>{day}</Text>
          <Text style={styles.monthAbbr}>{monthAbbr}</Text>
        </View>
        {exception && (
          <Text style={[styles.exceptionText, { color: colors.warning }]}>
            {t(`sundayExceptions.${exception.reason}`)}
          </Text>
        )}
        {!excluded && (
          <Text style={styles.chevron}>
            {expandedDate === date ? '\u25B2' : '\u25BC'}
          </Text>
        )}
      </View>
      {!excluded && expandedDate === date && (
        <AgendaForm ... />
      )}
    </Pressable>

  scroll_impact: |
    Adding excluded sundays back increases list item count.
    getItemLayout uses fixed ITEM_HEIGHT=64 for collapsed cards.
    scrollToIndex recalculates initialIndex from the expanded list.
    No regression expected.
```

## Data Model Changes

```yaml
migrations: none
  # No schema changes needed for any CR in this batch.

edge_functions:
  create-invitation:
    change: "After invitation insert, if role='bishopric': auto-create meeting_actor"
    impact: "Medium -- new INSERT logic in EF"
  update-user-role:
    change: "After role update, if newRole='bishopric': auto-create meeting_actor"
    impact: "Medium -- new INSERT logic in EF"

ARCH_M002_update_needed: |
  Remove from meeting_actors data model:
    rule: "can_conduct=true implies can_preside=true (app-enforced)"
  This rule is removed by CR-71.
```

## i18n Keys (new)

```yaml
pt-BR:
  members.useCustomName: "Usar \"{name}\""
  agenda.recognizing: "Reconhecendo a Presenca"

en:
  members.useCustomName: "Use \"{name}\""
  agenda.recognizing: "Recognizing"

es:
  members.useCustomName: "Usar \"{name}\""
  agenda.recognizing: "Reconociendo la Presencia"
```

## File Impact Summary

| File | CRs | Change Type |
|------|-----|-------------|
| `src/hooks/useActors.ts` | CR-71 | Remove enforceActorRules logic, update JSDoc |
| `src/components/ActorSelector.tsx` | CR-71 | Fix handleAdd: can_preside only for 'can_preside' filter |
| `src/components/AgendaForm.tsx` | CR-73, CR-74 | Recognizing -> ActorSelector; prayer custom names |
| `src/components/MemberSelectorModal.tsx` | CR-74 | Add allowCustomName + onCustomName props + UI |
| `src/app/(tabs)/agenda.tsx` | CR-75 | Remove exclusion filter; add non-expandable card logic |
| `supabase/functions/create-invitation/index.ts` | CR-72 | Auto-create actor for bishopric invitees |
| `supabase/functions/update-user-role/index.ts` | CR-72 | Auto-create actor on role change to bishopric |
| `src/i18n/locales/pt-BR.json` | CR-73, CR-74 | Add recognizing, useCustomName keys |
| `src/i18n/locales/en.json` | CR-73, CR-74 | Mirror pt-BR |
| `src/i18n/locales/es.json` | CR-73, CR-74 | Mirror pt-BR |

## Execution Order (Dependencies)

```
Phase 1 (no dependencies):
  CR-71  Remove auto-preside rule (useActors.ts + ActorSelector.tsx)
  CR-75  Non-expandable cards (agenda.tsx only)

Phase 2 (independent):
  CR-73  Recognizing field uses ActorSelector (AgendaForm.tsx)
  CR-74  Custom prayer names (MemberSelectorModal.tsx + AgendaForm.tsx)

Phase 3 (requires EF deployment):
  CR-72  Auto-add bishopric actors (create-invitation + update-user-role EFs)

Note: CR-73 and CR-74 both modify AgendaForm.tsx. Do CR-73 first (smaller change),
then CR-74 (adds custom name integration). CR-72 is independent of all other CRs
but requires Edge Function redeployment.
```

## Risk Assessment

```yaml
risks:
  - id: R-1
    severity: MEDIUM
    cr: CR-72
    description: "Auto-creating actors may create duplicates if name derivation
      from email doesn't match existing actor names (case, spacing, accents)"
    mitigation: "Use case-insensitive name comparison (ilike) when checking for
      existing actors. If found, update roles. If not, create new."

  - id: R-2
    severity: MEDIUM
    cr: CR-74
    description: "Custom name UX in MemberSelectorModal must be intuitive.
      User needs to understand they can type a name not in the list."
    mitigation: "Show 'Use [typed name]' row only when search text doesn't
      exactly match any member. Clear visual distinction from member rows."

  - id: R-3
    severity: LOW
    cr: CR-73
    description: "Switching Recognizing from free-text to ActorSelector changes
      the data format. Old comma-separated values may not match actor names."
    mitigation: "Old values still display correctly (read as-is from DB).
      New selections use single actor name in array. No migration needed."

  - id: R-4
    severity: LOW
    cr: CR-75
    description: "Adding excluded sundays back to the list changes scroll position
      calculations. initialIndex may shift."
    mitigation: "getItemLayout uses fixed ITEM_HEIGHT=64. Scroll calculations
      already handle variable list sizes. scrollToIndex recalculates correctly."

  - id: R-5
    severity: LOW
    cr: CR-71
    description: "Existing actors have both can_conduct=true and can_preside=true
      due to old auto-preside rule. No migration needed."
    mitigation: "Existing data is valid. Users can now independently toggle
      can_preside to false if desired."
```

## ADRs

```yaml
adrs:
  - id: ADR-020
    title: "Independent can_conduct and can_preside actor fields"
    context: "The old rule 'can_conduct implies can_preside' was a simplification
      that doesn't match real ward practices. Conductors don't necessarily preside."
    decision: "Remove enforceActorRules logic. Fields are independent."
    consequences:
      - "More flexible actor configuration"
      - "No data migration needed (existing data stays valid)"

  - id: ADR-021
    title: "Auto-create actors for bishopric users in Edge Functions"
    context: "Bishopric users always need to be available as actors for
      presiding and conducting. Manual creation is an extra step."
    decision: "Edge Functions create-invitation and update-user-role auto-insert
      meeting_actor records when role is 'bishopric'. Use SELECT+INSERT pattern
      to handle duplicates without requiring a unique constraint migration."
    consequences:
      - "Bishopric actors created automatically (better UX)"
      - "Name derived from email if not provided (may need manual correction)"
      - "Actor not deleted when role changes FROM bishopric (manual cleanup)"
```
