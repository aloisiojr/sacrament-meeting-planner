/**
 * F040 - Language Code Standardization (CR-249)
 *
 * Tests verifying that language codes have been standardized from
 * short codes (en, es) to full IETF locale codes (en-US, es-LA)
 * across all app-side modules.
 *
 * Covers: AC-001..AC-019, AC-032, AC-033
 * Edge Functions (AC-020..AC-024), DB migration (AC-025..AC-029),
 * and import script (AC-030..AC-031) are Deno/SQL and cannot be
 * imported in vitest.
 */

import { describe, it, expect } from 'vitest';
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_LABELS,
  DEFAULT_COUNTRY_CODES,
  DEFAULT_TIMEZONES,
  toDbLocale,
} from '../i18n';
import type { SupportedLanguage } from '../i18n';
import {
  formatDate,
  formatDateHumanReadable,
  formatFullDate,
  getMonthAbbr,
} from '../lib/dateUtils';
import {
  getDefaultSpeechTemplate,
  getDefaultPrayerTemplate,
  DEFAULT_TEMPLATE_SPEECH_1_EN,
  DEFAULT_TEMPLATE_SPEECH_1_ES,
  DEFAULT_OPENING_PRAYER_TEMPLATE_EN,
  DEFAULT_OPENING_PRAYER_TEMPLATE_ES,
  DEFAULT_OPENING_PRAYER_TEMPLATE_PT_BR,
  DEFAULT_CLOSING_PRAYER_TEMPLATE_EN,
  DEFAULT_CLOSING_PRAYER_TEMPLATE_ES,
  DEFAULT_CLOSING_PRAYER_TEMPLATE_PT_BR,
} from '../lib/whatsappUtils';
import {
  getOrdinal,
  formatNameList,
  buildNotificationText,
} from '../lib/notificationUtils';

// =============================================================================
// AC-001: SUPPORTED_LANGUAGES contains ['pt-BR', 'en-US', 'es-LA']
// =============================================================================

describe('F040: SUPPORTED_LANGUAGES (AC-001)', () => {
  it('contains exactly pt-BR, en-US, es-LA', () => {
    expect([...SUPPORTED_LANGUAGES]).toEqual(['pt-BR', 'en-US', 'es-LA']);
  });

  it('does NOT contain old short codes (en, es)', () => {
    expect(SUPPORTED_LANGUAGES).not.toContain('en');
    expect(SUPPORTED_LANGUAGES).not.toContain('es');
  });

  it('does NOT contain old DB codes (en-US is now correct, but es-ES should be gone)', () => {
    expect(SUPPORTED_LANGUAGES).not.toContain('es-ES');
  });
});

// =============================================================================
// AC-005, AC-006: toDbLocale identity mapping
// =============================================================================

describe('F040: toDbLocale identity mapping (AC-005, AC-006)', () => {
  it('returns pt-BR unchanged', () => {
    expect(toDbLocale('pt-BR')).toBe('pt-BR');
  });

  it('returns en-US unchanged (AC-005)', () => {
    expect(toDbLocale('en-US')).toBe('en-US');
  });

  it('returns es-LA unchanged (AC-006)', () => {
    expect(toDbLocale('es-LA')).toBe('es-LA');
  });

  it('passes through unknown language codes unchanged', () => {
    expect(toDbLocale('fr')).toBe('fr');
    expect(toDbLocale('de')).toBe('de');
    expect(toDbLocale('en')).toBe('en'); // old code is not mapped
    expect(toDbLocale('es')).toBe('es'); // old code is not mapped
  });
});

// =============================================================================
// AC-007, AC-008: formatDate with new locale codes
// =============================================================================

describe('F040: formatDate with en-US and es-LA (AC-007, AC-008)', () => {
  it('formats as "FEB 08" for en-US (AC-007)', () => {
    expect(formatDate('2026-02-08', 'en-US')).toBe('FEB 08');
  });

  it('formats as "08 FEB" for es-LA (AC-008)', () => {
    expect(formatDate('2026-02-08', 'es-LA')).toBe('08 FEB');
  });

  it('formats as "08 FEV" for pt-BR (unchanged)', () => {
    expect(formatDate('2026-02-08', 'pt-BR')).toBe('08 FEV');
  });

  it('uses correct month abbreviations for en-US', () => {
    expect(getMonthAbbr(1, 'en-US')).toBe('JAN');
    expect(getMonthAbbr(4, 'en-US')).toBe('APR');
    expect(getMonthAbbr(9, 'en-US')).toBe('SEP');
    expect(getMonthAbbr(12, 'en-US')).toBe('DEC');
  });

  it('uses correct month abbreviations for es-LA', () => {
    expect(getMonthAbbr(1, 'es-LA')).toBe('ENE');
    expect(getMonthAbbr(12, 'es-LA')).toBe('DIC');
  });
});

// =============================================================================
// AC-009: formatDateHumanReadable with en-US
// =============================================================================

describe('F040: formatDateHumanReadable (AC-009)', () => {
  it('returns "February 15, 2026" for en-US (AC-009)', () => {
    expect(formatDateHumanReadable('2026-02-15', 'en-US')).toBe('February 15, 2026');
  });

  it('returns "15 de Febrero de 2026" for es-LA', () => {
    expect(formatDateHumanReadable('2026-02-15', 'es-LA')).toBe('15 de Febrero de 2026');
  });

  it('returns "15 de Fevereiro de 2026" for pt-BR (unchanged)', () => {
    expect(formatDateHumanReadable('2026-02-15', 'pt-BR')).toBe('15 de Fevereiro de 2026');
  });

  it('handles January dates correctly for en-US', () => {
    expect(formatDateHumanReadable('2026-01-01', 'en-US')).toBe('January 1, 2026');
  });

  it('handles December dates correctly for es-LA', () => {
    expect(formatDateHumanReadable('2026-12-25', 'es-LA')).toBe('25 de Diciembre de 2026');
  });
});

// =============================================================================
// AC-010: formatFullDate with en-US
// =============================================================================

describe('F040: formatFullDate (AC-010)', () => {
  it('returns "Sunday, February 15, 2026" for en-US (AC-010)', () => {
    expect(formatFullDate('2026-02-15', 'en-US')).toBe('Sunday, February 15, 2026');
  });

  it('returns "Domingo, 15 de Febrero de 2026" for es-LA', () => {
    expect(formatFullDate('2026-02-15', 'es-LA')).toBe('Domingo, 15 de Febrero de 2026');
  });

  it('returns "Domingo, 15 de Fevereiro de 2026" for pt-BR (unchanged)', () => {
    expect(formatFullDate('2026-02-15', 'pt-BR')).toBe('Domingo, 15 de Fevereiro de 2026');
  });

  it('handles weekday names correctly for en-US', () => {
    // 2026-02-16 is a Monday
    expect(formatFullDate('2026-02-16', 'en-US')).toBe('Monday, February 16, 2026');
  });

  it('handles weekday names correctly for es-LA', () => {
    // 2026-02-16 is a Monday
    expect(formatFullDate('2026-02-16', 'es-LA')).toBe('Lunes, 16 de Febrero de 2026');
  });
});

// =============================================================================
// AC-011, AC-012, AC-014: getDefaultSpeechTemplate with new codes
// =============================================================================

describe('F040: getDefaultSpeechTemplate (AC-011, AC-012, AC-014)', () => {
  it('returns English template for en-US position 1 (AC-011)', () => {
    const template = getDefaultSpeechTemplate('en-US', 1);
    expect(template).toBe(DEFAULT_TEMPLATE_SPEECH_1_EN);
    expect(template).toContain('Bishopric');
  });

  it('returns Spanish template for es-LA position 1 (AC-012)', () => {
    const template = getDefaultSpeechTemplate('es-LA', 1);
    expect(template).toBe(DEFAULT_TEMPLATE_SPEECH_1_ES);
    expect(template).toContain('Obispado');
  });

  it('falls back to en-US for unknown language (AC-014)', () => {
    const template = getDefaultSpeechTemplate('fr', 1);
    expect(template).toBe(DEFAULT_TEMPLATE_SPEECH_1_EN);
    expect(template).toContain('Bishopric');
  });

  it('returns English template for all positions with en-US', () => {
    expect(getDefaultSpeechTemplate('en-US', 2)).toContain('Bishopric');
    expect(getDefaultSpeechTemplate('en-US', 3)).toContain('Bishopric');
  });

  it('returns Spanish template for all positions with es-LA', () => {
    expect(getDefaultSpeechTemplate('es-LA', 2)).toContain('Obispado');
    expect(getDefaultSpeechTemplate('es-LA', 3)).toContain('Obispado');
  });
});

// =============================================================================
// AC-013: getDefaultPrayerTemplate with en-US
// =============================================================================

describe('F040: getDefaultPrayerTemplate (AC-013)', () => {
  it('returns English opening prayer for en-US (AC-013)', () => {
    const template = getDefaultPrayerTemplate('en-US', 'opening');
    expect(template).toBe(DEFAULT_OPENING_PRAYER_TEMPLATE_EN);
    expect(template).toContain('opening prayer');
  });

  it('returns English closing prayer for en-US', () => {
    const template = getDefaultPrayerTemplate('en-US', 'closing');
    expect(template).toBe(DEFAULT_CLOSING_PRAYER_TEMPLATE_EN);
    expect(template).toContain('closing prayer');
  });

  it('returns Spanish opening prayer for es-LA', () => {
    const template = getDefaultPrayerTemplate('es-LA', 'opening');
    expect(template).toBe(DEFAULT_OPENING_PRAYER_TEMPLATE_ES);
    expect(template).toContain('oración de apertura');
  });

  it('returns Spanish closing prayer for es-LA', () => {
    const template = getDefaultPrayerTemplate('es-LA', 'closing');
    expect(template).toBe(DEFAULT_CLOSING_PRAYER_TEMPLATE_ES);
    expect(template).toContain('oración de cierre');
  });

  it('returns Portuguese opening prayer for pt-BR', () => {
    const template = getDefaultPrayerTemplate('pt-BR', 'opening');
    expect(template).toBe(DEFAULT_OPENING_PRAYER_TEMPLATE_PT_BR);
    expect(template).toContain('oração de abertura');
  });

  it('returns Portuguese closing prayer for pt-BR', () => {
    const template = getDefaultPrayerTemplate('pt-BR', 'closing');
    expect(template).toBe(DEFAULT_CLOSING_PRAYER_TEMPLATE_PT_BR);
    expect(template).toContain('oração de encerramento');
  });

  it('falls back to en-US for unknown language', () => {
    expect(getDefaultPrayerTemplate('fr', 'opening')).toBe(DEFAULT_OPENING_PRAYER_TEMPLATE_EN);
    expect(getDefaultPrayerTemplate('de', 'closing')).toBe(DEFAULT_CLOSING_PRAYER_TEMPLATE_EN);
  });
});

// =============================================================================
// AC-015, AC-016: getOrdinal with new codes
// =============================================================================

describe('F040: getOrdinal with new codes (AC-015, AC-016)', () => {
  it('returns 1st for en-US (AC-015)', () => {
    expect(getOrdinal(1, 'en-US')).toBe('1st');
  });

  it('returns 2do for es-LA (AC-016)', () => {
    expect(getOrdinal(2, 'es-LA')).toBe('2do');
  });

  it('returns correct ordinals for all positions and languages', () => {
    expect(getOrdinal(2, 'en-US')).toBe('2nd');
    expect(getOrdinal(3, 'en-US')).toBe('3rd');
    expect(getOrdinal(1, 'es-LA')).toBe('1er');
    expect(getOrdinal(3, 'es-LA')).toBe('3er');
    expect(getOrdinal(1, 'pt-BR')).toBe('1\u00BA');
  });
});

// =============================================================================
// AC-017, AC-018: formatNameList with new codes
// =============================================================================

describe('F040: formatNameList with new codes (AC-017, AC-018)', () => {
  it('joins two names with "and" for en-US (AC-017)', () => {
    expect(formatNameList(['Alice', 'Bob'], 'en-US')).toBe('Alice and Bob');
  });

  it('joins two names with "y" for es-LA (AC-018)', () => {
    expect(formatNameList(['Ana', 'Luis'], 'es-LA')).toBe('Ana y Luis');
  });

  it('joins three names correctly for en-US', () => {
    expect(formatNameList(['Alice', 'Bob', 'Carol'], 'en-US')).toBe('Alice, Bob and Carol');
  });

  it('joins three names correctly for es-LA', () => {
    expect(formatNameList(['Ana', 'Luis', 'Carlos'], 'es-LA')).toBe('Ana, Luis y Carlos');
  });

  it('joins two names with "e" for pt-BR (unchanged)', () => {
    expect(formatNameList(['João', 'Maria'], 'pt-BR')).toBe('João e Maria');
  });
});

// =============================================================================
// AC-019: buildNotificationText with en-US
// =============================================================================

describe('F040: buildNotificationText with new codes (AC-019)', () => {
  it('returns "Speech Assignment" title for en-US designation (AC-019)', () => {
    const result = buildNotificationText('designation', 'en-US', {
      names: ['John'],
      date: '2026-03-01',
    });
    expect(result.title).toBe('Speech Assignment');
    expect(result.body).toContain('John');
    expect(result.body).toContain('was assigned');
  });

  it('returns "Asignación de Discurso" title for es-LA designation', () => {
    const result = buildNotificationText('designation', 'es-LA', {
      names: ['Juan'],
      date: '2026-03-01',
    });
    expect(result.title).toBe('Asignación de Discurso');
    expect(result.body).toContain('Juan');
    expect(result.body).toContain('fue asignado');
  });

  it('returns "Speech Reminder" for en-US weekly_assignment', () => {
    const result = buildNotificationText('weekly_assignment', 'en-US', {});
    expect(result.title).toBe('Speech Reminder');
    expect(result.body).toContain('speakers to be assigned');
  });

  it('returns "Speaker Confirmed" for en-US speaker_confirmed', () => {
    const result = buildNotificationText('speaker_confirmed', 'en-US', {
      name: 'Jane',
      position: 1,
      date: '2026-03-08',
    });
    expect(result.title).toBe('Speaker Confirmed');
    expect(result.body).toContain('Jane');
    expect(result.body).toContain('1st');
  });

  it('returns "ATTENTION! Speaker Withdrew" for en-US speaker_withdrew', () => {
    const result = buildNotificationText('speaker_withdrew', 'en-US', {
      name: 'Bob',
      position: 2,
      date: '2026-03-15',
    });
    expect(result.title).toBe('ATTENTION! Speaker Withdrew');
    expect(result.body).toContain('Bob');
    expect(result.body).toContain('2nd');
  });
});

// =============================================================================
// AC-032: Register screen shows new language codes (via SUPPORTED_LANGUAGES)
// =============================================================================

describe('F040: Register screen language codes (AC-032)', () => {
  it('SUPPORTED_LANGUAGES provides pt-BR, en-US, es-LA for register screen', () => {
    expect(SUPPORTED_LANGUAGES).toContain('pt-BR');
    expect(SUPPORTED_LANGUAGES).toContain('en-US');
    expect(SUPPORTED_LANGUAGES).toContain('es-LA');
  });

  it('LANGUAGE_LABELS provides display names for all codes', () => {
    expect(LANGUAGE_LABELS['pt-BR']).toBe('Portugues (Brasil)');
    expect(LANGUAGE_LABELS['en-US']).toBe('English');
    expect(LANGUAGE_LABELS['es-LA']).toBe('Espanol');
  });

  it('DEFAULT_COUNTRY_CODES provides codes for all languages', () => {
    expect(DEFAULT_COUNTRY_CODES['pt-BR']).toBe('+55');
    expect(DEFAULT_COUNTRY_CODES['en-US']).toBe('+1');
    expect(DEFAULT_COUNTRY_CODES['es-LA']).toBe('+52');
  });

  it('DEFAULT_TIMEZONES provides timezones for all languages', () => {
    expect(DEFAULT_TIMEZONES['pt-BR']).toBe('America/Sao_Paulo');
    expect(DEFAULT_TIMEZONES['en-US']).toBe('America/New_York');
    expect(DEFAULT_TIMEZONES['es-LA']).toBe('America/Mexico_City');
  });
});

// =============================================================================
// AC-033: Backward compatibility - old codes not in SUPPORTED_LANGUAGES
// =============================================================================

describe('F040: Backward compatibility (AC-033)', () => {
  it('old code "en" is NOT in SUPPORTED_LANGUAGES', () => {
    expect(SUPPORTED_LANGUAGES.includes('en' as SupportedLanguage)).toBe(false);
  });

  it('old code "es" is NOT in SUPPORTED_LANGUAGES', () => {
    expect(SUPPORTED_LANGUAGES.includes('es' as SupportedLanguage)).toBe(false);
  });

  it('old DB code "es-ES" is NOT in SUPPORTED_LANGUAGES', () => {
    expect(SUPPORTED_LANGUAGES.includes('es-ES' as SupportedLanguage)).toBe(false);
  });

  it('toDbLocale passes through old codes without mapping (no backward compat)', () => {
    // Old codes are NOT mapped to new codes by toDbLocale
    // This is expected - after migration, DB won't have old codes
    expect(toDbLocale('en')).toBe('en');
    expect(toDbLocale('es')).toBe('es');
    expect(toDbLocale('es-ES')).toBe('es-ES');
  });
});
