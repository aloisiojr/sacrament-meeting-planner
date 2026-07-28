/**
 * Tests for the useUpdateMember future-speeches cascade (v2.0).
 *
 * Editing a member cascades speaker_* AND the contact-delegation snapshot
 * (contact_phone / is_delegated / delegate_for_name) onto that member's
 * not-yet-past speeches, so not-yet-sent invites stay consistent with the
 * member's live phone/delegation state.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
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

const mockedSupabase = vi.mocked(supabase);

// Capture the payload passed to the speeches cascade update.
let lastSpeechesUpdate: Record<string, unknown> | null = null;

function setupMocks(updatedMember: Member) {
  lastSpeechesUpdate = null;

  // members: update().eq().select().single()
  const memberSingle = vi.fn().mockResolvedValue({ data: updatedMember, error: null });
  const memberSelect = vi.fn().mockReturnValue({ single: memberSingle });
  const memberEq = vi.fn().mockReturnValue({ select: memberSelect });
  const memberUpdate = vi.fn().mockReturnValue({ eq: memberEq });

  // speeches: update().eq().gte()  → awaited
  const speechGte = vi.fn().mockResolvedValue({ data: null, error: null });
  const speechEq = vi.fn().mockReturnValue({ gte: speechGte });
  const speechUpdate = vi.fn().mockImplementation((payload: Record<string, unknown>) => {
    lastSpeechesUpdate = payload;
    return { eq: speechEq };
  });

  (mockedSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
    if (table === 'members') return { update: memberUpdate };
    if (table === 'speeches') return { update: speechUpdate };
    return {};
  });
}

describe('useUpdateMember — contact-snapshot cascade', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>;

  beforeEach(() => {
    vi.clearAllMocks();
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
