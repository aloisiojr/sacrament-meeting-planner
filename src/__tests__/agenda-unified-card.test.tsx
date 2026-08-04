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
import type { TestInstance as Node } from 'test-renderer';
import { render as rtlRender, screen, fireEvent, act } from '@testing-library/react-native';
import type { Speech, SundayAgenda, SundayException } from '../types/database';
// Imported after the (hoisted) jest.mock calls below take effect.
import AgendaTab from '../app/(tabs)/agenda';


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
  ThemedErrorBoundary: ({ children }: { children?: React.ReactNode }) => require('react').createElement(require('react').Fragment, {}, children),
}));
jest.mock('../components/QueryErrorView', () => ({ QueryErrorView: () => null }));
jest.mock('../components/AgendaForm', () => ({
  AgendaForm: () => require('react').createElement('AgendaForm', { testID: 'mock-agenda-form' }),
}));
jest.mock('../components/SundayCard', () => ({
  SundayTypeDropdown: () => require('react').createElement('SundayTypeDropdown', { testID: 'mock-type-dropdown' }),
}));
// agenda.tsx now reaches i18n transitively (AgendaExportPdfButton -> useAgendaPdfExport ->
// usePresentationMode), and importing the real module boots i18next.
jest.mock('../i18n', () => ({
  __esModule: true,
  default: { t: (k: string) => k },
  getCurrentLanguage: () => 'pt-BR',
  changeLanguage: jest.fn(),
  SUPPORTED_LANGUAGES: ['pt-BR', 'en-US', 'es-LA'],
}));
jest.mock('../components/icons', () => ({ PlayIcon: () => null, ChevronUpIcon: () => null, ShareIcon: () => null }));

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
// This suite is about the card, not about PDF plumbing. Without this, the export button would
// pull useHymns/useMembers/useWardName — real React Query reads — into every card under test.
jest.mock('../hooks/useAgendaPdfExport', () => ({
  useAgendaPdfExport: () => ({ exportAgenda: jest.fn(), isExporting: false }),
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

function unifiedCards(_root?: unknown): Node[] {
  return screen.root!.queryAll((n) => n.type === 'UnifiedSundayCard');
}
function byTestID(root: unknown, testID: string): Node[] {
  return screen.root!.queryAll((n) => typeof n.type === 'string' && n.props.testID === testID);
}

async function render() {
  await rtlRender(React.createElement(AgendaTab));
  return null; // call-site compatibility; the helpers query `screen`
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
  it('renders each collapsed Sunday via UnifiedSundayCard with mapped data', async () => {
    await render();
    const cards = unifiedCards(null);
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

  it('tapping the speakers area pushes the speeches edit route', async () => {
    await render();
    const card = unifiedCards(null)[0];
    await act(async () => {
      (card.props.onPressSpeakers as (d: string) => void)(DATE);
    });
    expect(mockRouterPush).toHaveBeenCalledWith({ pathname: '/speeches/[date]', params: { date: DATE } });
  });

  it('tapping the status area toggles the inline expanded agenda body', async () => {
    await render();
    // Collapsed: no expanded body yet.
    expect(byTestID(null, 'mock-agenda-form').length).toBe(0);

    const card = unifiedCards(null)[0];
    await act(async () => {
      (card.props.onPressStatus as (d: string) => void)(DATE);
    });
    // Expanded: the agenda form + type dropdown + play button appear.
    expect(byTestID(null, 'mock-agenda-form').length).toBe(1);
    expect(byTestID(null, 'mock-type-dropdown').length).toBe(1);
    expect(byTestID(null, `agenda-play-${DATE}`).length).toBe(1);

    // Tapping the compact header collapses it back.
    await fireEvent.press(screen.getByTestId(`agenda-header-${DATE}`));
    expect(byTestID(null, 'mock-agenda-form').length).toBe(0);
  });

  it('when expanded: header has DateBlock + Play + collapse chevron; type dropdown in its own section', async () => {
    await render();
    await act(async () => {
      (unifiedCards(null)[0].props.onPressStatus as (d: string) => void)(DATE);
    });
    // Header: DateBlock + Play "Iniciar" + a collapse chevron. Collapsed roles/counts card is gone.
    expect(screen.root!.queryAll((n) => n.type === 'DateBlock').length).toBe(1);
    expect(byTestID(null, `agenda-play-${DATE}`).length).toBe(1);
    expect(byTestID(null, `agenda-collapse-${DATE}`).length).toBe(1);
    // Type dropdown moved out of the header into the "Tipo de Domingo" section (still rendered).
    expect(byTestID(null, 'mock-type-dropdown').length).toBe(1);
    expect(unifiedCards(null).length).toBe(0);

    // Tapping the collapse chevron collapses back to the collapsed card.
    await fireEvent.press(screen.getByTestId(`agenda-collapse-${DATE}`));
    expect(unifiedCards(null).length).toBe(1);
  });

  it('a no-sacrament expanded card renders the type dropdown but no AgendaForm or Play', async () => {
    mockState.exceptions = [{ date: DATE, reason: 'general_conference', custom_reason: null } as SundayException];
    await render();
    // Expand via the collapsed card's status tap zone. This used to throw for conference
    // Sundays; reaching the assertions below is what proves the regression stays fixed.
    await act(async () => {
      (unifiedCards(null)[0].props.onPressStatus as (d: string) => void)(DATE);
    });
    // Compact header with type dropdown, but no AgendaForm and no Play for a no-sacrament Sunday.
    expect(byTestID(null, 'mock-type-dropdown').length).toBe(1);
    expect(screen.root!.queryAll((n) => n.type === 'DateBlock').length).toBe(1);
    expect(byTestID(null, 'mock-agenda-form').length).toBe(0);
    expect(byTestID(null, `agenda-play-${DATE}`).length).toBe(0);
  });

  it('passes onPressStatus to a no-sacrament collapsed card so tapping it expands', async () => {
    mockState.exceptions = [{ date: DATE, reason: 'general_conference', custom_reason: null } as SundayException];
    await render();
    const card = unifiedCards(null)[0];
    expect(card.props.exceptionReason).toBe('general_conference');
    // The whole-card tap zone (see UnifiedSundayCard tests) is wired to this handler.
    expect(typeof card.props.onPressStatus).toBe('function');
    await act(async () => {
      (card.props.onPressStatus as (d: string) => void)(DATE);
    });
    expect(byTestID(null, 'mock-type-dropdown').length).toBe(1);
  });

  it('passes testimony exception + prayer rows through to the card (managePrayers on)', async () => {
    mockState.managePrayers = true;
    mockState.exceptions = [{ date: DATE, reason: 'testimony_meeting', custom_reason: null } as SundayException];
    mockState.speeches = [makeSpeech(0, { speaker_name: 'Opener' }), makeSpeech(4)];
    await render();
    const card = unifiedCards(null)[0];
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

    it('passes isPast + attendance through to the collapsed card', async () => {
      await render();
      const card = unifiedCards(null)[0];
      expect(card.props.isPast).toBe(true);
      expect(card.props.attendance).toBe(85);
      expect(typeof card.props.onSetAttendance).toBe('function');
    });

    it('persists a new attendance value via updateAgendaByDate (lazy-create + update)', async () => {
      await render();
      const card = unifiedCards(null)[0];
      await act(async () => {
        (card.props.onSetAttendance as (v: number | null) => void)(120);
      });
      expect(mockUpdateByDateMutate).toHaveBeenCalledWith({
        sundayDate: PAST,
        updates: { attendance: 120 },
      });
    });

    it('shows the AttendanceBlock in the expanded header for a past sacrament Sunday (AC7)', async () => {
      await render();
      await act(async () => {
        (unifiedCards(null)[0].props.onPressStatus as (d: string) => void)(PAST);
      });
      expect(byTestID(null, `agenda-attendance-${PAST}`).length).toBeGreaterThan(0);
    });
  });

  it('the expanded-header Play control navigates to /presentation (AC10)', async () => {
    await render();
    await act(async () => {
      (unifiedCards(null)[0].props.onPressStatus as (d: string) => void)(DATE);
    });
    await fireEvent.press(screen.getByTestId(`agenda-play-${DATE}`));
    expect(mockRouterPush).toHaveBeenCalledWith({ pathname: '/presentation', params: { date: DATE } });
  });
});
