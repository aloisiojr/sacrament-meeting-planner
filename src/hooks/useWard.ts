/**
 * Ward-level lookups. `useWardName` fetches the current ward's display name (used e.g. to fill the
 * {ward} token in designation read-texts). Cached via React Query like the other ward hooks.
 */
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { DesignationType } from '../types/database';

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

export type DesignationTemplates = Partial<Record<DesignationType, string | null>>;

/**
 * Per-ward designation read-text overrides (NULL/blank => built-in localized default). Used by the
 * Play interstitial and the Settings editor; both share the query key so an edit refreshes Play.
 */
export function useWardDesignationTemplates(): DesignationTemplates {
  const { wardId } = useAuth();

  const { data } = useQuery({
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

  return data ?? {};
}
