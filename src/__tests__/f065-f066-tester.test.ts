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
    calling: overrides.calling ?? null,
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
// The trigger-simulation blocks that lived here were deleted.
//
// They defined `simulateTrigger()` — a JavaScript re-implementation of the
// PL/pgSQL trigger in supabase/migrations — and then asserted that
// re-implementation. 46 it-blocks that could not fail whatever the SQL did, and
// which would keep passing after the trigger was dropped from the database.
//
// The SQL is only observable against a real Postgres, which this suite does not
// have. What IS reachable is what the trigger's OUTPUT feeds, and that is now
// covered for real: edge-process-notifications.test.ts executes the function
// that consumes notification_queue, including secretary_review routing (never
// grouped), the three-language texts, role targeting and token cleanup.
// ============================================================================
