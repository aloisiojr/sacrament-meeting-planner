/**
 * Integration test: the hymn scrubber wired into AgendaForm's HymnSelectorModal
 * (specs/v2-hymn-scrubber.md). Asserts:
 *  - the rail renders when the list has enough range and no search is active (AC1);
 *  - touching the rail scrolls the FlatList to the first hymn >= the anchor (AC2);
 *  - the FlatList uses a fixed-height getItemLayout (exact scroll math);
 *  - the rail disappears once a search filter is active (AC5).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import TestRenderer from 'react-test-renderer';
import type { SundayAgenda, Hymn } from '../types/database';

const { act } = TestRenderer;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const H = vi.hoisted(() => ({
  scrollToOffset: vi.fn(),
  searchProps: null as null | { value: string; onChangeText: (s: string) => void },
}));
const auth = vi.hoisted(() => ({ canWrite: true }));
const updateAgendaMutate = vi.fn();

let AGENDA: SundayAgenda;
const HYMNS: Hymn[] = [
  { id: 'h1', language: 'pt-BR', number: 1, title: 'Hino 1', is_sacramental: false },
  { id: 'h50', language: 'pt-BR', number: 50, title: 'Hino 50', is_sacramental: false },
  { id: 'h174', language: 'pt-BR', number: 174, title: 'Hino 174', is_sacramental: false },
];

// Partial react-native mock: give FlatList a real ref (scrollToOffset spy) and render its rows.
vi.mock('react-native', async () => {
  const actual = (await vi.importActual('./stubs/react-native')) as Record<string, unknown>;
  const ReactMod = (await import('react')).default;
  const FlatList = ReactMod.forwardRef((props: any, ref: any) => {
    ReactMod.useImperativeHandle(ref, () => ({ scrollToOffset: H.scrollToOffset }));
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
  return { ...actual, FlatList };
});

vi.mock('../components/SearchInput', () => ({
  SearchInput: (props: any) => {
    H.searchProps = props;
    return null;
  },
}));
vi.mock('../components/DesignationListField', () => ({ DesignationListField: () => null }));
vi.mock('../components/PeoplePicker', () => ({ PeoplePicker: () => null }));
vi.mock('../components/EditableListField', () => ({
  parseItems: () => [],
  joinItems: () => null,
  EditableListField: () => null,
}));
vi.mock('../components/DebouncedTextInput', () => ({ DebouncedTextInput: () => null }));
vi.mock('./icons', () => ({ XIcon: () => null, PencilIcon: () => null }));
vi.mock('../components/icons', () => ({ XIcon: () => null, PencilIcon: () => null }));
vi.mock('react-i18next', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, useTranslation: () => ({ t: (k: string) => k }) };
});
vi.mock('../i18n', () => ({ getCurrentLanguage: () => 'pt-BR' }));
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
  useAuth: () => ({ hasPermission: (p: string) => (p === 'agenda:write' ? auth.canWrite : true) }),
}));
vi.mock('../hooks/useAgenda', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, useAgenda: () => ({ data: AGENDA }), useUpdateAgenda: () => ({ mutate: updateAgendaMutate }) };
});
vi.mock('../hooks/useSpeeches', () => ({
  useSpeeches: () => ({ data: [] }),
  useWardManagePrayers: () => ({ managePrayers: false, isLoading: false }),
  useAssignSpeaker: () => ({ mutate: vi.fn() }),
  useRemoveAssignment: () => ({ mutate: vi.fn() }),
  useLazyCreateSpeeches: () => ({ mutate: vi.fn() }),
}));
vi.mock('../hooks/useHymns', () => ({
  useHymns: () => ({ data: HYMNS }),
  useSacramentalHymns: () => ({ data: [] }),
  formatHymnDisplay: (h: Hymn) => `${h.number} - ${h.title}`,
  filterHymns: (h: Hymn[]) => h,
}));
vi.mock('../hooks/useMembers', () => ({ useMembers: () => ({ data: [] }) }));

import { AgendaForm } from '../components/AgendaForm';

function renderAndOpenHymnModal() {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      React.createElement(AgendaForm, { sundayDate: '2026-01-04', exceptionReason: null })
    );
  });
  const opener = renderer.root.findAll(
    (n: any) => typeof n.type === 'string' && n.props.testID === 'agenda-opening-hymn-selector'
  )[0] as any;
  act(() => opener.props.onPress());
  return renderer;
}

const railOf = (r: TestRenderer.ReactTestRenderer) =>
  r.root.findAll((n: any) => typeof n.type === 'string' && n.props.testID === 'hymn-scrubber-rail')[0] as any;

beforeEach(() => {
  auth.canWrite = true;
  H.scrollToOffset.mockClear();
  H.searchProps = null;
  updateAgendaMutate.mockClear();
  AGENDA = {
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
  it('renders the rail when the list has enough range and no search is active (AC1)', () => {
    const r = renderAndOpenHymnModal();
    expect(railOf(r)).toBeTruthy();
  });

  it('scrubbing the rail scrolls to the first hymn >= the target anchor, using fixed row height (AC2/AC3)', () => {
    const r = renderAndOpenHymnModal();
    // hymns 1/50/174 → decades {0,50,170} → anchors [1,50,170].
    const rail = railOf(r);
    // A touch well below the band clamps to the last anchor (170).
    act(() => rail.props.onPanResponderGrant({ nativeEvent: { pageY: 100000 } }));
    // first hymn >= 170 is 174 at index 2 → offset 2*44.
    expect(H.scrollToOffset).toHaveBeenLastCalledWith({ offset: 88, animated: false });
  });

  it('uses a fixed-height getItemLayout on the FlatList', () => {
    const r = renderAndOpenHymnModal();
    const list = r.root.findAll((n: any) => typeof n.type === 'string' && n.type === 'FlatList')[0] as any;
    expect(list.props.getItemLayout(null, 3)).toEqual({ length: 44, offset: 132, index: 3 });
  });

  it('hides the rail once a search filter is active (AC5)', () => {
    const r = renderAndOpenHymnModal();
    expect(railOf(r)).toBeTruthy();
    act(() => H.searchProps!.onChangeText('50'));
    expect(railOf(r)).toBeUndefined();
  });
});
