/**
 * Settings → Ward Business Templates. Lets a ward customize the four designation read-texts shown
 * in the Play interstitial. Thin wrapper over the shared TemplateEditorScreen: one tab per type,
 * localized placeholder tokens, override ?? localized default, restore-default, collapse-to-null.
 * Gated by `settings:designations`.
 */
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TemplateEditorScreen, type TemplateTab } from '../../../components/TemplateEditorScreen';
import {
  useWardDesignationTemplates,
  useUpdateWardDesignationTemplate,
} from '../../../hooks/useWard';
import {
  DESIGNATION_TYPES,
  designationTypeLabel,
  designationTokens,
} from '../../../lib/designations';
import { getCurrentLanguage } from '../../../i18n';
import type { DesignationType } from '../../../types/database';

// Which tokens each type exposes (name always; calling for sustain/release; office for priesthood;
// ward for new_member).
const TYPE_TOKENS: Record<DesignationType, readonly ('name' | 'calling' | 'office' | 'ward')[]> = {
  sustain: ['name', 'calling'],
  release: ['name', 'calling'],
  priesthood: ['name', 'office'],
  new_member: ['name', 'ward'],
};

export default function DesignationTemplatesScreen() {
  const { t } = useTranslation();
  const { templates } = useWardDesignationTemplates();
  const update = useUpdateWardDesignationTemplate();

  const tabs = useMemo<TemplateTab[]>(() => {
    const tokens = designationTokens(getCurrentLanguage());
    const samples: Record<'name' | 'calling' | 'office' | 'ward', string> = {
      name: 'Maria Silva',
      calling: 'Presidente',
      office: t('agenda.designations.office.deacon'),
      ward: 'Central',
    };
    return DESIGNATION_TYPES.map((type) => ({
      key: type,
      label: designationTypeLabel(type, t),
      value: templates[type] ?? null,
      defaultText: t(`agenda.designations.readText.${type}`),
      placeholders: TYPE_TOKENS[type].map((field) => ({
        token: tokens[field],
        label: tokens[field],
        sample: samples[field],
      })),
    }));
  }, [t, templates]);

  return (
    <TemplateEditorScreen
      title={t('settings.designationsTemplate')}
      tabs={tabs}
      saveMode="collapse"
      onSave={(key, value) => update.mutate({ type: key as DesignationType, value })}
    />
  );
}
