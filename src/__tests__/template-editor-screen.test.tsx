/**
 * Behavioral test for the shared TemplateEditorScreen (WhatsApp + Ward Business templates render
 * through it). `react-native` is aliased to a stub; theme/i18n/router/safe-area are mocked.
 * Covers: tabs, non-edited fields reflecting props, chip insertion, blur-save (raw vs collapse),
 * restore-default, and the live preview.
 */
import React from 'react';
import TestRenderer from 'react-test-renderer';
import { TemplateEditorScreen, type TemplateTab } from '../components/TemplateEditorScreen';

const { act } = TestRenderer;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => require('react').createElement('SafeAreaView', {}, children),
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: { background: '#000', text: '#fff', textSecondary: '#aaa', primary: '#07f', card: '#111', surfaceVariant: '#222', divider: '#333' },
  }),
}));

function makeTabs(over: Partial<TemplateTab>[] = []): TemplateTab[] {
  const base: TemplateTab[] = [
    {
      key: 'a',
      label: 'Tab A',
      value: 'OVERRIDE A',
      defaultText: 'DEFAULT A',
      placeholders: [{ token: '{name}', label: 'Name', sample: 'Maria' }],
    },
    {
      key: 'b',
      label: 'Tab B',
      value: null,
      defaultText: 'DEFAULT B {name}',
      placeholders: [{ token: '{name}', label: 'Name', sample: 'Maria' }],
    },
  ];
  return base.map((t, i) => ({ ...t, ...(over[i] ?? {}) }));
}

function render(props: Partial<React.ComponentProps<typeof TemplateEditorScreen>> = {}) {
  const onSave = jest.fn();
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      React.createElement(TemplateEditorScreen, { title: 'Templates', tabs: makeTabs(), onSave, ...props })
    );
  });
  return { r, onSave };
}
function node(r: TestRenderer.ReactTestRenderer, testID: string) {
  return r.root.findAll((n) => typeof n.type === 'string' && n.props.testID === testID)[0];
}
function press(r: TestRenderer.ReactTestRenderer, testID: string) {
  act(() => (node(r, testID).props.onPress as () => void)());
}
function editorValue(r: TestRenderer.ReactTestRenderer) {
  return node(r, 'template-editor').props.value as string;
}

beforeEach(() => jest.clearAllMocks());

describe('TemplateEditorScreen', () => {
  it('shows the first tab; a non-edited field reflects its override, else the default', () => {
    const { r } = render();
    expect(editorValue(r)).toBe('OVERRIDE A'); // tab a has an override
    press(r, 'template-tab-b');
    expect(editorValue(r)).toBe('DEFAULT B {name}'); // tab b has no override => default
  });

  it('inserts a placeholder token into the editor at the cursor', () => {
    const { r } = render();
    press(r, 'template-tab-b'); // start from the default
    act(() => (node(r, 'template-chip-{name}').props.onPress as () => void)());
    expect(editorValue(r)).toContain('{name}');
  });

  it('raw mode: editing + blur saves the text as typed', () => {
    const { r, onSave } = render({ saveMode: 'raw' });
    act(() => (node(r, 'template-editor').props.onChangeText as (t: string) => void)('hello raw'));
    act(() => (node(r, 'template-editor').props.onBlur as () => void)());
    expect(onSave).toHaveBeenCalledWith('a', 'hello raw');
  });

  it('collapse mode: typing exactly the default saves null', () => {
    const { r, onSave } = render({ saveMode: 'collapse' });
    press(r, 'template-tab-b');
    act(() => (node(r, 'template-editor').props.onChangeText as (t: string) => void)('DEFAULT B {name}'));
    act(() => (node(r, 'template-editor').props.onBlur as () => void)());
    expect(onSave).toHaveBeenCalledWith('b', null);
  });

  it('collapse mode: a real custom value is saved as text', () => {
    const { r, onSave } = render({ saveMode: 'collapse' });
    act(() => (node(r, 'template-editor').props.onChangeText as (t: string) => void)('custom text'));
    act(() => (node(r, 'template-editor').props.onBlur as () => void)());
    expect(onSave).toHaveBeenCalledWith('a', 'custom text');
  });

  it('restore default clears the override (null) and shows the default', () => {
    const { r, onSave } = render();
    expect(editorValue(r)).toBe('OVERRIDE A');
    press(r, 'template-restore');
    expect(onSave).toHaveBeenCalledWith('a', null);
    expect(editorValue(r)).toBe('DEFAULT A');
  });

  it('raw mode: restore then switch tab does NOT re-save the default text (only null)', () => {
    const { r, onSave } = render({ saveMode: 'raw' });
    press(r, 'template-restore'); // tab a
    press(r, 'template-tab-b'); // flush on switch must not re-persist the default
    const aCalls = onSave.mock.calls.filter((c) => c[0] === 'a');
    expect(aCalls).toEqual([['a', null]]); // exactly one call, with null
  });

  it('raw mode: after restore, typing new text saves that text (restored flag cleared)', () => {
    const { r, onSave } = render({ saveMode: 'raw' });
    press(r, 'template-restore');
    act(() => (node(r, 'template-editor').props.onChangeText as (t: string) => void)('typed again'));
    act(() => (node(r, 'template-editor').props.onBlur as () => void)());
    expect(onSave.mock.calls.filter((c) => c[0] === 'a')).toEqual([['a', null], ['a', 'typed again']]);
  });

  it('renders a live preview with sample data substituted', () => {
    const { r } = render();
    press(r, 'template-tab-b'); // "DEFAULT B {name}" -> "DEFAULT B Maria"
    const previewTexts = node(r, 'template-preview').findAll((n) => n.type === 'Text');
    const text = previewTexts.map((n) => String(n.props.children)).join('');
    expect(text).toContain('DEFAULT B Maria');
  });
});
