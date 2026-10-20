/**
 * Replay tests for useOfflineQueueProcessor — the hook that drains the offline queue on reconnect.
 * It was at 0% coverage: never executed by any test.
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const calls: { op: string; table: string; payload?: unknown; eqArgs?: unknown[]; opts?: unknown }[] = [];
const mockInvalidateQueries = jest.fn();
/** Health events the processor reports (dead-letter visibility beyond the device, EST-04). */
const mockHealthEvents: unknown[][] = [];
/** Tables whose writes REJECT — a transport failure. */
const mockFailTables = new Set<string>();
/**
 * Tables whose writes RESOLVE with `{ error }` — how supabase-js v2 actually reports an RLS
 * denial, a foreign-key violation or a duplicate key. It does not throw. Modelling only the
 * throwing mode is what let the original defect hide.
 */
const mockErrorTables = new Set<string>();
/** Tables whose writes resolve with a 401 auth error (expired session, EST-17). */
const mockAuthTables = new Set<string>();

/** Records what the processor asks Supabase to do, so replay can be asserted precisely. */
function mockMakeChain(table: string) {
  const result = () => {
    if (mockAuthTables.has(table)) {
      return Promise.resolve({
        error: { message: 'JWT expired', code: 'PGRST301', status: 401 },
      });
    }
    return mockErrorTables.has(table)
      ? Promise.resolve({ error: { message: 'new row violates row-level security policy' } })
      : Promise.resolve({ error: null });
  };

  const chain = {
    insert: (payload: unknown) => {
      if (mockFailTables.has(table)) throw new Error('insert failed');
      calls.push({ op: 'insert', table, payload });
      return result();
    },
    upsert: (payload: unknown, opts?: unknown) => {
      if (mockFailTables.has(table)) throw new Error('upsert failed');
      calls.push({ op: 'upsert', table, payload, opts });
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

jest.mock('../lib/appHealth', () => ({
  reportHealthEvent: (...args: unknown[]) => {
    mockHealthEvents.push(args);
    return Promise.resolve();
  },
}));

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    get invalidateQueries() {
      return mockInvalidateQueries;
    },
  }),
}));

import { useOfflineQueueProcessor } from '../hooks/useOfflineQueueProcessor';
import { enqueue, getQueueSize, peek, readDeadLetter } from '../lib/offlineQueue';

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
  mockHealthEvents.length = 0;
  mockFailTables.clear();
  mockErrorTables.clear();
  mockAuthTables.clear();
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

  it('drains leftover entries when it mounts already online (cold start, EST-04)', async () => {
    // Entries left by a previous session (app killed while offline) must not wait for the next
    // network flap: the first online mount drains them.
    await enqueue(makeMutation());
    await render(<Harness isOnline />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(calls).toHaveLength(1);
    expect(await getQueueSize()).toBe(0);
  });

  it('drains on the offline -> online transition', async () => {
    await enqueue(makeMutation());
    await goOfflineThenOnline();

    expect(calls).toHaveLength(1);
    expect(await getQueueSize()).toBe(0);
  });
});

describe('useOfflineQueueProcessor — replay fidelity', () => {
  it('replays an INSERT as an upsert on the client-assigned id, with the full payload (EST-04)', async () => {
    // If the original insert actually landed before the connection dropped, upserting on the
    // client id updates that row instead of duplicating it or hitting a UNIQUE violation.
    await enqueue(
      makeMutation({ operation: 'INSERT', table: 'members', data: { id: 'm1', full_name: 'Ana' } })
    );
    await goOfflineThenOnline();

    expect(calls[0]).toMatchObject({
      op: 'upsert',
      table: 'members',
      payload: { id: 'm1', full_name: 'Ana' },
      opts: { onConflict: 'id' },
    });
  });

  it('replays a UPSERT on its recorded conflict target (agenda by date)', async () => {
    await enqueue(
      makeMutation({
        operation: 'UPSERT',
        table: 'sunday_agendas',
        onConflict: 'ward_id,sunday_date',
        data: { ward_id: 'w1', sunday_date: '2026-08-02', has_second_speech: false },
      })
    );
    await goOfflineThenOnline();

    expect(calls[0]).toMatchObject({
      op: 'upsert',
      table: 'sunday_agendas',
      payload: { ward_id: 'w1', sunday_date: '2026-08-02', has_second_speech: false },
      opts: { onConflict: 'ward_id,sunday_date' },
    });
    expect(await getQueueSize()).toBe(0);
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

  it('dead-letters a permanently failing entry after the retry budget and drains past it in the same pass (EST-04)', async () => {
    // The stop-at-failure rule must not let one poison entry wedge the queue forever — and the
    // poisoned edit must not vanish either: it lands in the persisted dead-letter list.
    mockFailTables.add('broken');
    await enqueue(makeMutation({ id: 'q1', operation: 'INSERT', table: 'broken', data: { id: '1' } }));
    await enqueue(makeMutation({ id: 'q2', operation: 'INSERT', table: 'ok', data: { id: '2' } }));

    await reconnectTimes(3); // MAX_RETRIES

    // On the drain that exhausts q1's budget, q1 moves to the dead-letter list and the SAME
    // drain continues: q2 lands without waiting for another reconnect.
    expect(await getQueueSize()).toBe(0);
    expect(calls.map((c) => c.table)).toEqual(['ok']);

    const dead = await readDeadLetter();
    expect(dead).toHaveLength(1);
    expect(dead[0]).toMatchObject({ id: 'q1', table: 'broken', retryCount: 3 });
    expect(typeof dead[0].failedAt).toBe('number');

    // And it is registered server-side (counts only — never the member payload).
    expect(mockHealthEvents).toContainEqual([null, 'offline_dead_letter', { retries: 3 }]);
  });

  it('does NOT spend a retry on a 401: an expired session pauses the drain (EST-17)', async () => {
    // A 401 is not the entry's fault — the session is gone. Burning the retry budget would
    // dead-letter perfectly good edits just because the user needs to sign in again.
    mockAuthTables.add('speeches');
    await enqueue(makeMutation({ id: 'q1', operation: 'UPDATE', table: 'speeches' }));
    await enqueue(makeMutation({ id: 'q2', operation: 'INSERT', table: 'ok', data: { id: '2' } }));

    await reconnectTimes(3); // would exhaust MAX_RETRIES if 401 spent budget

    expect(await getQueueSize()).toBe(2);
    expect((await peek())?.retryCount).toBe(0);
    expect(await readDeadLetter()).toHaveLength(0);
    // The drain paused at q1: q2 was never attempted out of order.
    expect(calls.map((c) => c.table)).not.toContain('ok');
    expect(mockHealthEvents).toContainEqual([null, 'offline_queue_paused_auth', {}]);
  });
});
