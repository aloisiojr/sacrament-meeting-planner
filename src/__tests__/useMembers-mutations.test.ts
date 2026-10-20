/**
 * CONF-07 — the speech-snapshot cascade moved from this hook to a database trigger on
 * `members` (migration 060), running in the same transaction as the UPDATE. These tests
 * pin the client side of that contract:
 *  - the hook issues NO update of its own against `speeches` (no second round-trip that
 *    could be swallowed "best-effort" or skipped by the offline replay);
 *  - a rejected member UPDATE — which is how a failing cascade now surfaces, since the
 *    trigger aborts the transaction — rejects the mutation instead of looking successful;
 *  - members and speeches queries are invalidated so the server-cascaded snapshots are
 *    refetched.
 * The snapshot computation itself (delegated vs own phone) stays covered by the
 * `resolveContactSnapshot` unit tests in contact tests, mirrored by the trigger.
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
import { speechKeys } from '../hooks/useSpeeches';
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
const fromMock = mockedSupabase.from as ReturnType<typeof jest.fn>;

let memberUpdateError: { message: string } | null;
let tablesTouched: string[];

function setupMocks(updatedMember: Member) {
  tablesTouched = [];
  const memberSingle = jest.fn().mockImplementation(async () =>
    memberUpdateError
      ? { data: null, error: memberUpdateError }
      : { data: updatedMember, error: null }
  );
  const memberSelect = jest.fn().mockReturnValue({ single: memberSingle });
  const memberEq = jest.fn().mockReturnValue({ select: memberSelect });
  const memberUpdate = jest.fn().mockReturnValue({ eq: memberEq });

  fromMock.mockImplementation((table: string) => {
    tablesTouched.push(table);
    if (table === 'members') return { update: memberUpdate };
    return {};
  });
}

describe('useUpdateMember — snapshot cascade is server-side (trigger)', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = createTestQueryClient();
    memberUpdateError = null;
    tablesTouched = [];
  });

  it('updates only members and invalidates members+speeches; no client cascade write', async () => {
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
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const wrapper = createWrapper({}, queryClient);
    const { result } = renderHook(() => useUpdateMember(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 'm1', full_name: 'Ana Menor' });
    });

    expect(tablesTouched).toEqual(['members']);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: memberKeys.list('ward-1') });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: speechKeys.all });
  });

  it('propagates a rejected UPDATE (cascade failure aborts it) instead of swallowing it', async () => {
    memberUpdateError = { message: 'cascade trigger failed' };
    setupMocks(createMockMember({ id: 'm1' }));

    const wrapper = createWrapper({}, queryClient);
    const { result } = renderHook(() => useUpdateMember(), { wrapper });

    await expect(
      act(async () => {
        await result.current.mutateAsync({ id: 'm1', full_name: 'Ana Menor' });
      })
    ).rejects.toMatchObject({ message: 'cascade trigger failed' });
  });
});
