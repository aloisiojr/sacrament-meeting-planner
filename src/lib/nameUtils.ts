/**
 * Pure helpers for the "informal name follows the first name" rule in PersonEditor
 * (specs/person-editor-informal-name-autofill.md).
 *
 * The `informal_name = first name` convention already lives, unshared, in four places
 * (`members.tsx`, `useApplyMemberImport.ts`, `useMembers.ts`, `csvUtils.ts`). This is the canonical
 * home for it; adopting it in those four is a separate cleanup.
 */

/** First whitespace-separated token of a name; '' when the name is blank. */
export function getFirstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0];
}

/** Case-, accent- and whitespace-insensitive comparison. Same NFD form used across the app. */
function normalize(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * True when two names are the same person-name, ignoring case, accents and surrounding spaces.
 *
 * A blank on either side is never "the same": the editor treats an empty informal name as "not
 * filled in yet", which is a different case from "still matches the first name". Letting '' match
 * '' would make an untouched field look like a customized one.
 */
export function isSameName(a: string, b: string): boolean {
  const left = normalize(a);
  const right = normalize(b);
  if (!left || !right) return false;
  return left === right;
}

/**
 * The whole "informal name follows the first name" decision, in one place so the editor can apply
 * it both when the name field loses focus and when the form is saved — tapping Save does not blur
 * a focused TextInput, so blur alone would miss the most common edit flow.
 *
 * Returns the informal name that should replace the current one, or `null` to leave it alone.
 */
export function reconcileInformalName(params: {
  fullName: string;
  informalName: string;
  /** Full name the informal field was last reconciled against. */
  previousFullName: string;
}): string | null {
  const first = getFirstName(params.fullName);
  // Clearing the full name must not clear the informal one.
  if (!first) return null;

  // Nothing filled in yet — adopt the first name.
  if (!params.informalName.trim()) return first;

  // Already says the same thing: leave the user's spelling alone rather than renormalizing
  // "joao" into "João" on a visit to the field that changed nothing.
  if (isSameName(params.informalName, first)) return null;

  // Still tracking the previous first name => follow the rename. Otherwise it is customized.
  return isSameName(params.informalName, getFirstName(params.previousFullName)) ? first : null;
}
