/**
 * TopicSelectorModal: pick a speech topic, and manage custom (ward) topics inline. Modeled on
 * PeoplePicker — search (matches topic title AND library name), an add button, and per-custom-topic
 * inline edit (pencil). Custom topics list first (editable); then built-in libraries: evergreen
 * first, then conferences newest-first (ordering from useActiveTopics). Clearing a custom topic's
 * title and confirming prompts to delete the shared topic. Built-in topics are selectable only.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { SearchInput } from './SearchInput';
import { PencilIcon, PlusIcon } from './icons';
import {
  useActiveTopics,
  useCreateWardTopic,
  useUpdateWardTopic,
  useDeleteWardTopic,
} from '../hooks/useTopics';
import type { TopicWithCollection } from '../types/database';

export interface TopicSelectorModalProps {
  visible: boolean;
  onSelect: (topic: TopicWithCollection) => void;
  onClose: () => void;
}

function normalizeForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

const NEW_ID = '__new__';

export function TopicSelectorModal({ visible, onSelect, onClose }: TopicSelectorModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('topic:write');

  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null); // ward topic id, or NEW_ID
  const [editTitle, setEditTitle] = useState('');
  const [editLink, setEditLink] = useState('');

  const { data: allTopics } = useActiveTopics();
  const createTopic = useCreateWardTopic();
  const updateTopic = useUpdateWardTopic();
  const deleteTopic = useDeleteWardTopic();

  const filteredTopics = useMemo(() => {
    const topics = allTopics ?? [];
    if (!search.trim()) return topics;
    const normalized = normalizeForSearch(search);
    return topics.filter((topic) =>
      normalizeForSearch(`${topic.collection} : ${topic.title}`).includes(normalized)
    );
  }, [allTopics, search]);

  const resetEdit = useCallback(() => {
    setEditingId(null);
    setEditTitle('');
    setEditLink('');
  }, []);

  const startAdd = useCallback(() => {
    setEditingId(NEW_ID);
    setEditTitle(search.trim());
    setEditLink('');
  }, [search]);

  const startEdit = useCallback((topic: TopicWithCollection) => {
    setEditingId(topic.id);
    setEditTitle(topic.title);
    setEditLink(topic.link ?? '');
  }, []);

  const confirmEdit = useCallback(() => {
    const title = editTitle.trim();
    const link = editLink.trim() ? editLink.trim() : null;

    if (!title) {
      // Empty title: for an existing topic, offer to delete; for a new one, just cancel.
      if (editingId && editingId !== NEW_ID) {
        const existing = (allTopics ?? []).find((x) => x.id === editingId);
        Alert.alert(
          t('topics.deleteSharedTitle'),
          t('topics.deleteSharedMessage'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('common.delete'),
              style: 'destructive',
              onPress: () => {
                deleteTopic.mutate({ topicId: editingId, topicTitle: existing?.title ?? '' });
                resetEdit();
              },
            },
          ]
        );
        return;
      }
      resetEdit();
      return;
    }

    if (editingId === NEW_ID) {
      createTopic.mutate({ title, link });
    } else if (editingId) {
      updateTopic.mutate({ id: editingId, title, link });
    }
    resetEdit();
  }, [editTitle, editLink, editingId, allTopics, t, createTopic, updateTopic, deleteTopic, resetEdit]);

  const handleSelect = useCallback(
    (topic: TopicWithCollection) => {
      onSelect(topic);
      setSearch('');
      resetEdit();
    },
    [onSelect, resetEdit]
  );

  const handleClose = useCallback(() => {
    setSearch('');
    resetEdit();
    onClose();
  }, [onClose, resetEdit]);

  const renderEditor = () => (
    <View style={[styles.editor, { borderBottomColor: colors.divider }]} testID="topic-editor">
      <TextInput
        testID="topic-edit-title"
        style={[styles.editInput, { color: colors.text, borderColor: colors.border }]}
        value={editTitle}
        onChangeText={setEditTitle}
        placeholder={t('topics.topicTitle')}
        placeholderTextColor={colors.textTertiary}
        autoFocus
      />
      <TextInput
        testID="topic-edit-link"
        style={[styles.editInput, { color: colors.text, borderColor: colors.border }]}
        value={editLink}
        onChangeText={setEditLink}
        placeholder={t('topics.topicLink')}
        placeholderTextColor={colors.textTertiary}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <View style={styles.editActions}>
        <Pressable onPress={resetEdit} hitSlop={8} testID="topic-edit-cancel">
          <Text style={[styles.editActionText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
        </Pressable>
        <Pressable onPress={confirmEdit} hitSlop={8} testID="topic-edit-confirm">
          <Text style={[styles.editActionText, { color: colors.primary }]}>{t('common.save')}</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <SearchInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder={t('speeches.selectTopic')}
            autoFocus
            testID="topic-selector-search-input"
          />
          {canManage && (
            <Pressable
              style={[styles.addButton, { backgroundColor: colors.surfaceVariant }]}
              onPress={startAdd}
              accessibilityLabel={t('topics.addTopic')}
              testID="topic-add-button"
            >
              <PlusIcon size={20} color={colors.primary} />
            </Pressable>
          )}
          <Pressable style={styles.closeButton} onPress={handleClose} testID="topic-selector-close-button">
            <Text style={[styles.closeText, { color: colors.primary }]}>{t('common.close')}</Text>
          </Pressable>
        </View>

        <FlatList
          data={filteredTopics}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={editingId === NEW_ID ? renderEditor() : null}
          renderItem={({ item }) => {
            if (editingId === item.id) return renderEditor();
            const isWard = item.type === 'ward';
            return (
              <View style={[styles.topicItem, { borderBottomColor: colors.divider }]}>
                <Pressable
                  style={styles.topicPressable}
                  onPress={() => handleSelect(item)}
                  testID={`topic-row-${item.id}`}
                >
                  <Text style={[styles.topicCollection, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.collection}
                  </Text>
                  <Text style={[styles.topicTitle, { color: colors.text }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                </Pressable>
                {isWard && canManage && (
                  <Pressable hitSlop={8} onPress={() => startEdit(item)} testID={`topic-edit-${item.id}`}>
                    <PencilIcon size={18} color={colors.textSecondary} />
                  </Pressable>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('common.noResults')}</Text>
            </View>
          }
          keyboardShouldPersistTaps="handled"
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  searchInput: { flex: 1, height: 40, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 15 },
  addButton: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  closeButton: { paddingVertical: 8 },
  closeText: { fontSize: 16, fontWeight: '500' },
  topicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  topicPressable: { flex: 1 },
  topicCollection: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  topicTitle: { fontSize: 15 },
  editor: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  editInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20, paddingTop: 4 },
  editActionText: { fontSize: 15, fontWeight: '600' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 15 },
});
