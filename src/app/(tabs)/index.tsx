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
import { ScrollView, StyleSheet, View, Text, Pressable } from 'react-native';
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
  const { data: speeches } = useSpeeches({ start: startDate, end: endDate });
  const { data: exceptions } = useSundayExceptions(startDate, endDate);
  const { data: agendas } = useAgendaRange(startDate, endDate);

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

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
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
