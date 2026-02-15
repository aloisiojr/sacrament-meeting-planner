import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_LABELS,
  changeLanguage,
  getCurrentLanguage,
} from '../../../i18n';
import type { SupportedLanguage } from '../../../i18n';
import { topicKeys } from '../../../hooks/useTopics';

interface SettingsItemProps {
  label: string;
  value?: string;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}

function SettingsItem({ label, value, onPress, colors }: SettingsItemProps) {
  return (
    <Pressable
      style={[styles.item, { borderBottomColor: colors.divider }]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <Text style={[styles.itemText, { color: colors.text }]}>{label}</Text>
      <View style={styles.itemRight}>
        {value ? (
          <Text style={[styles.itemValue, { color: colors.textSecondary }]}>{value}</Text>
        ) : null}
        <Text style={[styles.itemArrow, { color: colors.textSecondary }]}>{'\u203A'}</Text>
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { hasPermission, wardId } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  const currentLanguage = getCurrentLanguage();

  const languageChangeMutation = useMutation({
    mutationFn: async (newLanguage: SupportedLanguage) => {
      const oldLanguage = getCurrentLanguage();
      if (newLanguage === oldLanguage) return;

      // 1. Update ward.language in Supabase
      const { error: wardError } = await supabase
        .from('wards')
        .update({ language: newLanguage })
        .eq('id', wardId);
      if (wardError) throw wardError;

      // 2. Deactivate all collections from the OLD language
      const { data: oldCollections } = await supabase
        .from('general_collections')
        .select('id')
        .eq('language', oldLanguage);

      if (oldCollections && oldCollections.length > 0) {
        const oldCollectionIds = oldCollections.map((c) => c.id);
        await supabase
          .from('ward_collection_config')
          .update({ active: false })
          .eq('ward_id', wardId)
          .in('collection_id', oldCollectionIds);
      }

      // 3. Upsert new language collection configs (inactive by default)
      const { data: newCollections } = await supabase
        .from('general_collections')
        .select('id')
        .eq('language', newLanguage);

      if (newCollections && newCollections.length > 0) {
        const upsertRows = newCollections.map((col) => ({
          ward_id: wardId,
          collection_id: col.id,
          active: false,
        }));
        await supabase
          .from('ward_collection_config')
          .upsert(upsertRows, { onConflict: 'ward_id,collection_id' });
      }

      // 4. Change UI language immediately
      changeLanguage(newLanguage);
    },
    onSuccess: () => {
      // Invalidate topic/collection caches
      queryClient.invalidateQueries({ queryKey: topicKeys.all });
    },
  });

  const handleLanguageSelect = useCallback(
    (newLanguage: SupportedLanguage) => {
      setLanguageModalVisible(false);
      if (newLanguage === currentLanguage) return;

      Alert.alert(
        t('languageChange.warningTitle'),
        t('languageChange.warningMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('languageChange.confirm'),
            style: 'destructive',
            onPress: () => languageChangeMutation.mutate(newLanguage),
          },
        ]
      );
    },
    [currentLanguage, t, languageChangeMutation]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView>
        <Text style={[styles.title, { color: colors.text }]}>
          {t('settings.title')}
        </Text>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          {hasPermission('member:read') && (
            <SettingsItem
              label={t('settings.members')}
              onPress={() => router.push('/(tabs)/settings/members')}
              colors={colors}
            />
          )}
          {hasPermission('topic:write') && (
            <SettingsItem
              label={t('settings.topics')}
              onPress={() => router.push('/(tabs)/settings/topics')}
              colors={colors}
            />
          )}
          {hasPermission('settings:access') && (
            <SettingsItem
              label={t('settings.actors')}
              onPress={() => router.push('/(tabs)/settings/actors')}
              colors={colors}
            />
          )}
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          {hasPermission('settings:users') && (
            <SettingsItem
              label={t('settings.users')}
              onPress={() => router.push('/(tabs)/settings/users')}
              colors={colors}
            />
          )}
          {hasPermission('history:read') && (
            <SettingsItem
              label={t('settings.history')}
              onPress={() => router.push('/(tabs)/settings/history')}
              colors={colors}
            />
          )}
          {hasPermission('settings:whatsapp') && (
            <SettingsItem
              label={t('settings.whatsappTemplate')}
              onPress={() => router.push('/(tabs)/settings/whatsapp')}
              colors={colors}
            />
          )}
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          {hasPermission('settings:language') && (
            <SettingsItem
              label={t('settings.language')}
              value={LANGUAGE_LABELS[currentLanguage]}
              onPress={() => setLanguageModalVisible(true)}
              colors={colors}
            />
          )}
          {hasPermission('settings:timezone') && (
            <SettingsItem
              label={t('settings.timezone')}
              onPress={() => router.push('/(tabs)/settings/timezone')}
              colors={colors}
            />
          )}
          <SettingsItem
            label={t('settings.theme')}
            onPress={() => router.push('/(tabs)/settings/theme')}
            colors={colors}
          />
          <SettingsItem
            label={t('settings.about')}
            onPress={() => router.push('/(tabs)/settings/about')}
            colors={colors}
          />
        </View>
      </ScrollView>

      {/* Language Selector Modal */}
      <Modal
        visible={languageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setLanguageModalVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('settings.language')}
            </Text>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <Pressable
                key={lang}
                style={[
                  styles.languageOption,
                  { borderBottomColor: colors.divider },
                  lang === currentLanguage && { backgroundColor: colors.surfaceVariant },
                ]}
                onPress={() => handleLanguageSelect(lang)}
                accessibilityRole="radio"
                accessibilityState={{ selected: lang === currentLanguage }}
              >
                <Text style={[styles.languageText, { color: colors.text }]}>
                  {LANGUAGE_LABELS[lang]}
                </Text>
                {lang === currentLanguage && (
                  <Text style={[styles.checkmark, { color: colors.primary }]}>
                    {'\u2713'}
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  section: {
    marginBottom: 24,
    borderRadius: 12,
    marginHorizontal: 16,
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
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemValue: {
    fontSize: 14,
  },
  itemArrow: {
    fontSize: 22,
    fontWeight: '300',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    borderRadius: 14,
    paddingVertical: 12,
    overflow: 'hidden',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  languageText: {
    fontSize: 16,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: '700',
  },
});
