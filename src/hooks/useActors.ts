/**
 * TanStack Query hooks for meeting actor CRUD operations.
 * Actors are ward members who can preside, conduct, recognize, or play music.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { logAction } from '../lib/activityLog';
import type { MeetingActor, CreateActorInput, UpdateActorInput } from '../types/database';

// --- Query Keys ---

export const actorKeys = {
  all: ['actors'] as const,
  list: (wardId: string) => ['actors', 'list', wardId] as const,
  byRole: (wardId: string, role: ActorRoleFilter) =>
    ['actors', 'byRole', wardId, role] as const,
};

// --- Types ---

export type ActorRoleFilter =
  | 'all'
  | 'can_preside'
  | 'can_conduct'
  | 'can_recognize'
  | 'can_music';

// --- Utilities ---

/**
 * Actor rules pass-through (no auto-enforce).
 * can_preside and can_conduct are independent flags.
 */
export function enforceActorRules(input: CreateActorInput | UpdateActorInput): typeof input {
  return input;
}

/**
 * Filter actors by role capability.
 */
export function filterActorsByRole(actors: MeetingActor[], role: ActorRoleFilter): MeetingActor[] {
  if (role === 'all') return actors;
  return actors.filter((a) => a[role]);
}

/**
 * Sort actors alphabetically by name.
 */
export function sortActors(actors: MeetingActor[]): MeetingActor[] {
  return [...actors].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
}

// --- Hooks ---

/**
 * Fetch all actors for the current ward, optionally filtered by role.
 */
export function useActors(roleFilter: ActorRoleFilter = 'all') {
  const { wardId } = useAuth();

  return useQuery({
    queryKey: actorKeys.byRole(wardId, roleFilter),
    queryFn: async (): Promise<MeetingActor[]> => {
      let query = supabase
        .from('meeting_actors')
        .select('*')
        .eq('ward_id', wardId)
        .order('name', { ascending: true });

      // Apply server-side filter for specific roles
      if (roleFilter !== 'all') {
        query = query.eq(roleFilter, true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!wardId,
  });
}

/** Create a new meeting actor. */
export function useCreateActor() {
  const { wardId, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateActorInput): Promise<MeetingActor> => {
      const enforced = enforceActorRules(input);
      const { data, error } = await supabase
        .from('meeting_actors')
        .insert({
          ward_id: wardId,
          name: enforced.name,
          can_preside: enforced.can_preside ?? false,
          can_conduct: enforced.can_conduct ?? false,
          can_recognize: enforced.can_recognize ?? false,
          can_music: enforced.can_music ?? false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: actorKeys.all });
      if (user) {
        logAction(wardId, user.id, user.email ?? '', 'actor:create', `${data.name} adicionado como ator da reuniao`);
      }
    },
  });
}

/** Update an existing meeting actor. */
export function useUpdateActor() {
  const { wardId, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateActorInput): Promise<MeetingActor> => {
      const enforced = enforceActorRules(input) as UpdateActorInput;
      const { id, ...fields } = enforced;
      const { data, error } = await supabase
        .from('meeting_actors')
        .update(fields)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: actorKeys.all });
      if (user) {
        logAction(wardId, user.id, user.email ?? '', 'actor:update', `${data.name} atualizado`);
      }
    },
  });
}

/**
 * Delete a meeting actor.
 * Agenda snapshot fields are preserved (actor_id set to NULL, name preserved).
 */
export function useDeleteActor() {
  const { wardId, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ actorId, actorName }: { actorId: string; actorName: string }): Promise<string> => {
      const { error } = await supabase.from('meeting_actors').delete().eq('id', actorId);
      if (error) throw error;
      return actorName;
    },
    onSuccess: (actorName) => {
      queryClient.invalidateQueries({ queryKey: actorKeys.all });
      if (user) {
        logAction(wardId, user.id, user.email ?? '', 'actor:delete', `${actorName} removido`);
      }
    },
  });
}
