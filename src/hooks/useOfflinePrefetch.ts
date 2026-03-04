/**
 * useOfflinePrefetch: proactively prefetches key data into TanStack Query cache
 * when the device is online. Uses existing query keys and Supabase queries so
 * prefetched data matches exactly what tabs expect.
 *
 * Prefetches on mount when online and on offline->online transitions.
 * Each prefetchQuery is independent (one failure does not block others).
 *
 * Component: C4 from ARCH_M006 (CR-262/F048).
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getTodaySundayDate } from './usePresentationMode';
import { toISODateString } from '../lib/dateUtils';
import { agendaKeys } from './useAgenda';
import { speechKeys } from './useSpeeches';
import { sundayTypeKeys } from './useSundayTypes';
import type { SundayAgenda, Speech, SundayException } from '../types/database';

/**
 * Get the next 3 Sunday dates starting from the current/next Sunday.
 */
export function getNext3Sundays(): string[] {
  const first = getTodaySundayDate();
  const dates = [first];

  const d = new Date(first + 'T12:00:00');
  for (let i = 1; i < 3; i++) {
    d.setDate(d.getDate() + 7);
    dates.push(toISODateString(d));
  }

  return dates;
}

/**
 * Proactively prefetch critical data for offline use.
 * Runs when isOnline transitions to true (including initial mount).
 */
export function useOfflinePrefetch(isOnline: boolean): void {
  const { wardId } = useAuth();
  const queryClient = useQueryClient();
  const prevOnlineRef = useRef(false);

  useEffect(() => {
    // Only prefetch on offline->online transition or first mount when online
    const wasOffline = !prevOnlineRef.current;
    prevOnlineRef.current = isOnline;

    if (!isOnline || !wardId) return;
    if (!wasOffline && isOnline) return; // was already online, skip

    const sundays = getNext3Sundays();
    const first = sundays[0];
    const last = sundays[sundays.length - 1];

    // 1. Prefetch next Sunday agenda
    queryClient.prefetchQuery({
      queryKey: agendaKeys.bySunday(wardId, first),
      queryFn: async (): Promise<SundayAgenda | null> => {
        const { data, error } = await supabase
          .from('sunday_agendas')
          .select('*')
          .eq('ward_id', wardId)
          .eq('sunday_date', first)
          .maybeSingle();
        if (error) throw error;
        return data;
      },
    });

    // 2. Prefetch next 3 Sundays agenda range
    queryClient.prefetchQuery({
      queryKey: agendaKeys.byDateRange(wardId, first, last),
      queryFn: async (): Promise<SundayAgenda[]> => {
        const { data, error } = await supabase
          .from('sunday_agendas')
          .select('*')
          .eq('ward_id', wardId)
          .gte('sunday_date', first)
          .lte('sunday_date', last)
          .order('sunday_date');
        if (error) throw error;
        return data ?? [];
      },
    });

    // 3. Prefetch next 3 Sundays speeches
    queryClient.prefetchQuery({
      queryKey: speechKeys.byDateRange(wardId, first, last),
      queryFn: async (): Promise<Speech[]> => {
        const { data, error } = await supabase
          .from('speeches')
          .select('*')
          .eq('ward_id', wardId)
          .gte('sunday_date', first)
          .lte('sunday_date', last)
          .order('sunday_date', { ascending: true })
          .order('position', { ascending: true });
        if (error) throw error;
        return data ?? [];
      },
    });

    // 4. Prefetch next 3 Sundays exceptions
    queryClient.prefetchQuery({
      queryKey: sundayTypeKeys.exceptions(wardId, first, last),
      queryFn: async (): Promise<SundayException[]> => {
        const { data, error } = await supabase
          .from('sunday_exceptions')
          .select('*')
          .eq('ward_id', wardId)
          .gte('date', first)
          .lte('date', last)
          .order('date', { ascending: true });
        if (error) throw error;
        return data ?? [];
      },
    });
  }, [isOnline, wardId, queryClient]);
}
