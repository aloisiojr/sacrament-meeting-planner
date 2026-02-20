/**
 * Home tab: shows upcoming sundays, pending assignments, and invite management.
 * Shows "Start Sacrament Meeting" button at the top (all roles, all days).
 * Sections are role-gated:
 * - NextSundaysSection: all roles
 * - NextAssignmentsSection: bishopric only (when next 3 fully assigned)
 * - InviteManagementSection: secretary only
 */

import { ScrollView, StyleSheet, View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedErrorBoundary } from '../../components/ErrorBoundary';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { NextSundaysSection } from '../../components/NextSundaysSection';
import { NextAssignmentsSection } from '../../components/NextAssignmentsSection';
import { InviteManagementSection } from '../../components/InviteManagementSection';

function HomeTabContent() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
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
        <NextSundaysSection />
        <NextAssignmentsSection />
        <InviteManagementSection />
      </ScrollView>
    </SafeAreaView>
  );
}

export default function HomeTab() {
  return (
    <ThemedErrorBoundary>
      <HomeTabContent />
    </ThemedErrorBoundary>
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
