/**
 * SundayCard: Displays a sunday with DateBlock, LEDs, exception text, and type dropdown.
 * Used in Speeches tab and Home tab.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  FlatList,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
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
  /** Called when the card header is pressed (expand/collapse). */
  onToggle?: () => void;
  /** Called when a speech LED is pressed. */
  onStatusPress?: (speech: Speech) => void;
  /** Called when the sunday type dropdown changes. */
  onTypeChange?: (date: string, type: SundayExceptionReason) => void;
  /** Whether type dropdown is disabled (Observer). */
  typeDisabled?: boolean;
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

interface SundayTypeDropdownProps {
  currentType: SundayTypeOption;
  onSelect: (type: SundayExceptionReason) => void;
  disabled?: boolean;
}

function SundayTypeDropdown({ currentType, onSelect, disabled }: SundayTypeDropdownProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const getTypeLabel = (type: SundayTypeOption): string => {
    if (type === SUNDAY_TYPE_SPEECHES) return t('speechStatus.not_assigned', 'Discursos');
    return t(`sundayExceptions.${type}`, type);
  };

  const handleSelect = (type: SundayTypeOption) => {
    setModalVisible(false);
    if (type !== SUNDAY_TYPE_SPEECHES) {
      onSelect(type as SundayExceptionReason);
    }
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
        <Text style={[styles.dropdownArrow, { color: colors.textSecondary }]}>
          {'\u25BC'}
        </Text>
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
    </>
  );
}

// --- SundayCard ---

export function SundayCard({
  date,
  speeches,
  exception,
  isNext = false,
  isPast = false,
  expanded = false,
  onToggle,
  onStatusPress,
  onTypeChange,
  typeDisabled = false,
  children,
}: SundayCardProps) {
  const { colors } = useTheme();
  const locale = getCurrentLanguage();

  const currentType: SundayTypeOption =
    exception?.reason ?? SUNDAY_TYPE_SPEECHES;

  const isSpeechesType = currentType === SUNDAY_TYPE_SPEECHES;

  // Build speech statuses for the 3 LEDs
  const speechStatuses: SpeechStatus[] = [1, 2, 3].map((pos) => {
    const speech = speeches.find((s) => s.position === pos);
    return speech?.status ?? 'not_assigned';
  });

  const handleTypeChange = useCallback(
    (type: SundayExceptionReason) => {
      onTypeChange?.(date, type);
    },
    [date, onTypeChange]
  );

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
          {!isSpeechesType && (
            <Text
              style={[styles.exceptionText, { color: colors.warning }]}
              numberOfLines={1}
            >
              {exception
                ? currentType
                : ''}
            </Text>
          )}
        </View>

        <View style={styles.leds}>
          {speechStatuses.map((status, idx) => (
            <StatusLED
              key={idx}
              status={status}
              size={14}
              onPress={
                onStatusPress && speeches[idx]
                  ? () => onStatusPress(speeches[idx])
                  : undefined
              }
              disabled={typeDisabled}
            />
          ))}
        </View>
      </Pressable>

      {/* Type dropdown (shown when expanded) */}
      {expanded && (
        <View style={styles.expandedContent}>
          <SundayTypeDropdown
            currentType={currentType}
            onSelect={handleTypeChange}
            disabled={typeDisabled}
          />
          {children}
        </View>
      )}
    </View>
  );
}

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
  },
  exceptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  leds: {
    flexDirection: 'row',
    gap: 6,
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
});
