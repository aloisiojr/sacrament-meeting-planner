/**
 * Behavioral test: AgendaForm passes a display-only `renderItemLabel` to the recognized
 * EditableListField so recognized people render as "Name — Calling" (calling resolved via the
 * shared `resolveCallingForName`), while names without a unique/called member stay as plain names.
 *
 * `react-native` is aliased to a test stub. The EditableListField is mocked to render each parsed
 * mockItem through the received `renderItemLabel` (the field that gets one is tagged 'recognized-list'),
 * exercising the REAL closure + resolveCallingForName. useMembers keeps its real pure exports
 * (normalizeForSearch) via importOriginal so matching works.
 */
import React from 'react';
import TestRenderer from 'react-test-renderer';
import type { Member, SundayAgenda, Speech } from '../types/database';
// jest.mock calls below are hoisted above these imports.
import { AgendaForm } from '../components/AgendaForm';

const { act } = TestRenderer;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

let mockAGENDA: SundayAgenda;
let mockMEMBERS: Member[] = [];
const SPEECHES: Speech[] = [];

// --- Mocks ---

jest.mock('../components/PeoplePicker', () => ({ PeoplePicker: () => null }));

jest.mock('../components/EditableListField', async () => {
  const ReactMod = (await import('react')).default;
  const parseItems = (value: string | string[] | null): string[] =>
    Array.isArray(value)
      ? value.filter((s) => s.trim() !== '')
      : (value ?? '').split('\n').filter((s) => s.trim() !== '');
  const joinItems = (items: string[]): string | null => (items.length === 0 ? null : items.join('\n'));
  return {
    parseItems,
    joinItems,
    EditableListField: (props: Record<string, unknown>) => {
      const render = props.renderItemLabel as ((mockItem: string) => string) | undefined;
      const items = parseItems(props.value as string | string[] | null);
      return ReactMod.createElement(
        'View',
        { testID: render ? 'recognized-list' : 'other-list' },
        items.map((it, i) =>
          ReactMod.createElement('Text', { key: i, testID: `label-${i}` }, render ? render(it) : it)
        )
      );
    },
  };
});

jest.mock('../components/DebouncedTextInput', () => ({ DebouncedTextInput: () => null }));

jest.mock('react-native-svg', async () => {
  const ReactMod = (await import('react')).default;
  const host = (name: string) => (props: Record<string, unknown>) => ReactMod.createElement(name, props);
  return { default: host('Svg'), Svg: host('Svg'), Path: host('Path'), Circle: host('Circle') };
});

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
  return { ...actual, useAgenda: () => ({ data: mockAGENDA }), useUpdateAgenda: () => ({ mutate: jest.fn() }) };
});

jest.mock('../hooks/useSpeeches', () => ({
  useSpeeches: () => ({ data: SPEECHES }),
  useWardManagePrayers: () => ({ managePrayers: false, isLoading: false }),
  useAssignSpeaker: () => ({ mutate: jest.fn() }),
  useRemoveAssignment: () => ({ mutate: jest.fn() }),
  useLazyCreateSpeeches: () => ({ mutate: jest.fn() }),
}));

jest.mock('../hooks/useHymns', () => ({
  useHymns: () => ({ data: [] }),
  useSacramentalHymns: () => ({ data: [] }),
  formatHymnDisplay: () => '',
  filterHymns: (h: unknown[]) => h,
}));

// Keep real pure exports (normalizeForSearch used by resolveCallingForName); override useMembers.
jest.mock('../hooks/useMembers', () => {
  const actual = (jest.requireActual('../hooks/useMembers')) as Record<string, unknown>;
  return { ...actual, useMembers: () => ({ data: mockMEMBERS }) };
});

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

function recognizedLabels(renderer: TestRenderer.ReactTestRenderer): string[] {
  const list = renderer.root.findAll(
    (n) => typeof n.type === 'string' && n.props.testID === 'recognized-list'
  )[0];
  const flatten = (c: unknown): string =>
    Array.isArray(c) ? c.map(flatten).join('') : typeof c === 'string' ? c : '';
  return list
    .findAll((n) => typeof n.type === 'string' && n.type === 'Text')
    .map((n) => flatten(n.props.children));
}

beforeEach(() => {
  mockAGENDA = {
    id: 'ag1', ward_id: 'w1', sunday_date: '2026-01-04',
    presiding_name: null, conducting_name: null,
    recognized_names: null, welcome_new_families: null, announcements: null,
    pianist_name: null, conductor_name: null,
    opening_hymn_id: null, opening_prayer_member_id: null, opening_prayer_name: null,
    designations: [], has_baby_blessing: false, baby_blessing_names: null,
    has_baptism_confirmation: false, baptism_confirmation_names: null, has_stake_announcements: false,
    sacrament_hymn_id: null, has_special_presentation: false, has_intermediate_hymn: false,
    special_presentation_description: null, intermediate_hymn_id: null,
    speaker_1_override: null, speaker_2_override: null, speaker_3_override: null,
    has_second_speech: true, closing_hymn_id: null, closing_prayer_member_id: null,
    closing_prayer_name: null, attendance: null, created_at: '', updated_at: '',
  };
  mockMEMBERS = [];
});

describe('AgendaForm recognized list → "Name — Calling"', () => {
  it('appends the calling for a member with a unique calling', () => {
    mockAGENDA.recognized_names = 'Ricardo Almeida';
    mockMEMBERS = [makeMember({ id: 'r', full_name: 'Ricardo Almeida', calling: 'Bispo', can_be_recognized: true })];
    const renderer = render();
    expect(recognizedLabels(renderer)).toEqual(['Ricardo Almeida — Bispo']);
  });

  it('shows the plain name when the member has no calling', () => {
    mockAGENDA.recognized_names = 'Paulo Santos';
    mockMEMBERS = [makeMember({ id: 'p', full_name: 'Paulo Santos', calling: null, can_be_recognized: true })];
    const renderer = render();
    expect(recognizedLabels(renderer)).toEqual(['Paulo Santos']);
  });

  it('enriches each line independently (called + uncalled)', () => {
    mockAGENDA.recognized_names = 'Ricardo Almeida\nPaulo Santos';
    mockMEMBERS = [
      makeMember({ id: 'r', full_name: 'Ricardo Almeida', calling: 'Bispo' }),
      makeMember({ id: 'p', full_name: 'Paulo Santos', calling: null }),
    ];
    const renderer = render();
    expect(recognizedLabels(renderer)).toEqual(['Ricardo Almeida — Bispo', 'Paulo Santos']);
  });
});
