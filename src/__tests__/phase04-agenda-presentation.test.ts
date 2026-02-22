/**
 * PHASE-04 extended tests: Agenda filtering, presentation mode cards, and AccordionCard logic.
 */

import { describe, it, expect } from 'vitest';
import {
  isExcludedFromAgenda,
  isSpecialMeeting,
  EXCLUDED_EXCEPTION_TYPES,
  agendaKeys,
  type AgendaUpdateInput,
} from '../hooks/useAgenda';
import {
  isTodaySunday,
  getTodaySundayDate,
  buildPresentationCards,
  type PresentationCard,
  type PresentationField,
} from '../hooks/usePresentationMode';
import type { SundayAgenda, Speech, SundayException, SundayExceptionReason } from '../types/database';

// --- Factories ---

function makeAgenda(overrides: Partial<SundayAgenda> = {}): SundayAgenda {
  return {
    id: 'ag-1',
    ward_id: 'w-1',
    sunday_date: '2026-03-01',
    presiding_name: 'Bishop Smith',
    presiding_actor_id: 'a-1',
    conducting_name: 'Brother Jones',
    conducting_actor_id: 'a-2',
    recognized_names: null,
    announcements: null,
    pianist_name: 'Sister Keys',
    pianist_actor_id: 'a-3',
    conductor_name: 'Brother Music',
    conductor_actor_id: 'a-4',
    opening_hymn_id: 'h-1',
    opening_prayer_member_id: 'm-p1',
    opening_prayer_name: 'Sister Brown',
    sustaining_releasing: null,
    has_baby_blessing: false,
    baby_blessing_names: null,
    has_baptism_confirmation: false,
    baptism_confirmation_names: null,
    has_stake_announcements: false,
    sacrament_hymn_id: 'h-2',
    has_special_presentation: false,
    special_presentation_description: null,
    intermediate_hymn_id: 'h-3',
    speaker_1_override: null,
    speaker_2_override: null,
    speaker_3_override: null,
    has_second_speech: true,
    closing_hymn_id: 'h-4',
    closing_prayer_member_id: 'm-p2',
    closing_prayer_name: 'Brother White',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeSpeech(position: number, overrides: Partial<Speech> = {}): Speech {
  return {
    id: `sp-${position}`,
    ward_id: 'w-1',
    sunday_date: '2026-03-01',
    position,
    member_id: `m-${position}`,
    speaker_name: `Speaker ${position}`,
    speaker_phone: '+5511999999999',
    topic_title: `Topic ${position}`,
    topic_link: null,
    topic_collection: 'Collection',
    status: 'assigned_confirmed',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

const mockT = (key: string, fallback?: string) => fallback ?? key;
const mockHymnLookup = (id: string | null) => (id ? `Hymn-${id}` : '');

describe('PHASE-04: Agenda exception filtering exhaustive', () => {
  // All 6 SundayExceptionReason values
  const ALL_REASONS: SundayExceptionReason[] = [
    'testimony_meeting',
    'general_conference',
    'stake_conference',
    'ward_conference',
    'primary_presentation',
    'other',
  ];

  describe('isExcludedFromAgenda covers all exception types', () => {
    const expectedExclusion: Record<SundayExceptionReason, boolean> = {
      general_conference: true,
      stake_conference: true,
      testimony_meeting: false,
      ward_conference: false,
      primary_presentation: false,
      other: false,
    };

    for (const reason of ALL_REASONS) {
      it(`${reason} -> excluded=${expectedExclusion[reason]}`, () => {
        expect(isExcludedFromAgenda(reason)).toBe(expectedExclusion[reason]);
      });
    }
  });

  describe('isSpecialMeeting covers all exception types', () => {
    const expectedSpecial: Record<SundayExceptionReason, boolean> = {
      testimony_meeting: true,
      ward_conference: true,
      primary_presentation: true,
      other: true,
      general_conference: false,
      stake_conference: false,
    };

    for (const reason of ALL_REASONS) {
      it(`${reason} -> special=${expectedSpecial[reason]}`, () => {
        expect(isSpecialMeeting(reason)).toBe(expectedSpecial[reason]);
      });
    }
  });

  describe('Excluded + Special are mutually exclusive', () => {
    for (const reason of ALL_REASONS) {
      it(`${reason} is not both excluded and special`, () => {
        const excluded = isExcludedFromAgenda(reason);
        const special = isSpecialMeeting(reason);
        expect(excluded && special).toBe(false);
      });
    }
  });

  describe('Categorization is exhaustive (every type falls into one category)', () => {
    for (const reason of ALL_REASONS) {
      it(`${reason} is excluded, special, or normal`, () => {
        const excluded = isExcludedFromAgenda(reason);
        const special = isSpecialMeeting(reason);
        const normal = !excluded && !special;
        // Exactly one should be true (XOR-like: exactly 1 of 3)
        const count = [excluded, special, normal].filter(Boolean).length;
        expect(count).toBe(1);
      });
    }
  });
});

describe('PHASE-04: buildPresentationCards detailed validation', () => {
  describe('Normal meeting card structure', () => {
    it('Card 1 (Welcome) includes presiding, conducting, hymn, and prayer', () => {
      const agenda = makeAgenda();
      const cards = buildPresentationCards(agenda, [], null, mockHymnLookup, mockT);

      const welcome = cards[0];
      const labels = welcome.fields.map((f) => f.label);
      expect(labels).toContain('agenda.presiding');
      expect(labels).toContain('agenda.conducting');
      expect(labels).toContain('agenda.openingHymn');
      expect(labels).toContain('agenda.openingPrayer');
    });

    it('Card 1 includes recognized names when present', () => {
      const agenda = makeAgenda({ recognized_names: ['Visitor A', 'Visitor B'] });
      const cards = buildPresentationCards(agenda, [], null, mockHymnLookup, mockT);

      const welcome = cards[0];
      const recognizeField = welcome.fields.find((f) => f.label === 'agenda.recognizing');
      expect(recognizeField).toBeDefined();
      expect(recognizeField?.value).toBe('Visitor A\nVisitor B');
    });

    it('Card 1 excludes recognized names when null', () => {
      const agenda = makeAgenda({ recognized_names: null });
      const cards = buildPresentationCards(agenda, [], null, mockHymnLookup, mockT);

      const welcome = cards[0];
      const recognizeField = welcome.fields.find((f) => f.label === 'agenda.recognizing');
      expect(recognizeField).toBeUndefined();
    });

    it('Card 1 includes announcements when present', () => {
      const agenda = makeAgenda({ announcements: 'Ward picnic Saturday' });
      const cards = buildPresentationCards(agenda, [], null, mockHymnLookup, mockT);

      const welcome = cards[0];
      const announcementField = welcome.fields.find((f) => f.label === 'agenda.announcements');
      expect(announcementField).toBeDefined();
      expect(announcementField?.value).toBe('Ward picnic Saturday');
      expect(announcementField?.type).toBe('multiline');
    });

    it('Card 2 (Designations) includes sacrament hymn', () => {
      const agenda = makeAgenda();
      const cards = buildPresentationCards(agenda, [], null, mockHymnLookup, mockT);

      const designations = cards[1];
      const sacramentField = designations.fields.find((f) => f.label === 'agenda.sacramentHymn');
      expect(sacramentField).toBeDefined();
      expect(sacramentField?.value).toBe('Hymn-h-2');
    });

    it('Card 2 includes baby blessing when enabled', () => {
      const agenda = makeAgenda({
        has_baby_blessing: true,
        baby_blessing_names: 'Baby John',
      });
      const cards = buildPresentationCards(agenda, [], null, mockHymnLookup, mockT);

      const designations = cards[1];
      const blessingField = designations.fields.find((f) => f.label.includes('Baby Blessing'));
      expect(blessingField).toBeDefined();
      expect(blessingField?.value).toBe('Baby John');
    });

    it('Card 2 excludes baby blessing when disabled', () => {
      const agenda = makeAgenda({ has_baby_blessing: false });
      const cards = buildPresentationCards(agenda, [], null, mockHymnLookup, mockT);

      const designations = cards[1];
      const blessingField = designations.fields.find((f) => f.label.includes('Baby Blessing'));
      expect(blessingField).toBeUndefined();
    });

    it('Card 3 (Speeches 1+2) uses ordinal indicator U+00BA', () => {
      const agenda = makeAgenda();
      const speeches = [makeSpeech(1), makeSpeech(2)];
      const cards = buildPresentationCards(agenda, speeches, null, mockHymnLookup, mockT);

      const speechCard = cards[2];
      const labels = speechCard.fields.map((f) => f.label);
      expect(labels[0]).toContain('\u00BA'); // ordinal indicator
      expect(labels[1]).toContain('\u00BA');
    });

    it('Card 4 (Last Speech) includes closing hymn and prayer', () => {
      const agenda = makeAgenda();
      const speeches = [makeSpeech(1), makeSpeech(2), makeSpeech(3)];
      const cards = buildPresentationCards(agenda, speeches, null, mockHymnLookup, mockT);

      const lastCard = cards[3];
      const labels = lastCard.fields.map((f) => f.label);
      expect(labels).toContain('agenda.closingHymn');
      expect(labels).toContain('agenda.closingPrayer');

      const closingPrayer = lastCard.fields.find((f) => f.label === 'agenda.closingPrayer');
      expect(closingPrayer?.value).toBe('Brother White');
    });
  });

  describe('Special meeting card structure', () => {
    const exception: SundayException = {
      id: 'ex-1',
      ward_id: 'w-1',
      date: '2026-03-01',
      reason: 'ward_conference',
    };

    it('has exactly 3 cards', () => {
      const agenda = makeAgenda();
      const cards = buildPresentationCards(agenda, [], exception, mockHymnLookup, mockT);
      expect(cards).toHaveLength(3);
    });

    it('Card 3 includes meeting type from exception reason', () => {
      const agenda = makeAgenda();
      const cards = buildPresentationCards(agenda, [], exception, mockHymnLookup, mockT);

      const lastCard = cards[2];
      const typeField = lastCard.fields.find((f) => f.label.includes('Meeting Type'));
      expect(typeField).toBeDefined();
      expect(typeField?.value).toContain('ward_conference');
    });

    it('Card 3 includes closing hymn and prayer', () => {
      const agenda = makeAgenda();
      const cards = buildPresentationCards(agenda, [], exception, mockHymnLookup, mockT);

      const lastCard = cards[2];
      const labels = lastCard.fields.map((f) => f.label);
      expect(labels).toContain('agenda.closingHymn');
      expect(labels).toContain('agenda.closingPrayer');
    });
  });

  describe('Edge cases', () => {
    it('all null agenda fields produce empty strings (not crashes)', () => {
      const agenda = makeAgenda({
        presiding_name: null,
        conducting_name: null,
        opening_prayer_name: null,
        closing_prayer_name: null,
        opening_hymn_id: null,
        sacrament_hymn_id: null,
        intermediate_hymn_id: null,
        closing_hymn_id: null,
      });
      const cards = buildPresentationCards(agenda, [], null, mockHymnLookup, mockT);
      expect(cards).toHaveLength(4);

      // All text values should be empty strings, not null/undefined
      for (const card of cards) {
        for (const field of card.fields) {
          expect(typeof field.value).toBe('string');
        }
      }
    });

    it('empty speeches array produces empty speaker names', () => {
      const agenda = makeAgenda();
      const cards = buildPresentationCards(agenda, [], null, mockHymnLookup, mockT);

      const speechCard = cards[2];
      const speakerFields = speechCard.fields.filter((f) => f.label.includes('speeches.speaker'));
      for (const field of speakerFields) {
        expect(field.value).toBe('');
      }
    });
  });
});

describe('PHASE-04: agendaKeys structure', () => {
  it('bySunday includes both wardId and date', () => {
    const key = agendaKeys.bySunday('w-1', '2026-03-01');
    expect(key).toEqual(['agendas', 'bySunday', 'w-1', '2026-03-01']);
  });

  it('byDateRange includes ward, start, and end', () => {
    const key = agendaKeys.byDateRange('w-1', '2026-01-01', '2026-12-31');
    expect(key).toEqual(['agendas', 'byDateRange', 'w-1', '2026-01-01', '2026-12-31']);
  });

  it('different wards produce different keys', () => {
    const key1 = agendaKeys.bySunday('w-1', '2026-03-01');
    const key2 = agendaKeys.bySunday('w-2', '2026-03-01');
    expect(key1).not.toEqual(key2);
  });
});

describe('PHASE-04: AgendaUpdateInput type', () => {
  it('allows all nullable agenda fields', () => {
    const input: AgendaUpdateInput = {
      presiding_name: 'New Bishop',
      presiding_actor_id: 'a-new',
      conducting_name: null,
      conducting_actor_id: null,
      announcements: 'Some announcement',
      opening_hymn_id: 'h-5',
      has_baby_blessing: true,
      baby_blessing_names: 'Baby Jane',
    };
    expect(input.presiding_name).toBe('New Bishop');
    expect(input.conducting_name).toBeNull();
  });

  it('does not allow id, ward_id, sunday_date, created_at, updated_at', () => {
    const input: AgendaUpdateInput = {
      presiding_name: 'Test',
    };
    // These should not be assignable (compile-time check; runtime sanity)
    expect('id' in input).toBe(false);
    expect('ward_id' in input).toBe(false);
    expect('sunday_date' in input).toBe(false);
  });
});

describe('PHASE-04: isTodaySunday and getTodaySundayDate consistency', () => {
  it('if isTodaySunday is true, getTodaySundayDate returns today', () => {
    if (isTodaySunday()) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      expect(getTodaySundayDate()).toBe(`${yyyy}-${mm}-${dd}`);
    }
  });

  it('getTodaySundayDate always returns a Sunday', () => {
    const result = getTodaySundayDate();
    const [y, m, d] = result.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    expect(date.getDay()).toBe(0);
  });

  it('getTodaySundayDate is today or in the future', () => {
    const result = getTodaySundayDate();
    const sundayDate = new Date(result + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expect(sundayDate.getTime()).toBeGreaterThanOrEqual(today.getTime());
  });
});
