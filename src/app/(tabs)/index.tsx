/**
 * Home tab: shows upcoming sundays, pending assignments, and invite management.
 * Sections are role-gated:
 * - NextSundaysSection: all roles
 * - NextAssignmentsSection: bishopric only (when next 3 fully assigned)
 * - InviteManagementSection: secretary only
 */

import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { NextSundaysSection } from '../../components/NextSundaysSection';
import { NextAssignmentsSection } from '../../components/NextAssignmentsSection';
import { InviteManagementSection } from '../../components/InviteManagementSection';

export default function HomeTab() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
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
});
