# Review: CR4-F009 Import Hymns Script (CR-51)

**Reviewer:** devteam-reviewer
**Date:** 2026-02-16
**Verdict:** APPROVED

## Files Reviewed

| File | Status |
|------|--------|
| `scripts/import-hymns.ts` | NEW - 195 lines |
| `package.json` | MODIFIED - script entry + tsx devDependency |
| `src/__tests__/cr004-f009-import-hymns.test.ts` | NEW - 53 tests, all passing |

## Architecture Compliance

| ARCH Requirement | Status | Notes |
|-----------------|--------|-------|
| CSV format: `Lingua,Numero,Titulo,Sacramental` | OK | `EXPECTED_HEADER` constant matches spec |
| Language mapping PT-BR/EN-US/ES-ES | OK | `LANGUAGE_MAP` has all 3 entries with correct targets |
| All-or-nothing validation | OK | Collects all errors, `main()` checks `errors.length > 0` before any DB writes |
| Upsert by (language, number) | OK | `onConflict: 'language,number'`, `ignoreDuplicates: false` |
| Batch size 500 | OK | `BATCH_SIZE = 500`, used in upsert loop |
| Exit code 0 = success | OK | Implicit on normal completion |
| Exit code 1 = validation/DB error | OK | Used after validation failures and DB errors |
| Exit code 2 = missing args/env | OK | Used for missing env vars, missing CSV path, file not found |
| Summary grouped by language | OK | `countByLanguage` map, sorted output |
| BOM stripping | OK | `content.replace(/^\uFEFF/, '')` at line 47 |
| Supabase client with service_role key | OK | Uses `SUPABASE_SERVICE_ROLE_KEY`, not anon key |
| package.json script entry | OK | `"import-hymns": "npx tsx scripts/import-hymns.ts"` |
| tsx devDependency | OK | `"tsx": "^4.19.0"` in devDependencies |

## Security

| Check | Status | Notes |
|-------|--------|-------|
| Env vars not logged | OK | `supabaseUrl` and `supabaseKey` are never printed/logged |
| Service key handling | OK | Key is only passed to `createClient()`, never exposed |
| No ANON_KEY usage | OK | Script does not reference `SUPABASE_ANON_KEY` at all |
| Auth options | OK | `autoRefreshToken: false, persistSession: false` -- appropriate for CLI script |

## Edge Cases

| Edge Case | Status | Notes |
|-----------|--------|-------|
| Empty CSV | OK | Returns error "CSV file is empty" |
| Header-only CSV | OK | Returns error "CSV must have at least one data row" |
| Wrong header | OK | Returns descriptive error with expected vs actual |
| BOM encoding | OK | Stripped before parsing |
| Windows line endings (CRLF) | OK | `\r` stripped per line at line 48 |
| Commas in titles | NOTED | Naive `split(',')` will break titles with commas. ARCH R-3 acknowledges this as LOW risk and notes the dataset should not have commas. Acceptable for current scope. |
| Invalid language codes | OK | Validated against `LANGUAGE_MAP` keys |
| Non-integer numbers | OK | `parseInt` + `String(numero) !== rawNumero` catches floats, negatives, non-numeric |
| Zero/negative numbers | OK | `numero <= 0` check |
| Empty title | OK | Checked explicitly |
| Invalid sacramental values | OK | Only S/N accepted (case-insensitive) |
| Wrong field count | OK | `cols.length !== 4` check |

## Findings

### F-1: parseAndValidateCsv returns valid rows alongside errors (INFO)

**Location:** `scripts/import-hymns.ts:107-114`

The function adds valid rows to the `rows` array even when other rows have errors. The all-or-nothing guarantee is enforced in `main()` by checking `errors.length > 0` before any DB writes. This is correct behavior -- the test at line 179 documents this intentional design. The separation of parsing from the abort decision is clean.

### F-2: Direct run detection heuristic (INFO)

**Location:** `scripts/import-hymns.ts:189`

```typescript
const isDirectRun = process.argv[1]?.includes('import-hymns');
```

This uses a string match on `process.argv[1]` rather than `import.meta` or `require.main`. This works reliably for the `npx tsx scripts/import-hymns.ts` invocation path and for test imports. It is a pragmatic approach given that `tsx` does not support `import.meta.main`.

### F-3: Commas in titles not supported (INFO)

**Location:** `scripts/import-hymns.ts:73`

The CSV parser uses naive `split(',')` without RFC 4180 quoted field support. This is documented in ARCH R-3 as a known limitation with LOW severity. The hymn dataset does not contain commas in titles, so this is acceptable.

## Test Coverage

53 tests covering:
- Script existence and shebang format
- CSV header validation
- Language mapping (all 3 + unknown rejection)
- Sacramental parsing (S/N case-insensitive, rejection of invalid values)
- All-or-nothing validation behavior
- Exit codes (0, 1, 2)
- Batch size constant and usage
- BOM stripping (functional + source check)
- Summary format and grouping
- package.json configuration
- Supabase client configuration (service_role, no anon key)
- onConflict configuration
- Functional parsing tests (multi-language, negatives, zero, float, empty title, wrong field count, CRLF, header-only, line numbers)

All 53 tests pass.

## Verdict

**APPROVED** -- Implementation is clean, well-structured, and fully compliant with ARCH_CR4_F009.md. Security handling is correct (no credential leakage). All edge cases documented in the ARCH are covered. Test coverage is thorough at 53 tests. No blocking issues found.
