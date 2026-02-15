/**
 * StatusChangeModal: Shows available status transitions for a speech.
 * LED or status text click opens this modal.
 * Status lifecycle: not_assigned -> assigned_not_invited -> assigned_invited -> assigned_confirmed | gave_up
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  FlatList,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { getAvailableStatuses } from '../hooks/useSpeeches';
import type { SpeechStatus } from '../types/database';

// --- Types ---

export interface StatusChangeModalProps {
  /** Whether the modal is visible. */
  visible: boolean;
  /** The current speech status. */
  currentStatus: SpeechStatus;
  /** Called when a new status is selected. */
  onSelect: (status: SpeechStatus) => void;
  /** Called when the modal is closed without selection. */
  onClose: () => void;
}

// --- Status Colors ---

const STATUS_INDICATOR_COLORS: Record<SpeechStatus, string> = {
  not_assigned: '#9CA3AF',
  assigned_not_invited: '#FBBF24',
  assigned_invited: '#FBBF24',
  assigned_confirmed: '#34D399',
  gave_up: '#F87171',
};

// --- Component ---

export function StatusChangeModal({
  visible,
  currentStatus,
  onSelect,
  onClose,
}: StatusChangeModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const availableStatuses = getAvailableStatuses(currentStatus);

  const getStatusLabel = useCallback(
    (status: SpeechStatus): string => {
      return t(`speechStatus.${status}`, status);
    },
    [t]
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
          <Text style={[styles.title, { color: colors.text }]}>
            {t('speeches.changeStatus')}
          </Text>

          <View style={[styles.currentRow, { borderBottomColor: colors.divider }]}>
            <View
              style={[
                styles.indicator,
                { backgroundColor: STATUS_INDICATOR_COLORS[currentStatus] },
              ]}
            />
            <Text style={[styles.currentLabel, { color: colors.textSecondary }]}>
              {getStatusLabel(currentStatus)}
            </Text>
          </View>

          <FlatList
            data={availableStatuses}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <Pressable
                style={styles.optionRow}
                onPress={() => onSelect(item)}
              >
                <View
                  style={[
                    styles.indicator,
                    { backgroundColor: STATUS_INDICATOR_COLORS[item] },
                  ]}
                />
                <Text style={[styles.optionLabel, { color: colors.text }]}>
                  {getStatusLabel(item)}
                </Text>
              </Pressable>
            )}
            scrollEnabled={false}
          />

          <Pressable
            style={[styles.closeButton, { borderTopColor: colors.divider }]}
            onPress={onClose}
          >
            <Text style={[styles.closeText, { color: colors.primary }]}>
              {t('common.close')}
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
  currentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  currentLabel: {
    fontSize: 15,
    fontStyle: 'italic',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
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
