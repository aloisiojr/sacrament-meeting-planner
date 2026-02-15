/**
 * Central permissions map for role-based access control.
 * Implements the F023 permission matrix.
 */

import type { Role, Permission } from '../types/database';

// Re-export types
export type { Role, Permission };

/**
 * Complete permission matrix mapping each role to its allowed permissions.
 * Source: F023 (SPEC_F023.md) and STEP-01-05 from PLAN.
 */
const PERMISSIONS_MAP: Record<Role, ReadonlySet<Permission>> = {
  bishopric: new Set<Permission>([
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
  ]),

  secretary: new Set<Permission>([
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
    'invite:manage',
    'home:invite_mgmt',
    'agenda:read',
    'agenda:write',
    'agenda:assign_speaker',
    'presentation:start',
    'push:receive',
    'invitation:create',
    'history:read',
  ]),

  observer: new Set<Permission>([
    'member:read',
    'agenda:read',
    'presentation:start',
  ]),
};

/**
 * Check if a role has a specific permission.
 *
 * @param role - The user's role
 * @param perm - The permission to check
 * @returns true if the role has the permission
 */
export function hasPermission(role: Role, perm: Permission): boolean {
  const permissions = PERMISSIONS_MAP[role];
  if (!permissions) {
    return false;
  }
  return permissions.has(perm);
}

/**
 * Get all permissions for a given role.
 *
 * @param role - The user's role
 * @returns Array of all permissions granted to the role
 */
export function getPermissions(role: Role): Permission[] {
  const permissions = PERMISSIONS_MAP[role];
  if (!permissions) {
    return [];
  }
  return Array.from(permissions);
}

/**
 * List of all defined permissions.
 */
export const ALL_PERMISSIONS: readonly Permission[] = [
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
  'home:invite_mgmt',
  'agenda:read',
  'agenda:write',
  'agenda:assign_speaker',
  'presentation:start',
  'push:receive',
  'invitation:create',
  'history:read',
] as const;

/**
 * List of all defined roles.
 */
export const ALL_ROLES: readonly Role[] = [
  'bishopric',
  'secretary',
  'observer',
] as const;
