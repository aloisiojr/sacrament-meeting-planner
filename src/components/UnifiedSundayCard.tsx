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
import { AttendanceBlock } from './AttendanceBlock';
import { isNoSacramentReason } from '../lib/unifiedCard';
import type { SpeechStatus, SundayExceptionReason } from '../types/database';

/** The green used for "complete" counts and filled roles — mirrors the existing card styling. */
const GREEN = '#22c55e';

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
  /** Past-or-today Sunday: gates the AttendanceBlock under the DateBlock. */
  isPast?: boolean;
  /** Current sacrament-meeting attendance count (null => not recorded). */
  attendance?: number | null;
  /** When provided (and isPast), an AttendanceBlock is shown under the DateBlock. */
  onSetAttendance?: (v: number | null) => void;
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
  isPast = false,
  attendance = null,
  onSetAttendance,
  testID,
}: UnifiedSundayCardProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const reason = exceptionReason === 'speeches' ? null : exceptionReason;
  const isNoSacrament = isNoSacramentReason(exceptionReason);
  const isTestimony = reason != null && TESTIMONY_REASONS.has(reason);

  // The attendance tile only applies to (past-or-today) sacrament meetings — never no-sacrament
  // Sundays — and only when the parent wired a persist callback.
  const showAttendance = isPast && !isNoSacrament && !!onSetAttendance;

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

  // Block-1 status lines (roles + counts), shared by the regular and no-sacrament layouts so the
  // no-sacrament card can make its whole Block 1 — DateBlock included — the single tap zone (#3).
  const statusInner = (
    <>
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
    </>
  );

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        highlighted && { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.primaryContainer },
      ]}
      testID={testID}
    >
      {/* Block 1: DateBlock + status column + chevron.
          Regular/testimony: DateBlock is NOT pressable; only the status column opens the agenda.
          No-sacrament: there is no speakers block, so the WHOLE Block 1 (incl. the DateBlock) is the
          status tap zone — tapping anywhere on the card opens/expands it (#3). */}
      {isNoSacrament ? (
        <Pressable
          style={[styles.block1, styles.block1NoSacrament]}
          onPress={() => onPressStatus(date)}
          accessibilityRole="button"
          accessibilityLabel={t('agenda.title')}
          testID={`unified-status-${date}`}
        >
          <DateBlock date={date} highlighted={highlighted} />
          <View style={styles.statusPressable}>
          <View style={styles.statusColumn}>
          {statusInner}
          </View>
          {/* Expansion indicator — part of the status tap zone (opens the agenda). */}
          <View style={styles.chevron}>
            <ChevronRightIcon size={20} color={colors.textSecondary} />
          </View>
          </View>
        </Pressable>
      ) : (
      <View style={styles.mainRow}>
        {/* Left column: DateBlock + optional AttendanceBlock (its own tap target, outside the
            status/speakers zones), spanning the status lines AND the name rows so those stay
            tightly stacked regardless of the AttendanceBlock's height (bug fix). */}
        <View style={styles.dateColumn}>
          <DateBlock date={date} highlighted={highlighted} />
          {showAttendance && onSetAttendance && (
            <AttendanceBlock
              value={attendance}
              onChange={onSetAttendance}
              testID={`unified-attendance-${date}`}
            />
          )}
        </View>

        {/* Right column: status lines + name rows stacked tightly together. */}
        <View style={styles.rightColumn}>
          <Pressable
            style={styles.statusRow}
            onPress={() => onPressStatus(date)}
            accessibilityRole="button"
            accessibilityLabel={t('agenda.title')}
            testID={`unified-status-${date}`}
          >
            <View style={styles.statusColumn}>
            {statusInner}
            </View>
            {/* Expansion indicator — part of the status tap zone (opens the agenda). */}
            <View style={styles.chevron}>
              <ChevronRightIcon size={20} color={colors.textSecondary} />
            </View>
          </Pressable>

          {showBlock2 && (
            <Pressable
              style={styles.block2Press}
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
      </View>
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
  // Regular card: left column (DateBlock + optional AttendanceBlock) beside a right column that
  // stacks the status lines and the name rows tightly (so the AttendanceBlock's height never pushes
  // the names away from the status lines). Top-aligned so the roles line sits next to the DateBlock.
  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rightColumn: {
    flex: 1,
    marginLeft: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Left column stacking the DateBlock over the (optional) AttendanceBlock.
  dateColumn: {
    alignItems: 'center',
    gap: 4,
  },
  // No-sacrament card has no Block 2, so give Block 1 a min height and balanced padding
  // so the DateBlock is vertically centered and not cramped against the bottom border (4).
  block1NoSacrament: {
    minHeight: 68,
    paddingBottom: 10,
  },
  statusPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  statusColumn: {
    flex: 1,
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
  // Speakers/prayers tap zone, stacked directly under the status lines in the right column
  // (tapping under the DateBlock hits the non-pressable left column, so it does nothing — #1).
  block2Press: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 4,
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
