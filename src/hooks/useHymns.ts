/**
 * TanStack Query hooks for hymn catalog lookup.
 * Hymns are a global table (not ward-scoped), read-only for users.
 * Imported via admin script.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Hymn } from '../types/database';

// --- Query Keys ---

export const hymnKeys = {
  all: ['hymns'] as const,
  list: (language: string) => ['hymns', 'list', language] as const,
  sacramental: (language: string) => ['hymns', 'sacramental', language] as const,
};

// --- Search Utilities ---

/**
 * Normalize a string for accent-insensitive comparison.
 */
function normalizeForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Filter hymns by search term (matches number or title).
 * - Numeric search: matches hymn number starting with the input
 * - Text search: accent-insensitive title match
 */
export function filterHymns(hymns: Hymn[], search: string): Hymn[] {
  if (!search.trim()) return hymns;

  const trimmed = search.trim();

  // Check if search is numeric (matches hymn number)
  if (/^\d+$/.test(trimmed)) {
    const numStr = trimmed;
    return hymns.filter((h) => String(h.number).startsWith(numStr));
  }

  // Text search on title
  const normalized = normalizeForSearch(trimmed);
  return hymns.filter((h) => normalizeForSearch(h.title).includes(normalized));
}

// --- Hooks ---

/**
 * Fetch all hymns for a given language, sorted by number.
 */
export function useHymns(language: string, search?: string) {
  return useQuery({
    queryKey: hymnKeys.list(language),
    queryFn: async (): Promise<Hymn[]> => {
      const { data, error } = await supabase
        .from('hymns')
        .select('*')
        .eq('language', language)
        .order('number', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!language,
    select: (data: Hymn[]) => {
      return search ? filterHymns(data, search) : data;
    },
  });
}

/**
 * Fetch only sacramental hymns for a given language.
 * Used when selecting the sacrament hymn in the agenda.
 */
export function useSacramentalHymns(language: string, search?: string) {
  return useQuery({
    queryKey: hymnKeys.sacramental(language),
    queryFn: async (): Promise<Hymn[]> => {
      const { data, error } = await supabase
        .from('hymns')
        .select('*')
        .eq('language', language)
        .eq('is_sacramental', true)
        .order('number', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!language,
    select: (data: Hymn[]) => {
      return search ? filterHymns(data, search) : data;
    },
  });
}

/**
 * Format a hymn for display: "123 - Title"
 */
export function formatHymnDisplay(hymn: Hymn): string {
  return `${hymn.number} - ${hymn.title}`;
}
