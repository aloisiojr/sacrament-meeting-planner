/**
 * TanStack Query hooks for member CRUD operations.
 * All operations are scoped by ward_id via RLS and AuthContext.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { logAction, buildLogDescription } from '../lib/activityLog';
import { resolveContactSnapshot } from '../lib/contact';
import { speechKeys } from './useSpeeches';
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
 * When `includeCalling` is true, also matches the member's calling (chamado).
 */
export function filterMembers(
  members: Member[],
  search: string,
  includeCalling = false
): Member[] {
  if (!search.trim()) return members;
  const normalized = normalizeForSearch(search);
  return members.filter((m) =>
    normalizeForSearch(m.full_name).includes(normalized) ||
    normalizeForSearch(m.informal_name ?? '').includes(normalized) ||
    (includeCalling && normalizeForSearch(m.calling ?? '').includes(normalized))
  );
}

/**
 * Sort members alphabetically by full_name (case-insensitive, accent-aware).
 */
export function sortMembers(members: Member[]): Member[] {
  return [...members].sort((a, b) =>
    a.full_name.localeCompare(b.full_name, undefined, { sensitivity: 'base' })
  );
}

/**
 * Build a reverse lookup of contact-delegation dependents (v2.0).
 *
 * Given the full member list, returns a Map keyed by a responsible member's id whose value is
 * the sorted list of `full_name`s of the members that point at it via `responsible_id`. Used by
 * the People picker to show a "Responsável por <name(s)>" label on members that are responsible
 * for others' contact. Members that are nobody's responsible are absent from the map.
 */
export function getResponsibleForMap(members: Member[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const m of members) {
    if (!m.responsible_id) continue;
    const list = map.get(m.responsible_id) ?? [];
    list.push(m.full_name);
    map.set(m.responsible_id, list);
  }
  for (const [id, names] of map) {
    map.set(
      id,
      names.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    );
  }
  return map;
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
  const { wardId, user, userName } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMemberInput): Promise<Member> => {
      const { data, error } = await supabase
        .from('members')
        .insert({
          ward_id: wardId,
          full_name: input.full_name,
          informal_name: input.informal_name || input.full_name.split(' ')[0],
          country_code: input.country_code,
          phone: input.phone ?? null,
          can_preside: input.can_preside ?? false,
          can_conduct: input.can_conduct ?? false,
          can_lead_music: input.can_lead_music ?? false,
          can_play_piano: input.can_play_piano ?? false,
          can_be_recognized: input.can_be_recognized ?? false,
          contact_via_responsible: input.contact_via_responsible ?? false,
          responsible_id: input.responsible_id ?? null,
          calling: input.calling ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: memberKeys.list(wardId) });
      if (user) {
        logAction(wardId, user.id, user.email ?? '', 'member:create', buildLogDescription('member:create', { nome: data.full_name }), userName);
      }
    },
  });
}

/**
 * Update an existing member.
 */
export function useUpdateMember() {
  const { wardId, user, userName } = useAuth();
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
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: memberKeys.list(wardId) });
      if (user) {
        logAction(wardId, user.id, user.email ?? '', 'member:update', buildLogDescription('member:update', { nome: data.full_name }), userName);
      }
      const today = new Date().toISOString().split('T')[0];
      const fullPhone = data.phone ? `${data.country_code}${data.phone}` : null;
      // v2.0: also recompute the contact-delegation snapshot for the member's not-yet-past
      // speeches, so editing a member's phone or delegation propagates to their not-yet-sent
      // invites (consistent with how speaker_* already cascades). The responsible is looked up
      // from the member cache by the (possibly updated) responsible_id.
      const cachedMembers = queryClient.getQueryData<Member[]>(memberKeys.list(wardId));
      const responsible = data.responsible_id
        ? cachedMembers?.find((m) => m.id === data.responsible_id) ?? null
        : null;
      const contact = resolveContactSnapshot(data, responsible);
      try {
        await supabase
          .from('speeches')
          .update({
            speaker_name: data.full_name,
            speaker_phone: fullPhone,
            speaker_informal_name: data.informal_name,
            contact_phone: contact.contact_phone,
            is_delegated: contact.is_delegated,
            delegate_for_name: contact.delegate_for_name,
          })
          .eq('member_id', data.id)
          .gte('sunday_date', today);
        queryClient.invalidateQueries({ queryKey: speechKeys.all });
      } catch {
        // Best-effort: member update already succeeded
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
  const { wardId, user, userName } = useAuth();
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
        logAction(wardId, user.id, user.email ?? '', 'member:delete', buildLogDescription('member:delete', { nome: memberName }), userName);
      }
    },
  });
}
