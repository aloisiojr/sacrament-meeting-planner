import { describe, it, expect } from 'vitest';
import { parseCollectionPeriod, compareActiveTopics } from '../lib/topics';
import type { TopicWithCollection } from '../types/database';

describe('parseCollectionPeriod', () => {
  it('parses conference names across locales', () => {
    expect(parseCollectionPeriod('General Conference April 2020')).toBe(202004);
    expect(parseCollectionPeriod('General Conference October 2025')).toBe(202510);
    expect(parseCollectionPeriod('Conferência Geral Abril 2024')).toBe(202404);
    expect(parseCollectionPeriod('Conferência Geral Outubro 2023')).toBe(202310);
    expect(parseCollectionPeriod('Conferencia General Octubre 2022')).toBe(202210);
  });

  it('returns null for evergreen (non-dated) libraries', () => {
    expect(parseCollectionPeriod('Gospel Principles')).toBeNull();
    expect(parseCollectionPeriod('Para a Força da Juventude')).toBeNull();
    expect(parseCollectionPeriod('Principios del Evangelio')).toBeNull();
  });

  it('later periods are greater (newer sorts first with descending compare)', () => {
    expect(parseCollectionPeriod('April 2026')! > parseCollectionPeriod('October 2025')!).toBe(true);
    expect(parseCollectionPeriod('October 2025')! > parseCollectionPeriod('April 2025')!).toBe(true);
  });
});

function topic(over: Partial<TopicWithCollection>): TopicWithCollection {
  return { id: 'x', title: 'T', link: null, collection: 'C', type: 'general', ...over };
}

describe('compareActiveTopics', () => {
  it('orders ward → evergreen → conferences (newest first), title within a library', () => {
    const items: TopicWithCollection[] = [
      topic({ id: 'g-apr24', title: 'B', collection: 'Conferência Geral Abril 2024', type: 'general' }),
      topic({ id: 'w2', title: 'Zeal', collection: 'Custom', type: 'ward' }),
      topic({ id: 'g-oct25', title: 'A', collection: 'Conferência Geral Outubro 2025', type: 'general' }),
      topic({ id: 'ever', title: 'X', collection: 'Princípios do Evangelho', type: 'general' }),
      topic({ id: 'w1', title: 'Amor', collection: 'Custom', type: 'ward' }),
      topic({ id: 'g-oct25b', title: 'B', collection: 'Conferência Geral Outubro 2025', type: 'general' }),
    ];
    const sorted = [...items].sort(compareActiveTopics).map((t) => t.id);
    expect(sorted).toEqual([
      'w1',        // ward, title "Amor"
      'w2',        // ward, title "Zeal"
      'ever',      // evergreen library
      'g-oct25',   // Oct 2025, title "A"
      'g-oct25b',  // Oct 2025, title "B"
      'g-apr24',   // Apr 2024 (older, last)
    ]);
  });
});
