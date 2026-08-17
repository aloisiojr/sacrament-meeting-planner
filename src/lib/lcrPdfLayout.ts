/**
 * Grouping the visual lines of an LCR member-list PDF into table ROWS (one row = one member).
 *
 * A member's name wraps across lines, so a row is several visual lines and the data columns can sit
 * on any of them — in the reference PDFs a three-line name puts the data on the MIDDLE line. Rows
 * are told apart from wrapped lines by the vertical gap between baselines.
 *
 * The fixtures are gap distributions measured from the real ward PDFs, which stay out of the
 * repository because they carry members' names, phones and e-mails.
 *
 * This module used to be mirrored as a literal JS string, because the WebView built the record text
 * itself and `${fn}` cannot be injected (minification makes the function anonymous; Hermes drops
 * function source). The WebView now forwards raw page data and decides nothing, so the copy is gone
 * and this is ordinary TypeScript again.
 */

/**
 * Vertical gap at or above which two lines belong to DIFFERENT records.
 *
 * The rule that shipped before measured popularity rather than separation: the midpoint of the two
 * most FREQUENT gaps, which on the real files is (6 + 19) / 2 = 12.5 — inside the "same record"
 * cluster, because three-line names produce inside-record gaps of 12 and 13. Records with a 13 were
 * cut in half: the name lost its data, and the data resurfaced under a name made of the leftovers.
 *
 * The two most frequent gaps DO identify the separator — "name → data" and "between records" both
 * happen about once per record, and the separator is the larger of the two. What was wrong was
 * averaging them. So take that separator, then the largest gap below it (still inside a record by
 * definition) and put the threshold between the two.
 *
 * Frequency is used ONLY to find the separator, where noise would mislead. The largest inside gap
 * is taken over ALL gaps, including ones seen once: `Membros Ala Panamby.pdf` has exactly one gap
 * of 13, and ignoring it left the threshold one step away from splitting that member.
 *
 * A rejected alternative, recorded so it is not retried: picking the separator as the most frequent
 * gap above the median of distinct values. That gives 21 on the real file — ABOVE the separator —
 * and merges neighbouring people into one record. Frequency identifies the separator; position
 * does not.
 *
 * Returns Infinity when there is nothing to infer from, rather than guessing.
 */
export function rowGapThreshold(freq: ReadonlyMap<number, number>): number {
  const recurring = Array.from(freq.keys()).filter((gap) => (freq.get(gap) || 0) >= 2);
  if (recurring.length < 2) return Infinity;

  const byFrequency = recurring.slice().sort((a, b) => (freq.get(b) || 0) - (freq.get(a) || 0));
  const separator = Math.max(byFrequency[0], byFrequency[1]);

  const inside = Array.from(freq.keys()).filter((gap) => gap < separator);
  if (!inside.length) return Infinity;

  return (Math.max.apply(null, inside) + separator) / 2;
}


/**
 * Split baseline positions (top → bottom) into rows, breaking where the gap REACHES `threshold`.
 *
 * `>=` mirrors PdfTextExtractor exactly. With `>` the two disagreed on a gap landing precisely on
 * the threshold, so this helper — and the check script built on it — could call a file clean while
 * the app split a record inside it.
 *
 * With `Infinity` nothing ever splits and every line lands in ONE row: the deliberate "cannot
 * infer" fallback, which leaves the parser to anchor structurally on its own.
 */
export function groupIntoRows(ys: readonly number[], threshold: number): number[][] {
  const rows: number[][] = [];
  let current: number[] = [];
  for (let i = 0; i < ys.length; i++) {
    if (i > 0 && Math.abs(ys[i - 1] - ys[i]) >= threshold) {
      rows.push(current);
      current = [];
    }
    current.push(ys[i]);
  }
  if (current.length) rows.push(current);
  return rows;
}
