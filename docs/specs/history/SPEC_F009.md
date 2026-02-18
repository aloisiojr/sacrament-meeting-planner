# F009 - Home Tab

## User Stories

| ID | As a | I want to | So that |
|----|------|-----------|---------|
| US-017 | Any user | sync between tabs in < 5s | up-to-date information |
| US-018 | Any user | see next 3 sundays on Home with stable cards | quick overview |
| US-019 | Bishopric | see next pending assignments | know where to act |
| US-020 | Secretary | manage invitations via WhatsApp | efficient invitations |

## Acceptance Criteria

| ID | Given | When | Then |
|----|-------|------|------|
| AC-031 | opens Home tab | next 3 sundays section | 3 cards with DateBlock on left and 3D LEDs on right; header fixed on expand; auto-scroll for visibility |
| AC-032 | Bishopric expands card | card expanded | can assign speakers/topics and change status |
| AC-033 | Secretary expands card | card expanded | can only change status |
| AC-034 | Observer expands card | card expanded | view only |
| AC-035 | Bishopric, all 9 speeches assigned | Home rendered | "Next assignments" section with next pending sunday |
| AC-036 | all assignments resolved | Home updates | section disappears |
| AC-037 | Secretary on Home | invitations section | list of Not-Invited and Invited, sorted by date |
| AC-038 | Not-Invited item | clicks action | opens WhatsApp, status -> Invited |
| AC-039 | Invited item | clicks action | options: WhatsApp, Confirmed, Gave Up |

## Sections by Role

### All roles: "Next 3 Sundays"
- 3 collapsed cards: DateBlock left, 3 3D LEDs right
- Sundays with exceptions show reason text instead of LEDs
- Card expands on click, content appears BELOW fixed header
- Sunday type dropdown at top of expanded card

### Bishopric only: "Next Assignments"
- Appears when all 9 speeches of next 3 sundays are assigned (speaker + topic + status != not_assigned/gave_up)
- Shows 4th sunday (or first after next 3 with at least one not_assigned/gave_up speech)
- Disappears when no more pending assignments

### Secretary only: "Invitation Management"
- List of assignments with status "Assigned/Not-Invited" or "Assigned/Invited"
- Each item shows: date (compact: "18 FEB"), speech number, action button
- Sorted by date (closest first)

## Technical Notes
- Presentation Mode button visible only on Sundays (00:00-23:59) at top of Home
- All 3 roles can see it
