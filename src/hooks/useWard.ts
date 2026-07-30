/**
 * Ward-level lookups. `useWardName` fetches the current ward's display name (used e.g. to fill the
 * {ward} token in designation read-texts). Cached via React Query like the other ward hooks.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { DesignationType } from '../types/database';

const DESIGNATION_TEMPLATE_COLUMN: Record<DesignationType, string> = {
  sustain: 'designation_template_sustain',
  release: 'designation_template_release',
  priesthood: 'designation_template_priesthood',
  new_member: 'designation_template_new_member',
};

export function useWardName(): string | null {
  const { wardId } = useAuth();

  const { data } = useQuery({
    queryKey: ['ward', wardId, 'name'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wards')
        .select('name')
        .eq('id', wardId)
        .single();
      if (error) throw error;
      return data?.name ?? null;
    },
    enabled: !!wardId,
  });

  return data ?? null;
}

export interface WardInfo {
  name: string;
  stake_name: string;
}

/**
 * Fetch the current ward's editable identity (ward name + stake name). Shares the ['ward', wardId]
 * key namespace so an edit via useUpdateWardInfo refreshes useWardName too.
 */
export function useWardInfo() {
  const { wardId } = useAuth();

  return useQuery({
    queryKey: ['ward', wardId, 'info'],
    queryFn: async (): Promise<WardInfo> => {
      const { data, error } = await supabase
        .from('wards')
        .select('name, stake_name')
        .eq('id', wardId)
        .single();
      if (error) throw error;
      return { name: data?.name ?? '', stake_name: data?.stake_name ?? '' };
    },
    enabled: !!wardId,
  });
}

/**
 * Update the ward name and/or stake name. RLS gates this on can_write() + own ward (migration 044).
 */
export function useUpdateWardInfo() {
  const { wardId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<WardInfo>) => {
      const { error } = await supabase
        .from('wards')
        .update(input)
        .eq('id', wardId);
      if (error) throw error;
    },
    onSuccess: () => {
      // Refresh every ['ward', wardId, ...] query (name, info) so Home + Settings reflect the change.
      queryClient.invalidateQueries({ queryKey: ['ward', wardId] });
    },
  });
}

export type DesignationTemplates = Partial<Record<DesignationType, string | null>>;

/**
 * Per-ward designation read-text overrides (NULL/blank => built-in localized default). Used by the
 * Play interstitial and the Settings editor; both share the query key so an edit refreshes Play.
 */
export function useWardDesignationTemplates(): {
  templates: DesignationTemplates;
  isLoaded: boolean;
} {
  const { wardId } = useAuth();

  const { data, isSuccess } = useQuery({
    queryKey: ['ward', wardId, 'designationTemplates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wards')
        .select(
          'designation_template_sustain, designation_template_release, designation_template_priesthood, designation_template_new_member'
        )
        .eq('id', wardId)
        .single();
      if (error) throw error;
      return {
        sustain: data?.designation_template_sustain ?? null,
        release: data?.designation_template_release ?? null,
        priesthood: data?.designation_template_priesthood ?? null,
        new_member: data?.designation_template_new_member ?? null,
      } as DesignationTemplates;
    },
    enabled: !!wardId,
  });

  return { templates: data ?? {}, isLoaded: isSuccess };
}

/**
 * Save (or clear, with value=null) a per-ward designation template override. Invalidates both the
 * templates query (Play) and the general ward query so edits are reflected immediately.
 */
export function useUpdateWardDesignationTemplate() {
  const { wardId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ type, value }: { type: DesignationType; value: string | null }) => {
      const column = DESIGNATION_TEMPLATE_COLUMN[type];
      const { error } = await supabase
        .from('wards')
        .update({ [column]: value })
        .eq('id', wardId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ward', wardId, 'designationTemplates'] });
      queryClient.invalidateQueries({ queryKey: ['ward', wardId] });
    },
  });
}
