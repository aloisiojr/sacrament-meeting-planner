/**
 * Zebra striping of bullet lists in presentation mode (F070).
 *
 * Replaces the source-text block in f067-announcements-list, which grepped presentation.tsx for
 * the literal `idx % 2 === 0 ? colors.text : colors.textZebraFaded` and then, for the "idx 1" case,
 * asserted `expect(1 % 2 === 0).toBe(false)` — arithmetic, not the app.
 *
 * This matters visually rather than functionally: the presentation screen is projected in a chapel
 * and a long list of names is unreadable without the alternation.
 */
import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react-native';
import { lightColors, darkColors } from '../lib/theme';

const DATE = '2026-08-02';
const TEXT = '#ffffff';
const ZEBRA = '#888888';

const mockAgenda: { value: Record<string, unknown> } = { value: {} };

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, f?: string) => f ?? k }),
}));
jest.mock('expo-blur', () => ({
  BlurView: (p: Record<string, unknown> & { children?: React.ReactNode }) =>
    require('react').createElement('BlurView', p, p.children),
}));
jest.mock('../hooks/useWard', () => ({
  useWardName: () => 'Jardim',
  useWardDesignationTemplates: () => ({ templates: {}, isLoaded: true }),
}));
jest.mock('../components/icons', () => new Proxy({}, {
  get: (_t, name: string) => (p: Record<string, unknown>) =>
    require('react').createElement(String(name), p),
}));
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#000', card: '#111', border: '#333', text: '#ffffff',
      textSecondary: '#aaa', textTertiary: '#777', primary: '#07f', onPrimary: '#fff',
      surfaceVariant: '#222', divider: '#333', textZebraFaded: '#888888', warning: '#fb0',
    },
  }),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: (p: { children?: React.ReactNode }) =>
    require('react').createElement('SafeAreaView', {}, p.children),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ date: DATE }),
}));
jest.mock('../i18n', () => ({ getCurrentLanguage: () => 'en-US' }));
jest.mock('../hooks/usePresentationMode', () => {
  const actual = jest.requireActual('../hooks/usePresentationMode') as Record<string, unknown>;
  return {
    ...actual,
    usePresentationData: () => ({
      agenda: {
        sacrament_hymn_id: null,
        has_second_speech: true,
        designations: [],
        ...mockAgenda.value,
      },
      speeches: [],
      exception: null,
      isSpecial: false,
      isLoading: false,
      hymnLookup: () => 'Hymn 100',
      members: [],
      sundayDate: DATE,
    }),
  };
});

import PresentationScreen from '../app/presentation';

/** Colours of the rendered bullet rows, in order. */
function bulletColours(): string[] {
  const texts = screen.root!.queryAll(
    (n) => typeof n.type === 'string' && n.type === 'Text'
  );
  const flatten = (c: unknown): string =>
    Array.isArray(c) ? c.map(flatten).join('') : typeof c === 'string' ? c : '';
  return texts
    .filter((n) => flatten(n.props.children).startsWith('• '))
    .map((n) => {
      const style = Array.isArray(n.props.style) ? Object.assign({}, ...n.props.style.filter(Boolean)) : n.props.style;
      return style?.color as string;
    });
}

async function renderWith(recognized: string | null) {
  mockAgenda.value = { recognized_names: recognized };
  await rtlRender(<PresentationScreen />);
}

describe('the zebra token exists in both palettes', () => {
  it.each([
    ['light', lightColors],
    ['dark', darkColors],
  ])('%s theme defines textZebraFaded', (_name, palette) => {
    expect(typeof palette.textZebraFaded).toBe('string');
    expect(palette.textZebraFaded).toMatch(/^#|^rgb/);
  });

  it.each([
    ['light', lightColors],
    ['dark', darkColors],
  ])('%s theme makes it distinguishable from the primary text colour', (_name, palette) => {
    // A token equal to `text` would silently disable the striping.
    expect(palette.textZebraFaded).not.toBe(palette.text);
  });
});

describe('bullet lists alternate colour', () => {
  it('starts at the primary text colour', async () => {
    await renderWith('Ana');
    expect(bulletColours()).toEqual([TEXT]);
  });

  it('alternates on the second row', async () => {
    await renderWith('Ana\nBruno');
    expect(bulletColours()).toEqual([TEXT, ZEBRA]);
  });

  it('keeps alternating over a long list', async () => {
    // The case the feature exists for: a projected list of names.
    await renderWith('Ana\nBruno\nCarla\nDaniel\nElena');
    expect(bulletColours()).toEqual([TEXT, ZEBRA, TEXT, ZEBRA, TEXT]);
  });

  it('ignores blank lines when alternating, so the stripes do not desync', async () => {
    // A blank line that consumed an index would flip every colour after it.
    await renderWith('Ana\n\nBruno\n   \nCarla');
    expect(bulletColours()).toEqual([TEXT, ZEBRA, TEXT]);
  });

  it('renders no bullets at all for an empty list', async () => {
    await renderWith(null);
    expect(bulletColours()).toEqual([]);
  });
});
