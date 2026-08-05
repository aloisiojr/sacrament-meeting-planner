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
import { useSpeeches, useChangeStatus, useWardManagePrayers } from '../hooks/useSpeeches';
import { useAgendaRange } from '../hooks/useAgenda';
import { QueryErrorView } from './QueryErrorView';
import { StatusLED } from './StatusLED';
import { InviteActionDropdown } from './InviteActionDropdown';
import { PersonEditor } from './PersonEditor';
import { buildFullPhone } from '../lib/phone';
import { resolveInvitePhone } from '../lib/contact';
import { getNextSundays, toISODateString, formatDate, formatDateHumanReadable } from '../lib/dateUtils';
import { getCurrentLanguage, type SupportedLanguage } from '../i18n';
import { buildWhatsAppConversationUrl, openWhatsApp } from '../lib/whatsapp';
import {
  getDefaultPrayerTemplate,
  getDefaultSpeechTemplate,
  resolveTemplate,
  wrapDelegationMessage,
} from '../lib/whatsappUtils';
import { useMembers } from '../hooks/useMembers';
import { getInviteItems } from '../lib/speechUtils';
import { supabase } from '../lib/supabase';
import type { Member, Speech, SpeechStatus } from '../types/database';

// Look ahead window for invite management
const LOOK_AHEAD_SUNDAYS = 12;

export function InviteManagementSection() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { hasPermission, wardId, wardLanguage } = useAuth();
  const locale = (wardLanguage as SupportedLanguage) || getCurrentLanguage();
  const changeStatus = useChangeStatus();
  const [dropdownSpeech, setDropdownSpeech] = useState<Speech | null>(null);

  // Contact editor (PersonEditor) state: the member being edited, the originating speech, and
  // whether saving should offer to send the invite afterwards.
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editorSpeech, setEditorSpeech] = useState<Speech | null>(null);
  const [editorThenSend, setEditorThenSend] = useState(false);

  const { managePrayers } = useWardManagePrayers();

  // v2.0: members are needed to resolve the responsible's name for delegated sends.
  const { data: members } = useMembers();
  const memberMap = useMemo(() => {
    const map = new Map<string, Member>();
    for (const m of members ?? []) map.set(m.id, m);
    return map;
  }, [members]);

  // Resolve the responsible's display name LIVE from the member chain
  // (speech.member_id -> member -> responsible_id -> responsible.full_name).
  // Returns '' when unavailable (still sends, with a generic greeting).
  const resolveResponsibleName = useCallback(
    (speech: Speech): string => {
      const member = speech.member_id ? memberMap.get(speech.member_id) : undefined;
      const responsible = member?.responsible_id ? memberMap.get(member.responsible_id) : undefined;
      return responsible?.full_name ?? '';
    },
    [memberMap]
  );

  // F142: Fetch ward's custom WhatsApp template from database
  const { data: ward } = useQuery({
    queryKey: ['ward', wardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wards')
        .select('whatsapp_template_speech_1, whatsapp_template_speech_2, whatsapp_template_speech_3, whatsapp_template_opening_prayer, whatsapp_template_closing_prayer, whatsapp_template_delegation_wrapper')
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
        if (item.speech.position === 0 || item.speech.position === 4) {
          return managePrayers;
        }
        return true;
      });
    },
    [speeches, locale, agendaMap, managePrayers]
  );

  // Build the per-position/delegation invite message, open WhatsApp, then mark as invited.
  // Recipient: phoneOverride (e.g. a freshly edited contact) ?? contact snapshot ?? legacy own phone.
  const sendInvite = useCallback(
    async (speech: Speech, phoneOverride?: string) => {
      // Normalise on read: snapshots written before buildFullPhone existed (and anything seeded
      // straight into the database) hold a bare national number, which produced a wa.me link with
      // no country code. The code comes from whoever owns the number.
      const member = speech.member_id ? memberMap.get(speech.member_id) : null;
      const responsible = member?.responsible_id ? memberMap.get(member.responsible_id) : null;
      const phone = resolveInvitePhone(
        phoneOverride ?? speech.contact_phone ?? speech.speaker_phone,
        { isDelegated: speech.is_delegated, member, responsible }
      );
      if (!phone) return;

      // Build the normal per-position base message.
      let baseMessage: string;
      if (speech.position === 0 || speech.position === 4) {
        // Prayer: use prayer-specific template with {nome} and {data} placeholders
        const prayerType = speech.position === 0 ? 'opening' : 'closing';
        const templateField = speech.position === 0
          ? 'whatsapp_template_opening_prayer'
          : 'whatsapp_template_closing_prayer';
        const customTemplate = ward?.[templateField as keyof typeof ward] as string | null;
        const template = customTemplate ?? getDefaultPrayerTemplate(locale, prayerType);
        baseMessage = resolveTemplate(template, {
          speakerName: speech.speaker_informal_name || speech.speaker_name || '',
          date: formatDateHumanReadable(speech.sunday_date, locale as SupportedLanguage),
          topic: '',
        });
      } else {
        // Speech: use position-specific speech template (locale default when unset).
        const speechTemplateMap: Record<number, string> = {
          1: ward?.whatsapp_template_speech_1 ?? '',
          2: ward?.whatsapp_template_speech_2 ?? '',
          3: ward?.whatsapp_template_speech_3 ?? '',
        };
        const selectedTemplate =
          speechTemplateMap[speech.position] || getDefaultSpeechTemplate(locale, speech.position as 1 | 2 | 3);
        baseMessage = resolveTemplate(selectedTemplate, {
          speakerName: speech.speaker_informal_name || speech.speaker_name || '',
          date: formatDateHumanReadable(speech.sunday_date, locale as SupportedLanguage),
          topic: speech.topic_title ?? '',
          collection: speech.topic_collection ?? '',
          link: speech.topic_link ?? '',
        });
      }

      // v2.0: when delegated, wrap the base message with the ward delegation wrapper.
      let message = baseMessage;
      if (speech.is_delegated) {
        message = wrapDelegationMessage(
          baseMessage,
          ward?.whatsapp_template_delegation_wrapper ?? null,
          resolveResponsibleName(speech),
          speech.delegate_for_name ?? '',
          locale
        );
      }

      let cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
      if (cleanPhone.startsWith('+')) cleanPhone = cleanPhone.substring(1);
      const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

      // Only flip to "invited" if WhatsApp actually opened — otherwise the invite
      // was never sent and the status would lie.
      const opened = await openWhatsApp(url);
      if (opened) {
        changeStatus.mutate({
          speechId: speech.id,
          status: 'assigned_invited',
        });
      }
    },
    [changeStatus, locale, ward, resolveResponsibleName, memberMap]
  );

  // Open the contact (PersonEditor) for the speech's member. `thenSend` remembers whether to offer
  // sending the invite after a successful save (used from the no-phone dialog).
  const openContactEditor = useCallback(
    (speech: Speech, thenSend: boolean) => {
      const member = speech.member_id ? memberMap.get(speech.member_id) : undefined;
      setEditingMember(member ?? null);
      setEditorSpeech(speech);
      setEditorThenSend(thenSend);
      setEditorVisible(true);
    },
    [memberMap]
  );

  const handleEditorSaved = useCallback(
    (saved: Member) => {
      setEditorVisible(false);
      const speech = editorSpeech;
      if (editorThenSend && saved.phone && speech) {
        Alert.alert(
          t('home.sendInviteTitle'),
          t('home.sendInviteQuestion'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('home.sendInvite'),
              onPress: () => {
                sendInvite(speech, buildFullPhone(saved.country_code, saved.phone) ?? undefined);
              },
            },
          ]
        );
      }
    },
    [editorThenSend, editorSpeech, t, sendInvite]
  );

  const handleNotInvitedAction = useCallback(
    (speech: Speech) => {
      // v2.0: send to the resolved contact snapshot; fall back to the legacy own-phone snapshot
      // (also covers orphaned delegation where contact_phone was never captured).
      const phone = speech.contact_phone || speech.speaker_phone;
      if (phone) {
        sendInvite(speech);
      } else {
        const buttons: {
          text: string;
          style?: 'cancel' | 'default' | 'destructive';
          onPress?: () => void;
        }[] = [];
        // Only offer "Edit Contact" when there is a member to edit.
        if (speech.member_id) {
          buttons.push({
            text: t('home.editContact'),
            onPress: () => openContactEditor(speech, /* thenSend */ true),
          });
        }
        buttons.push({
          text: t('invite.markAsInvited'),
          onPress: () => {
            changeStatus.mutate({
              speechId: speech.id,
              status: 'assigned_invited',
            });
          },
        });
        buttons.push({ text: t('common.cancel'), style: 'cancel' });
        Alert.alert(t('invite.noPhoneTitle'), t('invite.noPhoneMessage'), buttons);
      }
    },
    [sendInvite, changeStatus, t, openContactEditor]
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
      // v2.0: open the conversation with the resolved contact (fallback to legacy own phone).
      const phone = speech.contact_phone || speech.speaker_phone;
      if (phone) {
        const url = buildWhatsAppConversationUrl(phone);
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
        const isSpeech = speech.position >= 1 && speech.position <= 3;
        const topicMissing = isSpeech && (!speech.topic_title || speech.topic_title.trim() === '');
        const isWhatsAppDisabled = topicMissing && isNotInvited;

        return (
          <View
            key={speech.id}
            style={[styles.inviteRow, { borderBottomColor: colors.divider }]}
          >
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
              {compactDate}
            </Text>
            <View style={styles.details}>
              <View style={styles.speakerNameRow}>
                <Text style={[styles.speakerName, { color: colors.text }]} numberOfLines={1}>
                  {speech.speaker_name}
                </Text>
                {topicMissing && (
                  <Text style={[styles.topicMissing, { color: colors.error }]}>
                    {t('invite.topicMissing')}
                  </Text>
                )}
              </View>
              <View style={styles.speechInfoRow}>
                <Text style={[styles.speechNum, { color: colors.textSecondary }]}>
                  {speech.position === 0
                    ? t('speeches.openingPrayer')
                    : speech.position === 4
                      ? t('speeches.closingPrayer')
                      : speech.position === 3
                        ? t('speeches.lastSpeech')
                        : t('speeches.slot', { number: `${speech.position}\u00BA` })}
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
                isWhatsAppDisabled && { opacity: 0.4 },
              ]}
              onPress={isWhatsAppDisabled ? undefined : () =>
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
        onEditContact={(s) => {
          setDropdownSpeech(null);
          openContactEditor(s, /* thenSend */ false);
        }}
        onResendInvite={(s) => {
          setDropdownSpeech(null);
          sendInvite(s);
        }}
        onClose={() => setDropdownSpeech(null)}
      />

      <PersonEditor
        visible={editorVisible}
        member={editingMember}
        onClose={() => setEditorVisible(false)}
        onSaved={handleEditorSaved}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {},
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
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
  speakerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topicMissing: {
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 6,
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
