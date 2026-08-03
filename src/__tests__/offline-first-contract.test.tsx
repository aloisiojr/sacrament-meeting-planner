/**
 * The offline-first contract, asserted against the APP rather than against the queue module.
 *
 * CLAUDE.md states: "Mutations must survive offline." lib/offlineQueue implements a durable FIFO
 * queue and useOfflineQueueProcessor implements the replay — both work, and both are covered by
 * their own suites. What used to be missing was the wiring between them: nothing ever put a
 * mutation INTO the queue, so `enqueue(` appeared exactly once across src/ and supabase/ — its own
 * definition — and every offline edit was lost.
 *
 * lib/offlineMutation now supplies that wiring. This test is the end-to-end guard on it: it drives
 * a real screen-level hook, not the queue module, so removing the wiring from the hook fails here
 * even though offline-mutation.test.ts would stay green.
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/** Stands in for no connectivity: every request rejects the way fetch does when offline. */
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: () => {
      const fail = () => Promise.reject(new TypeError('Network request failed'));
      const chain: Record<string, unknown> = {};
      for (const m of ['update', 'insert', 'delete', 'eq', 'select', 'single']) {
        chain[m] = () => chain;
      }
      chain.then = (...args: unknown[]) =>
        (fail() as Promise<never>).then(...(args as [never, never]));
      return chain;
    },
  },
}));

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ wardId: 'w1', role: 'bishopric', hasPermission: () => true }),
}));

import { useUpdateAgenda } from '../hooks/useAgenda';
import { readQueue } from '../lib/offlineQueue';

type Mutate = (args: { agendaId: string; fields: Record<string, unknown> }) => void;

/** How the test gets a handle on the hook's mutate function. */
const mutateRef: { current: Mutate | null } = { current: null };

function Harness() {
  const m = useUpdateAgenda();
  // Published from an effect, not during render: writing to module state while rendering is what
  // react-hooks/immutability forbids, and the effect has run by the time render() resolves.
  React.useEffect(() => {
    mutateRef.current = m.mutate as Mutate;
  }, [m.mutate]);
  return <Text testID="harness">ready</Text>;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  mutateRef.current = null;
});

describe('offline-first contract', () => {
  it('an agenda edit made with no connectivity is persisted for replay', async () => {
    const client = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    });

    await render(
      <QueryClientProvider client={client}>
        <Harness />
      </QueryClientProvider>
    );

    // Perform a normal edit. The request fails because the device is offline.
    await act(async () => {
      mutateRef.current?.({ agendaId: 'ag1', fields: { presiding_name: 'Bishop Silva' } });
    });
    // Let react-query settle the rejected mutation before reading the queue.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    // The promise the app made: the edit is not lost, it waits for reconnection.
    const queue = await readQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      table: 'sunday_agendas',
      operation: 'UPDATE',
      data: expect.objectContaining({ id: 'ag1', presiding_name: 'Bishop Silva' }),
    });

    client.clear();
  });
});
