/**
 * Behavioral test for the sign-out cache-clear fix (P2): when auth fires SIGNED_OUT (explicit
 * logout, self-delete, or a server-revoked session), AuthProvider must clear the React Query cache
 * so the next user on the device can't see the prior user's cached data.
 *
 * `react-native` is aliased to a test stub (vitest.config.ts).
 */
import React from 'react';
import TestRenderer from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { act } = TestRenderer;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Capture the onAuthStateChange handler so the test can fire SIGNED_OUT.
const mockAuthHandler = { fn: null as null | ((event: string, session: unknown) => void) };

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
        mockAuthHandler.fn = cb;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      },
    },
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider } from '../contexts/AuthContext';
import { enqueue, getQueueSize, incrementRetry, getDeadLetterCount } from '../lib/offlineQueue';
import { CACHE_STORAGE_KEY } from '../lib/queryConfig';

beforeEach(async () => {
  mockAuthHandler.fn = null;
  await AsyncStorage.clear();
});

function renderAuth(queryClient: QueryClient) {
  act(() => {
    TestRenderer.create(
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(AuthProvider, null, null)
      )
    );
  });
}

describe('AuthProvider clears query cache on sign-out (P2)', () => {
  it('drops cached queries when SIGNED_OUT fires', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['members', 'w1'], [{ id: 'stale' }]);

    act(() => {
      TestRenderer.create(
        React.createElement(
          QueryClientProvider,
          { client: queryClient },
          React.createElement(AuthProvider, null, null)
        )
      );
    });

    // Sanity: the cache holds the prior user's data before sign-out.
    expect(queryClient.getQueryData(['members', 'w1'])).toEqual([{ id: 'stale' }]);
    expect(mockAuthHandler.fn).toBeTruthy();

    await act(async () => {
      mockAuthHandler.fn!('SIGNED_OUT', null);
    });

    expect(queryClient.getQueryData(['members', 'w1'])).toBeUndefined();
  });

  it('does NOT clear the cache on a token refresh', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['members', 'w1'], [{ id: 'keep' }]);

    act(() => {
      TestRenderer.create(
        React.createElement(
          QueryClientProvider,
          { client: queryClient },
          React.createElement(AuthProvider, null, null)
        )
      );
    });

    await act(async () => {
      mockAuthHandler.fn!('TOKEN_REFRESHED', null);
    });

    expect(queryClient.getQueryData(['members', 'w1'])).toEqual([{ id: 'keep' }]);
  });
});

describe('AuthProvider clears the offline queue on sign-out (EST-05)', () => {
  it("drops the pending queue, the dead-letter list and the persisted query cache of the user who left", async () => {
    // The leaving user has: one edit dead-lettered after exhausting retries, one edit still
    // pending, and a persisted query cache on disk. None of it may survive into the next
    // session — the pending write would otherwise replay under the next user's credentials.
    await enqueue({
      id: 'dead1', table: 'speeches', operation: 'UPDATE',
      data: { id: 'sp0', topic_title: 'Old' }, timestamp: 1,
    });
    await incrementRetry();
    await incrementRetry();
    await incrementRetry();
    await enqueue({
      id: 'pend1', table: 'speeches', operation: 'UPDATE',
      data: { id: 'sp1', topic_title: 'Faith' }, timestamp: 2,
    });
    await AsyncStorage.setItem(CACHE_STORAGE_KEY, '{"clientState":"prior-user"}');
    expect(await getQueueSize()).toBe(1);
    expect(await getDeadLetterCount()).toBe(1);

    renderAuth(new QueryClient());
    await act(async () => {
      mockAuthHandler.fn!('SIGNED_OUT', null);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(await getQueueSize()).toBe(0);
    expect(await getDeadLetterCount()).toBe(0);
    expect(await AsyncStorage.getItem(CACHE_STORAGE_KEY)).toBeNull();
  });

  it('keeps the queue intact on a token refresh', async () => {
    await enqueue({
      id: 'pend1', table: 'speeches', operation: 'UPDATE',
      data: { id: 'sp1', topic_title: 'Faith' }, timestamp: 2,
    });

    renderAuth(new QueryClient());
    await act(async () => {
      mockAuthHandler.fn!('TOKEN_REFRESHED', null);
      await Promise.resolve();
    });

    expect(await getQueueSize()).toBe(1);
  });
});
