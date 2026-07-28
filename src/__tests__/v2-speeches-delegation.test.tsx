/**
 * Behavioral test for the Speeches-tab v2.0 wiring (specs/v2-member-management.md, Phase 3a).
 *
 * `react-native` is aliased to a test stub (vitest.config.ts). Heavy children (SundayCard,
 * SpeechSlot, PeoplePicker, TopicSelectorModal) are mocked to lightweight seams so we can drive
 * the assign flow and assert the contact-delegation snapshot passed to useAssignSpeaker.
 *
 * The pure snapshot helper (resolveContactSnapshot) and buildFullPhone stay real — this test
 * verifies the *wiring* in speeches.tsx: responsible lookup + snapshot fields on assignment.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import TestRenderer from 'react-test-renderer';
import type { Member } from '../types/database';

// Import after mocks are registered.
import SpeechesTab from '../app/(tabs)/speeches';

const { act } = TestRenderer;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const EXPAND_DATE = '2026-08-02';

// --- Controlled data ---

function makeMember(over: Partial<Member> & { id: string; full_name: string }): Member {
  return {
    ward_id: 'w1',
    informal_name: null,
    country_code: '+1',
    phone: null,
    can_preside: false,
    can_conduct: false,
    can_lead_music: false,
    can_play_piano: false,
    can_be_recognized: false,
    contact_via_responsible: false,
    responsible_id: null,
    created_at: '',
    updated_at: '',
    ...over,
  };
}

const RESPONSIBLE = makeMember({
  id: 'm-resp',
  full_name: 'Resp Person',
  informal_name: 'Resp',
  country_code: '+55',
  phone: '11999998888',
});
const DELEGATE = makeMember({
  id: 'm-del',
  full_name: 'Delegate Person',
  informal_name: 'Del',
  country_code: '+1',
  phone: '5550001',
  contact_via_responsible: true,
  responsible_id: 'm-resp',
});
const DIRECT = makeMember({
  id: 'm-dir',
  full_name: 'Direct Person',
  informal_name: 'Dir',
  country_code: '+1',
  phone: '5550002',
});

const MEMBERS = [RESPONSIBLE, DELEGATE, DIRECT];

const SPEECH_1 = {
  id: 'sp1',
  ward_id: 'w1',
  sunday_date: EXPAND_DATE,
  position: 1,
  member_id: null,
  speaker_name: null,
  speaker_informal_name: null,
  speaker_phone: null,
  topic_title: null,
  topic_link: null,
  topic_collection: null,
  assigned_by_role: null,
  status: 'not_assigned' as const,
  contact_phone: null,
  is_delegated: false,
  delegate_for_name: null,
  created_at: '',
  updated_at: '',
};

const assignSpeakerMock = vi.fn();

// --- Mocks ---

// Partial mock: keep initReactI18next (used by the real i18n loaded via the hook chains).
vi.mock('react-i18next', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, useTranslation: () => ({ t: (k: string) => k }) };
});

vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: { background: '#000', text: '#fff', textSecondary: '#aaa', primary: '#07f' } }),
}));
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ hasPermission: () => true }),
}));
vi.mock('../contexts/OnlineStatusContext', () => ({ useOnlineStatus: () => true }));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => React.createElement('SafeAreaView', {}, children),
}));

vi.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ expandDate: EXPAND_DATE }),
  useRouter: () => ({ setParams: vi.fn() }),
}));

vi.mock('../components/ErrorBoundary', () => ({
  ThemedErrorBoundary: ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, {}, children),
}));
vi.mock('../components/QueryErrorView', () => ({ QueryErrorView: () => null }));
vi.mock('../components/TopicSelectorModal', () => ({ TopicSelectorModal: () => null }));

// SundayCard mock: render children so the SpeechSlots surface.
vi.mock('../components/SundayCard', () => ({
  SundayCard: ({ children }: { children?: React.ReactNode }) => React.createElement('SundayCard', {}, children),
}));

// SpeechSlot mock: expose a press that opens the speaker selector for its speech.
vi.mock('../components/SpeechSlot', () => ({
  SpeechSlot: ({ speech, position, onOpenSpeakerSelector }: { speech: { id: string } | null; position: number; onOpenSpeakerSelector?: (id: string) => void }) =>
    React.createElement('Pressable', {
      testID: `open-selector-${position}`,
      onPress: () => onOpenSpeakerSelector?.(speech ? speech.id : `speech-${position}`),
    }),
}));

// PeoplePicker mock: capture props each render so we can invoke onSelect.
let peoplePickerProps: { visible: boolean; onSelect: (m: Member) => void; onClose: () => void } | null = null;
vi.mock('../components/PeoplePicker', () => ({
  PeoplePicker: (props: { visible: boolean; onSelect: (m: Member) => void; onClose: () => void }) => {
    peoplePickerProps = props;
    return null;
  },
}));

vi.mock('../hooks/useMembers', () => ({ useMembers: () => ({ data: MEMBERS }) }));

vi.mock('../hooks/useSundayList', () => ({
  useSundayList: () => ({
    sundays: [EXPAND_DATE],
    startDate: EXPAND_DATE,
    endDate: EXPAND_DATE,
    nextSunday: EXPAND_DATE,
    loadMoreFuture: vi.fn(),
    loadMorePast: vi.fn(),
    hasMoreFuture: false,
    hasMorePast: false,
  }),
}));

vi.mock('../hooks/useAgenda', () => ({
  useAgendaRange: () => ({ data: [] }),
  useUpdateAgendaByDate: () => ({ mutate: vi.fn() }),
}));

vi.mock('../hooks/useSpeeches', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    useSpeeches: () => ({ data: [SPEECH_1], isError: false, error: null, refetch: vi.fn() }),
    useLazyCreateSpeeches: () => ({ mutate: vi.fn() }),
    useAssignSpeaker: () => ({ mutate: assignSpeakerMock }),
    useAssignTopic: () => ({ mutate: vi.fn() }),
    useChangeStatus: () => ({ mutate: vi.fn() }),
    useRemoveAssignment: () => ({ mutate: vi.fn() }),
    useDeleteSpeechesByDate: () => ({ mutate: vi.fn() }),
    useWardManagePrayers: () => ({ managePrayers: false, isLoading: false }),
  };
});

vi.mock('../hooks/useSundayTypes', () => ({
  useSundayExceptions: () => ({ data: [], isError: false, error: null, refetch: vi.fn() }),
  useSetSundayType: () => ({ mutate: vi.fn() }),
  useAutoAssignSundayTypes: () => ({ mutate: vi.fn() }),
  useRemoveSundayException: () => ({ mutate: vi.fn() }),
}));

vi.mock('../lib/supabase', () => ({ supabase: {} }));

// --- Helpers ---

function render() {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(SpeechesTab));
  });
  return renderer;
}

/** Manually render the FlatList's renderItem for the expanded sunday, then press its slot. */
function openSelectorForPosition(renderer: TestRenderer.ReactTestRenderer, position: number) {
  const flat = renderer.root.findAll((n) => n.type === 'FlatList')[0];
  const renderItem = flat.props.renderItem as (info: { item: { type: string; date: string; key: string } }) => React.ReactElement;
  let rowRenderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    rowRenderer = TestRenderer.create(renderItem({ item: { type: 'sunday', date: EXPAND_DATE, key: EXPAND_DATE } }));
  });
  const slot = rowRenderer.root.findAll(
    (n) => typeof n.type === 'string' && n.props.testID === `open-selector-${position}`
  )[0];
  act(() => {
    (slot.props.onPress as () => void)();
  });
}

beforeEach(() => {
  assignSpeakerMock.mockClear();
  peoplePickerProps = null;
});

describe('Speeches tab — v2.0 people picker + delegation snapshot (Phase 3a)', () => {
  it('renders the PeoplePicker and it starts hidden', () => {
    render();
    expect(peoplePickerProps).not.toBeNull();
    expect(peoplePickerProps!.visible).toBe(false);
  });

  it('snapshots the responsible phone + is_delegated when a delegated member is selected (AC8)', () => {
    const renderer = render();
    openSelectorForPosition(renderer, 1);
    expect(peoplePickerProps!.visible).toBe(true);

    act(() => peoplePickerProps!.onSelect(DELEGATE));

    expect(assignSpeakerMock).toHaveBeenCalledTimes(1);
    expect(assignSpeakerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        speechId: 'sp1',
        memberId: 'm-del',
        // own snapshot still recorded from the member's own phone
        speakerPhone: '+15550001',
        // delegated contact resolved from the responsible member
        contactPhone: '+5511999998888',
        isDelegated: true,
        delegateForName: 'Del',
      })
    );
  });

  it('records a non-delegated snapshot (own phone) for a direct member (AC8)', () => {
    const renderer = render();
    openSelectorForPosition(renderer, 1);

    act(() => peoplePickerProps!.onSelect(DIRECT));

    expect(assignSpeakerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        memberId: 'm-dir',
        contactPhone: '+15550002',
        isDelegated: false,
        delegateForName: null,
      })
    );
  });
});
