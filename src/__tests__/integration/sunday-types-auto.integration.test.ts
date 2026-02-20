/**
 * Integration tests: Sunday Types + Auto-Assignment (Category 4)
 * Tests auto-assignment rules, getAutoAssignedType, and getSundayOfMonth.
 *
 * Covers: AC-082-19 to AC-082-22, EC-082-11, EC-082-12
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createTestQueryClient,
  createWrapper,
  renderHook,
  waitFor,
  act,
  mockSupabaseFrom,
  createMockSundayException,
} from './setup-integration';

// --- Module mocks ---

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

vi.mock('../../lib/activityLog', () => ({
  logAction: vi.fn(),
}));

vi.mock('../../i18n', () => ({
  getCurrentLanguage: vi.fn(() => 'pt-BR'),
  changeLanguage: vi.fn(),
  initI18n: vi.fn(),
  SUPPORTED_LANGUAGES: ['pt-BR', 'en', 'es'],
  default: { language: 'pt-BR', isInitialized: true, use: vi.fn().mockReturnThis(), init: vi.fn() },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'pt-BR', changeLanguage: vi.fn() },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

vi.mock('../../lib/dateUtils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/dateUtils')>();
  return {
    ...actual,
    formatDateHumanReadable: (dateStr: string) => dateStr,
  };
});

import { supabase } from '../../lib/supabase';
import {
  getAutoAssignedType,
  getSundayOfMonth,
  SUNDAY_TYPE_SPEECHES,
  SUNDAY_TYPE_OPTIONS,
  useAutoAssignSundayTypes,
  useSundayExceptions,
  useSetSundayType,
  useRemoveSundayException,
} from '../../hooks/useSundayTypes';
import type { QueryClient } from '@tanstack/react-query';

const mockedSupabase = vi.mocked(supabase);

// ==========================================================================
// 1. getSundayOfMonth (AC-082-19)
// ==========================================================================

describe('getSundayOfMonth', () => {
  it('returns 1 for first Sunday (day 1-7)', () => {
    // 2026-03-01 is a Sunday (day 1)
    expect(getSundayOfMonth(new Date(2026, 2, 1))).toBe(1);
    // day 7
    expect(getSundayOfMonth(new Date(2026, 2, 7))).toBe(1);
  });

  it('returns 2 for second Sunday (day 8-14)', () => {
    expect(getSundayOfMonth(new Date(2026, 2, 8))).toBe(2);
    expect(getSundayOfMonth(new Date(2026, 2, 14))).toBe(2);
  });

  it('returns 3 for third Sunday (day 15-21)', () => {
    expect(getSundayOfMonth(new Date(2026, 2, 15))).toBe(3);
    expect(getSundayOfMonth(new Date(2026, 2, 21))).toBe(3);
  });

  it('returns 4 for fourth Sunday (day 22-28)', () => {
    expect(getSundayOfMonth(new Date(2026, 2, 22))).toBe(4);
    expect(getSundayOfMonth(new Date(2026, 2, 28))).toBe(4);
  });

  it('returns 5 for fifth Sunday (day 29-31)', () => {
    expect(getSundayOfMonth(new Date(2026, 2, 29))).toBe(5);
    expect(getSundayOfMonth(new Date(2026, 2, 31))).toBe(5);
  });
});

// ==========================================================================
// 2. getAutoAssignedType (AC-082-20)
// ==========================================================================

describe('getAutoAssignedType', () => {
  describe('regular months (Jan-Mar, May-Sep, Nov-Dec)', () => {
    it('1st Sunday is testimony_meeting', () => {
      // January 2026, 1st Sunday = Jan 4
      expect(getAutoAssignedType(new Date(2026, 0, 4))).toBe('testimony_meeting');
      // February 2026, 1st Sunday = Feb 1
      expect(getAutoAssignedType(new Date(2026, 1, 1))).toBe('testimony_meeting');
      // March 2026, 1st Sunday = Mar 1
      expect(getAutoAssignedType(new Date(2026, 2, 1))).toBe('testimony_meeting');
      // May 2026, 1st Sunday = May 3
      expect(getAutoAssignedType(new Date(2026, 4, 3))).toBe('testimony_meeting');
      // November 2026, 1st Sunday = Nov 1
      expect(getAutoAssignedType(new Date(2026, 10, 1))).toBe('testimony_meeting');
      // December 2026, 1st Sunday = Dec 6
      expect(getAutoAssignedType(new Date(2026, 11, 6))).toBe('testimony_meeting');
    });

    it('2nd+ Sunday is speeches (default)', () => {
      // January 2026, 2nd Sunday = Jan 11
      expect(getAutoAssignedType(new Date(2026, 0, 11))).toBe('speeches');
      // March 2026, 3rd Sunday = Mar 15
      expect(getAutoAssignedType(new Date(2026, 2, 15))).toBe('speeches');
    });
  });

  describe('April and October (conference months)', () => {
    it('1st Sunday is general_conference', () => {
      // April 2026, 1st Sunday = Apr 5
      expect(getAutoAssignedType(new Date(2026, 3, 5))).toBe('general_conference');
      // October 2026, 1st Sunday = Oct 4
      expect(getAutoAssignedType(new Date(2026, 9, 4))).toBe('general_conference');
    });

    it('2nd Sunday is testimony_meeting', () => {
      // April 2026, 2nd Sunday = Apr 12
      expect(getAutoAssignedType(new Date(2026, 3, 12))).toBe('testimony_meeting');
      // October 2026, 2nd Sunday = Oct 11
      expect(getAutoAssignedType(new Date(2026, 9, 11))).toBe('testimony_meeting');
    });

    it('3rd+ Sunday is speeches (default)', () => {
      // April 2026, 3rd Sunday = Apr 19
      expect(getAutoAssignedType(new Date(2026, 3, 19))).toBe('speeches');
      // October 2026, 4th Sunday = Oct 25
      expect(getAutoAssignedType(new Date(2026, 9, 25))).toBe('speeches');
    });
  });
});

// ==========================================================================
// 3. SUNDAY_TYPE constants (AC-082-21)
// ==========================================================================

describe('Sunday type constants', () => {
  it('SUNDAY_TYPE_SPEECHES is "speeches"', () => {
    expect(SUNDAY_TYPE_SPEECHES).toBe('speeches');
  });

  it('SUNDAY_TYPE_OPTIONS contains all 7 types', () => {
    expect(SUNDAY_TYPE_OPTIONS).toHaveLength(7);
    expect(SUNDAY_TYPE_OPTIONS).toContain('speeches');
    expect(SUNDAY_TYPE_OPTIONS).toContain('testimony_meeting');
    expect(SUNDAY_TYPE_OPTIONS).toContain('general_conference');
    expect(SUNDAY_TYPE_OPTIONS).toContain('stake_conference');
    expect(SUNDAY_TYPE_OPTIONS).toContain('ward_conference');
    expect(SUNDAY_TYPE_OPTIONS).toContain('primary_presentation');
    expect(SUNDAY_TYPE_OPTIONS).toContain('other');
  });
});

// ==========================================================================
// 4. useAutoAssignSundayTypes + useSundayExceptions (AC-082-22)
// ==========================================================================

describe('useAutoAssignSundayTypes integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  it('auto-assigns sunday types for missing dates', async () => {
    let callCount = 0;
    mockedSupabase.from.mockImplementation(() => {
      callCount++;
      // 1st call: select existing -> empty
      // 2nd call: insert -> success
      const response = callCount === 1
        ? { data: [], error: null }
        : { data: null, error: null };
      const resolvedPromise = Promise.resolve(response);
      const chain: any = new Proxy({}, {
        get(_t, p: string) {
          if (p === 'then') return resolvedPromise.then.bind(resolvedPromise);
          if (p === 'catch') return resolvedPromise.catch.bind(resolvedPromise);
          if (p === 'finally') return resolvedPromise.finally.bind(resolvedPromise);
          return () => chain;
        },
      });
      return chain;
    });

    const wrapper = createWrapper(undefined, queryClient);
    const { result } = renderHook(() => useAutoAssignSundayTypes(), { wrapper });

    await act(async () => {
      const count = await result.current.mutateAsync(['2026-03-01', '2026-03-08']);
      expect(count).toBe(2);
    });
  });

  it('returns 0 when all dates already have entries', async () => {
    mockedSupabase.from.mockImplementation(() => {
      const response = {
        data: [
          { date: '2026-03-01' },
          { date: '2026-03-08' },
        ],
        error: null,
      };
      const resolvedPromise = Promise.resolve(response);
      const chain: any = new Proxy({}, {
        get(_t, p: string) {
          if (p === 'then') return resolvedPromise.then.bind(resolvedPromise);
          if (p === 'catch') return resolvedPromise.catch.bind(resolvedPromise);
          if (p === 'finally') return resolvedPromise.finally.bind(resolvedPromise);
          return () => chain;
        },
      });
      return chain;
    });

    const wrapper = createWrapper(undefined, queryClient);
    const { result } = renderHook(() => useAutoAssignSundayTypes(), { wrapper });

    await act(async () => {
      const count = await result.current.mutateAsync(['2026-03-01', '2026-03-08']);
      expect(count).toBe(0);
    });
  });

  it('returns 0 for empty array', async () => {
    const wrapper = createWrapper(undefined, queryClient);
    const { result } = renderHook(() => useAutoAssignSundayTypes(), { wrapper });

    await act(async () => {
      const count = await result.current.mutateAsync([]);
      expect(count).toBe(0);
    });
  });
});

describe('useSundayExceptions integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  it('fetches exceptions for date range', async () => {
    const mockExceptions = [
      createMockSundayException({ date: '2026-03-01', reason: 'testimony_meeting' }),
      createMockSundayException({ id: 'ex-2', date: '2026-03-08', reason: 'speeches' }),
    ];
    mockSupabaseFrom(mockedSupabase, 'sunday_exceptions', { data: mockExceptions, error: null });

    const wrapper = createWrapper(undefined, queryClient);
    const { result } = renderHook(
      () => useSundayExceptions('2026-03-01', '2026-03-31'),
      { wrapper }
    );

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toHaveLength(2);
  });
});

describe('useRemoveSundayException integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  it('reverts exception to speeches type', async () => {
    mockSupabaseFrom(mockedSupabase, 'sunday_exceptions', { data: null, error: null });

    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = createWrapper(undefined, queryClient);
    const { result } = renderHook(() => useRemoveSundayException(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('2026-03-01');
    });

    expect(spy).toHaveBeenCalled();
  });
});

// ==========================================================================
// EC-082-11: Edge case dates
// ==========================================================================

describe('Edge case dates (EC-082-11)', () => {
  it('handles January 1st (if it is a Sunday)', () => {
    // Jan 1, 2023 was a Sunday
    const result = getAutoAssignedType(new Date(2023, 0, 1));
    expect(result).toBe('testimony_meeting');
  });

  it('handles December 31st (if it is a Sunday)', () => {
    // Dec 31, 2023 was a Sunday (5th Sunday)
    const result = getAutoAssignedType(new Date(2023, 11, 31));
    expect(result).toBe('speeches');
  });

  it('handles February 29th in leap year', () => {
    // Feb 29, 2032 is a Sunday (5th Sunday)
    const result = getAutoAssignedType(new Date(2032, 1, 29));
    expect(result).toBe('speeches');
  });
});

// ==========================================================================
// EC-082-12: Boundary of Sunday number in month
// ==========================================================================

describe('Boundary Sunday number (EC-082-12)', () => {
  it('day 7 is still 1st Sunday', () => {
    expect(getSundayOfMonth(new Date(2026, 0, 7))).toBe(1);
  });

  it('day 8 is 2nd Sunday', () => {
    expect(getSundayOfMonth(new Date(2026, 0, 8))).toBe(2);
  });

  it('day 14 is still 2nd Sunday', () => {
    expect(getSundayOfMonth(new Date(2026, 0, 14))).toBe(2);
  });

  it('day 15 is 3rd Sunday', () => {
    expect(getSundayOfMonth(new Date(2026, 0, 15))).toBe(3);
  });
});
