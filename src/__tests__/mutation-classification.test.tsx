/**
 * Contract tests for the mutation classification mechanism (EST-03 / DEC-01).
 *
 * DEC-01 (owner decision, hybrid): meeting flows queue offline for real; everything else is
 * BLOCKED offline with a visible message instead of pretending to succeed. These tests pin the
 * mechanism behaviorally — through the wrapper hook and the registry object, never by reading
 * source text:
 *  - a mutation born without a registered name fails loudly on first render;
 *  - a blocked-offline mutation rejects with `offline_blocked` BEFORE its function (and thus
 *    the server) is called, and the global alert policy shows it even while offline;
 *  - a queued mutation is not blocked by the wrapper — its own function runs and queues.
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { OnlineStatusProvider } from '../contexts/OnlineStatusContext';
import { useClassifiedMutation } from '../hooks/useClassifiedMutation';
import {
  MUTATION_OFFLINE_CLASS,
  offlineClassFor,
  type MutationName,
} from '../lib/mutationClassification';
import { OFFLINE_BLOCKED, isOfflineBlockedError } from '../lib/offlineGuard';
import { shouldAlertMutationError } from '../lib/queryConfig';

type MutateAsync = (vars: string) => Promise<unknown>;
const mutateRef: { current: MutateAsync | null } = { current: null };

function Harness({ name, fn }: { name: MutationName; fn: (vars: string) => Promise<unknown> }) {
  const m = useClassifiedMutation(name, { mutationFn: fn });
  React.useEffect(() => {
    mutateRef.current = m.mutateAsync as MutateAsync;
  }, [m.mutateAsync]);
  return <Text testID="harness">ready</Text>;
}

async function renderMutation(
  isOnline: boolean,
  name: MutationName,
  fn: (vars: string) => Promise<unknown>
) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: 0 } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <OnlineStatusProvider isOnline={isOnline}>
        <Harness name={name} fn={fn} />
      </OnlineStatusProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  mutateRef.current = null;
});

describe('useClassifiedMutation — the classification gate', () => {
  it('throws on first render for a mutation name that was never registered', async () => {
    // A new mutation must not be able to be born unclassified and pass silently.
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    let caught: unknown = null;
    try {
      await renderMutation(true, 'useBrandNewMutation' as unknown as MutationName, async () => 'ok');
    } catch (err) {
      caught = err;
    } finally {
      consoleSpy.mockRestore();
    }
    expect(String(caught)).toMatch(/no offline classification/i);
    expect(String(caught)).toContain('useBrandNewMutation');
  });

  it('blocked-offline: rejects with offline_blocked before ever calling the mutation function', async () => {
    const fn = jest.fn().mockResolvedValue('saved');
    await renderMutation(false, 'useCreateWardTopic', fn);

    let caught: unknown = null;
    await act(async () => {
      try {
        await mutateRef.current!('Faith');
      } catch (err) {
        caught = err;
      }
    });

    expect(isOfflineBlockedError(caught)).toBe(true);
    expect((caught as { code?: string }).code).toBe(OFFLINE_BLOCKED);
    // The message is the translated "connect to save" text, not an empty rejection.
    expect((caught as Error).message.length).toBeGreaterThan(0);
    // The whole point of blocking: the server was never touched, so nothing faked success.
    expect(fn).not.toHaveBeenCalled();
  });

  it('blocked-offline: runs normally while online', async () => {
    const fn = jest.fn().mockResolvedValue('saved');
    await renderMutation(true, 'useCreateWardTopic', fn);

    let result: unknown;
    await act(async () => {
      result = await mutateRef.current!('Faith');
    });

    expect(result).toBe('saved');
    expect(fn).toHaveBeenCalledWith('Faith', expect.anything());
  });

  it('queued: the wrapper does not block while offline — the function itself queues the write', async () => {
    // Meeting flows resolve as "safely queued" (null) instead of rejecting or pending forever.
    const fn = jest.fn().mockResolvedValue(null);
    await renderMutation(false, 'useAssignSpeaker', fn);

    let result: unknown = 'unset';
    await act(async () => {
      result = await mutateRef.current!('sp1');
    });

    expect(fn).toHaveBeenCalledTimes(1);
    expect(result).toBeNull();
  });
});

describe('MUTATION_OFFLINE_CLASS — the inventory (EST-03)', () => {
  it('classifies all 32 mutation sites found by the audit', () => {
    expect(Object.keys(MUTATION_OFFLINE_CLASS)).toHaveLength(32);
  });

  it('queues exactly the meeting flows and their already-queued siblings', () => {
    const queued = Object.entries(MUTATION_OFFLINE_CLASS)
      .filter(([, cls]) => cls === 'queued')
      .map(([name]) => name)
      .sort();
    expect(queued).toEqual([
      'useAssignSpeaker',
      'useAssignTopic',
      'useChangeStatus',
      'useCreateMember',
      'useDeleteMember',
      'useRemoveAssignment',
      'useUpdateAgenda',
      'useUpdateAgendaByDate',
      'useUpdateMember',
      'useUpdateSpeechContact',
    ]);
  });

  it('blocks everything else offline, and only uses the two known classes', () => {
    for (const [name, cls] of Object.entries(MUTATION_OFFLINE_CLASS)) {
      expect([name, cls]).toEqual([
        name,
        expect.stringMatching(/^(queued|blocked-offline)$/),
      ]);
    }
    const blocked = Object.values(MUTATION_OFFLINE_CLASS).filter((c) => c === 'blocked-offline');
    expect(blocked).toHaveLength(22);
  });

  it('reports unknown names as unregistered', () => {
    expect(offlineClassFor('useSomethingInvented')).toBeUndefined();
    expect(offlineClassFor('useUpdateAgendaByDate')).toBe('queued');
    expect(offlineClassFor('settings.saveTimezone')).toBe('blocked-offline');
  });
});

describe('shouldAlertMutationError — the blocked edit is visible even offline', () => {
  const blocked = { message: 'connect to save', code: OFFLINE_BLOCKED };

  it('alerts for offline_blocked while offline (the explicit DEC-01 exception)', () => {
    expect(shouldAlertMutationError(blocked, false)).toBe(true);
    expect(shouldAlertMutationError(blocked, true)).toBe(true);
  });

  it('still stays quiet for ordinary offline failures (the queue will replay them)', () => {
    expect(shouldAlertMutationError({ message: 'boom' }, false)).toBe(false);
    expect(shouldAlertMutationError({ message: 'network request failed' }, true)).toBe(false);
  });

  it('respects an explicit suppressGlobalError opt-out even for a blocked edit', () => {
    expect(shouldAlertMutationError(blocked, false, { suppressGlobalError: true })).toBe(false);
  });
});
