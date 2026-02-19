/**
 * InviteActionDropdown: Custom modal dropdown for invite actions.
 * Shows options: View conversation, status changes, and cancel.
 * Follows visual pattern of StatusChangeModal (Modal + overlay + card).
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { STATUS_INDICATOR_COLORS } from './StatusChangeModal';
import type { Speech, SpeechStatus } from '../types/database';

// --- Types ---

export interface InviteActionDropdownProps {
  /** Whether the dropdown is visible. */
  visible: boolean;
  /** The speech to act on (null when hidden). */
  speech: Speech | null;
  /** Called when "View conversation" (WhatsApp) is selected. */
  onOpenWhatsApp: (speech: Speech) => void;
  /** Called when a status change option is selected. */
  onChangeStatus: (speechId: string, status: SpeechStatus) => void;
  /** Called when the dropdown is closed without action. */
  onClose: () => void;
}

// --- Inline WhatsApp Icon ---

function WhatsAppIcon({ size = 16, color = '#25D366' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
        fill={color}
      />
    </Svg>
  );
}

// --- Component ---

export function InviteActionDropdown({
  visible,
  speech,
  onOpenWhatsApp,
  onChangeStatus,
  onClose,
}: InviteActionDropdownProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const hasPhone = !!speech?.speaker_phone;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.content, { backgroundColor: colors.card }]}>
          {/* Title: speaker name */}
          <Text style={[styles.title, { color: colors.text }]}>
            {speech?.speaker_name ?? ''}
          </Text>

          {/* Option 1: View conversation (WhatsApp) */}
          <Pressable
            style={[styles.optionRow, !hasPhone && styles.disabledOption]}
            onPress={() => {
              if (speech && hasPhone) {
                onOpenWhatsApp(speech);
              }
            }}
            disabled={!hasPhone}
          >
            <View style={styles.iconContainer}>
              <WhatsAppIcon size={12} color={hasPhone ? '#25D366' : colors.textSecondary} />
            </View>
            <Text style={[styles.optionLabel, { color: hasPhone ? colors.text : colors.textSecondary }]}>
              {t('home.viewConversation')}
            </Text>
          </Pressable>

          {/* Option 2: Assigned/Confirmed */}
          <Pressable
            style={styles.optionRow}
            onPress={() => {
              if (speech) {
                onChangeStatus(speech.id, 'assigned_confirmed');
              }
            }}
          >
            <View
              style={[
                styles.indicator,
                { backgroundColor: STATUS_INDICATOR_COLORS.assigned_confirmed },
              ]}
            />
            <Text style={[styles.optionLabel, { color: colors.text }]}>
              {t('speechStatus.assigned_confirmed')}
            </Text>
          </Pressable>

          {/* Option 3: Assigned/Not invited (reverse transition) */}
          <Pressable
            style={styles.optionRow}
            onPress={() => {
              if (speech) {
                onChangeStatus(speech.id, 'assigned_not_invited');
              }
            }}
          >
            <View
              style={[
                styles.indicator,
                { backgroundColor: STATUS_INDICATOR_COLORS.assigned_not_invited },
              ]}
            />
            <Text style={[styles.optionLabel, { color: colors.text }]}>
              {t('speechStatus.assigned_not_invited')}
            </Text>
          </Pressable>

          {/* Option 4: Gave up */}
          <Pressable
            style={styles.optionRow}
            onPress={() => {
              if (speech) {
                onChangeStatus(speech.id, 'gave_up');
              }
            }}
          >
            <View
              style={[
                styles.indicator,
                { backgroundColor: STATUS_INDICATOR_COLORS.gave_up },
              ]}
            />
            <Text style={[styles.optionLabel, { color: colors.text }]}>
              {t('speechStatus.gave_up')}
            </Text>
          </Pressable>

          {/* Option 5: Cancel */}
          <Pressable
            style={[styles.closeButton, { borderTopColor: colors.divider }]}
            onPress={onClose}
          >
            <Text style={[styles.closeText, { color: colors.primary }]}>
              {t('common.cancel')}
            </Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  content: {
    borderRadius: 12,
    width: '100%',
    maxWidth: 320,
    paddingTop: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  disabledOption: {
    opacity: 0.4,
  },
  optionLabel: {
    fontSize: 16,
  },
  indicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  iconContainer: {
    width: 12,
    height: 12,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
