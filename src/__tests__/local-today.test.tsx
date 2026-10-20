/**
 * EST-08: "today" is the LOCAL calendar day, not the UTC day.
 *
 * At 22:00 in America/Sao_Paulo the UTC clock already shows tomorrow (01:00Z next day).
 * Every public entry point that filters by "today" must use the local date
 * (2026-10-19), never the UTC date (2026-10-20). These tests drive the real
 * functions/hooks against a mocked Supabase and assert the filter values they send.
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

// --- Supabase mock: chainable builder recording gte/lte filter values ---

const mockCaptured: { gte: [string, unknown][]; lte: [string, unknown][] } = { gte: [], lte: [] };

function mockMakeBuilder() {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  builder.select = jest.fn(chain);
  builder.eq = jest.fn(chain);
  builder.in = jest.fn(chain);
  builder.not = jest.fn(chain);
  builder.order = jest.fn(chain);
  builder.gte = jest.fn((col: string, val: unknown) => {
    mockCaptured.gte.push([col, val]);
    return builder;
  });
  builder.lte = jest.fn((col: string, val: unknown) => {
    mockCaptured.lte.push([col, val]);
    return builder;
  });
  builder.then = (resolve: (v: unknown) => void) =>
    resolve({ data: [], count: 0, error: null });
  return builder;
}

jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => mockMakeBuilder()),
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
  },
}));

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    wardId: 'ward-1',
    user: { id: 'user-1', email: 'a@b.c' },
    userName: 'Tester',
    hasPermission: () => true,
  }),
}));

import { checkFutureSpeeches } from '../hooks/useMembers';
import { checkTopicFutureSpeeches } from '../hooks/useTopics';
import { useSpeechCounts } from '../hooks/useSpeechCounts';

// Restore by SETTING the captured zone: deleting process.env.TZ does not
// reset Node's cached zone and would leak Sao_Paulo into later test files.
const ORIGINAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

beforeAll(() => {
  process.env.TZ = 'America/Sao_Paulo';
  // 2026-10-20T01:00:00Z == 2026-10-19 22:00 in America/Sao_Paulo (UTC-3).
  jest.useFakeTimers({ now: new Date('2026-10-20T01:00:00.000Z') });
});

afterAll(() => {
  jest.useRealTimers();
  process.env.TZ = ORIGINAL_TZ;
});

beforeEach(() => {
  mockCaptured.gte = [];
  mockCaptured.lte = [];
});

describe('local today at 22:00 America/Sao_Paulo (EST-08)', () => {
  it('sanity: the fake clock really splits UTC and local days', () => {
    const now = new Date();
    expect(now.toISOString().slice(0, 10)).toBe('2026-10-20'); // UTC day
    expect(now.getDate()).toBe(19); // local day
  });

  it('checkFutureSpeeches filters from the LOCAL today', async () => {
    await checkFutureSpeeches('member-1');
    expect(mockCaptured.gte).toContainEqual(['sunday_date', '2026-10-19']);
    expect(mockCaptured.gte).not.toContainEqual(['sunday_date', '2026-10-20']);
  });

  it('checkTopicFutureSpeeches filters from the LOCAL today', async () => {
    await checkTopicFutureSpeeches('Fé', 'ward-1');
    expect(mockCaptured.gte).toContainEqual(['sunday_date', '2026-10-19']);
    expect(mockCaptured.gte).not.toContainEqual(['sunday_date', '2026-10-20']);
  });

  it('useSpeechCounts bounds the 6-month window by LOCAL dates', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);
    renderHook(() => useSpeechCounts(), { wrapper });
    await waitFor(() => expect(mockCaptured.lte.length).toBeGreaterThan(0));
    expect(mockCaptured.lte).toContainEqual(['sunday_date', '2026-10-19']);
    expect(mockCaptured.gte).toContainEqual(['sunday_date', '2026-04-19']);
    client.clear();
  });
});
