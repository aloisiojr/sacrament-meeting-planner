/**
 * Tests for sync utilities (pure functions).
 */

import { SYNCED_TABLES, getQueryKeysForTable, POLLING_INTERVAL_MS } from '../lib/sync';

describe('SYNCED_TABLES', () => {
  it('contains all 5 synced tables', () => {
    expect(SYNCED_TABLES).toHaveLength(5);
    expect(SYNCED_TABLES).toContain('members');
    expect(SYNCED_TABLES).toContain('ward_topics');
    expect(SYNCED_TABLES).toContain('sunday_exceptions');
    expect(SYNCED_TABLES).toContain('speeches');
    expect(SYNCED_TABLES).toContain('sunday_agendas');
  });
});

describe('getQueryKeysForTable', () => {
  it('returns query keys for members table', () => {
    const keys = getQueryKeysForTable('members');
    expect(keys.length).toBeGreaterThan(0);
  });

  it('returns query keys for speeches table', () => {
    const keys = getQueryKeysForTable('speeches');
    expect(keys.length).toBeGreaterThan(0);
  });

  it('returns query keys for sunday_agendas table', () => {
    const keys = getQueryKeysForTable('sunday_agendas');
    expect(keys.length).toBeGreaterThan(0);
  });

  it('returns query keys for ward_topics table', () => {
    const keys = getQueryKeysForTable('ward_topics');
    expect(keys.length).toBeGreaterThan(0);
  });


  it('returns query keys for sunday_exceptions table', () => {
    const keys = getQueryKeysForTable('sunday_exceptions');
    expect(keys.length).toBeGreaterThan(0);
  });

  it('returns empty array for unknown table', () => {
    const keys = getQueryKeysForTable('unknown_table');
    expect(keys).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    const keys = getQueryKeysForTable('');
    expect(keys).toEqual([]);
  });
});

describe('POLLING_INTERVAL_MS', () => {
  it('is 10000ms', () => {
    expect(POLLING_INTERVAL_MS).toBe(10000);
  });
});
