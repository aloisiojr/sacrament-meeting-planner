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
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { ThemedErrorBoundary } from '../../components/ErrorBoundary';
import { QueryErrorView } from '../../components/QueryErrorView';
import { useSundayList } from '../../hooks/useSundayList';
import { useSundayExceptions } from '../../hooks/useSundayTypes';
import { useLazyCreateAgenda, isExcludedFromAgenda } from '../../hooks/useAgenda';
import { AgendaForm } from '../../components/AgendaForm';
import { formatDate, toISODateString, zeroPadDay, getMonthAbbr } from '../../lib/dateUtils';
import { getCurrentLanguage, type SupportedLanguage } from '../../i18n';
import type { SundayException } from '../../types/database';

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
  const locale = getCurrentLanguage();

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
  const lazyCreate = useLazyCreateAgenda();

  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  // Build exception map
  const exceptionMap = useMemo(() => {
    const map = new Map<string, SundayException>();
    for (const ex of exceptions ?? []) {
      map.set(ex.date, ex);
    }
    return map;
  }, [exceptions]);

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

  useEffect(() => {
    if (!hasScrolled.current && initialIndex > 0 && listItems.length > 0) {
      hasScrolled.current = true;
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false, viewPosition: 0.5 });
      }, 100);
    }
  }, [initialIndex, listItems.length]);

  const handleToggle = useCallback(
    (date: string) => {
      if (expandedDate === date) {
        setExpandedDate(null);
      } else {
        lazyCreate.mutate(date);
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
    [expandedDate, lazyCreate, listItems]
  );

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

      return (
        <AgendaSundayCard
          date={date}
          exception={exception}
          isExpanded={isExpanded}
          isNext={isNext}
          isPast={isPast}
          locale={locale}
          expandable={!exception || !isExcludedFromAgenda(exception.reason)}
          onToggle={() => handleToggle(date)}
        />
      );
    },
    [expandedDate, nextSunday, locale, handleToggle, colors]
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
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <QueryErrorView
          error={exceptionsErr ?? null}
          onRetry={refetchExceptions}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
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
  locale: SupportedLanguage;
  expandable: boolean;
  onToggle: () => void;
}

function AgendaSundayCard({
  date,
  exception,
  isExpanded,
  isNext,
  isPast,
  locale,
  expandable,
  onToggle,
}: AgendaSundayCardProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [year, month, day] = date.split('-');
  const dayNum = parseInt(day, 10);
  const monthNum = parseInt(month, 10);
  const monthAbbr = getMonthAbbr(monthNum, locale);
  const dayStr = zeroPadDay(dayNum);

  const exceptionLabel = (exception && exception.reason !== 'speeches')
    ? t(`sundayExceptions.${exception.reason}`, exception.reason)
    : null;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        isNext && { borderColor: colors.primary, borderWidth: 2 },
        isPast && !isExpanded && { opacity: 0.6 },
      ]}
    >
      <Pressable
        style={styles.cardHeader}
        onPress={expandable ? onToggle : undefined}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
      >
        <View style={[styles.dateBlock, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.dateDay, { color: colors.text }]}>{dayStr}</Text>
          <Text style={[styles.dateMonth, { color: colors.textSecondary }]}>
            {monthAbbr}
          </Text>
        </View>

        <View style={styles.cardCenter}>
          {exceptionLabel && (
            <Text
              style={[styles.exceptionText, { color: colors.warning }]}
              numberOfLines={1}
            >
              {exceptionLabel}
            </Text>
          )}
        </View>

        {expandable && (
          <Text style={[styles.chevron, { color: colors.textSecondary }]}>
            {isExpanded ? '\u25B2' : '\u25BC'}
          </Text>
        )}
      </Pressable>

      {expandable && isExpanded && (
        <View style={styles.expandedContent}>
          <ThemedErrorBoundary>
            <AgendaForm
              sundayDate={date}
              exceptionReason={exception?.reason ?? null}
              customReason={exception?.custom_reason ?? null}
            />
          </ThemedErrorBoundary>
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
  card: {
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 12,
    marginVertical: 4,
    overflow: 'hidden',
  },
  cardHeader: {
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
  cardCenter: {
    flex: 1,
    marginHorizontal: 12,
  },
  exceptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 12,
  },
  expandedContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
});
