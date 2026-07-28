import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { STORE_URL } from '../lib/appStore';

/**
 * Blocking screen shown when the app build is below the minimum supported version.
 * Offers a store button (or a message where the store isn't available, e.g. Android pre-launch).
 */
export function UpdateRequiredScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>{t('update.title')}</Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>{t('update.message')}</Text>
      {STORE_URL ? (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => {
            if (STORE_URL) Linking.openURL(STORE_URL);
          }}
          activeOpacity={0.8}
        >
          <Text style={[styles.buttonText, { color: colors.onPrimary }]}>{t('update.button')}</Text>
        </TouchableOpacity>
      ) : (
        <Text style={[styles.message, { color: colors.textSecondary }]}>{t('update.noStore')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
  message: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  button: { height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
