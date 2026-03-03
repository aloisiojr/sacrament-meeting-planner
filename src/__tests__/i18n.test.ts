import { describe, it, expect, beforeEach } from 'vitest';
import ptBR from '../i18n/locales/pt-BR.json';
import enUS from '../i18n/locales/en-US.json';
import esLA from '../i18n/locales/es-LA.json';

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
  const enUSKeys = collectKeys(enUS as Record<string, unknown>);
  const esLAKeys = collectKeys(esLA as Record<string, unknown>);

  it('should have pt-BR as the reference locale with all required keys', () => {
    expect(ptBRKeys.length).toBeGreaterThan(0);
  });

  it('should have all pt-BR keys present in en-US locale', () => {
    const missingInEnUS = ptBRKeys.filter((key) => !enUSKeys.includes(key));
    expect(missingInEnUS, `Missing keys in en-US: ${missingInEnUS.join(', ')}`).toEqual([]);
  });

  it('should have all pt-BR keys present in es-LA locale', () => {
    const missingInEsLA = ptBRKeys.filter((key) => !esLAKeys.includes(key));
    expect(missingInEsLA, `Missing keys in es-LA: ${missingInEsLA.join(', ')}`).toEqual([]);
  });

  it('should not have extra keys in en-US that are not in pt-BR', () => {
    const extraInEnUS = enUSKeys.filter((key) => !ptBRKeys.includes(key));
    expect(extraInEnUS, `Extra keys in en-US: ${extraInEnUS.join(', ')}`).toEqual([]);
  });

  it('should not have extra keys in es-LA that are not in pt-BR', () => {
    const extraInEsLA = esLAKeys.filter((key) => !ptBRKeys.includes(key));
    expect(extraInEsLA, `Extra keys in es-LA: ${extraInEsLA.join(', ')}`).toEqual([]);
  });

  it('should have the correct login title in all languages', () => {
    expect(ptBR.auth.loginTitle).toBe('Gerenciador da Reunião Sacramental');
    expect(enUS.auth.loginTitle).toBe('Sacrament Meeting Planner');
    expect(esLA.auth.loginTitle).toBe('Planificador de Reunión Sacramental');
  });

  it('should have the correct login subtitle in all languages', () => {
    expect(ptBR.auth.loginSubtitle).toBe('discursos e agenda');
    expect(enUS.auth.loginSubtitle).toBe('speeches and agenda');
    expect(esLA.auth.loginSubtitle).toBe('discursos y agenda');
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
        enUS.speechStatus[status as keyof typeof enUS.speechStatus],
        `Missing speechStatus.${status} in en-US`
      ).toBeDefined();
      expect(
        esLA.speechStatus[status as keyof typeof esLA.speechStatus],
        `Missing speechStatus.${status} in es-LA`
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
        enUS.date.months[month as keyof typeof enUS.date.months],
        `Missing month ${month} in en-US`
      ).toBeDefined();
      expect(
        esLA.date.months[month as keyof typeof esLA.date.months],
        `Missing month ${month} in es-LA`
      ).toBeDefined();
    }
  });

  it('should have correct date format patterns per locale', () => {
    // pt-BR: "08 FEV" -> "{{day}} {{month}}"
    expect(ptBR.date.format).toBe('{{day}} {{month}}');
    // en: "FEB 08" -> "{{month}} {{day}}"
    expect(enUS.date.format).toBe('{{month}} {{day}}');
    // es-LA: "08 FEB" -> "{{day}} {{month}}"
    expect(esLA.date.format).toBe('{{day}} {{month}}');
  });

  it('should have correct month abbreviations per locale', () => {
    expect(ptBR.date.months['02']).toBe('FEV');
    expect(enUS.date.months['02']).toBe('FEB');
    expect(esLA.date.months['02']).toBe('FEB');
  });

  it('should have all 3 theme options in all locales', () => {
    const themes = ['automatic', 'light', 'dark'];
    for (const theme of themes) {
      expect(
        ptBR.theme[theme as keyof typeof ptBR.theme],
        `Missing theme.${theme} in pt-BR`
      ).toBeDefined();
      expect(
        enUS.theme[theme as keyof typeof enUS.theme],
        `Missing theme.${theme} in en-US`
      ).toBeDefined();
      expect(
        esLA.theme[theme as keyof typeof esLA.theme],
        `Missing theme.${theme} in es-LA`
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
        enUS.sundayExceptions[exc as keyof typeof enUS.sundayExceptions],
        `Missing sundayExceptions.${exc} in en-US`
      ).toBeDefined();
      expect(
        esLA.sundayExceptions[exc as keyof typeof esLA.sundayExceptions],
        `Missing sundayExceptions.${exc} in es-LA`
      ).toBeDefined();
    }
  });
});
