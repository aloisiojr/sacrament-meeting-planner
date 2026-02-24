import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, Modal, Switch } from 'react-native';
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
  toDbLocale,
} from '../../../i18n';
import type { SupportedLanguage } from '../../../i18n';
import { topicKeys } from '../../../hooks/useTopics';
import { useWardManagePrayers, wardKeys } from '../../../hooks/useSpeeches';
import { logAction, buildLogDescription } from '../../../lib/activityLog';
import { ChevronRightIcon, CheckIcon } from '../../../components/icons';

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
        <ChevronRightIcon size={18} color={colors.textSecondary} />
      </View>
    </Pressable>
  );
});

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { hasPermission, wardId, wardLanguage, role, signOut, updateAppLanguage, setWardLanguage, user, userName } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [appLanguageModalVisible, setAppLanguageModalVisible] = useState(false);
  const [wardLanguageModalVisible, setWardLanguageModalVisible] = useState(false);

  const isObserver = role === 'observer';
  const isBishopric = role === 'bishopric';
  const currentAppLanguage = getCurrentLanguage();

  // CR-221: Managed prayers toggle (Bispado only)
  const { managePrayers } = useWardManagePrayers();

  const toggleManagePrayersMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from('wards')
        .update({ manage_prayers: enabled })
        .eq('id', wardId);
      if (error) throw error;
    },
    onSuccess: (_data, enabled) => {
      queryClient.invalidateQueries({ queryKey: wardKeys.managePrayers(wardId) });
      queryClient.invalidateQueries({ queryKey: ['ward', wardId] });
      if (user) {
        logAction(wardId, user.id, user.email ?? '', 'settings:manage_prayers',
          buildLogDescription('settings:manage_prayers', { enabled: String(enabled) }), userName);
      }
    },
  });

  // F116: Ward language change mutation (Bispado/Secretario only)
  const wardLanguageChangeMutation = useMutation({
    mutationFn: async (newLanguage: SupportedLanguage) => {
      const oldLanguage = wardLanguage as SupportedLanguage;
      if (newLanguage === oldLanguage) return;

      // 1. Update ward.language and reset whatsapp_template in Supabase
      const { error: wardError } = await supabase
        .from('wards')
        .update({ language: newLanguage, whatsapp_template: null })
        .eq('id', wardId);
      if (wardError) throw wardError;

      // 2. Deactivate all collections from the OLD language
      const { data: oldCollections } = await supabase
        .from('general_collections')
        .select('id')
        .eq('language', toDbLocale(oldLanguage));

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
        .eq('language', toDbLocale(newLanguage));

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
      // F141: Invalidate ward cache so whatsapp.tsx refetches updated record
      queryClient.invalidateQueries({ queryKey: ['ward', wardId] });
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
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView>
        <Text style={[styles.title, { color: colors.text }]}>
          {t('settings.title')}
        </Text>

        {/* Group 1: Ward Settings (non-Observer only) */}
        {!isObserver && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              {t('settings.wardSettingsGroup')}
            </Text>
            <View style={[styles.section, { backgroundColor: colors.card }]}>
              {hasPermission('member:read') && (
                <SettingsItem
                  label={t('settings.members')}
                  onPress={() => router.push('/(tabs)/settings/members')}
                  colors={colors}
                />
              )}
              {isBishopric && (
                <View style={[styles.item, { borderBottomColor: colors.divider }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemText, { color: colors.text }]}>
                      {t('settings.managePrayers')}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                      {t('settings.managePrayersDescription')}
                    </Text>
                  </View>
                  <Switch
                    value={managePrayers}
                    onValueChange={(val) => toggleManagePrayersMutation.mutate(val)}
                    trackColor={{ false: colors.divider, true: colors.primary }}
                  />
                </View>
              )}
              {hasPermission('topic:write') && (
                <SettingsItem
                  label={t('settings.topics')}
                  onPress={() => router.push('/(tabs)/settings/topics')}
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
              {hasPermission('settings:language') && (
                <SettingsItem
                  label={t('settings.wardLanguage')}
                  value={LANGUAGE_LABELS[wardLanguage as SupportedLanguage] ?? wardLanguage}
                  onPress={() => setWardLanguageModalVisible(true)}
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
            </View>
          </>
        )}

        {/* Group 2: App Settings (all users) */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          {t('settings.appSettingsGroup')}
        </Text>
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
          <SettingsItem
            label={t('settings.appLanguage')}
            value={LANGUAGE_LABELS[currentAppLanguage]}
            onPress={() => setAppLanguageModalVisible(true)}
            colors={colors}
          />
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
                  <CheckIcon size={18} color={colors.primary} />
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
                  <CheckIcon size={18} color={colors.primary} />
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
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
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
