/**
 * Behavioral test for the Ward Business Templates settings wrapper (specs/v2-designations-templates.md).
 * The screen is a thin config over the shared TemplateEditorScreen, which is mocked here to capture
 * the props it receives. Asserts the tab config (per-type value/default/localized tokens), saveMode,
 * and that onSave routes to the update mutation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import TestRenderer from 'react-test-renderer';
import DesignationTemplatesScreen from '../app/(tabs)/settings/designations';
import type { TemplateTab } from '../components/TemplateEditorScreen';

const { act } = TestRenderer;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const state = vi.hoisted(() => ({
  templates: {} as Record<string, string | null>,
  mutate: vi.fn(),
  props: null as null | {
    title: string;
    tabs: TemplateTab[];
    saveMode?: string;
    onSave: (key: string, value: string | null) => void;
  },
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('../i18n', () => ({ getCurrentLanguage: () => 'pt-BR' }));
vi.mock('../hooks/useWard', () => ({
  useWardDesignationTemplates: () => ({ templates: state.templates, isLoaded: true }),
  useUpdateWardDesignationTemplate: () => ({ mutate: state.mutate }),
}));
vi.mock('../components/TemplateEditorScreen', () => ({
  TemplateEditorScreen: (props: Record<string, unknown>) => {
    state.props = props as unknown as typeof state.props;
    return null;
  },
}));

function render() {
  act(() => {
    TestRenderer.create(React.createElement(DesignationTemplatesScreen));
  });
}
function tab(key: string): TemplateTab {
  return state.props!.tabs.find((t) => t.key === key)!;
}

beforeEach(() => {
  state.templates = {};
  state.mutate = vi.fn();
  state.props = null;
});

describe('Ward Business Templates wrapper', () => {
  it('builds a tab per type in order with collapse save mode', () => {
    render();
    expect(state.props!.saveMode).toBe('collapse');
    expect(state.props!.title).toBe('settings.designationsTemplate');
    expect(state.props!.tabs.map((t) => t.key)).toEqual(['sustain', 'release', 'priesthood', 'new_member']);
  });

  it('a tab value is the ward override (else null), default is the localized readText', () => {
    state.templates = { sustain: 'MY CUSTOM' };
    render();
    expect(tab('sustain').value).toBe('MY CUSTOM');
    expect(tab('release').value).toBeNull();
    expect(tab('sustain').defaultText).toBe('agenda.designations.readText.sustain');
  });

  it('exposes the localized placeholder tokens per type (pt)', () => {
    render();
    expect(tab('sustain').placeholders.map((p) => p.token)).toEqual(['{nome}', '{chamado}']);
    expect(tab('priesthood').placeholders.map((p) => p.token)).toEqual(['{nome}', '{oficio}']);
    expect(tab('new_member').placeholders.map((p) => p.token)).toEqual(['{nome}', '{ala}']);
  });

  it('onSave routes to the update mutation with { type, value }', () => {
    render();
    act(() => state.props!.onSave('priesthood', 'text'));
    expect(state.mutate).toHaveBeenCalledWith({ type: 'priesthood', value: 'text' });
    act(() => state.props!.onSave('sustain', null));
    expect(state.mutate).toHaveBeenCalledWith({ type: 'sustain', value: null });
  });
});
