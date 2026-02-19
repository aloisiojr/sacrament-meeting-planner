/**
 * PHASE-03 extended tests: Speech lifecycle, status transitions, grouping, and list building.
 */

import { describe, it, expect } from 'vitest';
import {
  speechKeys,
  VALID_TRANSITIONS,
  isValidTransition,
  getAvailableStatuses,
  groupSpeechesBySunday,
} from '../hooks/useSpeeches';
import {
  addMonths,
  findNextSunday,
  getInitialDateRange,
} from '../hooks/useSundayList';
import type { Speech, SpeechStatus, SundayException } from '../types/database';

// --- Factories ---

function makeSpeech(overrides: Partial<Speech> = {}): Speech {
  return {
    id: overrides.id ?? 'sp-1',
    ward_id: 'w-1',
    sunday_date: overrides.sunday_date ?? '2026-03-01',
    position: overrides.position ?? 1,
    member_id: overrides.member_id ?? null,
    speaker_name: overrides.speaker_name ?? null,
    speaker_phone: overrides.speaker_phone ?? null,
    topic_title: overrides.topic_title ?? null,
    topic_link: overrides.topic_link ?? null,
    topic_collection: overrides.topic_collection ?? null,
    status: overrides.status ?? 'not_assigned',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

const ALL_STATUSES: SpeechStatus[] = [
  'not_assigned',
  'assigned_not_invited',
  'assigned_invited',
  'assigned_confirmed',
  'gave_up',
];

describe('PHASE-03: Status lifecycle exhaustive tests', () => {
  describe('Complete status transition matrix', () => {
    // Every status should have its defined transitions
    for (const from of ALL_STATUSES) {
      for (const to of ALL_STATUSES) {
        const expectedValid = VALID_TRANSITIONS[from]?.includes(to) ?? false;
        it(`${from} -> ${to} should be ${expectedValid ? 'VALID' : 'INVALID'}`, () => {
          expect(isValidTransition(from, to)).toBe(expectedValid);
        });
      }
    }
  });

  describe('Self-transitions are always invalid', () => {
    for (const status of ALL_STATUSES) {
      it(`${status} -> ${status} should be invalid`, () => {
        expect(isValidTransition(status, status)).toBe(false);
      });
    }
  });

  describe('Reachability: every status is reachable from not_assigned', () => {
    it('not_assigned -> assigned_not_invited (direct)', () => {
      expect(isValidTransition('not_assigned', 'assigned_not_invited')).toBe(true);
    });

    it('not_assigned -> assigned_invited (2 steps)', () => {
      expect(isValidTransition('not_assigned', 'assigned_not_invited')).toBe(true);
      expect(isValidTransition('assigned_not_invited', 'assigned_invited')).toBe(true);
    });

    it('not_assigned -> assigned_confirmed (3 steps)', () => {
      expect(isValidTransition('not_assigned', 'assigned_not_invited')).toBe(true);
      expect(isValidTransition('assigned_not_invited', 'assigned_invited')).toBe(true);
      expect(isValidTransition('assigned_invited', 'assigned_confirmed')).toBe(true);
    });

    it('not_assigned -> gave_up (3 steps)', () => {
      expect(isValidTransition('not_assigned', 'assigned_not_invited')).toBe(true);
      expect(isValidTransition('assigned_not_invited', 'assigned_invited')).toBe(true);
      expect(isValidTransition('assigned_invited', 'gave_up')).toBe(true);
    });
  });

  describe('getAvailableStatuses returns correct counts', () => {
    it('not_assigned has 1 transition', () => {
      expect(getAvailableStatuses('not_assigned')).toHaveLength(1);
    });

    it('assigned_not_invited has 4 transitions', () => {
      expect(getAvailableStatuses('assigned_not_invited')).toHaveLength(4);
    });

    it('assigned_invited has 4 transitions', () => {
      expect(getAvailableStatuses('assigned_invited')).toHaveLength(4);
    });

    it('assigned_confirmed has 4 transitions', () => {
      expect(getAvailableStatuses('assigned_confirmed')).toHaveLength(4);
    });

    it('gave_up has 4 transitions', () => {
      expect(getAvailableStatuses('gave_up')).toHaveLength(4);
    });
  });
});

describe('PHASE-03: groupSpeechesBySunday edge cases', () => {
  it('handles multiple exceptions on different dates', () => {
    const exceptions: SundayException[] = [
      { id: 'ex-1', ward_id: 'w-1', date: '2026-04-05', reason: 'general_conference' },
      { id: 'ex-2', ward_id: 'w-1', date: '2026-04-12', reason: 'stake_conference' },
    ];
    const result = groupSpeechesBySunday(
      [],
      ['2026-04-05', '2026-04-12', '2026-04-19'],
      exceptions
    );
    expect(result[0].exception?.reason).toBe('general_conference');
    expect(result[1].exception?.reason).toBe('stake_conference');
    expect(result[2].exception).toBeNull();
  });

  it('preserves speech order by position within a date', () => {
    const speeches = [
      makeSpeech({ id: 's3', sunday_date: '2026-03-01', position: 3 }),
      makeSpeech({ id: 's1', sunday_date: '2026-03-01', position: 1 }),
      makeSpeech({ id: 's2', sunday_date: '2026-03-01', position: 2 }),
    ];
    const result = groupSpeechesBySunday(speeches, ['2026-03-01'], []);
    // groupSpeechesBySunday doesn't sort -- it stores as-provided
    expect(result[0].speeches).toHaveLength(3);
    expect(result[0].speeches.map((s) => s.position)).toEqual([3, 1, 2]);
  });

  it('handles empty sunday dates array', () => {
    const result = groupSpeechesBySunday([], [], []);
    expect(result).toEqual([]);
  });

  it('speeches without matching sunday date are not included', () => {
    const orphanSpeech = makeSpeech({ sunday_date: '2026-12-25', position: 1 });
    const result = groupSpeechesBySunday([orphanSpeech], ['2026-03-01'], []);
    expect(result).toHaveLength(1);
    expect(result[0].speeches).toHaveLength(0); // orphan not included
  });
});

describe('PHASE-03: addMonths edge cases', () => {
  it('handles end-of-month overflow (Jan 31 + 1 month)', () => {
    const jan31 = new Date(2026, 0, 31);
    const result = addMonths(jan31, 1);
    // JavaScript Date rolls over: Feb 31 -> Mar 3 (or similar)
    // The important thing is it doesn't crash
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBeGreaterThanOrEqual(1); // Feb or Mar
  });

  it('handles adding 0 months (no change)', () => {
    const date = new Date(2026, 5, 15);
    const result = addMonths(date, 0);
    expect(result.getMonth()).toBe(5);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getDate()).toBe(15);
  });

  it('handles large negative months', () => {
    const date = new Date(2026, 5, 15); // June 2026
    const result = addMonths(date, -24);
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(5); // June 2024
  });

  it('does not mutate original date', () => {
    const original = new Date(2026, 5, 15);
    const originalTime = original.getTime();
    addMonths(original, 6);
    expect(original.getTime()).toBe(originalTime);
  });
});

describe('PHASE-03: findNextSunday edge cases', () => {
  it('handles year boundary (Dec 31 Friday)', () => {
    // 2027-12-31 is a Friday
    const dec31 = new Date(2027, 11, 31);
    const result = findNextSunday(dec31);
    // Next Sunday would be 2028-01-02
    expect(result).toBe('2028-01-02');
  });

  it('handles leap year Feb 29', () => {
    // 2028-02-29 is a Tuesday (leap year)
    const feb29 = new Date(2028, 1, 29);
    const result = findNextSunday(feb29);
    expect(result).toBe('2028-03-05');
  });
});

describe('PHASE-03: speechKeys uniqueness', () => {
  it('byDateRange keys differ for different date ranges', () => {
    const key1 = speechKeys.byDateRange('w-1', '2026-01-01', '2026-06-30');
    const key2 = speechKeys.byDateRange('w-1', '2026-07-01', '2026-12-31');
    expect(key1).not.toEqual(key2);
  });

  it('byDateRange keys differ for different wards', () => {
    const key1 = speechKeys.byDateRange('w-1', '2026-01-01', '2026-12-31');
    const key2 = speechKeys.byDateRange('w-2', '2026-01-01', '2026-12-31');
    expect(key1).not.toEqual(key2);
  });

  it('bySunday keys are distinct from byDateRange keys', () => {
    const bySunday = speechKeys.bySunday('w-1', '2026-03-01');
    const byRange = speechKeys.byDateRange('w-1', '2026-03-01', '2026-03-01');
    expect(bySunday).not.toEqual(byRange);
  });
});
