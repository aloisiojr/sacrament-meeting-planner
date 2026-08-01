/**
 * Behavioral test for the Ward Business Templates settings wrapper (specs/v2-designations-templates.md).
 * The screen is a thin config over the shared TemplateEditorScreen, which is mocked here to capture
 * the props it receives. Asserts the tab config (per-type value/default/localized tokens), saveMode,
 * and that onSave routes to the update mutation.
 */
import React from 'react';
import TestRenderer from 'react-test-renderer';
import DesignationTemplatesScreen from '../app/(tabs)/settings/designations';
import type { TemplateTab } from '../components/TemplateEditorScreen';

const { act } = TestRenderer;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockState = {
  templates: {} as Record<string, string | null>,
  mutate: jest.fn(),
  props: null as null | {
    title: string;
    tabs: TemplateTab[];
    saveMode?: string;
    onSave: (key: string, value: string | null) => void;
  },
};

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
jest.mock('../i18n', () => ({ getCurrentLanguage: () => 'pt-BR' }));
jest.mock('../hooks/useWard', () => ({
  useWardDesignationTemplates: () => ({ templates: mockState.templates, isLoaded: true }),
  useUpdateWardDesignationTemplate: () => ({ mutate: mockState.mutate }),
}));
jest.mock('../components/TemplateEditorScreen', () => ({
  TemplateEditorScreen: (props: Record<string, unknown>) => {
    mockState.props = props as unknown as typeof mockState.props;
    return null;
  },
}));

function render() {
  act(() => {
    TestRenderer.create(React.createElement(DesignationTemplatesScreen));
  });
}
function tab(key: string): TemplateTab {
  return mockState.props!.tabs.find((t) => t.key === key)!;
}

beforeEach(() => {
  mockState.templates = {};
  mockState.mutate = jest.fn();
  mockState.props = null;
});

describe('Ward Business Templates wrapper', () => {
  it('builds a tab per type in order with collapse save mode', () => {
    render();
    expect(mockState.props!.saveMode).toBe('collapse');
    expect(mockState.props!.title).toBe('settings.designationsTemplate');
    expect(mockState.props!.tabs.map((t) => t.key)).toEqual(['sustain', 'release', 'priesthood', 'new_member']);
  });

  it('a tab value is the ward override (else null), default is the localized readText', () => {
    mockState.templates = { sustain: 'MY CUSTOM' };
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
    act(() => mockState.props!.onSave('priesthood', 'text'));
    expect(mockState.mutate).toHaveBeenCalledWith({ type: 'priesthood', value: 'text' });
    act(() => mockState.props!.onSave('sustain', null));
    expect(mockState.mutate).toHaveBeenCalledWith({ type: 'sustain', value: null });
  });
});
