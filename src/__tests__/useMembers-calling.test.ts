/**
 * Tests that the member `calling` (chamado) field is persisted by the mutation hooks (v2.0).
 *
 * - useCreateMember whitelists columns in its INSERT → `calling` must be included.
 * - useUpdateMember is pass-through → `calling` must reach the UPDATE payload.
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
import { useCreateMember, useUpdateMember } from '../hooks/useMembers';
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

describe('useCreateMember — calling', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>;
  let lastInsert: Record<string, unknown> | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
    lastInsert = null;
  });

  function setupInsert(returned: Member) {
    const single = vi.fn().mockResolvedValue({ data: returned, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockImplementation((payload: Record<string, unknown>) => {
      lastInsert = payload;
      return { select };
    });
    (mockedSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'members') return { insert };
      return {};
    });
  }

  it('includes the calling in the INSERT payload', async () => {
    setupInsert(createMockMember({ id: 'm1', full_name: 'Ricardo Almeida', calling: 'Bispo' }));

    const wrapper = createWrapper({}, queryClient);
    const { result } = renderHook(() => useCreateMember(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        full_name: 'Ricardo Almeida',
        country_code: '+55',
        calling: 'Bispo',
      });
    });

    expect(lastInsert).not.toBeNull();
    expect(lastInsert).toMatchObject({ full_name: 'Ricardo Almeida', calling: 'Bispo' });
  });

  it('defaults calling to null when not provided', async () => {
    setupInsert(createMockMember({ id: 'm2', full_name: 'Paulo Costa' }));

    const wrapper = createWrapper({}, queryClient);
    const { result } = renderHook(() => useCreateMember(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ full_name: 'Paulo Costa', country_code: '+55' });
    });

    expect(lastInsert).not.toBeNull();
    expect(lastInsert).toMatchObject({ calling: null });
  });
});

describe('useUpdateMember — calling', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>;
  let lastUpdate: Record<string, unknown> | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
    lastUpdate = null;
  });

  function setupUpdate(returned: Member) {
    const single = vi.fn().mockResolvedValue({ data: returned, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockImplementation((payload: Record<string, unknown>) => {
      lastUpdate = payload;
      return { eq };
    });

    // speeches cascade (best-effort) in onSuccess
    const speechGte = vi.fn().mockResolvedValue({ data: null, error: null });
    const speechEq = vi.fn().mockReturnValue({ gte: speechGte });
    const speechUpdate = vi.fn().mockReturnValue({ eq: speechEq });

    (mockedSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'members') return { update };
      if (table === 'speeches') return { update: speechUpdate };
      return {};
    });
  }

  it('passes the updated calling through to the UPDATE payload', async () => {
    setupUpdate(
      createMockMember({ id: 'm1', full_name: 'Ricardo Almeida', calling: '1º Conselheiro' })
    );

    const wrapper = createWrapper({}, queryClient);
    const { result } = renderHook(() => useUpdateMember(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 'm1', calling: '1º Conselheiro' });
    });

    expect(lastUpdate).not.toBeNull();
    expect(lastUpdate).toMatchObject({ calling: '1º Conselheiro' });
  });
});
