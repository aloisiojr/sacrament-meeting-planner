/**
 * Persistence tests for lib/offlineQueue.
 *
 * The audit found this module scoring high on line coverage while its real work was untested:
 * offline-utils.test.ts only exercises four pure predicates, and the integration test that touched
 * the persistence functions supplied its own fixtures. `incrementRetry()` — the three-strikes rule
 * that decides whether a user's offline edit is silently discarded — was executed by no test at
 * all.
 *
 * These run against the official AsyncStorage jest mock, so they exercise real serialisation.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  enqueue,
  dequeue,
  peek,
  readQueue,
  getQueueSize,
  clearQueue,
  incrementRetry,
  readDeadLetter,
  getDeadLetterCount,
  readQuarantine,
  onDeadLetterChange,
  getMaxQueueSize,
  getMaxRetries,
  type QueuedMutation,
} from '../lib/offlineQueue';

const QUEUE_KEY = '@offline_mutation_queue';

function makeMutation(over: Partial<Omit<QueuedMutation, 'retryCount'>> = {}) {
  return {
    id: 'm1',
    table: 'speeches',
    operation: 'UPDATE' as const,
    data: { id: 'sp1', topic_title: 'Faith' },
    timestamp: 1,
    ...over,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('offlineQueue — FIFO', () => {
  it('starts empty', async () => {
    expect(await readQueue()).toEqual([]);
    expect(await getQueueSize()).toBe(0);
    expect(await peek()).toBeNull();
    expect(await dequeue()).toBeNull();
  });

  it('enqueues with retryCount seeded to 0', async () => {
    expect(await enqueue(makeMutation())).toBe(true);
    const [entry] = await readQueue();
    expect(entry).toMatchObject({ id: 'm1', table: 'speeches', retryCount: 0 });
  });

  it('dequeues in insertion order, not reverse', async () => {
    await enqueue(makeMutation({ id: 'a' }));
    await enqueue(makeMutation({ id: 'b' }));
    await enqueue(makeMutation({ id: 'c' }));

    expect((await dequeue())?.id).toBe('a');
    expect((await dequeue())?.id).toBe('b');
    expect((await dequeue())?.id).toBe('c');
    expect(await dequeue()).toBeNull();
  });

  it('peek returns the head without consuming it', async () => {
    await enqueue(makeMutation({ id: 'a' }));
    expect((await peek())?.id).toBe('a');
    expect(await getQueueSize()).toBe(1);
  });

  it('survives a round trip through storage (real serialisation)', async () => {
    await enqueue(makeMutation({ data: { id: 'sp1', nested: { deep: true }, n: 42 } }));
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    expect(typeof raw).toBe('string');

    const [entry] = await readQueue();
    expect(entry.data).toEqual({ id: 'sp1', nested: { deep: true }, n: 42 });
  });

  it('clearQueue empties it', async () => {
    await enqueue(makeMutation());
    await clearQueue();
    expect(await getQueueSize()).toBe(0);
  });
});

describe('offlineQueue — capacity', () => {
  it('accepts entries up to the maximum', async () => {
    const max = getMaxQueueSize();
    for (let i = 0; i < max; i++) {
      expect(await enqueue(makeMutation({ id: `m${i}` }))).toBe(true);
    }
    expect(await getQueueSize()).toBe(max);
  });

  it('rejects the overflow entry and leaves the existing queue intact', async () => {
    const max = getMaxQueueSize();
    for (let i = 0; i < max; i++) {
      await enqueue(makeMutation({ id: `m${i}` }));
    }

    expect(await enqueue(makeMutation({ id: 'overflow' }))).toBe(false);
    expect(await getQueueSize()).toBe(max);
    // The head must still be the first thing the user did, not the rejected one.
    expect((await peek())?.id).toBe('m0');
  });
});

describe('offlineQueue — retry exhaustion (three strikes then dead-letter, EST-04)', () => {
  it('reports "keep retrying" while under the limit and leaves the entry in place', async () => {
    await enqueue(makeMutation({ id: 'a' }));

    expect(await incrementRetry()).toBe(true);
    expect((await peek())?.retryCount).toBe(1);
    expect(await getQueueSize()).toBe(1);
  });

  it('moves the entry to the persisted dead-letter list on the attempt that reaches the limit', async () => {
    await enqueue(makeMutation({ id: 'a' }));
    await enqueue(makeMutation({ id: 'b' }));

    const max = getMaxRetries();
    let result = true;
    for (let i = 0; i < max; i++) {
      result = await incrementRetry();
    }

    // The last call returns false and removes the head from the queue — but the edit is NOT
    // lost: it sits in the dead-letter list, countable, until sign-out clears it.
    expect(result).toBe(false);
    expect(await getQueueSize()).toBe(1);
    expect((await peek())?.id).toBe('b');

    expect(await getDeadLetterCount()).toBe(1);
    const dead = await readDeadLetter();
    expect(dead[0]).toMatchObject({ id: 'a', table: 'speeches', retryCount: max });
    expect(typeof dead[0].failedAt).toBe('number');
    // Persisted, not in-memory: the raw key holds it across a cold start.
    expect(await AsyncStorage.getItem('@offline_mutation_dead_letter')).toContain('"a"');
  });

  it('notifies dead-letter listeners when an entry lands and when the list is cleared', async () => {
    const seen: number[] = [];
    const unsubscribe = onDeadLetterChange((n) => seen.push(n));

    await enqueue(makeMutation({ id: 'a' }));
    for (let i = 0; i < getMaxRetries(); i++) {
      await incrementRetry();
    }
    expect(seen).toEqual([1]);

    await clearQueue();
    expect(seen).toEqual([1, 0]);
    expect(await getDeadLetterCount()).toBe(0);
    unsubscribe();
  });

  it('only ever affects the head entry', async () => {
    await enqueue(makeMutation({ id: 'a' }));
    await enqueue(makeMutation({ id: 'b' }));

    await incrementRetry();

    const queue = await readQueue();
    expect(queue[0].retryCount).toBe(1);
    expect(queue[1].retryCount).toBe(0);
  });

  it('returns false on an empty queue instead of throwing', async () => {
    expect(await incrementRetry()).toBe(false);
  });
});

describe('offlineQueue — corrupt storage', () => {
  it('treats unparseable storage as empty rather than crashing the app', async () => {
    await AsyncStorage.setItem(QUEUE_KEY, 'not json{');
    expect(await readQueue()).toEqual([]);
  });

  it('treats a non-array payload as empty', async () => {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify({ not: 'an array' }));
    expect(await readQueue()).toEqual([]);
  });

  it('recovers by accepting new entries after corruption', async () => {
    await AsyncStorage.setItem(QUEUE_KEY, 'garbage');
    expect(await enqueue(makeMutation({ id: 'fresh' }))).toBe(true);
    expect((await peek())?.id).toBe('fresh');
  });

  it('quarantines the corrupt payload instead of crystallising it as [] (EST-04)', async () => {
    // The old read returned [] and the next ordinary write persisted [] over the user's
    // pending edits — unrecoverable and invisible. The raw bytes must survive for diagnosis.
    await AsyncStorage.setItem(QUEUE_KEY, 'not json{');
    expect(await readQueue()).toEqual([]);
    expect(await readQuarantine()).toBe('not json{');

    // A later enqueue persists the new entry and never touches the quarantine.
    await enqueue(makeMutation({ id: 'fresh' }));
    expect((await peek())?.id).toBe('fresh');
    expect(await readQuarantine()).toBe('not json{');
  });
});

describe('offlineQueue — concurrent writes (mutex, EST-04)', () => {
  it('keeps every entry when enqueues overlap instead of losing all but one', async () => {
    // Without serialization, overlapping read-modify-write cycles read the same snapshot and
    // each write erases the previous one — under the AsyncStorage mock this reliably lost
    // entries. All 10 must survive, in call order.
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) => enqueue(makeMutation({ id: `c${i}` })))
    );

    expect(results).toEqual(Array(10).fill(true));
    expect((await readQueue()).map((m) => m.id)).toEqual(
      Array.from({ length: 10 }, (_, i) => `c${i}`)
    );
  });

  it('clearQueue also empties the dead-letter list (sign-out, EST-05)', async () => {
    await enqueue(makeMutation({ id: 'a' }));
    for (let i = 0; i < getMaxRetries(); i++) {
      await incrementRetry();
    }
    await enqueue(makeMutation({ id: 'b' }));
    expect(await getDeadLetterCount()).toBe(1);

    await clearQueue();

    expect(await getQueueSize()).toBe(0);
    expect(await getDeadLetterCount()).toBe(0);
    expect(await AsyncStorage.getItem('@offline_mutation_dead_letter')).toBeNull();
  });
});
