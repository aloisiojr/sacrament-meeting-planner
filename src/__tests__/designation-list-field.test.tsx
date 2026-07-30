/**
 * Behavioral test for DesignationListField (specs/v2-supports-releases.md, step 3): the
 * read-only multi-row display used inside the expanded agenda card. `react-native` is aliased
 * to a stub; theme + i18n are mocked. Asserts row rendering (2 lines), the add affordance, and
 * that tap/remove/add invoke their callbacks — and that disabled mode drops all affordances.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import TestRenderer from 'react-test-renderer';
import { DesignationListField } from '../components/DesignationListField';
import type { Designation } from '../types/database';

const { act } = TestRenderer;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const LABELS: Record<string, string> = {
  'agenda.designations.type.sustain': 'Apoio',
  'agenda.designations.type.release': 'Desobrigação',
  'agenda.designations.type.priesthood': 'Avanço',
  'agenda.designations.type.new_member': 'Novo Membro',
  'agenda.designations.office.deacon': 'Diácono',
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => LABELS[k] ?? k }),
}));
vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: { text: '#fff', textSecondary: '#aaa', textTertiary: '#888', border: '#444' },
  }),
}));
vi.mock('../components/icons', () => ({ XIcon: () => null }));

const items: Designation[] = [
  { type: 'sustain', person_name: 'João Silva', member_id: 'm1', calling: 'Presidente EQ', office: null },
  { type: 'new_member', person_name: 'Maria Souza', member_id: 'm2', calling: null, office: null },
];

function render(props: Partial<React.ComponentProps<typeof DesignationListField>> = {}) {
  const onItemPress = vi.fn();
  const onAddPress = vi.fn();
  const onRemove = vi.fn();
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      React.createElement(DesignationListField, {
        value: items,
        placeholder: 'Adicionar',
        onItemPress,
        onAddPress,
        onRemove,
        ...props,
      })
    );
  });
  return { renderer, onItemPress, onAddPress, onRemove };
}

function nodes(renderer: TestRenderer.ReactTestRenderer, testID: string) {
  return renderer.root.findAll((n) => typeof n.type === 'string' && n.props.testID === testID);
}

function allText(renderer: TestRenderer.ReactTestRenderer): string[] {
  return renderer.root
    .findAll((n) => n.type === 'Text')
    .map((n) => (Array.isArray(n.props.children) ? n.props.children.join('') : String(n.props.children)));
}

beforeEach(() => vi.clearAllMocks());

describe('DesignationListField (step 3)', () => {
  it('renders one row per item plus the add affordance', () => {
    const { renderer } = render();
    expect(nodes(renderer, 'designation-row-0').length).toBe(1);
    expect(nodes(renderer, 'designation-row-1').length).toBe(1);
    expect(nodes(renderer, 'designation-add').length).toBe(1);
  });

  it('renders a designation on two lines (name — type / detail)', () => {
    const { renderer } = render();
    const texts = allText(renderer);
    expect(texts).toContain('João Silva — Apoio');
    expect(texts).toContain('Presidente EQ');
  });

  it('renders new_member on a single line (no second segment)', () => {
    const { renderer } = render();
    const texts = allText(renderer);
    expect(texts).toContain('Maria Souza — Novo Membro');
  });

  it('tapping a row calls onItemPress with its index', () => {
    const { renderer, onItemPress } = render();
    act(() => (nodes(renderer, 'designation-row-1')[0].props.onPress as () => void)());
    expect(onItemPress).toHaveBeenCalledWith(1);
  });

  it('tapping remove calls onRemove with its index', () => {
    const { renderer, onRemove } = render();
    act(() => (nodes(renderer, 'designation-remove-0')[0].props.onPress as () => void)());
    expect(onRemove).toHaveBeenCalledWith(0);
  });

  it('tapping the add affordance calls onAddPress', () => {
    const { renderer, onAddPress } = render();
    act(() => (nodes(renderer, 'designation-add')[0].props.onPress as () => void)());
    expect(onAddPress).toHaveBeenCalledTimes(1);
  });

  it('disabled: no add affordance and no remove controls', () => {
    const { renderer } = render({ disabled: true });
    expect(nodes(renderer, 'designation-add').length).toBe(0);
    expect(nodes(renderer, 'designation-remove-0').length).toBe(0);
    // still shows the items read-only
    expect(allText(renderer)).toContain('João Silva — Apoio');
  });

  it('disabled + empty: shows the placeholder', () => {
    const { renderer } = render({ disabled: true, value: [] });
    expect(allText(renderer)).toContain('Adicionar');
  });
});
