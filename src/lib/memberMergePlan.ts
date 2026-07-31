/**
 * S4 — merge plan (Rule 4). Pure classification of parsed+repaired PDF members against the ward's
 * current DB members. No network, no mutation — the caller (review UI) renders this and the apply
 * hook (S5) executes the confirmed result.
 *
 * Matching is by NORMALIZED full name only (accent/case-insensitive) — no fuzzy matching, so
 * "similar but different" names are different people (spec AC7). Exact-name homonyms are treated as
 * the same person (documented risk). Matched members keep their DB-only columns (capabilities,
 * responsible, calling); only the phone is touched. A phone that differs (both sides non-empty) is a
 * CONFLICT surfaced for the user (never auto-overwritten). Members absent from the PDF are listed for
 * an opt-in removal review (default: keep).
 */
import type { Member } from '../types/database';
import { normalizeName } from './csvUtils';

/** A parsed member ready for merge: name already "First Last" (Rule 1), phone already repaired. */
export interface ParsedMember {
  name: string;
  phone: string | null; // full "+<digits>" or null
  age: number;
}

export interface PhoneConflict {
  member: Member;
  appPhone: string; // current DB full phone (digits joined from country_code+phone)
  pdfPhone: string; // repaired PDF full phone
}

export interface MergePlan {
  /** In PDF, not in DB — insert (capabilities/responsible/calling blank, informal blank). */
  toInsert: ParsedMember[];
  /** Matched, DB phone empty (or same-normalized absent) — fill phone with the PDF's. */
  toUpdate: { member: Member; phone: string }[];
  /** Matched, both phones present and different — user resolves (default: keep app's). */
  phoneConflicts: PhoneConflict[];
  /** In DB, not in PDF — removal review (default: keep). */
  absentInDb: Member[];
  /** Matched with no change (for the summary). */
  unchanged: number;
}

function digits(s: string | null | undefined): string {
  return (s ?? '').replace(/\D/g, '');
}

/** Same phone when one side lacks a country code: the shorter (≥8 digits) is a suffix of the longer. */
function sameNationalNumber(a: string, b: string): boolean {
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.length >= 8 && short !== long && long.endsWith(short);
}

/** Full DB phone as digits: country_code + national phone (empty when no phone). */
function dbFullDigits(m: Member): string {
  if (!m.phone) return '';
  return digits(m.country_code) + digits(m.phone);
}

export function buildMergePlan(parsed: ParsedMember[], dbMembers: Member[]): MergePlan {
  const byName = new Map<string, Member>();
  for (const m of dbMembers) byName.set(normalizeName(m.full_name), m);

  const matchedKeys = new Set<string>();
  const plan: MergePlan = {
    toInsert: [],
    toUpdate: [],
    phoneConflicts: [],
    absentInDb: [],
    unchanged: 0,
  };

  for (const p of parsed) {
    const key = normalizeName(p.name);
    const dbMember = byName.get(key);
    if (!dbMember) {
      plan.toInsert.push(p);
      continue;
    }
    matchedKeys.add(key);

    const dbDigits = dbFullDigits(dbMember);
    const pdfDigits = digits(p.phone);
    if (!pdfDigits) {
      plan.unchanged += 1; // PDF has no phone → keep DB as-is
    } else if (!dbDigits) {
      plan.toUpdate.push({ member: dbMember, phone: p.phone as string }); // fill empty phone
    } else if (dbDigits === pdfDigits || sameNationalNumber(dbDigits, pdfDigits)) {
      // Same number — including when the DB row stored a national phone with no country_code, so its
      // digits are a suffix of the PDF's full "+cc<national>". Not a conflict.
      plan.unchanged += 1;
    } else {
      plan.phoneConflicts.push({ member: dbMember, appPhone: dbDigits, pdfPhone: p.phone as string });
    }
  }

  for (const m of dbMembers) {
    if (!matchedKeys.has(normalizeName(m.full_name))) plan.absentInDb.push(m);
  }

  return plan;
}
