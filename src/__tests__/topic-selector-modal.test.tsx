/**
 * Behavioral test for the rewritten TopicSelectorModal (specs/v2-topics-overhaul.md). `react-native`
 * is aliased to a stub; theme/i18n/auth/icons/SearchInput and the topic hooks are mocked. Covers:
 * search (title + library), custom-first pencil, add, edit (title+link), clear+confirm delete dialog,
 * select returns the topic, and topic:write gating.
 */
import React from 'react';
import { render as rtlRender, screen, fireEvent, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { TopicSelectorModal } from '../components/TopicSelectorModal';
import type { TopicWithCollection } from '../types/database';


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

it('a busca começa limpa a cada abertura (não vaza entre discursos)', async () => {
  // O pai reaproveita o mesmo modal entre discursos, só alternando `visible` — sem isto, o texto
  // digitado para um discurso volta a filtrar a lista do próximo.
  const props = { onSelect: jest.fn(), onClose: jest.fn() };
  const view = await rtlRender(React.createElement(TopicSelectorModal, { visible: true, ...props }));

  await fireEvent.changeText(screen.getByTestId('topic-selector-search-input'), 'Fé');
  expect(screen.getByTestId('topic-selector-search-input').props.value).toBe('Fé');

  await view.rerender(React.createElement(TopicSelectorModal, { visible: false, ...props }));
  await view.rerender(React.createElement(TopicSelectorModal, { visible: true, ...props }));

  expect(screen.getByTestId('topic-selector-search-input').props.value).toBe('');
});

async function render() {
  const onSelect = jest.fn();
  await rtlRender(React.createElement(TopicSelectorModal, { visible: true, onSelect, onClose: jest.fn() }));
  return { r: null, onSelect };
}
function nodes(_r: unknown, testID: string) {
  return screen.queryAllByTestId(testID);
}
async function setText(_r: unknown, testID: string, text: string) {
  await fireEvent.changeText(screen.getByTestId(testID), text);
}
async function press(__r: unknown, testID: string) {
  await fireEvent.press(screen.getByTestId(testID));
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
  it('search matches both the title and the library name', async () => {
    const { r } = await render();
    await setText(r, 'topic-selector-search-input', 'april'); // matches GEN's collection
    expect(nodes(r, 'topic-row-g1').length).toBe(1);
    expect(nodes(r, 'topic-row-w1').length).toBe(0);
  });

  it('only custom (ward) topics have a pencil edit affordance (AC6/AC11)', async () => {
    const { r } = await render();
    expect(nodes(r, 'topic-edit-w1').length).toBe(1);
    expect(nodes(r, 'topic-edit-g1').length).toBe(0);
  });

  it('add button creates a custom topic prefilled from search (AC7)', async () => {
    const { r } = await render();
    await setText(r, 'topic-selector-search-input', 'Novo Tema');
    await press(r, 'topic-add-button');
    expect(nodes(r, 'topic-editor').length).toBe(1);
    expect(nodes(r, 'topic-edit-title')[0].props.value).toBe('Novo Tema');
    await press(r, 'topic-edit-confirm');
    expect(mockState.create).toHaveBeenCalledWith({ title: 'Novo Tema', link: null });
  });

  it('editing a custom topic updates title + link (AC8)', async () => {
    const { r } = await render();
    await press(r, 'topic-edit-w1');
    expect(nodes(r, 'topic-edit-title')[0].props.value).toBe('Fé');
    await setText(r, 'topic-edit-title', 'Fé em Cristo');
    await setText(r, 'topic-edit-link', 'http://y');
    await press(r, 'topic-edit-confirm');
    expect(mockState.update).toHaveBeenCalledWith({ id: 'w1', title: 'Fé em Cristo', link: 'http://y' });
  });

  it('clearing the title and confirming prompts to delete the shared topic (AC9)', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { r } = await render();
    await press(r, 'topic-edit-w1');
    await setText(r, 'topic-edit-title', '  ');
    await press(r, 'topic-edit-confirm');
    expect(alertSpy).toHaveBeenCalled();
    const buttons = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    await act(async () => buttons[1].onPress?.()); // confirm delete
    expect(mockState.del).toHaveBeenCalledWith({ topicId: 'w1', topicTitle: 'Fé' });
  });

  it('selecting a topic returns it via onSelect (AC10)', async () => {
    const { r, onSelect } = await render();
    await press(r, 'topic-row-g1');
    expect(onSelect).toHaveBeenCalledWith(GEN);
  });

  it('without topic:write there is no add button and no pencil (AC12)', async () => {
    mockState.canWrite = false;
    const { r } = await render();
    expect(nodes(r, 'topic-add-button').length).toBe(0);
    expect(nodes(r, 'topic-edit-w1').length).toBe(0);
  });

  // item 1 — header consistent with the people selector: Cancel + title, then search + "+ Adicionar".
  it('renders a Cancel button, a centered title, and the add button (item1 AC1.1/AC1.2)', async () => {
    const { r } = await render();
    expect(nodes(r, 'topic-selector-close-button').length).toBe(1); // Cancel (left)
    const title = nodes(r, 'topic-selector-title')[0];
    expect(String(title.props.children)).toBe('topics.pickerTitle');
    expect(nodes(r, 'topic-add-button').length).toBe(1); // "+ Adicionar" (topic:write)
  });

  it('Cancel calls onClose (item1 AC1.3)', async () => {
    const onClose = jest.fn();
    await rtlRender(React.createElement(TopicSelectorModal, { visible: true, onSelect: jest.fn(), onClose }));
    await fireEvent.press(screen.getByTestId('topic-selector-close-button'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
