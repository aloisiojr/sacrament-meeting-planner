/**
 * PeoplePicker (v2.0 unified people model): one picker for speakers, prayers and every actor role.
 *
 * Additive component — will later replace MemberSelectorModal + ActorSelector + PrayerSelector
 * (do NOT modify those yet). Behavior (see specs/v2-member-management.md):
 *  - `capability` context: when set, defaults to listing only members with that flag, plus a
 *    "ver todos" toggle that lists everyone. Undefined = speaker/prayer (everyone).
 *  - Grant-on-select: picking (via "ver todos") a member lacking the required capability shows a
 *    confirmation; on confirm the capability is granted (useUpdateMember) then the member selected.
 *  - Each row: name (+ informal), speech-count badge, capability indicators, and
 *    "Responsável por <name(s)>" when the member is a responsible_id for others.
 *  - Per-row edit / remove (member:write) open PersonEditor / delete; an "add person" entry.
 *  - Selecting is gated by agenda:write / speech:assign; observers are view-only.
 *
 * Mirrors the styling of MemberSelectorModal / ActorSelector.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { SearchInput } from './SearchInput';
import { CheckSquareIcon, SquareIcon, PencilIcon, TrashIcon } from './icons';
import {
  useMembers,
  useUpdateMember,
  useDeleteMember,
  getResponsibleForMap,
  filterMembers,
} from '../hooks/useMembers';
import { useSpeechCounts } from '../hooks/useSpeechCounts';
import { PersonEditor, CAPABILITY_ORDER, CAPABILITY_FIELD, type PeopleCapability } from './PersonEditor';
import type { Member } from '../types/database';

export type { PeopleCapability };

// --- Types ---

export interface PeoplePickerProps {
  visible: boolean;
  /** Capability context; undefined = speaker/prayer (lists everyone). */
  capability?: PeopleCapability;
  /** Multi-select mode (recognition). */
  multiSelect?: boolean;
  /** Currently selected member ids (highlight in single mode, checkbox in multi mode). */
  selectedIds?: string[];
  onSelect: (member: Member) => void;
  onClose: () => void;
}

export function PeoplePicker({
  visible,
  capability,
  multiSelect = false,
  selectedIds,
  onSelect,
  onClose,
}: PeoplePickerProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { hasPermission } = useAuth();

  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const { data: allMembers } = useMembers();
  const { data: speechCounts } = useSpeechCounts();
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();

  const canManage = hasPermission('member:write');
  const canSelect = hasPermission('agenda:write') || hasPermission('speech:assign');

  const capabilityField = capability ? CAPABILITY_FIELD[capability] : null;
  const selectedSet = useMemo(() => new Set(selectedIds ?? []), [selectedIds]);

  const responsibleForMap = useMemo(
    () => getResponsibleForMap(allMembers ?? []),
    [allMembers]
  );

  // Default to the capability-filtered list; "ver todos" (showAll) or no capability lists everyone.
  const rows = useMemo(() => {
    const list = allMembers ?? [];
    const scoped =
      capabilityField && !showAll
        ? list.filter((m) => m[capabilityField] === true)
        : list;
    return search.trim() ? filterMembers(scoped, search) : scoped;
  }, [allMembers, capabilityField, showAll, search]);

  const resetTransient = useCallback(() => {
    setSearch('');
    setShowAll(false);
  }, []);

  const handleClose = useCallback(() => {
    resetTransient();
    onClose();
  }, [resetTransient, onClose]);

  const commitSelect = useCallback(
    (member: Member) => {
      onSelect(member);
      if (!multiSelect) {
        resetTransient();
      }
    },
    [onSelect, multiSelect, resetTransient]
  );

  const handleSelect = useCallback(
    (member: Member) => {
      if (!canSelect) return;
      // Grant-on-select: capability context + member missing the flag → confirm then grant.
      if (capabilityField && member[capabilityField] !== true) {
        Alert.alert(
          t('people.grantConfirmTitle'),
          t('people.grantConfirmMessage', {
            name: member.full_name,
            capability: capability ? t(`capabilities.${capability}`) : '',
          }),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('common.confirm'),
              onPress: () => {
                updateMember.mutate(
                  { id: member.id, [capabilityField]: true },
                  {
                    onSuccess: (saved) => commitSelect(saved),
                  }
                );
              },
            },
          ]
        );
        return;
      }
      commitSelect(member);
    },
    [canSelect, capabilityField, capability, t, updateMember, commitSelect]
  );

  const handleDelete = useCallback(
    (member: Member) => {
      Alert.alert(t('common.delete'), t('members.deleteConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () =>
            deleteMember.mutate({ memberId: member.id, memberName: member.full_name }),
        },
      ]);
    },
    [t, deleteMember]
  );

  const openEditor = useCallback((member: Member | null) => {
    setEditingMember(member);
    setEditorVisible(true);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Member }) => {
      const isSelected = selectedSet.has(item.id);
      const count = speechCounts[item.id] ?? 0;
      const activeCaps = CAPABILITY_ORDER.filter((cap) => item[CAPABILITY_FIELD[cap]] === true);
      const responsibleFor = responsibleForMap.get(item.id);

      return (
        <View style={[styles.row, { borderBottomColor: colors.divider }]}>
          <Pressable
            testID={`people-picker-item-${item.id}`}
            style={[styles.nameArea, !canSelect && { opacity: 0.6 }]}
            onPress={() => handleSelect(item)}
            disabled={!canSelect}
          >
            {multiSelect ? (
              <View style={styles.checkbox}>
                {isSelected ? (
                  <CheckSquareIcon size={20} color={colors.primary} />
                ) : (
                  <SquareIcon size={20} color={colors.textSecondary} />
                )}
              </View>
            ) : null}
            <View style={styles.nameCol}>
              <Text
                style={[
                  styles.name,
                  { color: colors.text },
                  !multiSelect && isSelected && { fontWeight: '600' },
                ]}
                numberOfLines={1}
              >
                {item.full_name}
                {item.informal_name && item.informal_name !== item.full_name ? (
                  <Text style={[styles.informal, { color: colors.textSecondary }]}>
                    {'  '}
                    {item.informal_name}
                  </Text>
                ) : null}
              </Text>
              {count > 0 ? (
                <Text style={[styles.meta, { color: colors.textSecondary }]}>
                  {t('members.speechCount', { count })}
                </Text>
              ) : null}
              {activeCaps.length > 0 ? (
                <Text style={[styles.meta, { color: colors.textTertiary }]}>
                  {activeCaps.map((cap) => t(`capabilitiesShort.${cap}`)).join(' · ')}
                </Text>
              ) : null}
              {responsibleFor && responsibleFor.length > 0 ? (
                <Text style={[styles.meta, { color: colors.textSecondary }]} testID={`people-picker-responsible-${item.id}`}>
                  {t('people.responsibleFor', { names: responsibleFor.join(', ') })}
                </Text>
              ) : null}
            </View>
          </Pressable>
          {canManage ? (
            <View style={styles.actions}>
              <Pressable
                testID={`people-picker-edit-${item.id}`}
                hitSlop={12}
                onPress={() => openEditor(item)}
              >
                <PencilIcon size={18} color={colors.textSecondary} />
              </Pressable>
              <Pressable
                testID={`people-picker-delete-${item.id}`}
                hitSlop={12}
                onPress={() => handleDelete(item)}
              >
                <TrashIcon size={18} color={colors.error} />
              </Pressable>
            </View>
          ) : null}
        </View>
      );
    },
    [
      selectedSet,
      speechCounts,
      responsibleForMap,
      colors,
      canSelect,
      canManage,
      multiSelect,
      t,
      handleSelect,
      handleDelete,
      openEditor,
    ]
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <SearchInput
            testID="people-picker-search"
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder={t('common.search')}
            autoCapitalize="words"
          />
          <Pressable testID="people-picker-close" onPress={handleClose} style={styles.closeBtn}>
            <Text style={[styles.closeText, { color: colors.primary }]}>{t('common.close')}</Text>
          </Pressable>
        </View>

        {/* "Ver todos" toggle (capability context only) */}
        {capabilityField ? (
          <Pressable
            testID="people-picker-view-all"
            style={styles.viewAllRow}
            onPress={() => setShowAll((v) => !v)}
          >
            {showAll ? (
              <CheckSquareIcon size={18} color={colors.primary} />
            ) : (
              <SquareIcon size={18} color={colors.textSecondary} />
            )}
            <Text style={[styles.viewAllText, { color: colors.primary }]}>
              {t('people.viewAll')}
            </Text>
          </Pressable>
        ) : null}

        {/* Add person */}
        {canManage ? (
          <Pressable
            testID="people-picker-add"
            style={[styles.addButton, { borderColor: colors.primary }]}
            onPress={() => openEditor(null)}
          >
            <Text style={[styles.addButtonText, { color: colors.primary }]}>
              + {t('people.addPerson')}
            </Text>
          </Pressable>
        ) : null}

        <FlatList
          data={rows}
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

      {canManage ? (
        <PersonEditor
          visible={editorVisible}
          member={editingMember}
          initialName={editingMember ? undefined : search.trim() || undefined}
          onClose={() => setEditorVisible(false)}
          onSaved={() => setEditorVisible(false)}
        />
      ) : null}
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
  closeBtn: {
    paddingVertical: 8,
  },
  closeText: {
    fontSize: 16,
    fontWeight: '500',
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  viewAllText: {
    fontSize: 14,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  nameArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    marginRight: 10,
  },
  nameCol: {
    flex: 1,
  },
  name: {
    fontSize: 16,
  },
  informal: {
    fontSize: 14,
  },
  meta: {
    fontSize: 12,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 20,
    marginLeft: 16,
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
  },
});
