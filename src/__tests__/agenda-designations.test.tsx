/**
 * Behavioral test for AgendaForm → DesignationListField wiring (specs/v2-supports-releases.md,
 * step 4). `react-native` is aliased to a stub; DesignationListField is replaced with a seam that
 * records the props it is rendered with so we can drive its callbacks. Asserts:
 *  - the agenda's `designations` array is passed through (AC4);
 *  - add / row tap navigate to /designations/[date] with the right params (AC5);
 *  - remove writes the filtered array back via updateField (AC5b);
 *  - an observer gets a read-only (disabled) field (AC14).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import TestRenderer from 'react-test-renderer';
import type { SundayAgenda, Designation } from '../types/database';
import { AgendaForm } from '../components/AgendaForm';

const { act } = TestRenderer;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const dlf = vi.hoisted(() => ({
  props: null as null | {
    value: Designation[];
    disabled?: boolean;
    onItemPress: (i: number) => void;
    onAddPress: () => void;
    onRemove: (i: number) => void;
  },
}));
const auth = vi.hoisted(() => ({ canWrite: true }));
const routerPush = vi.fn();
const updateAgendaMutate = vi.fn();

let AGENDA: SundayAgenda;

// --- Mocks ---
vi.mock('../components/DesignationListField', () => ({
  DesignationListField: (props: Record<string, unknown>) => {
    dlf.props = props as unknown as typeof dlf.props;
    return null;
  },
}));
vi.mock('../components/PeoplePicker', () => ({ PeoplePicker: () => null }));
vi.mock('../components/EditableListField', () => ({
  parseItems: () => [],
  joinItems: () => null,
  EditableListField: () => null,
}));
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
vi.mock('expo-router', () => ({ useRouter: () => ({ push: routerPush }) }));
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
  return {
    ...actual,
    useAgenda: () => ({ data: AGENDA }),
    useUpdateAgenda: () => ({ mutate: updateAgendaMutate }),
  };
});
vi.mock('../hooks/useSpeeches', () => ({
  useSpeeches: () => ({ data: [] }),
  useWardManagePrayers: () => ({ managePrayers: false, isLoading: false }),
  useAssignSpeaker: () => ({ mutate: vi.fn() }),
  useRemoveAssignment: () => ({ mutate: vi.fn() }),
  useLazyCreateSpeeches: () => ({ mutate: vi.fn() }),
}));
vi.mock('../hooks/useHymns', () => ({
  useHymns: () => ({ data: [] }),
  useSacramentalHymns: () => ({ data: [] }),
  formatHymnDisplay: () => '',
  filterHymns: (h: unknown[]) => h,
}));
vi.mock('../hooks/useMembers', () => ({ useMembers: () => ({ data: [] }) }));

const DESIGNATIONS: Designation[] = [
  { type: 'sustain', person_name: 'Alice', member_id: 'm1', calling: 'Presidente', office: null },
  { type: 'new_member', person_name: 'Bob', member_id: 'm2', calling: null, office: null },
];

function render() {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      React.createElement(AgendaForm, { sundayDate: '2026-01-04', exceptionReason: null })
    );
  });
  return renderer;
}

beforeEach(() => {
  auth.canWrite = true;
  routerPush.mockClear();
  updateAgendaMutate.mockClear();
  dlf.props = null;
  AGENDA = {
    id: 'ag1', ward_id: 'w1', sunday_date: '2026-01-04',
    presiding_name: null, conducting_name: null, recognized_names: null,
    welcome_new_families: null, announcements: null, pianist_name: null, conductor_name: null,
    opening_hymn_id: null, opening_prayer_member_id: null, opening_prayer_name: null,
    sustaining_releasing: null, designations: DESIGNATIONS,
    has_baby_blessing: false, baby_blessing_names: null, has_baptism_confirmation: false,
    baptism_confirmation_names: null, has_stake_announcements: false, sacrament_hymn_id: null,
    has_special_presentation: false, has_intermediate_hymn: false,
    special_presentation_description: null, intermediate_hymn_id: null,
    speaker_1_override: null, speaker_2_override: null, speaker_3_override: null,
    has_second_speech: true, closing_hymn_id: null, closing_prayer_member_id: null,
    closing_prayer_name: null, attendance: null, created_at: '', updated_at: '',
  };
});

describe('AgendaForm → DesignationListField (step 4)', () => {
  it('passes the agenda designations through to the list (AC4)', () => {
    render();
    expect(dlf.props?.value).toEqual(DESIGNATIONS);
  });

  it('add affordance navigates to the edit screen with no index (AC5)', () => {
    render();
    act(() => dlf.props!.onAddPress());
    expect(routerPush).toHaveBeenCalledWith({
      pathname: '/designations/[date]',
      params: { date: '2026-01-04' },
    });
  });

  it('tapping a row navigates to the edit screen with that index (AC5)', () => {
    render();
    act(() => dlf.props!.onItemPress(1));
    expect(routerPush).toHaveBeenCalledWith({
      pathname: '/designations/[date]',
      params: { date: '2026-01-04', index: '1' },
    });
  });

  it('remove writes the filtered array back via updateField (AC5b)', () => {
    render();
    act(() => dlf.props!.onRemove(0));
    expect(updateAgendaMutate).toHaveBeenCalledTimes(1);
    const { fields } = updateAgendaMutate.mock.calls[0][0] as { fields: Record<string, unknown> };
    expect(fields.designations).toEqual([DESIGNATIONS[1]]);
  });

  it('observer gets a read-only (disabled) field (AC14)', () => {
    auth.canWrite = false;
    render();
    expect(dlf.props?.disabled).toBe(true);
  });
});
