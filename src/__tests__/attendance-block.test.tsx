/**
 * Behavioral tests for the AttendanceBlock component.
 *
 * `react-native` is aliased to a test stub (vitest.config.ts). Theme + i18n are mocked per-file so
 * we render in the node environment and assert on host-node props (rendered text, TextInput props,
 * and the onChange callback fired on blur/submit).
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import TestRenderer from 'react-test-renderer';
import { AttendanceBlock, type AttendanceBlockProps } from '../components/AttendanceBlock';

const { act } = TestRenderer;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => (k === 'agenda.attendanceLabel' ? 'Freq' : k) }),
}));

vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      border: '#333',
      textSecondary: '#aaa',
      textTertiary: '#888',
    },
  }),
}));

type Node = TestRenderer.TestInstance;

function render(props: AttendanceBlockProps) {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(AttendanceBlock, props));
  });
  return renderer;
}

function textOf(root: Node, testID: string): string {
  const node = root.findAll((n) => typeof n.type === 'string' && n.props.testID === testID)[0];
  const c = node.props.children;
  return Array.isArray(c) ? c.join('') : String(c);
}

function inputNode(root: Node): Node | undefined {
  return root.findAll((n) => n.type === 'TextInput')[0];
}

function press(root: Node, testID: string) {
  const node = root.findAll((n) => typeof n.type === 'string' && n.props.testID === testID)[0];
  act(() => {
    (node.props.onPress as (() => void) | undefined)?.();
  });
}

describe('AttendanceBlock — display', () => {
  it('renders "000" for null', () => {
    const { root } = render({ value: null, onChange: vi.fn(), testID: 'att' });
    expect(textOf(root, 'att-text')).toBe('000');
  });

  it('zero-pads to 3 digits: 85 → "085", 7 → "007"', () => {
    const a = render({ value: 85, onChange: vi.fn(), testID: 'att' });
    expect(textOf(a.root, 'att-text')).toBe('085');
    const b = render({ value: 7, onChange: vi.fn(), testID: 'att' });
    expect(textOf(b.root, 'att-text')).toBe('007');
  });

  it('renders the "Freq" label', () => {
    const { root } = render({ value: null, onChange: vi.fn(), testID: 'att' });
    const labels = root
      .findAll((n) => n.type === 'Text')
      .map((n) => (Array.isArray(n.props.children) ? n.props.children.join('') : String(n.props.children)));
    expect(labels).toContain('Freq');
  });
});

describe('AttendanceBlock — inline editing', () => {
  it('turns into a TextInput when tapped', () => {
    const { root } = render({ value: 85, onChange: vi.fn(), testID: 'att' });
    expect(inputNode(root)).toBeUndefined();
    press(root, 'att');
    expect(inputNode(root)).toBeDefined();
    expect(inputNode(root)!.props.value).toBe('85');
  });

  it('strips non-digits and caps at 3 digits while typing', () => {
    const { root } = render({ value: null, onChange: vi.fn(), testID: 'att' });
    press(root, 'att');
    act(() => {
      (inputNode(root)!.props.onChangeText as (t: string) => void)('1a2b3c4d5');
    });
    expect(inputNode(root)!.props.value).toBe('123');
    // number-pad keyboard + maxLength guard as a second line of defense.
    expect(inputNode(root)!.props.keyboardType).toBe('number-pad');
    expect(inputNode(root)!.props.maxLength).toBe(3);
  });

  it('fires onChange with the parsed int on blur', () => {
    const onChange = vi.fn();
    const { root } = render({ value: null, onChange, testID: 'att' });
    press(root, 'att');
    act(() => {
      (inputNode(root)!.props.onChangeText as (t: string) => void)('42');
    });
    act(() => {
      (inputNode(root)!.props.onBlur as () => void)();
    });
    expect(onChange).toHaveBeenCalledWith(42);
  });

  it('fires onChange with null when cleared', () => {
    const onChange = vi.fn();
    const { root } = render({ value: 85, onChange, testID: 'att' });
    press(root, 'att');
    act(() => {
      (inputNode(root)!.props.onChangeText as (t: string) => void)('');
    });
    act(() => {
      (inputNode(root)!.props.onSubmitEditing as () => void)();
    });
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('clamps values above 999 down to 999', () => {
    // maxLength/strip already cap at 3 digits, so the max reachable is 999 — assert it stays valid.
    const onChange = vi.fn();
    const { root } = render({ value: null, onChange, testID: 'att' });
    press(root, 'att');
    act(() => {
      (inputNode(root)!.props.onChangeText as (t: string) => void)('999');
    });
    act(() => {
      (inputNode(root)!.props.onBlur as () => void)();
    });
    expect(onChange).toHaveBeenCalledWith(999);
  });

  it('is not editable when disabled', () => {
    const onChange = vi.fn();
    const { root } = render({ value: 85, onChange, disabled: true, testID: 'att' });
    press(root, 'att');
    expect(inputNode(root)).toBeUndefined();
    expect(onChange).not.toHaveBeenCalled();
  });
});
