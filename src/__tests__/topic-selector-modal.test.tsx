/**
 * Behavioral test for the rewritten TopicSelectorModal (specs/v2-topics-overhaul.md). `react-native`
 * is aliased to a stub; theme/i18n/auth/icons/SearchInput and the topic hooks are mocked. Covers:
 * search (title + library), custom-first pencil, add, edit (title+link), clear+confirm delete dialog,
 * select returns the topic, and topic:write gating.
 */
import React from 'react';
import TestRenderer from 'react-test-renderer';
import { Alert } from 'react-native';
import { TopicSelectorModal } from '../components/TopicSelectorModal';
import type { TopicWithCollection } from '../types/database';

const { act } = TestRenderer;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockState = {
  topics: [] as TopicWithCollection[],
  canWrite: true,
  create: jest.fn(),
  update: jest.fn(),
  del: jest.fn(),
};


jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: { background: '#000', text: '#fff', textSecondary: '#aaa', textTertiary: '#888', primary: '#07f', border: '#444', divider: '#333', surfaceVariant: '#222' },
  }),
}));
jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ hasPermission: (p: string) => (p === 'topic:write' ? mockState.canWrite : true) }),
}));
jest.mock('../components/SearchInput', () => ({
  SearchInput: (p: Record<string, unknown>) => require('react').createElement('SearchInput', p),
}));
jest.mock('../components/icons', () => ({ PencilIcon: () => null, PlusIcon: () => null }));
jest.mock('../hooks/useTopics', () => ({
  useActiveTopics: () => ({ data: mockState.topics }),
  useCreateWardTopic: () => ({ mutate: mockState.create }),
  useUpdateWardTopic: () => ({ mutate: mockState.update }),
  useDeleteWardTopic: () => ({ mutate: mockState.del }),
}));

const WARD: TopicWithCollection = { id: 'w1', title: 'Fé', link: 'http://x', collection: 'topics.customTopics', type: 'ward' };
const GEN: TopicWithCollection = { id: 'g1', title: 'Repentance', link: null, collection: 'General Conference April 2024', type: 'general' };

function render() {
  const onSelect = jest.fn();
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(React.createElement(TopicSelectorModal, { visible: true, onSelect, onClose: jest.fn() }));
  });
  return { r, onSelect };
}
function nodes(r: TestRenderer.ReactTestRenderer, testID: string) {
  return r.root.findAll((n) => typeof n.type === 'string' && n.props.testID === testID);
}
function setText(r: TestRenderer.ReactTestRenderer, testID: string, text: string) {
  act(() => (nodes(r, testID)[0].props.onChangeText as (t: string) => void)(text));
}
function press(r: TestRenderer.ReactTestRenderer, testID: string) {
  act(() => (nodes(r, testID)[0].props.onPress as () => void)());
}

beforeEach(() => {
  mockState.topics = [WARD, GEN];
  mockState.canWrite = true;
  mockState.create = jest.fn();
  mockState.update = jest.fn();
  mockState.del = jest.fn();
  jest.restoreAllMocks();
});

describe('TopicSelectorModal (v2 overhaul)', () => {
  it('search matches both the title and the library name', () => {
    const { r } = render();
    setText(r, 'topic-selector-search-input', 'april'); // matches GEN's collection
    expect(nodes(r, 'topic-row-g1').length).toBe(1);
    expect(nodes(r, 'topic-row-w1').length).toBe(0);
  });

  it('only custom (ward) topics have a pencil edit affordance (AC6/AC11)', () => {
    const { r } = render();
    expect(nodes(r, 'topic-edit-w1').length).toBe(1);
    expect(nodes(r, 'topic-edit-g1').length).toBe(0);
  });

  it('add button creates a custom topic prefilled from search (AC7)', () => {
    const { r } = render();
    setText(r, 'topic-selector-search-input', 'Novo Tema');
    press(r, 'topic-add-button');
    expect(nodes(r, 'topic-editor').length).toBe(1);
    expect(nodes(r, 'topic-edit-title')[0].props.value).toBe('Novo Tema');
    press(r, 'topic-edit-confirm');
    expect(mockState.create).toHaveBeenCalledWith({ title: 'Novo Tema', link: null });
  });

  it('editing a custom topic updates title + link (AC8)', () => {
    const { r } = render();
    press(r, 'topic-edit-w1');
    expect(nodes(r, 'topic-edit-title')[0].props.value).toBe('Fé');
    setText(r, 'topic-edit-title', 'Fé em Cristo');
    setText(r, 'topic-edit-link', 'http://y');
    press(r, 'topic-edit-confirm');
    expect(mockState.update).toHaveBeenCalledWith({ id: 'w1', title: 'Fé em Cristo', link: 'http://y' });
  });

  it('clearing the title and confirming prompts to delete the shared topic (AC9)', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { r } = render();
    press(r, 'topic-edit-w1');
    setText(r, 'topic-edit-title', '  ');
    press(r, 'topic-edit-confirm');
    expect(alertSpy).toHaveBeenCalled();
    const buttons = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    act(() => buttons[1].onPress?.()); // confirm delete
    expect(mockState.del).toHaveBeenCalledWith({ topicId: 'w1', topicTitle: 'Fé' });
  });

  it('selecting a topic returns it via onSelect (AC10)', () => {
    const { r, onSelect } = render();
    press(r, 'topic-row-g1');
    expect(onSelect).toHaveBeenCalledWith(GEN);
  });

  it('without topic:write there is no add button and no pencil (AC12)', () => {
    mockState.canWrite = false;
    const { r } = render();
    expect(nodes(r, 'topic-add-button').length).toBe(0);
    expect(nodes(r, 'topic-edit-w1').length).toBe(0);
  });

  // item 1 — header consistent with the people selector: Cancel + title, then search + "+ Adicionar".
  it('renders a Cancel button, a centered title, and the add button (item1 AC1.1/AC1.2)', () => {
    const { r } = render();
    expect(nodes(r, 'topic-selector-close-button').length).toBe(1); // Cancel (left)
    const title = nodes(r, 'topic-selector-title')[0];
    expect(String(title.props.children)).toBe('topics.pickerTitle');
    expect(nodes(r, 'topic-add-button').length).toBe(1); // "+ Adicionar" (topic:write)
  });

  it('Cancel calls onClose (item1 AC1.3)', () => {
    const onClose = jest.fn();
    let r!: TestRenderer.ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(
        React.createElement(TopicSelectorModal, { visible: true, onSelect: jest.fn(), onClose })
      );
    });
    act(() => (nodes(r, 'topic-selector-close-button')[0].props.onPress as () => void)());
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
