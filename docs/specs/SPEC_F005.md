# F005 - Ward Topics Management

## User Stories

| ID | As a | I want to | So that |
|----|------|-----------|---------|
| US-007 | Secretary | manage Topic Collections with toggle | control available topics |
| US-008 | Secretary | CRUD ward topics with auto-save and swipe | personalized topics |

## Acceptance Criteria

| ID | Given | When | Then |
|----|-------|------|------|
| AC-012 | in Topics section | views collections | Ward Topics first, active Generals (recent), inactive Generals |
| AC-013 | inactive general collection | checks checkbox | activated, topics available for selection |
| AC-014 | active collection with topics in future speeches | unchecks | dialog warns; confirm -> deactivated, snapshots preserved |
| AC-015 | Ward Topics expanded | fills title and clicks outside | topic saved automatically, no Save/Cancel buttons |
| AC-016 | existing topic | changes title and clicks outside | changes saved automatically |
| AC-017 | topic card via swipe | clicks trash and confirms | topic removed, snapshots preserved |
| AC-044 | topic in future speeches | clicks remove (via swipe) | dialog informs quantity; confirm -> removed |

## Edge Cases

| ID | Case | Expected Behavior |
|----|------|-------------------|
| EC-009 | Deactivate collection with assigned topics | Dialog warns; snapshots preserved |
| EC-010 | Change language with active collections | Dialog warns; deactivates previous |
| EC-012 | Add topic without title | Error + cancel option |
| EC-013 | Delete topic used in speeches | Snapshot preserved |

## Technical Notes
- Settings > Topics card expands inline showing collections list
- Collection ordering: (1) Ward Topics (always first), (2) Active Generals (newest first), (3) Inactive Generals (newest first)
- Each collection has checkbox for active/inactive
- Ward Topics is expandable (shows topic list); General Collections are not expandable (just checkbox)
- Topic card: swipe-to-reveal with edit/delete buttons; tap does NOT open editing
- Topic edit: Title (full width, required), Link (full width, optional); no Save/Cancel buttons
- Deactivating collection with topics in future speeches: dialog with count
- General Collections filtered by ward language
