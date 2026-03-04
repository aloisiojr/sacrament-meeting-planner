/**
 * F059: Designation Notification Initial Assignment Guard (CR-269)
 *
 * Tests the enqueue_speech_notification() trigger logic via a behavioral
 * simulation of the trigger function. The simulateTrigger() function mirrors
 * the SQL logic from migration 028 and allows us to verify guard conditions
 * for all status transition scenarios without needing a live database.
 *
 * This approach tests BEHAVIOR (which notifications fire for which transitions)
 * rather than static SQL content.
 */

import { describe, it, expect } from 'vitest';

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

interface NotificationEnqueued {
  type: 'designation' | 'speaker_confirmed' | 'speaker_withdrew';
}

interface CancellationFired {
  type: 'cancellation';
}

type TriggerResult = (NotificationEnqueued | CancellationFired)[];

// All possible speech statuses for exhaustive testing
const ALL_STATUSES: SpeechStatus[] = [
  'not_assigned',
  'assigned_not_invited',
  'assigned_invited',
  'assigned_confirmed',
  'gave_up',
];

// ============================================================================
// Behavioral simulation of enqueue_speech_notification() trigger
// (mirrors migration 028 logic exactly)
// ============================================================================

/**
 * Simulates the enqueue_speech_notification() trigger function logic.
 * Returns which notifications/cancellations would be enqueued.
 *
 * This function is a 1:1 translation of the SQL trigger logic from
 * migration 028_fix_designation_notification_guard.sql into TypeScript.
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

  // Case 1: Designation (delayed, grouped) - with OLD.status guard (CR-269 fix)
  // Only fires on initial assignment: not_assigned -> assigned_not_invited
  // Manual status reverts to assigned_not_invited do NOT trigger notification
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
// AC-059-1: Initial assignment fires designation notification
// ============================================================================

describe('F059: AC-059-1 - Initial assignment fires designation', () => {
  it('not_assigned -> assigned_not_invited enqueues designation', () => {
    const results = simulateTrigger('UPDATE', 'assigned_not_invited', 'not_assigned');
    expect(results).toEqual([{ type: 'designation' }]);
  });

  it('designation notification has correct type', () => {
    const results = simulateTrigger('UPDATE', 'assigned_not_invited', 'not_assigned');
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('designation');
  });
});

// ============================================================================
// AC-059-2: Manual revert from assigned_invited does NOT fire
// ============================================================================

describe('F059: AC-059-2 - No notification on revert from assigned_invited', () => {
  it('assigned_invited -> assigned_not_invited produces no notifications', () => {
    const results = simulateTrigger('UPDATE', 'assigned_not_invited', 'assigned_invited');
    expect(results).toEqual([]);
  });
});

// ============================================================================
// AC-059-3: Manual revert from assigned_confirmed does NOT fire
// ============================================================================

describe('F059: AC-059-3 - No notification on revert from assigned_confirmed', () => {
  it('assigned_confirmed -> assigned_not_invited produces no notifications', () => {
    const results = simulateTrigger('UPDATE', 'assigned_not_invited', 'assigned_confirmed');
    expect(results).toEqual([]);
  });
});

// ============================================================================
// AC-059-4: Manual revert from gave_up does NOT fire
// ============================================================================

describe('F059: AC-059-4 - No notification on revert from gave_up', () => {
  it('gave_up -> assigned_not_invited produces no notifications', () => {
    const results = simulateTrigger('UPDATE', 'assigned_not_invited', 'gave_up');
    expect(results).toEqual([]);
  });
});

// ============================================================================
// AC-059-5: Speaker confirmed notification still works (Case 4 unchanged)
// ============================================================================

describe('F059: AC-059-5 - Speaker confirmed notification unchanged', () => {
  it('assigned_not_invited -> assigned_confirmed fires speaker_confirmed', () => {
    const results = simulateTrigger('UPDATE', 'assigned_confirmed', 'assigned_not_invited');
    expect(results).toEqual([{ type: 'speaker_confirmed' }]);
  });

  it('assigned_invited -> assigned_confirmed fires speaker_confirmed', () => {
    const results = simulateTrigger('UPDATE', 'assigned_confirmed', 'assigned_invited');
    expect(results).toEqual([{ type: 'speaker_confirmed' }]);
  });

  it('gave_up -> assigned_confirmed fires speaker_confirmed', () => {
    const results = simulateTrigger('UPDATE', 'assigned_confirmed', 'gave_up');
    expect(results).toEqual([{ type: 'speaker_confirmed' }]);
  });

  it('not_assigned -> assigned_confirmed fires speaker_confirmed', () => {
    const results = simulateTrigger('UPDATE', 'assigned_confirmed', 'not_assigned');
    expect(results).toEqual([{ type: 'speaker_confirmed' }]);
  });
});

// ============================================================================
// AC-059-6: Speaker withdrew notification still works (Case 5 unchanged)
// ============================================================================

describe('F059: AC-059-6 - Speaker withdrew notification unchanged', () => {
  it('assigned_confirmed -> gave_up fires speaker_withdrew', () => {
    const results = simulateTrigger('UPDATE', 'gave_up', 'assigned_confirmed');
    expect(results).toEqual([{ type: 'speaker_withdrew' }]);
  });

  it('assigned_not_invited -> gave_up fires speaker_withdrew', () => {
    const results = simulateTrigger('UPDATE', 'gave_up', 'assigned_not_invited');
    expect(results).toEqual([{ type: 'speaker_withdrew' }]);
  });

  it('assigned_invited -> gave_up fires speaker_withdrew', () => {
    const results = simulateTrigger('UPDATE', 'gave_up', 'assigned_invited');
    expect(results).toEqual([{ type: 'speaker_withdrew' }]);
  });

  it('not_assigned -> gave_up fires speaker_withdrew', () => {
    const results = simulateTrigger('UPDATE', 'gave_up', 'not_assigned');
    expect(results).toEqual([{ type: 'speaker_withdrew' }]);
  });
});

// ============================================================================
// AC-059-7: Cancellation on unassign still works
// ============================================================================

describe('F059: AC-059-7 - Cancellation on unassign unchanged', () => {
  it('assigned_not_invited -> not_assigned fires cancellation', () => {
    const results = simulateTrigger('UPDATE', 'not_assigned', 'assigned_not_invited');
    expect(results).toEqual([{ type: 'cancellation' }]);
  });

  it('assigned_invited -> not_assigned fires cancellation', () => {
    const results = simulateTrigger('UPDATE', 'not_assigned', 'assigned_invited');
    expect(results).toEqual([{ type: 'cancellation' }]);
  });

  it('assigned_confirmed -> not_assigned fires cancellation', () => {
    const results = simulateTrigger('UPDATE', 'not_assigned', 'assigned_confirmed');
    expect(results).toEqual([{ type: 'cancellation' }]);
  });

  it('gave_up -> not_assigned fires cancellation', () => {
    const results = simulateTrigger('UPDATE', 'not_assigned', 'gave_up');
    expect(results).toEqual([{ type: 'cancellation' }]);
  });
});

// ============================================================================
// EC-059-1: Reassign after unassign fires new notification
// ============================================================================

describe('F059: EC-059-1 - Reassign after unassign cycle', () => {
  it('assign -> unassign -> reassign: two designation notifications and one cancellation', () => {
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

// ============================================================================
// EC-059-2: Unmanaged prayer auto-confirm skips designation
// ============================================================================

describe('F059: EC-059-2 - Unmanaged prayer auto-confirm skips designation', () => {
  it('INSERT with assigned_confirmed fires speaker_confirmed but NOT designation', () => {
    // When manage_prayers=false, prayer assignment inserts directly as
    // assigned_confirmed, skipping assigned_not_invited entirely.
    // Case 1 should NOT fire (newStatus != assigned_not_invited).
    // Case 4 SHOULD fire (newStatus = assigned_confirmed, TG_OP = INSERT).
    const results = simulateTrigger('INSERT', 'assigned_confirmed');
    expect(results).toEqual([{ type: 'speaker_confirmed' }]);
    expect(results.find(r => r.type === 'designation')).toBeUndefined();
  });

  it('not_assigned -> assigned_confirmed fires speaker_confirmed, not designation', () => {
    // Even on UPDATE path, going directly to assigned_confirmed
    // should fire Case 4 only, not Case 1
    const results = simulateTrigger('UPDATE', 'assigned_confirmed', 'not_assigned');
    expect(results).toEqual([{ type: 'speaker_confirmed' }]);
  });
});

// ============================================================================
// EC-059-3: INSERT with assigned_not_invited fires notification
// ============================================================================

describe('F059: EC-059-3 - INSERT safety net', () => {
  it('INSERT with assigned_not_invited fires designation via TG_OP branch', () => {
    const results = simulateTrigger('INSERT', 'assigned_not_invited');
    expect(results).toEqual([{ type: 'designation' }]);
  });

  it('INSERT with not_assigned fires no notifications', () => {
    // Lazy-create inserts with not_assigned - no notification expected
    const results = simulateTrigger('INSERT', 'not_assigned');
    expect(results).toEqual([]);
  });

  it('INSERT with gave_up fires speaker_withdrew', () => {
    const results = simulateTrigger('INSERT', 'gave_up');
    expect(results).toEqual([{ type: 'speaker_withdrew' }]);
  });
});

// ============================================================================
// Early exit guard: same-status updates are no-ops
// ============================================================================

describe('F059: Early exit guard - same-status no-op', () => {
  it.each(ALL_STATUSES)(
    'UPDATE %s -> %s produces no notifications',
    (status) => {
      const results = simulateTrigger('UPDATE', status, status);
      expect(results).toEqual([]);
    }
  );
});

// ============================================================================
// Exhaustive: all non-designation transitions to assigned_not_invited blocked
// ============================================================================

describe('F059: Exhaustive guard - only not_assigned triggers designation', () => {
  const NON_NOT_ASSIGNED_STATUSES: SpeechStatus[] = [
    'assigned_invited',
    'assigned_confirmed',
    'gave_up',
  ];

  it.each(NON_NOT_ASSIGNED_STATUSES)(
    '%s -> assigned_not_invited does NOT fire designation',
    (oldStatus) => {
      const results = simulateTrigger('UPDATE', 'assigned_not_invited', oldStatus);
      expect(results).toEqual([]);
    }
  );

  it('only not_assigned -> assigned_not_invited fires designation (positive confirmation)', () => {
    const results = simulateTrigger('UPDATE', 'assigned_not_invited', 'not_assigned');
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('designation');
  });
});

// ============================================================================
// Case 4 & 5 self-transition guards
// ============================================================================

describe('F059: Case 4 & 5 self-transition guards', () => {
  it('assigned_confirmed -> assigned_confirmed is early-exit no-op', () => {
    const results = simulateTrigger('UPDATE', 'assigned_confirmed', 'assigned_confirmed');
    expect(results).toEqual([]);
  });

  it('gave_up -> gave_up is early-exit no-op', () => {
    const results = simulateTrigger('UPDATE', 'gave_up', 'gave_up');
    expect(results).toEqual([]);
  });
});

// ============================================================================
// No cancellation on INSERT (only UPDATE fires cancellation)
// ============================================================================

describe('F059: Cancellation only fires on UPDATE', () => {
  it('INSERT with not_assigned does NOT fire cancellation', () => {
    const results = simulateTrigger('INSERT', 'not_assigned');
    // Cancellation requires TG_OP = 'UPDATE', so INSERT never cancels
    expect(results).toEqual([]);
  });
});
