/**
 * Home tab: shows upcoming sundays, pending assignments, and invite management.
 * On Sundays, shows "Start Sacrament Meeting" button at the top (all roles).
 * Sections are role-gated:
 * - NextSundaysSection: all roles
 * - NextAssignmentsSection: bishopric only (when next 3 fully assigned)
 * - InviteManagementSection: secretary only
 */

import { useMemo } from 'react';
import { ScrollView, StyleSheet, View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { isTodaySunday } from '../../hooks/usePresentationMode';
import { NextSundaysSection } from '../../components/NextSundaysSection';
import { NextAssignmentsSection } from '../../components/NextAssignmentsSection';
import { InviteManagementSection } from '../../components/InviteManagementSection';

export default function HomeTab() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const showMeetingButton = useMemo(() => isTodaySunday(), []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {showMeetingButton && (
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('home.meetingAgendaTitle')}
            </Text>
            <Pressable
              style={[styles.meetingButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/presentation')}
              accessibilityRole="button"
            >
              <Text style={[styles.meetingButtonText, { color: colors.onPrimary }]}>
                {t('home.startMeeting')}
              </Text>
            </Pressable>
          </View>
        )}
        <NextSundaysSection />
        <NextAssignmentsSection />
        <InviteManagementSection />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  meetingButton: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  meetingButtonText: {
    fontSize: 17,
    fontWeight: '700',
  },
});
