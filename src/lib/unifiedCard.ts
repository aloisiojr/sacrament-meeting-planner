/**
 * unifiedCard: pure mapping from a Sunday's raw data (agenda + speeches + flags) to the inputs the
 * `UnifiedSundayCard` renders. Factored out of the Agendas tab so the same rules can be reused by
 * the Home tab (next phase) — no duplicated counting/row logic.
 *
 * The counts mirror EXACTLY the rules the Agendas-tab collapsed card used before this refactor:
 *  - roles: presiding/conducting/pianist/conductor name filled;
 *  - speakers: assigned positions 1..3 honoring `has_second_speech`, counting an agenda override OR
 *    the speech's speaker_name (special/no-sacrament Sundays have no speakers block → {0,0});
 *  - prayers: positions 0/4 with a speaker_name, out of 2;
 *  - hymns: opening/sacrament/closing (+ intermediate for regular Sundays unless a special
 *    presentation replaces it), matching the old 3-vs-4 total logic.
 *
 * The `nameRows` mirror the former speeches collapsed card: opening prayer (pos 0) when prayers are
 * managed, speaker rows (pos 1..3 honoring `has_second_speech`), closing prayer (pos 4) when
 * managed. Testimony/primary Sundays keep ONLY the prayer rows (and only when managed); no-sacrament
 * Sundays have no rows. Row names come from the speech's speaker_name snapshot.
 */

import type { Speech, SundayAgenda, SundayExceptionReason } from '../types/database';
import type { UnifiedNameRow } from '../components/UnifiedSundayCard';

/** Exception reasons that have no sacrament meeting → no speakers/prayers/hymns block. */
const NO_SACRAMENT_REASONS: ReadonlySet<SundayExceptionReason> = new Set([
  'general_conference',
  'stake_conference',
  'ward_conference',
  'other',
]);

/** Exception reasons that keep prayers but no speakers (opening/closing prayer only). */
const TESTIMONY_REASONS: ReadonlySet<SundayExceptionReason> = new Set([
  'testimony_meeting',
  'primary_presentation',
]);

export interface BuildUnifiedCardDataInput {
  /** The agenda record for the Sunday (null if not yet created). */
  agenda: SundayAgenda | null;
  /** The speech rows for the Sunday (may be empty). */
  speeches: Speech[];
  /** The Sunday's exception reason (null / 'speeches' => a regular speeches Sunday). */
  exceptionReason: SundayExceptionReason | null;
  /** Ward-level manage_prayers flag: gates prayer counts + prayer name rows. */
  managePrayers: boolean;
}

export interface UnifiedCardData {
  roles: { preside: boolean; conduct: boolean; piano: boolean; lead: boolean };
  speakers: { done: number; total: number };
  prayers: { done: number; total: number };
  hymns: { done: number; total: number };
  nameRows: UnifiedNameRow[];
}

/**
 * Map a Sunday's raw data to the `UnifiedSundayCard` inputs. Pure — no hooks, no side effects.
 */
export function buildUnifiedCardData({
  agenda,
  speeches,
  exceptionReason,
  managePrayers,
}: BuildUnifiedCardDataInput): UnifiedCardData {
  const reason = exceptionReason === 'speeches' ? null : exceptionReason;
  const isNoSacrament = reason != null && NO_SACRAMENT_REASONS.has(reason);
  const isTestimony = reason != null && TESTIMONY_REASONS.has(reason);
  const isRegular = !isNoSacrament && !isTestimony;

  // --- Roles (Block-1 line 1) ---
  const roles = {
    preside: !!agenda?.presiding_name,
    conduct: !!agenda?.conducting_name,
    piano: !!agenda?.pianist_name,
    lead: !!agenda?.conductor_name,
  };

  // --- Speakers count (regular Sundays only) ---
  const hasSecondSpeech = agenda?.has_second_speech ?? true;
  const speakerPositions = hasSecondSpeech ? [1, 2, 3] : [1, 3];
  let speakersDone = 0;
  if (isRegular) {
    for (const pos of speakerPositions) {
      const overrideField = `speaker_${pos}_override` as keyof SundayAgenda;
      const overrideVal = agenda?.[overrideField] as string | null | undefined;
      const speech = speeches.find((s) => s.position === pos);
      if (overrideVal ?? speech?.speaker_name) speakersDone++;
    }
  }
  const speakers = { done: speakersDone, total: isRegular ? speakerPositions.length : 0 };

  // --- Prayers count (positions 0/4 with a speaker, out of 2) ---
  let prayersDone = 0;
  for (const s of speeches) {
    if ((s.position === 0 || s.position === 4) && s.speaker_name) prayersDone++;
  }
  const prayers = { done: prayersDone, total: 2 };

  // --- Hymns count ---
  let hymnsDone = 0;
  let hymnsTotal = 3; // opening + sacrament + closing
  if (agenda?.opening_hymn_id) hymnsDone++;
  if (agenda?.sacrament_hymn_id) hymnsDone++;
  if (agenda?.closing_hymn_id) hymnsDone++;
  // Intermediate hymn only counts for regular Sundays that keep it (no special presentation).
  if (isRegular && agenda?.has_intermediate_hymn !== false && !agenda?.has_special_presentation) {
    hymnsTotal = 4;
    if (agenda?.intermediate_hymn_id) hymnsDone++;
  }
  const hymns = { done: hymnsDone, total: hymnsTotal };

  // --- Name rows (Block 2) ---
  const prayerRow = (pos: 0 | 4): UnifiedNameRow => {
    const s = speeches.find((x) => x.position === pos);
    return {
      key: `prayer-${pos}`,
      kind: 'prayer',
      status: s?.status ?? 'not_assigned',
      name: s?.speaker_name ?? null,
    };
  };
  const speakerRow = (pos: number): UnifiedNameRow => {
    const s = speeches.find((x) => x.position === pos);
    return {
      key: `speaker-${pos}`,
      kind: 'speaker',
      status: s?.status ?? 'not_assigned',
      name: s?.speaker_name ?? null,
    };
  };

  const nameRows: UnifiedNameRow[] = [];
  if (isNoSacrament) {
    // no rows
  } else if (isTestimony) {
    if (managePrayers) {
      nameRows.push(prayerRow(0), prayerRow(4));
    }
  } else {
    if (managePrayers) nameRows.push(prayerRow(0));
    for (const pos of speakerPositions) nameRows.push(speakerRow(pos));
    if (managePrayers) nameRows.push(prayerRow(4));
  }

  return { roles, speakers, prayers, hymns, nameRows };
}
