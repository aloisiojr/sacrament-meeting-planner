/**
 * Fetch a complete list past PostgREST's 1000-row cap (CONF-14).
 *
 * A plain `.select()` silently truncates at max_rows=1000: a ward with more than
 * 1000 members lost the surplus with no error. Pages of PAGE_SIZE are fetched with
 * `.range()` until a partial page (< PAGE_SIZE) proves the list is exhausted.
 */
export const PAGE_SIZE = 1000;

export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => Promise<T[]>
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const page = await fetchPage(from, from + PAGE_SIZE - 1);
    all.push(...page);
    if (page.length < PAGE_SIZE) return all;
  }
}
