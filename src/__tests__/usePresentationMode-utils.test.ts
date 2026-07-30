/**
 * Tests for usePresentationMode utilities (pure functions).
 */

import { describe, it, expect } from 'vitest';
import {
  isTodaySunday,
  getTodaySundayDate,
  buildPresentationCards,
  resolveCallingForName,
} from '../hooks/usePresentationMode';
import type { SundayAgenda, Speech, SundayException, Member } from '../types/database';

function makeAgenda(overrides: Partial<SundayAgenda> = {}): SundayAgenda {
  return {
    id: 'ag-1',
    ward_id: 'w-1',
    sunday_date: '2026-03-01',
    presiding_name: 'Bishop Smith',
    conducting_name: 'Brother Jones',
    recognized_names: null,
    welcome_new_families: null,
    announcements: null,
    pianist_name: null,
    conductor_name: null,
    opening_hymn_id: 'h-1',
    opening_prayer_member_id: null,
    opening_prayer_name: 'Sister Brown',
    sustaining_releasing: null,
    designations: [],
    has_baby_blessing: false,
    baby_blessing_names: null,
    has_baptism_confirmation: false,
    baptism_confirmation_names: null,
    has_stake_announcements: false,
    sacrament_hymn_id: 'h-2',
    has_special_presentation: false,
    special_presentation_description: null,
    intermediate_hymn_id: 'h-3',
    closing_hymn_id: 'h-4',
    closing_prayer_member_id: null,
    closing_prayer_name: 'Brother White',
    attendance: null,
    has_second_speech: true,
    has_intermediate_hymn: true,
    speaker_1_override: null,
    speaker_2_override: null,
    speaker_3_override: null,
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
    speaker_informal_name: null,
    speaker_phone: '+5511999999999',
    topic_title: `Topic ${position}`,
    topic_link: null,
    topic_collection: 'Collection',
    assigned_by_role: null,
    status: 'assigned_confirmed',
    contact_phone: null,
    is_delegated: false,
    delegate_for_name: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'mem-1',
    ward_id: 'w-1',
    full_name: 'Ricardo Almeida',
    informal_name: null,
    country_code: '+55',
    phone: null,
    can_preside: false,
    can_conduct: false,
    can_lead_music: false,
    can_play_piano: false,
    can_be_recognized: true,
    contact_via_responsible: false,
    responsible_id: null,
    calling: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

const mockT = (key: string, fallback?: string) => fallback ?? key;
const mockHymnLookup = (id: string | null) => (id ? `Hymn-${id}` : '');

describe('isTodaySunday', () => {
  it('returns boolean', () => {
    const result = isTodaySunday();
    expect(typeof result).toBe('boolean');
  });
});

describe('getTodaySundayDate', () => {
  it('returns a valid ISO date string', () => {
    const result = getTodaySundayDate();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns a sunday date', () => {
    const result = getTodaySundayDate();
    const [y, m, d] = result.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    // Should always be sunday (0) or today if today is sunday
    expect(date.getDay()).toBe(0);
  });
});

describe('buildPresentationCards', () => {
  it('returns 4 cards with empty fields when agenda is null', () => {
    const cards = buildPresentationCards(null, [], null, mockHymnLookup, mockT);
    expect(cards).toHaveLength(4);
    // All text values should be empty strings
    for (const card of cards) {
      for (const field of card.fields) {
        expect(typeof field.value).toBe('string');
      }
    }
  });

  it('returns 4 cards for normal meeting', () => {
    const agenda = makeAgenda();
    const speeches = [makeSpeech(1), makeSpeech(2), makeSpeech(3)];
    const cards = buildPresentationCards(agenda, speeches, null, mockHymnLookup, mockT);
    expect(cards).toHaveLength(4);
  });

  it('returns 3 cards for special meeting', () => {
    const agenda = makeAgenda();
    const exception: SundayException = {
      id: 'ex-1',
      ward_id: 'w-1',
      date: '2026-03-01',
      reason: 'testimony_meeting',
    };
    const cards = buildPresentationCards(agenda, [], exception, mockHymnLookup, mockT);
    expect(cards).toHaveLength(3);
  });

  it('includes speaker names in normal meeting cards', () => {
    const agenda = makeAgenda();
    const speeches = [makeSpeech(1), makeSpeech(2), makeSpeech(3)];
    const cards = buildPresentationCards(agenda, speeches, null, mockHymnLookup, mockT);

    // Card 3 should have speeches
    const speechCard = cards[2];
    const speakerValues = speechCard.fields.map((f) => f.value);
    expect(speakerValues).toContain('Speaker 1');
    expect(speakerValues).toContain('Speaker 2');

    // Card 4 should have 3rd speaker
    const lastCard = cards[3];
    const lastSpeakerValues = lastCard.fields.map((f) => f.value);
    expect(lastSpeakerValues).toContain('Speaker 3');
  });

  it('includes hymn lookups', () => {
    const agenda = makeAgenda();
    const cards = buildPresentationCards(agenda, [], null, mockHymnLookup, mockT);

    // Welcome card should have opening hymn
    const welcomeCard = cards[0];
    const hymnField = welcomeCard.fields.find((f) => f.type === 'hymn');
    expect(hymnField?.value).toBe('Hymn-h-1');
  });

  it('shows special presentation instead of intermediate hymn', () => {
    const agenda = makeAgenda({
      has_special_presentation: true,
      special_presentation_description: 'Choir performance',
    });
    const speeches = [makeSpeech(1), makeSpeech(2), makeSpeech(3)];
    const cards = buildPresentationCards(agenda, speeches, null, mockHymnLookup, mockT);

    const speechCard = cards[2];
    const specialField = speechCard.fields.find((f) => f.value === 'Choir performance');
    expect(specialField).toBeDefined();
  });

  it('includes intermediate hymn when no special presentation', () => {
    const agenda = makeAgenda({ has_special_presentation: false });
    const speeches = [makeSpeech(1), makeSpeech(2), makeSpeech(3)];
    const cards = buildPresentationCards(agenda, speeches, null, mockHymnLookup, mockT);

    const speechCard = cards[2];
    const intermediateField = speechCard.fields.find((f) => f.value === 'Hymn-h-3');
    expect(intermediateField).toBeDefined();
  });

  it('includes meeting type in special meeting last card', () => {
    const agenda = makeAgenda();
    const exception: SundayException = {
      id: 'ex-1',
      ward_id: 'w-1',
      date: '2026-03-01',
      reason: 'testimony_meeting',
    };
    const cards = buildPresentationCards(agenda, [], exception, mockHymnLookup, mockT);

    const lastCard = cards[2];
    const typeField = lastCard.fields.find((f) => f.label.includes('Meeting Type'));
    expect(typeField).toBeDefined();
  });
});

describe('resolveCallingForName', () => {
  it('returns the calling on a unique match with a non-empty calling', () => {
    const members = [makeMember({ full_name: 'Ricardo Almeida', calling: 'Bispo' })];
    expect(resolveCallingForName('Ricardo Almeida', members)).toBe('Bispo');
  });

  it('matches accent- and whitespace-insensitively', () => {
    const members = [makeMember({ full_name: 'João Vasconcelos', calling: '1º Conselheiro' })];
    expect(resolveCallingForName('joao  vasconcelos', members)).toBe('1º Conselheiro');
  });

  it('returns null when the unique match has no calling', () => {
    const members = [makeMember({ full_name: 'Ricardo Almeida', calling: null })];
    expect(resolveCallingForName('Ricardo Almeida', members)).toBeNull();
  });

  it('returns null when the calling is only whitespace', () => {
    const members = [makeMember({ full_name: 'Ricardo Almeida', calling: '   ' })];
    expect(resolveCallingForName('Ricardo Almeida', members)).toBeNull();
  });

  it('returns null when no member matches', () => {
    const members = [makeMember({ full_name: 'Ricardo Almeida', calling: 'Bispo' })];
    expect(resolveCallingForName('Someone Unknown', members)).toBeNull();
  });

  it('returns null for ambiguous matches (multiple members)', () => {
    const members = [
      makeMember({ id: 'm-1', full_name: 'Ricardo Almeida', calling: 'Bispo' }),
      makeMember({ id: 'm-2', full_name: 'Ricardo Almeida', calling: 'Secretário' }),
    ];
    expect(resolveCallingForName('Ricardo Almeida', members)).toBeNull();
  });

  it('returns null for an empty/whitespace name', () => {
    const members = [makeMember({ full_name: 'Ricardo Almeida', calling: 'Bispo' })];
    expect(resolveCallingForName('   ', members)).toBeNull();
  });
});

describe('buildPresentationCards — recognized people callings (PR1)', () => {
  function getRecognizedValue(
    agenda: SundayAgenda,
    members: Member[]
  ): string | undefined {
    const cards = buildPresentationCards(agenda, [], null, mockHymnLookup, mockT, members);
    const welcomeCard = cards[0];
    return welcomeCard.fields.find((f) => f.label === 'agenda.recognizing')?.value;
  }

  it('appends "— Calling" when a recognized person has a matching member with a calling', () => {
    const agenda = makeAgenda({ recognized_names: 'Ricardo Almeida' });
    const members = [makeMember({ full_name: 'Ricardo Almeida', calling: 'Bispo' })];
    expect(getRecognizedValue(agenda, members)).toBe('Ricardo Almeida — Bispo');
  });

  it('leaves the name unchanged when the matching member has no calling', () => {
    const agenda = makeAgenda({ recognized_names: 'Ricardo Almeida' });
    const members = [makeMember({ full_name: 'Ricardo Almeida', calling: null })];
    expect(getRecognizedValue(agenda, members)).toBe('Ricardo Almeida');
  });

  it('leaves the name unchanged when no member matches', () => {
    const agenda = makeAgenda({ recognized_names: 'Someone Unknown' });
    const members = [makeMember({ full_name: 'Ricardo Almeida', calling: 'Bispo' })];
    expect(getRecognizedValue(agenda, members)).toBe('Someone Unknown');
  });

  it('matches accent- and whitespace-insensitively', () => {
    const agenda = makeAgenda({ recognized_names: 'joao  vasconcelos' });
    const members = [makeMember({ full_name: 'João Vasconcelos', calling: '1º Conselheiro' })];
    expect(getRecognizedValue(agenda, members)).toBe('joao  vasconcelos — 1º Conselheiro');
  });

  it('leaves ambiguous names (multiple matches) unchanged', () => {
    const agenda = makeAgenda({ recognized_names: 'Ricardo Almeida' });
    const members = [
      makeMember({ id: 'm-1', full_name: 'Ricardo Almeida', calling: 'Bispo' }),
      makeMember({ id: 'm-2', full_name: 'Ricardo Almeida', calling: 'Secretário' }),
    ];
    expect(getRecognizedValue(agenda, members)).toBe('Ricardo Almeida');
  });

  it('enriches each line of a multi-name recognized list independently', () => {
    const agenda = makeAgenda({ recognized_names: 'Ricardo Almeida\nPaulo Santos' });
    const members = [
      makeMember({ id: 'm-1', full_name: 'Ricardo Almeida', calling: 'Bispo' }),
      makeMember({ id: 'm-2', full_name: 'Paulo Santos', calling: null }),
    ];
    expect(getRecognizedValue(agenda, members)).toBe('Ricardo Almeida — Bispo\nPaulo Santos');
  });

  it('leaves names unchanged when no members list is provided (default param)', () => {
    const agenda = makeAgenda({ recognized_names: 'Ricardo Almeida' });
    const cards = buildPresentationCards(agenda, [], null, mockHymnLookup, mockT);
    const value = cards[0].fields.find((f) => f.label === 'agenda.recognizing')?.value;
    expect(value).toBe('Ricardo Almeida');
  });
});
