# F006 - General Collections & Import

## User Stories

| ID | As a | I want to | So that |
|----|------|-----------|---------|
| US-009 | Admin | import General Collections via CSV | curated topics for all wards |

## Acceptance Criteria

| ID | Given | When | Then |
|----|-------|------|------|
| AC-012 | collections visible | ward language set | only general collections of matching language shown |

## Technical Notes
- Admin script: `pnpm import-themes themes.csv`
- CSV format: `Idioma,Colecao,Titulo,Link`
- Script creates General Collections per language (if not existing)
- Creates topics within collections
- Collections appear automatically for wards of same language (inactive by default)
- Script displays summary: "Imported 3 collections (pt-BR: 2, en: 1), 45 topics"
- Script location: `/scripts/import-themes.ts` or `/server/scripts/import-themes.ts`
- General Collections are NOT editable by users (admin only via CSV)

## Data Model

### general_collections
Global collections per language, no ward_id. Imported via admin script.

### general_topics
Topics within general collections.

### ward_collection_config
Bridge between ward and general collections. `active` boolean field controls activation.
