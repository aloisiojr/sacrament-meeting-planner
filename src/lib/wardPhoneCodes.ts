/**
 * S3 helper — pre-fill the ward's Country code + Local area code for the PDF-import screen (AC16).
 * Country: most common country_code among existing members → else the ward timezone's calling code
 * → else '+55' (app default). Area (DDD): most common leading-2 among existing members' phones →
 * else '' (blank; user fills, e.g. a brand-new ward with no members).
 */
import type { Member } from '../types/database';

/** Minimal IANA timezone → country calling code map (extend as wards appear elsewhere). */
export const TIMEZONE_CALLING_CODE: Record<string, string> = {
  'America/Sao_Paulo': '+55',
  'America/Bahia': '+55',
  'America/Fortaleza': '+55',
  'America/Recife': '+55',
  'America/Manaus': '+55',
  'America/New_York': '+1',
  'America/Chicago': '+1',
  'America/Denver': '+1',
  'America/Los_Angeles': '+1',
  'America/Phoenix': '+1',
  'America/Mexico_City': '+52',
  'America/Bogota': '+57',
  'America/Lima': '+51',
  'America/Argentina/Buenos_Aires': '+54',
  'America/Santiago': '+56',
  'America/Asuncion': '+595',
  'America/Montevideo': '+598',
  'America/Caracas': '+58',
  'Europe/Lisbon': '+351',
  'Europe/Madrid': '+34',
};

const DEFAULT_COUNTRY_CODE = '+55';

function mostCommon(values: string[]): string {
  const counts = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best = '';
  let bestN = 0;
  for (const [v, n] of counts) {
    if (n > bestN) {
      best = v;
      bestN = n;
    }
  }
  return best;
}

export interface WardCodes {
  countryCode: string;
  areaCode: string;
}

export function guessWardCodes(members: Member[], timezone?: string | null): WardCodes {
  const countryFromMembers = mostCommon(
    members.map((m) => (m.country_code ?? '').trim()).filter(Boolean)
  );
  const countryCode =
    countryFromMembers ||
    (timezone ? TIMEZONE_CALLING_CODE[timezone] ?? '' : '') ||
    DEFAULT_COUNTRY_CODE;

  const areaCode = mostCommon(
    members
      .map((m) => (m.phone ?? '').replace(/\D/g, ''))
      .filter((d) => d.length === 10 || d.length === 11)
      .map((d) => d.slice(0, 2))
  );

  return { countryCode, areaCode };
}
