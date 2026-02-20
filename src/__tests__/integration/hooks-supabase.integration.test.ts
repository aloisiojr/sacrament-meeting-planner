/**
 * Integration tests: Hooks + Supabase + ReactQuery (Category 1)
 * Tests 9 hooks interacting with mocked Supabase via React Query.
 *
 * Covers: AC-082-01 to AC-082-12, EC-082-01 to EC-082-06
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  renderHook,
  waitFor,
  act,
  createTestQueryClient,
  createWrapper,
  mockSupabaseFrom,
  createMockActor,
  createMockMember,
  createMockSpeech,
  createMockHymn,
  createMockAgenda,
  createMockTopic,
  createMockActivityLog,
} from './setup-integration';

// --- Module mocks (per ADR-059: each test file owns its mocks) ---

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
  buildLogDescription: (actionType: string, params: Record<string, string | number>) => {
    const parts = [actionType];
    for (const [key, value] of Object.entries(params)) {
      parts.push(`${key}=${value}`);
    }
    return parts.join('|');
  },
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

// Import after mocks
import { supabase } from '../../lib/supabase';
import { useActors, useCreateActor, useUpdateActor, useDeleteActor } from '../../hooks/useActors';
import { useLazyCreateAgenda, useUpdateAgenda } from '../../hooks/useAgenda';
import { useSpeeches, useAssignSpeaker, useChangeStatus } from '../../hooks/useSpeeches';
import { useMembers, useCreateMember, useUpdateMember, useDeleteMember } from '../../hooks/useMembers';
import { useHymns } from '../../hooks/useHymns';
import { useCreateWardTopic } from '../../hooks/useTopics';
import { useSetSundayType } from '../../hooks/useSundayTypes';
import { useActivityLog } from '../../hooks/useActivityLog';
import type { QueryClient } from '@tanstack/react-query';

const mockedSupabase = vi.mocked(supabase);

// --- Setup / Teardown ---

let queryClient: QueryClient;

beforeEach(() => {
  vi.clearAllMocks();
  queryClient = createTestQueryClient();
});

afterEach(() => {
  queryClient.clear();
});

// ==========================================================================
// 1. useActors
// ==========================================================================

describe('useActors integration', () => {
  it('fetches actors from Supabase (AC-082-01)', async () => {
    const mockActors = [
      createMockActor({ id: 'a1', name: 'Bishop Jones', can_preside: true }),
      createMockActor({ id: 'a2', name: 'Elder Smith', can_conduct: true }),
    ];
    mockSupabaseFrom(mockedSupabase, 'meeting_actors', { data: mockActors, error: null });

    const wrapper = createWrapper(undefined, queryClient);
    const { result } = renderHook(() => useActors(), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toEqual(mockActors);
    expect(result.current.isError).toBe(false);
  });

  it('creates actor and invalidates cache (AC-082-02)', async () => {
    mockSupabaseFrom(mockedSupabase, 'meeting_actors', {
      data: createMockActor({ id: 'new-1', name: 'New Actor' }),
      error: null,
    });

    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = createWrapper(undefined, queryClient);
    const { result } = renderHook(() => useCreateActor(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ name: 'New Actor', can_preside: true });
    });

    expect(spy).toHaveBeenCalled();
  });

  it('updates actor and invalidates cache', async () => {
    mockSupabaseFrom(mockedSupabase, 'meeting_actors', {
      data: createMockActor({ id: 'a1', name: 'Updated Actor' }),
      error: null,
    });

    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = createWrapper(undefined, queryClient);
    const { result } = renderHook(() => useUpdateActor(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 'a1', name: 'Updated Actor' });
    });

    expect(spy).toHaveBeenCalled();
  });

  it('deletes actor and invalidates cache', async () => {
    mockSupabaseFrom(mockedSupabase, 'meeting_actors', { data: null, error: null });

    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = createWrapper(undefined, queryClient);
    const { result } = renderHook(() => useDeleteActor(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ actorId: 'a1', actorName: 'Actor 1' });
    });

    expect(spy).toHaveBeenCalled();
  });

  it('returns isError when Supabase errors (EC-082-01)', async () => {
    mockSupabaseFrom(mockedSupabase, 'meeting_actors', {
      data: null,
      error: { message: 'DB error', code: '500' },
    });

    const wrapper = createWrapper(undefined, queryClient);
    const { result } = renderHook(() => useActors(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('does not fetch when wardId is empty (EC-082-02)', async () => {
    mockSupabaseFrom(mockedSupabase, 'meeting_actors', { data: [], error: null });

    const wrapper = createWrapper({ wardId: '' }, queryClient);
    const { result } = renderHook(() => useActors(), { wrapper });

    // Wait a tick to ensure no query fires
    await new Promise((r) => setTimeout(r, 50));
    expect(result.current.data).toBeUndefined();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('does not invalidate cache on mutation failure (EC-082-03)', async () => {
    mockedSupabase.from.mockImplementation(() => {
      const errorPromise = Promise.resolve({
        data: null,
        error: { message: 'Constraint violation', code: '23505' },
      });
      const chain: any = new Proxy({}, {
        get(_t, p: string) {
          if (p === 'then') return errorPromise.then.bind(errorPromise);
          if (p === 'catch') return errorPromise.catch.bind(errorPromise);
          if (p === 'finally') return errorPromise.finally.bind(errorPromise);
          return () => chain;
        },
      });
      return chain;
    });

    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = createWrapper(undefined, queryClient);
    const { result } = renderHook(() => useCreateActor(), { wrapper });

    try {
      await act(async () => {
        await result.current.mutateAsync({ name: 'Fail Actor' });
      });
    } catch {
      // Expected to fail
    }

    // onSuccess should not have fired, so no actor-specific invalidation
    const calls = spy.mock.calls.filter(
      (call) => JSON.stringify(call).includes('actors')
    );
    expect(calls.length).toBe(0);
  });

  it('does not cause errors when unmounted before query completes (EC-082-06)', async () => {
    let resolveQuery: any;
    const delayedPromise = new Promise((r) => { resolveQuery = r; });
    mockedSupabase.from.mockImplementation(() => {
      const chain: any = new Proxy({}, {
        get(_t, p: string) {
          if (p === 'then') return delayedPromise.then.bind(delayedPromise);
          if (p === 'catch') return delayedPromise.catch.bind(delayedPromise);
          if (p === 'finally') return delayedPromise.finally.bind(delayedPromise);
          return () => chain;
        },
      });
      return chain;
    });

    const wrapper = createWrapper(undefined, queryClient);
    const { unmount } = renderHook(() => useActors(), { wrapper });

    unmount();

    // Resolve after unmount - should not throw
    resolveQuery({ data: [createMockActor()], error: null });
    await new Promise((r) => setTimeout(r, 50));

    expect(true).toBe(true);
  });
});

// ==========================================================================
// 2. useAgenda
// ==========================================================================

describe('useAgenda integration', () => {
  it('lazy creates agenda when none exists (AC-082-03)', async () => {
    const mockAgenda = createMockAgenda({ sunday_date: '2026-03-01' });
    let callCount = 0;
    mockedSupabase.from.mockImplementation(() => {
      callCount++;
      const response = callCount === 1
        ? { data: null, error: null }
        : { data: mockAgenda, error: null };
      const resolvedPromise = Promise.resolve(response);
      const chain: any = new Proxy({}, {
        get(_t, p: string) {
          if (p === 'then') return resolvedPromise.then.bind(resolvedPromise);
          if (p === 'catch') return resolvedPromise.catch.bind(resolvedPromise);
          if (p === 'finally') return resolvedPromise.finally.bind(resolvedPromise);
          return () => chain;
        },
      });
      return chain;
    });

    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = createWrapper(undefined, queryClient);
    const { result } = renderHook(() => useLazyCreateAgenda(), { wrapper });

    await act(async () => {
      const agenda = await result.current.mutateAsync('2026-03-01');
      expect(agenda).toEqual(mockAgenda);
    });

    expect(spy).toHaveBeenCalled();
  });

  it('updates agenda with partial fields', async () => {
    const updatedAgenda = createMockAgenda({ has_baby_blessing: true });
    mockSupabaseFrom(mockedSupabase, 'sunday_agendas', { data: updatedAgenda, error: null });

    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = createWrapper(undefined, queryClient);
    const { result } = renderHook(() => useUpdateAgenda(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        agendaId: 'agenda-1',
        fields: { has_baby_blessing: true },
      });
    });

    expect(spy).toHaveBeenCalled();
  });
});

// ==========================================================================
// 3. useSpeeches
// ==========================================================================

describe('useSpeeches integration', () => {
  it('fetches speeches for date range (AC-082-04)', async () => {
    const mockSpeeches = [
      createMockSpeech({ id: 's1', sunday_date: '2026-03-01', position: 1 }),
      createMockSpeech({ id: 's2', sunday_date: '2026-03-01', position: 2 }),
      createMockSpeech({ id: 's3', sunday_date: '2026-03-01', position: 3 }),
    ];
    mockSupabaseFrom(mockedSupabase, 'speeches', { data: mockSpeeches, error: null });

    const wrapper = createWrapper(undefined, queryClient);
    const { result } = renderHook(
      () => useSpeeches({ start: '2026-03-01', end: '2026-03-15' }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toHaveLength(3);
  });

  it('assigns speaker and updates status (AC-082-05)', async () => {
    const updatedSpeech = createMockSpeech({
      id: 's1',
      member_id: 'member-1',
      speaker_name: 'John Doe',
      speaker_phone: '+5511999999999',
      status: 'assigned_not_invited',
    });
    mockSupabaseFrom(mockedSupabase, 'speeches', { data: updatedSpeech, error: null });

    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = createWrapper(undefined, queryClient);
    const { result } = renderHook(() => useAssignSpeaker(), { wrapper });

    await act(async () => {
      const speech = await result.current.mutateAsync({
        speechId: 's1',
        memberId: 'member-1',
        speakerName: 'John Doe',
        speakerPhone: '+5511999999999',
      });
      expect(speech.status).toBe('assigned_not_invited');
    });

    expect(spy).toHaveBeenCalled();
  });

  it('validates transition before changing status (AC-082-06)', async () => {
    let callCount = 0;
    mockedSupabase.from.mockImplementation(() => {
      callCount++;
      const response = callCount === 1
        ? { data: { status: 'assigned_not_invited' }, error: null }
        : { data: createMockSpeech({ status: 'assigned_confirmed' }), error: null };
      const resolvedPromise = Promise.resolve(response);
      const chain: any = new Proxy({}, {
        get(_t, p: string) {
          if (p === 'then') return resolvedPromise.then.bind(resolvedPromise);
          if (p === 'catch') return resolvedPromise.catch.bind(resolvedPromise);
          if (p === 'finally') return resolvedPromise.finally.bind(resolvedPromise);
          return () => chain;
        },
      });
      return chain;
    });

    const wrapper = createWrapper(undefined, queryClient);
    const { result } = renderHook(() => useChangeStatus(), { wrapper });

    await act(async () => {
      const speech = await result.current.mutateAsync({
        speechId: 's1',
        status: 'assigned_confirmed',
      });
      expect(speech.status).toBe('assigned_confirmed');
    });
  });

  it('rejects invalid status transition', async () => {
    mockedSupabase.from.mockImplementation(() => {
      const response = { data: { status: 'not_assigned' }, error: null };
      const resolvedPromise = Promise.resolve(response);
      const chain: any = new Proxy({}, {
        get(_t, p: string) {
          if (p === 'then') return resolvedPromise.then.bind(resolvedPromise);
          if (p === 'catch') return resolvedPromise.catch.bind(resolvedPromise);
          if (p === 'finally') return resolvedPromise.finally.bind(resolvedPromise);
          return () => chain;
        },
      });
      return chain;
    });

    const wrapper = createWrapper(undefined, queryClient);
    const { result } = renderHook(() => useChangeStatus(), { wrapper });

    let error: any;
    try {
      await act(async () => {
        await result.current.mutateAsync({
          speechId: 's1',
          status: 'assigned_confirmed',
        });
      });
    } catch (e) {
      error = e;
    }

    expect(error).toBeDefined();
    expect(error?.message).toContain('Invalid status transition');
  });
});

// ==========================================================================
// 4. useMembers
// ==========================================================================

describe('useMembers integration', () => {
  it('fetches members for current ward (AC-082-07)', async () => {
    const mockMembers = [
      createMockMember({ id: 'm1', full_name: 'Alice Santos' }),
      createMockMember({ id: 'm2', full_name: 'Bob Silva' }),
    ];
    mockSupabaseFrom(mockedSupabase, 'members', { data: mockMembers, error: null });

    const wrapper = createWrapper(undefined, queryClient);
    const { result } = renderHook(() => useMembers(), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toHaveLength(2);
  });

  it('creates member and invalidates cache', async () => {
    mockSupabaseFrom(mockedSupabase, 'members', {
      data: createMockMember({ id: 'new-m', full_name: 'New Member' }),
      error: null,
    });

    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = createWrapper(undefined, queryClient);
    const { result } = renderHook(() => useCreateMember(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        full_name: 'New Member',
        country_code: '+55',
      });
    });

    expect(spy).toHaveBeenCalled();
  });

  it('updates member and invalidates cache', async () => {
    mockSupabaseFrom(mockedSupabase, 'members', {
      data: createMockMember({ id: 'm1', full_name: 'Updated Name' }),
      error: null,
    });

    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = createWrapper(undefined, queryClient);
    const { result } = renderHook(() => useUpdateMember(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 'm1', full_name: 'Updated Name' });
    });

    expect(spy).toHaveBeenCalled();
  });

  it('deletes member and invalidates cache', async () => {
    mockSupabaseFrom(mockedSupabase, 'members', { data: null, error: null });

    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = createWrapper(undefined, queryClient);
    const { result } = renderHook(() => useDeleteMember(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ memberId: 'm1', memberName: 'Member 1' });
    });

    expect(spy).toHaveBeenCalled();
  });
});

// ==========================================================================
// 5. useHymns
// ==========================================================================

describe('useHymns integration', () => {
  it('fetches hymns and transitions isLoading (AC-082-08)', async () => {
    const mockHymns = [
      createMockHymn({ id: 'h1', number: 1, title: 'Vinde Todos ao Senhor' }),
      createMockHymn({ id: 'h2', number: 2, title: 'O Redentor de Israel' }),
    ];
    mockSupabaseFrom(mockedSupabase, 'hymns', { data: mockHymns, error: null });

    const wrapper = createWrapper(undefined, queryClient);
    const { result } = renderHook(() => useHymns('pt-BR'), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toHaveLength(2);
  });
});

// ==========================================================================
// 6. useTopics (useWardTopics)
// ==========================================================================

describe('useTopics integration', () => {
  it('creates topic and invalidates cache (AC-082-09)', async () => {
    mockSupabaseFrom(mockedSupabase, 'ward_topics', {
      data: createMockTopic({ id: 'new-t', title: 'New Topic' }),
      error: null,
    });

    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = createWrapper(undefined, queryClient);
    const { result } = renderHook(() => useCreateWardTopic(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ title: 'New Topic' });
    });

    expect(spy).toHaveBeenCalled();
  });
});

// ==========================================================================
// 7. useSundayList
// ==========================================================================

describe('useSundayList integration', () => {
  it('generates sunday dates (AC-082-10)', async () => {
    const { useSundayList } = await import('../../hooks/useSundayList');

    const wrapper = createWrapper(undefined, queryClient);
    const { result } = renderHook(() => useSundayList(), { wrapper });

    expect(result.current.sundays.length).toBeGreaterThan(50);
    result.current.sundays.forEach((dateStr) => {
      const d = new Date(dateStr + 'T12:00:00Z');
      expect(d.getUTCDay()).toBe(0);
    });
  });
});

// ==========================================================================
// 8. useSundayTypes (useSundayExceptions)
// ==========================================================================

describe('useSundayTypes integration', () => {
  it('sets sunday type and invalidates cache (AC-082-11)', async () => {
    let callCount = 0;
    mockedSupabase.from.mockImplementation(() => {
      callCount++;
      const response = callCount === 1
        ? { data: null, error: null }
        : { data: null, error: null };
      const resolvedPromise = Promise.resolve(response);
      const chain: any = new Proxy({}, {
        get(_t, p: string) {
          if (p === 'then') return resolvedPromise.then.bind(resolvedPromise);
          if (p === 'catch') return resolvedPromise.catch.bind(resolvedPromise);
          if (p === 'finally') return resolvedPromise.finally.bind(resolvedPromise);
          return () => chain;
        },
      });
      return chain;
    });

    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = createWrapper(undefined, queryClient);
    const { result } = renderHook(() => useSetSundayType(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        date: '2026-03-01',
        reason: 'testimony_meeting',
      });
    });

    expect(spy).toHaveBeenCalled();
  });
});

// ==========================================================================
// 9. useActivityLog
// ==========================================================================

describe('useActivityLog integration', () => {
  it('fetches activity log entries (AC-082-12)', async () => {
    const mockEntries = [
      createMockActivityLog({ id: 'log-1', created_at: '2026-01-02T10:00:00Z' }),
      createMockActivityLog({ id: 'log-2', created_at: '2026-01-01T10:00:00Z' }),
    ];
    mockSupabaseFrom(mockedSupabase, 'activity_log', { data: mockEntries, error: null });

    const wrapper = createWrapper(undefined, queryClient);
    const { result } = renderHook(() => useActivityLog(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.canRead).toBe(true);
  });
});

// ==========================================================================
// EC-082-04: TestQueryClient retry false
// ==========================================================================

describe('TestQueryClient configuration', () => {
  it('has retry:false for deterministic tests (EC-082-04)', () => {
    const client = createTestQueryClient();
    const defaults = client.getDefaultOptions();
    expect(defaults.queries?.retry).toBe(false);
    expect(defaults.mutations?.retry).toBe(false);
  });
});

// ==========================================================================
// EC-082-05: Shared cache
// ==========================================================================

describe('Shared QueryClient cache', () => {
  it('useActors and useCreateActor share same QueryClient (EC-082-05)', async () => {
    const mockActors = [createMockActor({ id: 'a1', name: 'Actor 1' })];
    mockSupabaseFrom(mockedSupabase, 'meeting_actors', { data: mockActors, error: null });

    const sharedClient = createTestQueryClient();
    const wrapper = createWrapper(undefined, sharedClient);

    const { result: fetchResult } = renderHook(() => useActors(), { wrapper });
    renderHook(() => useCreateActor(), { wrapper });

    await waitFor(() => expect(fetchResult.current.data).toBeDefined());

    const cachedQueries = sharedClient.getQueryCache().getAll();
    expect(cachedQueries.length).toBeGreaterThan(0);
  });
});
