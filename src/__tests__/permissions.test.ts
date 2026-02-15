import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  getPermissions,
  ALL_PERMISSIONS,
  ALL_ROLES,
} from '../lib/permissions';
import type { Role, Permission } from '../lib/permissions';

/**
 * The complete expected permission matrix from F023.
 * true = role has permission, false = role does not.
 */
const EXPECTED_MATRIX: Record<Permission, Record<Role, boolean>> = {
  'speech:assign': { bishopric: true, secretary: false, observer: false },
  'speech:unassign': { bishopric: true, secretary: false, observer: false },
  'speech:change_status': { bishopric: true, secretary: true, observer: false },
  'member:read': { bishopric: true, secretary: true, observer: true },
  'member:write': { bishopric: true, secretary: true, observer: false },
  'member:import': { bishopric: true, secretary: true, observer: false },
  'topic:write': { bishopric: true, secretary: true, observer: false },
  'collection:toggle': { bishopric: true, secretary: true, observer: false },
  'sunday_type:write': { bishopric: true, secretary: true, observer: false },
  'settings:access': { bishopric: true, secretary: true, observer: false },
  'settings:language': { bishopric: true, secretary: true, observer: false },
  'settings:whatsapp': { bishopric: true, secretary: true, observer: false },
  'settings:users': { bishopric: true, secretary: false, observer: false },
  'invite:manage': { bishopric: true, secretary: true, observer: false },
  'home:next_assignments': { bishopric: true, secretary: false, observer: false },
  'home:invite_mgmt': { bishopric: false, secretary: true, observer: false },
  'agenda:read': { bishopric: true, secretary: true, observer: true },
  'agenda:write': { bishopric: true, secretary: true, observer: false },
  'agenda:assign_speaker': { bishopric: true, secretary: true, observer: false },
  'presentation:start': { bishopric: true, secretary: true, observer: true },
  'push:receive': { bishopric: true, secretary: true, observer: false },
  'invitation:create': { bishopric: true, secretary: true, observer: false },
  'history:read': { bishopric: true, secretary: true, observer: false },
};

describe('Permissions', () => {
  describe('hasPermission - exhaustive matrix test', () => {
    // Test every cell of the F023 permission matrix
    for (const permission of ALL_PERMISSIONS) {
      for (const role of ALL_ROLES) {
        const expected = EXPECTED_MATRIX[permission][role];
        it(`${role} ${expected ? 'HAS' : 'does NOT have'} ${permission}`, () => {
          expect(hasPermission(role, permission)).toBe(expected);
        });
      }
    }
  });

  describe('hasPermission - specific role verification', () => {
    it('should grant Bishopric all expected permissions', () => {
      const expected: Permission[] = [
        'speech:assign',
        'speech:unassign',
        'speech:change_status',
        'member:read',
        'member:write',
        'member:import',
        'topic:write',
        'collection:toggle',
        'sunday_type:write',
        'settings:access',
        'settings:language',
        'settings:whatsapp',
        'settings:users',
        'invite:manage',
        'home:next_assignments',
        'agenda:read',
        'agenda:write',
        'agenda:assign_speaker',
        'presentation:start',
        'push:receive',
        'invitation:create',
        'history:read',
      ];
      for (const perm of expected) {
        expect(
          hasPermission('bishopric', perm),
          `Bishopric should have ${perm}`
        ).toBe(true);
      }
    });

    it('should NOT grant Bishopric home:invite_mgmt', () => {
      expect(hasPermission('bishopric', 'home:invite_mgmt')).toBe(false);
    });

    it('should grant Secretary appropriate permissions minus speech:assign and settings:users', () => {
      expect(hasPermission('secretary', 'speech:assign')).toBe(false);
      expect(hasPermission('secretary', 'speech:unassign')).toBe(false);
      expect(hasPermission('secretary', 'settings:users')).toBe(false);
      expect(hasPermission('secretary', 'home:next_assignments')).toBe(false);

      // Secretary-specific permission
      expect(hasPermission('secretary', 'home:invite_mgmt')).toBe(true);
    });

    it('should grant Observer only read-only permissions', () => {
      expect(hasPermission('observer', 'member:read')).toBe(true);
      expect(hasPermission('observer', 'agenda:read')).toBe(true);
      expect(hasPermission('observer', 'presentation:start')).toBe(true);

      // Should not have any write permissions
      expect(hasPermission('observer', 'member:write')).toBe(false);
      expect(hasPermission('observer', 'speech:assign')).toBe(false);
      expect(hasPermission('observer', 'settings:access')).toBe(false);
      expect(hasPermission('observer', 'push:receive')).toBe(false);
    });
  });

  describe('getPermissions', () => {
    it('should return 22 permissions for Bishopric', () => {
      const perms = getPermissions('bishopric');
      expect(perms.length).toBe(22);
    });

    it('should return 19 permissions for Secretary', () => {
      const perms = getPermissions('secretary');
      expect(perms.length).toBe(19);
    });

    it('should return 3 permissions for Observer', () => {
      const perms = getPermissions('observer');
      expect(perms.length).toBe(3);
      expect(perms).toContain('member:read');
      expect(perms).toContain('agenda:read');
      expect(perms).toContain('presentation:start');
    });

    it('should return empty array for invalid role', () => {
      const perms = getPermissions('invalid_role' as Role);
      expect(perms).toEqual([]);
    });
  });

  describe('ALL_PERMISSIONS', () => {
    it('should have exactly 23 permissions', () => {
      expect(ALL_PERMISSIONS.length).toBe(23);
    });

    it('should have no duplicates', () => {
      const unique = new Set(ALL_PERMISSIONS);
      expect(unique.size).toBe(ALL_PERMISSIONS.length);
    });
  });

  describe('ALL_ROLES', () => {
    it('should have exactly 3 roles', () => {
      expect(ALL_ROLES.length).toBe(3);
      expect(ALL_ROLES).toContain('bishopric');
      expect(ALL_ROLES).toContain('secretary');
      expect(ALL_ROLES).toContain('observer');
    });
  });
});
