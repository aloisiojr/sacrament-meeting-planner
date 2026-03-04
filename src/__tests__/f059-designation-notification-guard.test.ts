/**
 * F059: Designation Notification Initial Assignment Guard (CR-269)
 *
 * Tests the enqueue_speech_notification() trigger logic via migration SQL
 * content validation and scenario-based guard logic verification.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const MIGRATION_PATH = path.resolve(
  __dirname,
  '../../supabase/migrations/028_fix_designation_notification_guard.sql'
);

const migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf-8');

// ============================================================================
// Helper: simulate the trigger guard logic
// ============================================================================

type SpeechStatus =
  | 'not_assigned'
  | 'assigned_not_invited'
  | 'assigned_invited'
  | 'assigned_confirmed'
  | 'gave_up';

type TriggerOp = 'INSERT' | 'UPDATE';

interface NotificationEnqueued {
  type: 'designation' | 'speaker_confirmed' | 'speaker_withdrew';
}

interface CancellationFired {
  type: 'cancellation';
}

type TriggerResult = (NotificationEnqueued | CancellationFired)[];

/**
 * Simulates the enqueue_speech_notification() trigger function logic.
 * Returns which notifications/cancellations would be enqueued.
 */
function simulateTrigger(
  tgOp: TriggerOp,
  newStatus: SpeechStatus,
  oldStatus?: SpeechStatus
): TriggerResult {
  const results: TriggerResult = [];

  // Early exit: no status change on UPDATE
  if (tgOp === 'UPDATE' && oldStatus === newStatus) {
    return results;
  }

  // Case 1: Designation (delayed, grouped) - with OLD.status guard
  if (
    newStatus === 'assigned_not_invited' &&
    (tgOp === 'INSERT' || oldStatus === 'not_assigned')
  ) {
    results.push({ type: 'designation' });
  }

  // Case 4: Speaker confirmed (immediate)
  if (
    newStatus === 'assigned_confirmed' &&
    (tgOp === 'INSERT' || oldStatus !== 'assigned_confirmed')
  ) {
    results.push({ type: 'speaker_confirmed' });
  }

  // Case 5: Speaker gave up (immediate)
  if (
    newStatus === 'gave_up' &&
    (tgOp === 'INSERT' || oldStatus !== 'gave_up')
  ) {
    results.push({ type: 'speaker_withdrew' });
  }

  // Cancellation: cancel pending designation on unassign
  if (
    newStatus === 'not_assigned' &&
    tgOp === 'UPDATE' &&
    oldStatus !== 'not_assigned'
  ) {
    results.push({ type: 'cancellation' });
  }

  return results;
}

// ============================================================================
// Migration SQL content validation
// ============================================================================

describe('F059: Designation Notification Guard - Migration SQL', () => {
  it('migration file exists', () => {
    expect(fs.existsSync(MIGRATION_PATH)).toBe(true);
  });

  it('contains CREATE OR REPLACE FUNCTION enqueue_speech_notification()', () => {
    expect(migrationSql).toContain(
      'CREATE OR REPLACE FUNCTION enqueue_speech_notification()'
    );
  });

  it('Case 1 has guard: AND (TG_OP = \'INSERT\' OR OLD.status = \'not_assigned\')', () => {
    expect(migrationSql).toContain(
      "AND (TG_OP = 'INSERT' OR OLD.status = 'not_assigned')"
    );
  });

  it('Case 4 has guard: AND (TG_OP = \'INSERT\' OR OLD.status != \'assigned_confirmed\')', () => {
    expect(migrationSql).toContain(
      "AND (TG_OP = 'INSERT' OR OLD.status != 'assigned_confirmed')"
    );
  });

  it('Case 5 has guard: AND (TG_OP = \'INSERT\' OR OLD.status != \'gave_up\')', () => {
    expect(migrationSql).toContain(
      "AND (TG_OP = 'INSERT' OR OLD.status != 'gave_up')"
    );
  });

  it('includes SECURITY DEFINER', () => {
    expect(migrationSql).toContain('SECURITY DEFINER');
  });

  it('cancellation case includes SET status = \'cancelled\'', () => {
    expect(migrationSql).toContain("SET status = 'cancelled'");
  });
});

// ============================================================================
// Scenario-based trigger logic tests
// ============================================================================

describe('F059: Designation Notification Guard - Trigger Logic', () => {
  describe('AC-059-1: not_assigned -> assigned_not_invited fires designation', () => {
    it('guard passes when OLD.status = not_assigned', () => {
      const results = simulateTrigger('UPDATE', 'assigned_not_invited', 'not_assigned');
      expect(results).toEqual([{ type: 'designation' }]);
    });
  });

  describe('AC-059-2: assigned_invited -> assigned_not_invited does NOT fire', () => {
    it('guard fails when OLD.status = assigned_invited', () => {
      const results = simulateTrigger('UPDATE', 'assigned_not_invited', 'assigned_invited');
      expect(results).toEqual([]);
    });
  });

  describe('AC-059-3: assigned_confirmed -> assigned_not_invited does NOT fire', () => {
    it('guard fails when OLD.status = assigned_confirmed', () => {
      const results = simulateTrigger('UPDATE', 'assigned_not_invited', 'assigned_confirmed');
      expect(results).toEqual([]);
    });
  });

  describe('AC-059-4: gave_up -> assigned_not_invited does NOT fire', () => {
    it('guard fails when OLD.status = gave_up', () => {
      const results = simulateTrigger('UPDATE', 'assigned_not_invited', 'gave_up');
      expect(results).toEqual([]);
    });
  });

  describe('AC-059-5: any -> assigned_confirmed fires speaker_confirmed (unchanged)', () => {
    it('Case 4 fires on transition to assigned_confirmed', () => {
      const results = simulateTrigger('UPDATE', 'assigned_confirmed', 'assigned_not_invited');
      expect(results).toEqual([{ type: 'speaker_confirmed' }]);
    });
  });

  describe('AC-059-6: any -> gave_up fires speaker_withdrew (unchanged)', () => {
    it('Case 5 fires on transition to gave_up', () => {
      const results = simulateTrigger('UPDATE', 'gave_up', 'assigned_confirmed');
      expect(results).toEqual([{ type: 'speaker_withdrew' }]);
    });
  });

  describe('AC-059-7: any -> not_assigned fires cancellation (unchanged)', () => {
    it('cancellation fires when status changes to not_assigned', () => {
      const results = simulateTrigger('UPDATE', 'not_assigned', 'assigned_not_invited');
      expect(results).toEqual([{ type: 'cancellation' }]);
    });
  });

  describe('EC-059-1: reassign after unassign fires new notification', () => {
    it('full cycle: assign -> cancel -> reassign', () => {
      // Step 1: initial assignment (not_assigned -> assigned_not_invited)
      const step1 = simulateTrigger('UPDATE', 'assigned_not_invited', 'not_assigned');
      expect(step1).toEqual([{ type: 'designation' }]);

      // Step 2: unassign (assigned_not_invited -> not_assigned) -> cancellation
      const step2 = simulateTrigger('UPDATE', 'not_assigned', 'assigned_not_invited');
      expect(step2).toEqual([{ type: 'cancellation' }]);

      // Step 3: reassign (not_assigned -> assigned_not_invited) -> new notification
      const step3 = simulateTrigger('UPDATE', 'assigned_not_invited', 'not_assigned');
      expect(step3).toEqual([{ type: 'designation' }]);
    });
  });

  describe('EC-059-3: INSERT with status = assigned_not_invited fires notification', () => {
    it('guard passes when TG_OP = INSERT', () => {
      const results = simulateTrigger('INSERT', 'assigned_not_invited');
      expect(results).toEqual([{ type: 'designation' }]);
    });
  });

  describe('Early exit guard', () => {
    it('no-op when UPDATE with same status', () => {
      const results = simulateTrigger('UPDATE', 'assigned_not_invited', 'assigned_not_invited');
      expect(results).toEqual([]);
    });

    it('no-op when UPDATE not_assigned to not_assigned', () => {
      const results = simulateTrigger('UPDATE', 'not_assigned', 'not_assigned');
      expect(results).toEqual([]);
    });
  });
});
