/**
 * Behavioral test for DesignationReadModal (specs/v2-designations-play.md, step 2). `react-native`
 * is aliased to a stub; expo-blur/icons/theme/i18n are mocked. Asserts: one read-text block per
 * designation (in order), close via X and backdrop, and nothing rendered when not visible.
 */
import React from 'react';
import TestRenderer from 'react-test-renderer';
import { DesignationReadModal } from '../components/DesignationReadModal';
import type { Designation } from '../types/database';

const { act } = TestRenderer;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const MAP: Record<string, string> = {
  'agenda.designations.readTitle': 'Texto para leitura',
  'common.close': 'Fechar',
  'agenda.designations.type.sustain': 'Apoio',
  'agenda.designations.type.release': 'Desobrigação',
  'agenda.designations.type.new_member': 'Novo Membro',
  'agenda.designations.readText.sustain': 'APOIO {name} como {calling}.',
  'agenda.designations.readText.release': 'DESOBRIGA {name} de {calling}.',
  'agenda.designations.readText.new_member': 'NOVO {name} da Ala {ward}.',
};
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => MAP[k] ?? k }) }));
jest.mock('expo-blur', () => ({
  BlurView: (p: Record<string, unknown> & { children?: React.ReactNode }) =>
    require('react').createElement('BlurView', p, p.children),
}));
jest.mock('../components/icons', () => ({ XIcon: () => null }));
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: { card: '#111', border: '#333', divider: '#333', text: '#fff', textSecondary: '#aaa', surfaceVariant: '#222' },
  }),
}));

// Deliberately NOT in meeting order — the modal must reorder to release → sustain → new_member.
const items: Designation[] = [
  { type: 'new_member', person_name: 'Maria Souza', member_id: 'm2', calling: null, office: null },
  { type: 'sustain', person_name: 'João Silva', member_id: 'm1', calling: 'Presidente EQ', office: null },
  { type: 'release', person_name: 'Ana Lima', member_id: 'm3', calling: 'Secretária', office: null },
];

function render(props: Partial<React.ComponentProps<typeof DesignationReadModal>> = {}) {
  const onClose = jest.fn();
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      React.createElement(DesignationReadModal, {
        visible: true,
        onClose,
        designations: items,
        wardName: 'Jardim',
        ...props,
      })
    );
  });
  return { renderer, onClose };
}

function nodes(renderer: TestRenderer.ReactTestRenderer, testID: string) {
  return renderer.root.findAll((n) => typeof n.type === 'string' && n.props.testID === testID);
}
function allText(renderer: TestRenderer.ReactTestRenderer): string[] {
  return renderer.root
    .findAll((n) => n.type === 'Text')
    .map((n) => (Array.isArray(n.props.children) ? n.props.children.join('') : String(n.props.children)));
}

beforeEach(() => jest.clearAllMocks());

describe('DesignationReadModal (step 2)', () => {
  it('renders one read-text block per designation', () => {
    const { renderer } = render();
    expect(nodes(renderer, 'designation-read-item-0').length).toBe(1);
    expect(nodes(renderer, 'designation-read-item-1').length).toBe(1);
    expect(nodes(renderer, 'designation-read-item-2').length).toBe(1);
    expect(nodes(renderer, 'designation-read-item-3').length).toBe(0);
  });

  it('substitutes tokens in each item (name/calling/ward)', () => {
    const { renderer } = render();
    const texts = allText(renderer);
    expect(texts).toContain('APOIO João Silva como Presidente EQ.');
    expect(texts).toContain('NOVO Maria Souza da Ala Jardim.');
    expect(texts).toContain('DESOBRIGA Ana Lima de Secretária.');
  });

  it('orders items release → sustain → new_member regardless of input order (AC3)', () => {
    const { renderer } = render();
    const texts = allText(renderer);
    const iRelease = texts.findIndex((s) => s.startsWith('DESOBRIGA'));
    const iSustain = texts.findIndex((s) => s.startsWith('APOIO'));
    const iNew = texts.findIndex((s) => s.startsWith('NOVO'));
    expect(iRelease).toBeGreaterThanOrEqual(0);
    expect(iRelease).toBeLessThan(iSustain);
    expect(iSustain).toBeLessThan(iNew);
  });

  it('uses a non-blank ward override template instead of the default', () => {
    const { renderer } = render({ templates: { sustain: 'OVERRIDE {name} / {calling}' } });
    const texts = allText(renderer);
    expect(texts).toContain('OVERRIDE João Silva / Presidente EQ');
    expect(texts.some((s) => s.startsWith('APOIO'))).toBe(false);
  });

  it('falls back to the default when the override is blank', () => {
    const { renderer } = render({ templates: { sustain: '   ' } });
    const texts = allText(renderer);
    expect(texts).toContain('APOIO João Silva como Presidente EQ.');
  });

  it('closes via the X button', () => {
    const { renderer, onClose } = render();
    act(() => (nodes(renderer, 'designation-read-close-button')[0].props.onPress as () => void)());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes via the backdrop', () => {
    const { renderer, onClose } = render();
    act(() => (nodes(renderer, 'designation-read-backdrop')[0].props.onPress as () => void)());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when not visible', () => {
    const { renderer } = render({ visible: false });
    expect(nodes(renderer, 'designation-read-panel').length).toBe(0);
  });
});
