import { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useOnlineStatus } from '../../../contexts/OnlineStatusContext';
import { supabase } from '../../../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SearchInput } from '../../../components/SearchInput';
import { QueryErrorView } from '../../../components/QueryErrorView';
import { useActivityLog, useActivityLogSearch } from '../../../hooks/useActivityLog';
import { formatLogDescription } from '../../../lib/activityLog';
import type { ActivityLog } from '../../../types/database';

/**
 * Format a datetime string to "YYYY-MM-DD HH:MM" in the ward's timezone (EST-14).
 * `wards.timezone` is editable in settings; formatting with the device clock showed
 * another ward's "now" to anyone travelling. Without a loaded timezone, fall back to
 * the device's local time rather than hiding the entry.
 */
export function formatDateTime(isoString: string, timeZone?: string | null): string {
  try {
    const date = new Date(isoString);
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone ?? undefined,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
  } catch {
    return isoString;
  }
}

function ActivityLogEntry({
  item,
  colors,
  timeZone,
}: {
  item: ActivityLog;
  colors: ReturnType<typeof useTheme>['colors'];
  timeZone?: string | null;
}) {
  const { t } = useTranslation();
  return (
    <View style={[styles.entry, { backgroundColor: colors.card }]}>
      <View style={styles.entryHeader}>
        <Text style={[styles.entryDate, { color: colors.textSecondary }]}>
          {formatDateTime(item.created_at, timeZone)}
        </Text>
        <Text style={[styles.entryEmail, { color: colors.textSecondary }]}>
          {item.user_name || item.user_email}
        </Text>
      </View>
      <Text style={[styles.entryDescription, { color: colors.text }]}>
        {formatLogDescription(item.description, t)}
      </Text>
    </View>
  );
}

export default function ActivityLogScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { wardId } = useAuth();
  const isOnline = useOnlineStatus();
  const { searchText, debouncedSearch, updateSearch } = useActivityLogSearch();

  // Ward timezone for entry timestamps — same queryKey as settings/timezone.tsx (EST-14).
  const { data: wardTimezone } = useQuery({
    queryKey: ['ward-timezone', wardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wards')
        .select('timezone')
        .eq('id', wardId)
        .maybeSingle();
      if (error) throw error;
      return data?.timezone ?? null;
    },
    enabled: !!wardId,
  });

  const {
    entries,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    refetch,
    isRefetching,
  } = useActivityLog({ search: debouncedSearch });

  // EST-14: returning to this screen shows what happened since, not the snapshot from
  // the first mount. Pull-to-refresh below covers the explicit gesture.
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: ActivityLog }) => (
      <ActivityLogEntry item={item} colors={colors} timeZone={wardTimezone} />
    ),
    [colors, wardTimezone]
  );

  const keyExtractor = useCallback((item: ActivityLog) => item.id, []);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with back button */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={12}>
          <Text style={[styles.backButton, { color: colors.primary }]}>
            {t('common.back')}
          </Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('activityLog.title')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* EST-14: offline banner reads the real connection state */}
      {!isOnline && (
        <View
          testID="history-offline-banner"
          style={[styles.offlineBanner, { backgroundColor: colors.card }]}
        >
          <Text style={[styles.offlineBannerText, { color: colors.textSecondary }]}>
            {t('common.offlineMessage')}
          </Text>
        </View>
      )}

      {/* Search field */}
      <View style={styles.searchContainer}>
        <SearchInput
          value={searchText}
          onChangeText={updateSearch}
          placeholder={t('common.search')}
        />
        <Pressable onPress={() => updateSearch('')} accessibilityRole="button">
          <Text style={[styles.closeButtonText, { color: colors.primary }]}>
            {t('common.close')}
          </Text>
        </Pressable>
      </View>

      {isLoading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {error && (
        <QueryErrorView error={error} onRetry={() => void refetch()} />
      )}

      {!isLoading && !error && entries.length === 0 && (
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {debouncedSearch
              ? t('common.noResults')
              : t('activityLog.noActivity')}
          </Text>
        </View>
      )}

      {!isLoading && !error && entries.length > 0 && (
        <FlatList
          data={entries}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={styles.listContent}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator
                style={styles.footerLoader}
                color={colors.primary}
              />
            ) : null
          }
          keyboardShouldPersistTaps="handled"
        />
      )}
    </SafeAreaView>
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
  },
  backButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 50,
  },
  offlineBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 10,
    padding: 12,
  },
  offlineBannerText: {
    fontSize: 13,
    lineHeight: 18,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  centered: {
    padding: 40,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
  },
  emptyText: {
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  entry: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  entryDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  entryEmail: {
    fontSize: 12,
    fontWeight: '500',
  },
  entryDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  footerLoader: {
    paddingVertical: 16,
  },
});
