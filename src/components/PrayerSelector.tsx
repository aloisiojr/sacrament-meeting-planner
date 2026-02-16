/**
 * PrayerSelector: Select a member for prayer or type a custom name.
 * Members are listed with inline search; a custom name field allows
 * entering non-member names (e.g., visitors).
 */

import React, { useState, useCallback } from 'react';
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
import { useMembers } from '../hooks/useMembers';
import type { Member } from '../types/database';

// --- Types ---

export interface PrayerSelection {
  /** Member ID if selected from list, null if custom name. */
  memberId: string | null;
  /** Display name (member name or custom name). */
  name: string;
}

export interface PrayerSelectorProps {
  /** The currently selected prayer person. */
  selected: PrayerSelection | null;
  /** Called when a prayer person is selected. */
  onSelect: (selection: PrayerSelection | null) => void;
  /** Placeholder text for the selector button. */
  placeholder?: string;
  /** Whether the selector is disabled. */
  disabled?: boolean;
}

export function PrayerSelector({
  selected,
  onSelect,
  placeholder,
  disabled = false,
}: PrayerSelectorProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [customName, setCustomName] = useState('');

  const { data: members } = useMembers(search);

  const handleSelectMember = useCallback(
    (member: Member) => {
      onSelect({ memberId: member.id, name: member.full_name });
      setModalVisible(false);
      setSearch('');
      setCustomName('');
    },
    [onSelect]
  );

  const handleCustomName = useCallback(() => {
    const trimmed = customName.trim();
    if (!trimmed) return;
    onSelect({ memberId: null, name: trimmed });
    setModalVisible(false);
    setSearch('');
    setCustomName('');
  }, [customName, onSelect]);

  const handleClear = useCallback(() => {
    onSelect(null);
  }, [onSelect]);

  return (
    <>
      <Pressable
        style={[styles.selector, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={placeholder ?? t('agenda.openingPrayer')}
      >
        <Text
          style={[
            styles.selectorText,
            { color: selected ? colors.text : colors.placeholder },
          ]}
          numberOfLines={1}
        >
          {selected?.name ?? (placeholder ?? t('common.search'))}
        </Text>
        {selected && !disabled && (
          <Pressable onPress={handleClear} hitSlop={8}>
            <Text style={[styles.clearButton, { color: colors.textSecondary }]}>x</Text>
          </Pressable>
        )}
        <Text style={[styles.arrow, { color: colors.textSecondary }]}>{'\u25BC'}</Text>
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TextInput
              style={[styles.searchInput, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
              value={search}
              onChangeText={(text) => {
                setSearch(text);
                setCustomName(text);
              }}
              placeholder={t('common.search')}
              placeholderTextColor={colors.placeholder}
              autoFocus
              autoCapitalize="words"
              autoCorrect={false}
            />
            <Pressable
              style={styles.cancelButton}
              onPress={() => {
                setModalVisible(false);
                setSearch('');
                setCustomName('');
              }}
            >
              <Text style={[styles.cancelText, { color: colors.primary }]}>
                {t('common.close')}
              </Text>
            </Pressable>
          </View>

          {/* Custom name option (shown when search has text and doesn't exactly match a member) */}
          {customName.trim().length > 0 && (
            <Pressable
              style={[styles.customNameButton, { borderColor: colors.primary, backgroundColor: colors.primaryContainer }]}
              onPress={handleCustomName}
            >
              <Text style={[styles.customNameText, { color: colors.primary }]}>
                {customName.trim()}
              </Text>
              <Text style={[styles.customNameHint, { color: colors.textSecondary }]}>
                {t('agenda.customName')}
              </Text>
            </Pressable>
          )}

          {/* Member list */}
          <FlatList
            data={members}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                style={[
                  styles.memberItem,
                  { borderBottomColor: colors.divider },
                  item.id === selected?.memberId && { backgroundColor: colors.primaryContainer },
                ]}
                onPress={() => handleSelectMember(item)}
              >
                <Text
                  style={[
                    styles.memberName,
                    { color: colors.text },
                    item.id === selected?.memberId && { fontWeight: '600' },
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
    </>
  );
}

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  selectorText: {
    flex: 1,
    fontSize: 15,
  },
  clearButton: {
    fontSize: 16,
    paddingHorizontal: 8,
  },
  arrow: {
    fontSize: 10,
    marginLeft: 4,
  },
  modalContainer: {
    flex: 1,
    paddingTop: 60,
  },
  modalHeader: {
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
  cancelButton: {
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  customNameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 8,
    gap: 8,
  },
  customNameText: {
    fontSize: 15,
    fontWeight: '500',
  },
  customNameHint: {
    fontSize: 13,
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
