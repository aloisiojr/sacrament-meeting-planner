/**
 * NextSundaysSection: Shows next 3 sundays with expandable cards.
 * All roles can see this section.
 * DateBlock left, 3 LEDs right, expandable with SpeechSlots.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { SundayCard } from './SundayCard';
import { SpeechSlot } from './SpeechSlot';
import { MemberSelectorModal } from './MemberSelectorModal';
import { TopicSelectorModal } from './TopicSelectorModal';
import { QueryErrorView } from './QueryErrorView';
import {
  useSpeeches,
  useLazyCreateSpeeches,
  useAssignSpeaker,
  useAssignTopic,
  useChangeStatus,
  useRemoveAssignment,
  groupSpeechesBySunday,
} from '../hooks/useSpeeches';
import { useAgendaRange, useUpdateAgendaByDate } from '../hooks/useAgenda';
import { SUNDAY_TYPE_SPEECHES } from '../hooks/useSundayTypes';
import { useSundayExceptions, useSetSundayType, useRemoveSundayException } from '../hooks/useSundayTypes';
import { getNextSundays, toISODateString } from '../lib/dateUtils';
import type { Member, TopicWithCollection, SpeechStatus, SundayExceptionReason } from '../types/database';

const NEXT_SUNDAYS_COUNT = 3;

export function NextSundaysSection() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { hasPermission } = useAuth();

  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [speakerModalSpeechId, setSpeakerModalSpeechId] = useState<string | null>(null);
  const [topicModalSpeechId, setTopicModalSpeechId] = useState<string | null>(null);

  const canWriteSundayType = hasPermission('sunday_type:write');

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
  const updateAgenda = useUpdateAgendaByDate();
  const agendaMap = useMemo(() => {
    const map = new Map<string, { has_second_speech: boolean }>();
    for (const a of agendaRange ?? []) {
      map.set(a.sunday_date, { has_second_speech: a.has_second_speech });
    }
    return map;
  }, [agendaRange]);

  // Mutations
  const lazyCreate = useLazyCreateSpeeches();
  const assignSpeaker = useAssignSpeaker();
  const assignTopic = useAssignTopic();
  const changeStatus = useChangeStatus();
  const removeAssignment = useRemoveAssignment();
  const setSundayType = useSetSundayType();
  const removeSundayException = useRemoveSundayException();

  const speechesBySunday = useMemo(
    () => groupSpeechesBySunday(speeches ?? [], nextSundays, exceptions ?? []),
    [speeches, nextSundays, exceptions]
  );

  const handleToggle = useCallback(
    (date: string) => {
      if (expandedDate === date) {
        setExpandedDate(null);
      } else {
        setExpandedDate(date);
        lazyCreate.mutate(date);
      }
    },
    [expandedDate, lazyCreate]
  );

  const handleAssignSpeaker = useCallback(
    (speechId: string, member: Member) => {
      assignSpeaker.mutate({
        speechId,
        memberId: member.id,
        speakerName: member.full_name,
        speakerPhone: member.phone ?? null,
      });
      setSpeakerModalSpeechId(null);
    },
    [assignSpeaker]
  );

  const handleAssignTopic = useCallback(
    (speechId: string, topic: TopicWithCollection) => {
      assignTopic.mutate({
        speechId,
        topicTitle: topic.title,
        topicLink: topic.link,
        topicCollection: topic.collection,
      });
      setTopicModalSpeechId(null);
    },
    [assignTopic]
  );

  const handleChangeStatus = useCallback(
    (speechId: string, status: SpeechStatus) => {
      changeStatus.mutate({ speechId, status });
    },
    [changeStatus]
  );

  const handleRemoveAssignment = useCallback(
    (speechId: string, speakerName?: string) => {
      removeAssignment.mutate({ speechId, speakerName });
    },
    [removeAssignment]
  );

  const handleClearTopic = useCallback(
    (speechId: string) => {
      assignTopic.mutate({
        speechId,
        topicTitle: null,
        topicLink: null,
        topicCollection: null,
      });
    },
    [assignTopic]
  );

  const handleTypeChange = useCallback(
    (date: string, type: SundayExceptionReason, customReason?: string) => {
      setSundayType.mutate({ date, reason: type, custom_reason: customReason });
    },
    [setSundayType]
  );

  const handleRemoveException = useCallback(
    (date: string) => {
      removeSundayException.mutate(date);
    },
    [removeSundayException]
  );

  // F118: Handle toggle of 2nd speech for a specific date
  const handleToggleSecondSpeech = useCallback(
    (date: string, enabled: boolean) => {
      if (!enabled) {
        const entry = speechesBySunday.find((e) => e.date === date);
        const speech2 = entry?.speeches?.find((s) => s.position === 2);
        const hasAssignments = !!(speech2?.speaker_name || speech2?.topic_title);

        if (hasAssignments) {
          Alert.alert(
            t('speeches.secondSpeechToggleConfirmTitle'),
            t('speeches.secondSpeechToggleConfirmMessage'),
            [
              { text: t('common.cancel'), style: 'cancel' },
              {
                text: t('common.confirm'),
                style: 'destructive',
                onPress: () => {
                  if (speech2) {
                    removeAssignment.mutate({ speechId: speech2.id });
                  }
                  updateAgenda.mutate({ sundayDate: date, updates: { has_second_speech: false } });
                },
              },
            ]
          );
          return;
        }
        updateAgenda.mutate({ sundayDate: date, updates: { has_second_speech: false } });
      } else {
        updateAgenda.mutate({ sundayDate: date, updates: { has_second_speech: true } });
      }
    },
    [speechesBySunday, t, removeAssignment, updateAgenda]
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
            expanded={expandedDate === entry.date}
            hasSecondSpeech={hasSecondSpeech}
            onToggle={() => handleToggle(entry.date)}
            onTypeChange={handleTypeChange}
            onRemoveException={handleRemoveException}
            typeDisabled={!canWriteSundayType}
          >
            {expandedDate === entry.date &&
              (!entry.exception || entry.exception.reason === 'speeches') &&
              [1, 2, 3].map((pos) => {
                const speech = entry.speeches.find((s) => s.position === pos) ?? null;
                return (
                  <SpeechSlot
                    key={pos}
                    speech={speech}
                    position={pos}
                    onChangeStatus={handleChangeStatus}
                    onRemoveAssignment={handleRemoveAssignment}
                    onClearTopic={handleClearTopic}
                    onOpenSpeakerSelector={(id) => setSpeakerModalSpeechId(id)}
                    onOpenTopicSelector={(id) => setTopicModalSpeechId(id)}
                    isSecondSpeechEnabled={pos === 2 ? hasSecondSpeech : undefined}
                    onToggleSecondSpeech={pos === 2 ? (enabled) => handleToggleSecondSpeech(entry.date, enabled) : undefined}
                  />
                );
              })}
          </SundayCard>
        );
      })}

      <MemberSelectorModal
        visible={!!speakerModalSpeechId}
        onSelect={(member) => {
          if (speakerModalSpeechId) handleAssignSpeaker(speakerModalSpeechId, member);
        }}
        onClose={() => setSpeakerModalSpeechId(null)}
      />

      <TopicSelectorModal
        visible={!!topicModalSpeechId}
        onSelect={(topic) => {
          if (topicModalSpeechId) handleAssignTopic(topicModalSpeechId, topic);
        }}
        onClose={() => setTopicModalSpeechId(null)}
      />
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
});
