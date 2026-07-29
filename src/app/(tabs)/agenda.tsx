/**
 * Agenda tab: Infinite scroll list of sundays with agenda forms.
 * Shows all sundays including Gen Conf / Stake Conf (non-expandable).
 * Includes Testimony Meeting, Ward Conference, Special Program.
 * 12 months past + 12 months future, +6 on scroll.
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useOnlineStatus } from '../../contexts/OnlineStatusContext';
import { ThemedErrorBoundary } from '../../components/ErrorBoundary';
import { QueryErrorView } from '../../components/QueryErrorView';
import { SundayTypeDropdown } from '../../components/SundayCard';
import { useSundayList } from '../../hooks/useSundayList';
import { useSundayExceptions, useSetSundayType, useRemoveSundayException, SUNDAY_TYPE_SPEECHES } from '../../hooks/useSundayTypes';
import { useSpeeches, useDeleteSpeechesByDate, useWardManagePrayers } from '../../hooks/useSpeeches';
import { useLazyCreateAgenda, isExcludedFromAgenda, useAgendaRange } from '../../hooks/useAgenda';
import { AgendaForm } from '../../components/AgendaForm';
import { UnifiedSundayCard } from '../../components/UnifiedSundayCard';
import { buildUnifiedCardData } from '../../lib/unifiedCard';
import { PlayIcon } from '../../components/icons';
import type { SundayException, SundayExceptionReason, Speech, SundayAgenda } from '../../types/database';

// --- Types ---

interface AgendaSunday {
  date: string;
  exception: SundayException | null;
  year: number;
}

type ListItem =
  | { type: 'year'; year: number }
  | { type: 'sunday'; data: AgendaSunday };

// --- Component ---

function AgendaTabContent() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ expandDate?: string }>();
  const router = useRouter();

  const {
    sundays,
    startDate,
    endDate,
    loadMoreFuture,
    loadMorePast,
    hasMoreFuture,
    hasMorePast,
    nextSunday,
  } = useSundayList();

  const { data: exceptions, isError: exceptionsError, error: exceptionsErr, refetch: refetchExceptions } = useSundayExceptions(startDate, endDate);
  const { data: allSpeeches } = useSpeeches({ start: startDate, end: endDate });
  const { data: allAgendas } = useAgendaRange(startDate, endDate);
  const lazyCreate = useLazyCreateAgenda();
  const setSundayType = useSetSundayType();
  const removeSundayException = useRemoveSundayException();
  const deleteSpeechesByDate = useDeleteSpeechesByDate();
  const { managePrayers } = useWardManagePrayers();
  const { hasPermission } = useAuth();
  const isOnline = useOnlineStatus();
  const canEditType = hasPermission('sunday_type:write');

  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  // Build exception map
  const exceptionMap = useMemo(() => {
    const map = new Map<string, SundayException>();
    for (const ex of exceptions ?? []) {
      map.set(ex.date, ex);
    }
    return map;
  }, [exceptions]);

  // Build speech map by sunday date
  const speechMap = useMemo(() => {
    const map = new Map<string, typeof allSpeeches>();
    for (const speech of allSpeeches ?? []) {
      const existing = map.get(speech.sunday_date) ?? [];
      existing.push(speech);
      map.set(speech.sunday_date, existing);
    }
    return map;
  }, [allSpeeches]);

  // Build agenda map by sunday date
  const agendaMap = useMemo(() => {
    const map = new Map<string, SundayAgenda>();
    for (const agenda of allAgendas ?? []) {
      map.set(agenda.sunday_date, agenda);
    }
    return map;
  }, [allAgendas]);

  // Build sunday list (all sundays, including Gen Conf / Stake Conf)
  const filteredSundays = useMemo(() => {
    return sundays.map((date) => {
      const [yearStr] = date.split('-');
      return {
        date,
        exception: exceptionMap.get(date) ?? null,
        year: parseInt(yearStr, 10),
      };
    });
  }, [sundays, exceptionMap]);

  // Build list items with year separators
  const listItems = useMemo(() => {
    const items: ListItem[] = [];
    let lastYear = -1;
    for (const sunday of filteredSundays) {
      if (sunday.year !== lastYear) {
        items.push({ type: 'year', year: sunday.year });
        lastYear = sunday.year;
      }
      items.push({ type: 'sunday', data: sunday });
    }
    return items;
  }, [filteredSundays]);

  // Find initial scroll index (next sunday)
  const initialIndex = useMemo(() => {
    if (!nextSunday) return 0;
    return listItems.findIndex(
      (item) => item.type === 'sunday' && item.data.date === nextSunday
    );
  }, [listItems, nextSunday]);

  const flatListRef = useRef<FlatList>(null);
  const hasScrolled = useRef(false);
  const scrollOffset = useRef(0);

  useEffect(() => {
    if (!hasScrolled.current && initialIndex > 0 && listItems.length > 0) {
      hasScrolled.current = true;
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false, viewPosition: 0.5 });
      }, 100);
    }
  }, [initialIndex, listItems.length]);

  // ADR-082: Handle expandDate query param from Presentation pencil / Home preview card pencil
  useEffect(() => {
    if (!params.expandDate || listItems.length === 0) return;
    const targetDate = params.expandDate;

    // Expand the card and lazy-create agenda
    setExpandedDate(targetDate);
    lazyCreate.mutate(targetDate);

    // Scroll to the target date
    const index = listItems.findIndex(
      (i) => i.type === 'sunday' && i.data.date === targetDate
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
    // Intentionally keyed off the expandDate param (and list readiness via length);
    // lazyCreate/router are stable and listItems is read fresh inside the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.expandDate, listItems.length]);

  // Auto-collapse non-next-Sunday card when going offline
  useEffect(() => {
    if (!isOnline && expandedDate && expandedDate !== nextSunday) {
      setExpandedDate(null);
    }
  }, [isOnline, expandedDate, nextSunday]);

  const handleToggle = useCallback(
    (date: string) => {
      if (expandedDate === date) {
        setExpandedDate(null);
      } else {
        if (isOnline) {
          lazyCreate.mutate(date);
        }
        setExpandedDate(date);
        // Auto-scroll to expanded card (ADR-047)
        const index = listItems.findIndex(
          (i) => i.type === 'sunday' && (i as { type: 'sunday'; data: AgendaSunday }).data.date === date
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
    [expandedDate, isOnline, lazyCreate, listItems]
  );

  const handleFieldFocus = useCallback((touchY: number) => {
    const screenHeight = Dimensions.get('window').height;
    const targetY = screenHeight / 5;
    const delta = touchY - targetY;
    if (delta > 30) {
      flatListRef.current?.scrollToOffset({
        offset: Math.max(0, scrollOffset.current + delta),
        animated: true,
      });
    }
  }, []);

  const getItemKey = useCallback((item: ListItem, index: number): string => {
    if (item.type === 'year') return `year-${item.year}`;
    return `sun-${item.data.date}`;
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.type === 'year') {
        return (
          <View style={[styles.yearSeparator, { borderBottomColor: colors.divider }]}>
            <Text style={[styles.yearText, { color: colors.textSecondary }]}>
              {item.year}
            </Text>
          </View>
        );
      }

      const { date, exception } = item.data;
      const isExpanded = expandedDate === date;
      const isNext = date === nextSunday;
      const today = new Date();
      const sundayDate = new Date(date + 'T12:00:00');
      const isPast = sundayDate < today;

      // All Sundays expand (no-sacrament ones open to the type dropdown so the type can be changed).
      const baseExpandable = true;
      const isExpandable = baseExpandable && (isOnline || date === nextSunday);

      return (
        <AgendaSundayCard
          date={date}
          exception={exception}
          isExpanded={isExpanded}
          isNext={isNext}
          isPast={isPast}
          expandable={isExpandable}
          isOffline={!isOnline}
          onToggle={() => handleToggle(date)}
          speeches={speechMap.get(date) ?? []}
          agenda={agendaMap.get(date) ?? null}
          managePrayers={managePrayers}
          typeDisabled={!canEditType}
          onTypeChange={(d, type, customReason) => setSundayType.mutate({ date: d, reason: type, custom_reason: customReason })}
          onRemoveException={(d) => removeSundayException.mutate(d)}
          onDeleteSpeeches={(d) => deleteSpeechesByDate.mutate({ sundayDate: d })}
          onFieldFocus={handleFieldFocus}
        />
      );
    },
    [expandedDate, nextSunday, handleToggle, handleFieldFocus, isOnline, colors, speechMap, agendaMap, managePrayers, canEditType, setSundayType, removeSundayException, deleteSpeechesByDate]
  );

  const onScrollToIndexFailed = useCallback(
    (info: { index: number; highestMeasuredFrameIndex: number; averageItemLength: number }) => {
      const offset = info.averageItemLength * info.index;
      flatListRef.current?.scrollToOffset({ offset, animated: false });
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: Math.min(info.index, listItems.length - 1),
          animated: false,
          viewPosition: 0.5,
        });
      }, 100);
    },
    [listItems.length]
  );

  if (exceptionsError) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
        <QueryErrorView
          error={exceptionsErr ?? null}
          onRetry={refetchExceptions}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        ref={flatListRef}
        data={listItems}
        keyExtractor={getItemKey}
        renderItem={renderItem}
        onEndReached={hasMoreFuture ? loadMoreFuture : undefined}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          hasMorePast ? (
            <Pressable
              style={[styles.loadMore, { borderColor: colors.border }]}
              onPress={loadMorePast}
            >
              <Text style={{ color: colors.primary }}>
                {t('common.loading')}
              </Text>
            </Pressable>
          ) : null
        }
        onScrollToIndexFailed={onScrollToIndexFailed}
        onScroll={(e) => { scrollOffset.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

// --- AgendaSundayCard ---

interface AgendaSundayCardProps {
  date: string;
  exception: SundayException | null;
  isExpanded: boolean;
  isNext: boolean;
  isPast: boolean;
  expandable: boolean;
  isOffline: boolean;
  onToggle: () => void;
  speeches: Speech[];
  agenda: SundayAgenda | null;
  managePrayers: boolean;
  typeDisabled: boolean;
  onTypeChange: (date: string, type: SundayExceptionReason, customReason?: string) => void;
  onRemoveException: (date: string) => void;
  onDeleteSpeeches: (date: string) => void;
  onFieldFocus: (touchY: number) => void;
}

function AgendaSundayCard({
  date,
  exception,
  isExpanded,
  isNext,
  isPast,
  expandable,
  isOffline,
  onToggle,
  speeches,
  agenda,
  managePrayers,
  typeDisabled,
  onTypeChange,
  onRemoveException,
  onDeleteSpeeches,
  onFieldFocus,
}: AgendaSundayCardProps) {
  const { colors } = useTheme();
  const router = useRouter();

  const currentType = exception?.reason ?? SUNDAY_TYPE_SPEECHES;
  // No-sacrament Sundays (gen/stake conf, etc.) still expand — but only to the type dropdown,
  // so the type can be changed; the welcome/hymns AgendaForm + Play don't apply to them.
  const excluded = !!exception && isExcludedFromAgenda(exception.reason);

  const cardData = useMemo(
    () =>
      buildUnifiedCardData({
        agenda,
        speeches,
        exceptionReason: exception?.reason ?? null,
        managePrayers,
      }),
    [agenda, speeches, exception?.reason, managePrayers]
  );

  const handlePressStatus = useCallback(() => {
    if (expandable) onToggle();
  }, [expandable, onToggle]);

  const handlePressSpeakers = useCallback(
    (d: string) => {
      router.push({ pathname: '/speeches/[date]', params: { date: d } });
    },
    [router]
  );

  const handleTypeSelect = useCallback(
    (type: SundayExceptionReason, customReason?: string) => {
      onTypeChange(date, type, customReason);
    },
    [date, onTypeChange]
  );

  const handleRevertToSpeeches = useCallback(() => {
    onRemoveException(date);
  }, [date, onRemoveException]);

  return (
    <View style={isPast && !isExpanded ? styles.pastDim : undefined}>
      <UnifiedSundayCard
        date={date}
        highlighted={isNext}
        exceptionReason={exception?.reason ?? null}
        customReason={exception?.custom_reason ?? null}
        roles={cardData.roles}
        speakers={cardData.speakers}
        prayers={cardData.prayers}
        hymns={cardData.hymns}
        managePrayers={managePrayers}
        nameRows={cardData.nameRows}
        onPressStatus={handlePressStatus}
        onPressSpeakers={handlePressSpeakers}
        testID={`agenda-card-${date}`}
      />

      {expandable && isExpanded && (
        <View
          style={[
            styles.expandedCard,
            { backgroundColor: colors.card, borderColor: isNext ? colors.primary : colors.border },
            isNext && { borderWidth: 2 },
          ]}
        >
          {!excluded && (
            <View style={styles.expandedHeader}>
              <Pressable
                testID={`agenda-play-${date}`}
                onPress={() => router.push({ pathname: '/presentation', params: { date } })}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Open presentation"
                style={[styles.playButton, { backgroundColor: colors.primary }]}
              >
                <PlayIcon size={20} color={colors.onPrimary} />
              </Pressable>
            </View>
          )}
          <SundayTypeDropdown
            currentType={currentType}
            onSelect={handleTypeSelect}
            onRevertToSpeeches={handleRevertToSpeeches}
            disabled={typeDisabled || isOffline}
            speeches={speeches}
            date={date}
            onDeleteSpeeches={onDeleteSpeeches}
            managePrayers={managePrayers}
          />
          {!excluded && (
            <ThemedErrorBoundary>
              <AgendaForm
                sundayDate={date}
                exceptionReason={exception?.reason ?? null}
                customReason={exception?.custom_reason ?? null}
                disabled={isOffline}
                onFieldFocus={onFieldFocus}
              />
            </ThemedErrorBoundary>
          )}
        </View>
      )}
    </View>
  );
}

export default function AgendaTab() {
  return (
    <ThemedErrorBoundary>
      <AgendaTabContent />
    </ThemedErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  yearSeparator: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  yearText: {
    fontSize: 14,
    fontWeight: '700',
  },
  loadMore: {
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  pastDim: {
    opacity: 0.6,
  },
  expandedCard: {
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 12,
    marginTop: -4,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingBottom: 12,
    overflow: 'hidden',
  },
  expandedHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 8,
    paddingBottom: 4,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
