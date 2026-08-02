import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/ThemeContext';
import { useOnlineStatus } from '../../../contexts/OnlineStatusContext';
import { useWardInfo, useUpdateWardInfo } from '../../../hooks/useWard';

/**
 * Edit the ward name and stake name (post-registration). Writes are RLS-gated to non-observers of
 * the ward (migration 044). Reachable only from the ward-settings group (settings:access).
 */
export default function WardInfoScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const isOnline = useOnlineStatus();

  const { data: wardInfo, isLoading } = useWardInfo();
  const updateWard = useUpdateWardInfo();

  // Derived, not seeded by an effect: the field shows the loaded value until the user edits it,
  // and the draft wins from then on. The old useEffect + `hydrated` flag existed only to avoid
  // clobbering in-progress edits, at the cost of a second render pass on every load
  // (react-hooks/set-state-in-effect).
  const [nameDraft, setName] = useState<string | null>(null);
  const [stakeDraft, setStakeName] = useState<string | null>(null);
  const name = nameDraft ?? wardInfo?.name ?? '';
  const stakeName = stakeDraft ?? wardInfo?.stake_name ?? '';

  const handleSave = useCallback(() => {
    const trimmedName = name.trim();
    const trimmedStake = stakeName.trim();
    if (!trimmedName || !trimmedStake) {
      Alert.alert(t('common.error'), t('wardInfo.nameRequired'));
      return;
    }
    updateWard.mutate(
      { name: trimmedName, stake_name: trimmedStake },
      {
        onSuccess: () => {
          Alert.alert(t('common.success'), t('wardInfo.saved'));
          router.back();
        },
        onError: () => {
          Alert.alert(t('common.error'), t('wardInfo.saveFailed'));
        },
      }
    );
  }, [name, stakeName, updateWard, t, router]);

  const canSave = isOnline && !updateWard.isPending;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={12}>
          <Text style={[styles.backButton, { color: colors.primary }]}>{t('common.back')}</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>{t('wardInfo.title')}</Text>
        <Pressable onPress={handleSave} disabled={!canSave} accessibilityRole="button" hitSlop={12} testID="ward-info-save">
          <Text style={[styles.saveButton, { color: canSave ? colors.primary : colors.textTertiary }]}>
            {t('common.save')}
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {!isOnline && (
            <View style={[styles.offlineBox, { backgroundColor: colors.errorContainer }]}>
              <Text style={[styles.offlineText, { color: colors.error }]}>{t('wardInfo.offline')}</Text>
            </View>
          )}

          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('wardInfo.wardName')}</Text>
          <TextInput
            testID="ward-info-name"
            style={[styles.input, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
            value={name}
            onChangeText={setName}
            placeholder={t('wardInfo.wardName')}
            placeholderTextColor={colors.placeholder}
            editable={isOnline}
          />

          <Text style={[styles.label, { color: colors.textSecondary, marginTop: 20 }]}>{t('wardInfo.stakeName')}</Text>
          <TextInput
            testID="ward-info-stake"
            style={[styles.input, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
            value={stakeName}
            onChangeText={setStakeName}
            placeholder={t('wardInfo.stakeName')}
            placeholderTextColor={colors.placeholder}
            editable={isOnline}
          />
        </ScrollView>
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
  saveButton: { fontSize: 16, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '700' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  body: { padding: 16 },
  offlineBox: { padding: 12, borderRadius: 8, marginBottom: 16 },
  offlineText: { fontSize: 14, textAlign: 'center' },
  label: { fontSize: 14, marginBottom: 6 },
  input: { height: 48, borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, fontSize: 16 },
});
