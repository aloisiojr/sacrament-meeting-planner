/**
 * Tests for notification pure utilities (ordinals, text building, name formatting).
 */

import { describe, it, expect } from 'vitest';
import {
  getOrdinal,
  buildNotificationText,
  formatNameList,
} from '../lib/notificationUtils';
import type { OrdinalLanguage } from '../lib/notificationUtils';

describe('getOrdinal', () => {
  it('returns Portuguese ordinals', () => {
    expect(getOrdinal(1, 'pt-BR')).toBe('1\u00BA');
    expect(getOrdinal(2, 'pt-BR')).toBe('2\u00BA');
    expect(getOrdinal(3, 'pt-BR')).toBe('3\u00BA');
  });

  it('returns English ordinals', () => {
    expect(getOrdinal(1, 'en')).toBe('1st');
    expect(getOrdinal(2, 'en')).toBe('2nd');
    expect(getOrdinal(3, 'en')).toBe('3rd');
  });

  it('returns Spanish ordinals', () => {
    expect(getOrdinal(1, 'es')).toBe('1er');
    expect(getOrdinal(2, 'es')).toBe('2do');
    expect(getOrdinal(3, 'es')).toBe('3er');
  });

  it('falls back to number string for unknown position', () => {
    expect(getOrdinal(4, 'en')).toBe('4');
  });
});

describe('formatNameList', () => {
  it('returns empty string for empty list', () => {
    expect(formatNameList([], 'en')).toBe('');
  });

  it('returns single name as-is', () => {
    expect(formatNameList(['John'], 'en')).toBe('John');
  });

  it('joins two names with "and" in English', () => {
    expect(formatNameList(['John', 'Mary'], 'en')).toBe('John and Mary');
  });

  it('joins two names with "e" in Portuguese', () => {
    expect(formatNameList(['João', 'Maria'], 'pt-BR')).toBe('João e Maria');
  });

  it('joins two names with "y" in Spanish', () => {
    expect(formatNameList(['Juan', 'María'], 'es')).toBe('Juan y María');
  });

  it('joins three names with commas and conjunction', () => {
    expect(formatNameList(['John', 'Mary', 'Jane'], 'en')).toBe('John, Mary and Jane');
  });

  it('joins three Portuguese names correctly', () => {
    expect(formatNameList(['João', 'Maria', 'Ana'], 'pt-BR')).toBe('João, Maria e Ana');
  });

  it('joins three Spanish names correctly', () => {
    expect(formatNameList(['Juan', 'María', 'Ana'], 'es')).toBe('Juan, María y Ana');
  });
});

describe('buildNotificationText', () => {
  const languages: OrdinalLanguage[] = ['pt-BR', 'en', 'es'];

  describe('designation (Case 1)', () => {
    it.each(languages)('builds text for single assignment in %s', (lang) => {
      const result = buildNotificationText('designation', lang, {
        names: ['John Smith'],
        date: '2026-03-01',
      });
      expect(result.title).toBeTruthy();
      expect(result.body).toContain('John Smith');
      expect(result.body).toContain('2026-03-01');
    });

    it.each(languages)('builds text for multiple assignments in %s', (lang) => {
      const result = buildNotificationText('designation', lang, {
        names: ['John', 'Mary', 'Jane'],
        date: '2026-03-01',
      });
      expect(result.body).toContain('John');
      expect(result.body).toContain('Mary');
      expect(result.body).toContain('Jane');
    });
  });

  describe('weekly_assignment (Case 2)', () => {
    it.each(languages)('builds weekly assignment text in %s', (lang) => {
      const result = buildNotificationText('weekly_assignment', lang, {});
      expect(result.title).toBeTruthy();
      expect(result.body).toBeTruthy();
    });
  });

  describe('weekly_confirmation (Case 3)', () => {
    it.each(languages)('builds weekly confirmation text in %s', (lang) => {
      const result = buildNotificationText('weekly_confirmation', lang, {});
      expect(result.title).toBeTruthy();
      expect(result.body).toBeTruthy();
    });
  });

  describe('speaker_confirmed (Case 4)', () => {
    it.each(languages)('builds confirmed text with ordinal in %s', (lang) => {
      const result = buildNotificationText('speaker_confirmed', lang, {
        name: 'Jane Doe',
        position: 2,
        date: '2026-03-08',
      });
      expect(result.title).toBeTruthy();
      expect(result.body).toContain('Jane Doe');
      expect(result.body).toContain(getOrdinal(2, lang));
      expect(result.body).toContain('2026-03-08');
    });
  });

  describe('speaker_withdrew (Case 5)', () => {
    it.each(languages)('builds withdrew text with urgency in %s', (lang) => {
      const result = buildNotificationText('speaker_withdrew', lang, {
        name: 'Bob Wilson',
        position: 3,
        date: '2026-03-15',
      });
      expect(result.title).toBeTruthy();
      expect(result.body).toContain('Bob Wilson');
      expect(result.body).toContain(getOrdinal(3, lang));
    });
  });

  describe('unknown type', () => {
    it('returns empty strings for unknown notification type', () => {
      const result = buildNotificationText('unknown', 'en', {});
      expect(result.title).toBe('');
      expect(result.body).toBe('');
    });
  });
});
