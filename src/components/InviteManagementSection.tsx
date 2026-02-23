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
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../contexts/ThemeContext';
import { WhatsAppIcon, MoreVerticalIcon } from './icons';
import { useAuth } from '../contexts/AuthContext';
import { useSpeeches, useChangeStatus } from '../hooks/useSpeeches';
import { useAgendaRange } from '../hooks/useAgenda';
import { QueryErrorView } from './QueryErrorView';
import { StatusLED } from './StatusLED';
import { InviteActionDropdown } from './InviteActionDropdown';
import { getNextSundays, toISODateString, formatDate, formatDateHumanReadable } from '../lib/dateUtils';
import { getCurrentLanguage, type SupportedLanguage } from '../i18n';
import { buildWhatsAppUrl, buildWhatsAppConversationUrl, openWhatsApp } from '../lib/whatsapp';
import { getInviteItems } from '../lib/speechUtils';
import { supabase } from '../lib/supabase';
import type { Speech, SpeechStatus } from '../types/database';

// Re-export for backward compatibility
export { getInviteItems } from '../lib/speechUtils';
export type { InviteItem } from '../lib/speechUtils';

// Look ahead window for invite management
const LOOK_AHEAD_SUNDAYS = 12;

export function InviteManagementSection() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { hasPermission, wardId, wardLanguage } = useAuth();
  const locale = (wardLanguage as SupportedLanguage) || getCurrentLanguage();
  const changeStatus = useChangeStatus();
  const [dropdownSpeech, setDropdownSpeech] = useState<Speech | null>(null);

  // F142: Fetch ward's custom WhatsApp template from database
  const { data: ward } = useQuery({
    queryKey: ['ward', wardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wards')
        .select('whatsapp_template')
        .eq('id', wardId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!wardId,
  });

  const nextSundays = useMemo(() => {
    const today = new Date();
    return getNextSundays(today, LOOK_AHEAD_SUNDAYS).map(toISODateString);
  }, []);

  const startDate = nextSundays[0] ?? '';
  const endDate = nextSundays[nextSundays.length - 1] ?? '';

  const { data: speeches, isError: speechesError, error: speechesErr, refetch: refetchSpeeches } = useSpeeches({ start: startDate, end: endDate });

  // F118: Fetch agenda range for has_second_speech filtering
  const { data: agendaRange } = useAgendaRange(startDate, endDate);
  const agendaMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const a of agendaRange ?? []) {
      map.set(a.sunday_date, a.has_second_speech);
    }
    return map;
  }, [agendaRange]);

  const inviteItems = useMemo(
    () => {
      const items = getInviteItems(speeches ?? [], locale, formatDate);
      // F118: Filter out position 2 invite items when has_second_speech is false
      return items.filter((item) => {
        if (item.speech.position === 2) {
          const hasSecond = agendaMap.get(item.speech.sunday_date);
          return hasSecond !== false; // default true if no agenda record
        }
        return true;
      });
    },
    [speeches, locale, agendaMap]
  );

  const handleNotInvitedAction = useCallback(
    async (speech: Speech) => {
      // Open WhatsApp and set status to invited
      if (speech.speaker_phone) {
        const url = buildWhatsAppUrl(
          speech.speaker_phone,
          '', // countryCode already in phone
          ward?.whatsapp_template ?? '', // F142: use ward's custom template
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
        changeStatus.mutate({
          speechId: speech.id,
          status: 'assigned_invited',
        });
      } else {
        Alert.alert(
          t('invite.noPhoneTitle'),
          t('invite.noPhoneMessage'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('invite.markAsInvited'),
              onPress: () => {
                changeStatus.mutate({
                  speechId: speech.id,
                  status: 'assigned_invited',
                });
              },
            },
          ]
        );
      }
    },
    [changeStatus, locale, ward?.whatsapp_template, t]
  );

  const handleInvitedAction = useCallback(
    (speech: Speech) => {
      setDropdownSpeech(speech);
    },
    []
  );

  const handleDropdownWhatsApp = useCallback(
    async (speech: Speech) => {
      setDropdownSpeech(null);
      if (speech.speaker_phone) {
        const url = buildWhatsAppConversationUrl(speech.speaker_phone);
        await openWhatsApp(url);
      }
    },
    []
  );

  const handleDropdownStatusChange = useCallback(
    (speechId: string, status: SpeechStatus) => {
      setDropdownSpeech(null);
      changeStatus.mutate({ speechId, status });
    },
    [changeStatus]
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
                  {speech.position === 3 ? t('speeches.lastSpeech') : t('speeches.slot', { number: `${speech.position}\u00BA` })}
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
                <MoreVerticalIcon size={18} color={colors.primary} />
              )}
            </Pressable>
          </View>
        );
      })}

      <InviteActionDropdown
        visible={!!dropdownSpeech}
        speech={dropdownSpeech}
        onOpenWhatsApp={handleDropdownWhatsApp}
        onChangeStatus={handleDropdownStatusChange}
        onClose={() => setDropdownSpeech(null)}
      />
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
