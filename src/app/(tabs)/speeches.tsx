/**
 * Speeches Tab: Infinite scroll list of SundayCards with speech management.
 * Initial window: 12 months past + 12 months future.
 * Next sunday scrolled to top on initial render (no animation).
 * +6 months on scroll in either direction.
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { ThemedErrorBoundary } from '../../components/ErrorBoundary';
import { QueryErrorView } from '../../components/QueryErrorView';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SundayCard } from '../../components/SundayCard';
import { SpeechSlot } from '../../components/SpeechSlot';
import { MemberSelectorModal } from '../../components/MemberSelectorModal';
import { TopicSelectorModal } from '../../components/TopicSelectorModal';
import { useSundayList } from '../../hooks/useSundayList';
import { useAgendaRange, useUpdateAgendaByDate } from '../../hooks/useAgenda';
import {
  useSpeeches,
  useLazyCreateSpeeches,
  useAssignSpeaker,
  useAssignTopic,
  useChangeStatus,
  useRemoveAssignment,
  useDeleteSpeechesByDate,
  groupSpeechesBySunday,
} from '../../hooks/useSpeeches';
import { useSundayExceptions, useSetSundayType, useAutoAssignSundayTypes, useRemoveSundayException } from '../../hooks/useSundayTypes';
import { toISODateString } from '../../lib/dateUtils';
import type { Member, TopicWithCollection, SpeechStatus, SundayExceptionReason } from '../../types/database';

// --- Year Separator ---

interface YearSeparatorItem {
  type: 'year';
  year: string;
  key: string;
}

interface SundayItem {
  type: 'sunday';
  date: string;
  key: string;
}

type ListItem = YearSeparatorItem | SundayItem;

/**
 * Build list items with year separators intercalated.
 */
function buildListItems(sundayDates: string[]): ListItem[] {
  const items: ListItem[] = [];
  let currentYear: string | null = null;

  for (const date of sundayDates) {
    const year = date.substring(0, 4);
    if (year !== currentYear) {
      currentYear = year;
      items.push({ type: 'year', year, key: `year-${year}` });
    }
    items.push({ type: 'sunday', date, key: date });
  }

  return items;
}

const YearSeparator = React.memo(function YearSeparator({ year }: { year: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.yearSeparator}>
      <Text style={[styles.yearText, { color: colors.textSecondary }]}>
        {year}
      </Text>
    </View>
  );
});

function SpeechesTabContent() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { hasPermission, role } = useAuth();
  const flatListRef = useRef<FlatList>(null);
  const params = useLocalSearchParams<{ expandDate?: string }>();
  const router = useRouter();

  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [speakerModalSpeechId, setSpeakerModalSpeechId] = useState<string | null>(null);
  const [topicModalSpeechId, setTopicModalSpeechId] = useState<string | null>(null);
  const [initialScrollDone, setInitialScrollDone] = useState(false);

  const sundayList = useSundayList();
  const { sundays, startDate, endDate, nextSunday, loadMoreFuture, loadMorePast, hasMoreFuture, hasMorePast } = sundayList;

  const isObserver = role === 'observer';
  const canWriteSundayType = hasPermission('sunday_type:write');

  // Fetch speeches and exceptions for the visible range
  const { data: speeches, isError: speechesError, error: speechesErr, refetch: refetchSpeeches } = useSpeeches({ start: startDate, end: endDate });
  const { data: exceptions, isError: exceptionsError, error: exceptionsErr, refetch: refetchExceptions } = useSundayExceptions(startDate, endDate);

  // F118: Fetch agenda range for has_second_speech data
  const { data: agendaRange } = useAgendaRange(startDate, endDate);
  const updateAgenda = useUpdateAgendaByDate();

  // F118: Build agenda map for quick lookup
  const agendaMap = useMemo(() => {
    const map = new Map<string, { has_second_speech: boolean }>();
    for (const a of agendaRange ?? []) {
      map.set(a.sunday_date, { has_second_speech: a.has_second_speech });
    }
    return map;
  }, [agendaRange]);

  // Auto-assign sunday types on load
  const autoAssign = useAutoAssignSundayTypes();
  useEffect(() => {
    if (sundays.length > 0) {
      autoAssign.mutate(sundays, { meta: { suppressGlobalError: true } } as any);
    }
  }, [sundays.length]); // Only re-run when sundays count changes

  // Group speeches by sunday
  const speechesBySunday = useMemo(
    () => groupSpeechesBySunday(speeches ?? [], sundays, exceptions ?? []),
    [speeches, sundays, exceptions]
  );

  const speechMap = useMemo(() => {
    const map = new Map<string, typeof speechesBySunday[0]>();
    for (const entry of speechesBySunday) {
      map.set(entry.date, entry);
    }
    return map;
  }, [speechesBySunday]);

  // Build list items with year separators
  const listItems = useMemo(() => buildListItems(sundays), [sundays]);

  // Mutations
  const lazyCreate = useLazyCreateSpeeches();
  const assignSpeaker = useAssignSpeaker();
  const assignTopic = useAssignTopic();
  const changeStatus = useChangeStatus();
  const removeAssignment = useRemoveAssignment();
  const setSundayType = useSetSundayType();
  const removeSundayException = useRemoveSundayException();
  const deleteSpeechesByDate = useDeleteSpeechesByDate();

  // Initial scroll to next sunday
  useEffect(() => {
    if (initialScrollDone || !nextSunday || listItems.length === 0) return;

    const index = listItems.findIndex(
      (item) => item.type === 'sunday' && item.date === nextSunday
    );
    if (index >= 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index, animated: false });
        setInitialScrollDone(true);
      }, 100);
    }
  }, [listItems, nextSunday, initialScrollDone]);

  // ADR-082: Handle expandDate query param from Agenda tab pencil navigation
  useEffect(() => {
    if (!params.expandDate || listItems.length === 0) return;
    const targetDate = params.expandDate;

    // Expand the card and lazy-create speeches
    setExpandedDate(targetDate);
    lazyCreate.mutate(targetDate);

    // Scroll to the target date
    const index = listItems.findIndex(
      (i) => i.type === 'sunday' && i.key === targetDate
    );
    if (index >= 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0,
        });
      }, 400);
    }

    // Clear param to prevent re-triggering on tab re-focus
    router.setParams({ expandDate: undefined });
  }, [params.expandDate, listItems.length]);

  // Toggle expand/collapse
  const handleToggle = useCallback(
    (date: string) => {
      if (expandedDate === date) {
        setExpandedDate(null);
      } else {
        setExpandedDate(date);
        // Lazy-create speeches on first expand
        lazyCreate.mutate(date);
        // Auto-scroll to expanded card (ADR-047)
        const index = listItems.findIndex(
          (i) => i.type === 'sunday' && i.key === date
        );
        if (index >= 0) {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index,
              animated: true,
              viewPosition: 0,
            });
          }, 400);
        }
      }
    },
    [expandedDate, lazyCreate, listItems]
  );

  // Speaker assignment
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

  // Topic assignment
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

  // Status change
  const handleChangeStatus = useCallback(
    (speechId: string, status: SpeechStatus) => {
      changeStatus.mutate({ speechId, status });
    },
    [changeStatus]
  );

  // Remove assignment
  const handleRemoveAssignment = useCallback(
    (speechId: string, speakerName?: string) => {
      removeAssignment.mutate({ speechId, speakerName });
    },
    [removeAssignment]
  );

  // Clear topic assignment
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

  // Sunday type change
  const handleTypeChange = useCallback(
    (date: string, type: SundayExceptionReason, customReason?: string) => {
      setSundayType.mutate({ date, reason: type, custom_reason: customReason });
    },
    [setSundayType]
  );

  // Revert to speeches (remove exception)
  const handleRemoveException = useCallback(
    (date: string) => {
      removeSundayException.mutate(date);
    },
    [removeSundayException]
  );

  // Delete speeches when changing sunday type away from speeches
  const handleDeleteSpeeches = useCallback(
    (date: string) => {
      deleteSpeechesByDate.mutate(date);
    },
    [deleteSpeechesByDate]
  );

  // F118: Handle toggle of 2nd speech for a specific date
  const handleToggleSecondSpeech = useCallback(
    (date: string, enabled: boolean) => {
      if (!enabled) {
        // Check if position 2 has existing assignments
        const sundayData = speechMap.get(date);
        const speech2 = sundayData?.speeches?.find((s) => s.position === 2);
        const hasAssignments = !!(speech2?.speaker_name || speech2?.topic_title);

        if (hasAssignments) {
          // Show confirmation dialog
          Alert.alert(
            t('speeches.secondSpeechToggleConfirmTitle'),
            t('speeches.secondSpeechToggleConfirmMessage'),
            [
              { text: t('common.cancel'), style: 'cancel' },
              {
                text: t('common.confirm'),
                style: 'destructive',
                onPress: () => {
                  // Clear speech position 2 data and disable
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
        // No assignments: toggle immediately
        updateAgenda.mutate({ sundayDate: date, updates: { has_second_speech: false } });
      } else {
        // Enable: no confirmation needed
        updateAgenda.mutate({ sundayDate: date, updates: { has_second_speech: true } });
      }
    },
    [speechMap, t, removeAssignment, updateAgenda]
  );

  // Infinite scroll handlers
  const handleEndReached = useCallback(() => {
    if (hasMoreFuture) {
      loadMoreFuture();
    }
  }, [hasMoreFuture, loadMoreFuture]);

  const handleStartReached = useCallback(() => {
    if (hasMorePast) {
      loadMorePast();
    }
  }, [hasMorePast, loadMorePast]);

  const today = useMemo(() => toISODateString(new Date()), []);

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.type === 'year') {
        return <YearSeparator year={item.year} />;
      }

      const sundayData = speechMap.get(item.date);
      const speechesForDay = sundayData?.speeches ?? [];
      const exception = sundayData?.exception ?? null;
      const isNext = item.date === nextSunday;
      const isPast = item.date < today;
      const isExpanded = expandedDate === item.date;

      // F118: Get has_second_speech from agenda data (default true)
      const agendaData = agendaMap.get(item.date);
      const hasSecondSpeech = agendaData?.has_second_speech ?? true;

      return (
        <SundayCard
          date={item.date}
          speeches={speechesForDay}
          exception={exception}
          isNext={isNext}
          isPast={isPast}
          expanded={isExpanded}
          hasSecondSpeech={hasSecondSpeech}
          onToggle={() => handleToggle(item.date)}
          onStatusPress={(speech) => {
            // Status press handled within SpeechSlot
          }}
          onTypeChange={handleTypeChange}
          onRemoveException={handleRemoveException}
          onDeleteSpeeches={handleDeleteSpeeches}
          typeDisabled={!canWriteSundayType}
        >
          {isExpanded &&
            (!exception || exception.reason === 'speeches') &&
            [1, 2, 3].map((pos) => {
              const speech = speechesForDay.find((s) => s.position === pos) ?? null;
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
                  onToggleSecondSpeech={pos === 2 ? (enabled) => handleToggleSecondSpeech(item.date, enabled) : undefined}
                />
              );
            })}
        </SundayCard>
      );
    },
    [
      speechMap,
      nextSunday,
      today,
      expandedDate,
      agendaMap,
      handleToggle,
      handleTypeChange,
      handleRemoveException,
      handleDeleteSpeeches,
      handleToggleSecondSpeech,
      canWriteSundayType,
      handleChangeStatus,
      handleRemoveAssignment,
      handleClearTopic,
    ]
  );

  if (speechesError || exceptionsError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <QueryErrorView
          error={speechesErr ?? exceptionsErr ?? null}
          onRetry={() => { refetchSpeeches(); refetchExceptions(); }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        ref={flatListRef}
        data={listItems}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        onScrollToIndexFailed={(info) => {
          // Fallback: scroll to nearest
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index: Math.min(info.index, listItems.length - 1),
              animated: false,
            });
          }, 200);
        }}
        ListHeaderComponent={
          hasMorePast ? (
            <Pressable style={styles.loadMore} onPress={handleStartReached}>
              <Text style={[styles.loadMoreText, { color: colors.primary }]}>
                {t('common.loading')}
              </Text>
            </Pressable>
          ) : null
        }
        ListFooterComponent={
          hasMoreFuture ? (
            <View style={styles.footer}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      {/* Speaker Selector Modal */}
      <MemberSelectorModal
        visible={!!speakerModalSpeechId}
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

export default function SpeechesTab() {
  return (
    <ThemedErrorBoundary>
      <SpeechesTabContent />
    </ThemedErrorBoundary>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  yearSeparator: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
  },
  yearText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  loadMore: {
    padding: 16,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
});
