/**
 * Hook for Presentation Mode data loading.
 * Loads agenda + speeches for a sunday, determines meeting type,
 * and checks if today is Sunday for button visibility.
 */

import { useMemo } from 'react';
import { useAgenda , isSpecialMeeting } from './useAgenda';
import { useSpeeches } from './useSpeeches';
import { useSundayExceptions } from './useSundayTypes';
import { useHymns, useSacramentalHymns, formatHymnDisplay } from './useHymns';
import { useMembers, normalizeForSearch } from './useMembers';
import { getCurrentLanguage } from '../i18n';
import { toISODateString } from '../lib/dateUtils';
import { formatDesignationSummary, orderDesignations } from '../lib/designations';
import type { SundayAgenda, Speech, SundayException, Hymn, Member } from '../types/database';

// --- Types ---

export interface PresentationCard {
  title: string;
  fields: PresentationField[];
}

export interface PresentationField {
  label: string;
  value: string;
  type: 'text' | 'hymn' | 'multiline' | 'bullet_list';
  /** When true, this field shows a "text to read" icon opening the sacrament-prayer interstitial. */
  sacramentPrayer?: boolean;
  /** When true, this field shows a "text to read" icon opening the designations interstitial. */
  readText?: boolean;
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
 * Normalize a name for accent- and whitespace-insensitive exact matching.
 * Strips diacritics + lowercases (via normalizeForSearch), then trims and
 * collapses internal whitespace so "  João   Silva " matches "Joao Silva".
 */
function normalizeName(name: string): string {
  return normalizeForSearch(name).trim().replace(/\s+/g, ' ');
}

/**
 * Resolve the `calling` (chamado) for a single recognized name. Returns the calling
 * only when EXACTLY ONE member has a matching `full_name` (accent/whitespace-insensitive)
 * AND a non-empty calling; otherwise (ambiguous, no match, or no calling) returns null.
 */
export function resolveCallingForName(name: string, members: Member[]): string | null {
  const key = normalizeName(name);
  if (!key) return null;
  const matches = members.filter((m) => normalizeName(m.full_name) === key);
  if (matches.length !== 1) return null;
  const calling = matches[0].calling?.trim();
  return calling ? calling : null;
}

/**
 * Enrich a newline-joined string of recognized `full_name`s with each person's
 * `calling` (chamado). For each line, if exactly ONE member has a matching
 * `full_name` (accent/whitespace-insensitive) AND a non-empty `calling`, the
 * line becomes "Name — Calling"; otherwise the line is left unchanged.
 * Ambiguous (multiple matches), no match, or no calling → name only.
 * The newline-joined `bullet_list` shape is preserved.
 */
export function enrichRecognizedNames(recognizedNames: string, members: Member[]): string {
  if (!recognizedNames) return recognizedNames;

  return recognizedNames
    .split('\n')
    .map((line) => {
      const calling = resolveCallingForName(line, members);
      return calling ? `${line} — ${calling}` : line;
    })
    .join('\n');
}

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
  t: (key: string, fallback?: string) => string,
  members: Member[] = []
): PresentationCard[] {
  const isSpecial = isSpecialMeeting(exception?.reason ?? null);
  const cards: PresentationCard[] = [];

  // Card 1: Welcome & Announcements
  const welcomeFields: PresentationField[] = [
    { label: t('agenda.presiding'), value: agenda?.presiding_name ?? '', type: 'text' },
    { label: t('agenda.conducting'), value: agenda?.conducting_name ?? '', type: 'text' },
  ];
  if (agenda?.recognized_names) {
    welcomeFields.push({
      label: t('agenda.recognizing'),
      value: enrichRecognizedNames(agenda.recognized_names, members),
      type: 'bullet_list',
    });
  }
  if (agenda?.welcome_new_families) {
    welcomeFields.push({
      label: t('agenda.welcomeNewFamilies'),
      value: agenda.welcome_new_families,
      type: 'bullet_list',
    });
  }
  if (agenda?.announcements) {
    welcomeFields.push({
      label: t('agenda.announcements'),
      value: agenda.announcements,
      type: 'bullet_list',
    });
  }
  welcomeFields.push(
    { label: t('agenda.pianist'), value: agenda?.pianist_name ?? '', type: 'text' },
    { label: t('agenda.conductor'), value: agenda?.conductor_name ?? '', type: 'text' },
  );
  welcomeFields.push(
    { label: t('agenda.openingHymn'), value: hymnLookup(agenda?.opening_hymn_id ?? null), type: 'hymn' },
    { label: t('agenda.openingPrayer'), value: speeches.find(s => s.position === 0)?.speaker_name ?? '', type: 'text' },
  );
  cards.push({ title: t('agenda.sectionWelcome'), fields: welcomeFields });

  // Card 2: Designations & Sacrament
  const designationFields: PresentationField[] = [];
  if (agenda?.designations && agenda.designations.length > 0) {
    designationFields.push({
      label: t('agenda.wardBusiness'),
      value: orderDesignations(agenda.designations)
        .map((d) => formatDesignationSummary(d, t))
        .join('\n'),
      type: 'bullet_list',
      readText: true,
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
  if (agenda?.has_stake_announcements) {
    designationFields.push({
      label: t('agenda.stakeAnnouncements'),
      value: t('presentation.stakeAnnouncementsText'),
      type: 'text',
    });
  }
  designationFields.push({
    label: t('agenda.sacramentHymn'),
    value: hymnLookup(agenda?.sacrament_hymn_id ?? null),
    type: 'hymn',
    sacramentPrayer: true,
  });
  cards.push({ title: t('agenda.sectionSacrament'), fields: designationFields });

  if (!isSpecial) {
    // Card 3: Speeches 1+2 (F118: filter speech 2 when has_second_speech=false)
    const speech1 = speeches.find((s) => s.position === 1);
    const speech2 = speeches.find((s) => s.position === 2);

    const speaker1Name = agenda?.speaker_1_override ?? speech1?.speaker_name ?? '';
    const speaker2Name = agenda?.speaker_2_override ?? speech2?.speaker_name ?? '';

    const speechFields: PresentationField[] = [
      { label: `1\u00BA ${t('speeches.speaker')}`, value: speaker1Name, type: 'text' },
    ];

    // F118: Only show speech 2 if has_second_speech is true (default true)
    if (agenda?.has_second_speech !== false) {
      speechFields.push(
        { label: `2\u00BA ${t('speeches.speaker')}`, value: speaker2Name, type: 'text' },
      );
    }

    if (agenda?.has_special_presentation) {
      speechFields.push({
        label: t('agenda.musicalNumber'),
        value: agenda?.special_presentation_description ?? '',
        type: 'text',
      });
    } else if (agenda?.has_intermediate_hymn !== false) {
      speechFields.push({
        label: t('agenda.intermediateHymn', 'Intermediate Hymn'),
        value: hymnLookup(agenda?.intermediate_hymn_id ?? null),
        type: 'hymn',
      });
    }
    cards.push({ title: t('agenda.sectionFirstSpeeches'), fields: speechFields });

    // Card 4: Last Speech
    const speech3 = speeches.find((s) => s.position === 3);
    const speaker3Name = agenda?.speaker_3_override ?? speech3?.speaker_name ?? '';
    const lastFields: PresentationField[] = [
      { label: t('speeches.lastSpeech'), value: speaker3Name, type: 'text' },
      { label: t('agenda.closingHymn'), value: hymnLookup(agenda?.closing_hymn_id ?? null), type: 'hymn' },
      { label: t('agenda.closingPrayer'), value: speeches.find(s => s.position === 4)?.speaker_name ?? '', type: 'text' },
    ];
    cards.push({ title: t('agenda.sectionLastSpeech'), fields: lastFields });
  } else {
    // Card 3: Special Meeting (closing)
    const specialFields: PresentationField[] = [
      {
        label: t('agenda.meetingType', 'Meeting Type'),
        value: exception?.reason ? t(`sundayExceptions.${exception.reason}`, exception.reason) : '',
        type: 'text',
      },
      { label: t('agenda.closingHymn'), value: hymnLookup(agenda?.closing_hymn_id ?? null), type: 'hymn' },
      { label: t('agenda.closingPrayer'), value: speeches.find(s => s.position === 4)?.speaker_name ?? '', type: 'text' },
    ];

    let specialTitle: string;
    if (exception?.reason === 'testimony_meeting') {
      specialTitle = t('agenda.sectionTestimonies');
    } else if (exception?.reason === 'primary_presentation') {
      specialTitle = t('agenda.sectionPrimaryPresentation');
    } else {
      specialTitle = t('agenda.closingHymn');
    }
    cards.push({ title: specialTitle, fields: specialFields });
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
  const { data: members } = useMembers();

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
    members: members ?? [],
    sundayDate,
  };
}
