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

import { AuthProvider } from '../contexts/AuthContext';

beforeEach(() => {
  mockAuthHandler.fn = null;
});

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
