/**
 * ActorSelector: Bottom-sheet (2/3 screen) dialog for selecting, adding,
 * editing, and deleting meeting actors. Replaces the old full-screen modal.
 * The word "Actor"/"Ator" never appears in the UI.
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
  Dimensions,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { SearchInput } from './SearchInput';
import { useActors, useCreateActor, useUpdateActor, useDeleteActor, type ActorRoleFilter } from '../hooks/useActors';
import type { MeetingActor, CreateActorInput } from '../types/database';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_HEIGHT = Math.round(SCREEN_HEIGHT * 0.67);

// --- Types ---

export interface ActorSelectorProps {
  visible: boolean;
  roleFilter: ActorRoleFilter;
  onSelect: (actor: MeetingActor) => void;
  onClose: () => void;
  selectedNames?: string[];
  multiSelect?: boolean;
}

export function ActorSelector({
  visible,
  roleFilter,
  onSelect,
  onClose,
  selectedNames,
  multiSelect,
}: ActorSelectorProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [addingName, setAddingName] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const { data: actors } = useActors(roleFilter);
  const createActor = useCreateActor();
  const updateActor = useUpdateActor();
  const deleteActor = useDeleteActor();

  const filtered = useMemo(() => {
    const list = actors ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((a) => a.name.toLowerCase().includes(q));
  }, [actors, search]);

  const handleSelect = useCallback(
    (actor: MeetingActor) => {
      onSelect(actor);
      if (!multiSelect) {
        setSearch('');
        setShowAddInput(false);
        setEditingId(null);
      }
    },
    [onSelect, multiSelect]
  );

  const handleClose = useCallback(() => {
    setSearch('');
    setShowAddInput(false);
    setAddingName('');
    setEditingId(null);
    onClose();
  }, [onClose]);

  const handleAdd = useCallback(() => {
    const trimmed = addingName.trim();
    if (!trimmed) return;

    const input: CreateActorInput = {
      name: trimmed,
      can_preside: roleFilter === 'can_preside',
      can_conduct: roleFilter === 'can_conduct',
      can_recognize: roleFilter === 'can_recognize',
      can_pianist: roleFilter === 'can_pianist',
      can_conductor: roleFilter === 'can_conductor',
    };

    createActor.mutate(input, {
      onSuccess: (newActor) => {
        onSelect(newActor);
        setAddingName('');
        if (!multiSelect) {
          setShowAddInput(false);
          setSearch('');
        }
      },
    });
  }, [addingName, roleFilter, createActor, onSelect]);

  const handleEditSave = useCallback(
    (id: string) => {
      const trimmed = editingName.trim();
      if (!trimmed) {
        setEditingId(null);
        return;
      }
      updateActor.mutate({ id, name: trimmed });
      setEditingId(null);
      setEditingName('');
    },
    [editingName, updateActor]
  );

  const handleDelete = useCallback(
    (actor: MeetingActor) => {
      Alert.alert(
        t('common.delete'),
        t('actors.deleteConfirm'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: () => deleteActor.mutate({ actorId: actor.id, actorName: actor.name }),
          },
        ]
      );
    },
    [t, deleteActor]
  );

  const renderItem = useCallback(
    ({ item }: { item: MeetingActor }) => {
      const isEditing = editingId === item.id;
      const isSelected = multiSelect && selectedNames?.includes(item.name);

      return (
        <View style={[styles.actorRow, { borderBottomColor: colors.divider }]}>
          {isEditing ? (
            <TextInput
              style={[styles.editInput, { color: colors.text, borderColor: colors.border }]}
              value={editingName}
              onChangeText={setEditingName}
              autoFocus
              onSubmitEditing={() => handleEditSave(item.id)}
              onBlur={() => handleEditSave(item.id)}
              returnKeyType="done"
            />
          ) : (
            <Pressable style={styles.actorNameArea} onPress={() => handleSelect(item)}>
              {multiSelect && (
                <Text style={[styles.checkbox, { color: colors.text }]}>
                  {isSelected ? '\u2611' : '\u2610'}
                </Text>
              )}
              <Text style={[styles.actorName, { color: colors.text }]} numberOfLines={1}>
                {item.name}
              </Text>
            </Pressable>
          )}
          {!isEditing && (
            <View style={styles.actorActions}>
              <Pressable
                hitSlop={12}
                onPress={() => {
                  setEditingId(item.id);
                  setEditingName(item.name);
                }}
              >
                <Text style={[styles.actionIcon, { color: colors.textSecondary }]}>{'\u270E'}</Text>
              </Pressable>
              <Pressable hitSlop={12} onPress={() => handleDelete(item)}>
                <Text style={[styles.actionIcon, { color: colors.error }]}>{'\u2716'}</Text>
              </Pressable>
            </View>
          )}
        </View>
      );
    },
    [colors, editingId, editingName, handleSelect, handleEditSave, handleDelete, multiSelect, selectedNames]
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <View
          style={[styles.sheet, { backgroundColor: colors.card }]}
          onStartShouldSetResponder={() => true}
        >
          {/* Handle bar */}
          <View style={styles.handleBar}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          {/* Search */}
          <View style={styles.searchRow}>
            <SearchInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder={t('common.search')}
              autoCapitalize="words"
            />
            <Pressable onPress={handleClose} style={styles.closeBtn}>
              <Text style={[styles.closeText, { color: colors.primary }]}>{t('common.close')}</Text>
            </Pressable>
          </View>

          {/* Add button / input */}
          {!showAddInput ? (
            <Pressable
              style={[styles.addButton, { borderColor: colors.primary }]}
              onPress={() => setShowAddInput(true)}
            >
              <Text style={[styles.addButtonText, { color: colors.primary }]}>
                + {t('common.add')}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.addRow}>
              <TextInput
                style={[styles.addInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                value={addingName}
                onChangeText={setAddingName}
                placeholder={t('members.fullName')}
                placeholderTextColor={colors.textTertiary}
                autoFocus
                autoCapitalize="words"
                onSubmitEditing={handleAdd}
                returnKeyType="done"
              />
              <Pressable
                style={[styles.addConfirm, { backgroundColor: addingName.trim() ? colors.primary : colors.surfaceVariant }]}
                onPress={handleAdd}
                disabled={!addingName.trim()}
              >
                <Text style={[styles.addConfirmText, { color: addingName.trim() ? colors.onPrimary : colors.textTertiary }]}>
                  {t('common.add')}
                </Text>
              </Pressable>
            </View>
          )}

          {/* Actor list */}
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {t('common.noResults')}
                </Text>
              </View>
            }
          />
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    height: SHEET_HEIGHT,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  handleBar: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
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
  closeBtn: {
    paddingVertical: 8,
  },
  closeText: {
    fontSize: 16,
    fontWeight: '500',
  },
  addButton: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  addRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  addInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  addConfirm: {
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
  actorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actorNameArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actorName: {
    fontSize: 16,
  },
  checkbox: {
    fontSize: 20,
    marginRight: 8,
  },
  actorActions: {
    flexDirection: 'row',
    gap: 20,
    marginLeft: 16,
  },
  actionIcon: {
    fontSize: 24,
    padding: 4,
  },
  editInput: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
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
