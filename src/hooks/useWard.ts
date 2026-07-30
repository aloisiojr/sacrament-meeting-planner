/**
 * Ward-level lookups. `useWardName` fetches the current ward's display name (used e.g. to fill the
 * {ward} token in designation read-texts). Cached via React Query like the other ward hooks.
 */
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

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
