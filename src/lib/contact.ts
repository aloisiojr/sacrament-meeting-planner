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
 * - If the member opts into contact-via-responsible AND a responsible member with a usable phone is
 *   supplied, the contact is delegated: `contact_phone` = responsible's full phone,
 *   `is_delegated` = true, `delegate_for_name` = the member's informal name (or full name).
 * - Otherwise — own contact, including (a) the orphaned case where the flag is on but no responsible
 *   is supplied, and (b) the case where a responsible is supplied but has NO usable phone — falls
 *   back to the member's own full phone with `is_delegated` = false. The no-phone fallback keeps the
 *   WhatsApp message from being wrapped with an empty `{responsavel}`.
 */
export function resolveContactSnapshot(
  member: Member,
  responsible?: Member | null
): ContactSnapshot {
  if (member.contact_via_responsible && responsible) {
    const responsiblePhone = buildFullPhone(responsible.country_code, responsible.phone);
    if (responsiblePhone) {
      return {
        contact_phone: responsiblePhone,
        is_delegated: true,
        delegate_for_name: member.informal_name || member.full_name,
      };
    }
    // Responsible exists but has no usable phone → fall through to the member's own phone below.
  }
  return {
    contact_phone: buildFullPhone(member.country_code, member.phone),
    is_delegated: false,
    delegate_for_name: null,
  };
}


/**
 * The number to actually dial for an invite.
 *
 * `buildFullPhone` is applied when the snapshot is WRITTEN, but rows written before that fix — and
 * any row seeded straight into the database — still hold a bare national number. The send path
 * used the snapshot verbatim, producing `wa.me/11987650026` with no country code: WhatsApp then
 * guesses, or fails. Normalising on READ makes those rows work without a migration, and costs
 * nothing for rows that are already correct.
 *
 * The country code comes from whoever the number BELONGS to: the responsible for a delegated
 * invite, the speaker otherwise. Using the wrong one would fabricate a valid-looking wrong number.
 *
 * Falls back to the raw digits when no country code can be found — no worse than before.
 */
export function resolveInvitePhone(
  raw: string | null | undefined,
  opts: { isDelegated?: boolean; member?: Member | null; responsible?: Member | null } = {}
): string | null {
  const digits = (raw ?? '').replace(/[\s\-()]/g, '');
  if (!digits) return null;
  if (digits.startsWith('+')) return digits; // already international

  const owner = opts.isDelegated ? opts.responsible : opts.member;
  return buildFullPhone(owner?.country_code, digits) ?? digits;
}
