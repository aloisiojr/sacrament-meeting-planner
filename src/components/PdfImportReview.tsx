/**
 * S7 — review-before-apply, as a 3-step wizard. The plan (MergePlan) is computed upstream and passed
 * in; this screen walks the user through only the parts that need a decision:
 *   Step 1 (blanks)    — members whose phone is blank/unparsed; optionally type one in (pencil).
 *   Step 2 (conflicts) — DB phone vs PDF phone; a per-row toggle (default: keep the app's) + a master
 *                        toggle at the top to move ALL rows to app/PDF at once.
 *   Step 3 (removals)  — members absent from the PDF; a per-row toggle (default: keep) + a master
 *                        toggle at the top to select/clear ALL.
 * Empty steps are skipped. Two buttons are always pinned to the bottom (kept clear of the device's
 * rounded corners): Cancelar (confirm dialog) and Próximo → Concluir on the last step.
 */
import React, { useState } from 'react';
import { View, Text, Pressable, Switch, TextInput, ScrollView, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { PencilIcon } from './icons';
import type { MergePlan } from '../lib/memberMergePlan';
import type { MemberImportApply, MemberImportPhoneUpdate } from '../hooks/useApplyMemberImport';

/** A member with a blank/unparsed phone (step 1). memberId is set when it already exists in the DB. */
export interface BlankPhoneEntry {
  name: string;
  memberId?: string;
}

export interface PdfImportReviewProps {
  plan: MergePlan;
  blanks: BlankPhoneEntry[];
  countWarning?: { expected: number; parsed: number } | null;
  /** Ward country code (e.g. "+55") used to complete a manually-typed phone. */
  countryCode: string;
  onCancel: () => void;
  onApply: (apply: MemberImportApply) => void;
  applying?: boolean;
}

type StepKey = 'blanks' | 'conflicts' | 'removals';

export function PdfImportReview({
  plan,
  blanks,
  countWarning,
  countryCode,
  onCancel,
  onApply,
  applying = false,
}: PdfImportReviewProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [manualPhones, setManualPhones] = useState<Record<string, string>>({});
  // Conflict choice: true = keep the app's number (default), false = use the PDF's.
  const [useApp, setUseApp] = useState<Record<string, boolean>>({});
  const [toRemove, setToRemove] = useState<Record<string, boolean>>({});

  const steps: StepKey[] = [];
  if (blanks.length) steps.push('blanks');
  if (plan.phoneConflicts.length) steps.push('conflicts');
  if (plan.absentInDb.length) steps.push('removals');

  const [stepIdx, setStepIdx] = useState(0);
  const current: StepKey | undefined = steps[stepIdx];
  const isLast = stepIdx >= steps.length - 1;

  /** Complete a manually-typed phone into a full "+<digits>" (prepend the ward country code). */
  const toFullPhone = (raw: string): string | null => {
    const trimmed = raw.trim();
    const d = trimmed.replace(/\D/g, '');
    if (!d) return null;
    if (trimmed.startsWith('+')) return `+${d}`;
    const cc = countryCode.replace(/\D/g, '') || '55';
    return `+${cc}${d}`;
  };

  const buildApply = (): MemberImportApply => {
    const inserts = plan.toInsert.map((p) => {
      const manual = manualPhones[p.name];
      return { name: p.name, phone: manual ? toFullPhone(manual) : p.phone };
    });
    const phoneUpdates: MemberImportPhoneUpdate[] = [
      ...plan.toUpdate.map((u) => ({ id: u.member.id, phone: u.phone })),
      ...plan.phoneConflicts
        .filter((c) => useApp[c.member.id] === false)
        .map((c) => ({ id: c.member.id, phone: c.pdfPhone })),
      ...blanks
        .map((b) => ({ b, phone: b.memberId ? toFullPhone(manualPhones[b.name] ?? '') : null }))
        .filter((x) => x.b.memberId && x.phone)
        .map((x) => ({ id: x.b.memberId as string, phone: x.phone as string })),
    ];
    const removeIds = plan.absentInDb.filter((m) => toRemove[m.id]).map((m) => m.id);
    return { inserts, phoneUpdates, removeIds };
  };

  const handleNext = () => {
    if (isLast) onApply(buildApply());
    else setStepIdx((i) => i + 1);
  };

  const handleCancel = () => {
    Alert.alert(t('pdfImport.cancelTitle'), t('pdfImport.cancelMessage'), [
      { text: t('pdfImport.keepReviewing'), style: 'cancel' },
      { text: t('common.confirm'), style: 'destructive', onPress: onCancel },
    ]);
  };

  const allApp = plan.phoneConflicts.every((c) => useApp[c.member.id] !== false);
  const allRemove = plan.absentInDb.length > 0 && plan.absentInDb.every((m) => toRemove[m.id]);
  const setAllApp = (v: boolean) => setUseApp(Object.fromEntries(plan.phoneConflicts.map((c) => [c.member.id, v])));
  const setAllRemove = (v: boolean) => setToRemove(Object.fromEntries(plan.absentInDb.map((m) => [m.id, v])));

  return (
    <View style={styles.container}>
      {/* Header: centered title + import summary + what's pending across all steps. */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t('pdfImport.reviewTitle')}</Text>
        <Text style={[styles.summary, { color: colors.textSecondary }]} testID="pdf-import-summary">
          {t('pdfImport.summary', {
            new: plan.toInsert.length,
            updated: plan.toUpdate.length,
            unchanged: plan.unchanged,
          })}
        </Text>
        {countWarning && (
          <Text style={[styles.warn, { color: colors.error }]} testID="pdf-import-count-warning">
            {t('pdfImport.countMismatch', { expected: countWarning.expected, parsed: countWarning.parsed })}
          </Text>
        )}
        <Text style={[styles.pending, { color: colors.textSecondary }]}>
          {t('pdfImport.pending', {
            blanks: blanks.length,
            conflicts: plan.phoneConflicts.length,
            removals: plan.absentInDb.length,
          })}
        </Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {!current && (
          <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('pdfImport.nothingToReview')}</Text>
        )}

        {/* Step 1 — blank phones (optional manual entry). */}
        {current === 'blanks' && (
          <View>
            <Text style={[styles.stepTitle, { color: colors.text }]}>{t('pdfImport.stepBlanksTitle')}</Text>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('pdfImport.stepBlanksHint')}</Text>
            {blanks.map((b, i) => (
              <View key={`b-${i}`} style={[styles.row, { borderBottomColor: colors.divider }]}>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{b.name}</Text>
                <View style={styles.phoneField}>
                  <PencilIcon size={16} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.phoneInput, { color: colors.text, borderColor: colors.divider }]}
                    value={manualPhones[b.name] ?? ''}
                    onChangeText={(v) => setManualPhones((s) => ({ ...s, [b.name]: v }))}
                    placeholder={t('pdfImport.phonePlaceholder')}
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="phone-pad"
                    testID={`pdf-blank-input-${i}`}
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Step 2 — phone conflicts (per-row + master toggle). */}
        {current === 'conflicts' && (
          <View>
            <Text style={[styles.stepTitle, { color: colors.text }]}>{t('pdfImport.stepConflictsTitle')}</Text>
            <View style={[styles.masterRow, { borderBottomColor: colors.divider }]}>
              <Text style={[styles.colLabel, { color: colors.textSecondary }]}>{t('pdfImport.pdfShort')}</Text>
              <Switch
                testID="pdf-conflict-master"
                value={allApp}
                onValueChange={setAllApp}
                trackColor={{ false: colors.divider, true: colors.primary }}
              />
              <Text style={[styles.colLabel, { color: colors.textSecondary, textAlign: 'right' }]}>{t('pdfImport.appShort')}</Text>
            </View>
            {plan.phoneConflicts.map((c) => (
              <View key={c.member.id} style={styles.conflict}>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{c.member.full_name}</Text>
                <View style={styles.conflictRow}>
                  <Text style={[styles.phoneText, { color: colors.textSecondary }]} numberOfLines={1}>{c.pdfPhone}</Text>
                  <Switch
                    testID={`pdf-conflict-toggle-${c.member.id}`}
                    value={useApp[c.member.id] !== false}
                    onValueChange={(v) => setUseApp((s) => ({ ...s, [c.member.id]: v }))}
                    trackColor={{ false: colors.divider, true: colors.primary }}
                  />
                  <Text style={[styles.phoneText, { color: colors.text, textAlign: 'right' }]} numberOfLines={1}>+{c.appPhone}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Step 3 — removals (per-row + master toggle). */}
        {current === 'removals' && (
          <View>
            <Text style={[styles.stepTitle, { color: colors.text }]}>{t('pdfImport.stepRemovalsTitle')}</Text>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('pdfImport.stepRemovalsHint')}</Text>
            <View style={[styles.masterRow, { borderBottomColor: colors.divider }]}>
              <Text style={[styles.colLabel, { color: colors.textSecondary, flex: 1 }]}>{t('pdfImport.selectAll')}</Text>
              <Switch
                testID="pdf-remove-master"
                value={allRemove}
                onValueChange={setAllRemove}
                trackColor={{ false: colors.divider, true: colors.error }}
              />
            </View>
            {plan.absentInDb.map((m) => (
              <View key={m.id} style={[styles.row, { borderBottomColor: colors.divider }]}>
                <Text style={[styles.name, { color: colors.text, flex: 1 }]} numberOfLines={1}>{m.full_name}</Text>
                <Switch
                  testID={`pdf-remove-${m.id}`}
                  value={!!toRemove[m.id]}
                  onValueChange={(v) => setToRemove((s) => ({ ...s, [m.id]: v }))}
                  trackColor={{ false: colors.divider, true: colors.error }}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Footer: two buttons, kept clear of the device's rounded bottom corners. */}
      <View style={[styles.footer, { borderTopColor: colors.divider }]}>
        <Pressable onPress={handleCancel} disabled={applying} style={styles.btn} testID="pdf-cancel">
          <Text style={[styles.btnText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
        </Pressable>
        <Pressable onPress={handleNext} disabled={applying} style={styles.btn} testID="pdf-next">
          <Text style={[styles.btnText, { color: applying ? colors.textTertiary : colors.primary, fontWeight: '700' }]}>
            {isLast ? t('pdfImport.finish') : t('pdfImport.next')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  summary: { fontSize: 14, textAlign: 'center' },
  warn: { fontSize: 13, textAlign: 'center', marginTop: 8 },
  pending: { fontSize: 13, textAlign: 'center', marginTop: 8, fontWeight: '600' },
  scroll: { flex: 1 },
  body: { paddingHorizontal: 16, paddingBottom: 16 },
  stepTitle: { fontSize: 16, fontWeight: '700', marginTop: 8, marginBottom: 4 },
  hint: { fontSize: 13, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  name: { fontSize: 15, flex: 1, marginRight: 12 },
  phoneField: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  phoneInput: { minWidth: 130, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 15 },
  masterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    marginTop: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  colLabel: { fontSize: 13, fontWeight: '600', flex: 1 },
  conflict: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'transparent' },
  conflictRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 6 },
  phoneText: { fontSize: 14, flex: 1 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  btn: { paddingVertical: 10, paddingHorizontal: 8, minWidth: 88 },
  btnText: { fontSize: 16 },
});
