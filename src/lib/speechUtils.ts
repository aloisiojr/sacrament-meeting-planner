/**
 * Pure utility functions for speech assignment logic (no React Native deps).
 * Used by NextAssignmentsSection and InviteManagementSection.
 */

import type { Speech, SpeechBySunday } from '../types/database';

/**
 * Check if all 9 speeches of the next 3 sundays are assigned.
 * A speech is "assigned" if status != not_assigned and status != gave_up.
 */
export function areNext3FullyAssigned(next3: SpeechBySunday[]): boolean {
  for (const entry of next3.slice(0, 3)) {
    // Exception sundays don't need speeches
    if (entry.exception) continue;

    // Check if all 3 positions have assigned speakers
    for (let pos = 1; pos <= 3; pos++) {
      const speech = entry.speeches.find((s) => s.position === pos);
      if (!speech) return false;
      if (speech.status === 'not_assigned' || speech.status === 'gave_up') return false;
      if (!speech.speaker_name) return false;
    }
  }
  return true;
}

/**
 * Find the first sunday after the next 3 with pending speeches.
 */
export function findNextPendingSunday(allEntries: SpeechBySunday[]): SpeechBySunday | null {
  for (let i = 3; i < allEntries.length; i++) {
    const entry = allEntries[i];
    // Skip exceptions
    if (entry.exception) continue;

    // Check if any position is pending
    for (let pos = 1; pos <= 3; pos++) {
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
  formatDateFn: (date: string, locale: 'pt-BR' | 'en' | 'es') => string
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
      compactDate: formatDateFn(speech.sunday_date, locale as 'pt-BR' | 'en' | 'es'),
    }));
}
