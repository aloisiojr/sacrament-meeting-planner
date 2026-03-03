/**
 * TanStack Query hooks for meeting actor CRUD operations.
 * Actors are ward members who can preside, conduct, recognize, or play music.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { logAction, buildLogDescription } from '../lib/activityLog';
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
  | 'preside'
  | 'conduct'
  | 'recognize'
  | 'pianist'
  | 'conductor';

// --- Utilities ---

/**
 * Filter actors by role capability.
 */
export function filterActorsByRole(actors: MeetingActor[], role: ActorRoleFilter): MeetingActor[] {
  if (role === 'all') return actors;
  return actors.filter((a) => a.role === role);
}

/**
 * Sort actors alphabetically by name.
 */
export function sortActors(actors: MeetingActor[]): MeetingActor[] {
  return [...actors].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
}

/**
 * Get the primary role key of an actor for activity logging.
 */
function getPrimaryRole(actor: MeetingActor | CreateActorInput): string {
  return actor.role;
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
        query = query.eq('role', roleFilter);
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
  const { wardId, user, userName } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateActorInput): Promise<MeetingActor> => {
      const { data, error } = await supabase
        .from('meeting_actors')
        .insert({
          ward_id: wardId,
          name: input.name,
          role: input.role,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: actorKeys.all });
      if (user) {
        logAction(wardId, user.id, user.email ?? '', 'actor:create', buildLogDescription('actor:create', { nome: data.name, funcao: getPrimaryRole(data) }), userName);
      }
    },
  });
}

/** Update an existing meeting actor. */
export function useUpdateActor() {
  const { wardId, user, userName } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateActorInput): Promise<MeetingActor> => {
      const { id, ...fields } = input;
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
        logAction(wardId, user.id, user.email ?? '', 'actor:update', buildLogDescription('actor:update', { nome: data.name }), userName);
      }
    },
  });
}

/**
 * Delete a meeting actor.
 * Agenda snapshot fields are preserved (actor_id set to NULL, name preserved).
 */
export function useDeleteActor() {
  const { wardId, user, userName } = useAuth();
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
        logAction(wardId, user.id, user.email ?? '', 'actor:delete', buildLogDescription('actor:delete', { nome: actorName }), userName);
      }
    },
  });
}
