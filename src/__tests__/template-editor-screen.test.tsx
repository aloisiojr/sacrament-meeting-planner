/**
 * Behavioral test for the shared TemplateEditorScreen (WhatsApp + Ward Business templates render
 * through it). `react-native` is aliased to a stub; theme/i18n/router/safe-area are mocked.
 * Covers: tabs, non-edited fields reflecting props, chip insertion, blur-save (raw vs collapse),
 * restore-default, and the live preview.
 */
import React from 'react';
import { render as rtlRender, screen, fireEvent } from '@testing-library/react-native';
import { TemplateEditorScreen, type TemplateTab } from '../components/TemplateEditorScreen';


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

async function render(props: Partial<React.ComponentProps<typeof TemplateEditorScreen>> = {}) {
  const onSave = jest.fn();
  await rtlRender(React.createElement(TemplateEditorScreen, { title: 'Templates', tabs: makeTabs(), onSave, ...props }));
  return { r: null, onSave };
}
function node(_r: unknown, testID: string) {
  return screen.getByTestId(testID);
}
async function press(_r: unknown, testID: string) {
  await fireEvent.press(screen.getByTestId(testID));
}
function editorValue(_r?: unknown) {
  return screen.getByTestId('template-editor').props.value as string;
}

beforeEach(() => jest.clearAllMocks());

describe('TemplateEditorScreen', () => {
  it('shows the first tab; a non-edited field reflects its override, else the default', async () => {
    const { r } = await render();
    expect(editorValue(r)).toBe('OVERRIDE A'); // tab a has an override
    await press(r, 'template-tab-b');
    expect(editorValue(r)).toBe('DEFAULT B {name}'); // tab b has no override => default
  });

  it('inserts a placeholder token into the editor at the cursor', async () => {
    const { r } = await render();
    await press(r, 'template-tab-b'); // start from the default
    await fireEvent.press(screen.getByTestId('template-chip-{name}'));
    expect(editorValue(r)).toContain('{name}');
  });

  it('raw mode: editing + blur saves the text as typed', async () => {
    const { r, onSave } = await render({ saveMode: 'raw' });
    await fireEvent.changeText(screen.getByTestId('template-editor'), 'hello raw');
    await fireEvent(screen.getByTestId('template-editor'), 'blur');
    expect(onSave).toHaveBeenCalledWith('a', 'hello raw');
  });

  it('collapse mode: typing exactly the default saves null', async () => {
    const { r, onSave } = await render({ saveMode: 'collapse' });
    await press(r, 'template-tab-b');
    await fireEvent.changeText(screen.getByTestId('template-editor'), 'DEFAULT B {name}');
    await fireEvent(screen.getByTestId('template-editor'), 'blur');
    expect(onSave).toHaveBeenCalledWith('b', null);
  });

  it('collapse mode: a real custom value is saved as text', async () => {
    const { r, onSave } = await render({ saveMode: 'collapse' });
    await fireEvent.changeText(screen.getByTestId('template-editor'), 'custom text');
    await fireEvent(screen.getByTestId('template-editor'), 'blur');
    expect(onSave).toHaveBeenCalledWith('a', 'custom text');
  });

  it('restore default clears the override (null) and shows the default', async () => {
    const { r, onSave } = await render();
    expect(editorValue(r)).toBe('OVERRIDE A');
    await press(r, 'template-restore');
    expect(onSave).toHaveBeenCalledWith('a', null);
    expect(editorValue(r)).toBe('DEFAULT A');
  });

  it('raw mode: restore then switch tab does NOT re-save the default text (only null)', async () => {
    const { r, onSave } = await render({ saveMode: 'raw' });
    await press(r, 'template-restore'); // tab a
    await press(r, 'template-tab-b'); // flush on switch must not re-persist the default
    const aCalls = onSave.mock.calls.filter((c) => c[0] === 'a');
    expect(aCalls).toEqual([['a', null]]); // exactly one call, with null
  });

  it('raw mode: after restore, typing new text saves that text (restored flag cleared)', async () => {
    const { r, onSave } = await render({ saveMode: 'raw' });
    await press(r, 'template-restore');
    await fireEvent.changeText(screen.getByTestId('template-editor'), 'typed again');
    await fireEvent(screen.getByTestId('template-editor'), 'blur');
    expect(onSave.mock.calls.filter((c) => c[0] === 'a')).toEqual([['a', null], ['a', 'typed again']]);
  });

  it('renders a live preview with sample data substituted', async () => {
    const { r } = await render();
    await press(r, 'template-tab-b'); // "DEFAULT B {name}" -> "DEFAULT B Maria"
    expect(screen.getByTestId('template-preview')).toHaveTextContent('DEFAULT B Maria');
  });
});
