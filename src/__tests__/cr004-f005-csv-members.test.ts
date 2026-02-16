/**
 * QA Tests for CR-004 / F005: CSV & Members Screen Fixes
 *
 * Covers:
 * CR-54: CSV export cancel detection, import i18n error messages
 * CR-55: Header spacer when canWrite=false
 * CR-66: Allow empty CSV export, informative import errors
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { generateCsv, parseCsv } from '../lib/csvUtils';

function readSourceFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf-8');
}

function readLocale(locale: string): Record<string, unknown> {
  const filePath = path.resolve(__dirname, '..', 'i18n', 'locales', `${locale}.json`);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

describe('CR-004 F005: CSV & Members Screen Fixes', () => {
  // ---------------------------------------------------------------
  // CR-66: generateCsv with empty array
  // ---------------------------------------------------------------
  describe('CR-66: Empty CSV export', () => {
    it('generateCsv([]) should return BOM + header row', () => {
      const csv = generateCsv([]);
      expect(csv).toBe('\uFEFFNome,Telefone Completo');
    });

    it('generateCsv with members should include BOM + header + data', () => {
      const csv = generateCsv([
        { full_name: 'Joao Silva', country_code: '+55', phone: '11999999999' },
      ]);
      expect(csv).toContain('\uFEFF');
      expect(csv).toContain('Nome,Telefone Completo');
      expect(csv).toContain('Joao Silva,+5511999999999');
    });

    it('handleExport should NOT have empty guard', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      // The old guard: if (!members || members.length === 0) return;
      expect(source).not.toContain("if (!members || members.length === 0) return;");
    });

    it('export button should NOT be disabled when members is empty', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      expect(source).not.toContain("disabled={!members || members.length === 0}");
    });

    it('handleExport should use members ?? [] for safety', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      expect(source).toContain("generateCsv(members ?? [])");
    });
  });

  // ---------------------------------------------------------------
  // CR-54: Share sheet cancel detection
  // ---------------------------------------------------------------
  describe('CR-54: Share sheet cancel detection', () => {
    it('handleExport catch should check for User did not share (case-insensitive)', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      expect(source).toContain("'user did not share'");
      expect(source).toContain("'cancelled'");
    });

    it('handleExport should show t(members.exportFailed) for real errors', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      expect(source).toContain("t('members.exportFailed')");
    });
  });

  // ---------------------------------------------------------------
  // CR-54: Import error i18n
  // ---------------------------------------------------------------
  describe('CR-54: Import error messages use i18n', () => {
    it('importMutation should use t(members.importErrorLine) for validation errors', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      expect(source).toContain("t('members.importErrorLine'");
    });

    it('importMutation should pass line, field, error params to i18n', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      expect(source).toContain('line: e.line');
      expect(source).toContain('field: e.field');
      expect(source).toContain('error: e.message');
    });

    it('should NOT have hardcoded Line in import error formatting', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      // Old pattern: `Line ${e.line}, ${e.field}: ${e.message}`
      expect(source).not.toContain('`Line ${e.line}');
    });

    it('handleImport catch should use t(members.importFailed)', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      const handleImportStart = source.indexOf('const handleImport = useCallback');
      const handleImportBlock = source.slice(handleImportStart, source.indexOf('const canImport'));
      expect(handleImportBlock).toContain("t('members.importFailed')");
    });
  });

  // ---------------------------------------------------------------
  // CR-66: Empty CSV import detection
  // ---------------------------------------------------------------
  describe('CR-66: Empty CSV import detection', () => {
    it('importMutation should check for result.members.length === 0', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      expect(source).toContain("result.members.length === 0");
    });

    it('importMutation should use t(members.importEmpty) for empty CSV', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      expect(source).toContain("t('members.importEmpty')");
    });

    it('parseCsv with headers-only returns empty members', () => {
      const result = parseCsv('Nome,Telefone Completo\n');
      // parseCsv treats this as no valid data rows
      expect(result.members).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------
  // CR-55: Header spacer
  // ---------------------------------------------------------------
  describe('CR-55: Header spacer when canWrite=false', () => {
    it('should render spacer with width 36 when canWrite is false', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      expect(source).toContain('width: 36');
    });

    it('should use ternary (canWrite ?) instead of canWrite &&', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      // Should use canWrite ? ... : spacer pattern
      expect(source).toContain('{canWrite ? (');
    });

    it('spacer View should be rendered in else branch', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      expect(source).toContain('<View style={{ width: 36 }} />');
    });
  });

  // ---------------------------------------------------------------
  // i18n keys exist in all locales
  // ---------------------------------------------------------------
  describe('i18n keys for CSV errors', () => {
    (['pt-BR', 'en', 'es'] as const).forEach((locale) => {
      it(`${locale}: members.importEmpty key should exist`, () => {
        const data = readLocale(locale);
        const members = data.members as Record<string, string>;
        expect(members.importEmpty).toBeDefined();
        expect(members.importEmpty.length).toBeGreaterThan(10);
      });

      it(`${locale}: members.importErrorLine key should exist with interpolation`, () => {
        const data = readLocale(locale);
        const members = data.members as Record<string, string>;
        expect(members.importErrorLine).toBeDefined();
        expect(members.importErrorLine).toContain('{{line}}');
        expect(members.importErrorLine).toContain('{{field}}');
        expect(members.importErrorLine).toContain('{{error}}');
      });
    });
  });
});
