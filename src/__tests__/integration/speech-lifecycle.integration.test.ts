/**
 * Integration tests: Speech Lifecycle (Category 5)
 * Tests status transitions, assignment, and lifecycle validation.
 *
 * Covers: AC-082-23 to AC-082-26, EC-082-13, EC-082-14
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createTestQueryClient,
  createWrapper,
  renderHook,
  act,
  mockSupabaseFrom,
  createMockSpeech,
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
  VALID_TRANSITIONS,
  isValidTransition,
  getAvailableStatuses,
  useAssignSpeaker,
  useAssignTopic,
  useRemoveAssignment,
  useChangeStatus,
} from '../../hooks/useSpeeches';
import type { SpeechStatus } from '../../types/database';
import type { QueryClient } from '@tanstack/react-query';

const mockedSupabase = vi.mocked(supabase);

// ==========================================================================
// 1. VALID_TRANSITIONS map (AC-082-23)
// ==========================================================================

describe('VALID_TRANSITIONS map', () => {
  it('not_assigned can only go to assigned_not_invited', () => {
    expect(VALID_TRANSITIONS.not_assigned).toEqual(['assigned_not_invited']);
  });

  it('assigned_not_invited can go to invited, confirmed, gave_up, or unassign', () => {
    const expected: SpeechStatus[] = ['assigned_invited', 'assigned_confirmed', 'gave_up', 'not_assigned'];
    expect(VALID_TRANSITIONS.assigned_not_invited).toEqual(expected);
  });

  it('assigned_invited can go to not_invited, confirmed, gave_up, or unassign', () => {
    const expected: SpeechStatus[] = ['assigned_not_invited', 'assigned_confirmed', 'gave_up', 'not_assigned'];
    expect(VALID_TRANSITIONS.assigned_invited).toEqual(expected);
  });

  it('assigned_confirmed can go to not_invited, invited, gave_up, or unassign', () => {
    const expected: SpeechStatus[] = ['assigned_not_invited', 'assigned_invited', 'gave_up', 'not_assigned'];
    expect(VALID_TRANSITIONS.assigned_confirmed).toEqual(expected);
  });

  it('gave_up can go to not_invited, invited, confirmed, or unassign', () => {
    const expected: SpeechStatus[] = ['assigned_not_invited', 'assigned_invited', 'assigned_confirmed', 'not_assigned'];
    expect(VALID_TRANSITIONS.gave_up).toEqual(expected);
  });

  it('every status has at least one valid transition', () => {
    const allStatuses: SpeechStatus[] = [
      'not_assigned',
      'assigned_not_invited',
      'assigned_invited',
      'assigned_confirmed',
      'gave_up',
    ];
    for (const status of allStatuses) {
      expect(VALID_TRANSITIONS[status].length).toBeGreaterThan(0);
    }
  });
});

// ==========================================================================
// 2. isValidTransition (AC-082-24)
// ==========================================================================

describe('isValidTransition', () => {
  it('returns true for valid transitions', () => {
    expect(isValidTransition('not_assigned', 'assigned_not_invited')).toBe(true);
    expect(isValidTransition('assigned_not_invited', 'assigned_invited')).toBe(true);
    expect(isValidTransition('assigned_not_invited', 'assigned_confirmed')).toBe(true);
    expect(isValidTransition('assigned_not_invited', 'gave_up')).toBe(true);
    expect(isValidTransition('assigned_invited', 'assigned_confirmed')).toBe(true);
    expect(isValidTransition('assigned_confirmed', 'not_assigned')).toBe(true);
  });

  it('returns false for invalid transitions', () => {
    expect(isValidTransition('not_assigned', 'assigned_confirmed')).toBe(false);
    expect(isValidTransition('not_assigned', 'assigned_invited')).toBe(false);
    expect(isValidTransition('not_assigned', 'gave_up')).toBe(false);
  });

  it('returns false for self-transitions', () => {
    expect(isValidTransition('not_assigned', 'not_assigned')).toBe(false);
    expect(isValidTransition('assigned_not_invited', 'assigned_not_invited')).toBe(false);
    expect(isValidTransition('assigned_invited', 'assigned_invited')).toBe(false);
    expect(isValidTransition('assigned_confirmed', 'assigned_confirmed')).toBe(false);
    expect(isValidTransition('gave_up', 'gave_up')).toBe(false);
  });
});

// ==========================================================================
// 3. getAvailableStatuses (AC-082-25)
// ==========================================================================

describe('getAvailableStatuses', () => {
  it('returns valid next statuses for each status', () => {
    expect(getAvailableStatuses('not_assigned')).toEqual(['assigned_not_invited']);
    expect(getAvailableStatuses('assigned_not_invited')).toHaveLength(4);
    expect(getAvailableStatuses('assigned_invited')).toHaveLength(4);
    expect(getAvailableStatuses('assigned_confirmed')).toHaveLength(4);
    expect(getAvailableStatuses('gave_up')).toHaveLength(4);
  });

  it('returns empty for unknown status', () => {
    expect(getAvailableStatuses('unknown' as SpeechStatus)).toEqual([]);
  });
});

// ==========================================================================
// 4. Assign speaker flow (AC-082-26)
// ==========================================================================

describe('Assign speaker lifecycle', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  it('assigns speaker with member info and sets assigned_not_invited', async () => {
    const assignedSpeech = createMockSpeech({
      id: 's1',
      member_id: 'member-1',
      speaker_name: 'John Doe',
      speaker_phone: '+5511999999999',
      status: 'assigned_not_invited',
    });
    mockSupabaseFrom(mockedSupabase, 'speeches', { data: assignedSpeech, error: null });

    const wrapper = createWrapper(undefined, queryClient);
    const { result } = renderHook(() => useAssignSpeaker(), { wrapper });

    await act(async () => {
      const speech = await result.current.mutateAsync({
        speechId: 's1',
        memberId: 'member-1',
        speakerName: 'John Doe',
        speakerPhone: '+5511999999999',
      });
      expect(speech.status).toBe('assigned_not_invited');
      expect(speech.member_id).toBe('member-1');
      expect(speech.speaker_name).toBe('John Doe');
    });
  });

  it('assigns topic to speech', async () => {
    const speechWithTopic = createMockSpeech({
      id: 's1',
      topic_title: 'Faith in Action',
      topic_link: 'https://example.com',
      topic_collection: 'Ward Topics',
    });
    mockSupabaseFrom(mockedSupabase, 'speeches', { data: speechWithTopic, error: null });

    const wrapper = createWrapper(undefined, queryClient);
    const { result } = renderHook(() => useAssignTopic(), { wrapper });

    await act(async () => {
      const speech = await result.current.mutateAsync({
        speechId: 's1',
        topicTitle: 'Faith in Action',
        topicLink: 'https://example.com',
        topicCollection: 'Ward Topics',
      });
      expect(speech.topic_title).toBe('Faith in Action');
    });
  });

  it('unassigns speaker and resets to not_assigned', async () => {
    const unassignedSpeech = createMockSpeech({
      id: 's1',
      member_id: null,
      speaker_name: null,
      speaker_phone: null,
      status: 'not_assigned',
    });
    mockSupabaseFrom(mockedSupabase, 'speeches', { data: unassignedSpeech, error: null });

    const wrapper = createWrapper(undefined, queryClient);
    const { result } = renderHook(() => useRemoveAssignment(), { wrapper });

    await act(async () => {
      const { speech } = await result.current.mutateAsync({
        speechId: 's1',
        speakerName: 'John Doe',
      });
      expect(speech.status).toBe('not_assigned');
      expect(speech.member_id).toBeNull();
    });
  });
});

// ==========================================================================
// EC-082-13: Full lifecycle sequence
// ==========================================================================

describe('Full lifecycle sequence (EC-082-13)', () => {
  it('validates complete lifecycle: not_assigned -> assigned_not_invited -> invited -> confirmed', () => {
    expect(isValidTransition('not_assigned', 'assigned_not_invited')).toBe(true);
    expect(isValidTransition('assigned_not_invited', 'assigned_invited')).toBe(true);
    expect(isValidTransition('assigned_invited', 'assigned_confirmed')).toBe(true);
  });

  it('validates gave_up path: not_assigned -> assigned_not_invited -> gave_up', () => {
    expect(isValidTransition('not_assigned', 'assigned_not_invited')).toBe(true);
    expect(isValidTransition('assigned_not_invited', 'gave_up')).toBe(true);
  });

  it('validates recovery from gave_up: gave_up -> assigned_not_invited', () => {
    expect(isValidTransition('gave_up', 'assigned_not_invited')).toBe(true);
  });

  it('validates unassign from any assigned state', () => {
    expect(isValidTransition('assigned_not_invited', 'not_assigned')).toBe(true);
    expect(isValidTransition('assigned_invited', 'not_assigned')).toBe(true);
    expect(isValidTransition('assigned_confirmed', 'not_assigned')).toBe(true);
    expect(isValidTransition('gave_up', 'not_assigned')).toBe(true);
  });
});

// ==========================================================================
// EC-082-14: Invalid transition error message
// ==========================================================================

describe('Invalid transition error (EC-082-14)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  it('throws with descriptive error on invalid transition', async () => {
    // Mock: current status is not_assigned
    mockedSupabase.from.mockImplementation(() => {
      const response = { data: { status: 'not_assigned' }, error: null };
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
    const { result } = renderHook(() => useChangeStatus(), { wrapper });

    let error: any;
    try {
      await act(async () => {
        await result.current.mutateAsync({
          speechId: 's1',
          status: 'assigned_confirmed', // Invalid from not_assigned
        });
      });
    } catch (e) {
      error = e;
    }

    expect(error).toBeDefined();
    expect(error?.message).toContain('Invalid status transition');
    expect(error?.message).toContain('not_assigned');
    expect(error?.message).toContain('assigned_confirmed');
  });
});
