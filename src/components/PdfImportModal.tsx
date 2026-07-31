/**
 * PDF import: extraction + review modal. The country/area codes and file pick now live in the
 * Members screen's PDF card (no intermediate "codes" screen) — this modal receives the picked PDF
 * base64 + the codes, extracts on-device (WebView+pdf.js), builds the merge plan, and shows the
 * review. The raw PDF stays in memory and is never persisted/uploaded (AC1/AC15). Online-only.
 *
 * The WebView extraction can't run under vitest; the tested logic lives in the pure S1–S5 modules
 * and PdfImportReview. Validate the extraction end-to-end on device.
 */
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useMembers } from '../hooks/useMembers';
import { useApplyMemberImport } from '../hooks/useApplyMemberImport';
import { parseLcrText, lcrNameToFirstLast } from '../lib/lcrPdfParser';
import { repairPhones } from '../lib/lcrPhoneRepair';
import { buildMergePlan, type MergePlan, type ParsedMember } from '../lib/memberMergePlan';
import { PdfTextExtractor } from './PdfTextExtractor';
import { PdfImportReview } from './PdfImportReview';

export interface PdfImportModalProps {
  visible: boolean;
  base64: string | null;
  countryCode: string;
  areaCode: string;
  onClose: () => void;
}

export function PdfImportModal({ visible, base64, countryCode, areaCode, onClose }: PdfImportModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { data: members = [] } = useMembers();
  const apply = useApplyMemberImport();

  const [step, setStep] = useState<'extracting' | 'review'>('extracting');
  const [plan, setPlan] = useState<MergePlan | null>(null);
  const [unrepaired, setUnrepaired] = useState<string[]>([]);
  const [countWarning, setCountWarning] = useState<{ expected: number; parsed: number } | null>(null);

  // Reset to extraction whenever a new PDF is opened.
  useEffect(() => {
    if (visible && base64) {
      setStep('extracting');
      setPlan(null);
      setUnrepaired([]);
      setCountWarning(null);
    }
  }, [visible, base64]);

  const onExtracted = (text: string) => {
    try {
      const { records, expectedCount } = parseLcrText(text);
      const named = records.map((r) => ({ ...r, name: lcrNameToFirstLast(r.name) }));
      const { resolved, unrepaired: unrep } = repairPhones(named, { countryCode, areaCode });
      const parsed: ParsedMember[] = resolved.map((r) => ({ name: r.name, phone: r.phone, age: r.age }));
      setPlan(buildMergePlan(parsed, members));
      setUnrepaired(unrep);
      setCountWarning(
        expectedCount != null && expectedCount !== records.length
          ? { expected: expectedCount, parsed: records.length }
          : null
      );
      setStep('review');
    } catch {
      Alert.alert(t('common.error'), t('pdfImport.parseFailed'));
      onClose();
    }
  };

  const onApply = (payload: Parameters<typeof apply.mutate>[0]) => {
    apply.mutate(payload, {
      onSuccess: (r) => {
        Alert.alert(
          t('common.success'),
          t('pdfImport.applied', { inserted: r.inserted, updated: r.updated, removed: r.removed })
        );
        onClose();
      },
      onError: () => Alert.alert(t('common.error'), t('pdfImport.applyFailed')),
    });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {step === 'extracting' && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('pdfImport.extracting')}</Text>
            {visible && base64 && (
              <PdfTextExtractor
                base64={base64}
                onResult={onExtracted}
                onError={() => {
                  Alert.alert(t('common.error'), t('pdfImport.extractFailed'));
                  onClose();
                }}
              />
            )}
            <Pressable onPress={onClose} style={styles.cancel} testID="pdf-extract-cancel">
              <Text style={{ color: colors.textSecondary }}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
        )}

        {step === 'review' && plan && (
          <PdfImportReview
            plan={plan}
            unrepaired={unrepaired}
            countWarning={countWarning}
            applying={apply.isPending}
            onCancel={onClose}
            onApply={onApply}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Inside a RN Modal the safe-area context is 0 → pad the top for the status bar (app convention).
  container: { flex: 1, paddingTop: 60 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  hint: { fontSize: 13, marginTop: 12, textAlign: 'center' },
  cancel: { marginTop: 24, alignItems: 'center' },
});
