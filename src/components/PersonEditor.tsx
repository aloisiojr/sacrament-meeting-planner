/**
 * PersonEditor (v2.0 unified people model): create/edit a person.
 *
 * Opened from the unified PeoplePicker. Edits identity
 * (full_name, informal_name, country_code, phone), the 5 capability flags, and contact delegation
 * (`contact_via_responsible` + a `responsible_id` picker that EXCLUDES self). When delegation is on,
 * a responsible must be chosen. Persists via `useCreateMember` / `useUpdateMember`.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  FlatList,
  Pressable,
  Modal,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { SearchInput } from './SearchInput';
import { CheckSquareIcon, SquareIcon } from './icons';
import {
  useMembers,
  useCreateMember,
  useUpdateMember,
  filterMembers,
} from '../hooks/useMembers';
import type { Member } from '../types/database';

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

// --- Types ---

export interface PersonEditorProps {
  visible: boolean;
  /** Member being edited; `null`/`undefined` = create a new person. */
  member?: Member | null;
  /** Prefilled name when creating (e.g. the text typed in the picker search). */
  initialName?: string;
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
  onClose,
  onSaved,
}: PersonEditorProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [fullName, setFullName] = useState('');
  const [informalName, setInformalName] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [phone, setPhone] = useState('');
  const [caps, setCaps] = useState<CapabilityState>(EMPTY_CAPS);
  const [contactViaResponsible, setContactViaResponsible] = useState(false);
  const [responsibleId, setResponsibleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [responsiblePickerVisible, setResponsiblePickerVisible] = useState(false);
  const [responsibleSearch, setResponsibleSearch] = useState('');

  const { data: allMembers } = useMembers();
  const createMember = useCreateMember();
  const updateMember = useUpdateMember();

  // (Re)initialize the form whenever the editor opens or the target member changes.
  useEffect(() => {
    if (!visible) return;
    if (member) {
      setFullName(member.full_name);
      setInformalName(member.informal_name ?? '');
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
      setInformalName('');
      setCountryCode('');
      setPhone('');
      setCaps(EMPTY_CAPS);
      setContactViaResponsible(false);
      setResponsibleId(null);
    }
    setError(null);
    setResponsiblePickerVisible(false);
    setResponsibleSearch('');
  }, [visible, member, initialName]);

  const responsibleMember = useMemo(
    () => (allMembers ?? []).find((m) => m.id === responsibleId) ?? null,
    [allMembers, responsibleId]
  );

  // Candidates for the responsible picker: everyone except the person being edited.
  const responsibleCandidates = useMemo(() => {
    const list = (allMembers ?? []).filter((m) => m.id !== member?.id);
    return responsibleSearch.trim() ? filterMembers(list, responsibleSearch) : list;
  }, [allMembers, member?.id, responsibleSearch]);

  const toggleCap = useCallback((cap: PeopleCapability) => {
    setCaps((prev) => ({ ...prev, [cap]: !prev[cap] }));
  }, []);

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

    const fields = {
      full_name: trimmedName,
      informal_name: informalName.trim() || null,
      country_code: countryCode.trim(),
      phone: phone.trim() || null,
      can_preside: caps.preside,
      can_conduct: caps.conduct,
      can_lead_music: caps.lead_music,
      can_play_piano: caps.play_piano,
      can_be_recognized: caps.be_recognized,
      contact_via_responsible: contactViaResponsible,
      responsible_id: contactViaResponsible ? responsibleId : null,
    };

    const onSuccess = (saved: Member) => {
      onSaved?.(saved);
      onClose();
    };

    if (member) {
      updateMember.mutate({ id: member.id, ...fields }, { onSuccess });
    } else {
      createMember.mutate(fields, { onSuccess });
    }
  }, [
    fullName,
    informalName,
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
            placeholder={t('members.fullName')}
            placeholderTextColor={colors.placeholder}
            autoCapitalize="words"
          />

          <TextInput
            testID="person-editor-informal-name"
            style={[styles.input, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
            value={informalName}
            onChangeText={setInformalName}
            placeholder={t('members.informalNamePlaceholder')}
            placeholderTextColor={colors.placeholder}
            autoCapitalize="words"
          />

          <View style={styles.phoneRow}>
            <View style={styles.countryCodeCol}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('members.countryCode')}
              </Text>
              <TextInput
                testID="person-editor-country-code"
                style={[styles.input, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
                value={countryCode}
                onChangeText={setCountryCode}
                placeholder="+1"
                placeholderTextColor={colors.placeholder}
                keyboardType="phone-pad"
              />
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

          {/* Capabilities */}
          <Text style={[styles.sectionHeader, { color: colors.text }]}>
            {t('personEditor.capabilities')}
          </Text>
          {CAPABILITY_ORDER.map((cap) => (
            <Pressable
              key={cap}
              testID={`person-editor-cap-${cap}`}
              style={styles.toggleRow}
              onPress={() => toggleCap(cap)}
            >
              {caps[cap] ? (
                <CheckSquareIcon size={22} color={colors.primary} />
              ) : (
                <SquareIcon size={22} color={colors.textSecondary} />
              )}
              <Text style={[styles.toggleLabel, { color: colors.text }]}>
                {t(`capabilities.${cap}`)}
              </Text>
            </Pressable>
          ))}

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
        </ScrollView>
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
