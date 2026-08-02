/**
 * Behavioral tests for EditableListField `renderItemLabel` (display-only transform).
 *
 * `react-native` is aliased to a test stub (vitest.config.ts). `react-native-draggable-flatlist`
 * (untransformed) is mocked to render each item via `renderItem`, and `react-native-svg` / theme
 * are stubbed. Asserts that `renderItemLabel` only affects the DISPLAYED text — parse/save/delete
 * and `onItemPress` all operate on the RAW item.
 */
import React from 'react';
import { render as rtlRender, screen, fireEvent, act } from '@testing-library/react-native';
// jest.mock calls below are hoisted above this import.
import { EditableListField } from '../components/EditableListField';


// DraggableFlatList: render each item through renderItem so rows appear in the tree.
jest.mock('react-native-draggable-flatlist', () => {
  const ReactMod = require('react');
  const DraggableFlatList = (props: Record<string, unknown>) => {
    const data = (props.data as string[]) ?? [];
    const renderItem = props.renderItem as (mockInfo: {
      item: string;
      drag: () => void;
      getIndex: () => number;
    }) => React.ReactElement;
    return ReactMod.createElement(
      'DraggableFlatList',
      null,
      data.map((item, index) =>
        ReactMod.createElement(
          ReactMod.Fragment,
          { key: index },
          renderItem({ item, drag: () => {}, getIndex: () => index })
        )
      )
    );
  };
  const ScaleDecorator = (props: { children?: React.ReactNode }) => props.children;
  return { __esModule: true, default: DraggableFlatList, ScaleDecorator };
});

jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      text: '#fff', textTertiary: '#888', border: '#333', error: '#f00',
    },
  }),
}));

// --- Helpers ---

interface Props {
  value: string | string[] | null;
  onSave: (v: string | null) => void;
  disabled: boolean;
  placeholder: string;
  onItemPress?: (index: number, item: string) => void;
  renderItemLabel?: (item: string) => string;
}

async function render(props: Props) {
  await rtlRender(React.createElement(EditableListField, props));
  return null; // call-site compatibility; the helpers query `screen`
}

/** All rendered plain-text strings in the tree. */
function allText(renderer: unknown): string {
  const texts = screen.root!.queryAll(
    (n) => typeof n.type === 'string' && n.type === 'Text'
  );
  const flatten = (c: unknown): string =>
    Array.isArray(c) ? c.map(flatten).join('') : typeof c === 'string' ? c : '';
  return texts.map((n) => flatten(n.props.children)).join('|');
}

const LABEL = (item: string) => `${item} — Bispo`;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('EditableListField renderItemLabel', () => {
  it('active (onItemPress) rows display the transformed label but pass the RAW item on press', async () => {
    const onSave = jest.fn();
    const onItemPress = jest.fn();
    const renderer = await render({
      value: 'Alice\nBob',
      onSave,
      disabled: false,
      placeholder: 'add',
      onItemPress,
      renderItemLabel: LABEL,
    });

    // Displayed text is transformed.
    const text = allText(renderer);
    expect(text).toContain('Alice — Bispo');
    expect(text).toContain('Bob — Bispo');

    // onItemPress receives the RAW item (no calling suffix).
    const itemPressables = screen.root!.queryAll(
      (n) =>
        typeof n.type === 'string' &&
        n.type === 'Pressable' &&
        typeof n.props.onPress === 'function' &&
        n.queryAll((c: any) => typeof c.type === 'string' && c.type === 'Text').length > 0
    );
    await act(async () => {
      (itemPressables[0].props.onPress as () => void)();
    });
    expect(onItemPress).toHaveBeenCalledWith(0, 'Alice');
  });

  it('deleting a row saves the RAW remaining items (no label transform in stored data)', async () => {
    const onSave = jest.fn();
    const renderer = await render({
      value: 'Alice\nBob',
      onSave,
      disabled: false,
      placeholder: 'add',
      onItemPress: jest.fn(),
      renderItemLabel: LABEL,
    });

    // The delete control is the Pressable with onPress that contains an Svg (XIcon).
    const deleteBtns = screen.root!.queryAll(
      (n) =>
        typeof n.type === 'string' &&
        n.type === 'Pressable' &&
        typeof n.props.onPress === 'function' &&
        n.queryAll((c: any) => typeof c.type === 'string' && c.type === 'Svg').length > 0
    );
    await act(async () => {
      (deleteBtns[0].props.onPress as () => void)();
    });
    // Raw remaining item, not "Bob — Bispo".
    expect(onSave).toHaveBeenCalledWith('Bob');
  });

  it('disabled rows display the transformed label (display-only)', async () => {
    const renderer = await render({
      value: 'Alice\nBob',
      onSave: jest.fn(),
      disabled: true,
      placeholder: 'add',
      renderItemLabel: LABEL,
    });
    const text = allText(renderer);
    expect(text).toContain('Alice — Bispo');
    expect(text).toContain('Bob — Bispo');
  });

  it('without renderItemLabel the raw item is displayed', async () => {
    const renderer = await render({
      value: 'Alice',
      onSave: jest.fn(),
      disabled: false,
      placeholder: 'add',
      onItemPress: jest.fn(),
    });
    const text = allText(renderer);
    expect(text).toContain('Alice');
    expect(text).not.toContain('Bispo');
  });
});
