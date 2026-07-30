/**
 * Pure utility functions for speech assignment logic (no React Native deps).
 * Used by NextAssignmentsSection and InviteManagementSection.
 */

import type { Speech, SpeechBySunday } from '../types/database';

/**
 * Whether position 2 (the second speech) is required for a given Sunday. Position 2 is only required
 * when the ward's `has_second_speech` is not explicitly false for that date. `hasSecondSpeechByDate`
 * maps a Sunday date → its agenda's `has_second_speech`; a missing entry defaults to required.
 */
function isPositionRequired(
  pos: number,
  date: string,
  hasSecondSpeechByDate?: Map<string, boolean>
): boolean {
  if (pos === 2 && hasSecondSpeechByDate?.get(date) === false) return false;
  return true;
}

/**
 * Check if all speeches of the next 3 sundays are assigned.
 * A speech is "assigned" if status != not_assigned and status != gave_up. Position 2 is skipped for
 * Sundays whose agenda has `has_second_speech === false` (otherwise the widget would be permanently
 * hidden for wards that disable the second speech).
 */
export function areNext3FullyAssigned(
  next3: SpeechBySunday[],
  hasSecondSpeechByDate?: Map<string, boolean>
): boolean {
  for (const entry of next3.slice(0, 3)) {
    // Exception sundays don't need speeches
    if (entry.exception) continue;

    for (let pos = 1; pos <= 3; pos++) {
      if (!isPositionRequired(pos, entry.date, hasSecondSpeechByDate)) continue;
      const speech = entry.speeches.find((s) => s.position === pos);
      if (!speech) return false;
      if (speech.status === 'not_assigned' || speech.status === 'gave_up') return false;
      if (!speech.speaker_name) return false;
    }
  }
  return true;
}

/**
 * Find the first sunday after the next 3 with pending speeches (honoring has_second_speech).
 */
export function findNextPendingSunday(
  allEntries: SpeechBySunday[],
  hasSecondSpeechByDate?: Map<string, boolean>
): SpeechBySunday | null {
  for (let i = 3; i < allEntries.length; i++) {
    const entry = allEntries[i];
    // Skip exceptions
    if (entry.exception) continue;

    // Check if any required position is pending
    for (let pos = 1; pos <= 3; pos++) {
      if (!isPositionRequired(pos, entry.date, hasSecondSpeechByDate)) continue;
      const speech = entry.speeches.find((s) => s.position === pos);
      if (!speech || speech.status === 'not_assigned' || speech.status === 'gave_up') {
        return entry;
      }
    }
  }
  return null;
}

export interface InviteItem {
  speech: Speech;
  compactDate: string;
}

/**
 * Filter speeches that need invitation management.
 */
export function getInviteItems(
  speeches: Speech[],
  locale: string,
  formatDateFn: (date: string, locale: 'pt-BR' | 'en-US' | 'es-LA') => string
): InviteItem[] {
  return speeches
    .filter(
      (s) => s.status === 'assigned_not_invited' || s.status === 'assigned_invited'
    )
    .sort((a, b) => {
      // Sort by date first, then position
      const dateCompare = a.sunday_date.localeCompare(b.sunday_date);
      if (dateCompare !== 0) return dateCompare;
      return a.position - b.position;
    })
    .map((speech) => ({
      speech,
      compactDate: formatDateFn(speech.sunday_date, locale as 'pt-BR' | 'en-US' | 'es-LA'),
    }));
}
