/**
 * OfflineBanner: displayed when device loses network connectivity.
 * Shows translated "offline" message at top of screen.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';

interface OfflineBannerProps {
  visible: boolean;
}

export function OfflineBanner({ visible }: OfflineBannerProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  // Theme-aware error banner. textInverse (white in light / dark in dark) stays legible on the
  // error red of each theme (light #DC2626 → white; dark #F87171 → dark text).
  return (
    <View style={[styles.banner, { backgroundColor: colors.error, paddingTop: insets.top + 8 }]}>
      <Text style={[styles.text, { color: colors.textInverse }]}>{t('common.offline')}</Text>
      <Text style={[styles.subtext, { color: colors.textInverse }]}>{t('common.offlineMessage')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingBottom: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
  },
  subtext: {
    fontSize: 13,
    marginTop: 2,
  },
});
