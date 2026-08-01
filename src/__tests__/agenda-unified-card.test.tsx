/**
 * Behavioral tests for the Agendas tab wiring to UnifiedSundayCard (v2 unified cards, phase 4).
 *
 * `react-native` is aliased to a test stub (vitest.config.ts); here we additionally override
 * FlatList so it actually renders its items (the stub renders a bare host node), which lets the
 * tab mount its per-Sunday cards. UnifiedSundayCard is replaced by a seam that exposes the props +
 * tap handlers it receives; the expanded body's AgendaForm / type dropdown are stubbed so we can
 * detect expansion. All data hooks are mocked via shared mutable mockState.
 *
 * buildUnifiedCardData is left REAL so the asserted props reflect the true mapping.
 */
import React from 'react';
import TestRenderer from 'react-test-renderer';
import type { Speech, SundayAgenda, SundayException } from '../types/database';
// Imported after the (hoisted) jest.mock calls below take effect.
import AgendaTab from '../app/(tabs)/agenda';

const { act } = TestRenderer;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const DATE = '2026-08-02';

const mockState = {
  sundays: [] as string[],
  nextSunday: '' as string,
  exceptions: [] as SundayException[],
  speeches: [] as Speech[],
  agendas: [] as SundayAgenda[],
  managePrayers: false,
  online: true,
};

const mockRouterPush = jest.fn();
const mockUpdateByDateMutate = jest.fn();

// --- Mocks ---

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, opts?: unknown) => (opts ? `${k}${JSON.stringify(opts)}` : k) }),
}));


jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => require('react').createElement('SafeAreaView', {}, children),
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ push: mockRouterPush, setParams: jest.fn() }),
}));

jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#000', card: '#111', border: '#333', text: '#fff', textSecondary: '#aaa',
      primary: '#07f', onPrimary: '#fff', warning: '#fb0', divider: '#333', surfaceVariant: '#222',
    },
  }),
}));
jest.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ hasPermission: () => true }) }));
jest.mock('../contexts/OnlineStatusContext', () => ({ useOnlineStatus: () => mockState.online }));

jest.mock('../components/ErrorBoundary', () => ({
  ThemedErrorBoundary: ({ children }: { children?: React.ReactNode }) => require('react').createElement(React.Fragment, {}, children),
}));
jest.mock('../components/QueryErrorView', () => ({ QueryErrorView: () => null }));
jest.mock('../components/AgendaForm', () => ({
  AgendaForm: () => require('react').createElement('AgendaForm', { testID: 'mock-agenda-form' }),
}));
jest.mock('../components/SundayCard', () => ({
  SundayTypeDropdown: () => require('react').createElement('SundayTypeDropdown', { testID: 'mock-type-dropdown' }),
}));
jest.mock('../components/icons', () => ({ PlayIcon: () => null, ChevronUpIcon: () => null }));

// UnifiedSundayCard seam: render a host node carrying every prop for inspection + tap invocation.
jest.mock('../components/UnifiedSundayCard', () => ({
  UnifiedSundayCard: (props: Record<string, unknown>) => require('react').createElement('UnifiedSundayCard', props),
}));
// DateBlock is stubbed so the compact expanded header can render without pulling in the i18n init
// chain (the real DateBlock imports src/i18n).
jest.mock('../components/DateBlock', () => ({
  DateBlock: (props: Record<string, unknown>) => require('react').createElement('DateBlock', props),
}));

jest.mock('../hooks/useSundayList', () => ({
  useSundayList: () => ({
    sundays: mockState.sundays,
    startDate: mockState.sundays[0] ?? '',
    endDate: mockState.sundays[mockState.sundays.length - 1] ?? '',
    loadMoreFuture: jest.fn(),
    loadMorePast: jest.fn(),
    hasMoreFuture: false,
    hasMorePast: false,
    nextSunday: mockState.nextSunday,
  }),
}));
jest.mock('../hooks/useSundayTypes', () => ({
  SUNDAY_TYPE_SPEECHES: 'speeches',
  useSundayExceptions: () => ({ data: mockState.exceptions, isError: false, error: null, refetch: jest.fn() }),
  useSetSundayType: () => ({ mutate: jest.fn() }),
  useRemoveSundayException: () => ({ mutate: jest.fn() }),
  useAutoAssignMissingSundayTypes: () => {},
}));
jest.mock('../hooks/useSpeeches', () => ({
  useSpeeches: () => ({ data: mockState.speeches }),
  useDeleteSpeechesByDate: () => ({ mutate: jest.fn() }),
  useWardManagePrayers: () => ({ managePrayers: mockState.managePrayers, isLoading: false }),
}));
jest.mock('../hooks/useAgenda', () => {
  const actual = (jest.requireActual('../hooks/useAgenda')) as Record<string, unknown>;
  return {
    ...actual,
    useAgendaRange: () => ({ data: mockState.agendas }),
    useLazyCreateAgenda: () => ({ mutate: jest.fn() }),
    useUpdateAgendaByDate: () => ({ mutate: mockUpdateByDateMutate }),
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
  mockState.sundays = [DATE];
  mockState.nextSunday = DATE;
  mockState.exceptions = [];
  mockState.speeches = [makeSpeech(1, { speaker_name: 'Alice' })];
  mockState.agendas = [makeAgenda({ presiding_name: 'Bishop' })];
  mockState.managePrayers = false;
  mockState.online = true;
  mockRouterPush.mockClear();
  mockUpdateByDateMutate.mockClear();
});

describe('Agendas tab → UnifiedSundayCard (phase 4)', () => {
  it('renders each collapsed Sunday via UnifiedSundayCard with mapped data', () => {
    const { root } = render();
    const cards = unifiedCards(root);
    expect(cards.length).toBe(1);
    const card = cards[0];
    expect(card.props.testID).toBe(`agenda-card-${DATE}`);
    // DATE is the next Sunday (mockState.nextSunday) → highlighted (#2 restored border).
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
    expect(mockRouterPush).toHaveBeenCalledWith({ pathname: '/speeches/[date]', params: { date: DATE } });
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

  it('when expanded: header has DateBlock + Play + collapse chevron; type dropdown in its own section', () => {
    const { root } = render();
    act(() => {
      (unifiedCards(root)[0].props.onPressStatus as (d: string) => void)(DATE);
    });
    // Header: DateBlock + Play "Iniciar" + a collapse chevron. Collapsed roles/counts card is gone.
    expect(root.findAll((n) => n.type === 'DateBlock').length).toBe(1);
    expect(byTestID(root, `agenda-play-${DATE}`).length).toBe(1);
    expect(byTestID(root, `agenda-collapse-${DATE}`).length).toBe(1);
    // Type dropdown moved out of the header into the "Tipo de Domingo" section (still rendered).
    expect(byTestID(root, 'mock-type-dropdown').length).toBe(1);
    expect(unifiedCards(root).length).toBe(0);

    // Tapping the collapse chevron collapses back to the collapsed card.
    act(() => {
      (byTestID(root, `agenda-collapse-${DATE}`)[0].props.onPress as () => void)();
    });
    expect(unifiedCards(root).length).toBe(1);
  });

  it('a no-sacrament expanded card renders the type dropdown but no AgendaForm or Play', () => {
    mockState.exceptions = [{ date: DATE, reason: 'general_conference', custom_reason: null } as SundayException];
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
    mockState.exceptions = [{ date: DATE, reason: 'general_conference', custom_reason: null } as SundayException];
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
    mockState.managePrayers = true;
    mockState.exceptions = [{ date: DATE, reason: 'testimony_meeting', custom_reason: null } as SundayException];
    mockState.speeches = [makeSpeech(0, { speaker_name: 'Opener' }), makeSpeech(4)];
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
      mockState.sundays = [PAST];
      mockState.nextSunday = '2099-12-27';
      mockState.speeches = [makeSpeech(1, { speaker_name: 'Alice', sunday_date: PAST })];
      mockState.agendas = [makeAgenda({ sunday_date: PAST, attendance: 85 })];
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
      expect(mockUpdateByDateMutate).toHaveBeenCalledWith({
        sundayDate: PAST,
        updates: { attendance: 120 },
      });
    });

    it('shows the AttendanceBlock in the expanded header for a past sacrament Sunday (AC7)', () => {
      const { root } = render();
      act(() => {
        (unifiedCards(root)[0].props.onPressStatus as (d: string) => void)(PAST);
      });
      expect(byTestID(root, `agenda-attendance-${PAST}`).length).toBeGreaterThan(0);
    });
  });

  it('the expanded-header Play control navigates to /presentation (AC10)', () => {
    const { root } = render();
    act(() => {
      (unifiedCards(root)[0].props.onPressStatus as (d: string) => void)(DATE);
    });
    act(() => {
      (byTestID(root, `agenda-play-${DATE}`)[0].props.onPress as () => void)();
    });
    expect(mockRouterPush).toHaveBeenCalledWith({ pathname: '/presentation', params: { date: DATE } });
  });
});
