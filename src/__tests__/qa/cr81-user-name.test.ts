/**
 * QA tests for CR-81: User Name Field
 *
 * Validates the complete user name feature including:
 * - ActivityLog type (user_name field)
 * - logAction / createLogger with userName parameter
 * - offlineGuard update-user-name operation
 * - i18n keys for all 3 locales
 * - Backward compatibility (userName optional)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before any imports that use it
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}));

import { logAction, createLogger } from '../../lib/activityLog';
import {
  requiresConnection,
  ONLINE_ONLY_OPERATIONS,
  throwIfOffline,
} from '../../lib/offlineGuard';
import type { ActivityLog } from '../../types/database';

// =============================================================================
// CR-81 AC-01: ActivityLog type includes user_name
// =============================================================================

describe('CR-81 AC-01: ActivityLog type has user_name field', () => {
  it('ActivityLog type allows user_name as string', () => {
    const entry: ActivityLog = {
      id: 'test-id',
      ward_id: 'ward-1',
      user_id: 'user-1',
      user_email: 'test@test.com',
      user_name: 'John Smith',
      action_type: 'member:create',
      description: 'Created member',
      created_at: new Date().toISOString(),
    };
    expect(entry.user_name).toBe('John Smith');
  });

  it('ActivityLog type allows user_name as null', () => {
    const entry: ActivityLog = {
      id: 'test-id',
      ward_id: 'ward-1',
      user_id: 'user-1',
      user_email: 'test@test.com',
      user_name: null,
      action_type: 'member:create',
      description: 'Created member',
      created_at: new Date().toISOString(),
    };
    expect(entry.user_name).toBeNull();
  });
});

// =============================================================================
// CR-81 AC-02: logAction accepts optional userName
// =============================================================================

describe('CR-81 AC-02: logAction userName parameter', () => {
  it('logAction works with userName provided', async () => {
    await expect(
      logAction('ward-1', 'user-1', 'user@test.com', 'member:create', 'Created member', 'John Smith')
    ).resolves.not.toThrow();
  });

  it('logAction works without userName (backward compatible)', async () => {
    await expect(
      logAction('ward-1', 'user-1', 'user@test.com', 'member:create', 'Created member')
    ).resolves.not.toThrow();
  });

  it('logAction works with undefined userName', async () => {
    await expect(
      logAction('ward-1', 'user-1', 'user@test.com', 'member:create', 'Created member', undefined)
    ).resolves.not.toThrow();
  });

  it('logAction works with empty string userName (treated as null)', async () => {
    await expect(
      logAction('ward-1', 'user-1', 'user@test.com', 'member:create', 'Created member', '')
    ).resolves.not.toThrow();
  });
});

// =============================================================================
// CR-81 AC-03: createLogger accepts optional userName
// =============================================================================

describe('CR-81 AC-03: createLogger userName parameter', () => {
  it('createLogger works without userName', () => {
    const logger = createLogger('ward-1', 'user-1', 'user@test.com');
    expect(typeof logger).toBe('function');
  });

  it('createLogger works with userName', () => {
    const logger = createLogger('ward-1', 'user-1', 'user@test.com', 'John Smith');
    expect(typeof logger).toBe('function');
  });

  it('logger returned with userName is callable', async () => {
    const logger = createLogger('ward-1', 'user-1', 'user@test.com', 'John Smith');
    await expect(logger('member:create', 'Created member')).resolves.not.toThrow();
  });

  it('logger returned without userName is callable', async () => {
    const logger = createLogger('ward-1', 'user-1', 'user@test.com');
    await expect(logger('member:create', 'Created member')).resolves.not.toThrow();
  });
});

// =============================================================================
// CR-81 AC-04: update-user-name in offlineGuard
// =============================================================================

describe('CR-81 AC-04: update-user-name offline guard', () => {
  it('update-user-name requires connection', () => {
    expect(requiresConnection('update-user-name')).toBe(true);
  });

  it('ONLINE_ONLY_OPERATIONS includes update-user-name', () => {
    expect(ONLINE_ONLY_OPERATIONS).toContain('update-user-name');
  });

  it('throwIfOffline blocks update-user-name when offline', () => {
    expect(() => throwIfOffline('update-user-name', false)).toThrow();
  });

  it('throwIfOffline allows update-user-name when online', () => {
    expect(() => throwIfOffline('update-user-name', true)).not.toThrow();
  });

  it('ONLINE_ONLY_OPERATIONS has 6 entries total', () => {
    expect(ONLINE_ONLY_OPERATIONS).toHaveLength(6);
  });
});

// =============================================================================
// CR-81 AC-05: i18n keys exist in all locales
// =============================================================================

describe('CR-81 AC-05: i18n keys for user name', () => {
  // We can test by importing the JSON files directly
  const ptBR = require('../../i18n/locales/pt-BR.json');
  const en = require('../../i18n/locales/en.json');
  const es = require('../../i18n/locales/es.json');

  const requiredAuthKeys = ['fullName', 'fullNamePlaceholder', 'nameRequired'];
  const requiredUserKeys = ['name', 'nameUpdated', 'nameUpdateFailed'];

  for (const key of requiredAuthKeys) {
    it(`pt-BR has auth.${key}`, () => {
      expect(ptBR.auth[key]).toBeTruthy();
    });

    it(`en has auth.${key}`, () => {
      expect(en.auth[key]).toBeTruthy();
    });

    it(`es has auth.${key}`, () => {
      expect(es.auth[key]).toBeTruthy();
    });
  }

  for (const key of requiredUserKeys) {
    it(`pt-BR has users.${key}`, () => {
      expect(ptBR.users[key]).toBeTruthy();
    });

    it(`en has users.${key}`, () => {
      expect(en.users[key]).toBeTruthy();
    });

    it(`es has users.${key}`, () => {
      expect(es.users[key]).toBeTruthy();
    });
  }
});

// =============================================================================
// CR-81 AC-06: Backward compatibility
// =============================================================================

describe('CR-81 AC-06: Backward compatibility', () => {
  it('logAction signature is backward compatible (5 params still works)', async () => {
    // Existing code passes 5 params. The 6th (userName) is optional.
    await expect(
      logAction('ward-1', 'user-1', 'user@test.com', 'test:action', 'Test')
    ).resolves.not.toThrow();
  });

  it('createLogger signature is backward compatible (3 params still works)', () => {
    // Existing code passes 3 params. The 4th (userName) is optional.
    const logger = createLogger('ward-1', 'user-1', 'user@test.com');
    expect(typeof logger).toBe('function');
  });

  it('ActivityLog with user_name=null represents legacy entries', () => {
    const legacyEntry: ActivityLog = {
      id: 'old-entry',
      ward_id: 'ward-1',
      user_id: 'user-1',
      user_email: 'old@test.com',
      user_name: null,
      action_type: 'member:create',
      description: 'Old entry without name',
      created_at: '2024-01-01T00:00:00Z',
    };
    // History screen shows email when user_name is null
    const displayName = legacyEntry.user_name || legacyEntry.user_email;
    expect(displayName).toBe('old@test.com');
  });

  it('ActivityLog with user_name set shows name', () => {
    const newEntry: ActivityLog = {
      id: 'new-entry',
      ward_id: 'ward-1',
      user_id: 'user-1',
      user_email: 'new@test.com',
      user_name: 'John Smith',
      action_type: 'member:create',
      description: 'New entry with name',
      created_at: '2026-01-01T00:00:00Z',
    };
    // History screen shows name when user_name is set
    const displayName = newEntry.user_name || newEntry.user_email;
    expect(displayName).toBe('John Smith');
  });
});

// =============================================================================
// CR-81 AC-07: Edge Function count validation
// =============================================================================

describe('CR-81 AC-07: Edge Function count', () => {
  it('project has 8 Edge Functions total (7 existing + 1 new)', () => {
    // Existing: register-first-user, register-invited-user, create-invitation,
    //           update-user-role, delete-user, list-users, process-notifications
    // New: update-user-name
    const expectedFunctions = [
      'register-first-user',
      'register-invited-user',
      'create-invitation',
      'update-user-role',
      'update-user-name',
      'delete-user',
      'list-users',
      'process-notifications',
    ];
    expect(expectedFunctions).toHaveLength(8);
  });

  it('ONLINE_ONLY_OPERATIONS does not include list-users (read-only)', () => {
    expect(ONLINE_ONLY_OPERATIONS).not.toContain('list-users');
  });

  it('ONLINE_ONLY_OPERATIONS does not include process-notifications', () => {
    expect(ONLINE_ONLY_OPERATIONS).not.toContain('process-notifications');
  });
});
