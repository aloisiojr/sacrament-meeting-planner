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
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SundayCard } from '../../components/SundayCard';
import { SpeechSlot } from '../../components/SpeechSlot';
import { MemberSelectorModal } from '../../components/MemberSelectorModal';
import { TopicSelectorModal } from '../../components/TopicSelectorModal';
import { useSundayList } from '../../hooks/useSundayList';
import {
  useSpeeches,
  useLazyCreateSpeeches,
  useAssignSpeaker,
  useAssignTopic,
  useChangeStatus,
  useRemoveAssignment,
  groupSpeechesBySunday,
} from '../../hooks/useSpeeches';
import { useSundayExceptions, useSetSundayType, useAutoAssignSundayTypes } from '../../hooks/useSundayTypes';
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

export default function SpeechesTab() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { hasPermission, role } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [speakerModalSpeechId, setSpeakerModalSpeechId] = useState<string | null>(null);
  const [topicModalSpeechId, setTopicModalSpeechId] = useState<string | null>(null);
  const [initialScrollDone, setInitialScrollDone] = useState(false);

  const sundayList = useSundayList();
  const { sundays, startDate, endDate, nextSunday, loadMoreFuture, loadMorePast, hasMoreFuture, hasMorePast } = sundayList;

  const isObserver = role === 'observer';
  const canWriteSundayType = hasPermission('sunday_type:write');

  // Fetch speeches and exceptions for the visible range
  const { data: speeches } = useSpeeches({ start: startDate, end: endDate });
  const { data: exceptions } = useSundayExceptions(startDate, endDate);

  // Auto-assign sunday types on load
  const autoAssign = useAutoAssignSundayTypes();
  useEffect(() => {
    if (sundays.length > 0) {
      autoAssign.mutate(sundays);
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

  // Toggle expand/collapse
  const handleToggle = useCallback(
    (date: string) => {
      if (expandedDate === date) {
        setExpandedDate(null);
      } else {
        setExpandedDate(date);
        // Lazy-create speeches on first expand
        lazyCreate.mutate(date);
      }
    },
    [expandedDate, lazyCreate]
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

  // Sunday type change
  const handleTypeChange = useCallback(
    (date: string, type: SundayExceptionReason) => {
      setSundayType.mutate({ date, reason: type });
    },
    [setSundayType]
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
        return (
          <View style={styles.yearSeparator}>
            <Text style={[styles.yearText, { color: colors.textSecondary }]}>
              {item.year}
            </Text>
          </View>
        );
      }

      const sundayData = speechMap.get(item.date);
      const speechesForDay = sundayData?.speeches ?? [];
      const exception = sundayData?.exception ?? null;
      const isNext = item.date === nextSunday;
      const isPast = item.date < today;
      const isExpanded = expandedDate === item.date;

      return (
        <SundayCard
          date={item.date}
          speeches={speechesForDay}
          exception={exception}
          isNext={isNext}
          isPast={isPast}
          expanded={isExpanded}
          onToggle={() => handleToggle(item.date)}
          onStatusPress={(speech) => {
            // Status press handled within SpeechSlot
          }}
          onTypeChange={handleTypeChange}
          typeDisabled={!canWriteSundayType}
        >
          {isExpanded &&
            [1, 2, 3].map((pos) => {
              const speech = speechesForDay.find((s) => s.position === pos) ?? null;
              return (
                <SpeechSlot
                  key={pos}
                  speech={speech}
                  position={pos}
                  onChangeStatus={handleChangeStatus}
                  onRemoveAssignment={handleRemoveAssignment}
                  onOpenSpeakerSelector={(id) => setSpeakerModalSpeechId(id)}
                  onOpenTopicSelector={(id) => setTopicModalSpeechId(id)}
                />
              );
            })}
        </SundayCard>
      );
    },
    [
      colors,
      speechMap,
      nextSunday,
      today,
      expandedDate,
      handleToggle,
      handleTypeChange,
      canWriteSundayType,
      handleChangeStatus,
      handleRemoveAssignment,
    ]
  );

  const getItemLayout = useCallback(
    (_data: unknown, index: number) => ({
      length: 70, // Approximate height of a collapsed SundayCard
      offset: 70 * index,
      index,
    }),
    []
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        ref={flatListRef}
        data={listItems}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
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
