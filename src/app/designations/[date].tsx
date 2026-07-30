/**
 * Designation editor — full-screen route for one support/release (Apoio/Desobrigação/Avanço/
 * Novo Membro). Root-level route pushed OVER the tabs (sibling of speeches/[date].tsx).
 *
 * Flow: choose type → choose person (PeoplePicker) → type-specific field (calling for
 * sustain/release, office for priesthood, none for new_member). On save it writes the whole
 * `designations` array back onto the agenda and, for sustain/release linked to a member,
 * optionally updates that member's calling.
 *
 * Navigate here with:
 *   router.push({ pathname: '/designations/[date]', params: { date } })            // new item
 *   router.push({ pathname: '/designations/[date]', params: { date, index } })     // edit item
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemedErrorBoundary } from '../../components/ErrorBoundary';
import { PeoplePicker } from '../../components/PeoplePicker';
import { formatFullDate } from '../../lib/dateUtils';
import { getCurrentLanguage } from '../../i18n';
import { useAgenda, useUpdateAgendaByDate } from '../../hooks/useAgenda';
import { useUpdateMember } from '../../hooks/useMembers';
import {
  DESIGNATION_TYPES,
  PRIESTHOOD_OFFICES,
  priesthoodOfficeLabel,
} from '../../lib/designations';
import type {
  Designation,
  DesignationType,
  PriesthoodOffice,
  Member,
} from '../../types/database';

function DesignationEditContent() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string; index?: string }>();
  const date = params.date ?? '';
  const editIndex =
    params.index != null && params.index !== '' ? parseInt(String(params.index), 10) : null;

  const { data: agenda } = useAgenda(date);
  const updateAgenda = useUpdateAgendaByDate();
  const updateMember = useUpdateMember();

  const designations = useMemo<Designation[]>(() => agenda?.designations ?? [], [agenda]);
  const existing = editIndex != null ? designations[editIndex] ?? null : null;

  const [type, setType] = useState<DesignationType | null>(existing?.type ?? null);
  const [personName, setPersonName] = useState(existing?.person_name ?? '');
  const [memberId, setMemberId] = useState<string | null>(existing?.member_id ?? null);
  const [calling, setCalling] = useState(existing?.calling ?? '');
  const [office, setOffice] = useState<PriesthoodOffice | null>(existing?.office ?? null);
  const [pickerVisible, setPickerVisible] = useState(false);

  const dateLabel = useMemo(
    () => (date ? formatFullDate(date, getCurrentLanguage()) : ''),
    [date]
  );

  const isCallingType = type === 'sustain' || type === 'release';
  const canSave = !!type && personName.trim().length > 0;

  const handleSelectType = useCallback((next: DesignationType) => {
    setType(next);
    if (next !== 'priesthood') setOffice(null);
  }, []);

  const handleSelectPerson = useCallback((member: Member) => {
    setPersonName(member.full_name);
    setMemberId(member.id);
    // Prefill the calling with the member's current calling (editable) — AC8.
    setCalling(member.calling ?? '');
    setPickerVisible(false);
  }, []);

  const persist = useCallback(() => {
    if (!type) return;
    const item: Designation = {
      type,
      person_name: personName.trim(),
      member_id: memberId,
      calling: isCallingType && calling.trim() ? calling.trim() : null,
      office: type === 'priesthood' ? office : null,
    };
    const next = [...designations];
    if (editIndex != null && editIndex >= 0 && editIndex < next.length) next[editIndex] = item;
    else next.push(item);
    updateAgenda.mutate({ sundayDate: date, updates: { designations: next } });
  }, [
    type,
    personName,
    memberId,
    isCallingType,
    calling,
    office,
    designations,
    editIndex,
    updateAgenda,
    date,
  ]);

  const handleSave = useCallback(() => {
    if (!canSave || !type) return;
    // AC11/AC13: only offer the calling update for sustain/release linked to a member.
    if (isCallingType && memberId) {
      Alert.alert(
        t('agenda.designations.updateCallingTitle'),
        t('agenda.designations.updateCallingMessage', { name: personName.trim() }),
        [
          {
            text: t('agenda.designations.updateCallingSkip'),
            onPress: () => {
              persist();
              router.back();
            },
          },
          {
            text: t('agenda.designations.updateCallingConfirm'),
            onPress: () => {
              persist();
              updateMember.mutate({
                id: memberId,
                calling: type === 'sustain' && calling.trim() ? calling.trim() : null,
              });
              router.back();
            },
          },
        ]
      );
      return;
    }
    persist();
    router.back();
  }, [canSave, type, isCallingType, memberId, t, personName, persist, router, updateMember, calling]);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          hitSlop={12}
          testID="designation-edit-back-button"
        >
          <Text style={[styles.backButton, { color: colors.primary }]}>{t('common.back')}</Text>
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {dateLabel}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {t('agenda.designations.editTitle')}
          </Text>
        </View>
        <Pressable
          onPress={handleSave}
          disabled={!canSave}
          accessibilityRole="button"
          hitSlop={12}
          testID="designation-edit-save-button"
        >
          <Text
            style={[styles.saveButton, { color: canSave ? colors.primary : colors.textTertiary }]}
          >
            {t('common.save')}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Type — AC6 */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          {t('agenda.designations.typeLabel')}
        </Text>
        {DESIGNATION_TYPES.map((opt) => {
          const selected = type === opt;
          return (
            <Pressable
              key={opt}
              testID={`designation-type-${opt}`}
              onPress={() => handleSelectType(opt)}
              style={[
                styles.optionRow,
                { borderColor: selected ? colors.primary : colors.border },
                selected && { backgroundColor: colors.surfaceVariant },
              ]}
            >
              <Text style={[styles.optionText, { color: colors.text }]}>
                {t(`agenda.designations.typeOption.${opt}`)}
              </Text>
            </Pressable>
          );
        })}

        {/* 2. Person — AC7 (shown once a type is chosen) */}
        {type && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              {t('agenda.designations.personLabel')}
            </Text>
            <Pressable
              testID="designation-person-selector"
              onPress={() => setPickerVisible(true)}
              style={[styles.selectorField, { borderColor: colors.border }]}
            >
              <Text
                style={[
                  styles.selectorText,
                  { color: personName ? colors.text : colors.textTertiary },
                ]}
                numberOfLines={1}
              >
                {personName || t('agenda.designations.personPlaceholder')}
              </Text>
            </Pressable>
          </>
        )}

        {/* 3a. Calling (sustain/release) — AC8 */}
        {type && isCallingType && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              {t('agenda.designations.callingLabel')}
            </Text>
            <TextInput
              testID="designation-calling-input"
              style={[styles.textInput, { color: colors.text, borderColor: colors.border }]}
              value={calling}
              onChangeText={setCalling}
              placeholder={t('agenda.designations.callingPlaceholder')}
              placeholderTextColor={colors.textTertiary}
            />
          </>
        )}

        {/* 3b. Office (priesthood) — AC9 */}
        {type === 'priesthood' && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              {t('agenda.designations.officeLabel')}
            </Text>
            {PRIESTHOOD_OFFICES.map((opt) => {
              const selected = office === opt;
              return (
                <Pressable
                  key={opt}
                  testID={`designation-office-${opt}`}
                  onPress={() => setOffice(opt)}
                  style={[
                    styles.optionRow,
                    { borderColor: selected ? colors.primary : colors.border },
                    selected && { backgroundColor: colors.surfaceVariant },
                  ]}
                >
                  <Text style={[styles.optionText, { color: colors.text }]}>
                    {priesthoodOfficeLabel(opt, t)}
                  </Text>
                </Pressable>
              );
            })}
          </>
        )}
        {/* new_member (AC10): no extra field. */}
      </ScrollView>

      <PeoplePicker
        visible={pickerVisible}
        context="speaker"
        onSelect={handleSelectPerson}
        onClose={() => setPickerVisible(false)}
      />
    </SafeAreaView>
  );
}

export default function DesignationEditScreen() {
  return (
    <ThemedErrorBoundary>
      <DesignationEditContent />
    </ThemedErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    fontSize: 16,
    width: 60,
  },
  saveButton: {
    fontSize: 16,
    width: 60,
    textAlign: 'right',
    fontWeight: '600',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionRow: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 8,
  },
  optionText: {
    fontSize: 15,
  },
  selectorField: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  selectorText: {
    fontSize: 15,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
});
