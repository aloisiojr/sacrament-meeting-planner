/**
 * Home tab: shows the next 3 Sundays as unified cards, pending assignments, and invite management.
 * Layout:
 * - "Start Sacrament Meeting" (Play) button at the top (all roles, all days) → /presentation.
 * - ONE highlighted (destaque) UnifiedSundayCard for the next Sunday (the hero).
 * - "Próximos domingos" section with exactly 2 UnifiedSundayCards (the following two Sundays).
 * - Role-gated sections below: NextAssignmentsSection (bishopric) + InviteManagementSection
 *   (secretary), both online-only.
 *
 * The unified card is the only collapsed-card type. Home has no inline expand: tapping a card's
 * status zone navigates to the Agendas tab (expanded on that date); tapping the speakers zone
 * pushes the speeches edit screen.
 */

import React, { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, View, Text, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedErrorBoundary } from '../../components/ErrorBoundary';
import { useRouter } from 'expo-router';
import { HomeMemberImportPrompt } from '../../components/HomeMemberImportPrompt';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useOnlineStatus } from '../../contexts/OnlineStatusContext';
import { UnifiedSundayCard } from '../../components/UnifiedSundayCard';
import { buildUnifiedCardData } from '../../lib/unifiedCard';
import { NextAssignmentsSection } from '../../components/NextAssignmentsSection';
import { InviteManagementSection } from '../../components/InviteManagementSection';
import { useAgendaRange } from '../../hooks/useAgenda';
import { useSpeeches, useWardManagePrayers } from '../../hooks/useSpeeches';
import { useWardName } from '../../hooks/useWard';
import { useSundayExceptions } from '../../hooks/useSundayTypes';
import { getNextSundays, toISODateString } from '../../lib/dateUtils';
import { PlayIcon } from '../../components/icons';
import type { SundayAgenda, Speech, SundayException } from '../../types/database';
import { KeyboardAvoider } from '../../components/KeyboardAvoider';
import { QueryErrorView } from '../../components/QueryErrorView';

const NEXT_SUNDAYS_COUNT = 3;

function HomeTabContent() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const { managePrayers } = useWardManagePrayers();
  const wardName = useWardName();

  // The next 3 Sundays: [0] = hero (highlighted), [1..2] = "Próximos domingos".
  const nextSundays = useMemo(() => {
    const today = new Date();
    return getNextSundays(today, NEXT_SUNDAYS_COUNT).map(toISODateString);
  }, []);

  const startDate = nextSundays[0] ?? '';
  const endDate = nextSundays[nextSundays.length - 1] ?? '';
  const heroDate = nextSundays[0] ?? null;

  // Same hooks the Agendas tab / former NextSundaysSection used, across the 3-Sunday range.
  // Full typed results (EST-06/19): loading/error/refetch per hook, so a failed section is
  // visible and retryable instead of rendering as a silently empty card, and one failure
  // never blanks the sections that did load.
  const speechesQ = useSpeeches({ start: startDate, end: endDate });
  const exceptionsQ = useSundayExceptions(startDate, endDate);
  const agendasQ = useAgendaRange(startDate, endDate);
  const speeches = speechesQ.data;
  const exceptions = exceptionsQ.data;
  const agendas = agendasQ.data;

  const failedQueries = [speechesQ, exceptionsQ, agendasQ].filter((q) => q.isError);
  const isLoadingAny = speechesQ.isLoading || exceptionsQ.isLoading || agendasQ.isLoading;
  const hasAnyData = speeches !== undefined || exceptions !== undefined || agendas !== undefined;
  const firstError = failedQueries[0]?.error ?? null;
  const retryFailed = useCallback(() => {
    for (const q of [speechesQ, exceptionsQ, agendasQ]) {
      if (q.isError) void q.refetch();
    }
    // The query result objects change identity every render; the retry only
    // needs the latest render's, which the button below always calls through.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speechesQ.isError, exceptionsQ.isError, agendasQ.isError]);

  const speechMap = useMemo(() => {
    const map = new Map<string, Speech[]>();
    for (const s of speeches ?? []) {
      const arr = map.get(s.sunday_date) ?? [];
      arr.push(s);
      map.set(s.sunday_date, arr);
    }
    return map;
  }, [speeches]);

  const agendaMap = useMemo(() => {
    const map = new Map<string, SundayAgenda>();
    for (const a of agendas ?? []) map.set(a.sunday_date, a);
    return map;
  }, [agendas]);

  const exceptionMap = useMemo(() => {
    const map = new Map<string, SundayException>();
    for (const e of exceptions ?? []) map.set(e.date, e);
    return map;
  }, [exceptions]);

  // Build each Sunday's UnifiedSundayCard inputs via the shared pure mapper.
  const cards = useMemo(
    () =>
      nextSundays.map((date) => {
        const exception = exceptionMap.get(date) ?? null;
        const data = buildUnifiedCardData({
          agenda: agendaMap.get(date) ?? null,
          speeches: speechMap.get(date) ?? [],
          exceptionReason: exception?.reason ?? null,
          managePrayers,
        });
        return { date, exception, data };
      }),
    [nextSundays, exceptionMap, agendaMap, speechMap, managePrayers]
  );

  // Home has no inline expand: status → Agendas tab expanded; speakers → speeches edit screen.
  const handlePressStatus = useCallback(
    (date: string) => {
      router.push({ pathname: '/(tabs)/agenda', params: { expandDate: date } });
    },
    [router]
  );
  const handlePressSpeakers = useCallback(
    (date: string) => {
      router.push({ pathname: '/speeches/[date]', params: { date } });
    },
    [router]
  );

  const heroCard = cards[0] ?? null;
  const upcomingCards = cards.slice(1);

  const renderCard = (
    entry: { date: string; exception: SundayException | null; data: ReturnType<typeof buildUnifiedCardData> },
    opts: { highlighted?: boolean; hideStatusBlock?: boolean; testID: string }
  ) => (
    <UnifiedSundayCard
      key={entry.date}
      date={entry.date}
      highlighted={opts.highlighted}
      hideStatusBlock={opts.hideStatusBlock}
      exceptionReason={entry.exception?.reason ?? null}
      customReason={entry.exception?.custom_reason ?? null}
      roles={entry.data.roles}
      speakers={entry.data.speakers}
      prayers={entry.data.prayers}
      hymns={entry.data.hymns}
      managePrayers={managePrayers}
      nameRows={entry.data.nameRows}
      onPressStatus={handlePressStatus}
      onPressSpeakers={handlePressSpeakers}
      testID={opts.testID}
    />
  );

  // Loading / total-error / loaded are three distinct first screens (EST-06). Loaded-but-empty
  // falls through to the cards below; a partial failure keeps them and adds a banner (EST-19).
  if (!hasAnyData && failedQueries.length > 0 && !isLoadingAny) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
        <QueryErrorView testID="home-query-error" error={firstError} onRetry={retryFailed} />
      </SafeAreaView>
    );
  }
  if (!hasAnyData && isLoadingAny) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
        <View testID="home-loading" style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoider testID="home-keyboard-avoider">
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {failedQueries.length > 0 && (
            <View testID="home-partial-error" style={[styles.partialError, { borderColor: colors.divider }]}>
              <Text style={[styles.partialErrorText, { color: colors.text }]}>{t('errors.queryFailed')}</Text>
              <Pressable
                testID="home-partial-retry"
                onPress={retryFailed}
                accessibilityRole="button"
                style={[styles.partialRetry, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.partialRetryText, { color: colors.onPrimary }]}>{t('common.retry')}</Text>
              </Pressable>
            </View>
          )}
          <HomeMemberImportPrompt />
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]} testID="home-agenda-title">
              {wardName
                ? `${t('home.meetingAgendaTitle')} - ${wardName}`
                : t('home.meetingAgendaTitle')}
            </Text>
            <Pressable
              testID="home-start-meeting-button"
              style={[styles.meetingButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push({ pathname: '/presentation', params: { date: heroDate } })}
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

            {/* Hero: the next Sunday, highlighted. */}
            {heroCard && renderCard(heroCard, { highlighted: true, testID: `home-hero-card-${heroCard.date}` })}
          </View>

          {upcomingCards.length > 0 && (
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('home.upcomingSundays')}
              </Text>
              {upcomingCards.map((entry) =>
                renderCard(entry, { hideStatusBlock: true, testID: `home-upcoming-card-${entry.date}` })
              )}
            </View>
          )}

          {isOnline && <NextAssignmentsSection />}
          {isOnline && <InviteManagementSection />}
        </ScrollView>
      </KeyboardAvoider>
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
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  partialError: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
  },
  partialErrorText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  partialRetry: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 12,
  },
  partialRetryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scroll: {
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
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
});
