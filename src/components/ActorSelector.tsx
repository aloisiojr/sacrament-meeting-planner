/**
 * ActorSelector: Inline search component for selecting a meeting actor.
 * Supports filtering by role capability and adding new actors inline.
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
import { useActors, useCreateActor, type ActorRoleFilter } from '../hooks/useActors';
import type { MeetingActor, CreateActorInput } from '../types/database';

// --- Types ---

export interface ActorSelectorProps {
  /** The currently selected actor name (null if none). */
  selectedName: string | null;
  /** The currently selected actor ID (null if none). */
  selectedActorId: string | null;
  /** Called when an actor is selected. */
  onSelect: (actor: MeetingActor | null) => void;
  /** Filter actors by role capability. */
  roleFilter?: ActorRoleFilter;
  /** Placeholder text. */
  placeholder?: string;
  /** Whether the selector is disabled. */
  disabled?: boolean;
  /** Whether to allow adding new actors inline. */
  allowAdd?: boolean;
}

export function ActorSelector({
  selectedName,
  selectedActorId,
  onSelect,
  roleFilter = 'all',
  placeholder,
  disabled = false,
  allowAdd = true,
}: ActorSelectorProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newActorName, setNewActorName] = useState('');

  const { data: actors } = useActors(roleFilter);
  const createActor = useCreateActor();

  // Client-side filter by search
  const filteredActors = (actors ?? []).filter((a) => {
    if (!search.trim()) return true;
    return a.name.toLowerCase().includes(search.toLowerCase());
  });

  const handleSelect = useCallback(
    (actor: MeetingActor) => {
      onSelect(actor);
      setModalVisible(false);
      setSearch('');
    },
    [onSelect]
  );

  const handleClear = useCallback(() => {
    onSelect(null);
  }, [onSelect]);

  const handleAddNew = useCallback(() => {
    const trimmed = newActorName.trim();
    if (!trimmed) return;

    // Derive role capabilities from the roleFilter
    const input: CreateActorInput = {
      name: trimmed,
      can_preside: roleFilter === 'can_preside' || roleFilter === 'can_conduct',
      can_conduct: roleFilter === 'can_conduct',
      can_recognize: roleFilter === 'can_recognize',
      can_music: roleFilter === 'can_music',
    };

    createActor.mutate(input, {
      onSuccess: (newActor) => {
        onSelect(newActor);
        setIsAddingNew(false);
        setNewActorName('');
        setModalVisible(false);
        setSearch('');
      },
    });
  }, [newActorName, roleFilter, createActor, onSelect]);

  return (
    <>
      <Pressable
        style={[styles.selector, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={placeholder ?? t('settings.actors')}
      >
        <Text
          style={[
            styles.selectorText,
            { color: selectedName ? colors.text : colors.placeholder },
          ]}
          numberOfLines={1}
        >
          {selectedName ?? (placeholder ?? t('common.search'))}
        </Text>
        {selectedName && !disabled && (
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
        onRequestClose={() => {
          setModalVisible(false);
          setIsAddingNew(false);
        }}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <TextInput
              style={[styles.searchInput, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
              value={search}
              onChangeText={setSearch}
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
                setIsAddingNew(false);
              }}
            >
              <Text style={[styles.cancelText, { color: colors.primary }]}>
                {t('common.close')}
              </Text>
            </Pressable>
          </View>

          {/* Add new actor inline */}
          {allowAdd && !isAddingNew && (
            <Pressable
              style={[styles.addNewButton, { borderColor: colors.primary }]}
              onPress={() => setIsAddingNew(true)}
            >
              <Text style={[styles.addNewText, { color: colors.primary }]}>
                + {t('common.add')}
              </Text>
            </Pressable>
          )}

          {isAddingNew && (
            <View style={styles.addNewForm}>
              <TextInput
                style={[styles.addNewInput, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
                value={newActorName}
                onChangeText={setNewActorName}
                placeholder={t('members.fullName')}
                placeholderTextColor={colors.placeholder}
                autoFocus
                autoCapitalize="words"
                onSubmitEditing={handleAddNew}
                returnKeyType="done"
              />
              <Pressable
                style={[styles.addConfirmButton, { backgroundColor: colors.primary }]}
                onPress={handleAddNew}
              >
                <Text style={[styles.addConfirmText, { color: colors.onPrimary }]}>
                  {t('common.add')}
                </Text>
              </Pressable>
            </View>
          )}

          <FlatList
            data={filteredActors}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                style={[
                  styles.actorItem,
                  { borderBottomColor: colors.divider },
                  item.id === selectedActorId && { backgroundColor: colors.primaryContainer },
                ]}
                onPress={() => handleSelect(item)}
              >
                <Text
                  style={[
                    styles.actorName,
                    { color: colors.text },
                    item.id === selectedActorId && { fontWeight: '600' },
                  ]}
                  numberOfLines={1}
                >
                  {item.name}
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
  addNewButton: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addNewText: {
    fontSize: 15,
    fontWeight: '500',
  },
  addNewForm: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  addNewInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  addConfirmButton: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addConfirmText: {
    fontSize: 15,
    fontWeight: '600',
  },
  actorItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actorName: {
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
