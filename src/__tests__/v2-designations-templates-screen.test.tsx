/**
 * Behavioral test for the Ward Business Templates settings screen (specs/v2-designations-templates.md,
 * step 3). `react-native` is aliased to a stub; theme/i18n/router/safe-area and the ward hooks are
 * mocked. Asserts: fields pre-fill with override-or-default; editing auto-saves; restore clears (NULL).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import TestRenderer from 'react-test-renderer';
import DesignationTemplatesScreen from '../app/(tabs)/settings/designations';

const { act } = TestRenderer;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const state = vi.hoisted(() => ({
  overrides: {} as Record<string, string | null>,
  isLoaded: true,
  mutate: vi.fn(),
}));

const MAP: Record<string, string> = {
  'common.back': 'Voltar',
  'settings.designationsTemplate': 'Modelos',
  'agenda.designations.templateHint': 'Marcadores: {name}',
  'agenda.designations.restoreDefault': 'Restaurar padrão',
  'agenda.designations.type.release': 'Desobrigação',
  'agenda.designations.type.sustain': 'Apoio',
  'agenda.designations.type.priesthood': 'Avanço',
  'agenda.designations.type.new_member': 'Novo Membro',
  'agenda.designations.readText.release': 'DEFAULT release {name}',
  'agenda.designations.readText.sustain': 'DEFAULT sustain {name}',
  'agenda.designations.readText.priesthood': 'DEFAULT priesthood {name}',
  'agenda.designations.readText.new_member': 'DEFAULT new_member {name}',
};

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => MAP[k] ?? k }) }));
vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => React.createElement('SafeAreaView', {}, children),
}));
vi.mock('expo-router', () => ({ useRouter: () => ({ back: vi.fn() }) }));
vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: { background: '#000', text: '#fff', textSecondary: '#aaa', primary: '#07f', border: '#333' } }),
}));
vi.mock('../hooks/useWard', () => ({
  useWardDesignationTemplates: () => ({ templates: state.overrides, isLoaded: state.isLoaded }),
  useUpdateWardDesignationTemplate: () => ({ mutate: state.mutate }),
}));

function render() {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(DesignationTemplatesScreen));
  });
  return renderer;
}
function node(renderer: TestRenderer.ReactTestRenderer, testID: string) {
  return renderer.root.findAll((n) => typeof n.type === 'string' && n.props.testID === testID)[0];
}

beforeEach(() => {
  state.overrides = {};
  state.isLoaded = true;
  state.mutate = vi.fn();
});

describe('Ward Business Templates screen (step 3)', () => {
  it('pre-fills a field with the ward override when set, else the localized default (AC4)', () => {
    state.overrides = { sustain: 'MY CUSTOM sustain', release: null };
    const r = render();
    expect(node(r, 'designation-template-input-sustain').props.value).toBe('MY CUSTOM sustain');
    expect(node(r, 'designation-template-input-release').props.value).toBe('DEFAULT release {name}');
  });

  it('does NOT prefill (stays empty) until the query has resolved — no default overwrite (P1)', () => {
    state.isLoaded = false;
    state.overrides = { sustain: 'MY CUSTOM sustain' };
    const r = render();
    // Init is gated on isLoaded, so the field is not yet populated (and won't clobber the override).
    expect(node(r, 'designation-template-input-sustain').props.value).toBe('');
  });

  it('shows the placeholder-token hint (AC8)', () => {
    const r = render();
    const texts = r.root
      .findAll((n) => n.type === 'Text')
      .map((n) => (Array.isArray(n.props.children) ? n.props.children.join('') : String(n.props.children)));
    expect(texts).toContain('Marcadores: {name}');
  });

  it('editing a field and blurring saves the override (AC5)', () => {
    const r = render();
    act(() => (node(r, 'designation-template-input-priesthood').props.onChangeText as (t: string) => void)('New priesthood text'));
    act(() => (node(r, 'designation-template-input-priesthood').props.onBlur as () => void)());
    expect(state.mutate).toHaveBeenCalledWith({ type: 'priesthood', value: 'New priesthood text' });
  });

  it('blurring an emptied field clears the override (saves null)', () => {
    state.overrides = { sustain: 'something' };
    const r = render();
    act(() => (node(r, 'designation-template-input-sustain').props.onChangeText as (t: string) => void)('   '));
    act(() => (node(r, 'designation-template-input-sustain').props.onBlur as () => void)());
    expect(state.mutate).toHaveBeenCalledWith({ type: 'sustain', value: null });
  });

  it('restore default clears the override (null) and resets the field (AC6)', () => {
    state.overrides = { new_member: 'custom nm' };
    const r = render();
    expect(node(r, 'designation-template-input-new_member').props.value).toBe('custom nm');
    act(() => (node(r, 'designation-template-restore-new_member').props.onPress as () => void)());
    expect(state.mutate).toHaveBeenCalledWith({ type: 'new_member', value: null });
    expect(node(r, 'designation-template-input-new_member').props.value).toBe('DEFAULT new_member {name}');
  });
});
