/**
 * Behavioral tests for the Play/presentation sacrament-prayer interstitial (specs/v2-unified-cards.md
 * P2/P3). `react-native` is aliased to a test stub (vitest.config.ts); reanimated, icons, theme,
 * router and safe-area are mocked to lightweight seams. `react-i18next` is mocked with a real
 * dot-path lookup into the en-US locale JSON so we can assert the VERBATIM prayer strings.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import TestRenderer from 'react-test-renderer';
import enUS from '../i18n/locales/en-US.json';
import PresentationScreen from '../app/presentation';

const { act } = TestRenderer;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const DATE = '2026-08-02';

// dot-path lookup into the real locale JSON → exact translated strings.
function tLookup(key: string, fallback?: string): string {
  const parts = key.split('.');
  let cur: unknown = enUS;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return fallback ?? key;
    }
  }
  return typeof cur === 'string' ? cur : fallback ?? key;
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, f?: string) => tLookup(k, f) }),
}));

vi.mock('react-native-reanimated', () => ({
  default: {
    View: (p: Record<string, unknown> & { children?: React.ReactNode }) =>
      React.createElement('Animated.View', p, p.children),
  },
  SlideInDown: {},
  SlideOutUp: {},
  LinearTransition: { duration: () => ({}) },
}));

vi.mock('expo-blur', () => ({
  BlurView: (p: Record<string, unknown> & { children?: React.ReactNode }) =>
    React.createElement('BlurView', p, p.children),
}));

vi.mock('../hooks/useWard', () => ({
  useWardName: () => 'Test Ward',
  useWardDesignationTemplates: () => ({ templates: {}, isLoaded: true }),
}));

vi.mock('../components/icons', () => ({
  PencilIcon: (p: Record<string, unknown>) => React.createElement('PencilIcon', p),
  XIcon: (p: Record<string, unknown>) => React.createElement('XIcon', p),
  ScrollTextIcon: (p: Record<string, unknown>) => React.createElement('ScrollTextIcon', p),
  ChevronDownIcon: (p: Record<string, unknown>) => React.createElement('ChevronDownIcon', p),
  ChevronUpIcon: (p: Record<string, unknown>) => React.createElement('ChevronUpIcon', p),
}));

vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#000', card: '#111', border: '#333', text: '#fff',
      textSecondary: '#aaa', textTertiary: '#777', primary: '#07f', onPrimary: '#fff',
      surfaceVariant: '#222', divider: '#333', textZebraFaded: '#888', warning: '#fb0',
    },
  }),
}));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: (p: { children?: React.ReactNode }) =>
    React.createElement('SafeAreaView', {}, p.children),
}));

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useLocalSearchParams: () => ({ date: DATE }),
}));

vi.mock('../i18n', () => ({ getCurrentLanguage: () => 'en-US' }));

// Partial mock: keep buildPresentationCards / getTodaySundayDate real, stub the data hook.
vi.mock('../hooks/usePresentationMode', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    usePresentationData: () => ({
      agenda: { sacrament_hymn_id: null, has_second_speech: true },
      speeches: [],
      exception: null,
      isSpecial: false,
      isLoading: false,
      hymnLookup: (_id: string | null) => 'Hymn 100',
      members: [],
      sundayDate: DATE,
    }),
  };
});

function render() {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(PresentationScreen));
  });
  return renderer;
}

// Collect all string leaves in the rendered tree, concatenated per Text node.
function allText(renderer: TestRenderer.ReactTestRenderer): string {
  const out: string[] = [];
  const walk = (node: unknown): void => {
    if (typeof node === 'string') {
      out.push(node);
    } else if (Array.isArray(node)) {
      node.forEach(walk);
    } else if (node && typeof node === 'object' && 'children' in (node as Record<string, unknown>)) {
      walk((node as { children: unknown }).children);
    }
  };
  walk(renderer.toJSON() as unknown);
  return out.join('|');
}

function findByTestID(renderer: TestRenderer.ReactTestRenderer, testID: string) {
  return renderer.root.findAll((n) => n.props?.testID === testID);
}

function press(renderer: TestRenderer.ReactTestRenderer, testID: string): void {
  const target = findByTestID(renderer, testID)[0];
  (target.props.onPress as () => void)();
}

// AccordionCard renders only the expanded card's body. The Sacrament Hymn field lives in the
// second card (Designations & Sacrament), so expand it before asserting on its content.
function expandCard(renderer: TestRenderer.ReactTestRenderer, index: number): void {
  // The RN stub renders each primitive as a function component wrapping a same-named host element,
  // so every header appears twice; keep only the component instances (non-string type) to index.
  const headers = renderer.root.findAll(
    (n) =>
      typeof n.type !== 'string' &&
      typeof (n.props?.accessibilityState as { expanded?: boolean } | undefined)?.expanded ===
        'boolean'
  );
  (headers[index].props.onPress as () => void)();
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Sacrament-prayer interstitial (P2/P3)', () => {
  it('renders the "text to read" icon on the Sacrament Hymn row', () => {
    const r = render();
    act(() => { expandCard(r, 1); });
    const buttons = findByTestID(r, 'sacrament-prayer-icon-button');
    // Doubled by the RN stub (component + host); at least one is present.
    expect(buttons.length).toBeGreaterThan(0);
    // The interstitial is not shown until the icon is tapped.
    expect(findByTestID(r, 'sacrament-prayer-panel').length).toBe(0);
  });

  it('tapping the icon shows the interstitial with the exact bread + water prayers', () => {
    const r = render();
    act(() => { expandCard(r, 1); });
    act(() => {
      press(r, 'sacrament-prayer-icon-button');
    });
    expect(findByTestID(r, 'sacrament-prayer-panel').length).toBeGreaterThan(0);

    const text = allText(r);
    expect(text).toContain(enUS.presentation.sacramentPrayerBread);
    expect(text).toContain(enUS.presentation.sacramentPrayerWater);
    expect(text).toContain(enUS.presentation.sacramentPrayerTitle);
    expect(text).toContain(enUS.presentation.sacramentPrayerBreadLabel);
    expect(text).toContain(enUS.presentation.sacramentPrayerWaterLabel);
  });

  it('closing via the X button hides the interstitial', () => {
    const r = render();
    act(() => { expandCard(r, 1); });
    act(() => {
      press(r, 'sacrament-prayer-icon-button');
    });
    expect(findByTestID(r, 'sacrament-prayer-panel').length).toBeGreaterThan(0);
    act(() => {
      press(r, 'sacrament-prayer-close-button');
    });
    expect(findByTestID(r, 'sacrament-prayer-panel').length).toBe(0);
  });

  it('tapping the backdrop (outside the panel) hides the interstitial', () => {
    const r = render();
    act(() => { expandCard(r, 1); });
    act(() => {
      press(r, 'sacrament-prayer-icon-button');
    });
    expect(findByTestID(r, 'sacrament-prayer-panel').length).toBeGreaterThan(0);
    act(() => {
      press(r, 'sacrament-prayer-backdrop');
    });
    expect(findByTestID(r, 'sacrament-prayer-panel').length).toBe(0);
  });
});
