/**
 * Behavioral tests for PersonEditor (v2.0 create/edit a person).
 *
 * `react-native` is aliased to a test stub (vitest.config.ts). Data hooks, contexts and i18n are
 * mocked per-file; pure utils stay real via importOriginal.
 */
import React from 'react';
import { render as rtlRender, screen, fireEvent, act } from '@testing-library/react-native';
import { COUNTRY_CODES } from '../lib/countryCodes';
import { Alert } from 'react-native';
import type { Member } from '../types/database';
// jest.mock calls below are hoisted above this import, so the mocks still apply.
import { PersonEditor, type PersonEditorProps } from '../components/PersonEditor';


// --- Controlled data + mutation spies ---

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

const SELF = makeMember({ id: 'self', full_name: 'Self Person' });
const OTHER = makeMember({ id: 'other', full_name: 'Other Person' });
let mockMEMBERS: Member[] = [];

type MutateOpts = { onSuccess?: (m: Member) => void; onError?: (e: unknown) => void };
const mockCreateMock = jest.fn((_input: unknown, opts?: MutateOpts) =>
  opts?.onSuccess?.(makeMember({ id: 'new', full_name: 'Created' }))
);
const mockUpdateMock = jest.fn((_input: unknown, opts?: MutateOpts) =>
  opts?.onSuccess?.(SELF)
);
const mockDeleteMock = jest.fn((_input: unknown, opts?: { onSuccess?: (name: string) => void }) =>
  opts?.onSuccess?.('deleted')
);

let mockHasPermissionResult = true;

jest.mock('../hooks/useMembers', () => {
  const actual = (jest.requireActual('../hooks/useMembers')) as Record<string, unknown>;
  return {
    ...actual,
    useMembers: () => ({ data: mockMEMBERS }),
    useCreateMember: () => ({ mutate: mockCreateMock }),
    useUpdateMember: () => ({ mutate: mockUpdateMock }),
    useDeleteMember: () => ({ mutate: mockDeleteMock }),
  };
});

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ hasPermission: () => mockHasPermissionResult }),
}));

// `react-native-svg` (via icons/SearchInput) ships untransformed Flow/TS — stub it.
jest.mock('react-i18next', () => {
  const actual = (jest.requireActual('react-i18next')) as Record<string, unknown>;
  return { ...actual, useTranslation: () => ({ t: (k: string) => k }) };
});

jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#000', card: '#111', text: '#fff', textSecondary: '#aaa', textTertiary: '#888',
      primary: '#07f', onPrimary: '#fff', error: '#f00', errorContainer: '#300', divider: '#333',
      border: '#333', inputBackground: '#111', inputBorder: '#333', placeholder: '#666',
    },
  }),
}));

// --- Helpers ---

async function render(props: Partial<PersonEditorProps> = {}) {
  const onClose = jest.fn();
  const onSaved = jest.fn();
  await rtlRender(React.createElement(PersonEditor, { visible: true, onClose, onSaved, ...props }));
  return { renderer: null, onClose, onSaved };
}

function find(_root: unknown, testID: string) {
  return screen.queryAllByTestId(testID);
}

function node(_renderer: unknown, testID: string) {
  return screen.getByTestId(testID);
}

async function change(_renderer: unknown, testID: string, value: string) {
  await fireEvent.changeText(screen.getByTestId(testID), value);
}

async function press(_renderer: unknown, testID: string) {
  await fireEvent.press(screen.getByTestId(testID));
}

/**
 * Current state of a Switch, platform-neutral.
 *
 * iOS renders a host `Switch` carrying `value`; Android renders `AndroidSwitch` carrying `on`
 * and no accessibilityState. RNTL's toBeChecked() only recognises the iOS host, so it throws on
 * the Android project — hence reading both props here rather than using the matcher.
 */
function switchValue(testID: string): boolean {
  const sw = screen.getByTestId(testID);
  return (sw.props.value ?? (sw.props as { on?: boolean }).on) === true;
}

async function toggleSwitch(_renderer: unknown, testID: string) {
  await fireEvent(screen.getByTestId(testID), 'valueChange', !switchValue(testID));
}

beforeEach(() => {
  mockMEMBERS = [SELF, OTHER];
  mockHasPermissionResult = true;
  mockCreateMock.mockClear();
  mockUpdateMock.mockClear();
  mockDeleteMock.mockClear();
});

describe('PersonEditor', () => {
  it('creates a person with identity + capability flags (AC7)', async () => {
    const { renderer, onSaved, onClose } = await render();
    await change(null, 'person-editor-full-name', 'New Person');
    await change(null, 'person-editor-phone', '11999');
    await toggleSwitch(null, 'person-editor-cap-switch-preside');
    await toggleSwitch(null, 'person-editor-cap-switch-play_piano');
    await press(null, 'person-editor-save');

    expect(mockCreateMock).toHaveBeenCalledTimes(1);
    expect(mockCreateMock.mock.calls[0][0]).toMatchObject({
      full_name: 'New Person',
      country_code: '+55',
      phone: '11999',
      can_preside: true,
      can_play_piano: true,
      can_conduct: false,
      contact_via_responsible: false,
      responsible_id: null,
    });
    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('shows an error and keeps the modal open when saving fails (P1 #7)', async () => {
    // Drive the mutation's onError instead of onSuccess.
    mockCreateMock.mockImplementationOnce((_input: unknown, opts?: MutateOpts) =>
      opts?.onError?.(new Error('insert failed'))
    );
    const { renderer, onClose } = await render();
    await change(null, 'person-editor-full-name', 'New Person');
    await press(null, 'person-editor-save');

    const errorNode = node(null, 'person-editor-error');
    expect(errorNode.props.children).toBe('personEditor.saveFailed');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('E1: shows a visible label above the informal-name field', async () => {
    await render();
    const labels = screen.root!.queryAll(
      (n) => typeof n.type === 'string' && n.props.children === 'personEditor.informalNameLabel'
    );
    expect(labels.length).toBe(1);
  });

  it('E3b: saves the calling free-text field', async () => {
    await render();
    await change(null, 'person-editor-full-name', 'With Calling');
    await change(null, 'person-editor-calling', 'Bispo');
    await press(null, 'person-editor-save');

    expect(mockCreateMock).toHaveBeenCalledTimes(1);
    expect(mockCreateMock.mock.calls[0][0]).toMatchObject({ full_name: 'With Calling', calling: 'Bispo' });
  });

  it('E3b: prefills the calling from an edited member', async () => {
    const member = makeMember({ id: 'self', full_name: 'Self Person', calling: 'Bispo' });
    await render({ member });
    expect(node(null, 'person-editor-calling').props.value).toBe('Bispo');
  });

  it('E3: permission switches reflect caps and toggle + persist on save', async () => {
    const member = makeMember({ id: 'self', full_name: 'Self Person', can_conduct: true });
    await render({ member });
    // Switch reflects the current cap value.
    expect(switchValue('person-editor-cap-switch-conduct')).toBe(true);
    expect(switchValue('person-editor-cap-switch-preside')).toBe(false);

    // Toggling flips them and persists on save.
    await toggleSwitch(null, 'person-editor-cap-switch-conduct');
    await toggleSwitch(null, 'person-editor-cap-switch-preside');
    await press(null, 'person-editor-save');
    expect(mockUpdateMock.mock.calls[0][0]).toMatchObject({
      id: 'self',
      can_conduct: false,
      can_preside: true,
    });
  });

  it('E2: country picker opens and selecting a country stores the dial code', async () => {
    await render();
    await change(null, 'person-editor-full-name', 'Country Person');
    await press(null, 'person-editor-country-code');

    // Real FlatList renders its own rows and virtualises, so filter first — as a user would —
    // instead of invoking renderItem by hand.
    const usEntry = COUNTRY_CODES.find((c) => c.code === '+1' && c.label.includes('United States'))!;
    await fireEvent.changeText(screen.getByTestId('person-editor-country-search'), 'United States');
    await fireEvent.press(await screen.findByTestId(`person-editor-country-item-${usEntry.label}`));

    await press(null, 'person-editor-save');
    expect(mockCreateMock.mock.calls[0][0]).toMatchObject({ country_code: '+1' });
  });

  it('E4: responsible-for list renders only when the member has dependents', async () => {
    // OTHER points at SELF via responsible_id → SELF is responsible for OTHER.
    const self = makeMember({ id: 'self', full_name: 'Self Person' });
    const dependent = makeMember({ id: 'other', full_name: 'Dependent Person', responsible_id: 'self' });
    mockMEMBERS = [self, dependent];
    await render({ member: self });
    expect(find(null, 'person-editor-responsible-for').length).toBe(1);
    const names = screen.root!.queryAll(
      (n) => typeof n.type === 'string' && n.props.children === 'Dependent Person'
    );
    expect(names.length).toBeGreaterThan(0);
  });

  it('E4: responsible-for list is absent when the member has no dependents', async () => {
    const member = makeMember({ id: 'self', full_name: 'Self Person' });
    await render({ member });
    expect(find(null, 'person-editor-responsible-for').length).toBe(0);
  });

  it('E5: delete button shows only when editing an existing member (not create)', async () => {
    await render();
    expect(find(null, 'person-editor-delete').length).toBe(0);

    const member = makeMember({ id: 'self', full_name: 'Self Person' });
    const editView = await render({ member });
    expect(find(null, 'person-editor-delete').length).toBe(1);
  });

  it('E5: delete button hidden without member:write', async () => {
    mockHasPermissionResult = false;
    const member = makeMember({ id: 'self', full_name: 'Self Person' });
    await render({ member });
    expect(find(null, 'person-editor-delete').length).toBe(0);
  });

  it('E5: pressing delete confirms then deletes and closes', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const member = makeMember({ id: 'self', full_name: 'Self Person' });
    const { renderer, onClose } = await render({ member });
    await press(null, 'person-editor-delete');

    // Alert was raised with a destructive confirm button; invoke it.
    expect(alertSpy).toHaveBeenCalledTimes(1);
    const buttons = alertSpy.mock.calls[0][2] as { style?: string; onPress?: () => void }[];
    const destructive = buttons.find((b) => b.style === 'destructive')!;
    await act(async () => {
      destructive.onPress?.();
    });

    expect(mockDeleteMock).toHaveBeenCalledTimes(1);
    expect(mockDeleteMock.mock.calls[0][0]).toMatchObject({ memberId: 'self', memberName: 'Self Person' });
    expect(onClose).toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('defaults an empty country code to +55 on save (P2 #4)', async () => {
    await render();
    await change(null, 'person-editor-full-name', 'No Country Code');
    await change(null, 'person-editor-phone', '11999');
    // country_code left empty
    await press(null, 'person-editor-save');

    expect(mockCreateMock).toHaveBeenCalledTimes(1);
    expect(mockCreateMock.mock.calls[0][0]).toMatchObject({
      full_name: 'No Country Code',
      country_code: '+55',
      phone: '11999',
    });
  });

  it('prefills fields from the edited member and updates via id (AC7)', async () => {
    const member = makeMember({
      id: 'self', full_name: 'Self Person', informal_name: 'Selfie', can_conduct: true,
    });
    await render({ member });
    expect(node(null, 'person-editor-full-name').props.value).toBe('Self Person');
    expect(node(null, 'person-editor-informal-name').props.value).toBe('Selfie');

    await change(null, 'person-editor-full-name', 'Renamed');
    await press(null, 'person-editor-save');
    expect(mockUpdateMock).toHaveBeenCalledTimes(1);
    expect(mockUpdateMock.mock.calls[0][0]).toMatchObject({ id: 'self', full_name: 'Renamed', can_conduct: true });
  });

  it('requires a full name (AC7)', async () => {
    await render();
    await press(null, 'person-editor-save');
    expect(mockCreateMock).not.toHaveBeenCalled();
    expect(find(null, 'person-editor-error').length).toBe(1);
  });

  it('requires a responsible when contact-via-responsible is on (AC7)', async () => {
    await render();
    await change(null, 'person-editor-full-name', 'Needs Delegate');
    await press(null, 'person-editor-contact-via-responsible');
    await press(null, 'person-editor-save');
    expect(mockCreateMock).not.toHaveBeenCalled();
    expect(find(null, 'person-editor-error').length).toBe(1);
  });

  it('responsible picker excludes self and delegation persists once chosen (AC7)', async () => {
    const member = makeMember({ id: 'self', full_name: 'Self Person' });
    await render({ member });
    await change(null, 'person-editor-full-name', 'Self Person');
    await press(null, 'person-editor-contact-via-responsible');
    await press(null, 'person-editor-responsible-select');

    // Candidates render as rows: self is excluded, the other member is offered.
    expect(screen.queryByTestId('person-editor-responsible-item-self')).toBeNull();
    await fireEvent.press(await screen.findByTestId('person-editor-responsible-item-other'));

    await press(null, 'person-editor-save');
    expect(mockUpdateMock).toHaveBeenCalledTimes(1);
    expect(mockUpdateMock.mock.calls[0][0]).toMatchObject({
      id: 'self',
      contact_via_responsible: true,
      responsible_id: 'other',
    });
  });
});
