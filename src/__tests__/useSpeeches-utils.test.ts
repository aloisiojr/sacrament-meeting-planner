/**
 * Tests for useSpeeches hook utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  speechKeys,
  VALID_TRANSITIONS,
  isValidTransition,
  getAvailableStatuses,
  groupSpeechesBySunday,
} from '../hooks/useSpeeches';
import type { Speech, SundayException, SpeechStatus } from '../types/database';

// --- Factory ---

function makeSpeech(overrides: Partial<Speech> = {}): Speech {
  return {
    id: 'sp-1',
    ward_id: 'w-1',
    sunday_date: '2026-03-01',
    position: 1,
    member_id: null,
    speaker_name: null,
    speaker_phone: null,
    topic_title: null,
    topic_link: null,
    topic_collection: null,
    status: 'not_assigned',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeException(overrides: Partial<SundayException> = {}): SundayException {
  return {
    id: 'ex-1',
    ward_id: 'w-1',
    date: '2026-03-01',
    reason: 'testimony_meeting',
    ...overrides,
  };
}

// --- Query Keys ---

describe('speechKeys', () => {
  it('generates correct keys', () => {
    expect(speechKeys.all).toEqual(['speeches']);
    expect(speechKeys.byDateRange('w-1', '2026-01-01', '2026-12-31')).toEqual([
      'speeches', 'byDateRange', 'w-1', '2026-01-01', '2026-12-31',
    ]);
    expect(speechKeys.bySunday('w-1', '2026-03-01')).toEqual([
      'speeches', 'bySunday', 'w-1', '2026-03-01',
    ]);
  });
});

// --- Status Lifecycle ---

describe('VALID_TRANSITIONS', () => {
  it('not_assigned can only transition to assigned_not_invited', () => {
    expect(VALID_TRANSITIONS.not_assigned).toEqual(['assigned_not_invited']);
  });

  it('assigned_not_invited can transition to assigned_invited or not_assigned', () => {
    expect(VALID_TRANSITIONS.assigned_not_invited).toContain('assigned_invited');
    expect(VALID_TRANSITIONS.assigned_not_invited).toContain('not_assigned');
  });

  it('assigned_invited can transition to confirmed, not_invited, gave_up, or not_assigned', () => {
    expect(VALID_TRANSITIONS.assigned_invited).toContain('assigned_confirmed');
    expect(VALID_TRANSITIONS.assigned_invited).toContain('assigned_not_invited');
    expect(VALID_TRANSITIONS.assigned_invited).toContain('gave_up');
    expect(VALID_TRANSITIONS.assigned_invited).toContain('not_assigned');
  });

  it('assigned_confirmed can only transition to not_assigned', () => {
    expect(VALID_TRANSITIONS.assigned_confirmed).toEqual(['not_assigned']);
  });

  it('gave_up can only transition to not_assigned', () => {
    expect(VALID_TRANSITIONS.gave_up).toEqual(['not_assigned']);
  });
});

describe('isValidTransition', () => {
  it('returns true for valid transitions', () => {
    expect(isValidTransition('not_assigned', 'assigned_not_invited')).toBe(true);
    expect(isValidTransition('assigned_not_invited', 'assigned_invited')).toBe(true);
    expect(isValidTransition('assigned_invited', 'assigned_confirmed')).toBe(true);
    expect(isValidTransition('assigned_invited', 'gave_up')).toBe(true);
  });

  it('returns false for invalid transitions', () => {
    expect(isValidTransition('not_assigned', 'assigned_confirmed')).toBe(false);
    expect(isValidTransition('not_assigned', 'gave_up')).toBe(false);
    expect(isValidTransition('assigned_confirmed', 'assigned_invited')).toBe(false);
    expect(isValidTransition('gave_up', 'assigned_confirmed')).toBe(false);
  });

  it('allows removal (back to not_assigned) from any assigned state', () => {
    expect(isValidTransition('assigned_not_invited', 'not_assigned')).toBe(true);
    expect(isValidTransition('assigned_invited', 'not_assigned')).toBe(true);
    expect(isValidTransition('assigned_confirmed', 'not_assigned')).toBe(true);
    expect(isValidTransition('gave_up', 'not_assigned')).toBe(true);
  });
});

describe('getAvailableStatuses', () => {
  it('returns available next statuses for each state', () => {
    expect(getAvailableStatuses('not_assigned')).toEqual(['assigned_not_invited']);
    expect(getAvailableStatuses('assigned_invited')).toContain('assigned_confirmed');
    expect(getAvailableStatuses('assigned_invited')).toContain('gave_up');
  });
});

// --- Grouping ---

describe('groupSpeechesBySunday', () => {
  it('groups speeches by sunday date', () => {
    const speeches: Speech[] = [
      makeSpeech({ id: '1', sunday_date: '2026-03-01', position: 1 }),
      makeSpeech({ id: '2', sunday_date: '2026-03-01', position: 2 }),
      makeSpeech({ id: '3', sunday_date: '2026-03-01', position: 3 }),
      makeSpeech({ id: '4', sunday_date: '2026-03-08', position: 1 }),
    ];
    const sundayDates = ['2026-03-01', '2026-03-08', '2026-03-15'];
    const exceptions: SundayException[] = [];

    const result = groupSpeechesBySunday(speeches, sundayDates, exceptions);

    expect(result).toHaveLength(3);
    expect(result[0].date).toBe('2026-03-01');
    expect(result[0].speeches).toHaveLength(3);
    expect(result[1].date).toBe('2026-03-08');
    expect(result[1].speeches).toHaveLength(1);
    expect(result[2].date).toBe('2026-03-15');
    expect(result[2].speeches).toHaveLength(0);
  });

  it('merges exceptions with speech data', () => {
    const speeches: Speech[] = [];
    const sundayDates = ['2026-03-01', '2026-03-08'];
    const exceptions: SundayException[] = [
      makeException({ date: '2026-03-01', reason: 'testimony_meeting' }),
    ];

    const result = groupSpeechesBySunday(speeches, sundayDates, exceptions);

    expect(result[0].exception).not.toBeNull();
    expect(result[0].exception?.reason).toBe('testimony_meeting');
    expect(result[1].exception).toBeNull();
  });

  it('returns empty speeches array for dates without speeches', () => {
    const result = groupSpeechesBySunday([], ['2026-03-01'], []);

    expect(result[0].speeches).toEqual([]);
    expect(result[0].exception).toBeNull();
  });
});
