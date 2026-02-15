/**
 * AboutScreen: Static info screen showing app name and version.
 */

import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useTheme } from '../../../contexts/ThemeContext';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export default function AboutScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={[styles.backButton, { color: colors.primary }]}>
            {t('common.back')}
          </Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>
          {t('about.title')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <View style={styles.infoRow}>
          <Text style={[styles.appName, { color: colors.text }]}>
            {t('about.appName')}
          </Text>
        </View>
        <View style={[styles.infoRow, { borderTopColor: colors.divider, borderTopWidth: StyleSheet.hairlineWidth }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {t('about.version')}
          </Text>
          <Text style={[styles.value, { color: colors.text }]}>
            {APP_VERSION}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 50,
  },
  section: {
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  infoRow: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  appName: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
  },
});
