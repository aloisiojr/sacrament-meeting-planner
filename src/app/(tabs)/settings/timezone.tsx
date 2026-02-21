import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { SearchInput } from '../../../components/SearchInput';
import { supabase } from '../../../lib/supabase';
import { logAction } from '../../../lib/activityLog';

/**
 * Common IANA timezone list covering major regions.
 * Sorted alphabetically for easy scanning.
 */
const TIMEZONES: string[] = [
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Africa/Lagos',
  'Africa/Nairobi',
  'America/Anchorage',
  'America/Argentina/Buenos_Aires',
  'America/Bogota',
  'America/Chicago',
  'America/Denver',
  'America/Edmonton',
  'America/Halifax',
  'America/Lima',
  'America/Los_Angeles',
  'America/Manaus',
  'America/Mexico_City',
  'America/Montevideo',
  'America/New_York',
  'America/Phoenix',
  'America/Recife',
  'America/Santiago',
  'America/Sao_Paulo',
  'America/St_Johns',
  'America/Toronto',
  'America/Vancouver',
  'Asia/Almaty',
  'Asia/Bangkok',
  'Asia/Colombo',
  'Asia/Dhaka',
  'Asia/Dubai',
  'Asia/Hong_Kong',
  'Asia/Jakarta',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Manila',
  'Asia/Seoul',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Taipei',
  'Asia/Tokyo',
  'Atlantic/Reykjavik',
  'Australia/Adelaide',
  'Australia/Brisbane',
  'Australia/Melbourne',
  'Australia/Perth',
  'Australia/Sydney',
  'Europe/Amsterdam',
  'Europe/Berlin',
  'Europe/Brussels',
  'Europe/Istanbul',
  'Europe/Lisbon',
  'Europe/London',
  'Europe/Madrid',
  'Europe/Moscow',
  'Europe/Paris',
  'Europe/Rome',
  'Europe/Stockholm',
  'Europe/Warsaw',
  'Europe/Zurich',
  'Pacific/Auckland',
  'Pacific/Fiji',
  'Pacific/Honolulu',
];

export default function TimezoneScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { wardId, user, userName } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  // Fetch current ward timezone
  const { data: currentTimezone } = useQuery({
    queryKey: ['ward-timezone', wardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wards')
        .select('timezone')
        .eq('id', wardId)
        .single();
      if (error) throw error;
      return data?.timezone ?? 'America/Sao_Paulo';
    },
  });

  const saveTimezoneMutation = useMutation({
    mutationFn: async (timezone: string) => {
      const { error } = await supabase
        .from('wards')
        .update({ timezone })
        .eq('id', wardId);
      if (error) throw error;
    },
    onSuccess: (_data, timezone) => {
      queryClient.invalidateQueries({ queryKey: ['ward-timezone', wardId] });
      if (user) {
        logAction(
          wardId,
          user.id,
          user.email ?? '',
          'settings:timezone',
          `Timezone changed to ${timezone}`,
          userName
        );
      }
      Alert.alert(t('common.success'), t('timezoneSelector.saved'));
      router.back();
    },
    onError: () => {
      Alert.alert(t('common.error'), t('timezoneSelector.saveFailed'));
    },
  });

  const filteredTimezones = useMemo(() => {
    if (!search.trim()) return TIMEZONES;
    const query = search.toLowerCase();
    return TIMEZONES.filter((tz) => tz.toLowerCase().includes(query));
  }, [search]);

  const handleSelect = useCallback(
    (timezone: string) => {
      if (timezone === currentTimezone) {
        router.back();
        return;
      }
      saveTimezoneMutation.mutate(timezone);
    },
    [currentTimezone, saveTimezoneMutation, router]
  );

  const renderItem = useCallback(
    ({ item }: { item: string }) => {
      const isSelected = item === currentTimezone;
      return (
        <Pressable
          style={[
            styles.item,
            { borderBottomColor: colors.divider },
            isSelected && { backgroundColor: colors.surfaceVariant },
          ]}
          onPress={() => handleSelect(item)}
          accessibilityRole="radio"
          accessibilityState={{ selected: isSelected }}
        >
          <Text style={[styles.itemText, { color: colors.text }]}>{item}</Text>
          {isSelected && (
            <Text style={[styles.checkmark, { color: colors.primary }]}>
              {'\u2713'}
            </Text>
          )}
        </Pressable>
      );
    },
    [currentTimezone, colors, handleSelect]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={12}>
          <Text style={[styles.backButton, { color: colors.primary }]}>
            {t('common.back')}
          </Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>
          {t('timezoneSelector.title')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {currentTimezone && (
        <View style={[styles.currentSection, { backgroundColor: colors.card }]}>
          <Text style={[styles.currentLabel, { color: colors.textSecondary }]}>
            {t('timezoneSelector.current')}
          </Text>
          <Text style={[styles.currentValue, { color: colors.text }]}>
            {currentTimezone}
          </Text>
        </View>
      )}

      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <SearchInput
          value={search}
          onChangeText={setSearch}
          placeholder={t('timezoneSelector.search')}
        />
        <Pressable onPress={() => setSearch('')} accessibilityRole="button">
          <Text style={[styles.closeButtonText, { color: colors.primary }]}>
            {t('common.close')}
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={filteredTimezones}
        keyExtractor={(item) => item}
        renderItem={renderItem}
        style={[styles.list, { backgroundColor: colors.card }]}
        keyboardShouldPersistTaps="handled"
      />
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
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 50,
  },
  currentSection: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
  },
  currentLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  currentValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  list: {
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemText: {
    fontSize: 15,
    flex: 1,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
});
