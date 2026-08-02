/**
 * Behavioral test for DesignationListField (specs/v2-supports-releases.md, step 3): the
 * read-only multi-row display used inside the expanded agenda card. `react-native` is aliased
 * to a stub; theme + i18n are mocked. Asserts row rendering (2 lines), the add affordance, and
 * that tap/remove/add invoke their callbacks — and that disabled mode drops all affordances.
 */
import React from 'react';
import { render as rtlRender, screen, fireEvent } from '@testing-library/react-native';
import { DesignationListField } from '../components/DesignationListField';
import type { Designation } from '../types/database';


const LABELS: Record<string, string> = {
  'agenda.designations.type.sustain': 'Apoio',
  'agenda.designations.type.release': 'Desobrigação',
  'agenda.designations.type.priesthood': 'Avanço',
  'agenda.designations.type.new_member': 'Novo Membro',
  'agenda.designations.office.deacon': 'Diácono',
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => LABELS[k] ?? k }),
}));
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: { text: '#fff', textSecondary: '#aaa', textTertiary: '#888', border: '#444' },
  }),
}));
jest.mock('../components/icons', () => ({ XIcon: () => null }));

const items: Designation[] = [
  { type: 'sustain', person_name: 'João Silva', member_id: 'm1', calling: 'Presidente EQ', office: null },
  { type: 'new_member', person_name: 'Maria Souza', member_id: 'm2', calling: null, office: null },
];

async function render(props: Partial<React.ComponentProps<typeof DesignationListField>> = {}) {
  const onItemPress = jest.fn();
  const onAddPress = jest.fn();
  const onRemove = jest.fn();
  await rtlRender(React.createElement(DesignationListField, {
        value: items,
        placeholder: 'Adicionar',
        onItemPress,
        onAddPress,
        onRemove,
        ...props,
      }));
  return { renderer: null, onItemPress, onAddPress, onRemove };
}

function nodes(_renderer: unknown, testID: string) {
  return screen.queryAllByTestId(testID);
}

function allText(_renderer?: unknown): string[] {
  return screen.queryAllByText(/.*/).map((n) => {
    const c = n.props.children;
    return Array.isArray(c) ? c.join('') : String(c);
  });
}

beforeEach(() => jest.clearAllMocks());

describe('DesignationListField (step 3)', () => {
  it('renders one row per item plus the add affordance', async () => {
    const { renderer } = await render();
    expect(nodes(renderer, 'designation-row-0').length).toBe(1);
    expect(nodes(renderer, 'designation-row-1').length).toBe(1);
    expect(nodes(renderer, 'designation-add').length).toBe(1);
  });

  it('renders a designation on two lines (name — type / detail)', async () => {
    const { renderer } = await render();
    const texts = allText(renderer);
    expect(texts).toContain('João Silva — Apoio');
    expect(texts).toContain('Presidente EQ');
  });

  it('renders new_member on a single line (no second segment)', async () => {
    const { renderer } = await render();
    const texts = allText(renderer);
    expect(texts).toContain('Maria Souza — Novo Membro');
  });

  it('tapping a row calls onItemPress with its index', async () => {
    const { onItemPress } = await render();
    await fireEvent.press(screen.getByTestId('designation-row-1'));
    expect(onItemPress).toHaveBeenCalledWith(1);
  });

  it('tapping remove calls onRemove with its index', async () => {
    const { onRemove } = await render();
    await fireEvent.press(screen.getByTestId('designation-remove-0'));
    expect(onRemove).toHaveBeenCalledWith(0);
  });

  it('tapping the add affordance calls onAddPress', async () => {
    const { onAddPress } = await render();
    await fireEvent.press(screen.getByTestId('designation-add'));
    expect(onAddPress).toHaveBeenCalledTimes(1);
  });

  it('disabled: no add affordance and no remove controls', async () => {
    const { renderer } = await render({ disabled: true });
    expect(nodes(renderer, 'designation-add').length).toBe(0);
    expect(nodes(renderer, 'designation-remove-0').length).toBe(0);
    // still shows the items read-only
    expect(allText(renderer)).toContain('João Silva — Apoio');
  });

  it('disabled + empty: shows the placeholder', async () => {
    const { renderer } = await render({ disabled: true, value: [] });
    expect(allText(renderer)).toContain('Adicionar');
  });
});
