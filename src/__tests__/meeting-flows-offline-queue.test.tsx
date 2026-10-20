/**
 * End-to-end offline behavior of the meeting flows (EST-01/EST-03 + DEC-01), driven through the
 * REAL hooks against a switchable transport:
 *
 *  - saving a designation while the transport is down resolves as "safely queued" — the write
 *    sits in the persisted queue as a UPSERT on (ward_id, sunday_date) — and drains to the
 *    server when connectivity returns;
 *  - the newly-queued writes (create member with a client id, speech status change) behave the
 *    same way;
 *  - a non-meeting-flow mutation (topic library) is blocked offline BEFORE the server is
 *    touched, with the visible offline_blocked error — it never pretends to have saved.
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// --- Switchable transport standing in for Supabase ---
const net = {
  offline: true,
  fromCalls: 0,
  calls: [] as { op: string; table: string; payload?: unknown; opts?: unknown }[],
};

function mockMakeChain(table: string) {
  const fail = () => Promise.reject(new TypeError('Network request failed'));
  const row = {
    id: 'row1', ward_id: 'w1', sunday_date: '2026-08-02', full_name: 'Ana',
    status: 'assigned_invited', position: 1,
  };
  const chain: Record<string, unknown> = {};
  chain.select = () => chain;
  chain.eq = () => chain;
  chain.in = () => chain;
  chain.gte = () => chain;
  chain.maybeSingle = () =>
    net.offline ? fail() : Promise.resolve({ data: null, error: null });
  chain.single = () =>
    net.offline ? fail() : Promise.resolve({ data: row, error: null });
  chain.insert = (payload: unknown) => {
    net.calls.push({ op: 'insert', table, payload });
    return chain;
  };
  chain.update = (payload: unknown) => {
    net.calls.push({ op: 'update', table, payload });
    return chain;
  };
  chain.upsert = (payload: unknown, opts?: unknown) => {
    if (net.offline) return fail();
    net.calls.push({ op: 'upsert', table, payload, opts });
    return Promise.resolve({ error: null });
  };
  chain.delete = () => chain;
  chain.then = (...args: unknown[]) =>
    (net.offline ? fail() : Promise.resolve({ error: null })).then(
      ...(args as [never, never])
    );
  return chain;
}

jest.mock('../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      net.fromCalls += 1;
      return mockMakeChain(table);
    },
  },
}));

jest.mock('../contexts/AuthContext', () => {
  const value = {
    wardId: 'w1',
    user: { id: 'u1', email: 'a@example.org' },
    userName: 'Tester',
    role: 'bishopric',
    hasPermission: () => true,
  };
  return {
    AuthContext: require('react').createContext(value),
    useAuth: () => value,
  };
});

import { OnlineStatusProvider } from '../contexts/OnlineStatusContext';
import { useUpdateAgendaByDate } from '../hooks/useAgenda';
import { useCreateMember } from '../hooks/useMembers';
import { useChangeStatus } from '../hooks/useSpeeches';
import { useCreateWardTopic } from '../hooks/useTopics';
import { useOfflineQueueProcessor } from '../hooks/useOfflineQueueProcessor';
import { readQueue } from '../lib/offlineQueue';
import { isOfflineBlockedError } from '../lib/offlineGuard';

const refs: Record<string, ((vars: never) => Promise<unknown>) | null> = {
  agenda: null,
  member: null,
  status: null,
  topic: null,
};

function HooksHarness() {
  const agenda = useUpdateAgendaByDate();
  const member = useCreateMember();
  const status = useChangeStatus();
  const topic = useCreateWardTopic();
  React.useEffect(() => {
    refs.agenda = agenda.mutateAsync as typeof refs.agenda;
    refs.member = member.mutateAsync as typeof refs.member;
    refs.status = status.mutateAsync as typeof refs.status;
    refs.topic = topic.mutateAsync as typeof refs.topic;
  }, [agenda.mutateAsync, member.mutateAsync, status.mutateAsync, topic.mutateAsync]);
  return <Text testID="hooks">ready</Text>;
}

function ProcessorHarness({ isOnline }: { isOnline: boolean }) {
  useOfflineQueueProcessor(isOnline);
  return null;
}

function tree(isOnline: boolean, queryClient: QueryClient) {
  return (
    <QueryClientProvider client={queryClient}>
      <OnlineStatusProvider isOnline={isOnline}>
        <HooksHarness />
        <ProcessorHarness isOnline={isOnline} />
      </OnlineStatusProvider>
    </QueryClientProvider>
  );
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

beforeEach(async () => {
  await AsyncStorage.clear();
  net.offline = true;
  net.fromCalls = 0;
  net.calls = [];
  for (const k of Object.keys(refs)) refs[k] = null;
});

describe('meeting flows — offline writes queue and sync on reconnect (DEC-01)', () => {
  it('saving a designation with the transport down queues a UPSERT that drains when back online', async () => {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: 0 } } });
    const view = await render(tree(false, queryClient));

    const designations = [
      { type: 'sustain', person_name: 'Ana', member_id: 'm1', calling: 'Líder', office: null },
    ];
    let result: unknown = 'unset';
    await act(async () => {
      result = await refs.agenda!(
        { sundayDate: '2026-08-02', updates: { designations } } as never
      );
    });

    // Resolved (not rejected, not pending): the screen may navigate back — the write is durable.
    expect(result).toBeNull();
    const queue = await readQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      table: 'sunday_agendas',
      operation: 'UPSERT',
      onConflict: 'ward_id,sunday_date',
      data: { ward_id: 'w1', sunday_date: '2026-08-02', designations },
    });

    // Connectivity returns: the same write reaches the server as an upsert on the natural key.
    net.offline = false;
    await act(async () => {
      await view.rerender(tree(true, queryClient));
      await flushMicrotasks();
    });

    expect(await readQueue()).toHaveLength(0);
    expect(net.calls).toContainEqual({
      op: 'upsert',
      table: 'sunday_agendas',
      payload: { ward_id: 'w1', sunday_date: '2026-08-02', designations },
      opts: { onConflict: 'ward_id,sunday_date' },
    });
  });

  it('creating a member offline queues an INSERT carrying a client-assigned id', async () => {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: 0 } } });
    await render(tree(true, queryClient)); // online in context; transport down (mid-gesture flap)

    let result: unknown = 'unset';
    await act(async () => {
      result = await refs.member!(
        { full_name: 'Ana Souza', informal_name: null, country_code: '+55', phone: null } as never
      );
    });

    expect(result).toBeNull();
    const [queued] = await readQueue();
    expect(queued).toMatchObject({ table: 'members', operation: 'INSERT' });
    expect(queued.data).toMatchObject({ ward_id: 'w1', full_name: 'Ana Souza' });
    // The client id is what makes the replay an upsert instead of a duplicate insert.
    expect(queued.data.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it('changing a speech status offline queues the requested status as an UPDATE', async () => {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: 0 } } });
    await render(tree(true, queryClient));

    let result: unknown = 'unset';
    await act(async () => {
      result = await refs.status!(
        { speechId: 'sp1', status: 'assigned_confirmed' } as never
      );
    });

    expect(result).toBeNull();
    const [queued] = await readQueue();
    expect(queued).toMatchObject({
      table: 'speeches',
      operation: 'UPDATE',
      data: { id: 'sp1', status: 'assigned_confirmed' },
    });
  });
});

describe('non-meeting flows — blocked offline, never fake success (DEC-01)', () => {
  it('creating a library topic while offline rejects visibly and never touches the server', async () => {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: 0 } } });
    await render(tree(false, queryClient));
    const fromCallsBefore = net.fromCalls;

    let caught: unknown = null;
    await act(async () => {
      try {
        await refs.topic!({ title: 'Faith', link: null } as never);
      } catch (err) {
        caught = err;
      }
    });

    expect(isOfflineBlockedError(caught)).toBe(true);
    expect(net.fromCalls).toBe(fromCallsBefore);
    expect(await readQueue()).toHaveLength(0);
  });
});
