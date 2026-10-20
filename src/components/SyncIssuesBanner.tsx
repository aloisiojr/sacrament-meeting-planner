/**
 * SyncIssuesBanner: shown whenever the offline dead-letter list is non-empty (EST-04). A mutation
 * that exhausted its retries used to vanish with only a console.warn; now the user always sees how
 * many changes never synced, online or offline, until the list is cleared (sign-out).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useDeadLetterCount } from '../hooks/useDeadLetterCount';

export function SyncIssuesBanner() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const count = useDeadLetterCount();

  if (count === 0) return null;

  return (
    <View style={[styles.banner, { backgroundColor: colors.error }]} testID="sync-issues-banner">
      <Text style={[styles.text, { color: colors.textInverse }]}>
        {t('offline.unsyncedCount', { count })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
});
