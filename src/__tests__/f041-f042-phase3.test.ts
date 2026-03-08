/**
 * Phase 3 Tests: F041 (CR-253) Permission Model Rework + F042 (CR-255) Actor Single Role Enum
 *
 * F041: Verifies prayer:assign/prayer:unassign permissions, secretary restriction from
 *       speech:assign/speech:unassign, and position-aware permission logic.
 * F042: Verifies ActorRole type, single role field in MeetingActor/CreateActorInput/UpdateActorInput,
 *       filterActorsByRole with role field, and actorKeys with new role names.
 */

import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  getPermissions,
  ALL_PERMISSIONS,
  ALL_ROLES,
} from '../lib/permissions';
import {
  filterActorsByRole,
  sortActors,
  actorKeys,
} from '../hooks/useActors';
import type {
  Role,
  Permission,
  ActorRole,
  MeetingActor,
  CreateActorInput,
  UpdateActorInput,
} from '../types/database';

// =============================================================================
// F041 (CR-253): PERMISSION MODEL REWORK
// =============================================================================

describe('F041 (CR-253): Permission Model Rework', () => {

  // --- AC-F005-01: Bishopric has full access ---
  describe('AC-F005-01: Bishopric has full access to all speech and prayer positions', () => {
    it('bishopric has speech:assign', () => {
      expect(hasPermission('bishopric', 'speech:assign')).toBe(true);
    });

    it('bishopric has speech:unassign', () => {
      expect(hasPermission('bishopric', 'speech:unassign')).toBe(true);
    });

    it('bishopric has prayer:assign', () => {
      expect(hasPermission('bishopric', 'prayer:assign')).toBe(true);
    });

    it('bishopric has prayer:unassign', () => {
      expect(hasPermission('bishopric', 'prayer:unassign')).toBe(true);
    });

    it('bishopric has speech:change_status', () => {
      expect(hasPermission('bishopric', 'speech:change_status')).toBe(true);
    });

    it('bishopric has 26 total permissions', () => {
      expect(getPermissions('bishopric')).toHaveLength(26);
    });
  });

  // --- AC-F005-02: Secretary CAN assign speakers to speech positions (CR-276) ---
  describe('AC-F005-02: Secretary pos 1-3 speaker assignable (has speech:assign, CR-276)', () => {
    it('secretary HAS speech:assign', () => {
      expect(hasPermission('secretary', 'speech:assign')).toBe(true);
    });

    it('position-aware logic: isPrayer=false uses speech:assign', () => {
      // Simulates SpeechSlot ternary: isPrayer ? 'prayer:assign' : 'speech:assign'
      const isPrayer = false;
      const permission: Permission = isPrayer ? 'prayer:assign' : 'speech:assign';
      expect(permission).toBe('speech:assign');
      expect(hasPermission('secretary', permission)).toBe(true);
    });
  });

  // --- AC-F005-03: Secretary CAN assign topics to speech positions (CR-276) ---
  describe('AC-F005-03: Secretary pos 1-3 topic assignable (same permission as speaker, CR-276)', () => {
    it('topic assignment uses same canAssign as speaker assignment', () => {
      // In SpeechSlot, topic press is gated by canAssign (same as speaker)
      const isPrayer = false;
      const permission: Permission = isPrayer ? 'prayer:assign' : 'speech:assign';
      expect(hasPermission('secretary', permission)).toBe(true);
    });
  });

  // --- AC-F005-04: Secretary CAN assign speakers to prayer positions ---
  describe('AC-F005-04: Secretary pos 0,4 speaker interactive (has prayer:assign)', () => {
    it('secretary has prayer:assign', () => {
      expect(hasPermission('secretary', 'prayer:assign')).toBe(true);
    });

    it('position-aware logic: isPrayer=true uses prayer:assign', () => {
      const isPrayer = true;
      const permission: Permission = isPrayer ? 'prayer:assign' : 'speech:assign';
      expect(permission).toBe('prayer:assign');
      expect(hasPermission('secretary', permission)).toBe(true);
    });
  });

  // --- AC-F005-05: Secretary CAN unassign speakers from prayer positions ---
  describe('AC-F005-05: Secretary pos 0,4 can unassign (has prayer:unassign)', () => {
    it('secretary has prayer:unassign', () => {
      expect(hasPermission('secretary', 'prayer:unassign')).toBe(true);
    });

    it('position-aware logic: isPrayer=true uses prayer:unassign', () => {
      const isPrayer = true;
      const permission: Permission = isPrayer ? 'prayer:unassign' : 'speech:unassign';
      expect(permission).toBe('prayer:unassign');
      expect(hasPermission('secretary', permission)).toBe(true);
    });
  });

  // --- AC-F005-06: Secretary CAN change status of any position ---
  describe('AC-F005-06: Secretary can change status at any position', () => {
    it('secretary has speech:change_status', () => {
      expect(hasPermission('secretary', 'speech:change_status')).toBe(true);
    });

    it('canChangeStatus does not depend on isPrayer', () => {
      // In SpeechSlot, canChangeStatus = hasPermission('speech:change_status')
      // It is NOT position-aware -- same permission for all positions
      expect(hasPermission('secretary', 'speech:change_status')).toBe(true);
    });
  });

  // --- AC-F005-07: Observer permissions unchanged ---
  describe('AC-F005-07: Observer no changes (3 permissions)', () => {
    it('observer has exactly 3 permissions', () => {
      expect(getPermissions('observer')).toHaveLength(3);
    });

    it('observer does NOT have prayer:assign', () => {
      expect(hasPermission('observer', 'prayer:assign')).toBe(false);
    });

    it('observer does NOT have prayer:unassign', () => {
      expect(hasPermission('observer', 'prayer:unassign')).toBe(false);
    });

    it('observer does NOT have speech:change_status', () => {
      expect(hasPermission('observer', 'speech:change_status')).toBe(false);
    });
  });

  // --- AC-F014-01/02: Prayer vs Speech assignment permissions ---
  describe('AC-F014-01/02: Position-aware permission routing', () => {
    const positions = [
      { pos: 0, isPrayer: true, label: 'opening prayer' },
      { pos: 1, isPrayer: false, label: 'speech 1' },
      { pos: 2, isPrayer: false, label: 'speech 2' },
      { pos: 3, isPrayer: false, label: 'speech 3' },
      { pos: 4, isPrayer: true, label: 'closing prayer' },
    ];

    for (const { pos, isPrayer, label } of positions) {
      it(`position ${pos} (${label}) uses ${isPrayer ? 'prayer' : 'speech'}:assign`, () => {
        const permission: Permission = isPrayer ? 'prayer:assign' : 'speech:assign';
        if (isPrayer) {
          expect(permission).toBe('prayer:assign');
        } else {
          expect(permission).toBe('speech:assign');
        }
      });
    }
  });

  // --- AC-F014-03: Secretary CAN assign to speech positions (CR-276) ---
  describe('AC-F014-03: Secretary can assign speakers to speech positions (CR-276)', () => {
    it('secretary at pos 1 (speech) CAN assign', () => {
      const isPrayer = false;
      const perm: Permission = isPrayer ? 'prayer:assign' : 'speech:assign';
      expect(hasPermission('secretary', perm)).toBe(true);
    });

    it('secretary at pos 0 (prayer) CAN assign', () => {
      const isPrayer = true;
      const perm: Permission = isPrayer ? 'prayer:assign' : 'speech:assign';
      expect(hasPermission('secretary', perm)).toBe(true);
    });

    it('bishopric at pos 1 (speech) CAN assign', () => {
      const isPrayer = false;
      const perm: Permission = isPrayer ? 'prayer:assign' : 'speech:assign';
      expect(hasPermission('bishopric', perm)).toBe(true);
    });

    it('bishopric at pos 0 (prayer) CAN assign', () => {
      const isPrayer = true;
      const perm: Permission = isPrayer ? 'prayer:assign' : 'speech:assign';
      expect(hasPermission('bishopric', perm)).toBe(true);
    });
  });

  // --- AC-F015-01/02: Topic assignment follows same permission model ---
  describe('AC-F015-01/02: Topic assignment permission at speech positions', () => {
    it('secretary can assign topics to pos 1-3 (has speech:assign, CR-276)', () => {
      // Topic press is gated by canAssign, which is speech:assign for pos 1-3
      expect(hasPermission('secretary', 'speech:assign')).toBe(true);
    });

    it('bishopric can assign topics to pos 1-3 (has speech:assign)', () => {
      expect(hasPermission('bishopric', 'speech:assign')).toBe(true);
    });
  });

  // --- BR009: Permission matrix completeness ---
  describe('BR009: Permission matrix updated', () => {
    it('ALL_PERMISSIONS has 26 entries', () => {
      expect(ALL_PERMISSIONS).toHaveLength(26);
    });

    it('ALL_PERMISSIONS includes prayer:assign and prayer:unassign', () => {
      expect(ALL_PERMISSIONS).toContain('prayer:assign');
      expect(ALL_PERMISSIONS).toContain('prayer:unassign');
    });

    it('secretary has 26 permissions (CR-276: +3 speech:assign, speech:unassign, home:next_assignments)', () => {
      expect(getPermissions('secretary')).toHaveLength(26);
    });

    it('secretary HAS speech:unassign (CR-276)', () => {
      expect(hasPermission('secretary', 'speech:unassign')).toBe(true);
    });

    it('every permission in ALL_PERMISSIONS is checked against all 3 roles without error', () => {
      for (const perm of ALL_PERMISSIONS) {
        for (const role of ALL_ROLES) {
          // Should not throw
          const result = hasPermission(role, perm);
          expect(typeof result).toBe('boolean');
        }
      }
    });
  });
});

// =============================================================================
// F042 (CR-255): ACTOR SINGLE ROLE ENUM
// =============================================================================

describe('F042 (CR-255): Actor Single Role Enum', () => {

  // Helper
  function makeActor(overrides: Partial<MeetingActor> & { name: string }): MeetingActor {
    return {
      id: overrides.id ?? `uuid-${Math.random().toString(36).slice(2)}`,
      ward_id: overrides.ward_id ?? 'ward-1',
      name: overrides.name,
      role: overrides.role ?? 'preside',
      created_at: overrides.created_at ?? '2026-01-01T00:00:00Z',
      updated_at: overrides.updated_at ?? '2026-01-01T00:00:00Z',
    };
  }

  // --- AC-F009-01: Actor has single role field ---
  describe('AC-F009-01: Actor has single role field', () => {
    it('MeetingActor has role property', () => {
      const actor = makeActor({ name: 'Bishop Jones' });
      expect(actor).toHaveProperty('role');
      expect(actor.role).toBe('preside');
    });

    it('MeetingActor does NOT have boolean flag properties', () => {
      const actor = makeActor({ name: 'Bishop Jones' });
      expect(actor).not.toHaveProperty('can_preside');
      expect(actor).not.toHaveProperty('can_conduct');
      expect(actor).not.toHaveProperty('can_recognize');
      expect(actor).not.toHaveProperty('can_pianist');
      expect(actor).not.toHaveProperty('can_conductor');
    });

    it('ActorRole covers all 5 roles', () => {
      const roles: ActorRole[] = ['preside', 'conduct', 'recognize', 'pianist', 'conductor'];
      expect(roles).toHaveLength(5);

      // Verify each can be assigned to an actor
      for (const role of roles) {
        const actor = makeActor({ name: `Actor-${role}`, role });
        expect(actor.role).toBe(role);
      }
    });
  });

  // --- AC-F009-02: Actor creation sets single role ---
  describe('AC-F009-02: Actor creation uses single role', () => {
    it('CreateActorInput has required role field', () => {
      const input: CreateActorInput = { name: 'New Actor', role: 'preside' };
      expect(input.role).toBe('preside');
    });

    it('CreateActorInput works with all 5 roles', () => {
      const roles: ActorRole[] = ['preside', 'conduct', 'recognize', 'pianist', 'conductor'];
      for (const role of roles) {
        const input: CreateActorInput = { name: `Actor-${role}`, role };
        expect(input.role).toBe(role);
        expect(input.name).toBe(`Actor-${role}`);
      }
    });

    it('UpdateActorInput has optional role field', () => {
      const input1: UpdateActorInput = { id: 'uuid-1', role: 'conduct' };
      expect(input1.role).toBe('conduct');

      const input2: UpdateActorInput = { id: 'uuid-1', name: 'Renamed' };
      expect(input2.role).toBeUndefined();
    });
  });

  // --- AC-F009-03: Actor filtering uses role field ---
  describe('AC-F009-03: Actor filtering uses role field', () => {
    const actors = [
      makeActor({ name: 'Bishop', role: 'preside' }),
      makeActor({ name: 'Counselor', role: 'conduct' }),
      makeActor({ name: 'Clerk', role: 'recognize' }),
      makeActor({ name: 'Pianist', role: 'pianist' }),
      makeActor({ name: 'Conductor', role: 'conductor' }),
    ];

    it('filterActorsByRole returns all for "all" filter', () => {
      expect(filterActorsByRole(actors, 'all')).toHaveLength(5);
    });

    it('filterActorsByRole filters by preside', () => {
      const result = filterActorsByRole(actors, 'preside');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Bishop');
    });

    it('filterActorsByRole filters by conduct', () => {
      const result = filterActorsByRole(actors, 'conduct');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Counselor');
    });

    it('filterActorsByRole filters by recognize', () => {
      const result = filterActorsByRole(actors, 'recognize');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Clerk');
    });

    it('filterActorsByRole filters by pianist', () => {
      const result = filterActorsByRole(actors, 'pianist');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Pianist');
    });

    it('filterActorsByRole filters by conductor', () => {
      const result = filterActorsByRole(actors, 'conductor');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Conductor');
    });

    it('filterActorsByRole returns empty when no match', () => {
      const presidingOnly = [makeActor({ name: 'Bishop', role: 'preside' })];
      expect(filterActorsByRole(presidingOnly, 'pianist')).toHaveLength(0);
    });

    it('filterActorsByRole handles multiple actors with same role', () => {
      const multiPresiders = [
        makeActor({ name: 'Bishop A', role: 'preside' }),
        makeActor({ name: 'Bishop B', role: 'preside' }),
        makeActor({ name: 'Pianist', role: 'pianist' }),
      ];
      expect(filterActorsByRole(multiPresiders, 'preside')).toHaveLength(2);
    });
  });

  // --- actorKeys use new role names (no can_ prefix) ---
  describe('actorKeys use new role names (no can_ prefix)', () => {
    it('byRole generates correct key for preside', () => {
      expect(actorKeys.byRole('ward-1', 'preside')).toEqual([
        'actors', 'byRole', 'ward-1', 'preside',
      ]);
    });

    it('byRole generates correct key for conduct', () => {
      expect(actorKeys.byRole('ward-1', 'conduct')).toEqual([
        'actors', 'byRole', 'ward-1', 'conduct',
      ]);
    });

    it('byRole generates correct key for pianist', () => {
      expect(actorKeys.byRole('ward-1', 'pianist')).toEqual([
        'actors', 'byRole', 'ward-1', 'pianist',
      ]);
    });

    it('byRole generates correct key for conductor', () => {
      expect(actorKeys.byRole('ward-1', 'conductor')).toEqual([
        'actors', 'byRole', 'ward-1', 'conductor',
      ]);
    });

    it('byRole keys do NOT contain can_ prefix', () => {
      const key = actorKeys.byRole('ward-1', 'preside');
      for (const segment of key) {
        expect(segment).not.toContain('can_');
      }
    });
  });

  // --- sortActors works with new role field ---
  describe('sortActors with role-based actors', () => {
    it('sorts alphabetically by name regardless of role', () => {
      const actors = [
        makeActor({ name: 'Zelda', role: 'pianist' }),
        makeActor({ name: 'Ana', role: 'preside' }),
        makeActor({ name: 'Maria', role: 'conduct' }),
      ];
      const sorted = sortActors(actors);
      expect(sorted[0].name).toBe('Ana');
      expect(sorted[1].name).toBe('Maria');
      expect(sorted[2].name).toBe('Zelda');
    });

    it('preserves role after sorting', () => {
      const actors = [
        makeActor({ name: 'Zelda', role: 'pianist' }),
        makeActor({ name: 'Ana', role: 'preside' }),
      ];
      const sorted = sortActors(actors);
      expect(sorted[0].role).toBe('preside');
      expect(sorted[1].role).toBe('pianist');
    });
  });
});

// =============================================================================
// CROSS-FEATURE: F041 + F042 interaction verification
// =============================================================================

describe('F041 + F042: Cross-feature verification', () => {
  it('prayer:assign and prayer:unassign are in ALL_PERMISSIONS', () => {
    expect(ALL_PERMISSIONS).toContain('prayer:assign');
    expect(ALL_PERMISSIONS).toContain('prayer:unassign');
  });

  it('ActorRole values match expected enum', () => {
    const expectedRoles: ActorRole[] = ['preside', 'conduct', 'recognize', 'pianist', 'conductor'];
    for (const role of expectedRoles) {
      const actor: MeetingActor = {
        id: 'test',
        ward_id: 'ward-1',
        name: 'Test',
        role,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };
      expect(actor.role).toBe(role);
    }
  });

  it('permission and actor types are independent (no coupling)', () => {
    // Permissions don't reference ActorRole, actors don't reference Permission
    // Verify both systems work independently
    const permResult = hasPermission('secretary', 'prayer:assign');
    expect(permResult).toBe(true);

    const actors = [
      { id: '1', ward_id: 'w', name: 'A', role: 'preside' as ActorRole, created_at: '', updated_at: '' },
    ];
    const filtered = filterActorsByRole(actors, 'preside');
    expect(filtered).toHaveLength(1);
  });
});
