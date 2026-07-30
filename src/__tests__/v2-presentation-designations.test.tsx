/**
 * Behavioral tests for the Play/presentation designations interstitial (specs/v2-designations-play.md).
 * `react-native` is aliased to a stub; reanimated, expo-blur, icons, theme, router, safe-area and the
 * ward-name hook are mocked. `react-i18next` uses a real dot-path lookup into en-US so the VERBATIM
 * read-text (with tokens substituted) can be asserted. The presentation data hook is stubbed so we
 * can drive the designations list.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import TestRenderer from 'react-test-renderer';
import enUS from '../i18n/locales/en-US.json';
import PresentationScreen from '../app/presentation';
import type { Designation } from '../types/database';

const { act } = TestRenderer;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const DATE = '2026-08-02';

const state = vi.hoisted(() => ({ designations: [] as Designation[] }));

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
vi.mock('../hooks/useWard', () => ({ useWardName: () => 'Jardim' }));
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
  SafeAreaView: (p: { children?: React.ReactNode }) => React.createElement('SafeAreaView', {}, p.children),
}));
vi.mock('expo-router', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useLocalSearchParams: () => ({ date: DATE }),
}));
vi.mock('../i18n', () => ({ getCurrentLanguage: () => 'en-US' }));
vi.mock('../hooks/usePresentationMode', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    usePresentationData: () => ({
      agenda: { sacrament_hymn_id: null, has_second_speech: true, designations: state.designations },
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
function allText(renderer: TestRenderer.ReactTestRenderer): string {
  const out: string[] = [];
  const walk = (node: unknown): void => {
    if (typeof node === 'string') out.push(node);
    else if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === 'object' && 'children' in (node as Record<string, unknown>))
      walk((node as { children: unknown }).children);
  };
  walk(renderer.toJSON() as unknown);
  return out.join('|');
}
function findByTestID(renderer: TestRenderer.ReactTestRenderer, testID: string) {
  return renderer.root.findAll((n) => n.props?.testID === testID);
}
function press(renderer: TestRenderer.ReactTestRenderer, testID: string): void {
  (findByTestID(renderer, testID)[0].props.onPress as () => void)();
}
function expandCard(renderer: TestRenderer.ReactTestRenderer, index: number): void {
  const headers = renderer.root.findAll(
    (n) =>
      typeof n.type !== 'string' &&
      typeof (n.props?.accessibilityState as { expanded?: boolean } | undefined)?.expanded === 'boolean'
  );
  (headers[index].props.onPress as () => void)();
}

beforeEach(() => {
  state.designations = [
    { type: 'sustain', person_name: 'John Doe', member_id: 'm1', calling: 'Elders Quorum President', office: null },
  ];
  vi.clearAllMocks();
});

describe('Designations interstitial (Play)', () => {
  it('renders the "text to read" icon when there are designations (AC1), hidden until tapped', () => {
    const r = render();
    act(() => { expandCard(r, 1); });
    expect(findByTestID(r, 'designations-read-icon-button').length).toBeGreaterThan(0);
    expect(findByTestID(r, 'designation-read-panel').length).toBe(0);
  });

  it('tapping the icon opens the interstitial with the substituted verbatim text (AC2/AC3)', () => {
    const r = render();
    act(() => { expandCard(r, 1); });
    act(() => { press(r, 'designations-read-icon-button'); });
    expect(findByTestID(r, 'designation-read-panel').length).toBeGreaterThan(0);
    expect(allText(r)).toContain('John Doe has been called as Elders Quorum President');
  });

  it('shows no icon when there are no designations (AC8)', () => {
    state.designations = [];
    const r = render();
    act(() => { expandCard(r, 1); });
    expect(findByTestID(r, 'designations-read-icon-button').length).toBe(0);
  });
});
