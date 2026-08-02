/**
 * Integration test: the hymn scrubber wired into AgendaForm's HymnSelectorModal
 * (specs/v2-hymn-scrubber.md). Asserts:
 *  - the rail renders when the list has enough range and no search is active (AC1);
 *  - touching the rail scrolls the FlatList to the first hymn >= the anchor (AC2);
 *  - the FlatList uses a fixed-height getItemLayout (exact scroll math);
 *  - the rail disappears once a search filter is active (AC5).
 */
import React from 'react';
import { render as rtlRender, screen, fireEvent, act } from '@testing-library/react-native';
import type { SundayAgenda, Hymn } from '../types/database';


const mockH = {
  scrollToOffset: jest.fn(),
  searchProps: null as null | { value: string; onChangeText: (s: string) => void },
};
const mockAuth = { canWrite: true };
const mockUpdateAgendaMutate = jest.fn();

let mockAGENDA: SundayAgenda;
const mockHYMNS: Hymn[] = [
  { id: 'h1', language: 'pt-BR', number: 1, title: 'Hino 1', is_sacramental: false },
  { id: 'h50', language: 'pt-BR', number: 50, title: 'Hino 50', is_sacramental: false },
  { id: 'h174', language: 'pt-BR', number: 174, title: 'Hino 174', is_sacramental: false },
];

// FlatList is mocked to expose a scrollToOffset spy on its ref, which is what the scrubber
// asserts against. Only the FlatList submodule is replaced — mocking the `react-native` root and
// spreading it would eagerly instantiate every lazily-required native module.
jest.mock('react-native/Libraries/Lists/FlatList', () => {
  const ReactMod = require('react');
  const FlatList = ReactMod.forwardRef((props: any, ref: any) => {
    ReactMod.useImperativeHandle(ref, () => ({ scrollToOffset: mockH.scrollToOffset }));
    const data: any[] = props.data ?? [];
    return ReactMod.createElement(
      'FlatList',
      props,
      data.length === 0
        ? props.ListEmptyComponent
        : data.map((item, i) =>
            ReactMod.cloneElement(props.renderItem({ item, index: i }), {
              key: props.keyExtractor ? props.keyExtractor(item) : i,
            })
          )
    );
  });
  (FlatList as { displayName?: string }).displayName = 'FlatList';
  return { __esModule: true, default: FlatList };
});

jest.mock('../components/SearchInput', () => ({
  SearchInput: (props: any) => {
    mockH.searchProps = props;
    return null;
  },
}));
jest.mock('../components/DesignationListField', () => ({ DesignationListField: () => null }));
jest.mock('../components/PeoplePicker', () => ({ PeoplePicker: () => null }));
jest.mock('../components/EditableListField', () => ({
  parseItems: () => [],
  joinItems: () => null,
  EditableListField: () => null,
}));
jest.mock('../components/DebouncedTextInput', () => ({ DebouncedTextInput: () => null }));
jest.mock('../components/icons', () => ({ XIcon: () => null, PencilIcon: () => null }));
jest.mock('react-i18next', () => {
  const actual = (jest.requireActual('react-i18next')) as Record<string, unknown>;
  return { ...actual, useTranslation: () => ({ t: (k: string) => k }) };
});
jest.mock('../i18n', () => ({ getCurrentLanguage: () => 'pt-BR' }));
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
  useAuth: () => ({ hasPermission: (p: string) => (p === 'agenda:write' ? mockAuth.canWrite : true) }),
}));
jest.mock('../hooks/useAgenda', () => {
  const actual = (jest.requireActual('../hooks/useAgenda')) as Record<string, unknown>;
  return { ...actual, useAgenda: () => ({ data: mockAGENDA }), useUpdateAgenda: () => ({ mutate: mockUpdateAgendaMutate }) };
});
jest.mock('../hooks/useSpeeches', () => ({
  useSpeeches: () => ({ data: [] }),
  useWardManagePrayers: () => ({ managePrayers: false, isLoading: false }),
  useAssignSpeaker: () => ({ mutate: jest.fn() }),
  useRemoveAssignment: () => ({ mutate: jest.fn() }),
  useLazyCreateSpeeches: () => ({ mutate: jest.fn() }),
}));
jest.mock('../hooks/useHymns', () => ({
  useHymns: () => ({ data: mockHYMNS }),
  useSacramentalHymns: () => ({ data: [] }),
  formatHymnDisplay: (h: Hymn) => `${h.number} - ${h.title}`,
  filterHymns: (h: Hymn[]) => h,
}));
jest.mock('../hooks/useMembers', () => ({ useMembers: () => ({ data: [] }) }));

import { AgendaForm } from '../components/AgendaForm';

async function renderAndOpenHymnModal() {
  await rtlRender(<AgendaForm sundayDate="2026-01-04" exceptionReason={null} />);
  await fireEvent.press(screen.getByTestId('agenda-opening-hymn-selector'));
  return null; // call-site compatibility; the helpers query `screen`
}

const railOf = (r: unknown) =>
  screen.root!.queryAll((n: any) => typeof n.type === 'string' && n.props.testID === 'hymn-scrubber-rail')[0] as any;

beforeEach(() => {
  mockAuth.canWrite = true;
  mockH.scrollToOffset.mockClear();
  mockH.searchProps = null;
  mockUpdateAgendaMutate.mockClear();
  mockAGENDA = {
    id: 'ag1', ward_id: 'w1', sunday_date: '2026-01-04',
    presiding_name: null, conducting_name: null, recognized_names: null,
    welcome_new_families: null, announcements: null, pianist_name: null, conductor_name: null,
    opening_hymn_id: null, opening_prayer_member_id: null, opening_prayer_name: null,
    designations: [], has_baby_blessing: false, baby_blessing_names: null,
    has_baptism_confirmation: false, baptism_confirmation_names: null, has_stake_announcements: false,
    sacrament_hymn_id: null, has_special_presentation: false, has_intermediate_hymn: false,
    special_presentation_description: null, intermediate_hymn_id: null,
    speaker_1_override: null, speaker_2_override: null, speaker_3_override: null,
    has_second_speech: true, closing_hymn_id: null, closing_prayer_member_id: null,
    closing_prayer_name: null, attendance: null, created_at: '', updated_at: '',
  } as SundayAgenda;
});

describe('Hymn scrubber ↔ AgendaForm HymnSelectorModal', () => {
  it('renders the rail when the list has enough range and no search is active (AC1)', async () => {
    const r = await renderAndOpenHymnModal();
    expect(railOf(r)).toBeTruthy();
  });

  it('scrubbing the rail scrolls to the first hymn >= the target anchor, using fixed row height (AC2/AC3)', async () => {
    const r = await renderAndOpenHymnModal();
    // hymns 1/50/174 → decades {0,50,170} → anchors [1,50,170].
    const rail = railOf(r);
    // A touch well below the band clamps to the last anchor (170).
    await act(async () => rail.props.onPanResponderGrant({ nativeEvent: { pageY: 100000 } }));
    // first hymn >= 170 is 174 at index 2 → offset 2*44.
    expect(mockH.scrollToOffset).toHaveBeenLastCalledWith({ offset: 88, animated: false });
  });

  it('uses a fixed-height getItemLayout on the FlatList', async () => {
    const r = await renderAndOpenHymnModal();
    const list = screen.root!.queryAll((n: any) => typeof n.type === 'string' && n.type === 'FlatList')[0] as any;
    expect(list.props.getItemLayout(null, 3)).toEqual({ length: 44, offset: 132, index: 3 });
  });

  it('hides the rail once a search filter is active (AC5)', async () => {
    const r = await renderAndOpenHymnModal();
    expect(railOf(r)).toBeTruthy();
    await act(async () => mockH.searchProps!.onChangeText('50'));
    expect(railOf(r)).toBeUndefined();
  });
});
