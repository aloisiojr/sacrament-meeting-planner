/**
 * CONF-09: a guarded agenda update that lands 0 rows is a visible conflict
 * (AgendaConflictError + health event), never a silent last-write-wins success.
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockReportHealthEvent = jest.fn(() => Promise.resolve());
const mockResult: { value: { data: unknown; error: unknown } } = {
  value: { data: null, error: null },
};
const mockEqCalls: unknown[][] = [];

jest.mock('../lib/appHealth', () => ({
  reportHealthEvent: (...a: unknown[]) => mockReportHealthEvent(...(a as [])),
}));
jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ wardId: 'w1', user: { id: 'u1', email: 'a@b.c' }, userName: 'Me', role: 'bishopric' }),
}));
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: () => {
      const chain: Record<string, unknown> = {};
      for (const m of ['update', 'insert', 'select']) {
        chain[m] = () => chain;
      }
      chain.eq = (...a: unknown[]) => {
        mockEqCalls.push(a);
        return chain;
      };
      chain.maybeSingle = () => Promise.resolve(mockResult.value);
      chain.single = () => Promise.resolve(mockResult.value);
      chain.then = (ok: (v: unknown) => unknown, err?: (e: unknown) => unknown) =>
        Promise.resolve(mockResult.value).then(ok, err);
      return chain;
    },
  },
}));

import { useUpdateAgenda, AgendaConflictError } from '../hooks/useAgenda';

type MutateAsync = (v: unknown) => Promise<unknown>;
const ref: { current: MutateAsync | null; error: unknown } = { current: null, error: null };

function Harness() {
  const m = useUpdateAgenda();
  React.useEffect(() => {
    ref.current = m.mutateAsync as MutateAsync;
  }, [m.mutateAsync]);
  return <Text>ready</Text>;
}

async function run(vars: unknown) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  await render(
    <QueryClientProvider client={client}>
      <Harness />
    </QueryClientProvider>
  );
  let caught: unknown = null;
  await act(async () => {
    try {
      await ref.current?.(vars);
    } catch (e) {
      caught = e;
    }
  });
  client.clear();
  return caught;
}

beforeEach(() => {
  mockReportHealthEvent.mockClear();
  mockEqCalls.length = 0;
  ref.current = null;
  mockResult.value = { data: null, error: null };
});

describe('useUpdateAgenda conflict (CONF-09)', () => {
  it('0 guarded rows throws AgendaConflictError and reports a health event', async () => {
    const caught = await run({
      agendaId: 'ag1',
      fields: { presiding_name: 'X' },
      expectedUpdatedAt: '2026-08-01T00:00:00.000Z',
    });
    expect(caught).toBeInstanceOf(AgendaConflictError);
    expect(mockEqCalls).toContainEqual(['updated_at', '2026-08-01T00:00:00.000Z']);
    expect(mockReportHealthEvent).toHaveBeenCalledWith('w1', 'agenda_update_conflict', {});
  });

  it('a landed guarded row succeeds without a conflict event', async () => {
    mockResult.value = { data: { id: 'ag1', sunday_date: '2026-08-09' }, error: null };
    const caught = await run({
      agendaId: 'ag1',
      fields: { presiding_name: 'X' },
      expectedUpdatedAt: '2026-08-01T00:00:00.000Z',
    });
    expect(caught).toBeNull();
    expect(mockReportHealthEvent).not.toHaveBeenCalled();
  });
});
