/**
 * Behavioral tests for the Agendas tab wiring to UnifiedSundayCard (v2 unified cards, phase 4).
 *
 * `react-native` is aliased to a test stub (vitest.config.ts); here we additionally override
 * FlatList so it actually renders its items (the stub renders a bare host node), which lets the
 * tab mount its per-Sunday cards. UnifiedSundayCard is replaced by a seam that exposes the props +
 * tap handlers it receives; the expanded body's AgendaForm / type dropdown are stubbed so we can
 * detect expansion. All data hooks are mocked via shared mutable state.
 *
 * buildUnifiedCardData is left REAL so the asserted props reflect the true mapping.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import TestRenderer from 'react-test-renderer';
import type { Speech, SundayAgenda, SundayException } from '../types/database';
// Imported after the (hoisted) vi.mock calls below take effect.
import AgendaTab from '../app/(tabs)/agenda';

const { act } = TestRenderer;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const DATE = '2026-08-02';

const state = vi.hoisted(() => ({
  sundays: [] as string[],
  nextSunday: '' as string,
  exceptions: [] as SundayException[],
  speeches: [] as Speech[],
  agendas: [] as SundayAgenda[],
  managePrayers: false,
  online: true,
}));

const routerPush = vi.hoisted(() => vi.fn());
const updateByDateMutate = vi.hoisted(() => vi.fn());

// --- Mocks ---

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, opts?: unknown) => (opts ? `${k}${JSON.stringify(opts)}` : k) }),
}));

// FlatList that renders its items so the per-Sunday cards mount.
vi.mock('react-native', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  const ReactMod = (await import('react')).default;
  const FlatList = ({
    data,
    renderItem,
    keyExtractor,
  }: {
    data?: unknown[];
    renderItem?: (info: { item: unknown; index: number }) => React.ReactNode;
    keyExtractor?: (item: unknown, index: number) => string;
  }) =>
    ReactMod.createElement(
      'FlatList',
      {},
      (data ?? []).map((item, index) =>
        ReactMod.createElement(
          ReactMod.Fragment,
          { key: keyExtractor ? keyExtractor(item, index) : index },
          renderItem?.({ item, index })
        )
      )
    );
  return { ...actual, FlatList };
});

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => React.createElement('SafeAreaView', {}, children),
}));

vi.mock('expo-router', () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ push: routerPush, setParams: vi.fn() }),
}));

vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#000', card: '#111', border: '#333', text: '#fff', textSecondary: '#aaa',
      primary: '#07f', onPrimary: '#fff', warning: '#fb0', divider: '#333', surfaceVariant: '#222',
    },
  }),
}));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ hasPermission: () => true }) }));
vi.mock('../contexts/OnlineStatusContext', () => ({ useOnlineStatus: () => state.online }));

vi.mock('../components/ErrorBoundary', () => ({
  ThemedErrorBoundary: ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, {}, children),
}));
vi.mock('../components/QueryErrorView', () => ({ QueryErrorView: () => null }));
vi.mock('../components/AgendaForm', () => ({
  AgendaForm: () => React.createElement('AgendaForm', { testID: 'mock-agenda-form' }),
}));
vi.mock('../components/SundayCard', () => ({
  SundayTypeDropdown: () => React.createElement('SundayTypeDropdown', { testID: 'mock-type-dropdown' }),
}));
vi.mock('../components/icons', () => ({ PlayIcon: () => null }));

// UnifiedSundayCard seam: render a host node carrying every prop for inspection + tap invocation.
vi.mock('../components/UnifiedSundayCard', () => ({
  UnifiedSundayCard: (props: Record<string, unknown>) => React.createElement('UnifiedSundayCard', props),
}));
// DateBlock is stubbed so the compact expanded header can render without pulling in the i18n init
// chain (the real DateBlock imports src/i18n).
vi.mock('../components/DateBlock', () => ({
  DateBlock: (props: Record<string, unknown>) => React.createElement('DateBlock', props),
}));

vi.mock('../hooks/useSundayList', () => ({
  useSundayList: () => ({
    sundays: state.sundays,
    startDate: state.sundays[0] ?? '',
    endDate: state.sundays[state.sundays.length - 1] ?? '',
    loadMoreFuture: vi.fn(),
    loadMorePast: vi.fn(),
    hasMoreFuture: false,
    hasMorePast: false,
    nextSunday: state.nextSunday,
  }),
}));
vi.mock('../hooks/useSundayTypes', () => ({
  SUNDAY_TYPE_SPEECHES: 'speeches',
  useSundayExceptions: () => ({ data: state.exceptions, isError: false, error: null, refetch: vi.fn() }),
  useSetSundayType: () => ({ mutate: vi.fn() }),
  useRemoveSundayException: () => ({ mutate: vi.fn() }),
}));
vi.mock('../hooks/useSpeeches', () => ({
  useSpeeches: () => ({ data: state.speeches }),
  useDeleteSpeechesByDate: () => ({ mutate: vi.fn() }),
  useWardManagePrayers: () => ({ managePrayers: state.managePrayers, isLoading: false }),
}));
vi.mock('../hooks/useAgenda', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    useAgendaRange: () => ({ data: state.agendas }),
    useLazyCreateAgenda: () => ({ mutate: vi.fn() }),
    useUpdateAgendaByDate: () => ({ mutate: updateByDateMutate }),
  };
});

// --- Test data ---

function makeAgenda(over: Partial<SundayAgenda> = {}): SundayAgenda {
  return {
    id: 'ag1', ward_id: 'w1', sunday_date: DATE,
    presiding_name: null, conducting_name: null, recognized_names: null,
    welcome_new_families: null, announcements: null, pianist_name: null, conductor_name: null,
    opening_hymn_id: null, opening_prayer_member_id: null, opening_prayer_name: null,
    designations: [], has_baby_blessing: false, baby_blessing_names: null,
    has_baptism_confirmation: false, baptism_confirmation_names: null, has_stake_announcements: false,
    sacrament_hymn_id: null, has_special_presentation: false, has_intermediate_hymn: true,
    special_presentation_description: null, intermediate_hymn_id: null,
    speaker_1_override: null, speaker_2_override: null, speaker_3_override: null,
    has_second_speech: true, closing_hymn_id: null, closing_prayer_member_id: null,
    closing_prayer_name: null, attendance: null, created_at: '', updated_at: '',
    ...over,
  };
}

function makeSpeech(position: number, over: Partial<Speech> = {}): Speech {
  return {
    id: `sp${position}`, ward_id: 'w1', sunday_date: DATE, position, member_id: null,
    speaker_name: null, speaker_informal_name: null, speaker_phone: null,
    topic_title: null, topic_link: null, topic_collection: null, assigned_by_role: null,
    status: 'not_assigned', contact_phone: null, is_delegated: false, delegate_for_name: null,
    created_at: '', updated_at: '',
    ...over,
  };
}

type Node = TestRenderer.TestInstance;
function unifiedCards(root: Node): Node[] {
  return root.findAll((n) => n.type === 'UnifiedSundayCard');
}
function byTestID(root: Node, testID: string): Node[] {
  return root.findAll((n) => typeof n.type === 'string' && n.props.testID === testID);
}

function render() {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(AgendaTab));
  });
  return renderer;
}

beforeEach(() => {
  state.sundays = [DATE];
  state.nextSunday = DATE;
  state.exceptions = [];
  state.speeches = [makeSpeech(1, { speaker_name: 'Alice' })];
  state.agendas = [makeAgenda({ presiding_name: 'Bishop' })];
  state.managePrayers = false;
  state.online = true;
  routerPush.mockClear();
  updateByDateMutate.mockClear();
});

describe('Agendas tab → UnifiedSundayCard (phase 4)', () => {
  it('renders each collapsed Sunday via UnifiedSundayCard with mapped data', () => {
    const { root } = render();
    const cards = unifiedCards(root);
    expect(cards.length).toBe(1);
    const card = cards[0];
    expect(card.props.testID).toBe(`agenda-card-${DATE}`);
    // DATE is the next Sunday (state.nextSunday) → highlighted (#2 restored border).
    expect(card.props.highlighted).toBe(true);
    // Roles + name rows come from buildUnifiedCardData (kept real).
    expect((card.props.roles as { preside: boolean }).preside).toBe(true);
    const rows = card.props.nameRows as { key: string; name: string | null }[];
    expect(rows.map((r) => r.key)).toEqual(['speaker-1', 'speaker-2', 'speaker-3']);
    expect(rows[0].name).toBe('Alice');
  });

  it('tapping the speakers area pushes the speeches edit route', () => {
    const { root } = render();
    const card = unifiedCards(root)[0];
    act(() => {
      (card.props.onPressSpeakers as (d: string) => void)(DATE);
    });
    expect(routerPush).toHaveBeenCalledWith({ pathname: '/speeches/[date]', params: { date: DATE } });
  });

  it('tapping the status area toggles the inline expanded agenda body', () => {
    const { root } = render();
    // Collapsed: no expanded body yet.
    expect(byTestID(root, 'mock-agenda-form').length).toBe(0);

    const card = unifiedCards(root)[0];
    act(() => {
      (card.props.onPressStatus as (d: string) => void)(DATE);
    });
    // Expanded: the agenda form + type dropdown + play button appear.
    expect(byTestID(root, 'mock-agenda-form').length).toBe(1);
    expect(byTestID(root, 'mock-type-dropdown').length).toBe(1);
    expect(byTestID(root, `agenda-play-${DATE}`).length).toBe(1);

    // Tapping the compact header collapses it back.
    act(() => {
      (byTestID(root, `agenda-header-${DATE}`)[0].props.onPress as () => void)();
    });
    expect(byTestID(root, 'mock-agenda-form').length).toBe(0);
  });

  it('when expanded, shows a compact header (DateBlock + type dropdown + play) and hides the collapsed card', () => {
    const { root } = render();
    act(() => {
      (unifiedCards(root)[0].props.onPressStatus as (d: string) => void)(DATE);
    });
    // Compact header: DateBlock + type dropdown + play; the collapsed roles/counts card is gone.
    expect(root.findAll((n) => n.type === 'DateBlock').length).toBe(1);
    expect(byTestID(root, 'mock-type-dropdown').length).toBe(1);
    expect(byTestID(root, `agenda-play-${DATE}`).length).toBe(1);
    expect(unifiedCards(root).length).toBe(0);
  });

  it('a no-sacrament expanded card renders the type dropdown but no AgendaForm or Play', () => {
    state.exceptions = [{ date: DATE, reason: 'general_conference', custom_reason: null } as SundayException];
    const { root } = render();
    // Expand via the collapsed card's status tap zone — must not throw (conference regression).
    expect(() => {
      act(() => {
        (unifiedCards(root)[0].props.onPressStatus as (d: string) => void)(DATE);
      });
    }).not.toThrow();
    // Compact header with type dropdown, but no AgendaForm and no Play for a no-sacrament Sunday.
    expect(byTestID(root, 'mock-type-dropdown').length).toBe(1);
    expect(root.findAll((n) => n.type === 'DateBlock').length).toBe(1);
    expect(byTestID(root, 'mock-agenda-form').length).toBe(0);
    expect(byTestID(root, `agenda-play-${DATE}`).length).toBe(0);
  });

  it('passes onPressStatus to a no-sacrament collapsed card so tapping it expands', () => {
    state.exceptions = [{ date: DATE, reason: 'general_conference', custom_reason: null } as SundayException];
    const { root } = render();
    const card = unifiedCards(root)[0];
    expect(card.props.exceptionReason).toBe('general_conference');
    // The whole-card tap zone (see UnifiedSundayCard tests) is wired to this handler.
    expect(typeof card.props.onPressStatus).toBe('function');
    act(() => {
      (card.props.onPressStatus as (d: string) => void)(DATE);
    });
    expect(byTestID(root, 'mock-type-dropdown').length).toBe(1);
  });

  it('passes testimony exception + prayer rows through to the card (managePrayers on)', () => {
    state.managePrayers = true;
    state.exceptions = [{ date: DATE, reason: 'testimony_meeting', custom_reason: null } as SundayException];
    state.speeches = [makeSpeech(0, { speaker_name: 'Opener' }), makeSpeech(4)];
    const { root } = render();
    const card = unifiedCards(root)[0];
    expect(card.props.exceptionReason).toBe('testimony_meeting');
    const rows = card.props.nameRows as { key: string }[];
    expect(rows.map((r) => r.key)).toEqual(['prayer-0', 'prayer-4']);
  });

  describe('attendance on past Sundays', () => {
    // A Sunday safely in the past (before "today") so the tab marks it isPast.
    const PAST = '2020-01-05';

    beforeEach(() => {
      state.sundays = [PAST];
      state.nextSunday = '2099-12-27';
      state.speeches = [makeSpeech(1, { speaker_name: 'Alice', sunday_date: PAST })];
      state.agendas = [makeAgenda({ sunday_date: PAST, attendance: 85 })];
    });

    it('passes isPast + attendance through to the collapsed card', () => {
      const { root } = render();
      const card = unifiedCards(root)[0];
      expect(card.props.isPast).toBe(true);
      expect(card.props.attendance).toBe(85);
      expect(typeof card.props.onSetAttendance).toBe('function');
    });

    it('persists a new attendance value via updateAgendaByDate (lazy-create + update)', () => {
      const { root } = render();
      const card = unifiedCards(root)[0];
      act(() => {
        (card.props.onSetAttendance as (v: number | null) => void)(120);
      });
      expect(updateByDateMutate).toHaveBeenCalledWith({
        sundayDate: PAST,
        updates: { attendance: 120 },
      });
    });
  });
});
