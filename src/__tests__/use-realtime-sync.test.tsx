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
/** `type` is channel.on()'s first argument; `event` is the field inside its config object. */
type ChannelFilterCfg = { type?: string; event?: string; schema?: string; table: string; filter?: string };

const mockChannelState: {
  name: string | null;
  tables: string[];
  /** Full postgres_changes config per subscription, so the ward filter can be asserted. */
  configs: ChannelFilterCfg[];
  handlers: ChangeHandler[];
  subscribeCb: SubscribeCb | null;
  removed: number;
  /** EST-18: every channel instance created / passed to removeChannel, by identity. */
  channels: unknown[];
  removedChannels: unknown[];
} = { name: null, tables: [], configs: [], handlers: [], subscribeCb: null, removed: 0, channels: [], removedChannels: [] };

const mockInvalidated: unknown[][] = [];
const mockWardId = { value: 'w1' };

jest.mock('../lib/supabase', () => ({
  supabase: {
    channel: (name: string) => {
      mockChannelState.name = name;
      const channel = {
        on: (type: string, cfg: ChannelFilterCfg, handler: ChangeHandler) => {
          mockChannelState.tables.push(cfg.table);
          mockChannelState.configs.push({ ...cfg, type });
          mockChannelState.handlers.push(handler);
          return channel;
        },
        subscribe: (cb: SubscribeCb) => {
          mockChannelState.subscribeCb = cb;
          return channel;
        },
      };
      mockChannelState.channels.push(channel);
      return channel;
    },
    removeChannel: (ch: unknown) => {
      mockChannelState.removed += 1;
      mockChannelState.removedChannels.push(ch);
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
  useAuth: () => ({ wardId: mockWardId.value, user: { id: 'u1' } }),
}));

import { useRealtimeSync } from '../hooks/useRealtimeSync';
import { SYNCED_TABLES, POLLING_TABLES, POLLING_INTERVAL_MS, getQueryKeysForTable } from '../lib/sync';

const setWebSocketConnected = jest.fn();

/** How many invalidations one full refresh across every synced table produces. */
const KEYS_PER_FULL_REFRESH = SYNCED_TABLES.flatMap(getQueryKeysForTable).length;

/** How many invalidations one polling tick produces (RAP-11 scoped tables only). */
const KEYS_PER_POLLING_REFRESH = POLLING_TABLES.flatMap(getQueryKeysForTable).length;

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
  mockChannelState.configs = [];
  mockChannelState.handlers = [];
  mockChannelState.subscribeCb = null;
  mockChannelState.removed = 0;
  mockChannelState.channels = [];
  mockChannelState.removedChannels = [];
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

    // EST-18: the channel is named per ward+user.
    expect(mockChannelState.name).toBe('ward-sync-w1-u1');
    expect(mockChannelState.tables).toEqual([...SYNCED_TABLES]);
  });

  it('removes exactly the channel it created on unmount (EST-18)', async () => {
    const view = await render(<Harness isOnline />);
    expect(mockChannelState.channels).toHaveLength(1);

    await view.unmount();

    expect(mockChannelState.removedChannels).toEqual([mockChannelState.channels[0]]);
  });

  it('scopes every subscription to this ward — the tenancy boundary', async () => {
    // Without `filter`, Postgres broadcasts every ward's row changes to every connected client.
    // RLS protects the REST reads; it does not retroactively unsend a realtime payload. This is
    // the single most important assertion in the file: dropping the filter leaks other wards'
    // speaker names and phone numbers, and nothing else here would notice.
    mockWardId.value = 'ward-abc';
    await render(<Harness isOnline />);

    expect(mockChannelState.configs).toHaveLength(SYNCED_TABLES.length);
    for (const cfg of mockChannelState.configs) {
      expect(cfg.filter).toBe('ward_id=eq.ward-abc');
      expect(cfg.type).toBe('postgres_changes');
      expect(cfg.event).toBe('*'); // INSERT, UPDATE and DELETE all invalidate
      expect(cfg.schema).toBe('public');
    }
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

  it('does not poll when there is no ward — every synced query is ward-scoped', async () => {
    // There used to be an `if (isOnline && wardId) startPolling()` here, nested inside
    // `if (!wardId || !isOnline)` — unreachable by construction. Removing it, rather than
    // "repairing" it to `!wardId`, is deliberate: with no ward there is nothing to refetch, so a
    // live timer would only wake the device.
    mockWardId.value = '';
    await render(<Harness isOnline />);

    await advance(POLLING_INTERVAL_MS * 3);
    expect(mockInvalidated).toHaveLength(0);
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
  it('SUBSCRIBED marks the socket connected without invalidating anything (RAP-11)', async () => {
    await render(<Harness isOnline />);
    await status('SUBSCRIBED');

    expect(setWebSocketConnected).toHaveBeenLastCalledWith(true);
    // No refetch burst on (re)subscribe: realtime events and staleTime drive refresh.
    expect(mockInvalidated).toHaveLength(0);
  });

  it('polling refreshes only speeches and agendas, never the full table set (RAP-11)', () => {
    expect(POLLING_TABLES).toEqual(['speeches', 'sunday_agendas']);
    expect(KEYS_PER_POLLING_REFRESH).toBeLessThan(KEYS_PER_FULL_REFRESH);
    expect(POLLING_INTERVAL_MS).toBeGreaterThanOrEqual(30000);
    expect(POLLING_INTERVAL_MS).toBeLessThanOrEqual(60000);
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
      // One tick refreshes only the scoped polling tables exactly once (RAP-11).
      expect(mockInvalidated).toHaveLength(KEYS_PER_POLLING_REFRESH);
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
    expect(mockInvalidated).toHaveLength(KEYS_PER_POLLING_REFRESH);
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
    expect(mockInvalidated).toHaveLength(KEYS_PER_POLLING_REFRESH);
  });
});

describe('useRealtimeSync — teardown', () => {
  it('removes the channel and clears the socket flag on unmount', async () => {
    const view = await render(<Harness isOnline />);
    await status('SUBSCRIBED');

    await view.unmount();

    expect(mockChannelState.removed).toBe(1);
    expect(setWebSocketConnected).toHaveBeenLastCalledWith(false);
  });

  it('tears the channel down when the device goes offline', async () => {
    const view = await render(<Harness isOnline />);
    await status('SUBSCRIBED');

    await act(async () => {
      await view.rerender(<Harness isOnline={false} />);
    });

    expect(mockChannelState.removed).toBe(1);
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
