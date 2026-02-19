/**
 * InviteManagementSection: Secretary-only section showing speeches
 * with status 'assigned_not_invited' or 'assigned_invited'.
 * Each item shows compact date, speech number, and action button.
 * Sorted by date (closest first).
 */

import React, { useState, useCallback, useMemo } from 'react';
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
import { useSpeeches, useChangeStatus } from '../hooks/useSpeeches';
import { QueryErrorView } from './QueryErrorView';
import { getNextSundays, toISODateString, formatDate, formatDateHumanReadable } from '../lib/dateUtils';
import { getCurrentLanguage, type SupportedLanguage } from '../i18n';
import { buildWhatsAppUrl, openWhatsApp } from '../lib/whatsapp';
import { getInviteItems } from '../lib/speechUtils';
import type { Speech, SpeechStatus } from '../types/database';

// Re-export for backward compatibility
export { getInviteItems } from '../lib/speechUtils';
export type { InviteItem } from '../lib/speechUtils';

// Look ahead window for invite management
const LOOK_AHEAD_SUNDAYS = 12;

export function InviteManagementSection() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { hasPermission } = useAuth();
  const locale = getCurrentLanguage();
  const changeStatus = useChangeStatus();

  const nextSundays = useMemo(() => {
    const today = new Date();
    return getNextSundays(today, LOOK_AHEAD_SUNDAYS).map(toISODateString);
  }, []);

  const startDate = nextSundays[0] ?? '';
  const endDate = nextSundays[nextSundays.length - 1] ?? '';

  const { data: speeches, isError: speechesError, error: speechesErr, refetch: refetchSpeeches } = useSpeeches({ start: startDate, end: endDate });

  const inviteItems = useMemo(
    () => getInviteItems(speeches ?? [], locale, formatDate),
    [speeches, locale]
  );

  const handleNotInvitedAction = useCallback(
    async (speech: Speech) => {
      // Open WhatsApp and set status to invited
      if (speech.speaker_phone) {
        const url = buildWhatsAppUrl(
          speech.speaker_phone,
          '', // countryCode already in phone
          '', // Will use default template for language
          {
            speakerName: speech.speaker_name ?? '',
            date: formatDateHumanReadable(speech.sunday_date, locale as SupportedLanguage),
            topic: speech.topic_title ?? '',
            position: `${speech.position}\u00BA`,
            collection: speech.topic_collection ?? '',
            link: speech.topic_link ?? '',
          },
          locale
        );
        await openWhatsApp(url);
      }
      changeStatus.mutate({
        speechId: speech.id,
        status: 'assigned_invited',
      });
    },
    [changeStatus, locale]
  );

  const handleInvitedAction = useCallback(
    (speech: Speech) => {
      Alert.alert(
        t('speeches.changeStatus'),
        speech.speaker_name ?? '',
        [
          {
            text: 'WhatsApp',
            onPress: async () => {
              if (speech.speaker_phone) {
                const url = buildWhatsAppUrl(
                  speech.speaker_phone,
                  '',
                  '',
                  {
                    speakerName: speech.speaker_name ?? '',
                    date: formatDateHumanReadable(speech.sunday_date, locale as SupportedLanguage),
                    topic: speech.topic_title ?? '',
                    position: `${speech.position}\u00BA`,
                    collection: speech.topic_collection ?? '',
                    link: speech.topic_link ?? '',
                  },
                  locale
                );
                await openWhatsApp(url);
              }
            },
          },
          {
            text: t('speechStatus.assigned_confirmed'),
            onPress: () => {
              changeStatus.mutate({
                speechId: speech.id,
                status: 'assigned_confirmed',
              });
            },
          },
          {
            text: t('speechStatus.gave_up'),
            style: 'destructive',
            onPress: () => {
              changeStatus.mutate({
                speechId: speech.id,
                status: 'gave_up',
              });
            },
          },
          { text: t('common.cancel'), style: 'cancel' },
        ]
      );
    },
    [t, changeStatus, locale]
  );

  // Only visible for Secretary
  if (!hasPermission('home:invite_mgmt')) return null;

  if (speechesError) {
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t('home.inviteManagement')}
        </Text>
        <QueryErrorView
          error={speechesErr ?? null}
          onRetry={refetchSpeeches}
        />
      </View>
    );
  }

  if (inviteItems.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {t('home.inviteManagement')}
      </Text>

      {inviteItems.map(({ speech, compactDate }) => {
        const isNotInvited = speech.status === 'assigned_not_invited';

        return (
          <View
            key={speech.id}
            style={[styles.inviteRow, { borderBottomColor: colors.divider }]}
          >
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
              {compactDate}
            </Text>
            <View style={styles.details}>
              <Text style={[styles.speakerName, { color: colors.text }]} numberOfLines={1}>
                {speech.speaker_name}
              </Text>
              <Text style={[styles.speechNum, { color: colors.textSecondary }]}>
                {speech.position}{'\u00BA'}
              </Text>
            </View>
            <Pressable
              style={[
                styles.actionButton,
                {
                  backgroundColor: isNotInvited ? colors.primary : colors.primaryContainer,
                  borderColor: colors.primary,
                },
              ]}
              onPress={() =>
                isNotInvited
                  ? handleNotInvitedAction(speech)
                  : handleInvitedAction(speech)
              }
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.actionText,
                  { color: isNotInvited ? colors.onPrimary : colors.primary },
                ]}
              >
                {isNotInvited ? 'WhatsApp' : t('speeches.changeStatus')}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    width: 56,
  },
  details: {
    flex: 1,
    marginHorizontal: 8,
  },
  speakerName: {
    fontSize: 15,
    fontWeight: '500',
  },
  speechNum: {
    fontSize: 12,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
