/**
 * Behavioral tests for the "Outros" (custom sunday type) flow in SundayTypeDropdown.
 *
 * Bug: on web, tapping the custom-reason TextInput closed the modal, because the tap
 * bubbled up to the backdrop <Pressable onPress={close}>. The content <View> now stops
 * propagation on web (mirroring AgendaForm's bottom sheet), so the modal stays open.
 */
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

// Force web so the stopPropagation guard branch is active. Mock the Platform submodule rather
// than spreading `react-native` itself — the root module exports lazy getters, and spreading it
// eagerly instantiates every native module.
jest.mock('react-native/Libraries/Utilities/Platform', () => {
  const actual = jest.requireActual('react-native/Libraries/Utilities/Platform');
  const Platform = { ...(actual.default ?? actual), OS: 'web' };
  return { __esModule: true, default: Platform, ...Platform };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      text: '#000', textSecondary: '#666', textTertiary: '#999', border: '#ccc',
      card: '#fff', primary: '#00f', primaryContainer: '#eef', onPrimary: '#fff',
      surfaceVariant: '#eee', inputBackground: '#fafafa',
    },
  }),
}));

jest.mock('../components/icons', () => ({ ChevronDownIcon: () => null }));
jest.mock('./icons', () => ({ ChevronDownIcon: () => null }));
jest.mock('../components/StatusLED', () => ({ StatusLED: () => null }));
jest.mock('./StatusLED', () => ({ StatusLED: () => null }));

// @ts-expect-error test env flag
global.IS_REACT_ACT_ENVIRONMENT = true;

import { SundayTypeDropdown } from '../components/SundayCard';

function render(props: Partial<React.ComponentProps<typeof SundayTypeDropdown>> = {}) {
  const onSelect = jest.fn();
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(
      <SundayTypeDropdown
        currentType={'testimony_meeting' as any}
        onSelect={onSelect}
        onRevertToSpeeches={jest.fn()}
        speeches={[]}
        date="2026-08-02"
        {...props}
      />
    );
  });
  return { tree, onSelect };
}

function findByType(root: any, type: string): any[] {
  return root.findAll((n: any) => typeof n.type === 'string' && n.type === type);
}

/** Open the "Other" modal: press the dropdown, then the "other" list item. */
function openOtherModal(tree: TestRenderer.ReactTestRenderer) {
  const dropdown = tree.root.findAll(
    (n: any) => typeof n.type === 'string' && n.props.accessibilityRole === 'button'
  )[0] as any;
  act(() => dropdown.props.onPress());
  // The list renders items via FlatList.renderItem; call it for the "other" option.
  const flatList = findByType(tree.root, 'FlatList')[0];
  const otherItem = flatList.props.renderItem({ item: 'other' });
  act(() => otherItem.props.onPress());
}

describe('SundayTypeDropdown — "Outros" custom reason modal', () => {
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => jest.clearAllMocks());

  it('opens the custom-reason modal when "other" is selected', () => {
    const { tree } = render();
    openOtherModal(tree);
    const modals = findByType(tree.root, 'Modal');
    // The "other" modal is the second Modal and should be visible.
    const otherModal = modals[modals.length - 1];
    expect(otherModal.props.visible).toBe(true);
  });

  it('does not close the modal when tapping inside the content (web propagation guard)', () => {
    const { tree, onSelect } = render();
    openOtherModal(tree);

    // Find the content View that hosts the TextInput.
    const textInput = findByType(tree.root, 'TextInput')[0];
    expect(textInput).toBeTruthy();
    const contentView = tree.root.findAll(
      (n: any) =>
        typeof n.type === 'string' &&
        n.type === 'View' &&
        typeof n.props.onClick === 'function' &&
        n.findAll((c: any) => typeof c.type === 'string' && c.type === 'TextInput').length > 0
    )[0] as any;
    expect(contentView).toBeTruthy();

    // Simulate the web click on the content: it must stop propagation to the backdrop.
    const stopPropagation = jest.fn();
    act(() => contentView.props.onClick({ stopPropagation }));
    expect(stopPropagation).toHaveBeenCalledTimes(1);

    // Native responder guard is also present.
    expect(contentView.props.onStartShouldSetResponder()).toBe(true);

    // The modal is still open and no selection was committed by the inside tap.
    const modals = findByType(tree.root, 'Modal');
    expect(modals[modals.length - 1].props.visible).toBe(true);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('commits the trimmed custom reason via onSelect on confirm, and closes', () => {
    const { tree, onSelect } = render();
    openOtherModal(tree);

    const textInput = findByType(tree.root, 'TextInput')[0];
    act(() => textInput.props.onChangeText('  Funeral  '));

    // Confirm button is the last Pressable with an onPress inside the modal.
    const pressables = tree.root.findAll(
      (n: any) => typeof n.type === 'string' && n.type === 'Pressable' && typeof n.props.onPress === 'function'
    );
    const confirm = pressables[pressables.length - 1] as any;
    act(() => confirm.props.onPress());

    expect(onSelect).toHaveBeenCalledWith('other', 'Funeral');
    const modals = findByType(tree.root, 'Modal');
    expect(modals[modals.length - 1].props.visible).toBe(false);
  });

  it('does not commit when the custom reason is empty/whitespace', () => {
    const { tree, onSelect } = render();
    openOtherModal(tree);

    const textInput = findByType(tree.root, 'TextInput')[0];
    act(() => textInput.props.onChangeText('   '));

    const pressables = tree.root.findAll(
      (n: any) => typeof n.type === 'string' && n.type === 'Pressable' && typeof n.props.onPress === 'function'
    );
    const confirm = pressables[pressables.length - 1] as any;
    act(() => confirm.props.onPress());

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('closes the list modal before opening the other modal (no stacked backdrops)', () => {
    const { tree } = render();
    openOtherModal(tree);
    const modals = findByType(tree.root, 'Modal');
    // list modal (first) closed, other modal (second) open
    expect(modals[0].props.visible).toBe(false);
    expect(modals[1].props.visible).toBe(true);
  });
});
