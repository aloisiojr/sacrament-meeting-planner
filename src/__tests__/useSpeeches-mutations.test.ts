/**
 * Tests for useSpeeches mutation hooks: assigned_by_role inclusion.
 * Verifies that useAssignSpeaker, useAssignTopic, and useRemoveAssignment
 * include assigned_by_role in their update payloads.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  renderHook,
  waitFor,
  createTestQueryClient,
  createWrapper,
  mockSupabaseFrom,
  createMockSpeech,
} from './integration/setup-integration';
import { act } from 'react';

// --- Module mocks ---

vi.mock('../lib/supabase', () => ({
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

vi.mock('../lib/activityLog', () => ({
  logAction: vi.fn(),
  buildLogDescription: vi.fn(() => 'test description'),
}));

vi.mock('../i18n', () => ({
  getCurrentLanguage: vi.fn(() => 'pt-BR'),
  changeLanguage: vi.fn(),
  initI18n: vi.fn(),
  SUPPORTED_LANGUAGES: ['pt-BR', 'en-US', 'es-LA'],
  default: { language: 'pt-BR', isInitialized: true, use: vi.fn().mockReturnThis(), init: vi.fn() },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'pt-BR', changeLanguage: vi.fn() },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

vi.mock('../lib/dateUtils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/dateUtils')>();
  return {
    ...actual,
    formatDateHumanReadable: (dateStr: string) => dateStr,
  };
});

import { supabase } from '../lib/supabase';
import { useAssignSpeaker, useAssignTopic, useRemoveAssignment } from '../hooks/useSpeeches';

const mockedSupabase = vi.mocked(supabase);

// Track .update() calls to verify payload
let lastUpdatePayload: Record<string, unknown> | null = null;

function mockUpdateChain(returnData: unknown) {
  lastUpdatePayload = null;
  const single = vi.fn().mockResolvedValue({ data: returnData, error: null });
  const select = vi.fn().mockReturnValue({ single });
  const eq = vi.fn().mockReturnValue({ select });
  const updateFn = vi.fn().mockImplementation((payload: Record<string, unknown>) => {
    lastUpdatePayload = payload;
    return { eq };
  });

  (mockedSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
    update: updateFn,
  });
}

describe('useSpeeches mutations - assigned_by_role', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
    lastUpdatePayload = null;
  });

  it('useAssignSpeaker includes assigned_by_role in update payload', async () => {
    const mockSpeech = createMockSpeech({
      id: 's1',
      speaker_name: 'Maria',
      status: 'assigned_not_invited',
      assigned_by_role: 'secretary',
    });
    mockUpdateChain(mockSpeech);

    const wrapper = createWrapper({ role: 'secretary' }, queryClient);
    const { result } = renderHook(() => useAssignSpeaker(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        speechId: 's1',
        memberId: 'm1',
        speakerName: 'Maria',
        speakerInformalName: null,
        speakerPhone: null,
      });
    });

    expect(lastUpdatePayload).toBeDefined();
    expect(lastUpdatePayload!.assigned_by_role).toBe('secretary');
  });

  it('useAssignTopic includes assigned_by_role in update payload', async () => {
    const mockSpeech = createMockSpeech({
      id: 's1',
      topic_title: 'Faith',
      topic_collection: 'Ward Topics',
      assigned_by_role: 'bishopric',
    });
    mockUpdateChain(mockSpeech);

    const wrapper = createWrapper({ role: 'bishopric' }, queryClient);
    const { result } = renderHook(() => useAssignTopic(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        speechId: 's1',
        topicTitle: 'Faith',
        topicCollection: 'Ward Topics',
      });
    });

    expect(lastUpdatePayload).toBeDefined();
    expect(lastUpdatePayload!.assigned_by_role).toBe('bishopric');
  });

  it('useRemoveAssignment includes assigned_by_role in update payload', async () => {
    const mockSpeech = createMockSpeech({
      id: 's1',
      member_id: null,
      speaker_name: null,
      status: 'not_assigned',
      assigned_by_role: 'secretary',
    });
    mockUpdateChain(mockSpeech);

    const wrapper = createWrapper({ role: 'secretary' }, queryClient);
    const { result } = renderHook(() => useRemoveAssignment(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        speechId: 's1',
        speakerName: 'Maria',
      });
    });

    expect(lastUpdatePayload).toBeDefined();
    expect(lastUpdatePayload!.assigned_by_role).toBe('secretary');
  });

  it('assigned_by_role matches the role from useAuth', async () => {
    const mockSpeech = createMockSpeech({
      id: 's1',
      speaker_name: 'Pedro',
      status: 'assigned_not_invited',
      assigned_by_role: 'bishopric',
    });
    mockUpdateChain(mockSpeech);

    // Test with bishopric role
    const wrapper = createWrapper({ role: 'bishopric' }, queryClient);
    const { result } = renderHook(() => useAssignSpeaker(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        speechId: 's1',
        memberId: 'm1',
        speakerName: 'Pedro',
        speakerInformalName: null,
        speakerPhone: null,
      });
    });

    expect(lastUpdatePayload!.assigned_by_role).toBe('bishopric');
  });
});
