/**
 * Tests for sync utilities (pure functions).
 */

import { describe, it, expect } from 'vitest';
import { SYNCED_TABLES, getQueryKeysForTable, POLLING_INTERVAL_MS } from '../lib/sync';

describe('SYNCED_TABLES', () => {
  it('contains all 7 synced tables', () => {
    expect(SYNCED_TABLES).toHaveLength(7);
    expect(SYNCED_TABLES).toContain('members');
    expect(SYNCED_TABLES).toContain('ward_topics');
    expect(SYNCED_TABLES).toContain('ward_collection_config');
    expect(SYNCED_TABLES).toContain('sunday_exceptions');
    expect(SYNCED_TABLES).toContain('speeches');
    expect(SYNCED_TABLES).toContain('sunday_agendas');
    expect(SYNCED_TABLES).toContain('meeting_actors');
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

  it('returns query keys for meeting_actors table', () => {
    const keys = getQueryKeysForTable('meeting_actors');
    expect(keys.length).toBeGreaterThan(0);
  });

  it('returns query keys for ward_topics table', () => {
    const keys = getQueryKeysForTable('ward_topics');
    expect(keys.length).toBeGreaterThan(0);
  });

  it('returns query keys for ward_collection_config table', () => {
    const keys = getQueryKeysForTable('ward_collection_config');
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
  it('is 2500ms', () => {
    expect(POLLING_INTERVAL_MS).toBe(2500);
  });
});
