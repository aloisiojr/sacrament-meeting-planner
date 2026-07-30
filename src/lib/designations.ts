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

// Canonical meeting order for reading/presenting designations: releases, then sustainings, then
// priesthood advancements, then new members. (Entry order is preserved within each type.)
export const DESIGNATION_TYPE_ORDER: readonly DesignationType[] = [
  'release',
  'sustain',
  'priesthood',
  'new_member',
];

/** A new array ordered by DESIGNATION_TYPE_ORDER, stable within each type. */
export function orderDesignations(items: Designation[]): Designation[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const ta = DESIGNATION_TYPE_ORDER.indexOf(a.item.type);
      const tb = DESIGNATION_TYPE_ORDER.indexOf(b.item.type);
      return ta !== tb ? ta - tb : a.index - b.index;
    })
    .map((x) => x.item);
}

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

/** Single-line form ("[Name] — [Type] — [detail]") for compact contexts (e.g. Play bullet list). */
export function formatDesignationSummary(item: Designation, t: Translate): string {
  const { line1, line2 } = formatDesignationLines(item, t);
  return line2 ? `${line1} — ${line2}` : line1;
}

/**
 * The full verbatim text to READ for a designation (Play interstitial). Resolves the template
 * (an explicit `template` override — future ward-level config — else the built-in per-locale
 * default `agenda.designations.readText.<type>`) and substitutes the four canonical tokens.
 * Everything else in the template is kept verbatim (incl. literal stage directions).
 */
export function buildDesignationReadText(
  item: Designation,
  opts: { wardName?: string; template?: string },
  t: Translate
): string {
  const template = opts.template ?? t(`agenda.designations.readText.${item.type}`);
  const office = item.office ? priesthoodOfficeLabel(item.office, t) : '';
  const sub = (s: string, token: string, value: string) => s.split(token).join(value);
  let out = sub(template, '{name}', item.person_name);
  out = sub(out, '{calling}', item.calling ?? '');
  out = sub(out, '{office}', office);
  out = sub(out, '{ward}', opts.wardName ?? '');
  return out;
}
