import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';

interface QueryErrorViewProps {
  error: Error | null;
  onRetry: () => void;
  message?: string;
}

export function QueryErrorView({ error, onRetry, message }: QueryErrorViewProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={styles.icon}>{'\u26A0'}</Text>
      <Text style={[styles.title, { color: colors.text }]}>
        {t('errors.queryFailed')}
      </Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        {message ?? t('errors.queryFailedMessage')}
      </Text>
      {__DEV__ && error && (
        <Text style={[styles.detail, { color: colors.textSecondary, backgroundColor: colors.surfaceVariant }]}>
          {error.message}
        </Text>
      )}
      <Pressable
        style={[styles.retryButton, { backgroundColor: colors.primary }]}
        onPress={onRetry}
        accessibilityRole="button"
      >
        <Text style={[styles.retryText, { color: colors.onPrimary }]}>
          {t('common.retry')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  icon: {
    fontSize: 40,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  detail: {
    fontSize: 12,
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 16,
    padding: 8,
    borderRadius: 6,
    overflow: 'hidden',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
