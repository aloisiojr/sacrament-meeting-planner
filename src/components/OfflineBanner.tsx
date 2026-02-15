/**
 * OfflineBanner: displayed when device loses network connectivity.
 * Shows translated "offline" message at top of screen.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

interface OfflineBannerProps {
  visible: boolean;
}

export function OfflineBanner({ visible }: OfflineBannerProps) {
  const { t } = useTranslation();

  if (!visible) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{t('common.offline')}</Text>
      <Text style={styles.subtext}>{t('common.offlineMessage')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#E53E3E',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  subtext: {
    color: '#FED7D7',
    fontSize: 12,
    marginTop: 2,
  },
});
