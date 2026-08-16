/**
 * Behavioral tests for PeoplePicker (v2.0 unified people picker).
 *
 * `react-native` is aliased to a test stub (vitest.config.ts). Data hooks, contexts and i18n are
 * mocked per-file; pure utils (getResponsibleForMap/filterMembers) stay real via importOriginal.
 */
import React from 'react';
import { render as rtlRender, screen, fireEvent, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import type { Member } from '../types/database';
// jest.mock calls below are hoisted above this import, so the mocks still apply.
import { PeoplePicker, type PeoplePickerProps } from '../components/PeoplePicker';


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

let mockMEMBERS: Member[] = [];
const mockUpdateMock = jest.fn((_vars: { id: string }, opts?: { onSuccess?: (m: Member) => void }) =>
  opts?.onSuccess?.({ ...MEMBER_B, can_preside: true })
);
const mockDeleteMock = jest.fn();

jest.mock('../hooks/useMembers', () => {
  const actual = (jest.requireActual('../hooks/useMembers')) as Record<string, unknown>;
  return {
    ...actual,
    useMembers: () => ({ data: mockMEMBERS }),
    useCreateMember: () => ({ mutate: jest.fn() }),
    useUpdateMember: () => ({ mutate: mockUpdateMock }),
    useDeleteMember: () => ({ mutate: mockDeleteMock }),
  };
});

jest.mock('../hooks/useSpeechCounts', () => ({
  useSpeechCounts: () => ({ data: { a: 2 }, isLoading: false }),
}));

// `react-native-svg` (pulled in via icons/SearchInput) ships untransformed Flow/TS — stub it.
// Partial mock: keep initReactI18next (used by the real i18n loaded via the useMembers chain).
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

const mockHasPermissionMock = jest.fn((_p: string) => true);
jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ hasPermission: mockHasPermissionMock }),
}));

// --- Helpers ---

async function render(props: Partial<PeoplePickerProps> = {}) {
  const onSelect = jest.fn();
  const onClose = jest.fn();
  await rtlRender(React.createElement(PeoplePicker, { visible: true, onSelect, onClose, ...props }));
  return { renderer: null, onSelect, onClose };
}

// The react-native stub's FlatList does not invoke renderItem, so we (a) read its `data` prop for
// filtering assertions and (b) render a single row via `renderItem` for row-level behavior.
function find(_root: unknown, testID: string) {
  return screen.queryAllByTestId(testID);
}

async function press(_root: unknown, testID: string) {
  await fireEvent.press(screen.getByTestId(testID));
}

/** Flip a Switch (e.g. the "Ver todos" toggle). */
async function toggle(_root: unknown, testID: string, value: boolean) {
  await fireEvent(screen.getByTestId(testID), 'valueChange', value);
}

/** Read the text content of the first node carrying `testID`. */
function textOf(_root: unknown, testID: string): string {
  const flatten = (c: unknown): string =>
    Array.isArray(c) ? c.map(flatten).join('') : typeof c === 'string' ? c : '';
  return flatten(screen.getByTestId(testID).props.children);
}

/**
 * The ids of the rows the list ACTUALLY renders.
 *
 * The previous version read FlatList's `data` prop and, separately, rendered a chosen row into its
 * own renderer to press it — so a test could exercise a row the real list never mounted. Reading
 * the rendered rows means the filter and the row assertions can no longer disagree.
 */
function ids(_renderer?: unknown): string[] {
  return screen
    .queryAllByTestId(/^people-picker-item-/)
    .map((n) => String(n.props.testID).replace('people-picker-item-', ''));
}

beforeEach(() => {
  mockMEMBERS = [MEMBER_A, MEMBER_B, MEMBER_C];
  mockUpdateMock.mockClear();
  mockDeleteMock.mockClear();
  mockHasPermissionMock.mockImplementation(() => true);
  jest.spyOn(Alert, 'alert').mockClear();
});

function alertButtons() {
  const calls = (Alert.alert as unknown as { mock: { calls: unknown[][] } }).mock.calls;
  return calls[calls.length - 1][2] as { text: string; style?: string; onPress?: () => void }[];
}


/** All rendered text, joined. screen.toJSON() cannot be stringified — FlatList's CellRenderer
 *  carries a circular _reactInternals reference. */
function renderedText(): string {
  return screen
    .queryAllByText(/.*/)
    .map((n) => {
      const c = n.props.children;
      return Array.isArray(c) ? c.join('') : String(c);
    })
    .join('|');
}

describe('PeoplePicker', () => {
  it('lists everyone with no capability context and hides the "ver todos" toggle (AC4)', async () => {
    await render();
    expect(ids()).toEqual(['a', 'b', 'c']);
    expect(find(null, 'people-picker-view-all').length).toBe(0);
  });

  it('defaults to capability-filtered list with a "ver todos" toggle (AC4)', async () => {
    await render({ capability: 'preside' });
    expect(ids()).toEqual(['a']); // only can_preside
    expect(find(null, 'people-picker-view-all').length).toBe(1);
  });

  it('"ver todos" reveals members lacking the capability', async () => {
    await render({ capability: 'preside' });
    expect(ids()).toEqual(['a']);
    await toggle(null, 'people-picker-view-all', true);
    expect(ids()).toEqual(['a', 'b', 'c']);
  });

  it('grant-on-select confirms, grants the capability, then selects (AC5)', async () => {
    const { onSelect } = await render({ capability: 'preside' });
    // B lacks can_preside, so the filtered list does not render its row — reveal it the way a
    // user would. (The old version pressed a row the real list never mounted.)
    await toggle(null, 'people-picker-view-all', true);
    await press(null, 'people-picker-item-b');
    // Confirmation shown; invoke the non-cancel button.
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    const confirm = alertButtons().find((b) => b.style !== 'cancel')!;
    await act(async () => confirm.onPress?.());
    expect(mockUpdateMock).toHaveBeenCalledWith(
      { id: 'b', can_preside: true },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'b', can_preside: true }));
  });

  it('selects directly (no confirmation) when the member already has the capability', async () => {
    const { onSelect } = await render({ capability: 'preside' });
    await press(null, 'people-picker-item-a');
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(onSelect).toHaveBeenCalledWith(MEMBER_A);
  });

  it('shows a "Responsável por" label for a responsible member (AC6)', async () => {
    await render();
    expect(find(null, 'people-picker-responsible-a').length).toBe(1);
    expect(find(null, 'people-picker-responsible-b').length).toBe(0);
  });

  it('exposes add + row edit and opens the editor with the member when member:write (AC6)', async () => {
    await render();
    expect(find(null, 'people-picker-add').length).toBe(1);
    expect(find(null, 'people-picker-edit-a').length).toBe(1);
    // Pressing edit loads the member into the (always-mounted) PersonEditor.
    await press(null, 'people-picker-edit-a');
    const nameInput = find(null, 'person-editor-full-name')[0];
    expect(nameInput.props.value).toBe('Alice Preside');
  });

  it('never renders a per-row delete (trash) control — deletion lives in the editor (P1)', async () => {
    await render();
    expect(find(null, 'people-picker-delete-a').length).toBe(0);
  });

  it('is view-only for observers: no add, no row controls, selection disabled (AC6)', async () => {
    mockHasPermissionMock.mockImplementation(() => false);
    const { onSelect } = await render();
    expect(find(null, 'people-picker-add').length).toBe(0);
    expect(find(null, 'people-picker-edit-a').length).toBe(0);
    await press(null, 'people-picker-item-a');
    expect(onSelect).not.toHaveBeenCalled();
  });

  // --- Context: title / subtitle / toggle (P2, P6) ---

  it('top bar shows "Cancel" on the left (replaces Close) and still closes (A)', async () => {
    const { onClose } = await render();
    const closeBtn = find(null, 'people-picker-close')[0];
    const label = closeBtn
      .queryAll((n: any) => typeof n.type === 'string' && typeof n.props.children === 'string')
      .map((n) => n.props.children as string)
      .join('');
    expect(label).toContain('common.cancel');
    expect(label).not.toContain('common.close');
    await press(null, 'people-picker-close');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('title is centered in the top bar (A)', async () => {
    await render();
    const title = find(null, 'people-picker-title')[0];
    expect(JSON.stringify(title.props.style)).toContain('center');
  });

  it('add control is a compact icon button next to search — not a dashed text button (A)', async () => {
    await render();
    const add = find(null, 'people-picker-add')[0];
    expect(add).toBeDefined();
    expect(add.props.accessibilityLabel).toBe('people.addPerson');
    // Renders an icon, not the old "+ Add person" text label.
    expect(screen.queryByText(/addPerson/)).toBeNull();
  });

  it('always shows the fixed picker title (P2)', async () => {
    for (const ctx of [undefined, 'speaker', 'preside', 'be_recognized'] as const) {
      await render(ctx ? { context: ctx } : {});
      expect(textOf(null, 'people-picker-title')).toBe('people.pickerTitle');
    }
  });

  it('shows the per-context subtitle matching the given context (P2)', async () => {
    await render({ context: 'preside' });
    expect(textOf(null, 'people-picker-subtitle')).toBe('people.subtitles.preside');
    await render({ context: 'be_recognized' });
    expect(textOf(null, 'people-picker-subtitle')).toBe(
      'people.subtitles.be_recognized'
    );
  });

  it('shows the "Ver todos" Switch in capability contexts and hides it in speaker/prayer (P6)', async () => {
    await render({ context: 'preside' });
    expect(find(null, 'people-picker-view-all').length).toBe(1);
    await render({ context: 'be_recognized' });
    expect(find(null, 'people-picker-view-all').length).toBe(1);
    for (const ctx of ['speaker', 'opening_prayer', 'closing_prayer'] as const) {
      await render({ context: ctx });
      expect(find(null, 'people-picker-view-all').length).toBe(0);
      // …but the subtitle still shows.
      expect(textOf(null, 'people-picker-subtitle')).toBe(`people.subtitles.${ctx}`);
    }
  });

  // --- Context: per-row secondary line (P3, P4, P5, P5b) ---

  it('shows the informal name in parentheses after the full name (P3)', async () => {
    mockMEMBERS = [makeMember({ id: 'x', full_name: 'João Vasconcelos', informal_name: 'João' })];
    await render({ context: 'speaker' });
    // Regex: toHaveTextContent matches a string exactly, and the row also carries the nickname.
    expect(screen.getByTestId('people-picker-item-x')).toHaveTextContent(/João Vasconcelos/);
    expect(screen.getByTestId('people-picker-item-x')).toHaveTextContent(/\(João\)/);
  });

  it('speaker context: 2nd line shows speech count + responsible, no functions (P4)', async () => {
    await render({ context: 'speaker' });
    expect(find(null, 'people-picker-responsible-a').length).toBe(1);
    expect(find(null, 'people-picker-calling-a').length).toBe(0);
    const text = renderedText();
    expect(text).toContain('members.speechCount');
    expect(text).not.toContain('capabilitiesShort');
  });

  it('preside context: 2nd line shows calling (when set), no speech/responsible/functions', async () => {
    mockMEMBERS = [
      makeMember({ id: 'p', full_name: 'Ana Lima', calling: 'Presidente da SS', can_preside: true }),
    ];
    await render({ context: 'preside' });
    expect(textOf(null, 'people-picker-calling-p')).toBe('Presidente da SS');
    expect(find(null, 'people-picker-responsible-p').length).toBe(0);
    const text = renderedText();
    expect(text).not.toContain('members.speechCount');
    expect(text).not.toContain('capabilitiesShort');
  });

  it('play_piano/lead_music context: never shows calling — name only', async () => {
    mockMEMBERS = [
      makeMember({ id: 'k', full_name: 'Beto Piano', calling: 'Organista', can_play_piano: true }),
    ];
    for (const ctx of ['play_piano', 'lead_music'] as const) {
      await render({ context: ctx });
      expect(find(null, 'people-picker-calling-k').length).toBe(0);
    }
  });

  it('calling contexts: search also matches the calling text', async () => {
    mockMEMBERS = [
      makeMember({ id: 'r', full_name: 'Ricardo Almeida', calling: 'Bispo', can_be_recognized: true }),
      makeMember({ id: 'r2', full_name: 'Paulo Santos', calling: 'Secretário', can_be_recognized: true }),
    ];
    await render({ context: 'be_recognized' });
    await act(async () => {
      (find(null, 'people-picker-search')[0].props.onChangeText as (v: string) => void)(
        'Bispo'
      );
    });
    expect(ids()).toEqual(['r']);
  });

  it('be_recognized context: 2nd line shows calling ONLY — no functions (P5b)', async () => {
    mockMEMBERS = [
      makeMember({
        id: 'r',
        full_name: 'Ricardo Almeida',
        calling: 'Bispo',
        can_preside: true,
        can_be_recognized: true,
      }),
    ];
    await render({ context: 'be_recognized' });
    expect(textOf(null, 'people-picker-calling-r')).toBe('Bispo');
    const text = renderedText();
    // Functions (capabilitiesShort) must NOT appear on the recognize line.
    expect(text).not.toContain('capabilitiesShort');
  });

  it('be_recognized context: no calling → no secondary line (P5b)', async () => {
    mockMEMBERS = [
      makeMember({ id: 'r2', full_name: 'Paulo Santos', calling: null, can_be_recognized: true }),
    ];
    await render({ context: 'be_recognized' });
    expect(find(null, 'people-picker-calling-r2').length).toBe(0);
  });

  // --- Multi-select keep-selected (P7) ---

  it('multiSelect: keeps a selected member visible when the search filters it out (P7)', async () => {
    // Search "Alice" would drop Bob, but Bob is selected → he stays in the list.
    await render({ multiSelect: true, selectedIds: ['b'] });
    await act(async () => {
      (find(null, 'people-picker-search')[0].props.onChangeText as (v: string) => void)(
        'Alice'
      );
    });
    expect(ids()).toContain('b');
    expect(ids()).toContain('a');
  });

  it('single-select: does NOT force a non-matching member into the list (P7 scope)', async () => {
    await render({ selectedIds: ['b'] });
    await act(async () => {
      (find(null, 'people-picker-search')[0].props.onChangeText as (v: string) => void)(
        'Alice'
      );
    });
    expect(ids()).not.toContain('b');
  });

  describe('adding a person carries the picker context', () => {
  it('pre-selects the capability the picker is filtering by', async () => {
    await render({ context: 'play_piano' });
    await press(null, 'people-picker-add');

    // The editor is the real component, so this asserts the whole chain: context -> capability
    // -> the switch the user would otherwise have to flip.
    const sw = screen.getByTestId('person-editor-cap-switch-play_piano');
    expect((sw.props.value ?? sw.props.on) === true).toBe(true);
  });

  it('leaves capabilities alone when the picker has no capability context', async () => {
    await render({ context: 'speaker' });
    await press(null, 'people-picker-add');

    const sw = screen.getByTestId('person-editor-cap-switch-play_piano');
    expect((sw.props.value ?? sw.props.on) === true).toBe(false);
  });
});

describe('the picker opens ready to type', () => {
  /*
   * Asserted on the rendered prop rather than on real focus: the test host has no focus manager, so
   * there is nothing observable to check — RNTL ships no focus matcher. `autoFocus` IS the
   * instruction the platform acts on, and removing it is exactly the regression worth catching.
   * The topic selector already does this (TopicSelectorModal); the people picker did not.
   */
  it('focuses the search field so the keyboard comes up (AC1, AC2)', async () => {
    await render();
    expect(screen.getByTestId('people-picker-search').props.autoFocus).toBe(true);
  });

  it('still opens with an empty search and the full list (AC4)', async () => {
    await render();
    expect(screen.getByTestId('people-picker-search').props.value).toBe('');
  });
});

describe('multiSelect draft (recognition)', () => {
    it('Save grants the capability to selected + confirms the set; Cancel discards', async () => {
      const onConfirmMulti = jest.fn();
      const { onClose } = await render({
        context: 'be_recognized',
        multiSelect: true,
        onConfirmMulti,
        selectedIds: [],
      });
      // Bob lacks can_be_recognized, so the filtered list hides his row — reveal it first.
      await toggle(null, 'people-picker-view-all', true);
      await press(null, 'people-picker-item-b');
      // Save → prompt (Bob is missing the capability).
      await press(null, 'people-picker-save');
      expect(Alert.alert).toHaveBeenCalledTimes(1);
      const yes = alertButtons().find((b) => b.text === 'common.yes');
      await act(async () => yes?.onPress?.());
      expect(mockUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'b', can_be_recognized: true })
      );
      expect(onConfirmMulti).toHaveBeenCalledWith([expect.objectContaining({ id: 'b' })]);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('Cancel does not commit the draft', async () => {
      const onConfirmMulti = jest.fn();
      const { onClose } = await render({
        context: 'be_recognized',
        multiSelect: true,
        onConfirmMulti,
        selectedIds: [],
      });
      await toggle(null, 'people-picker-view-all', true);
      await press(null, 'people-picker-item-b');
      await press(null, 'people-picker-close');
      expect(onConfirmMulti).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
