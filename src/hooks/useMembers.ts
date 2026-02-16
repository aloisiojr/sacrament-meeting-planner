/**
 * TanStack Query hooks for member CRUD operations.
 * All operations are scoped by ward_id via RLS and AuthContext.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { logAction } from '../lib/activityLog';
import type { Member, CreateMemberInput, UpdateMemberInput } from '../types/database';

// --- Query Keys ---

export const memberKeys = {
  all: ['members'] as const,
  list: (wardId: string) => ['members', 'list', wardId] as const,
};

// --- Search Utilities ---

/**
 * Normalize a string for accent-insensitive comparison.
 * Removes diacritics (accents) and converts to lowercase.
 */
export function normalizeForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Filter members by search term (case-insensitive, accent-insensitive).
 */
export function filterMembers(members: Member[], search: string): Member[] {
  if (!search.trim()) return members;
  const normalized = normalizeForSearch(search);
  return members.filter((m) => normalizeForSearch(m.full_name).includes(normalized));
}

/**
 * Sort members alphabetically by full_name (case-insensitive, accent-aware).
 */
export function sortMembers(members: Member[]): Member[] {
  return [...members].sort((a, b) =>
    a.full_name.localeCompare(b.full_name, undefined, { sensitivity: 'base' })
  );
}

// --- Hooks ---

/**
 * Fetch all members for the current ward, sorted alphabetically.
 * Optionally filters by search term with accent-insensitive matching.
 */
export function useMembers(search?: string) {
  const { wardId } = useAuth();

  return useQuery({
    queryKey: memberKeys.list(wardId),
    queryFn: async (): Promise<Member[]> => {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('ward_id', wardId)
        .order('full_name', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!wardId,
    select: (data: Member[]) => {
      const sorted = sortMembers(data);
      return search ? filterMembers(sorted, search) : sorted;
    },
  });
}

/**
 * Create a new member in the current ward.
 */
export function useCreateMember() {
  const { wardId, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMemberInput): Promise<Member> => {
      const { data, error } = await supabase
        .from('members')
        .insert({
          ward_id: wardId,
          full_name: input.full_name,
          country_code: input.country_code,
          phone: input.phone ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: memberKeys.list(wardId) });
      if (user) {
        logAction(wardId, user.id, user.email ?? '', 'member:create', `${data.full_name} adicionado como membro`);
      }
    },
  });
}

/**
 * Update an existing member.
 */
export function useUpdateMember() {
  const { wardId, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateMemberInput): Promise<Member> => {
      const { id, ...fields } = input;
      const { data, error } = await supabase
        .from('members')
        .update(fields)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: memberKeys.list(wardId) });
      if (user) {
        logAction(wardId, user.id, user.email ?? '', 'member:update', `${data.full_name} atualizado`);
      }
    },
  });
}

/**
 * Check if a member has future speeches (after today).
 * Returns the count of future speeches.
 */
export async function checkFutureSpeeches(memberId: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  const { count, error } = await supabase
    .from('speeches')
    .select('*', { count: 'exact', head: true })
    .eq('member_id', memberId)
    .gte('sunday_date', today);

  if (error) throw error;
  return count ?? 0;
}

/**
 * Delete a member.
 * Caller should check for future speeches first via checkFutureSpeeches().
 * Speeches with this member will have member_id set to NULL (ON DELETE SET NULL)
 * but snapshot fields (speaker_name, speaker_phone) are preserved.
 */
export function useDeleteMember() {
  const { wardId, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, memberName }: { memberId: string; memberName: string }): Promise<string> => {
      const { error } = await supabase.from('members').delete().eq('id', memberId);
      if (error) throw error;
      return memberName;
    },
    onSuccess: (memberName) => {
      queryClient.invalidateQueries({ queryKey: memberKeys.list(wardId) });
      if (user) {
        logAction(wardId, user.id, user.email ?? '', 'member:delete', `${memberName} removido`);
      }
    },
  });
}
