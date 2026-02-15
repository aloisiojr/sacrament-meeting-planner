# F004 - Member Import/Export (CSV)

## User Stories

| ID | As a | I want to | So that |
|----|------|-----------|---------|
| US-006 | Secretary | download/upload CSV spreadsheet on mobile and web | bulk editing |

## Acceptance Criteria

| ID | Given | When | Then |
|----|-------|------|------|
| AC-009 | on import/export screen | clicks Download | CSV generated with Name and Full Phone; mobile uses sharing sheet |
| AC-010 | on import/export screen | uploads valid CSV | replaces all members, success message |
| AC-011 | on import/export screen | uploads invalid CSV | no changes, error with line/field |

## Edge Cases

| ID | Case | Expected Behavior |
|----|------|-------------------|
| EC-002 | Invalid spreadsheet upload | No changes + detailed error with line/field |
| EC-007 | Spreadsheet without phones | Upload rejected |

## Technical Notes
- CSV format: 2 columns: `Nome`, `Telefone Completo` (e.g., "+5511987654321")
- Upload is total overwrite: deletes ALL current members, inserts ALL from CSV
- Validations: required fields, phone format (+xxyyyyyyyy), no duplicates
- Web download: creates Blob + downloads as "membros.csv"
- Mobile download: expo-file-system + expo-sharing
- Web upload: file input accepts .csv
- Mobile upload: expo-document-picker
- Access: Settings tab > "Overwrite Members List" card > expand > Download/Upload buttons
