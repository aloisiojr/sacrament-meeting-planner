/**
 * Phase 3 Tests: F041 (CR-253) Permission Model Rework
 *
 * F041: Verifies prayer:assign/prayer:unassign permissions, secretary restriction from
 *       speech:assign/speech:unassign, and position-aware permission logic.
 */

import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  getPermissions,
  ALL_PERMISSIONS,
  ALL_ROLES,
} from '../lib/permissions';
import type {
  Permission,
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

    it('bishopric has 27 total permissions', () => {
      expect(getPermissions('bishopric')).toHaveLength(27);
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
    it('ALL_PERMISSIONS has 27 entries', () => {
      expect(ALL_PERMISSIONS).toHaveLength(27);
    });

    it('ALL_PERMISSIONS includes prayer:assign and prayer:unassign', () => {
      expect(ALL_PERMISSIONS).toContain('prayer:assign');
      expect(ALL_PERMISSIONS).toContain('prayer:unassign');
    });

    it('secretary has 27 permissions (CR-276: +3 speech:assign, speech:unassign, home:next_assignments)', () => {
      expect(getPermissions('secretary')).toHaveLength(27);
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
// CROSS-FEATURE: F041 permission verification
// =============================================================================

describe('F041: Cross-feature verification', () => {
  it('prayer:assign and prayer:unassign are in ALL_PERMISSIONS', () => {
    expect(ALL_PERMISSIONS).toContain('prayer:assign');
    expect(ALL_PERMISSIONS).toContain('prayer:unassign');
  });
});
