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
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import TestRenderer from 'react-test-renderer';
import type { Speech, SundayAgenda, SundayException } from '../types/database';
// Imported after the (hoisted) vi.mock calls below take effect.
import HomeTab from '../app/(tabs)/index';

const { act } = TestRenderer;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const D1 = '2026-08-02'; // hero (next Sunday)
const D2 = '2026-08-09'; // próximos [0]
const D3 = '2026-08-16'; // próximos [1]

const state = vi.hoisted(() => ({
  exceptions: [] as SundayException[],
  speeches: [] as Speech[],
  agendas: [] as SundayAgenda[],
  managePrayers: false,
  online: true,
}));

const routerPush = vi.hoisted(() => vi.fn());

// --- Mocks ---

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, opts?: unknown) => (opts ? `${k}${JSON.stringify(opts)}` : k) }),
}));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => React.createElement('SafeAreaView', {}, children),
}));

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: routerPush }),
}));

vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#000', card: '#111', border: '#333', text: '#fff', textSecondary: '#aaa',
      primary: '#07f', onPrimary: '#fff', warning: '#fb0', divider: '#333', surfaceVariant: '#222',
      primaryContainer: '#123',
    },
  }),
}));
vi.mock('../contexts/OnlineStatusContext', () => ({ useOnlineStatus: () => state.online }));

vi.mock('../components/ErrorBoundary', () => ({
  ThemedErrorBoundary: ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, {}, children),
}));
vi.mock('../components/icons', () => ({ PlayIcon: () => null }));

// Role-gated bottom sections: light host stubs so we can assert online gating.
vi.mock('../components/NextAssignmentsSection', () => ({
  NextAssignmentsSection: () => React.createElement('NextAssignmentsSection', { testID: 'next-assignments' }),
}));
vi.mock('../components/InviteManagementSection', () => ({
  InviteManagementSection: () => React.createElement('InviteManagementSection', { testID: 'invite-management' }),
}));

// UnifiedSundayCard seam: render a host node carrying every prop for inspection + tap invocation.
vi.mock('../components/UnifiedSundayCard', () => ({
  UnifiedSundayCard: (props: Record<string, unknown>) => React.createElement('UnifiedSundayCard', props),
}));

// Pin the next 3 Sundays.
vi.mock('../lib/dateUtils', () => ({
  getNextSundays: () => [new Date(`${D1}T12:00:00`), new Date(`${D2}T12:00:00`), new Date(`${D3}T12:00:00`)],
  toISODateString: (d: Date) => d.toISOString().slice(0, 10),
}));

vi.mock('../hooks/useSpeeches', () => ({
  useSpeeches: () => ({ data: state.speeches }),
  useWardManagePrayers: () => ({ managePrayers: state.managePrayers, isLoading: false }),
}));
vi.mock('../hooks/useSundayTypes', () => ({
  useSundayExceptions: () => ({ data: state.exceptions }),
}));
vi.mock('../hooks/useAgenda', () => ({
  useAgendaRange: () => ({ data: state.agendas }),
}));

// --- Test data ---

function makeAgenda(date: string, over: Partial<SundayAgenda> = {}): SundayAgenda {
  return {
    id: `ag-${date}`, ward_id: 'w1', sunday_date: date,
    presiding_name: null, conducting_name: null, recognized_names: null,
    welcome_new_families: null, announcements: null, pianist_name: null, conductor_name: null,
    opening_hymn_id: null, opening_prayer_member_id: null, opening_prayer_name: null,
    sustaining_releasing: null, designations: [], has_baby_blessing: false, baby_blessing_names: null,
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
    renderer = TestRenderer.create(React.createElement(HomeTab));
  });
  return renderer;
}

beforeEach(() => {
  state.exceptions = [];
  state.speeches = [makeSpeech(D1, 1, { speaker_name: 'Alice' })];
  state.agendas = [makeAgenda(D1, { presiding_name: 'Bishop' })];
  state.managePrayers = false;
  state.online = true;
  routerPush.mockClear();
});

describe('Home tab → UnifiedSundayCard (phase 5, H1)', () => {
  it('renders one highlighted hero card + exactly 2 cards in the próximos section', () => {
    const { root } = render();
    const cards = unifiedCards(root);
    expect(cards.length).toBe(3);

    // Hero: the next Sunday, highlighted, with mapped data from buildUnifiedCardData (kept real).
    const hero = byTestID(root, `home-hero-card-${D1}`);
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
  });

  it('tapping a card speakers zone pushes the speeches edit route', () => {
    const { root } = render();
    const hero = byTestID(root, `home-hero-card-${D1}`)[0];
    act(() => {
      (hero.props.onPressSpeakers as (d: string) => void)(D1);
    });
    expect(routerPush).toHaveBeenCalledWith({ pathname: '/speeches/[date]', params: { date: D1 } });
  });

  it('tapping a card status zone pushes the Agendas tab expanded on that date', () => {
    const { root } = render();
    const upcoming = byTestID(root, `home-upcoming-card-${D2}`)[0];
    act(() => {
      (upcoming.props.onPressStatus as (d: string) => void)(D2);
    });
    expect(routerPush).toHaveBeenCalledWith({ pathname: '/(tabs)/agenda', params: { expandDate: D2 } });
  });

  it('Start Meeting button navigates to presentation with the hero date', () => {
    const { root } = render();
    const btn = byTestID(root, 'home-start-meeting-button')[0];
    act(() => {
      (btn.props.onPress as () => void)();
    });
    expect(routerPush).toHaveBeenCalledWith({ pathname: '/presentation', params: { date: D1 } });
  });

  it('shows role-gated sections only when online', () => {
    const online = render();
    expect(byTestID(online.root, 'next-assignments').length).toBe(1);
    expect(byTestID(online.root, 'invite-management').length).toBe(1);

    state.online = false;
    const offline = render();
    expect(byTestID(offline.root, 'next-assignments').length).toBe(0);
    expect(byTestID(offline.root, 'invite-management').length).toBe(0);
    // Cards remain visible offline (no online guard).
    expect(unifiedCards(offline.root).length).toBe(3);
  });
});
