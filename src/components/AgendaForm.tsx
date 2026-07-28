/**
 * AgendaForm: Full agenda form with 4 sections (normal meeting) or 3 sections (special meeting).
 * All fields auto-save on change. Observer: all fields disabled.
 * Normal: Welcome, Designations/Sacrament, Speeches 1+2, Last Speech.
 * Special: Welcome, Designations/Sacrament, Special Meeting.
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Pressable,
  Modal,
  FlatList,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useTheme, type ThemeColors } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useAgenda, useUpdateAgenda, isSpecialMeeting } from '../hooks/useAgenda';
import { useSpeeches, useWardManagePrayers, useAssignSpeaker, useRemoveAssignment, useLazyCreateSpeeches } from '../hooks/useSpeeches';
import { useHymns, useSacramentalHymns, formatHymnDisplay, filterHymns } from '../hooks/useHymns';
import { useMembers } from '../hooks/useMembers';
import { getCurrentLanguage } from '../i18n';
import { DebouncedTextInput } from './DebouncedTextInput';
import { EditableListField, parseItems, joinItems } from './EditableListField';
import { PeoplePicker, type PeopleCapability } from './PeoplePicker';
import { SearchInput } from './SearchInput';
import { XIcon, PencilIcon } from './icons';
import { resolveContactSnapshot } from '../lib/contact';
import { buildFullPhone } from '../lib/phone';
import type {
  Member,
  Hymn,
  SundayExceptionReason,
  Speech,
} from '../types/database';

// --- Types ---

export interface AgendaFormProps {
  sundayDate: string;
  exceptionReason: SundayExceptionReason | null;
  customReason?: string | null;
  /** When true, all form fields are disabled (offline read-only mode). */
  disabled?: boolean;
  /** Called with touch Y coordinate to scroll field into view. */
  onFieldFocus?: (touchY: number) => void;
}

type FieldSelectorType = 'hymn' | 'sacrament_hymn';

interface SelectorState {
  type: FieldSelectorType;
  field: string;
}

/** Unified people-picker state for the agenda (v2.0). Recognition is multi-select. */
type PeoplePickerState =
  | { mode: 'role'; nameField: string; capability: PeopleCapability }
  | { mode: 'prayer'; position: 0 | 4 }
  | { mode: 'recognize' };

// --- Component ---

export const AgendaForm = React.memo(function AgendaForm({ sundayDate, exceptionReason, customReason, disabled = false, onFieldFocus }: AgendaFormProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { hasPermission } = useAuth();
  const router = useRouter();
  const locale = getCurrentLanguage();

  const isObserver = !hasPermission('agenda:write') || disabled;

  const { data: agenda } = useAgenda(sundayDate);
  const updateAgenda = useUpdateAgenda();
  const { data: speeches } = useSpeeches({ start: sundayDate, end: sundayDate });
  const { managePrayers } = useWardManagePrayers();
  const assignSpeaker = useAssignSpeaker();
  const removeAssignment = useRemoveAssignment();
  const lazyCreateSpeeches = useLazyCreateSpeeches();

  // When managePrayers is OFF, prayers are selected directly in the agenda.
  // Ensure speech records for positions 0/4 exist so the selector can assign to them.
  const hasCreatedPrayers = useRef(false);
  useEffect(() => {
    if (!managePrayers && !hasCreatedPrayers.current && sundayDate && !isObserver) {
      hasCreatedPrayers.current = true;
      lazyCreateSpeeches.mutate({ sundayDate });
    }
    // One-time (ref-guarded) prayer-slot creation; lazyCreateSpeeches is a stable mutation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managePrayers, sundayDate, isObserver]);

  const { data: allHymns } = useHymns(locale);
  const { data: sacramentalHymns } = useSacramentalHymns(locale);
  const { data: members } = useMembers();

  const [selectorModal, setSelectorModal] = useState<SelectorState | null>(null);
  const [peoplePicker, setPeoplePicker] = useState<PeoplePickerState | null>(null);

  // Refs for text inputs that need keyboard scroll
  const textInputRef1 = useRef<View>(null);
  const textInputRef2 = useRef<View>(null);
  const textInputRef3 = useRef<View>(null);

  const handleTextFocus = useCallback((ref: React.RefObject<View | null>) => {
    if (onFieldFocus && ref.current) {
      ref.current.measureInWindow((_x: number, y: number) => {
        onFieldFocus(y);
      });
    }
  }, [onFieldFocus]);

  const isSpecial = isSpecialMeeting(exceptionReason);

  // Get speech by position
  const getSpeech = useCallback(
    (position: number): Speech | undefined => {
      return speeches?.find((s) => s.position === position);
    },
    [speeches]
  );

  // Auto-save field update
  const updateField = useCallback(
    (field: string, value: unknown) => {
      if (!agenda || isObserver) return;
      updateAgenda.mutate({
        agendaId: agenda.id,
        fields: { [field]: value } as Record<string, unknown>,
      });
    },
    [agenda, isObserver, updateAgenda]
  );

  // Handle actor-role selection (presiding/conducting/pianist/conductor).
  // v2.0: write ONLY the name snapshot column; the actor FK columns no longer exist.
  const handleRoleSelect = useCallback(
    (member: Member, nameField: string) => {
      if (!agenda || isObserver) return;
      updateAgenda.mutate({
        agendaId: agenda.id,
        fields: { [nameField]: member.full_name } as Record<string, unknown>,
      });
    },
    [agenda, isObserver, updateAgenda]
  );

  // Handle prayer selection: snapshot the resolved contact onto the speech (positions 0/4).
  const handlePrayerSelect = useCallback(
    (member: Member, position: 0 | 4) => {
      if (isObserver) return;
      const speech = getSpeech(position);
      if (!speech) return;
      const responsible = member.contact_via_responsible
        ? (members ?? []).find((m) => m.id === member.responsible_id) ?? null
        : null;
      const snapshot = resolveContactSnapshot(member, responsible);
      assignSpeaker.mutate({
        speechId: speech.id,
        memberId: member.id,
        speakerName: member.full_name,
        speakerInformalName: member.informal_name,
        speakerPhone: buildFullPhone(member.country_code, member.phone),
        contactPhone: snapshot.contact_phone,
        isDelegated: snapshot.is_delegated,
        delegateForName: snapshot.delegate_for_name,
        status: 'assigned_confirmed',
      });
    },
    [isObserver, getSpeech, members, assignSpeaker]
  );

  // Handle recognition toggle (multi-select). Stores newline-joined member names (snapshot).
  const handleRecognizeToggle = useCallback(
    (member: Member) => {
      if (!agenda || isObserver) return;
      const currentItems = parseItems(agenda.recognized_names ?? null);
      const newItems = currentItems.includes(member.full_name)
        ? currentItems.filter((n) => n !== member.full_name)
        : [...currentItems, member.full_name];
      updateField('recognized_names', joinItems(newItems));
    },
    [agenda, isObserver, updateField]
  );

  // Ids of members currently in the recognition list (for multi-select highlighting).
  const recognizedSelectedIds = useMemo(() => {
    const set = new Set(parseItems(agenda?.recognized_names ?? null));
    return (members ?? []).filter((m) => set.has(m.full_name)).map((m) => m.id);
  }, [members, agenda?.recognized_names]);

  // Handle hymn selection
  const handleHymnSelect = useCallback(
    (hymn: Hymn, field: string) => {
      if (!agenda || isObserver) return;
      updateAgenda.mutate({
        agendaId: agenda.id,
        fields: { [field]: hymn.id } as Record<string, unknown>,
      });
    },
    [agenda, isObserver, updateAgenda]
  );

  // Find hymn display by ID
  const getHymnDisplay = useCallback(
    (hymnId: string | null, hymnList: Hymn[] | undefined): string => {
      if (!hymnId || !hymnList) return '';
      const hymn = hymnList.find((h) => h.id === hymnId);
      return hymn ? formatHymnDisplay(hymn) : '';
    },
    []
  );

  if (!agenda) {
    return (
      <View style={styles.emptyState}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.form}>
      {/* Section 1: Welcome & Announcements */}
      <SectionHeader title={t('agenda.sectionWelcome')} colors={colors} />

      <FieldRow label={t('agenda.presiding')} colors={colors}>
        <SelectorField
          testID="agenda-presiding-selector"
          value={agenda.presiding_name ?? ''}
          placeholder={t('agenda.presiding')}
          onPress={() => {
            if (!isObserver) {
              setPeoplePicker({ mode: 'role', nameField: 'presiding_name', capability: 'preside' });
            }
          }}
          disabled={isObserver}
          colors={colors}
          onClear={!isObserver ? () => updateField('presiding_name', null) : undefined}
          hasValue={!!agenda.presiding_name}
          onFieldFocus={onFieldFocus}
        />
      </FieldRow>

      <FieldRow label={t('agenda.conducting')} colors={colors}>
        <SelectorField
          testID="agenda-conducting-selector"
          value={agenda.conducting_name ?? ''}
          placeholder={t('agenda.conducting')}
          onPress={() => {
            if (!isObserver) {
              setPeoplePicker({ mode: 'role', nameField: 'conducting_name', capability: 'conduct' });
            }
          }}
          disabled={isObserver}
          colors={colors}
          onClear={!isObserver ? () => updateField('conducting_name', null) : undefined}
          hasValue={!!agenda.conducting_name}
          onFieldFocus={onFieldFocus}
        />
      </FieldRow>

      <FieldRow label={t('agenda.recognizing')} colors={colors}>
        <EditableListField
          value={agenda.recognized_names ?? null}
          onSave={(text) => updateField('recognized_names', text)}
          disabled={isObserver}
          placeholder={t('agenda.addPresence')}
          onFieldFocus={onFieldFocus}
          onItemPress={() => {
            if (!isObserver) setPeoplePicker({ mode: 'recognize' });
          }}
          onAddPress={() => {
            if (!isObserver) setPeoplePicker({ mode: 'recognize' });
          }}
        />
      </FieldRow>

      <FieldRow label={t('agenda.welcomeNewFamilies')} colors={colors}>
        <EditableListField
          value={agenda.welcome_new_families ?? null}
          onSave={(text) => updateField('welcome_new_families', text)}
          disabled={isObserver}
          placeholder={t('agenda.addWelcome')}
          onFieldFocus={onFieldFocus}
        />
      </FieldRow>

      <FieldRow label={t('agenda.announcements')} colors={colors}>
        <EditableListField
          value={agenda.announcements ?? null}
          onSave={(text) => updateField('announcements', text)}
          disabled={isObserver}
          placeholder={t('agenda.addAnnouncement')}
          onFieldFocus={onFieldFocus}
        />
      </FieldRow>

      <FieldRow label={t('agenda.pianist')} colors={colors}>
        <SelectorField
          testID="agenda-pianist-selector"
          value={agenda.pianist_name ?? ''}
          placeholder={t('agenda.pianist')}
          onPress={() => {
            if (!isObserver) {
              setPeoplePicker({ mode: 'role', nameField: 'pianist_name', capability: 'play_piano' });
            }
          }}
          disabled={isObserver}
          colors={colors}
          onClear={!isObserver ? () => updateField('pianist_name', null) : undefined}
          hasValue={!!agenda.pianist_name}
          onFieldFocus={onFieldFocus}
        />
      </FieldRow>

      <FieldRow label={t('agenda.conductor')} colors={colors}>
        <SelectorField
          testID="agenda-conductor-selector"
          value={agenda.conductor_name ?? ''}
          placeholder={t('agenda.conductor')}
          onPress={() => {
            if (!isObserver) {
              setPeoplePicker({ mode: 'role', nameField: 'conductor_name', capability: 'lead_music' });
            }
          }}
          disabled={isObserver}
          colors={colors}
          onClear={!isObserver ? () => updateField('conductor_name', null) : undefined}
          hasValue={!!agenda.conductor_name}
          onFieldFocus={onFieldFocus}
        />
      </FieldRow>

      <FieldRow label={t('agenda.openingHymn')} colors={colors}>
        <SelectorField
          testID="agenda-opening-hymn-selector"
          value={getHymnDisplay(agenda.opening_hymn_id, allHymns)}
          placeholder={t('agenda.openingHymn')}
          onPress={() => {
            if (!isObserver) {
              setSelectorModal({ type: 'hymn', field: 'opening_hymn_id' });
            }
          }}
          disabled={isObserver}
          colors={colors}
          onClear={!isObserver ? () => updateField('opening_hymn_id', null) : undefined}
          hasValue={!!agenda.opening_hymn_id}
          onFieldFocus={onFieldFocus}
        />
      </FieldRow>

      <FieldRow label={t('agenda.openingPrayer')} colors={colors}>
        {managePrayers ? (
          <View style={[styles.speakerReadRow, { borderColor: colors.border }, isObserver && { backgroundColor: colors.surfaceVariant, opacity: 0.5 }]}>
            <Text
              style={[
                styles.speakerReadText,
                { color: getSpeech(0)?.speaker_name ? colors.textSecondary : colors.textTertiary },
                getSpeech(0)?.speaker_name ? { fontStyle: 'italic' } : undefined,
              ]}
              numberOfLines={1}
            >
              {getSpeech(0)?.speaker_name || t('agenda.openingPrayer')}
            </Text>
            {!isObserver && (
              <Pressable hitSlop={12} onPress={() => router.push({ pathname: '/(tabs)/speeches', params: { expandDate: sundayDate } })} style={styles.speakerIconBtn}>
                <PencilIcon size={16} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>
        ) : (
          <SelectorField
            testID="agenda-opening-prayer-selector"
            value={getSpeech(0)?.speaker_name ?? ''}
            placeholder={t('agenda.openingPrayer')}
            onPress={() => {
              if (!isObserver) {
                setPeoplePicker({ mode: 'prayer', position: 0 });
              }
            }}
            disabled={isObserver}
            colors={colors}
            onClear={!isObserver ? () => {
              const speech = getSpeech(0);
              if (speech) {
                removeAssignment.mutate({ speechId: speech.id, speakerName: speech.speaker_name ?? undefined });
              }
            } : undefined}
            hasValue={!!getSpeech(0)?.speaker_name}
            onFieldFocus={onFieldFocus}
          />
        )}
      </FieldRow>

      {/* Section 2: Designations & Sacrament */}
      <SectionHeader title={t('agenda.sectionSacrament')} colors={colors} />

      <FieldRow label={t('agenda.wardBusiness')} colors={colors}>
        <EditableListField
          value={agenda.sustaining_releasing ?? null}
          onSave={(text) => updateField('sustaining_releasing', text)}
          disabled={isObserver}
          placeholder={t('agenda.addWardBusiness')}
          onFieldFocus={onFieldFocus}
        />
      </FieldRow>

      <ToggleField
        label={t('agenda.babyBlessing', 'Baby Blessing')}
        value={agenda.has_baby_blessing}
        onToggle={(val) => updateField('has_baby_blessing', val)}
        disabled={isObserver}
        colors={colors}
      />
      {agenda.has_baby_blessing && (
        <View ref={textInputRef1}>
          <DebouncedTextInput
            style={[styles.textInput, styles.indented, { color: colors.text, borderColor: colors.border }]}
            value={agenda.baby_blessing_names ?? ''}
            onSave={(text) => updateField('baby_blessing_names', text)}
            placeholder={t('agenda.names', 'Names')}
            placeholderTextColor={colors.textTertiary}
            editable={!isObserver}
            onFocus={() => handleTextFocus(textInputRef1)}
          />
        </View>
      )}

      <ToggleField
        label={t('agenda.baptismConfirmation', 'Baptism Confirmation')}
        value={agenda.has_baptism_confirmation}
        onToggle={(val) => updateField('has_baptism_confirmation', val)}
        disabled={isObserver}
        colors={colors}
      />
      {agenda.has_baptism_confirmation && (
        <View ref={textInputRef2}>
          <DebouncedTextInput
            style={[styles.textInput, styles.indented, { color: colors.text, borderColor: colors.border }]}
            value={agenda.baptism_confirmation_names ?? ''}
            onSave={(text) => updateField('baptism_confirmation_names', text)}
            placeholder={t('agenda.names', 'Names')}
            placeholderTextColor={colors.textTertiary}
            editable={!isObserver}
            onFocus={() => handleTextFocus(textInputRef2)}
          />
        </View>
      )}

      <ToggleField
        label={t('agenda.stakeAnnouncements', 'Stake Announcements')}
        value={agenda.has_stake_announcements}
        onToggle={(val) => updateField('has_stake_announcements', val)}
        disabled={isObserver}
        colors={colors}
      />

      <FieldRow label={t('agenda.sacramentHymn')} colors={colors}>
        <SelectorField
          testID="agenda-sacrament-hymn-selector"
          value={getHymnDisplay(agenda.sacrament_hymn_id, sacramentalHymns)}
          placeholder={t('agenda.sacramentHymn')}
          onPress={() => {
            if (!isObserver) {
              setSelectorModal({ type: 'sacrament_hymn', field: 'sacrament_hymn_id' });
            }
          }}
          disabled={isObserver}
          colors={colors}
          onClear={!isObserver ? () => updateField('sacrament_hymn_id', null) : undefined}
          hasValue={!!agenda.sacrament_hymn_id}
          onFieldFocus={onFieldFocus}
        />
      </FieldRow>

      {/* Section 3: Speeches (normal) or Special Meeting (special) */}
      {!isSpecial ? (
        <>
          {/* Normal meeting: speeches 1 + 2 */}
          <SectionHeader title={t('agenda.sectionFirstSpeeches')} colors={colors} />

          <ReadOnlySpeakerRow
            label={`1\u00BA ${t('speeches.speaker')}`}
            speakerName={getSpeech(1)?.speaker_name ?? ''}
            onNavigate={() => router.push({ pathname: '/(tabs)/speeches', params: { expandDate: sundayDate } })}
            colors={colors}
            disabled={isObserver}
          />

          <ReadOnlySpeakerRow
            label={`2\u00BA ${t('speeches.speaker')}`}
            speakerName={agenda.has_second_speech === false
              ? t('speeches.secondSpeechDisabledPlaceholder')
              : (getSpeech(2)?.speaker_name ?? '')}
            onNavigate={() => router.push({ pathname: '/(tabs)/speeches', params: { expandDate: sundayDate } })}
            colors={colors}
            disabled={isObserver || agenda.has_second_speech === false}
          />

          <ToggleField
            label={t('agenda.musicalNumber')}
            value={agenda.has_special_presentation}
            onToggle={(val) => updateField('has_special_presentation', val)}
            disabled={isObserver}
            colors={colors}
          />
          {agenda.has_special_presentation ? (
            <View ref={textInputRef3}>
              <DebouncedTextInput
                style={[styles.textInput, styles.indented, { color: colors.text, borderColor: colors.border }]}
                value={agenda.special_presentation_description ?? ''}
                onSave={(text) => updateField('special_presentation_description', text)}
                placeholder={t('agenda.musicalNumber')}
                placeholderTextColor={colors.textTertiary}
                editable={!isObserver}
                onFocus={() => handleTextFocus(textInputRef3)}
              />
            </View>
          ) : (
            <>
              <ToggleField
                label={t('agenda.intermediateHymn')}
                value={agenda.has_intermediate_hymn}
                onToggle={(val) => updateField('has_intermediate_hymn', val)}
                disabled={isObserver}
                colors={colors}
              />
              {agenda.has_intermediate_hymn && (
                <FieldRow label={t('agenda.intermediateHymn', 'Intermediate Hymn')} colors={colors}>
                  <SelectorField
                    value={getHymnDisplay(agenda.intermediate_hymn_id, allHymns)}
                    placeholder={t('agenda.intermediateHymn', 'Intermediate Hymn')}
                    onPress={() => {
                      if (!isObserver) {
                        setSelectorModal({ type: 'hymn', field: 'intermediate_hymn_id' });
                      }
                    }}
                    disabled={isObserver}
                    colors={colors}
                    onClear={!isObserver ? () => updateField('intermediate_hymn_id', null) : undefined}
                    hasValue={!!agenda.intermediate_hymn_id}
                    onFieldFocus={onFieldFocus}
                  />
                </FieldRow>
              )}
            </>
          )}

          {/* Section 4: Last Speech */}
          <SectionHeader title={t('agenda.sectionLastSpeech')} colors={colors} />

          <ReadOnlySpeakerRow
            label={t('speeches.lastSpeech')}
            speakerName={getSpeech(3)?.speaker_name ?? ''}
            onNavigate={() => router.push({ pathname: '/(tabs)/speeches', params: { expandDate: sundayDate } })}
            colors={colors}
            disabled={isObserver}
          />
        </>
      ) : (
        <>
          {/* Special meeting: dynamic section header based on type */}
          <SectionHeader
            title={
              exceptionReason === 'testimony_meeting'
                ? t('agenda.sectionTestimonies')
                : exceptionReason === 'primary_presentation'
                  ? t('agenda.sectionPrimaryPresentation')
                  : exceptionReason === 'other' && customReason
                    ? customReason
                    : t(`sundayExceptions.${exceptionReason}`, 'Special Meeting')
            }
            colors={colors}
          />
          <FieldRow label={t('agenda.meetingType', 'Meeting Type')} colors={colors}>
            <Text style={[styles.fieldValue, { color: colors.textSecondary }]}>
              {exceptionReason ? t(`sundayExceptions.${exceptionReason}`, exceptionReason) : ''}
            </Text>
          </FieldRow>
        </>
      )}

      {/* Closing (both normal and special) */}
      <FieldRow label={t('agenda.closingHymn')} colors={colors}>
        <SelectorField
          testID="agenda-closing-hymn-selector"
          value={getHymnDisplay(agenda.closing_hymn_id, allHymns)}
          placeholder={t('agenda.closingHymn')}
          onPress={() => {
            if (!isObserver) {
              setSelectorModal({ type: 'hymn', field: 'closing_hymn_id' });
            }
          }}
          disabled={isObserver}
          colors={colors}
          onClear={!isObserver ? () => updateField('closing_hymn_id', null) : undefined}
          hasValue={!!agenda.closing_hymn_id}
          onFieldFocus={onFieldFocus}
        />
      </FieldRow>

      <FieldRow label={t('agenda.closingPrayer')} colors={colors}>
        {managePrayers ? (
          <View style={[styles.speakerReadRow, { borderColor: colors.border }, isObserver && { backgroundColor: colors.surfaceVariant, opacity: 0.5 }]}>
            <Text
              style={[
                styles.speakerReadText,
                { color: getSpeech(4)?.speaker_name ? colors.textSecondary : colors.textTertiary },
                getSpeech(4)?.speaker_name ? { fontStyle: 'italic' } : undefined,
              ]}
              numberOfLines={1}
            >
              {getSpeech(4)?.speaker_name || t('agenda.closingPrayer')}
            </Text>
            {!isObserver && (
              <Pressable hitSlop={12} onPress={() => router.push({ pathname: '/(tabs)/speeches', params: { expandDate: sundayDate } })} style={styles.speakerIconBtn}>
                <PencilIcon size={16} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>
        ) : (
          <SelectorField
            testID="agenda-closing-prayer-selector"
            value={getSpeech(4)?.speaker_name ?? ''}
            placeholder={t('agenda.closingPrayer')}
            onPress={() => {
              if (!isObserver) {
                setPeoplePicker({ mode: 'prayer', position: 4 });
              }
            }}
            disabled={isObserver}
            colors={colors}
            onClear={!isObserver ? () => {
              const speech = getSpeech(4);
              if (speech) {
                removeAssignment.mutate({ speechId: speech.id, speakerName: speech.speaker_name ?? undefined });
              }
            } : undefined}
            hasValue={!!getSpeech(4)?.speaker_name}
            onFieldFocus={onFieldFocus}
          />
        )}
      </FieldRow>

      {/* Unified people picker — actor roles, recognition (multi-select), and prayers (v2.0) */}
      {peoplePicker?.mode === 'role' && (
        <PeoplePicker
          visible
          capability={peoplePicker.capability}
          onSelect={(member) => {
            handleRoleSelect(member, peoplePicker.nameField);
            setPeoplePicker(null);
          }}
          onClose={() => setPeoplePicker(null)}
        />
      )}

      {peoplePicker?.mode === 'recognize' && (
        <PeoplePicker
          visible
          capability="be_recognized"
          multiSelect
          selectedIds={recognizedSelectedIds}
          onSelect={handleRecognizeToggle}
          onClose={() => setPeoplePicker(null)}
        />
      )}

      {peoplePicker?.mode === 'prayer' && (
        <PeoplePicker
          visible
          onSelect={(member) => {
            if (peoplePicker.mode === 'prayer') {
              handlePrayerSelect(member, peoplePicker.position);
            }
            setPeoplePicker(null);
          }}
          onClose={() => setPeoplePicker(null)}
        />
      )}

      {/* Hymn selector modal */}
      {(selectorModal?.type === 'hymn' || selectorModal?.type === 'sacrament_hymn') && (
        <HymnSelectorModal
          visible
          hymns={selectorModal.type === 'sacrament_hymn' ? sacramentalHymns ?? [] : allHymns ?? []}
          onSelect={(hymn) => {
            handleHymnSelect(hymn, selectorModal.field);
            setSelectorModal(null);
          }}
          onClose={() => setSelectorModal(null)}
        />
      )}

    </View>
  );
});

// --- Sub-components ---

function SectionHeader({ title, colors }: { title: string; colors: ThemeColors }) {
  return (
    <View style={[styles.sectionHeader, { borderBottomColor: colors.divider }]}>
      <Text style={[styles.sectionTitle, { color: colors.primary }]}>{title}</Text>
    </View>
  );
}

function FieldRow({
  label,
  colors,
  children,
}: {
  label: string;
  colors: ThemeColors;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.fieldRow}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      {children}
    </View>
  );
}

function SelectorField({
  value,
  placeholder,
  onPress,
  disabled,
  colors,
  onClear,
  hasValue,
  testID,
  onFieldFocus,
}: {
  value: string;
  placeholder: string;
  onPress: () => void;
  disabled: boolean;
  colors: ThemeColors;
  onClear?: () => void;
  hasValue?: boolean;
  testID?: string;
  onFieldFocus?: (touchY: number) => void;
}) {
  const viewRef = useRef<View>(null);

  const handlePress = useCallback(() => {
    onPress();
    if (onFieldFocus && viewRef.current) {
      viewRef.current.measureInWindow((_x: number, y: number) => {
        onFieldFocus(y);
      });
    }
  }, [onPress, onFieldFocus]);

  return (
    <Pressable
      ref={viewRef}
      testID={testID}
      style={[styles.selectorField, { borderColor: colors.border }]}
      onPress={disabled ? undefined : handlePress}
      disabled={disabled}
    >
      <Text
        style={[
          styles.selectorText,
          { color: value ? colors.text : colors.textTertiary },
        ]}
        numberOfLines={1}
      >
        {value || placeholder}
      </Text>
      {onClear && hasValue && (
        <Pressable hitSlop={8} onPress={onClear}>
          <XIcon size={20} color={colors.error} />
        </Pressable>
      )}
    </Pressable>
  );
}

function ReadOnlySpeakerRow({
  label,
  speakerName,
  onNavigate,
  colors,
  disabled,
}: {
  label: string;
  speakerName: string;
  onNavigate: () => void;
  colors: ThemeColors;
  disabled?: boolean;
}) {
  return (
    <FieldRow label={label} colors={colors}>
      <View style={[styles.speakerReadRow, { borderColor: colors.border }, disabled && { backgroundColor: colors.surfaceVariant, opacity: 0.5 }]}>
        <Text
          style={[
            styles.speakerReadText,
            { color: speakerName ? colors.textSecondary : colors.textTertiary },
            speakerName ? { fontStyle: 'italic' } : undefined,
          ]}
          numberOfLines={1}
        >
          {speakerName || label}
        </Text>
        {!disabled && (
          <Pressable hitSlop={12} onPress={onNavigate} style={styles.speakerIconBtn}>
            <PencilIcon size={16} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>
    </FieldRow>
  );
}

function ToggleField({
  label,
  value,
  onToggle,
  disabled,
  colors,
}: {
  label: string;
  value: boolean;
  onToggle: (val: boolean) => void;
  disabled: boolean;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={disabled ? undefined : onToggle}
        disabled={disabled}
        trackColor={{ false: colors.border, true: colors.primary }}
      />
    </View>
  );
}

// --- Inline Selector Modals ---

const HYMN_SHEET_HEIGHT = Math.round(Dimensions.get('window').height * 0.67);

function HymnSelectorModal({
  visible,
  hymns,
  onSelect,
  onClose,
}: {
  visible: boolean;
  hymns: Hymn[];
  onSelect: (hymn: Hymn) => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return hymns;
    return filterHymns(hymns, search);
  }, [hymns, search]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.bottomSheetOverlay} onPress={onClose}>
        <View
          style={[styles.bottomSheet, { backgroundColor: colors.card }]}
          onStartShouldSetResponder={() => true}
          {...(Platform.OS === 'web' ? { onClick: (e: any) => e.stopPropagation() } : {})}
        >
          {/* Handle bar */}
          <View style={styles.sheetHandleBar}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          </View>

          {/* Search */}
          <View style={styles.sheetSearchRow}>
            <SearchInput
              testID="hymn-selector-search-input"
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder={t('common.search')}
            />
            <Pressable testID="hymn-selector-close-button" onPress={onClose} style={styles.sheetCloseBtn}>
              <Text style={[styles.sheetCloseText, { color: colors.primary }]}>{t('common.close')}</Text>
            </Pressable>
          </View>

          <FlatList
            data={filtered}
            initialNumToRender={filtered.length}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                style={styles.modalItem}
                onPress={() => {
                  onSelect(item);
                  setSearch('');
                }}
              >
                <Text style={[styles.modalItemText, { color: colors.text }]}>
                  {formatHymnDisplay(item)}
                </Text>
              </Pressable>
            )}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t('common.noResults')}
              </Text>
            }
            keyboardShouldPersistTaps="handled"
          />
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 4,
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    paddingVertical: 8,
    marginTop: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  fieldRow: {
    paddingVertical: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 15,
  },
  selectorField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  selectorText: {
    fontSize: 15,
    flex: 1,
  },
  clearButton: {
    fontSize: 20,
    fontWeight: '300',
    paddingHorizontal: 4,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    minHeight: 36,
  },
  indented: {
    marginLeft: 16,
    marginTop: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    height: HYMN_SHEET_HEIGHT,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  sheetHandleBar: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  sheetSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 12,
  },
  sheetCloseBtn: {
    paddingVertical: 8,
  },
  sheetCloseText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalItemText: {
    fontSize: 15,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  searchInput: {
    flex: 1,
  },
  speakerReadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  speakerReadText: {
    flex: 1,
    fontSize: 15,
  },
  speakerIconBtn: {
    paddingHorizontal: 4,
  },
  speakerIcon: {
    fontSize: 18,
  },
});
