/**
 * UnifiedSundayCard: the single collapsed card type for a Sunday.
 *
 * Consolidates the two former collapsed cards (the Agendas-tab agenda card + the Speeches-tab
 * speaker card) into one card: Block 1 (agenda status) stacked over Block 2 (speaker/prayer name
 * rows). Pure and presentational — all data (counts, name rows, flags) is supplied by the parent
 * screen, which already computes it.
 *
 * Tap zones (U7): the DateBlock is NOT pressable; the Block-1 status column opens the agenda
 * (onPressStatus); the Block-2 speaker area opens the speeches editor (onPressSpeakers). A right
 * chevron (no pencil) signals tap-to-edit.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { ChevronRightIcon } from './icons';
import { StatusLED } from './StatusLED';
import { DateBlock } from './DateBlock';
import type { SpeechStatus, SundayExceptionReason } from '../types/database';

/** The green used for "complete" counts and filled roles — mirrors the existing card styling. */
const GREEN = '#22c55e';

const NO_SACRAMENT_REASONS: ReadonlySet<SundayExceptionReason> = new Set([
  'general_conference',
  'stake_conference',
  'ward_conference',
  'other',
]);

const TESTIMONY_REASONS: ReadonlySet<SundayExceptionReason> = new Set([
  'testimony_meeting',
  'primary_presentation',
]);

export interface UnifiedNameRow {
  /** Stable key for React (e.g. `prayer-0`, `speaker-1`). */
  key: string;
  /** Prayer rows render with the prayer prefix + italic; speaker rows render plainly. */
  kind: 'prayer' | 'speaker';
  status: SpeechStatus;
  /** null / empty => no one assigned to this slot. */
  name: string | null;
}

export interface UnifiedSundayCardProps {
  /** The Sunday date (ISO string YYYY-MM-DD). */
  date: string;
  /** Subtle highlight for the Home hero card. */
  highlighted?: boolean;
  /** null (or 'speeches') => a regular speeches Sunday. */
  exceptionReason: SundayExceptionReason | null;
  /** Custom label for `exceptionReason === 'other'`; falls back to the i18n reason label. */
  customReason?: string | null;
  /** Whether each welcome role is filled. */
  roles: { preside: boolean; conduct: boolean; piano: boolean; lead: boolean };
  /** Speaker completion counts (Block-1 line 2). */
  speakers: { done: number; total: number };
  /** Prayer completion counts (Block-1 line 3, only when managePrayers). */
  prayers: { done: number; total: number };
  /** Hymn completion counts (Block-1 line 4). */
  hymns: { done: number; total: number };
  /** Ward-level manage_prayers flag: gates the prayer count line + prayer name rows. */
  managePrayers: boolean;
  /**
   * Ordered Block-2 rows the parent wants rendered: prayers (pos 0/4) only when managePrayers;
   * speeches (pos 1..3) honoring has_second_speech. For testimony Sundays this is the prayer rows
   * only; for no-sacrament Sundays it is ignored (Block 2 omitted).
   */
  nameRows: UnifiedNameRow[];
  /** Block-1 status area tapped => open the agenda. */
  onPressStatus: (date: string) => void;
  /** Block-2 speaker area tapped => open the speeches editor. */
  onPressSpeakers: (date: string) => void;
  /** Optional testID for E2E targeting. */
  testID?: string;
}

export const UnifiedSundayCard = React.memo(function UnifiedSundayCard({
  date,
  highlighted = false,
  exceptionReason,
  customReason,
  roles,
  speakers,
  prayers,
  hymns,
  managePrayers,
  nameRows,
  onPressStatus,
  onPressSpeakers,
  testID,
}: UnifiedSundayCardProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const reason = exceptionReason === 'speeches' ? null : exceptionReason;
  const isNoSacrament = reason != null && NO_SACRAMENT_REASONS.has(reason);
  const isTestimony = reason != null && TESTIMONY_REASONS.has(reason);

  // Block 2 is shown for regular Sundays, and for testimony Sundays only when prayers are managed.
  // It is always omitted for no-sacrament Sundays (U5).
  const showBlock2 = !isNoSacrament && (!isTestimony || managePrayers);

  const reasonLabel = reason
    ? reason === 'other' && customReason
      ? customReason
      : t(`sundayExceptions.${reason}`, reason)
    : '';

  const roleWords: { key: string; label: string; filled: boolean }[] = [
    { key: 'preside', label: t('agenda.statusPresiding'), filled: roles.preside },
    { key: 'conduct', label: t('agenda.statusConducting'), filled: roles.conduct },
    { key: 'piano', label: t('agenda.statusPianist'), filled: roles.piano },
    { key: 'lead', label: t('agenda.statusConductor'), filled: roles.lead },
  ];

  const allUnassigned = nameRows.every((r) => !r.name);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        highlighted && { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.primaryContainer },
      ]}
      testID={testID}
    >
      {/* Block 1: DateBlock (not pressable) + status column (pressable) + chevron */}
      <View style={[styles.block1, isNoSacrament && styles.block1NoSacrament]}>
        <DateBlock date={date} highlighted={highlighted} />

        <Pressable
          style={styles.statusColumn}
          onPress={() => onPressStatus(date)}
          accessibilityRole="button"
          accessibilityLabel={t('agenda.title')}
          testID={`unified-status-${date}`}
        >
          {/* Line 1: roles — hidden for no-sacrament Sundays (1a). */}
          {!isNoSacrament && (
            <Text style={styles.roleLine} numberOfLines={1} testID="unified-roles">
              {roleWords.map((r, i) => (
                <Text key={r.key}>
                  {i > 0 ? (
                    <Text style={{ color: colors.textSecondary }}>{' | '}</Text>
                  ) : null}
                  <Text
                    style={{ color: r.filled ? GREEN : colors.textSecondary }}
                    testID={`unified-role-${r.key}`}
                  >
                    {r.label}
                  </Text>
                </Text>
              ))}
            </Text>
          )}

          {/* Line 2: speakers count — or the yellow testimony label */}
          {isTestimony ? (
            <Text
              style={[styles.countLine, { color: colors.warning }]}
              numberOfLines={1}
              testID="unified-testimony"
            >
              {t(`sundayExceptions.${reason}`, reason ?? '')}
            </Text>
          ) : isNoSacrament ? (
            <Text
              style={[styles.countLine, { color: colors.warning }]}
              numberOfLines={1}
              testID="unified-reason"
            >
              {reasonLabel}
            </Text>
          ) : (
            <Text
              style={[
                styles.countLine,
                { color: speakers.done === speakers.total ? GREEN : colors.textSecondary },
              ]}
              numberOfLines={1}
              testID="unified-count-speakers"
            >
              {t('agenda.statusSpeakers', { filled: speakers.done, total: speakers.total })}
            </Text>
          )}

          {/* Line 3: prayers count (only when managed, hidden for no-sacrament) */}
          {managePrayers && !isNoSacrament && (
            <Text
              style={[
                styles.countLine,
                { color: prayers.done === prayers.total ? GREEN : colors.textSecondary },
              ]}
              numberOfLines={1}
              testID="unified-count-prayers"
            >
              {t('agenda.statusPrayers', { filled: prayers.done, total: prayers.total })}
            </Text>
          )}

          {/* Line 4: hymns count (hidden for no-sacrament) */}
          {!isNoSacrament && (
            <Text
              style={[
                styles.countLine,
                { color: hymns.done === hymns.total ? GREEN : colors.textSecondary },
              ]}
              numberOfLines={1}
              testID="unified-count-hymns"
            >
              {t('agenda.statusHymns', { filled: hymns.done, total: hymns.total })}
            </Text>
          )}
        </Pressable>

        {/* Expansion indicator — the status zone opens the agenda for every Sunday, including
            no-sacrament ones (so the type can be changed). */}
        <View style={styles.chevron}>
          <ChevronRightIcon size={20} color={colors.textSecondary} />
        </View>
      </View>

      {/* Block 2: speaker/prayer name rows, left-aligned with Block 1's text column */}
      {showBlock2 && (
        <Pressable
          style={styles.block2}
          onPress={() => onPressSpeakers(date)}
          accessibilityRole="button"
          accessibilityLabel={t('agenda.statusSpeakers', { filled: speakers.done, total: speakers.total })}
          testID={`unified-speakers-${date}`}
        >
          <View style={styles.block2Names}>
            {allUnassigned ? (
              <View style={styles.nameRow} testID="unified-empty-row">
                <StatusLED status="not_assigned" size={12} />
                <Text style={[styles.nameText, { color: colors.textSecondary, fontStyle: 'italic' }]}>
                  {t('agenda.noAssignments')}
                </Text>
              </View>
            ) : (
              nameRows.map((row) => (
                <View key={row.key} style={styles.nameRow} testID={`unified-name-row-${row.key}`}>
                  <StatusLED status={row.status} size={12} />
                  <Text
                    style={[
                      styles.nameText,
                      { color: colors.textSecondary },
                      row.kind === 'prayer' && row.name ? { fontStyle: 'italic' } : null,
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {row.name
                      ? row.kind === 'prayer'
                        ? `${t('prayers.prayerPrefix')} ${row.name}`
                        : row.name
                      : ' '}
                  </Text>
                </View>
              ))
            )}
          </View>
          {/* Expansion indicator for the speakers tap zone (3). */}
          <View style={styles.chevron}>
            <ChevronRightIcon size={18} color={colors.textSecondary} />
          </View>
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 12,
    marginVertical: 4,
    overflow: 'hidden',
  },
  block1: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },
  // No-sacrament card has no Block 2, so give Block 1 a min height and balanced padding
  // so the DateBlock is vertically centered and not cramped against the bottom border (4).
  block1NoSacrament: {
    minHeight: 68,
    paddingBottom: 10,
  },
  statusColumn: {
    flex: 1,
    marginHorizontal: 12,
    justifyContent: 'center',
  },
  roleLine: {
    fontSize: 15,
    marginBottom: 3,
  },
  countLine: {
    fontSize: 15,
    marginBottom: 3,
  },
  chevron: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Left-aligned with Block 1's text column: indent past the DateBlock (44) + its right margin (12).
  block2: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12 + 52 + 12,
    paddingRight: 12,
    paddingBottom: 12,
    paddingTop: 2,
  },
  block2Names: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 3,
  },
  nameText: {
    fontSize: 15,
    flex: 1,
  },
});
