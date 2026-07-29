/**
 * Behavioral tests for PeoplePicker (v2.0 unified people picker).
 *
 * `react-native` is aliased to a test stub (vitest.config.ts). Data hooks, contexts and i18n are
 * mocked per-file; pure utils (getResponsibleForMap/filterMembers) stay real via importOriginal.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import TestRenderer from 'react-test-renderer';
import { Alert } from 'react-native';
import type { Member } from '../types/database';
// vi.mock calls below are hoisted above this import, so the mocks still apply.
import { PeoplePicker, type PeoplePickerProps } from '../components/PeoplePicker';

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

const MEMBER_A = makeMember({ id: 'a', full_name: 'Alice Preside', can_preside: true });
const MEMBER_B = makeMember({ id: 'b', full_name: 'Bob NoFlag' });
const MEMBER_C = makeMember({ id: 'c', full_name: 'Carol Dependent', responsible_id: 'a' });

let MEMBERS: Member[] = [];
const updateMock = vi.fn((_vars: { id: string }, opts?: { onSuccess?: (m: Member) => void }) =>
  opts?.onSuccess?.({ ...MEMBER_B, can_preside: true })
);
const deleteMock = vi.fn();

vi.mock('../hooks/useMembers', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    useMembers: () => ({ data: MEMBERS }),
    useCreateMember: () => ({ mutate: vi.fn() }),
    useUpdateMember: () => ({ mutate: updateMock }),
    useDeleteMember: () => ({ mutate: deleteMock }),
  };
});

vi.mock('../hooks/useSpeechCounts', () => ({
  useSpeechCounts: () => ({ data: { a: 2 }, isLoading: false }),
}));

// `react-native-svg` (pulled in via icons/SearchInput) ships untransformed Flow/TS — stub it.
vi.mock('react-native-svg', async () => {
  const ReactMod = (await import('react')).default;
  const host = (name: string) => (props: Record<string, unknown>) => ReactMod.createElement(name, props);
  return { default: host('Svg'), Svg: host('Svg'), Path: host('Path'), Circle: host('Circle') };
});

// Partial mock: keep initReactI18next (used by the real i18n loaded via the useMembers chain).
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

const hasPermissionMock = vi.fn((_p: string) => true);
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ hasPermission: hasPermissionMock }),
}));

// --- Helpers ---

function render(props: Partial<PeoplePickerProps> = {}) {
  const onSelect = vi.fn();
  const onClose = vi.fn();
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      React.createElement(PeoplePicker, { visible: true, onSelect, onClose, ...props })
    );
  });
  return { renderer, onSelect, onClose };
}

// The react-native stub's FlatList does not invoke renderItem, so we (a) read its `data` prop for
// filtering assertions and (b) render a single row via `renderItem` for row-level behavior.
function find(root: TestRenderer.TestInstance, testID: string) {
  // Each RN stub primitive appears twice (component instance + host element); keep host nodes only.
  return root.findAll((n) => typeof n.type === 'string' && n.props.testID === testID);
}

function press(root: TestRenderer.TestInstance, testID: string) {
  const node = find(root, testID)[0];
  act(() => {
    (node.props.onPress as () => void)();
  });
}

/** Flip a Switch (e.g. the "Ver todos" toggle) via its onValueChange handler. */
function toggle(root: TestRenderer.TestInstance, testID: string, value: boolean) {
  const node = find(root, testID)[0];
  act(() => {
    (node.props.onValueChange as (v: boolean) => void)(value);
  });
}

/** Read the text content of the first host Text node carrying `testID`. */
function textOf(root: TestRenderer.TestInstance, testID: string): string {
  const node = find(root, testID)[0];
  const flatten = (c: unknown): string =>
    Array.isArray(c) ? c.map(flatten).join('') : typeof c === 'string' ? c : '';
  return flatten(node.props.children);
}

function listData(renderer: TestRenderer.ReactTestRenderer): Member[] {
  const flat = renderer.root.findAll((n) => n.type === 'FlatList')[0];
  return (flat.props.data as Member[]) ?? [];
}

function ids(renderer: TestRenderer.ReactTestRenderer): string[] {
  return listData(renderer).map((m) => m.id);
}

/** Render one member's row (renderItem output) into its own renderer for row-level assertions. */
function renderRow(renderer: TestRenderer.ReactTestRenderer, member: Member) {
  const flat = renderer.root.findAll((n) => n.type === 'FlatList')[0];
  const renderItem = flat.props.renderItem as (info: { item: Member }) => React.ReactElement;
  let rowRenderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    rowRenderer = TestRenderer.create(renderItem({ item: member }));
  });
  return rowRenderer;
}

beforeEach(() => {
  MEMBERS = [MEMBER_A, MEMBER_B, MEMBER_C];
  updateMock.mockClear();
  deleteMock.mockClear();
  hasPermissionMock.mockImplementation(() => true);
  vi.spyOn(Alert, 'alert').mockClear();
});

function alertButtons() {
  const calls = (Alert.alert as unknown as { mock: { calls: unknown[][] } }).mock.calls;
  return calls[calls.length - 1][2] as { text: string; style?: string; onPress?: () => void }[];
}

describe('PeoplePicker', () => {
  it('lists everyone with no capability context and hides the "ver todos" toggle (AC4)', () => {
    const { renderer } = render();
    expect(ids(renderer)).toEqual(['a', 'b', 'c']);
    expect(find(renderer.root, 'people-picker-view-all').length).toBe(0);
  });

  it('defaults to capability-filtered list with a "ver todos" toggle (AC4)', () => {
    const { renderer } = render({ capability: 'preside' });
    expect(ids(renderer)).toEqual(['a']); // only can_preside
    expect(find(renderer.root, 'people-picker-view-all').length).toBe(1);
  });

  it('"ver todos" reveals members lacking the capability', () => {
    const { renderer } = render({ capability: 'preside' });
    expect(ids(renderer)).toEqual(['a']);
    toggle(renderer.root, 'people-picker-view-all', true);
    expect(ids(renderer)).toEqual(['a', 'b', 'c']);
  });

  it('grant-on-select confirms, grants the capability, then selects (AC5)', () => {
    const { renderer, onSelect } = render({ capability: 'preside' });
    const row = renderRow(renderer, MEMBER_B); // lacks can_preside
    press(row.root, 'people-picker-item-b');
    // Confirmation shown; invoke the non-cancel button.
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    const confirm = alertButtons().find((b) => b.style !== 'cancel')!;
    act(() => confirm.onPress?.());
    expect(updateMock).toHaveBeenCalledWith(
      { id: 'b', can_preside: true },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'b', can_preside: true }));
  });

  it('selects directly (no confirmation) when the member already has the capability', () => {
    const { renderer, onSelect } = render({ capability: 'preside' });
    const row = renderRow(renderer, MEMBER_A);
    press(row.root, 'people-picker-item-a');
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(onSelect).toHaveBeenCalledWith(MEMBER_A);
  });

  it('shows a "Responsável por" label for a responsible member (AC6)', () => {
    const { renderer } = render();
    expect(find(renderRow(renderer, MEMBER_A).root, 'people-picker-responsible-a').length).toBe(1);
    expect(find(renderRow(renderer, MEMBER_B).root, 'people-picker-responsible-b').length).toBe(0);
  });

  it('exposes add + row edit and opens the editor with the member when member:write (AC6)', () => {
    const { renderer } = render();
    expect(find(renderer.root, 'people-picker-add').length).toBe(1);
    const row = renderRow(renderer, MEMBER_A);
    expect(find(row.root, 'people-picker-edit-a').length).toBe(1);
    // Pressing edit loads the member into the (always-mounted) PersonEditor.
    press(row.root, 'people-picker-edit-a');
    const nameInput = find(renderer.root, 'person-editor-full-name')[0];
    expect(nameInput.props.value).toBe('Alice Preside');
  });

  it('never renders a per-row delete (trash) control — deletion lives in the editor (P1)', () => {
    const { renderer } = render();
    const row = renderRow(renderer, MEMBER_A);
    expect(find(row.root, 'people-picker-delete-a').length).toBe(0);
  });

  it('is view-only for observers: no add, no row controls, selection disabled (AC6)', () => {
    hasPermissionMock.mockImplementation(() => false);
    const { renderer, onSelect } = render();
    expect(find(renderer.root, 'people-picker-add').length).toBe(0);
    const row = renderRow(renderer, MEMBER_A);
    expect(find(row.root, 'people-picker-edit-a').length).toBe(0);
    press(row.root, 'people-picker-item-a');
    expect(onSelect).not.toHaveBeenCalled();
  });

  // --- Context: title / subtitle / toggle (P2, P6) ---

  it('always shows the fixed picker title (P2)', () => {
    for (const ctx of [undefined, 'speaker', 'preside', 'be_recognized'] as const) {
      const { renderer } = render(ctx ? { context: ctx } : {});
      expect(textOf(renderer.root, 'people-picker-title')).toBe('people.pickerTitle');
    }
  });

  it('shows the per-context subtitle matching the given context (P2)', () => {
    const { renderer } = render({ context: 'preside' });
    expect(textOf(renderer.root, 'people-picker-subtitle')).toBe('people.subtitles.preside');
    const rec = render({ context: 'be_recognized' });
    expect(textOf(rec.renderer.root, 'people-picker-subtitle')).toBe(
      'people.subtitles.be_recognized'
    );
  });

  it('shows the "Ver todos" Switch in capability contexts and hides it in speaker/prayer (P6)', () => {
    const preside = render({ context: 'preside' });
    expect(find(preside.renderer.root, 'people-picker-view-all').length).toBe(1);
    const recognize = render({ context: 'be_recognized' });
    expect(find(recognize.renderer.root, 'people-picker-view-all').length).toBe(1);
    for (const ctx of ['speaker', 'opening_prayer', 'closing_prayer'] as const) {
      const { renderer } = render({ context: ctx });
      expect(find(renderer.root, 'people-picker-view-all').length).toBe(0);
      // …but the subtitle still shows.
      expect(textOf(renderer.root, 'people-picker-subtitle')).toBe(`people.subtitles.${ctx}`);
    }
  });

  // --- Context: per-row secondary line (P3, P4, P5, P5b) ---

  it('shows the informal name in parentheses after the full name (P3)', () => {
    MEMBERS = [makeMember({ id: 'x', full_name: 'João Vasconcelos', informal_name: 'João' })];
    const { renderer } = render({ context: 'speaker' });
    const row = renderRow(renderer, MEMBERS[0]);
    const nameNode = find(row.root, 'people-picker-item-x')[0];
    const text = JSON.stringify(nameNode.props.children);
    expect(text).toContain('João Vasconcelos');
    expect(text).toContain('(João)');
  });

  it('speaker context: 2nd line shows speech count + responsible, no functions (P4)', () => {
    const { renderer } = render({ context: 'speaker' });
    const row = renderRow(renderer, MEMBER_A); // speechCount a=2, responsible for c
    expect(find(row.root, 'people-picker-responsible-a').length).toBe(1);
    expect(find(row.root, 'people-picker-calling-a').length).toBe(0);
    const text = JSON.stringify(row.toJSON());
    expect(text).toContain('members.speechCount');
    expect(text).not.toContain('capabilitiesShort');
  });

  it('preside context: name only — no speech count, responsible, functions or calling (P5)', () => {
    const { renderer } = render({ context: 'preside' });
    const row = renderRow(renderer, MEMBER_A);
    expect(find(row.root, 'people-picker-responsible-a').length).toBe(0);
    expect(find(row.root, 'people-picker-calling-a').length).toBe(0);
    const text = JSON.stringify(row.toJSON());
    expect(text).not.toContain('members.speechCount');
    expect(text).not.toContain('capabilitiesShort');
  });

  it('be_recognized context: 2nd line shows calling + functions (P5b)', () => {
    MEMBERS = [
      makeMember({
        id: 'r',
        full_name: 'Ricardo Almeida',
        calling: 'Bispo',
        can_preside: true,
        can_be_recognized: true,
      }),
    ];
    const { renderer } = render({ context: 'be_recognized' });
    const row = renderRow(renderer, MEMBERS[0]);
    expect(textOf(row.root, 'people-picker-calling-r')).toBe('Bispo');
    const text = JSON.stringify(row.toJSON());
    expect(text).toContain('capabilitiesShort');
  });

  // --- Multi-select keep-selected (P7) ---

  it('multiSelect: keeps a selected member visible when the search filters it out (P7)', () => {
    // Search "Alice" would drop Bob, but Bob is selected → he stays in the list.
    const { renderer } = render({ multiSelect: true, selectedIds: ['b'] });
    act(() => {
      (find(renderer.root, 'people-picker-search')[0].props.onChangeText as (v: string) => void)(
        'Alice'
      );
    });
    expect(ids(renderer)).toContain('b');
    expect(ids(renderer)).toContain('a');
  });

  it('single-select: does NOT force a non-matching member into the list (P7 scope)', () => {
    const { renderer } = render({ selectedIds: ['b'] });
    act(() => {
      (find(renderer.root, 'people-picker-search')[0].props.onChangeText as (v: string) => void)(
        'Alice'
      );
    });
    expect(ids(renderer)).not.toContain('b');
  });
});
