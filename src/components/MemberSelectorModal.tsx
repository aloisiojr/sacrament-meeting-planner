/**
 * MemberSelectorModal: Modal for selecting a ward member.
 * Alphabetical list with search (accent-insensitive).
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { SearchInput } from './SearchInput';
import { useMembers } from '../hooks/useMembers';
import type { Member } from '../types/database';

export interface MemberSelectorModalProps {
  visible: boolean;
  onSelect: (member: Member) => void;
  onClose: () => void;
  /** Currently selected member ID for highlighting. */
  selectedId?: string | null;
}

export function MemberSelectorModal({
  visible,
  onSelect,
  onClose,
  selectedId,
}: MemberSelectorModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [search, setSearch] = useState('');

  const { data: members } = useMembers(search);

  const handleSelect = useCallback(
    (member: Member) => {
      onSelect(member);
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
          <SearchInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder={t('speeches.selectSpeaker')}
            autoFocus
            autoCapitalize="words"
          />
          <Pressable style={styles.closeButton} onPress={handleClose}>
            <Text style={[styles.closeText, { color: colors.primary }]}>
              {t('common.close')}
            </Text>
          </Pressable>
        </View>

        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              style={[
                styles.memberItem,
                { borderBottomColor: colors.divider },
                item.id === selectedId && { backgroundColor: colors.primaryContainer },
              ]}
              onPress={() => handleSelect(item)}
            >
              <Text
                style={[
                  styles.memberName,
                  { color: colors.text },
                  item.id === selectedId && { fontWeight: '600' },
                ]}
                numberOfLines={1}
              >
                {item.full_name}
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
  memberItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  memberName: {
    fontSize: 16,
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
  },
});
