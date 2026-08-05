/**
 * Tests for the useChangeStatus concurrency guard (P2): the UPDATE is conditioned on the status
 * we validated (.eq('status', current)). If another device changed it in between, 0 rows update and
 * the mutation surfaces a retry error instead of silently applying an unvalidated transition.
 */
import {
  renderHook,
  createTestQueryClient,
  createWrapper,
  createMockSpeech,
} from './integration/setup-integration';
import { act } from 'react';

import { supabase } from '../lib/supabase';
import { useChangeStatus } from '../hooks/useSpeeches';

jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    channel: jest.fn(),
    removeChannel: jest.fn(),
  },
}));
jest.mock('../lib/activityLog', () => ({ logAction: jest.fn(), buildLogDescription: jest.fn(() => 'd') }));
jest.mock('../i18n', () => ({
  getCurrentLanguage: jest.fn(() => 'pt-BR'), changeLanguage: jest.fn(), initI18n: jest.fn(),
  SUPPORTED_LANGUAGES: ['pt-BR', 'en-US', 'es-LA'],
  default: { language: 'pt-BR', isInitialized: true, use: jest.fn().mockReturnThis(), init: jest.fn() },
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'pt-BR', changeLanguage: jest.fn() } }),
  initReactI18next: { type: '3rdParty', init: jest.fn() },
}));

const mockedSupabase = jest.mocked(supabase);

/**
 * Wire supabase.from('speeches') to serve the status fetch (select→eq→single) and the guarded
 * update (update→eq→eq→select→maybeSingle). `updateResult` is what maybeSingle resolves to.
 */
function mockChain(currentStatus: string, updateResult: unknown) {
  const single = jest.fn().mockResolvedValue({ data: { status: currentStatus }, error: null });
  const selectFetch = jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single }) });

  const maybeSingle = jest.fn().mockResolvedValue({ data: updateResult, error: null });
  const selectUpdate = jest.fn().mockReturnValue({ maybeSingle });
  const eq2 = jest.fn().mockReturnValue({ select: selectUpdate });
  const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
  const update = jest.fn().mockReturnValue({ eq: eq1 });

  (mockedSupabase.from as ReturnType<typeof jest.fn>).mockReturnValue({
    select: selectFetch,
    update,
  });
}

describe('useChangeStatus concurrency guard', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>;
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('treats a change to the status it already has as nothing to do', async () => {
    // Reported 2026-08-05: re-sending an invite ("Re-enviar convite") to a speech already marked
    // invited raised "Invalid status transition: assigned_invited -> assigned_invited". Re-sending
    // is supported, so asking for the current status must be a no-op — not an error, not a write,
    // and not an activity-log entry claiming a change that never happened.
    mockChain('assigned_invited', createMockSpeech({ id: 's1', status: 'assigned_invited' }));
    const { logAction } = jest.requireMock<{ logAction: jest.Mock }>('../lib/activityLog');
    const wrapper = createWrapper({ role: 'secretary' }, queryClient);
    const { result } = renderHook(() => useChangeStatus(), { wrapper });

    let out: unknown = 'unset';
    await act(async () => {
      out = await result.current.mutateAsync({ speechId: 's1', status: 'assigned_invited' });
    });

    expect(out).toBeNull();
    const from = mockedSupabase.from as ReturnType<typeof jest.fn>;
    const updateCalled = from.mock.results.some((r) => (r.value as { update: jest.Mock }).update.mock.calls.length > 0);
    expect(updateCalled).toBe(false);
    expect(logAction).not.toHaveBeenCalled();
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
