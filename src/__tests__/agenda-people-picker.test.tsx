/**
 * Behavioral tests for the AgendaForm → PeoplePicker migration (v2.0, phase 3b).
 *
 * `react-native` is aliased to a test stub (vitest.config.ts). PeoplePicker is replaced with a spy
 * that records the props it is opened with and lets the test invoke `onSelect`. All data hooks,
 * contexts and i18n are mocked per-file. Asserts:
 *  - each actor-role field opens PeoplePicker with the correct `capability`;
 *  - selecting a member writes ONLY the `*_name` snapshot (no actor FK columns);
 *  - recognition opens multiSelect with capability `be_recognized` and newline-joins names;
 *  - prayers open PeoplePicker with NO capability and assign the member to the speech.
 */
import React from 'react';
import { render as rtlRender, screen, fireEvent, act } from '@testing-library/react-native';
import type { Member, SundayAgenda, Speech } from '../types/database';
// jest.mock calls below are hoisted above these imports, so the mocks still apply.
import { AgendaForm } from '../components/AgendaForm';


// --- Hoisted shared spies (referenced inside jest.mock factories) ---

const mockH = {
  lastPickerProps: null as null | {
    context?: string;
    capability?: string;
    multiSelect?: boolean;
    selectedIds?: string[];
    onSelect?: (m: Member) => void;
    onConfirmMulti?: (members: Member[]) => void;
  },
};

const mockUpdateAgendaMutate = jest.fn();
const mockAssignSpeakerMutate = jest.fn();
const mockRemoveAssignmentMutate = jest.fn();

// --- Test data ---

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

const MEMBER = makeMember({ id: 'm1', full_name: 'Alice Smith', informal_name: 'Alice', phone: '555' });

let mockAGENDA: SundayAgenda;
let mockMEMBERS: Member[] = [];
const mockSPEECHES: Speech[] = [
  { id: 's0', ward_id: 'w1', sunday_date: '2026-01-04', position: 0, member_id: null, speaker_name: null, speaker_informal_name: null, speaker_phone: null, topic_title: null, topic_link: null, topic_collection: null, assigned_by_role: null, status: 'not_assigned', contact_phone: null, is_delegated: false, delegate_for_name: null, created_at: '', updated_at: '' },
  { id: 's4', ward_id: 'w1', sunday_date: '2026-01-04', position: 4, member_id: null, speaker_name: null, speaker_informal_name: null, speaker_phone: null, topic_title: null, topic_link: null, topic_collection: null, assigned_by_role: null, status: 'not_assigned', contact_phone: null, is_delegated: false, delegate_for_name: null, created_at: '', updated_at: '' },
];

// --- Mocks ---

jest.mock('../components/PeoplePicker', () => ({
  PeoplePicker: (props: Record<string, unknown>) => {
    mockH.lastPickerProps = props as unknown as typeof mockH.lastPickerProps;
    return null;
  },
}));

// EditableListField: the real module pulls in react-native-draggable-flatlist (untransformed), so
// reimplement the pure \n-join helpers here and stub the UI to expose onAddPress via a testID for
// the recognition field only (the sole usage that passes onAddPress).
jest.mock('../components/EditableListField', () => {
  const ReactMod = require('react');
  const parseItems = (value: string | string[] | null): string[] =>
    Array.isArray(value)
      ? value.filter((s) => s.trim() !== '')
      : (value ?? '').split('\n').filter((s) => s.trim() !== '');
  const joinItems = (items: string[]): string | null => (items.length === 0 ? null : items.join('\n'));
  return {
    parseItems,
    joinItems,
    EditableListField: (props: Record<string, unknown>) =>
      props.onAddPress
        ? ReactMod.createElement('Pressable', { testID: 'mock-recognize-add', onPress: props.onAddPress })
        : null,
  };
});

jest.mock('../components/DebouncedTextInput', () => ({ DebouncedTextInput: () => null }));

jest.mock('react-i18next', () => {
  const actual = (jest.requireActual('react-i18next')) as Record<string, unknown>;
  return { ...actual, useTranslation: () => ({ t: (k: string) => k }) };
});

jest.mock('../i18n', () => ({ getCurrentLanguage: () => 'en-US' }));

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));

jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#000', card: '#111', text: '#fff', textSecondary: '#aaa', textTertiary: '#888',
      primary: '#07f', onPrimary: '#fff', error: '#f00', divider: '#333', border: '#333',
      surfaceVariant: '#222', inputBackground: '#111', inputBorder: '#333', placeholder: '#666',
    },
  }),
}));

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ hasPermission: () => true }),
}));

jest.mock('../hooks/useAgenda', () => {
  const actual = (jest.requireActual('../hooks/useAgenda')) as Record<string, unknown>;
  return {
    ...actual,
    useAgenda: () => ({ data: mockAGENDA }),
    useUpdateAgenda: () => ({ mutate: mockUpdateAgendaMutate }),
  };
});

jest.mock('../hooks/useSpeeches', () => ({
  useSpeeches: () => ({ data: mockSPEECHES }),
  useWardManagePrayers: () => ({ managePrayers: false, isLoading: false }),
  useAssignSpeaker: () => ({ mutate: mockAssignSpeakerMutate }),
  useRemoveAssignment: () => ({ mutate: mockRemoveAssignmentMutate }),
  useLazyCreateSpeeches: () => ({ mutate: jest.fn() }),
}));

jest.mock('../hooks/useHymns', () => ({
  useHymns: () => ({ data: [] }),
  useSacramentalHymns: () => ({ data: [] }),
  formatHymnDisplay: () => '',
  filterHymns: (h2: unknown[]) => h2,
}));

jest.mock('../hooks/useMembers', () => ({
  useMembers: () => ({ data: mockMEMBERS }),
}));

// --- Helpers ---

async function render() {
  await rtlRender(React.createElement(AgendaForm, { sundayDate: '2026-01-04', exceptionReason: null }));
  return null; // call-site compatibility; the helpers query `screen`
}

async function press(_root: unknown, testID: string) {
  await fireEvent.press(screen.getByTestId(testID));
}

beforeEach(() => {
  mockAGENDA = {
    id: 'ag1', ward_id: 'w1', sunday_date: '2026-01-04',
    presiding_name: null,
    conducting_name: null,
    recognized_names: null,
    welcome_new_families: null, announcements: null,
    pianist_name: null,
    conductor_name: null,
    opening_hymn_id: null, opening_prayer_member_id: null, opening_prayer_name: null,
    designations: [], has_baby_blessing: false, baby_blessing_names: null,
    has_baptism_confirmation: false, baptism_confirmation_names: null, has_stake_announcements: false,
    sacrament_hymn_id: null, has_special_presentation: false, has_intermediate_hymn: false,
    special_presentation_description: null, intermediate_hymn_id: null,
    speaker_1_override: null, speaker_2_override: null, speaker_3_override: null,
    has_second_speech: true, closing_hymn_id: null, closing_prayer_member_id: null,
    closing_prayer_name: null, attendance: null, created_at: '', updated_at: '',
  };
  mockMEMBERS = [MEMBER];
  mockH.lastPickerProps = null;
  mockUpdateAgendaMutate.mockClear();
  mockAssignSpeakerMutate.mockClear();
  mockRemoveAssignmentMutate.mockClear();
});

// --- Tests ---

describe('AgendaForm → PeoplePicker (v2.0 phase 3b)', () => {
  const roleCases: { testID: string; context: string; nameField: string }[] = [
    { testID: 'agenda-presiding-selector', context: 'preside', nameField: 'presiding_name' },
    { testID: 'agenda-conducting-selector', context: 'conduct', nameField: 'conducting_name' },
    { testID: 'agenda-pianist-selector', context: 'play_piano', nameField: 'pianist_name' },
    { testID: 'agenda-conductor-selector', context: 'lead_music', nameField: 'conductor_name' },
  ];

  for (const { testID, context, nameField } of roleCases) {
    it(`${nameField}: opens PeoplePicker with context='${context}' and writes only the name snapshot`, async () => {
      await render();
      await press(null, testID);
      expect(mockH.lastPickerProps?.context).toBe(context);
      expect(mockH.lastPickerProps?.multiSelect).toBeFalsy();

      await act(async () => mockH.lastPickerProps!.onSelect!(MEMBER));
      expect(mockUpdateAgendaMutate).toHaveBeenCalledTimes(1);
      const { fields } = mockUpdateAgendaMutate.mock.calls[0][0] as { fields: Record<string, unknown> };
      expect(fields[nameField]).toBe('Alice Smith');
      // v2.0: only the name snapshot column is written (no actor FK columns).
      expect(Object.keys(fields)).toEqual([nameField]);
    });
  }

  it('recognition: opens multiSelect (draft) and Save commits the selected names', async () => {
    await render();
    await press(null, 'mock-recognize-add');
    expect(mockH.lastPickerProps?.context).toBe('be_recognized');
    expect(mockH.lastPickerProps?.multiSelect).toBe(true);
    expect(mockH.lastPickerProps?.selectedIds).toEqual([]);

    await act(async () => mockH.lastPickerProps!.onConfirmMulti!([MEMBER]));
    expect(mockUpdateAgendaMutate).toHaveBeenCalledTimes(1);
    const { fields } = mockUpdateAgendaMutate.mock.calls[0][0] as { fields: Record<string, unknown> };
    expect(fields.recognized_names).toBe('Alice Smith');
  });

  it('recognition: Save replaces the list with the full confirmed selection', async () => {
    mockAGENDA.recognized_names = 'Bob Jones';
    mockMEMBERS = [MEMBER, makeMember({ id: 'm2', full_name: 'Bob Jones' })];
    await render();
    await press(null, 'mock-recognize-add');
    // Bob is already recognized → seeded into the draft via selectedIds.
    expect(mockH.lastPickerProps?.selectedIds).toEqual(['m2']);

    await act(async () => mockH.lastPickerProps!.onConfirmMulti!([mockMEMBERS[1], MEMBER]));
    const { fields } = mockUpdateAgendaMutate.mock.calls[0][0] as { fields: Record<string, unknown> };
    expect(fields.recognized_names).toBe('Bob Jones\nAlice Smith');
  });

  it('recognition: Save preserves free-typed (non-member) names and replaces the member part', async () => {
    mockAGENDA.recognized_names = 'Guest Speaker'; // free text, not a ward member
    mockMEMBERS = [MEMBER];
    await render();
    await press(null, 'mock-recognize-add');
    expect(mockH.lastPickerProps?.selectedIds).toEqual([]); // free text isn't a member → not seeded
    await act(async () => mockH.lastPickerProps!.onConfirmMulti!([MEMBER]));
    const { fields } = mockUpdateAgendaMutate.mock.calls[0][0] as { fields: Record<string, unknown> };
    expect(fields.recognized_names).toBe('Guest Speaker\nAlice Smith');
  });

  it('recognition: Save with an empty selection clears the list', async () => {
    mockAGENDA.recognized_names = 'Alice Smith';
    await render();
    await press(null, 'mock-recognize-add');
    expect(mockH.lastPickerProps?.selectedIds).toEqual(['m1']);
    await act(async () => mockH.lastPickerProps!.onConfirmMulti!([]));
    const { fields } = mockUpdateAgendaMutate.mock.calls[0][0] as { fields: Record<string, unknown> };
    expect(fields.recognized_names).toBeNull();
  });

  it('prayers: open PeoplePicker with context opening_prayer and assign the member to the speech', async () => {
    await render();
    await press(null, 'agenda-opening-prayer-selector');
    expect(mockH.lastPickerProps?.context).toBe('opening_prayer');
    expect(mockH.lastPickerProps?.capability).toBeUndefined();
    expect(mockH.lastPickerProps?.multiSelect).toBeFalsy();

    await act(async () => mockH.lastPickerProps!.onSelect!(MEMBER));
    expect(mockAssignSpeakerMutate).toHaveBeenCalledTimes(1);
    const input = mockAssignSpeakerMutate.mock.calls[0][0] as Record<string, unknown>;
    expect(input.speechId).toBe('s0');
    expect(input.memberId).toBe('m1');
    expect(input.speakerName).toBe('Alice Smith');
    expect(input.speakerPhone).toBe('+1555');
    expect(input.isDelegated).toBe(false);
    // Prayers write to the speech, not the agenda actor columns.
    expect(mockUpdateAgendaMutate).not.toHaveBeenCalled();
  });

  it('prayers: delegation snapshot resolves the responsible contact', async () => {
    const responsible = makeMember({ id: 'r1', full_name: 'Carol Boss', country_code: '+55', phone: '999' });
    const delegated = makeMember({ id: 'd1', full_name: 'Dan Dep', informal_name: 'Dan', contact_via_responsible: true, responsible_id: 'r1' });
    mockMEMBERS = [responsible, delegated];
    await render();
    await press(null, 'agenda-closing-prayer-selector');
    expect(mockH.lastPickerProps?.context).toBe('closing_prayer');
    await act(async () => mockH.lastPickerProps!.onSelect!(delegated));
    const input = mockAssignSpeakerMutate.mock.calls[0][0] as Record<string, unknown>;
    expect(input.speechId).toBe('s4');
    expect(input.isDelegated).toBe(true);
    expect(input.contactPhone).toBe('+55999');
    expect(input.delegateForName).toBe('Dan');
  });
});
