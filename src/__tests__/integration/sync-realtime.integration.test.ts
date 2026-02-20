/**
 * Integration tests: Sync + Realtime + Offline (Category 3)
 * Tests sync configuration, offline queue, and connection utilities.
 *
 * Covers: AC-082-15 to AC-082-18, EC-082-09, EC-082-10
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createTestQueryClient,
  createWrapper,
  renderHook,
  waitFor,
} from './setup-integration';

// --- Module mocks ---

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

vi.mock('../../lib/activityLog', () => ({
  logAction: vi.fn(),
}));

vi.mock('../../i18n', () => ({
  getCurrentLanguage: vi.fn(() => 'pt-BR'),
  changeLanguage: vi.fn(),
  initI18n: vi.fn(),
  SUPPORTED_LANGUAGES: ['pt-BR', 'en', 'es'],
  default: { language: 'pt-BR', isInitialized: true, use: vi.fn().mockReturnThis(), init: vi.fn() },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'pt-BR', changeLanguage: vi.fn() },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

// Import sync utilities (pure, no RN dependency)
import { SYNCED_TABLES, getQueryKeysForTable, TABLE_TO_QUERY_KEYS, POLLING_INTERVAL_MS } from '../../lib/sync';
import { isNetInfoOnline } from '../../lib/connectionUtils';
import {
  enqueue,
  dequeue,
  readQueue,
  clearQueue,
  getQueueSize,
  peek,
  hasCapacity,
  shouldRetry,
  getMaxQueueSize,
  getMaxRetries,
} from '../../lib/offlineQueue';

// ==========================================================================
// 1. Sync Configuration (AC-082-15)
// ==========================================================================

describe('Sync configuration integration', () => {
  it('SYNCED_TABLES contains all 7 tables', () => {
    expect(SYNCED_TABLES).toHaveLength(7);
    expect(SYNCED_TABLES).toContain('members');
    expect(SYNCED_TABLES).toContain('ward_topics');
    expect(SYNCED_TABLES).toContain('ward_collection_config');
    expect(SYNCED_TABLES).toContain('sunday_exceptions');
    expect(SYNCED_TABLES).toContain('speeches');
    expect(SYNCED_TABLES).toContain('sunday_agendas');
    expect(SYNCED_TABLES).toContain('meeting_actors');
  });

  it('TABLE_TO_QUERY_KEYS maps every synced table', () => {
    for (const table of SYNCED_TABLES) {
      const keys = TABLE_TO_QUERY_KEYS[table];
      expect(keys).toBeDefined();
      expect(keys.length).toBeGreaterThan(0);
    }
  });

  it('getQueryKeysForTable returns correct keys for each table', () => {
    expect(getQueryKeysForTable('members')).toEqual([['members']]);
    expect(getQueryKeysForTable('speeches')).toEqual([['speeches']]);
    expect(getQueryKeysForTable('sunday_agendas')).toEqual([['agendas']]);
    expect(getQueryKeysForTable('meeting_actors')).toEqual([['actors']]);
    expect(getQueryKeysForTable('sunday_exceptions')).toEqual([['sundayTypes']]);
    expect(getQueryKeysForTable('ward_topics')).toEqual([['topics']]);
    expect(getQueryKeysForTable('ward_collection_config')).toEqual([['topics']]);
  });

  it('getQueryKeysForTable returns empty for unknown table', () => {
    expect(getQueryKeysForTable('unknown_table')).toEqual([]);
  });

  it('POLLING_INTERVAL_MS is 2500ms', () => {
    expect(POLLING_INTERVAL_MS).toBe(2500);
  });
});

// ==========================================================================
// 2. Connection Utilities (AC-082-16)
// ==========================================================================

describe('Connection utilities integration', () => {
  it('isNetInfoOnline returns true when connected and reachable', () => {
    expect(isNetInfoOnline({ isConnected: true, isInternetReachable: true })).toBe(true);
  });

  it('isNetInfoOnline returns true when connected and reachability unknown', () => {
    expect(isNetInfoOnline({ isConnected: true, isInternetReachable: null })).toBe(true);
  });

  it('isNetInfoOnline returns false when disconnected', () => {
    expect(isNetInfoOnline({ isConnected: false, isInternetReachable: null })).toBe(false);
  });

  it('isNetInfoOnline returns false when connected but not reachable', () => {
    expect(isNetInfoOnline({ isConnected: true, isInternetReachable: false })).toBe(false);
  });

  it('isNetInfoOnline returns false when isConnected is null', () => {
    expect(isNetInfoOnline({ isConnected: null, isInternetReachable: null })).toBe(false);
  });
});

// ==========================================================================
// 3. Offline Queue (AC-082-17)
// ==========================================================================

describe('Offline queue integration', () => {
  beforeEach(async () => {
    await clearQueue();
  });

  it('enqueue and dequeue follow FIFO order', async () => {
    await enqueue({
      id: 'mut-1',
      table: 'members',
      operation: 'INSERT',
      data: { id: 'm1', full_name: 'Alice' },
      timestamp: Date.now(),
    });

    await enqueue({
      id: 'mut-2',
      table: 'members',
      operation: 'UPDATE',
      data: { id: 'm2', full_name: 'Bob' },
      timestamp: Date.now(),
    });

    const first = await dequeue();
    expect(first?.id).toBe('mut-1');
    expect(first?.operation).toBe('INSERT');

    const second = await dequeue();
    expect(second?.id).toBe('mut-2');
    expect(second?.operation).toBe('UPDATE');

    const third = await dequeue();
    expect(third).toBeNull();
  });

  it('readQueue returns all entries', async () => {
    await enqueue({
      id: 'mut-1',
      table: 'speeches',
      operation: 'INSERT',
      data: { id: 's1' },
      timestamp: Date.now(),
    });

    const queue = await readQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].id).toBe('mut-1');
  });

  it('getQueueSize returns correct count', async () => {
    expect(await getQueueSize()).toBe(0);

    await enqueue({
      id: 'mut-1',
      table: 'members',
      operation: 'INSERT',
      data: { id: 'm1' },
      timestamp: Date.now(),
    });

    expect(await getQueueSize()).toBe(1);
  });

  it('peek returns first without removing', async () => {
    await enqueue({
      id: 'mut-1',
      table: 'members',
      operation: 'INSERT',
      data: { id: 'm1' },
      timestamp: Date.now(),
    });

    const peeked = await peek();
    expect(peeked?.id).toBe('mut-1');

    // Still in queue
    expect(await getQueueSize()).toBe(1);
  });

  it('clearQueue empties all entries', async () => {
    await enqueue({
      id: 'mut-1',
      table: 'members',
      operation: 'INSERT',
      data: { id: 'm1' },
      timestamp: Date.now(),
    });

    await clearQueue();
    expect(await getQueueSize()).toBe(0);
  });

  it('enqueue returns false when queue is full (EC-082-09)', async () => {
    const maxSize = getMaxQueueSize();
    // Fill the queue
    for (let i = 0; i < maxSize; i++) {
      const result = await enqueue({
        id: `mut-${i}`,
        table: 'members',
        operation: 'INSERT',
        data: { id: `m${i}` },
        timestamp: Date.now(),
      });
      expect(result).toBe(true);
    }

    // Next enqueue should fail
    const overflow = await enqueue({
      id: 'mut-overflow',
      table: 'members',
      operation: 'INSERT',
      data: { id: 'overflow' },
      timestamp: Date.now(),
    });
    expect(overflow).toBe(false);
  });

  it('hasCapacity returns correct values', () => {
    expect(hasCapacity(0)).toBe(true);
    expect(hasCapacity(50)).toBe(true);
    expect(hasCapacity(99)).toBe(true);
    expect(hasCapacity(100)).toBe(false);
    expect(hasCapacity(101)).toBe(false);
  });

  it('shouldRetry returns correct values', () => {
    expect(shouldRetry(0)).toBe(true);
    expect(shouldRetry(1)).toBe(true);
    expect(shouldRetry(2)).toBe(true);
    expect(shouldRetry(3)).toBe(false);
    expect(shouldRetry(4)).toBe(false);
  });

  it('getMaxRetries returns 3', () => {
    expect(getMaxRetries()).toBe(3);
  });
});

// ==========================================================================
// 4. Sync table-to-query key mapping (AC-082-18)
// ==========================================================================

describe('Sync table-to-query key mapping', () => {
  it('every SYNCED_TABLE has a mapping in TABLE_TO_QUERY_KEYS', () => {
    for (const table of SYNCED_TABLES) {
      expect(table in TABLE_TO_QUERY_KEYS).toBe(true);
    }
  });

  it('query keys are non-empty arrays of string arrays', () => {
    for (const table of SYNCED_TABLES) {
      const keys = TABLE_TO_QUERY_KEYS[table];
      expect(Array.isArray(keys)).toBe(true);
      for (const key of keys) {
        expect(Array.isArray(key)).toBe(true);
        expect(key.length).toBeGreaterThan(0);
        for (const segment of key) {
          expect(typeof segment).toBe('string');
        }
      }
    }
  });
});

// ==========================================================================
// EC-082-10: Queue persistence across enqueue/dequeue cycles
// ==========================================================================

describe('Queue persistence (EC-082-10)', () => {
  beforeEach(async () => {
    await clearQueue();
  });

  it('persists across multiple enqueue/dequeue cycles', async () => {
    // Cycle 1: enqueue 2, dequeue 1
    await enqueue({ id: 'a', table: 't', operation: 'INSERT', data: {}, timestamp: 1 });
    await enqueue({ id: 'b', table: 't', operation: 'INSERT', data: {}, timestamp: 2 });
    await dequeue(); // removes 'a'

    // Cycle 2: enqueue 1 more
    await enqueue({ id: 'c', table: 't', operation: 'INSERT', data: {}, timestamp: 3 });

    // Should have 'b' and 'c'
    const queue = await readQueue();
    expect(queue).toHaveLength(2);
    expect(queue[0].id).toBe('b');
    expect(queue[1].id).toBe('c');
  });
});
