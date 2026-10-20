/**
 * CONF-07 — useApplyMemberImport applies a confirmed merge through ONE call to the
 * transactional `apply_member_import` RPC (migration 060): no direct writes to
 * `members` from the client, batched phone updates inside the payload, and an RPC
 * error propagates instead of leaving a silent partial import. Idempotency on
 * re-run lives in the RPC (natural-key dedupe); the client proves it sends the
 * same single RPC call on a retry and surfaces `skipped`.
 */
import { renderHook, createTestQueryClient, createWrapper } from './integration/setup-integration';
import { act } from 'react';

import { supabase } from '../lib/supabase';
import { useApplyMemberImport } from '../hooks/useApplyMemberImport';

jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    channel: jest.fn(),
    removeChannel: jest.fn(),
  },
}));

const mockedSupabase = jest.mocked(supabase);
const rpcMock = mockedSupabase.rpc as unknown as jest.Mock;
const fromMock = mockedSupabase.from as unknown as jest.Mock;

const APPLY = {
  inserts: [
    { name: 'Fernando de Oliveira', phone: '+5511999990000' },
    { name: 'Ana Sem Fone', phone: null },
  ],
  phoneUpdates: [{ id: 'm-2', phone: '+5511900000011' }],
  removeIds: ['m-9'],
};

describe('useApplyMemberImport', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>;
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = createTestQueryClient();
    rpcMock.mockResolvedValue({
      data: { inserted: 2, updated: 1, removed: 1, skipped: 0 },
      error: null,
    });
  });

  it('sends inserts, phone updates and removals in ONE rpc call and returns its counts', async () => {
    const wrapper = createWrapper({ wardId: 'w1' }, queryClient);
    const { result } = renderHook(() => useApplyMemberImport(), { wrapper });

    let out: any;
    await act(async () => {
      out = await result.current.mutateAsync(APPLY);
    });

    expect(out).toEqual({ inserted: 2, updated: 1, removed: 1, skipped: 0 });
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith('apply_member_import', {
      p_ward_id: 'w1',
      p_inserts: [
        { full_name: 'Fernando de Oliveira', informal_name: 'Fernando', country_code: '+55', phone: '11999990000' },
        { full_name: 'Ana Sem Fone', informal_name: 'Ana', country_code: '+55', phone: null },
      ],
      p_phone_updates: [{ id: 'm-2', country_code: '+55', phone: '11900000011' }],
      p_remove_ids: ['m-9'],
    });
    // No direct table writes from the client: the RPC is the only write path.
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('propagates an RPC failure instead of leaving a silent partial import', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'tx aborted' } });
    const wrapper = createWrapper({ wardId: 'w1' }, queryClient);
    const { result } = renderHook(() => useApplyMemberImport(), { wrapper });

    await expect(
      act(async () => {
        await result.current.mutateAsync(APPLY);
      })
    ).rejects.toMatchObject({ message: 'tx aborted' });

    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('is retry-safe: a repeated import re-sends the same single RPC and surfaces skipped duplicates', async () => {
    rpcMock
      .mockResolvedValueOnce({ data: { inserted: 2, updated: 1, removed: 1, skipped: 0 }, error: null })
      .mockResolvedValueOnce({ data: { inserted: 0, updated: 1, removed: 0, skipped: 2 }, error: null });
    const wrapper = createWrapper({ wardId: 'w1' }, queryClient);
    const { result } = renderHook(() => useApplyMemberImport(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(APPLY);
    });
    let second: any;
    await act(async () => {
      second = await result.current.mutateAsync(APPLY);
    });

    // Same payload both times; the RPC reports the duplicates as skipped, never re-inserted.
    expect(rpcMock).toHaveBeenCalledTimes(2);
    expect(rpcMock.mock.calls[1]).toEqual(rpcMock.mock.calls[0]);
    expect(second).toEqual({ inserted: 0, updated: 1, removed: 0, skipped: 2 });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('sends empty phases as empty payloads in the same single call', async () => {
    rpcMock.mockResolvedValue({ data: { inserted: 0, updated: 1, removed: 0, skipped: 0 }, error: null });
    const wrapper = createWrapper({ wardId: 'w1' }, queryClient);
    const { result } = renderHook(() => useApplyMemberImport(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        inserts: [],
        phoneUpdates: [{ id: 'm-3', phone: '+5511988887777' }],
        removeIds: [],
      });
    });

    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith('apply_member_import', {
      p_ward_id: 'w1',
      p_inserts: [],
      p_phone_updates: [{ id: 'm-3', country_code: '+55', phone: '11988887777' }],
      p_remove_ids: [],
    });
  });
});
