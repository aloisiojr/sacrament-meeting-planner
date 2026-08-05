/**
 * TanStack Query hooks for speech CRUD and lifecycle management.
 * Implements snapshot pattern (ADR-003): speaker/topic stored as text alongside FKs.
 * Status lifecycle: not_assigned -> assigned_not_invited -> assigned_invited -> assigned_confirmed | gave_up
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { logAction, buildLogDescription } from '../lib/activityLog';
import { withOfflineQueue } from '../lib/offlineMutation';
import { formatDateHumanReadable } from '../lib/dateUtils';
import { getCurrentLanguage } from '../i18n';
import type {
  Speech,
  SpeechStatus,
  SpeechBySunday,
  DateRange,
  SundayException,
  SundayExceptionReason,
} from '../types/database';

// --- Query Keys ---

export const speechKeys = {
  all: ['speeches'] as const,
  byDateRange: (wardId: string, start: string, end: string) =>
    ['speeches', 'byDateRange', wardId, start, end] as const,
  bySunday: (wardId: string, date: string) =>
    ['speeches', 'bySunday', wardId, date] as const,
};

export const wardKeys = {
  managePrayers: (wardId: string) =>
    ['ward', wardId, 'managePrayers'] as const,
};

// --- Types ---

export interface AssignSpeakerInput {
  speechId: string;
  memberId: string;
  speakerName: string;
  speakerInformalName: string | null;
  speakerPhone: string | null;
  status?: SpeechStatus;
  // v2.0 — resolved contact-delegation snapshot (optional; default not-delegated).
  contactPhone?: string | null;
  isDelegated?: boolean;
  delegateForName?: string | null;
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
  assigned_not_invited: ['assigned_invited', 'assigned_confirmed', 'gave_up', 'not_assigned'],
  assigned_invited: ['assigned_not_invited', 'assigned_confirmed', 'gave_up', 'not_assigned'],
  assigned_confirmed: ['assigned_not_invited', 'assigned_invited', 'gave_up', 'not_assigned'],
  gave_up: ['assigned_not_invited', 'assigned_invited', 'assigned_confirmed', 'not_assigned'],
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
 * Query the ward's manage_prayers flag.
 * Returns false as default when loading or no data.
 */
export function useWardManagePrayers(): { managePrayers: boolean; isLoading: boolean } {
  const { wardId } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: wardKeys.managePrayers(wardId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wards')
        .select('manage_prayers')
        .eq('id', wardId)
        .single();

      if (error) throw error;
      return data?.manage_prayers ?? false;
    },
    enabled: !!wardId,
  });

  return { managePrayers: data ?? false, isLoading };
}

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
 * Lazy-create speech records for a sunday date based on sunday type.
 * Positions by type: speeches=[0,1,2,3,4], testimony/primary=[0,4], conference/other=[].
 * Only creates if records don't already exist for that date (ADR-005).
 */
export function useLazyCreateSpeeches() {
  const { wardId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { sundayDate: string; sundayType?: SundayExceptionReason }): Promise<Speech[]> => {
      const { sundayDate, sundayType } = input;

      // Determine positions based on sunday type
      let positions: number[];
      switch (sundayType) {
        case 'testimony_meeting':
        case 'primary_presentation':
          positions = [0, 4];
          break;
        case 'general_conference':
        case 'stake_conference':
        case 'ward_conference':
        case 'other':
          positions = [];
          break;
        case 'speeches':
        default:
          positions = [0, 1, 2, 3, 4];
          break;
      }

      if (positions.length === 0) return [];

      // Check which positions already exist
      const { data: existing, error: checkErr } = await supabase
        .from('speeches')
        .select('position')
        .eq('ward_id', wardId)
        .eq('sunday_date', sundayDate);

      if (checkErr) throw checkErr;

      // Find missing positions (handles partial creation from migration 019)
      const existingPositions = new Set((existing ?? []).map((s) => s.position));
      const missingPositions = positions.filter((p) => !existingPositions.has(p));

      if (missingPositions.length === 0) return [];

      // Create speech records only for missing positions
      const records = missingPositions.map((position) => ({
        ward_id: wardId,
        sunday_date: sundayDate,
        position,
        status: 'not_assigned' as SpeechStatus,
      }));

      // Upsert (ignore duplicates) instead of a plain insert so a concurrent create from another
      // device doesn't hit the UNIQUE (ward_id,sunday_date,position) constraint. Rows are pure
      // defaults, so ignoring an existing one is safe (nothing to overwrite).
      const { data, error } = await supabase
        .from('speeches')
        .upsert(records, { onConflict: 'ward_id,sunday_date,position', ignoreDuplicates: true })
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
 * Bishopric and Secretary operation.
 */
export function useAssignSpeaker() {
  const { wardId, user, userName, role } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AssignSpeakerInput): Promise<Speech | null> => {
      const fields = {
        member_id: input.memberId,
        speaker_name: input.speakerName,
        speaker_informal_name: input.speakerInformalName,
        speaker_phone: input.speakerPhone,
        contact_phone: input.contactPhone ?? null,
        is_delegated: input.isDelegated ?? false,
        delegate_for_name: input.delegateForName ?? null,
        status: (input.status ?? 'assigned_not_invited') as SpeechStatus,
        assigned_by_role: role,
      };

      return withOfflineQueue(
        { table: 'speeches', operation: 'UPDATE', data: { id: input.speechId, ...fields } },
        async () => {
          const { data, error } = await supabase
            .from('speeches')
            .update(fields)
            .eq('id', input.speechId)
            .select()
            .single();

          if (error) throw error;
          return data;
        }
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: speechKeys.all });
      // null = queued offline. The activity log is server-side and takes the row's own values, so
      // it is written when the queued mutation actually lands, not now.
      if (!data) return;
      if (user) {
        logAction(wardId, user.id, user.email ?? '', 'speech:assign', buildLogDescription('speech:assign', { nome: data.speaker_name ?? '', N: data.position, data: formatDateHumanReadable(data.sunday_date, getCurrentLanguage()) }), userName);
      }
    },
  });
}

/**
 * Assign a topic to a speech.
 * Sets topic_title, topic_link, topic_collection (all snapshots).
 */
export function useAssignTopic() {
  const { wardId, user, userName, role } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AssignTopicInput): Promise<Speech | null> => {
      const fields = {
        topic_title: input.topicTitle,
        topic_link: input.topicLink ?? null,
        topic_collection: input.topicCollection,
        assigned_by_role: role,
      };

      return withOfflineQueue(
        { table: 'speeches', operation: 'UPDATE', data: { id: input.speechId, ...fields } },
        async () => {
          const { data, error } = await supabase
            .from('speeches')
            .update(fields)
            .eq('id', input.speechId)
            .select()
            .single();

          if (error) throw error;
          return data;
        }
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: speechKeys.all });
      if (!data) return; // queued offline — logged when it lands
      if (user) {
        logAction(wardId, user.id, user.email ?? '', 'speech:assign_theme', buildLogDescription('speech:assign_theme', { colecao: data.topic_collection ?? '', titulo: data.topic_title ?? '', N: data.position, data: formatDateHumanReadable(data.sunday_date, getCurrentLanguage()) }), userName);
      }
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

      // Guard the write on the status we validated (.eq('status', current.status)): if another
      // device changed it between our read and write, 0 rows update and we surface a retry instead
      // of silently applying a transition we never validated.
      const { data, error } = await supabase
        .from('speeches')
        .update({ status: input.status })
        .eq('id', input.speechId)
        .eq('status', current.status)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('Speech status changed concurrently; please retry.');
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: speechKeys.all });
      if (user) {
        logAction(wardId, user.id, user.email ?? '', 'speech:status_change', buildLogDescription('speech:status_change', { nome: data.speaker_name ?? 'N/A', status: data.status, data: formatDateHumanReadable(data.sunday_date, getCurrentLanguage()), N: data.position }), userName);
      }
    },
  });
}

/**
 * Refresh a speech's contact snapshot from the member's current record.
 *
 * The snapshot is deliberately frozen at assignment time, so this is only used when the sender is
 * shown the divergence and explicitly chooses the record over the snapshot.
 */
export function useUpdateSpeechContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      speechId: string;
      speakerPhone?: string | null;
      contactPhone: string | null;
      isDelegated: boolean;
      delegateForName: string | null;
    }): Promise<Speech | null> => {
      const fields = {
        contact_phone: input.contactPhone,
        is_delegated: input.isDelegated,
        delegate_for_name: input.delegateForName,
        ...(input.speakerPhone !== undefined ? { speaker_phone: input.speakerPhone } : {}),
      };

      return withOfflineQueue(
        { table: 'speeches', operation: 'UPDATE', data: { id: input.speechId, ...fields } },
        async () => {
          const { data, error } = await supabase
            .from('speeches')
            .update(fields)
            .eq('id', input.speechId)
            .select()
            .single();
          if (error) throw error;
          return data;
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: speechKeys.all });
    },
  });
}

/**
 * Remove a speaker assignment.
 * Resets speaker fields + status = not_assigned.
 * Topic remains assigned.
 * Bishopric and Secretary operation.
 */
export function useRemoveAssignment() {
  const { wardId, user, userName, role } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ speechId, speakerName }: { speechId: string; speakerName?: string }): Promise<{ speech: Speech | null; previousSpeaker: string }> => {
      const fields = {
        member_id: null,
        speaker_name: null,
        speaker_informal_name: null,
        speaker_phone: null,
        contact_phone: null,
        is_delegated: false,
        delegate_for_name: null,
        status: 'not_assigned' as SpeechStatus,
        assigned_by_role: role,
      };

      const speech = await withOfflineQueue(
        { table: 'speeches', operation: 'UPDATE', data: { id: speechId, ...fields } },
        async () => {
          const { data, error } = await supabase
            .from('speeches')
            .update(fields)
            .eq('id', speechId)
            .select()
            .single();

          if (error) throw error;
          return data;
        }
      );

      return { speech, previousSpeaker: speakerName ?? 'N/A' };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: speechKeys.all });
      if (!result.speech) return; // queued offline — logged when it lands
      if (user) {
        logAction(wardId, user.id, user.email ?? '', 'speech:unassign', buildLogDescription('speech:unassign', { nome: result.previousSpeaker, data: formatDateHumanReadable(result.speech.sunday_date, getCurrentLanguage()), N: result.speech.position }), userName);
      }
    },
  });
}

/**
 * Delete speeches for a given sunday date, optionally filtered by positions.
 * When positions is provided, only delete those specific positions.
 * Used when changing sunday type away from 'speeches' to clean up orphaned data.
 */
export function useDeleteSpeechesByDate() {
  const { wardId, user, userName } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { sundayDate: string; positions?: number[] }) => {
      const { sundayDate, positions } = input;
      let query = supabase
        .from('speeches')
        .delete()
        .eq('ward_id', wardId!)
        .eq('sunday_date', sundayDate);

      if (positions && positions.length > 0) {
        query = query.in('position', positions);
      }

      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: speechKeys.all });
      if (wardId && user) {
        logAction(
          wardId, user.id, user.email ?? '',
          'speech_cleanup',
          buildLogDescription('speech_cleanup', { data: formatDateHumanReadable(input.sundayDate, getCurrentLanguage()) }),
          userName
        );
      }
    },
  });
}
