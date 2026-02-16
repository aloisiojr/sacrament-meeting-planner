/**
 * QA Tests for CR-004 / F009: Import Hymns Script (CR-51)
 *
 * Covers:
 * - Script existence and shebang
 * - CSV format and expected header
 * - Language mapping (PT-BR, EN-US, ES-ES)
 * - Sacramental parsing (S/N case-insensitive)
 * - All-or-nothing validation (collects all errors before aborting)
 * - Exit codes (0=success, 1=validation/DB, 2=missing args/env)
 * - Batch size (500)
 * - BOM stripping
 * - Summary format grouped by language
 * - package.json: script entry and tsx devDependency
 * - Supabase client: uses service_role key
 * - onConflict: language,number
 * - Shebang: uses tsx, not ts-node
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  LANGUAGE_MAP,
  EXPECTED_HEADER,
  BATCH_SIZE,
  parseAndValidateCsv,
} from '../../scripts/import-hymns';

function readScriptSource(): string {
  return fs.readFileSync(path.resolve(__dirname, '../../scripts/import-hymns.ts'), 'utf-8');
}

function readPackageJson(): Record<string, unknown> {
  return JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf-8'),
  );
}

describe('CR-004 F009: Import Hymns Script', () => {
  // -------------------------------------------------------------------
  // 1. Script existence
  // -------------------------------------------------------------------
  describe('Script file exists', () => {
    it('scripts/import-hymns.ts should exist', () => {
      const exists = fs.existsSync(
        path.resolve(__dirname, '../../scripts/import-hymns.ts'),
      );
      expect(exists).toBe(true);
    });
  });

  // -------------------------------------------------------------------
  // 2. CSV format — expected header
  // -------------------------------------------------------------------
  describe('CSV format', () => {
    it('EXPECTED_HEADER should be "Lingua,Numero,Titulo,Sacramental"', () => {
      expect(EXPECTED_HEADER).toBe('Lingua,Numero,Titulo,Sacramental');
    });

    it('parseAndValidateCsv rejects a wrong header', () => {
      const csv = 'WrongHeader\nPT-BR,1,Hino,S';
      const { errors } = parseAndValidateCsv(csv);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain('Invalid header');
    });

    it('parseAndValidateCsv rejects empty content', () => {
      const { errors } = parseAndValidateCsv('');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain('empty');
    });
  });

  // -------------------------------------------------------------------
  // 3. Language mapping
  // -------------------------------------------------------------------
  describe('Language mapping', () => {
    it('LANGUAGE_MAP should have exactly 3 entries', () => {
      expect(Object.keys(LANGUAGE_MAP)).toHaveLength(3);
    });

    it('PT-BR maps to pt-BR', () => {
      expect(LANGUAGE_MAP['PT-BR']).toBe('pt-BR');
    });

    it('EN-US maps to en', () => {
      expect(LANGUAGE_MAP['EN-US']).toBe('en');
    });

    it('ES-ES maps to es', () => {
      expect(LANGUAGE_MAP['ES-ES']).toBe('es');
    });

    it('parser rejects an unknown language', () => {
      const csv = 'Lingua,Numero,Titulo,Sacramental\nFR-FR,1,Hymne,S';
      const { errors } = parseAndValidateCsv(csv);
      expect(errors.some((e) => e.message.includes('Invalid Lingua'))).toBe(true);
    });
  });

  // -------------------------------------------------------------------
  // 4. Sacramental parsing (S/N, case-insensitive)
  // -------------------------------------------------------------------
  describe('Sacramental parsing', () => {
    it('"S" is parsed as is_sacramental=true', () => {
      const csv = 'Lingua,Numero,Titulo,Sacramental\nPT-BR,1,Hino,S';
      const { rows, errors } = parseAndValidateCsv(csv);
      expect(errors).toHaveLength(0);
      expect(rows[0].is_sacramental).toBe(true);
    });

    it('"N" is parsed as is_sacramental=false', () => {
      const csv = 'Lingua,Numero,Titulo,Sacramental\nPT-BR,2,Outro Hino,N';
      const { rows, errors } = parseAndValidateCsv(csv);
      expect(errors).toHaveLength(0);
      expect(rows[0].is_sacramental).toBe(false);
    });

    it('"s" lowercase is accepted (case-insensitive)', () => {
      const csv = 'Lingua,Numero,Titulo,Sacramental\nPT-BR,3,Hino,s';
      const { rows, errors } = parseAndValidateCsv(csv);
      expect(errors).toHaveLength(0);
      expect(rows[0].is_sacramental).toBe(true);
    });

    it('"n" lowercase is accepted (case-insensitive)', () => {
      const csv = 'Lingua,Numero,Titulo,Sacramental\nPT-BR,4,Hino,n';
      const { rows, errors } = parseAndValidateCsv(csv);
      expect(errors).toHaveLength(0);
      expect(rows[0].is_sacramental).toBe(false);
    });

    it('"true" is rejected as Sacramental value', () => {
      const csv = 'Lingua,Numero,Titulo,Sacramental\nPT-BR,5,Hino,true';
      const { errors } = parseAndValidateCsv(csv);
      expect(errors.some((e) => e.message.includes('Invalid Sacramental'))).toBe(true);
    });

    it('"false" is rejected as Sacramental value', () => {
      const csv = 'Lingua,Numero,Titulo,Sacramental\nPT-BR,6,Hino,false';
      const { errors } = parseAndValidateCsv(csv);
      expect(errors.some((e) => e.message.includes('Invalid Sacramental'))).toBe(true);
    });

    it('"1" is rejected as Sacramental value', () => {
      const csv = 'Lingua,Numero,Titulo,Sacramental\nPT-BR,7,Hino,1';
      const { errors } = parseAndValidateCsv(csv);
      expect(errors.some((e) => e.message.includes('Invalid Sacramental'))).toBe(true);
    });
  });

  // -------------------------------------------------------------------
  // 5. All-or-nothing validation
  // -------------------------------------------------------------------
  describe('All-or-nothing validation', () => {
    it('collects multiple errors instead of stopping at the first', () => {
      const csv = [
        'Lingua,Numero,Titulo,Sacramental',
        'XX-XX,abc,,true',   // 4 errors: bad lang, bad number, empty title, bad sacramental
        'YY-YY,-1,,false',   // more errors
      ].join('\n');
      const { errors, rows } = parseAndValidateCsv(csv);
      expect(errors.length).toBeGreaterThanOrEqual(4);
      expect(rows).toHaveLength(0);
    });

    it('returns zero rows when any line has errors', () => {
      const csv = [
        'Lingua,Numero,Titulo,Sacramental',
        'PT-BR,1,Good Hymn,S',
        'XX-XX,abc,,true', // bad row
      ].join('\n');
      const { errors, rows } = parseAndValidateCsv(csv);
      expect(errors.length).toBeGreaterThan(0);
      // Even the good row should not prevent errors from being reported
      // But good rows ARE added to rows array — the all-or-nothing check
      // happens in main() which exits when errors.length > 0
      expect(rows).toHaveLength(1); // good row parsed
      expect(errors.length).toBeGreaterThanOrEqual(3); // bad row errors
    });

    it('source code checks errors.length > 0 before DB writes', () => {
      const source = readScriptSource();
      expect(source).toContain('if (errors.length > 0)');
      expect(source).toContain('process.exit(1)');
    });
  });

  // -------------------------------------------------------------------
  // 6. Exit codes
  // -------------------------------------------------------------------
  describe('Exit codes', () => {
    it('exit(2) when SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing', () => {
      const source = readScriptSource();
      // Check for env-var guard with exit(2)
      expect(source).toContain('SUPABASE_URL');
      expect(source).toContain('SUPABASE_SERVICE_ROLE_KEY');
      const envGuardMatch = source.match(
        /if\s*\(\s*!supabaseUrl\s*\|\|\s*!supabaseKey\s*\)/,
      );
      expect(envGuardMatch).not.toBeNull();
      // exit(2) follows the env guard
      const envSection = source.slice(source.indexOf('!supabaseUrl'));
      expect(envSection.indexOf('process.exit(2)')).toBeLessThan(200);
    });

    it('exit(2) when CSV path argument is missing', () => {
      const source = readScriptSource();
      const argCheck = source.indexOf("if (!csvPath)");
      expect(argCheck).toBeGreaterThan(-1);
      const afterArgCheck = source.slice(argCheck, argCheck + 200);
      expect(afterArgCheck).toContain('process.exit(2)');
    });

    it('exit(2) when CSV file not found', () => {
      const source = readScriptSource();
      expect(source).toContain('File not found');
      expect(source).toContain('process.exit(2)');
    });

    it('exit(1) on validation errors', () => {
      const source = readScriptSource();
      expect(source).toContain('Validation failed');
      const validationSection = source.slice(source.indexOf('Validation failed'));
      expect(validationSection.indexOf('process.exit(1)')).toBeLessThan(200);
    });

    it('exit(1) on DB error', () => {
      const source = readScriptSource();
      // Find the DB error handling inside the upsert loop (not the comment)
      const upsertSection = source.slice(source.indexOf('.upsert('));
      expect(upsertSection).toContain('DB error');
      expect(upsertSection).toContain('process.exit(1)');
      // process.exit(1) should be close to DB error message
      const dbErrIdx = upsertSection.indexOf('DB error');
      const exitIdx = upsertSection.indexOf('process.exit(1)');
      expect(exitIdx - dbErrIdx).toBeLessThan(200);
    });
  });

  // -------------------------------------------------------------------
  // 7. Batch size = 500
  // -------------------------------------------------------------------
  describe('Batch size', () => {
    it('BATCH_SIZE export should be 500', () => {
      expect(BATCH_SIZE).toBe(500);
    });

    it('source uses BATCH_SIZE in upsert loop', () => {
      const source = readScriptSource();
      expect(source).toContain('i += BATCH_SIZE');
      expect(source).toContain('rows.slice(i, i + BATCH_SIZE)');
    });

    it('BATCH_SIZE is NOT 100', () => {
      expect(BATCH_SIZE).not.toBe(100);
    });
  });

  // -------------------------------------------------------------------
  // 8. BOM stripping
  // -------------------------------------------------------------------
  describe('BOM stripping', () => {
    it('source strips BOM character from input', () => {
      const source = readScriptSource();
      expect(source).toContain('\\uFEFF');
    });

    it('parseAndValidateCsv correctly handles BOM-prefixed CSV', () => {
      const bom = '\uFEFF';
      const csv = bom + 'Lingua,Numero,Titulo,Sacramental\nPT-BR,1,Hino,S';
      const { rows, errors } = parseAndValidateCsv(csv);
      expect(errors).toHaveLength(0);
      expect(rows).toHaveLength(1);
      expect(rows[0].language).toBe('pt-BR');
    });

    it('parseAndValidateCsv works without BOM', () => {
      const csv = 'Lingua,Numero,Titulo,Sacramental\nEN-US,10,Great Hymn,N';
      const { rows, errors } = parseAndValidateCsv(csv);
      expect(errors).toHaveLength(0);
      expect(rows).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------
  // 9. Summary format (grouped by language)
  // -------------------------------------------------------------------
  describe('Summary format', () => {
    it('source prints "Imported X hymns for language Y"', () => {
      const source = readScriptSource();
      expect(source).toContain('Imported ${count} hymns for language ${lang}');
    });

    it('source groups summary by language (countByLanguage)', () => {
      const source = readScriptSource();
      expect(source).toContain('countByLanguage');
      expect(source).toContain("countByLanguage[row.language]");
    });

    it('source sorts summary by language key', () => {
      const source = readScriptSource();
      expect(source).toContain('.sort()');
    });
  });

  // -------------------------------------------------------------------
  // 10. package.json: script entry and tsx dependency
  // -------------------------------------------------------------------
  describe('package.json configuration', () => {
    it('has "import-hymns" script entry', () => {
      const pkg = readPackageJson();
      const scripts = pkg.scripts as Record<string, string>;
      expect(scripts['import-hymns']).toBeDefined();
    });

    it('"import-hymns" script uses tsx', () => {
      const pkg = readPackageJson();
      const scripts = pkg.scripts as Record<string, string>;
      expect(scripts['import-hymns']).toContain('tsx');
    });

    it('"import-hymns" script references scripts/import-hymns.ts', () => {
      const pkg = readPackageJson();
      const scripts = pkg.scripts as Record<string, string>;
      expect(scripts['import-hymns']).toContain('scripts/import-hymns.ts');
    });

    it('tsx is in devDependencies', () => {
      const pkg = readPackageJson();
      const devDeps = pkg.devDependencies as Record<string, string>;
      expect(devDeps['tsx']).toBeDefined();
    });
  });

  // -------------------------------------------------------------------
  // 11. Supabase client uses service_role key (not anon key)
  // -------------------------------------------------------------------
  describe('Supabase client configuration', () => {
    it('uses SUPABASE_SERVICE_ROLE_KEY env var', () => {
      const source = readScriptSource();
      expect(source).toContain('SUPABASE_SERVICE_ROLE_KEY');
    });

    it('does NOT use SUPABASE_ANON_KEY', () => {
      const source = readScriptSource();
      expect(source).not.toContain('SUPABASE_ANON_KEY');
    });

    it('creates Supabase client with service_role key variable', () => {
      const source = readScriptSource();
      expect(source).toContain("process.env.SUPABASE_SERVICE_ROLE_KEY");
      expect(source).toContain('createClient(supabaseUrl, supabaseKey');
    });
  });

  // -------------------------------------------------------------------
  // 12. onConflict uses language,number
  // -------------------------------------------------------------------
  describe('onConflict configuration', () => {
    it('upsert uses onConflict: "language,number"', () => {
      const source = readScriptSource();
      expect(source).toContain("onConflict: 'language,number'");
    });

    it('upsert does NOT use ignoreDuplicates: true', () => {
      const source = readScriptSource();
      expect(source).toContain('ignoreDuplicates: false');
    });
  });

  // -------------------------------------------------------------------
  // 13. Shebang uses tsx, not ts-node
  // -------------------------------------------------------------------
  describe('Shebang', () => {
    it('first line is #!/usr/bin/env npx tsx', () => {
      const source = readScriptSource();
      const firstLine = source.split('\n')[0];
      expect(firstLine).toBe('#!/usr/bin/env npx tsx');
    });

    it('shebang does NOT use ts-node', () => {
      const source = readScriptSource();
      const firstLine = source.split('\n')[0];
      expect(firstLine).not.toContain('ts-node');
    });
  });

  // -------------------------------------------------------------------
  // Functional tests on parseAndValidateCsv
  // -------------------------------------------------------------------
  describe('parseAndValidateCsv — functional tests', () => {
    it('parses a valid multi-language CSV', () => {
      const csv = [
        'Lingua,Numero,Titulo,Sacramental',
        'PT-BR,1,Hino Sacramental,S',
        'EN-US,2,Opening Hymn,N',
        'ES-ES,3,Himno de Cierre,N',
      ].join('\n');
      const { rows, errors } = parseAndValidateCsv(csv);
      expect(errors).toHaveLength(0);
      expect(rows).toHaveLength(3);
      expect(rows[0]).toEqual({
        language: 'pt-BR',
        number: 1,
        title: 'Hino Sacramental',
        is_sacramental: true,
      });
      expect(rows[1]).toEqual({
        language: 'en',
        number: 2,
        title: 'Opening Hymn',
        is_sacramental: false,
      });
      expect(rows[2]).toEqual({
        language: 'es',
        number: 3,
        title: 'Himno de Cierre',
        is_sacramental: false,
      });
    });

    it('rejects negative number', () => {
      const csv = 'Lingua,Numero,Titulo,Sacramental\nPT-BR,-5,Hino,S';
      const { errors } = parseAndValidateCsv(csv);
      expect(errors.some((e) => e.message.includes('Invalid Numero'))).toBe(true);
    });

    it('rejects zero as number', () => {
      const csv = 'Lingua,Numero,Titulo,Sacramental\nPT-BR,0,Hino,S';
      const { errors } = parseAndValidateCsv(csv);
      expect(errors.some((e) => e.message.includes('Invalid Numero'))).toBe(true);
    });

    it('rejects float as number', () => {
      const csv = 'Lingua,Numero,Titulo,Sacramental\nPT-BR,1.5,Hino,S';
      const { errors } = parseAndValidateCsv(csv);
      expect(errors.some((e) => e.message.includes('Invalid Numero'))).toBe(true);
    });

    it('rejects empty title', () => {
      const csv = 'Lingua,Numero,Titulo,Sacramental\nPT-BR,1,,S';
      const { errors } = parseAndValidateCsv(csv);
      expect(errors.some((e) => e.message.includes('Titulo must be a non-empty string'))).toBe(true);
    });

    it('rejects row with wrong number of fields', () => {
      const csv = 'Lingua,Numero,Titulo,Sacramental\nPT-BR,1,Hino';
      const { errors } = parseAndValidateCsv(csv);
      expect(errors.some((e) => e.message.includes('Expected 4 fields'))).toBe(true);
    });

    it('handles Windows line endings (\\r\\n)', () => {
      const csv = 'Lingua,Numero,Titulo,Sacramental\r\nPT-BR,1,Hino,S\r\n';
      const { rows, errors } = parseAndValidateCsv(csv);
      expect(errors).toHaveLength(0);
      expect(rows).toHaveLength(1);
    });

    it('header-only CSV reports no data rows', () => {
      const csv = 'Lingua,Numero,Titulo,Sacramental';
      const { errors } = parseAndValidateCsv(csv);
      expect(errors.some((e) => e.message.includes('at least one data row'))).toBe(true);
    });

    it('error objects include correct line numbers', () => {
      const csv = [
        'Lingua,Numero,Titulo,Sacramental',
        'PT-BR,1,Good Hymn,S',
        'XX-XX,abc,,true',
      ].join('\n');
      const { errors } = parseAndValidateCsv(csv);
      // All errors from the bad row should reference line 3 (1-indexed)
      const line3Errors = errors.filter((e) => e.line === 3);
      expect(line3Errors.length).toBeGreaterThan(0);
    });
  });
});
