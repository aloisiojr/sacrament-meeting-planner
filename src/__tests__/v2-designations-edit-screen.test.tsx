/**
 * Behavioral test for the designation editor route (specs/v2-supports-releases.md, step 2).
 * `react-native` is aliased to a test stub (vitest.config.ts). PeoplePicker is mocked to a seam
 * that captures its props so the test can drive onSelect; data hooks are mocked so we can assert
 * the designations array written back and the optional member-calling update. Alert.alert is
 * spied so we can exercise the "update calling?" branches.
 */
import React from 'react';
import { render as rtlRender, screen, fireEvent, act, within } from '@testing-library/react-native';
import { Alert } from 'react-native';
import DesignationEditScreen from '../app/designations/[date]';
import type { Member, Designation } from '../types/database';


const DATE = '2026-08-02';

const mockState = {
  params: { date: '2026-08-02' } as { date?: string; index?: string },
  designations: [] as Designation[],
  updateAgenda: jest.fn(),
  updateMember: jest.fn(),
  back: jest.fn(),
  pickerOnSelect: null as null | ((m: Member) => void),
  canWrite: true,
};

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
jest.mock('react-i18next', () => {
  const actual = (jest.requireActual('react-i18next')) as Record<string, unknown>;
  return { ...actual, useTranslation: () => ({ t: (k: string) => k }) };
});
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#000', text: '#fff', textSecondary: '#aaa', textTertiary: '#888',
      divider: '#333', border: '#444', primary: '#07f', surfaceVariant: '#222',
    },
  }),
}));
jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ hasPermission: (p: string) => (p === 'agenda:write' ? mockState.canWrite : true) }),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => require('react').createElement('SafeAreaView', {}, children),
}));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockState.params,
  useRouter: () => ({ back: mockState.back }),
}));
jest.mock('../components/ErrorBoundary', () => ({
  ThemedErrorBoundary: ({ children }: { children?: React.ReactNode }) => require('react').createElement(require('react').Fragment, {}, children),
}));
jest.mock('../components/PeoplePicker', () => ({
  PeoplePicker: (props: { onSelect: (m: Member) => void }) => {
    mockState.pickerOnSelect = props.onSelect;
    return null;
  },
}));
jest.mock('../hooks/useAgenda', () => ({
  useAgenda: () => ({ data: { id: 'a1', sunday_date: DATE, designations: mockState.designations } }),
  useUpdateAgendaByDate: () => ({ mutate: mockState.updateAgenda }),
}));
jest.mock('../hooks/useMembers', () => ({
  useUpdateMember: () => ({ mutate: mockState.updateMember }),
}));

async function render() {
  await rtlRender(React.createElement(DesignationEditScreen));
  return null; // call-site compatibility; the helpers query `screen`
}

function nodes(_renderer: unknown, testID: string) {
  return screen.queryAllByTestId(testID);
}

async function press(__renderer: unknown, testID: string) {
  await fireEvent.press(screen.getByTestId(testID));
}

async function selectPerson(member: Member) {
  await act(async () => {
    mockState.pickerOnSelect?.(member);
  });
}

beforeEach(() => {
  mockState.params = { date: DATE };
  mockState.designations = [];
  mockState.updateAgenda = jest.fn();
  mockState.updateMember = jest.fn();
  mockState.back = jest.fn();
  mockState.pickerOnSelect = null;
  mockState.canWrite = true;
  jest.restoreAllMocks();
});

describe('Designation edit screen (step 2)', () => {
  it('keeps the form above the keyboard (AC1, AC4)', async () => {
    /*
     * Structural on purpose: jest has no virtual keyboard, so "the field ended up visible" is not
     * observable here — this catches the container being removed, and the device checks in the spec
     * cover the rest. The pattern mirrors the (auth) screens.
     */
    await render();
    const avoider = screen.getByTestId('designation-edit-keyboard-avoider');
    // Nesting is the point: the container has to WRAP the scrollable form, not sit beside it.
    const scroll = within(avoider).getByTestId('designation-edit-scroll');
    expect(scroll.props.keyboardShouldPersistTaps).toBe('handled');
  });

  it('sustain: prefills calling from member, saves snapshot, and updates member calling on confirm', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const r = await render();
    await press(r, 'designation-type-sustain'); // AC6
    await selectPerson(makeMember({ calling: 'Presidente do Quórum de Élderes' })); // AC7 + AC8 prefill

    // Calling prefilled from the member.
    expect(nodes(r, 'designation-calling-input')[0].props.value).toBe(
      'Presidente do Quórum de Élderes'
    );

    await press(r, 'designation-edit-save-button');
    // Prompt shown (AC11); press "Atualizar" (2nd button).
    const buttons = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    await act(async () => buttons[1].onPress?.());

    expect(mockState.updateAgenda).toHaveBeenCalledTimes(1);
    const item = (mockState.updateAgenda.mock.calls[0][0].updates.designations as Designation[])[0];
    expect(item).toMatchObject({
      type: 'sustain',
      person_name: 'João Silva',
      member_id: 'm1',
      calling: 'Presidente do Quórum de Élderes',
      office: null,
    });
    // Member calling set to the new value (AC11 sustain).
    expect(mockState.updateMember).toHaveBeenCalledWith({ id: 'm1', calling: 'Presidente do Quórum de Élderes' });
    expect(mockState.back).toHaveBeenCalled();
  });

  it('does NOT save without agenda:write permission (observer deep-link)', async () => {
    mockState.canWrite = false;
    const r = await render();
    await press(r, 'designation-type-sustain');
    await selectPerson(makeMember());

    // Save is gated: the button is disabled and pressing it is a no-op.
    expect(screen.getByTestId('designation-edit-save-button')).toBeDisabled();
    await press(r, 'designation-edit-save-button');
    expect(mockState.updateAgenda).not.toHaveBeenCalled();
  });

  it('release: on decline saves snapshot but does NOT update member', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const r = await render();
    await press(r, 'designation-type-release');
    await selectPerson(makeMember({ calling: 'Secretário da Ala' }));

    await press(r, 'designation-edit-save-button');
    const buttons = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    await act(async () => buttons[0].onPress?.()); // "Agora não"

    expect(mockState.updateAgenda).toHaveBeenCalledTimes(1); // AC12 always saves
    expect(mockState.updateMember).not.toHaveBeenCalled(); // declined
  });

  it('release: on confirm clears the member calling (sets null)', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const r = await render();
    await press(r, 'designation-type-release');
    await selectPerson(makeMember({ calling: 'Secretário da Ala' }));
    await press(r, 'designation-edit-save-button');
    const buttons = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    await act(async () => buttons[1].onPress?.());

    expect(mockState.updateMember).toHaveBeenCalledWith({ id: 'm1', calling: null });
  });

  it('priesthood: shows office selector, no calling field, saves office and no prompt', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const r = await render();
    await press(r, 'designation-type-priesthood'); // AC9
    await selectPerson(makeMember());

    // No calling field for priesthood (AC9).
    expect(nodes(r, 'designation-calling-input').length).toBe(0);
    await press(r, 'designation-office-deacon');
    await press(r, 'designation-edit-save-button');

    expect(alertSpy).not.toHaveBeenCalled(); // no member-calling prompt for priesthood
    const item = (mockState.updateAgenda.mock.calls[0][0].updates.designations as Designation[])[0];
    expect(item).toMatchObject({ type: 'priesthood', office: 'deacon', calling: null });
  });

  it('new_member: no extra field, saves snapshot, no prompt', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const r = await render();
    await press(r, 'designation-type-new_member'); // AC10
    await selectPerson(makeMember({ full_name: 'Maria Souza' }));

    expect(nodes(r, 'designation-calling-input').length).toBe(0);
    expect(nodes(r, 'designation-office-deacon').length).toBe(0);
    await press(r, 'designation-edit-save-button');

    expect(alertSpy).not.toHaveBeenCalled();
    const item = (mockState.updateAgenda.mock.calls[0][0].updates.designations as Designation[])[0];
    expect(item).toMatchObject({ type: 'new_member', person_name: 'Maria Souza', office: null, calling: null });
  });

  it('editing an existing item with no linked member (member_id null): no prompt (AC13)', async () => {
    mockState.params = { date: DATE, index: '0' };
    mockState.designations = [
      { type: 'sustain', person_name: 'Convidado Externo', member_id: null, calling: 'Líder', office: null },
    ];
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const r = await render();
    await press(r, 'designation-edit-save-button');

    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockState.updateAgenda).toHaveBeenCalledTimes(1);
    // Edited in place at index 0 (not appended).
    expect((mockState.updateAgenda.mock.calls[0][0].updates.designations as Designation[]).length).toBe(1);
  });
});
