/**
 * Settings → WhatsApp Invitation Templates. Thin wrapper over the shared TemplateEditorScreen:
 * one tab per message (3 speeches, +2 prayers when the ward manages prayers), placeholder chips,
 * live preview, restore-default. Templates persist to the ward's whatsapp_template_* columns
 * (NULL => localized default). Gated by `settings:whatsapp`.
 */
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { logAction } from '../../../lib/activityLog';
import { getDefaultSpeechTemplate, getDefaultPrayerTemplate } from '../../../lib/whatsappUtils';
import { useWardManagePrayers } from '../../../hooks/useSpeeches';
import { TemplateEditorScreen, type TemplateTab } from '../../../components/TemplateEditorScreen';

// key → ward column + activity-log description.
const COLUMN: Record<string, string> = {
  speech_1: 'whatsapp_template_speech_1',
  speech_2: 'whatsapp_template_speech_2',
  speech_3: 'whatsapp_template_speech_3',
  opening_prayer: 'whatsapp_template_opening_prayer',
  closing_prayer: 'whatsapp_template_closing_prayer',
};
const LOG_DESC: Record<string, string> = {
  speech_1: 'Modelo WhatsApp 1o discurso atualizado',
  speech_2: 'Modelo WhatsApp 2o discurso atualizado',
  speech_3: 'Modelo WhatsApp 3o discurso atualizado',
  opening_prayer: 'Modelo WhatsApp oração abertura atualizado',
  closing_prayer: 'Modelo WhatsApp oração encerramento atualizado',
};

const SPEECH_PLACEHOLDERS = [
  { token: '{nome}', i18n: 'whatsapp.placeholderName', sample: 'Maria Silva' },
  { token: '{data}', i18n: 'whatsapp.placeholderDate', sample: '2026-03-01' },
  { token: '{colecao}', i18n: 'whatsapp.placeholderCollection', sample: 'Temas da Ala' },
  { token: '{titulo}', i18n: 'whatsapp.placeholderTitle', sample: 'Fé em Jesus Cristo' },
  { token: '{link}', i18n: 'whatsapp.placeholderLink', sample: 'https://example.com/topic' },
] as const;
const PRAYER_PLACEHOLDERS = SPEECH_PLACEHOLDERS.slice(0, 2);

export default function WhatsAppTemplateScreen() {
  const { t } = useTranslation();
  const { wardId, wardLanguage, user, userName } = useAuth();
  const queryClient = useQueryClient();
  const { managePrayers } = useWardManagePrayers();
  const lang = wardLanguage ?? 'en-US';

  const { data: ward } = useQuery({
    queryKey: ['ward', wardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wards')
        .select(
          'whatsapp_template_speech_1, whatsapp_template_speech_2, whatsapp_template_speech_3, whatsapp_template_opening_prayer, whatsapp_template_closing_prayer, language'
        )
        .eq('id', wardId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!wardId,
  });

  const save = useMutation({
    mutationFn: async ({ column, value }: { column: string; value: string | null; key: string }) => {
      const { error } = await supabase.from('wards').update({ [column]: value }).eq('id', wardId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ward', wardId] });
      if (user) {
        logAction(wardId, user.id, user.email ?? '', 'settings:whatsapp_template', LOG_DESC[variables.key], userName);
      }
    },
  });

  const toPlaceholders = (defs: readonly { token: string; i18n: string; sample: string }[]) =>
    defs.map((p) => ({ token: p.token, label: t(p.i18n), sample: p.sample }));

  const tabs = useMemo<TemplateTab[]>(() => {
    const speechTab = (n: 1 | 2 | 3): TemplateTab => ({
      key: `speech_${n}`,
      label: t(`whatsapp.tabSpeech${n}`),
      value: (ward as Record<string, string | null> | undefined)?.[`whatsapp_template_speech_${n}`] ?? null,
      defaultText: getDefaultSpeechTemplate(lang, n),
      placeholders: toPlaceholders(SPEECH_PLACEHOLDERS),
    });
    const prayerTab = (which: 'opening' | 'closing'): TemplateTab => ({
      key: `${which}_prayer`,
      label: t(which === 'opening' ? 'whatsapp.tabOpeningPrayer' : 'whatsapp.tabClosingPrayer'),
      value:
        (ward as Record<string, string | null> | undefined)?.[`whatsapp_template_${which}_prayer`] ?? null,
      defaultText: getDefaultPrayerTemplate(lang, which),
      placeholders: toPlaceholders(PRAYER_PLACEHOLDERS),
    });
    const base: TemplateTab[] = [speechTab(1), speechTab(2), speechTab(3)];
    return managePrayers ? [...base, prayerTab('opening'), prayerTab('closing')] : base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, ward, lang, managePrayers]);

  return (
    <TemplateEditorScreen
      title={t('settings.whatsappTemplate')}
      tabs={tabs}
      saveMode="raw"
      autoCapitalize="none"
      onSave={(key, value) => save.mutate({ column: COLUMN[key], value, key })}
    />
  );
}
