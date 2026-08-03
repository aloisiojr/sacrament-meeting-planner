/**
 * Replay tests for useOfflineQueueProcessor — the hook that drains the offline queue on reconnect.
 * It was at 0% coverage: never executed by any test.
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const calls: { op: string; table: string; payload?: unknown; eqArgs?: unknown[] }[] = [];
const mockInvalidateQueries = jest.fn();
/** Tables whose writes REJECT — a transport failure. */
const mockFailTables = new Set<string>();
/**
 * Tables whose writes RESOLVE with `{ error }` — how supabase-js v2 actually reports an RLS
 * denial, a foreign-key violation or a duplicate key. It does not throw. Modelling only the
 * throwing mode is what let the original defect hide.
 */
const mockErrorTables = new Set<string>();

/** Records what the processor asks Supabase to do, so replay can be asserted precisely. */
function mockMakeChain(table: string) {
  const result = () =>
    mockErrorTables.has(table)
      ? Promise.resolve({ error: { message: 'new row violates row-level security policy' } })
      : Promise.resolve({ error: null });

  const chain = {
    insert: (payload: unknown) => {
      if (mockFailTables.has(table)) throw new Error('insert failed');
      calls.push({ op: 'insert', table, payload });
      return result();
    },
    update: (payload: unknown) => {
      if (mockFailTables.has(table)) throw new Error('update failed');
      const rec = { op: 'update', table, payload, eqArgs: [] as unknown[] };
      calls.push(rec);
      return {
        eq: (...args: unknown[]) => {
          rec.eqArgs = args;
          return result();
        },
      };
    },
    delete: () => {
      if (mockFailTables.has(table)) throw new Error('delete failed');
      const rec = { op: 'delete', table, eqArgs: [] as unknown[] };
      calls.push(rec);
      return {
        eq: (...args: unknown[]) => {
          rec.eqArgs = args;
          return result();
        },
      };
    },
  };
  return chain;
}

jest.mock('../lib/supabase', () => ({
  supabase: { from: (table: string) => mockMakeChain(table) },
}));

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    get invalidateQueries() {
      return mockInvalidateQueries;
    },
  }),
}));

import { useOfflineQueueProcessor } from '../hooks/useOfflineQueueProcessor';
import { enqueue, getQueueSize, peek } from '../lib/offlineQueue';

function Harness({ isOnline }: { isOnline: boolean }) {
  useOfflineQueueProcessor(isOnline);
  return <Text testID="harness">{String(isOnline)}</Text>;
}

/** Mount offline, then flip online — the only transition that triggers a drain. */
async function goOfflineThenOnline() {
  const view = await render(<Harness isOnline={false} />);
  await act(async () => {
    await view.rerender(<Harness isOnline />);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
  return view;
}

function makeMutation(over: Record<string, unknown> = {}) {
  return {
    id: 'q1',
    table: 'speeches',
    operation: 'UPDATE' as const,
    data: { id: 'sp1', topic_title: 'Faith' },
    timestamp: 1,
    ...over,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  calls.length = 0;
  mockInvalidateQueries.mockReset();
  mockFailTables.clear();
  mockErrorTables.clear();
});

describe('useOfflineQueueProcessor — when it runs', () => {
  it('does nothing while offline', async () => {
    await enqueue(makeMutation());
    await render(<Harness isOnline={false} />);
    await act(async () => {
      await Promise.resolve();
    });

    expect(calls).toHaveLength(0);
    expect(await getQueueSize()).toBe(1);
  });

  it('does nothing when it mounts already online (no offline->online transition)', async () => {
    await enqueue(makeMutation());
    await render(<Harness isOnline />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // The queue is only drained on a reconnect, not on a cold start.
    expect(calls).toHaveLength(0);
    expect(await getQueueSize()).toBe(1);
  });

  it('drains on the offline -> online transition', async () => {
    await enqueue(makeMutation());
    await goOfflineThenOnline();

    expect(calls).toHaveLength(1);
    expect(await getQueueSize()).toBe(0);
  });
});

describe('useOfflineQueueProcessor — replay fidelity', () => {
  it('replays an INSERT with the full payload', async () => {
    await enqueue(
      makeMutation({ operation: 'INSERT', table: 'members', data: { id: 'm1', full_name: 'Ana' } })
    );
    await goOfflineThenOnline();

    expect(calls[0]).toMatchObject({
      op: 'insert',
      table: 'members',
      payload: { id: 'm1', full_name: 'Ana' },
    });
  });

  it('replays an UPDATE with id stripped from the payload and used as the filter', async () => {
    await enqueue(
      makeMutation({ operation: 'UPDATE', table: 'speeches', data: { id: 'sp9', topic_title: 'Hope' } })
    );
    await goOfflineThenOnline();

    expect(calls[0].op).toBe('update');
    // id must NOT be written back as a column...
    expect(calls[0].payload).toEqual({ topic_title: 'Hope' });
    // ...it must scope the update instead.
    expect(calls[0].eqArgs).toEqual(['id', 'sp9']);
  });

  it('replays a DELETE scoped by id', async () => {
    await enqueue(makeMutation({ operation: 'DELETE', table: 'members', data: { id: 'm7' } }));
    await goOfflineThenOnline();

    expect(calls[0].op).toBe('delete');
    expect(calls[0].eqArgs).toEqual(['id', 'm7']);
  });

  it('replays several queued mutations in FIFO order', async () => {
    await enqueue(makeMutation({ id: 'q1', operation: 'INSERT', table: 'a', data: { id: '1' } }));
    await enqueue(makeMutation({ id: 'q2', operation: 'INSERT', table: 'b', data: { id: '2' } }));
    await enqueue(makeMutation({ id: 'q3', operation: 'INSERT', table: 'c', data: { id: '3' } }));

    await goOfflineThenOnline();

    expect(calls.map((c) => c.table)).toEqual(['a', 'b', 'c']);
    expect(await getQueueSize()).toBe(0);
  });

  it('refreshes the cache once after draining, not per mutation', async () => {
    await enqueue(makeMutation({ id: 'q1', operation: 'INSERT', table: 'a', data: { id: '1' } }));
    await enqueue(makeMutation({ id: 'q2', operation: 'INSERT', table: 'b', data: { id: '2' } }));

    await goOfflineThenOnline();

    expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
  });

  it('does not invalidate when there was nothing queued', async () => {
    await goOfflineThenOnline();
    // A reconnect with an empty queue changed no server state, so refetching everything would be
    // pure waste — and on a just-restored connection it is the most expensive moment to do it.
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
    expect(calls).toHaveLength(0);
  });
});

describe('useOfflineQueueProcessor — failure handling', () => {
  /** Reconnect n times; each one triggers one drain attempt. */
  async function reconnectTimes(n: number) {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    for (let i = 0; i < n; i++) {
      await goOfflineThenOnline();
    }
    warn.mockRestore();
  }

  it('stops the drain at a failing entry instead of replaying past it out of order', async () => {
    // FIFO is the whole point of the queue: q2 may depend on q1. Skipping ahead would apply the
    // dependent write against a state its author never saw.
    mockFailTables.add('broken');
    await enqueue(makeMutation({ id: 'q1', operation: 'INSERT', table: 'broken', data: { id: '1' } }));
    await enqueue(makeMutation({ id: 'q2', operation: 'INSERT', table: 'ok', data: { id: '2' } }));

    await reconnectTimes(1);

    expect(calls).toHaveLength(0);
    // Both entries survive: nothing reached the server, so nothing may be discarded.
    expect(await getQueueSize()).toBe(2);
    expect((await peek())?.retryCount).toBe(1);
  });

  it('retries a failed mutation instead of dropping it on the first failure', async () => {
    mockFailTables.add('broken');
    await enqueue(makeMutation({ id: 'q1', operation: 'INSERT', table: 'broken', data: { id: '1' } }));

    await reconnectTimes(1);

    // The entry must survive with its retry counter advanced, not vanish.
    expect(await getQueueSize()).toBe(1);
    expect((await peek())?.retryCount).toBe(1);
  });

  it('treats a resolved { error } as a failure, not a success', async () => {
    // supabase-js v2 reports an RLS denial by RESOLVING with `{ error }`. The processor used to
    // ignore that object entirely, so a rejected write was dequeued as if it had been accepted and
    // the user's edit was lost with no trace.
    mockErrorTables.add('speeches');
    await enqueue(makeMutation({ id: 'q1', operation: 'UPDATE', table: 'speeches' }));

    await reconnectTimes(1);

    expect(calls).toHaveLength(1); // it was attempted...
    expect(await getQueueSize()).toBe(1); // ...and kept, because the server refused it
    expect((await peek())?.retryCount).toBe(1);
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });

  it('drops a permanently failing entry after the retry budget and then unblocks the queue', async () => {
    // The stop-at-failure rule must not let one poison entry wedge the queue forever.
    mockFailTables.add('broken');
    await enqueue(makeMutation({ id: 'q1', operation: 'INSERT', table: 'broken', data: { id: '1' } }));
    await enqueue(makeMutation({ id: 'q2', operation: 'INSERT', table: 'ok', data: { id: '2' } }));

    await reconnectTimes(3); // MAX_RETRIES

    // q1 is gone; q2 was never touched while q1 was ahead of it.
    expect(await getQueueSize()).toBe(1);
    expect((await peek())?.id).toBe('q2');
    expect(calls).toHaveLength(0);

    await reconnectTimes(1);

    // With the poison cleared, the healthy mutation finally lands.
    expect(calls.map((c) => c.table)).toEqual(['ok']);
    expect(await getQueueSize()).toBe(0);
  });
});
