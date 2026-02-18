# F015 - Prayer Selection

## User Stories

| ID | As a | I want to | So that |
|----|------|-----------|---------|
| US-AGD-005 | Secretary | define who gives prayers (ward member or custom name) | prayers designated without registering visitors |

## Acceptance Criteria

| ID | Given | When | Then |
|----|-------|------|------|
| AC-AGD-011 | clicks prayer field (opening or closing) | selector opens | list of all ward members sorted alphabetically + "Different name" field for custom name |
| AC-AGD-012 | selects custom name for prayer | types name and confirms | name saved in agenda; NOT persisted in members or actors |

## Behavior Details
- On clicking prayer field (opening or closing):
  - Shows list of all ward members sorted alphabetically
  - Search field at top (case-insensitive, accent-insensitive)
  - "Different name" field at end of list
- When selecting a ward member:
  - Name stored as snapshot + FK to members table
- When typing a custom name:
  - Name stored ONLY in that sunday's agenda (field `*_prayer_name`)
  - NOT persisted in members table or actors table

## Edge Cases

| ID | Case | Expected Behavior |
|----|------|-------------------|
| EC-AGD-002 | Member used in prayer and deleted | Name remains in agenda as snapshot |

## Technical Notes
- Prayer fields: opening_prayer_member_id + opening_prayer_name, closing_prayer_member_id + closing_prayer_name
- If member: FK points to members, name is snapshot
- If custom: FK is NULL, name contains typed text
