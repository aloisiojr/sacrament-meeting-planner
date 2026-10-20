/**
 * CONF-11: useDeleteMember logs member:delete only when the write lands.
 * Offline (queued, null) it must not log; the queue processor logs on replay
 * (covered in offline-queue-processor.test.tsx).
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockLogAction = jest.fn();
let mockDeleteError: Error | null = null;

jest.mock('../lib/activityLog', () => ({
  logAction: (...a: unknown[]) => mockLogAction(...a),
  buildLogDescription: (t: string, p: Record<string, string>) => `${t}|nome=${p.nome}`,
}));
jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ wardId: 'w1', user: { id: 'u1', email: 'a@b.c' }, userName: 'Me', role: 'bishopric' }),
}));
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      delete: () => ({
        eq: () =>
          mockDeleteError ? Promise.reject(mockDeleteError) : Promise.resolve({ error: null }),
      }),
    }),
  },
}));

import { useDeleteMember } from '../hooks/useMembers';
import { readQueue } from '../lib/offlineQueue';

type Mutate = (v: { memberId: string; memberName: string }) => void;
const mutateRef: { current: Mutate | null } = { current: null };

function Harness() {
  const m = useDeleteMember();
  React.useEffect(() => {
    mutateRef.current = m.mutate as Mutate;
  }, [m.mutate]);
  return <Text>ready</Text>;
}

async function runDelete() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  await render(
    <QueryClientProvider client={client}>
      <Harness />
    </QueryClientProvider>
  );
  await act(async () => {
    mutateRef.current?.({ memberId: 'm1', memberName: 'Ana' });
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  client.clear();
}

beforeEach(async () => {
  mockLogAction.mockReset();
  mockDeleteError = null;
  mutateRef.current = null;
  await AsyncStorage.clear();
});

describe('useDeleteMember logging (CONF-11)', () => {
  it('logs once when the delete lands online', async () => {
    await runDelete();
    expect(mockLogAction).toHaveBeenCalledTimes(1);
    expect(mockLogAction).toHaveBeenCalledWith(
      'w1', 'u1', 'a@b.c', 'member:delete', 'member:delete|nome=Ana', 'Me'
    );
    expect(await readQueue()).toHaveLength(0);
  });

  it('does not log when the delete is only queued offline; the intent travels with the queue', async () => {
    mockDeleteError = new Error('Network request failed');
    await runDelete();
    expect(mockLogAction).not.toHaveBeenCalled();
    const queue = await readQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      table: 'members',
      operation: 'DELETE',
      logIntent: { actionType: 'member:delete', description: 'member:delete|nome=Ana' },
    });
  });
});
