/**
 * Behavioral tests for PersonEditor (v2.0 create/edit a person).
 *
 * `react-native` is aliased to a test stub (vitest.config.ts). Data hooks, contexts and i18n are
 * mocked per-file; pure utils stay real via importOriginal.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import TestRenderer from 'react-test-renderer';
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
    created_at: '',
    updated_at: '',
    ...over,
  };
}

const SELF = makeMember({ id: 'self', full_name: 'Self Person' });
const OTHER = makeMember({ id: 'other', full_name: 'Other Person' });
let MEMBERS: Member[] = [];

const createMock = vi.fn((_input: unknown, opts?: { onSuccess?: (m: Member) => void }) =>
  opts?.onSuccess?.(makeMember({ id: 'new', full_name: 'Created' }))
);
const updateMock = vi.fn((_input: unknown, opts?: { onSuccess?: (m: Member) => void }) =>
  opts?.onSuccess?.(SELF)
);

vi.mock('../hooks/useMembers', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    useMembers: () => ({ data: MEMBERS }),
    useCreateMember: () => ({ mutate: createMock }),
    useUpdateMember: () => ({ mutate: updateMock }),
  };
});

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

beforeEach(() => {
  MEMBERS = [SELF, OTHER];
  createMock.mockClear();
  updateMock.mockClear();
});

describe('PersonEditor', () => {
  it('creates a person with identity + capability flags (AC7)', () => {
    const { renderer, onSaved, onClose } = render();
    change(renderer, 'person-editor-full-name', 'New Person');
    change(renderer, 'person-editor-country-code', '+55');
    change(renderer, 'person-editor-phone', '11999');
    press(renderer, 'person-editor-cap-preside');
    press(renderer, 'person-editor-cap-play_piano');
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
