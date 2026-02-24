/**
 * SundayCard: Displays a sunday with DateBlock, LEDs, exception text, and type dropdown.
 * Used in Speeches tab and Home tab.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { ChevronDownIcon } from './icons';
import { StatusLED } from './StatusLED';
import {
  SUNDAY_TYPE_SPEECHES,
  SUNDAY_TYPE_OPTIONS,
  type SundayTypeOption,
} from '../hooks/useSundayTypes';
import { formatDate, zeroPadDay } from '../lib/dateUtils';
import { getCurrentLanguage, type SupportedLanguage } from '../i18n';
import type { Speech, SundayException, SpeechStatus, SundayExceptionReason } from '../types/database';

// --- Types ---

export interface SundayCardProps {
  /** The sunday date (ISO string YYYY-MM-DD). */
  date: string;
  /** The 3 speeches for this sunday (may be empty if not yet created). */
  speeches: Speech[];
  /** The exception entry for this sunday (null if "speeches" type). */
  exception: SundayException | null;
  /** Whether this is the next upcoming sunday (highlighted). */
  isNext?: boolean;
  /** Whether this is a past sunday (reduced opacity when collapsed). */
  isPast?: boolean;
  /** Whether the card is expanded. */
  expanded?: boolean;
  /** F118: Whether the 2nd speech is enabled for this sunday. */
  hasSecondSpeech?: boolean;
  /** CR-221: Whether managed prayers is enabled. */
  managePrayers?: boolean;
  /** Called when the card header is pressed (expand/collapse). */
  onToggle?: () => void;
  /** Called when a speech LED is pressed. */
  onStatusPress?: (speech: Speech) => void;
  /** Called when the sunday type dropdown changes. */
  onTypeChange?: (date: string, type: SundayExceptionReason, customReason?: string) => void;
  /** Called when the sunday type is reverted to "speeches" (remove exception). */
  onRemoveException?: (date: string) => void;
  /** Called to delete speeches when changing sunday type away from speeches. */
  onDeleteSpeeches?: (date: string, positions?: number[]) => void;
  /** Whether type dropdown is disabled (Observer). */
  typeDisabled?: boolean;
  /** Optional render function for right side of header (e.g., pencil button). */
  renderHeaderRight?: () => React.ReactNode;
  /** Children to render when expanded (speech slots, etc.). */
  children?: React.ReactNode;
}

// --- DateBlock Component ---

interface DateBlockProps {
  date: string;
  locale: SupportedLanguage;
}

function DateBlock({ date, locale }: DateBlockProps) {
  const { colors } = useTheme();
  const [year, month, day] = date.split('-');
  const dayNum = parseInt(day, 10);
  const monthNum = parseInt(month, 10);

  // Get month abbreviation from dateUtils
  const { getMonthAbbr } = require('../lib/dateUtils');
  const monthAbbr = getMonthAbbr(monthNum, locale);
  const dayStr = zeroPadDay(dayNum);

  return (
    <View style={[styles.dateBlock, { backgroundColor: colors.surfaceVariant }]}>
      <Text style={[styles.dateDay, { color: colors.text }]}>{dayStr}</Text>
      <Text style={[styles.dateMonth, { color: colors.textSecondary }]}>{monthAbbr}</Text>
    </View>
  );
}

// --- SundayTypeDropdown ---

export interface SundayTypeDropdownProps {
  currentType: SundayTypeOption;
  onSelect: (type: SundayExceptionReason, customReason?: string) => void;
  onRevertToSpeeches: () => void;
  disabled?: boolean;
  speeches: Speech[];
  date: string;
  onDeleteSpeeches?: (date: string, positions?: number[]) => void;
  /** CR-221: Whether managed prayers is enabled. */
  managePrayers?: boolean;
}

export function SundayTypeDropdown({ currentType, onSelect, onRevertToSpeeches, disabled, speeches, date, onDeleteSpeeches, managePrayers = false }: SundayTypeDropdownProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [otherModalVisible, setOtherModalVisible] = useState(false);
  const [customReason, setCustomReason] = useState('');

  const getTypeLabel = (type: SundayTypeOption): string => {
    if (type === SUNDAY_TYPE_SPEECHES) return t('sundayExceptions.speeches', 'Discursos');
    return t(`sundayExceptions.${type}`, type);
  };

  const isTestimonyOrPrimary = (type: string) =>
    type === 'testimony_meeting' || type === 'primary_presentation';

  const isConferenceOrOther = (type: string) =>
    type === 'general_conference' || type === 'stake_conference' ||
    type === 'ward_conference' || type === 'other';

  const handleSelect = (type: SundayTypeOption) => {
    setModalVisible(false);
    if (type === SUNDAY_TYPE_SPEECHES) {
      onRevertToSpeeches();
      return;
    }

    // CR-221: Determine which positions to delete based on type transition and managePrayers
    const getPositionsToDelete = (): number[] | undefined => {
      if (!managePrayers) return undefined; // delete all (legacy behavior)

      if (currentType === SUNDAY_TYPE_SPEECHES) {
        if (isTestimonyOrPrimary(type)) return [1, 2, 3]; // preserve 0,4
        if (isConferenceOrOther(type)) return [0, 1, 2, 3, 4]; // delete all
      }
      if (isTestimonyOrPrimary(currentType)) {
        if (isConferenceOrOther(type)) return [0, 4]; // delete prayer slots
        if (isTestimonyOrPrimary(type)) return undefined; // no deletion needed (testimony <-> primary)
      }
      return undefined;
    };

    // CR-221: Determine confirmation message based on what will be deleted
    const getConfirmMessage = (): string | null => {
      if (!managePrayers) return null; // use default

      const hasSpeechAssignments = speeches
        .filter((s) => s.position >= 1 && s.position <= 3)
        .some((s) => !!s.speaker_name || !!s.topic_title);
      const hasPrayerAssignments = speeches
        .filter((s) => s.position === 0 || s.position === 4)
        .some((s) => !!s.speaker_name);

      if (currentType === SUNDAY_TYPE_SPEECHES) {
        if (isTestimonyOrPrimary(type)) {
          // Only speech slots will be deleted, prayers preserved
          if (hasSpeechAssignments) return t('sundayExceptions.changeConfirmMessage');
          return null; // no assignments to lose
        }
        if (isConferenceOrOther(type)) {
          // Both speeches and prayers will be deleted
          if (hasSpeechAssignments && hasPrayerAssignments) return t('sundayExceptions.confirmDeleteBoth');
          if (hasSpeechAssignments) return t('sundayExceptions.changeConfirmMessage');
          if (hasPrayerAssignments) return t('sundayExceptions.confirmDeletePrayers');
          return null;
        }
      }
      if (isTestimonyOrPrimary(currentType)) {
        if (isConferenceOrOther(type)) {
          // Prayer slots will be deleted
          if (hasPrayerAssignments) return t('sundayExceptions.confirmDeletePrayers');
          return null;
        }
        // testimony <-> primary: no deletion
        return null;
      }
      return null;
    };

    // Fallback for non-managePrayers: original logic
    if (!managePrayers) {
      const hasAssignments = speeches.some(s => !!s.speaker_name || !!s.topic_title);
      if (currentType === SUNDAY_TYPE_SPEECHES && hasAssignments) {
        Alert.alert(
          t('sundayExceptions.changeConfirmTitle'),
          t('sundayExceptions.changeConfirmMessage'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('common.confirm'),
              style: 'destructive',
              onPress: () => {
                onDeleteSpeeches?.(date);
                if (type === 'other') {
                  setCustomReason('');
                  setOtherModalVisible(true);
                } else {
                  onSelect(type as SundayExceptionReason);
                }
              },
            },
          ]
        );
        return;
      }
      if (currentType === SUNDAY_TYPE_SPEECHES) {
        onDeleteSpeeches?.(date);
      }
      if (type === 'other') {
        setCustomReason('');
        setOtherModalVisible(true);
        return;
      }
      onSelect(type as SundayExceptionReason);
      return;
    }

    // CR-221: managePrayers-aware type change logic
    const positions = getPositionsToDelete();
    const confirmMsg = getConfirmMessage();

    const executeChange = () => {
      // testimony <-> primary: no deletion needed
      if (isTestimonyOrPrimary(currentType) && isTestimonyOrPrimary(type)) {
        // No deletion, just change type
      } else if (positions !== undefined) {
        onDeleteSpeeches?.(date, positions);
      } else {
        onDeleteSpeeches?.(date);
      }

      if (type === 'other') {
        setCustomReason('');
        setOtherModalVisible(true);
      } else {
        onSelect(type as SundayExceptionReason);
      }
    };

    if (confirmMsg) {
      Alert.alert(
        t('sundayExceptions.changeConfirmTitle'),
        confirmMsg,
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.confirm'),
            style: 'destructive',
            onPress: executeChange,
          },
        ]
      );
    } else {
      executeChange();
    }
  };

  const handleOtherConfirm = () => {
    const trimmed = customReason.trim();
    if (!trimmed) return;
    setOtherModalVisible(false);
    onSelect('other', trimmed);
  };

  return (
    <>
      <Pressable
        style={[styles.dropdown, { borderColor: colors.border }]}
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`Sunday type: ${getTypeLabel(currentType)}`}
      >
        <Text
          style={[
            styles.dropdownText,
            { color: disabled ? colors.textTertiary : colors.text },
          ]}
          numberOfLines={1}
        >
          {getTypeLabel(currentType)}
        </Text>
        <ChevronDownIcon size={10} color={colors.textSecondary} />
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <FlatList
              data={SUNDAY_TYPE_OPTIONS as unknown as SundayTypeOption[]}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.modalItem,
                    item === currentType && { backgroundColor: colors.primaryContainer },
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      { color: colors.text },
                      item === currentType && { fontWeight: '600', color: colors.primary },
                    ]}
                  >
                    {getTypeLabel(item)}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>

      {/* "Other" custom reason dialog */}
      <Modal
        visible={otherModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOtherModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setOtherModalVisible(false)}
        >
          <View
            style={[styles.otherModalContent, { backgroundColor: colors.card }]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={[styles.otherModalTitle, { color: colors.text }]}>
              {t('sundayExceptions.other')}
            </Text>
            <TextInput
              style={[styles.otherModalInput, {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.inputBackground,
              }]}
              value={customReason}
              onChangeText={setCustomReason}
              placeholder={t('sundayExceptions.otherPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              autoFocus
            />
            <View style={styles.otherModalButtons}>
              <Pressable
                style={[styles.otherModalButton, { backgroundColor: colors.surfaceVariant }]}
                onPress={() => setOtherModalVisible(false)}
              >
                <Text style={[styles.otherModalButtonText, { color: colors.text }]}>
                  {t('common.cancel')}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.otherModalButton, {
                  backgroundColor: customReason.trim() ? colors.primary : colors.surfaceVariant,
                }]}
                onPress={handleOtherConfirm}
                disabled={!customReason.trim()}
              >
                <Text style={[styles.otherModalButtonText, {
                  color: customReason.trim() ? colors.onPrimary : colors.textTertiary,
                }]}>
                  {t('common.confirm')}
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// --- SundayCard ---

export const SundayCard = React.memo(function SundayCard({
  date,
  speeches,
  exception,
  isNext = false,
  isPast = false,
  expanded = false,
  hasSecondSpeech = true,
  managePrayers = false,
  onToggle,
  onStatusPress,
  onTypeChange,
  onRemoveException,
  onDeleteSpeeches,
  typeDisabled = false,
  renderHeaderRight,
  children,
}: SundayCardProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const locale = getCurrentLanguage();

  const currentType: SundayTypeOption =
    exception?.reason ?? SUNDAY_TYPE_SPEECHES;

  const isSpeechesType = currentType === SUNDAY_TYPE_SPEECHES;
  const isTestimonyOrPrimary = currentType === 'testimony_meeting' || currentType === 'primary_presentation';

  // F118: Determine which positions to show based on has_second_speech
  const visiblePositions = hasSecondSpeech ? [1, 2, 3] : [1, 3];

  // Build speech statuses for the visible LEDs
  const speechStatuses: SpeechStatus[] = visiblePositions.map((pos) => {
    const speech = speeches.find((s) => s.position === pos);
    return speech?.status ?? 'not_assigned';
  });

  const handleTypeChange = useCallback(
    (type: SundayExceptionReason, customReason?: string) => {
      onTypeChange?.(date, type, customReason);
    },
    [date, onTypeChange]
  );

  const handleRemoveException = useCallback(() => {
    onRemoveException?.(date);
  }, [date, onRemoveException]);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        isNext && { borderColor: colors.primary, borderWidth: 2 },
        isPast && !expanded && { opacity: 0.6 },
      ]}
    >
      {/* Header */}
      <Pressable
        style={styles.header}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={`Sunday ${formatDate(date, locale)}`}
        accessibilityState={{ expanded }}
      >
        <DateBlock date={date} locale={locale} />

        <View style={styles.headerCenter}>
          {/* CR-221: For testimony/primary with managePrayers: show prayer lines instead of just exception text */}
          {!isSpeechesType && isTestimonyOrPrimary && managePrayers && !expanded && (() => {
            const openingPrayer = speeches.find((s) => s.position === 0);
            const closingPrayer = speeches.find((s) => s.position === 4);
            return (
              <>
                <Text
                  style={[styles.exceptionText, { color: colors.warning }]}
                  numberOfLines={1}
                >
                  {exception
                    ? (exception.reason === 'other' && exception.custom_reason
                        ? exception.custom_reason
                        : t(`sundayExceptions.${currentType}`))
                    : ''}
                </Text>
                <View style={styles.speechRow}>
                  <StatusLED
                    status={openingPrayer?.status ?? 'not_assigned'}
                    size={10}
                  />
                  <Text
                    style={[styles.speakerNameLine, { color: colors.textSecondary, fontStyle: 'italic' }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {t('prayers.prayerPrefix')} {openingPrayer?.speaker_name ?? ''}
                  </Text>
                </View>
                <View style={styles.speechRow}>
                  <StatusLED
                    status={closingPrayer?.status ?? 'not_assigned'}
                    size={10}
                  />
                  <Text
                    style={[styles.speakerNameLine, { color: colors.textSecondary, fontStyle: 'italic' }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {t('prayers.prayerPrefix')} {closingPrayer?.speaker_name ?? ''}
                  </Text>
                </View>
              </>
            );
          })()}
          {/* Non-speeches types: show exception text (unless testimony/primary with managePrayers handled above) */}
          {!isSpeechesType && !(isTestimonyOrPrimary && managePrayers && !expanded) && (
            <Text
              style={[styles.exceptionText, { color: colors.warning }]}
              numberOfLines={1}
            >
              {exception
                ? (exception.reason === 'other' && exception.custom_reason
                    ? exception.custom_reason
                    : t(`sundayExceptions.${currentType}`))
                : ''}
            </Text>
          )}
          {isSpeechesType && !expanded && (
            <>
              {/* CR-221: Opening prayer line (collapsed) */}
              {managePrayers && (() => {
                const openingPrayer = speeches.find((s) => s.position === 0);
                return (
                  <View style={styles.speechRow}>
                    <StatusLED
                      status={openingPrayer?.status ?? 'not_assigned'}
                      size={10}
                    />
                    <Text
                      style={[styles.speakerNameLine, { color: colors.textSecondary, fontStyle: 'italic' }]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {t('prayers.prayerPrefix')} {openingPrayer?.speaker_name ?? ''}
                    </Text>
                  </View>
                );
              })()}
              {/* F118: Show only visible positions; no ordinal labels (AC-118-08) */}
              {visiblePositions.map((pos, idx) => {
                const speech = speeches.find((s) => s.position === pos);
                const name = speech?.speaker_name ?? '';
                const status = speechStatuses[idx] ?? 'not_assigned';
                return (
                  <View key={pos} style={styles.speechRow}>
                    <StatusLED
                      status={status}
                      size={10}
                      onPress={
                        onStatusPress && speech
                          ? () => onStatusPress(speech)
                          : undefined
                      }
                      disabled={typeDisabled}
                    />
                    {name ? (
                      <Text
                        style={[styles.speakerNameLine, { color: colors.textSecondary }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {name}
                      </Text>
                    ) : (
                      <Text style={[styles.speakerNameLine, { color: colors.textSecondary }]}>
                        {' '}
                      </Text>
                    )}
                  </View>
                );
              })}
              {/* CR-221: Closing prayer line (collapsed) */}
              {managePrayers && (() => {
                const closingPrayer = speeches.find((s) => s.position === 4);
                return (
                  <View style={styles.speechRow}>
                    <StatusLED
                      status={closingPrayer?.status ?? 'not_assigned'}
                      size={10}
                    />
                    <Text
                      style={[styles.speakerNameLine, { color: colors.textSecondary, fontStyle: 'italic' }]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {t('prayers.prayerPrefix')} {closingPrayer?.speaker_name ?? ''}
                    </Text>
                  </View>
                );
              })()}
            </>
          )}
        </View>

        {!onToggle && renderHeaderRight && renderHeaderRight()}
      </Pressable>

      {/* Type dropdown (shown when expanded) */}
      {expanded && (
        <View style={styles.expandedContent}>
          <SundayTypeDropdown
            currentType={currentType}
            onSelect={handleTypeChange}
            onRevertToSpeeches={handleRemoveException}
            disabled={typeDisabled}
            speeches={speeches}
            date={date}
            onDeleteSpeeches={onDeleteSpeeches}
            managePrayers={managePrayers}
          />
          {children}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 12,
    marginVertical: 4,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateBlock: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateDay: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 12,
    textTransform: 'uppercase',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
    justifyContent: 'center',
  },
  exceptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  leds: {
    flexDirection: 'row',
    gap: 6,
  },
  ledsVertical: {
    flexDirection: 'column',
    gap: 4,
  },
  speakerNameLine: {
    fontSize: 13,
  },
  speechRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  expandedContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  dropdownText: {
    flex: 1,
    fontSize: 14,
  },
  dropdownArrow: {
    fontSize: 10,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  modalContent: {
    borderRadius: 12,
    width: '100%',
    maxHeight: 400,
    paddingVertical: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  modalItem: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  modalItemText: {
    fontSize: 16,
  },
  otherModalContent: {
    borderRadius: 14,
    width: '85%',
    paddingVertical: 20,
    paddingHorizontal: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  otherModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  otherModalInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  otherModalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  otherModalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  otherModalButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
