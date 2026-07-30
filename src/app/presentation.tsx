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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme, type ThemeColors } from '../contexts/ThemeContext';
import {
  usePresentationData,
  getTodaySundayDate,
  buildPresentationCards,
} from '../hooks/usePresentationMode';
import { AccordionCard } from '../components/AccordionCard';
import { SacramentPrayerModal } from '../components/SacramentPrayerModal';
import { DesignationReadModal } from '../components/DesignationReadModal';
import { useWardName, useWardDesignationTemplates } from '../hooks/useWard';
import { formatFullDate } from '../lib/dateUtils';
import { getCurrentLanguage } from '../i18n';
import { PencilIcon, XIcon, ScrollTextIcon } from '../components/icons';
import type { PresentationField } from '../hooks/usePresentationMode';

const FONT_SIZES = {
  normal: { fieldLabel: 13, fieldValue: 17, cardTitle: 17, headerTitle: 19 },
  large: { fieldLabel: 18, fieldValue: 26, cardTitle: 22, headerTitle: 24 },
};

export default function PresentationScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();

  const [fontSizeMode, setFontSizeMode] = useState<'normal' | 'large'>('normal');
  const fontSizes = FONT_SIZES[fontSizeMode];
  const [prayerModalVisible, setPrayerModalVisible] = useState(false);
  const [designationsModalVisible, setDesignationsModalVisible] = useState(false);

  const openPrayerModal = useCallback(() => setPrayerModalVisible(true), []);
  const closePrayerModal = useCallback(() => setPrayerModalVisible(false), []);
  const openDesignationsModal = useCallback(() => setDesignationsModalVisible(true), []);
  const closeDesignationsModal = useCallback(() => setDesignationsModalVisible(false), []);
  const wardName = useWardName();
  const designationTemplates = useWardDesignationTemplates();

  const sundayDate = params.date ?? getTodaySundayDate();
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
    members,
  } = usePresentationData(sundayDate);

  const tFn = useCallback(
    (key: string, fallback?: string) => t(key, fallback ?? key) as string,
    [t]
  );

  const cards = useMemo(
    () => buildPresentationCards(agenda ?? null, speeches, exception, hymnLookup, tFn, members),
    [agenda, speeches, exception, hymnLookup, tFn, members]
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
                onPrayerPress={openPrayerModal}
                onDesignationsPress={openDesignationsModal}
              />
            ))}
          </View>
        ),
      })),
    [cards, colors, fontSizes, openPrayerModal, openDesignationsModal]
  );

  return (
    <SafeAreaView testID="presentation-screen" style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.text, fontSize: 19 }]}>
            {t('presentation.title')}
          </Text>
          <Text style={[styles.headerDate, { color: colors.textSecondary }]}>
            {dateLabel}
          </Text>
        </View>
        <Pressable
          testID="presentation-edit-button"
          style={[styles.pencilButton, { backgroundColor: colors.surfaceVariant }]}
          onPress={() => router.push({ pathname: '/(tabs)/agenda', params: { expandDate: sundayDate } })}
          accessibilityRole="button"
          accessibilityLabel="Edit agenda"
        >
          <PencilIcon size={16} color={colors.text} />
        </Pressable>
        <Pressable
          testID="presentation-font-toggle-button"
          style={[styles.fontToggleButton, { backgroundColor: colors.surfaceVariant }]}
          onPress={() => setFontSizeMode(m => m === 'normal' ? 'large' : 'normal')}
          accessibilityRole="button"
          accessibilityLabel="Toggle font size"
        >
          <Text testID="presentation-font-toggle-text" style={[styles.fontToggleText, { color: colors.text }]}>
            {fontSizeMode === 'normal' ? 'Aa' : 'AA'}
          </Text>
        </Pressable>
        <Pressable
          testID="presentation-close-button"
          style={[styles.closeButton, { backgroundColor: colors.surfaceVariant }]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        >
          <XIcon size={18} color={colors.text} />
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
          slideAnimation
        />
      )}

      <SacramentPrayerModal
        visible={prayerModalVisible}
        onClose={closePrayerModal}
        fontSizes={{ label: fontSizes.fieldLabel, value: fontSizes.fieldValue }}
      />

      <DesignationReadModal
        visible={designationsModalVisible}
        onClose={closeDesignationsModal}
        designations={agenda?.designations ?? []}
        wardName={wardName ?? undefined}
        templates={designationTemplates}
        fontSizes={{ label: fontSizes.fieldLabel, value: fontSizes.fieldValue }}
      />
    </SafeAreaView>
  );
}

// --- PresentationFieldRow ---

function PresentationFieldRow({
  field,
  colors,
  fontSizes,
  onPrayerPress,
  onDesignationsPress,
}: {
  field: PresentationField;
  colors: ThemeColors;
  fontSizes?: { label: number; value: number };
  onPrayerPress?: () => void;
  onDesignationsPress?: () => void;
}) {
  if (field.type === 'bullet_list') {
    const bulletItems = (field.value || '')
      .split('\n')
      .filter((s: string) => s.trim() !== '');

    if (bulletItems.length === 0) {
      return (
        <View style={styles.fieldRow}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: fontSizes?.label ?? 12 }]}>
            {field.label}
          </Text>
          <Text style={[styles.fieldValue, { color: colors.textTertiary, fontSize: fontSizes?.value ?? 16 }]}>
            ---
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.fieldRow}>
        {field.readText ? (
          // Label row with the "text to read" icon (mirrors the sacrament-prayer row).
          <View style={styles.bulletHeaderRow}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: fontSizes?.label ?? 12 }]}>
              {field.label}
            </Text>
            <Pressable
              testID="designations-read-icon-button"
              style={[styles.prayerIconButton, { backgroundColor: colors.surfaceVariant }]}
              onPress={onDesignationsPress}
              accessibilityRole="button"
              accessibilityLabel={field.label}
            >
              <ScrollTextIcon size={20} color={colors.text} />
            </Pressable>
          </View>
        ) : (
          <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: fontSizes?.label ?? 12 }]}>
            {field.label}
          </Text>
        )}
        {bulletItems.map((item: string, idx: number) => (
          <Text
            key={idx}
            style={[styles.fieldValue, {
              color: idx % 2 === 0 ? colors.text : colors.textZebraFaded,
              fontSize: fontSizes?.value ?? 16,
            }]}
          >
            {'\u2022 '}{item}
          </Text>
        ))}
      </View>
    );
  }

  if (field.sacramentPrayer) {
    return (
      <View style={[styles.fieldRow, styles.prayerFieldRow]}>
        <View style={styles.prayerFieldTextColumn}>
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
            numberOfLines={2}
          >
            {field.value || '---'}
          </Text>
        </View>
        <Pressable
          testID="sacrament-prayer-icon-button"
          style={[styles.prayerIconButton, { backgroundColor: colors.surfaceVariant }]}
          onPress={onPrayerPress}
          accessibilityRole="button"
          accessibilityLabel={field.label}
        >
          <ScrollTextIcon size={20} color={colors.text} />
        </Pressable>
      </View>
    );
  }

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
  pencilButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
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
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldRow: {
    marginBottom: 12,
  },
  prayerFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bulletHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  prayerFieldTextColumn: {
    flex: 1,
  },
  prayerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
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
