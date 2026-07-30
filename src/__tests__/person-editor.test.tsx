/**
 * Behavioral tests for PersonEditor (v2.0 create/edit a person).
 *
 * `react-native` is aliased to a test stub (vitest.config.ts). Data hooks, contexts and i18n are
 * mocked per-file; pure utils stay real via importOriginal.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import TestRenderer from 'react-test-renderer';
import { Alert } from 'react-native';
import type { Member } from '../types/database';
// vi.mock calls below are hoisted above this import, so the mocks still apply.
import { PersonEditor, type PersonEditorProps } from '../components/PersonEditor';

const { act } = TestRenderer;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
let MEMBERS: Member[] = [];

type MutateOpts = { onSuccess?: (m: Member) => void; onError?: (e: unknown) => void };
const createMock = vi.fn((_input: unknown, opts?: MutateOpts) =>
  opts?.onSuccess?.(makeMember({ id: 'new', full_name: 'Created' }))
);
const updateMock = vi.fn((_input: unknown, opts?: MutateOpts) =>
  opts?.onSuccess?.(SELF)
);
const deleteMock = vi.fn((_input: unknown, opts?: { onSuccess?: (name: string) => void }) =>
  opts?.onSuccess?.('deleted')
);

let hasPermissionResult = true;

vi.mock('../hooks/useMembers', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    useMembers: () => ({ data: MEMBERS }),
    useCreateMember: () => ({ mutate: createMock }),
    useUpdateMember: () => ({ mutate: updateMock }),
    useDeleteMember: () => ({ mutate: deleteMock }),
  };
});

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ hasPermission: () => hasPermissionResult }),
}));

// `react-native-svg` (via icons/SearchInput) ships untransformed Flow/TS — stub it.
vi.mock('react-native-svg', async () => {
  const ReactMod = (await import('react')).default;
  const host = (name: string) => (props: Record<string, unknown>) => ReactMod.createElement(name, props);
  return { default: host('Svg'), Svg: host('Svg'), Path: host('Path'), Circle: host('Circle') };
});

vi.mock('react-i18next', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, useTranslation: () => ({ t: (k: string) => k }) };
});

vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#000', card: '#111', text: '#fff', textSecondary: '#aaa', textTertiary: '#888',
      primary: '#07f', onPrimary: '#fff', error: '#f00', errorContainer: '#300', divider: '#333',
      border: '#333', inputBackground: '#111', inputBorder: '#333', placeholder: '#666',
    },
  }),
}));

// --- Helpers ---

function render(props: Partial<PersonEditorProps> = {}) {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      React.createElement(PersonEditor, { visible: true, onClose, onSaved, ...props })
    );
  });
  return { renderer, onClose, onSaved };
}

function find(root: TestRenderer.TestInstance, testID: string) {
  return root.findAll((n) => typeof n.type === 'string' && n.props.testID === testID);
}

function node(renderer: TestRenderer.ReactTestRenderer, testID: string) {
  return find(renderer.root, testID)[0];
}

function change(renderer: TestRenderer.ReactTestRenderer, testID: string, value: string) {
  act(() => {
    (node(renderer, testID).props.onChangeText as (v: string) => void)(value);
  });
}

function press(renderer: TestRenderer.ReactTestRenderer, testID: string) {
  act(() => {
    (node(renderer, testID).props.onPress as () => void)();
  });
}

function toggleSwitch(renderer: TestRenderer.ReactTestRenderer, testID: string) {
  const sw = node(renderer, testID);
  act(() => {
    (sw.props.onValueChange as (v: boolean) => void)(!sw.props.value);
  });
}

beforeEach(() => {
  MEMBERS = [SELF, OTHER];
  hasPermissionResult = true;
  createMock.mockClear();
  updateMock.mockClear();
  deleteMock.mockClear();
});

describe('PersonEditor', () => {
  it('creates a person with identity + capability flags (AC7)', () => {
    const { renderer, onSaved, onClose } = render();
    change(renderer, 'person-editor-full-name', 'New Person');
    change(renderer, 'person-editor-phone', '11999');
    toggleSwitch(renderer, 'person-editor-cap-switch-preside');
    toggleSwitch(renderer, 'person-editor-cap-switch-play_piano');
    press(renderer, 'person-editor-save');

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock.mock.calls[0][0]).toMatchObject({
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

  it('shows an error and keeps the modal open when saving fails (P1 #7)', () => {
    // Drive the mutation's onError instead of onSuccess.
    createMock.mockImplementationOnce((_input: unknown, opts?: MutateOpts) =>
      opts?.onError?.(new Error('insert failed'))
    );
    const { renderer, onClose } = render();
    change(renderer, 'person-editor-full-name', 'New Person');
    press(renderer, 'person-editor-save');

    const errorNode = node(renderer, 'person-editor-error');
    expect(errorNode.props.children).toBe('personEditor.saveFailed');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('E1: shows a visible label above the informal-name field', () => {
    const { renderer } = render();
    const labels = renderer.root.findAll(
      (n) => typeof n.type === 'string' && n.props.children === 'personEditor.informalNameLabel'
    );
    expect(labels.length).toBe(1);
  });

  it('E3b: saves the calling free-text field', () => {
    const { renderer } = render();
    change(renderer, 'person-editor-full-name', 'With Calling');
    change(renderer, 'person-editor-calling', 'Bispo');
    press(renderer, 'person-editor-save');

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock.mock.calls[0][0]).toMatchObject({ full_name: 'With Calling', calling: 'Bispo' });
  });

  it('E3b: prefills the calling from an edited member', () => {
    const member = makeMember({ id: 'self', full_name: 'Self Person', calling: 'Bispo' });
    const { renderer } = render({ member });
    expect(node(renderer, 'person-editor-calling').props.value).toBe('Bispo');
  });

  it('E3: permission switches reflect caps and toggle + persist on save', () => {
    const member = makeMember({ id: 'self', full_name: 'Self Person', can_conduct: true });
    const { renderer } = render({ member });
    // Switch reflects the current cap value.
    expect(node(renderer, 'person-editor-cap-switch-conduct').props.value).toBe(true);
    expect(node(renderer, 'person-editor-cap-switch-preside').props.value).toBe(false);

    // Toggling flips them and persists on save.
    toggleSwitch(renderer, 'person-editor-cap-switch-conduct');
    toggleSwitch(renderer, 'person-editor-cap-switch-preside');
    press(renderer, 'person-editor-save');
    expect(updateMock.mock.calls[0][0]).toMatchObject({
      id: 'self',
      can_conduct: false,
      can_preside: true,
    });
  });

  it('E2: country picker opens and selecting a country stores the dial code', () => {
    const { renderer } = render();
    change(renderer, 'person-editor-full-name', 'Country Person');
    press(renderer, 'person-editor-country-code');

    // The country FlatList (the one whose rows carry a flag) lists COUNTRY_CODES.
    const flats = renderer.root.findAll((n) => n.type === 'FlatList');
    const countryFlat = flats.find(
      (f) => Array.isArray(f.props.data) && (f.props.data as { flag?: string }[])[0]?.flag
    )!;
    const entry = (countryFlat.props.data as { code: string; label: string }[]).find(
      (c) => c.code === '+1' && c.label.includes('United States')
    )!;
    const renderItem = countryFlat.props.renderItem as (info: {
      item: { code: string; label: string; flag: string };
    }) => React.ReactElement;
    let row!: TestRenderer.ReactTestRenderer;
    act(() => {
      row = TestRenderer.create(renderItem({ item: { ...entry, flag: 'US' } }));
    });
    act(() => {
      (find(row.root, `person-editor-country-item-${entry.label}`)[0].props.onPress as () => void)();
    });

    press(renderer, 'person-editor-save');
    expect(createMock.mock.calls[0][0]).toMatchObject({ country_code: '+1' });
  });

  it('E4: responsible-for list renders only when the member has dependents', () => {
    // OTHER points at SELF via responsible_id → SELF is responsible for OTHER.
    const self = makeMember({ id: 'self', full_name: 'Self Person' });
    const dependent = makeMember({ id: 'other', full_name: 'Dependent Person', responsible_id: 'self' });
    MEMBERS = [self, dependent];
    const { renderer } = render({ member: self });
    expect(find(renderer.root, 'person-editor-responsible-for').length).toBe(1);
    const names = renderer.root.findAll(
      (n) => typeof n.type === 'string' && n.props.children === 'Dependent Person'
    );
    expect(names.length).toBeGreaterThan(0);
  });

  it('E4: responsible-for list is absent when the member has no dependents', () => {
    const member = makeMember({ id: 'self', full_name: 'Self Person' });
    const { renderer } = render({ member });
    expect(find(renderer.root, 'person-editor-responsible-for').length).toBe(0);
  });

  it('E5: delete button shows only when editing an existing member (not create)', () => {
    const createView = render();
    expect(find(createView.renderer.root, 'person-editor-delete').length).toBe(0);

    const member = makeMember({ id: 'self', full_name: 'Self Person' });
    const editView = render({ member });
    expect(find(editView.renderer.root, 'person-editor-delete').length).toBe(1);
  });

  it('E5: delete button hidden without member:write', () => {
    hasPermissionResult = false;
    const member = makeMember({ id: 'self', full_name: 'Self Person' });
    const { renderer } = render({ member });
    expect(find(renderer.root, 'person-editor-delete').length).toBe(0);
  });

  it('E5: pressing delete confirms then deletes and closes', () => {
    const alertSpy = vi.spyOn(Alert, 'alert').mockImplementation(() => {});
    const member = makeMember({ id: 'self', full_name: 'Self Person' });
    const { renderer, onClose } = render({ member });
    press(renderer, 'person-editor-delete');

    // Alert was raised with a destructive confirm button; invoke it.
    expect(alertSpy).toHaveBeenCalledTimes(1);
    const buttons = alertSpy.mock.calls[0][2] as { style?: string; onPress?: () => void }[];
    const destructive = buttons.find((b) => b.style === 'destructive')!;
    act(() => {
      destructive.onPress?.();
    });

    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(deleteMock.mock.calls[0][0]).toMatchObject({ memberId: 'self', memberName: 'Self Person' });
    expect(onClose).toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('defaults an empty country code to +55 on save (P2 #4)', () => {
    const { renderer } = render();
    change(renderer, 'person-editor-full-name', 'No Country Code');
    change(renderer, 'person-editor-phone', '11999');
    // country_code left empty
    press(renderer, 'person-editor-save');

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock.mock.calls[0][0]).toMatchObject({
      full_name: 'No Country Code',
      country_code: '+55',
      phone: '11999',
    });
  });

  it('prefills fields from the edited member and updates via id (AC7)', () => {
    const member = makeMember({
      id: 'self', full_name: 'Self Person', informal_name: 'Selfie', can_conduct: true,
    });
    const { renderer } = render({ member });
    expect(node(renderer, 'person-editor-full-name').props.value).toBe('Self Person');
    expect(node(renderer, 'person-editor-informal-name').props.value).toBe('Selfie');

    change(renderer, 'person-editor-full-name', 'Renamed');
    press(renderer, 'person-editor-save');
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock.mock.calls[0][0]).toMatchObject({ id: 'self', full_name: 'Renamed', can_conduct: true });
  });

  it('requires a full name (AC7)', () => {
    const { renderer } = render();
    press(renderer, 'person-editor-save');
    expect(createMock).not.toHaveBeenCalled();
    expect(find(renderer.root, 'person-editor-error').length).toBe(1);
  });

  it('requires a responsible when contact-via-responsible is on (AC7)', () => {
    const { renderer } = render();
    change(renderer, 'person-editor-full-name', 'Needs Delegate');
    press(renderer, 'person-editor-contact-via-responsible');
    press(renderer, 'person-editor-save');
    expect(createMock).not.toHaveBeenCalled();
    expect(find(renderer.root, 'person-editor-error').length).toBe(1);
  });

  it('responsible picker excludes self and delegation persists once chosen (AC7)', () => {
    const member = makeMember({ id: 'self', full_name: 'Self Person' });
    const { renderer } = render({ member });
    change(renderer, 'person-editor-full-name', 'Self Person');
    press(renderer, 'person-editor-contact-via-responsible');
    press(renderer, 'person-editor-responsible-select');

    // The candidate FlatList excludes self and includes the other member.
    const flat = renderer.root.findAll((n) => n.type === 'FlatList')[0];
    const candidateIds = (flat.props.data as Member[]).map((m) => m.id);
    expect(candidateIds).toEqual(['other']);

    // Render the "other" row and pick it.
    const renderItem = flat.props.renderItem as (info: { item: Member }) => React.ReactElement;
    let row!: TestRenderer.ReactTestRenderer;
    act(() => {
      row = TestRenderer.create(renderItem({ item: OTHER }));
    });
    act(() => {
      (find(row.root, 'person-editor-responsible-item-other')[0].props.onPress as () => void)();
    });

    press(renderer, 'person-editor-save');
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock.mock.calls[0][0]).toMatchObject({
      id: 'self',
      contact_via_responsible: true,
      responsible_id: 'other',
    });
  });
});
