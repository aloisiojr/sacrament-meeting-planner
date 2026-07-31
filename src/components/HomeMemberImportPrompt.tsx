/**
 * S8 — Home onboarding prompt (AC14). When the ward has NO members yet and the user can manage
 * members, show a dismissible card linking to the member-import screen. It disappears once members
 * exist and does not reappear once dismissed (persisted per ward in AsyncStorage).
 */
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useMembers } from '../hooks/useMembers';
import { XIcon } from './icons';

const dismissKey = (wardId: string) => `pdf-import-prompt-dismissed:${wardId}`;

export function HomeMemberImportPrompt() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { wardId, hasPermission } = useAuth();
  const { data: members, isSuccess } = useMembers();
  const [dismissed, setDismissed] = useState<boolean | null>(null); // null = loading

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(dismissKey(wardId))
      .then((v) => !cancelled && setDismissed(v === '1'))
      .catch(() => !cancelled && setDismissed(false));
    return () => {
      cancelled = true;
    };
  }, [wardId]);

  const canManage = hasPermission('member:import');
  const isEmpty = isSuccess && (members?.length ?? 0) === 0;
  if (dismissed !== false || !canManage || !isEmpty) return null;

  const dismiss = () => {
    setDismissed(true);
    AsyncStorage.setItem(dismissKey(wardId), '1').catch(() => {});
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.primary }]} testID="home-import-prompt">
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>{t('homeImportPrompt.title')}</Text>
        <Pressable
          onPress={dismiss}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          testID="home-import-prompt-dismiss"
        >
          <XIcon size={18} color={colors.textSecondary} />
        </Pressable>
      </View>
      <Text style={[styles.body, { color: colors.textSecondary }]}>{t('homeImportPrompt.body')}</Text>
      <Pressable
        onPress={() => router.push('/(tabs)/settings/members')}
        style={[styles.action, { backgroundColor: colors.primary }]}
        accessibilityRole="button"
        testID="home-import-prompt-action"
      >
        <Text style={[styles.actionText, { color: colors.onPrimary }]}>{t('homeImportPrompt.action')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { margin: 16, padding: 16, borderRadius: 12, borderWidth: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 12 },
  dismiss: { fontSize: 16 },
  body: { fontSize: 13, marginTop: 6, marginBottom: 12 },
  action: { height: 44, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  actionText: { fontSize: 15, fontWeight: '600' },
});
