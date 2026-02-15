/**
 * Tests for NextAssignmentsSection utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  areNext3FullyAssigned,
  findNextPendingSunday,
} from '../lib/speechUtils';
import type { Speech, SpeechBySunday } from '../types/database';

function makeSpeech(overrides: Partial<Speech> = {}): Speech {
  return {
    id: 'sp-1',
    ward_id: 'w-1',
    sunday_date: '2026-03-01',
    position: 1,
    member_id: 'm-1',
    speaker_name: 'Speaker 1',
    speaker_phone: '+5511999999999',
    topic_title: 'Topic 1',
    topic_link: null,
    topic_collection: 'Collection',
    status: 'assigned_not_invited',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeEntry(date: string, speeches: Partial<Speech>[] = [], hasException = false): SpeechBySunday {
  return {
    date,
    exception: hasException ? { id: 'ex-1', ward_id: 'w-1', date, reason: 'testimony_meeting' } : null,
    speeches: speeches.map((s, i) =>
      makeSpeech({ ...s, sunday_date: date, position: (s.position ?? i + 1), id: `${date}-${s.position ?? i + 1}` })
    ),
  };
}

describe('areNext3FullyAssigned', () => {
  it('returns true when all 9 speeches are assigned', () => {
    const next3 = [
      makeEntry('2026-03-01', [
        { position: 1, status: 'assigned_not_invited' },
        { position: 2, status: 'assigned_invited' },
        { position: 3, status: 'assigned_confirmed' },
      ]),
      makeEntry('2026-03-08', [
        { position: 1, status: 'assigned_confirmed' },
        { position: 2, status: 'assigned_not_invited' },
        { position: 3, status: 'assigned_invited' },
      ]),
      makeEntry('2026-03-15', [
        { position: 1, status: 'assigned_invited' },
        { position: 2, status: 'assigned_confirmed' },
        { position: 3, status: 'assigned_not_invited' },
      ]),
    ];

    expect(areNext3FullyAssigned(next3)).toBe(true);
  });

  it('returns false when any speech is not_assigned', () => {
    const next3 = [
      makeEntry('2026-03-01', [
        { position: 1, status: 'assigned_confirmed' },
        { position: 2, status: 'not_assigned' },
        { position: 3, status: 'assigned_confirmed' },
      ]),
      makeEntry('2026-03-08', [
        { position: 1, status: 'assigned_confirmed' },
        { position: 2, status: 'assigned_confirmed' },
        { position: 3, status: 'assigned_confirmed' },
      ]),
      makeEntry('2026-03-15', [
        { position: 1, status: 'assigned_confirmed' },
        { position: 2, status: 'assigned_confirmed' },
        { position: 3, status: 'assigned_confirmed' },
      ]),
    ];

    expect(areNext3FullyAssigned(next3)).toBe(false);
  });

  it('returns false when any speech has gave_up status', () => {
    const next3 = [
      makeEntry('2026-03-01', [
        { position: 1, status: 'assigned_confirmed' },
        { position: 2, status: 'gave_up' },
        { position: 3, status: 'assigned_confirmed' },
      ]),
      makeEntry('2026-03-08', [
        { position: 1, status: 'assigned_confirmed' },
        { position: 2, status: 'assigned_confirmed' },
        { position: 3, status: 'assigned_confirmed' },
      ]),
      makeEntry('2026-03-15', [
        { position: 1, status: 'assigned_confirmed' },
        { position: 2, status: 'assigned_confirmed' },
        { position: 3, status: 'assigned_confirmed' },
      ]),
    ];

    expect(areNext3FullyAssigned(next3)).toBe(false);
  });

  it('skips exception sundays', () => {
    const next3 = [
      makeEntry('2026-03-01', [
        { position: 1, status: 'assigned_confirmed' },
        { position: 2, status: 'assigned_confirmed' },
        { position: 3, status: 'assigned_confirmed' },
      ]),
      makeEntry('2026-03-08', [], true), // Exception sunday
      makeEntry('2026-03-15', [
        { position: 1, status: 'assigned_confirmed' },
        { position: 2, status: 'assigned_confirmed' },
        { position: 3, status: 'assigned_confirmed' },
      ]),
    ];

    expect(areNext3FullyAssigned(next3)).toBe(true);
  });

  it('returns false when speeches are missing (not yet created)', () => {
    const next3 = [
      makeEntry('2026-03-01', []),
      makeEntry('2026-03-08', [
        { position: 1, status: 'assigned_confirmed' },
        { position: 2, status: 'assigned_confirmed' },
        { position: 3, status: 'assigned_confirmed' },
      ]),
      makeEntry('2026-03-15', [
        { position: 1, status: 'assigned_confirmed' },
        { position: 2, status: 'assigned_confirmed' },
        { position: 3, status: 'assigned_confirmed' },
      ]),
    ];

    expect(areNext3FullyAssigned(next3)).toBe(false);
  });
});

describe('findNextPendingSunday', () => {
  it('finds the first pending sunday after index 3', () => {
    const entries = [
      makeEntry('2026-03-01', [
        { position: 1, status: 'assigned_confirmed' },
        { position: 2, status: 'assigned_confirmed' },
        { position: 3, status: 'assigned_confirmed' },
      ]),
      makeEntry('2026-03-08', [
        { position: 1, status: 'assigned_confirmed' },
        { position: 2, status: 'assigned_confirmed' },
        { position: 3, status: 'assigned_confirmed' },
      ]),
      makeEntry('2026-03-15', [
        { position: 1, status: 'assigned_confirmed' },
        { position: 2, status: 'assigned_confirmed' },
        { position: 3, status: 'assigned_confirmed' },
      ]),
      makeEntry('2026-03-22', [
        { position: 1, status: 'not_assigned' },
        { position: 2, status: 'not_assigned' },
        { position: 3, status: 'not_assigned' },
      ]),
    ];

    const result = findNextPendingSunday(entries);
    expect(result?.date).toBe('2026-03-22');
  });

  it('returns null when no pending sundays', () => {
    const entries = [
      makeEntry('2026-03-01', []),
      makeEntry('2026-03-08', []),
      makeEntry('2026-03-15', []),
      makeEntry('2026-03-22', [
        { position: 1, status: 'assigned_confirmed' },
        { position: 2, status: 'assigned_confirmed' },
        { position: 3, status: 'assigned_confirmed' },
      ]),
    ];

    const result = findNextPendingSunday(entries);
    expect(result).toBeNull();
  });

  it('skips exception sundays', () => {
    const entries = [
      makeEntry('2026-03-01', []),
      makeEntry('2026-03-08', []),
      makeEntry('2026-03-15', []),
      makeEntry('2026-03-22', [], true), // Exception
      makeEntry('2026-03-29', [
        { position: 1, status: 'not_assigned' },
      ]),
    ];

    const result = findNextPendingSunday(entries);
    expect(result?.date).toBe('2026-03-29');
  });
});
