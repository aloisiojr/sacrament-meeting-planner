/**
 * PresentationMode: Full-screen modal for live meeting use.
 * Normal meeting: 4 accordion cards. Special meeting: 3 cards.
 * All fields read-only. Welcome section expanded by default.
 * Close button and font size toggle in header.
 */

import React, { useMemo, useCallback, useState } from 'react';
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
import { formatFullDate } from '../lib/dateUtils';
import { getCurrentLanguage } from '../i18n';
import type { PresentationField } from '../hooks/usePresentationMode';

const FONT_SIZES = {
  normal: { fieldLabel: 13, fieldValue: 17, cardTitle: 17, headerTitle: 19 },
  large: { fieldLabel: 18, fieldValue: 26, cardTitle: 22, headerTitle: 24 },
};

export default function PresentationScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();

  const [fontSizeMode, setFontSizeMode] = useState<'normal' | 'large'>('normal');
  const fontSizes = FONT_SIZES[fontSizeMode];

  const sundayDate = getTodaySundayDate();
  const dateLabel = useMemo(
    () => formatFullDate(sundayDate, getCurrentLanguage()),
    [sundayDate]
  );
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
              <PresentationFieldRow
                key={idx}
                field={field}
                colors={colors}
                fontSizes={{ label: fontSizes.fieldLabel, value: fontSizes.fieldValue }}
              />
            ))}
          </View>
        ),
      })),
    [cards, colors, fontSizes]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.text, fontSize: fontSizes.headerTitle }]}>
            {t('home.startMeeting')}
          </Text>
          <Text style={[styles.headerDate, { color: colors.textSecondary }]}>
            {dateLabel}
          </Text>
        </View>
        <Pressable
          style={[styles.fontToggleButton, { backgroundColor: colors.surfaceVariant }]}
          onPress={() => setFontSizeMode(m => m === 'normal' ? 'large' : 'normal')}
          accessibilityRole="button"
          accessibilityLabel="Toggle font size"
        >
          <Text style={[styles.fontToggleText, { color: colors.text }]}>
            {fontSizeMode === 'normal' ? 'Aa' : 'AA'}
          </Text>
        </Pressable>
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
      ) : (
        <AccordionCard
          cards={accordionCards}
          initialExpanded={0}
          cardTitleFontSize={fontSizes.cardTitle}
        />
      )}
    </SafeAreaView>
  );
}

// --- PresentationFieldRow ---

function PresentationFieldRow({
  field,
  colors,
  fontSizes,
}: {
  field: PresentationField;
  colors: ThemeColors;
  fontSizes?: { label: number; value: number };
}) {
  return (
    <View style={styles.fieldRow}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: fontSizes?.label ?? 12 }]}>
        {field.label}
      </Text>
      <Text
        style={[
          styles.fieldValue,
          { color: colors.text, fontSize: fontSizes?.value ?? 16 },
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
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontWeight: '700',
  },
  headerDate: {
    fontSize: 14,
    marginTop: 2,
  },
  fontToggleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  fontToggleText: {
    fontSize: 16,
    fontWeight: '600',
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
  fieldRow: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  fieldValue: {
  },
  hymnValue: {
    fontWeight: '600',
  },
});
