/**
 * Supports & Releases (Apoios e Desobrigações) — pure helpers for the structured
 * `designations` agenda list. Kept UI-free so the same formatting drives the expanded
 * card, the edit screen, and (later) the Play interstitial.
 */
import type { Designation, DesignationType, PriesthoodOffice } from '../types/database';

export const DESIGNATION_TYPES: readonly DesignationType[] = [
  'sustain',
  'release',
  'priesthood',
  'new_member',
];

export const PRIESTHOOD_OFFICES: readonly PriesthoodOffice[] = ['deacon', 'teacher', 'priest'];

type Translate = (key: string) => string;

export function designationTypeLabel(type: DesignationType, t: Translate): string {
  return t(`agenda.designations.type.${type}`);
}

export function priesthoodOfficeLabel(office: PriesthoodOffice, t: Translate): string {
  return t(`agenda.designations.office.${office}`);
}

/**
 * The card/screen display for a designation, on up to two lines:
 *  line1 = "[Name] — [TypeLabel]"; line2 = calling (sustain/release) or office (priesthood).
 *  new_member (and blank calling) => no second line.
 */
export function formatDesignationLines(
  item: Designation,
  t: Translate
): { line1: string; line2?: string } {
  const line1 = `${item.person_name} — ${designationTypeLabel(item.type, t)}`;

  let detail: string | undefined;
  if (item.type === 'sustain' || item.type === 'release') {
    detail = item.calling && item.calling.trim() ? item.calling.trim() : undefined;
  } else if (item.type === 'priesthood') {
    detail = item.office ? priesthoodOfficeLabel(item.office, t) : undefined;
  }

  return detail ? { line1, line2: detail } : { line1 };
}
