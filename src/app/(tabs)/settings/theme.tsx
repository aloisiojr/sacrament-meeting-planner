/**
 * ThemeScreen: 3-option radio list for theme preference.
 * Options: Automatic, Light, Dark.
 * Uses ThemeContext.setPreference to persist the selection.
 */

import { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, type ThemeMode } from '../../../contexts/ThemeContext';
import { CheckIcon } from '../../../components/icons';

const THEME_OPTIONS: ThemeMode[] = ['automatic', 'light', 'dark'];

export default function ThemeScreen() {
  const { t } = useTranslation();
  const { colors, preference, setPreference } = useTheme();
  const router = useRouter();

  const handleSelect = useCallback(
    (mode: ThemeMode) => {
      setPreference(mode);
    },
    [setPreference]
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={12}>
          <Text style={[styles.backButton, { color: colors.primary }]}>
            {t('common.back')}
          </Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>
          {t('settings.theme')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={[styles.section, { backgroundColor: colors.card }]}>
        {THEME_OPTIONS.map((mode) => {
          const isSelected = mode === preference;
          return (
            <Pressable
              key={mode}
              style={[
                styles.item,
                { borderBottomColor: colors.divider },
                isSelected && { backgroundColor: colors.surfaceVariant },
              ]}
              onPress={() => handleSelect(mode)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
            >
              <Text style={[styles.itemText, { color: colors.text }]}>
                {t(`theme.${mode}`)}
              </Text>
              {isSelected && (
                <CheckIcon size={18} color={colors.primary} />
              )}
            </Pressable>
          );
        })}
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
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemText: {
    fontSize: 16,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: '700',
  },
});
