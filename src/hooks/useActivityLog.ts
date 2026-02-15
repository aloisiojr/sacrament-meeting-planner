import { useCallback, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { ActivityLog } from '../types/database';

const PAGE_SIZE = 30;

export const activityLogKeys = {
  all: ['activity-log'] as const,
  list: (search?: string) =>
    search
      ? (['activity-log', 'list', search] as const)
      : (['activity-log', 'list'] as const),
};

interface UseActivityLogOptions {
  search?: string;
}

interface ActivityLogPage {
  items: ActivityLog[];
  nextCursor: number | null;
}

/**
 * Hook for paginated activity log with real-time search.
 * Permission: history:read (Bishopric + Secretary).
 */
export function useActivityLog({ search }: UseActivityLogOptions = {}) {
  const { wardId, hasPermission } = useAuth();
  const canRead = hasPermission('history:read');

  const query = useInfiniteQuery<ActivityLogPage>({
    queryKey: activityLogKeys.list(search),
    queryFn: async ({ pageParam }) => {
      const offset = (pageParam as number) ?? 0;

      let q = supabase
        .from('activity_log')
        .select('*')
        .eq('ward_id', wardId)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      // Apply search filter (case-insensitive, across datetime, email, description)
      if (search && search.trim()) {
        const term = search.trim();
        // Use ilike for case-insensitive match on text fields
        // For accent-insensitive, we rely on PostgreSQL collation or unaccent extension
        q = q.or(
          `user_email.ilike.%${term}%,description.ilike.%${term}%,created_at::text.ilike.%${term}%`
        );
      }

      const { data, error } = await q;

      if (error) throw error;

      const items = data ?? [];
      const nextCursor = items.length === PAGE_SIZE ? offset + PAGE_SIZE : null;

      return { items, nextCursor };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: canRead && !!wardId,
  });

  // Flatten all pages into a single list
  const entries = query.data?.pages.flatMap((page) => page.items) ?? [];

  return {
    entries,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    error: query.error,
    refetch: query.refetch,
    canRead,
  };
}

/**
 * Hook for managing activity log search state with debounce.
 */
export function useActivityLogSearch(debounceMs = 250) {
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const updateSearch = useCallback(
    (text: string) => {
      setSearchText(text);
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      const timer = setTimeout(() => {
        setDebouncedSearch(text);
      }, debounceMs);
      setDebounceTimer(timer);
    },
    [debounceMs, debounceTimer]
  );

  return {
    searchText,
    debouncedSearch,
    updateSearch,
  };
}
