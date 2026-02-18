# F016 - Presentation Mode

## User Stories

| ID | As a | I want to | So that |
|----|------|-----------|---------|
| US-AGD-006 | Any user | open Presentation Mode on Sunday | follow the meeting in real time |
| US-AGD-007 | Any user | navigate between meeting sections in Presentation Mode | see each part clearly |

## Acceptance Criteria

| ID | Given | When | Then |
|----|-------|------|------|
| AC-AGD-019 | it is Sunday | opens Home tab | "Start Sacrament Meeting" button visible at top |
| AC-AGD-020 | it is NOT Sunday | opens Home tab | button NOT visible |
| AC-AGD-021 | clicks "Start Meeting" | screen opens | full-screen with sunday agenda; Welcome section expanded; others collapsed |
| AC-AGD-022 | Presentation Mode (normal meeting) | screen rendered | 4 cards: Welcome, Designations, Speeches 1+2, Last Speech |
| AC-AGD-023 | Presentation Mode (special meeting) | screen rendered | 3 cards: Welcome, Designations, Special Meeting |
| AC-AGD-024 | clicks collapsed card | card clicked | previous collapses, clicked expands; collapsed cards always visible |
| AC-AGD-025 | expanded card content exceeds space | card rendered | internal scroll in card; collapsed cards remain visible |
| AC-AGD-026 | any field in Presentation Mode | tries to interact | fields read-only, no editing allowed |

## Accordion Layout
- Exactly 1 card expanded at a time
- Collapsed cards before expanded: stacked at top of screen
- Collapsed cards after expanded: stacked at bottom
- All collapsed cards ALWAYS visible (never leave screen)
- Expanded card occupies space between collapsed ones
- If content exceeds available space: internal scroll
- Starts with WELCOME section expanded
- Click collapsed -> previous collapses, clicked expands (smooth animation)

### Normal Meeting Cards (4)
1. WELCOME & ANNOUNCEMENTS: presiding, conducting, recognized, announcements, pianist, conductor, opening hymn (number + title), opening prayer
2. DESIGNATIONS & SACRAMENT: sustaining, baby blessing, baptism confirmation, stake announcements, sacrament hymn (number + title)
3. FIRST & SECOND SPEECH: 1st speaker, 2nd speaker, special presentation OR intermediate hymn
4. LAST SPEECH: 3rd speaker, closing hymn (number + title), closing prayer

### Special Meeting Cards (3)
1. WELCOME & ANNOUNCEMENTS: identical
2. DESIGNATIONS & SACRAMENT: identical
3. SPECIAL MEETING: meeting type, closing hymn (number + title), closing prayer

## Edge Cases

| ID | Case | Expected Behavior |
|----|------|-------------------|
| EC-AGD-006 | Presentation Mode with empty agenda | Shows cards with empty fields/placeholders; does not block access |

## Technical Notes
- Button visible only on Sunday (00:00-23:59), all roles
- 100% read-only (no editing)
- All data comes from previously configured agenda in Agenda tab
- Close/back button in header
- Smooth animation on card transitions
