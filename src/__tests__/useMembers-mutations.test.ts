/**
 * Tests for the useUpdateMember future-speeches cascade (v2.0).
 *
 * Editing a member cascades speaker_* AND the contact-delegation snapshot
 * (contact_phone / is_delegated / delegate_for_name) onto that member's
 * not-yet-past speeches, so not-yet-sent invites stay consistent with the
 * member's live phone/delegation state.
 */

import {
  renderHook,
  createTestQueryClient,
  createWrapper,
  createMockMember,
  act,
} from './integration/setup-integration';

import { supabase } from '../lib/supabase';
import { useUpdateMember, memberKeys } from '../hooks/useMembers';
import type { Member } from '../types/database';

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

const mockedSupabase = jest.mocked(supabase);

// Capture the payload passed to the speeches cascade update.
let lastSpeechesUpdate: Record<string, unknown> | null = null;

function setupMocks(updatedMember: Member) {
  lastSpeechesUpdate = null;

  // members: update().eq().select().single()
  const memberSingle = jest.fn().mockResolvedValue({ data: updatedMember, error: null });
  const memberSelect = jest.fn().mockReturnValue({ single: memberSingle });
  const memberEq = jest.fn().mockReturnValue({ select: memberSelect });
  const memberUpdate = jest.fn().mockReturnValue({ eq: memberEq });

  // speeches: update().eq().gte()  → awaited
  const speechGte = jest.fn().mockResolvedValue({ data: null, error: null });
  const speechEq = jest.fn().mockReturnValue({ gte: speechGte });
  const speechUpdate = jest.fn().mockImplementation((payload: Record<string, unknown>) => {
    lastSpeechesUpdate = payload;
    return { eq: speechEq };
  });

  (mockedSupabase.from as ReturnType<typeof jest.fn>).mockImplementation((table: string) => {
    if (table === 'members') return { update: memberUpdate };
    if (table === 'speeches') return { update: speechUpdate };
    return {};
  });
}

describe('useUpdateMember — contact-snapshot cascade', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = createTestQueryClient();
    lastSpeechesUpdate = null;
  });

  it('recomputes the DELEGATED contact snapshot for future speeches when a member is edited', async () => {
    const responsible = createMockMember({
      id: 'resp-1',
      full_name: 'Responsible Parent',
      country_code: '+55',
      phone: '11999998888',
    });
    // Seed the member cache so the cascade can resolve the responsible.
    queryClient.setQueryData(memberKeys.list('ward-1'), [responsible]);

    const updatedMember = createMockMember({
      id: 'm1',
      full_name: 'Ana Menor',
      informal_name: 'Ana',
      country_code: '+55',
      phone: '11000000000',
      contact_via_responsible: true,
      responsible_id: 'resp-1',
    });
    setupMocks(updatedMember);

    const wrapper = createWrapper({}, queryClient);
    const { result } = renderHook(() => useUpdateMember(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 'm1', full_name: 'Ana Menor' });
    });

    expect(lastSpeechesUpdate).not.toBeNull();
    expect(lastSpeechesUpdate).toMatchObject({
      speaker_name: 'Ana Menor',
      speaker_informal_name: 'Ana',
      contact_phone: '+5511999998888',
      is_delegated: true,
      delegate_for_name: 'Ana',
    });
  });

  it('recomputes a NON-delegated contact snapshot (own phone) for a direct member', async () => {
    const updatedMember = createMockMember({
      id: 'm2',
      full_name: 'Direct Member',
      informal_name: 'Direct',
      country_code: '+55',
      phone: '11987654321',
      contact_via_responsible: false,
      responsible_id: null,
    });
    setupMocks(updatedMember);

    const wrapper = createWrapper({}, queryClient);
    const { result } = renderHook(() => useUpdateMember(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 'm2', full_name: 'Direct Member' });
    });

    expect(lastSpeechesUpdate).not.toBeNull();
    expect(lastSpeechesUpdate).toMatchObject({
      contact_phone: '+5511987654321',
      is_delegated: false,
      delegate_for_name: null,
    });
  });

  it('falls back to own phone (not delegated) when the responsible has no phone', async () => {
    const responsible = createMockMember({
      id: 'resp-2',
      full_name: 'Phoneless Parent',
      phone: null,
    });
    queryClient.setQueryData(memberKeys.list('ward-1'), [responsible]);

    const updatedMember = createMockMember({
      id: 'm3',
      full_name: 'Ana',
      informal_name: 'Ana',
      country_code: '+55',
      phone: '11987654321',
      contact_via_responsible: true,
      responsible_id: 'resp-2',
    });
    setupMocks(updatedMember);

    const wrapper = createWrapper({}, queryClient);
    const { result } = renderHook(() => useUpdateMember(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 'm3', full_name: 'Ana' });
    });

    expect(lastSpeechesUpdate).not.toBeNull();
    expect(lastSpeechesUpdate).toMatchObject({
      contact_phone: '+5511987654321',
      is_delegated: false,
      delegate_for_name: null,
    });
  });
});
