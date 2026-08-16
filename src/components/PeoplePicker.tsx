/**
 * PeoplePicker (v2.0 unified people model): one picker for speakers, prayers and every actor role.
 *
 * The single, unified picker for all people selection. Behavior (see specs/v2-people-refinements.md):
 *  - `context` maps to an effective capability (via CONTEXT_CAPABILITY): speaker/prayers → none
 *    (lists everyone); the actor roles → the matching capability. `capability` is kept as a
 *    back-compat fallback for callers that have not yet migrated to `context`.
 *  - Capability contexts default to listing only members with that flag, plus a "Ver todos" Switch
 *    that lists everyone. Non-capability contexts list everyone with no toggle.
 *  - Grant-on-select: picking (via "Ver todos") a member lacking the required capability shows a
 *    confirmation; on confirm the capability is granted (useUpdateMember) then the member selected.
 *  - Header: a fixed title ("Selecionar Pessoa") plus a per-context subtitle.
 *  - Row secondary line varies by context: speaker/prayers → speech count + "Responsável por…";
 *    preside/conduct/lead_music/play_piano → none; be_recognized → calling only.
 *  - Per-row edit (member:write) opens PersonEditor; deletion now lives in PersonEditor (no per-row
 *    trash). An "add person" entry creates a new member.
 *  - Selecting is gated by agenda:write / speech:assign; observers are view-only.
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
import { AppSwitch } from './AppSwitch';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { SearchInput } from './SearchInput';
import { CheckSquareIcon, SquareIcon, PencilIcon, PlusIcon } from './icons';
import {
  useMembers,
  useUpdateMember,
  getResponsibleForMap,
  filterMembers,
} from '../hooks/useMembers';
import { useSpeechCounts } from '../hooks/useSpeechCounts';
import { PersonEditor, CAPABILITY_FIELD, type PeopleCapability } from './PersonEditor';
import type { Member } from '../types/database';

export type { PeopleCapability };

// --- Types ---

/** The selection context each call site opens the picker in (P2). */
export type PickerContext =
  | 'speaker'
  | 'opening_prayer'
  | 'closing_prayer'
  | 'preside'
  | 'conduct'
  | 'lead_music'
  | 'play_piano'
  | 'be_recognized';

/**
 * Maps a picker context to its effective capability. Speaker/prayer contexts have no capability
 * (list everyone, no toggle); the actor-role contexts map to the matching capability.
 */
export const CONTEXT_CAPABILITY: Record<PickerContext, PeopleCapability | null> = {
  speaker: null,
  opening_prayer: null,
  closing_prayer: null,
  preside: 'preside',
  conduct: 'conduct',
  lead_music: 'lead_music',
  play_piano: 'play_piano',
  be_recognized: 'be_recognized',
};

export interface PeoplePickerProps {
  visible: boolean;
  /** Selection context; drives title/subtitle and the effective capability. */
  context?: PickerContext;
  /** Back-compat capability context (fallback when `context` is not passed). */
  capability?: PeopleCapability;
  /** Multi-select mode (recognition). */
  multiSelect?: boolean;
  /** Currently selected member ids (highlight in single mode, checkbox in multi mode). */
  selectedIds?: string[];
  /** Single-select commit (per tap). Optional in draft multi-select (use onConfirmMulti). */
  onSelect?: (member: Member) => void;
  /**
   * Draft multi-select commit. When provided (with multiSelect), the picker holds selection locally:
   * taps toggle a draft, a header Save commits the full set here, and Cancel discards it. On Save the
   * user is asked whether to grant the context capability to all selected who lack it.
   */
  onConfirmMulti?: (members: Member[]) => void;
  onClose: () => void;
}

export function PeoplePicker({
  visible,
  context,
  capability,
  multiSelect = false,
  selectedIds,
  onSelect,
  onConfirmMulti,
  onClose,
}: PeoplePickerProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { hasPermission } = useAuth();

  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  // Draft multi-select: hold the selection locally so Cancel discards it and Save commits it once.
  const isDraft = multiSelect && !!onConfirmMulti;
  const [draftIds, setDraftIds] = useState<Set<string>>(() => new Set(selectedIds ?? []));
  // Re-seed the draft from the incoming selection each time the picker opens. Adjusted during
  // render (React's documented "changing state when a prop changes" pattern) rather than in an
  // effect: React re-runs the component before committing, so there is no cascading render.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setDraftIds(new Set(selectedIds ?? []));
  }

  const { data: allMembers } = useMembers();
  const { data: speechCounts } = useSpeechCounts();
  const updateMember = useUpdateMember();

  const canManage = hasPermission('member:write');
  const canSelect = hasPermission('agenda:write') || hasPermission('speech:assign');

  // Effective capability: context takes precedence, `capability` is the back-compat fallback.
  const effectiveCapability: PeopleCapability | null = context
    ? CONTEXT_CAPABILITY[context]
    : capability ?? null;
  const capabilityField = effectiveCapability ? CAPABILITY_FIELD[effectiveCapability] : null;

  // Secondary-line mode per context. preside/conduct/be_recognized → calling (always);
  // lead_music/play_piano → none; speaker/prayers (and undefined) → speech count + responsible.
  const secondaryMode: 'speech' | 'none' | 'calling' =
    context === 'be_recognized' || context === 'preside' || context === 'conduct'
      ? 'calling'
      : context === 'lead_music' || context === 'play_piano'
      ? 'none'
      : 'speech';

  const selectedSet = useMemo(
    () => (isDraft ? draftIds : new Set(selectedIds ?? [])),
    [isDraft, draftIds, selectedIds]
  );

  const responsibleForMap = useMemo(
    () => getResponsibleForMap(allMembers ?? []),
    [allMembers]
  );

  // Default to the capability-filtered list; "Ver todos" (showAll) or no capability lists everyone.
  // P7: in multiSelect with a non-empty search, already-selected members stay in the list even when
  // they don't match the filter (union of filtered results + selected).
  const rows = useMemo(() => {
    const list = allMembers ?? [];
    const scoped =
      capabilityField && !showAll
        ? list.filter((m) => m[capabilityField] === true)
        : list;
    if (!search.trim()) return scoped;
    const filtered = filterMembers(scoped, search, secondaryMode === 'calling');
    if (!multiSelect) return filtered;
    const filteredIds = new Set(filtered.map((m) => m.id));
    const keepSelected = list.filter((m) => selectedSet.has(m.id) && !filteredIds.has(m.id));
    return [...filtered, ...keepSelected];
  }, [allMembers, capabilityField, showAll, search, multiSelect, selectedSet, secondaryMode]);

  const resetTransient = useCallback(() => {
    setSearch('');
    setShowAll(false);
  }, []);

  const handleClose = useCallback(() => {
    resetTransient();
    setDraftIds(new Set(selectedIds ?? [])); // discard draft edits (Cancel undoes everything)
    onClose();
  }, [resetTransient, onClose, selectedIds]);

  const commitSelect = useCallback(
    (member: Member) => {
      onSelect?.(member);
      if (!multiSelect) {
        resetTransient();
      }
    },
    [onSelect, multiSelect, resetTransient]
  );

  // Draft multi-select: Save commits the whole set (and optionally grants the capability to those
  // selected who lack it).
  const handleSave = useCallback(() => {
    const selected = (allMembers ?? []).filter((m) => draftIds.has(m.id));
    const missing = capabilityField ? selected.filter((m) => m[capabilityField] !== true) : [];
    const commit = (grant: boolean) => {
      if (grant && capabilityField) {
        for (const m of missing) updateMember.mutate({ id: m.id, [capabilityField]: true });
      }
      onConfirmMulti?.(selected);
      resetTransient();
      onClose();
    };
    if (capabilityField && missing.length > 0) {
      Alert.alert(
        t('people.grantAllTitle'),
        t('people.grantAllMessage', {
          count: missing.length,
          capability: effectiveCapability ? t(`capabilities.${effectiveCapability}`) : '',
        }),
        [
          { text: t('common.no'), onPress: () => commit(false) },
          { text: t('common.yes'), onPress: () => commit(true) },
        ]
      );
    } else {
      commit(false);
    }
  }, [allMembers, draftIds, capabilityField, updateMember, onConfirmMulti, resetTransient, onClose, t, effectiveCapability]);

  const handleSelect = useCallback(
    (member: Member) => {
      if (!canSelect) return;
      // Draft multi-select: just toggle locally (bulk grant is offered on Save).
      if (isDraft) {
        setDraftIds((prev) => {
          const next = new Set(prev);
          if (next.has(member.id)) next.delete(member.id);
          else next.add(member.id);
          return next;
        });
        return;
      }
      // Grant-on-select: capability context + member missing the flag → confirm then grant.
      if (capabilityField && member[capabilityField] !== true) {
        Alert.alert(
          t('people.grantConfirmTitle'),
          t('people.grantConfirmMessage', {
            name: member.full_name,
            capability: effectiveCapability ? t(`capabilities.${effectiveCapability}`) : '',
          }),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('common.confirm'),
              onPress: () => {
                updateMember.mutate(
                  { id: member.id, [capabilityField]: true },
                  {
                    // Offline the write is queued and resolves null; select the member with the
                    // capability applied locally so the picker still does what was asked.
                    onSuccess: (saved) =>
                      commitSelect(saved ?? { ...member, [capabilityField]: true }),
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
    [canSelect, isDraft, capabilityField, effectiveCapability, t, updateMember, commitSelect]
  );

  const openEditor = useCallback((member: Member | null) => {
    setEditingMember(member);
    setEditorVisible(true);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Member }) => {
      const isSelected = selectedSet.has(item.id);
      const count = speechCounts[item.id] ?? 0;
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
                    {` (${item.informal_name})`}
                  </Text>
                ) : null}
              </Text>

              {/* P4: speaker/prayer — speech count (>0) + "Responsável por…", no functions. */}
              {secondaryMode === 'speech' ? (
                <>
                  {count > 0 ? (
                    <Text style={[styles.meta, { color: colors.textSecondary }]}>
                      {t('members.speechCount', { count })}
                    </Text>
                  ) : null}
                  {responsibleFor && responsibleFor.length > 0 ? (
                    <Text
                      style={[styles.meta, { color: colors.textSecondary }]}
                      testID={`people-picker-responsible-${item.id}`}
                    >
                      {t('people.responsibleFor', { names: responsibleFor.join(', ') })}
                    </Text>
                  ) : null}
                </>
              ) : null}

              {/* preside/conduct/be_recognized — calling (when set); no functions. */}
              {secondaryMode === 'calling' && item.calling ? (
                <Text
                  style={[styles.meta, { color: colors.textSecondary }]}
                  testID={`people-picker-calling-${item.id}`}
                >
                  {item.calling}
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
            </View>
          ) : null}
        </View>
      );
    },
    [
      selectedSet,
      speechCounts,
      responsibleForMap,
      secondaryMode,
      colors,
      canSelect,
      canManage,
      multiSelect,
      t,
      handleSelect,
      openEditor,
    ]
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Top bar: Cancel (left) / centered title / right spacer (mirrors PersonEditor). */}
        <View style={[styles.topBar, { borderBottomColor: colors.divider }]}>
          <Pressable testID="people-picker-close" onPress={handleClose} style={styles.topBarBtn}>
            <Text style={[styles.topBarBtnText, { color: colors.primary }]}>
              {t('common.cancel')}
            </Text>
          </Pressable>
          <Text
            testID="people-picker-title"
            style={[styles.title, { color: colors.text }]}
            numberOfLines={1}
          >
            {t('people.pickerTitle')}
          </Text>
          {isDraft ? (
            <Pressable
              testID="people-picker-save"
              onPress={handleSave}
              style={[styles.topBarBtn, styles.topBarBtnRight]}
              disabled={!canSelect}
            >
              <Text style={[styles.topBarBtnText, styles.topBarBtnSave, { color: canSelect ? colors.primary : colors.textTertiary }]}>
                {t('common.save')}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.topBarBtn} />
          )}
        </View>

        {/* Search + compact add button (member:write only). */}
        <View style={styles.searchRow}>
          <SearchInput
            testID="people-picker-search"
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder={t('common.search')}
            autoCapitalize="words"
            // Opens ready to type, matching TopicSelectorModal.
            autoFocus
          />
          {canManage ? (
            <Pressable
              testID="people-picker-add"
              accessibilityLabel={t('people.addPerson')}
              onPress={() => openEditor(null)}
              hitSlop={8}
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
            >
              <PlusIcon size={18} color={colors.onPrimary} />
              <Text style={[styles.addBtnText, { color: colors.onPrimary }]}>
                {t('people.add')}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* Subtitle (left) + "Ver todos" toggle (right, capability contexts only). */}
        {context ? (
          <View style={styles.subtitleRow}>
            <Text
              testID="people-picker-subtitle"
              style={[styles.subtitle, { color: colors.text }]}
            >
              {t(`people.subtitles.${context}`)}
            </Text>
            {effectiveCapability ? (
              <View style={styles.viewAllControl}>
                <Text style={[styles.viewAllText, { color: colors.textSecondary }]}>
                  {t('people.viewAll')}
                </Text>
                <AppSwitch
                  testID="people-picker-view-all"
                  style={styles.viewAllSwitch}
                  value={showAll}
                  onValueChange={setShowAll}
                />
              </View>
            ) : null}
          </View>
        ) : effectiveCapability ? (
          <View style={styles.subtitleRow}>
            <View style={styles.subtitleSpacer} />
            <View style={styles.viewAllControl}>
              <Text style={[styles.viewAllText, { color: colors.text }]}>
                {t('people.viewAll')}
              </Text>
              <AppSwitch
                testID="people-picker-view-all"
                value={showAll}
                onValueChange={setShowAll}
              />
            </View>
          </View>
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
          // Editing ignores this — PersonEditor keeps the stored flags; the rule lives there.
          initialCapability={effectiveCapability ?? null}
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topBarBtn: {
    paddingVertical: 8,
    minWidth: 72,
  },
  topBarBtnRight: {
    alignItems: 'flex-end',
  },
  topBarBtnText: {
    fontSize: 16,
  },
  topBarBtnSave: {
    fontWeight: '700',
  },
  title: {
    flex: 1,
    fontSize: 19,
    fontWeight: '600',
    textAlign: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  subtitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  subtitleSpacer: {
    flex: 1,
  },
  viewAllControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  viewAllSwitch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
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
