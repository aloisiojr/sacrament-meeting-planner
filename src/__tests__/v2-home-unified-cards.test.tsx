/**
 * Behavioral tests for the Home tab wiring to UnifiedSundayCard (v2 unified cards, phase 5 — H1).
 *
 * `react-native` is aliased to a test stub (vitest.config.ts) whose ScrollView/View render their
 * children, so the Home layout mounts directly. UnifiedSundayCard is replaced by a seam that
 * exposes the props + tap handlers it receives. The two role-gated bottom sections are stubbed to
 * lightweight host nodes so we can assert online gating without mounting their data stacks.
 *
 * buildUnifiedCardData is left REAL so the asserted card props reflect the true mapping. dateUtils
 * is mocked to pin the next 3 Sundays deterministically.
 */
import React from 'react';
import type { TestInstance as Node } from 'test-renderer';
import { render as rtlRender, screen, fireEvent, act } from '@testing-library/react-native';
import type { Speech, SundayAgenda, SundayException } from '../types/database';
// Imported after the (hoisted) jest.mock calls below take effect.
import HomeTab from '../app/(tabs)/index';


const D1 = '2026-08-02'; // hero (next Sunday)
const D2 = '2026-08-09'; // próximos [0]
const D3 = '2026-08-16'; // próximos [1]

const mockState = {
  exceptions: [] as SundayException[],
  speeches: [] as Speech[],
  agendas: [] as SundayAgenda[],
  managePrayers: false,
  online: true,
  wardName: 'Ala Modelo' as string | null,
};

const mockRouterPush = jest.fn();

// --- Mocks ---

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, opts?: unknown) => (opts ? `${k}${JSON.stringify(opts)}` : k) }),
}));
// The Home onboarding prompt is tested separately; stub it here to avoid its hook/context imports.
jest.mock('../components/HomeMemberImportPrompt', () => ({ HomeMemberImportPrompt: () => null }));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => require('react').createElement('SafeAreaView', {}, children),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#000', card: '#111', border: '#333', text: '#fff', textSecondary: '#aaa',
      primary: '#07f', onPrimary: '#fff', warning: '#fb0', divider: '#333', surfaceVariant: '#222',
      primaryContainer: '#123',
    },
  }),
}));
jest.mock('../contexts/OnlineStatusContext', () => ({ useOnlineStatus: () => mockState.online }));

jest.mock('../components/ErrorBoundary', () => ({
  ThemedErrorBoundary: ({ children }: { children?: React.ReactNode }) => require('react').createElement(require('react').Fragment, {}, children),
}));
jest.mock('../components/icons', () => ({ PlayIcon: () => null }));

// Role-gated bottom sections: light host stubs so we can assert online gating.
jest.mock('../components/NextAssignmentsSection', () => ({
  NextAssignmentsSection: () => require('react').createElement('NextAssignmentsSection', { testID: 'next-assignments' }),
}));
jest.mock('../components/InviteManagementSection', () => ({
  InviteManagementSection: () => require('react').createElement('InviteManagementSection', { testID: 'invite-management' }),
}));

// UnifiedSundayCard seam: render a host node carrying every prop for inspection + tap invocation.
jest.mock('../components/UnifiedSundayCard', () => ({
  UnifiedSundayCard: (props: Record<string, unknown>) => require('react').createElement('UnifiedSundayCard', props),
}));

// Pin the next 3 Sundays.
jest.mock('../lib/dateUtils', () => ({
  getNextSundays: () => [new Date(`${D1}T12:00:00`), new Date(`${D2}T12:00:00`), new Date(`${D3}T12:00:00`)],
  toISODateString: (d: Date) => d.toISOString().slice(0, 10),
}));

jest.mock('../hooks/useSpeeches', () => ({
  useSpeeches: () => ({ data: mockState.speeches }),
  useWardManagePrayers: () => ({ managePrayers: mockState.managePrayers, isLoading: false }),
}));
jest.mock('../hooks/useSundayTypes', () => ({
  useSundayExceptions: () => ({ data: mockState.exceptions }),
}));
jest.mock('../hooks/useAgenda', () => ({
  useAgendaRange: () => ({ data: mockState.agendas }),
}));
jest.mock('../hooks/useWard', () => ({
  useWardName: () => mockState.wardName,
}));

// --- Test data ---

function makeAgenda(date: string, over: Partial<SundayAgenda> = {}): SundayAgenda {
  return {
    id: `ag-${date}`, ward_id: 'w1', sunday_date: date,
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

function makeSpeech(date: string, position: number, over: Partial<Speech> = {}): Speech {
  return {
    id: `sp-${date}-${position}`, ward_id: 'w1', sunday_date: date, position, member_id: null,
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
function byTestID(_root: unknown, testID: string): Node[] {
  return screen.root!.queryAll((n) => typeof n.type === 'string' && n.props.testID === testID);
}

async function render() {
  await rtlRender(React.createElement(HomeTab));
  return null; // call-site compatibility; the helpers query `screen`
}

beforeEach(() => {
  mockState.exceptions = [];
  mockState.speeches = [makeSpeech(D1, 1, { speaker_name: 'Alice' })];
  mockState.agendas = [makeAgenda(D1, { presiding_name: 'Bishop' })];
  mockState.managePrayers = false;
  mockState.online = true;
  mockState.wardName = 'Ala Modelo';
  mockRouterPush.mockClear();
});

describe('Home tab → UnifiedSundayCard (phase 5, H1)', () => {
  it('renders one highlighted hero card + exactly 2 cards in the próximos section', async () => {
    await render();
    const cards = unifiedCards(null);
    expect(cards.length).toBe(3);

    // Hero: the next Sunday, highlighted, with mapped data from buildUnifiedCardData (kept real).
    const hero = byTestID(null, `home-hero-card-${D1}`);
    expect(hero.length).toBe(1);
    expect(hero[0].props.highlighted).toBe(true);
    expect((hero[0].props.roles as { preside: boolean }).preside).toBe(true);
    const rows = hero[0].props.nameRows as { name: string | null }[];
    expect(rows[0].name).toBe('Alice');

    // Exactly one highlighted card overall.
    expect(cards.filter((c) => c.props.highlighted === true).length).toBe(1);

    // Próximos: exactly 2 (the following two Sundays), not highlighted.
    const upcoming = cards.filter(
      (c) => typeof c.props.testID === 'string' && (c.props.testID as string).startsWith('home-upcoming-card-')
    );
    expect(upcoming.length).toBe(2);
    expect(upcoming.map((c) => c.props.date).sort()).toEqual([D2, D3]);
    expect(upcoming.every((c) => c.props.highlighted !== true)).toBe(true);
    // Item 1: the 2 upcoming cards hide the status/roles block; the hero does not.
    expect(upcoming.every((c) => c.props.hideStatusBlock === true)).toBe(true);
    expect(hero[0].props.hideStatusBlock).toBeFalsy();
  });

  it('appends the ward name to the agenda title, and shows the bare title when unknown', async () => {
    await render();
    let title = byTestID(null, 'home-agenda-title')[0];
    expect(title.props.children).toBe('home.meetingAgendaTitle - Ala Modelo');

    mockState.wardName = null;
    await render();
    title = byTestID(null, 'home-agenda-title')[0];
    expect(title.props.children).toBe('home.meetingAgendaTitle');
  });

  it('tapping a card speakers zone pushes the speeches edit route', async () => {
    await render();
    const hero = byTestID(null, `home-hero-card-${D1}`)[0];
    await act(async () => {
      (hero.props.onPressSpeakers as (d: string) => void)(D1);
    });
    expect(mockRouterPush).toHaveBeenCalledWith({ pathname: '/speeches/[date]', params: { date: D1 } });
  });

  it('tapping a card status zone pushes the Agendas tab expanded on that date', async () => {
    await render();
    const upcoming = byTestID(null, `home-upcoming-card-${D2}`)[0];
    await act(async () => {
      (upcoming.props.onPressStatus as (d: string) => void)(D2);
    });
    expect(mockRouterPush).toHaveBeenCalledWith({ pathname: '/(tabs)/agenda', params: { expandDate: D2 } });
  });

  it('Start Meeting button navigates to presentation with the hero date', async () => {
    await render();
    await fireEvent.press(screen.getByTestId('home-start-meeting-button'));
    expect(mockRouterPush).toHaveBeenCalledWith({ pathname: '/presentation', params: { date: D1 } });
  });

  it('shows role-gated sections only when online', async () => {
    await render();
    expect(byTestID(null, 'next-assignments').length).toBe(1);
    expect(byTestID(null, 'invite-management').length).toBe(1);

    mockState.online = false;
    const offline = await render();
    expect(byTestID(null, 'next-assignments').length).toBe(0);
    expect(byTestID(null, 'invite-management').length).toBe(0);
    // Cards remain visible offline (no online guard).
    expect(unifiedCards(null).length).toBe(3);
  });
});
