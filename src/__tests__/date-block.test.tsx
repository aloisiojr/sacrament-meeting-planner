/**
 * Behavioral tests for the shared DateBlock component.
 *
 * `react-native` is aliased to a test stub (vitest.config.ts). Theme + current-language helpers are
 * mocked per-file; dateUtils stays real (pure) so we assert on the rendered day/month text.
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import TestRenderer from 'react-test-renderer';
import { DateBlock } from '../components/DateBlock';

const { act } = TestRenderer;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const SURFACE = '#222';
const PRIMARY = '#00f';

vi.mock('../i18n', () => ({ getCurrentLanguage: () => 'en-US' }));

vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      text: '#fff',
      textSecondary: '#aaa',
      onPrimary: '#fff',
      surfaceVariant: SURFACE,
      primary: PRIMARY,
    },
  }),
}));

type Node = TestRenderer.TestInstance;

function render(props: React.ComponentProps<typeof DateBlock>) {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(DateBlock, props));
  });
  return renderer;
}

function texts(root: Node): string[] {
  return root
    .findAll((n) => n.type === 'Text')
    .map((n) => {
      const c = n.props.children;
      return Array.isArray(c) ? c.join('') : String(c);
    });
}

function bgColor(root: Node): unknown {
  const view = root.findAll((n) => n.type === 'View')[0];
  const style = Array.isArray(view.props.style) ? view.props.style : [view.props.style];
  const flat: Record<string, unknown> = {};
  const walk = (s: unknown) => {
    if (!s) return;
    if (Array.isArray(s)) { s.forEach(walk); return; }
    if (typeof s === 'object') Object.assign(flat, s as Record<string, unknown>);
  };
  walk(style);
  return flat.backgroundColor;
}

describe('DateBlock', () => {
  it('renders the zero-padded day number and localized month abbreviation', () => {
    const { root } = render({ date: '2026-08-02' });
    const rendered = texts(root);
    expect(rendered).toContain('02');
    // en-US August abbreviation
    expect(rendered.some((t) => /aug/i.test(t))).toBe(true);
  });

  it('uses the surface background by default', () => {
    const { root } = render({ date: '2026-08-02' });
    expect(bgColor(root)).toBe(SURFACE);
  });

  it('uses the strong primary background when highlighted (for contrast on the primaryContainer card)', () => {
    const { root } = render({ date: '2026-08-02', highlighted: true });
    expect(bgColor(root)).toBe(PRIMARY);
  });
});
