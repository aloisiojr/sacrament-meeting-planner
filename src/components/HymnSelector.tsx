/**
 * HymnSelector: Inline search component for selecting a hymn.
 * Supports search by number (prefix match) or title (accent-insensitive).
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
import { useHymns, useSacramentalHymns, formatHymnDisplay } from '../hooks/useHymns';
import { getCurrentLanguage } from '../i18n';
import type { Hymn } from '../types/database';

// --- Types ---

export interface HymnSelectorProps {
  /** The currently selected hymn (null if none). */
  selectedHymn: Hymn | null;
  /** Called when a hymn is selected. */
  onSelect: (hymn: Hymn | null) => void;
  /** Whether to show only sacramental hymns. */
  sacramentalOnly?: boolean;
  /** Placeholder text. */
  placeholder?: string;
  /** Whether the selector is disabled. */
  disabled?: boolean;
}

export function HymnSelector({
  selectedHymn,
  onSelect,
  sacramentalOnly = false,
  placeholder,
  disabled = false,
}: HymnSelectorProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = getCurrentLanguage();
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');

  const hymnQuery = sacramentalOnly
    ? useSacramentalHymns(language, search)
    : useHymns(language, search);

  const hymns = hymnQuery.data ?? [];

  const handleSelect = useCallback(
    (hymn: Hymn) => {
      onSelect(hymn);
      setModalVisible(false);
      setSearch('');
    },
    [onSelect]
  );

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
        accessibilityLabel={placeholder ?? t('agenda.openingHymn')}
      >
        <Text
          style={[
            styles.selectorText,
            { color: selectedHymn ? colors.text : colors.placeholder },
          ]}
          numberOfLines={1}
        >
          {selectedHymn ? formatHymnDisplay(selectedHymn) : (placeholder ?? t('common.search'))}
        </Text>
        {selectedHymn && !disabled && (
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
          <View style={styles.modalHeader}>
            <SearchInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder={t('common.search')}
              autoFocus
            />
            <Pressable
              style={styles.cancelButton}
              onPress={() => {
                setModalVisible(false);
                setSearch('');
              }}
            >
              <Text style={[styles.cancelText, { color: colors.primary }]}>
                {t('common.close')}
              </Text>
            </Pressable>
          </View>

          <FlatList
            data={hymns}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.hymnItem, { borderBottomColor: colors.divider }]}
                onPress={() => handleSelect(item)}
              >
                <Text style={[styles.hymnNumber, { color: colors.primary }]}>
                  {item.number}
                </Text>
                <Text style={[styles.hymnTitle, { color: colors.text }]} numberOfLines={1}>
                  {item.title}
                </Text>
                {item.is_sacramental && (
                  <View style={[styles.sacramentalBadge, { backgroundColor: colors.primaryContainer }]}>
                    <Text style={[styles.sacramentalText, { color: colors.primary }]}>S</Text>
                  </View>
                )}
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
  hymnItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  hymnNumber: {
    fontSize: 15,
    fontWeight: '600',
    width: 40,
  },
  hymnTitle: {
    flex: 1,
    fontSize: 15,
  },
  sacramentalBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sacramentalText: {
    fontSize: 11,
    fontWeight: '700',
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
  },
});
