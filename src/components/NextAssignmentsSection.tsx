/**
 * NextAssignmentsSection: Bishopric-only section showing the next sunday
 * with pending assignments (after the next 3 sundays are fully assigned).
 * Appears when all 9 speeches of next 3 sundays are assigned.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
  useWardManagePrayers,
  groupSpeechesBySunday,
} from '../hooks/useSpeeches';
import { useSundayExceptions, useSetSundayType, useRemoveSundayException } from '../hooks/useSundayTypes';
import { getNextSundays, toISODateString } from '../lib/dateUtils';
import { areNext3FullyAssigned, findNextPendingSunday } from '../lib/speechUtils';
import type {
  Member,
  TopicWithCollection,
  SpeechStatus,
  SundayExceptionReason,
} from '../types/database';

// Re-export for backward compatibility
export { areNext3FullyAssigned, findNextPendingSunday } from '../lib/speechUtils';

// Look ahead window
const LOOK_AHEAD_SUNDAYS = 12;

export function NextAssignmentsSection() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { hasPermission } = useAuth();
  const { managePrayers } = useWardManagePrayers();

  const sectionTitleText = managePrayers
    ? t('home.nextSpeechesAndPrayers')
    : t('home.nextAssignments');

  const [expanded, setExpanded] = useState(false);
  const [speakerModalSpeechId, setSpeakerModalSpeechId] = useState<string | null>(null);
  const [topicModalSpeechId, setTopicModalSpeechId] = useState<string | null>(null);

  const canWriteSundayType = hasPermission('sunday_type:write');

  const nextSundays = useMemo(() => {
    const today = new Date();
    return getNextSundays(today, LOOK_AHEAD_SUNDAYS).map(toISODateString);
  }, []);

  const startDate = nextSundays[0] ?? '';
  const endDate = nextSundays[nextSundays.length - 1] ?? '';

  const { data: speeches, isError: speechesError, error: speechesErr, refetch: refetchSpeeches } = useSpeeches({ start: startDate, end: endDate });
  const { data: exceptions, isError: exceptionsError, error: exceptionsErr, refetch: refetchExceptions } = useSundayExceptions(startDate, endDate);

  const lazyCreate = useLazyCreateSpeeches();
  const assignSpeaker = useAssignSpeaker();
  const assignTopic = useAssignTopic();
  const changeStatus = useChangeStatus();
  const removeAssignment = useRemoveAssignment();
  const setSundayType = useSetSundayType();
  const removeSundayException = useRemoveSundayException();

  const allEntries = useMemo(
    () => groupSpeechesBySunday(speeches ?? [], nextSundays, exceptions ?? []),
    [speeches, nextSundays, exceptions]
  );

  const next3 = allEntries.slice(0, 3);
  const allAssigned = areNext3FullyAssigned(next3);
  const pendingEntry = findNextPendingSunday(allEntries);

  const handleToggle = useCallback(() => {
    if (!expanded && pendingEntry) {
      lazyCreate.mutate({ sundayDate: pendingEntry.date });
    }
    setExpanded((prev) => !prev);
  }, [expanded, lazyCreate, pendingEntry]);

  const handleAssignSpeaker = useCallback(
    (speechId: string, member: Member) => {
      assignSpeaker.mutate({
        speechId,
        memberId: member.id,
        speakerName: member.full_name,
        speakerPhone: member.phone ?? '',
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

  // Only visible for Bishopric
  if (!hasPermission('home:next_assignments')) return null;

  if (speechesError || exceptionsError) {
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {sectionTitleText}
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

  // Only show if all 9 speeches of next 3 sundays are assigned
  if (!allAssigned) return null;

  if (!pendingEntry) return null;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {t('home.nextAssignments')}
      </Text>

      <SundayCard
        date={pendingEntry.date}
        speeches={pendingEntry.speeches}
        exception={pendingEntry.exception}
        expanded={expanded}
        onToggle={handleToggle}
        onTypeChange={(date, type, customReason) => setSundayType.mutate({ date, reason: type, custom_reason: customReason })}
        onRemoveException={(date) => removeSundayException.mutate(date)}
        typeDisabled={!canWriteSundayType}
      >
        {expanded &&
          [1, 2, 3].map((pos) => {
            const speech = pendingEntry.speeches.find((s) => s.position === pos) ?? null;
            return (
              <SpeechSlot
                key={pos}
                speech={speech}
                position={pos}
                onChangeStatus={(id, status) => changeStatus.mutate({ speechId: id, status })}
                onRemoveAssignment={(id) => removeAssignment.mutate({ speechId: id, speakerName: speech?.speaker_name ?? undefined })}
                onOpenSpeakerSelector={(id) => setSpeakerModalSpeechId(id)}
                onOpenTopicSelector={(id) => setTopicModalSpeechId(id)}
              />
            );
          })}
      </SundayCard>

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
    fontSize: 18,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
