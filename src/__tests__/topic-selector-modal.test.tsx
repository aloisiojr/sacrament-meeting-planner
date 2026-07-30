/**
 * Behavioral test for the rewritten TopicSelectorModal (specs/v2-topics-overhaul.md). `react-native`
 * is aliased to a stub; theme/i18n/auth/icons/SearchInput and the topic hooks are mocked. Covers:
 * search (title + library), custom-first pencil, add, edit (title+link), clear+confirm delete dialog,
 * select returns the topic, and topic:write gating.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import TestRenderer from 'react-test-renderer';
import { Alert } from 'react-native';
import { TopicSelectorModal } from '../components/TopicSelectorModal';
import type { TopicWithCollection } from '../types/database';

const { act } = TestRenderer;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const state = vi.hoisted(() => ({
  topics: [] as TopicWithCollection[],
  canWrite: true,
  create: vi.fn(),
  update: vi.fn(),
  del: vi.fn(),
}));

// The RN stub's FlatList ignores renderItem; render data (+ ListHeaderComponent) so rows appear.
vi.mock('react-native', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  const ReactMod = (await import('react')).default;
  const FlatList = ({
    data,
    renderItem,
    keyExtractor,
    ListHeaderComponent,
  }: {
    data?: unknown[];
    renderItem?: (info: { item: unknown; index: number }) => React.ReactNode;
    keyExtractor?: (item: unknown, index: number) => string;
    ListHeaderComponent?: React.ReactNode;
  }) =>
    ReactMod.createElement(
      'FlatList',
      {},
      ListHeaderComponent ?? null,
      (data ?? []).map((item, index) =>
        ReactMod.createElement(
          ReactMod.Fragment,
          { key: keyExtractor ? keyExtractor(item, index) : index },
          renderItem?.({ item, index })
        )
      )
    );
  return { ...actual, FlatList };
});

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: { background: '#000', text: '#fff', textSecondary: '#aaa', textTertiary: '#888', primary: '#07f', border: '#444', divider: '#333', surfaceVariant: '#222' },
  }),
}));
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ hasPermission: (p: string) => (p === 'topic:write' ? state.canWrite : true) }),
}));
vi.mock('../components/SearchInput', () => ({
  SearchInput: (p: Record<string, unknown>) => React.createElement('SearchInput', p),
}));
vi.mock('../components/icons', () => ({ PencilIcon: () => null, PlusIcon: () => null }));
vi.mock('../hooks/useTopics', () => ({
  useActiveTopics: () => ({ data: state.topics }),
  useCreateWardTopic: () => ({ mutate: state.create }),
  useUpdateWardTopic: () => ({ mutate: state.update }),
  useDeleteWardTopic: () => ({ mutate: state.del }),
}));

const WARD: TopicWithCollection = { id: 'w1', title: 'Fé', link: 'http://x', collection: 'topics.customTopics', type: 'ward' };
const GEN: TopicWithCollection = { id: 'g1', title: 'Repentance', link: null, collection: 'General Conference April 2024', type: 'general' };

function render() {
  const onSelect = vi.fn();
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(React.createElement(TopicSelectorModal, { visible: true, onSelect, onClose: vi.fn() }));
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
  state.topics = [WARD, GEN];
  state.canWrite = true;
  state.create = vi.fn();
  state.update = vi.fn();
  state.del = vi.fn();
  vi.restoreAllMocks();
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
    expect(state.create).toHaveBeenCalledWith({ title: 'Novo Tema', link: null });
  });

  it('editing a custom topic updates title + link (AC8)', () => {
    const { r } = render();
    press(r, 'topic-edit-w1');
    expect(nodes(r, 'topic-edit-title')[0].props.value).toBe('Fé');
    setText(r, 'topic-edit-title', 'Fé em Cristo');
    setText(r, 'topic-edit-link', 'http://y');
    press(r, 'topic-edit-confirm');
    expect(state.update).toHaveBeenCalledWith({ id: 'w1', title: 'Fé em Cristo', link: 'http://y' });
  });

  it('clearing the title and confirming prompts to delete the shared topic (AC9)', () => {
    const alertSpy = vi.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { r } = render();
    press(r, 'topic-edit-w1');
    setText(r, 'topic-edit-title', '  ');
    press(r, 'topic-edit-confirm');
    expect(alertSpy).toHaveBeenCalled();
    const buttons = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    act(() => buttons[1].onPress?.()); // confirm delete
    expect(state.del).toHaveBeenCalledWith({ topicId: 'w1', topicTitle: 'Fé' });
  });

  it('selecting a topic returns it via onSelect (AC10)', () => {
    const { r, onSelect } = render();
    press(r, 'topic-row-g1');
    expect(onSelect).toHaveBeenCalledWith(GEN);
  });

  it('without topic:write there is no add button and no pencil (AC12)', () => {
    state.canWrite = false;
    const { r } = render();
    expect(nodes(r, 'topic-add-button').length).toBe(0);
    expect(nodes(r, 'topic-edit-w1').length).toBe(0);
  });
});
