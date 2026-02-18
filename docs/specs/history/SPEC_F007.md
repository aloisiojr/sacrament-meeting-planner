# F007 - Sunday Type Management (Exceptions)

## User Stories

| ID | As a | I want to | So that |
|----|------|-----------|---------|
| US-011 | Secretary | select sunday type via dropdown in expanded card (Speeches/Home) with batch auto-assignment | special sundays configured without separate screen |
| US-CR020 | Secretary | select sunday type via dropdown in expanded card | configure exceptions without separate screen |

## Acceptance Criteria

| ID | Given | When | Then |
|----|-------|------|------|
| AC-020 | expanded sunday card (Speeches or Home) | selects exception in dropdown | type saved in DB; speech fields disappear; collapsed card shows exception text |
| AC-021 | sunday list loaded | sundays without entry in table | batch auto-assignment: "Speeches" for most; 1st Sun Jan-Mar,May-Sep,Nov-Dec -> "Testimony Meeting"; 1st Sun Apr/Oct -> "General Conference"; 2nd Sun Apr/Oct -> "Testimony Meeting"; all persisted |
| AC-022 | dropdown with exception selected | user changes to "Speeches" | entry updated; 3 empty speeches created immediately; speech fields appear |
| AC-022b | sunday with speakers/topics | user selects exception | dialog confirms deletion; confirm: speeches deleted; cancel: dropdown reverts |
| AC-022c | dropdown | user selects "Other" | dialog opens for custom reason + OK button; confirm: saves; cancel: dropdown reverts |
| AC-022d | Observer expands card | sees dropdown | dropdown visible but disabled (read-only) |

## Edge Cases

| ID | Case | Expected Behavior |
|----|------|-------------------|
| EC-004 | Exception selected on sunday with speeches | Dialog confirms deletion; on confirm, speeches deleted |
| EC-006 | 1st sunday on holiday | Auto-marks + allows change |
| EC-011 | Change exception to "Speeches" | 3 empty speeches created immediately |
| EC-CR019-1 | User changes auto-assigned value | Manual change respected and persisted; auto-assignment does NOT reapply (entry exists) |

## Technical Notes
- Dropdown options: Discursos, Reuniao de Testemunho, Conferencia Geral, Conferencia de Estaca, Conferencia de Ala, Apresentacao Especial da Primaria, Outro
- For "Other": reason field stores custom text typed by user
- "Discursos" is also stored in sunday_exceptions table (all sundays have an entry after batch auto-assignment)
- Auto-assignment runs on list load and on +6 months infinite scroll
- Batch auto-assignment persists immediately
- Dropdown position: top of expanded card, below header
- Bishopric and Secretary can edit; Observer: visible but disabled
