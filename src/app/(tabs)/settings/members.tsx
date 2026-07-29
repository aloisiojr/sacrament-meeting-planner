/**
 * MembersScreen (v2.0): CSV-only people management.
 *
 * People are now added/edited/removed inside the People picker during planning. This settings
 * screen keeps ONLY the batch CSV workflow: download the current full dump → edit the sheet
 * (by hand or with AI) → upload to REPLACE everyone (destructive). A read-only count is shown.
 */

import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { logAction } from '../../../lib/activityLog';
import {
  generateCsv,
  parseCsv,
  splitPhoneNumber,
  type CsvErrorCode,
  type CsvExportMember,
} from '../../../lib/csvUtils';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useMembers, memberKeys } from '../../../hooks/useMembers';

// --- CSV Error Translation Helper ---

function translateCsvError(
  code: CsvErrorCode | undefined,
  t: (key: string) => string
): string {
  switch (code) {
    case 'EMPTY_FILE': return t('members.csvErrorEmptyFile');
    case 'INVALID_HEADER': return t('members.csvErrorInvalidHeader');
    case 'INSUFFICIENT_COLUMNS': return t('members.csvErrorInsufficientColumns');
    case 'NAME_REQUIRED': return t('members.csvErrorNameRequired');
    case 'NO_DATA': return t('members.csvErrorNoData');
    default: return code ?? 'Unknown error';
  }
}

// --- Main Screen ---

export default function MembersScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { hasPermission, wardId, user, userName } = useAuth();
  const queryClient = useQueryClient();

  const { data: members, isLoading } = useMembers();

  const canImport = hasPermission('member:import');

  // Export guard to prevent double-tap
  const exportingRef = useRef(false);

  // CSV Export handler (full dump incl. capabilities + Responsável by name)
  const handleExport = useCallback(async () => {
    if (exportingRef.current) return;
    exportingRef.current = true;

    try {
      const list = members ?? [];
      // Resolve responsible_id → responsible member's full_name for the export.
      const nameById = new Map(list.map((m) => [m.id, m.full_name]));
      const exportMembers: CsvExportMember[] = list.map((m) => ({
        full_name: m.full_name,
        informal_name: m.informal_name,
        country_code: m.country_code,
        phone: m.phone,
        can_preside: m.can_preside,
        can_conduct: m.can_conduct,
        can_lead_music: m.can_lead_music,
        can_play_piano: m.can_play_piano,
        can_be_recognized: m.can_be_recognized,
        responsible_name: m.responsible_id ? nameById.get(m.responsible_id) ?? '' : '',
        calling: m.calling,
      }));
      const csv = generateCsv(exportMembers, {
        name: t('members.csvHeaderName'),
        informalName: t('members.csvHeaderInformalName'),
        phone: t('members.csvHeaderPhone'),
        preside: t('members.csvHeaderPreside'),
        conduct: t('members.csvHeaderConduct'),
        leadMusic: t('members.csvHeaderLeadMusic'),
        piano: t('members.csvHeaderPiano'),
        recognize: t('members.csvHeaderRecognize'),
        responsible: t('members.csvHeaderResponsible'),
        calling: t('members.csvHeaderCalling'),
      });

      if (Platform.OS === 'web') {
        // Web: Blob download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'membros.csv';
        link.click();
        URL.revokeObjectURL(url);
      } else {
        // Mobile: Write temp file and share via expo-sharing
        const file = new File(Paths.cache, 'membros.csv');
        file.write(csv);
        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/csv',
          dialogTitle: t('members.exportCsv'),
          UTI: 'public.comma-separated-values-text',
        });
      }
    } catch (err: any) {
      const msg = (err?.message ?? '').toLowerCase();
      if (msg !== 'user did not share' && !msg.includes('cancelled')) {
        Alert.alert(t('common.error'), t('members.exportFailed'));
      }
    } finally {
      exportingRef.current = false;
    }
  }, [members, t]);

  // CSV Import mutation (destructive atomic overwrite via RPC — full dump)
  const importMutation = useMutation({
    mutationFn: async (csvContent: string) => {
      const result = parseCsv(csvContent);

      if (!result.success) {
        const errorMessages = result.errors
          .map((e) => t('members.importErrorLine', { line: String(e.line), field: e.field, error: translateCsvError(e.code, t) }))
          .join('\n');
        throw new Error(errorMessages);
      }

      if (result.members.length === 0) {
        throw new Error(t('members.importEmpty'));
      }

      // Build members array for the RPC (capabilities + responsible name for 2nd-pass resolution)
      const newMembers = result.members.map((m) => {
        const { countryCode, phone } = splitPhoneNumber(m.phone);
        return {
          full_name: m.full_name,
          informal_name: m.informal_name || m.full_name.split(' ')[0],
          country_code: countryCode,
          phone: phone || null,
          can_preside: m.can_preside,
          can_conduct: m.can_conduct,
          can_lead_music: m.can_lead_music,
          can_play_piano: m.can_play_piano,
          can_be_recognized: m.can_be_recognized,
          responsible_name: m.responsible_name || null,
          calling: m.calling || null,
        };
      });

      // Atomic transaction via RPC: DELETE all + INSERT new + 2nd-pass responsible resolution
      const { data, error } = await supabase
        .rpc('import_members', {
          target_ward_id: wardId,
          new_members: newMembers,
        });

      if (error) throw error;
      return { imported: data as number };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: memberKeys.list(wardId) });
      Alert.alert(t('common.success'), t('members.importSuccess', { count: data.imported }));
      if (user) {
        logAction(wardId, user.id, user.email ?? '', 'member:import', `Members imported via CSV: ${data.imported} members`, userName);
      }
    },
    onError: (err: Error) => {
      // CSV parse errors already have user-friendly translated messages from parseCsv.
      // RPC/network errors get a generic i18n fallback.
      const isCsvParseError = err.message.includes('\n') || err.message.includes(t('members.importEmpty'));
      Alert.alert(t('common.error'), isCsvParseError ? err.message : t('members.importRpcError'));
    },
  });

  // CSV Import - actual file picker logic
  const performImport = useCallback(async () => {
    if (Platform.OS === 'web') {
      // Web: file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv,text/csv';
      input.onchange = async (e: any) => {
        const file = e.target?.files?.[0];
        if (!file) return;
        const text = await file.text();
        importMutation.mutate(text);
      };
      input.click();
    } else {
      // Mobile: DocumentPicker
      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: ['text/csv', 'text/comma-separated-values', 'text/plain', '*/*'],
          copyToCacheDirectory: true,
        });
        if (result.canceled || !result.assets?.[0]) return;
        const pickedFile = new File(result.assets[0].uri);
        const content = await pickedFile.text();
        importMutation.mutate(content);
      } catch (err: any) {
        const msg = (err?.message ?? '').toLowerCase();
        if (msg.includes('cancel') || msg.includes('cancelled')) return;
        const errorKey = (msg.includes('read') || msg.includes('encoding'))
          ? 'members.importReadError'
          : 'members.importFailed';
        Alert.alert(t('common.error'), t(errorKey));
      }
    }
  }, [importMutation, t]);

  // CSV Import handler with destructive confirmation dialog
  const handleImport = useCallback(() => {
    Alert.alert(
      t('members.importConfirmTitle'),
      t('members.importConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.confirm'), style: 'destructive', onPress: () => performImport() },
      ]
    );
  }, [t, performImport]);

  const memberCount = members?.length ?? 0;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={12} testID="members-back-button">
          <Text style={[styles.backButton, { color: colors.primary }]}>
            {t('common.back')}
          </Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>{t('members.title')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Screen description — the batch CSV workflow */}
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {t('members.csvScreenDescription')}
        </Text>

        {/* Read-only member count */}
        {!isLoading && (
          <Text style={[styles.count, { color: colors.text }]} testID="members-count">
            {t('members.memberCount', { count: memberCount })}
          </Text>
        )}

        {canImport ? (
          <>
            {/* CSV Import/Export */}
            <View style={styles.csvActions}>
              <Pressable
                style={[styles.csvButton, { borderColor: colors.primary }]}
                onPress={handleExport}
                accessibilityRole="button"
                accessibilityLabel={t('members.exportCsv')}
                testID="members-export-button"
              >
                <Text style={[styles.csvButtonText, { color: colors.primary }]}>
                  {t('members.exportCsv')}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.csvButton, { borderColor: colors.primary }]}
                onPress={handleImport}
                disabled={importMutation.isPending}
                accessibilityRole="button"
                accessibilityLabel={t('members.importCsv')}
                testID="members-import-button"
              >
                {importMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[styles.csvButtonText, { color: colors.primary }]}>
                    {t('members.importCsv')}
                  </Text>
                )}
              </Pressable>
            </View>

            {/* Destructive replace warning */}
            <View style={[styles.warningBox, { backgroundColor: colors.errorContainer, borderColor: colors.error }]}>
              <Text style={[styles.warningText, { color: colors.error }]} testID="members-import-warning">
                {t('members.csvImportWarning')}
              </Text>
            </View>
          </>
        ) : (
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {t('members.csvNoPermission')}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  backButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  count: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 16,
  },
  csvActions: {
    flexDirection: 'row',
    paddingBottom: 12,
    gap: 8,
  },
  csvButton: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  csvButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  warningBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  warningText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
});
