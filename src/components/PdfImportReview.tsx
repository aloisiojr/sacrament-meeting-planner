/**
 * S7 — review-before-apply screen for the PDF member import. Prop-driven (the flow in members.tsx
 * computes the MergePlan and passes it here). Shows a summary + unrepaired-phone list + a count
 * mismatch warning; lets the user resolve phone conflicts (default: keep the app's number) and opt
 * specific absent members IN for removal (default: remove none). Confirm → onApply(MemberImportApply).
 */
import React, { useState } from 'react';
import { View, Text, Pressable, Switch, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import type { MergePlan } from '../lib/memberMergePlan';
import type { MemberImportApply } from '../hooks/useApplyMemberImport';

export interface PdfImportReviewProps {
  plan: MergePlan;
  unrepaired: string[];
  countWarning?: { expected: number; parsed: number } | null;
  onCancel: () => void;
  onApply: (apply: MemberImportApply) => void;
  applying?: boolean;
}

export function PdfImportReview({
  plan,
  unrepaired,
  countWarning,
  onCancel,
  onApply,
  applying = false,
}: PdfImportReviewProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  // Phone-conflict choices: default 'app' (keep current). Removal: default keep (not in set).
  const [conflictChoice, setConflictChoice] = useState<Record<string, 'app' | 'pdf'>>({});
  const [toRemove, setToRemove] = useState<Record<string, boolean>>({});

  const buildApply = (): MemberImportApply => {
    const inserts = plan.toInsert.map((p) => ({ name: p.name, phone: p.phone }));
    const phoneUpdates = [
      ...plan.toUpdate.map((u) => ({ id: u.member.id, phone: u.phone })),
      ...plan.phoneConflicts
        .filter((c) => conflictChoice[c.member.id] === 'pdf')
        .map((c) => ({ id: c.member.id, phone: c.pdfPhone })),
    ];
    const removeIds = plan.absentInDb.filter((m) => toRemove[m.id]).map((m) => m.id);
    return { inserts, phoneUpdates, removeIds };
  };

  const removeCount = plan.absentInDb.filter((m) => toRemove[m.id]).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {/* Summary */}
        <Text style={[styles.title, { color: colors.text }]}>{t('pdfImport.reviewTitle')}</Text>
        <Text style={[styles.summary, { color: colors.textSecondary }]} testID="pdf-import-summary">
          {t('pdfImport.summary', {
            new: plan.toInsert.length,
            updated: plan.toUpdate.length,
            unchanged: plan.unchanged,
          })}
        </Text>

        {countWarning && (
          <View style={[styles.warnBox, { backgroundColor: colors.errorContainer }]}>
            <Text style={[styles.warnText, { color: colors.error }]} testID="pdf-import-count-warning">
              {t('pdfImport.countMismatch', {
                expected: countWarning.expected,
                parsed: countWarning.parsed,
              })}
            </Text>
          </View>
        )}

        {unrepaired.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('pdfImport.unrepairedTitle', { count: unrepaired.length })}
            </Text>
            {unrepaired.map((name, i) => (
              <Text key={`u-${i}`} style={[styles.rowText, { color: colors.textSecondary }]}>
                {name}
              </Text>
            ))}
          </View>
        )}

        {/* Phone conflicts */}
        {plan.phoneConflicts.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('pdfImport.conflictsTitle', { count: plan.phoneConflicts.length })}
            </Text>
            {plan.phoneConflicts.map((c) => {
              const choice = conflictChoice[c.member.id] ?? 'app';
              return (
                <View key={c.member.id} style={[styles.conflictRow, { borderBottomColor: colors.divider }]}>
                  <Text style={[styles.rowText, { color: colors.text }]}>{c.member.full_name}</Text>
                  <View style={styles.choices}>
                    <Pressable
                      testID={`pdf-conflict-app-${c.member.id}`}
                      onPress={() => setConflictChoice((s) => ({ ...s, [c.member.id]: 'app' }))}
                    >
                      <Text style={{ color: choice === 'app' ? colors.primary : colors.textSecondary, fontWeight: choice === 'app' ? '700' : '400' }}>
                        {t('pdfImport.keepApp')} (+{c.appPhone})
                      </Text>
                    </Pressable>
                    <Pressable
                      testID={`pdf-conflict-pdf-${c.member.id}`}
                      onPress={() => setConflictChoice((s) => ({ ...s, [c.member.id]: 'pdf' }))}
                    >
                      <Text style={{ color: choice === 'pdf' ? colors.primary : colors.textSecondary, fontWeight: choice === 'pdf' ? '700' : '400' }}>
                        {t('pdfImport.usePdf')} ({c.pdfPhone})
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Removal review (default: keep everyone) */}
        {plan.absentInDb.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('pdfImport.absentTitle', { count: plan.absentInDb.length })}
            </Text>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('pdfImport.absentHint')}</Text>
            {plan.absentInDb.map((m) => (
              <View key={m.id} style={[styles.absentRow, { borderBottomColor: colors.divider }]}>
                <Text style={[styles.rowText, { color: colors.text, flex: 1 }]}>{m.full_name}</Text>
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

      <View style={styles.actions}>
        <Pressable onPress={onCancel} disabled={applying} testID="pdf-import-cancel">
          <Text style={[styles.action, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
        </Pressable>
        <Pressable onPress={() => onApply(buildApply())} disabled={applying} testID="pdf-import-confirm">
          <Text style={[styles.action, { color: applying ? colors.textTertiary : colors.primary, fontWeight: '700' }]}>
            {t('pdfImport.confirm', {
              new: plan.toInsert.length,
              updated: plan.toUpdate.length + Object.values(conflictChoice).filter((c) => c === 'pdf').length,
              removed: removeCount,
            })}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { padding: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  summary: { fontSize: 14, marginBottom: 12 },
  warnBox: { padding: 12, borderRadius: 8, marginBottom: 12 },
  warnText: { fontSize: 13 },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 6 },
  hint: { fontSize: 12, marginBottom: 8 },
  rowText: { fontSize: 14 },
  conflictRow: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  choices: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, gap: 12 },
  absentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  actions: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  action: { fontSize: 16 },
});
