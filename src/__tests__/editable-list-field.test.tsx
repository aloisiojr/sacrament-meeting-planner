/**
 * EditableListField behaviour.
 *
 * This component backs every \n-joined list in the app (announcements, recognised names,
 * designations). Its "coverage" was ~14 readFileSync assertions in f071-recognized-names checking
 * that its source text contained the strings `multiline`, `blurOnSubmit`, `dragHitSlop`,
 * `startEdit(idx)` and so on. Those cannot tell whether typing two lines actually creates two
 * items, and they break on a rename that changes nothing.
 *
 * The DraggableFlatList mock renders each row through `renderItem`, which is what puts the rows in
 * the tree; everything else is the real component.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';

jest.mock('react-native-draggable-flatlist', () => {
  const ReactMod = require('react');
  const DraggableFlatList = (props: Record<string, unknown>) => {
    const data = (props.data as string[]) ?? [];
    // Named `mockInfo`: babel-plugin-jest-hoist reads the parameter name of this TYPE annotation
    // as an out-of-scope variable reference, and only `mock`-prefixed names are permitted.
    const renderItem = props.renderItem as (mockInfo: {
      item: string;
      drag: () => void;
      getIndex: () => number;
    }) => React.ReactElement;
    return ReactMod.createElement(
      'DraggableFlatList',
      // Surface the list's own props so the drag configuration is assertable.
      { testID: 'dfl', dragHitSlop: props.dragHitSlop, scrollEnabled: props.scrollEnabled },
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
      text: '#fff', textTertiary: '#888', textSecondary: '#aaa', border: '#333', error: '#f00',
    },
  }),
}));
// Icons render SVG; as named host elements they are findable by type.
jest.mock('../components/icons', () => new Proxy({}, {
  get: (_t, name: string) => (p: Record<string, unknown>) =>
    require('react').createElement(String(name), p),
}));

import { EditableListField } from '../components/EditableListField';

type Props = React.ComponentProps<typeof EditableListField>;

async function renderField(over: Partial<Props> = {}) {
  const onSave = jest.fn();
  await render(
    <EditableListField
      value={null}
      onSave={onSave}
      disabled={false}
      placeholder="add-placeholder"
      {...over}
    />
  );
  return onSave;
}

/** The free-text "add" input at the bottom (absent when onAddPress is supplied). */
const addInput = () => screen.getByPlaceholderText('add-placeholder');
/** The inline edit input for row `idx`. */
const rowInput = (idx: number) => screen.getAllByDisplayValue(/.*/)[idx];

describe('EditableListField — adding', () => {
  it('adds a typed entry on submit', async () => {
    const onSave = await renderField({ value: null });

    await act(async () => {
      fireEvent.changeText(addInput(), 'Ana');
    });
    await act(async () => {
      fireEvent(addInput(), 'submitEditing');
    });

    expect(onSave).toHaveBeenCalledWith('Ana');
  });

  it('appends to an existing list rather than replacing it', async () => {
    const onSave = await renderField({ value: 'Ana\nBruno' });

    await act(async () => {
      fireEvent.changeText(addInput(), 'Carla');
    });
    await act(async () => {
      fireEvent(addInput(), 'submitEditing');
    });

    expect(onSave).toHaveBeenCalledWith('Ana\nBruno\nCarla');
  });

  it('splits a pasted multi-line block into separate entries', async () => {
    // Pasting a list from a message is the common case; storing it as one item makes it
    // undeletable row by row.
    const onSave = await renderField({ value: null });

    await act(async () => {
      fireEvent.changeText(addInput(), 'Ana\nBruno\nCarla');
    });
    await act(async () => {
      fireEvent(addInput(), 'submitEditing');
    });

    expect(onSave).toHaveBeenCalledWith('Ana\nBruno\nCarla');
    // Three editable rows, not one row holding the whole block. (Rows are TextInputs in this
    // variant, so they are found by display value rather than by text.)
    expect(screen.queryByDisplayValue('Ana')).not.toBeNull();
    expect(screen.queryByDisplayValue('Bruno')).not.toBeNull();
    expect(screen.queryByDisplayValue('Carla')).not.toBeNull();
  });

  it('trims each pasted entry and drops the blank lines', async () => {
    const onSave = await renderField({ value: null });

    await act(async () => {
      fireEvent.changeText(addInput(), '  Ana  \n\n   \n Bruno ');
    });
    await act(async () => {
      fireEvent(addInput(), 'submitEditing');
    });

    expect(onSave).toHaveBeenCalledWith('Ana\nBruno');
  });

  it('saves nothing for a blank submission', async () => {
    const onSave = await renderField({ value: 'Ana' });

    await act(async () => {
      fireEvent.changeText(addInput(), '   ');
    });
    await act(async () => {
      fireEvent(addInput(), 'submitEditing');
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it('also commits on blur, so a tap elsewhere does not lose the entry', async () => {
    const onSave = await renderField({ value: null });

    await act(async () => {
      fireEvent.changeText(addInput(), 'Ana');
    });
    await act(async () => {
      fireEvent(addInput(), 'blur');
    });

    expect(onSave).toHaveBeenCalledWith('Ana');
  });

  it('clears the input after adding, ready for the next entry', async () => {
    await renderField({ value: null });

    await act(async () => {
      fireEvent.changeText(addInput(), 'Ana');
    });
    await act(async () => {
      fireEvent(addInput(), 'submitEditing');
    });

    expect(addInput().props.value).toBe('');
  });
});

describe('EditableListField — inline editing', () => {
  it('rewrites the edited row and leaves the others alone', async () => {
    const onSave = await renderField({ value: 'Ana\nBruno' });

    await act(async () => {
      fireEvent.changeText(rowInput(0), 'Ana Silva');
    });
    await act(async () => {
      fireEvent(rowInput(0), 'submitEditing');
    });

    expect(onSave).toHaveBeenCalledWith('Ana Silva\nBruno');
  });

  it('deletes the row when it is edited down to nothing', async () => {
    const onSave = await renderField({ value: 'Ana\nBruno' });

    await act(async () => {
      fireEvent.changeText(rowInput(0), '   ');
    });
    await act(async () => {
      fireEvent(rowInput(0), 'submitEditing');
    });

    expect(onSave).toHaveBeenCalledWith('Bruno');
  });

  it('expands one row into several when newlines are pasted into it, in place', async () => {
    const onSave = await renderField({ value: 'Ana\nCarla' });

    await act(async () => {
      fireEvent.changeText(rowInput(0), 'Ana\nBruno');
    });
    await act(async () => {
      fireEvent(rowInput(0), 'submitEditing');
    });

    // The new entries take the edited row's position, not the end of the list.
    expect(onSave).toHaveBeenCalledWith('Ana\nBruno\nCarla');
  });

  it('commits an edit on blur', async () => {
    const onSave = await renderField({ value: 'Ana' });

    await act(async () => {
      fireEvent.changeText(rowInput(0), 'Ana Silva');
    });
    await act(async () => {
      fireEvent(rowInput(0), 'blur');
    });

    expect(onSave).toHaveBeenCalledWith('Ana Silva');
  });

  it('allows multi-line text in a row rather than swallowing the newline', async () => {
    // `multiline` on the row input is what makes the paste-to-split behaviour above reachable.
    await renderField({ value: 'Ana' });
    expect(rowInput(0).props.multiline).toBe(true);
  });
});

describe('EditableListField — deleting', () => {
  it('removes the chosen row', async () => {
    const onSave = await renderField({ value: 'Ana\nBruno\nCarla' });

    await act(async () => {
      fireEvent.press(screen.getByTestId('editable-list-delete-1'));
    });

    expect(onSave).toHaveBeenCalledWith('Ana\nCarla');
  });

  it('stores NULL, not an empty string, when the last row goes', async () => {
    // The column is nullable and the UI treats null as "unset"; "" renders as one blank row.
    const onSave = await renderField({ value: 'Ana' });

    await act(async () => {
      fireEvent.press(screen.getByTestId('editable-list-delete-0'));
    });

    expect(onSave).toHaveBeenCalledWith(null);
  });

  it('exposes the icon-only control to a screen reader', async () => {
    await renderField({ value: 'Ana' });
    expect(screen.getByTestId('editable-list-delete-0').props.accessibilityRole).toBe('button');
  });
});

describe('EditableListField — drag to reorder', () => {
  it('restricts the drag hit area to the grip, so a row can still be tapped to edit', async () => {
    // Without dragHitSlop the whole row initiates a drag and inline editing becomes unreachable.
    await renderField({ value: 'Ana\nBruno' });
    expect(screen.getByTestId('dfl').props.dragHitSlop).toEqual({ left: 0, width: 40 });
  });

  it('leaves scrolling to the parent, so the page is not fighting the list', async () => {
    await renderField({ value: 'Ana\nBruno' });
    expect(screen.getByTestId('dfl').props.scrollEnabled).toBe(false);
  });

  it('gives every row a grip handle', async () => {
    // Replaces three source-text assertions in f067-announcements-list that grepped for the
    // strings `GripIcon`, `DraggableFlatList` and `from './icons'`.
    await renderField({ value: 'Ana\nBruno\nCarla' });

    const grips = screen.root!.queryAll(
      (n) => typeof n.type === 'string' && n.type === 'GripIcon'
    );
    expect(grips).toHaveLength(3);
  });

  it('does not truncate a long entry — the row grows instead', async () => {
    // `numberOfLines` on the active row would hide the tail of a long name mid-edit.
    await renderField({ value: 'A very long recognised name that would not fit on one line' });
    expect(rowInput(0).props.numberOfLines).toBeUndefined();
  });
});

describe('EditableListField — the picker variants', () => {
  it('onItemPress replaces the inline editor with a row that reports its index and value', async () => {
    const onItemPress = jest.fn();
    await renderField({ value: 'Ana\nBruno', onItemPress });

    await act(async () => {
      fireEvent.press(screen.getByText('Bruno'));
    });

    expect(onItemPress).toHaveBeenCalledWith(1, 'Bruno');
  });

  it('onAddPress replaces the free-text input with a button', async () => {
    // Used where entries must come from the member list rather than being typed.
    const onAddPress = jest.fn();
    await renderField({ value: 'Ana', onAddPress });

    expect(screen.queryByPlaceholderText('add-placeholder')).toBeNull();
    await act(async () => {
      fireEvent.press(screen.getByText('add-placeholder'));
    });
    expect(onAddPress).toHaveBeenCalled();
  });

  it('still deletes rows in the picker variant', async () => {
    const onSave = await renderField({
      value: 'Ana\nBruno',
      onItemPress: jest.fn(),
      onAddPress: jest.fn(),
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('editable-list-delete-0'));
    });

    expect(onSave).toHaveBeenCalledWith('Bruno');
  });
});

describe('EditableListField — disabled', () => {
  it('renders the items as plain text with no controls', async () => {
    await renderField({ value: 'Ana\nBruno', disabled: true });

    expect(screen.queryByText('Ana')).not.toBeNull();
    expect(screen.queryByText('Bruno')).not.toBeNull();
    expect(screen.queryByTestId('editable-list-delete-0')).toBeNull();
    expect(screen.queryByPlaceholderText('add-placeholder')).toBeNull();
  });

  it('shows the placeholder as text when there is nothing to show', async () => {
    await renderField({ value: null, disabled: true });
    expect(screen.queryByText('add-placeholder')).not.toBeNull();
  });
});

describe('EditableListField — external updates', () => {
  it('accepts a legacy TEXT[] value, not just the joined string', async () => {
    // migration-032 compatibility: rows written before it, and caches persisted before it, are
    // arrays. See list-field.test.ts for the parse layer.
    await renderField({ value: ['Ana', 'Bruno'] });

    expect(screen.queryByDisplayValue('Ana')).not.toBeNull();
    expect(screen.queryByDisplayValue('Bruno')).not.toBeNull();
  });

  it('does not render a legacy array as one mangled row', async () => {
    // Without the Array.isArray branch the value reaches `.split('\n')` as an array.
    await renderField({ value: ['Ana', 'Bruno'] });
    expect(screen.queryByDisplayValue('Ana,Bruno')).toBeNull();
  });

  it('drops blank entries coming from the stored value', async () => {
    await renderField({ value: 'Ana\n\n   \nBruno', disabled: true });

    const rows = screen.root!.queryAll(
      (n) => typeof n.type === 'string' && n.type === 'Text'
    );
    const texts = rows
      .map((n) => (typeof n.props.children === 'string' ? n.props.children : ''))
      .filter(Boolean);
    expect(texts).toEqual(['Ana', 'Bruno']);
  });
});
