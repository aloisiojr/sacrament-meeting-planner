/**
 * S5 tests — useApplyMemberImport applies a confirmed merge (batched insert / per-row phone update /
 * delete-in), non-destructively (no delete unless ids marked). (AC11)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, createTestQueryClient, createWrapper } from './integration/setup-integration';
import { act } from 'react';

import { supabase } from '../lib/supabase';
import { useApplyMemberImport } from '../hooks/useApplyMemberImport';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

const mockedSupabase = vi.mocked(supabase);

// Captured calls.
let insertedRows: any[] | null;
let updateCalls: { payload: any; id: string }[];
let deleteIds: string[] | null;

function wireSupabase() {
  insertedRows = null;
  updateCalls = [];
  deleteIds = null;
  (mockedSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
    insert: (rows: any[]) => {
      insertedRows = rows;
      return Promise.resolve({ error: null });
    },
    update: (payload: any) => ({
      eq: (_col: string, id: string) => {
        updateCalls.push({ payload, id });
        return Promise.resolve({ error: null });
      },
    }),
    delete: () => ({
      in: (_col: string, ids: string[]) => {
        deleteIds = ids;
        return Promise.resolve({ error: null });
      },
    }),
  });
}

describe('useApplyMemberImport', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>;
  beforeEach(() => {
    vi.clearAllMocks();
    wireSupabase();
    queryClient = createTestQueryClient();
  });

  it('batch-inserts new members, updates phones per row, and deletes only marked ids', async () => {
    const wrapper = createWrapper({ wardId: 'w1' }, queryClient);
    const { result } = renderHook(() => useApplyMemberImport(), { wrapper });

    let out: any;
    await act(async () => {
      out = await result.current.mutateAsync({
        inserts: [
          { name: 'Fernando de Oliveira', phone: '+5511999990000' },
          { name: 'Ana Sem Fone', phone: null },
        ],
        phoneUpdates: [{ id: 'm-2', phone: '+5511900000011' }],
        removeIds: ['m-9'],
      });
    });

    expect(out).toEqual({ inserted: 2, updated: 1, removed: 1 });

    // One batched insert with both rows; phone split; informal derived; caps blank.
    expect(insertedRows).toHaveLength(2);
    expect(insertedRows![0]).toMatchObject({
      ward_id: 'w1',
      full_name: 'Fernando de Oliveira',
      informal_name: 'Fernando',
      country_code: '+55',
      phone: '11999990000',
      can_preside: false,
      calling: null,
    });
    expect(insertedRows![1]).toMatchObject({ full_name: 'Ana Sem Fone', phone: null });

    // Per-row phone update.
    expect(updateCalls).toEqual([
      { payload: { country_code: '+55', phone: '11900000011' }, id: 'm-2' },
    ]);

    // Delete only the marked id.
    expect(deleteIds).toEqual(['m-9']);
  });

  it('never deletes when no removals are marked, and skips insert when none', async () => {
    const wrapper = createWrapper({ wardId: 'w1' }, queryClient);
    const { result } = renderHook(() => useApplyMemberImport(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        inserts: [],
        phoneUpdates: [{ id: 'm-3', phone: '+5511988887777' }],
        removeIds: [],
      });
    });

    expect(insertedRows).toBeNull(); // insert not called
    expect(deleteIds).toBeNull(); // delete not called
    expect(updateCalls).toHaveLength(1);
  });
});
