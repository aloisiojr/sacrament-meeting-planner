/**
 * SacramentPrayerModal: a near-full-screen interstitial (with margin around it) shown over a
 * dimmed backdrop of the presentation screen. Displays the two sacrament prayers (bread then
 * water) for the current app language, scrollable. Dismissed via the X button OR by tapping
 * outside the panel (the backdrop).
 *
 * Backdrop: `expo-blur` is not a project dependency, so we fall back to a semi-transparent dark
 * overlay. If BlurView is added later, swap the backdrop View for a BlurView.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { XIcon } from './icons';

export interface SacramentPrayerModalProps {
  visible: boolean;
  onClose: () => void;
  /** Font sizes from the Play screen so the prayer text tracks the user's chosen size. */
  fontSizes?: { label: number; value: number };
}

export function SacramentPrayerModal({ visible, onClose, fontSizes }: SacramentPrayerModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const labelSize = fontSizes?.label ?? 13;
  const textSize = fontSizes?.value ?? 17;

  if (!visible) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        {/* Real blur of the screen behind (expo-blur). */}
        <BlurView
          intensity={100}
          tint="dark"
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        {/* Tap-outside-to-dismiss layer, BEHIND the panel so it never intercepts panel scrolls. */}
        <Pressable
          testID="sacrament-prayer-backdrop"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        />
        {/* Panel is a plain View (not a Pressable) so the ScrollView scrolls freely. */}
        <View
          testID="sacrament-prayer-panel"
          style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={[styles.header, { borderBottomColor: colors.divider }]}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {t('presentation.sacramentPrayerTitle')}
            </Text>
            <Pressable
              testID="sacrament-prayer-close-button"
              style={[styles.closeButton, { backgroundColor: colors.surfaceVariant }]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
            >
              <XIcon size={18} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.prayerLabel, { color: colors.textSecondary, fontSize: labelSize }]}>
              {t('presentation.sacramentPrayerBreadLabel')}
            </Text>
            <Text style={[styles.prayerText, { color: colors.text, fontSize: textSize, lineHeight: textSize * 1.5 }]}>
              {t('presentation.sacramentPrayerBread')}
            </Text>

            <Text style={[styles.prayerLabel, styles.waterLabel, { color: colors.textSecondary, fontSize: labelSize }]}>
              {t('presentation.sacramentPrayerWaterLabel')}
            </Text>
            <Text style={[styles.prayerText, { color: colors.text, fontSize: textSize, lineHeight: textSize * 1.5 }]}>
              {t('presentation.sacramentPrayerWater')}
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  // Sized to its content (up to 82% of the screen, then the ScrollView scrolls) and centered —
  // no forced full-height empty space; wider outer margin via the backdrop padding.
  panel: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '82%',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    flex: 1,
    fontSize: 19,
    fontWeight: '700',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  scroll: {
    flexShrink: 1,
  },
  scrollContent: {
    padding: 20,
  },
  prayerLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  waterLabel: {
    marginTop: 24,
  },
  prayerText: {
    fontSize: 17,
    lineHeight: 26,
  },
});
