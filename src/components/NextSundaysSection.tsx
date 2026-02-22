/**
 * NextSundaysSection: Shows next 3 sundays with non-expandable cards.
 * All roles can see this section.
 * DateBlock left, LEDs + speaker names, pencil button right.
 * Pencil navigates to Speeches tab with expandDate param.
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { SundayCard } from './SundayCard';
import { QueryErrorView } from './QueryErrorView';
import {
  useSpeeches,
  groupSpeechesBySunday,
} from '../hooks/useSpeeches';
import { useAgendaRange } from '../hooks/useAgenda';
import { useSundayExceptions } from '../hooks/useSundayTypes';
import { getNextSundays, toISODateString } from '../lib/dateUtils';

const NEXT_SUNDAYS_COUNT = 3;

export function NextSundaysSection() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();

  // Get next 3 sundays
  const nextSundays = useMemo(() => {
    const today = new Date();
    return getNextSundays(today, NEXT_SUNDAYS_COUNT).map(toISODateString);
  }, []);

  const startDate = nextSundays[0] ?? '';
  const endDate = nextSundays[nextSundays.length - 1] ?? '';
  const nextSunday = nextSundays[0] ?? null;

  // Fetch data
  const { data: speeches, isError: speechesError, error: speechesErr, refetch: refetchSpeeches } = useSpeeches({ start: startDate, end: endDate });
  const { data: exceptions, isError: exceptionsError, error: exceptionsErr, refetch: refetchExceptions } = useSundayExceptions(startDate, endDate);

  // F118: Fetch agenda range for has_second_speech
  const { data: agendaRange } = useAgendaRange(startDate, endDate);
  const agendaMap = useMemo(() => {
    const map = new Map<string, { has_second_speech: boolean }>();
    for (const a of agendaRange ?? []) {
      map.set(a.sunday_date, { has_second_speech: a.has_second_speech });
    }
    return map;
  }, [agendaRange]);

  const speechesBySunday = useMemo(
    () => groupSpeechesBySunday(speeches ?? [], nextSundays, exceptions ?? []),
    [speeches, nextSundays, exceptions]
  );

  if (nextSundays.length === 0) return null;

  if (speechesError || exceptionsError) {
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t('home.nextAssignments')}
        </Text>
        <QueryErrorView
          error={speechesErr ?? exceptionsErr ?? null}
          onRetry={() => {
            refetchSpeeches();
            refetchExceptions();
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {t('home.nextAssignments')}
      </Text>

      {speechesBySunday.map((entry) => {
        const agendaData = agendaMap.get(entry.date);
        const hasSecondSpeech = agendaData?.has_second_speech ?? true;
        return (
          <SundayCard
            key={entry.date}
            date={entry.date}
            speeches={entry.speeches}
            exception={entry.exception}
            isNext={entry.date === nextSunday}
            hasSecondSpeech={hasSecondSpeech}
            renderHeaderRight={() => (
              <Pressable
                style={[styles.pencilButton, { backgroundColor: colors.surfaceVariant }]}
                onPress={() => router.push({ pathname: '/(tabs)/speeches', params: { expandDate: entry.date } })}
                accessibilityRole="button"
                accessibilityLabel="Edit speeches"
              >
                <Text style={[styles.pencilText, { color: colors.text }]}>
                  {'\u270F'}
                </Text>
              </Pressable>
            )}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
