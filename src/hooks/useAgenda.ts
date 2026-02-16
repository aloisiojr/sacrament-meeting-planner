/**
 * TanStack Query hooks for agenda CRUD operations.
 * Implements lazy creation (agenda created when sunday is first opened)
 * and auto-save on every field change.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { logAction } from '../lib/activityLog';
import { formatDateHumanReadable } from '../lib/dateUtils';
import { getCurrentLanguage } from '../i18n';
import type { SundayAgenda } from '../types/database';

// --- Query Keys ---

export const agendaKeys = {
  all: ['agendas'] as const,
  bySunday: (wardId: string, date: string) =>
    ['agendas', 'bySunday', wardId, date] as const,
  byDateRange: (wardId: string, start: string, end: string) =>
    ['agendas', 'byDateRange', wardId, start, end] as const,
};

// --- Types ---

export type AgendaUpdateInput = Partial<Omit<SundayAgenda, 'id' | 'ward_id' | 'sunday_date' | 'created_at' | 'updated_at'>>;

// --- Utilities ---

/**
 * Exception types that exclude a sunday from the Agenda tab.
 * Gen Conf and Stake Conf have no sacrament meeting.
 */
export const EXCLUDED_EXCEPTION_TYPES = new Set([
  'general_conference',
  'stake_conference',
]);

/**
 * Check if a sunday exception type is excluded from the Agenda tab.
 */
export function isExcludedFromAgenda(reason: string): boolean {
  return EXCLUDED_EXCEPTION_TYPES.has(reason);
}

/**
 * Check if a sunday is a special meeting type (not normal speeches).
 */
export function isSpecialMeeting(reason: string | null): boolean {
  if (!reason) return false;
  return reason === 'testimony_meeting'
    || reason === 'ward_conference'
    || reason === 'primary_presentation'
    || reason === 'other';
}

// --- Hooks ---

/**
 * Fetch agenda for a specific sunday date.
 */
export function useAgenda(sundayDate: string) {
  const { wardId } = useAuth();

  return useQuery({
    queryKey: agendaKeys.bySunday(wardId, sundayDate),
    queryFn: async (): Promise<SundayAgenda | null> => {
      const { data, error } = await supabase
        .from('sunday_agendas')
        .select('*')
        .eq('ward_id', wardId)
        .eq('sunday_date', sundayDate)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!wardId && !!sundayDate,
  });
}

/**
 * Lazy-create an agenda record for a sunday date.
 * Uses ON CONFLICT DO NOTHING to handle concurrent creation.
 */
export function useLazyCreateAgenda() {
  const { wardId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sundayDate: string): Promise<SundayAgenda> => {
      // Check if agenda already exists
      const { data: existing } = await supabase
        .from('sunday_agendas')
        .select('*')
        .eq('ward_id', wardId)
        .eq('sunday_date', sundayDate)
        .maybeSingle();

      if (existing) return existing;

      // Create new agenda with all fields null/default
      const { data, error } = await supabase
        .from('sunday_agendas')
        .insert({
          ward_id: wardId,
          sunday_date: sundayDate,
          has_baby_blessing: false,
          has_baptism_confirmation: false,
          has_stake_announcements: false,
          has_special_presentation: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, sundayDate) => {
      queryClient.invalidateQueries({ queryKey: agendaKeys.bySunday(wardId, sundayDate) });
      queryClient.invalidateQueries({ queryKey: agendaKeys.all });
    },
  });
}

/**
 * Update agenda fields with auto-save pattern.
 * Accepts partial updates - only sends changed fields.
 */
export function useUpdateAgenda() {
  const { wardId, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      agendaId,
      fields,
    }: {
      agendaId: string;
      fields: AgendaUpdateInput;
    }): Promise<SundayAgenda> => {
      const { data, error } = await supabase
        .from('sunday_agendas')
        .update(fields)
        .eq('id', agendaId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: agendaKeys.bySunday(wardId, data.sunday_date),
      });
      queryClient.invalidateQueries({ queryKey: agendaKeys.all });
      if (user) {
        logAction(wardId, user.id, user.email ?? '', 'agenda:edit', `Agenda do dia ${formatDateHumanReadable(data.sunday_date, getCurrentLanguage())} editada`);
      }
    },
  });
}
