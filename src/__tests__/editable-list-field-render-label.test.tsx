/**
 * Behavioral tests for EditableListField `renderItemLabel` (display-only transform).
 *
 * `react-native` is aliased to a test stub (vitest.config.ts). `react-native-draggable-flatlist`
 * (untransformed) is mocked to render each item via `renderItem`, and `react-native-svg` / theme
 * are stubbed. Asserts that `renderItemLabel` only affects the DISPLAYED text — parse/save/delete
 * and `onItemPress` all operate on the RAW item.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import TestRenderer from 'react-test-renderer';
// vi.mock calls below are hoisted above this import.
import { EditableListField } from '../components/EditableListField';

const { act } = TestRenderer;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// DraggableFlatList: render each item through renderItem so rows appear in the tree.
vi.mock('react-native-draggable-flatlist', async () => {
  const ReactMod = (await import('react')).default;
  const DraggableFlatList = (props: Record<string, unknown>) => {
    const data = (props.data as string[]) ?? [];
    const renderItem = props.renderItem as (info: {
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
  return { default: DraggableFlatList, ScaleDecorator };
});

vi.mock('react-native-svg', async () => {
  const ReactMod = (await import('react')).default;
  const h = (name: string) => (props: Record<string, unknown>) => ReactMod.createElement(name, props);
  return { default: h('Svg'), Svg: h('Svg'), Path: h('Path'), Circle: h('Circle') };
});

vi.mock('../contexts/ThemeContext', () => ({
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

function render(props: Props) {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(EditableListField, props));
  });
  return renderer;
}

/** All rendered plain-text strings in the tree. */
function allText(renderer: TestRenderer.ReactTestRenderer): string {
  const texts = renderer.root.findAll(
    (n) => typeof n.type === 'string' && n.type === 'Text'
  );
  const flatten = (c: unknown): string =>
    Array.isArray(c) ? c.map(flatten).join('') : typeof c === 'string' ? c : '';
  return texts.map((n) => flatten(n.props.children)).join('|');
}

const LABEL = (item: string) => `${item} — Bispo`;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('EditableListField renderItemLabel', () => {
  it('active (onItemPress) rows display the transformed label but pass the RAW item on press', () => {
    const onSave = vi.fn();
    const onItemPress = vi.fn();
    const renderer = render({
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
    const itemPressables = renderer.root.findAll(
      (n) =>
        typeof n.type === 'string' &&
        n.type === 'Pressable' &&
        typeof n.props.onPress === 'function' &&
        n.findAll((c) => typeof c.type === 'string' && c.type === 'Text').length > 0
    );
    act(() => {
      (itemPressables[0].props.onPress as () => void)();
    });
    expect(onItemPress).toHaveBeenCalledWith(0, 'Alice');
  });

  it('deleting a row saves the RAW remaining items (no label transform in stored data)', () => {
    const onSave = vi.fn();
    const renderer = render({
      value: 'Alice\nBob',
      onSave,
      disabled: false,
      placeholder: 'add',
      onItemPress: vi.fn(),
      renderItemLabel: LABEL,
    });

    // The delete control is the Pressable with onPress that contains an Svg (XIcon).
    const deleteBtns = renderer.root.findAll(
      (n) =>
        typeof n.type === 'string' &&
        n.type === 'Pressable' &&
        typeof n.props.onPress === 'function' &&
        n.findAll((c) => typeof c.type === 'string' && c.type === 'Svg').length > 0
    );
    act(() => {
      (deleteBtns[0].props.onPress as () => void)();
    });
    // Raw remaining item, not "Bob — Bispo".
    expect(onSave).toHaveBeenCalledWith('Bob');
  });

  it('disabled rows display the transformed label (display-only)', () => {
    const renderer = render({
      value: 'Alice\nBob',
      onSave: vi.fn(),
      disabled: true,
      placeholder: 'add',
      renderItemLabel: LABEL,
    });
    const text = allText(renderer);
    expect(text).toContain('Alice — Bispo');
    expect(text).toContain('Bob — Bispo');
  });

  it('without renderItemLabel the raw item is displayed', () => {
    const renderer = render({
      value: 'Alice',
      onSave: vi.fn(),
      disabled: false,
      placeholder: 'add',
      onItemPress: vi.fn(),
    });
    const text = allText(renderer);
    expect(text).toContain('Alice');
    expect(text).not.toContain('Bispo');
  });
});
