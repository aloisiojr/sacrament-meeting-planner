/**
 * Speeches/Prayers editor — full-screen route (v2 unified cards, N2/S1).
 *
 * Root-level route pushed OVER the tabs (sibling of presentation.tsx). Hosts the former
 * "expanded speeches card": the SpeechSlot rows + PeoplePicker + TopicSelectorModal for a
 * single Sunday, driven by the SAME data hooks as the inline speeches tab.
 *
 * Navigate here with: router.push({ pathname: '/speeches/[date]', params: { date } }).
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useOnlineStatus } from '../../contexts/OnlineStatusContext';
import { ThemedErrorBoundary } from '../../components/ErrorBoundary';
import { QueryErrorView } from '../../components/QueryErrorView';
import { SpeechSlot } from '../../components/SpeechSlot';
import { PeoplePicker, type PickerContext } from '../../components/PeoplePicker';
import { TopicSelectorModal } from '../../components/TopicSelectorModal';
import { buildFullPhone } from '../../lib/phone';
import { resolveContactSnapshot } from '../../lib/contact';
import { formatFullDate } from '../../lib/dateUtils';
import { getCurrentLanguage } from '../../i18n';
import { useMembers } from '../../hooks/useMembers';
import { useAgenda, useUpdateAgendaByDate } from '../../hooks/useAgenda';
import { useSundayExceptions } from '../../hooks/useSundayTypes';
import {
  useSpeeches,
  useLazyCreateSpeeches,
  useAssignSpeaker,
  useAssignTopic,
  useChangeStatus,
  useRemoveAssignment,
  useWardManagePrayers,
} from '../../hooks/useSpeeches';
import { supabase } from '../../lib/supabase';
import type {
  Member,
  TopicWithCollection,
  SpeechStatus,
  SundayExceptionReason,
} from '../../types/database';

function SpeechesEditContent() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const isOnline = useOnlineStatus();
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();
  const date = params.date ?? '';

  const [speakerModalSpeechId, setSpeakerModalSpeechId] = useState<string | null>(null);
  const [topicModalSpeechId, setTopicModalSpeechId] = useState<string | null>(null);

  const dateLabel = useMemo(
    () => (date ? formatFullDate(date, getCurrentLanguage()) : ''),
    [date]
  );

  const { managePrayers } = useWardManagePrayers();
  const { data: members } = useMembers();

  // Single-date range reuses the same range-based hooks as the inline tab.
  const {
    data: speeches,
    isError: speechesError,
    error: speechesErr,
    refetch: refetchSpeeches,
  } = useSpeeches({ start: date, end: date });
  const {
    data: exceptions,
    isError: exceptionsError,
    error: exceptionsErr,
    refetch: refetchExceptions,
  } = useSundayExceptions(date, date);
  const { data: agenda } = useAgenda(date);

  const exception = useMemo(
    () => (exceptions ?? []).find((e) => e.date === date) ?? null,
    [exceptions, date]
  );
  const hasSecondSpeech = agenda?.has_second_speech ?? true;

  const speechesForDay = useMemo(() => speeches ?? [], [speeches]);

  // Mutations
  const lazyCreate = useLazyCreateSpeeches();
  const assignSpeaker = useAssignSpeaker();
  const assignTopic = useAssignTopic();
  const changeStatus = useChangeStatus();
  const removeAssignment = useRemoveAssignment();
  const updateAgenda = useUpdateAgendaByDate();

  // Lazy-create the speech rows for this date on entry (mirrors the tab's expand behavior).
  useEffect(() => {
    if (!date || !isOnline) return;
    const sundayType = exception?.reason as SundayExceptionReason | undefined;
    lazyCreate.mutate({ sundayDate: date, sundayType });
    // Keyed off date + resolved sunday type; lazyCreate is a stable mutation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, isOnline, exception?.reason]);

  // Speaker assignment (identical wiring to the inline tab).
  const handleAssignSpeaker = useCallback(
    (speechId: string, member: Member) => {
      const speech = speechesForDay.find((s) => s.id === speechId);
      const statusOverride =
        !managePrayers && speech && (speech.position === 0 || speech.position === 4)
          ? ('assigned_confirmed' as SpeechStatus)
          : undefined;

      const responsible = member.responsible_id
        ? (members ?? []).find((m) => m.id === member.responsible_id) ?? null
        : null;
      const contact = resolveContactSnapshot(member, responsible);

      assignSpeaker.mutate({
        speechId,
        memberId: member.id,
        speakerName: member.full_name,
        speakerInformalName: member.informal_name,
        speakerPhone: buildFullPhone(member.country_code, member.phone),
        contactPhone: contact.contact_phone,
        isDelegated: contact.is_delegated,
        delegateForName: contact.delegate_for_name,
        status: statusOverride,
      });
      setSpeakerModalSpeechId(null);
    },
    [assignSpeaker, speechesForDay, managePrayers, members]
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
        topicTitle: '',
        topicLink: null,
        topicCollection: '',
      });
    },
    [assignTopic]
  );

  // 2nd-speech toggle (mirrors handleToggleSecondSpeech from the inline tab).
  const handleToggleSecondSpeech = useCallback(
    (enabled: boolean) => {
      if (!enabled) {
        const speech2 = speechesForDay.find((s) => s.position === 2);
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
                    supabase
                      .from('speeches')
                      .update({ topic_title: '', topic_link: '', topic_collection: '' })
                      .eq('id', speech2.id)
                      .then();
                  }
                  updateAgenda.mutate({ sundayDate: date, updates: { has_second_speech: false } });
                },
              },
            ]
          );
          return;
        }
        if (speech2) {
          supabase
            .from('speeches')
            .update({ topic_title: '', topic_link: '', topic_collection: '' })
            .eq('id', speech2.id)
            .then();
        }
        updateAgenda.mutate({ sundayDate: date, updates: { has_second_speech: false } });
      } else {
        updateAgenda.mutate({ sundayDate: date, updates: { has_second_speech: true } });
      }
    },
    [speechesForDay, t, removeAssignment, updateAgenda, date]
  );

  // Picker context for the open speaker/prayer selector.
  const speakerModalContext = useMemo<PickerContext>(() => {
    const speech = speechesForDay.find((s) => s.id === speakerModalSpeechId);
    if (speech?.position === 0) return 'opening_prayer';
    if (speech?.position === 4) return 'closing_prayer';
    return 'speaker';
  }, [speechesForDay, speakerModalSpeechId]);

  const isSpeechesType = !exception || exception.reason === 'speeches';
  const isTestimonyOrPrimary =
    !!exception &&
    (exception.reason === 'testimony_meeting' || exception.reason === 'primary_presentation');
  const disabled = !isOnline;

  if (speechesError || exceptionsError) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
        <QueryErrorView
          error={speechesErr ?? exceptionsErr ?? null}
          onRetry={() => {
            refetchSpeeches();
            refetchExceptions();
          }}
        />
      </SafeAreaView>
    );
  }

  const renderPrayerSlot = (position: number) => {
    const prayerSpeech = speechesForDay.find((s) => s.position === position) ?? null;
    return (
      <SpeechSlot
        key={position}
        speech={prayerSpeech}
        position={position}
        isPrayer
        disabled={disabled}
        onChangeStatus={handleChangeStatus}
        onRemoveAssignment={handleRemoveAssignment}
        onOpenSpeakerSelector={(id) => setSpeakerModalSpeechId(id)}
      />
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          hitSlop={12}
          testID="speeches-edit-back-button"
        >
          <Text style={[styles.backButton, { color: colors.primary }]}>{t('common.back')}</Text>
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {dateLabel}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {t('speeches.editTitle')}
          </Text>
        </View>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {speeches === undefined ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : isSpeechesType ? (
          <>
            {managePrayers && renderPrayerSlot(0)}
            {[1, 2, 3].map((pos) => {
              const speech = speechesForDay.find((s) => s.position === pos) ?? null;
              return (
                <SpeechSlot
                  key={pos}
                  speech={speech}
                  position={pos}
                  disabled={disabled}
                  onChangeStatus={handleChangeStatus}
                  onRemoveAssignment={handleRemoveAssignment}
                  onClearTopic={handleClearTopic}
                  onOpenSpeakerSelector={(id) => setSpeakerModalSpeechId(id)}
                  onOpenTopicSelector={(id) => setTopicModalSpeechId(id)}
                  isSecondSpeechEnabled={pos === 2 ? hasSecondSpeech : undefined}
                  onToggleSecondSpeech={pos === 2 ? handleToggleSecondSpeech : undefined}
                />
              );
            })}
            {managePrayers && renderPrayerSlot(4)}
          </>
        ) : isTestimonyOrPrimary && managePrayers ? (
          <>
            {renderPrayerSlot(0)}
            {renderPrayerSlot(4)}
          </>
        ) : (
          <Text style={[styles.emptyText, { color: colors.warning }]}>
            {exception && exception.reason === 'other' && exception.custom_reason
              ? exception.custom_reason
              : t(`sundayExceptions.${exception?.reason}`)}
          </Text>
        )}
      </ScrollView>

      {/* Speaker / Prayer Selector */}
      <PeoplePicker
        visible={!!speakerModalSpeechId}
        context={speakerModalContext}
        onSelect={(member) => {
          if (speakerModalSpeechId) {
            handleAssignSpeaker(speakerModalSpeechId, member);
          }
        }}
        onClose={() => setSpeakerModalSpeechId(null)}
      />

      {/* Topic Selector Modal */}
      <TopicSelectorModal
        visible={!!topicModalSpeechId}
        onSelect={(topic) => {
          if (topicModalSpeechId) {
            handleAssignTopic(topicModalSpeechId, topic);
          }
        }}
        onClose={() => setTopicModalSpeechId(null)}
      />
    </SafeAreaView>
  );
}

export default function SpeechesEditScreen() {
  return (
    <ThemedErrorBoundary>
      <SpeechesEditContent />
    </ThemedErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    fontSize: 16,
    width: 48,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingBottom: 40,
  },
  loading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    fontStyle: 'italic',
    paddingVertical: 24,
    textAlign: 'center',
  },
});
