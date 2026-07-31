/**
 * InviteActionDropdown: Custom modal dropdown for invite actions.
 * Two labeled sections:
 *  - "Alterar Status": all four assigned statuses with a colored indicator; the current status is
 *    shown but disabled (greyed, not pressable). Others fire onChangeStatus.
 *  - "Fazer uma ação": edit phone (onEditContact), resend invite (onResendInvite), view
 *    conversation (onOpenWhatsApp). Each row is enabled only when its precondition is met.
 * Tapping the overlay closes (onClose). Follows the StatusChangeModal visual pattern.
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
import { WhatsAppIcon, PhoneIcon, SendIcon } from './icons';
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
  /** Called when "Alterar telefone" (edit contact) is selected. */
  onEditContact: (speech: Speech) => void;
  /** Called when "Re-enviar convite" (resend invite) is selected. */
  onResendInvite: (speech: Speech) => void;
  /** Called when the dropdown is closed without action. */
  onClose: () => void;
}

// All four assigned statuses, shown in lifecycle order.
const ALL_ASSIGNED_STATUSES: SpeechStatus[] = [
  'assigned_not_invited',
  'assigned_invited',
  'assigned_confirmed',
  'gave_up',
];

// --- Component ---

export function InviteActionDropdown({
  visible,
  speech,
  onOpenWhatsApp,
  onChangeStatus,
  onEditContact,
  onResendInvite,
  onClose,
}: InviteActionDropdownProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const hasPhone = !!(speech?.contact_phone || speech?.speaker_phone);
  const hasMember = !!speech?.member_id;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.content, { backgroundColor: colors.card }]}>
          {/* Section: Change status */}
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
            {t('home.changeStatusSection')}
          </Text>
          {ALL_ASSIGNED_STATUSES.map((statusOption) => {
            const isCurrent = statusOption === speech?.status;
            return (
              <Pressable
                key={statusOption}
                testID={`invite-dropdown-status-${statusOption}`}
                style={[styles.optionRow, isCurrent && styles.disabledOption]}
                disabled={isCurrent}
                onPress={() => {
                  if (speech && !isCurrent) {
                    onChangeStatus(speech.id, statusOption);
                  }
                }}
              >
                <View
                  style={[
                    styles.indicator,
                    { backgroundColor: colors.status?.[statusOption] ?? STATUS_INDICATOR_COLORS[statusOption] },
                  ]}
                />
                <Text
                  style={[
                    styles.optionLabel,
                    { color: isCurrent ? colors.textSecondary : colors.text },
                  ]}
                >
                  {t(`speechStatus.${statusOption}`)}
                </Text>
              </Pressable>
            );
          })}

          {/* Section: Take an action */}
          <Text
            style={[
              styles.sectionHeader,
              styles.sectionHeaderSpaced,
              { color: colors.textSecondary },
            ]}
          >
            {t('home.actionSection')}
          </Text>

          {/* Edit phone (enabled only when there is a member to edit) */}
          <Pressable
            testID="invite-dropdown-edit-phone"
            style={[styles.optionRow, !hasMember && styles.disabledOption]}
            disabled={!hasMember}
            onPress={() => {
              if (speech && hasMember) onEditContact(speech);
            }}
          >
            <View style={styles.iconContainer}>
              <PhoneIcon size={12} color={hasMember ? colors.text : colors.textSecondary} />
            </View>
            <Text
              style={[
                styles.optionLabel,
                { color: hasMember ? colors.text : colors.textSecondary },
              ]}
            >
              {t('home.editPhone')}
            </Text>
          </Pressable>

          {/* Resend invite (enabled only when there is a phone) */}
          <Pressable
            testID="invite-dropdown-resend"
            style={[styles.optionRow, !hasPhone && styles.disabledOption]}
            disabled={!hasPhone}
            onPress={() => {
              if (speech && hasPhone) onResendInvite(speech);
            }}
          >
            <View style={styles.iconContainer}>
              <SendIcon size={12} color={hasPhone ? colors.text : colors.textSecondary} />
            </View>
            <Text
              style={[
                styles.optionLabel,
                { color: hasPhone ? colors.text : colors.textSecondary },
              ]}
            >
              {t('home.resendInvite')}
            </Text>
          </Pressable>

          {/* View conversation (enabled only when there is a phone) */}
          <Pressable
            testID="invite-dropdown-view-conversation"
            style={[styles.optionRow, !hasPhone && styles.disabledOption]}
            disabled={!hasPhone}
            onPress={() => {
              if (speech && hasPhone) onOpenWhatsApp(speech);
            }}
          >
            <View style={styles.iconContainer}>
              <WhatsAppIcon size={12} color={hasPhone ? '#25D366' : colors.textSecondary} />
            </View>
            <Text
              style={[
                styles.optionLabel,
                { color: hasPhone ? colors.text : colors.textSecondary },
              ]}
            >
              {t('home.viewConversation')}
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
    paddingBottom: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  sectionHeaderSpaced: {
    marginTop: 12,
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
});
