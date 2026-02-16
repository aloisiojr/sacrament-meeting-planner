#!/usr/bin/env npx tsx
/**
 * CLI script: pnpm import-hymns <csv-file>
 *
 * Imports a hymn CSV into the Supabase hymns table.
 * CSV format: Lingua,Numero,Titulo,Sacramental
 *   - Lingua: PT-BR | EN-US | ES-ES
 *   - Numero: positive integer
 *   - Titulo: non-empty string
 *   - Sacramental: S or N (case-insensitive)
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.
 *
 * Exit codes: 0=success, 1=validation/DB error, 2=missing args/env
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// --- Language Mapping ---
export const LANGUAGE_MAP: Record<string, string> = {
  'PT-BR': 'pt-BR',
  'EN-US': 'en',
  'ES-ES': 'es',
};

export const EXPECTED_HEADER = 'Lingua,Numero,Titulo,Sacramental';
export const BATCH_SIZE = 500;

// --- Types ---
export interface HymnRow {
  language: string;
  number: number;
  title: string;
  is_sacramental: boolean;
}

export interface ValidationError {
  line: number;
  message: string;
}

// --- Parse & Validate (all-or-nothing) ---
export function parseAndValidateCsv(content: string): { rows: HymnRow[]; errors: ValidationError[] } {
  // Strip BOM if present
  const cleaned = content.replace(/^\uFEFF/, '');
  const lines = cleaned.split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => l.trim() !== '');
  const errors: ValidationError[] = [];
  const rows: HymnRow[] = [];

  if (lines.length === 0) {
    errors.push({ line: 1, message: 'CSV file is empty' });
    return { rows, errors };
  }

  // Validate header
  const header = lines[0].trim();
  if (header !== EXPECTED_HEADER) {
    errors.push({ line: 1, message: `Invalid header. Expected "${EXPECTED_HEADER}", got "${header}"` });
    return { rows, errors };
  }

  if (lines.length < 2) {
    errors.push({ line: 2, message: 'CSV must have at least one data row' });
    return { rows, errors };
  }

  // Validate and parse each data row
  for (let i = 1; i < lines.length; i++) {
    const lineNum = i + 1; // 1-indexed for user display
    const line = lines[i];
    const cols = line.split(',');

    if (cols.length !== 4) {
      errors.push({ line: lineNum, message: `Expected 4 fields, got ${cols.length}` });
      continue;
    }

    const [rawLingua, rawNumero, rawTitulo, rawSacramental] = cols.map((c) => c.trim());

    // Validate Lingua
    const lingua = rawLingua.toUpperCase();
    const mappedLanguage = LANGUAGE_MAP[lingua];
    if (!mappedLanguage) {
      errors.push({ line: lineNum, message: `Invalid Lingua "${rawLingua}". Must be one of: ${Object.keys(LANGUAGE_MAP).join(', ')}` });
    }

    // Validate Numero
    const numero = parseInt(rawNumero, 10);
    if (isNaN(numero) || numero <= 0 || String(numero) !== rawNumero) {
      errors.push({ line: lineNum, message: `Invalid Numero "${rawNumero}". Must be a positive integer` });
    }

    // Validate Titulo
    if (!rawTitulo || rawTitulo.length === 0) {
      errors.push({ line: lineNum, message: 'Titulo must be a non-empty string' });
    }

    // Validate Sacramental
    const sacUpper = rawSacramental.toUpperCase();
    if (sacUpper !== 'S' && sacUpper !== 'N') {
      errors.push({ line: lineNum, message: `Invalid Sacramental "${rawSacramental}". Must be S or N` });
    }

    // Only add row if all fields on this line are valid
    if (mappedLanguage && !isNaN(numero) && numero > 0 && String(numero) === rawNumero && rawTitulo && rawTitulo.length > 0 && (sacUpper === 'S' || sacUpper === 'N')) {
      rows.push({
        language: mappedLanguage,
        number: numero,
        title: rawTitulo,
        is_sacramental: sacUpper === 'S',
      });
    }
  }

  return { rows, errors };
}

// --- Main (only runs when executed directly) ---
async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars are required.');
    process.exit(2);
  }

  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('Usage: pnpm import-hymns <csv-file>');
    console.error('CSV format: Lingua,Numero,Titulo,Sacramental');
    process.exit(2);
  }

  const resolvedPath = path.resolve(csvPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: File not found: ${resolvedPath}`);
    process.exit(2);
  }

  const content = fs.readFileSync(resolvedPath, 'utf-8');
  const { rows, errors } = parseAndValidateCsv(content);

  // All-or-nothing: if any errors, print all and abort
  if (errors.length > 0) {
    console.error(`Validation failed with ${errors.length} error(s):`);
    for (const err of errors) {
      console.error(`  Line ${err.line}: ${err.message}`);
    }
    process.exit(1);
  }

  if (rows.length === 0) {
    console.error('Error: No hymns found in CSV.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Upsert in batches of 500
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('hymns')
      .upsert(batch, { onConflict: 'language,number', ignoreDuplicates: false });

    if (error) {
      console.error(`DB error importing batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
      process.exit(1);
    }
  }

  // Summary grouped by language
  const countByLanguage: Record<string, number> = {};
  for (const row of rows) {
    countByLanguage[row.language] = (countByLanguage[row.language] ?? 0) + 1;
  }

  for (const [lang, count] of Object.entries(countByLanguage).sort()) {
    console.log(`Imported ${count} hymns for language ${lang}`);
  }
}

// Run main only when executed directly (not when imported for tests)
const isDirectRun = process.argv[1]?.includes('import-hymns');
if (isDirectRun) {
  main().catch((err) => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
}
