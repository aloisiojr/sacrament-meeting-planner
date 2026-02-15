import { describe, it, expect, beforeEach } from 'vitest';
import ptBR from '../i18n/locales/pt-BR.json';
import en from '../i18n/locales/en.json';
import es from '../i18n/locales/es.json';

/**
 * Recursively collect all keys from a nested object, using dot notation.
 */
function collectKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...collectKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

describe('i18n locale files', () => {
  const ptBRKeys = collectKeys(ptBR as Record<string, unknown>);
  const enKeys = collectKeys(en as Record<string, unknown>);
  const esKeys = collectKeys(es as Record<string, unknown>);

  it('should have pt-BR as the reference locale with all required keys', () => {
    expect(ptBRKeys.length).toBeGreaterThan(0);
  });

  it('should have all pt-BR keys present in en locale', () => {
    const missingInEn = ptBRKeys.filter((key) => !enKeys.includes(key));
    expect(missingInEn, `Missing keys in en: ${missingInEn.join(', ')}`).toEqual([]);
  });

  it('should have all pt-BR keys present in es locale', () => {
    const missingInEs = ptBRKeys.filter((key) => !esKeys.includes(key));
    expect(missingInEs, `Missing keys in es: ${missingInEs.join(', ')}`).toEqual([]);
  });

  it('should not have extra keys in en that are not in pt-BR', () => {
    const extraInEn = enKeys.filter((key) => !ptBRKeys.includes(key));
    expect(extraInEn, `Extra keys in en: ${extraInEn.join(', ')}`).toEqual([]);
  });

  it('should not have extra keys in es that are not in pt-BR', () => {
    const extraInEs = esKeys.filter((key) => !ptBRKeys.includes(key));
    expect(extraInEs, `Extra keys in es: ${extraInEs.join(', ')}`).toEqual([]);
  });

  it('should have the correct login title in all languages', () => {
    expect(ptBR.auth.loginTitle).toBe('Gerenciador da Reuniao Sacramental');
    expect(en.auth.loginTitle).toBe('Sacrament Meeting Planner');
    expect(es.auth.loginTitle).toBe('Planificador de Reunion Sacramental');
  });

  it('should have the correct login subtitle in all languages', () => {
    expect(ptBR.auth.loginSubtitle).toBe('discursos e agenda');
    expect(en.auth.loginSubtitle).toBe('speeches and agenda');
    expect(es.auth.loginSubtitle).toBe('discursos y agenda');
  });

  it('should have all 5 speech status translations in all locales', () => {
    const statuses = [
      'not_assigned',
      'assigned_not_invited',
      'assigned_invited',
      'assigned_confirmed',
      'gave_up',
    ];
    for (const status of statuses) {
      expect(
        ptBR.speechStatus[status as keyof typeof ptBR.speechStatus],
        `Missing speechStatus.${status} in pt-BR`
      ).toBeDefined();
      expect(
        en.speechStatus[status as keyof typeof en.speechStatus],
        `Missing speechStatus.${status} in en`
      ).toBeDefined();
      expect(
        es.speechStatus[status as keyof typeof es.speechStatus],
        `Missing speechStatus.${status} in es`
      ).toBeDefined();
    }
  });

  it('should have all 12 month abbreviations in all locales', () => {
    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    for (const month of months) {
      expect(
        ptBR.date.months[month as keyof typeof ptBR.date.months],
        `Missing month ${month} in pt-BR`
      ).toBeDefined();
      expect(
        en.date.months[month as keyof typeof en.date.months],
        `Missing month ${month} in en`
      ).toBeDefined();
      expect(
        es.date.months[month as keyof typeof es.date.months],
        `Missing month ${month} in es`
      ).toBeDefined();
    }
  });

  it('should have correct date format patterns per locale', () => {
    // pt-BR: "08 FEV" -> "{{day}} {{month}}"
    expect(ptBR.date.format).toBe('{{day}} {{month}}');
    // en: "FEB 08" -> "{{month}} {{day}}"
    expect(en.date.format).toBe('{{month}} {{day}}');
    // es: "08 FEB" -> "{{day}} {{month}}"
    expect(es.date.format).toBe('{{day}} {{month}}');
  });

  it('should have correct month abbreviations per locale', () => {
    expect(ptBR.date.months['02']).toBe('FEV');
    expect(en.date.months['02']).toBe('FEB');
    expect(es.date.months['02']).toBe('FEB');
  });

  it('should have all 3 theme options in all locales', () => {
    const themes = ['automatic', 'light', 'dark'];
    for (const theme of themes) {
      expect(
        ptBR.theme[theme as keyof typeof ptBR.theme],
        `Missing theme.${theme} in pt-BR`
      ).toBeDefined();
      expect(
        en.theme[theme as keyof typeof en.theme],
        `Missing theme.${theme} in en`
      ).toBeDefined();
      expect(
        es.theme[theme as keyof typeof es.theme],
        `Missing theme.${theme} in es`
      ).toBeDefined();
    }
  });

  it('should have all sunday exception types in all locales', () => {
    const exceptions = [
      'testimony_meeting',
      'general_conference',
      'stake_conference',
      'ward_conference',
      'primary_presentation',
      'other',
      'speeches',
    ];
    for (const exc of exceptions) {
      expect(
        ptBR.sundayExceptions[exc as keyof typeof ptBR.sundayExceptions],
        `Missing sundayExceptions.${exc} in pt-BR`
      ).toBeDefined();
      expect(
        en.sundayExceptions[exc as keyof typeof en.sundayExceptions],
        `Missing sundayExceptions.${exc} in en`
      ).toBeDefined();
      expect(
        es.sundayExceptions[exc as keyof typeof es.sundayExceptions],
        `Missing sundayExceptions.${exc} in es`
      ).toBeDefined();
    }
  });
});
