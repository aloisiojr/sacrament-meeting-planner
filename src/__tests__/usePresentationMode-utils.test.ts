/**
 * Tests for usePresentationMode utilities (pure functions).
 */

import { describe, it, expect, vi } from 'vitest';
import {
  isTodaySunday,
  getTodaySundayDate,
  buildPresentationCards,
} from '../hooks/usePresentationMode';
import type { SundayAgenda, Speech, SundayException } from '../types/database';

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
    pianist_name: null,
    pianist_actor_id: null,
    conductor_name: null,
    conductor_actor_id: null,
    opening_hymn_id: 'h-1',
    opening_prayer_member_id: null,
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
    closing_hymn_id: 'h-4',
    closing_prayer_member_id: null,
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
  it('returns empty array when agenda is null', () => {
    const cards = buildPresentationCards(null, [], null, mockHymnLookup, mockT);
    expect(cards).toEqual([]);
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
