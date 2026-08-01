/**
 * Tests for useSpeeches mutation hooks: assigned_by_role inclusion.
 * Verifies that useAssignSpeaker, useAssignTopic, and useRemoveAssignment
 * include assigned_by_role in their update payloads.
 */

import {
  renderHook,
  createTestQueryClient,
  createWrapper,
  createMockSpeech,
} from './integration/setup-integration';
import { act } from 'react';

import { supabase } from '../lib/supabase';
import { useAssignSpeaker, useAssignTopic, useRemoveAssignment } from '../hooks/useSpeeches';

// --- Module mocks ---

jest.mock('../lib/supabase', () => ({
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

jest.mock('../lib/activityLog', () => ({
  logAction: jest.fn(),
  buildLogDescription: jest.fn(() => 'test description'),
}));

jest.mock('../i18n', () => ({
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

jest.mock('../lib/dateUtils', () => {
  const actual = jest.requireActual<typeof import('../lib/dateUtils')>('../lib/dateUtils');
  return {
    ...actual,
    formatDateHumanReadable: (dateStr: string) => dateStr,
  };
});

const mockedSupabase = jest.mocked(supabase);

// Track .update() calls to verify payload
let lastUpdatePayload: Record<string, unknown> | null = null;

function mockUpdateChain(returnData: unknown) {
  lastUpdatePayload = null;
  const single = jest.fn().mockResolvedValue({ data: returnData, error: null });
  const select = jest.fn().mockReturnValue({ single });
  const eq = jest.fn().mockReturnValue({ select });
  const updateFn = jest.fn().mockImplementation((payload: Record<string, unknown>) => {
    lastUpdatePayload = payload;
    return { eq };
  });

  (mockedSupabase.from as ReturnType<typeof jest.fn>).mockReturnValue({
    update: updateFn,
  });
}

describe('useSpeeches mutations - assigned_by_role', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>;

  beforeEach(() => {
    jest.clearAllMocks();
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
