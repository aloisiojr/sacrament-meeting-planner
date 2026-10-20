/**
 * EST-26 — sign-out limpa o MESMO QueryClient singleton de `lib/queryClient`
 * (o que o `_layout` passa ao provider). Se o AuthProvider recebesse outro
 * cliente, o dado abaixo sobreviveria ao SIGNED_OUT.
 */
import React from 'react';
import TestRenderer from 'react-test-renderer';
import { QueryClientProvider } from '@tanstack/react-query';

const { act } = TestRenderer;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
    from: () => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
    }),
  },
}));

import { AuthProvider } from '../contexts/AuthContext';
import { queryClient } from '../lib/queryClient';

beforeEach(() => {
  mockAuthHandler.fn = null;
  queryClient.clear();
});

describe('QueryClient singleton (EST-26)', () => {
  it('sign-out limpa o singleton importado de lib/queryClient', async () => {
    queryClient.setQueryData(['members', 'w1'], [{ id: 'stale' }]);
    expect(queryClient.getQueryData(['members', 'w1'])).toEqual([{ id: 'stale' }]);

    act(() => {
      TestRenderer.create(
        React.createElement(
          QueryClientProvider,
          { client: queryClient },
          React.createElement(AuthProvider, null, null)
        )
      );
    });
    expect(mockAuthHandler.fn).toBeTruthy();

    await act(async () => {
      mockAuthHandler.fn!('SIGNED_OUT', null);
    });

    expect(queryClient.getQueryData(['members', 'w1'])).toBeUndefined();
  });
});
