/**
 * TanStack Query hooks for sunday type management and auto-assignment.
 * Implements F007 sunday exception logic with auto-assignment rules.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { logAction } from '../lib/activityLog';
import { parseLocalDate, formatDateHumanReadable } from '../lib/dateUtils';
import { getCurrentLanguage } from '../i18n';
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
 * Per F007/CR-56: "speeches" is stored in sunday_exceptions table
 * like any other reason. All sundays have an entry after auto-assignment.
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
  'primary_presentation',
  'other',
] as const;

export type SundayTypeOption = (typeof SUNDAY_TYPE_OPTIONS)[number];

/**
 * Human-readable sunday type names for activity log descriptions.
 */
const SUNDAY_TYPE_LABELS: Record<string, Record<string, string>> = {
  'pt-BR': {
    speeches: 'Domingo com Discursos',
    testimony_meeting: 'Reuniao de Testemunho',
    general_conference: 'Conferencia Geral',
    stake_conference: 'Conferencia de Estaca',
    ward_conference: 'Conferencia da Ala',
    primary_presentation: 'Reuniao Especial da Primaria',
    other: 'Outro',
  },
  en: {
    speeches: 'Sunday with Speeches',
    testimony_meeting: 'Testimony Meeting',
    general_conference: 'General Conference',
    stake_conference: 'Stake Conference',
    ward_conference: 'Ward Conference',
    primary_presentation: 'Primary Special Presentation',
    other: 'Other',
  },
  es: {
    speeches: 'Domingo con Discursos',
    testimony_meeting: 'Reunion de Testimonios',
    general_conference: 'Conferencia General',
    stake_conference: 'Conferencia de Estaca',
    ward_conference: 'Conferencia de Barrio',
    primary_presentation: 'Presentacion Especial de la Primaria',
    other: 'Otro',
  },
};

function getSundayTypeLabel(reason: string, language: string): string {
  return SUNDAY_TYPE_LABELS[language]?.[reason] ?? SUNDAY_TYPE_LABELS['pt-BR'][reason] ?? reason;
}

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
export function getAutoAssignedType(date: Date): SundayExceptionReason {
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
      const entries = missingDates.map((dateStr) => {
          const date = parseLocalDate(dateStr);
          const type = getAutoAssignedType(date);
          return {
            ward_id: wardId,
            date: dateStr,
            reason: type as SundayExceptionReason,
          };
        });

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
 * Uses optimistic update for instant UI feedback.
 */
export function useSetSundayType() {
  const { wardId, user, userName } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      date,
      reason,
      custom_reason,
    }: {
      date: string;
      reason: SundayExceptionReason;
      custom_reason?: string | null;
    }): Promise<void> => {
      // Upsert: if entry exists, update; otherwise insert
      const { data: existing } = await supabase
        .from('sunday_exceptions')
        .select('id')
        .eq('ward_id', wardId)
        .eq('date', date)
        .maybeSingle();

      const payload = {
        reason,
        custom_reason: reason === 'other' ? (custom_reason ?? null) : null,
      };

      if (existing) {
        const { error } = await supabase
          .from('sunday_exceptions')
          .update(payload)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('sunday_exceptions')
          .insert({ ward_id: wardId, date, ...payload });
        if (error) throw error;
      }
    },
    onMutate: async (variables) => {
      // Cancel outgoing refetches so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: sundayTypeKeys.all });

      // Optimistically update all cached sundayTypes queries
      queryClient.setQueriesData<SundayException[]>(
        { queryKey: sundayTypeKeys.all },
        (old) => {
          if (!old) return old;
          const idx = old.findIndex((e) => e.date === variables.date && e.ward_id === wardId);
          const optimistic: SundayException = {
            id: idx >= 0 ? old[idx].id : `optimistic-${variables.date}`,
            ward_id: wardId,
            date: variables.date,
            reason: variables.reason,
            custom_reason: variables.reason === 'other' ? (variables.custom_reason ?? null) : null,
          };
          if (idx >= 0) {
            const updated = [...old];
            updated[idx] = optimistic;
            return updated;
          }
          return [...old, optimistic];
        }
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: sundayTypeKeys.all });
      if (user) {
        const lang = getCurrentLanguage();
        const dateStr = formatDateHumanReadable(variables.date, lang);
        const typeLabel = getSundayTypeLabel(variables.reason, lang);
        logAction(wardId, user.id, user.email ?? '', 'sunday_type:change', `Domingo dia ${dateStr} ajustado para ${typeLabel}`, userName);
      }
    },
    onError: () => {
      // Revert optimistic update on error by refetching
      queryClient.invalidateQueries({ queryKey: sundayTypeKeys.all });
    },
  });
}

/**
 * Revert a sunday exception to default "speeches" type.
 * Updates the entry in-place rather than deleting it.
 * Uses optimistic update for instant UI feedback.
 */
export function useRemoveSundayException() {
  const { wardId, user, userName } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (date: string): Promise<void> => {
      const { error } = await supabase
        .from('sunday_exceptions')
        .update({ reason: 'speeches' as SundayExceptionReason, custom_reason: null })
        .eq('ward_id', wardId)
        .eq('date', date);
      if (error) throw error;
    },
    onMutate: async (date) => {
      await queryClient.cancelQueries({ queryKey: sundayTypeKeys.all });

      // Optimistically update the exception to 'speeches' in cached data
      queryClient.setQueriesData<SundayException[]>(
        { queryKey: sundayTypeKeys.all },
        (old) => {
          if (!old) return old;
          return old.map((e) => {
            if (e.date === date && e.ward_id === wardId) {
              return { ...e, reason: 'speeches' as SundayExceptionReason, custom_reason: null };
            }
            return e;
          });
        }
      );
    },
    onSuccess: (_data, date) => {
      queryClient.invalidateQueries({ queryKey: sundayTypeKeys.all });
      if (user) {
        const lang = getCurrentLanguage();
        const dateStr = formatDateHumanReadable(date, lang);
        const typeLabel = getSundayTypeLabel('speeches', lang);
        logAction(wardId, user.id, user.email ?? '', 'sunday_type:change', `Domingo dia ${dateStr} ajustado para ${typeLabel}`, userName);
      }
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: sundayTypeKeys.all });
    },
  });
}
