/**
 * DateBlock: the shared "big day number over month abbreviation" tile shown on the left of every
 * Sunday card. Extracted from the (previously duplicated) inline copies in SundayCard, the Agendas
 * tab and the Home tab so all three render the identical visual.
 *
 * Reads theme + current language internally (matching the sibling card components) so callers only
 * pass the date. `highlighted` applies a subtle primary tint for the Home hero card.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { zeroPadDay, getMonthAbbr } from '../lib/dateUtils';
import { getCurrentLanguage } from '../i18n';

export interface DateBlockProps {
  /** The Sunday date (ISO string YYYY-MM-DD). */
  date: string;
  /** Subtle highlight (primary tint) for the Home hero card. */
  highlighted?: boolean;
  /** Optional testID for E2E / unit targeting. */
  testID?: string;
}

export function DateBlock({ date, highlighted = false, testID }: DateBlockProps) {
  const { colors } = useTheme();
  const locale = getCurrentLanguage();

  const [, month, day] = date.split('-');
  const dayNum = parseInt(day, 10);
  const monthNum = parseInt(month, 10);

  const monthAbbr = getMonthAbbr(monthNum, locale);
  const dayStr = zeroPadDay(dayNum);

  return (
    <View
      style={[
        styles.dateBlock,
        // Highlighted card bg is primaryContainer, so the DateBlock uses the stronger `primary`
        // to keep contrast; otherwise the normal surfaceVariant tile.
        { backgroundColor: highlighted ? colors.primary : colors.surfaceVariant },
      ]}
      testID={testID}
    >
      <Text style={[styles.dateDay, { color: highlighted ? colors.onPrimary : colors.text }]}>
        {dayStr}
      </Text>
      <Text
        style={[styles.dateMonth, { color: highlighted ? colors.onPrimary : colors.textSecondary }]}
      >
        {monthAbbr}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dateBlock: {
    width: 52,
    height: 52,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateDay: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 26,
  },
  dateMonth: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 13,
    textTransform: 'uppercase',
  },
});
