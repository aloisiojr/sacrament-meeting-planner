/**
 * EST-16: useWardManagePrayers must not turn "ward row not found" into a silent
 * `managePrayers=false` (which hides prayers across the UI), and a real query
 * failure must be visible to callers as `error`, like the speeches query.
 */
import React, { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from './integration/setup-integration';

const mockSingle = jest.fn();
const mockMaybeSingle = jest.fn();

jest.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: mockSingle,
          maybeSingle: mockMaybeSingle,
        }),
      }),
    }),
  },
}));

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ wardId: 'ward-1' }),
}));

import { useWardManagePrayers } from '../hooks/useSpeeches';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useWardManagePrayers (EST-16)', () => {
  beforeEach(() => {
    mockSingle.mockReset();
    mockMaybeSingle.mockReset();
    // PostgREST: .single() with 0 rows errors (PGRST116); .maybeSingle() returns null data.
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' },
    });
  });

  it('treats a missing ward row as managePrayers=false WITHOUT an error', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useWardManagePrayers(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.managePrayers).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('exposes a real query failure as error instead of swallowing it into the default', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'permission denied for table wards' },
    });

    const { result } = renderHook(() => useWardManagePrayers(), { wrapper });
    await waitFor(() => expect(result.current.error).toBeTruthy());

    expect(result.current.error).toBeTruthy();
    expect(String((result.current.error as Error)?.message ?? result.current.error)).toContain(
      'permission denied'
    );
  });

  it('returns the flag when the ward row exists', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { manage_prayers: true }, error: null });

    const { result } = renderHook(() => useWardManagePrayers(), { wrapper });
    await waitFor(() => expect(result.current.managePrayers).toBe(true));

    expect(result.current.managePrayers).toBe(true);
    expect(result.current.error).toBeNull();
  });
});
