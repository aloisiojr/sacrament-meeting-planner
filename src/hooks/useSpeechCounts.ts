/**
 * TanStack Query hook for bulk speech count per member (last 6 months).
 * Fetches all speech records for the ward (positions 1-3, member_id IS NOT NULL),
 * counts occurrences per member_id client-side, and returns Map<string, number>.
 * Used by MemberRow (Settings) and MemberSelectorModal.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

// --- Query Keys ---

export const speechCountKeys = {
  all: ['speechCounts'] as const,
  byWard: (wardId: string) => ['speechCounts', wardId] as const,
};

// --- Hook ---

export function useSpeechCounts(): { data: Map<string, number>; isLoading: boolean } {
  const { wardId } = useAuth();

  const cutoffDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().split('T')[0];
  }, []);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const { data, isLoading } = useQuery({
    queryKey: speechCountKeys.byWard(wardId),
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from('speeches')
        .select('member_id')
        .eq('ward_id', wardId)
        .in('position', [1, 2, 3])
        .not('member_id', 'is', null)
        .gte('sunday_date', cutoffDate)
        .lte('sunday_date', today);

      if (error) throw error;

      const counts = new Map<string, number>();
      for (const row of rows ?? []) {
        const id = row.member_id as string;
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
      return counts;
    },
    enabled: !!wardId,
  });

  return { data: data ?? new Map(), isLoading };
}
