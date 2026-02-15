/**
 * TanStack Query hooks for sunday type management and auto-assignment.
 * Implements F007 sunday exception logic with auto-assignment rules.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { logAction } from '../lib/activityLog';
import { parseLocalDate } from '../lib/dateUtils';
import type { SundayException, SundayExceptionReason } from '../types/database';

// --- Query Keys ---

export const sundayTypeKeys = {
  all: ['sundayTypes'] as const,
  exceptions: (wardId: string, start: string, end: string) =>
    ['sundayTypes', 'exceptions', wardId, start, end] as const,
};

// --- Sunday Type Constants ---

/**
 * The default type for regular sundays (speeches).
 * Note: "speeches" is a virtual type - it means NO exception record exists,
 * or after auto-assignment, all sundays have an entry.
 * Per F007: "Discursos" is also stored in sunday_exceptions table.
 */
export const SUNDAY_TYPE_SPEECHES = 'speeches' as const;

/**
 * All available sunday type options for the dropdown.
 */
export const SUNDAY_TYPE_OPTIONS = [
  SUNDAY_TYPE_SPEECHES,
  'testimony_meeting',
  'general_conference',
  'stake_conference',
  'ward_conference',
  'fast_sunday',
  'special_program',
  'no_meeting',
  'other',
] as const;

export type SundayTypeOption = (typeof SUNDAY_TYPE_OPTIONS)[number];

// --- Auto-Assignment Logic ---

/**
 * Determine the auto-assigned sunday type for a given date.
 *
 * Rules (F007 AC-021):
 * - Default: "speeches" (Discursos)
 * - 1st Sunday of Jan-Mar, May-Sep, Nov-Dec: "testimony_meeting"
 * - 1st Sunday of Apr, Oct: "general_conference"
 * - 2nd Sunday of Apr, Oct: "testimony_meeting"
 */
export function getAutoAssignedType(date: Date): SundayExceptionReason | typeof SUNDAY_TYPE_SPEECHES {
  const month = date.getMonth() + 1; // 1-indexed
  const sundayOfMonth = getSundayOfMonth(date);

  // April and October: special conference rules
  if (month === 4 || month === 10) {
    if (sundayOfMonth === 1) return 'general_conference';
    if (sundayOfMonth === 2) return 'testimony_meeting';
    return SUNDAY_TYPE_SPEECHES;
  }

  // All other months: 1st Sunday is testimony meeting
  // Jan-Mar, May-Sep, Nov-Dec
  if (sundayOfMonth === 1) {
    return 'testimony_meeting';
  }

  return SUNDAY_TYPE_SPEECHES;
}

/**
 * Get which Sunday of the month a date is (1st, 2nd, 3rd, 4th, 5th).
 */
export function getSundayOfMonth(date: Date): number {
  const day = date.getDate();
  return Math.ceil(day / 7);
}

// --- Hooks ---

/**
 * Fetch sunday exceptions for a date range.
 */
export function useSundayExceptions(startDate: string, endDate: string) {
  const { wardId } = useAuth();

  return useQuery({
    queryKey: sundayTypeKeys.exceptions(wardId, startDate, endDate),
    queryFn: async (): Promise<SundayException[]> => {
      const { data, error } = await supabase
        .from('sunday_exceptions')
        .select('*')
        .eq('ward_id', wardId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!wardId,
  });
}

/**
 * Auto-assign sunday types for sundays without entries.
 * Calculates the expected type for each date and persists immediately.
 * Returns the number of entries created.
 */
export function useAutoAssignSundayTypes() {
  const { wardId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sundayDates: string[]): Promise<number> => {
      if (sundayDates.length === 0) return 0;

      // Fetch existing exceptions for these dates
      const { data: existing, error: fetchErr } = await supabase
        .from('sunday_exceptions')
        .select('date')
        .eq('ward_id', wardId)
        .in('date', sundayDates);

      if (fetchErr) throw fetchErr;

      const existingDates = new Set((existing ?? []).map((e) => e.date));

      // Filter to only dates without entries
      const missingDates = sundayDates.filter((d) => !existingDates.has(d));

      if (missingDates.length === 0) return 0;

      // Calculate auto-assigned types for missing dates
      const entries = missingDates
        .map((dateStr) => {
          const date = parseLocalDate(dateStr);
          const type = getAutoAssignedType(date);
          // Only create exception entries for non-speeches types
          // Per F007: "Discursos" is also stored, so actually all sundays get entries
          if (type === SUNDAY_TYPE_SPEECHES) return null;
          return {
            ward_id: wardId,
            date: dateStr,
            reason: type as SundayExceptionReason,
          };
        })
        .filter(Boolean) as { ward_id: string; date: string; reason: SundayExceptionReason }[];

      if (entries.length === 0) return 0;

      const { error: insertErr } = await supabase
        .from('sunday_exceptions')
        .insert(entries);

      if (insertErr) throw insertErr;

      return entries.length;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sundayTypeKeys.all });
    },
  });
}

/**
 * Set the sunday type for a specific date.
 * Creates or updates the exception entry.
 */
export function useSetSundayType() {
  const { wardId, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      date,
      reason,
    }: {
      date: string;
      reason: SundayExceptionReason;
    }): Promise<void> => {
      // Upsert: if entry exists, update; otherwise insert
      const { data: existing } = await supabase
        .from('sunday_exceptions')
        .select('id')
        .eq('ward_id', wardId)
        .eq('date', date)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('sunday_exceptions')
          .update({ reason })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('sunday_exceptions')
          .insert({ ward_id: wardId, date, reason });
        if (error) throw error;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: sundayTypeKeys.all });
      if (user) {
        logAction(wardId, user.id, user.email ?? '', 'sunday_type:change', `Tipo de domingo alterado: ${variables.date} -> ${variables.reason}`);
      }
    },
  });
}

/**
 * Remove a sunday exception (revert to default "speeches").
 */
export function useRemoveSundayException() {
  const { wardId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (date: string): Promise<void> => {
      const { error } = await supabase
        .from('sunday_exceptions')
        .delete()
        .eq('ward_id', wardId)
        .eq('date', date);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sundayTypeKeys.all });
    },
  });
}
