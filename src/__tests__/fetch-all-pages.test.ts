/**
 * CONF-14: complete lists must not truncate at PostgREST's 1000-row cap.
 */
import React from 'react';
import { renderHook, waitFor } from './integration/setup-integration';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fetchAllPages, PAGE_SIZE } from '../lib/fetchAllPages';

const mockRange = jest.fn();
jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ wardId: 'w1', user: { id: 'u1', email: 'a@b.c' }, userName: 'Me', role: 'bishopric' }),
}));
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({ range: (...a: unknown[]) => mockRange(...a) }),
        }),
      }),
    }),
  },
}));

import { useMembers } from '../hooks/useMembers';

describe('fetchAllPages (CONF-14)', () => {
  it('continues past a full first page and returns the surplus', async () => {
    const ranges: [number, number][] = [];
    const rows = await fetchAllPages(async (from, to) => {
      ranges.push([from, to]);
      return from === 0
        ? Array.from({ length: PAGE_SIZE }, (_, i) => i)
        : [1000, 1001, 1002];
    });
    expect(rows).toHaveLength(PAGE_SIZE + 3);
    expect(rows[PAGE_SIZE]).toBe(1000);
    expect(ranges).toEqual([
      [0, PAGE_SIZE - 1],
      [PAGE_SIZE, PAGE_SIZE * 2 - 1],
    ]);
  });

  it('stops at the first partial page and on an exact empty follow-up', async () => {
    const partial = await fetchAllPages(async () => [1, 2]);
    expect(partial).toEqual([1, 2]);
    let calls = 0;
    const exact = await fetchAllPages(async () => (++calls === 1 ? Array.from({ length: PAGE_SIZE }, (_, i) => i) : []));
    expect(exact).toHaveLength(PAGE_SIZE);
    expect(calls).toBe(2);
  });
});

describe('useMembers pagination (CONF-14)', () => {
  it('shows members beyond the first 1000', async () => {
    const member = (i: number) => ({
      id: `m${i}`,
      ward_id: 'w1',
      full_name: `Member ${String(i).padStart(4, '0')}`,
      informal_name: null,
      country_code: '+55',
      phone: null,
      responsible_id: null,
      calling: null,
    });
    mockRange.mockImplementation((from: number) =>
      Promise.resolve({
        data: from === 0 ? Array.from({ length: PAGE_SIZE }, (_, i) => member(i)) : [member(1000)],
        error: null,
      })
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);
    const { result } = renderHook(() => useMembers(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(PAGE_SIZE + 1);
    expect(result.current.data?.[PAGE_SIZE].id).toBe('m1000');
    client.clear();
  });
});
