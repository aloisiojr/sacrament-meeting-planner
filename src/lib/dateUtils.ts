import type { SupportedLanguage } from '../i18n';

/**
 * Month abbreviations by locale.
 * Used for date formatting independent of i18n to avoid circular dependencies.
 */
const MONTH_ABBR: Record<SupportedLanguage, string[]> = {
  'pt-BR': ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'],
  en: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
  es: ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'],
};

/**
 * Check if a given date is a Sunday.
 * Works with Date objects and ISO date strings (YYYY-MM-DD).
 */
export function isSunday(date: Date | string): boolean {
  const d = typeof date === 'string' ? parseLocalDate(date) : date;
  return d.getDay() === 0;
}

/**
 * Parse an ISO date string (YYYY-MM-DD) as a local date (not UTC).
 * This avoids timezone-related off-by-one errors.
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format a date as ISO date string (YYYY-MM-DD).
 */
export function toISODateString(date: Date): string {
  const year = date.getFullYear();
  const month = zeroPad(date.getMonth() + 1);
  const day = zeroPad(date.getDate());
  return `${year}-${month}-${day}`;
}

/**
 * Zero-pad a number to 2 digits.
 * @example zeroPad(8) => '08', zeroPad(12) => '12'
 */
export function zeroPad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/**
 * Alias for zeroPad, specifically for days.
 * @example zeroPadDay(8) => '08'
 */
export function zeroPadDay(day: number): string {
  return zeroPad(day);
}

/**
 * Get the 3-letter month abbreviation for a given month (1-12) and locale.
 * @param month - Month number (1-12)
 * @param locale - Supported language
 */
export function getMonthAbbr(month: number, locale: SupportedLanguage = 'pt-BR'): string {
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month number: ${month}. Must be 1-12.`);
  }
  return MONTH_ABBR[locale][month - 1];
}

/**
 * Format a date according to the locale pattern.
 * - pt-BR: "08 FEV" (day month)
 * - en: "FEB 08" (month day)
 * - es: "08 FEB" (day month)
 */
export function formatDate(date: Date | string, locale: SupportedLanguage = 'pt-BR'): string {
  const d = typeof date === 'string' ? parseLocalDate(date) : date;
  const day = zeroPadDay(d.getDate());
  const month = getMonthAbbr(d.getMonth() + 1, locale);

  switch (locale) {
    case 'en':
      return `${month} ${day}`;
    case 'pt-BR':
    case 'es':
    default:
      return `${day} ${month}`;
  }
}

/**
 * Generate all Sundays in a date range (inclusive).
 * @param start - Start date
 * @param end - End date
 * @returns Array of Date objects for each Sunday in the range
 */
export function generateSundayRange(start: Date | string, end: Date | string): Date[] {
  const startDate = typeof start === 'string' ? parseLocalDate(start) : new Date(start);
  const endDate = typeof end === 'string' ? parseLocalDate(end) : new Date(end);

  const sundays: Date[] = [];

  // Move to the first Sunday on or after the start date
  const current = new Date(startDate);
  const dayOfWeek = current.getDay();
  if (dayOfWeek !== 0) {
    current.setDate(current.getDate() + (7 - dayOfWeek));
  }

  // Collect all Sundays up to and including end date
  while (current <= endDate) {
    sundays.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }

  return sundays;
}

/**
 * Get the next N sundays starting from a given date.
 * @param from - Starting date (inclusive if it's a Sunday)
 * @param count - Number of Sundays to return
 */
export function getNextSundays(from: Date | string, count: number): Date[] {
  const startDate = typeof from === 'string' ? parseLocalDate(from) : new Date(from);
  const sundays: Date[] = [];

  const current = new Date(startDate);
  const dayOfWeek = current.getDay();
  if (dayOfWeek !== 0) {
    current.setDate(current.getDate() + (7 - dayOfWeek));
  }

  for (let i = 0; i < count; i++) {
    sundays.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }

  return sundays;
}

/**
 * Get the previous N sundays before a given date.
 * @param from - Starting date (exclusive)
 * @param count - Number of Sundays to return
 */
export function getPreviousSundays(from: Date | string, count: number): Date[] {
  const startDate = typeof from === 'string' ? parseLocalDate(from) : new Date(from);
  const sundays: Date[] = [];

  const current = new Date(startDate);
  // Go to previous Sunday
  const dayOfWeek = current.getDay();
  if (dayOfWeek === 0) {
    current.setDate(current.getDate() - 7);
  } else {
    current.setDate(current.getDate() - dayOfWeek);
  }

  for (let i = 0; i < count; i++) {
    sundays.unshift(new Date(current));
    current.setDate(current.getDate() - 7);
  }

  return sundays;
}
