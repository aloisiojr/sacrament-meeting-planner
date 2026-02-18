/**
 * AgendaForm: Full agenda form with 4 sections (normal meeting) or 3 sections (special meeting).
 * All fields auto-save on change. Observer: all fields disabled.
 * Normal: Welcome, Designations/Sacrament, Speeches 1+2, Last Speech.
 * Special: Welcome, Designations/Sacrament, Special Meeting.
 */

import React, { useState, useCallback, useMemo } from 'react';
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
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, type ThemeColors } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useAgenda, useUpdateAgenda, isSpecialMeeting } from '../hooks/useAgenda';
import { useSpeeches, useAssignSpeaker, useLazyCreateSpeeches } from '../hooks/useSpeeches';
import { useHymns, useSacramentalHymns, formatHymnDisplay, filterHymns } from '../hooks/useHymns';
import { useMembers } from '../hooks/useMembers';
import { getCurrentLanguage } from '../i18n';
import { MemberSelectorModal } from './MemberSelectorModal';
import { ActorSelector } from './ActorSelector';
import { DebouncedTextInput } from './DebouncedTextInput';
import { PrayerSelector, type PrayerSelection } from './PrayerSelector';
import { SearchInput } from './SearchInput';
import type {
  SundayAgenda,
  MeetingActor,
  Hymn,
  Member,
  SundayExceptionReason,
  Speech,
} from '../types/database';

// --- Types ---

export interface AgendaFormProps {
  sundayDate: string;
  exceptionReason: SundayExceptionReason | null;
  customReason?: string | null;
}

type FieldSelectorType = 'actor' | 'hymn' | 'sacrament_hymn' | 'prayer' | 'speaker';

interface SelectorState {
  type: FieldSelectorType;
  field: string;
  roleFilter?: string;
  speechPosition?: number;
}

// --- Component ---

export const AgendaForm = React.memo(function AgendaForm({ sundayDate, exceptionReason, customReason }: AgendaFormProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { hasPermission } = useAuth();
  const locale = getCurrentLanguage();

  const isObserver = !hasPermission('agenda:write');
  const canAssignSpeaker = hasPermission('agenda:assign_speaker');

  const { data: agenda } = useAgenda(sundayDate);
  const updateAgenda = useUpdateAgenda();
  const { data: speeches } = useSpeeches({ start: sundayDate, end: sundayDate });
  const assignSpeaker = useAssignSpeaker();
  const lazyCreateSpeeches = useLazyCreateSpeeches();

  const { data: members } = useMembers();
  const { data: allHymns } = useHymns(locale);
  const { data: sacramentalHymns } = useSacramentalHymns(locale);

  const [selectorModal, setSelectorModal] = useState<SelectorState | null>(null);
  const [speakerModalPosition, setSpeakerModalPosition] = useState<number | null>(null);

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

  // Handle actor selection
  const handleActorSelect = useCallback(
    (actor: MeetingActor, nameField: string, idField: string) => {
      if (!agenda || isObserver) return;
      updateAgenda.mutate({
        agendaId: agenda.id,
        fields: {
          [nameField]: actor.name,
          [idField]: actor.id,
        } as Record<string, unknown>,
      });
    },
    [agenda, isObserver, updateAgenda]
  );

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

  // Handle speaker assignment from agenda (status = assigned_confirmed)
  const handleSpeakerAssign = useCallback(
    (position: number, member: Member) => {
      if (!canAssignSpeaker) return;
      const speech = getSpeech(position);
      if (!speech) {
        // Need to lazy-create speeches first
        lazyCreateSpeeches.mutate(sundayDate, {
          onSuccess: (created) => {
            const newSpeech = created.find((s) => s.position === position);
            if (newSpeech) {
              assignSpeaker.mutate({
                speechId: newSpeech.id,
                memberId: member.id,
                speakerName: member.full_name,
                speakerPhone: member.phone ?? null,
                status: 'assigned_confirmed',
              });
            }
          },
        });
        return;
      }
      assignSpeaker.mutate({
        speechId: speech.id,
        memberId: member.id,
        speakerName: member.full_name,
        speakerPhone: member.phone ?? null,
        status: 'assigned_confirmed',
      });
      setSpeakerModalPosition(null);
    },
    [canAssignSpeaker, getSpeech, assignSpeaker, lazyCreateSpeeches, sundayDate]
  );

  // Handle prayer selection (member or custom name)
  const handlePrayerSelect = useCallback(
    (member: Member, nameField: string, idField: string) => {
      if (!agenda || isObserver) return;
      updateAgenda.mutate({
        agendaId: agenda.id,
        fields: {
          [nameField]: member.full_name,
          [idField]: member.id,
        } as Record<string, unknown>,
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
          value={agenda.presiding_name ?? ''}
          placeholder={t('agenda.presiding')}
          onPress={() => {
            if (!isObserver) {
              setSelectorModal({ type: 'actor', field: 'presiding', roleFilter: 'can_preside' });
            }
          }}
          disabled={isObserver}
          colors={colors}
        />
      </FieldRow>

      <FieldRow label={t('agenda.conducting')} colors={colors}>
        <SelectorField
          value={agenda.conducting_name ?? ''}
          placeholder={t('agenda.conducting')}
          onPress={() => {
            if (!isObserver) {
              setSelectorModal({ type: 'actor', field: 'conducting', roleFilter: 'can_conduct' });
            }
          }}
          disabled={isObserver}
          colors={colors}
        />
      </FieldRow>

      <FieldRow label={t('agenda.recognizing')} colors={colors}>
        <SelectorField
          value={agenda.recognized_names?.join(', ') || ''}
          placeholder={t('agenda.recognizing')}
          onPress={() => {
            if (!isObserver) {
              setSelectorModal({ type: 'actor', field: 'recognizing', roleFilter: 'can_recognize' });
            }
          }}
          disabled={isObserver}
          colors={colors}
        />
      </FieldRow>

      <FieldRow label={t('agenda.announcements')} colors={colors}>
        <DebouncedTextInput
          style={[styles.textInput, styles.announcementsInput, { color: colors.text, borderColor: colors.border }]}
          value={agenda.announcements ?? ''}
          onSave={(text) => updateField('announcements', text)}
          placeholder={t('agenda.announcements')}
          placeholderTextColor={colors.textTertiary}
          multiline
          editable={!isObserver}
        />
      </FieldRow>

      <FieldRow label={t('agenda.openingHymn')} colors={colors}>
        <SelectorField
          value={getHymnDisplay(agenda.opening_hymn_id, allHymns)}
          placeholder={t('agenda.openingHymn')}
          onPress={() => {
            if (!isObserver) {
              setSelectorModal({ type: 'hymn', field: 'opening_hymn_id' });
            }
          }}
          disabled={isObserver}
          colors={colors}
        />
      </FieldRow>

      <FieldRow label={t('agenda.openingPrayer')} colors={colors}>
        <SelectorField
          value={agenda.opening_prayer_name ?? ''}
          placeholder={t('agenda.openingPrayer')}
          onPress={() => {
            if (!isObserver) {
              setSelectorModal({ type: 'prayer', field: 'opening_prayer' });
            }
          }}
          disabled={isObserver}
          colors={colors}
        />
      </FieldRow>

      {/* Section 2: Designations & Sacrament */}
      <SectionHeader title={t('agenda.sectionSacrament')} colors={colors} />

      <FieldRow label={t('agenda.wardBusiness')} colors={colors}>
        <DebouncedTextInput
          style={[styles.textInput, { color: colors.text, borderColor: colors.border }]}
          value={agenda.sustaining_releasing ?? ''}
          onSave={(text) => updateField('sustaining_releasing', text)}
          placeholder={t('agenda.wardBusiness')}
          placeholderTextColor={colors.textTertiary}
          multiline
          editable={!isObserver}
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
        <DebouncedTextInput
          style={[styles.textInput, styles.indented, { color: colors.text, borderColor: colors.border }]}
          value={agenda.baby_blessing_names ?? ''}
          onSave={(text) => updateField('baby_blessing_names', text)}
          placeholder={t('agenda.names', 'Names')}
          placeholderTextColor={colors.textTertiary}
          editable={!isObserver}
        />
      )}

      <ToggleField
        label={t('agenda.baptismConfirmation', 'Baptism Confirmation')}
        value={agenda.has_baptism_confirmation}
        onToggle={(val) => updateField('has_baptism_confirmation', val)}
        disabled={isObserver}
        colors={colors}
      />
      {agenda.has_baptism_confirmation && (
        <DebouncedTextInput
          style={[styles.textInput, styles.indented, { color: colors.text, borderColor: colors.border }]}
          value={agenda.baptism_confirmation_names ?? ''}
          onSave={(text) => updateField('baptism_confirmation_names', text)}
          placeholder={t('agenda.names', 'Names')}
          placeholderTextColor={colors.textTertiary}
          editable={!isObserver}
        />
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
          value={getHymnDisplay(agenda.sacrament_hymn_id, sacramentalHymns)}
          placeholder={t('agenda.sacramentHymn')}
          onPress={() => {
            if (!isObserver) {
              setSelectorModal({ type: 'sacrament_hymn', field: 'sacrament_hymn_id' });
            }
          }}
          disabled={isObserver}
          colors={colors}
        />
      </FieldRow>

      {/* Section 3: Speeches (normal) or Special Meeting (special) */}
      {!isSpecial ? (
        <>
          {/* Normal meeting: speeches 1 + 2 */}
          <SectionHeader title={t('agenda.sectionFirstSpeeches')} colors={colors} />

          <SpeakerField
            label={`1\u00BA ${t('speeches.speaker')}`}
            speakerName={getSpeech(1)?.speaker_name ?? ''}
            onPress={() => canAssignSpeaker && !isObserver && setSpeakerModalPosition(1)}
            disabled={isObserver || !canAssignSpeaker}
            colors={colors}
          />

          <SpeakerField
            label={`2\u00BA ${t('speeches.speaker')}`}
            speakerName={getSpeech(2)?.speaker_name ?? ''}
            onPress={() => canAssignSpeaker && !isObserver && setSpeakerModalPosition(2)}
            disabled={isObserver || !canAssignSpeaker}
            colors={colors}
          />

          <ToggleField
            label={t('agenda.musicalNumber')}
            value={agenda.has_special_presentation}
            onToggle={(val) => updateField('has_special_presentation', val)}
            disabled={isObserver}
            colors={colors}
          />
          {agenda.has_special_presentation ? (
            <DebouncedTextInput
              style={[styles.textInput, styles.indented, { color: colors.text, borderColor: colors.border }]}
              value={agenda.special_presentation_description ?? ''}
              onSave={(text) => updateField('special_presentation_description', text)}
              placeholder={t('agenda.musicalNumber')}
              placeholderTextColor={colors.textTertiary}
              editable={!isObserver}
            />
          ) : (
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
              />
            </FieldRow>
          )}

          {/* Section 4: Last Speech */}
          <SectionHeader title={t('agenda.sectionLastSpeech')} colors={colors} />

          <SpeakerField
            label={`3\u00BA ${t('speeches.speaker')}`}
            speakerName={getSpeech(3)?.speaker_name ?? ''}
            onPress={() => canAssignSpeaker && !isObserver && setSpeakerModalPosition(3)}
            disabled={isObserver || !canAssignSpeaker}
            colors={colors}
          />
        </>
      ) : (
        <>
          {/* Special meeting: dynamic section header based on type (CR-29) */}
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
          value={getHymnDisplay(agenda.closing_hymn_id, allHymns)}
          placeholder={t('agenda.closingHymn')}
          onPress={() => {
            if (!isObserver) {
              setSelectorModal({ type: 'hymn', field: 'closing_hymn_id' });
            }
          }}
          disabled={isObserver}
          colors={colors}
        />
      </FieldRow>

      <FieldRow label={t('agenda.closingPrayer')} colors={colors}>
        <SelectorField
          value={agenda.closing_prayer_name ?? ''}
          placeholder={t('agenda.closingPrayer')}
          onPress={() => {
            if (!isObserver) {
              setSelectorModal({ type: 'prayer', field: 'closing_prayer' });
            }
          }}
          disabled={isObserver}
          colors={colors}
        />
      </FieldRow>

      {/* Actor selector bottom-sheet */}
      {selectorModal?.type === 'actor' && (
        <ActorSelector
          visible
          roleFilter={(selectorModal.roleFilter ?? 'all') as import('../hooks/useActors').ActorRoleFilter}
          onSelect={(actor) => {
            if (selectorModal.field === 'recognizing') {
              updateField('recognized_names', [actor.name]);
              setSelectorModal(null);
              return;
            }
            const nameField = `${selectorModal.field}_name`;
            const idField = `${selectorModal.field}_actor_id`;
            handleActorSelect(actor, nameField, idField);
            setSelectorModal(null);
          }}
          onClose={() => setSelectorModal(null)}
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

      {/* Prayer selector modal */}
      {selectorModal?.type === 'prayer' && (
        <PrayerSelector
          visible={true}
          onClose={() => setSelectorModal(null)}
          selected={(() => {
            const nameField = `${selectorModal.field}_name` as keyof typeof agenda;
            const idField = `${selectorModal.field}_member_id` as keyof typeof agenda;
            const name = agenda[nameField] as string | null;
            if (!name) return null;
            return { memberId: (agenda[idField] as string | null) ?? null, name };
          })()}
          onSelect={(selection: PrayerSelection | null) => {
            if (!agenda || isObserver) return;
            const nameField = `${selectorModal.field}_name`;
            const idField = `${selectorModal.field}_member_id`;
            updateAgenda.mutate({
              agendaId: agenda.id,
              fields: {
                [nameField]: selection?.name ?? null,
                [idField]: selection?.memberId ?? null,
              } as Record<string, unknown>,
            });
            setSelectorModal(null);
          }}
          placeholder={selectorModal.field === 'opening_prayer' ? t('agenda.openingPrayer') : t('agenda.closingPrayer')}
          disabled={isObserver}
        />
      )}

      {/* Speaker selector modal */}
      {speakerModalPosition !== null && (
        <MemberSelectorModal
          visible
          onSelect={(member) => {
            handleSpeakerAssign(speakerModalPosition, member);
            setSpeakerModalPosition(null);
          }}
          onClose={() => setSpeakerModalPosition(null)}
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
}: {
  value: string;
  placeholder: string;
  onPress: () => void;
  disabled: boolean;
  colors: ThemeColors;
}) {
  return (
    <Pressable
      style={[styles.selectorField, { borderColor: colors.border }]}
      onPress={disabled ? undefined : onPress}
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
    </Pressable>
  );
}

function SpeakerField({
  label,
  speakerName,
  onPress,
  disabled,
  colors,
}: {
  label: string;
  speakerName: string;
  onPress: () => void;
  disabled: boolean;
  colors: ThemeColors;
}) {
  return (
    <FieldRow label={label} colors={colors}>
      <SelectorField
        value={speakerName}
        placeholder={label}
        onPress={onPress}
        disabled={disabled}
        colors={colors}
      />
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
        >
          {/* Handle bar */}
          <View style={styles.sheetHandleBar}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          </View>

          {/* Search */}
          <View style={styles.sheetSearchRow}>
            <SearchInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder={t('common.search')}
            />
            <Pressable onPress={onClose} style={styles.sheetCloseBtn}>
              <Text style={[styles.sheetCloseText, { color: colors.primary }]}>{t('common.close')}</Text>
            </Pressable>
          </View>

          <FlatList
            data={filtered}
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
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  selectorText: {
    fontSize: 15,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    minHeight: 36,
  },
  announcementsInput: {
    minHeight: 66,
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
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    marginBottom: 8,
  },
});
