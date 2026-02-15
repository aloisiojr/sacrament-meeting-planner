# F014 - Hymns Catalog & Import

## User Stories

| ID | As a | I want to | So that |
|----|------|-----------|---------|
| US-AGD-004 | Secretary | select hymns by number or title | find hymn quickly |
| US-AGD-009 | Admin | import complete hymnal via CSV per language | hymns available for all wards |

## Acceptance Criteria

| ID | Given | When | Then |
|----|-------|------|------|
| AC-AGD-009 | clicks "Opening hymn" field | selector opens | search field by number or title; list "Number -- Title" sorted by number |
| AC-AGD-010 | clicks "Sacrament hymn" field | selector opens | shows ONLY hymns with Sacramental=S; search by number or title |
| AC-AGD-027 | admin executes import-hymns | valid CSV (Language,Number,Title,Sacramental) | hymns imported for specified language |
| AC-AGD-028 | import-hymns with invalid CSV | executes script | detailed error with line/field; no hymns imported |
| AC-AGD-029 | import-hymns with existing language | executes script | hymns replaced for that language (upsert) |

## Edge Cases

| ID | Case | Expected Behavior |
|----|------|-------------------|
| EC-AGD-003 | Hymn removed from hymns table | FK becomes NULL; hymn field appears empty in agenda |
| EC-AGD-008 | Import-hymns with duplicate number in same language | Upsert: updates title/sacramental of existing hymn |

## Technical Notes
- Global table (no ward_id), ~300 hymns per language
- CSV format: `Lingua,Numero,Titulo,Sacramental(S/N)`
- Script: `pnpm import-hymns hymnal.csv`
- Upsert by (language, number)
- Stored as FK in agenda (not snapshot) - if hymn is removed, FK becomes NULL
- Hymn selector: search by number (e.g., "123") or title (e.g., "Conta as")
- Display: "Number -- Title" (e.g., "123 -- Conta as Bencaos")
- Sacramental hymn field: shows ONLY hymns with is_sacramental = true
- Other hymn fields: show all hymns of ward language
