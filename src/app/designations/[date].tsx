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

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  BackHandler,
  Keyboard,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
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
  const { hasPermission } = useAuth();
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
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // EST-11: the useState seeds above only see `existing` on the first render. With a cold cache
  // the agenda query has not resolved yet, so an EDIT would open blank and saving would overwrite
  // fields the user never saw. Until the agenda exists (`undefined` = still loading; `null` =
  // loaded, none yet) the screen shows a spinner and cannot save; when the edited item first
  // arrives, hydrate the fields from it exactly once.
  const isAgendaLoading = agenda === undefined;
  const hydratedRef = useRef(existing != null);
  useEffect(() => {
    if (hydratedRef.current || !existing) return;
    hydratedRef.current = true;
    setType(existing.type);
    setPersonName(existing.person_name);
    setMemberId(existing.member_id);
    setCalling(existing.calling ?? '');
    setOffice(existing.office);
  }, [existing]);

  const dateLabel = useMemo(
    () => (date ? formatFullDate(date, getCurrentLanguage()) : ''),
    [date]
  );

  const isCallingType = type === 'sustain' || type === 'release';
  // Gate saving by permission (defense-in-depth): an observer deep-linking here must not be
  // able to write the agenda. RLS is the real enforcement (P0-1); this hides the affordance.
  const canSave =
    hasPermission('agenda:write') &&
    !!type &&
    personName.trim().length > 0 &&
    !isAgendaLoading &&
    !isSaving;

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

  // EST-01: saving AWAITS the write (mutateAsync). The agenda mutation is queued offline
  // (DEC-01: designations are a meeting flow), so a resolved promise means "saved or safely
  // queued"; only a real rejection reaches the catch, where the user stays on this screen with
  // their edits intact and an inline error. Never navigate away from an unconfirmed write.
  const persist = useCallback(async () => {
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
    await updateAgenda.mutateAsync({ sundayDate: date, updates: { designations: next } });
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

  // EST-21: ONE back path. The header "Back" button and the Android hardware back
  // button must behave identically — both go through handleBack.
  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  useEffect(() => {
    // BackHandler only fires on Android; registering unconditionally keeps one code path.
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });
    return () => sub.remove();
  }, [handleBack]);

  const scrollRef = useRef<ScrollView>(null);
  const keyboardSubRef = useRef<ReturnType<typeof Keyboard.addListener> | null>(null);

  // EST-21: the one-shot keyboard listener below must not outlive the screen when the
  // keyboard never appears.
  useEffect(() => {
    return () => {
      keyboardSubRef.current?.remove();
      keyboardSubRef.current = null;
    };
  }, []);

  /**
   * Raise the focused field above the keyboard.
   *
   * KeyboardAvoidingView does NOT work here and no offset can fix it: this form is short and
   * top-aligned, so shrinking the viewport moves nothing. The gap is
   * `H - keyboardHeight - fieldBottom + scrollOffset` — `keyboardVerticalOffset` only changes the
   * viewport, which is absent from that expression, so it cancels out. (The (auth) screens differ:
   * their content is centred with flexGrow, so it tracks the viewport.)
   *
   * The only term that can move the field is the scroll offset. `automaticallyAdjustKeyboardInsets`
   * sets contentInset.bottom to the keyboard overlap, which is what gives a short form any scroll
   * range at all; scrollToEnd then lands the content's last pixel on the keyboard's top edge, so
   * the clearance ends up equal to scrollContent.paddingBottom.
   */
  const handleFieldFocus = useCallback(() => {
    const toEnd = () => scrollRef.current?.scrollToEnd({ animated: true });
    if (Keyboard.isVisible()) {
      toEnd();
      return;
    }
    // The inset only exists once the keyboard is up; scrolling before that is a no-op.
    keyboardSubRef.current?.remove();
    const sub = Keyboard.addListener('keyboardDidShow', () => {
      sub.remove();
      if (keyboardSubRef.current === sub) keyboardSubRef.current = null;
      toEnd();
    });
    keyboardSubRef.current = sub;
  }, []);

  const handleSave = useCallback(() => {
    if (!canSave || !type) return;
    setSaveError(null);

    // Await every write; navigate back ONLY once they all resolve. On failure the user stays
    // here, with the form exactly as they left it and an inline error to act on.
    const saveAll = async (updateCalling: boolean) => {
      setIsSaving(true);
      try {
        await persist();
        if (updateCalling && memberId) {
          await updateMember.mutateAsync({
            id: memberId,
            calling: type === 'sustain' && calling.trim() ? calling.trim() : null,
          });
        }
        router.back();
      } catch {
        setSaveError(t('agenda.designations.saveFailed'));
      } finally {
        setIsSaving(false);
      }
    };

    // AC11/AC13: only offer the calling update for sustain/release linked to a member.
    if (isCallingType && memberId) {
      Alert.alert(
        t('agenda.designations.updateCallingTitle'),
        t('agenda.designations.updateCallingMessage', { name: personName.trim() }),
        [
          {
            text: t('agenda.designations.updateCallingSkip'),
            onPress: () => {
              void saveAll(false);
            },
          },
          {
            text: t('agenda.designations.updateCallingConfirm'),
            onPress: () => {
              void saveAll(true);
            },
          },
        ]
      );
      return;
    }
    void saveAll(false);
  }, [canSave, type, isCallingType, memberId, t, personName, persist, router, updateMember, calling]);

  // EST-11: with a cold cache there is nothing safe to edit yet — the fields would be seeded from
  // an item that has not arrived. Show loading (all hooks above have run) until the agenda query
  // resolves, one way or the other.
  if (isAgendaLoading) {
    return (
      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator testID="designation-edit-loading" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        <Pressable
          onPress={handleBack}
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
          ref={scrollRef}
          testID="designation-edit-scroll"
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        {saveError && (
          <Text testID="designation-edit-error" style={[styles.saveError, { color: colors.error }]}>
            {saveError}
          </Text>
        )}

        {/* 1. Type — AC6 */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          {t('agenda.designations.typeLabel')}
        </Text>
        {DESIGNATION_TYPES.map((opt) => {
          const selected = type === opt;
          // Once a choice is made, the non-selected options recede (dimmed) so they don't compete.
          const dimmed = type !== null && !selected;
          return (
            <Pressable
              key={opt}
              testID={`designation-type-${opt}`}
              onPress={() => handleSelectType(opt)}
              style={[
                styles.optionRow,
                { borderColor: selected ? colors.primary : dimmed ? colors.divider : colors.border },
                selected && { backgroundColor: colors.surfaceVariant },
              ]}
            >
              <Text style={[styles.optionText, { color: dimmed ? colors.textTertiary : colors.text }]}>
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
              style={[
                styles.selectorField,
                { borderColor: personName ? colors.primary : colors.border },
                !!personName && { backgroundColor: colors.surfaceVariant },
              ]}
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
              onFocus={handleFieldFocus}
              style={[
                styles.textInput,
                { color: colors.text, borderColor: calling.trim() ? colors.primary : colors.border },
                !!calling.trim() && { backgroundColor: colors.surfaceVariant },
              ]}
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
              const dimmed = office !== null && !selected;
              return (
                <Pressable
                  key={opt}
                  testID={`designation-office-${opt}`}
                  onPress={() => setOffice(opt)}
                  style={[
                    styles.optionRow,
                    { borderColor: selected ? colors.primary : dimmed ? colors.divider : colors.border },
                    selected && { backgroundColor: colors.surfaceVariant },
                  ]}
                >
                  <Text style={[styles.optionText, { color: dimmed ? colors.textTertiary : colors.text }]}>
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
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveError: {
    fontSize: 14,
    marginTop: 12,
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
  scroll: { flex: 1 },
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
