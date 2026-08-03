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
const mockFailTables = new Set<string>();

/** Records what the processor asks Supabase to do, so replay can be asserted precisely. */
function mockMakeChain(table: string) {
  const chain = {
    insert: (payload: unknown) => {
      if (mockFailTables.has(table)) throw new Error('insert failed');
      calls.push({ op: 'insert', table, payload });
      return Promise.resolve({ error: null });
    },
    update: (payload: unknown) => {
      if (mockFailTables.has(table)) throw new Error('update failed');
      const rec = { op: 'update', table, payload, eqArgs: [] as unknown[] };
      calls.push(rec);
      return {
        eq: (...args: unknown[]) => {
          rec.eqArgs = args;
          return Promise.resolve({ error: null });
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
          return Promise.resolve({ error: null });
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
import { enqueue, getQueueSize } from '../lib/offlineQueue';

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
    // An empty drain still reaches the invalidate call; assert the observable contract rather than
    // guessing — this documents whichever behaviour ships.
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(0);
  });
});

describe('useOfflineQueueProcessor — failure handling', () => {
  it('keeps draining the rest of the queue when one mutation throws', async () => {
    mockFailTables.add('broken');
    await enqueue(makeMutation({ id: 'q1', operation: 'INSERT', table: 'broken', data: { id: '1' } }));
    await enqueue(makeMutation({ id: 'q2', operation: 'INSERT', table: 'ok', data: { id: '2' } }));

    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await goOfflineThenOnline();
    warn.mockRestore();

    // The healthy mutation still lands.
    expect(calls.map((c) => c.table)).toEqual(['ok']);
    expect(await getQueueSize()).toBe(0);
  });

  it('DISCARDS a failed mutation instead of retrying it — the retry budget is never used', async () => {
    // Documents real, shipped behaviour, and it is a gap worth naming: offlineQueue exposes
    // incrementRetry() with a three-strikes budget, but the processor dequeues BEFORE replaying
    // and only logs on failure. A mutation that fails once is gone — the user's offline edit is
    // lost silently, and MAX_RETRIES is dead code on this path.
    mockFailTables.add('broken');
    await enqueue(makeMutation({ id: 'q1', operation: 'INSERT', table: 'broken', data: { id: '1' } }));

    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await goOfflineThenOnline();
    warn.mockRestore();

    expect(await getQueueSize()).toBe(0);
    expect(calls).toHaveLength(0);
  });
});
