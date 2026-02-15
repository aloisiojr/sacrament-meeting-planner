/**
 * TopicSelectorModal: Modal for selecting a topic from active collections.
 * Shows topics in "Collection : Title" format, sorted alphabetically.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useActiveTopics } from '../hooks/useTopics';
import type { TopicWithCollection } from '../types/database';

export interface TopicSelectorModalProps {
  visible: boolean;
  onSelect: (topic: TopicWithCollection) => void;
  onClose: () => void;
}

/**
 * Normalize text for accent-insensitive search.
 */
function normalizeForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function TopicSelectorModal({
  visible,
  onSelect,
  onClose,
}: TopicSelectorModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [search, setSearch] = useState('');

  const { data: allTopics } = useActiveTopics();

  const filteredTopics = useMemo(() => {
    const topics = allTopics ?? [];
    if (!search.trim()) return topics;
    const normalized = normalizeForSearch(search);
    return topics.filter((topic) => {
      const display = `${topic.collection} : ${topic.title}`;
      return normalizeForSearch(display).includes(normalized);
    });
  }, [allTopics, search]);

  const handleSelect = useCallback(
    (topic: TopicWithCollection) => {
      onSelect(topic);
      setSearch('');
    },
    [onSelect]
  );

  const handleClose = useCallback(() => {
    setSearch('');
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TextInput
            style={[styles.searchInput, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
            value={search}
            onChangeText={setSearch}
            placeholder={t('speeches.selectTopic')}
            placeholderTextColor={colors.placeholder}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable style={styles.closeButton} onPress={handleClose}>
            <Text style={[styles.closeText, { color: colors.primary }]}>
              {t('common.close')}
            </Text>
          </Pressable>
        </View>

        <FlatList
          data={filteredTopics}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.topicItem, { borderBottomColor: colors.divider }]}
              onPress={() => handleSelect(item)}
            >
              <Text style={[styles.topicCollection, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.collection}
              </Text>
              <Text style={[styles.topicTitle, { color: colors.text }]} numberOfLines={1}>
                {item.title}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t('common.noResults')}
              </Text>
            </View>
          }
          keyboardShouldPersistTaps="handled"
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  closeButton: {
    paddingVertical: 8,
  },
  closeText: {
    fontSize: 16,
    fontWeight: '500',
  },
  topicItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topicCollection: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  topicTitle: {
    fontSize: 15,
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
  },
});
