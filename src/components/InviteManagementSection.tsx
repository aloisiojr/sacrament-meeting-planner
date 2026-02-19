/**
 * InviteManagementSection: Secretary and Bishopric section showing speeches
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
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useSpeeches, useChangeStatus } from '../hooks/useSpeeches';
import { QueryErrorView } from './QueryErrorView';
import { StatusLED } from './StatusLED';
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

/** Inline WhatsApp icon using react-native-svg (no icon library per DD-25). */
function WhatsAppIcon({ size = 18, color = 'white' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
        fill={color}
      />
    </Svg>
  );
}

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

  // Only visible for Secretary and Bishopric
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
              <View style={styles.speechInfoRow}>
                <Text style={[styles.speechNum, { color: colors.textSecondary }]}>
                  {t('speeches.slot', { number: `${speech.position}\u00BA` })}
                </Text>
                <Text style={[styles.speechNum, { color: colors.textSecondary }]}>
                  {' - '}
                </Text>
                <StatusLED status={speech.status} size={10} />
                <Text style={[styles.statusName, { color: colors.textSecondary }]} numberOfLines={1}>
                  {' '}{t(`speechStatus.${speech.status}`)}
                </Text>
              </View>
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
              accessibilityLabel={isNotInvited ? 'WhatsApp' : t('speeches.changeStatus')}
            >
              {isNotInvited ? (
                <WhatsAppIcon size={18} color={colors.onPrimary} />
              ) : (
                <Text
                  style={[
                    styles.actionIcon,
                    { color: colors.primary },
                  ]}
                >
                  {'\u22EE'}
                </Text>
              )}
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
  speechInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusName: {
    fontSize: 12,
    flex: 1,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 18,
    fontWeight: '600',
  },
});
