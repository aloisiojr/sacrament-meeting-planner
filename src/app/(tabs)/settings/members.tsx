/**
 * MembersScreen (v2.0): "Atualizar lista de membros" — CSV-only batch people management.
 *
 * People are added/edited/removed inside the People picker during planning. This settings screen
 * keeps ONLY the batch CSV workflow, presented as a guided 3-step flow: (1) download the current
 * full dump, (2) edit the spreadsheet externally, (3) upload it to REPLACE everyone (destructive).
 * Import is strict + informative: parse errors are shown in an in-screen red panel (first 5 + a
 * "… e mais N" line) and NOTHING is written unless the whole file is valid. A read-only count is
 * shown. When the ward has no members, export ships clearly-marked example rows instead.
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  ActivityIndicator,
  Linking,
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
  getExampleMembers,
  type CsvExportMember,
  type CsvValidationError,
} from '../../../lib/csvUtils';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useMembers, memberKeys } from '../../../hooks/useMembers';

// Sentinel thrown by the import mutation when the CSV fails validation, so the error handler can
// tell parse failures (shown in the in-screen panel) apart from RPC/network failures.
const CSV_PARSE_ERROR = 'csv/parse';

// Hosted step-by-step guide (AI prompt that merges the ward PDF + this CSV). GitHub-Pages URL —
// update if the site's public base changes.
const IMPORT_GUIDE_URL = 'https://aloisiojr.github.io/sacrament-meeting-planner/public/import-members.html';

type TFn = ReturnType<typeof useTranslation>['t'];

/** Translate a single CSV validation error's reason (code + optional value). */
function csvErrorReason(err: CsvValidationError, t: TFn): string {
  return t(`members.csvErr.${err.code}`, { value: err.value ?? '' });
}

/** Compose a full "Linha X, 'coluna': motivo" line for one CSV validation error. */
function formatCsvError(err: CsvValidationError, t: TFn): string {
  return t('members.importErrorRow', {
    line: err.line,
    column: err.column,
    reason: csvErrorReason(err, t),
  });
}

// --- Main Screen ---

export default function MembersScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { hasPermission, wardId, user, userName } = useAuth();
  const queryClient = useQueryClient();

  const { data: members, isLoading } = useMembers();

  const canImport = hasPermission('member:import');

  // Detailed CSV validation errors shown in the in-screen red panel (empty = hidden).
  const [importErrors, setImportErrors] = useState<CsvValidationError[]>([]);

  // Export guard to prevent double-tap
  const exportingRef = useRef(false);

  // CSV Export handler (full dump incl. capabilities + Responsável by name).
  // When the ward has no members, export clearly-marked example rows so the user learns the format.
  const handleExport = useCallback(async () => {
    if (exportingRef.current) return;
    exportingRef.current = true;

    try {
      const list = members ?? [];
      let exportMembers: CsvExportMember[];
      if (list.length === 0) {
        exportMembers = getExampleMembers(i18n.language);
      } else {
        // Resolve responsible_id → responsible member's full_name for the export.
        const nameById = new Map(list.map((m) => [m.id, m.full_name]));
        exportMembers = list.map((m) => ({
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
      }
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
  }, [members, t, i18n.language]);

  // CSV Import mutation (destructive atomic overwrite via RPC — full dump).
  const importMutation = useMutation({
    mutationFn: async (csvContent: string) => {
      const result = parseCsv(csvContent);

      if (!result.success) {
        // Show the detailed errors in the in-screen panel; do NOT call the RPC.
        setImportErrors(result.errors);
        throw new Error(CSV_PARSE_ERROR);
      }

      // Valid file: clear any previous panel before writing.
      setImportErrors([]);

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
      // CSV parse errors are already rendered in the in-screen panel (err.message is the sentinel);
      // only RPC/network failures reach the user here, with a clear generic message.
      if (err.message !== CSV_PARSE_ERROR) {
        Alert.alert(t('common.error'), t('members.importRpcError'));
      }
    },
  });

  // CSV Import - actual file picker logic
  const performImport = useCallback(async () => {
    // A new import attempt always clears the previous error panel first.
    setImportErrors([]);

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

  const shownErrors = importErrors.slice(0, 5);
  const extraErrorCount = importErrors.length - shownErrors.length;

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
        {/* Read-only member count */}
        {!isLoading && (
          <Text style={[styles.count, { color: colors.text }]} testID="members-count">
            {t('members.memberCount', { count: memberCount })}
          </Text>
        )}

        {canImport ? (
          <>
            {/* Step 1: download the current list */}
            <View style={styles.step}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>{t('members.step1Title')}</Text>
              <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
                {t('members.step1Desc')}
              </Text>
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
            </View>

            {/* Step 2: edit the spreadsheet */}
            <View style={styles.step}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>{t('members.step2Title')}</Text>
              <Text style={[styles.stepDesc, { color: colors.textSecondary }]} testID="members-step2-note">
                {t('members.step2Desc')}
              </Text>
              <Text style={[styles.stepDesc, { color: colors.textSecondary, marginBottom: 4 }]}>
                {t('members.step2GuideText')}
              </Text>
              <Pressable
                onPress={() => Linking.openURL(IMPORT_GUIDE_URL)}
                accessibilityRole="link"
                accessibilityLabel={t('members.step2GuideLink')}
                hitSlop={8}
                testID="members-guide-link"
              >
                <Text style={[styles.guideLink, { color: colors.primary }]}>
                  {t('members.step2GuideLink')}
                </Text>
              </Pressable>
            </View>

            {/* Step 3: import the file */}
            <View style={styles.step}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>{t('members.step3Title')}</Text>

              {/* Destructive replace warning */}
              <View style={[styles.warningBox, { backgroundColor: colors.errorContainer, borderColor: colors.error }]}>
                <Text style={[styles.warningText, { color: colors.error }]} testID="members-import-warning">
                  {t('members.csvImportWarning')}
                </Text>
              </View>

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

              {/* Detailed CSV validation errors (first 5 + "… e mais N") */}
              {importErrors.length > 0 && (
                <View
                  style={[styles.errorPanel, { backgroundColor: colors.errorContainer, borderColor: colors.error }]}
                  testID="members-import-errors"
                >
                  {shownErrors.map((err, idx) => (
                    <Text key={idx} style={[styles.errorLine, { color: colors.error }]}>
                      {formatCsvError(err, t)}
                    </Text>
                  ))}
                  {extraErrorCount > 0 && (
                    <Text style={[styles.errorLine, styles.errorMore, { color: colors.error }]}>
                      {t('members.csvMoreErrors', { count: extraErrorCount })}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </>
        ) : (
          <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
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
  count: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 20,
  },
  step: {
    marginBottom: 28,
  },
  stepTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },
  stepDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  guideLink: {
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  csvButton: {
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
    marginBottom: 12,
  },
  warningText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  errorPanel: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    gap: 6,
  },
  errorLine: {
    fontSize: 13,
    lineHeight: 18,
  },
  errorMore: {
    fontWeight: '600',
  },
});
