/**
 * Home tab: shows upcoming sundays, pending assignments, and invite management.
 * Shows "Start Sacrament Meeting" button at the top (all roles, all days).
 * Below button: non-expandable agenda preview card for target Sunday.
 * Sections are role-gated:
 * - NextSundaysSection: all roles
 * - NextAssignmentsSection: bishopric only (when next 3 fully assigned)
 * - InviteManagementSection: secretary only
 */

import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedErrorBoundary } from '../../components/ErrorBoundary';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { NextSundaysSection } from '../../components/NextSundaysSection';
import { NextAssignmentsSection } from '../../components/NextAssignmentsSection';
import { InviteManagementSection } from '../../components/InviteManagementSection';
import { getTodaySundayDate } from '../../hooks/usePresentationMode';
import { useAgenda } from '../../hooks/useAgenda';
import { useSpeeches } from '../../hooks/useSpeeches';
import { useSundayExceptions } from '../../hooks/useSundayTypes';
import { zeroPadDay, getMonthAbbr } from '../../lib/dateUtils';
import { getCurrentLanguage } from '../../i18n';
import { PlayIcon, PencilIcon } from '../../components/icons';
import type { SundayAgenda } from '../../types/database';

function HomeTabContent() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const locale = getCurrentLanguage();

  const sundayDate = useMemo(() => getTodaySundayDate(), []);

  // Fetch data for preview card
  const { data: agenda } = useAgenda(sundayDate);
  const { data: speeches } = useSpeeches({ start: sundayDate, end: sundayDate });
  const { data: exceptions } = useSundayExceptions(sundayDate, sundayDate);

  // Parse date for dateBlock
  const [, monthStr, dayStr] = sundayDate.split('-');
  const dayNum = parseInt(dayStr, 10);
  const monthNum = parseInt(monthStr, 10);
  const monthAbbr = getMonthAbbr(monthNum, locale);
  const dayDisplay = zeroPadDay(dayNum);

  // Exception for preview card
  const exception = exceptions?.[0] ?? null;
  const exceptionLabel = (exception && exception.reason !== 'speeches')
    ? t(`sundayExceptions.${exception.reason}`, exception.reason)
    : null;

  const SPECIAL_MEETING_WITH_STATUS = ['testimony_meeting', 'primary_presentation'];
  const isSpecialWithStatus = exceptionLabel &&
    exception?.reason &&
    SPECIAL_MEETING_WITH_STATUS.includes(exception.reason);

  // Compute status lines for preview card
  const statusLines = useMemo(() => {
    const GREEN = '#22c55e';

    const missingRoles: string[] = [];
    if (!agenda?.presiding_name) missingRoles.push(t('agenda.statusPresiding'));
    if (!agenda?.conducting_name) missingRoles.push(t('agenda.statusConducting'));
    if (!agenda?.pianist_name) missingRoles.push(t('agenda.statusPianist'));
    if (!agenda?.conductor_name) missingRoles.push(t('agenda.statusConductor'));

    if (isSpecialWithStatus) {
      // Special meeting: prayers + hymns (no speakers)
      let prayersFilled = 0;
      if (agenda?.opening_prayer_name) prayersFilled++;
      if (agenda?.closing_prayer_name) prayersFilled++;

      let hymnsFilled = 0;
      const hymnsTotal = 3;
      if (agenda?.opening_hymn_id) hymnsFilled++;
      if (agenda?.sacrament_hymn_id) hymnsFilled++;
      if (agenda?.closing_hymn_id) hymnsFilled++;

      return { missingRoles, prayersFilled, hymnsFilled, hymnsTotal, speakersFilled: undefined, GREEN };
    }

    if (!exceptionLabel) {
      // Normal speeches meeting
      // F132: Dynamic speaker count based on has_second_speech
      const hasSecondSpeech = agenda?.has_second_speech ?? true;
      const speakersTotal = hasSecondSpeech ? 3 : 2;
      const positionsToCheck = hasSecondSpeech ? [1, 2, 3] : [1, 3];
      let speakersFilled = 0;
      for (const pos of positionsToCheck) {
        const overrideField = `speaker_${pos}_override` as keyof SundayAgenda;
        const overrideVal = agenda?.[overrideField] as string | null;
        const speech = speeches?.find((s) => s.position === pos);
        if (overrideVal ?? speech?.speaker_name) speakersFilled++;
      }

      let prayersFilled = 0;
      if (agenda?.opening_prayer_name) prayersFilled++;
      if (agenda?.closing_prayer_name) prayersFilled++;

      let hymnsFilled = 0;
      let hymnsTotal = 3;
      if (agenda?.opening_hymn_id) hymnsFilled++;
      if (agenda?.sacrament_hymn_id) hymnsFilled++;
      if (agenda?.closing_hymn_id) hymnsFilled++;
      if (agenda?.has_intermediate_hymn !== false && !agenda?.has_special_presentation) {
        hymnsTotal = 4;
        if (agenda?.intermediate_hymn_id) hymnsFilled++;
      }

      return { missingRoles, speakersFilled, speakersTotal, prayersFilled, hymnsFilled, hymnsTotal, GREEN };
    }

    // Non-expandable exception (Gen Conf, Stake Conf) - no status lines
    return null;
  }, [agenda, speeches, exceptionLabel, isSpecialWithStatus, t]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('home.meetingAgendaTitle')}
          </Text>
          <Pressable
            style={[styles.meetingButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push({ pathname: '/presentation', params: { date: sundayDate } })}
            accessibilityRole="button"
          >
            <View style={styles.meetingButtonContent}>
              <View style={styles.playIconWrapper}>
                <PlayIcon size={20} color={colors.onPrimary} />
              </View>
              <Text style={[styles.meetingButtonText, { color: colors.onPrimary }]}>
                {t('home.startMeeting')}
              </Text>
            </View>
          </Pressable>

          {/* Agenda Preview Card */}
          <View
            style={[
              styles.previewCard,
              { backgroundColor: colors.card, borderColor: colors.primary, borderWidth: 2 },
            ]}
          >
            <View style={styles.previewCardHeader}>
              <View style={[styles.dateBlock, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[styles.dateDay, { color: colors.text }]}>{dayDisplay}</Text>
                <Text style={[styles.dateMonth, { color: colors.textSecondary }]}>
                  {monthAbbr}
                </Text>
              </View>

              <View style={styles.previewCardCenter}>
                {exceptionLabel && !isSpecialWithStatus && (
                  <Text
                    style={[styles.exceptionText, { color: colors.warning }]}
                    numberOfLines={1}
                  >
                    {exceptionLabel}
                  </Text>
                )}
                {isSpecialWithStatus && statusLines && (() => {
                  return (
                    <>
                      {statusLines.missingRoles.length > 0 && (
                        <Text style={[styles.statusLine, { color: colors.textSecondary }]} numberOfLines={1}>
                          {`${t('agenda.statusMissing')}${statusLines.missingRoles.join(' | ')}`}
                        </Text>
                      )}
                      <Text
                        style={[styles.exceptionText, { color: colors.warning }]}
                        numberOfLines={1}
                      >
                        {exceptionLabel}
                      </Text>
                      <Text
                        style={[styles.statusLine, { color: statusLines.prayersFilled === 2 ? statusLines.GREEN : colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {`${t('agenda.statusPrayersLabel')}: ${statusLines.prayersFilled} de ${2}`}
                      </Text>
                      <Text
                        style={[styles.statusLine, { color: statusLines.hymnsFilled === statusLines.hymnsTotal ? statusLines.GREEN : colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {t('agenda.statusHymns', { filled: statusLines.hymnsFilled, total: statusLines.hymnsTotal })}
                      </Text>
                    </>
                  );
                })()}
                {!exceptionLabel && statusLines && (() => {
                  return (
                    <>
                      {statusLines.missingRoles.length > 0 && (
                        <Text style={[styles.statusLine, { color: colors.textSecondary }]} numberOfLines={1}>
                          {`${t('agenda.statusMissing')}${statusLines.missingRoles.join(' | ')}`}
                        </Text>
                      )}
                      <Text
                        style={[styles.statusLine, { color: statusLines.speakersFilled === statusLines.speakersTotal ? statusLines.GREEN : colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {t('agenda.statusSpeakers', { filled: statusLines.speakersFilled, total: statusLines.speakersTotal })}
                      </Text>
                      <Text
                        style={[styles.statusLine, { color: statusLines.prayersFilled === 2 ? statusLines.GREEN : colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {t('agenda.statusPrayers', { filled: statusLines.prayersFilled, total: 2 })}
                      </Text>
                      <Text
                        style={[styles.statusLine, { color: statusLines.hymnsFilled === statusLines.hymnsTotal ? statusLines.GREEN : colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {t('agenda.statusHymns', { filled: statusLines.hymnsFilled, total: statusLines.hymnsTotal })}
                      </Text>
                    </>
                  );
                })()}
              </View>

              <Pressable
                style={[styles.pencilButton, { backgroundColor: colors.surfaceVariant }]}
                onPress={() => router.push({ pathname: '/(tabs)/agenda', params: { expandDate: sundayDate } })}
                accessibilityRole="button"
                accessibilityLabel="Edit agenda"
              >
                <PencilIcon size={16} color={colors.text} />
              </Pressable>
            </View>
          </View>
        </View>
        <NextSundaysSection />
        <NextAssignmentsSection />
        <InviteManagementSection />
      </ScrollView>
    </SafeAreaView>
  );
}

export default function HomeTab() {
  return (
    <ThemedErrorBoundary>
      <HomeTabContent />
    </ThemedErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  meetingButton: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  meetingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIconWrapper: {
    marginRight: 8,
  },
  meetingButtonText: {
    fontSize: 17,
    fontWeight: '700',
  },
  previewCard: {
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 12,
    marginVertical: 4,
    overflow: 'hidden',
  },
  previewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateBlock: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateDay: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 12,
    textTransform: 'uppercase',
  },
  previewCardCenter: {
    flex: 1,
    marginHorizontal: 12,
  },
  exceptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusLine: {
    fontSize: 11,
  },
  pencilButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pencilText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
