/**
 * SpeechSlot: Single speech position within a SundayCard.
 * Shows speaker field, topic field, status LED, and remove button.
 * Labels: "1o Discurso", "2o Discurso", "Ultimo Discurso" (Unicode U+00BA for ordinals).
 *
 * Permissions:
 * - Bishopric: assign/unassign speaker, assign topic, change status
 * - Secretary: change status only (cannot assign)
 * - Observer: read-only
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { StatusLED } from './StatusLED';
import { StatusChangeModal } from './StatusChangeModal';
import { PrayerSelector, type PrayerSelection } from './PrayerSelector';
import type { Speech, SpeechStatus, Member, TopicWithCollection } from '../types/database';

// --- Types ---

export interface SpeechSlotProps {
  /** The speech data for this slot (null if not yet created). */
  speech: Speech | null;
  /** The position (1, 2, or 3). */
  position: number;
  /** Called when a speaker is assigned. */
  onAssignSpeaker?: (speechId: string, member: Member) => void;
  /** Called when a topic is assigned. */
  onAssignTopic?: (speechId: string, topic: TopicWithCollection) => void;
  /** Called when the status changes. */
  onChangeStatus?: (speechId: string, status: SpeechStatus) => void;
  /** Called when the speaker assignment is removed. */
  onRemoveAssignment?: (speechId: string) => void;
  /** Called to open the speaker selector. */
  onOpenSpeakerSelector?: (speechId: string) => void;
  /** Called to open the topic selector. */
  onOpenTopicSelector?: (speechId: string) => void;
  /** Called when the topic assignment is cleared. */
  onClearTopic?: (speechId: string) => void;
}

// --- Position Labels ---

function getPositionLabel(position: number, t: (key: string, opts?: Record<string, unknown>) => string): string {
  if (position === 3) {
    return t('speeches.lastSpeech');
  }
  // "1o Discurso" format using Unicode U+00BA (masculine ordinal)
  return t('speeches.slot', { number: `${position}\u00BA` });
}

// --- Component ---

export const SpeechSlot = React.memo(function SpeechSlot({
  speech,
  position,
  onAssignSpeaker,
  onAssignTopic,
  onChangeStatus,
  onRemoveAssignment,
  onOpenSpeakerSelector,
  onOpenTopicSelector,
  onClearTopic,
}: SpeechSlotProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { hasPermission, role } = useAuth();

  const [statusModalVisible, setStatusModalVisible] = useState(false);

  const canAssign = hasPermission('speech:assign');
  const canUnassign = hasPermission('speech:unassign');
  const canChangeStatus = hasPermission('speech:change_status');
  const isObserver = role === 'observer';

  const status = speech?.status ?? 'not_assigned';
  const hasSpeaker = !!speech?.speaker_name;
  const label = getPositionLabel(position, t);

  const handleSpeakerPress = useCallback(() => {
    if (!speech || !canAssign) return;
    onOpenSpeakerSelector?.(speech.id);
  }, [speech, canAssign, onOpenSpeakerSelector]);

  const handleTopicPress = useCallback(() => {
    if (!speech || !canAssign) return;
    onOpenTopicSelector?.(speech.id);
  }, [speech, canAssign, onOpenTopicSelector]);

  const handleStatusPress = useCallback(() => {
    if (!canChangeStatus || !speech || status === 'not_assigned') return;
    setStatusModalVisible(true);
  }, [canChangeStatus, speech, status]);

  const handleStatusSelect = useCallback(
    (newStatus: SpeechStatus) => {
      if (!speech) return;
      setStatusModalVisible(false);
      onChangeStatus?.(speech.id, newStatus);
    },
    [speech, onChangeStatus]
  );

  const handleRemove = useCallback(() => {
    if (!speech || !canUnassign) return;
    Alert.alert(t('common.confirm'), t('speeches.unassign') + '?', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.confirm'),
        style: 'destructive',
        onPress: () => onRemoveAssignment?.(speech.id),
      },
    ]);
  }, [speech, canUnassign, t, onRemoveAssignment]);

  const handleClearTopic = useCallback(() => {
    if (!speech) return;
    onClearTopic?.(speech.id);
  }, [speech, onClearTopic]);

  // Topic display: "Collection : Title" format
  const topicDisplay = speech?.topic_title
    ? speech.topic_collection
      ? `${speech.topic_collection} : ${speech.topic_title}`
      : speech.topic_title
    : null;

  // LED allowed statuses: all except not_assigned
  const ledAllowedStatuses: SpeechStatus[] = [
    'assigned_not_invited',
    'assigned_invited',
    'assigned_confirmed',
    'gave_up',
  ];

  return (
    <View style={[styles.container, { borderBottomColor: colors.divider }]}>
      {/* Slot label */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>

      <View style={styles.row}>
        {/* LED */}
        <StatusLED
          status={status}
          size={16}
          onPress={handleStatusPress}
          disabled={isObserver || status === 'not_assigned'}
        />

        {/* Speaker field */}
        <Pressable
          style={[styles.field, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
          onPress={handleSpeakerPress}
          disabled={!canAssign || !speech}
          accessibilityRole="button"
          accessibilityLabel={t('speeches.selectSpeaker')}
        >
          <Text
            style={[
              styles.fieldText,
              { color: hasSpeaker ? colors.text : colors.placeholder },
            ]}
            numberOfLines={1}
          >
            {speech?.speaker_name ?? t('speeches.selectSpeaker')}
          </Text>
          {canAssign && (
            <Text style={[styles.fieldArrow, { color: colors.textSecondary }]}>
              {'\u25BC'}
            </Text>
          )}
        </Pressable>

        {/* Remove button */}
        {hasSpeaker && canUnassign && (
          <Pressable
            onPress={handleRemove}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('speeches.unassign')}
          >
            <Text style={[styles.removeButton, { color: colors.error }]}>
              {'\u00D7'}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Topic field */}
      <View style={styles.topicRow}>
        <Pressable
          style={[styles.topicField, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
          onPress={handleTopicPress}
          disabled={!canAssign || !speech}
          accessibilityRole="button"
          accessibilityLabel={t('speeches.selectTopic')}
        >
          <Text
            style={[
              styles.topicText,
              { color: topicDisplay ? colors.text : colors.placeholder },
            ]}
            numberOfLines={1}
          >
            {topicDisplay ?? t('speeches.selectTopic')}
          </Text>
          {canAssign && (
            <Text style={[styles.fieldArrow, { color: colors.textSecondary }]}>
              {'\u25BC'}
            </Text>
          )}
        </Pressable>
        {topicDisplay && canAssign && (
          <Pressable
            hitSlop={8}
            onPress={handleClearTopic}
            accessibilityLabel={t('common.delete')}
          >
            <Text style={[styles.removeButton, { color: colors.error }]}>{'\u00D7'}</Text>
          </Pressable>
        )}
      </View>

      {/* Status Change Modal */}
      <StatusChangeModal
        visible={statusModalVisible}
        currentStatus={status}
        onSelect={handleStatusSelect}
        onClose={() => setStatusModalVisible(false)}
        allowedStatuses={ledAllowedStatuses}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
  },
  fieldText: {
    flex: 1,
    fontSize: 14,
  },
  fieldArrow: {
    fontSize: 8,
    marginLeft: 4,
  },
  removeButton: {
    fontSize: 24,
    fontWeight: '300',
    paddingHorizontal: 4,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
    marginLeft: 28,
  },
  topicField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 34,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
  },
  topicText: {
    flex: 1,
    fontSize: 13,
  },
});
