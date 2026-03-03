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
    expect(getOrdinal(1, 'en-US')).toBe('1st');
    expect(getOrdinal(2, 'en-US')).toBe('2nd');
    expect(getOrdinal(3, 'en-US')).toBe('3rd');
  });

  it('returns Spanish ordinals', () => {
    expect(getOrdinal(1, 'es-LA')).toBe('1er');
    expect(getOrdinal(2, 'es-LA')).toBe('2do');
    expect(getOrdinal(3, 'es-LA')).toBe('3er');
  });

  it('falls back to number string for unknown position', () => {
    expect(getOrdinal(4, 'en-US')).toBe('4');
  });
});

describe('formatNameList', () => {
  it('returns empty string for empty list', () => {
    expect(formatNameList([], 'en-US')).toBe('');
  });

  it('returns single name as-is', () => {
    expect(formatNameList(['John'], 'en-US')).toBe('John');
  });

  it('joins two names with "and" in English', () => {
    expect(formatNameList(['John', 'Mary'], 'en-US')).toBe('John and Mary');
  });

  it('joins two names with "e" in Portuguese', () => {
    expect(formatNameList(['João', 'Maria'], 'pt-BR')).toBe('João e Maria');
  });

  it('joins two names with "y" in Spanish', () => {
    expect(formatNameList(['Juan', 'María'], 'es-LA')).toBe('Juan y María');
  });

  it('joins three names with commas and conjunction', () => {
    expect(formatNameList(['John', 'Mary', 'Jane'], 'en-US')).toBe('John, Mary and Jane');
  });

  it('joins three Portuguese names correctly', () => {
    expect(formatNameList(['João', 'Maria', 'Ana'], 'pt-BR')).toBe('João, Maria e Ana');
  });

  it('joins three Spanish names correctly', () => {
    expect(formatNameList(['Juan', 'María', 'Ana'], 'es-LA')).toBe('Juan, María y Ana');
  });
});

describe('buildNotificationText', () => {
  const languages: OrdinalLanguage[] = ['pt-BR', 'en-US', 'es-LA'];

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

    it('builds confirmed text for opening prayer (position 0) in pt-BR', () => {
      const result = buildNotificationText('speaker_confirmed', 'pt-BR', {
        name: 'Maria Silva',
        position: 0,
        date: '2026-03-08',
      });
      expect(result.title).toBe('Oração Confirmada');
      expect(result.body).toContain('oração de abertura');
      expect(result.body).not.toContain('discurso');
      expect(result.body).toContain('Maria Silva');
      expect(result.body).toContain('2026-03-08');
    });

    it('builds confirmed text for opening prayer (position 0) in en-US', () => {
      const result = buildNotificationText('speaker_confirmed', 'en-US', {
        name: 'Maria Silva',
        position: 0,
        date: '2026-03-08',
      });
      expect(result.title).toBe('Prayer Confirmed');
      expect(result.body).toContain('opening prayer');
      expect(result.body).not.toContain('speech');
      expect(result.body).toContain('Maria Silva');
    });

    it('builds confirmed text for opening prayer (position 0) in es-LA', () => {
      const result = buildNotificationText('speaker_confirmed', 'es-LA', {
        name: 'Maria Silva',
        position: 0,
        date: '2026-03-08',
      });
      expect(result.title).toBe('Oración Confirmada');
      expect(result.body).toContain('oración de apertura');
      expect(result.body).not.toContain('discurso');
      expect(result.body).toContain('Maria Silva');
    });

    it('builds confirmed text for closing prayer (position 4) in pt-BR', () => {
      const result = buildNotificationText('speaker_confirmed', 'pt-BR', {
        name: 'João Santos',
        position: 4,
        date: '2026-03-15',
      });
      expect(result.title).toBe('Oração Confirmada');
      expect(result.body).toContain('oração de encerramento');
      expect(result.body).not.toContain('discurso');
      expect(result.body).toContain('João Santos');
    });

    it('builds confirmed text for closing prayer (position 4) in en-US', () => {
      const result = buildNotificationText('speaker_confirmed', 'en-US', {
        name: 'João Santos',
        position: 4,
        date: '2026-03-15',
      });
      expect(result.title).toBe('Prayer Confirmed');
      expect(result.body).toContain('closing prayer');
      expect(result.body).not.toContain('speech');
      expect(result.body).toContain('João Santos');
    });

    it('builds confirmed text for closing prayer (position 4) in es-LA', () => {
      const result = buildNotificationText('speaker_confirmed', 'es-LA', {
        name: 'João Santos',
        position: 4,
        date: '2026-03-15',
      });
      expect(result.title).toBe('Oración Confirmada');
      expect(result.body).toContain('oración de clausura');
      expect(result.body).not.toContain('discurso');
      expect(result.body).toContain('João Santos');
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

    it('builds withdrew text for opening prayer (position 0) in pt-BR', () => {
      const result = buildNotificationText('speaker_withdrew', 'pt-BR', {
        name: 'Maria Silva',
        position: 0,
        date: '2026-03-08',
      });
      expect(result.title).toContain('Desistência de Oração');
      expect(result.body).toContain('oração de abertura');
      expect(result.body).not.toContain('discurso');
      expect(result.body).toContain('Maria Silva');
    });

    it('builds withdrew text for opening prayer (position 0) in en-US', () => {
      const result = buildNotificationText('speaker_withdrew', 'en-US', {
        name: 'Maria Silva',
        position: 0,
        date: '2026-03-08',
      });
      expect(result.title).toContain('Prayer Withdrew');
      expect(result.body).toContain('opening prayer');
      expect(result.body).not.toContain('speech');
      expect(result.body).toContain('Maria Silva');
    });

    it('builds withdrew text for opening prayer (position 0) in es-LA', () => {
      const result = buildNotificationText('speaker_withdrew', 'es-LA', {
        name: 'Maria Silva',
        position: 0,
        date: '2026-03-08',
      });
      expect(result.title).toContain('Desistimiento de Oración');
      expect(result.body).toContain('oración de apertura');
      expect(result.body).not.toContain('discurso');
      expect(result.body).toContain('Maria Silva');
    });

    it('builds withdrew text for closing prayer (position 4) in pt-BR', () => {
      const result = buildNotificationText('speaker_withdrew', 'pt-BR', {
        name: 'João Santos',
        position: 4,
        date: '2026-03-15',
      });
      expect(result.title).toContain('Desistência de Oração');
      expect(result.body).toContain('oração de encerramento');
      expect(result.body).not.toContain('discurso');
      expect(result.body).toContain('João Santos');
    });

    it('builds withdrew text for closing prayer (position 4) in en-US', () => {
      const result = buildNotificationText('speaker_withdrew', 'en-US', {
        name: 'João Santos',
        position: 4,
        date: '2026-03-15',
      });
      expect(result.title).toContain('Prayer Withdrew');
      expect(result.body).toContain('closing prayer');
      expect(result.body).not.toContain('speech');
      expect(result.body).toContain('João Santos');
    });

    it('builds withdrew text for closing prayer (position 4) in es-LA', () => {
      const result = buildNotificationText('speaker_withdrew', 'es-LA', {
        name: 'João Santos',
        position: 4,
        date: '2026-03-15',
      });
      expect(result.title).toContain('Desistimiento de Oración');
      expect(result.body).toContain('oración de clausura');
      expect(result.body).not.toContain('discurso');
      expect(result.body).toContain('João Santos');
    });
  });

  describe('unknown type', () => {
    it('returns empty strings for unknown notification type', () => {
      const result = buildNotificationText('unknown', 'en-US', {});
      expect(result.title).toBe('');
      expect(result.body).toBe('');
    });
  });
});
