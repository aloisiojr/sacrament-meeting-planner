/**
 * CSV utility functions for member import/export.
 * Handles CSV parsing, validation, and generation.
 */

export interface CsvMember {
  full_name: string;
  phone: string; // Full phone with country code, e.g., "+5511999999999"
}

export type CsvErrorCode =
  | 'EMPTY_FILE'
  | 'INVALID_HEADER'
  | 'UNRECOGNIZED_HEADER'
  | 'INSUFFICIENT_COLUMNS'
  | 'NAME_REQUIRED'
  | 'INVALID_PHONE'
  | 'DUPLICATE_PHONE'
  | 'NO_DATA';

export interface CsvHeaders {
  name: string;
  phone: string;
}

export const SUPPORTED_CSV_HEADERS = {
  NAME_COLUMNS: ['Nome', 'Name', 'Nombre'],
  PHONE_COLUMNS: ['Telefone Completo', 'Full Phone', 'Telefono Completo'],
};

export const CSV_DEFAULT_HEADERS: CsvHeaders = {
  name: 'Nome',
  phone: 'Telefone Completo',
};

export interface CsvValidationError {
  line: number;
  field: string;
  message: string;
  code?: CsvErrorCode;
  params?: Record<string, string>;
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
  const seenPhones = new Set<string>();

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

  // Validate header column names against supported languages (case-insensitive)
  const nameCol = headerParts[0].toLowerCase();
  const phoneCol = headerParts[1].toLowerCase();
  const validName = SUPPORTED_CSV_HEADERS.NAME_COLUMNS.some((n) => n.toLowerCase() === nameCol);
  const validPhone = SUPPORTED_CSV_HEADERS.PHONE_COLUMNS.some((p) => p.toLowerCase() === phoneCol);

  if (!validName || !validPhone) {
    errors.push({ line: 1, field: 'header', message: 'Unrecognized CSV header columns', code: 'UNRECOGNIZED_HEADER' });
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
    const fullPhone = parts[1].trim();

    // Validate name
    if (!fullName) {
      errors.push({ line: i + 1, field: 'Nome', message: 'Name is required', code: 'NAME_REQUIRED' });
      continue;
    }

    // Validate phone format (+xxyyyyyyyy)
    if (fullPhone && !/^\+\d{8,15}$/.test(fullPhone)) {
      errors.push({
        line: i + 1,
        field: 'Telefone Completo',
        message: `Invalid phone format: "${fullPhone}". Expected: +xxyyyyyyyy`,
        code: 'INVALID_PHONE',
        params: { phone: fullPhone },
      });
      continue;
    }

    // Check for duplicate phone
    if (fullPhone && seenPhones.has(fullPhone)) {
      errors.push({
        line: i + 1,
        field: 'Telefone Completo',
        message: `Duplicate phone: ${fullPhone}`,
        code: 'DUPLICATE_PHONE',
        params: { phone: fullPhone },
      });
      continue;
    }

    if (fullPhone) {
      seenPhones.add(fullPhone);
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
 * Extract country code and phone number from a full phone string.
 * E.g., "+5511999999999" -> { countryCode: "+55", phone: "11999999999" }
 */
export function splitPhoneNumber(fullPhone: string): { countryCode: string; phone: string } {
  if (!fullPhone || !fullPhone.startsWith('+')) {
    return { countryCode: '+55', phone: fullPhone };
  }

  // Try known country code lengths (longest first to avoid ambiguity)
  // 3-digit codes: +591, +595, +598, +593, +351, +244, +258
  // 2-digit codes: +55, +52, +54, +56, +57, +58, +51, +44, +34, +33, +49, +39, +81
  // 1-digit code:  +1
  const phone = fullPhone.substring(1); // Remove '+'

  if (phone.length >= 3 && /^(591|595|598|593|351|244|258)/.test(phone)) {
    const code = phone.substring(0, 3);
    return { countryCode: `+${code}`, phone: phone.substring(3) };
  }

  if (phone.length >= 2 && /^(55|52|54|56|57|58|51|44|34|33|49|39|81)/.test(phone)) {
    const code = phone.substring(0, 2);
    return { countryCode: `+${code}`, phone: phone.substring(2) };
  }

  if (phone.startsWith('1')) {
    return { countryCode: '+1', phone: phone.substring(1) };
  }

  // Fallback: assume first 2 digits are country code
  return { countryCode: `+${phone.substring(0, 2)}`, phone: phone.substring(2) };
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
