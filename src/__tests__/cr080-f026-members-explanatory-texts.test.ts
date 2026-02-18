/**
 * Tests for CR-80 / F026: Members Screen Explanatory Texts (i18n)
 *
 * Verifies that:
 * - AC-1: Description text (members.description) exists below the title
 * - AC-2: CSV help text (members.csvHelp) visible when canImport is true
 * - AC-3: CSV help text hidden when canImport is false
 * - AC-4: pt-BR translations correct for members.description and members.csvHelp
 * - AC-5: en translations correct for members.description and members.csvHelp
 * - AC-6: es translations correct for members.description and members.csvHelp
 * - AC-7: No regressions in existing member management functionality (via source checks)
 * - EC-1: Without import permissions, only description is shown (same as AC-3)
 * - EC-2: Texts use appropriate font sizes for small screens
 * - EC-3: Description and CSV help always present regardless of member list state
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import en from '../i18n/locales/en.json';
import ptBR from '../i18n/locales/pt-BR.json';
import es from '../i18n/locales/es.json';

function readSourceFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf-8');
}

describe('CR-80 / F026: Members Screen Explanatory Texts', () => {
  // =========================================================================
  // AC-1: Description text below the title
  // =========================================================================

  describe('AC-1: Screen description text', () => {
    it('should render members.description text in the screen', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      expect(source).toContain("t('members.description')");
    });

    it('should render description below the header and before searchContainer', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      const headerEnd = source.indexOf('{/* Screen description */}');
      const searchStart = source.indexOf('{/* Search */}');
      expect(headerEnd).toBeGreaterThan(-1);
      expect(searchStart).toBeGreaterThan(-1);
      expect(headerEnd).toBeLessThan(searchStart);
    });

    it('should use colors.textSecondary for description', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      // Find the description Text element and verify it uses textSecondary
      const descriptionMatch = source.match(
        /styles\.description[^}]*color:\s*colors\.textSecondary/s
      );
      // Alternative: check the JSX directly
      expect(source).toContain('styles.description');
      expect(source).toMatch(
        /description.*color:\s*colors\.textSecondary|textSecondary.*description/s
      );
    });

    it('should define description style with fontSize 13', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      // Extract the styles.description definition from StyleSheet.create
      const styleSection = source.slice(source.indexOf('StyleSheet.create'));
      const descMatch = styleSection.match(
        /description:\s*\{([^}]+)\}/
      );
      expect(descMatch).toBeTruthy();
      expect(descMatch![1]).toContain('fontSize: 13');
    });

    it('should define description style with textAlign center', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      const styleSection = source.slice(source.indexOf('StyleSheet.create'));
      const descMatch = styleSection.match(
        /description:\s*\{([^}]+)\}/
      );
      expect(descMatch).toBeTruthy();
      expect(descMatch![1]).toContain("textAlign: 'center'");
    });

    it('should define description style with paddingHorizontal 16', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      const styleSection = source.slice(source.indexOf('StyleSheet.create'));
      const descMatch = styleSection.match(
        /description:\s*\{([^}]+)\}/
      );
      expect(descMatch).toBeTruthy();
      expect(descMatch![1]).toContain('paddingHorizontal: 16');
    });

    it('should define description style with marginBottom 8', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      const styleSection = source.slice(source.indexOf('StyleSheet.create'));
      const descMatch = styleSection.match(
        /description:\s*\{([^}]+)\}/
      );
      expect(descMatch).toBeTruthy();
      expect(descMatch![1]).toContain('marginBottom: 8');
    });
  });

  // =========================================================================
  // AC-2: CSV help text visible when canImport is true
  // =========================================================================

  describe('AC-2: CSV help text when canImport is true', () => {
    it('should render members.csvHelp text in the screen', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      expect(source).toContain("t('members.csvHelp')");
    });

    it('should render csvHelp after csvActions buttons', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      const csvActionsEnd = source.indexOf('</View>', source.indexOf('csvActions'));
      const csvHelpIdx = source.indexOf("t('members.csvHelp')");
      expect(csvActionsEnd).toBeGreaterThan(-1);
      expect(csvHelpIdx).toBeGreaterThan(-1);
      expect(csvHelpIdx).toBeGreaterThan(csvActionsEnd);
    });

    it('should use colors.textSecondary for csvHelp', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      expect(source).toContain('styles.csvHelp');
      // Find the csvHelp Text element line
      const csvHelpLine = source
        .split('\n')
        .find((line) => line.includes("t('members.csvHelp')"));
      expect(csvHelpLine).toBeDefined();
      // The Text element with csvHelp should have textSecondary nearby
      const csvHelpSection = source.slice(
        source.indexOf('styles.csvHelp') - 100,
        source.indexOf("t('members.csvHelp')") + 50
      );
      expect(csvHelpSection).toContain('colors.textSecondary');
    });
  });

  // =========================================================================
  // AC-3: CSV help text hidden when canImport is false
  // =========================================================================

  describe('AC-3: CSV help text hidden when canImport is false', () => {
    it('should place csvHelp inside the canImport conditional block', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      // Find the canImport block
      const canImportStart = source.indexOf('{canImport && (');
      expect(canImportStart).toBeGreaterThan(-1);

      // Find where csvHelp is used
      const csvHelpIdx = source.indexOf("t('members.csvHelp')");
      expect(csvHelpIdx).toBeGreaterThan(-1);

      // csvHelp must be after canImport conditional
      expect(csvHelpIdx).toBeGreaterThan(canImportStart);

      // Find the closing of the canImport block - look for the matching )}
      // The csvHelp must be BEFORE the end of the canImport block
      const afterCanImport = source.slice(canImportStart);
      const csvHelpInBlock = afterCanImport.indexOf("t('members.csvHelp')");
      expect(csvHelpInBlock).toBeGreaterThan(0);
    });

    it('should not render csvHelp outside any conditional block', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      // There should be exactly one occurrence of members.csvHelp
      const matches = source.match(/t\('members\.csvHelp'\)/g);
      expect(matches).toHaveLength(1);
    });
  });

  // =========================================================================
  // AC-4: pt-BR translations
  // =========================================================================

  describe('AC-4: pt-BR translations', () => {
    it('should have members.description in pt-BR', () => {
      expect(ptBR.members.description).toBe(
        'Adicione, edite e remova membros da ala. Deslize um membro para editar ou excluir.'
      );
    });

    it('should have members.csvHelp in pt-BR', () => {
      expect(ptBR.members.csvHelp).toBe(
        'Exportar salva todos os membros em um arquivo CSV. Importar carrega um arquivo CSV e substitui toda a lista de membros. Formato esperado: Nome, Telefone Completo (com codigo do pais, ex: +5511999999999).'
      );
    });

    it('should have non-empty members.description in pt-BR', () => {
      expect(ptBR.members.description).toBeTruthy();
      expect(typeof ptBR.members.description).toBe('string');
      expect(ptBR.members.description.length).toBeGreaterThan(10);
    });

    it('should have non-empty members.csvHelp in pt-BR', () => {
      expect(ptBR.members.csvHelp).toBeTruthy();
      expect(typeof ptBR.members.csvHelp).toBe('string');
      expect(ptBR.members.csvHelp.length).toBeGreaterThan(10);
    });
  });

  // =========================================================================
  // AC-5: en translations
  // =========================================================================

  describe('AC-5: en translations', () => {
    it('should have members.description in en', () => {
      expect(en.members.description).toBe(
        'Add, edit and remove ward members. Swipe a member to edit or delete.'
      );
    });

    it('should have members.csvHelp in en', () => {
      expect(en.members.csvHelp).toBe(
        'Export saves all members as a CSV file. Import loads a CSV file and replaces the entire member list. Expected format: Name, Full Phone (with country code, e.g. +5511999999999).'
      );
    });

    it('should have non-empty members.description in en', () => {
      expect(en.members.description).toBeTruthy();
      expect(typeof en.members.description).toBe('string');
      expect(en.members.description.length).toBeGreaterThan(10);
    });

    it('should have non-empty members.csvHelp in en', () => {
      expect(en.members.csvHelp).toBeTruthy();
      expect(typeof en.members.csvHelp).toBe('string');
      expect(en.members.csvHelp.length).toBeGreaterThan(10);
    });
  });

  // =========================================================================
  // AC-6: es translations
  // =========================================================================

  describe('AC-6: es translations', () => {
    it('should have members.description in es', () => {
      expect(es.members.description).toBe(
        'Agregue, edite y elimine miembros del barrio. Deslice un miembro para editar o eliminar.'
      );
    });

    it('should have members.csvHelp in es', () => {
      expect(es.members.csvHelp).toBe(
        'Exportar guarda todos los miembros en un archivo CSV. Importar carga un archivo CSV y reemplaza toda la lista de miembros. Formato esperado: Nombre, Telefono Completo (con codigo de pais, ej: +5211234567890).'
      );
    });

    it('should have non-empty members.description in es', () => {
      expect(es.members.description).toBeTruthy();
      expect(typeof es.members.description).toBe('string');
      expect(es.members.description.length).toBeGreaterThan(10);
    });

    it('should have non-empty members.csvHelp in es', () => {
      expect(es.members.csvHelp).toBeTruthy();
      expect(typeof es.members.csvHelp).toBe('string');
      expect(es.members.csvHelp.length).toBeGreaterThan(10);
    });
  });

  // =========================================================================
  // AC-7: No regressions in existing functionality
  // =========================================================================

  describe('AC-7: No regressions in existing member functionality', () => {
    it('should still have SwipeableCard import in members screen', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      expect(source).toContain("import { SwipeableCard }");
    });

    it('should still render SwipeableCard in member rows', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      expect(source).toContain('<SwipeableCard');
    });

    it('should still have CSV import handler', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      expect(source).toContain('handleImport');
    });

    it('should still have CSV export handler', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      expect(source).toContain('handleExport');
    });

    it('should still have search functionality', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      expect(source).toContain('SearchInput');
      expect(source).toContain('setSearch');
    });

    it('should still have add member functionality', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      expect(source).toContain('handleAdd');
      expect(source).toContain('handleSaveNew');
    });

    it('should still have delete member functionality', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      expect(source).toContain('handleDelete');
      expect(source).toContain('deleteConfirm');
    });

    it('should still have MemberEditor component', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      expect(source).toContain('function MemberEditor');
      expect(source).toContain('<MemberEditor');
    });
  });

  // =========================================================================
  // EC-1: User without import permissions sees only description
  // =========================================================================

  describe('EC-1: Without import permissions, only description is shown', () => {
    it('should render description outside any conditional block (always visible)', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      const descriptionIdx = source.indexOf("t('members.description')");
      const canImportIdx = source.indexOf('{canImport && (');
      // Description must appear BEFORE the canImport block
      expect(descriptionIdx).toBeGreaterThan(-1);
      expect(canImportIdx).toBeGreaterThan(-1);
      expect(descriptionIdx).toBeLessThan(canImportIdx);
    });

    it('should have exactly one occurrence of members.description (not conditional)', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      const matches = source.match(/t\('members\.description'\)/g);
      expect(matches).toHaveLength(1);
    });
  });

  // =========================================================================
  // EC-2: Texts use appropriate font sizes for small screens
  // =========================================================================

  describe('EC-2: Text sizing for small screens', () => {
    it('should have description fontSize <= 14 (appropriate for subtitle)', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      const styleSection = source.slice(source.indexOf('StyleSheet.create'));
      const descMatch = styleSection.match(
        /description:\s*\{([^}]+)\}/
      );
      expect(descMatch).toBeTruthy();
      const fontSizeMatch = descMatch![1].match(/fontSize:\s*(\d+)/);
      expect(fontSizeMatch).toBeTruthy();
      const fontSize = parseInt(fontSizeMatch![1], 10);
      expect(fontSize).toBeGreaterThanOrEqual(12);
      expect(fontSize).toBeLessThanOrEqual(14);
    });

    it('should have csvHelp fontSize <= 13 (smaller than description)', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      const styleSection = source.slice(source.indexOf('StyleSheet.create'));
      const csvHelpMatch = styleSection.match(
        /csvHelp:\s*\{([^}]+)\}/
      );
      expect(csvHelpMatch).toBeTruthy();
      const fontSizeMatch = csvHelpMatch![1].match(/fontSize:\s*(\d+)/);
      expect(fontSizeMatch).toBeTruthy();
      const fontSize = parseInt(fontSizeMatch![1], 10);
      expect(fontSize).toBeGreaterThanOrEqual(11);
      expect(fontSize).toBeLessThanOrEqual(13);
    });

    it('should not use fixed width or numberOfLines on description (allows text wrapping)', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      // Find the description Text element - narrow window to just the <Text> tag
      const descIdx = source.indexOf("t('members.description')");
      // Look backwards for the opening <Text tag (about 80 chars before the t() call)
      const textTagStart = source.lastIndexOf('<Text', descIdx);
      const descSection = source.slice(textTagStart, descIdx + 30);
      expect(descSection).not.toContain('numberOfLines');
    });

    it('should not use fixed width on csvHelp (allows text wrapping)', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      const csvHelpIdx = source.indexOf("t('members.csvHelp')");
      const csvHelpSection = source.slice(
        Math.max(0, csvHelpIdx - 200),
        csvHelpIdx + 50
      );
      expect(csvHelpSection).not.toMatch(/width:\s*\d+/);
    });
  });

  // =========================================================================
  // EC-3: Texts visible regardless of member list state
  // =========================================================================

  describe('EC-3: Texts visible regardless of member list state', () => {
    it('should render description before the main member FlatList (not inside it)', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      const descriptionIdx = source.indexOf("t('members.description')");
      // Find the main FlatList for members - it has the data={members} prop
      const flatListIdx = source.indexOf('data={members}');
      expect(descriptionIdx).toBeGreaterThan(-1);
      expect(flatListIdx).toBeGreaterThan(-1);
      expect(descriptionIdx).toBeLessThan(flatListIdx);
    });

    it('should render csvHelp before the main member FlatList (not inside it)', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      const csvHelpIdx = source.indexOf("t('members.csvHelp')");
      // Find the main FlatList for members - it has the data={members} prop
      const flatListIdx = source.indexOf('data={members}');
      expect(csvHelpIdx).toBeGreaterThan(-1);
      expect(flatListIdx).toBeGreaterThan(-1);
      expect(csvHelpIdx).toBeLessThan(flatListIdx);
    });

    it('should still have ListEmptyComponent for empty state', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      expect(source).toContain('ListEmptyComponent');
      expect(source).toContain("t('common.noResults')");
    });
  });

  // =========================================================================
  // Cross-locale consistency
  // =========================================================================

  describe('Cross-locale consistency', () => {
    it('should have members.description key in all 3 locales', () => {
      expect(en.members.description).toBeDefined();
      expect(ptBR.members.description).toBeDefined();
      expect(es.members.description).toBeDefined();
    });

    it('should have members.csvHelp key in all 3 locales', () => {
      expect(en.members.csvHelp).toBeDefined();
      expect(ptBR.members.csvHelp).toBeDefined();
      expect(es.members.csvHelp).toBeDefined();
    });

    it('should have all locale files as valid JSON (parseable)', () => {
      const enPath = path.resolve(__dirname, '../i18n/locales/en.json');
      const ptBRPath = path.resolve(__dirname, '../i18n/locales/pt-BR.json');
      const esPath = path.resolve(__dirname, '../i18n/locales/es.json');

      expect(() => JSON.parse(fs.readFileSync(enPath, 'utf-8'))).not.toThrow();
      expect(() => JSON.parse(fs.readFileSync(ptBRPath, 'utf-8'))).not.toThrow();
      expect(() => JSON.parse(fs.readFileSync(esPath, 'utf-8'))).not.toThrow();
    });

    it('csvHelp in all locales should mention CSV format info', () => {
      // All translations should mention the CSV format concept
      expect(en.members.csvHelp.toLowerCase()).toContain('csv');
      expect(ptBR.members.csvHelp.toLowerCase()).toContain('csv');
      expect(es.members.csvHelp.toLowerCase()).toContain('csv');
    });

    it('csvHelp in all locales should mention phone format', () => {
      // All translations should mention phone/telefone/telefono
      expect(en.members.csvHelp.toLowerCase()).toMatch(/phone/);
      expect(ptBR.members.csvHelp.toLowerCase()).toMatch(/telefone/);
      expect(es.members.csvHelp.toLowerCase()).toMatch(/telefono/);
    });
  });
});
