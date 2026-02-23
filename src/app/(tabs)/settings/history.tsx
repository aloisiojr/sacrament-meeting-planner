import { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SearchInput } from '../../../components/SearchInput';
import { useActivityLog, useActivityLogSearch } from '../../../hooks/useActivityLog';
import { formatLogDescription } from '../../../lib/activityLog';
import type { ActivityLog } from '../../../types/database';

/**
 * Format a datetime string to "YYYY-MM-DD HH:MM" in ward timezone.
 * Falls back to a basic formatting if timezone conversion isn't available.
 */
function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  } catch {
    return isoString;
  }
}

function ActivityLogEntry({
  item,
  colors,
}: {
  item: ActivityLog;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const { t } = useTranslation();
  return (
    <View style={[styles.entry, { backgroundColor: colors.card }]}>
      <View style={styles.entryHeader}>
        <Text style={[styles.entryDate, { color: colors.textSecondary }]}>
          {formatDateTime(item.created_at)}
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
  const { searchText, debouncedSearch, updateSearch } = useActivityLogSearch();

  const {
    entries,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
  } = useActivityLog({ search: debouncedSearch });

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: ActivityLog }) => (
      <ActivityLogEntry item={item} colors={colors} />
    ),
    [colors]
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
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            {t('common.error')}
          </Text>
        </View>
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
          contentContainerStyle={styles.listContent}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator
                style={styles.footerLoader}
                color={colors.primary}
              />
            ) : null
          }
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
