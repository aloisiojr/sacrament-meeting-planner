/**
 * F066: Migration 031 - Secretary Review Notification (CR-276)
 *
 * Tests the restructured enqueue_speech_notification() trigger logic via
 * behavioral simulation. The simulateTrigger() function mirrors the SQL
 * logic from migration 031 including the new Case 6A (secretary speaker
 * assignment) and Case 6B (secretary topic change).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// ============================================================================
// Types mirroring the DB trigger
// ============================================================================

type SpeechStatus =
  | 'not_assigned'
  | 'assigned_not_invited'
  | 'assigned_invited'
  | 'assigned_confirmed'
  | 'gave_up';

type TriggerOp = 'INSERT' | 'UPDATE';

interface SpeechRow {
  status: SpeechStatus;
  position: number;
  assigned_by_role: string | null;
  topic_title: string | null;
  ward_id: string;
  sunday_date: string;
  speaker_name: string | null;
}

interface NotificationEnqueued {
  type: 'designation' | 'speaker_confirmed' | 'speaker_withdrew' | 'secretary_review';
  topic_title?: string | null;
}

interface CancellationFired {
  type: 'cancellation';
}

type TriggerResult = (NotificationEnqueued | CancellationFired)[];

// ============================================================================
// Behavioral simulation of enqueue_speech_notification() trigger
// (mirrors migration 031 logic exactly)
// ============================================================================

function simulateTrigger(
  tgOp: TriggerOp,
  newRow: Partial<SpeechRow>,
  oldRow?: Partial<SpeechRow>
): TriggerResult {
  const results: TriggerResult = [];

  const NEW: SpeechRow = {
    status: 'not_assigned',
    position: 1,
    assigned_by_role: null,
    topic_title: null,
    ward_id: 'w-1',
    sunday_date: '2026-03-15',
    speaker_name: null,
    ...newRow,
  };

  const OLD: SpeechRow | undefined = oldRow
    ? {
        status: 'not_assigned',
        position: 1,
        assigned_by_role: null,
        topic_title: null,
        ward_id: 'w-1',
        sunday_date: '2026-03-15',
        speaker_name: null,
        ...oldRow,
      }
    : undefined;

  // Case 6B: Secretary topic change (BEFORE early-return)
  if (
    tgOp === 'UPDATE' &&
    NEW.assigned_by_role === 'secretary' &&
    [1, 2, 3].includes(NEW.position) &&
    OLD !== undefined &&
    // IS DISTINCT FROM: handles NULL comparisons
    (OLD.topic_title !== NEW.topic_title ||
      (OLD.topic_title === null) !== (NEW.topic_title === null)) &&
    NEW.topic_title !== null
  ) {
    results.push({ type: 'secretary_review', topic_title: NEW.topic_title });
  }

  // Early exit: no status change on UPDATE
  if (tgOp === 'UPDATE' && OLD !== undefined && OLD.status === NEW.status) {
    return results;
  }

  // Case 1: Designation (delayed, grouped)
  if (
    NEW.status === 'assigned_not_invited' &&
    (tgOp === 'INSERT' || (OLD !== undefined && OLD.status === 'not_assigned'))
  ) {
    results.push({ type: 'designation' });
  }

  // Case 4: Speaker confirmed (immediate)
  if (
    NEW.status === 'assigned_confirmed' &&
    (tgOp === 'INSERT' || (OLD !== undefined && OLD.status !== 'assigned_confirmed'))
  ) {
    results.push({ type: 'speaker_confirmed' });
  }

  // Case 5: Speaker gave up (immediate)
  if (
    NEW.status === 'gave_up' &&
    (tgOp === 'INSERT' || (OLD !== undefined && OLD.status !== 'gave_up'))
  ) {
    results.push({ type: 'speaker_withdrew' });
  }

  // Cancellation
  if (
    NEW.status === 'not_assigned' &&
    tgOp === 'UPDATE' &&
    OLD !== undefined &&
    OLD.status !== 'not_assigned'
  ) {
    results.push({ type: 'cancellation' });
  }

  // Case 6A: Secretary speaker assignment
  if (
    NEW.assigned_by_role === 'secretary' &&
    [1, 2, 3].includes(NEW.position) &&
    NEW.status === 'assigned_not_invited' &&
    (tgOp === 'INSERT' || (OLD !== undefined && OLD.status === 'not_assigned'))
  ) {
    results.push({ type: 'secretary_review' });
  }

  return results;
}

// ============================================================================
// Migration file exists
// ============================================================================

describe('Migration 031: file exists and is valid SQL', () => {
  it('migration file exists and contains expected SQL statements', () => {
    const migrationPath = join(
      process.cwd(),
      'supabase/migrations/031_secretary_review_notification.sql'
    );
    const sql = readFileSync(migrationPath, 'utf-8');

    expect(sql).toContain('ALTER TABLE public.speeches ADD COLUMN assigned_by_role TEXT');
    expect(sql).toContain('ALTER TABLE public.notification_queue ADD COLUMN topic_title TEXT');
    expect(sql).toContain("'secretary_review'");
    expect(sql).toContain('SECURITY DEFINER');
    expect(sql).toContain("SET search_path = ''");
    expect(sql).toContain('public.notification_queue');
  });
});

// ============================================================================
// Case 6B: Secretary topic change
// ============================================================================

describe('Case 6B: secretary topic change (pos 1-3) enqueues secretary_review', () => {
  it('topic NULL -> value fires secretary_review with topic_title', () => {
    const results = simulateTrigger(
      'UPDATE',
      { assigned_by_role: 'secretary', position: 1, topic_title: 'Fe em Cristo', status: 'assigned_not_invited' },
      { assigned_by_role: 'secretary', position: 1, topic_title: null, status: 'assigned_not_invited' }
    );
    const reviews = results.filter((r) => r.type === 'secretary_review');
    expect(reviews.length).toBeGreaterThanOrEqual(1);
    expect(reviews[0]).toHaveProperty('topic_title', 'Fe em Cristo');
  });

  it('topic value -> different value fires secretary_review', () => {
    const results = simulateTrigger(
      'UPDATE',
      { assigned_by_role: 'secretary', position: 2, topic_title: 'Esperanca', status: 'assigned_not_invited' },
      { assigned_by_role: 'secretary', position: 2, topic_title: 'Oracao', status: 'assigned_not_invited' }
    );
    const reviews = results.filter((r) => r.type === 'secretary_review' && 'topic_title' in r);
    expect(reviews.length).toBeGreaterThanOrEqual(1);
  });

  it('topic clearing (-> NULL) does NOT notify', () => {
    const results = simulateTrigger(
      'UPDATE',
      { assigned_by_role: 'secretary', position: 1, topic_title: null, status: 'assigned_not_invited' },
      { assigned_by_role: 'secretary', position: 1, topic_title: 'Oracao', status: 'assigned_not_invited' }
    );
    const reviews = results.filter((r) => r.type === 'secretary_review' && 'topic_title' in r);
    expect(reviews).toHaveLength(0);
  });

  it('same topic value does NOT notify', () => {
    const results = simulateTrigger(
      'UPDATE',
      { assigned_by_role: 'secretary', position: 1, topic_title: 'Fe', status: 'assigned_not_invited' },
      { assigned_by_role: 'secretary', position: 1, topic_title: 'Fe', status: 'assigned_not_invited' }
    );
    const reviews = results.filter((r) => r.type === 'secretary_review' && 'topic_title' in r);
    expect(reviews).toHaveLength(0);
  });

  it('bishopric topic change does NOT enqueue review', () => {
    const results = simulateTrigger(
      'UPDATE',
      { assigned_by_role: 'bishopric', position: 1, topic_title: 'Fe', status: 'assigned_not_invited' },
      { assigned_by_role: 'bishopric', position: 1, topic_title: null, status: 'assigned_not_invited' }
    );
    const reviews = results.filter((r) => r.type === 'secretary_review');
    expect(reviews).toHaveLength(0);
  });
});

// ============================================================================
// Case 6A: Secretary speaker assignment
// ============================================================================

describe('Case 6A: secretary speaker assignment', () => {
  it('secretary speaker assignment (pos 1-3) enqueues review', () => {
    const results = simulateTrigger(
      'UPDATE',
      { assigned_by_role: 'secretary', position: 1, status: 'assigned_not_invited', speaker_name: 'Maria' },
      { assigned_by_role: null, position: 1, status: 'not_assigned' }
    );
    const reviews = results.filter((r) => r.type === 'secretary_review');
    expect(reviews.length).toBeGreaterThanOrEqual(1);
  });

  it('position 0 excluded from review', () => {
    const results = simulateTrigger(
      'UPDATE',
      { assigned_by_role: 'secretary', position: 0, status: 'assigned_not_invited', speaker_name: 'Maria' },
      { assigned_by_role: null, position: 0, status: 'not_assigned' }
    );
    const reviews = results.filter((r) => r.type === 'secretary_review');
    expect(reviews).toHaveLength(0);
  });

  it('position 4 excluded from review', () => {
    const results = simulateTrigger(
      'UPDATE',
      { assigned_by_role: 'secretary', position: 4, status: 'assigned_not_invited', speaker_name: 'Maria' },
      { assigned_by_role: null, position: 4, status: 'not_assigned' }
    );
    const reviews = results.filter((r) => r.type === 'secretary_review');
    expect(reviews).toHaveLength(0);
  });

  it('bishopric speaker assignment does NOT enqueue review', () => {
    const results = simulateTrigger(
      'UPDATE',
      { assigned_by_role: 'bishopric', position: 1, status: 'assigned_not_invited', speaker_name: 'Maria' },
      { assigned_by_role: null, position: 1, status: 'not_assigned' }
    );
    const reviews = results.filter((r) => r.type === 'secretary_review');
    expect(reviews).toHaveLength(0);
  });

  it('NULL assigned_by_role does NOT enqueue review', () => {
    const results = simulateTrigger(
      'UPDATE',
      { assigned_by_role: null, position: 1, status: 'assigned_not_invited', speaker_name: 'Maria' },
      { assigned_by_role: null, position: 1, status: 'not_assigned' }
    );
    const reviews = results.filter((r) => r.type === 'secretary_review');
    expect(reviews).toHaveLength(0);
  });
});

// ============================================================================
// Early-return: blocks non-status-change except Case 6B
// ============================================================================

describe('Early-return blocks non-status-change cases (except Case 6B)', () => {
  it('status unchanged with topic change still fires Case 6B', () => {
    const results = simulateTrigger(
      'UPDATE',
      { assigned_by_role: 'secretary', position: 1, topic_title: 'Fe', status: 'assigned_not_invited' },
      { assigned_by_role: 'secretary', position: 1, topic_title: null, status: 'assigned_not_invited' }
    );
    // Case 6B fires before early-return
    const topicReviews = results.filter((r) => r.type === 'secretary_review' && 'topic_title' in r);
    expect(topicReviews.length).toBeGreaterThanOrEqual(1);
  });

  it('status unchanged without topic change is no-op', () => {
    const results = simulateTrigger(
      'UPDATE',
      { assigned_by_role: 'secretary', position: 1, topic_title: null, status: 'assigned_not_invited' },
      { assigned_by_role: 'secretary', position: 1, topic_title: null, status: 'assigned_not_invited' }
    );
    expect(results).toHaveLength(0);
  });
});

// ============================================================================
// Existing cases unchanged
// ============================================================================

describe('Case 1: Assignment notification unchanged', () => {
  it('not_assigned -> assigned_not_invited fires designation', () => {
    const results = simulateTrigger(
      'UPDATE',
      { status: 'assigned_not_invited', position: 1 },
      { status: 'not_assigned', position: 1 }
    );
    expect(results.some((r) => r.type === 'designation')).toBe(true);
  });
});

describe('Case 4: Speaker confirmed unchanged', () => {
  it('assigned_not_invited -> assigned_confirmed fires speaker_confirmed', () => {
    const results = simulateTrigger(
      'UPDATE',
      { status: 'assigned_confirmed', position: 1 },
      { status: 'assigned_not_invited', position: 1 }
    );
    expect(results).toEqual([{ type: 'speaker_confirmed' }]);
  });
});

describe('Case 5: Speaker gave up unchanged', () => {
  it('assigned_confirmed -> gave_up fires speaker_withdrew', () => {
    const results = simulateTrigger(
      'UPDATE',
      { status: 'gave_up', position: 1 },
      { status: 'assigned_confirmed', position: 1 }
    );
    expect(results).toEqual([{ type: 'speaker_withdrew' }]);
  });
});

describe('Cancellation unchanged', () => {
  it('assigned_not_invited -> not_assigned fires cancellation', () => {
    const results = simulateTrigger(
      'UPDATE',
      { status: 'not_assigned', position: 1 },
      { status: 'assigned_not_invited', position: 1 }
    );
    expect(results).toEqual([{ type: 'cancellation' }]);
  });
});
