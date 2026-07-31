/**
 * S7 — review-before-apply, as a 3-step wizard. The plan (MergePlan) is computed upstream and passed
 * in; this screen walks the user through only the parts that need a decision:
 *   Step 1 (blanks)    — members whose phone is blank/unparsed; a pencil opens a dialog to type one.
 *   Step 2 (conflicts) — DB phone vs PDF phone; a per-row toggle (default: keep the app's) + a master
 *                        toggle (PDF | App) that moves ALL rows at once.
 *   Step 3 (removals)  — members absent from the PDF; a per-row toggle (default: keep) + a master
 *                        "select all" toggle.
 * Chrome: Cancelar (top-left, confirm dialog) and a bottom bar with Voltar (left, disabled on the
 * first step) + Próximo → Concluir (right), kept clear of the device's rounded corners. Only the
 * name list scrolls — the step header + master toggle stay fixed. Empty steps are skipped.
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
  /** Ward country + area codes used to pre-fill the manual-phone dialog. */
  countryCode: string;
  areaCode: string;
  onCancel: () => void;
  onApply: (apply: MemberImportApply) => void;
  applying?: boolean;
}

type StepKey = 'blanks' | 'conflicts' | 'removals';
interface ManualEntry {
  cc: string;
  phone: string;
}

const digits = (s: string | null | undefined) => (s ?? '').replace(/\D/g, '');

export function PdfImportReview({
  plan,
  blanks,
  countWarning,
  countryCode,
  areaCode,
  onCancel,
  onApply,
  applying = false,
}: PdfImportReviewProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [manualEntry, setManualEntry] = useState<Record<string, ManualEntry>>({});
  // Conflict choice: true = keep the app's number (default), false = use the PDF's.
  const [useApp, setUseApp] = useState<Record<string, boolean>>({});
  const [toRemove, setToRemove] = useState<Record<string, boolean>>({});

  // Manual-phone dialog state (step 1).
  const [editingName, setEditingName] = useState<string | null>(null);
  const [draftCc, setDraftCc] = useState('');
  const [draftPhone, setDraftPhone] = useState('');

  const steps: StepKey[] = [];
  if (blanks.length) steps.push('blanks');
  if (plan.phoneConflicts.length) steps.push('conflicts');
  if (plan.absentInDb.length) steps.push('removals');

  const [stepIdx, setStepIdx] = useState(0);
  const current: StepKey | undefined = steps[stepIdx];
  const isLast = stepIdx >= steps.length - 1;

  /** Full "+<digits>" for a saved manual entry, or null if empty. */
  const manualFull = (name: string): string | null => {
    const e = manualEntry[name];
    if (!e) return null;
    const d = digits(e.phone);
    if (!d) return null;
    return `+${digits(e.cc) || '55'}${d}`;
  };

  const buildApply = (): MemberImportApply => {
    const inserts = plan.toInsert.map((p) => ({ name: p.name, phone: manualFull(p.name) ?? p.phone }));
    const phoneUpdates: MemberImportPhoneUpdate[] = [
      ...plan.toUpdate.map((u) => ({ id: u.member.id, phone: u.phone })),
      ...plan.phoneConflicts
        .filter((c) => useApp[c.member.id] === false)
        .map((c) => ({ id: c.member.id, phone: c.pdfPhone })),
      ...blanks
        .filter((b) => b.memberId && manualFull(b.name))
        .map((b) => ({ id: b.memberId as string, phone: manualFull(b.name) as string })),
    ];
    const removeIds = plan.absentInDb.filter((m) => toRemove[m.id]).map((m) => m.id);
    return { inserts, phoneUpdates, removeIds };
  };

  const handleNext = () => {
    if (isLast) onApply(buildApply());
    else setStepIdx((i) => i + 1);
  };
  const handleBack = () => setStepIdx((i) => Math.max(0, i - 1));

  const handleCancel = () => {
    Alert.alert(t('pdfImport.cancelTitle'), t('pdfImport.cancelMessage'), [
      { text: t('pdfImport.keepReviewing'), style: 'cancel' },
      { text: t('common.confirm'), style: 'destructive', onPress: onCancel },
    ]);
  };

  const openEditor = (name: string) => {
    const e = manualEntry[name];
    setDraftCc(e?.cc ?? countryCode);
    setDraftPhone(e?.phone ?? areaCode);
    setEditingName(name);
  };
  const saveEditor = () => {
    if (editingName) setManualEntry((s) => ({ ...s, [editingName]: { cc: draftCc, phone: draftPhone } }));
    setEditingName(null);
  };

  const allApp = plan.phoneConflicts.every((c) => useApp[c.member.id] !== false);
  const allRemove = plan.absentInDb.length > 0 && plan.absentInDb.every((m) => toRemove[m.id]);
  const setAllApp = (v: boolean) => setUseApp(Object.fromEntries(plan.phoneConflicts.map((c) => [c.member.id, v])));
  const setAllRemove = (v: boolean) => setToRemove(Object.fromEntries(plan.absentInDb.map((m) => [m.id, v])));

  return (
    <View style={styles.container}>
      {/* Top bar: Cancelar (left) + centered title. */}
      <View style={styles.topBar}>
        <Pressable onPress={handleCancel} disabled={applying} hitSlop={8} testID="pdf-cancel">
          <Text style={[styles.topAction, { color: colors.primary }]}>{t('common.cancel')}</Text>
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.text }]} numberOfLines={1}>{t('pdfImport.reviewTitle')}</Text>
        <View style={styles.topSpacer} />
      </View>

      {/* Import summary + what's pending across all steps (fixed). */}
      <View style={styles.info}>
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

      {/* Fixed per-step header (title, hint, master toggle) — does NOT scroll with the list. */}
      {current === 'blanks' && (
        <View style={styles.stepHeader}>
          <Text style={[styles.stepTitle, { color: colors.text }]}>{t('pdfImport.stepBlanksTitle')}</Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('pdfImport.stepBlanksHint')}</Text>
        </View>
      )}
      {current === 'conflicts' && (
        <View style={styles.stepHeader}>
          <Text style={[styles.stepTitle, { color: colors.text }]}>{t('pdfImport.stepConflictsTitle')}</Text>
          <View style={[styles.masterRow, { borderBottomColor: colors.divider }]}>
            <Text style={[styles.masterLabel, { color: colors.textSecondary }]}>{t('pdfImport.pdfShort')}</Text>
            <Switch
              testID="pdf-conflict-master"
              value={allApp}
              onValueChange={setAllApp}
              trackColor={{ false: colors.divider, true: colors.primary }}
            />
            <Text style={[styles.masterLabel, { color: colors.textSecondary }]}>{t('pdfImport.appShort')}</Text>
          </View>
        </View>
      )}
      {current === 'removals' && (
        <View style={styles.stepHeader}>
          <Text style={[styles.stepTitle, { color: colors.text }]}>{t('pdfImport.stepRemovalsTitle')}</Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('pdfImport.stepRemovalsHint')}</Text>
          <View style={[styles.masterRow, { borderBottomColor: colors.divider }]}>
            <Text style={[styles.masterLabel, { color: colors.textSecondary }]}>{t('pdfImport.selectAll')}</Text>
            <Switch
              testID="pdf-remove-master"
              value={allRemove}
              onValueChange={setAllRemove}
              trackColor={{ false: colors.divider, true: colors.error }}
            />
          </View>
        </View>
      )}

      {/* Scrollable name list (only this scrolls). */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {!current && (
          <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('pdfImport.nothingToReview')}</Text>
        )}

        {current === 'blanks' &&
          blanks.map((b, i) => (
            <View key={`b-${i}`} style={[styles.row, { borderBottomColor: colors.divider }]}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{b.name}</Text>
              {manualFull(b.name) && (
                <Text style={[styles.savedPhone, { color: colors.textSecondary }]} numberOfLines={1}>
                  {manualEntry[b.name].phone}
                </Text>
              )}
              <Pressable onPress={() => openEditor(b.name)} hitSlop={8} testID={`pdf-blank-edit-${i}`}>
                <PencilIcon size={18} color={colors.primary} />
              </Pressable>
            </View>
          ))}

        {current === 'conflicts' &&
          plan.phoneConflicts.map((c) => (
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

        {current === 'removals' &&
          plan.absentInDb.map((m) => (
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
      </ScrollView>

      {/* Bottom bar: Voltar (left, disabled on the first step) + Próximo/Concluir (right). */}
      <View style={[styles.footer, { borderTopColor: colors.divider }]}>
        <Pressable onPress={handleBack} disabled={stepIdx === 0 || applying} style={styles.btn} testID="pdf-back">
          <Text style={[styles.btnText, { color: stepIdx === 0 ? colors.textTertiary : colors.primary }]}>
            {t('common.back')}
          </Text>
        </Pressable>
        <Pressable onPress={handleNext} disabled={applying} style={styles.btn} testID="pdf-next">
          <Text style={[styles.btnText, { color: applying ? colors.textTertiary : colors.primary, fontWeight: '700' }]}>
            {isLast ? t('pdfImport.finish') : t('pdfImport.next')}
          </Text>
        </Pressable>
      </View>

      {/* Manual-phone dialog (step 1). */}
      {editingName && (
        <View style={styles.overlay}>
          <View style={[styles.dialog, { backgroundColor: colors.card }]}>
            <Text style={[styles.dialogTitle, { color: colors.text }]} numberOfLines={1}>{editingName}</Text>
            <View style={styles.dialogRow}>
              <View style={styles.ccField}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('pdfImport.countryCode')}</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.divider, backgroundColor: colors.background }]}
                  value={draftCc}
                  onChangeText={setDraftCc}
                  keyboardType="phone-pad"
                  testID="pdf-blank-cc"
                />
              </View>
              <View style={styles.phoneFieldWrap}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('pdfImport.phonePlaceholder')}</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.divider, backgroundColor: colors.background }]}
                  value={draftPhone}
                  onChangeText={setDraftPhone}
                  keyboardType="phone-pad"
                  autoFocus
                  selection={draftPhone ? { start: draftPhone.length, end: draftPhone.length } : undefined}
                  testID="pdf-blank-phone"
                />
              </View>
            </View>
            <View style={styles.dialogActions}>
              <Pressable onPress={() => setEditingName(null)} style={styles.btn} testID="pdf-blank-cancel">
                <Text style={[styles.btnText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable onPress={saveEditor} style={styles.btn} testID="pdf-blank-save">
                <Text style={[styles.btnText, { color: colors.primary, fontWeight: '700' }]}>{t('common.save')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  topAction: { fontSize: 16, width: 72 },
  topTitle: { flex: 1, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  topSpacer: { width: 72 },
  info: { paddingHorizontal: 16, paddingBottom: 10 },
  summary: { fontSize: 14, textAlign: 'center' },
  warn: { fontSize: 13, textAlign: 'center', marginTop: 8 },
  pending: { fontSize: 13, textAlign: 'center', marginTop: 6, fontWeight: '600' },
  stepHeader: { paddingHorizontal: 16 },
  stepTitle: { fontSize: 22, fontWeight: '700', marginTop: 6, marginBottom: 4 },
  hint: { fontSize: 13, marginBottom: 8 },
  masterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 12,
    marginTop: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  masterLabel: { fontSize: 14, fontWeight: '600' },
  scroll: { flex: 1 },
  body: { paddingHorizontal: 16, paddingBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  name: { fontSize: 15, flex: 1, marginRight: 12 },
  savedPhone: { fontSize: 14, marginRight: 10 },
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
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 420, borderRadius: 14, padding: 20 },
  dialogTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 },
  dialogRow: { flexDirection: 'row', gap: 12 },
  ccField: { width: 96 },
  phoneFieldWrap: { flex: 1 },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, minHeight: 44 },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 18 },
});
