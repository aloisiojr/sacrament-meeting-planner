/**
 * Agenda-tab data for a set of non-cumulative date windows (RAP-03/DEC-06).
 *
 * Each window × table is its own query, reusing the existing query keys
 * (`sundayTypeKeys.exceptions`, `speechKeys.byDateRange`, `agendaKeys.byDateRange`).
 * Extending the list appends one window, so only that delta segment hits the network —
 * segments already fetched are served from the query cache untouched. Results are
 * merged and deduplicated by id/date.
 */

import { useCallback, useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AGENDA_LIST_COLUMNS, agendaKeys } from './useAgenda';
import { speechKeys } from './useSpeeches';
import { sundayTypeKeys } from './useSundayTypes';
import type { DateWindow } from './useSundayList';
import type { Speech, SundayAgenda, SundayException } from '../types/database';

export interface AgendaWindowData {
  exceptions: SundayException[];
  speeches: Speech[];
  agendas: SundayAgenda[];
  exceptionsError: boolean;
  exceptionsErr: Error | null;
  refetchExceptions: () => void;
}

function dedupeBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Map<string, T>();
  for (const item of items) seen.set(key(item), item);
  return [...seen.values()];
}

export function useAgendaWindowData(windows: DateWindow[]): AgendaWindowData {
  const { wardId } = useAuth();
  const enabled = !!wardId && windows.length > 0;

  const exceptionQueries = useQueries({
    queries: windows.map((w) => ({
      queryKey: sundayTypeKeys.exceptions(wardId, w.start, w.end),
      queryFn: async (): Promise<SundayException[]> => {
        const { data, error } = await supabase
          .from('sunday_exceptions')
          .select('*')
          .eq('ward_id', wardId)
          .gte('date', w.start)
          .lte('date', w.end)
          .order('date', { ascending: true });
        if (error) throw error;
        return data ?? [];
      },
      enabled,
    })),
  });

  const speechQueries = useQueries({
    queries: windows.map((w) => ({
      queryKey: speechKeys.byDateRange(wardId, w.start, w.end),
      queryFn: async (): Promise<Speech[]> => {
        const { data, error } = await supabase
          .from('speeches')
          .select('*')
          .eq('ward_id', wardId)
          .gte('sunday_date', w.start)
          .lte('sunday_date', w.end)
          .order('sunday_date', { ascending: true })
          .order('position', { ascending: true });
        if (error) throw error;
        return data ?? [];
      },
      enabled,
    })),
  });

  const agendaQueries = useQueries({
    queries: windows.map((w) => ({
      queryKey: agendaKeys.byDateRange(wardId, w.start, w.end),
      queryFn: async (): Promise<SundayAgenda[]> => {
        const { data, error } = await supabase
          .from('sunday_agendas')
          .select(AGENDA_LIST_COLUMNS)
          .eq('ward_id', wardId)
          .gte('sunday_date', w.start)
          .lte('sunday_date', w.end)
          .order('sunday_date');
        if (error) throw error;
        return (data ?? []) as unknown as SundayAgenda[];
      },
      enabled,
    })),
  });

  const exceptions = useMemo(
    () =>
      dedupeBy(
        exceptionQueries.flatMap((q) => q.data ?? []),
        (e) => e.id ?? e.date
      ).sort((a, b) => a.date.localeCompare(b.date)),
    [exceptionQueries]
  );
  const speeches = useMemo(
    () => dedupeBy(speechQueries.flatMap((q) => q.data ?? []), (s) => s.id),
    [speechQueries]
  );
  const agendas = useMemo(
    () =>
      dedupeBy(agendaQueries.flatMap((q) => q.data ?? []), (a) => a.sunday_date).sort(
        (a, b) => a.sunday_date.localeCompare(b.sunday_date)
      ),
    [agendaQueries]
  );

  const refetchExceptions = useCallback(() => {
    for (const q of exceptionQueries) void q.refetch();
    // exceptionQueries is rebuilt per render; the callback only needs the latest set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windows]);

  const firstError = exceptionQueries.find((q) => q.error)?.error ?? null;

  return {
    exceptions,
    speeches,
    agendas,
    exceptionsError: exceptionQueries.some((q) => q.isError),
    exceptionsErr: firstError as Error | null,
    refetchExceptions,
  };
}
