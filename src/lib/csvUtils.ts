/**
 * CSV utility functions for member import/export.
 * Handles CSV parsing, validation, and generation.
 */

// Re-export splitPhoneNumber from shared countryCodes module
export { splitPhoneNumber } from './countryCodes';

export interface CsvMember {
  full_name: string;
  phone: string; // Full phone with country code, e.g., "+5511999999999"
}

export type CsvErrorCode =
  | 'EMPTY_FILE'
  | 'INVALID_HEADER'
  | 'INSUFFICIENT_COLUMNS'
  | 'NAME_REQUIRED'
  | 'NO_DATA';

export interface CsvHeaders {
  name: string;
  phone: string;
}

export const CSV_DEFAULT_HEADERS: CsvHeaders = {
  name: 'Nome',
  phone: 'Telefone Completo',
};

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
 * Parse a CSV string into an array of CsvMember.
 * Expected format: "Nome,Telefone Completo" (header required)
 * Phone format: +xxyyyyyyyy (country code + number)
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

  if (headerParts.length < 2) {
    errors.push({ line: 1, field: 'header', message: 'CSV must have at least 2 columns: Nome, Telefone Completo', code: 'INVALID_HEADER' });
    return { success: false, members: [], errors };
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    const parts = parseCsvLine(line);

    if (parts.length < 2) {
      errors.push({ line: i + 1, field: 'format', message: 'Row must have at least 2 columns', code: 'INSUFFICIENT_COLUMNS' });
      continue;
    }

    const fullName = parts[0].trim();
    let fullPhone = parts[1].trim();

    // Validate name
    if (!fullName) {
      errors.push({ line: i + 1, field: 'Nome', message: 'Name is required', code: 'NAME_REQUIRED' });
      continue;
    }

    // Sanitize phone: if it contains non-digit/non-plus chars, treat as empty
    if (fullPhone && !/^[+\d]*$/.test(fullPhone)) {
      fullPhone = '';
    }

    members.push({ full_name: fullName, phone: fullPhone });
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

/**
 * Generate CSV content from member data.
 * Format: "Nome,Telefone Completo"
 */
export function generateCsv(
  members: Array<{ full_name: string; country_code: string; phone: string | null }>,
  headers?: CsvHeaders
): string {
  const h = headers ?? CSV_DEFAULT_HEADERS;
  const header = `${h.name},${h.phone}`;
  const rows = members.map((m) => {
    const name = escapeCsvField(m.full_name);
    const fullPhone = m.phone ? `${m.country_code}${m.phone}` : '';
    return `${name},${fullPhone}`;
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
