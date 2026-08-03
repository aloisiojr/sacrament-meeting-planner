/**
 * withOfflineQueue — the wiring that makes "mutations survive offline" true.
 *
 * The distinction this module exists to draw: a request that never reached the server is queued,
 * a server that answered and refused is an error. Getting that backwards either loses the user's
 * edit (queue nothing) or replays a write the server will reject forever (queue everything).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isNetworkError, withOfflineQueue } from '../lib/offlineMutation';
import { readQueue, getMaxQueueSize } from '../lib/offlineQueue';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('isNetworkError', () => {
  it.each([
    ['React Native fetch', new TypeError('Network request failed')],
    ['browser fetch', new TypeError('Failed to fetch')],
    ['Safari', new TypeError('Load failed')],
    ['generic', new Error('NetworkError when attempting to fetch resource')],
    ['postgrest-wrapped', { message: 'FetchError', details: 'TypeError: Network request failed' }],
  ])('recognises %s', (_label, err) => {
    expect(isNetworkError(err)).toBe(true);
  });

  it.each([
    ['RLS denial', { message: 'new row violates row-level security policy for table "speeches"' }],
    ['foreign key', { code: '23503', message: 'insert violates foreign key constraint' }],
    ['duplicate', { code: '23505', message: 'duplicate key value violates unique constraint' }],
    ['validation', new Error('Invalid status transition: not_assigned -> gave_up')],
    ['auth', { message: 'JWT expired' }],
  ])('does not mistake a %s for a lost connection', (_label, err) => {
    expect(isNetworkError(err)).toBe(false);
  });

  it.each([[null], [undefined], [{}], ['']])('is false for %p', (err) => {
    expect(isNetworkError(err)).toBe(false);
  });
});

describe('withOfflineQueue', () => {
  const entry = { table: 'speeches', operation: 'UPDATE' as const, data: { id: 's1', topic_title: 'Faith' } };

  it('returns the server row and queues nothing when the write succeeds', async () => {
    const row = { id: 's1', topic_title: 'Faith' };
    const result = await withOfflineQueue(entry, async () => row);

    expect(result).toBe(row);
    expect(await readQueue()).toHaveLength(0);
  });

  it('queues the write and resolves null when the device is offline', async () => {
    const result = await withOfflineQueue(entry, async () => {
      throw new TypeError('Network request failed');
    });

    expect(result).toBeNull();
    const queue = await readQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      table: 'speeches',
      operation: 'UPDATE',
      data: { id: 's1', topic_title: 'Faith' },
      retryCount: 0,
    });
    expect(typeof queue[0].timestamp).toBe('number');
  });

  it('re-throws a server rejection instead of queueing it', async () => {
    // Replaying an RLS denial on every reconnect would fail forever and burn the retry budget of
    // whatever is behind it in the queue.
    const denial = { message: 'new row violates row-level security policy' };

    await expect(withOfflineQueue(entry, () => Promise.reject(denial))).rejects.toBe(denial);
    expect(await readQueue()).toHaveLength(0);
  });

  it('gives each queued entry a distinct id', async () => {
    for (let i = 0; i < 3; i++) {
      await withOfflineQueue(
        { ...entry, data: { id: `s${i}` } },
        () => Promise.reject(new TypeError('Network request failed'))
      );
    }

    const ids = (await readQueue()).map((m) => m.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('preserves FIFO order across successive offline edits', async () => {
    for (const id of ['a', 'b', 'c']) {
      await withOfflineQueue(
        { ...entry, data: { id } },
        () => Promise.reject(new TypeError('Network request failed'))
      );
    }

    expect((await readQueue()).map((m) => m.data.id)).toEqual(['a', 'b', 'c']);
  });

  it('surfaces the failure rather than silently dropping the edit when the queue is full', async () => {
    // Pretending to have saved an edit that was thrown away is worse than reporting the failure.
    const fail = () => Promise.reject(new TypeError('Network request failed'));
    for (let i = 0; i < getMaxQueueSize(); i++) {
      await withOfflineQueue({ ...entry, data: { id: `s${i}` } }, fail);
    }
    expect(await readQueue()).toHaveLength(getMaxQueueSize());

    await expect(withOfflineQueue({ ...entry, data: { id: 'overflow' } }, fail)).rejects.toThrow(
      'Network request failed'
    );
    expect(await readQueue()).toHaveLength(getMaxQueueSize());
  });

  it('queues a DELETE with only the id, which is all the replay needs', async () => {
    await withOfflineQueue(
      { table: 'members', operation: 'DELETE', data: { id: 'm7' } },
      () => Promise.reject(new TypeError('Network request failed'))
    );

    expect((await readQueue())[0]).toMatchObject({
      table: 'members',
      operation: 'DELETE',
      data: { id: 'm7' },
    });
  });
});
