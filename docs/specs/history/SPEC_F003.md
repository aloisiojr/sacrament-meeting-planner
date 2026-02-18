# F003 - Member Management (CRUD)

## User Stories

| ID | As a | I want to | So that |
|----|------|-----------|---------|
| US-001 | Secretary | access member management screen with search and listing | keep roster updated |
| US-002 | Secretary | search members with real-time filter | find a member quickly |
| US-003 | Secretary | add member (name + phone) | member is available for assignment |
| US-004 | Secretary | edit member with auto-save on close | keep data updated |
| US-005 | Secretary | delete member via swipe-to-reveal | keep speaker list updated |

## Acceptance Criteria

| ID | Given | When | Then |
|----|-------|------|------|
| AC-001 | user in Settings tab | clicks Members card | navigates to screen with search and alphabetically sorted listing |
| AC-002 | on members screen | types in search field | filters real-time (<=300ms), case-insensitive, ignoring accents |
| AC-003 | on members screen | clicks '+', fills data, clicks outside | member saved automatically with phone +xxyyyyyyyy |
| AC-004 | adding member | clicks outside without filling Name or Phone | cancellation confirmation dialog |
| AC-005 | member card expanded | changes name and clicks outside | changes saved automatically, no Save/Cancel buttons |
| AC-006 | editing member | tries to close with empty Name or Phone | error dialog, reverts to originals |
| AC-007 | member with 3 future speeches | clicks delete (via swipe) | dialog informs future speeches; confirm -> deletes, snapshots preserved |
| AC-008 | member without future speeches | clicks delete (via swipe) | simple confirmation dialog |

## Edge Cases

| ID | Case | Expected Behavior |
|----|------|-------------------|
| EC-001 | Member deleted with future speeches | Dialog informs quantity; on confirm: deletes, snapshots preserved |
| EC-005 | Empty members list | Informative message |
| EC-CR013-1 | Accidental swipe during vertical scroll | Minimum horizontal threshold (~20px) |
| EC-CR014-1 | Name cleared and clicks outside | Error dialog; value reverted |
| EC-CR014-2 | Auto-save fails | Error message; data kept in form |
| EC-015 | Secretary tries to assign | Field disabled |

## Technical Notes
- Swipe-to-reveal: react-native-gesture-handler + react-native-reanimated
- Only 1 card with revealed buttons at a time
- Tap on card does NOT open editing (swipe only)
- Observer: swipe disabled
- Edit card fields: Name (full width), Country Code (compact with emoji flag), Phone (full width)
- No Save/Cancel buttons - auto-save on blur
- Country code dropdown: ~195 countries, alphabetically sorted, emoji flags
- Clicking country code field does NOT close the card
- Name edit does NOT update past or future speeches (snapshot pattern)
- Bishopric also has member:write permission
