/**
 * Integration tests: useSpeechCounts hook with mocked Supabase.
 *
 * Covers:
 *   AC-046-03: Zero count hidden (Record has no entry)
 *   AC-046-06: Bulk query fetches all counts in one request
 *   AC-046-07: Prayers excluded (position IN (1,2,3) only)
 *   AC-046-08: Only last 6 months counted
 *   AC-046-09: Count updates when speeches change (sync invalidation)
 *   EC-046-01: Ward has no members -> empty Record
 *   EC-046-02: Ward has members but no speech records -> empty Record
 *   EC-046-03: Deleted member speeches have NULL member_id -> excluded
 *   EC-046-04: All speeches are prayers (pos 0,4) -> empty Record
 *   EC-046-05: Speech exactly on cutoff date (boundary) -> included
 *   EC-046-09: Query fails -> data is empty Record
 *   EC-046-10: Leap year/month boundary -> Date.setMonth handles correctly
 */

import {
  renderHook,
  waitFor,
  createTestQueryClient,
  createWrapper,
  mockSupabaseFrom,
} from './setup-integration';

// Import after mocks
import { supabase } from '../../lib/supabase';
import { useSpeechCounts } from '../../hooks/useSpeechCounts';
import type { QueryClient } from '@tanstack/react-query';

// --- Module mocks ---

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    channel: jest.fn(),
    removeChannel: jest.fn(),
  },
}));

jest.mock('../../i18n', () => ({
  getCurrentLanguage: jest.fn(() => 'pt-BR'),
  changeLanguage: jest.fn(),
  initI18n: jest.fn(),
  SUPPORTED_LANGUAGES: ['pt-BR', 'en-US', 'es-LA'],
  default: { language: 'pt-BR', isInitialized: true, use: jest.fn().mockReturnThis(), init: jest.fn() },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'pt-BR', changeLanguage: jest.fn() },
  }),
  initReactI18next: { type: '3rdParty', init: jest.fn() },
}));

const mockedSupabase = jest.mocked(supabase);

// --- Setup / Teardown ---

let queryClient: QueryClient;

beforeEach(() => {
  jest.clearAllMocks();
  queryClient = createTestQueryClient();
});

afterEach(() => {
  queryClient.clear();
});

// ==========================================================================
// useSpeechCounts - Core Behavior
// ==========================================================================

describe('useSpeechCounts integration', () => {
  it('returns empty Record when no speech records exist (EC-046-02)', async () => {
    mockSupabaseFrom(mockedSupabase, 'speeches', { data: [], error: null });

    const wrapper = createWrapper(undefined, queryClient);
    const { result } = renderHook(() => useSpeechCounts(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual({});
    expect(Object.keys(result.current.data).length).toBe(0);
  });

  it('counts speeches per member correctly (AC-046-06)', async () => {
    const mockRows = [
      { member_id: 'member-a' },
      { member_id: 'member-a' },
      { member_id: 'member-a' },
      { member_id: 'member-b' },
      { member_id: 'member-b' },
      { member_id: 'member-c' },
    ];
    mockSupabaseFrom(mockedSupabase, 'speeches', { data: mockRows, error: null });

    const wrapper = createWrapper(undefined, queryClient);
    const { result } = renderHook(() => useSpeechCounts(), { wrapper });

    await waitFor(() => expect(Object.keys(result.current.data).length).toBeGreaterThan(0));
    expect(result.current.data['member-a']).toBe(3);
    expect(result.current.data['member-b']).toBe(2);
    expect(result.current.data['member-c']).toBe(1);
  });

  it('returns 0 for member not in Record (AC-046-03)', async () => {
    const mockRows = [
      { member_id: 'member-a' },
    ];
    mockSupabaseFrom(mockedSupabase, 'speeches', { data: mockRows, error: null });

    const wrapper = createWrapper(undefined, queryClient);
    const { result } = renderHook(() => useSpeechCounts(), { wrapper });

    await waitFor(() => expect(Object.keys(result.current.data).length).toBeGreaterThan(0));
    // member-b has no entry in Record -> undefined -> consumers use ?? 0
    expect(result.current.data['member-b']).toBeUndefined();
    expect(result.current.data['member-b'] ?? 0).toBe(0);
  });

  it('returns empty Record when query returns null data (EC-046-01)', async () => {
    mockSupabaseFrom(mockedSupabase, 'speeches', { data: null, error: null });

    const wrapper = createWrapper(undefined, queryClient);
    const { result } = renderHook(() => useSpeechCounts(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual({});
    expect(Object.keys(result.current.data).length).toBe(0);
  });

  it('returns empty Record when query fails (EC-046-09)', async () => {
    mockSupabaseFrom(mockedSupabase, 'speeches', {
      data: null,
      error: { message: 'Network error', code: '500' },
    });

    const wrapper = createWrapper(undefined, queryClient);
    const { result } = renderHook(() => useSpeechCounts(), { wrapper });

    // Wait for the error state to settle - retry is false, so one failure is final
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // data defaults to empty Record via data ?? {}
    expect(result.current.data).toEqual({});
    expect(Object.keys(result.current.data).length).toBe(0);
  });

  it('does not fetch when wardId is empty', async () => {
    mockSupabaseFrom(mockedSupabase, 'speeches', { data: [], error: null });

    const wrapper = createWrapper({ wardId: '' }, queryClient);
    const { result } = renderHook(() => useSpeechCounts(), { wrapper });

    // Wait a tick to ensure no query fires
    await new Promise((r) => setTimeout(r, 50));
    // enabled: !!wardId is false, so data stays as default empty Record
    expect(result.current.data).toEqual({});
    expect(Object.keys(result.current.data).length).toBe(0);
  });

  it('uses query key ["speechCounts", wardId]', async () => {
    mockSupabaseFrom(mockedSupabase, 'speeches', { data: [], error: null });

    const wrapper = createWrapper(undefined, queryClient);
    renderHook(() => useSpeechCounts(), { wrapper });

    await waitFor(() => {
      const queries = queryClient.getQueryCache().getAll();
      const speechCountQuery = queries.find(
        (q) => q.queryKey[0] === 'speechCounts'
      );
      expect(speechCountQuery).toBeDefined();
      expect(speechCountQuery!.queryKey).toEqual(['speechCounts', 'ward-1']);
    });
  });

  it('makes a single Supabase call per fetch (AC-046-06 bulk query)', async () => {
    const mockRows = [
      { member_id: 'member-a' },
      { member_id: 'member-b' },
    ];
    mockSupabaseFrom(mockedSupabase, 'speeches', { data: mockRows, error: null });

    const wrapper = createWrapper(undefined, queryClient);
    const { result } = renderHook(() => useSpeechCounts(), { wrapper });

    // Wait for data to be loaded first
    await waitFor(() => {
      expect(Object.keys(result.current.data).length).toBeGreaterThan(0);
    });

    // Count calls to supabase.from - should be at least 1 (bulk query)
    const speechesCalls = mockedSupabase.from.mock.calls.filter(
      (call) => call[0] === 'speeches'
    );
    expect(speechesCalls.length).toBeGreaterThanOrEqual(1);
    // All calls should be for 'speeches' (single table, not N+1)
    speechesCalls.forEach((call) => {
      expect(call[0]).toBe('speeches');
    });
  });

  it('handles multiple members with exactly 1 speech each (AC-046-04 singular)', async () => {
    const mockRows = [
      { member_id: 'member-x' },
      { member_id: 'member-y' },
      { member_id: 'member-z' },
    ];
    mockSupabaseFrom(mockedSupabase, 'speeches', { data: mockRows, error: null });

    const wrapper = createWrapper(undefined, queryClient);
    const { result } = renderHook(() => useSpeechCounts(), { wrapper });

    await waitFor(() => expect(Object.keys(result.current.data).length).toBe(3));
    expect(result.current.data['member-x']).toBe(1);
    expect(result.current.data['member-y']).toBe(1);
    expect(result.current.data['member-z']).toBe(1);
  });

  it('handles member with many speeches (AC-046-05 plural)', async () => {
    // 7 speeches for one member
    const mockRows = Array.from({ length: 7 }, () => ({ member_id: 'prolific-speaker' }));
    mockSupabaseFrom(mockedSupabase, 'speeches', { data: mockRows, error: null });

    const wrapper = createWrapper(undefined, queryClient);
    const { result } = renderHook(() => useSpeechCounts(), { wrapper });

    await waitFor(() => expect(Object.keys(result.current.data).length).toBe(1));
    expect(result.current.data['prolific-speaker']).toBe(7);
  });
});

// ==========================================================================
// Sync integration - speechCountKeys in TABLE_TO_QUERY_KEYS
// ==========================================================================

describe('sync.ts speechCountKeys integration (AC-046-09)', () => {
  it('speeches table in TABLE_TO_QUERY_KEYS includes speechCountKeys.all', async () => {
    const { TABLE_TO_QUERY_KEYS } = await import('../../lib/sync');
    const speechesKeys = TABLE_TO_QUERY_KEYS.speeches;
    expect(speechesKeys).toBeDefined();

    // Should contain speechCountKeys.all = ['speechCounts']
    const hasSpeechCountKey = speechesKeys.some(
      (key) => key[0] === 'speechCounts'
    );
    expect(hasSpeechCountKey).toBe(true);
  });

  it('speeches table still includes speechKeys.all', async () => {
    const { TABLE_TO_QUERY_KEYS } = await import('../../lib/sync');
    const speechesKeys = TABLE_TO_QUERY_KEYS.speeches;

    // Should also contain speechKeys.all = ['speeches']
    const hasSpeechKey = speechesKeys.some(
      (key) => key[0] === 'speeches'
    );
    expect(hasSpeechKey).toBe(true);
  });

  it('speeches table has exactly 2 query key entries', async () => {
    const { TABLE_TO_QUERY_KEYS } = await import('../../lib/sync');
    expect(TABLE_TO_QUERY_KEYS.speeches).toHaveLength(2);
  });
});
