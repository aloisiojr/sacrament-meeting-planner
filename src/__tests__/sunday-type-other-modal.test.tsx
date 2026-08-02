/**
 * Behavioral tests for the "Outros" (custom sunday type) flow in SundayTypeDropdown.
 *
 * Bug: on web, tapping the custom-reason TextInput closed the modal, because the tap
 * bubbled up to the backdrop <Pressable onPress={close}>. The content <View> now stops
 * propagation on web (mirroring AgendaForm's bottom sheet), so the modal stays open.
 */
import React from 'react';
import { render as rtlRender, screen, fireEvent, act } from '@testing-library/react-native';

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
jest.mock('../components/StatusLED', () => ({ StatusLED: () => null }));


import { SundayTypeDropdown } from '../components/SundayCard';

async function render(props: Partial<React.ComponentProps<typeof SundayTypeDropdown>> = {}) {
  const onSelect = jest.fn();
  await rtlRender(<SundayTypeDropdown
        currentType={'testimony_meeting' as any}
        onSelect={onSelect}
        onRevertToSpeeches={jest.fn()}
        speeches={[]}
        date="2026-08-02"
        {...props}
      />);
  return { tree: null, onSelect };
}

function findByType(_root: unknown, type: string): any[] {
  return screen.root?.queryAll((n: any) => typeof n.type === 'string' && n.type === type) ?? [];
}

/**
 * Open the "Other" modal: press the dropdown, then the "other" row. Against real React Native the
 * FlatList renders its own rows, so there is no renderItem to invoke by hand — the row is pressed
 * by its label, which the i18n mock passes through as the raw key.
 */
async function openOtherModal(_tree?: unknown) {
  await fireEvent.press(screen.getAllByRole('button')[0]);
  await fireEvent.press(screen.getByText('sundayExceptions.other'));
}

describe('SundayTypeDropdown — "Outros" custom reason modal', () => {
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => jest.clearAllMocks());

  /** The custom-reason input; present only while the "other" modal is open. */
  const reasonInput = () => screen.queryByPlaceholderText('sundayExceptions.otherPlaceholder');

  it('opens the custom-reason modal when "other" is selected', async () => {
    await render();
    await openOtherModal();
    // Real Modal renders nothing while hidden, so the input being on screen IS "the modal is open".
    expect(reasonInput()).not.toBeNull();
  });

  // NOT COVERED HERE — deliberately, and this is the bug the file was written for.
  //
  // The content view guards against the tap reaching the backdrop two ways:
  // `onStartShouldSetResponder={() => true}` (native) and, on web only,
  // `onClick={(e) => e.stopPropagation()}`. Neither is assertable in this suite:
  //   - RNTL's fireEvent.press does not model responder negotiation. It walks UP the tree for the
  //     nearest onPress, which is the backdrop Pressable — so a press "inside" always closes the
  //     modal here, regardless of the guard.
  //   - The props cannot be inspected either: Modal content lives outside screen.root, so
  //     screen.root.queryAll cannot reach the content view.
  //   - React Native's View drops the unknown `onClick` prop before the host element; only
  //     react-native-web forwards it.
  //
  // A green test here would have proven nothing. This belongs in the E2E layer (a real tap on a
  // real renderer), and the previous version of this test only passed because the stub exposed
  // raw props.

  it('commits the trimmed custom reason via onSelect on confirm, and closes', async () => {
    const { onSelect } = await render();
    await openOtherModal();

    await fireEvent.changeText(reasonInput()!, '  Funeral  ');
    await fireEvent.press(screen.getByText('common.confirm'));

    expect(onSelect).toHaveBeenCalledWith('other', 'Funeral');
    expect(reasonInput()).toBeNull();
  });

  it('does not commit when the custom reason is empty/whitespace', async () => {
    const { onSelect } = await render();
    await openOtherModal();

    await fireEvent.changeText(reasonInput()!, '   ');
    // Confirm is disabled for a blank reason, so the press must not fire.
    await fireEvent.press(screen.getByText('common.confirm'));

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('closes the list modal before opening the other modal (no stacked backdrops)', async () => {
    await render();
    await openOtherModal();
    // The type list is gone. Assert on a NON-current option: the dropdown trigger keeps showing
    // the current type's label ('testimony_meeting' here) whether the list is open or not.
    expect(screen.queryByText('sundayExceptions.general_conference')).toBeNull();
    expect(reasonInput()).not.toBeNull();
  });
});
