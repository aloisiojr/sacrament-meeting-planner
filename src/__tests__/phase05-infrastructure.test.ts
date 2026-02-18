/**
 * PHASE-05 Infrastructure validation tests.
 * Covers: ConnectionMonitor, Sync module, Notification utilities,
 * OfflineQueue, OfflineGuard, and cross-module consistency.
 */

import { describe, it, expect } from 'vitest';

// --- Connection utilities ---
import { isNetInfoOnline } from '../lib/connectionUtils';

// --- Sync utilities ---
import {
  SYNCED_TABLES,
  getQueryKeysForTable,
  POLLING_INTERVAL_MS,
  TABLE_TO_QUERY_KEYS,
} from '../lib/sync';
import type { SyncedTable } from '../lib/sync';

// --- Offline utilities ---
import {
  hasCapacity,
  shouldRetry,
  getMaxQueueSize,
  getMaxRetries,
} from '../lib/offlineQueue';
import type { QueuedMutation } from '../lib/offlineQueue';

import {
  requiresConnection,
  ONLINE_ONLY_OPERATIONS,
  throwIfOffline,
} from '../lib/offlineGuard';

// --- Notification utilities ---
import {
  getOrdinal,
  buildNotificationText,
  formatNameList,
} from '../lib/notificationUtils';
import type { OrdinalLanguage } from '../lib/notificationUtils';

// =============================================================================
// STEP-05-01: ConnectionMonitor
// =============================================================================

describe('STEP-05-01: ConnectionMonitor', () => {
  describe('isNetInfoOnline edge cases', () => {
    it('isConnected=true, isInternetReachable=true -> online', () => {
      expect(isNetInfoOnline({ isConnected: true, isInternetReachable: true })).toBe(true);
    });

    it('isConnected=true, isInternetReachable=null -> online (unknown reachability treated as online)', () => {
      // This is intentional: null means "not yet determined"
      expect(isNetInfoOnline({ isConnected: true, isInternetReachable: null })).toBe(true);
    });

    it('isConnected=true, isInternetReachable=false -> offline (connected but captive portal)', () => {
      expect(isNetInfoOnline({ isConnected: true, isInternetReachable: false })).toBe(false);
    });

    it('isConnected=false, isInternetReachable=null -> offline', () => {
      expect(isNetInfoOnline({ isConnected: false, isInternetReachable: null })).toBe(false);
    });

    it('isConnected=null, isInternetReachable=null -> offline (initial state)', () => {
      expect(isNetInfoOnline({ isConnected: null, isInternetReachable: null })).toBe(false);
    });

    it('isConnected=false, isInternetReachable=true -> offline (contradictory state)', () => {
      // Contradictory but isConnected takes priority
      expect(isNetInfoOnline({ isConnected: false, isInternetReachable: true })).toBe(false);
    });

    it('isConnected=null, isInternetReachable=true -> offline (null isConnected)', () => {
      expect(isNetInfoOnline({ isConnected: null, isInternetReachable: true })).toBe(false);
    });
  });
});

// =============================================================================
// STEP-05-02: RealtimeSync - Sync module
// =============================================================================

describe('STEP-05-02: Sync Module', () => {
  describe('SYNCED_TABLES completeness', () => {
    it('contains exactly 7 tables per spec', () => {
      expect(SYNCED_TABLES).toHaveLength(7);
    });

    const expectedTables: SyncedTable[] = [
      'members',
      'ward_topics',
      'ward_collection_config',
      'sunday_exceptions',
      'speeches',
      'sunday_agendas',
      'meeting_actors',
    ];

    it.each(expectedTables)('includes %s', (table) => {
      expect(SYNCED_TABLES).toContain(table);
    });

    it('does not include non-synced tables', () => {
      const nonSynced = [
        'wards',
        'users',
        'device_push_tokens',
        'notification_queue',
        'activity_log',
      ];
      for (const table of nonSynced) {
        expect(SYNCED_TABLES).not.toContain(table);
      }
    });
  });

  describe('TABLE_TO_QUERY_KEYS mapping', () => {
    it('has a mapping for every synced table', () => {
      for (const table of SYNCED_TABLES) {
        expect(TABLE_TO_QUERY_KEYS[table]).toBeDefined();
        expect(TABLE_TO_QUERY_KEYS[table].length).toBeGreaterThan(0);
      }
    });

    it('each mapping returns arrays of strings (query key roots)', () => {
      for (const table of SYNCED_TABLES) {
        const keys = TABLE_TO_QUERY_KEYS[table];
        for (const key of keys) {
          expect(Array.isArray(key)).toBe(true);
          for (const part of key) {
            expect(typeof part).toBe('string');
          }
        }
      }
    });

    it('ward_topics and ward_collection_config both invalidate topics', () => {
      // Both tables affect topic display, so should invalidate same keys
      const topicKeys = getQueryKeysForTable('ward_topics');
      const collectionKeys = getQueryKeysForTable('ward_collection_config');
      expect(topicKeys).toEqual(collectionKeys);
    });
  });

  describe('getQueryKeysForTable', () => {
    it('returns non-empty array for each synced table', () => {
      for (const table of SYNCED_TABLES) {
        expect(getQueryKeysForTable(table).length).toBeGreaterThan(0);
      }
    });

    it('returns empty for unknown table name', () => {
      expect(getQueryKeysForTable('not_a_table')).toEqual([]);
    });

    it('returns empty for empty string', () => {
      expect(getQueryKeysForTable('')).toEqual([]);
    });

    it('returns empty for partial table name', () => {
      expect(getQueryKeysForTable('member')).toEqual([]);
      expect(getQueryKeysForTable('speech')).toEqual([]);
    });

    it('is case-sensitive (lowercase only)', () => {
      expect(getQueryKeysForTable('Members')).toEqual([]);
      expect(getQueryKeysForTable('SPEECHES')).toEqual([]);
    });
  });

  describe('POLLING_INTERVAL_MS', () => {
    it('is 2500ms as per spec', () => {
      expect(POLLING_INTERVAL_MS).toBe(2500);
    });

    it('is a positive number', () => {
      expect(POLLING_INTERVAL_MS).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// STEP-05-04 / STEP-05-07: Notification utilities
// =============================================================================

describe('STEP-05-04/07: Notification Utilities', () => {
  const LANGUAGES: OrdinalLanguage[] = ['pt-BR', 'en', 'es'];

  describe('getOrdinal consistency between client and server', () => {
    // Verify ordinals match between notificationUtils.ts (client) and
    // process-notifications/index.ts (server) - same values
    it('position 1 ordinals match spec', () => {
      expect(getOrdinal(1, 'pt-BR')).toBe('1\u00BA');
      expect(getOrdinal(1, 'en')).toBe('1st');
      expect(getOrdinal(1, 'es')).toBe('1er');
    });

    it('position 2 ordinals match spec', () => {
      expect(getOrdinal(2, 'pt-BR')).toBe('2\u00BA');
      expect(getOrdinal(2, 'en')).toBe('2nd');
      expect(getOrdinal(2, 'es')).toBe('2do');
    });

    it('position 3 ordinals match spec', () => {
      expect(getOrdinal(3, 'pt-BR')).toBe('3\u00BA');
      expect(getOrdinal(3, 'en')).toBe('3rd');
      expect(getOrdinal(3, 'es')).toBe('3er');
    });

    it('position 0 falls back to number string', () => {
      expect(getOrdinal(0, 'en')).toBe('0');
    });

    it('position 4 falls back to number string', () => {
      expect(getOrdinal(4, 'pt-BR')).toBe('4');
    });

    it('negative position falls back to number string', () => {
      expect(getOrdinal(-1, 'en')).toBe('-1');
    });
  });

  describe('formatNameList edge cases', () => {
    it('handles empty array', () => {
      expect(formatNameList([], 'en')).toBe('');
    });

    it('handles single name', () => {
      expect(formatNameList(['Alice'], 'en')).toBe('Alice');
    });

    it('handles 4+ names with Oxford-style comma', () => {
      const result = formatNameList(['A', 'B', 'C', 'D'], 'en');
      expect(result).toBe('A, B, C and D');
    });

    it('handles 4+ names in Portuguese', () => {
      const result = formatNameList(['A', 'B', 'C', 'D'], 'pt-BR');
      expect(result).toBe('A, B, C e D');
    });

    it('handles 4+ names in Spanish', () => {
      const result = formatNameList(['A', 'B', 'C', 'D'], 'es');
      expect(result).toBe('A, B, C y D');
    });

    it('handles names with special characters', () => {
      const result = formatNameList(['José María', 'João'], 'pt-BR');
      expect(result).toBe('José María e João');
    });
  });

  describe('buildNotificationText all 5 cases x 3 languages', () => {
    describe('designation (Case 1)', () => {
      it.each(LANGUAGES)('single speaker in %s', (lang) => {
        const result = buildNotificationText('designation', lang, {
          names: ['João Silva'],
          date: '2026-03-01',
        });
        expect(result.title).toBeTruthy();
        expect(result.body).toContain('João Silva');
        expect(result.body).toContain('2026-03-01');
      });

      it.each(LANGUAGES)('multiple speakers in %s (grouping)', (lang) => {
        const result = buildNotificationText('designation', lang, {
          names: ['Alice', 'Bob', 'Carol'],
          date: '2026-03-01',
        });
        expect(result.body).toContain('Alice');
        expect(result.body).toContain('Bob');
        expect(result.body).toContain('Carol');
      });

      it('empty names array still returns non-empty title', () => {
        const result = buildNotificationText('designation', 'en', {
          names: [],
          date: '2026-03-01',
        });
        expect(result.title).toBeTruthy();
      });
    });

    describe('weekly_assignment (Case 2)', () => {
      it.each(LANGUAGES)('has title and body in %s', (lang) => {
        const result = buildNotificationText('weekly_assignment', lang, {});
        expect(result.title).toBeTruthy();
        expect(result.body).toBeTruthy();
      });
    });

    describe('weekly_confirmation (Case 3)', () => {
      it.each(LANGUAGES)('has title and body in %s', (lang) => {
        const result = buildNotificationText('weekly_confirmation', lang, {});
        expect(result.title).toBeTruthy();
        expect(result.body).toBeTruthy();
      });
    });

    describe('speaker_confirmed (Case 4)', () => {
      it.each(LANGUAGES)('includes name, ordinal, and date in %s', (lang) => {
        const result = buildNotificationText('speaker_confirmed', lang, {
          name: 'Maria Santos',
          position: 1,
          date: '2026-03-08',
        });
        expect(result.title).toBeTruthy();
        expect(result.body).toContain('Maria Santos');
        expect(result.body).toContain(getOrdinal(1, lang));
        expect(result.body).toContain('2026-03-08');
      });
    });

    describe('speaker_withdrew (Case 5)', () => {
      it.each(LANGUAGES)('includes urgency marker in %s', (lang) => {
        const result = buildNotificationText('speaker_withdrew', lang, {
          name: 'Pedro Lima',
          position: 3,
          date: '2026-03-15',
        });
        expect(result.title).toBeTruthy();
        // All languages use ATTENTION/ATENÇÃO/ATENCIÓN in the text
        const urgencyMarkers = {
          'pt-BR': 'ATENÇÃO',
          en: 'ATTENTION',
          es: 'ATENCIÓN',
        };
        expect(result.body).toContain(urgencyMarkers[lang]);
        expect(result.body).toContain('Pedro Lima');
        expect(result.body).toContain(getOrdinal(3, lang));
      });
    });

    describe('unknown type', () => {
      it('returns empty title and body', () => {
        const result = buildNotificationText('unknown_type', 'en', {});
        expect(result.title).toBe('');
        expect(result.body).toBe('');
      });
    });
  });
});

// =============================================================================
// STEP-05-08: OfflineQueue & OfflineGuard
// =============================================================================

describe('STEP-05-08: OfflineQueue', () => {
  describe('hasCapacity', () => {
    it('returns true for 0 entries', () => {
      expect(hasCapacity(0)).toBe(true);
    });

    it('returns true for 99 entries (boundary -1)', () => {
      expect(hasCapacity(99)).toBe(true);
    });

    it('returns false for 100 entries (boundary)', () => {
      expect(hasCapacity(100)).toBe(false);
    });

    it('returns false for 101 entries (above boundary)', () => {
      expect(hasCapacity(101)).toBe(false);
    });

    it('returns false for very large numbers', () => {
      expect(hasCapacity(10000)).toBe(false);
    });
  });

  describe('shouldRetry', () => {
    it('returns true for 0 retries', () => {
      expect(shouldRetry(0)).toBe(true);
    });

    it('returns true for 1 retry', () => {
      expect(shouldRetry(1)).toBe(true);
    });

    it('returns true for 2 retries (boundary -1)', () => {
      expect(shouldRetry(2)).toBe(true);
    });

    it('returns false for 3 retries (boundary = MAX_RETRIES)', () => {
      expect(shouldRetry(3)).toBe(false);
    });

    it('returns false for more than 3 retries', () => {
      expect(shouldRetry(4)).toBe(false);
      expect(shouldRetry(100)).toBe(false);
    });
  });

  describe('constants', () => {
    it('MAX_QUEUE_SIZE is 100', () => {
      expect(getMaxQueueSize()).toBe(100);
    });

    it('MAX_RETRIES is 3', () => {
      expect(getMaxRetries()).toBe(3);
    });
  });

  describe('QueuedMutation type shape', () => {
    it('has correct shape', () => {
      const mutation: QueuedMutation = {
        id: 'test-id',
        table: 'speeches',
        operation: 'UPDATE',
        data: { status: 'assigned_confirmed' },
        timestamp: Date.now(),
        retryCount: 0,
      };
      expect(mutation.id).toBe('test-id');
      expect(mutation.table).toBe('speeches');
      expect(mutation.operation).toBe('UPDATE');
      expect(mutation.retryCount).toBe(0);
    });

    it('supports all 3 operations', () => {
      const ops: QueuedMutation['operation'][] = ['INSERT', 'UPDATE', 'DELETE'];
      for (const op of ops) {
        const m: QueuedMutation = {
          id: '1',
          table: 'members',
          operation: op,
          data: {},
          timestamp: 0,
          retryCount: 0,
        };
        expect(m.operation).toBe(op);
      }
    });
  });
});

describe('STEP-05-08: OfflineGuard', () => {
  describe('ONLINE_ONLY_OPERATIONS', () => {
    it('contains exactly 6 Edge Function operations', () => {
      expect(ONLINE_ONLY_OPERATIONS).toHaveLength(6);
    });

    const expectedOps = [
      'register-first-user',
      'register-invited-user',
      'create-invitation',
      'update-user-role',
      'update-user-name',
      'delete-user',
    ];

    it.each(expectedOps)('includes %s', (op) => {
      expect(ONLINE_ONLY_OPERATIONS).toContain(op);
    });
  });

  describe('requiresConnection', () => {
    it('returns true for all 5 online-only operations', () => {
      for (const op of ONLINE_ONLY_OPERATIONS) {
        expect(requiresConnection(op)).toBe(true);
      }
    });

    it('returns false for normal CRUD operations', () => {
      const normalOps = [
        'update-member',
        'create-speech',
        'update-agenda',
        'delete-actor',
        'update-hymn',
      ];
      for (const op of normalOps) {
        expect(requiresConnection(op)).toBe(false);
      }
    });

    it('returns false for empty string', () => {
      expect(requiresConnection('')).toBe(false);
    });

    it('is case-sensitive', () => {
      expect(requiresConnection('Register-First-User')).toBe(false);
      expect(requiresConnection('DELETE-USER')).toBe(false);
    });
  });

  describe('throwIfOffline', () => {
    it('throws when offline and operation requires connection', () => {
      expect(() => throwIfOffline('register-first-user', false)).toThrow();
    });

    it('does not throw when online even for online-only operations', () => {
      expect(() => throwIfOffline('register-first-user', true)).not.toThrow();
    });

    it('does not throw when offline but operation does not require connection', () => {
      expect(() => throwIfOffline('update-member', false)).not.toThrow();
    });

    it('does not throw when online and operation does not require connection', () => {
      expect(() => throwIfOffline('update-member', true)).not.toThrow();
    });

    it('throws for each of the 5 operations when offline', () => {
      for (const op of ONLINE_ONLY_OPERATIONS) {
        expect(() => throwIfOffline(op, false)).toThrow();
      }
    });
  });
});

// =============================================================================
// Cross-module consistency checks
// =============================================================================

describe('Cross-module consistency', () => {
  describe('Sync coverage vs tables used in hooks', () => {
    it('every synced table maps to a non-empty query key array', () => {
      for (const table of SYNCED_TABLES) {
        const keys = getQueryKeysForTable(table);
        expect(keys.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Notification text consistency between client and server', () => {
    // The server (Edge Function) duplicates ordinals and text builders.
    // Verify that client-side notificationUtils matches the expected output.
    const LANGUAGES: OrdinalLanguage[] = ['pt-BR', 'en', 'es'];

    it.each(LANGUAGES)('designation title is non-empty in %s', (lang) => {
      const result = buildNotificationText('designation', lang, {
        names: ['Test'],
        date: '2026-01-01',
      });
      expect(result.title.length).toBeGreaterThan(0);
    });

    it.each(LANGUAGES)('speaker_withdrew contains NOT/NÃO/NO in %s', (lang) => {
      const result = buildNotificationText('speaker_withdrew', lang, {
        name: 'Test',
        position: 1,
        date: '2026-01-01',
      });
      const negations = { 'pt-BR': 'NÃO', en: 'NOT', es: 'NO' };
      expect(result.body).toContain(negations[lang]);
    });
  });

  describe('Offline guard vs Edge Functions', () => {
    it('all 6 blocked operations are auth/user-management Edge Functions', () => {
      // These are the Edge Functions that cannot be queued offline
      const authFunctions = [
        'register-first-user',
        'register-invited-user',
        'create-invitation',
        'update-user-role',
        'update-user-name',
        'delete-user',
      ];
      expect([...ONLINE_ONLY_OPERATIONS].sort()).toEqual(authFunctions.sort());
    });
  });

  describe('Polling interval is reasonable', () => {
    it('is between 1s and 10s', () => {
      expect(POLLING_INTERVAL_MS).toBeGreaterThanOrEqual(1000);
      expect(POLLING_INTERVAL_MS).toBeLessThanOrEqual(10000);
    });
  });

  describe('Queue limits are reasonable', () => {
    it('max queue size is 100 (per spec)', () => {
      expect(getMaxQueueSize()).toBe(100);
    });

    it('max retries is 3 (per spec)', () => {
      expect(getMaxRetries()).toBe(3);
    });

    it('hasCapacity boundary matches getMaxQueueSize', () => {
      const max = getMaxQueueSize();
      expect(hasCapacity(max - 1)).toBe(true);
      expect(hasCapacity(max)).toBe(false);
    });

    it('shouldRetry boundary matches getMaxRetries', () => {
      const max = getMaxRetries();
      expect(shouldRetry(max - 1)).toBe(true);
      expect(shouldRetry(max)).toBe(false);
    });
  });
});
