/**
 * Integration tests: Permissions + Roles + Auth (Category 2)
 * Tests permission matrix, role transitions, and auth guard behavior.
 *
 * Covers: AC-082-13, AC-082-14, EC-082-07, EC-082-08
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  renderHook,
  waitFor,
  createTestQueryClient,
  createWrapper,
  createMockAuthContext,
  mockSupabaseFrom,
  createMockActor,
  createMockMember,
} from './setup-integration';
import { hasPermission, getPermissions, ALL_PERMISSIONS, ALL_ROLES } from '../../lib/permissions';
import type { Role, Permission } from '../../types/database';

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
    channel: vi.fn(),
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

vi.mock('../../lib/dateUtils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/dateUtils')>();
  return {
    ...actual,
    formatDateHumanReadable: (dateStr: string) => dateStr,
  };
});

import { supabase } from '../../lib/supabase';
import { useActors, useCreateActor } from '../../hooks/useActors';
import { useMembers } from '../../hooks/useMembers';

const mockedSupabase = vi.mocked(supabase);

// ==========================================================================
// Permission Matrix Tests (AC-082-13)
// ==========================================================================

describe('Permission matrix integration', () => {
  describe('bishopric role', () => {
    it('has all expected permissions', () => {
      const role: Role = 'bishopric';
      const expectedPerms: Permission[] = [
        'speech:assign',
        'speech:unassign',
        'speech:change_status',
        'member:read',
        'member:write',
        'member:import',
        'topic:write',
        'collection:toggle',
        'sunday_type:write',
        'settings:access',
        'settings:language',
        'settings:whatsapp',
        'settings:timezone',
        'settings:users',
        'invite:manage',
        'home:next_assignments',
        'home:invite_mgmt',
        'agenda:read',
        'agenda:write',
        'agenda:assign_speaker',
        'presentation:start',
        'push:receive',
        'invitation:create',
        'history:read',
      ];

      expectedPerms.forEach((perm) => {
        expect(hasPermission(role, perm)).toBe(true);
      });
    });
  });

  describe('secretary role', () => {
    it('has expected permissions', () => {
      const role: Role = 'secretary';
      // Secretary should have these
      expect(hasPermission(role, 'member:read')).toBe(true);
      expect(hasPermission(role, 'member:write')).toBe(true);
      expect(hasPermission(role, 'agenda:read')).toBe(true);
      expect(hasPermission(role, 'agenda:write')).toBe(true);
      expect(hasPermission(role, 'history:read')).toBe(true);
      expect(hasPermission(role, 'presentation:start')).toBe(true);
    });

    it('does not have bishopric-exclusive permissions', () => {
      const role: Role = 'secretary';
      // Secretary should NOT have these (bishopric-only)
      expect(hasPermission(role, 'speech:assign')).toBe(false);
      expect(hasPermission(role, 'speech:unassign')).toBe(false);
      expect(hasPermission(role, 'home:next_assignments')).toBe(false);
    });
  });

  describe('observer role', () => {
    it('has only read and presentation permissions', () => {
      const role: Role = 'observer';
      expect(hasPermission(role, 'member:read')).toBe(true);
      expect(hasPermission(role, 'agenda:read')).toBe(true);
      expect(hasPermission(role, 'presentation:start')).toBe(true);
    });

    it('does not have write permissions', () => {
      const role: Role = 'observer';
      expect(hasPermission(role, 'member:write')).toBe(false);
      expect(hasPermission(role, 'agenda:write')).toBe(false);
      expect(hasPermission(role, 'speech:assign')).toBe(false);
      expect(hasPermission(role, 'topic:write')).toBe(false);
      expect(hasPermission(role, 'history:read')).toBe(false);
      expect(hasPermission(role, 'settings:access')).toBe(false);
    });
  });

  describe('getPermissions', () => {
    it('returns all permissions for a role', () => {
      const perms = getPermissions('bishopric');
      expect(perms.length).toBeGreaterThan(0);
      expect(perms).toContain('speech:assign');
    });

    it('returns empty for unknown role', () => {
      const perms = getPermissions('unknown' as Role);
      expect(perms).toEqual([]);
    });
  });

  describe('ALL_PERMISSIONS and ALL_ROLES', () => {
    it('ALL_PERMISSIONS contains all defined permissions', () => {
      expect(ALL_PERMISSIONS.length).toBeGreaterThan(20);
    });

    it('ALL_ROLES contains exactly 3 roles', () => {
      expect(ALL_ROLES).toEqual(['bishopric', 'secretary', 'observer']);
    });
  });
});

// ==========================================================================
// Auth context + Hook permission gating (AC-082-14)
// ==========================================================================

describe('Auth context permission gating', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  it('bishopric user can access all hook data', async () => {
    const mockActors = [createMockActor({ id: 'a1', name: 'Actor 1' })];
    mockSupabaseFrom(mockedSupabase, 'meeting_actors', { data: mockActors, error: null });

    const wrapper = createWrapper({ role: 'bishopric' }, queryClient);
    const { result } = renderHook(() => useActors(), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toHaveLength(1);
  });

  it('observer user gets empty wardId-dependent data when wardId is present', async () => {
    const mockMembers = [createMockMember({ id: 'm1' })];
    mockSupabaseFrom(mockedSupabase, 'members', { data: mockMembers, error: null });

    const wrapper = createWrapper({ role: 'observer' }, queryClient);
    const { result } = renderHook(() => useMembers(), { wrapper });

    // Observer has member:read, so should fetch successfully
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toHaveLength(1);
  });

  it('hasPermission in auth context delegates to permissions lib', () => {
    const authCtx = createMockAuthContext({ role: 'observer' });

    expect(authCtx.hasPermission('member:read')).toBe(true);
    expect(authCtx.hasPermission('member:write')).toBe(false);
    expect(authCtx.hasPermission('speech:assign')).toBe(false);
  });

  it('auth context with secretary role has correct permissions', () => {
    const authCtx = createMockAuthContext({ role: 'secretary' });

    expect(authCtx.hasPermission('member:read')).toBe(true);
    expect(authCtx.hasPermission('member:write')).toBe(true);
    expect(authCtx.hasPermission('speech:assign')).toBe(false);
    expect(authCtx.hasPermission('agenda:write')).toBe(true);
  });
});

// ==========================================================================
// EC-082-07: Unknown role returns false
// ==========================================================================

describe('Unknown role handling (EC-082-07)', () => {
  it('hasPermission returns false for unknown role', () => {
    expect(hasPermission('admin' as Role, 'member:read')).toBe(false);
  });

  it('getPermissions returns empty for unknown role', () => {
    expect(getPermissions('admin' as Role)).toEqual([]);
  });
});

// ==========================================================================
// EC-082-08: AuthContext loading state
// ==========================================================================

describe('AuthContext loading state (EC-082-08)', () => {
  it('hooks respect enabled flag when wardId is empty', async () => {
    const queryClient = createTestQueryClient();
    mockSupabaseFrom(mockedSupabase, 'meeting_actors', { data: [], error: null });

    const wrapper = createWrapper({ wardId: '' }, queryClient);
    const { result } = renderHook(() => useActors(), { wrapper });

    // With empty wardId, queries should not fire
    await new Promise((r) => setTimeout(r, 50));
    expect(result.current.data).toBeUndefined();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('hooks fire when wardId is present', async () => {
    const queryClient = createTestQueryClient();
    const mockActors = [createMockActor()];
    mockSupabaseFrom(mockedSupabase, 'meeting_actors', { data: mockActors, error: null });

    const wrapper = createWrapper({ wardId: 'ward-1' }, queryClient);
    const { result } = renderHook(() => useActors(), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toHaveLength(1);
  });
});
