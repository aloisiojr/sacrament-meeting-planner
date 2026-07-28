/**
 * CSV utility functions for member import/export (v2.0 full dump).
 *
 * The CSV is a FULL DUMP of the member record: identity (name, informal name, full phone),
 * the 5 capability flags (preside / conduct / lead music / play piano / be recognized) as
 * booleans, and a `Responsável` column holding the responsible member's `full_name` (not the
 * UUID). Import is destructive (DELETE-ALL + INSERT via the `import_members` RPC) and resolves
 * the responsible name → id in a second pass on the server.
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
}

export type CsvErrorCode =
  | 'EMPTY_FILE'
  | 'INVALID_HEADER'
  | 'INSUFFICIENT_COLUMNS'
  | 'NAME_REQUIRED'
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
};

/** Minimum columns required for a valid row: Nome, Nome Informal, Telefone Completo. */
const MIN_COLUMNS = 3;

/** Values (case-insensitive, trimmed) that parse to a `true` capability flag. */
const TRUE_VALUES = new Set(['true', '1', 'sim', 'yes', 'y', 's', 'x', 'verdadeiro', 'v']);

/** Parse a CSV cell into a boolean capability flag. Anything not truthy is false. */
export function parseCsvBool(value: string | undefined): boolean {
  return TRUE_VALUES.has((value ?? '').trim().toLowerCase());
}

/** Serialize a boolean capability flag for CSV export (round-trips through parseCsvBool). */
function formatCsvBool(value: boolean | undefined): string {
  return value ? 'true' : 'false';
}

export interface CsvValidationError {
  line: number;
  field: string;
  message: string;
  code?: CsvErrorCode;
}

export interface CsvParseResult {
  success: boolean;
  members: CsvMember[];
  errors: CsvValidationError[];
}

/**
 * Parse a CSV string into an array of CsvMember (full dump).
 * Requires at least 3 columns: Name, Informal Name, Phone. Capability columns
 * (preside/conduct/lead music/piano/recognize) and the Responsável column are optional and
 * default to false / empty when absent, so 3-column legacy files still import.
 * Phone format: +xxyyyyyyyy (country code + number).
 */
export function parseCsv(csvContent: string): CsvParseResult {
  const errors: CsvValidationError[] = [];
  const members: CsvMember[] = [];

  // Strip UTF-8 BOM if present (common in Excel-exported CSVs)
  const cleanContent = csvContent.replace(/^\uFEFF/, '').trim();

  if (!cleanContent) {
    errors.push({ line: 0, field: 'file', message: 'Empty CSV file', code: 'EMPTY_FILE' });
    return { success: false, members: [], errors };
  }

  const lines = cleanContent.split(/\r?\n/);

  // Validate header
  const header = lines[0].trim();
  const headerParts = header.split(',').map((h) => h.trim().replace(/^"|"$/g, ''));

  if (headerParts.length < MIN_COLUMNS) {
    errors.push({ line: 1, field: 'header', message: 'CSV must have at least 3 columns: Nome, Nome Informal, Telefone Completo', code: 'INVALID_HEADER' });
    return { success: false, members: [], errors };
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    const parts = parseCsvLine(line);

    if (parts.length < MIN_COLUMNS) {
      errors.push({ line: i + 1, field: 'format', message: 'Row must have at least 3 columns', code: 'INSUFFICIENT_COLUMNS' });
      continue;
    }

    const fullName = parts[0].trim();
    let informalName = (parts[1] ?? '').trim();
    let fullPhone = (parts[2] ?? '').trim();

    // Validate name
    if (!fullName) {
      errors.push({ line: i + 1, field: 'Nome', message: 'Name is required', code: 'NAME_REQUIRED' });
      continue;
    }

    // Default informal_name to first word of full_name
    if (!informalName) {
      informalName = fullName.split(' ')[0];
    }

    // Sanitize phone: if it contains non-digit/non-plus chars, treat as empty
    if (fullPhone && !/^[+\d]*$/.test(fullPhone)) {
      fullPhone = '';
    }

    members.push({
      full_name: fullName,
      informal_name: informalName,
      phone: fullPhone,
      can_preside: parseCsvBool(parts[3]),
      can_conduct: parseCsvBool(parts[4]),
      can_lead_music: parseCsvBool(parts[5]),
      can_play_piano: parseCsvBool(parts[6]),
      can_be_recognized: parseCsvBool(parts[7]),
      responsible_name: (parts[8] ?? '').trim(),
    });
  }

  if (errors.length > 0) {
    return { success: false, members: [], errors };
  }

  if (members.length === 0) {
    errors.push({ line: 0, field: 'data', message: 'No valid data rows found', code: 'NO_DATA' });
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
}

/**
 * Generate full-dump CSV content from member data.
 * Columns: Nome, Nome Informal, Telefone Completo, Preside, Conduz, Rege, Piano, Reconhecer,
 * Responsável (responsible member's full_name).
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
