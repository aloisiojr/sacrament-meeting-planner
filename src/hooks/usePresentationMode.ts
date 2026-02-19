/**
 * Hook for Presentation Mode data loading.
 * Loads agenda + speeches for a sunday, determines meeting type,
 * and checks if today is Sunday for button visibility.
 */

import { useMemo } from 'react';
import { useAgenda } from './useAgenda';
import { useSpeeches } from './useSpeeches';
import { useSundayExceptions } from './useSundayTypes';
import { useHymns, useSacramentalHymns, formatHymnDisplay } from './useHymns';
import { getCurrentLanguage } from '../i18n';
import { toISODateString } from '../lib/dateUtils';
import { isSpecialMeeting } from './useAgenda';
import type { SundayAgenda, Speech, SundayException, Hymn } from '../types/database';

// --- Types ---

export interface PresentationCard {
  title: string;
  fields: PresentationField[];
}

export interface PresentationField {
  label: string;
  value: string;
  type: 'text' | 'hymn' | 'multiline';
}

export interface PresentationData {
  sundayDate: string;
  agenda: SundayAgenda | null;
  speeches: Speech[];
  exception: SundayException | null;
  isSpecial: boolean;
  cards: PresentationCard[];
}

// --- Utilities ---

/**
 * Check if today is Sunday (00:00-23:59 in local time).
 */
export function isTodaySunday(): boolean {
  return new Date().getDay() === 0;
}

/**
 * Get today's date as ISO string if it's a Sunday,
 * or the next Sunday's date.
 */
export function getTodaySundayDate(): string {
  const today = new Date();
  const day = today.getDay();
  if (day === 0) return toISODateString(today);
  // Find next sunday
  const next = new Date(today);
  next.setDate(today.getDate() + (7 - day));
  return toISODateString(next);
}

/**
 * Build presentation cards from agenda and speech data.
 */
export function buildPresentationCards(
  agenda: SundayAgenda | null,
  speeches: Speech[],
  exception: SundayException | null,
  hymnLookup: (id: string | null) => string,
  t: (key: string, fallback?: string) => string
): PresentationCard[] {
  const isSpecial = isSpecialMeeting(exception?.reason ?? null);
  const cards: PresentationCard[] = [];

  // Card 1: Welcome & Announcements
  const welcomeFields: PresentationField[] = [
    { label: t('agenda.presiding'), value: agenda?.presiding_name ?? '', type: 'text' },
    { label: t('agenda.conducting'), value: agenda?.conducting_name ?? '', type: 'text' },
  ];
  if (agenda?.recognized_names?.length) {
    welcomeFields.push({
      label: t('agenda.recognizing'),
      value: agenda.recognized_names.join(', '),
      type: 'text',
    });
  }
  if (agenda?.announcements) {
    welcomeFields.push({
      label: t('agenda.announcements'),
      value: agenda.announcements,
      type: 'multiline',
    });
  }
  welcomeFields.push(
    { label: t('agenda.openingHymn'), value: hymnLookup(agenda?.opening_hymn_id ?? null), type: 'hymn' },
    { label: t('agenda.openingPrayer'), value: agenda?.opening_prayer_name ?? '', type: 'text' },
  );
  cards.push({ title: t('agenda.presiding'), fields: welcomeFields });

  // Card 2: Designations & Sacrament
  const designationFields: PresentationField[] = [];
  if (agenda?.sustaining_releasing) {
    designationFields.push({
      label: t('agenda.wardBusiness'),
      value: agenda.sustaining_releasing,
      type: 'multiline',
    });
  }
  if (agenda?.has_baby_blessing && agenda?.baby_blessing_names) {
    designationFields.push({
      label: t('agenda.babyBlessing', 'Baby Blessing'),
      value: agenda.baby_blessing_names,
      type: 'text',
    });
  }
  if (agenda?.has_baptism_confirmation && agenda?.baptism_confirmation_names) {
    designationFields.push({
      label: t('agenda.baptismConfirmation', 'Baptism Confirmation'),
      value: agenda.baptism_confirmation_names,
      type: 'text',
    });
  }
  designationFields.push({
    label: t('agenda.sacramentHymn'),
    value: hymnLookup(agenda?.sacrament_hymn_id ?? null),
    type: 'hymn',
  });
  cards.push({ title: t('agenda.wardBusiness'), fields: designationFields });

  if (!isSpecial) {
    // Card 3: Speeches 1+2
    const speech1 = speeches.find((s) => s.position === 1);
    const speech2 = speeches.find((s) => s.position === 2);

    const speaker1Name = agenda?.speaker_1_override ?? speech1?.speaker_name ?? '';
    const speaker2Name = agenda?.speaker_2_override ?? speech2?.speaker_name ?? '';

    const speechFields: PresentationField[] = [
      { label: `1\u00BA ${t('speeches.speaker')}`, value: speaker1Name, type: 'text' },
      { label: `2\u00BA ${t('speeches.speaker')}`, value: speaker2Name, type: 'text' },
    ];

    if (agenda?.has_special_presentation) {
      speechFields.push({
        label: t('agenda.musicalNumber'),
        value: agenda?.special_presentation_description ?? '',
        type: 'text',
      });
    } else {
      speechFields.push({
        label: t('agenda.intermediateHymn', 'Intermediate Hymn'),
        value: hymnLookup(agenda?.intermediate_hymn_id ?? null),
        type: 'hymn',
      });
    }
    cards.push({ title: t('speeches.title'), fields: speechFields });

    // Card 4: Last Speech
    const speech3 = speeches.find((s) => s.position === 3);
    const speaker3Name = agenda?.speaker_3_override ?? speech3?.speaker_name ?? '';
    const lastFields: PresentationField[] = [
      { label: `${t('speeches.lastSpeech')} - ${t('speeches.speaker')}`, value: speaker3Name, type: 'text' },
      { label: t('agenda.closingHymn'), value: hymnLookup(agenda?.closing_hymn_id ?? null), type: 'hymn' },
      { label: t('agenda.closingPrayer'), value: agenda?.closing_prayer_name ?? '', type: 'text' },
    ];
    cards.push({ title: t('agenda.closingHymn'), fields: lastFields });
  } else {
    // Card 3: Special Meeting (closing)
    const specialFields: PresentationField[] = [
      {
        label: t('agenda.meetingType', 'Meeting Type'),
        value: exception?.reason ? t(`sundayExceptions.${exception.reason}`, exception.reason) : '',
        type: 'text',
      },
      { label: t('agenda.closingHymn'), value: hymnLookup(agenda?.closing_hymn_id ?? null), type: 'hymn' },
      { label: t('agenda.closingPrayer'), value: agenda?.closing_prayer_name ?? '', type: 'text' },
    ];
    cards.push({ title: t('agenda.closingHymn'), fields: specialFields });
  }

  return cards;
}

// --- Hook ---

/**
 * Load all data needed for Presentation Mode.
 */
export function usePresentationData(sundayDate: string) {
  const locale = getCurrentLanguage();
  const { data: agenda, isLoading: agendaLoading } = useAgenda(sundayDate);
  const { data: speeches, isLoading: speechesLoading } = useSpeeches({
    start: sundayDate,
    end: sundayDate,
  });
  const { data: exceptions, isLoading: exceptionsLoading } = useSundayExceptions(
    sundayDate,
    sundayDate
  );
  const { data: allHymns } = useHymns(locale);
  const { data: sacramentalHymns } = useSacramentalHymns(locale);

  const exception = useMemo(() => {
    return exceptions?.find((e) => e.date === sundayDate) ?? null;
  }, [exceptions, sundayDate]);

  const isSpecial = isSpecialMeeting(exception?.reason ?? null);

  const hymnLookup = useMemo(() => {
    const allMap = new Map<string, Hymn>();
    for (const h of allHymns ?? []) {
      allMap.set(h.id, h);
    }
    for (const h of sacramentalHymns ?? []) {
      allMap.set(h.id, h);
    }
    return (id: string | null): string => {
      if (!id) return '';
      const hymn = allMap.get(id);
      return hymn ? formatHymnDisplay(hymn) : '';
    };
  }, [allHymns, sacramentalHymns]);

  const isLoading = agendaLoading || speechesLoading || exceptionsLoading;

  return {
    agenda,
    speeches: speeches ?? [],
    exception,
    isSpecial,
    isLoading,
    hymnLookup,
    sundayDate,
  };
}
