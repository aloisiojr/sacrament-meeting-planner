/**
 * Tests for Batch 6, Phase 1: Features F027-F031
 *
 * F027 (CR-83): Explicit Save/Cancel for Members and Topics
 * F028 (CR-84): Search Clear Button (X) for All Search Fields
 * F029 (CR-85): Complete International Country Codes List
 * F030 (CR-86): CSV Import Confirmation Dialog
 * F031 (CR-90): Fix Delete Button for Members and Topics
 *
 * Covers all acceptance criteria:
 *   AC-F027-01..08, AC-F028-01..06, AC-F029-01..05, AC-F030-01..05, AC-F031-01..04
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import en from '../i18n/locales/en.json';
import ptBR from '../i18n/locales/pt-BR.json';
import es from '../i18n/locales/es.json';
import { COUNTRY_CODES, getFlagForCode, splitPhoneNumber } from '../lib/countryCodes';

function readSourceFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf-8');
}

// =============================================================================
// F031 (CR-90): Fix Delete Button for Members and Topics
// =============================================================================

describe('F031 (CR-90): Fix Delete Button for Members and Topics', () => {

  describe('AC-F031-01: Delete button responds to touch', () => {
    it('should have onDelete Pressable in SwipeableCard action buttons', () => {
      const source = readSourceFile('components/SwipeableCard.tsx');
      expect(source).toContain('onPress={handleDelete}');
    });

    it('should have handleDelete function that calls onDelete', () => {
      const source = readSourceFile('components/SwipeableCard.tsx');
      expect(source).toContain('const handleDelete');
      expect(source).toContain('onDelete?.()');
    });
  });

  describe('AC-F031-02: Delete works for both members and topics', () => {
    it('should pass onDelete to SwipeableCard in MemberRow', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      expect(source).toMatch(/SwipeableCard[\s\S]*?onDelete/);
    });

    it('should pass onDelete to SwipeableCard in TopicRow', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      expect(source).toMatch(/SwipeableCard[\s\S]*?onDelete/);
    });
  });

  describe('AC-F031-03: pointerEvents box-none allows touch passthrough', () => {
    it('should have pointerEvents box-none on Animated.View card content', () => {
      const source = readSourceFile('components/SwipeableCard.tsx');
      expect(source).toContain("pointerEvents=\"box-none\"");
    });

    it('should have inner View with backgroundColor inside Animated.View', () => {
      const source = readSourceFile('components/SwipeableCard.tsx');
      // Verify that backgroundColor is on an inner View, not on the Animated.View directly
      expect(source).toMatch(/<View style=\{\{ backgroundColor: colors\.card \}\}/);
    });

    it('should NOT have backgroundColor in cardContent style', () => {
      const source = readSourceFile('components/SwipeableCard.tsx');
      // cardContent style should only have zIndex, no backgroundColor
      const cardContentMatch = source.match(/cardContent:\s*\{([^}]+)\}/);
      expect(cardContentMatch).not.toBeNull();
      expect(cardContentMatch![1]).not.toContain('backgroundColor');
    });

    it('should have handleDelete that closes card and calls onDelete', () => {
      const source = readSourceFile('components/SwipeableCard.tsx');
      // handleDelete should animate translateX to 0 and call onReveal(null)
      const handleDeleteMatch = source.match(/const handleDelete = useCallback\(\(\) => \{[\s\S]*?\}, \[/);
      expect(handleDeleteMatch).not.toBeNull();
      const handleDeleteBody = handleDeleteMatch![0];
      expect(handleDeleteBody).toContain('withSpring(0');
      expect(handleDeleteBody).toContain('onReveal(null)');
      expect(handleDeleteBody).toContain('onDelete?.()');
    });
  });

  describe('AC-F031-04: Edit button still works after fix (no regression)', () => {
    it('should still have handleEdit function in SwipeableCard', () => {
      const source = readSourceFile('components/SwipeableCard.tsx');
      expect(source).toContain('const handleEdit');
      expect(source).toContain('onEdit?.()');
    });

    it('should still have onPress={handleEdit} on Edit Pressable', () => {
      const source = readSourceFile('components/SwipeableCard.tsx');
      expect(source).toContain('onPress={handleEdit}');
    });

    it('should have handleEdit with same structure as handleDelete', () => {
      const source = readSourceFile('components/SwipeableCard.tsx');
      const handleEditMatch = source.match(/const handleEdit = useCallback\(\(\) => \{[\s\S]*?\}, \[/);
      expect(handleEditMatch).not.toBeNull();
      const handleEditBody = handleEditMatch![0];
      expect(handleEditBody).toContain('withSpring(0');
      expect(handleEditBody).toContain('onReveal(null)');
      expect(handleEditBody).toContain('onEdit?.()');
    });
  });
});

// =============================================================================
// F027 (CR-83): Explicit Save/Cancel for Members and Topics
// =============================================================================

describe('F027 (CR-83): Explicit Save/Cancel for Members and Topics', () => {

  // --- MemberEditor tests ---

  describe('AC-F027-01: MemberEditor blur does NOT auto-save', () => {
    it('should NOT have onBlur={handleSave} on any TextInput in MemberEditor', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      // Extract MemberEditor function body
      const editorStart = source.indexOf('function MemberEditor(');
      const editorEnd = source.indexOf('// --- Member Row ---');
      expect(editorStart).toBeGreaterThan(-1);
      expect(editorEnd).toBeGreaterThan(editorStart);
      const editorSource = source.substring(editorStart, editorEnd);
      expect(editorSource).not.toContain('onBlur={handleSave}');
      expect(editorSource).not.toContain('onBlur');
    });
  });

  describe('AC-F027-02: Save button calls onSave with correct data', () => {
    it('should have Save button that calls handleSave', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      const editorStart = source.indexOf('function MemberEditor(');
      const editorEnd = source.indexOf('// --- Member Row ---');
      const editorSource = source.substring(editorStart, editorEnd);
      expect(editorSource).toContain('onPress={handleSave}');
    });

    it('should have handleSave that validates full_name is not empty and calls onSave', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      const editorStart = source.indexOf('function MemberEditor(');
      const editorEnd = source.indexOf('// --- Member Row ---');
      const editorSource = source.substring(editorStart, editorEnd);
      expect(editorSource).toContain('const handleSave');
      expect(editorSource).toContain("if (!trimmed) return");
      expect(editorSource).toContain('onSave({ full_name: trimmed');
    });
  });

  describe('AC-F027-03: Cancel button calls onCancel without saving', () => {
    it('should have Cancel button that calls onCancel', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      const editorStart = source.indexOf('function MemberEditor(');
      const editorEnd = source.indexOf('// --- Member Row ---');
      const editorSource = source.substring(editorStart, editorEnd);
      expect(editorSource).toContain('onPress={onCancel}');
    });

    it('should have onCancel as required prop in MemberEditorProps', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      // onCancel should be required (no ? before :)
      expect(source).toMatch(/onCancel:\s*\(\)\s*=>\s*void/);
    });
  });

  describe('AC-F027-04: Save with empty name does not call onSave', () => {
    it('should have validation that trims name and returns early if empty', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      const editorStart = source.indexOf('function MemberEditor(');
      const editorEnd = source.indexOf('// --- Member Row ---');
      const editorSource = source.substring(editorStart, editorEnd);
      expect(editorSource).toContain('const trimmed = fullName.trim()');
      expect(editorSource).toContain('if (!trimmed) return');
    });
  });

  // --- TopicEditor tests ---

  describe('AC-F027-05: TopicEditor blur does NOT auto-save', () => {
    it('should NOT have onBlur={handleSave} on any TextInput in TopicEditor', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      const editorStart = source.indexOf('function TopicEditor(');
      const editorEnd = source.indexOf('// --- Topic Row ---');
      expect(editorStart).toBeGreaterThan(-1);
      expect(editorEnd).toBeGreaterThan(editorStart);
      const editorSource = source.substring(editorStart, editorEnd);
      expect(editorSource).not.toContain('onBlur={handleSave}');
      expect(editorSource).not.toContain('onBlur');
    });
  });

  describe('AC-F027-06: TopicEditor Save button calls onSave', () => {
    it('should have Save button that calls handleSave in TopicEditor', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      const editorStart = source.indexOf('function TopicEditor(');
      const editorEnd = source.indexOf('// --- Topic Row ---');
      const editorSource = source.substring(editorStart, editorEnd);
      expect(editorSource).toContain('onPress={handleSave}');
    });

    it('should validate title is not empty before calling onSave', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      const editorStart = source.indexOf('function TopicEditor(');
      const editorEnd = source.indexOf('// --- Topic Row ---');
      const editorSource = source.substring(editorStart, editorEnd);
      expect(editorSource).toContain('if (!trimmedTitle) return');
      expect(editorSource).toContain('onSave({ title: trimmedTitle');
    });
  });

  describe('AC-F027-07: TopicEditor Cancel button calls onCancel', () => {
    it('should have Cancel button that calls onCancel in TopicEditor', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      const editorStart = source.indexOf('function TopicEditor(');
      const editorEnd = source.indexOf('// --- Topic Row ---');
      const editorSource = source.substring(editorStart, editorEnd);
      expect(editorSource).toContain('onPress={onCancel}');
    });

    it('should have onCancel as required prop in TopicEditorProps', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      expect(source).toMatch(/interface TopicEditorProps[\s\S]*?onCancel:\s*\(\)\s*=>\s*void/);
    });
  });

  describe('AC-F027-08: Save/Cancel buttons visible with correct i18n and styling', () => {
    it('MemberEditor should render Save button with t(common.save)', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      const editorStart = source.indexOf('function MemberEditor(');
      const editorEnd = source.indexOf('// --- Member Row ---');
      const editorSource = source.substring(editorStart, editorEnd);
      expect(editorSource).toContain("t('common.save')");
    });

    it('MemberEditor should render Cancel button with t(common.cancel)', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      const editorStart = source.indexOf('function MemberEditor(');
      const editorEnd = source.indexOf('// --- Member Row ---');
      const editorSource = source.substring(editorStart, editorEnd);
      expect(editorSource).toContain("t('common.cancel')");
    });

    it('TopicEditor should render Save button with t(common.save)', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      const editorStart = source.indexOf('function TopicEditor(');
      const editorEnd = source.indexOf('// --- Topic Row ---');
      const editorSource = source.substring(editorStart, editorEnd);
      expect(editorSource).toContain("t('common.save')");
    });

    it('TopicEditor should render Cancel button with t(common.cancel)', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      const editorStart = source.indexOf('function TopicEditor(');
      const editorEnd = source.indexOf('// --- Topic Row ---');
      const editorSource = source.substring(editorStart, editorEnd);
      expect(editorSource).toContain("t('common.cancel')");
    });

    it('Save button should use primary color background in MemberEditor', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      const editorStart = source.indexOf('function MemberEditor(');
      const editorEnd = source.indexOf('// --- Member Row ---');
      const editorSource = source.substring(editorStart, editorEnd);
      expect(editorSource).toContain('backgroundColor: colors.primary');
      expect(editorSource).toContain('color: colors.onPrimary');
    });

    it('Cancel button should use textSecondary color in MemberEditor', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      const editorStart = source.indexOf('function MemberEditor(');
      const editorEnd = source.indexOf('// --- Member Row ---');
      const editorSource = source.substring(editorStart, editorEnd);
      expect(editorSource).toContain('color: colors.textSecondary');
    });

    it('should have editorButtons style with flexDirection row, justifyContent flex-end, gap 8', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      const stylesMatch = source.match(/editorButtons:\s*\{([^}]+)\}/);
      expect(stylesMatch).not.toBeNull();
      const stylesBody = stylesMatch![1];
      expect(stylesBody).toContain("flexDirection: 'row'");
      expect(stylesBody).toContain("justifyContent: 'flex-end'");
      expect(stylesBody).toContain('gap: 8');
      expect(stylesBody).toContain('marginTop: 8');
    });

    it('should have editorButtons style in topics.tsx matching members.tsx', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      const stylesMatch = source.match(/editorButtons:\s*\{([^}]+)\}/);
      expect(stylesMatch).not.toBeNull();
      const stylesBody = stylesMatch![1];
      expect(stylesBody).toContain("flexDirection: 'row'");
      expect(stylesBody).toContain("justifyContent: 'flex-end'");
      expect(stylesBody).toContain('gap: 8');
      expect(stylesBody).toContain('marginTop: 8');
    });

    it('MemberRow should pass onCancel to MemberEditor in edit mode', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      // In MemberRow, when isEditing, MemberEditor gets onCancel
      const memberRowStart = source.indexOf('function MemberRow(');
      const memberRowEnd = source.indexOf('// --- CSV Error Translation Helper ---');
      const memberRowSource = source.substring(memberRowStart, memberRowEnd);
      expect(memberRowSource).toContain('onCancel={onCancel}');
    });

    it('TopicRow should pass onCancel to TopicEditor in edit mode', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      const topicRowStart = source.indexOf('function TopicRow(');
      const topicRowEnd = source.indexOf('// --- Collection Toggle Row ---');
      const topicRowSource = source.substring(topicRowStart, topicRowEnd);
      expect(topicRowSource).toContain('onCancel={onCancel}');
    });

    it('MembersScreen should pass onCancel to renderItem for edit mode', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      expect(source).toContain('onCancel={() => setEditingId(null)}');
    });

    it('MembersScreen should pass onCancel to MemberEditor for adding mode', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      expect(source).toContain('onCancel={() => setIsAdding(false)}');
    });

    it('TopicsScreen should pass onCancel to TopicRow for edit mode', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      expect(source).toContain('onCancel={() => setEditingId(null)}');
    });

    it('TopicsScreen should pass onCancel to TopicEditor for adding mode', () => {
      const source = readSourceFile('app/(tabs)/settings/topics.tsx');
      expect(source).toContain('onCancel={() => setIsAdding(false)}');
    });
  });
});

// =============================================================================
// F029 (CR-85): Complete International Country Codes List
// =============================================================================

describe('F029 (CR-85): Complete International Country Codes List', () => {

  describe('AC-F029-01: List contains >= 100 countries with correct structure', () => {
    it('should have at least 150 country code entries', () => {
      expect(COUNTRY_CODES.length).toBeGreaterThanOrEqual(150);
    });

    it('every entry should have code starting with +', () => {
      for (const entry of COUNTRY_CODES) {
        expect(entry.code).toMatch(/^\+\d+$/);
      }
    });

    it('every entry should have a non-empty flag', () => {
      for (const entry of COUNTRY_CODES) {
        expect(entry.flag.length).toBeGreaterThan(0);
      }
    });

    it('every entry should have a label containing the code', () => {
      for (const entry of COUNTRY_CODES) {
        expect(entry.label).toContain(entry.code);
      }
    });

    it('USA and Canada should be separate entries with code +1', () => {
      const usa = COUNTRY_CODES.find(c => c.label.includes('United States'));
      const canada = COUNTRY_CODES.find(c => c.label.includes('Canada'));
      expect(usa).toBeDefined();
      expect(canada).toBeDefined();
      expect(usa!.code).toBe('+1');
      expect(canada!.code).toBe('+1');
    });
  });

  describe('AC-F029-02: splitPhoneNumber correctly parses country codes', () => {
    it('should parse Australian number +61412345678', () => {
      const result = splitPhoneNumber('+61412345678');
      expect(result.countryCode).toBe('+61');
      expect(result.phone).toBe('412345678');
    });

    it('should parse Brazilian number +5511999999999', () => {
      const result = splitPhoneNumber('+5511999999999');
      expect(result.countryCode).toBe('+55');
      expect(result.phone).toBe('11999999999');
    });

    it('should parse US number +14155551234', () => {
      const result = splitPhoneNumber('+14155551234');
      expect(result.countryCode).toBe('+1');
      expect(result.phone).toBe('4155551234');
    });

    it('should parse UK number +447911123456', () => {
      const result = splitPhoneNumber('+447911123456');
      expect(result.countryCode).toBe('+44');
      expect(result.phone).toBe('7911123456');
    });

    it('should default to +55 for number without + prefix', () => {
      const result = splitPhoneNumber('11999999999');
      expect(result.countryCode).toBe('+55');
      expect(result.phone).toBe('11999999999');
    });

    it('should handle empty string input', () => {
      const result = splitPhoneNumber('');
      expect(result.countryCode).toBe('+55');
      expect(result.phone).toBe('');
    });

    it('should handle 3-digit country code like +355 (Albania)', () => {
      const result = splitPhoneNumber('+35569123456');
      expect(result.countryCode).toBe('+355');
      expect(result.phone).toBe('69123456');
    });
  });

  describe('AC-F029-03: members.tsx and csvUtils.ts share same source', () => {
    it('members.tsx should import COUNTRY_CODES from lib/countryCodes', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      expect(source).toContain("from '../../../lib/countryCodes'");
      expect(source).toContain('COUNTRY_CODES');
    });

    it('members.tsx should import getFlagForCode from lib/countryCodes', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      expect(source).toContain('getFlagForCode');
      expect(source).toContain("from '../../../lib/countryCodes'");
    });

    it('members.tsx should NOT have local COUNTRY_CODES array', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      // Should not define COUNTRY_CODES inline (only import)
      expect(source).not.toMatch(/const COUNTRY_CODES\s*[=:]/);
    });

    it('members.tsx should NOT have local getFlagForCode function', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      expect(source).not.toMatch(/function getFlagForCode/);
    });

    it('csvUtils.ts should re-export splitPhoneNumber from countryCodes', () => {
      const source = readSourceFile('lib/csvUtils.ts');
      expect(source).toContain("export { splitPhoneNumber } from './countryCodes'");
    });

    it('csvUtils.ts should NOT have local splitPhoneNumber implementation', () => {
      const source = readSourceFile('lib/csvUtils.ts');
      expect(source).not.toMatch(/function splitPhoneNumber/);
    });

    it('splitPhoneNumber imported from csvUtils should work correctly', async () => {
      // Verify backward compatibility: csvUtils re-exports splitPhoneNumber
      const csvUtils = await import('../lib/csvUtils');
      const result = csvUtils.splitPhoneNumber('+5511999999999');
      expect(result.countryCode).toBe('+55');
      expect(result.phone).toBe('11999999999');
    });
  });

  describe('AC-F029-04: Brazil first, then alphabetical', () => {
    it('should have Brazil (+55) as the first entry', () => {
      expect(COUNTRY_CODES[0].code).toBe('+55');
      expect(COUNTRY_CODES[0].label).toContain('Brazil');
    });

    it('remaining entries (after Brazil) should be in alphabetical order by country name', () => {
      // Extract country names from labels (everything before the parenthesized code)
      // Skip the USA entry placed before Canada (ADR-043: +1 defaults to US flag)
      const remaining = COUNTRY_CODES.slice(1).filter(c => c.label !== 'United States (+1)');
      const names = remaining.map(c => {
        const match = c.label.match(/^(.+?)\s*\(\+/);
        return match ? match[1].trim() : c.label;
      });
      for (let i = 1; i < names.length; i++) {
        expect(
          names[i].localeCompare(names[i - 1], 'en', { sensitivity: 'base' })
        ).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('AC-F029-05: Flag emojis use Regional Indicator Symbols', () => {
    it('every entry should have a flag with Regional Indicator Symbol pairs', () => {
      for (const entry of COUNTRY_CODES) {
        // Regional Indicator Symbols are in range U+1F1E6 to U+1F1FF
        // Each flag should have exactly 2 such symbols (forming one flag emoji)
        const codePoints = [...entry.flag].map(char => char.codePointAt(0)!);
        expect(codePoints.length).toBe(2);
        for (const cp of codePoints) {
          expect(cp).toBeGreaterThanOrEqual(0x1F1E6);
          expect(cp).toBeLessThanOrEqual(0x1F1FF);
        }
      }
    });

    it('getFlagForCode should return correct flag for known code', () => {
      expect(getFlagForCode('+55')).toBe(COUNTRY_CODES[0].flag);
    });

    it('getFlagForCode should return globe fallback for unknown code', () => {
      expect(getFlagForCode('+999999')).toBe('\u{1F310}');
    });
  });
});

// =============================================================================
// F030 (CR-86): CSV Import Confirmation Dialog
// =============================================================================

describe('F030 (CR-86): CSV Import Confirmation Dialog', () => {

  describe('AC-F030-01: Alert.alert shown before file picker', () => {
    it('handleImport should call Alert.alert with i18n keys', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      // Find the handleImport function
      const handleImportMatch = source.match(/const handleImport = useCallback\(\(\) => \{[\s\S]*?\}, \[/);
      expect(handleImportMatch).not.toBeNull();
      const handleImportBody = handleImportMatch![0];
      expect(handleImportBody).toContain('Alert.alert');
      expect(handleImportBody).toContain("t('members.importConfirmTitle')");
      expect(handleImportBody).toContain("t('members.importConfirmMessage')");
    });

    it('should have separate performImport function with file picker logic', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      expect(source).toContain('const performImport');
      expect(source).toContain('DocumentPicker.getDocumentAsync');
    });
  });

  describe('AC-F030-02: Dialog message contains both key pieces of info', () => {
    it('en.json importConfirmMessage should mention replacing member list', () => {
      const msg = (en as any).members.importConfirmMessage;
      expect(msg).toBeDefined();
      expect(msg).toContain('replace');
      expect(msg).toContain('member list');
    });

    it('en.json importConfirmMessage should mention assignments not affected', () => {
      const msg = (en as any).members.importConfirmMessage;
      expect(msg).toContain('assignments');
      expect(msg).toContain('not be affected');
    });
  });

  describe('AC-F030-03: Confirm button opens file picker', () => {
    it('handleImport Alert should have Confirm button that calls performImport', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      const handleImportMatch = source.match(/const handleImport = useCallback\(\(\) => \{[\s\S]*?\}, \[/);
      expect(handleImportMatch).not.toBeNull();
      const body = handleImportMatch![0];
      // Verify Confirm button calls performImport
      expect(body).toContain("t('common.confirm')");
      expect(body).toContain('performImport()');
    });
  });

  describe('AC-F030-04: Cancel button does not open file picker', () => {
    it('handleImport Alert should have Cancel button with style cancel', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      const handleImportMatch = source.match(/const handleImport = useCallback\(\(\) => \{[\s\S]*?\}, \[/);
      expect(handleImportMatch).not.toBeNull();
      const body = handleImportMatch![0];
      expect(body).toContain("t('common.cancel')");
      expect(body).toContain("style: 'cancel'");
    });

    it('Cancel button should be first in the buttons array (no onPress = dismiss)', () => {
      const source = readSourceFile('app/(tabs)/settings/members.tsx');
      const handleImportMatch = source.match(/const handleImport = useCallback\(\(\) => \{[\s\S]*?\}, \[/);
      const body = handleImportMatch![0];
      // Cancel button should come before Confirm in the array
      const cancelIdx = body.indexOf("t('common.cancel')");
      const confirmIdx = body.indexOf("t('common.confirm')");
      expect(cancelIdx).toBeLessThan(confirmIdx);
    });
  });

  describe('AC-F030-05: i18n keys exist in all 3 locales', () => {
    it('en.json should have members.importConfirmTitle', () => {
      expect((en as any).members.importConfirmTitle).toBe('Import Members');
    });

    it('en.json should have members.importConfirmMessage (non-empty)', () => {
      expect((en as any).members.importConfirmMessage).toBeDefined();
      expect((en as any).members.importConfirmMessage.length).toBeGreaterThan(0);
    });

    it('pt-BR.json should have members.importConfirmTitle', () => {
      expect((ptBR as any).members.importConfirmTitle).toBe('Importar Membros');
    });

    it('pt-BR.json should have members.importConfirmMessage (non-empty)', () => {
      expect((ptBR as any).members.importConfirmMessage).toBeDefined();
      expect((ptBR as any).members.importConfirmMessage.length).toBeGreaterThan(0);
    });

    it('es.json should have members.importConfirmTitle', () => {
      expect((es as any).members.importConfirmTitle).toBe('Importar Miembros');
    });

    it('es.json should have members.importConfirmMessage (non-empty)', () => {
      expect((es as any).members.importConfirmMessage).toBeDefined();
      expect((es as any).members.importConfirmMessage.length).toBeGreaterThan(0);
    });

    it('all 3 locale files should be valid JSON', () => {
      // These already imported successfully, but verify explicitly
      expect(typeof en).toBe('object');
      expect(typeof ptBR).toBe('object');
      expect(typeof es).toBe('object');
    });
  });
});

// =============================================================================
// F028 (CR-84): Search Clear Button (X) for All Search Fields
// =============================================================================

describe('F028 (CR-84): Search Clear Button (X) for All Search Fields', () => {

  describe('AC-F028-01: X button NOT visible when field is empty', () => {
    it('SearchInput should only show X when value.length > 0', () => {
      const source = readSourceFile('components/SearchInput.tsx');
      expect(source).toContain('value.length > 0');
    });

    it('X button should be conditionally rendered based on value', () => {
      const source = readSourceFile('components/SearchInput.tsx');
      // The X button is inside a conditional: {value.length > 0 && (...)}
      expect(source).toMatch(/value\.length > 0 && \(/);
    });
  });

  describe('AC-F028-02: X button visible when text is present', () => {
    it('SearchInput should render Pressable for X button', () => {
      const source = readSourceFile('components/SearchInput.tsx');
      expect(source).toContain('<Pressable');
      expect(source).toContain("accessibilityLabel=\"Clear search\"");
    });

    it('X button should display SVG XIcon component', () => {
      const source = readSourceFile('components/SearchInput.tsx');
      expect(source).toContain('XIcon');
    });
  });

  describe('AC-F028-03: X button clears text', () => {
    it("X button onPress should call onChangeText with empty string", () => {
      const source = readSourceFile('components/SearchInput.tsx');
      expect(source).toContain("onPress={() => onChangeText('')}");
    });
  });

  describe('AC-F028-04: Styling - paddingRight and textSecondary', () => {
    it('TextInput should have paddingRight >= 36 to avoid text under X', () => {
      const source = readSourceFile('components/SearchInput.tsx');
      const inputStyleMatch = source.match(/input:\s*\{([^}]+)\}/);
      expect(inputStyleMatch).not.toBeNull();
      const inputStyle = inputStyleMatch![1];
      expect(inputStyle).toContain('paddingRight: 36');
    });

    it('X button icon should use textSecondary color', () => {
      const source = readSourceFile('components/SearchInput.tsx');
      expect(source).toContain('colors.textSecondary');
    });

    it('X button should have hitSlop for easier touch', () => {
      const source = readSourceFile('components/SearchInput.tsx');
      expect(source).toContain('hitSlop={8}');
    });

    it('X button should have accessibilityRole button', () => {
      const source = readSourceFile('components/SearchInput.tsx');
      expect(source).toContain('accessibilityRole="button"');
    });

    it('clearButton should be positioned absolutely to the right', () => {
      const source = readSourceFile('components/SearchInput.tsx');
      const clearButtonMatch = source.match(/clearButton:\s*\{([^}]+)\}/);
      expect(clearButtonMatch).not.toBeNull();
      const clearButtonStyle = clearButtonMatch![1];
      expect(clearButtonStyle).toContain("position: 'absolute'");
      expect(clearButtonStyle).toContain('right: 8');
    });
  });

  describe('AC-F028-05: X button does not re-focus field', () => {
    it('SearchInput should not manually re-focus TextInput when X is pressed', () => {
      const source = readSourceFile('components/SearchInput.tsx');
      // The onPress should only call onChangeText(''), not focus the input
      const pressHandler = "onPress={() => onChangeText('')}";
      expect(source).toContain(pressHandler);
      // Verify there is no .focus() call in the X button handler
      expect(source).not.toContain('ref.current?.focus');
    });
  });

  describe('AC-F028-06: All 10 search fields use SearchInput component', () => {
    const searchFieldFiles = [
      { file: 'app/(tabs)/settings/members.tsx', name: 'members' },
      { file: 'app/(tabs)/settings/topics.tsx', name: 'topics' },
      { file: 'app/(tabs)/settings/history.tsx', name: 'history' },
      { file: 'app/(tabs)/settings/timezone.tsx', name: 'timezone' },
      { file: 'components/HymnSelector.tsx', name: 'HymnSelector' },
      { file: 'components/MemberSelectorModal.tsx', name: 'MemberSelectorModal' },
      { file: 'components/TopicSelectorModal.tsx', name: 'TopicSelectorModal' },
      { file: 'components/PrayerSelector.tsx', name: 'PrayerSelector' },
      { file: 'components/ActorSelector.tsx', name: 'ActorSelector' },
      { file: 'components/AgendaForm.tsx', name: 'AgendaForm' },
    ];

    for (const { file, name } of searchFieldFiles) {
      it(`${name} should import SearchInput`, () => {
        const source = readSourceFile(file);
        expect(source).toContain("import { SearchInput }");
      });

      it(`${name} should use <SearchInput in JSX`, () => {
        const source = readSourceFile(file);
        expect(source).toContain('<SearchInput');
      });
    }
  });

  describe('SearchInput component structure', () => {
    it('should use useTheme() internally for colors (ADR-030)', () => {
      const source = readSourceFile('components/SearchInput.tsx');
      expect(source).toContain("import { useTheme } from '../contexts/ThemeContext'");
      expect(source).toContain('const { colors } = useTheme()');
    });

    it('SearchInputProps should extend TextInputProps minus value and onChangeText', () => {
      const source = readSourceFile('components/SearchInput.tsx');
      expect(source).toContain("Omit<TextInputProps, 'value' | 'onChangeText'>");
      expect(source).toContain('value: string');
      expect(source).toContain('onChangeText: (text: string) => void');
    });

    it('should spread additional TextInput props via rest', () => {
      const source = readSourceFile('components/SearchInput.tsx');
      expect(source).toContain('{...rest}');
    });
  });
});
