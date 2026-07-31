/**
 * Behavioral test for the designation editor route (specs/v2-supports-releases.md, step 2).
 * `react-native` is aliased to a test stub (vitest.config.ts). PeoplePicker is mocked to a seam
 * that captures its props so the test can drive onSelect; data hooks are mocked so we can assert
 * the designations array written back and the optional member-calling update. Alert.alert is
 * spied so we can exercise the "update calling?" branches.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import TestRenderer from 'react-test-renderer';
import { Alert } from 'react-native';
import DesignationEditScreen from '../app/designations/[date]';
import type { Member, Designation } from '../types/database';

const { act } = TestRenderer;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const DATE = '2026-08-02';

const state = vi.hoisted(() => ({
  params: { date: '2026-08-02' } as { date?: string; index?: string },
  designations: [] as Designation[],
  updateAgenda: vi.fn(),
  updateMember: vi.fn(),
  back: vi.fn(),
  pickerOnSelect: null as null | ((m: Member) => void),
  canWrite: true,
}));

function makeMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'm1',
    ward_id: 'w1',
    full_name: 'João Silva',
    informal_name: null,
    country_code: '+55',
    phone: null,
    calling: 'Secretário da Ala',
    can_preside: false,
    can_conduct: false,
    can_lead_music: false,
    can_play_piano: false,
    can_be_recognized: false,
    contact_via_responsible: false,
    responsible_id: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  } as Member;
}

// --- Mocks ---
vi.mock('react-i18next', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, useTranslation: () => ({ t: (k: string) => k }) };
});
vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#000', text: '#fff', textSecondary: '#aaa', textTertiary: '#888',
      divider: '#333', border: '#444', primary: '#07f', surfaceVariant: '#222',
    },
  }),
}));
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ hasPermission: (p: string) => (p === 'agenda:write' ? state.canWrite : true) }),
}));
vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => React.createElement('SafeAreaView', {}, children),
}));
vi.mock('expo-router', () => ({
  useLocalSearchParams: () => state.params,
  useRouter: () => ({ back: state.back }),
}));
vi.mock('../components/ErrorBoundary', () => ({
  ThemedErrorBoundary: ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, {}, children),
}));
vi.mock('../components/PeoplePicker', () => ({
  PeoplePicker: (props: { onSelect: (m: Member) => void }) => {
    state.pickerOnSelect = props.onSelect;
    return null;
  },
}));
vi.mock('../hooks/useAgenda', () => ({
  useAgenda: () => ({ data: { id: 'a1', sunday_date: DATE, designations: state.designations } }),
  useUpdateAgendaByDate: () => ({ mutate: state.updateAgenda }),
}));
vi.mock('../hooks/useMembers', () => ({
  useUpdateMember: () => ({ mutate: state.updateMember }),
}));

function render() {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(DesignationEditScreen));
  });
  return renderer;
}

function nodes(renderer: TestRenderer.ReactTestRenderer, testID: string) {
  return renderer.root.findAll((n) => typeof n.type === 'string' && n.props.testID === testID);
}

function press(renderer: TestRenderer.ReactTestRenderer, testID: string) {
  const node = nodes(renderer, testID)[0];
  act(() => {
    (node.props.onPress as () => void)();
  });
}

function selectPerson(member: Member) {
  act(() => {
    state.pickerOnSelect?.(member);
  });
}

beforeEach(() => {
  state.params = { date: DATE };
  state.designations = [];
  state.updateAgenda = vi.fn();
  state.updateMember = vi.fn();
  state.back = vi.fn();
  state.pickerOnSelect = null;
  state.canWrite = true;
  vi.restoreAllMocks();
});

describe('Designation edit screen (step 2)', () => {
  it('sustain: prefills calling from member, saves snapshot, and updates member calling on confirm', () => {
    const alertSpy = vi.spyOn(Alert, 'alert').mockImplementation(() => {});
    const r = render();
    press(r, 'designation-type-sustain'); // AC6
    selectPerson(makeMember({ calling: 'Presidente do Quórum de Élderes' })); // AC7 + AC8 prefill

    // Calling prefilled from the member.
    expect(nodes(r, 'designation-calling-input')[0].props.value).toBe(
      'Presidente do Quórum de Élderes'
    );

    press(r, 'designation-edit-save-button');
    // Prompt shown (AC11); press "Atualizar" (2nd button).
    const buttons = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    act(() => buttons[1].onPress?.());

    expect(state.updateAgenda).toHaveBeenCalledTimes(1);
    const item = (state.updateAgenda.mock.calls[0][0].updates.designations as Designation[])[0];
    expect(item).toMatchObject({
      type: 'sustain',
      person_name: 'João Silva',
      member_id: 'm1',
      calling: 'Presidente do Quórum de Élderes',
      office: null,
    });
    // Member calling set to the new value (AC11 sustain).
    expect(state.updateMember).toHaveBeenCalledWith({ id: 'm1', calling: 'Presidente do Quórum de Élderes' });
    expect(state.back).toHaveBeenCalled();
  });

  it('does NOT save without agenda:write permission (observer deep-link)', () => {
    state.canWrite = false;
    const r = render();
    press(r, 'designation-type-sustain');
    selectPerson(makeMember());

    // Save is gated: the button is disabled and pressing it is a no-op.
    expect(nodes(r, 'designation-edit-save-button')[0].props.disabled).toBe(true);
    press(r, 'designation-edit-save-button');
    expect(state.updateAgenda).not.toHaveBeenCalled();
  });

  it('release: on decline saves snapshot but does NOT update member', () => {
    const alertSpy = vi.spyOn(Alert, 'alert').mockImplementation(() => {});
    const r = render();
    press(r, 'designation-type-release');
    selectPerson(makeMember({ calling: 'Secretário da Ala' }));

    press(r, 'designation-edit-save-button');
    const buttons = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    act(() => buttons[0].onPress?.()); // "Agora não"

    expect(state.updateAgenda).toHaveBeenCalledTimes(1); // AC12 always saves
    expect(state.updateMember).not.toHaveBeenCalled(); // declined
  });

  it('release: on confirm clears the member calling (sets null)', () => {
    const alertSpy = vi.spyOn(Alert, 'alert').mockImplementation(() => {});
    const r = render();
    press(r, 'designation-type-release');
    selectPerson(makeMember({ calling: 'Secretário da Ala' }));
    press(r, 'designation-edit-save-button');
    const buttons = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    act(() => buttons[1].onPress?.());

    expect(state.updateMember).toHaveBeenCalledWith({ id: 'm1', calling: null });
  });

  it('priesthood: shows office selector, no calling field, saves office and no prompt', () => {
    const alertSpy = vi.spyOn(Alert, 'alert').mockImplementation(() => {});
    const r = render();
    press(r, 'designation-type-priesthood'); // AC9
    selectPerson(makeMember());

    // No calling field for priesthood (AC9).
    expect(nodes(r, 'designation-calling-input').length).toBe(0);
    press(r, 'designation-office-deacon');
    press(r, 'designation-edit-save-button');

    expect(alertSpy).not.toHaveBeenCalled(); // no member-calling prompt for priesthood
    const item = (state.updateAgenda.mock.calls[0][0].updates.designations as Designation[])[0];
    expect(item).toMatchObject({ type: 'priesthood', office: 'deacon', calling: null });
  });

  it('new_member: no extra field, saves snapshot, no prompt', () => {
    const alertSpy = vi.spyOn(Alert, 'alert').mockImplementation(() => {});
    const r = render();
    press(r, 'designation-type-new_member'); // AC10
    selectPerson(makeMember({ full_name: 'Maria Souza' }));

    expect(nodes(r, 'designation-calling-input').length).toBe(0);
    expect(nodes(r, 'designation-office-deacon').length).toBe(0);
    press(r, 'designation-edit-save-button');

    expect(alertSpy).not.toHaveBeenCalled();
    const item = (state.updateAgenda.mock.calls[0][0].updates.designations as Designation[])[0];
    expect(item).toMatchObject({ type: 'new_member', person_name: 'Maria Souza', office: null, calling: null });
  });

  it('editing an existing item with no linked member (member_id null): no prompt (AC13)', () => {
    state.params = { date: DATE, index: '0' };
    state.designations = [
      { type: 'sustain', person_name: 'Convidado Externo', member_id: null, calling: 'Líder', office: null },
    ];
    const alertSpy = vi.spyOn(Alert, 'alert').mockImplementation(() => {});
    const r = render();
    press(r, 'designation-edit-save-button');

    expect(alertSpy).not.toHaveBeenCalled();
    expect(state.updateAgenda).toHaveBeenCalledTimes(1);
    // Edited in place at index 0 (not appended).
    expect((state.updateAgenda.mock.calls[0][0].updates.designations as Designation[]).length).toBe(1);
  });
});
