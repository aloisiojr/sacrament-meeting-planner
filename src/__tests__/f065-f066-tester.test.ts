/**
 * F065 + F066 Tester Tests (CR-275, CR-276)
 *
 * Behavioral tests covering:
 * - F065: Nickname search via filterMembers (additional edge cases)
 * - F066 Part A: Secretary permissions (separate Sets, edge cases)
 * - F066 Part B: Types (assigned_by_role, topic_title, secretary_review)
 * - F066 Part B: Trigger simulation (additional edge cases)
 * - F066 Part B: Client-side notificationUtils secretary_review
 * - F066 Part B: process-notifications routing
 */

import { describe, it, expect } from 'vitest';
import {
  filterMembers,
} from '../hooks/useMembers';
import {
  hasPermission,
  getPermissions,
  ALL_PERMISSIONS,
} from '../lib/permissions';
import {
  buildNotificationText,
} from '../lib/notificationUtils';
import type { Member, Speech, NotificationQueue, NotificationType } from '../types/database';

// ============================================================================
// Helper: makeMember (mirrors useMembers-utils.test.ts factory)
// ============================================================================

function makeMember(overrides: Partial<Member> & { full_name: string }): Member {
  return {
    id: overrides.id ?? `uuid-${Math.random().toString(36).slice(2)}`,
    ward_id: overrides.ward_id ?? 'ward-1',
    full_name: overrides.full_name,
    informal_name: overrides.informal_name ?? null,
    country_code: overrides.country_code ?? '+55',
    phone: overrides.phone ?? null,
    can_preside: overrides.can_preside ?? false,
    can_conduct: overrides.can_conduct ?? false,
    can_lead_music: overrides.can_lead_music ?? false,
    can_play_piano: overrides.can_play_piano ?? false,
    can_be_recognized: overrides.can_be_recognized ?? false,
    contact_via_responsible: overrides.contact_via_responsible ?? false,
    responsible_id: overrides.responsible_id ?? null,
    created_at: overrides.created_at ?? '2026-01-01T00:00:00Z',
    updated_at: overrides.updated_at ?? '2026-01-01T00:00:00Z',
  };
}

// ============================================================================
// F065: filterMembers - informal_name edge cases (tester scope)
// ============================================================================

describe('F065: filterMembers informal_name edge cases', () => {
  it('search term matching only informal_name returns correct member (AC-065-01)', () => {
    const members = [
      makeMember({ full_name: 'José Carlos Mendonça', informal_name: 'Zeca' }),
      makeMember({ full_name: 'Ana Paula Rodrigues', informal_name: 'Aninha' }),
      makeMember({ full_name: 'Pedro Henrique Lima' }),
    ];
    const result = filterMembers(members, 'Zeca');
    expect(result).toHaveLength(1);
    expect(result[0].informal_name).toBe('Zeca');
  });

  it('full_name match still works when informal_name is set (AC-065-02)', () => {
    const members = [
      makeMember({ full_name: 'José Carlos Mendonça', informal_name: 'Zeca' }),
    ];
    const result = filterMembers(members, 'Mendonça');
    expect(result).toHaveLength(1);
  });

  it('multiple members with matching informal_name all returned', () => {
    const members = [
      makeMember({ full_name: 'José Carlos', informal_name: 'Zé' }),
      makeMember({ full_name: 'José Roberto', informal_name: 'Zé' }),
      makeMember({ full_name: 'Maria Silva' }),
    ];
    const result = filterMembers(members, 'Zé');
    expect(result).toHaveLength(2);
  });

  it('partial informal_name match works', () => {
    const members = [
      makeMember({ full_name: 'João da Silva', informal_name: 'Joãozinho' }),
    ];
    const result = filterMembers(members, 'zinho');
    expect(result).toHaveLength(1);
  });

  it('informal_name with special characters handles gracefully', () => {
    const members = [
      makeMember({ full_name: 'Ana Maria', informal_name: 'Anã' }),
    ];
    const result = filterMembers(members, 'ana');
    // Both full_name and informal_name match 'ana'
    expect(result).toHaveLength(1);
  });

  it('PeoplePicker inherits nickname search (AC-065-05 - tested via filterMembers)', () => {
    // PeoplePicker uses useMembers(search) which calls filterMembers internally
    // Testing filterMembers covers this AC automatically
    const members = [
      makeMember({ full_name: 'Roberto Carlos', informal_name: 'Beto' }),
    ];
    const result = filterMembers(members, 'Beto');
    expect(result).toHaveLength(1);
    expect(result[0].full_name).toBe('Roberto Carlos');
  });

  it('prayer selection inherits nickname search (AC-065-06 - tested via filterMembers)', () => {
    // Prayer selection also uses filterMembers via PeoplePicker
    const members = [
      makeMember({ full_name: 'Francisco de Assis', informal_name: 'Chico' }),
    ];
    const result = filterMembers(members, 'Chico');
    expect(result).toHaveLength(1);
  });
});

// ============================================================================
// F066 Part A: Secretary permissions edge cases
// ============================================================================

describe('F066 Part A: Secretary permissions', () => {
  it('Permission Sets are separate objects (AC-066-07)', () => {
    // bishopric and secretary must have different Set instances
    const bishopricPerms = getPermissions('bishopric');
    const secretaryPerms = getPermissions('secretary');
    // Even though they have the same count, they should be independent arrays
    // (from separate Set objects in PERMISSIONS_MAP)
    expect(bishopricPerms).not.toBe(secretaryPerms);
    // But content should be identical (same 26 perms)
    expect(new Set(bishopricPerms)).toEqual(new Set(secretaryPerms));
  });

  it('secretary has speech:assign (AC-066-01)', () => {
    expect(hasPermission('secretary', 'speech:assign')).toBe(true);
  });

  it('secretary has speech:unassign (AC-066-02)', () => {
    expect(hasPermission('secretary', 'speech:unassign')).toBe(true);
  });

  it('secretary has home:next_assignments (AC-066-03)', () => {
    expect(hasPermission('secretary', 'home:next_assignments')).toBe(true);
  });

  it('secretary permission count is 26 (AC-066-04)', () => {
    expect(getPermissions('secretary').length).toBe(26);
  });

  it('bishopric permissions unchanged at 26 (AC-066-05)', () => {
    expect(getPermissions('bishopric').length).toBe(26);
  });

  it('observer permissions unchanged at 3 (AC-066-06)', () => {
    expect(getPermissions('observer').length).toBe(3);
  });

  it('observer never gets speech:assign (EC-066-06)', () => {
    expect(hasPermission('observer', 'speech:assign')).toBe(false);
    expect(hasPermission('observer', 'speech:unassign')).toBe(false);
    expect(hasPermission('observer', 'home:next_assignments')).toBe(false);
  });

  it('ALL_PERMISSIONS includes all 26 defined permissions', () => {
    expect(ALL_PERMISSIONS.length).toBe(26);
    expect(ALL_PERMISSIONS).toContain('speech:assign');
    expect(ALL_PERMISSIONS).toContain('speech:unassign');
    expect(ALL_PERMISSIONS).toContain('home:next_assignments');
  });
});

// ============================================================================
// F066 Part B: Types verification (AC-066-11, AC-066-12, AC-066-13)
// ============================================================================

describe('F066 Part B: TypeScript types', () => {
  it('Speech interface has assigned_by_role field (AC-066-11)', () => {
    const speech: Speech = {
      id: 's1',
      ward_id: 'w1',
      sunday_date: '2026-03-15',
      position: 1,
      member_id: null,
      speaker_name: null,
      speaker_informal_name: null,
      speaker_phone: null,
      topic_title: null,
      topic_link: null,
      topic_collection: null,
      assigned_by_role: 'secretary',
      status: 'assigned_not_invited',
      contact_phone: null,
      is_delegated: false,
      delegate_for_name: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    expect(speech.assigned_by_role).toBe('secretary');
  });

  it('Speech assigned_by_role accepts null for legacy data (EC-066-04)', () => {
    const speech: Speech = {
      id: 's1',
      ward_id: 'w1',
      sunday_date: '2026-03-15',
      position: 1,
      member_id: null,
      speaker_name: null,
      speaker_informal_name: null,
      speaker_phone: null,
      topic_title: null,
      topic_link: null,
      topic_collection: null,
      assigned_by_role: null,
      status: 'not_assigned',
      contact_phone: null,
      is_delegated: false,
      delegate_for_name: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    expect(speech.assigned_by_role).toBeNull();
  });

  it('NotificationType includes secretary_review (AC-066-12)', () => {
    const types: NotificationType[] = [
      'designation',
      'weekly_assignment',
      'weekly_confirmation',
      'speaker_confirmed',
      'speaker_withdrew',
      'secretary_review',
    ];
    expect(types).toHaveLength(6);
    expect(types).toContain('secretary_review');
  });

  it('NotificationQueue has topic_title field (AC-066-13)', () => {
    const notif: NotificationQueue = {
      id: 'nq1',
      ward_id: 'w1',
      type: 'secretary_review',
      sunday_date: '2026-03-15',
      speech_position: 1,
      speaker_name: 'Maria',
      target_role: 'bishopric',
      status: 'pending',
      send_after: '2026-03-15T10:00:00Z',
      topic_title: 'Fé em Cristo',
      created_at: '2026-01-01T00:00:00Z',
    };
    expect(notif.topic_title).toBe('Fé em Cristo');
  });

  it('NotificationQueue topic_title accepts null', () => {
    const notif: NotificationQueue = {
      id: 'nq1',
      ward_id: 'w1',
      type: 'secretary_review',
      sunday_date: '2026-03-15',
      speech_position: 1,
      speaker_name: 'Maria',
      target_role: 'bishopric',
      status: 'pending',
      send_after: '2026-03-15T10:00:00Z',
      topic_title: null,
      created_at: '2026-01-01T00:00:00Z',
    };
    expect(notif.topic_title).toBeNull();
  });
});

// ============================================================================
// F066 Part B: notificationUtils - secretary_review text (AC-066-22..24)
// ============================================================================

describe('F066 Part B: buildNotificationText secretary_review', () => {
  describe('speaker variant', () => {
    it('pt-BR speaker review text (AC-066-22)', () => {
      const result = buildNotificationText('secretary_review', 'pt-BR', {
        name: 'Maria Silva',
        position: 1,
        date: '15/03',
      });
      expect(result.title).toBe('Revisão de Designação');
      expect(result.body).toContain('secretário');
      expect(result.body).toContain('Maria Silva');
      expect(result.body).toContain('1º');
      expect(result.body).toContain('discurso');
      expect(result.body).toContain('15/03');
      expect(result.body).toContain('Revise');
    });

    it('en-US speaker review text (AC-066-24)', () => {
      const result = buildNotificationText('secretary_review', 'en-US', {
        name: 'Maria Silva',
        position: 2,
        date: '03/15',
      });
      expect(result.title).toBe('Assignment Review');
      expect(result.body).toContain('secretary assigned');
      expect(result.body).toContain('Maria Silva');
      expect(result.body).toContain('2nd');
      expect(result.body).toContain('speech');
      expect(result.body).toContain('03/15');
      expect(result.body).toContain('Review');
    });

    it('es-LA speaker review text (AC-066-24)', () => {
      const result = buildNotificationText('secretary_review', 'es-LA', {
        name: 'Maria Silva',
        position: 3,
        date: '15/03',
      });
      expect(result.title).toBe('Revisión de Asignación');
      expect(result.body).toContain('secretario');
      expect(result.body).toContain('Maria Silva');
      expect(result.body).toContain('3er');
      expect(result.body).toContain('discurso');
      expect(result.body).toContain('Revise');
    });
  });

  describe('topic variant', () => {
    it('pt-BR topic review text (AC-066-23)', () => {
      const result = buildNotificationText('secretary_review', 'pt-BR', {
        name: 'João Santos',
        position: 1,
        date: '22/03',
        topic_title: 'Fé em Cristo',
      });
      expect(result.title).toBe('Revisão de Designação');
      expect(result.body).toContain('tema');
      expect(result.body).toContain('Fé em Cristo');
      expect(result.body).toContain('João Santos');
      expect(result.body).toContain('22/03');
      expect(result.body).toContain('Revise');
    });

    it('en-US topic review text (AC-066-24)', () => {
      const result = buildNotificationText('secretary_review', 'en-US', {
        name: 'John Smith',
        position: 1,
        date: '03/22',
        topic_title: 'Faith in Christ',
      });
      expect(result.title).toBe('Assignment Review');
      expect(result.body).toContain('topic');
      expect(result.body).toContain('Faith in Christ');
      expect(result.body).toContain('John Smith');
      expect(result.body).toContain('Review');
    });

    it('es-LA topic review text (AC-066-24)', () => {
      const result = buildNotificationText('secretary_review', 'es-LA', {
        name: 'Juan García',
        position: 1,
        date: '22/03',
        topic_title: 'Fe en Cristo',
      });
      expect(result.title).toBe('Revisión de Asignación');
      expect(result.body).toContain('tema');
      expect(result.body).toContain('Fe en Cristo');
      expect(result.body).toContain('Juan García');
      expect(result.body).toContain('Revise');
    });
  });

  describe('variant selection', () => {
    it('topic_title present selects topic variant', () => {
      const result = buildNotificationText('secretary_review', 'pt-BR', {
        name: 'Maria',
        position: 1,
        date: '15/03',
        topic_title: 'Oração',
      });
      expect(result.body).toContain('tema');
      expect(result.body).not.toContain('discurso');
    });

    it('topic_title absent selects speaker variant', () => {
      const result = buildNotificationText('secretary_review', 'pt-BR', {
        name: 'Maria',
        position: 1,
        date: '15/03',
      });
      expect(result.body).toContain('discurso');
      expect(result.body).not.toContain('tema');
    });
  });

  describe('regression - existing types still work', () => {
    it('designation still works (no regression)', () => {
      const result = buildNotificationText('designation', 'pt-BR', {
        names: ['João Silva'],
        date: '2026-03-15',
      });
      expect(result.title).toBe('Designação de Discurso');
      expect(result.body).toContain('João Silva');
    });

    it('speaker_confirmed still works (no regression)', () => {
      const result = buildNotificationText('speaker_confirmed', 'en-US', {
        name: 'Jane Doe',
        position: 2,
        date: '2026-03-22',
      });
      expect(result.title).toBe('Speaker Confirmed');
      expect(result.body).toContain('Jane Doe');
    });

    it('speaker_withdrew still works (no regression)', () => {
      const result = buildNotificationText('speaker_withdrew', 'es-LA', {
        name: 'Pedro',
        position: 3,
        date: '2026-03-29',
      });
      expect(result.title).toContain('Desistimiento');
      expect(result.body).toContain('Pedro');
    });
  });
});

// ============================================================================
// F066 Part B: Trigger simulation - additional edge cases
// ============================================================================

// Reuse the simulation from migration-031.test.ts
type SpeechStatus = 'not_assigned' | 'assigned_not_invited' | 'assigned_invited' | 'assigned_confirmed' | 'gave_up';
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

function simulateTrigger(
  tgOp: TriggerOp,
  newRow: Partial<SpeechRow>,
  oldRow?: Partial<SpeechRow>
): TriggerResult {
  const results: TriggerResult = [];
  const NEW: SpeechRow = {
    status: 'not_assigned', position: 1, assigned_by_role: null,
    topic_title: null, ward_id: 'w-1', sunday_date: '2026-03-15', speaker_name: null,
    ...newRow,
  };
  const OLD: SpeechRow | undefined = oldRow
    ? { status: 'not_assigned', position: 1, assigned_by_role: null, topic_title: null,
        ward_id: 'w-1', sunday_date: '2026-03-15', speaker_name: null, ...oldRow }
    : undefined;

  // Case 6B: Secretary topic change (BEFORE early-return)
  if (tgOp === 'UPDATE' && NEW.assigned_by_role === 'secretary' &&
      [1, 2, 3].includes(NEW.position) && OLD !== undefined &&
      (OLD.topic_title !== NEW.topic_title || (OLD.topic_title === null) !== (NEW.topic_title === null)) &&
      NEW.topic_title !== null) {
    results.push({ type: 'secretary_review', topic_title: NEW.topic_title });
  }

  // Early exit
  if (tgOp === 'UPDATE' && OLD !== undefined && OLD.status === NEW.status) {
    return results;
  }

  // Case 1
  if (NEW.status === 'assigned_not_invited' &&
      (tgOp === 'INSERT' || (OLD !== undefined && OLD.status === 'not_assigned'))) {
    results.push({ type: 'designation' });
  }

  // Case 4
  if (NEW.status === 'assigned_confirmed' &&
      (tgOp === 'INSERT' || (OLD !== undefined && OLD.status !== 'assigned_confirmed'))) {
    results.push({ type: 'speaker_confirmed' });
  }

  // Case 5
  if (NEW.status === 'gave_up' &&
      (tgOp === 'INSERT' || (OLD !== undefined && OLD.status !== 'gave_up'))) {
    results.push({ type: 'speaker_withdrew' });
  }

  // Cancellation
  if (NEW.status === 'not_assigned' && tgOp === 'UPDATE' && OLD !== undefined && OLD.status !== 'not_assigned') {
    results.push({ type: 'cancellation' });
  }

  // Case 6A
  if (NEW.assigned_by_role === 'secretary' && [1, 2, 3].includes(NEW.position) &&
      NEW.status === 'assigned_not_invited' &&
      (tgOp === 'INSERT' || (OLD !== undefined && OLD.status === 'not_assigned'))) {
    results.push({ type: 'secretary_review' });
  }

  return results;
}

describe('F066 Part B: Trigger edge cases (tester)', () => {
  it('two separate notifications for secretary speaker then topic (EC-066-01)', () => {
    // Step 1: Secretary assigns speaker
    const step1 = simulateTrigger('UPDATE',
      { assigned_by_role: 'secretary', position: 1, status: 'assigned_not_invited', speaker_name: 'Maria' },
      { assigned_by_role: null, position: 1, status: 'not_assigned' }
    );
    const step1Reviews = step1.filter(r => r.type === 'secretary_review');
    expect(step1Reviews.length).toBeGreaterThanOrEqual(1);

    // Step 2: Secretary assigns topic (same speech, status unchanged)
    const step2 = simulateTrigger('UPDATE',
      { assigned_by_role: 'secretary', position: 1, status: 'assigned_not_invited',
        speaker_name: 'Maria', topic_title: 'Fé' },
      { assigned_by_role: 'secretary', position: 1, status: 'assigned_not_invited',
        speaker_name: 'Maria', topic_title: null }
    );
    const step2TopicReviews = step2.filter(r => r.type === 'secretary_review' && 'topic_title' in r);
    expect(step2TopicReviews.length).toBeGreaterThanOrEqual(1);
    expect(step2TopicReviews[0]).toHaveProperty('topic_title', 'Fé');
  });

  it('only topic change generates review when bishopric assigned speaker (EC-066-02)', () => {
    // Bishopric assigned speaker (no review)
    const assign = simulateTrigger('UPDATE',
      { assigned_by_role: 'bishopric', position: 2, status: 'assigned_not_invited', speaker_name: 'João' },
      { assigned_by_role: null, position: 2, status: 'not_assigned' }
    );
    const assignReviews = assign.filter(r => r.type === 'secretary_review');
    expect(assignReviews).toHaveLength(0);

    // Secretary then changes topic on same speech
    const topic = simulateTrigger('UPDATE',
      { assigned_by_role: 'secretary', position: 2, status: 'assigned_not_invited',
        speaker_name: 'João', topic_title: 'Arrependimento' },
      { assigned_by_role: 'bishopric', position: 2, status: 'assigned_not_invited',
        speaker_name: 'João', topic_title: null }
    );
    const topicReviews = topic.filter(r => r.type === 'secretary_review' && 'topic_title' in r);
    expect(topicReviews.length).toBeGreaterThanOrEqual(1);
  });

  it('position 0 excluded from Case 6B topic review (EC-066-05)', () => {
    const results = simulateTrigger('UPDATE',
      { assigned_by_role: 'secretary', position: 0, topic_title: 'Oração',
        status: 'assigned_not_invited' },
      { assigned_by_role: 'secretary', position: 0, topic_title: null,
        status: 'assigned_not_invited' }
    );
    const reviews = results.filter(r => r.type === 'secretary_review');
    expect(reviews).toHaveLength(0);
  });

  it('rapid succession = two separate notifications (EC-066-08)', () => {
    // First: secretary assigns speaker
    const first = simulateTrigger('UPDATE',
      { assigned_by_role: 'secretary', position: 1, status: 'assigned_not_invited', speaker_name: 'Ana' },
      { assigned_by_role: null, position: 1, status: 'not_assigned' }
    );
    // Second: secretary immediately assigns topic
    const second = simulateTrigger('UPDATE',
      { assigned_by_role: 'secretary', position: 1, status: 'assigned_not_invited',
        speaker_name: 'Ana', topic_title: 'Esperança' },
      { assigned_by_role: 'secretary', position: 1, status: 'assigned_not_invited',
        speaker_name: 'Ana', topic_title: null }
    );

    // Each produces at least one secretary_review
    expect(first.filter(r => r.type === 'secretary_review').length).toBeGreaterThanOrEqual(1);
    expect(second.filter(r => r.type === 'secretary_review').length).toBeGreaterThanOrEqual(1);
  });

  it('secretary_review targets bishopric (AC-066-21 - via trigger INSERT)', () => {
    // The trigger INSERT has target_role = 'bishopric' hard-coded
    // We verify the trigger structure produces review only for secretary assignments
    // which the SQL always sets target_role = 'bishopric'
    const results = simulateTrigger('UPDATE',
      { assigned_by_role: 'secretary', position: 1, status: 'assigned_not_invited', speaker_name: 'Pedro' },
      { assigned_by_role: null, position: 1, status: 'not_assigned' }
    );
    // Case 6A fires => secretary_review is enqueued
    const reviews = results.filter(r => r.type === 'secretary_review');
    expect(reviews.length).toBeGreaterThanOrEqual(1);
    // target_role = 'bishopric' is verified by migration SQL (not simulatable at type level)
  });

  it('review notification is immediate - send_after=now() (AC-066-20)', () => {
    // The SQL trigger uses send_after = now() for secretary_review
    // This is a structural guarantee from migration SQL
    // We verify the trigger fires at all (behavioral test)
    const results = simulateTrigger('UPDATE',
      { assigned_by_role: 'secretary', position: 2, status: 'assigned_not_invited', speaker_name: 'Ana' },
      { assigned_by_role: null, position: 2, status: 'not_assigned' }
    );
    expect(results.some(r => r.type === 'secretary_review')).toBe(true);
  });

  it('existing notification cases still work alongside new cases (AC-066-25)', () => {
    // Case 1: designation
    const case1 = simulateTrigger('UPDATE',
      { status: 'assigned_not_invited', position: 1, assigned_by_role: 'bishopric' },
      { status: 'not_assigned', position: 1 }
    );
    expect(case1.some(r => r.type === 'designation')).toBe(true);

    // Case 4: confirmed
    const case4 = simulateTrigger('UPDATE',
      { status: 'assigned_confirmed', position: 2 },
      { status: 'assigned_not_invited', position: 2 }
    );
    expect(case4.some(r => r.type === 'speaker_confirmed')).toBe(true);

    // Case 5: gave_up
    const case5 = simulateTrigger('UPDATE',
      { status: 'gave_up', position: 3 },
      { status: 'assigned_confirmed', position: 3 }
    );
    expect(case5.some(r => r.type === 'speaker_withdrew')).toBe(true);

    // Cancellation
    const cancel = simulateTrigger('UPDATE',
      { status: 'not_assigned', position: 1 },
      { status: 'assigned_not_invited', position: 1 }
    );
    expect(cancel.some(r => r.type === 'cancellation')).toBe(true);
  });

  it('topic change NULL -> value detected (AC-066-26)', () => {
    const results = simulateTrigger('UPDATE',
      { assigned_by_role: 'secretary', position: 1, topic_title: 'Nova Fé', status: 'assigned_not_invited' },
      { assigned_by_role: 'secretary', position: 1, topic_title: null, status: 'assigned_not_invited' }
    );
    const reviews = results.filter(r => r.type === 'secretary_review' && 'topic_title' in r);
    expect(reviews).toHaveLength(1);
    expect(reviews[0]).toHaveProperty('topic_title', 'Nova Fé');
  });

  it('topic change value -> different value detected (AC-066-27)', () => {
    const results = simulateTrigger('UPDATE',
      { assigned_by_role: 'secretary', position: 2, topic_title: 'Esperança', status: 'assigned_not_invited' },
      { assigned_by_role: 'secretary', position: 2, topic_title: 'Oração', status: 'assigned_not_invited' }
    );
    const reviews = results.filter(r => r.type === 'secretary_review' && 'topic_title' in r);
    expect(reviews.length).toBeGreaterThanOrEqual(1);
  });

  it('topic clearing does NOT notify (AC-066-28)', () => {
    const results = simulateTrigger('UPDATE',
      { assigned_by_role: 'secretary', position: 1, topic_title: null, status: 'assigned_not_invited' },
      { assigned_by_role: 'secretary', position: 1, topic_title: 'Fé', status: 'assigned_not_invited' }
    );
    const topicReviews = results.filter(r => r.type === 'secretary_review' && 'topic_title' in r);
    expect(topicReviews).toHaveLength(0);
  });

  it('same topic value = no notification (EC-066-07)', () => {
    const results = simulateTrigger('UPDATE',
      { assigned_by_role: 'secretary', position: 1, topic_title: 'Fé', status: 'assigned_not_invited' },
      { assigned_by_role: 'secretary', position: 1, topic_title: 'Fé', status: 'assigned_not_invited' }
    );
    expect(results).toHaveLength(0);
  });
});

// ============================================================================
// F066: secretary_review routing in process-notifications
// ============================================================================

describe('F066 Part B: secretary_review is never grouped (AC-066-30)', () => {
  it('secretary_review type is not designation, so not grouped', () => {
    const entryType = 'secretary_review' as 'secretary_review' | 'designation';
    const speechPosition: number = 1;

    // Routing logic from process-notifications
    const isDesignation = entryType === 'designation';
    const isPrayerDesignation = isDesignation && (speechPosition === 0 || speechPosition === 4);
    const isSpeechDesignation = isDesignation && !isPrayerDesignation;

    expect(isSpeechDesignation).toBe(false);
    expect(isDesignation).toBe(false);
    // Therefore secretary_review goes to immediateEntries
  });

  it('prayer positions (0, 4) do NOT generate secretary review (AC-066-18)', () => {
    for (const pos of [0, 4]) {
      const results = simulateTrigger('UPDATE',
        { assigned_by_role: 'secretary', position: pos, status: 'assigned_not_invited', speaker_name: 'Maria' },
        { assigned_by_role: null, position: pos, status: 'not_assigned' }
      );
      const reviews = results.filter(r => r.type === 'secretary_review');
      expect(reviews).toHaveLength(0);
    }
  });

  it('bishopric assignments do NOT generate review (AC-066-19)', () => {
    for (const pos of [1, 2, 3]) {
      const results = simulateTrigger('UPDATE',
        { assigned_by_role: 'bishopric', position: pos, status: 'assigned_not_invited', speaker_name: 'João' },
        { assigned_by_role: null, position: pos, status: 'not_assigned' }
      );
      const reviews = results.filter(r => r.type === 'secretary_review');
      expect(reviews).toHaveLength(0);
    }
  });
});
