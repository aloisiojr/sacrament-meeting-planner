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
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import TestRenderer from 'react-test-renderer';
import type { Member, SundayAgenda, Speech } from '../types/database';
// vi.mock calls below are hoisted above these imports, so the mocks still apply.
import { AgendaForm } from '../components/AgendaForm';

const { act } = TestRenderer;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// --- Hoisted shared spies (referenced inside vi.mock factories) ---

const h = vi.hoisted(() => ({
  lastPickerProps: null as null | {
    context?: string;
    capability?: string;
    multiSelect?: boolean;
    selectedIds?: string[];
    onSelect: (m: Member) => void;
  },
}));

const updateAgendaMutate = vi.fn();
const assignSpeakerMutate = vi.fn();
const removeAssignmentMutate = vi.fn();

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

let AGENDA: SundayAgenda;
let MEMBERS: Member[] = [];
const SPEECHES: Speech[] = [
  { id: 's0', ward_id: 'w1', sunday_date: '2026-01-04', position: 0, member_id: null, speaker_name: null, speaker_informal_name: null, speaker_phone: null, topic_title: null, topic_link: null, topic_collection: null, assigned_by_role: null, status: 'not_assigned', contact_phone: null, is_delegated: false, delegate_for_name: null, created_at: '', updated_at: '' },
  { id: 's4', ward_id: 'w1', sunday_date: '2026-01-04', position: 4, member_id: null, speaker_name: null, speaker_informal_name: null, speaker_phone: null, topic_title: null, topic_link: null, topic_collection: null, assigned_by_role: null, status: 'not_assigned', contact_phone: null, is_delegated: false, delegate_for_name: null, created_at: '', updated_at: '' },
];

// --- Mocks ---

vi.mock('../components/PeoplePicker', () => ({
  PeoplePicker: (props: Record<string, unknown>) => {
    h.lastPickerProps = props as unknown as typeof h.lastPickerProps;
    return null;
  },
}));

// EditableListField: the real module pulls in react-native-draggable-flatlist (untransformed), so
// reimplement the pure \n-join helpers here and stub the UI to expose onAddPress via a testID for
// the recognition field only (the sole usage that passes onAddPress).
vi.mock('../components/EditableListField', async () => {
  const ReactMod = (await import('react')).default;
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

vi.mock('../components/DebouncedTextInput', () => ({ DebouncedTextInput: () => null }));

vi.mock('react-native-svg', async () => {
  const ReactMod = (await import('react')).default;
  const host = (name: string) => (props: Record<string, unknown>) => ReactMod.createElement(name, props);
  return { default: host('Svg'), Svg: host('Svg'), Path: host('Path'), Circle: host('Circle') };
});

vi.mock('react-i18next', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, useTranslation: () => ({ t: (k: string) => k }) };
});

vi.mock('../i18n', () => ({ getCurrentLanguage: () => 'en-US' }));

vi.mock('expo-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#000', card: '#111', text: '#fff', textSecondary: '#aaa', textTertiary: '#888',
      primary: '#07f', onPrimary: '#fff', error: '#f00', divider: '#333', border: '#333',
      surfaceVariant: '#222', inputBackground: '#111', inputBorder: '#333', placeholder: '#666',
    },
  }),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ hasPermission: () => true }),
}));

vi.mock('../hooks/useAgenda', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    useAgenda: () => ({ data: AGENDA }),
    useUpdateAgenda: () => ({ mutate: updateAgendaMutate }),
  };
});

vi.mock('../hooks/useSpeeches', () => ({
  useSpeeches: () => ({ data: SPEECHES }),
  useWardManagePrayers: () => ({ managePrayers: false, isLoading: false }),
  useAssignSpeaker: () => ({ mutate: assignSpeakerMutate }),
  useRemoveAssignment: () => ({ mutate: removeAssignmentMutate }),
  useLazyCreateSpeeches: () => ({ mutate: vi.fn() }),
}));

vi.mock('../hooks/useHymns', () => ({
  useHymns: () => ({ data: [] }),
  useSacramentalHymns: () => ({ data: [] }),
  formatHymnDisplay: () => '',
  filterHymns: (h2: unknown[]) => h2,
}));

vi.mock('../hooks/useMembers', () => ({
  useMembers: () => ({ data: MEMBERS }),
}));

// --- Helpers ---

function render() {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      React.createElement(AgendaForm, { sundayDate: '2026-01-04', exceptionReason: null })
    );
  });
  return renderer;
}

function press(root: TestRenderer.TestInstance, testID: string) {
  const node = root.findAll((n) => typeof n.type === 'string' && n.props.testID === testID)[0];
  act(() => {
    (node.props.onPress as () => void)();
  });
}

beforeEach(() => {
  AGENDA = {
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
  MEMBERS = [MEMBER];
  h.lastPickerProps = null;
  updateAgendaMutate.mockClear();
  assignSpeakerMutate.mockClear();
  removeAssignmentMutate.mockClear();
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
    it(`${nameField}: opens PeoplePicker with context='${context}' and writes only the name snapshot`, () => {
      const renderer = render();
      press(renderer.root, testID);
      expect(h.lastPickerProps?.context).toBe(context);
      expect(h.lastPickerProps?.multiSelect).toBeFalsy();

      act(() => h.lastPickerProps!.onSelect(MEMBER));
      expect(updateAgendaMutate).toHaveBeenCalledTimes(1);
      const { fields } = updateAgendaMutate.mock.calls[0][0] as { fields: Record<string, unknown> };
      expect(fields[nameField]).toBe('Alice Smith');
      // v2.0: only the name snapshot column is written (no actor FK columns).
      expect(Object.keys(fields)).toEqual([nameField]);
    });
  }

  it('recognition: opens multiSelect with context be_recognized and newline-joins names', () => {
    const renderer = render();
    press(renderer.root, 'mock-recognize-add');
    expect(h.lastPickerProps?.context).toBe('be_recognized');
    expect(h.lastPickerProps?.multiSelect).toBe(true);
    expect(h.lastPickerProps?.selectedIds).toEqual([]);

    act(() => h.lastPickerProps!.onSelect(MEMBER));
    expect(updateAgendaMutate).toHaveBeenCalledTimes(1);
    const { fields } = updateAgendaMutate.mock.calls[0][0] as { fields: Record<string, unknown> };
    expect(fields.recognized_names).toBe('Alice Smith');
  });

  it('recognition: appends to existing names (newline-joined) and reflects selectedIds', () => {
    AGENDA.recognized_names = 'Bob Jones';
    MEMBERS = [MEMBER, makeMember({ id: 'm2', full_name: 'Bob Jones' })];
    const renderer = render();
    press(renderer.root, 'mock-recognize-add');
    // Bob is already recognized → highlighted via selectedIds.
    expect(h.lastPickerProps?.selectedIds).toEqual(['m2']);

    act(() => h.lastPickerProps!.onSelect(MEMBER));
    const { fields } = updateAgendaMutate.mock.calls[0][0] as { fields: Record<string, unknown> };
    expect(fields.recognized_names).toBe('Bob Jones\nAlice Smith');
  });

  it('recognition: toggling an already-selected member removes it', () => {
    AGENDA.recognized_names = 'Alice Smith';
    const renderer = render();
    press(renderer.root, 'mock-recognize-add');
    expect(h.lastPickerProps?.selectedIds).toEqual(['m1']);
    act(() => h.lastPickerProps!.onSelect(MEMBER));
    const { fields } = updateAgendaMutate.mock.calls[0][0] as { fields: Record<string, unknown> };
    expect(fields.recognized_names).toBeNull();
  });

  it('prayers: open PeoplePicker with context opening_prayer and assign the member to the speech', () => {
    const renderer = render();
    press(renderer.root, 'agenda-opening-prayer-selector');
    expect(h.lastPickerProps?.context).toBe('opening_prayer');
    expect(h.lastPickerProps?.capability).toBeUndefined();
    expect(h.lastPickerProps?.multiSelect).toBeFalsy();

    act(() => h.lastPickerProps!.onSelect(MEMBER));
    expect(assignSpeakerMutate).toHaveBeenCalledTimes(1);
    const input = assignSpeakerMutate.mock.calls[0][0] as Record<string, unknown>;
    expect(input.speechId).toBe('s0');
    expect(input.memberId).toBe('m1');
    expect(input.speakerName).toBe('Alice Smith');
    expect(input.speakerPhone).toBe('+1555');
    expect(input.isDelegated).toBe(false);
    // Prayers write to the speech, not the agenda actor columns.
    expect(updateAgendaMutate).not.toHaveBeenCalled();
  });

  it('prayers: delegation snapshot resolves the responsible contact', () => {
    const responsible = makeMember({ id: 'r1', full_name: 'Carol Boss', country_code: '+55', phone: '999' });
    const delegated = makeMember({ id: 'd1', full_name: 'Dan Dep', informal_name: 'Dan', contact_via_responsible: true, responsible_id: 'r1' });
    MEMBERS = [responsible, delegated];
    const renderer = render();
    press(renderer.root, 'agenda-closing-prayer-selector');
    expect(h.lastPickerProps?.context).toBe('closing_prayer');
    act(() => h.lastPickerProps!.onSelect(delegated));
    const input = assignSpeakerMutate.mock.calls[0][0] as Record<string, unknown>;
    expect(input.speechId).toBe('s4');
    expect(input.isDelegated).toBe(true);
    expect(input.contactPhone).toBe('+55999');
    expect(input.delegateForName).toBe('Dan');
  });
});
