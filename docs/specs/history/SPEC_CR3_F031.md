# Change Requests Batch 3 - Timezone Selector Spec (SPEC_CR3_F031)

Feature: F031 - Timezone Selector UI Spec
Type: Documentation-only (no code changes -- formalizes existing implementation)

---

## SPEC_SUMMARY

```yaml
type: spec_summary
goal: "Formalize the existing timezone selector UI implementation into the spec documentation (CR-41)"
in_scope:
  - "CR-41: Document the timezone selector screen UI details in SPEC_F002.md"
  - "CR-41: Verify the existing implementation matches the documented behavior"
out_of_scope:
  - "Code changes to the timezone selector (implementation is already correct)"
  - "Changes to the timezone list content"
  - "Changes to the ward management or push notification specs beyond timezone references"
main_risks:
  - "None (documentation-only changes to formalize existing, working implementation)"
ac_count: 7
edge_case_count: 2
has_open_questions: false
has_unconfirmed_assumptions: false
```

---

## CR-41: Define Timezone Selector UI Details

- **Type:** SPEC MISSING (Documentation-only)
- **Description:** The timezone selector (RF-31, SPEC.final.md section 7.10.1) does not have a dedicated derived spec. It is mentioned in SPEC_F017 (push notifications) and SPEC_F002 (ward management) but there is no definition of how the selector works in the UI. The current implementation (`src/app/(tabs)/settings/timezone.tsx`) already provides a fully functional selector. This CR formalizes the existing implementation into the spec.

### Current State (Code Investigation)

**`timezone.tsx` (300 lines, fully functional):**
The implementation includes all expected features:

1. **Header** (lines 182-192): Back button (`common.back`), screen title (`timezoneSelector.title`), spacer for alignment
2. **Current timezone display** (lines 194-203): Card showing current timezone value from ward record via Supabase query
3. **Search field** (lines 205-215): TextInput for filtering the timezone list (case-insensitive substring match)
4. **Timezone list** (lines 217-223): FlatList of IANA timezone strings, 62 entries covering Africa, Americas, Asia, Atlantic, Australia, Europe, Pacific
5. **Selection** (lines 143-152):
   - Tapping a different timezone: saves via `useMutation` to Supabase `wards.timezone`, logs action, shows success alert, navigates back
   - Tapping current timezone: navigates back without saving (no-op)
6. **Error handling** (lines 132-134): On save failure, shows error alert via `t('timezoneSelector.saveFailed')`, user stays on screen
7. **Visual indicator** (lines 156-177): Selected timezone row has `surfaceVariant` background color and checkmark icon

**Timezone list coverage (62 entries):**
- Africa: 4 (Cairo, Johannesburg, Lagos, Nairobi)
- Americas: 19 (Anchorage, Buenos_Aires, Bogota, Chicago, Denver, Edmonton, Halifax, Lima, Los_Angeles, Manaus, Mexico_City, Montevideo, New_York, Phoenix, Recife, Santiago, Sao_Paulo, St_Johns, Toronto, Vancouver)
- Asia: 14 (Almaty, Bangkok, Colombo, Dhaka, Dubai, Hong_Kong, Jakarta, Karachi, Kolkata, Manila, Seoul, Shanghai, Singapore, Taipei, Tokyo)
- Atlantic: 1 (Reykjavik)
- Australia: 5 (Adelaide, Brisbane, Melbourne, Perth, Sydney)
- Europe: 13 (Amsterdam, Berlin, Brussels, Istanbul, Lisbon, London, Madrid, Moscow, Paris, Rome, Stockholm, Warsaw, Zurich)
- Pacific: 3 (Auckland, Fiji, Honolulu)

### Acceptance Criteria

- AC-41.1: Given the SPEC_F002.md (Ward Management), when reading timezone configuration, then it includes a section describing the timezone selector screen UI with all its elements (back button, title, current timezone, search, list, selection behavior). Priority: must.
- AC-41.2: Given the timezone selector screen, when loaded, then it displays: (a) back button in header, (b) screen title, (c) current timezone highlighted in a card, (d) search field, (e) scrollable FlatList of IANA timezone strings. Priority: must.
- AC-41.3: Given the user types in the search field, when characters are entered, then the list filters to show only timezones matching the search text (case-insensitive substring match using `String.includes()`). Priority: must.
- AC-41.4: Given the user taps a timezone different from the current, when tapped, then it saves to the ward record via Supabase, logs the action, shows a success alert, and navigates back. Priority: must.
- AC-41.5: Given the user taps the currently selected timezone, when tapped, then it navigates back without saving (no-op, no API call). Priority: must.
- AC-41.6: Given a save failure (network error, Supabase error), when the mutation errors, then an error alert is shown and the user stays on the timezone selector screen. Priority: must.
- AC-41.7: Given the timezone list, when rendered, then the currently selected timezone row has a distinct background color (`surfaceVariant`) and a checkmark icon. Priority: must.

### Edge Cases

- EC-41.1: The timezone list covers major time zones for all regions where the app is expected to be used. The current 62-entry list covers Americas, Europe, Asia, Africa, Oceania, and Atlantic. This is sufficient for the target audience.
- EC-41.2: The default timezone for new wards depends on the ward's language, configured during ward creation (pt-BR -> America/Sao_Paulo, en -> America/New_York, es -> America/Mexico_City). This default is set at ward creation time, not in the timezone selector itself.

### Files Impacted

| File | Change Type | Description |
|------|-------------|-------------|
| `docs/specs/SPEC_F002.md` | Modify | Add timezone selector UI section describing screen elements, search, selection behavior, and error handling |

### Files NOT Changed (Verified Correct)

| File | Reason |
|------|--------|
| `src/app/(tabs)/settings/timezone.tsx` | Implementation is already complete and functional -- no code changes needed |
| `docs/SPEC.final.md` | Section 7.10.1 already mentions the timezone selector; adding details to SPEC_F002 is sufficient |

---

## Spec Content to Add to SPEC_F002.md

```markdown
### Timezone Selector Screen

The timezone selector is accessed via Settings > Timezone. It allows the user to change the ward's timezone, which affects push notification scheduling and date display.

**Screen Elements:**
1. Header: back button (left), screen title (center), spacer (right)
2. Current timezone card: displays the currently configured timezone for the ward
3. Search field: filters the timezone list in real-time (case-insensitive substring match)
4. Timezone list: scrollable FlatList of IANA timezone strings, sorted alphabetically
   - Selected timezone row has distinct background and checkmark icon
   - 62 entries covering: Africa (4), Americas (19), Asia (14), Atlantic (1), Australia (5), Europe (13), Pacific (3)

**Selection Behavior:**
- Tap different timezone: saves to ward record, logs action, success alert, navigates back
- Tap current timezone: navigates back without saving (no-op)
- Save failure: error alert shown, user stays on screen

**Default timezone for new wards:**
- pt-BR: America/Sao_Paulo
- en: America/New_York
- es: America/Mexico_City
```

---

## Assumptions

```yaml
assumptions:
  - id: A-CR41-1
    description: "The current timezone.tsx implementation is complete and functional -- no code changes are needed"
    confirmed: true
    default_if_not_confirmed: "N/A -- verified by reading the complete 300-line implementation"

  - id: A-CR41-2
    description: "Adding the timezone selector spec to SPEC_F002.md (Ward Management) is the correct location, since timezone is a ward-level setting"
    confirmed: true
    default_if_not_confirmed: "Add to SPEC_F002.md under ward configuration section"

  - id: A-CR41-3
    description: "The 62-entry timezone list is sufficient and does not need to be expanded"
    confirmed: true
    default_if_not_confirmed: "Current list covers all major regions; can be expanded in future CRs if needed"
```

---

## Open Questions

```yaml
open_questions: []
```

No open questions. This CR is purely documentation -- formalizing an already-correct and fully-tested implementation into the spec. The defaults from SPEC_CR3.md are accepted.

---

## Definition of Done

- [ ] SPEC_F002.md contains a "Timezone Selector Screen" section with UI elements, search behavior, selection behavior, and error handling
- [ ] The documented behavior matches the actual implementation in `timezone.tsx` (verified by code reading)
- [ ] No code changes are made (documentation-only CR)
