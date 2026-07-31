/**
 * S3 — phone repair (Rules 2 & 3) for the LCR PDF import.
 *
 * Rule 2 (privacy): members under 12 keep their name but NEVER a phone.
 * Rule 3 (repair, no guessing): normalize each raw phone using the ward's country code + local area
 * code as the AUTHORITATIVE "dominant" values (from the import-screen inputs, AC16). Numbers missing
 * the country code get it; local numbers (no area code) get the ward area code. If a number can't be
 * completed to a valid `+`+digits (8–15) form, it is left blank and reported as "unrepaired" — the
 * person is still imported (phone null). We never invent middle digits.
 *
 * Deliberately best-effort: uncertain numbers go blank → the review screen lists them for manual fix.
 */
import type { LcrRecord } from './lcrPdfParser';

export interface RepairedRecord {
  name: string;
  phone: string | null;
  age: number;
}

export interface RepairInput {
  /** Ward country code, e.g. "+55" or "55" (digits extracted). Required for confident repair. */
  countryCode: string;
  /** Ward local area code (DDD), e.g. "11". Empty → deduced from the batch's well-formed numbers. */
  areaCode?: string;
}

export interface RepairResult {
  resolved: RepairedRecord[];
  /** Names whose printed phone could not be completed confidently (left blank). */
  unrepaired: string[];
}

const UNDER_AGE = 12;

function digits(s: string): string {
  return (s || '').replace(/\D/g, '');
}

/** Most common leading-2-digit area code among numbers that already carry one (10–11 digit). */
function deduceAreaCode(records: LcrRecord[]): string {
  const counts = new Map<string, number>();
  for (const r of records) {
    if (!r.rawPhone) continue;
    const d = digits(r.rawPhone);
    if (d.length === 10 || d.length === 11) {
      const area = d.slice(0, 2);
      counts.set(area, (counts.get(area) ?? 0) + 1);
    }
  }
  let best = '';
  let bestN = 0;
  for (const [area, n] of counts) {
    if (n > bestN) {
      best = area;
      bestN = n;
    }
  }
  return best;
}

/**
 * Normalize one raw phone to `+`+digits using country/area codes. Returns null when it can't be
 * completed confidently (too short with no area code, too long, or out of the 8–15 range).
 */
export function normalizeLcrPhone(
  raw: string | null,
  countryDigits: string,
  areaDigits: string
): string | null {
  if (!raw) return null;
  const d = digits(raw);
  if (!d || !countryDigits) return null;

  let full: string | null = null;
  if (d.startsWith(countryDigits) && d.length >= 11 && d.length <= 15) {
    full = d; // already international
  } else if (d.length > 11) {
    full = null; // too long to place confidently → unrepaired (garbage / already-invalid)
  } else if (d.length >= 10) {
    full = countryDigits + d; // has an area/DDD, missing only country
  } else if (d.length >= 8 && areaDigits) {
    full = countryDigits + areaDigits + d; // local number, missing area + country
  } else {
    full = null; // too short / no area code available
  }

  if (!full) return null;
  if (full.length < 8 || full.length > 15) return null;
  return `+${full}`;
}

export function repairPhones(records: LcrRecord[], input: RepairInput): RepairResult {
  const countryDigits = digits(input.countryCode);
  const areaDigits = input.areaCode ? digits(input.areaCode) : deduceAreaCode(records);

  const resolved: RepairedRecord[] = [];
  const unrepaired: string[] = [];
  for (const r of records) {
    if (r.age < UNDER_AGE) {
      resolved.push({ name: r.name, phone: null, age: r.age }); // Rule 2 — no phone for minors
      continue;
    }
    const phone = normalizeLcrPhone(r.rawPhone, countryDigits, areaDigits);
    if (r.rawPhone && !phone) unrepaired.push(r.name); // had a printed phone we couldn't complete
    resolved.push({ name: r.name, phone, age: r.age });
  }
  return { resolved, unrepaired };
}
