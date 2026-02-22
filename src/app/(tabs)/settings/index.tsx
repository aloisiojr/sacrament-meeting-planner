import React, { useState, useCallback } from 'react';
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

const SettingsItem = React.memo(function SettingsItem({ label, value, onPress, colors }: SettingsItemProps) {
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
});

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { hasPermission, wardId, wardLanguage, role, signOut, updateAppLanguage, setWardLanguage } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [appLanguageModalVisible, setAppLanguageModalVisible] = useState(false);
  const [wardLanguageModalVisible, setWardLanguageModalVisible] = useState(false);

  const isObserver = role === 'observer';
  const currentAppLanguage = getCurrentLanguage();

  // F116: Ward language change mutation (Bispado/Secretario only)
  const wardLanguageChangeMutation = useMutation({
    mutationFn: async (newLanguage: SupportedLanguage) => {
      const oldLanguage = wardLanguage as SupportedLanguage;
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

      // 3. Activate new language collections (active by default for built-in collections)
      const { data: newCollections } = await supabase
        .from('general_collections')
        .select('id')
        .eq('language', newLanguage);

      if (newCollections && newCollections.length > 0) {
        const upsertRows = newCollections.map((col) => ({
          ward_id: wardId,
          collection_id: col.id,
          active: true,
        }));
        await supabase
          .from('ward_collection_config')
          .upsert(upsertRows, { onConflict: 'ward_id,collection_id' });
      }

      return newLanguage;
    },
    onSuccess: (_data, newLanguage) => {
      // F131: Update AuthContext state immediately
      setWardLanguage(newLanguage);
      // Invalidate topic/collection caches
      queryClient.invalidateQueries({ queryKey: topicKeys.all });
    },
  });

  // F116: App language change handler (all roles)
  const handleAppLanguageSelect = useCallback(
    async (newLanguage: SupportedLanguage) => {
      setAppLanguageModalVisible(false);
      if (newLanguage === currentAppLanguage) return;
      try {
        await updateAppLanguage(newLanguage);
      } catch (err) {
        Alert.alert(t('common.error'), String(err));
      }
    },
    [currentAppLanguage, updateAppLanguage, t]
  );

  // F116: Ward language change handler (Bispado/Secretario only)
  const handleWardLanguageSelect = useCallback(
    (newLanguage: SupportedLanguage) => {
      setWardLanguageModalVisible(false);
      if (newLanguage === wardLanguage) return;

      Alert.alert(
        t('languageChange.warningTitle'),
        t('languageChange.warningMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('languageChange.confirm'),
            style: 'destructive',
            onPress: () => wardLanguageChangeMutation.mutate(newLanguage),
          },
        ]
      );
    },
    [wardLanguage, t, wardLanguageChangeMutation]
  );

  const handleSignOut = useCallback(() => {
    Alert.alert(
      t('settings.signOutTitle'),
      t('settings.signOutMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              queryClient.clear();
              await signOut();
            } catch (err) {
              Alert.alert(t('common.error'), String(err));
            }
          },
        },
      ]
    );
  }, [t, signOut, queryClient]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView>
        <Text style={[styles.title, { color: colors.text }]}>
          {t('settings.title')}
        </Text>

        {/* Section 1: Members & Topics (non-Observer only) */}
        {!isObserver && (
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
          </View>
        )}

        {/* Section 2: Users, History, WhatsApp (non-Observer only) */}
        {!isObserver && (
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
        )}

        {/* Section 3: Language, Theme, About */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          {/* F116: App Language - available to ALL roles including Observer */}
          <SettingsItem
            label={t('settings.appLanguage')}
            value={LANGUAGE_LABELS[currentAppLanguage]}
            onPress={() => setAppLanguageModalVisible(true)}
            colors={colors}
          />
          {/* F116: Ward Language - Bispado and Secretario only */}
          {hasPermission('settings:language') && (
            <SettingsItem
              label={t('settings.wardLanguage')}
              value={LANGUAGE_LABELS[wardLanguage as SupportedLanguage] ?? wardLanguage}
              onPress={() => setWardLanguageModalVisible(true)}
              colors={colors}
            />
          )}
          {!isObserver && hasPermission('settings:timezone') && (
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

        <Pressable
          style={[styles.signOutButton, { borderColor: colors.error }]}
          onPress={handleSignOut}
          accessibilityRole="button"
        >
          <Text style={[styles.signOutText, { color: colors.error }]}>
            {t('settings.signOut')}
          </Text>
        </Pressable>
      </ScrollView>

      {/* App Language Selector Modal */}
      <Modal
        visible={appLanguageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAppLanguageModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setAppLanguageModalVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('settings.appLanguage')}
            </Text>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <Pressable
                key={lang}
                style={[
                  styles.languageOption,
                  { borderBottomColor: colors.divider },
                  lang === currentAppLanguage && { backgroundColor: colors.surfaceVariant },
                ]}
                onPress={() => handleAppLanguageSelect(lang)}
                accessibilityRole="radio"
                accessibilityState={{ selected: lang === currentAppLanguage }}
              >
                <Text style={[styles.languageText, { color: colors.text }]}>
                  {LANGUAGE_LABELS[lang]}
                </Text>
                {lang === currentAppLanguage && (
                  <Text style={[styles.checkmark, { color: colors.primary }]}>
                    {'\u2713'}
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Ward Language Selector Modal */}
      <Modal
        visible={wardLanguageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setWardLanguageModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setWardLanguageModalVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('settings.wardLanguage')}
            </Text>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <Pressable
                key={lang}
                style={[
                  styles.languageOption,
                  { borderBottomColor: colors.divider },
                  lang === wardLanguage && { backgroundColor: colors.surfaceVariant },
                ]}
                onPress={() => handleWardLanguageSelect(lang)}
                accessibilityRole="radio"
                accessibilityState={{ selected: lang === wardLanguage }}
              >
                <Text style={[styles.languageText, { color: colors.text }]}>
                  {LANGUAGE_LABELS[lang]}
                </Text>
                {lang === wardLanguage && (
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
  signOutButton: {
    paddingVertical: 16,
    alignItems: 'center' as const,
    marginHorizontal: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderRadius: 12,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
