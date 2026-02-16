# PLAN_CR4_F009 - Import Hymns CLI Script

## PLAN_SUMMARY

```yaml
type: plan_summary
total_steps: 1
parallel_tracks: 1
estimated_commits: 1
coverage:
  acceptance_criteria: 0/0
  edge_cases: 0/0
critical_path:
  - "STEP-01: Create pnpm import-hymns CLI script (CR-51)"
main_risks:
  - "Script needs Supabase connection (env variables)"
```

## PLAN

```yaml
type: plan
version: 1
status: draft
features: ["F009"]
spec: "SPEC_CR4_F009"

goal: "Create a CLI script to import hymns from CSV into the Supabase hymns table"

strategy:
  order: "Single step: create script + add pnpm script entry"
  commit_strategy: "1 commit, conventional commit message"
  test_strategy: "Unit tests for CSV parsing and validation logic"

steps:
  - id: STEP-01
    description: "Create scripts/import-hymns.ts: reads CSV file (format: Lingua,Numero,Titulo,Sacramental), validates rows, upserts into hymns table by (language, number). Add pnpm script in package.json. Show summary on success. Show errors with line numbers on failure."
    files:
      - "scripts/import-hymns.ts"
      - "package.json"
    dependencies: []
    parallelizable_with: []
    done_when:
      - "Script executable via 'pnpm import-hymns <file.csv>'"
      - "CSV format: Lingua,Numero,Titulo,Sacramental(S/N)"
      - "Upsert by (language, number)"
      - "Summary shows: 'Imported X hymns for language Y'"
      - "Invalid CSV shows error with line/field"
      - "Invalid CSV aborts without partial import"
    tests:
      - type: unit
        description: "Verify CSV parsing. Verify validation errors. Verify upsert logic."
    covers:
      acceptance_criteria: []
      edge_cases: []
    risks:
      - risk: "Script needs Supabase connection (env variables)"
        mitigation: "Use dotenv to load SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env"

validation:
  - cr_id: CR-51
    how_to_verify: "Run 'pnpm import-hymns sample.csv' with valid CSV -> hymns upserted. Run with invalid CSV -> errors shown with line numbers, no partial import."
    covered_by_steps: ["STEP-01"]
```

## Dependency Graph

```
STEP-01 (Create import-hymns script) -- no dependencies
```
