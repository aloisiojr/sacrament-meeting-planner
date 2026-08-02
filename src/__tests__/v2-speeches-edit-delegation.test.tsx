/**
 * Behavioral test for the delegation-snapshot wiring on the full-screen speeches/prayers editor
 * (specs/v2-unified-cards.md, N2). Migrated from the deleted v2-speeches-delegation.test.tsx when
 * the old "Discursos e Orações" tab was removed — the same delegation-snapshot behavior now lives
 * in src/app/speeches/[date].tsx.
 *
 * `react-native` is aliased to a test stub (vitest.config.ts). Heavy children (SpeechSlot,
 * PeoplePicker, TopicSelectorModal) are mocked to lightweight seams so we can drive the assign flow
 * and assert the contact-delegation snapshot passed to useAssignSpeaker. The pure snapshot helper
 * (resolveContactSnapshot) and buildFullPhone stay real — this verifies the screen's *wiring*:
 * responsible lookup + snapshot fields on assignment + prayer picker context.
 */
import React from 'react';
import TestRenderer from 'react-test-renderer';
import type { Member } from '../types/database';

// Import after mocks are registered.
import SpeechesEditScreen from '../app/speeches/[date]';

const { act } = TestRenderer;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const DATE = '2026-08-02';

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
    calling: null,
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

function makeSpeech(id: string, position: number) {
  return {
    id,
    ward_id: 'w1',
    sunday_date: DATE,
    position,
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
}

const mockSPEECHES = [0, 1, 2, 3, 4].map((p) => makeSpeech(`sp${p}`, p));

const mockAssignSpeakerMock = jest.fn();

// --- Mocks ---

// Partial mock: keep initReactI18next (used by the real i18n loaded via getCurrentLanguage).
jest.mock('react-i18next', () => {
  const actual = (jest.requireActual('react-i18next')) as Record<string, unknown>;
  return { ...actual, useTranslation: () => ({ t: (k: string) => k }) };
});

jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#000', text: '#fff', textSecondary: '#aaa', divider: '#333',
      primary: '#07f', warning: '#fb0',
    },
  }),
}));
jest.mock('../contexts/OnlineStatusContext', () => ({ useOnlineStatus: () => true }));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => require('react').createElement('SafeAreaView', {}, children),
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ date: DATE }),
  useRouter: () => ({ back: jest.fn() }),
}));

jest.mock('../components/ErrorBoundary', () => ({
  ThemedErrorBoundary: ({ children }: { children?: React.ReactNode }) => require('react').createElement(require('react').Fragment, {}, children),
}));
jest.mock('../components/QueryErrorView', () => ({ QueryErrorView: () => null }));
jest.mock('../components/TopicSelectorModal', () => ({ TopicSelectorModal: () => null }));

// SpeechSlot mock: expose a press that opens the speaker selector for its speech.
jest.mock('../components/SpeechSlot', () => ({
  SpeechSlot: ({ speech, position, onOpenSpeakerSelector }: { speech: { id: string } | null; position: number; onOpenSpeakerSelector?: (id: string) => void }) =>
    require('react').createElement('Pressable', {
      testID: `open-selector-${position}`,
      onPress: () => onOpenSpeakerSelector?.(speech ? speech.id : `speech-${position}`),
    }),
}));

// PeoplePicker mock: capture props each render so we can invoke onSelect.
let peoplePickerProps: { visible: boolean; context?: string; onSelect: (m: Member) => void; onClose: () => void } | null = null;
jest.mock('../components/PeoplePicker', () => ({
  PeoplePicker: (props: { visible: boolean; context?: string; onSelect: (m: Member) => void; onClose: () => void }) => {
    peoplePickerProps = props;
    return null;
  },
}));

jest.mock('../hooks/useMembers', () => ({ useMembers: () => ({ data: MEMBERS }) }));

jest.mock('../hooks/useAgenda', () => ({
  useAgenda: () => ({ data: { has_second_speech: true } }),
  useUpdateAgendaByDate: () => ({ mutate: jest.fn() }),
}));

jest.mock('../hooks/useSundayTypes', () => ({
  useSundayExceptions: () => ({ data: [], isError: false, error: null, refetch: jest.fn() }),
}));

jest.mock('../hooks/useSpeeches', () => {
  const actual = (jest.requireActual('../hooks/useSpeeches')) as Record<string, unknown>;
  return {
    ...actual,
    useSpeeches: () => ({ data: mockSPEECHES, isError: false, error: null, refetch: jest.fn() }),
    useLazyCreateSpeeches: () => ({ mutate: jest.fn() }),
    useAssignSpeaker: () => ({ mutate: mockAssignSpeakerMock }),
    useAssignTopic: () => ({ mutate: jest.fn() }),
    useChangeStatus: () => ({ mutate: jest.fn() }),
    useRemoveAssignment: () => ({ mutate: jest.fn() }),
    useWardManagePrayers: () => ({ managePrayers: true, isLoading: false }),
  };
});

jest.mock('../lib/supabase', () => ({ supabase: {} }));

// --- Helpers ---

function render() {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(SpeechesEditScreen));
  });
  return renderer;
}

/** Press the mocked SpeechSlot for a position, opening the speaker/prayer selector. */
function openSelectorForPosition(renderer: TestRenderer.ReactTestRenderer, position: number) {
  const slot = renderer.root.findAll(
    (n) => typeof n.type === 'string' && n.props.testID === `open-selector-${position}`
  )[0];
  act(() => {
    (slot.props.onPress as () => void)();
  });
}

beforeEach(() => {
  mockAssignSpeakerMock.mockClear();
  peoplePickerProps = null;
});

describe('Speeches edit screen — delegation snapshot + picker context (N2)', () => {
  it('renders the PeoplePicker and it starts hidden', () => {
    render();
    expect(peoplePickerProps).not.toBeNull();
    expect(peoplePickerProps!.visible).toBe(false);
  });

  it('snapshots the responsible phone + is_delegated when a delegated member is selected (AC8)', () => {
    const renderer = render();
    openSelectorForPosition(renderer, 1);
    expect(peoplePickerProps!.visible).toBe(true);
    // A regular speech slot opens the picker in the 'speaker' context.
    expect(peoplePickerProps!.context).toBe('speaker');

    act(() => peoplePickerProps!.onSelect(DELEGATE));

    expect(mockAssignSpeakerMock).toHaveBeenCalledTimes(1);
    expect(mockAssignSpeakerMock).toHaveBeenCalledWith(
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

  it('opens the picker in the opening_prayer / closing_prayer context for prayer slots', () => {
    const renderer = render();
    openSelectorForPosition(renderer, 0);
    expect(peoplePickerProps!.context).toBe('opening_prayer');

    openSelectorForPosition(renderer, 4);
    expect(peoplePickerProps!.context).toBe('closing_prayer');
  });

  it('records a non-delegated snapshot (own phone) for a direct member (AC8)', () => {
    const renderer = render();
    openSelectorForPosition(renderer, 1);

    act(() => peoplePickerProps!.onSelect(DIRECT));

    expect(mockAssignSpeakerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        memberId: 'm-dir',
        contactPhone: '+15550002',
        isDelegated: false,
        delegateForName: null,
      })
    );
  });
});
