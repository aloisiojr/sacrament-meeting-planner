import React from 'react';
import { View, Text, StyleSheet, Pressable, Switch, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/ThemeContext';
import { useOnlineStatus } from '../../../contexts/OnlineStatusContext';
import { useNotificationsEnabled, useSetNotificationsEnabled } from '../../../hooks/useNotifications';

/**
 * Notification settings — master push opt-out. Toggling off flips notifications_enabled on all of
 * the user's device tokens, which process-notifications honors (migration 046).
 */
export default function NotificationsSettingsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const isOnline = useOnlineStatus();

  const { enabled, isLoading } = useNotificationsEnabled();
  const setEnabled = useSetNotificationsEnabled();

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={12}>
          <Text style={[styles.backButton, { color: colors.primary }]}>{t('common.back')}</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>{t('notificationSettings.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <View style={styles.body}>
          <View style={[styles.item, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.itemText, { color: colors.text }]}>{t('notificationSettings.pushEnabled')}</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                {t('notificationSettings.pushEnabledDescription')}
              </Text>
            </View>
            <Switch
              testID="notifications-master-switch"
              value={enabled}
              onValueChange={(val) => setEnabled.mutate(val)}
              disabled={!isOnline || setEnabled.isPending}
              trackColor={{ false: colors.divider, true: colors.primary }}
            />
          </View>
          {!isOnline && (
            <Text style={[styles.offlineNote, { color: colors.textSecondary }]}>
              {t('notificationSettings.offline')}
            </Text>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: { fontSize: 16, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '700' },
  headerSpacer: { width: 50 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  body: { padding: 16 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
  },
  itemText: { fontSize: 16 },
  offlineNote: { fontSize: 12, marginTop: 12, textAlign: 'center' },
});
