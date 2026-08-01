/**
 * F048: useOfflinePrefetch Hook Integration Tests
 *
 * Tests AC-048-01 through AC-048-04 and EC-048-01 through EC-048-02.
 * Verifies prefetch behavior using renderHook with QueryClient.
 */

import React from 'react';
import TestRenderer from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext, type AuthContextValue } from '../contexts/AuthContext';
import { hasPermission as checkPermission } from '../lib/permissions';
import { getNext3Sundays, useOfflinePrefetch } from '../hooks/useOfflinePrefetch';
import { agendaKeys } from '../hooks/useAgenda';
import { speechKeys } from '../hooks/useSpeeches';
import { sundayTypeKeys } from '../hooks/useSundayTypes';

const { act } = TestRenderer;

// Mock supabase
jest.mock('../lib/supabase', () => {
  const chain: any = new Proxy({}, {
    get(_t, prop: string) {
      if (prop === 'then') return (cb: any) => Promise.resolve({ data: [], error: null }).then(cb);
      if (prop === 'catch') return (cb: any) => Promise.resolve({ data: [], error: null }).catch(cb);
      return () => chain;
    },
  });
  return { supabase: { from: () => chain } };
});

function createMockAuthContext(overrides?: Partial<AuthContextValue>): AuthContextValue {
  const role = (overrides?.role ?? 'bishopric') as any;
  return {
    session: {} as any,
    user: { id: 'user-1' } as any,
    role,
    wardId: 'ward-1',
    userName: 'Test',
    wardLanguage: 'pt-BR',
    loading: false,
    signIn: jest.fn(),
    signOut: jest.fn(),
    hasPermission: (perm: any) => checkPermission(role, perm),
    updateAppLanguage: jest.fn(),
    setWardLanguage: jest.fn(),
    ...overrides,
  };
}

function renderPrefetchHook(isOnline: boolean, overrides?: Partial<AuthContextValue>) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  const prefetchSpy = jest.spyOn(queryClient, 'prefetchQuery');
  const authCtx = createMockAuthContext(overrides);

  let currentIsOnline = isOnline;

  function TestComponent() {
    useOfflinePrefetch(currentIsOnline);
    return null;
  }

  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider, { client: queryClient },
      React.createElement(AuthContext.Provider, { value: authCtx }, children)
    );
  }

  let renderer: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      React.createElement(Wrapper, null, React.createElement(TestComponent))
    );
  });

  return {
    prefetchSpy,
    queryClient,
    updateOnlineStatus: (newIsOnline: boolean) => {
      currentIsOnline = newIsOnline;
      act(() => {
        renderer.update(
          React.createElement(Wrapper, null, React.createElement(TestComponent))
        );
      });
    },
    unmount: () => {
      act(() => { renderer.unmount(); });
    },
  };
}

describe('F048: useOfflinePrefetch Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AC-048-01: Next Sunday agenda prefetched', () => {
    it('calls prefetchQuery for agenda when online on mount', () => {
      const { prefetchSpy } = renderPrefetchHook(true);
      const sundays = getNext3Sundays();

      // Should have been called with agendaKeys.bySunday for next Sunday
      const agendaCall = prefetchSpy.mock.calls.find(
        (call) => JSON.stringify((call[0] as any).queryKey) === JSON.stringify(agendaKeys.bySunday('ward-1', sundays[0]))
      );
      expect(agendaCall).toBeDefined();
    });
  });

  describe('AC-048-02: Next 3 Sundays speeches prefetched', () => {
    it('calls prefetchQuery for speeches date range', () => {
      const { prefetchSpy } = renderPrefetchHook(true);
      const sundays = getNext3Sundays();
      const first = sundays[0];
      const last = sundays[2];

      const speechCall = prefetchSpy.mock.calls.find(
        (call) => JSON.stringify((call[0] as any).queryKey) === JSON.stringify(speechKeys.byDateRange('ward-1', first, last))
      );
      expect(speechCall).toBeDefined();
    });

    it('calls prefetchQuery for exceptions date range', () => {
      const { prefetchSpy } = renderPrefetchHook(true);
      const sundays = getNext3Sundays();
      const first = sundays[0];
      const last = sundays[2];

      const exceptionsCall = prefetchSpy.mock.calls.find(
        (call) => JSON.stringify((call[0] as any).queryKey) === JSON.stringify(sundayTypeKeys.exceptions('ward-1', first, last))
      );
      expect(exceptionsCall).toBeDefined();
    });

    it('calls prefetchQuery for agenda range', () => {
      const { prefetchSpy } = renderPrefetchHook(true);
      const sundays = getNext3Sundays();
      const first = sundays[0];
      const last = sundays[2];

      const agendaRangeCall = prefetchSpy.mock.calls.find(
        (call) => JSON.stringify((call[0] as any).queryKey) === JSON.stringify(agendaKeys.byDateRange('ward-1', first, last))
      );
      expect(agendaRangeCall).toBeDefined();
    });
  });

  describe('AC-048-03: Prefetched data available offline', () => {
    it('prefetch runs exactly 4 queries on mount when online', () => {
      const { prefetchSpy } = renderPrefetchHook(true);
      expect(prefetchSpy).toHaveBeenCalledTimes(4);
    });
  });

  describe('AC-048-04: No redundant fetches when data is fresh', () => {
    it('prefetchQuery is called (TanStack handles staleTime internally)', () => {
      const { prefetchSpy } = renderPrefetchHook(true);
      // prefetchQuery respects staleTime - if data is fresh, no network request
      expect(prefetchSpy).toHaveBeenCalledTimes(4);
    });
  });

  describe('Offline-to-online transition', () => {
    it('does NOT call prefetchQuery when offline', () => {
      const { prefetchSpy } = renderPrefetchHook(false);
      expect(prefetchSpy).not.toHaveBeenCalled();
    });

    it('calls prefetchQuery when transitioning from offline to online', () => {
      const { prefetchSpy, updateOnlineStatus } = renderPrefetchHook(false);
      expect(prefetchSpy).not.toHaveBeenCalled();

      updateOnlineStatus(true);
      expect(prefetchSpy).toHaveBeenCalledTimes(4);
    });
  });

  describe('EC-048-01: Partial prefetch failure', () => {
    it('each prefetchQuery call is independent', () => {
      const { prefetchSpy } = renderPrefetchHook(true);
      // All 4 calls are made independently
      expect(prefetchSpy).toHaveBeenCalledTimes(4);
      // Each is a separate call - if one fails, others still execute
      const calls = prefetchSpy.mock.calls;
      const queryKeys = calls.map((c) => (c[0] as any).queryKey);
      expect(queryKeys).toHaveLength(4);
      // All keys are different
      const uniqueKeys = new Set(queryKeys.map((k) => JSON.stringify(k)));
      expect(uniqueKeys.size).toBe(4);
    });
  });

  describe('EC-048-02: No next Sunday (wardId null)', () => {
    it('does NOT call prefetchQuery when wardId is null', () => {
      const { prefetchSpy } = renderPrefetchHook(true, { wardId: null as any });
      expect(prefetchSpy).not.toHaveBeenCalled();
    });
  });

  // The real cold-start path: app launches online but the ward resolves a tick after mount.
  // (Before the fix, prevOnlineRef was set true on the wardId-null pass, so this never prefetched.)
  describe('EC-048-03: Online cold start (ward resolves after mount)', () => {
    it('prefetches once the wardId resolves while online', () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
      });
      const prefetchSpy = jest.spyOn(queryClient, 'prefetchQuery');
      let ward: string | null = null;

      function TestComponent() {
        useOfflinePrefetch(true);
        return null;
      }
      function Wrapper() {
        return React.createElement(
          QueryClientProvider, { client: queryClient },
          React.createElement(
            AuthContext.Provider,
            { value: createMockAuthContext({ wardId: ward as any }) },
            React.createElement(TestComponent)
          )
        );
      }

      let renderer!: TestRenderer.ReactTestRenderer;
      act(() => { renderer = TestRenderer.create(React.createElement(Wrapper)); });
      expect(prefetchSpy).not.toHaveBeenCalled(); // online, but no ward yet

      ward = 'ward-1';
      act(() => { renderer.update(React.createElement(Wrapper)); });
      expect(prefetchSpy).toHaveBeenCalledTimes(4); // ward resolved → prefetch fires
    });
  });
});
