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
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { WhatsAppIcon } from './icons';
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

  const ALL_ASSIGNED_STATUSES: SpeechStatus[] = [
    'assigned_not_invited',
    'assigned_invited',
    'assigned_confirmed',
    'gave_up',
  ];
  const statusOptions = ALL_ASSIGNED_STATUSES.filter(
    (s) => s !== speech?.status
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.content, { backgroundColor: colors.card }]}>
          {/* Title: i18n status change label */}
          <Text style={[styles.title, { color: colors.text }]}>
            {t('speeches.changeStatus')}
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

          {/* Dynamic status options (all assigned statuses except current) */}
          {statusOptions.map((statusOption) => (
            <Pressable
              key={statusOption}
              style={styles.optionRow}
              onPress={() => {
                if (speech) {
                  onChangeStatus(speech.id, statusOption);
                }
              }}
            >
              <View
                style={[
                  styles.indicator,
                  { backgroundColor: STATUS_INDICATOR_COLORS[statusOption] },
                ]}
              />
              <Text style={[styles.optionLabel, { color: colors.text }]}>
                {t(`speechStatus.${statusOption}`)}
              </Text>
            </Pressable>
          ))}

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
