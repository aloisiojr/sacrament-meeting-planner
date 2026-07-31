/**
 * S7b — the end-to-end PDF import flow, encapsulated so members.tsx only toggles it.
 * Steps: (codes) confirm ward country/area (pre-filled) → pick PDF → (extract) WebView+pdf.js →
 * parse (S1) → name reorder (S2) → phone repair (S3) → merge plan (S4) → (review, S7a) → apply (S5).
 * The raw PDF stays in memory (base64) and is never persisted/uploaded (AC1/AC15). Online-only.
 *
 * The WebView extraction can't run under vitest; the tested logic lives in the pure S1–S5 modules and
 * the PdfImportReview component. Validate the extraction end-to-end on device.
 */
import React, { useMemo, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useMembers } from '../hooks/useMembers';
import { useApplyMemberImport } from '../hooks/useApplyMemberImport';
import { parseLcrText, lcrNameToFirstLast } from '../lib/lcrPdfParser';
import { repairPhones } from '../lib/lcrPhoneRepair';
import { buildMergePlan, type MergePlan, type ParsedMember } from '../lib/memberMergePlan';
import { guessWardCodes } from '../lib/wardPhoneCodes';
import { PdfTextExtractor } from './PdfTextExtractor';
import { PdfImportReview } from './PdfImportReview';

type Step = 'codes' | 'extracting' | 'review';

export interface PdfImportModalProps {
  visible: boolean;
  onClose: () => void;
}

export function PdfImportModal({ visible, onClose }: PdfImportModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { wardId } = useAuth();
  const { data: members = [] } = useMembers();
  const apply = useApplyMemberImport();

  const { data: timezone } = useQuery({
    queryKey: ['ward-timezone', wardId],
    queryFn: async () => {
      const { data } = await supabase.from('wards').select('timezone').eq('id', wardId).single();
      return data?.timezone ?? null;
    },
    enabled: !!wardId && visible,
  });

  const initialCodes = useMemo(() => guessWardCodes(members, timezone), [members, timezone]);
  const [countryCode, setCountryCode] = useState('');
  const [areaCode, setAreaCode] = useState('');
  const [step, setStep] = useState<Step>('codes');
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [plan, setPlan] = useState<MergePlan | null>(null);
  const [unrepaired, setUnrepaired] = useState<string[]>([]);
  const [countWarning, setCountWarning] = useState<{ expected: number; parsed: number } | null>(null);

  // Seed the code inputs from the guess when the modal opens.
  React.useEffect(() => {
    if (visible) {
      setCountryCode(initialCodes.countryCode);
      setAreaCode(initialCodes.areaCode);
      setStep('codes');
      setPdfBase64(null);
      setPlan(null);
      setUnrepaired([]);
      setCountWarning(null);
    }
  }, [visible, initialCodes.countryCode, initialCodes.areaCode]);

  const reset = () => {
    setStep('codes');
    setPdfBase64(null);
    setPlan(null);
  };

  const pickAndExtract = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]) return;
      const b64 = await new File(res.assets[0].uri).base64(); // in-memory; never uploaded
      setPdfBase64(b64);
      setStep('extracting');
    } catch (e) {
      Alert.alert(t('common.error'), t('pdfImport.pickFailed'));
    }
  };

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
    } catch (e) {
      Alert.alert(t('common.error'), t('pdfImport.parseFailed'));
      reset();
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
        {step === 'codes' && (
          <View style={styles.body}>
            <Text style={[styles.title, { color: colors.text }]}>{t('pdfImport.title')}</Text>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('pdfImport.codesHint')}</Text>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('pdfImport.countryCode')}</Text>
            <TextInput
              testID="pdf-country-code"
              style={[styles.input, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
              value={countryCode}
              onChangeText={setCountryCode}
              autoCapitalize="none"
              placeholder="+55"
              placeholderTextColor={colors.placeholder}
            />
            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>{t('pdfImport.areaCode')}</Text>
            <TextInput
              testID="pdf-area-code"
              style={[styles.input, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
              value={areaCode}
              onChangeText={setAreaCode}
              keyboardType="number-pad"
              placeholder="11"
              placeholderTextColor={colors.placeholder}
            />
            <Pressable
              testID="pdf-pick"
              onPress={pickAndExtract}
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              disabled={!countryCode.trim()}
            >
              <Text style={[styles.primaryBtnText, { color: colors.onPrimary }]}>{t('pdfImport.pick')}</Text>
            </Pressable>
            <Pressable onPress={onClose} style={styles.cancel}>
              <Text style={{ color: colors.textSecondary }}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
        )}

        {step === 'extracting' && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.hint, { color: colors.textSecondary, marginTop: 12 }]}>{t('pdfImport.extracting')}</Text>
            {pdfBase64 && (
              <PdfTextExtractor
                base64={pdfBase64}
                onResult={onExtracted}
                onError={() => {
                  Alert.alert(t('common.error'), t('pdfImport.extractFailed'));
                  reset();
                }}
              />
            )}
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
  // Inside a RN Modal the safe-area context is 0, so pad the top for the status bar (matches
  // PersonEditor's modal convention).
  container: { flex: 1, paddingTop: 60 },
  body: { padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  hint: { fontSize: 13, marginBottom: 12 },
  label: { fontSize: 14, marginBottom: 6 },
  input: { height: 48, borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, fontSize: 16 },
  primaryBtn: { height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  primaryBtnText: { fontSize: 16, fontWeight: '600' },
  cancel: { alignItems: 'center', marginTop: 16 },
});
