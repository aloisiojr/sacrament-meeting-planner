/**
 * Tests for the useChangeStatus concurrency guard (P2): the UPDATE is conditioned on the status
 * we validated (.eq('status', current)). If another device changed it in between, 0 rows update and
 * the mutation surfaces a retry error instead of silently applying an unvalidated transition.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  renderHook,
  createTestQueryClient,
  createWrapper,
  createMockSpeech,
} from './integration/setup-integration';
import { act } from 'react';

import { supabase } from '../lib/supabase';
import { useChangeStatus } from '../hooks/useSpeeches';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));
vi.mock('../lib/activityLog', () => ({ logAction: vi.fn(), buildLogDescription: vi.fn(() => 'd') }));
vi.mock('../i18n', () => ({
  getCurrentLanguage: vi.fn(() => 'pt-BR'), changeLanguage: vi.fn(), initI18n: vi.fn(),
  SUPPORTED_LANGUAGES: ['pt-BR', 'en-US', 'es-LA'],
  default: { language: 'pt-BR', isInitialized: true, use: vi.fn().mockReturnThis(), init: vi.fn() },
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'pt-BR', changeLanguage: vi.fn() } }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

const mockedSupabase = vi.mocked(supabase);

/**
 * Wire supabase.from('speeches') to serve the status fetch (select→eq→single) and the guarded
 * update (update→eq→eq→select→maybeSingle). `updateResult` is what maybeSingle resolves to.
 */
function mockChain(currentStatus: string, updateResult: unknown) {
  const single = vi.fn().mockResolvedValue({ data: { status: currentStatus }, error: null });
  const selectFetch = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single }) });

  const maybeSingle = vi.fn().mockResolvedValue({ data: updateResult, error: null });
  const selectUpdate = vi.fn().mockReturnValue({ maybeSingle });
  const eq2 = vi.fn().mockReturnValue({ select: selectUpdate });
  const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
  const update = vi.fn().mockReturnValue({ eq: eq1 });

  (mockedSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
    select: selectFetch,
    update,
  });
}

describe('useChangeStatus concurrency guard', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>;
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  it('applies the change when the guarded update returns the row', async () => {
    const updated = createMockSpeech({ id: 's1', status: 'assigned_invited' });
    mockChain('assigned_not_invited', updated);
    const wrapper = createWrapper({ role: 'secretary' }, queryClient);
    const { result } = renderHook(() => useChangeStatus(), { wrapper });

    let out: unknown;
    await act(async () => {
      out = await result.current.mutateAsync({ speechId: 's1', status: 'assigned_invited' });
    });
    expect((out as { status: string }).status).toBe('assigned_invited');
  });

  it('throws a retry error when the status changed concurrently (0 rows updated)', async () => {
    // Guard matched no row → maybeSingle resolves null.
    mockChain('assigned_not_invited', null);
    const wrapper = createWrapper({ role: 'secretary' }, queryClient);
    const { result } = renderHook(() => useChangeStatus(), { wrapper });

    await expect(
      act(async () => {
        await result.current.mutateAsync({ speechId: 's1', status: 'assigned_invited' });
      })
    ).rejects.toThrow(/concurrently/i);
  });
});
