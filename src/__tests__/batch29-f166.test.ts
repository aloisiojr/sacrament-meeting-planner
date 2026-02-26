/**
 * Batch 29: Tests for F166 (CR-239)
 * Fix i18n missing translation keys and accent/diacritic errors.
 *
 * Covers:
 * - I18N-001: Missing common.yes and common.no keys (AC-166-01, AC-166-02, AC-166-03)
 * - I18N-002: pt-BR accent corrections (AC-166-04)
 * - I18N-003: es accent corrections (AC-166-05)
 * - I18N-004: dateUtils.ts accent corrections (AC-166-06, AC-166-07, AC-166-08)
 * - Validation: Interpolation params preserved (AC-166-09)
 * - Validation: Existing tests pass (AC-166-10, AC-166-11)
 * - Edge cases: EC-166-01, EC-166-02
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import ptBR from '../i18n/locales/pt-BR.json';
import en from '../i18n/locales/en.json';
import es from '../i18n/locales/es.json';
import { formatDateHumanReadable, formatFullDate } from '../lib/dateUtils';

// --- Helpers ---

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

function getNestedValue(obj: Record<string, unknown>, dotPath: string): unknown {
  const parts = dotPath.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

// =============================================================================
// I18N-001: Missing keys (AC-166-01, AC-166-02, AC-166-03, EC-166-02)
// =============================================================================

describe('I18N-001: Missing common.yes and common.no keys', () => {

  // --- AC-166-01: common.yes exists in all 3 locales ---
  describe('AC-166-01: common.yes in all locales', () => {
    it('en.json has common.yes = "Yes"', () => {
      expect(en.common.yes).toBe('Yes');
    });

    it('es.json has common.yes = "Sí"', () => {
      expect(es.common.yes).toBe('Sí');
    });

    it('pt-BR.json has common.yes = "Sim"', () => {
      expect(ptBR.common.yes).toBe('Sim');
    });
  });

  // --- AC-166-02: common.no exists in all 3 locales ---
  describe('AC-166-02: common.no in all locales', () => {
    it('en.json has common.no = "No"', () => {
      expect(en.common.no).toBe('No');
    });

    it('es.json has common.no = "No"', () => {
      expect(es.common.no).toBe('No');
    });

    it('pt-BR.json has common.no = "Não"', () => {
      expect(ptBR.common.no).toBe('Não');
    });
  });

  // --- AC-166-03: All 3 locale files have identical key sets (332 keys) ---
  describe('AC-166-03: Key parity across all 3 locale files', () => {
    const ptBRKeys = collectKeys(ptBR as Record<string, unknown>).sort();
    const enKeys = collectKeys(en as Record<string, unknown>).sort();
    const esKeys = collectKeys(es as Record<string, unknown>).sort();

    it('all 3 locale files have 332 keys', () => {
      expect(ptBRKeys.length).toBe(332);
      expect(enKeys.length).toBe(332);
      expect(esKeys.length).toBe(332);
    });

    it('key sets are identical across all 3 locales', () => {
      expect(enKeys).toEqual(ptBRKeys);
      expect(esKeys).toEqual(ptBRKeys);
    });
  });

  // --- EC-166-02: ExitConfirmation t() calls resolve ---
  describe('EC-166-02: ExitConfirmation t() calls resolve', () => {
    it('ExitConfirmation.tsx references common.yes and common.no', () => {
      const exitConfSrc = fs.readFileSync(
        path.resolve(__dirname, '..', 'components', 'ExitConfirmation.tsx'),
        'utf-8'
      );
      expect(exitConfSrc).toContain("t('common.yes')");
      expect(exitConfSrc).toContain("t('common.no')");
    });
  });
});

// =============================================================================
// I18N-002: pt-BR accent corrections (AC-166-04)
// =============================================================================

describe('I18N-002: pt-BR accent corrections', () => {

  // --- AC-166-04: All 13 pt-BR keys have correct diacritical marks ---
  describe('AC-166-04: 13 pt-BR keys corrected', () => {
    it('common.appTitle contains "Reunião"', () => {
      expect(ptBR.common.appTitle).toBe('Gerenciador da Reunião Sacramental');
    });

    it('auth.loginTitle contains "Reunião"', () => {
      expect(ptBR.auth.loginTitle).toBe('Gerenciador da Reunião Sacramental');
    });

    it('auth.passwordUpdated contains "Faça"', () => {
      expect(ptBR.auth.passwordUpdated).toBe('Senha atualizada com sucesso! Faça login com sua nova senha.');
    });

    it('auth.resetExpired contains "redefinição"', () => {
      expect(ptBR.auth.resetExpired).toBe('Link expirado. Solicite um novo email de redefinição.');
    });

    it('sundayExceptions.changeConfirmMessage has all 4 corrections', () => {
      const msg = ptBR.sundayExceptions.changeConfirmMessage;
      expect(msg).toContain('designações');
      expect(msg).toContain('serão');
      expect(msg).toContain('você');
      expect(msg).toContain('operação');
    });

    it('members.csvErrorEmptyFile contains "está"', () => {
      expect(ptBR.members.csvErrorEmptyFile).toBe('O arquivo CSV está vazio.');
    });

    it('members.csvErrorInvalidHeader has all 4 corrections', () => {
      const msg = ptBR.members.csvErrorInvalidHeader;
      expect(msg).toContain('Cabeçalho');
      expect(msg).toContain('inválido');
      expect(msg).toContain('São');
      expect(msg).toContain('necessárias');
    });

    it('members.csvErrorNameRequired contains "é" and "obrigatório"', () => {
      expect(ptBR.members.csvErrorNameRequired).toBe('O nome é obrigatório.');
    });

    it('members.csvErrorNoData contains "não", "contém", "válidas"', () => {
      const msg = ptBR.members.csvErrorNoData;
      expect(msg).toContain('não');
      expect(msg).toContain('contém');
      expect(msg).toContain('válidas');
    });

    it('members.importReadError contains "não" and "está"', () => {
      const msg = ptBR.members.importReadError;
      expect(msg).toContain('não');
      expect(msg).toContain('está');
    });

    it('members.csvHelp contains "código" and "país"', () => {
      const msg = ptBR.members.csvHelp;
      expect(msg).toContain('código');
      expect(msg).toContain('país');
    });

    it('members.importConfirmMessage has all 6 corrections', () => {
      const msg = ptBR.members.importConfirmMessage;
      expect(msg).toContain('será');
      expect(msg).toContain('substituída');
      expect(msg).toContain('conteúdo');
      expect(msg).toContain('designações');
      expect(msg).toContain('não');
      expect(msg).toContain('serão');
    });

    it('agenda.musicalNumber = "Apresentação Especial"', () => {
      expect(ptBR.agenda.musicalNumber).toBe('Apresentação Especial');
    });
  });
});

// =============================================================================
// I18N-003: es accent corrections (AC-166-05)
// =============================================================================

describe('I18N-003: es accent corrections', () => {

  // --- AC-166-05: All 16 es keys have correct diacritical marks ---
  describe('AC-166-05: 16 es keys corrected', () => {
    it('common.appTitle contains "Reunión"', () => {
      expect(es.common.appTitle).toBe('Planificador de Reunión Sacramental');
    });

    it('auth.loginTitle contains "Reunión"', () => {
      expect(es.auth.loginTitle).toBe('Planificador de Reunión Sacramental');
    });

    it('auth.resetPasswordTitle contains "contraseña"', () => {
      expect(es.auth.resetPasswordTitle).toBe('Restablecer contraseña');
    });

    it('auth.newPassword contains "contraseña"', () => {
      expect(es.auth.newPassword).toBe('Nueva contraseña');
    });

    it('auth.passwordUpdated has all 4 corrections', () => {
      const msg = es.auth.passwordUpdated;
      expect(msg).toContain('Contraseña');
      expect(msg).toContain('éxito');
      expect(msg).toContain('sesión');
      expect(msg).toContain('contraseña');
    });

    it('auth.updatePassword contains "contraseña"', () => {
      expect(es.auth.updatePassword).toBe('Actualizar contraseña');
    });

    it('sundayExceptions.changeConfirmMessage has "serán" and "operación"', () => {
      const msg = es.sundayExceptions.changeConfirmMessage;
      expect(msg).toContain('serán');
      expect(msg).toContain('operación');
    });

    it('settings.whatsappTemplate contains "Invitación"', () => {
      expect(es.settings.whatsappTemplate).toBe('Modelo de Invitación por WhatsApp');
    });

    it('members.csvHeaderPhone = "Teléfono Completo"', () => {
      expect(es.members.csvHeaderPhone).toBe('Teléfono Completo');
    });

    it('members.csvErrorEmptyFile contains "está" and "vacío"', () => {
      const msg = es.members.csvErrorEmptyFile;
      expect(msg).toContain('está');
      expect(msg).toContain('vacío');
    });

    it('members.csvErrorInvalidHeader contains "inválido"', () => {
      expect(es.members.csvErrorInvalidHeader).toContain('inválido');
    });

    it('members.csvErrorNoData contains "válidas"', () => {
      expect(es.members.csvErrorNoData).toContain('válidas');
    });

    it('members.importReadError contains "esté", "dañado", "inténtelo"', () => {
      const msg = es.members.importReadError;
      expect(msg).toContain('esté');
      expect(msg).toContain('dañado');
      expect(msg).toContain('inténtelo');
    });

    it('members.csvHelp contains "Teléfono" and "código"', () => {
      const msg = es.members.csvHelp;
      expect(msg).toContain('Teléfono');
      expect(msg).toContain('código');
    });

    it('members.importConfirmMessage contains "será" and "serán"', () => {
      const msg = es.members.importConfirmMessage;
      expect(msg).toContain('será');
      expect(msg).toContain('serán');
    });

    it('agenda.musicalNumber = "Presentación Especial"', () => {
      expect(es.agenda.musicalNumber).toBe('Presentación Especial');
    });
  });
});

// =============================================================================
// I18N-004: dateUtils.ts accent corrections (AC-166-06, AC-166-07, AC-166-08)
// =============================================================================

describe('I18N-004: dateUtils.ts accent corrections', () => {

  // --- AC-166-06: MONTH_FULL pt-BR March = 'Março' ---
  describe('AC-166-06: MONTH_FULL pt-BR March', () => {
    it('formatDateHumanReadable March in pt-BR uses "Março"', () => {
      expect(formatDateHumanReadable('2026-03-15', 'pt-BR')).toBe('15 de Março de 2026');
    });
  });

  // --- AC-166-07: DAY_NAMES pt-BR Tuesday/Saturday ---
  describe('AC-166-07: DAY_NAMES pt-BR accents', () => {
    it('formatFullDate Tuesday in pt-BR uses "Terça-feira"', () => {
      // 2026-02-17 is a Tuesday
      expect(formatFullDate('2026-02-17', 'pt-BR')).toContain('Terça-feira');
    });

    it('formatFullDate Saturday in pt-BR uses "Sábado"', () => {
      // 2026-02-21 is a Saturday
      expect(formatFullDate('2026-02-21', 'pt-BR')).toContain('Sábado');
    });
  });

  // --- AC-166-08: DAY_NAMES es Wednesday/Saturday ---
  describe('AC-166-08: DAY_NAMES es accents', () => {
    it('formatFullDate Wednesday in es uses "Miércoles"', () => {
      // 2026-02-18 is a Wednesday
      expect(formatFullDate('2026-02-18', 'es')).toContain('Miércoles');
    });

    it('formatFullDate Saturday in es uses "Sábado"', () => {
      // 2026-02-21 is a Saturday
      expect(formatFullDate('2026-02-21', 'es')).toContain('Sábado');
    });
  });
});

// =============================================================================
// AC-166-09: Interpolation parameters preserved
// =============================================================================

describe('AC-166-09: Interpolation params preserved in corrected strings', () => {
  it('sundayExceptions.changeConfirmMessage preserves interpolation (no params expected)', () => {
    // This string has no interpolation params, verify it does not accidentally contain {{
    // Actually this key has no params, so just verify the string is intact
    expect(ptBR.sundayExceptions.changeConfirmMessage).not.toContain('{{');
    expect(es.sundayExceptions.changeConfirmMessage).not.toContain('{{');
  });

  it('members.importErrorLine preserves {{line}}, {{field}}, {{error}}', () => {
    expect(ptBR.members.importErrorLine).toContain('{{line}}');
    expect(ptBR.members.importErrorLine).toContain('{{field}}');
    expect(ptBR.members.importErrorLine).toContain('{{error}}');
    expect(es.members.importErrorLine).toContain('{{line}}');
    expect(es.members.importErrorLine).toContain('{{field}}');
    expect(es.members.importErrorLine).toContain('{{error}}');
  });

  it('members.importSuccess preserves {{count}}', () => {
    expect(ptBR.members.importSuccess).toContain('{{count}}');
    expect(es.members.importSuccess).toContain('{{count}}');
  });
});

// =============================================================================
// EC-166-01: No test assertions reference old (uncorrected) string values
// =============================================================================

describe('EC-166-01: No tests reference old uncorrected values', () => {
  const testDir = path.resolve(__dirname);
  // Only check i18n-focused test files (not edge function/external page tests)
  const i18nTestFiles = ['i18n.test.ts', 'i18n-module.test.ts', 'cr002-qa.test.ts',
    'batch14-phase1.test.ts', 'cr080-f026-members-explanatory-texts.test.ts',
    'batch8-phase1.test.ts', 'dateUtils.test.ts']
    .map(f => ({
      name: f,
      content: fs.readFileSync(path.join(testDir, f), 'utf-8'),
    }));

  // Old uncorrected strings that should NOT appear in i18n test assertions.
  // These are quoted strings that would appear inside toBe() or toContain() calls.
  const oldStrings = [
    { old: "'Gerenciador da Reuniao Sacramental'", desc: 'pt-BR loginTitle without accent' },
    { old: "'Planificador de Reunion Sacramental'", desc: 'es loginTitle without accent' },
    { old: "'Apresentacao Especial'", desc: 'pt-BR musicalNumber without accent' },
    { old: "'Presentacion Especial'", desc: 'es musicalNumber without accent' },
    { old: "'Restablecer contrasena'", desc: 'es resetPasswordTitle without ñ' },
    { old: "'Actualizar contrasena'", desc: 'es updatePassword without ñ' },
    { old: "'designacoes serao apagadas'", desc: 'pt-BR changeConfirmMessage without accents' },
    { old: "'seran eliminadas'", desc: 'es changeConfirmMessage without accent' },
    { old: "'1 de Marco de 2026'", desc: 'pt-BR March without cedilla' },
  ];

  for (const { old, desc } of oldStrings) {
    it(`no i18n test references old value: ${desc}`, () => {
      const matches = i18nTestFiles.filter(f => f.content.includes(old));
      expect(
        matches.map(m => m.name),
        `Found old uncorrected string "${old}" in test files`
      ).toEqual([]);
    });
  }
});
