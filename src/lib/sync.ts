/**
 * Sync configuration: maps Supabase tables to TanStack Query keys.
 * Used by RealtimeSubscriber and PollingFallback to invalidate caches.
 */

import { memberKeys } from '../hooks/useMembers';
import { topicKeys } from '../hooks/useTopics';
import { sundayTypeKeys } from '../hooks/useSundayTypes';
import { speechKeys } from '../hooks/useSpeeches';
import { agendaKeys } from '../hooks/useAgenda';
import { actorKeys } from '../hooks/useActors';

// --- Types ---

export type SyncedTable =
  | 'members'
  | 'ward_topics'
  | 'ward_collection_config'
  | 'sunday_exceptions'
  | 'speeches'
  | 'sunday_agendas'
  | 'meeting_actors';

// --- Constants ---

/**
 * All tables that should be synced via Realtime/polling.
 */
export const SYNCED_TABLES: readonly SyncedTable[] = [
  'members',
  'ward_topics',
  'ward_collection_config',
  'sunday_exceptions',
  'speeches',
  'sunday_agendas',
  'meeting_actors',
] as const;

/**
 * Maps each synced table to the TanStack Query key roots that should be
 * invalidated when data in that table changes.
 */
export const TABLE_TO_QUERY_KEYS: Record<SyncedTable, readonly (readonly string[])[]> = {
  members: [memberKeys.all],
  ward_topics: [topicKeys.all],
  ward_collection_config: [topicKeys.all],
  sunday_exceptions: [sundayTypeKeys.all],
  speeches: [speechKeys.all],
  sunday_agendas: [agendaKeys.all],
  meeting_actors: [actorKeys.all],
};

/**
 * Get query keys to invalidate for a given table change.
 */
export function getQueryKeysForTable(table: string): readonly (readonly string[])[] {
  if (table in TABLE_TO_QUERY_KEYS) {
    return TABLE_TO_QUERY_KEYS[table as SyncedTable];
  }
  return [];
}

/**
 * Default polling interval (ms) for fallback mode.
 */
export const POLLING_INTERVAL_MS = 2500;
