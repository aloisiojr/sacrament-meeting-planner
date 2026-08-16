/**
 * PersonEditor (v2.0 unified people model): create/edit a person.
 *
 * Opened from the unified PeoplePicker. Edits identity
 * (full_name, informal_name, country_code, phone), the 5 capability flags, and contact delegation
 * (`contact_via_responsible` + a `responsible_id` picker that EXCLUDES self). When delegation is on,
 * a responsible must be chosen. Persists via `useCreateMember` / `useUpdateMember`.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
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
import {
  CheckSquareIcon,
  SquareIcon,
  CrownIcon,
  UsersIcon,
  MusicIcon,
  PianoIcon,
  BadgeCheckIcon,
  type IconProps,
} from './icons';
import {
  useMembers,
  useCreateMember,
  useUpdateMember,
  useDeleteMember,
  getResponsibleForMap,
  filterMembers,
} from '../hooks/useMembers';
import { COUNTRY_CODES, getFlagForCode } from '../lib/countryCodes';
import { getFirstName, reconcileInformalName } from '../lib/nameUtils';
import type { Member } from '../types/database';
import { KeyboardAvoider } from './KeyboardAvoider';

// --- Capability field mapping (shared shape with PeoplePicker) ---

export type PeopleCapability =
  | 'preside'
  | 'conduct'
  | 'lead_music'
  | 'play_piano'
  | 'be_recognized';

export const CAPABILITY_ORDER: PeopleCapability[] = [
  'preside',
  'conduct',
  'lead_music',
  'play_piano',
  'be_recognized',
];

export const CAPABILITY_FIELD: Record<PeopleCapability, keyof Member> = {
  preside: 'can_preside',
  conduct: 'can_conduct',
  lead_music: 'can_lead_music',
  play_piano: 'can_play_piano',
  be_recognized: 'can_be_recognized',
};

/** Leading icon for each capability row (E3). */
const CAPABILITY_ICON: Record<PeopleCapability, React.FC<IconProps>> = {
  preside: CrownIcon,
  conduct: UsersIcon,
  lead_music: MusicIcon,
  play_piano: PianoIcon,
  be_recognized: BadgeCheckIcon,
};

// --- Types ---

export interface PersonEditorProps {
  visible: boolean;
  /** Member being edited; `null`/`undefined` = create a new person. */
  member?: Member | null;
  /** Prefilled name when creating (e.g. the text typed in the picker search). */
  initialName?: string;
  /**
   * Capability to switch ON when creating. Someone adding a person from the "who can play the
   * piano" picker means that person plays the piano — making them tick the box again is friction.
   * Ignored when editing an existing member, whose stored flags win.
   */
  initialCapability?: PeopleCapability | null;
  onClose: () => void;
  /** Called after a successful create/update with the saved member. */
  onSaved?: (member: Member) => void;
}

interface CapabilityState {
  preside: boolean;
  conduct: boolean;
  lead_music: boolean;
  play_piano: boolean;
  be_recognized: boolean;
}

const EMPTY_CAPS: CapabilityState = {
  preside: false,
  conduct: false,
  lead_music: false,
  play_piano: false,
  be_recognized: false,
};

export function PersonEditor({
  visible,
  member,
  initialName,
  initialCapability,
  onClose,
  onSaved,
}: PersonEditorProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { hasPermission } = useAuth();

  const [fullName, setFullName] = useState('');
  const [informalName, setInformalName] = useState('');
  // Last full name the informal field was reconciled against — the rule compares the informal
  // name to the PREVIOUS first name, which the current `fullName` no longer holds.
  const [lastFullName, setLastFullName] = useState('');
  const [calling, setCalling] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [phone, setPhone] = useState('');
  const [caps, setCaps] = useState<CapabilityState>(EMPTY_CAPS);
  const [contactViaResponsible, setContactViaResponsible] = useState(false);
  const [responsibleId, setResponsibleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [responsiblePickerVisible, setResponsiblePickerVisible] = useState(false);
  const [responsibleSearch, setResponsibleSearch] = useState('');
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  const { data: allMembers } = useMembers();
  const createMember = useCreateMember();
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();

  // (Re)initialize the form whenever the editor opens or the target member changes. Adjusted
  // during render (React's documented "changing state when a prop changes" pattern) rather than
  // in an effect: React re-runs the component before committing, so the seeded values are in the
  // first painted frame instead of a second render pass.
  const [initKey, setInitKey] = useState<string | null>(null);
  const currentKey = visible
    ? `${member?.id ?? 'new'}:${initialName ?? ''}:${initialCapability ?? ''}`
    : null;
  if (currentKey !== initKey) {
    setInitKey(currentKey);
    if (visible) {
      if (member) {
        setFullName(member.full_name);
        setInformalName(member.informal_name ?? '');
        setLastFullName(member.full_name);
        setCalling(member.calling ?? '');
        setCountryCode(member.country_code ?? '');
        setPhone(member.phone ?? '');
        setCaps({
          preside: member.can_preside,
          conduct: member.can_conduct,
          lead_music: member.can_lead_music,
          play_piano: member.can_play_piano,
          be_recognized: member.can_be_recognized,
        });
          setContactViaResponsible(member.contact_via_responsible);
          setResponsibleId(member.responsible_id);
      } else {
        setFullName(initialName ?? '');
        setInformalName(getFirstName(initialName ?? ''));
        setLastFullName(initialName ?? '');
        setCalling('');
        setCountryCode('');
        setPhone('');
        setCaps(initialCapability ? { ...EMPTY_CAPS, [initialCapability]: true } : EMPTY_CAPS);
        setContactViaResponsible(false);
        setResponsibleId(null);
      }
      setError(null);
      setResponsiblePickerVisible(false);
      setResponsibleSearch('');
      setCountryPickerVisible(false);
      setCountrySearch('');
    }
  }

  /**
   * Apply "the informal name follows the first name" and return the value to save with.
   *
   * Runs on blur AND on save: tapping Save does not blur a focused TextInput (the button lives in
   * the header, outside the ScrollView), so a user who edits the name and saves straight away would
   * otherwise keep the informal name of the OLD first name — the very thing this rule exists to fix.
   * Returns the reconciled informal name so the save path does not have to wait for a re-render.
   */
  const reconcileInformal = useCallback((): string => {
    // A blank name commits nothing — not even the reference. Advancing it here would erase the
    // previous first name, and a later rename would no longer be recognised as still tracking it.
    if (!getFirstName(fullName)) return informalName;

    const next = reconcileInformalName({
      fullName,
      informalName,
      previousFullName: lastFullName,
    });
    setLastFullName(fullName);
    if (next === null) return informalName;
    setInformalName(next);
    return next;
  }, [fullName, informalName, lastFullName]);

  const responsibleMember = useMemo(
    () => (allMembers ?? []).find((m) => m.id === responsibleId) ?? null,
    [allMembers, responsibleId]
  );

  // Candidates for the responsible picker: everyone except the person being edited.
  const responsibleCandidates = useMemo(() => {
    const list = (allMembers ?? []).filter((m) => m.id !== member?.id);
    return responsibleSearch.trim() ? filterMembers(list, responsibleSearch) : list;
  }, [allMembers, member?.id, responsibleSearch]);

  // Read-only list of members this person is responsible for (E4). Only when editing.
  const responsibleForNames = useMemo(() => {
    if (!member) return [];
    return getResponsibleForMap(allMembers ?? []).get(member.id) ?? [];
  }, [allMembers, member]);

  // Country entries filtered by the picker search (matches label or dial code).
  const countryCandidates = useMemo(() => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return COUNTRY_CODES;
    return COUNTRY_CODES.filter(
      (c) => c.label.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [countrySearch]);

  const canDelete = !!member && hasPermission('member:write');

  const toggleCap = useCallback((cap: PeopleCapability) => {
    setCaps((prev) => ({ ...prev, [cap]: !prev[cap] }));
  }, []);

  const handleDelete = useCallback(() => {
    if (!member) return;
    Alert.alert(
      t('personEditor.deletePerson'),
      t('personEditor.deletePersonConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('personEditor.deletePerson'),
          style: 'destructive',
          onPress: () => {
            deleteMember.mutate(
              { memberId: member.id, memberName: member.full_name },
              { onSuccess: () => onClose() }
            );
          },
        },
      ]
    );
  }, [member, deleteMember, onClose, t]);

  const handleSave = useCallback(() => {
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setError(t('personEditor.nameRequired'));
      return;
    }
    if (contactViaResponsible && !responsibleId) {
      setError(t('personEditor.responsibleRequired'));
      return;
    }

    // Saving is also a commit point for the informal-name rule: the Save button does not blur the
    // name field, so without this an edited name would be saved next to the old first name.
    const reconciledInformal = reconcileInformal();

    const fields = {
      full_name: trimmedName,
      informal_name: reconciledInformal.trim() || null,
      calling: calling.trim() || null,
      // Default to the app/DB default (+55) rather than persisting an empty country code.
      country_code: countryCode.trim() || '+55',
      phone: phone.trim() || null,
      can_preside: caps.preside,
      can_conduct: caps.conduct,
      can_lead_music: caps.lead_music,
      can_play_piano: caps.play_piano,
      can_be_recognized: caps.be_recognized,
      contact_via_responsible: contactViaResponsible,
      responsible_id: contactViaResponsible ? responsibleId : null,
    };

    // `saved` is null when the device was offline and the write was queued for replay. The edit is
    // not lost, so the modal still closes — but there is no stored row to hand to onSaved.
    const onSuccess = (saved: Member | null) => {
      if (saved) onSaved?.(saved);
      onClose();
    };

    // Surface save failures instead of leaving the modal open with no feedback.
    const onError = () => {
      setError(t('personEditor.saveFailed'));
    };

    if (member) {
      updateMember.mutate({ id: member.id, ...fields }, { onSuccess, onError });
    } else {
      createMember.mutate(fields, { onSuccess, onError });
    }
  }, [
    reconcileInformal,
    fullName,
    calling,
    countryCode,
    phone,
    caps,
    contactViaResponsible,
    responsibleId,
    member,
    createMember,
    updateMember,
    onSaved,
    onClose,
    t,
  ]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.divider }]}>
          <Pressable onPress={onClose} testID="person-editor-cancel" style={styles.headerBtn}>
            <Text style={[styles.headerBtnText, { color: colors.primary }]}>
              {t('common.cancel')}
            </Text>
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {member ? t('personEditor.titleEdit') : t('personEditor.titleNew')}
          </Text>
          <Pressable onPress={handleSave} testID="person-editor-save" style={styles.headerBtn}>
            <Text style={[styles.headerBtnText, { color: colors.primary, fontWeight: '600' }]}>
              {t('common.save')}
            </Text>
          </Pressable>
        </View>

                  <KeyboardAvoider testID="person-editor-keyboard-avoider">
  <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.errorContainer }]}>
                <Text style={[styles.errorText, { color: colors.error }]} testID="person-editor-error">
                  {error}
                </Text>
              </View>
            ) : null}

            {/* Identity */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t('members.fullName')}
            </Text>
            <TextInput
              testID="person-editor-full-name"
              style={[styles.input, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
              value={fullName}
              onChangeText={setFullName}
              onBlur={reconcileInformal}
              placeholder={t('members.fullName')}
              placeholderTextColor={colors.placeholder}
              autoCapitalize="words"
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t('personEditor.informalNameLabel')}
            </Text>
            <TextInput
              testID="person-editor-informal-name"
              style={[styles.input, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
              value={informalName}
              onChangeText={setInformalName}
              placeholder={t('members.informalNamePlaceholder')}
              placeholderTextColor={colors.placeholder}
              autoCapitalize="words"
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t('personEditor.callingLabel')}
            </Text>
            <TextInput
              testID="person-editor-calling"
              style={[styles.input, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
              value={calling}
              onChangeText={setCalling}
              placeholder={t('personEditor.callingPlaceholder')}
              placeholderTextColor={colors.placeholder}
              autoCapitalize="words"
            />

            <View style={styles.phoneRow}>
              <View style={styles.countryCodeCol}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  {t('members.countryCode')}
                </Text>
                <Pressable
                  testID="person-editor-country-code"
                  style={[styles.selector, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
                  onPress={() => setCountryPickerVisible(true)}
                >
                  <Text
                    style={[styles.selectorText, { color: countryCode ? colors.text : colors.placeholder }]}
                    numberOfLines={1}
                  >
                    {countryCode ? `${getFlagForCode(countryCode)} ${countryCode}` : '+55'}
                  </Text>
                </Pressable>
              </View>
              <View style={styles.phoneCol}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  {t('members.phone')}
                </Text>
                <TextInput
                  testID="person-editor-phone"
                  style={[styles.input, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder={t('members.phone')}
                  placeholderTextColor={colors.placeholder}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Permissions (functions) */}
            <Text style={[styles.sectionHeader, { color: colors.text }]}>
              {t('personEditor.permissions')}
            </Text>
            {CAPABILITY_ORDER.map((cap) => {
              const CapIcon = CAPABILITY_ICON[cap];
              return (
                <View key={cap} testID={`person-editor-cap-${cap}`} style={styles.capRow}>
                  <CapIcon size={22} color={colors.textSecondary} />
                  <Text style={[styles.capLabel, { color: colors.text }]}>
                    {t(`capabilities.${cap}`)}
                  </Text>
                  <AppSwitch
                    testID={`person-editor-cap-switch-${cap}`}
                    value={caps[cap]}
                    onValueChange={() => toggleCap(cap)}
                  />
                </View>
              );
            })}

            {/* Delegation */}
            <Text style={[styles.sectionHeader, { color: colors.text }]}>
              {t('personEditor.delegation')}
            </Text>
            <Pressable
              testID="person-editor-contact-via-responsible"
              style={styles.toggleRow}
              onPress={() => setContactViaResponsible((v) => !v)}
            >
              {contactViaResponsible ? (
                <CheckSquareIcon size={22} color={colors.primary} />
              ) : (
                <SquareIcon size={22} color={colors.textSecondary} />
              )}
              <Text style={[styles.toggleLabel, { color: colors.text }]}>
                {t('personEditor.contactViaResponsible')}
              </Text>
            </Pressable>

            {contactViaResponsible ? (
              <>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  {t('personEditor.responsible')}
                </Text>
                <Pressable
                  testID="person-editor-responsible-select"
                  style={[styles.selector, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
                  onPress={() => setResponsiblePickerVisible(true)}
                >
                  <Text
                    style={[styles.selectorText, { color: responsibleMember ? colors.text : colors.placeholder }]}
                    numberOfLines={1}
                  >
                    {responsibleMember?.full_name ?? t('personEditor.selectResponsible')}
                  </Text>
                </Pressable>
              </>
            ) : null}

            {/* Responsible-for list (read-only, editing an existing member with dependents) */}
            {responsibleForNames.length > 0 ? (
              <View testID="person-editor-responsible-for">
                <Text style={[styles.sectionHeader, { color: colors.text }]}>
                  {t('personEditor.responsibleForList')}
                </Text>
                {responsibleForNames.map((name) => (
                  <Text
                    key={name}
                    style={[styles.responsibleForItem, { color: colors.textSecondary }]}
                  >
                    {name}
                  </Text>
                ))}
              </View>
            ) : null}

            {/* Destructive delete (editing an existing member with member:write) */}
            {canDelete ? (
              <Pressable
                testID="person-editor-delete"
                style={[styles.deleteBtn, { borderColor: colors.error }]}
                onPress={handleDelete}
              >
                <Text style={[styles.deleteBtnText, { color: colors.error }]}>
                  {t('personEditor.deletePerson')}
                </Text>
              </Pressable>
            ) : null}
          </ScrollView>
          </KeyboardAvoider>
      </View>

      {/* Responsible picker (excludes self) */}
      <Modal
        visible={responsiblePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setResponsiblePickerVisible(false)}
      >
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.pickerHeader}>
            <SearchInput
              testID="person-editor-responsible-search"
              style={styles.searchInput}
              value={responsibleSearch}
              onChangeText={setResponsibleSearch}
              placeholder={t('common.search')}
              autoCapitalize="words"
            />
            <Pressable
              testID="person-editor-responsible-close"
              onPress={() => setResponsiblePickerVisible(false)}
              style={styles.headerBtn}
            >
              <Text style={[styles.headerBtnText, { color: colors.primary }]}>
                {t('common.close')}
              </Text>
            </Pressable>
          </View>
          <FlatList
            data={responsibleCandidates}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                testID={`person-editor-responsible-item-${item.id}`}
                style={[styles.memberItem, { borderBottomColor: colors.divider }]}
                onPress={() => {
                  setResponsibleId(item.id);
                  setResponsiblePickerVisible(false);
                  setResponsibleSearch('');
                }}
              >
                <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
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

      {/* Country code picker (searchable) */}
      <Modal
        visible={countryPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCountryPickerVisible(false)}
      >
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.pickerHeader}>
            <SearchInput
              testID="person-editor-country-search"
              style={styles.searchInput}
              value={countrySearch}
              onChangeText={setCountrySearch}
              placeholder={t('personEditor.countrySearch')}
            />
            <Pressable
              testID="person-editor-country-close"
              onPress={() => setCountryPickerVisible(false)}
              style={styles.headerBtn}
            >
              <Text style={[styles.headerBtnText, { color: colors.primary }]}>
                {t('common.close')}
              </Text>
            </Pressable>
          </View>
          <Text style={[styles.pickerTitle, { color: colors.text }]}>
            {t('personEditor.selectCountry')}
          </Text>
          <FlatList
            data={countryCandidates}
            keyExtractor={(item, index) => `${item.code}-${index}`}
            renderItem={({ item }) => (
              <Pressable
                testID={`person-editor-country-item-${item.label}`}
                style={[styles.memberItem, { borderBottomColor: colors.divider }]}
                onPress={() => {
                  setCountryCode(item.code);
                  setCountryPickerVisible(false);
                  setCountrySearch('');
                }}
              >
                <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
                  {`${item.flag}  ${item.label}`}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    paddingVertical: 8,
    minWidth: 64,
  },
  headerBtnText: {
    fontSize: 16,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  body: {
    padding: 16,
    paddingBottom: 48,
  },
  errorBox: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
  },
  label: {
    fontSize: 13,
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 12,
  },
  countryCodeCol: {
    width: 110,
  },
  phoneCol: {
    flex: 1,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  toggleLabel: {
    fontSize: 15,
  },
  capRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  capLabel: {
    flex: 1,
    fontSize: 15,
  },
  responsibleForItem: {
    fontSize: 15,
    paddingVertical: 4,
  },
  deleteBtn: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  selector: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
    marginBottom: 12,
  },
  selectorText: {
    fontSize: 15,
  },
  pickerHeader: {
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
