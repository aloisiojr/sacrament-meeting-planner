/**
 * QA Tests for CR-004 / F005: CSV & Members Screen Fixes
 *
 * Covers:
 * CR-54: Export CSV cancel detection — double-tap guard, robust cancel detection,
 *        i18n success messages, importFailed uses i18n (not hardcoded English)
 * CR-55: Header spacer when canWrite=false — title stays centered
 * CR-66: Empty CSV export should generate file with headers; import errors should
 *        be formatted with i18n and show line/field details
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { generateCsv, parseCsv, splitPhoneNumber } from '../lib/csvUtils';

// i18n locale files
const ptBR = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../i18n/locales/pt-BR.json'), 'utf-8')
);
const en = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../i18n/locales/en.json'), 'utf-8')
);
const es = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../i18n/locales/es.json'), 'utf-8')
);

function readSourceFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf-8');
}

// =====================================================================
// CR-54: Export CSV cancel detection + double-tap guard + i18n
// =====================================================================
describe('CR-54: Export CSV cancel detection & double-tap guard', () => {
  describe('Double-tap guard via exportingRef', () => {
    it('members.tsx should have an exportingRef guard', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      expect(source).toContain('exportingRef');
      expect(source).toContain('useRef(false)');
    });

    it('handleExport should check exportingRef.current before proceeding', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      expect(source).toContain('if (exportingRef.current) return');
    });

    it('handleExport should set exportingRef.current = true at start', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      expect(source).toContain('exportingRef.current = true');
    });

    it('handleExport should reset exportingRef.current in finally block', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      // Verify the finally block resets the guard
      expect(source).toContain('finally');
      expect(source).toContain('exportingRef.current = false');
    });
  });

  describe('Robust cancel detection (not just exact string match)', () => {
    it('should check for "user did not share" (case-insensitive)', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      // Should lowercase the message for comparison
      expect(source).toContain('.toLowerCase()');
      expect(source).toContain("'user did not share'");
    });

    it('should also check for "cancelled" to cover platform variations', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      expect(source).toContain("'cancelled'");
    });

    it('should NOT show error alert when user cancels share sheet', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      // The condition should be: if msg !== 'user did not share' && !msg.includes('cancelled')
      expect(source).toContain("msg !== 'user did not share'");
      expect(source).toContain("!msg.includes('cancelled')");
    });

    it('should show i18n error alert for real errors', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      expect(source).toContain("t('members.exportFailed')");
    });
  });

  describe('Import error messages use i18n', () => {
    it('import catch block should use t("members.importFailed") not hardcoded English', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      // The catch block for DocumentPicker errors should use i18n
      expect(source).toContain("t('members.importFailed')");
      // Should NOT have hardcoded 'Failed to read file'
      expect(source).not.toContain("'Failed to read file'");
    });

    it('import success alert should use t("members.importSuccess")', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      expect(source).toContain("t('members.importSuccess'");
    });

    it('import error formatting should use t("members.importErrorLine")', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      expect(source).toContain("t('members.importErrorLine'");
    });
  });

  describe('i18n keys for import/export exist in all locales', () => {
    it('pt-BR should have exportFailed key', () => {
      expect(ptBR.members.exportFailed).toBe('Falha ao exportar arquivo');
    });

    it('en should have exportFailed key', () => {
      expect(en.members.exportFailed).toBe('Failed to export file');
    });

    it('es should have exportFailed key', () => {
      expect(es.members.exportFailed).toBe('Error al exportar archivo');
    });

    it('pt-BR should have importFailed key', () => {
      expect(ptBR.members.importFailed).toBe('Falha ao importar arquivo');
    });

    it('en should have importFailed key', () => {
      expect(en.members.importFailed).toBe('Failed to import file');
    });

    it('es should have importFailed key', () => {
      expect(es.members.importFailed).toBe('Error al importar archivo');
    });

    it('pt-BR should have importSuccess key with {{count}} placeholder', () => {
      expect(ptBR.members.importSuccess).toContain('{{count}}');
    });

    it('en should have importSuccess key with {{count}} placeholder', () => {
      expect(en.members.importSuccess).toContain('{{count}}');
    });

    it('es should have importSuccess key with {{count}} placeholder', () => {
      expect(es.members.importSuccess).toContain('{{count}}');
    });

    it('pt-BR should have importErrorLine key with {{line}} and {{field}}', () => {
      expect(ptBR.members.importErrorLine).toContain('{{line}}');
      expect(ptBR.members.importErrorLine).toContain('{{field}}');
    });

    it('en should have importErrorLine key with {{line}} and {{field}}', () => {
      expect(en.members.importErrorLine).toContain('{{line}}');
      expect(en.members.importErrorLine).toContain('{{field}}');
    });

    it('es should have importErrorLine key with {{line}} and {{field}}', () => {
      expect(es.members.importErrorLine).toContain('{{line}}');
      expect(es.members.importErrorLine).toContain('{{field}}');
    });

    it('pt-BR should have importEmpty key', () => {
      expect(ptBR.members.importEmpty).toBeTruthy();
      expect(ptBR.members.importEmpty.length).toBeGreaterThan(10);
    });

    it('en should have importEmpty key', () => {
      expect(en.members.importEmpty).toBeTruthy();
      expect(en.members.importEmpty.length).toBeGreaterThan(10);
    });

    it('es should have importEmpty key', () => {
      expect(es.members.importEmpty).toBeTruthy();
      expect(es.members.importEmpty.length).toBeGreaterThan(10);
    });
  });
});

// =====================================================================
// CR-55: Header spacer when canWrite=false
// =====================================================================
describe('CR-55: Header spacer for centered title when canWrite=false', () => {
  it('members.tsx should render a spacer View when canWrite is false', () => {
    const source = readSourceFile('app/(tabs)/settings/members.tsx');
    // When canWrite is false, render a spacer to keep title centered
    expect(source).toContain('width: 36');
  });

  it('add button should have width 36 to match spacer', () => {
    const source = readSourceFile('app/(tabs)/settings/members.tsx');
    // addButton style should match spacer width
    const addBtnMatch = source.match(/addButton:\s*\{[^}]*width:\s*(\d+)/s);
    expect(addBtnMatch).not.toBeNull();
    expect(parseInt(addBtnMatch![1], 10)).toBe(36);
  });

  it('header should use justifyContent: space-between', () => {
    const source = readSourceFile('app/(tabs)/settings/members.tsx');
    const headerMatch = source.match(/header:\s*\{[^}]*justifyContent:\s*'([^']+)'/s);
    expect(headerMatch).not.toBeNull();
    expect(headerMatch![1]).toBe('space-between');
  });

  it('should have ternary: canWrite renders addButton, else renders spacer View', () => {
    const source = readSourceFile('app/(tabs)/settings/members.tsx');
    // Pattern: {canWrite ? (<Pressable ...) : (<View style={{ width: 36 }} />)}
    expect(source).toContain('canWrite ?');
  });
});

// =====================================================================
// CR-66: Empty CSV export + import error formatting
// =====================================================================
describe('CR-66: Empty CSV export & import error formatting', () => {
  describe('Empty CSV export generates file with headers', () => {
    it('generateCsv with empty array should return header row', () => {
      const result = generateCsv([]);
      // Should contain BOM + header
      expect(result).toContain('Nome,Telefone Completo');
    });

    it('generateCsv with empty array should have only 1 line (header)', () => {
      const result = generateCsv([]);
      const lines = result.replace(/^\uFEFF/, '').trim().split('\n');
      expect(lines).toHaveLength(1);
      expect(lines[0]).toBe('Nome,Telefone Completo');
    });

    it('generateCsv should include UTF-8 BOM for Excel compatibility', () => {
      const result = generateCsv([]);
      expect(result.charCodeAt(0)).toBe(0xFEFF);
    });
  });

  describe('generateCsv with data', () => {
    it('should generate correct CSV for members with phone', () => {
      const members = [
        { full_name: 'Maria Silva', country_code: '+55', phone: '11999999999' },
        { full_name: 'John Doe', country_code: '+1', phone: '2125551234' },
      ];
      const result = generateCsv(members);
      const lines = result.replace(/^\uFEFF/, '').trim().split('\n');
      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe('Nome,Telefone Completo');
      expect(lines[1]).toBe('Maria Silva,+5511999999999');
      expect(lines[2]).toBe('John Doe,+12125551234');
    });

    it('should handle members without phone', () => {
      const members = [
        { full_name: 'Jose Santos', country_code: '+55', phone: null },
      ];
      const result = generateCsv(members);
      const lines = result.replace(/^\uFEFF/, '').trim().split('\n');
      expect(lines[1]).toBe('Jose Santos,');
    });

    it('should escape names with commas', () => {
      const members = [
        { full_name: 'Last, First', country_code: '+55', phone: '11999999999' },
      ];
      const result = generateCsv(members);
      expect(result).toContain('"Last, First"');
    });

    it('should escape names with quotes', () => {
      const members = [
        { full_name: 'The "Great" One', country_code: '+55', phone: '11999999999' },
      ];
      const result = generateCsv(members);
      expect(result).toContain('"The ""Great"" One"');
    });
  });

  describe('parseCsv validation and error messages', () => {
    it('should return errors with line, field, and message for each invalid row', () => {
      const csv = 'Nome,Telefone Completo\nJohn,invalid-phone\n,+5511999999999';
      const result = parseCsv(csv);
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
      // Each error should have line, field, message
      for (const err of result.errors) {
        expect(err).toHaveProperty('line');
        expect(err).toHaveProperty('field');
        expect(err).toHaveProperty('message');
        expect(typeof err.line).toBe('number');
        expect(typeof err.field).toBe('string');
        expect(typeof err.message).toBe('string');
      }
    });

    it('should detect invalid phone format', () => {
      const csv = 'Nome,Telefone Completo\nJohn,12345';
      const result = parseCsv(csv);
      expect(result.success).toBe(false);
      const phoneError = result.errors.find((e) => e.field === 'Telefone Completo');
      expect(phoneError).toBeDefined();
      expect(phoneError!.message).toContain('Invalid phone format');
    });

    it('should detect missing name', () => {
      const csv = 'Nome,Telefone Completo\n,+5511999999999';
      const result = parseCsv(csv);
      expect(result.success).toBe(false);
      const nameError = result.errors.find((e) => e.field === 'Nome');
      expect(nameError).toBeDefined();
    });

    it('should detect duplicate phones', () => {
      const csv = 'Nome,Telefone Completo\nJohn,+5511999999999\nJane,+5511999999999';
      const result = parseCsv(csv);
      expect(result.success).toBe(false);
      const dupError = result.errors.find((e) => e.message.includes('Duplicate'));
      expect(dupError).toBeDefined();
    });

    it('should reject file with no data rows', () => {
      const csv = 'Nome,Telefone Completo\n';
      const result = parseCsv(csv);
      expect(result.success).toBe(false);
    });

    it('should reject empty file', () => {
      const csv = '';
      const result = parseCsv(csv);
      expect(result.success).toBe(false);
    });

    it('should reject CSV with fewer than 2 columns in header', () => {
      const csv = 'Nome';
      const result = parseCsv(csv);
      expect(result.success).toBe(false);
      expect(result.errors[0].field).toBe('header');
    });

    it('should accept valid CSV successfully', () => {
      const csv = 'Nome,Telefone Completo\nMaria Silva,+5511999999999\nJohn Doe,+12125551234';
      const result = parseCsv(csv);
      expect(result.success).toBe(true);
      expect(result.members).toHaveLength(2);
      expect(result.members[0].full_name).toBe('Maria Silva');
      expect(result.members[0].phone).toBe('+5511999999999');
    });

    it('should handle CSV with BOM', () => {
      const csv = '\uFEFFNome,Telefone Completo\nMaria,+5511999999999';
      const result = parseCsv(csv);
      expect(result.success).toBe(true);
      expect(result.members).toHaveLength(1);
    });

    it('should handle quoted fields', () => {
      const csv = 'Nome,Telefone Completo\n"Last, First",+5511999999999';
      const result = parseCsv(csv);
      expect(result.success).toBe(true);
      expect(result.members[0].full_name).toBe('Last, First');
    });

    it('should skip empty lines', () => {
      const csv = 'Nome,Telefone Completo\n\nMaria,+5511999999999\n\n';
      const result = parseCsv(csv);
      expect(result.success).toBe(true);
      expect(result.members).toHaveLength(1);
    });

    it('should accept members with no phone', () => {
      const csv = 'Nome,Telefone Completo\nMaria,';
      const result = parseCsv(csv);
      expect(result.success).toBe(true);
      expect(result.members[0].phone).toBe('');
    });
  });

  describe('splitPhoneNumber', () => {
    it('should split Brazilian phone correctly', () => {
      const { countryCode, phone } = splitPhoneNumber('+5511999999999');
      expect(countryCode).toBe('+55');
      expect(phone).toBe('11999999999');
    });

    it('should split US phone correctly', () => {
      const { countryCode, phone } = splitPhoneNumber('+12125551234');
      expect(countryCode).toBe('+1');
      expect(phone).toBe('2125551234');
    });

    it('should split 3-digit country code correctly (Bolivia)', () => {
      const { countryCode, phone } = splitPhoneNumber('+59112345678');
      expect(countryCode).toBe('+591');
      expect(phone).toBe('12345678');
    });

    it('should default to +55 for phone without +', () => {
      const { countryCode, phone } = splitPhoneNumber('11999999999');
      expect(countryCode).toBe('+55');
      expect(phone).toBe('11999999999');
    });

    it('should default to +55 for empty phone', () => {
      const { countryCode, phone } = splitPhoneNumber('');
      expect(countryCode).toBe('+55');
      expect(phone).toBe('');
    });
  });

  describe('Import mutation error formatting in members.tsx', () => {
    it('should format errors using importErrorLine with line, field, error params', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      // Should build errorMessages by mapping over result.errors
      expect(source).toContain("t('members.importErrorLine'");
      expect(source).toContain('line: e.line');
      expect(source).toContain('field: e.field');
      expect(source).toContain('error: e.message');
    });

    it('should throw importEmpty message when CSV has 0 members', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      expect(source).toContain("t('members.importEmpty')");
    });

    it('import onError should show err.message (which contains formatted i18n)', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      // onError handler
      expect(source).toContain('err.message');
    });
  });
});

// =====================================================================
// Round-trip test: export then re-import
// =====================================================================
describe('CSV round-trip: export then import', () => {
  it('should round-trip members through generateCsv -> parseCsv', () => {
    const original = [
      { full_name: 'Maria Silva', country_code: '+55', phone: '11999999999' },
      { full_name: 'John Doe', country_code: '+1', phone: '2125551234' },
      { full_name: 'Ana Santos', country_code: '+55', phone: null },
    ];

    const csv = generateCsv(original);
    const parsed = parseCsv(csv);

    expect(parsed.success).toBe(true);
    // Members with phones should match
    expect(parsed.members[0].full_name).toBe('Maria Silva');
    expect(parsed.members[0].phone).toBe('+5511999999999');
    expect(parsed.members[1].full_name).toBe('John Doe');
    expect(parsed.members[1].phone).toBe('+12125551234');
    // Member without phone
    expect(parsed.members[2].full_name).toBe('Ana Santos');
    expect(parsed.members[2].phone).toBe('');
  });

  it('should round-trip names with special characters', () => {
    const original = [
      { full_name: 'Jose, Maria e Filhos', country_code: '+55', phone: '11999999999' },
    ];

    const csv = generateCsv(original);
    const parsed = parseCsv(csv);

    expect(parsed.success).toBe(true);
    expect(parsed.members[0].full_name).toBe('Jose, Maria e Filhos');
  });
});
