/**
 * Topic ordering helpers for the topic picker. Built-in libraries have no month/year column, so the
 * chronological order of conference libraries is parsed from the collection name (April/Abril,
 * October/Octubre/Outubro + year) across the 3 supported locales.
 */
import type { TopicWithCollection } from '../types/database';

const MONTHS: Record<string, number> = {
  // en
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  // pt (accent-stripped)
  janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
  // es
  enero: 1, febrero: 2, marzo: 3, mayo: 5, junio: 6, julio: 7,
  septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Parse a sortable period (year*100 + month) from a collection name, or null when the name has no
 * recognizable month + year (the evergreen libraries like "Gospel Principles").
 */
export function parseCollectionPeriod(name: string): number | null {
  const norm = normalize(name);
  const yearMatch = norm.match(/\b(20\d{2})\b/);
  if (!yearMatch) return null;
  const year = parseInt(yearMatch[1], 10);
  for (const token of norm.split(/[^a-z]+/)) {
    const month = MONTHS[token];
    if (month) return year * 100 + month;
  }
  return null;
}

/**
 * Picker order: ward (custom) topics first; then built-in — evergreen libraries (no period) before
 * conference libraries (newest period first); within a library, by title. Keeps same-library topics
 * contiguous.
 */
export function compareActiveTopics(a: TopicWithCollection, b: TopicWithCollection): number {
  if (a.type !== b.type) return a.type === 'ward' ? -1 : 1;

  if (a.type === 'ward') {
    return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
  }

  const pa = parseCollectionPeriod(a.collection);
  const pb = parseCollectionPeriod(b.collection);
  const aEvergreen = pa === null;
  const bEvergreen = pb === null;

  if (aEvergreen !== bEvergreen) return aEvergreen ? -1 : 1; // evergreen before conferences
  if (aEvergreen && bEvergreen) {
    const byName = a.collection.localeCompare(b.collection, undefined, { sensitivity: 'base' });
    if (byName !== 0) return byName;
    return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
  }
  // both have a period: newest first
  if (pa !== pb) return (pb as number) - (pa as number);
  return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
}
