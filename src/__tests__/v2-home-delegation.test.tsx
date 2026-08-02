/**
 * Behavioral test for the Home-tab NextAssignmentsSection v2.0 wiring
 * (specs/v2-member-management.md, Phase 3c — HOME vertical slice).
 *
 * `react-native` is aliased to a test stub (vitest.config.ts). Heavy children (SundayCard,
 * SpeechSlot, PeoplePicker, TopicSelectorModal) are mocked to lightweight seams so we can drive
 * the assign flow and assert the contact-delegation snapshot passed to useAssignSpeaker.
 *
 * The pure snapshot helper (resolveContactSnapshot) and buildFullPhone stay real — this test
 * verifies the *wiring*: the section uses PeoplePicker and the
 * responsible lookup + snapshot fields are passed on assignment.
 */
import React from 'react';
import { render as rtlRender, screen, fireEvent, act } from '@testing-library/react-native';
import type { Member } from '../types/database';

// Import after mocks are registered.
import { NextAssignmentsSection } from '../components/NextAssignmentsSection';


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

const mockMEMBERS = [RESPONSIBLE, DELEGATE, DIRECT];

const PENDING_ENTRY = {
  date: '2026-08-30',
  exception: null,
  speeches: [
    {
      id: 'sp1',
      ward_id: 'w1',
      sunday_date: '2026-08-30',
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
    },
  ],
};

const mockAssignSpeakerMock = jest.fn();

// --- Mocks ---

// Partial mock: keep initReactI18next (used by the real i18n loaded via the hook chains).
jest.mock('react-i18next', () => {
  const actual = (jest.requireActual('react-i18next')) as Record<string, unknown>;
  return { ...actual, useTranslation: () => ({ t: (k: string) => k }) };
});

jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: { background: '#000', text: '#fff', textSecondary: '#aaa', primary: '#07f' } }),
}));
jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ hasPermission: () => true }),
}));

jest.mock('../components/QueryErrorView', () => ({ QueryErrorView: () => null }));
jest.mock('../components/TopicSelectorModal', () => ({ TopicSelectorModal: () => null }));

// SundayCard mock: expose a toggle press and render children so the SpeechSlots surface.
jest.mock('../components/SundayCard', () => ({
  SundayCard: ({ children, onToggle }: { children?: React.ReactNode; onToggle?: () => void }) =>
    require('react').createElement(
      'SundayCard',
      {},
      require('react').createElement('Pressable', { testID: 'sunday-toggle', onPress: () => onToggle?.() }),
      children
    ),
}));

// SpeechSlot mock: expose a press that opens the speaker selector for its speech.
jest.mock('../components/SpeechSlot', () => ({
  SpeechSlot: ({ speech, position, onOpenSpeakerSelector }: { speech: { id: string } | null; position: number; onOpenSpeakerSelector?: (id: string) => void }) =>
    require('react').createElement('Pressable', {
      testID: `open-selector-${position}`,
      onPress: () => onOpenSpeakerSelector?.(speech ? speech.id : `speech-${position}`),
    }),
}));

// PeoplePicker mock: capture props each render so we can invoke onSelect.
let peoplePickerProps: { visible: boolean; onSelect: (m: Member) => void; onClose: () => void } | null = null;
jest.mock('../components/PeoplePicker', () => ({
  PeoplePicker: (props: { visible: boolean; onSelect: (m: Member) => void; onClose: () => void }) => {
    peoplePickerProps = props;
    return null;
  },
}));

jest.mock('../hooks/useMembers', () => ({ useMembers: () => ({ data: mockMEMBERS }) }));

jest.mock('../hooks/useSpeeches', () => ({
  useSpeeches: () => ({ data: [], isError: false, error: null, refetch: jest.fn() }),
  useLazyCreateSpeeches: () => ({ mutate: jest.fn() }),
  useAssignSpeaker: () => ({ mutate: mockAssignSpeakerMock }),
  useAssignTopic: () => ({ mutate: jest.fn() }),
  useChangeStatus: () => ({ mutate: jest.fn() }),
  useRemoveAssignment: () => ({ mutate: jest.fn() }),
  useWardManagePrayers: () => ({ managePrayers: false, isLoading: false }),
  groupSpeechesBySunday: () => [],
}));

jest.mock('../hooks/useSundayTypes', () => ({
  useSundayExceptions: () => ({ data: [], isError: false, error: null, refetch: jest.fn() }),
  useSetSundayType: () => ({ mutate: jest.fn() }),
  useRemoveSundayException: () => ({ mutate: jest.fn() }),
}));
jest.mock('../hooks/useAgenda', () => ({ useAgendaRange: () => ({ data: [] }) }));

// speechUtils: force "next 3 fully assigned" + a controlled pending sunday so the section renders.
jest.mock('../lib/speechUtils', () => ({
  areNext3FullyAssigned: () => true,
  findNextPendingSunday: () => PENDING_ENTRY,
}));

// --- Helpers ---

async function render() {
  await rtlRender(React.createElement(NextAssignmentsSection));
  return null; // call-site compatibility; the helpers query `screen`
}

async function press(_renderer: unknown, testID: string) {
  await fireEvent.press(screen.getByTestId(testID));
}

beforeEach(() => {
  mockAssignSpeakerMock.mockClear();
  peoplePickerProps = null;
});

describe('Home NextAssignmentsSection — v2.0 people picker + delegation snapshot (Phase 3c)', () => {
  it('renders the PeoplePicker and it starts hidden', async () => {
    await render();
    expect(peoplePickerProps).not.toBeNull();
    expect(peoplePickerProps!.visible).toBe(false);
  });

  it('snapshots the responsible phone + is_delegated when a delegated member is selected (AC8)', async () => {
    const renderer = await render();
    await press(renderer, 'sunday-toggle'); // expand to surface the speech slots
    await press(renderer, 'open-selector-1');
    expect(peoplePickerProps!.visible).toBe(true);

    await act(() => peoplePickerProps!.onSelect(DELEGATE));

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

  it('records a non-delegated snapshot (own phone) for a direct member (AC8)', async () => {
    const renderer = await render();
    await press(renderer, 'sunday-toggle');
    await press(renderer, 'open-selector-1');

    await act(() => peoplePickerProps!.onSelect(DIRECT));

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
