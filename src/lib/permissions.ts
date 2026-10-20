/**
 * Central permissions map for role-based access control.
 * Implements the F023 permission matrix.
 *
 * SINGLE SOURCE OF TRUTH (DEC-04): bishopric and secretary are DISTINCT roles that
 * intentionally carry the SAME permissions (the bishopric authorizes the secretary to act
 * on their behalf). The writer permission set is therefore defined exactly once below and
 * both roles derive from it — never list the 26 permissions twice again.
 *
 * The same rule exists two more times by necessity: SQL defines it as the allowlist inside
 * public.can_write() (migration 049 — the IN ('bishopric', 'secretary') list), and each Edge
 * Function carries an ALLOWED_ROLES/VALID_ROLES literal because Deno cannot import from src/.
 * Those copies are not maintained by memory: src/__tests__/security-perms-concordance.test.ts
 * asserts all three representations agree on every role and every permission.
 */

import type { Role, Permission } from '../types/database';

// Re-export types
export type { Role, Permission };

/**
 * Roles allowed to WRITE ward data. This is the client mirror of the server's writer
 * allowlist: public.can_write() in SQL (migration 049) must list exactly these roles.
 * Any other value in app_metadata.role — 'observer', empty, garbage — is read-only.
 */
export const WRITER_ROLES: readonly Role[] = ['bishopric', 'secretary'] as const;

/**
 * The canonical writer permission set, defined once.
 * Source: F023 (SPEC_F023.md) and STEP-01-05 from PLAN.
 *
 * Every permission in the system belongs to this set (observers hold only a read-only
 * subset of it), so ALL_PERMISSIONS derives from here instead of restating the list.
 */
export const WRITER_PERMISSIONS: readonly Permission[] = [
  'speech:assign',
  'speech:unassign',
  'speech:change_status',
  'prayer:assign',
  'prayer:unassign',
  'member:read',
  'member:write',
  'member:import',
  'topic:write',
  'sunday_type:write',
  'settings:access',
  'settings:language',
  'settings:whatsapp',
  'settings:designations',
  'settings:timezone',
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

/** Read-only subset held by observers: watch the meeting, never change it. */
const OBSERVER_PERMISSIONS: readonly Permission[] = [
  'member:read',
  'agenda:read',
  'presentation:start',
] as const;

/**
 * Complete permission matrix mapping each role to its allowed permissions.
 * bishopric and secretary each get their own Set built from the one canonical list,
 * so the matrix stays a plain lookup while the rule lives in a single place.
 */
export const PERMISSIONS_MAP: Record<Role, ReadonlySet<Permission>> = {
  bishopric: new Set<Permission>(WRITER_PERMISSIONS),
  secretary: new Set<Permission>(WRITER_PERMISSIONS),
  observer: new Set<Permission>(OBSERVER_PERMISSIONS),
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

/** True when the role may write ward data (mirrors public.can_write() in SQL). */
export function isWriterRole(role: Role): boolean {
  return (WRITER_ROLES as readonly string[]).includes(role);
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
 * List of all defined permissions (derived from the canonical writer set —
 * observers hold only a subset of it, so nothing exists outside this list).
 */
export const ALL_PERMISSIONS: readonly Permission[] = WRITER_PERMISSIONS;

/**
 * List of all defined roles (writers first, then the read-only observer).
 */
export const ALL_ROLES: readonly Role[] = [...WRITER_ROLES, 'observer'] as const;
