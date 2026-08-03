/**
 * F044 (CR-260): agenda edits are NOT written to the activity log.
 *
 * Agenda fields auto-save on every keystroke-ish change, so logging them buried the log under
 * hundreds of "presiding_name changed" rows and made the entries that matter — role grants, user
 * deletions, speech assignments — unfindable.
 *
 * The previous check for this was `expect(useAgendaSource).not.toContain('logAction')`, a grep over
 * the hook's own source. It could not see a log written from a caller, and it would go red for an
 * unrelated string match. This drives the real mutation and watches the logger.
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockLogAction = jest.fn();
const mockUpdateResult: { value: { data: unknown; error: unknown } } = {
  value: { data: { id: 'ag1', sunday_date: '2026-08-09' }, error: null },
};

jest.mock('../lib/activityLog', () => ({
  logAction: (...a: unknown[]) => mockLogAction(...a),
  buildLogDescription: () => '',
}));
jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ wardId: 'w1', user: { id: 'u1', email: 'a@b.c' }, userName: 'Me', role: 'bishopric' }),
}));
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: () => {
      const chain: Record<string, unknown> = {};
      for (const m of ['update', 'insert', 'delete', 'eq', 'select', 'maybeSingle']) {
        chain[m] = () => chain;
      }
      chain.single = () => Promise.resolve(mockUpdateResult.value);
      chain.maybeSingle = () => Promise.resolve(mockUpdateResult.value);
      chain.then = (ok: (v: unknown) => unknown, err?: (e: unknown) => unknown) =>
        Promise.resolve(mockUpdateResult.value).then(ok, err);
      return chain;
    },
  },
}));

import { useUpdateAgenda, useUpdateAgendaByDate } from '../hooks/useAgenda';

type AnyMutate = (args: never) => void;
const mutateRef: { current: AnyMutate | null } = { current: null };

function Harness({ which }: { which: 'byId' | 'byDate' }) {
  const byId = useUpdateAgenda();
  const byDate = useUpdateAgendaByDate();
  const m = which === 'byId' ? byId : byDate;
  React.useEffect(() => {
    mutateRef.current = m.mutate as AnyMutate;
  }, [m.mutate]);
  return <Text testID="harness">ready</Text>;
}

async function runUpdate(which: 'byId' | 'byDate', vars: unknown) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  await render(
    <QueryClientProvider client={client}>
      <Harness which={which} />
    </QueryClientProvider>
  );
  await act(async () => {
    (mutateRef.current as unknown as (v: unknown) => void)?.(vars);
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  client.clear();
}

beforeEach(() => {
  mockLogAction.mockReset();
  mutateRef.current = null;
  mockUpdateResult.value = { data: { id: 'ag1', sunday_date: '2026-08-09' }, error: null };
});

describe('agenda edits leave no activity-log trail', () => {
  it('updating by id logs nothing', async () => {
    await runUpdate('byId', { agendaId: 'ag1', fields: { presiding_name: 'Bishop Silva' } });
    expect(mockLogAction).not.toHaveBeenCalled();
  });

  it('updating by date logs nothing', async () => {
    await runUpdate('byDate', { sundayDate: '2026-08-09', updates: { has_second_speech: true } });
    expect(mockLogAction).not.toHaveBeenCalled();
  });

  it('logs nothing on a failed update either', async () => {
    mockUpdateResult.value = { data: null, error: { message: 'boom' } };
    await runUpdate('byId', { agendaId: 'ag1', fields: { presiding_name: 'X' } });
    expect(mockLogAction).not.toHaveBeenCalled();
  });
});
