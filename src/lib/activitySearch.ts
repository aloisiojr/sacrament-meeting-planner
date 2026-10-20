/**
 * Parse an activity-log search term as a calendar date (RAP-10): `YYYY-MM-DD`
 * or `DD/MM/YYYY`. Returns the [start, nextDay) ISO bounds for a `created_at`
 * range query, or null when the term is not a date — date search uses the range
 * (backed by the ward+created_at index), never an ilike over a timestamp cast.
 */
export function parseActivitySearchDate(term: string): { gte: string; lt: string } | null {
  const trimmed = term.trim();
  let year: number;
  let month: number;
  let day: number;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else if (br) {
    day = Number(br[1]);
    month = Number(br[2]);
    year = Number(br[3]);
  } else {
    return null;
  }
  const start = new Date(Date.UTC(year, month - 1, day));
  if (
    start.getUTCFullYear() !== year ||
    start.getUTCMonth() !== month - 1 ||
    start.getUTCDate() !== day
  ) {
    return null; // e.g. 31/02 — not a real date, treat as plain text
  }
  const next = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { gte: start.toISOString(), lt: next.toISOString() };
}
