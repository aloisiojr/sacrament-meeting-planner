/**
 * Contact-delegation resolution (pure, no React Native deps) — v2.0 unified people model.
 *
 * At assignment time the *resolved* contact is snapshotted onto the speech so later sends and the
 * activity log don't depend on the member's live delegation state.
 */

import type { Member } from '../types/database';
import { buildFullPhone } from './phone';

export interface ContactSnapshot {
  /** Full international phone to contact (own or the responsible's); null when unavailable. */
  contact_phone: string | null;
  /** True when the message should be delegated to the responsible. */
  is_delegated: boolean;
  /** Name of the member the invitation is *for* (used in the delegation wrapper); null when own. */
  delegate_for_name: string | null;
}

/**
 * Resolve the contact snapshot for a member.
 *
 * - If the member opts into contact-via-responsible AND a responsible member is supplied, the
 *   contact is delegated: `contact_phone` = responsible's full phone, `is_delegated` = true,
 *   `delegate_for_name` = the member's informal name (or full name).
 * - Otherwise (own contact, including the orphaned case where the flag is on but no responsible is
 *   supplied), `contact_phone` = the member's own full phone, `is_delegated` = false.
 */
export function resolveContactSnapshot(
  member: Member,
  responsible?: Member | null
): ContactSnapshot {
  if (member.contact_via_responsible && responsible) {
    return {
      contact_phone: buildFullPhone(responsible.country_code, responsible.phone),
      is_delegated: true,
      delegate_for_name: member.informal_name || member.full_name,
    };
  }
  return {
    contact_phone: buildFullPhone(member.country_code, member.phone),
    is_delegated: false,
    delegate_for_name: null,
  };
}
