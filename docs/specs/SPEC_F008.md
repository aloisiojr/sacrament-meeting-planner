# F008 - Speech Management & Assignment

## User Stories

| ID | As a | I want to | So that |
|----|------|-----------|---------|
| US-012 | Bishopric | view sundays with speeches, next sunday on top | consolidated view |
| US-013 | Bishopric | assign speaker and topic with dropdown arrows | members know what to speak about |
| US-014 | Secretary | change status by clicking LED or status text | bishopric tracks progress |
| US-015 | Bishopric | remove assignment | reassign another member |
| US-016 | Bishopric | infinite scroll without list disappearing | access to history |

## Acceptance Criteria

| ID | Given | When | Then |
|----|-------|------|------|
| AC-023 | navigates to Speeches tab | list rendered | sundays from 12 months past to 12 future; next sunday on top, no animation; each sunday with DateBlock (zero-padded) and 3 3D LEDs |
| AC-024 | Bishopric clicks Speaker field | modal opens | members sorted; on select, name shown, status changes to yellow, field with dropdown arrow |
| AC-025 | Bishopric clicks Topic field | modal opens | topics from active collections, format "Collection : Title", field with dropdown arrow |
| AC-026 | speech with assigned speaker | clicks LED or status text | modal with status options; LED changes color |
| AC-027 | speech with speaker | clicks X and confirms | speaker removed, status reverts to not-assigned (LED off), topic remains |
| AC-028 | scroll to end of list | reaches limit | +6 months future loaded smoothly, without disappearing |
| AC-029 | scroll to start of list | reaches limit | +6 months past loaded smoothly |

## Edge Cases

| ID | Case | Expected Behavior |
|----|------|-------------------|
| EC-003 | Simultaneous editing (rare) | Last-write-wins with updated_at |
| EC-CR010-1 | List not loaded when scroll attempted | Wait for load; show skeleton |
| EC-CR011-1 | Fast scroll exceeds loaded data | Loading at end without removing content |
| EC-CR011-2 | Network error loading more months | Discreet error message; data preserved |

## Business Rules
- RN-03: Each sunday has exactly 3 speeches (1st, 2nd, 3rd)
- RN-04: A member can have multiple speeches (no frequency limit)
- RN-05: Speech lifecycle: Not-assigned -> Assigned/Not-Invited -> Invited -> Confirmed | Gave Up
- RN-06: Initial window is 12 months past + 12 months future, +6 months on scroll
- RN-07: Speeches store speaker name as text (snapshot), not reference

## Technical Notes
- Labels: "1o Discurso", "2o Discurso", "3o Discurso" (Unicode U+00BA)
- Card header stays fixed position on expand/collapse
- Card scrolls smoothly to be fully visible on expand
- Speaker field with dropdown arrow on right
- Topic field with dropdown arrow on right
- Topic display format: "Collection : Title"
- Topics sorted alphabetically by concatenated string
- Status LED: pressable, opens status menu on click
- Past sundays: reduced opacity when collapsed
- Next sunday: primary border highlighted
- Year separators intercalated in list
- Lazy creation of speeches when expanding card
- Only Bishopric can assign/unassign speakers (Secretary cannot)
- Secretary can change status
- Observer: read-only
