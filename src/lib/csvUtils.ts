/**
 * CSV utility functions for member import/export (v2.0 full dump).
 *
 * The CSV is a FULL DUMP of the member record: identity (name, informal name, full phone),
 * the 5 capability flags (preside / conduct / lead music / play piano / be recognized) as
 * booleans, a `Responsável` column holding the responsible member's `full_name` (not the
 * UUID), and a free-text `Chamado` (calling) column. Import is destructive (DELETE-ALL +
 * INSERT via the `import_members` RPC) and resolves the responsible name → id in a second
 * pass on the server.
 */

// Re-export splitPhoneNumber from shared countryCodes module
export { splitPhoneNumber } from './countryCodes';

export interface CsvMember {
  full_name: string;
  informal_name: string; // Informal name for WhatsApp invites
  phone: string; // Full phone with country code, e.g., "+5511999999999"
  can_preside: boolean;
  can_conduct: boolean;
  can_lead_music: boolean;
  can_play_piano: boolean;
  can_be_recognized: boolean;
  responsible_name: string; // full_name of the responsible member; empty if none
  calling: string; // free-text calling (chamado); empty if none
}

export type CsvErrorCode =
  | 'EMPTY_FILE'
  | 'INVALID_HEADER'
  | 'TOO_MANY_COLUMNS'
  | 'NAME_REQUIRED'
  | 'INVALID_BOOL'
  | 'INVALID_PHONE'
  | 'RESPONSIBLE_NOT_FOUND'
  | 'NO_DATA';

export interface CsvHeaders {
  name: string;
  informalName: string;
  phone: string;
  preside: string;
  conduct: string;
  leadMusic: string;
  piano: string;
  recognize: string;
  responsible: string;
  calling: string;
}

export const CSV_DEFAULT_HEADERS: CsvHeaders = {
  name: 'Nome',
  informalName: 'Nome Informal',
  phone: 'Telefone Completo',
  preside: 'Preside',
  conduct: 'Conduz',
  leadMusic: 'Rege',
  piano: 'Piano',
  recognize: 'Reconhecer',
  responsible: 'Responsável',
  calling: 'Chamado',
};

/** The 10 columns of the full-dump CSV, in order. A valid header must have all of them. */
const KNOWN_COLUMN_COUNT = 10;

/** Values (case- and accent-insensitive, trimmed) that parse to a `true` capability flag. */
const TRUE_VALUES = new Set(['x', 'sim', 'yes', 'si']);

/** Accepted col-0 (Name) headers — pt/en/es exports + the pt-BR default (normalizeName-normalized). */
const NAME_HEADERS = new Set(['nome', 'name', 'nombre']);
/** Accepted col-2 (Full Phone) headers — pt/en/es exports + the pt-BR default. */
const PHONE_HEADERS = new Set(['telefone completo', 'full phone', 'telefono completo']);

/** Valid full phone: optional leading '+' then 8–15 digits (matches what generateCsv emits). */
const PHONE_REGEX = /^\+?\d{8,15}$/;

/**
 * Normalize a name for case- and accent-insensitive comparison (Responsável ↔ Nome).
 * Local to this module by design — do NOT import search helpers from hooks here.
 */
function normalizeName(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Parse a CSV cell into a boolean capability flag. Only the accent/case-insensitive tokens
 * `x`, `sim`, `yes`, `si` are true; empty and anything else are false.
 */
export function parseCsvBool(value: string | undefined): boolean {
  return TRUE_VALUES.has(normalizeName(value ?? ''));
}

/** Serialize a boolean capability flag for CSV export (round-trips through parseCsvBool). */
function formatCsvBool(value: boolean | undefined): string {
  return value ? 'X' : '';
}

export interface CsvValidationError {
  line: number;
  column: string;
  code: CsvErrorCode;
  value?: string;
}

export interface CsvParseResult {
  success: boolean;
  members: CsvMember[];
  errors: CsvValidationError[];
}

/** Bool capability columns, by index, in the fixed 10-column layout. */
const BOOL_COLUMN_INDICES = [3, 4, 5, 6, 7] as const;

/**
 * Parse a CSV string into an array of CsvMember (full dump), STRICTLY and round-trip-safe.
 *
 * Validation collects ALL errors (never stops early) and returns `success: false` if any is
 * found; the returned `members` is empty on failure. Rules:
 * - Header must carry all 10 known columns (fewer -> INVALID_HEADER); an empty file -> EMPTY_FILE.
 * - Rows with MORE columns than the header -> TOO_MANY_COLUMNS; FEWER are padded with '' (tolerant
 *   of spreadsheets dropping trailing empty cells).
 * - `Nome` (col 0) is required. Blank `Nome Informal` defaults to the first word of `Nome`.
 * - `Telefone` (col 2) is optional; if present must match /^\+?\d{8,15}$/ (kept verbatim).
 * - Bool cols (3..7): empty -> false; the accent/case-insensitive tokens `x`/`sim`/`yes`/`si` ->
 *   true; anything else -> INVALID_BOOL (and treated as false).
 * - `Responsavel` (col 8) is optional; if present must match some row's `Nome` (accent/case
 *   insensitive) -- duplicates resolve to the first later, not an error.
 * - `Chamado` (col 9) is free text.
 *
 * Every value `generateCsv` emits passes these rules (round-trip guarantee).
 */
export function parseCsv(csvContent: string): CsvParseResult {
  const errors: CsvValidationError[] = [];

  // Strip UTF-8 BOM if present (common in Excel-exported CSVs)
  const cleanContent = csvContent.replace(/^\uFEFF/, '').trim();

  if (!cleanContent) {
    errors.push({ line: 0, column: 'file', code: 'EMPTY_FILE' });
    return { success: false, members: [], errors };
  }

  const lines = cleanContent.split(/\r?\n/);

  // Validate header: must carry all 10 known columns.
  const headerParts = parseCsvLine(lines[0].trim()).map((h) => h.trim().replace(/^"|"$/g, ''));
  const expectedCols = headerParts.length;

  if (expectedCols < KNOWN_COLUMN_COUNT) {
    errors.push({ line: 1, column: 'header', code: 'INVALID_HEADER' });
    return { success: false, members: [], errors };
  }

  // Import is destructive (DELETE-ALL + INSERT) and positional, so a wrong ≥10-column spreadsheet
  // would silently replace the roster with mismapped data. Guard with anchor columns: col 0 must be
  // the Name header and col 2 the Full-Phone header, in ANY supported locale (pt/en/es) or the
  // pt-BR default that the export/AI-guide emit. Middle-column wording may drift; anchors won't.
  const nameHeader = normalizeName(headerParts[0]);
  const phoneHeader = normalizeName(headerParts[2]);
  if (!NAME_HEADERS.has(nameHeader) || !PHONE_HEADERS.has(phoneHeader)) {
    errors.push({ line: 1, column: 'header', code: 'INVALID_HEADER' });
    return { success: false, members: [], errors };
  }

  const colName = (index: number): string => headerParts[index] ?? String(index);

  // First pass: split rows, flag over-wide rows, pad short rows, and collect all Nomes across the
  // whole file (needed to resolve Responsavel references, incl. forward references).
  const rows: { line: number; parts: string[] }[] = [];
  const knownNames = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    const parts = parseCsvLine(line);

    if (parts.length > expectedCols) {
      errors.push({ line: i + 1, column: 'formato', code: 'TOO_MANY_COLUMNS' });
      continue;
    }
    while (parts.length < expectedCols) parts.push('');

    const name = parts[0].trim();
    if (name) knownNames.add(normalizeName(name));
    rows.push({ line: i + 1, parts });
  }

  // Second pass: validate each row and build members (discarded if the file has ANY error).
  const members: CsvMember[] = [];

  for (const { line, parts } of rows) {
    const fullName = parts[0].trim();
    let informalName = parts[1].trim();
    const fullPhone = parts[2].trim();

    if (!fullName) {
      errors.push({ line, column: colName(0), code: 'NAME_REQUIRED' });
    }
    if (!informalName) {
      informalName = fullName.split(' ')[0] ?? '';
    }

    if (fullPhone && !PHONE_REGEX.test(fullPhone)) {
      errors.push({ line, column: colName(2), code: 'INVALID_PHONE', value: fullPhone });
    }

    const boolValues = BOOL_COLUMN_INDICES.map((idx) => {
      const raw = parts[idx].trim();
      const token = normalizeName(raw);
      if (token === '') return false;
      if (TRUE_VALUES.has(token)) return true;
      errors.push({ line, column: colName(idx), code: 'INVALID_BOOL', value: raw });
      return false;
    });

    const responsibleName = parts[8].trim();
    if (responsibleName && !knownNames.has(normalizeName(responsibleName))) {
      errors.push({ line, column: colName(8), code: 'RESPONSIBLE_NOT_FOUND', value: responsibleName });
    }

    members.push({
      full_name: fullName,
      informal_name: informalName,
      phone: fullPhone,
      can_preside: boolValues[0],
      can_conduct: boolValues[1],
      can_lead_music: boolValues[2],
      can_play_piano: boolValues[3],
      can_be_recognized: boolValues[4],
      responsible_name: responsibleName,
      calling: parts[9].trim(),
    });
  }

  if (errors.length > 0) {
    return { success: false, members: [], errors };
  }

  if (members.length === 0) {
    errors.push({ line: 0, column: 'data', code: 'NO_DATA' });
    return { success: false, members: [], errors };
  }

  return { success: true, members, errors: [] };
}

/**
 * Parse a single CSV line, handling quoted fields.
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++; // Skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/** A member record as exported to CSV (full dump). */
export interface CsvExportMember {
  full_name: string;
  informal_name: string | null;
  country_code: string;
  phone: string | null;
  can_preside?: boolean;
  can_conduct?: boolean;
  can_lead_music?: boolean;
  can_play_piano?: boolean;
  can_be_recognized?: boolean;
  responsible_name?: string | null;
  calling?: string | null;
}

/**
 * Clearly-marked example rows exported when the ward has no members yet, so the user learns the
 * format — localized to the ward/app language (names, callings and phone country code). Each set is
 * self-consistent: `parseCsv(generateCsv(getExampleMembers(lang)))` succeeds, and the second row
 * references the first via `Responsável` to illustrate delegation.
 */
export const EXAMPLE_MEMBERS_BY_LANG: Record<string, CsvExportMember[]> = {
  'pt-BR': [
    { full_name: 'Maria Exemplo', informal_name: '', country_code: '+55', phone: '11999990001',
      can_preside: false, can_conduct: false, can_lead_music: false, can_play_piano: true,
      can_be_recognized: false, responsible_name: '', calling: 'Ex.: Presidente da Primária' },
    { full_name: 'Lucas Exemplo', informal_name: '', country_code: '+55', phone: null,
      can_preside: false, can_conduct: false, can_lead_music: false, can_play_piano: false,
      can_be_recognized: false, responsible_name: 'Maria Exemplo', calling: '' },
  ],
  'en-US': [
    { full_name: 'Mary Example', informal_name: '', country_code: '+1', phone: '5551234567',
      can_preside: false, can_conduct: false, can_lead_music: false, can_play_piano: true,
      can_be_recognized: false, responsible_name: '', calling: 'e.g. Primary President' },
    { full_name: 'Luke Example', informal_name: '', country_code: '+1', phone: null,
      can_preside: false, can_conduct: false, can_lead_music: false, can_play_piano: false,
      can_be_recognized: false, responsible_name: 'Mary Example', calling: '' },
  ],
  'es-LA': [
    { full_name: 'María Ejemplo', informal_name: '', country_code: '+52', phone: '5512345678',
      can_preside: false, can_conduct: false, can_lead_music: false, can_play_piano: true,
      can_be_recognized: false, responsible_name: '', calling: 'Ej.: Presidenta de la Primaria' },
    { full_name: 'Lucas Ejemplo', informal_name: '', country_code: '+52', phone: null,
      can_preside: false, can_conduct: false, can_lead_music: false, can_play_piano: false,
      can_be_recognized: false, responsible_name: 'María Ejemplo', calling: '' },
  ],
};

/** Example rows for the given language (falls back to pt-BR). */
export function getExampleMembers(language?: string): CsvExportMember[] {
  return EXAMPLE_MEMBERS_BY_LANG[language ?? ''] ?? EXAMPLE_MEMBERS_BY_LANG['pt-BR'];
}

/**
 * Generate full-dump CSV content from member data.
 * Columns: Nome, Nome Informal, Telefone Completo, Preside, Conduz, Rege, Piano, Reconhecer,
 * Responsável (responsible member's full_name), Chamado (free-text calling).
 */
export function generateCsv(members: CsvExportMember[], headers?: CsvHeaders): string {
  const h = headers ?? CSV_DEFAULT_HEADERS;
  const header = [
    h.name,
    h.informalName,
    h.phone,
    h.preside,
    h.conduct,
    h.leadMusic,
    h.piano,
    h.recognize,
    h.responsible,
    h.calling,
  ]
    .map(escapeCsvField)
    .join(',');
  const rows = members.map((m) => {
    const fullPhone = m.phone ? `${m.country_code}${m.phone}` : '';
    return [
      escapeCsvField(m.full_name),
      escapeCsvField(m.informal_name || ''),
      fullPhone,
      formatCsvBool(m.can_preside),
      formatCsvBool(m.can_conduct),
      formatCsvBool(m.can_lead_music),
      formatCsvBool(m.can_play_piano),
      formatCsvBool(m.can_be_recognized),
      escapeCsvField(m.responsible_name || ''),
      escapeCsvField(m.calling || ''),
    ].join(',');
  });
  // Add UTF-8 BOM for Excel compatibility
  return '\uFEFF' + [header, ...rows].join('\n');
}

/**
 * Escape a CSV field if it contains special characters.
 */
function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
