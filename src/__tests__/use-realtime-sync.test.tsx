/**
 * Tests for useRealtimeSync (was 0% — never executed by any test).
 *
 * This hook decides when the app's data is refreshed. Its failure modes are quiet: a channel that
 * never subscribes, or a TIMED_OUT socket left marked as connected, both leave the user staring at
 * stale data with no error anywhere.
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Text } from 'react-native';

type SubscribeCb = (status: string) => void;
type ChangeHandler = (payload: { table: string }) => void;

const mockChannelState: {
  name: string | null;
  tables: string[];
  handlers: ChangeHandler[];
  subscribeCb: SubscribeCb | null;
  removed: number;
} = { name: null, tables: [], handlers: [], subscribeCb: null, removed: 0 };

const mockInvalidated: unknown[][] = [];
const mockWardId = { value: 'w1' };

jest.mock('../lib/supabase', () => ({
  supabase: {
    channel: (name: string) => {
      mockChannelState.name = name;
      const channel = {
        on: (_event: string, cfg: { table: string }, handler: ChangeHandler) => {
          mockChannelState.tables.push(cfg.table);
          mockChannelState.handlers.push(handler);
          return channel;
        },
        subscribe: (cb: SubscribeCb) => {
          mockChannelState.subscribeCb = cb;
          return channel;
        },
      };
      return channel;
    },
    removeChannel: () => {
      mockChannelState.removed += 1;
    },
  },
}));

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: ({ queryKey }: { queryKey: unknown[] }) => {
      mockInvalidated.push(queryKey);
    },
  }),
}));

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ wardId: mockWardId.value }),
}));

import { useRealtimeSync } from '../hooks/useRealtimeSync';
import { SYNCED_TABLES, POLLING_INTERVAL_MS, getQueryKeysForTable } from '../lib/sync';

const setWebSocketConnected = jest.fn();

function Harness({ isOnline }: { isOnline: boolean }) {
  useRealtimeSync({ isOnline, setWebSocketConnected });
  return <Text testID="harness">{String(isOnline)}</Text>;
}

async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

/** Drive the channel to a given subscription status. */
async function status(s: string) {
  await act(async () => {
    mockChannelState.subscribeCb?.(s);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  mockChannelState.name = null;
  mockChannelState.tables = [];
  mockChannelState.handlers = [];
  mockChannelState.subscribeCb = null;
  mockChannelState.removed = 0;
  mockInvalidated.length = 0;
  mockWardId.value = 'w1';
  setWebSocketConnected.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useRealtimeSync — subscription', () => {
  it('opens one ward-scoped channel and subscribes to every synced table', async () => {
    await render(<Harness isOnline />);

    expect(mockChannelState.name).toBe('ward-sync-w1');
    expect(mockChannelState.tables).toEqual([...SYNCED_TABLES]);
  });

  it('does not open a channel while offline', async () => {
    await render(<Harness isOnline={false} />);
    expect(mockChannelState.name).toBeNull();
  });

  it('does not open a channel before a ward is known', async () => {
    mockWardId.value = '';
    await render(<Harness isOnline />);
    expect(mockChannelState.name).toBeNull();
  });
});

describe('useRealtimeSync — change events map to cache invalidation', () => {
  it('invalidates exactly the keys registered for the changed table', async () => {
    await render(<Harness isOnline />);
    await status('SUBSCRIBED');
    mockInvalidated.length = 0; // ignore the refetch-on-subscribe

    const table = SYNCED_TABLES[0];
    await act(async () => {
      mockChannelState.handlers[0]({ table });
    });

    expect(mockInvalidated).toEqual(getQueryKeysForTable(table));
  });

  it('uses the table from the payload, not the subscription slot', async () => {
    await render(<Harness isOnline />);
    await status('SUBSCRIBED');
    mockInvalidated.length = 0;

    // A handler registered for table[0] receives a payload about table[1].
    const other = SYNCED_TABLES[1];
    await act(async () => {
      mockChannelState.handlers[0]({ table: other });
    });

    expect(mockInvalidated).toEqual(getQueryKeysForTable(other));
  });
});

describe('useRealtimeSync — socket status drives the polling fallback', () => {
  it('SUBSCRIBED marks the socket connected and refetches everything once', async () => {
    await render(<Harness isOnline />);
    await status('SUBSCRIBED');

    expect(setWebSocketConnected).toHaveBeenLastCalledWith(true);
    // One immediate refresh across all synced tables, so a reconnect shows fresh data.
    expect(mockInvalidated.length).toBeGreaterThan(0);
  });

  it('does not poll while the socket is healthy', async () => {
    await render(<Harness isOnline />);
    await status('SUBSCRIBED');
    mockInvalidated.length = 0;

    await advance(POLLING_INTERVAL_MS * 3);
    expect(mockInvalidated).toHaveLength(0);
  });

  it.each(['CLOSED', 'CHANNEL_ERROR', 'TIMED_OUT'])(
    '%s marks the socket disconnected and starts polling',
    async (s) => {
      await render(<Harness isOnline />);
      await status(s);

      expect(setWebSocketConnected).toHaveBeenLastCalledWith(false);

      mockInvalidated.length = 0;
      await advance(POLLING_INTERVAL_MS);
      // Polling refreshes every synced table.
      expect(mockInvalidated.length).toBeGreaterThan(0);
    }
  );

  it('TIMED_OUT is treated as a disconnect — the regression this guard exists for', async () => {
    // A flaky link previously left the socket marked connected with no polling fallback, so the
    // app quietly showed stale data.
    await render(<Harness isOnline />);
    await status('SUBSCRIBED');
    await status('TIMED_OUT');

    expect(setWebSocketConnected).toHaveBeenLastCalledWith(false);
    mockInvalidated.length = 0;
    await advance(POLLING_INTERVAL_MS);
    expect(mockInvalidated.length).toBeGreaterThan(0);
  });

  it('stops polling once the socket comes back', async () => {
    await render(<Harness isOnline />);
    await status('CHANNEL_ERROR');
    await status('SUBSCRIBED');

    mockInvalidated.length = 0;
    await advance(POLLING_INTERVAL_MS * 3);
    expect(mockInvalidated).toHaveLength(0);
  });

  it('does not stack intervals when several failure statuses arrive', async () => {
    await render(<Harness isOnline />);
    await status('CHANNEL_ERROR');
    await status('TIMED_OUT');
    await status('CLOSED');

    mockInvalidated.length = 0;
    await advance(POLLING_INTERVAL_MS);
    // One interval's worth of work, not three.
    expect(mockInvalidated).toHaveLength(SYNCED_TABLES.flatMap(getQueryKeysForTable).length);
  });
});

describe('useRealtimeSync — teardown', () => {
  it('removes the channel and clears the socket flag on unmount', async () => {
    const view = await render(<Harness isOnline />);
    await status('SUBSCRIBED');

    await view.unmount();

    expect(mockChannelState.removed).toBeGreaterThan(0);
    expect(setWebSocketConnected).toHaveBeenLastCalledWith(false);
  });

  it('tears the channel down when the device goes offline', async () => {
    const view = await render(<Harness isOnline />);
    await status('SUBSCRIBED');

    await act(async () => {
      await view.rerender(<Harness isOnline={false} />);
    });

    expect(mockChannelState.removed).toBeGreaterThan(0);
    expect(setWebSocketConnected).toHaveBeenLastCalledWith(false);
  });

  it('stops polling when the device goes offline', async () => {
    const view = await render(<Harness isOnline />);
    await status('CHANNEL_ERROR'); // polling started

    await act(async () => {
      await view.rerender(<Harness isOnline={false} />);
    });

    mockInvalidated.length = 0;
    await advance(POLLING_INTERVAL_MS * 3);
    // Polling offline would burn battery and achieve nothing.
    expect(mockInvalidated).toHaveLength(0);
  });
});
