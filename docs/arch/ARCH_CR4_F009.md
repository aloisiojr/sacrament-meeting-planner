# ARCH_CR4_F009 - Create pnpm import-hymns CLI Script

```yaml
type: arch
version: 1
status: complete
module: ImportHymnsScript
features: [CR-51]
spec: PRODUCT_SPECIFICATION (RF-23.1)
```

## Overview

```yaml
goal: "Create CLI script to import hymns from CSV into Supabase hymns table"
principles:
  - "Standalone Node.js script -- no React Native dependencies"
  - "Own Supabase client with service_role key (bypasses RLS)"
  - "All-or-nothing: validate entire CSV before any DB writes"
  - "Upsert by (language, number) unique constraint"
  - "CSV language mapping: PT-BR->pt-BR, EN-US->en, ES-ES->es"
```

## Diagram

```
  scripts/import-hymns.ts
  ========================

  ┌──────────┐    ┌──────────────┐    ┌──────────────┐
  │  CSV file │───>│  Parse & Map │───>│  Validate    │
  │  (stdin)  │    │  rows        │    │  all rows    │
  └──────────┘    └──────────────┘    └──────┬───────┘
                                             │
                                    ┌────────▼────────┐
                                    │ Any errors?      │
                                    │ YES: print errors│
                                    │      exit(1)     │
                                    │ NO:  upsert all  │
                                    └────────┬────────┘
                                             │
                                    ┌────────▼────────┐
                                    │ Supabase upsert  │
                                    │ (service_role)   │
                                    │ ON CONFLICT       │
                                    │ (language,number) │
                                    └────────┬────────┘
                                             │
                                    ┌────────▼────────┐
                                    │ Print summary    │
                                    │ "Imported X hymns│
                                    │  for language Y" │
                                    └─────────────────┘
```

## Script Structure

```typescript
// NEW FILE: scripts/import-hymns.ts

// Dependencies: @supabase/supabase-js (already in deps), node:fs, node:path
// No new npm dependencies needed.

// --- Language Mapping ---
const LANGUAGE_MAP: Record<string, string> = {
  'PT-BR': 'pt-BR',
  'EN-US': 'en',
  'ES-ES': 'es',
};

// --- CSV Format ---
// Header: Lingua,Numero,Titulo,Sacramental
// Sacramental values: S or N (case-insensitive)
// Example: PT-BR,1,O Senhor Mandou,N

// --- Validation Rules ---
// 1. File must exist and be readable
// 2. First row must be header (Lingua,Numero,Titulo,Sacramental)
// 3. Each data row:
//    - Lingua: must be one of PT-BR, EN-US, ES-ES
//    - Numero: must be positive integer
//    - Titulo: must be non-empty string (trimmed)
//    - Sacramental: must be S or N (case-insensitive)
// 4. All rows must have exactly 4 fields
// 5. On any validation error: print ALL errors with line numbers, exit(1)
// 6. No DB writes if any row is invalid

// --- Supabase Client ---
// Uses env vars: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
// NOT the app's supabase.ts (which uses AsyncStorage + anon key)

// --- Upsert Strategy ---
// Batch upsert: supabase.from('hymns').upsert(rows, { onConflict: 'language,number' })
// Chunk into batches of 500 to avoid payload limits

// --- Exit Codes ---
// 0: success
// 1: validation error or DB error
// 2: missing arguments or env vars

interface HymnRow {
  language: string;
  number: number;
  title: string;
  is_sacramental: boolean;
}
```

## package.json Change

```yaml
file: package.json
change: |
  Add to "scripts":
    "import-hymns": "npx tsx scripts/import-hymns.ts"

  Add to "devDependencies":
    "tsx": "^4.19.0"

note: |
  tsx is needed because the project uses TypeScript and the script
  imports @supabase/supabase-js. tsx runs .ts files directly via
  esbuild without needing a separate compile step.
  Alternative: npx ts-node --esm, but tsx is faster and simpler.
```

## Environment Variables

```yaml
required:
  - SUPABASE_URL: "Supabase project URL (same as EXPO_PUBLIC_SUPABASE_URL)"
  - SUPABASE_SERVICE_ROLE_KEY: "Service role key (NOT anon key -- needed to bypass RLS for INSERT/UPDATE)"

note: |
  The script must NOT use EXPO_PUBLIC_SUPABASE_ANON_KEY because:
  1. The hymns table has RLS with only SELECT for authenticated users
  2. INSERT/UPDATE requires service_role to bypass RLS
  3. The script runs outside the app context (no auth session)
```

## File Impact Summary

| File | CR | Change Type |
|------|-----|-------------|
| `scripts/import-hymns.ts` | CR-51 | **NEW**: CLI script (~120 lines) |
| `package.json` | CR-51 | MODIFY: add "import-hymns" script + tsx devDependency |

## Data Model

```yaml
table: hymns
columns:
  - id: UUID PK (auto-generated)
  - language: TEXT NOT NULL
  - number: INTEGER NOT NULL
  - title: TEXT NOT NULL
  - is_sacramental: BOOLEAN NOT NULL DEFAULT false
unique_constraint: (language, number)
rls: SELECT only for authenticated; INSERT/UPDATE requires service_role
migrations: none needed (table already exists)
```

## Risk Assessment

```yaml
risks:
  - id: R-1
    severity: LOW
    description: "Large CSV (1000+ rows) could hit Supabase payload limit"
    mitigation: "Batch upsert in chunks of 500 rows"

  - id: R-2
    severity: LOW
    description: "CSV encoding issues (UTF-8 with BOM, Latin-1)"
    mitigation: "Read file as UTF-8. Strip BOM if present."

  - id: R-3
    severity: LOW
    description: "Commas in hymn titles could break CSV parsing"
    mitigation: "Titles should not contain commas in this dataset.
      If needed, support quoted fields per RFC 4180."
```
