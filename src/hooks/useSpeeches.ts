/**
 * TanStack Query hooks for speech CRUD and lifecycle management.
 * Implements snapshot pattern (ADR-003): speaker/topic stored as text alongside FKs.
 * Status lifecycle: not_assigned -> assigned_not_invited -> assigned_invited -> assigned_confirmed | gave_up
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { logAction } from '../lib/activityLog';
import { formatDateHumanReadable } from '../lib/dateUtils';
import { getCurrentLanguage } from '../i18n';
import type {
  Speech,
  SpeechStatus,
  SpeechBySunday,
  DateRange,
  SundayException,
} from '../types/database';

// --- Query Keys ---

export const speechKeys = {
  all: ['speeches'] as const,
  byDateRange: (wardId: string, start: string, end: string) =>
    ['speeches', 'byDateRange', wardId, start, end] as const,
  bySunday: (wardId: string, date: string) =>
    ['speeches', 'bySunday', wardId, date] as const,
};

// --- Types ---

export interface AssignSpeakerInput {
  speechId: string;
  memberId: string;
  speakerName: string;
  speakerPhone: string | null;
  status?: SpeechStatus;
}

export interface AssignTopicInput {
  speechId: string;
  topicTitle: string;
  topicLink?: string | null;
  topicCollection: string;
}

export interface ChangeStatusInput {
  speechId: string;
  status: SpeechStatus;
}

// --- Status Lifecycle ---

/**
 * Valid status transitions for the speech lifecycle.
 * Bishopric can also directly set assigned_invited (bypass WhatsApp).
 */
export const VALID_TRANSITIONS: Record<SpeechStatus, SpeechStatus[]> = {
  not_assigned: ['assigned_not_invited'],
  assigned_not_invited: ['assigned_invited', 'not_assigned'],
  assigned_invited: ['assigned_confirmed', 'assigned_not_invited', 'gave_up', 'not_assigned'],
  assigned_confirmed: ['not_assigned'],
  gave_up: ['not_assigned'],
};

/**
 * Check if a status transition is valid.
 */
export function isValidTransition(from: SpeechStatus, to: SpeechStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get available next statuses from the current status.
 */
export function getAvailableStatuses(current: SpeechStatus): SpeechStatus[] {
  return VALID_TRANSITIONS[current] ?? [];
}

// --- Hooks ---

/**
 * Fetch speeches for a date range, grouped by sunday date.
 */
export function useSpeeches(dateRange: DateRange) {
  const { wardId } = useAuth();

  return useQuery({
    queryKey: speechKeys.byDateRange(wardId, dateRange.start, dateRange.end),
    queryFn: async (): Promise<Speech[]> => {
      const { data, error } = await supabase
        .from('speeches')
        .select('*')
        .eq('ward_id', wardId)
        .gte('sunday_date', dateRange.start)
        .lte('sunday_date', dateRange.end)
        .order('sunday_date', { ascending: true })
        .order('position', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!wardId && !!dateRange.start && !!dateRange.end,
  });
}

/**
 * Group speeches by sunday date and merge with exceptions.
 */
export function groupSpeechesBySunday(
  speeches: Speech[],
  sundayDates: string[],
  exceptions: SundayException[]
): SpeechBySunday[] {
  const exceptionMap = new Map<string, SundayException>();
  for (const ex of exceptions) {
    exceptionMap.set(ex.date, ex);
  }

  const speechMap = new Map<string, Speech[]>();
  for (const speech of speeches) {
    const existing = speechMap.get(speech.sunday_date) ?? [];
    existing.push(speech);
    speechMap.set(speech.sunday_date, existing);
  }

  return sundayDates.map((date) => ({
    date,
    exception: exceptionMap.get(date) ?? null,
    speeches: speechMap.get(date) ?? [],
  }));
}

/**
 * Lazy-create 3 speech records for a sunday date.
 * Only creates if records don't already exist for that date (ADR-005).
 */
export function useLazyCreateSpeeches() {
  const { wardId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sundayDate: string): Promise<Speech[]> => {
      // Check if speeches already exist
      const { data: existing, error: checkErr } = await supabase
        .from('speeches')
        .select('id')
        .eq('ward_id', wardId)
        .eq('sunday_date', sundayDate);

      if (checkErr) throw checkErr;
      if (existing && existing.length > 0) return [];

      // Create 3 speech records
      const records = [1, 2, 3].map((position) => ({
        ward_id: wardId,
        sunday_date: sundayDate,
        position,
        status: 'not_assigned' as SpeechStatus,
      }));

      const { data, error } = await supabase
        .from('speeches')
        .insert(records)
        .select();

      if (error) throw error;
      return data ?? [];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: speechKeys.all });
    },
  });
}

/**
 * Assign a speaker to a speech.
 * Sets member_id + snapshot fields + status = assigned_not_invited.
 * Bishopric-only operation.
 */
export function useAssignSpeaker() {
  const { wardId, user, userName } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AssignSpeakerInput): Promise<Speech> => {
      const { data, error } = await supabase
        .from('speeches')
        .update({
          member_id: input.memberId,
          speaker_name: input.speakerName,
          speaker_phone: input.speakerPhone,
          status: (input.status ?? 'assigned_not_invited') as SpeechStatus,
        })
        .eq('id', input.speechId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: speechKeys.all });
      if (user) {
        logAction(wardId, user.id, user.email ?? '', 'speech:assign', `${data.speaker_name} designado para ${data.position}o discurso dia ${formatDateHumanReadable(data.sunday_date, getCurrentLanguage())}`, userName);
      }
    },
  });
}

/**
 * Assign a topic to a speech.
 * Sets topic_title, topic_link, topic_collection (all snapshots).
 */
export function useAssignTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AssignTopicInput): Promise<Speech> => {
      const { data, error } = await supabase
        .from('speeches')
        .update({
          topic_title: input.topicTitle,
          topic_link: input.topicLink ?? null,
          topic_collection: input.topicCollection,
        })
        .eq('id', input.speechId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: speechKeys.all });
    },
  });
}

/**
 * Change the status of a speech.
 * Validates the transition before applying.
 * Bishopric + Secretary can change status.
 */
export function useChangeStatus() {
  const { wardId, user, userName } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ChangeStatusInput): Promise<Speech> => {
      // Fetch current speech to validate transition
      const { data: current, error: fetchErr } = await supabase
        .from('speeches')
        .select('status')
        .eq('id', input.speechId)
        .single();

      if (fetchErr) throw fetchErr;
      if (!isValidTransition(current.status as SpeechStatus, input.status)) {
        throw new Error(`Invalid status transition: ${current.status} -> ${input.status}`);
      }

      const { data, error } = await supabase
        .from('speeches')
        .update({ status: input.status })
        .eq('id', input.speechId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: speechKeys.all });
      if (user) {
        logAction(wardId, user.id, user.email ?? '', 'speech:status_change', `Status de ${data.speaker_name ?? 'N/A'} alterado para ${data.status} (${formatDateHumanReadable(data.sunday_date, getCurrentLanguage())}, ${data.position}o discurso)`, userName);
      }
    },
  });
}

/**
 * Remove a speaker assignment.
 * Resets speaker fields + status = not_assigned.
 * Topic remains assigned.
 * Bishopric-only operation.
 */
export function useRemoveAssignment() {
  const { wardId, user, userName } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ speechId, speakerName }: { speechId: string; speakerName?: string }): Promise<{ speech: Speech; previousSpeaker: string }> => {
      const { data, error } = await supabase
        .from('speeches')
        .update({
          member_id: null,
          speaker_name: null,
          speaker_phone: null,
          status: 'not_assigned' as SpeechStatus,
        })
        .eq('id', speechId)
        .select()
        .single();

      if (error) throw error;
      return { speech: data, previousSpeaker: speakerName ?? 'N/A' };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: speechKeys.all });
      if (user) {
        logAction(wardId, user.id, user.email ?? '', 'speech:unassign', `Designacao de ${result.previousSpeaker} removida (${formatDateHumanReadable(result.speech.sunday_date, getCurrentLanguage())}, ${result.speech.position}o discurso)`, userName);
      }
    },
  });
}
