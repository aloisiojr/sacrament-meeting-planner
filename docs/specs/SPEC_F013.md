# F013 - Meeting Actors Management

## User Stories

| ID | As a | I want to | So that |
|----|------|-----------|---------|
| US-AGD-003 | Secretary | register and manage meeting actors (presidency, conduct, music) inline | select them quickly in future sundays |

## Acceptance Criteria

| ID | Given | When | Then |
|----|-------|------|------|
| AC-AGD-005 | clicks "Who presides" field | selector opens | list of actors with Preside role (includes Conduct); option to add new; option to delete |
| AC-AGD-006 | adds new actor inline | fills name and roles | actor created, selected in field, available for future sundays |
| AC-AGD-007 | deletes actor that is in existing agenda | confirms deletion | actor removed from list; name remains as snapshot in agendas |
| AC-AGD-008 | clicks "Recognize presence" field | selector opens | multi-select with Recognize role actors; can check/uncheck multiple |

## Actor Roles
- **Preside**: can preside the meeting
- **Conduct**: can conduct (implies can also preside)
- **Recognize**: can be recognized (visiting authorities, etc.)
- **Music**: can be pianist or conductor

## Inline Actor Management
- When clicking an actor field, selector shows:
  - List of existing actors filtered by required role
  - Search/filter field at top
  - "Add new actor" button at end of list
  - Trash icon next to each actor for delete
- "Add new actor" opens mini inline form: name + role checkboxes (Preside, Conduct, Recognize, Music)
- On save: actor created, automatically selected in field
- Roles are editable after creation
- An actor can have multiple roles simultaneously

## Edge Cases

| ID | Case | Expected Behavior |
|----|------|-------------------|
| EC-AGD-001 | Actor deleted with future agendas | Snapshot preserved; name stays, FK becomes NULL |
| EC-AGD-007 | can_conduct=true but can_preside=false in DB | App corrects: can_preside=true automatically |

## Technical Notes
- If can_conduct = true, can_preside is automatically true (enforced by application)
- Actors are per ward (ward_id FK)
- Actors are NOT members (separate entity)
- Deletion: confirmation dialog; name preserved as snapshot in existing agendas (FK -> NULL)
