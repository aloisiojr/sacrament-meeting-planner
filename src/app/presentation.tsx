/**
 * PresentationMode: Full-screen modal for live meeting use.
 * Normal meeting: 4 accordion cards. Special meeting: 3 cards.
 * All fields read-only. Welcome section expanded by default.
 * Close button in header returns to previous screen.
 */

import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme, type ThemeColors } from '../contexts/ThemeContext';
import {
  usePresentationData,
  getTodaySundayDate,
  buildPresentationCards,
} from '../hooks/usePresentationMode';
import { AccordionCard } from '../components/AccordionCard';
import type { PresentationField } from '../hooks/usePresentationMode';

export default function PresentationScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();

  const sundayDate = getTodaySundayDate();
  const {
    agenda,
    speeches,
    exception,
    isLoading,
    hymnLookup,
  } = usePresentationData(sundayDate);

  const tFn = useCallback(
    (key: string, fallback?: string) => t(key, fallback ?? key) as string,
    [t]
  );

  const cards = useMemo(
    () => buildPresentationCards(agenda ?? null, speeches, exception, hymnLookup, tFn),
    [agenda, speeches, exception, hymnLookup, tFn]
  );

  const accordionCards = useMemo(
    () =>
      cards.map((card) => ({
        title: card.title,
        content: (
          <View>
            {card.fields.map((field, idx) => (
              <PresentationFieldRow key={idx} field={field} colors={colors} />
            ))}
          </View>
        ),
      })),
    [cards, colors]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('home.startMeeting')}
        </Text>
        <Pressable
          style={[styles.closeButton, { backgroundColor: colors.surfaceVariant }]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        >
          <Text style={[styles.closeText, { color: colors.text }]}>
            {'\u2715'}
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : accordionCards.length === 0 ? (
        <View style={styles.loading}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t('common.noResults')}
          </Text>
        </View>
      ) : (
        <AccordionCard cards={accordionCards} initialExpanded={0} />
      )}
    </SafeAreaView>
  );
}

// --- PresentationFieldRow ---

function PresentationFieldRow({
  field,
  colors,
}: {
  field: PresentationField;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.fieldRow}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
        {field.label}
      </Text>
      <Text
        style={[
          styles.fieldValue,
          { color: colors.text },
          field.type === 'hymn' && styles.hymnValue,
          !field.value && { color: colors.textTertiary },
        ]}
        numberOfLines={field.type === 'multiline' ? undefined : 2}
      >
        {field.value || '---'}
      </Text>
    </View>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 18,
    fontWeight: '600',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  fieldRow: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  fieldValue: {
    fontSize: 16,
  },
  hymnValue: {
    fontWeight: '600',
  },
});
