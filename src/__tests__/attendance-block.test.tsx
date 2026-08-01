/**
 * Behavioral tests for the AttendanceBlock component.
 *
 * Renders against real React Native via jest-expo. Theme + i18n are mocked per-file; presses and
 * text entry go through RNTL's fireEvent so the component's own handlers decide what happens.
 */
import React from 'react';
import { render as rtlRender, screen, fireEvent } from '@testing-library/react-native';
import { AttendanceBlock, type AttendanceBlockProps } from '../components/AttendanceBlock';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => (k === 'agenda.attendanceLabel' ? 'Freq' : k) }),
}));

jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      border: '#333',
      textSecondary: '#aaa',
      textTertiary: '#888',
    },
  }),
}));

async function render(props: AttendanceBlockProps) {
  await rtlRender(<AttendanceBlock {...props} />);
  // Returned for call-site compatibility; the helpers below query `screen`.
  return { root: null };
}

function textOf(_root: unknown, testID: string): string {
  const c = screen.getByTestId(testID).props.children;
  return Array.isArray(c) ? c.join('') : String(c);
}

/** The inline editor; absent until the block is tapped. */
function inputNode(_root?: unknown) {
  return screen.queryByTestId('att-input');
}

async function press(_root: unknown, testID: string) {
  await fireEvent.press(screen.getByTestId(testID));
}

describe('AttendanceBlock — display', () => {
  it('renders "000" for null', async () => {
    const { root } = await render({ value: null, onChange: jest.fn(), testID: 'att' });
    expect(textOf(root, 'att-text')).toBe('000');
  });

  it('zero-pads to 3 digits: 85 → "085", 7 → "007"', async () => {
    const a = await render({ value: 85, onChange: jest.fn(), testID: 'att' });
    expect(textOf(a.root, 'att-text')).toBe('085');
    const b = await render({ value: 7, onChange: jest.fn(), testID: 'att' });
    expect(textOf(b.root, 'att-text')).toBe('007');
  });

  it('renders the "Freq" label', async () => {
    await render({ value: null, onChange: jest.fn(), testID: 'att' });
    expect(screen.getByText('Freq')).toBeOnTheScreen();
  });
});

describe('AttendanceBlock — inline editing', () => {
  /** The inline editor, after tapping the block open. */
  const input = () => screen.getByTestId('att-input');

  it('turns into a TextInput when tapped', async () => {
    await render({ value: 85, onChange: jest.fn(), testID: 'att' });
    expect(inputNode()).toBeNull();
    await press(null, 'att');
    expect(inputNode()).not.toBeNull();
    expect(input().props.value).toBe('85');
  });

  it('strips non-digits and caps at 3 digits while typing', async () => {
    await render({ value: null, onChange: jest.fn(), testID: 'att' });
    await press(null, 'att');
    await fireEvent.changeText(input(), '1a2b3c4d5');
    expect(input().props.value).toBe('123');
    // number-pad keyboard + maxLength guard as a second line of defense.
    expect(input().props.keyboardType).toBe('number-pad');
    expect(input().props.maxLength).toBe(3);
  });

  it('fires onChange with the parsed int on blur', async () => {
    const onChange = jest.fn();
    await render({ value: null, onChange, testID: 'att' });
    await press(null, 'att');
    await fireEvent.changeText(input(), '42');
    fireEvent(input(), 'blur');
    expect(onChange).toHaveBeenCalledWith(42);
  });

  it('fires onChange with null when cleared', async () => {
    const onChange = jest.fn();
    await render({ value: 85, onChange, testID: 'att' });
    await press(null, 'att');
    await fireEvent.changeText(input(), '');
    fireEvent(input(), 'submitEditing');
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('clamps values above 999 down to 999', async () => {
    // maxLength/strip already cap at 3 digits, so the max reachable is 999 — assert it stays valid.
    const onChange = jest.fn();
    await render({ value: null, onChange, testID: 'att' });
    await press(null, 'att');
    await fireEvent.changeText(input(), '999');
    fireEvent(input(), 'blur');
    expect(onChange).toHaveBeenCalledWith(999);
  });

  it('is not editable when disabled', async () => {
    const onChange = jest.fn();
    await render({ value: 85, onChange, disabled: true, testID: 'att' });
    await press(null, 'att');
    expect(inputNode()).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });
});
