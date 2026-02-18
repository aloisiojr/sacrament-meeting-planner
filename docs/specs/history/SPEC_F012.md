# F012 - Meeting Agenda Management

## User Stories

| ID | As a | I want to | So that |
|----|------|-----------|---------|
| US-AGD-001 | Secretary | configure full sunday agenda (presiding, conducting, hymns, prayers) in Agenda tab | sacrament meeting is organized |
| US-AGD-002 | Secretary | assign speakers directly from Agenda tab | no need to switch between tabs |
| US-AGD-008 | Secretary | fill special meeting agenda (testimony/primary) | meetings without speeches also have agenda |

## Acceptance Criteria

| ID | Given | When | Then |
|----|-------|------|------|
| AC-AGD-001 | user navigates to Agenda tab | list rendered | infinite scroll with sundays (12 months past + 12 future); sundays with Gen. Conf./Stake Conf./Other appear as non-expandable cards with yellow label |
| AC-AGD-002 | clicks on a sunday in Agenda tab | form opens | agenda created automatically (lazy creation) with all fields empty |
| AC-AGD-003 | normal meeting agenda form | sections visible | 4 sections: Welcome, Designations/Sacrament, 1st+2nd Speech, Last Speech |
| AC-AGD-004 | special meeting agenda form | sections visible | 3 sections: Welcome, Designations/Sacrament, Special Meeting; meeting type auto-filled |
| AC-AGD-013 | 1st Speech field without assignment | clicks field | opens member selector; on select, updates speeches table with status assigned_confirmed |
| AC-AGD-014 | Secretary assigns speaker via Agenda | selects member | speeches.status = assigned_confirmed; syncs with Speeches tab |
| AC-AGD-015 | marks "Special presentation" = yes | toggle activated | description field appears; intermediate hymn hidden |
| AC-AGD-016 | marks "Special presentation" = no | toggle deactivated | intermediate hymn field appears; description hidden |
| AC-AGD-017 | Observer opens Agenda tab | form rendered | all fields read-only (disabled) |
| AC-AGD-018 | edits past sunday agenda | changes fields | saves normally (no temporal restriction) |

## Normal Meeting Form (4 sections)

### Section: Welcome & Announcements
- Who presides: actor selector (Preside role)
- Who conducts: actor selector (Conduct role)
- Recognize presence: multi-select actors (Recognize role)
- Announcements: free text multiline
- Pianist: actor selector (Music role)
- Conductor: actor selector (Music role)
- Opening hymn: search by number or title (all hymns of ward language)
- Opening prayer: member selector OR custom name field

### Section: Designations & Sacrament
- Sustaining/releasing: free text multiline
- Baby blessing: toggle + text field for names
- Baptism confirmation: toggle + text field for names
- Stake announcements: toggle
- Sacrament hymn: search (ONLY sacramental hymns)

### Section: First & Second Speech
- 1st Speech: from speeches table (editable, on assign status -> assigned_confirmed)
- 2nd Speech: from speeches table (editable, on assign status -> assigned_confirmed)
- Special presentation: toggle + description
- Intermediate hymn: visible ONLY if special presentation = no

### Section: Last Speech
- 3rd Speech: from speeches table (editable, on assign status -> assigned_confirmed)
- Closing hymn: search
- Closing prayer: member selector OR custom name

## Special Meeting Form (3 sections)
Same Welcome and Designations sections + Special Meeting section:
- Meeting type: auto from exception (read-only)
- Closing hymn: search
- Closing prayer: member selector OR custom name

## Edge Cases

| ID | Case | Expected Behavior |
|----|------|-------------------|
| EC-AGD-004 | Normal sunday becomes exception (Gen. Conf.) with filled agenda | Agenda stays in DB but sunday disappears from Agenda list; data preserved if exception removed |
| EC-AGD-005 | Normal sunday becomes "Testimony Meeting" with normal agenda | Agenda switches to special layout; speech/intermediate hymn fields hidden but data preserved |
| EC-AGD-009 | Secretary assigns via Agenda, then Bishopric changes via Speeches | Speeches tab prevails (last-write-wins); Agenda reflects current speeches state |
| EC-AGD-010 | Sunday with configured agenda stops being testimony/primary exception | Agenda switches to normal layout; speech fields reappear with speeches data |

## Technical Notes
- Tabs: Home, Agenda, Speeches, Settings (4 tabs)
- Agenda tab is second tab
- EXCEPTION: Both Bishopric AND Secretary can assign speakers in Agenda tab (unlike Speeches tab where only Bishopric can)
- Topic is NOT visible/editable in Agenda tab
- No fields are required - all can be empty
- Auto-save on all field changes (text inputs use debounce ~500ms before saving)
- Past agendas are editable (no temporal restriction)
- Sundays with exceptions that don't have sacrament meeting (Gen. Conf., Stake Conf., Other) appear as non-expandable cards with yellow exception label
- Sundays with Testimony Meeting, Ward Conference, or Primary Presentation DO appear (special format)
