/**
 * DesignationReadModal: a near-full-screen interstitial (same scheme/size as SacramentPrayerModal)
 * shown over a blurred backdrop of the presentation screen. Lists the full verbatim text to READ
 * for each support/release of the Sunday, in the current app language, scrollable. Dismissed via
 * the X button OR by tapping outside the panel.
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
import { buildDesignationReadText, formatDesignationSummary, orderDesignations } from '../lib/designations';
import type { Designation } from '../types/database';

export interface DesignationReadModalProps {
  visible: boolean;
  onClose: () => void;
  designations: Designation[];
  wardName?: string;
  /** Per-type ward overrides; a non-blank value replaces the built-in default for that type. */
  templates?: Partial<Record<Designation['type'], string | null>>;
  /** Font sizes from the Play screen so the read text tracks the user's chosen size. */
  fontSizes?: { label: number; value: number };
}

export function DesignationReadModal({
  visible,
  onClose,
  designations,
  wardName,
  templates,
  fontSizes,
}: DesignationReadModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const labelSize = fontSizes?.label ?? 13;
  const textSize = fontSizes?.value ?? 17;

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
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
          testID="designation-read-backdrop"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        />
        {/* Panel is a plain View (not a Pressable) so the ScrollView scrolls freely. */}
        <View
          testID="designation-read-panel"
          style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={[styles.header, { borderBottomColor: colors.divider }]}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {t('agenda.designations.readTitle')}
            </Text>
            <Pressable
              testID="designation-read-close-button"
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
          >
            {orderDesignations(designations).map((item, idx) => {
              const override = templates?.[item.type];
              const template = override && override.trim() ? override : undefined;
              return (
                <View key={idx} style={idx > 0 ? styles.itemSpacing : undefined} testID={`designation-read-item-${idx}`}>
                  <Text style={[styles.itemLabel, { color: colors.textSecondary, fontSize: labelSize }]}>
                    {formatDesignationSummary(item, t)}
                  </Text>
                  <Text style={[styles.itemText, { color: colors.text, fontSize: textSize, lineHeight: textSize * 1.5 }]}>
                    {buildDesignationReadText(item, { wardName, template }, t)}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
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
  itemSpacing: {
    marginTop: 24,
  },
  itemLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  itemText: {
    fontSize: 17,
    lineHeight: 26,
  },
});
