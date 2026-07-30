/**
 * Behavioral tests for buildUnifiedCardData (src/lib/unifiedCard.ts) — the pure mapping from a
 * Sunday's agenda/speeches/flags to the UnifiedSundayCard inputs. No React / react-native needed:
 * the helper is pure, so we assert on the returned counts and name-row ordering directly.
 */
import { describe, it, expect } from 'vitest';
import { buildUnifiedCardData } from '../lib/unifiedCard';
import type { Speech, SundayAgenda, SpeechStatus } from '../types/database';

function makeAgenda(over: Partial<SundayAgenda> = {}): SundayAgenda {
  return {
    id: 'ag1',
    ward_id: 'w1',
    sunday_date: '2026-08-02',
    presiding_name: null,
    conducting_name: null,
    recognized_names: null,
    welcome_new_families: null,
    announcements: null,
    pianist_name: null,
    conductor_name: null,
    opening_hymn_id: null,
    opening_prayer_member_id: null,
    opening_prayer_name: null,
    designations: [],
    has_baby_blessing: false,
    baby_blessing_names: null,
    has_baptism_confirmation: false,
    baptism_confirmation_names: null,
    has_stake_announcements: false,
    sacrament_hymn_id: null,
    has_special_presentation: false,
    has_intermediate_hymn: true,
    special_presentation_description: null,
    intermediate_hymn_id: null,
    speaker_1_override: null,
    speaker_2_override: null,
    speaker_3_override: null,
    has_second_speech: true,
    closing_hymn_id: null,
    closing_prayer_member_id: null,
    closing_prayer_name: null,
    attendance: null,
    created_at: '',
    updated_at: '',
    ...over,
  };
}

function makeSpeech(
  position: number,
  over: Partial<Speech> = {}
): Speech {
  return {
    id: `sp${position}`,
    ward_id: 'w1',
    sunday_date: '2026-08-02',
    position,
    member_id: null,
    speaker_name: null,
    speaker_informal_name: null,
    speaker_phone: null,
    topic_title: null,
    topic_link: null,
    topic_collection: null,
    assigned_by_role: null,
    status: 'not_assigned' as SpeechStatus,
    contact_phone: null,
    is_delegated: false,
    delegate_for_name: null,
    created_at: '',
    updated_at: '',
    ...over,
  };
}

describe('buildUnifiedCardData — roles', () => {
  it('marks each role filled when its agenda name is non-empty', () => {
    const { roles } = buildUnifiedCardData({
      agenda: makeAgenda({ presiding_name: 'Bishop', pianist_name: 'Pia' }),
      speeches: [],
      exceptionReason: null,
      managePrayers: false,
    });
    expect(roles).toEqual({ preside: true, conduct: false, piano: true, lead: false });
  });

  it('treats a null agenda as all roles unfilled', () => {
    const { roles } = buildUnifiedCardData({
      agenda: null,
      speeches: [],
      exceptionReason: null,
      managePrayers: false,
    });
    expect(roles).toEqual({ preside: false, conduct: false, piano: false, lead: false });
  });
});

describe('buildUnifiedCardData — speakers count (has_second_speech)', () => {
  it('counts positions 1..3 when has_second_speech is on (total 3)', () => {
    const { speakers } = buildUnifiedCardData({
      agenda: makeAgenda({ has_second_speech: true }),
      speeches: [
        makeSpeech(1, { speaker_name: 'A' }),
        makeSpeech(2, { speaker_name: null }),
        makeSpeech(3, { speaker_name: 'C' }),
      ],
      exceptionReason: null,
      managePrayers: false,
    });
    expect(speakers).toEqual({ done: 2, total: 3 });
  });

  it('counts only positions 1 and 3 when has_second_speech is off (total 2)', () => {
    const { speakers } = buildUnifiedCardData({
      agenda: makeAgenda({ has_second_speech: false }),
      speeches: [
        makeSpeech(1, { speaker_name: 'A' }),
        makeSpeech(2, { speaker_name: 'B' }), // pos 2 ignored when off
        makeSpeech(3, { speaker_name: null }),
      ],
      exceptionReason: null,
      managePrayers: false,
    });
    expect(speakers).toEqual({ done: 1, total: 2 });
  });

  it('counts an agenda speaker override even without a speech speaker_name', () => {
    const { speakers } = buildUnifiedCardData({
      agenda: makeAgenda({ speaker_2_override: 'Guest' }),
      speeches: [makeSpeech(1, { speaker_name: 'A' })],
      exceptionReason: null,
      managePrayers: false,
    });
    expect(speakers).toEqual({ done: 2, total: 3 });
  });
});

describe('buildUnifiedCardData — prayers count', () => {
  it('counts positions 0/4 with a speaker (out of 2)', () => {
    const { prayers } = buildUnifiedCardData({
      agenda: makeAgenda(),
      speeches: [makeSpeech(0, { speaker_name: 'Opener' }), makeSpeech(4)],
      exceptionReason: null,
      managePrayers: true,
    });
    expect(prayers).toEqual({ done: 1, total: 2 });
  });
});

describe('buildUnifiedCardData — hymns count', () => {
  it('uses total 4 for a regular Sunday with an intermediate hymn', () => {
    const { hymns } = buildUnifiedCardData({
      agenda: makeAgenda({
        opening_hymn_id: 'h1',
        sacrament_hymn_id: 'h2',
        closing_hymn_id: 'h3',
        has_intermediate_hymn: true,
        intermediate_hymn_id: 'h4',
      }),
      speeches: [],
      exceptionReason: null,
      managePrayers: false,
    });
    expect(hymns).toEqual({ done: 4, total: 4 });
  });

  it('uses total 3 when intermediate hymn is disabled', () => {
    const { hymns } = buildUnifiedCardData({
      agenda: makeAgenda({ opening_hymn_id: 'h1', has_intermediate_hymn: false }),
      speeches: [],
      exceptionReason: null,
      managePrayers: false,
    });
    expect(hymns).toEqual({ done: 1, total: 3 });
  });

  it('uses total 3 when a special presentation replaces the intermediate hymn', () => {
    const { hymns } = buildUnifiedCardData({
      agenda: makeAgenda({ has_special_presentation: true, has_intermediate_hymn: true }),
      speeches: [],
      exceptionReason: null,
      managePrayers: false,
    });
    expect(hymns.total).toBe(3);
  });

  it('uses total 3 for a testimony meeting (no intermediate)', () => {
    const { hymns } = buildUnifiedCardData({
      agenda: makeAgenda({ has_intermediate_hymn: true, intermediate_hymn_id: 'h4' }),
      speeches: [],
      exceptionReason: 'testimony_meeting',
      managePrayers: false,
    });
    expect(hymns.total).toBe(3);
  });
});

describe('buildUnifiedCardData — name rows (ordering & variants)', () => {
  it('regular + managePrayers: prayer0, speakers 1..3, prayer4 in order', () => {
    const { nameRows } = buildUnifiedCardData({
      agenda: makeAgenda({ has_second_speech: true }),
      speeches: [
        makeSpeech(0, { speaker_name: 'Opener', status: 'assigned_confirmed' }),
        makeSpeech(1, { speaker_name: 'A' }),
        makeSpeech(2, { speaker_name: null }),
        makeSpeech(3, { speaker_name: 'C' }),
        makeSpeech(4, { speaker_name: 'Closer' }),
      ],
      exceptionReason: null,
      managePrayers: true,
    });
    expect(nameRows.map((r) => r.key)).toEqual([
      'prayer-0',
      'speaker-1',
      'speaker-2',
      'speaker-3',
      'prayer-4',
    ]);
    expect(nameRows[0]).toMatchObject({ kind: 'prayer', name: 'Opener', status: 'assigned_confirmed' });
    expect(nameRows[1]).toMatchObject({ kind: 'speaker', name: 'A' });
    expect(nameRows[2]).toMatchObject({ kind: 'speaker', name: null });
  });

  it('regular + managePrayers off: speaker rows only (honoring has_second_speech off)', () => {
    const { nameRows } = buildUnifiedCardData({
      agenda: makeAgenda({ has_second_speech: false }),
      speeches: [makeSpeech(1, { speaker_name: 'A' }), makeSpeech(3, { speaker_name: 'C' })],
      exceptionReason: null,
      managePrayers: false,
    });
    expect(nameRows.map((r) => r.key)).toEqual(['speaker-1', 'speaker-3']);
  });

  it('testimony + managePrayers: only prayer rows', () => {
    const { nameRows } = buildUnifiedCardData({
      agenda: makeAgenda(),
      speeches: [makeSpeech(0, { speaker_name: 'Opener' }), makeSpeech(4)],
      exceptionReason: 'testimony_meeting',
      managePrayers: true,
    });
    expect(nameRows.map((r) => r.key)).toEqual(['prayer-0', 'prayer-4']);
  });

  it('testimony + managePrayers off: no rows', () => {
    const { nameRows } = buildUnifiedCardData({
      agenda: makeAgenda(),
      speeches: [],
      exceptionReason: 'testimony_meeting',
      managePrayers: false,
    });
    expect(nameRows).toEqual([]);
  });

  it('no-sacrament Sunday: no rows and speakers {0,0}', () => {
    const result = buildUnifiedCardData({
      agenda: makeAgenda(),
      speeches: [],
      exceptionReason: 'general_conference',
      managePrayers: true,
    });
    expect(result.nameRows).toEqual([]);
    expect(result.speakers).toEqual({ done: 0, total: 0 });
  });
});
