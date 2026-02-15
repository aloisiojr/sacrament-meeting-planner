import { describe, it, expect } from 'vitest';
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_LABELS,
  DEFAULT_COUNTRY_CODES,
  DEFAULT_TIMEZONES,
} from '../i18n';
import type { SupportedLanguage } from '../i18n';

/**
 * Tests for i18n module exports: constants, language labels, country codes, timezones.
 */

describe('i18n module', () => {
  describe('SUPPORTED_LANGUAGES', () => {
    it('should contain exactly 3 languages', () => {
      expect(SUPPORTED_LANGUAGES).toHaveLength(3);
    });

    it('should include pt-BR, en, and es', () => {
      expect(SUPPORTED_LANGUAGES).toContain('pt-BR');
      expect(SUPPORTED_LANGUAGES).toContain('en');
      expect(SUPPORTED_LANGUAGES).toContain('es');
    });

    it('should be a readonly tuple (as const enforced at compile time)', () => {
      // `as const` creates a readonly tuple at the TypeScript level.
      // At runtime, the array is not frozen, but TypeScript prevents mutation.
      expect(Array.isArray(SUPPORTED_LANGUAGES)).toBe(true);
      // Verify no extra languages sneaked in
      expect(SUPPORTED_LANGUAGES.every((l) => typeof l === 'string')).toBe(true);
    });
  });

  describe('LANGUAGE_LABELS', () => {
    it('should have a label for every supported language', () => {
      for (const lang of SUPPORTED_LANGUAGES) {
        expect(LANGUAGE_LABELS[lang]).toBeDefined();
        expect(typeof LANGUAGE_LABELS[lang]).toBe('string');
        expect(LANGUAGE_LABELS[lang].length).toBeGreaterThan(0);
      }
    });

    it('should have correct labels', () => {
      expect(LANGUAGE_LABELS['pt-BR']).toBe('Portugues (Brasil)');
      expect(LANGUAGE_LABELS['en']).toBe('English');
      expect(LANGUAGE_LABELS['es']).toBe('Espanol');
    });
  });

  describe('DEFAULT_COUNTRY_CODES', () => {
    it('should have a country code for every supported language', () => {
      for (const lang of SUPPORTED_LANGUAGES) {
        expect(DEFAULT_COUNTRY_CODES[lang]).toBeDefined();
        expect(DEFAULT_COUNTRY_CODES[lang]).toMatch(/^\+\d+$/);
      }
    });

    it('should have correct default country codes', () => {
      expect(DEFAULT_COUNTRY_CODES['pt-BR']).toBe('+55');
      expect(DEFAULT_COUNTRY_CODES['en']).toBe('+1');
      expect(DEFAULT_COUNTRY_CODES['es']).toBe('+52');
    });
  });

  describe('DEFAULT_TIMEZONES', () => {
    it('should have a timezone for every supported language', () => {
      for (const lang of SUPPORTED_LANGUAGES) {
        expect(DEFAULT_TIMEZONES[lang]).toBeDefined();
        expect(typeof DEFAULT_TIMEZONES[lang]).toBe('string');
        // IANA timezone format contains /
        expect(DEFAULT_TIMEZONES[lang]).toContain('/');
      }
    });

    it('should have correct default timezones in IANA format', () => {
      expect(DEFAULT_TIMEZONES['pt-BR']).toBe('America/Sao_Paulo');
      expect(DEFAULT_TIMEZONES['en']).toBe('America/New_York');
      expect(DEFAULT_TIMEZONES['es']).toBe('America/Mexico_City');
    });
  });

  describe('SupportedLanguage type coverage', () => {
    it('should allow using all supported languages as SupportedLanguage type', () => {
      const langs: SupportedLanguage[] = ['pt-BR', 'en', 'es'];
      expect(langs).toHaveLength(3);
    });
  });
});
