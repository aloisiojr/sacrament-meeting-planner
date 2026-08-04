/**
 * Exports a Sunday's agenda as a PDF.
 *
 * The ward-level lookups it needs (hymns, members, ward name) are React Query reads with stable
 * keys, so mounting this hook on every agenda card costs one fetch in total, not one per card.
 *
 * The caller passes the agenda/speeches/exception it already holds rather than this hook fetching
 * them per date — the agenda tab has them in hand, and re-querying would duplicate them.
 */

import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHymns, useSacramentalHymns, formatHymnDisplay } from './useHymns';
import { useMembers } from './useMembers';
import { useWardName } from './useWard';
import { buildPresentationCards } from './usePresentationMode';
import { exportAgendaPdf } from '../lib/exportAgendaPdf';
import { formatDateHumanReadable } from '../lib/dateUtils';
import { getCurrentLanguage } from '../i18n';
import type { Hymn, Speech, SundayAgenda, SundayException } from '../types/database';

export interface ExportAgendaArgs {
  date: string;
  agenda: SundayAgenda | null;
  speeches: Speech[];
  exception: SundayException | null;
}

export function useAgendaPdfExport() {
  const { t } = useTranslation();
  const locale = getCurrentLanguage();
  const { data: allHymns } = useHymns(locale);
  const { data: sacramentalHymns } = useSacramentalHymns(locale);
  const { data: members } = useMembers();
  const wardName = useWardName();
  const [isExporting, setIsExporting] = useState(false);

  // buildPresentationCards takes a (key, fallback) function; i18next's own t has a wider,
  // incompatible overload set. Same adapter presentation.tsx uses.
  const tFn = useCallback((key: string, fallback?: string) => t(key, fallback ?? key) as string, [t]);

  // Same lookup Presentation Mode builds, so the printed hymn text matches the screen.
  const hymnLookup = useMemo(() => {
    const map = new Map<string, Hymn>();
    for (const h of allHymns ?? []) map.set(h.id, h);
    for (const h of sacramentalHymns ?? []) map.set(h.id, h);
    return (id: string | null): string => {
      if (!id) return '';
      const hymn = map.get(id);
      return hymn ? formatHymnDisplay(hymn) : '';
    };
  }, [allHymns, sacramentalHymns]);

  const exportAgenda = useCallback(
    async ({ date, agenda, speeches, exception }: ExportAgendaArgs) => {
      setIsExporting(true);
      try {
        const cards = buildPresentationCards(
          agenda,
          speeches,
          exception,
          hymnLookup,
          tFn,
          members ?? []
        );
        return await exportAgendaPdf({
          cards,
          wardName: wardName ?? '',
          dateLabel: formatDateHumanReadable(date, locale),
          fileName: `agenda-${date}`,
          labels: {
            documentTitle: t('agenda.pdfTitle'),
            downloadPrompt: t('agenda.pdfDownloadPrompt'),
          },
        });
      } finally {
        setIsExporting(false);
      }
    },
    [hymnLookup, members, t, tFn, wardName, locale]
  );

  return { exportAgenda, isExporting };
}
