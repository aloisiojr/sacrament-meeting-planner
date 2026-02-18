/**
 * QA Tests for CR-003 batch (13 Change Requests: CR-31 to CR-43)
 *
 * Covers acceptance criteria for:
 * CR-31: Fix ASM-009 contradiction about Secretary designation permission
 * CR-32: Define About screen content (credits, support link)
 * CR-33: Global back button convention for Stack-navigated screens
 * CR-35: Remove invalid {duracao} placeholder from WhatsApp template system
 * CR-38: Define presentation mode date header format
 * CR-39: Add search/filter field to Ward Topics screen
 * CR-40: Resolve add-member button position inconsistency
 * CR-42: Fix CSV export and import buttons in Members screen
 * CR-43: Add logout/sign-out button in Settings tab
 *
 * Spec-only CRs (no code tests needed, verified structurally):
 * CR-34: Update specs for CR-26 actor changes (docs only)
 * CR-36: Define debounce rules for auto-save text fields (docs only)
 * CR-37: Update docs for Secretary user management permission (docs only)
 * CR-41: Define timezone selector UI details (docs only)
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import ptBR from '../i18n/locales/pt-BR.json';
import en from '../i18n/locales/en.json';
import es from '../i18n/locales/es.json';
import {
  hasPermission,
  getPermissions,
} from '../lib/permissions';
import {
  formatFullDate,
  formatDateHumanReadable,
  parseLocalDate,
} from '../lib/dateUtils';
import {
  parseCsv,
  generateCsv,
  splitPhoneNumber,
} from '../lib/csvUtils';
import {
  resolveTemplate,
  buildWhatsAppUrl,
  DEFAULT_TEMPLATE_PT_BR,
} from '../lib/whatsappUtils';
import type { Role, Permission } from '../types/database';

// Helper to read source files for structural checks
function readSourceFile(relativePath: string): string {
  const fullPath = path.resolve(__dirname, '..', relativePath);
  return fs.readFileSync(fullPath, 'utf-8');
}

// =============================================================================
// CR-31: Fix ASM-009 Contradiction About Secretary Designation Permission
// =============================================================================

describe('CR-31: Secretary designation permissions', () => {
  // AC-31.3: Secretary permissions in code
  it('AC-31.3: Secretary has agenda:assign_speaker permission', () => {
    expect(hasPermission('secretary', 'agenda:assign_speaker')).toBe(true);
  });

  it('AC-31.3: Secretary does NOT have speech:assign permission', () => {
    expect(hasPermission('secretary', 'speech:assign')).toBe(false);
  });

  // EC-31.1: Observer must NOT have agenda:assign_speaker
  it('EC-31.1: Observer does NOT have agenda:assign_speaker', () => {
    expect(hasPermission('observer', 'agenda:assign_speaker')).toBe(false);
  });

  it('Bishopric has agenda:assign_speaker permission', () => {
    expect(hasPermission('bishopric', 'agenda:assign_speaker')).toBe(true);
  });

  it('Bishopric has speech:assign permission', () => {
    expect(hasPermission('bishopric', 'speech:assign')).toBe(true);
  });
});

// =============================================================================
// CR-32: Define About Screen Content
// =============================================================================

describe('CR-32: About screen content', () => {
  // AC-32.1 & AC-32.4: i18n keys exist in all 3 languages
  const aboutKeys = [
    'about.title',
    'about.appName',
    'about.version',
    'about.credits',
    'about.creditsValue',
    'about.support',
    'about.supportUrl',
  ];

  it('AC-32.4: All about i18n keys exist in pt-BR', () => {
    for (const key of aboutKeys) {
      const [ns, k] = key.split('.');
      expect((ptBR as any)[ns]?.[k]).toBeDefined();
    }
  });

  it('AC-32.4: All about i18n keys exist in en', () => {
    for (const key of aboutKeys) {
      const [ns, k] = key.split('.');
      expect((en as any)[ns]?.[k]).toBeDefined();
    }
  });

  it('AC-32.4: All about i18n keys exist in es', () => {
    for (const key of aboutKeys) {
      const [ns, k] = key.split('.');
      expect((es as any)[ns]?.[k]).toBeDefined();
    }
  });

  // AC-32.1: App name is translated
  it('AC-32.1: pt-BR about.appName is set', () => {
    expect(ptBR.about.appName).toBeTruthy();
  });

  it('AC-32.1: en about.appName is set', () => {
    expect(en.about.appName).toBeTruthy();
  });

  it('AC-32.1: es about.appName is set', () => {
    expect(es.about.appName).toBeTruthy();
  });

  // AC-32.2: Credits value is present
  it('AC-32.2: credits value is defined in pt-BR', () => {
    expect(ptBR.about.creditsValue).toBeTruthy();
  });

  it('AC-32.2: credits value is defined in en', () => {
    expect(en.about.creditsValue).toBeTruthy();
  });

  it('AC-32.2: credits value is defined in es', () => {
    expect(es.about.creditsValue).toBeTruthy();
  });

  // EC-32.2: Support link URL should be configurable, hidden if not defined
  it('EC-32.2: supportUrl is empty string by default (support row hidden)', () => {
    expect(ptBR.about.supportUrl).toBe('');
    expect(en.about.supportUrl).toBe('');
    expect(es.about.supportUrl).toBe('');
  });

  // AC-32.1 structural: about.tsx uses expo-constants for version
  it('AC-32.1: about.tsx imports expo-constants for version', () => {
    const content = readSourceFile('app/(tabs)/settings/about.tsx');
    expect(content).toContain("from 'expo-constants'");
    expect(content).toContain('APP_VERSION');
  });

  // AC-32.2 structural: about.tsx renders credits row
  it('AC-32.2: about.tsx renders credits row', () => {
    const content = readSourceFile('app/(tabs)/settings/about.tsx');
    expect(content).toContain("about.credits");
    expect(content).toContain("about.creditsValue");
  });

  // AC-32.3 structural: about.tsx has support link with Linking
  it('AC-32.3: about.tsx uses Linking for support URL', () => {
    const content = readSourceFile('app/(tabs)/settings/about.tsx');
    expect(content).toContain('Linking');
    expect(content).toContain('about.supportUrl');
  });

  // AC-32.5: About screen has back button using common.back
  it('AC-32.5: about.tsx has back button with common.back', () => {
    const content = readSourceFile('app/(tabs)/settings/about.tsx');
    expect(content).toContain("common.back");
    expect(content).toContain("router.back()");
  });

  // EC-32.1: Fallback version if expo-constants fails
  it('EC-32.1: about.tsx has fallback version 1.0.0', () => {
    const content = readSourceFile('app/(tabs)/settings/about.tsx');
    expect(content).toContain("'1.0.0'");
  });
});

// =============================================================================
// CR-33: Global Back Button Convention for Stack-Navigated Screens
// =============================================================================

describe('CR-33: Global back button convention', () => {
  const settingsScreens = [
    { name: 'members', file: 'app/(tabs)/settings/members.tsx' },
    { name: 'topics', file: 'app/(tabs)/settings/topics.tsx' },
    { name: 'whatsapp', file: 'app/(tabs)/settings/whatsapp.tsx' },
    { name: 'about', file: 'app/(tabs)/settings/about.tsx' },
  ];

  // AC-33.1 & AC-33.2: Each screen has back button that navigates back
  for (const screen of settingsScreens) {
    it(`AC-33.1: ${screen.name} has a back button`, () => {
      const content = readSourceFile(screen.file);
      expect(content).toContain('router.back()');
    });

    it(`AC-33.3: ${screen.name} uses common.back i18n key`, () => {
      const content = readSourceFile(screen.file);
      expect(content).toContain("common.back");
    });
  }

  // AC-33.3: common.back exists in all languages
  it('AC-33.3: common.back key exists in pt-BR', () => {
    expect(ptBR.common.back).toBeTruthy();
  });

  it('AC-33.3: common.back key exists in en', () => {
    expect(en.common.back).toBeTruthy();
  });

  it('AC-33.3: common.back key exists in es', () => {
    expect(es.common.back).toBeTruthy();
  });

  // AC-33.4: Back button styling matches convention
  it('AC-33.4: members.tsx backButton style has fontSize 16, fontWeight 600', () => {
    const content = readSourceFile('app/(tabs)/settings/members.tsx');
    expect(content).toContain('backButton');
    // Check the StyleSheet includes proper values
    expect(content).toMatch(/backButton.*\{[\s\S]*?fontSize:\s*16/);
    expect(content).toMatch(/backButton.*\{[\s\S]*?fontWeight:\s*'600'/);
  });

  // EC-33.1: Presentation mode uses close button (exception)
  it('EC-33.1: presentation.tsx uses close button, not back', () => {
    const content = readSourceFile('app/presentation.tsx');
    expect(content).toContain('closeButton');
    expect(content).toContain("common.close");
  });
});

// =============================================================================
// CR-35: Remove Invalid {duracao} Placeholder from WhatsApp Template System
// =============================================================================

describe('CR-35: Remove {duracao} placeholder', () => {
  // AC-35.1: PLACEHOLDERS constant does not include {duracao}
  it('AC-35.1: whatsapp.tsx PLACEHOLDERS does not include {duracao}', () => {
    const content = readSourceFile('app/(tabs)/settings/whatsapp.tsx');
    const placeholderMatch = content.match(/PLACEHOLDERS\s*=\s*\[([^\]]+)\]/s);
    expect(placeholderMatch).toBeTruthy();
    expect(placeholderMatch![1]).not.toContain('{duracao}');
  });

  // AC-35.2: SAMPLE_DATA does not include {duracao}
  it('AC-35.2: whatsapp.tsx SAMPLE_DATA does not include {duracao}', () => {
    const content = readSourceFile('app/(tabs)/settings/whatsapp.tsx');
    const sampleDataMatch = content.match(/SAMPLE_DATA[\s\S]*?=\s*\{([\s\S]*?)\};/);
    expect(sampleDataMatch).toBeTruthy();
    expect(sampleDataMatch![1]).not.toContain('{duracao}');
  });

  // AC-35.5: whatsappUtils.ts resolveTemplate does not resolve {duracao}
  it('AC-35.5: resolveTemplate does not resolve {duracao}', () => {
    const template = 'Hello {nome}, duration: {duracao}';
    const vars = {
      speakerName: 'John',
      date: '2026-03-01',
      topic: 'Faith',
      position: '1',
    };
    const result = resolveTemplate(template, vars);
    // {duracao} should remain unresolved (literal string)
    expect(result).toContain('{duracao}');
    // {nome} should be resolved
    expect(result).not.toContain('{nome}');
    expect(result).toContain('John');
  });

  // AC-35.6: Only 6 valid placeholders
  it('AC-35.6: whatsapp.tsx has exactly 6 placeholders', () => {
    const content = readSourceFile('app/(tabs)/settings/whatsapp.tsx');
    const placeholderMatch = content.match(/PLACEHOLDERS\s*=\s*\[([^\]]+)\]/s);
    expect(placeholderMatch).toBeTruthy();
    const placeholders = placeholderMatch![1].match(/'\{[^}]+\}'/g);
    expect(placeholders).toHaveLength(6);
    const expected = ['{nome}', '{data}', '{posicao}', '{colecao}', '{titulo}', '{link}'];
    for (const p of expected) {
      expect(placeholderMatch![1]).toContain(p);
    }
  });

  // AC-35.5: whatsappUtils.ts resolves all 6 valid placeholders
  it('AC-35.5: resolveTemplate resolves all 6 valid placeholders', () => {
    const template = '{nome} {data} {posicao} {colecao} {titulo} {link}';
    const vars = {
      speakerName: 'Maria',
      date: '2026-03-01',
      topic: 'Faith',
      position: '2',
      collection: 'Ward Topics',
      link: 'https://example.com',
    };
    const result = resolveTemplate(template, vars);
    expect(result).toContain('Maria');
    expect(result).toContain('2026-03-01');
    expect(result).toContain('2');
    expect(result).toContain('Ward Topics');
    expect(result).toContain('Faith');
    expect(result).toContain('https://example.com');
  });
});

// =============================================================================
// CR-38: Presentation Mode Date Header Format
// =============================================================================

describe('CR-38: Presentation mode date header format', () => {
  // AC-38.2: pt-BR format: "Domingo, DD de [Mes] de YYYY"
  it('AC-38.2: formatFullDate pt-BR format for a Sunday', () => {
    const result = formatFullDate('2026-02-15', 'pt-BR'); // Feb 15 2026 is Sunday
    expect(result).toBe('Domingo, 15 de Fevereiro de 2026');
  });

  // AC-38.3: en format: "Sunday, [Month] DD, YYYY"
  it('AC-38.3: formatFullDate en format for a Sunday', () => {
    const result = formatFullDate('2026-02-15', 'en');
    expect(result).toBe('Sunday, February 15, 2026');
  });

  // AC-38.4: es format: "Domingo, DD de [Mes] de YYYY"
  it('AC-38.4: formatFullDate es format for a Sunday', () => {
    const result = formatFullDate('2026-02-15', 'es');
    expect(result).toBe('Domingo, 15 de Febrero de 2026');
  });

  // EC-38.1: Non-Sunday dates should show the correct day name
  it('EC-38.1: formatFullDate shows correct day name for non-Sunday (Wednesday)', () => {
    const result = formatFullDate('2026-02-18', 'en'); // Wednesday
    expect(result).toBe('Wednesday, February 18, 2026');
  });

  it('EC-38.1: formatFullDate shows correct day name for non-Sunday (Monday, pt-BR)', () => {
    const result = formatFullDate('2026-02-16', 'pt-BR'); // Monday
    expect(result).toBe('Segunda-feira, 16 de Fevereiro de 2026');
  });

  // AC-38.5: presentation.tsx uses formatFullDate
  it('AC-38.5: presentation.tsx imports and uses formatFullDate', () => {
    const content = readSourceFile('app/presentation.tsx');
    expect(content).toContain('formatFullDate');
    expect(content).toContain('getCurrentLanguage');
  });

  // EC-38.2: Uses ward language, not device locale
  it('EC-38.2: presentation.tsx uses getCurrentLanguage (ward language)', () => {
    const content = readSourceFile('app/presentation.tsx');
    expect(content).toContain('getCurrentLanguage()');
    // Should NOT use Intl.DateTimeFormat or device locale
    expect(content).not.toContain('Intl.DateTimeFormat');
  });
});

// =============================================================================
// CR-39: Add Search/Filter Field to Ward Topics Screen
// =============================================================================

describe('CR-39: Ward Topics search/filter', () => {
  // AC-39.1: Search input exists in topics screen
  it('AC-39.1: topics.tsx has a search text input', () => {
    const content = readSourceFile('app/(tabs)/settings/topics.tsx');
    expect(content).toContain('search');
    expect(content).toContain('setSearch');
    expect(content).toContain('SearchInput');
  });

  // AC-39.2: Real-time case-insensitive filtering
  it('AC-39.2: topics.tsx filters ward topics by search (case-insensitive)', () => {
    const content = readSourceFile('app/(tabs)/settings/topics.tsx');
    expect(content).toContain('.toLowerCase()');
    expect(content).toContain('.includes(');
  });

  // AC-39.3: When search is empty, all topics are shown
  it('AC-39.3: topics.tsx shows all topics when search is empty', () => {
    const content = readSourceFile('app/(tabs)/settings/topics.tsx');
    // Check for the filter logic that returns true when search is empty
    expect(content).toContain("if (!search.trim()) return true");
  });

  // AC-39.4: Empty state shown when no matches
  it('AC-39.4: topics.tsx shows empty state when no matches', () => {
    const content = readSourceFile('app/(tabs)/settings/topics.tsx');
    expect(content).toContain("common.noResults");
  });

  // AC-39.5: Search input styling matches Members screen (via shared SearchInput component)
  it('AC-39.5: topics.tsx uses shared SearchInput component (consistent styling)', () => {
    const content = readSourceFile('app/(tabs)/settings/topics.tsx');
    expect(content).toContain("import { SearchInput } from '../../../components/SearchInput'");
    expect(content).toContain('<SearchInput');
    // Verify SearchInput component itself has the expected styles
    const searchInputComponent = readSourceFile('components/SearchInput.tsx');
    expect(searchInputComponent).toMatch(/height:\s*40/);
    expect(searchInputComponent).toMatch(/borderWidth:\s*1/);
    expect(searchInputComponent).toMatch(/borderRadius:\s*8/);
    expect(searchInputComponent).toMatch(/paddingHorizontal:\s*12/);
    expect(searchInputComponent).toMatch(/fontSize:\s*15/);
  });

  // AC-39.6: Collections section is NOT filtered by search
  it('AC-39.6: topics.tsx does not filter collections section by search', () => {
    const content = readSourceFile('app/(tabs)/settings/topics.tsx');
    // filteredTopics is used for ward topics only
    expect(content).toContain('filteredTopics');
    // Collections use the raw data, not filtered
    expect(content).toMatch(/collections\s*&&\s*collections\.length\s*>\s*0/);
  });

  // EC-39.1: Uses string includes (not regex) for safety
  it('EC-39.1: topics.tsx uses string includes, not regex for filtering', () => {
    const content = readSourceFile('app/(tabs)/settings/topics.tsx');
    // Grab the full filter logic block (from filteredTopics definition to the end of filter callback)
    const filterBlock = content.match(/filteredTopics[\s\S]*?\.filter\([\s\S]*?\}\)/);
    expect(filterBlock).toBeTruthy();
    expect(filterBlock![0]).toContain('.includes(');
    // Should not use RegExp or new RegExp
    expect(filterBlock![0]).not.toContain('RegExp');
  });
});

// =============================================================================
// CR-40: Resolve Add-Member Button Position Inconsistency
// =============================================================================

describe('CR-40: Add-member button position', () => {
  // AC-40.1: Members screen "+" button is in the header row
  it('AC-40.1: members.tsx has add button in header area', () => {
    const content = readSourceFile('app/(tabs)/settings/members.tsx');
    // The header section should contain the add button
    const headerSection = content.match(/{\/\*\s*Header\s*\*\/}[\s\S]*?{\/\*\s*Search\s*\*\/}/);
    expect(headerSection).toBeTruthy();
    expect(headerSection![0]).toContain('handleAdd');
    expect(headerSection![0]).toContain('addButton');
  });

  // AC-40.4: Members and Topics screens have consistent add button positions
  it('AC-40.4: both members.tsx and topics.tsx use addButton in header', () => {
    const membersContent = readSourceFile('app/(tabs)/settings/members.tsx');
    const topicsContent = readSourceFile('app/(tabs)/settings/topics.tsx');

    // Both should have addButton style
    expect(membersContent).toContain('addButton');
    expect(topicsContent).toContain('addButton');

    // Both should have similar header structure with back + title + add
    expect(membersContent).toContain('styles.header');
    expect(topicsContent).toContain('styles.header');
  });

  // EC-40.1: "+" button is only visible to users with member:write permission
  it('EC-40.1: members.tsx add button requires member:write permission', () => {
    const content = readSourceFile('app/(tabs)/settings/members.tsx');
    expect(content).toContain("canWrite");
    expect(content).toContain("member:write");
  });
});

// =============================================================================
// CR-42: CSV Export and Import Functionality
// =============================================================================

describe('CR-42: CSV export and import', () => {
  // AC-42.3: CSV format verification
  it('AC-42.3: generateCsv produces correct header and format', () => {
    const members = [
      { full_name: 'Joao Silva', country_code: '+55', phone: '11999999999' },
      { full_name: 'Maria Santos', country_code: '+1', phone: '2025551234' },
    ];
    const csv = generateCsv(members);
    const lines = csv.replace('\uFEFF', '').split('\n');
    expect(lines[0]).toBe('Nome,Telefone Completo');
    expect(lines[1]).toBe('Joao Silva,+5511999999999');
    expect(lines[2]).toBe('Maria Santos,+12025551234');
  });

  // AC-42.3: CSV format includes BOM for Excel compatibility
  it('AC-42.3: generateCsv includes UTF-8 BOM', () => {
    const members = [
      { full_name: 'Test', country_code: '+55', phone: '11999999999' },
    ];
    const csv = generateCsv(members);
    expect(csv.startsWith('\uFEFF')).toBe(true);
  });

  // AC-42.6: CSV parsing validation errors
  it('AC-42.6: parseCsv returns line-level errors for invalid data', () => {
    const csv = 'Nome,Telefone Completo\n,+5511999999999';
    const result = parseCsv(csv);
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].line).toBe(2);
    expect(result.errors[0].field).toBe('Nome');
  });

  // EC-42.4: CSV with BOM should parse correctly
  it('EC-42.4: parseCsv handles BOM prefix', () => {
    const csv = '\uFEFFNome,Telefone Completo\nJoao Silva,+5511999999999';
    const result = parseCsv(csv);
    expect(result.success).toBe(true);
    expect(result.members).toHaveLength(1);
    expect(result.members[0].full_name).toBe('Joao Silva');
  });

  // Roundtrip test: generate -> parse
  it('AC-42.3: CSV roundtrip (generate then parse) preserves data', () => {
    const members = [
      { full_name: 'Joao Silva', country_code: '+55', phone: '11999999999' },
      { full_name: 'Maria Santos', country_code: '+1', phone: '2025551234' },
    ];
    const csv = generateCsv(members);
    const result = parseCsv(csv);
    expect(result.success).toBe(true);
    expect(result.members).toHaveLength(2);
    expect(result.members[0].full_name).toBe('Joao Silva');
    expect(result.members[0].phone).toBe('+5511999999999');
    expect(result.members[1].full_name).toBe('Maria Santos');
    expect(result.members[1].phone).toBe('+12025551234');
  });

  // AC-42.1 structural: handleExport uses expo-sharing on mobile
  it('AC-42.1: members.tsx handleExport uses expo-sharing for mobile', () => {
    const content = readSourceFile('app/(tabs)/settings/members.tsx');
    expect(content).toContain("expo-sharing");
    expect(content).toContain("shareAsync");
    expect(content).toContain("'text/csv'");
  });

  // AC-42.2 structural: handleExport uses Blob for web
  it('AC-42.2: members.tsx handleExport uses Blob download for web', () => {
    const content = readSourceFile('app/(tabs)/settings/members.tsx');
    expect(content).toContain("Blob");
    expect(content).toContain("membros.csv");
    expect(content).toContain("createObjectURL");
  });

  // AC-42.4 structural: handleImport uses DocumentPicker on mobile
  it('AC-42.4: members.tsx handleImport uses expo-document-picker', () => {
    const content = readSourceFile('app/(tabs)/settings/members.tsx');
    expect(content).toContain("expo-document-picker");
    expect(content).toContain("getDocumentAsync");
  });

  // AC-42.5 structural: Import calls import_members RPC
  it('AC-42.5: members.tsx calls import_members RPC', () => {
    const content = readSourceFile('app/(tabs)/settings/members.tsx');
    expect(content).toContain("import_members");
    expect(content).toContain("target_ward_id");
    expect(content).toContain("new_members");
  });

  // AC-42.7: Import button shows ActivityIndicator when pending
  it('AC-42.7: members.tsx import button shows ActivityIndicator when pending', () => {
    const content = readSourceFile('app/(tabs)/settings/members.tsx');
    expect(content).toContain("importMutation.isPending");
    expect(content).toContain("ActivityIndicator");
  });

  // AC-42.8: Export always allowed (F005 CR-55: empty export produces header-only CSV)
  it('AC-42.8: members.tsx export button is never disabled (empty export allowed)', () => {
    const content = readSourceFile('app/(tabs)/settings/members.tsx');
    // Export button should NOT have a disabled guard for empty members
    expect(content).not.toContain("disabled={!members || members.length === 0}");
    // Export uses generateCsv(members ?? [], { ... }) which handles empty arrays
    // CR-77/CR-78: now passes translated headers as second arg
    expect(content).toContain("generateCsv(members ?? []");
  });

  // CSV edge cases
  it('parseCsv handles quoted fields with embedded commas', () => {
    const csv = 'Nome,Telefone Completo\n"Silva, Joao",+5511999999999';
    const result = parseCsv(csv);
    expect(result.success).toBe(true);
    expect(result.members[0].full_name).toBe('Silva, Joao');
  });

  it('parseCsv handles quoted fields with embedded double quotes', () => {
    const csv = 'Nome,Telefone Completo\n"Joao ""JJ"" Silva",+5511999999999';
    const result = parseCsv(csv);
    expect(result.success).toBe(true);
    expect(result.members[0].full_name).toBe('Joao "JJ" Silva');
  });

  it('parseCsv handles members with empty phone (name only)', () => {
    const csv = 'Nome,Telefone Completo\nJoao Silva,';
    const result = parseCsv(csv);
    expect(result.success).toBe(true);
    expect(result.members[0]).toEqual({ full_name: 'Joao Silva', phone: '' });
  });

  it('parseCsv rejects CSV with insufficient columns in header', () => {
    const csv = 'Nome\nJoao Silva';
    const result = parseCsv(csv);
    expect(result.success).toBe(false);
    expect(result.errors[0].field).toBe('header');
  });

  it('generateCsv escapes names with special characters', () => {
    const members = [
      { full_name: 'Name "with" quotes', country_code: '+55', phone: '11999999999' },
    ];
    const csv = generateCsv(members);
    expect(csv).toContain('"Name ""with"" quotes"');
  });

  // splitPhoneNumber tests for various country codes
  it('splitPhoneNumber handles Portugal (+351)', () => {
    const result = splitPhoneNumber('+351912345678');
    expect(result).toEqual({ countryCode: '+351', phone: '912345678' });
  });

  it('splitPhoneNumber handles Mexico (+52)', () => {
    const result = splitPhoneNumber('+525512345678');
    expect(result).toEqual({ countryCode: '+52', phone: '5512345678' });
  });

  it('splitPhoneNumber handles UK (+44)', () => {
    const result = splitPhoneNumber('+447911123456');
    expect(result).toEqual({ countryCode: '+44', phone: '7911123456' });
  });
});

// =============================================================================
// CR-43: Add Logout/Sign-Out Button in Settings Tab
// =============================================================================

describe('CR-43: Sign Out button', () => {
  // AC-43.1 structural: Sign Out button exists at bottom of Settings screen
  it('AC-43.1: settings/index.tsx has signOutButton', () => {
    const content = readSourceFile('app/(tabs)/settings/index.tsx');
    expect(content).toContain('signOutButton');
    expect(content).toContain('handleSignOut');
  });

  // AC-43.2: Sign Out i18n keys exist in all languages
  it('AC-43.2: pt-BR has settings.signOut = "Sair"', () => {
    expect(ptBR.settings.signOut).toBe('Sair');
  });

  it('AC-43.2: en has settings.signOut = "Sign Out"', () => {
    expect(en.settings.signOut).toBe('Sign Out');
  });

  it('AC-43.2: es has settings.signOut = "Cerrar Sesión"', () => {
    expect(es.settings.signOut).toContain('Cerrar Sesi');
  });

  // AC-43.3: Confirmation dialog keys exist
  it('AC-43.3: pt-BR has sign out confirmation keys', () => {
    expect(ptBR.settings.signOutTitle).toBeTruthy();
    expect(ptBR.settings.signOutMessage).toBeTruthy();
  });

  it('AC-43.3: en has sign out confirmation keys', () => {
    expect(en.settings.signOutTitle).toBeTruthy();
    expect(en.settings.signOutMessage).toBeTruthy();
  });

  it('AC-43.3: es has sign out confirmation keys', () => {
    expect(es.settings.signOutTitle).toBeTruthy();
    expect(es.settings.signOutMessage).toBeTruthy();
  });

  // AC-43.3 structural: handleSignOut shows confirmation dialog
  it('AC-43.3: settings/index.tsx handleSignOut uses Alert.alert for confirmation', () => {
    const content = readSourceFile('app/(tabs)/settings/index.tsx');
    expect(content).toContain("handleSignOut");
    expect(content).toContain("Alert.alert");
    expect(content).toContain("settings.signOutTitle");
    expect(content).toContain("settings.signOutMessage");
  });

  // AC-43.4 & AC-43.5: signOut clears session
  it('AC-43.5: settings/index.tsx calls signOut from AuthContext', () => {
    const content = readSourceFile('app/(tabs)/settings/index.tsx');
    expect(content).toContain("signOut");
    // Should destructure signOut from useAuth
    expect(content).toContain("signOut");
  });

  // AC-43.5: AuthContext has signOut that calls supabase.auth.signOut()
  it('AC-43.5: AuthContext signOut calls supabase.auth.signOut()', () => {
    const content = readSourceFile('contexts/AuthContext.tsx');
    expect(content).toContain("supabase.auth.signOut()");
  });

  // AC-43.6: Sign Out button has destructive styling (red text)
  it('AC-43.6: settings/index.tsx signOut uses error/red color', () => {
    const content = readSourceFile('app/(tabs)/settings/index.tsx');
    expect(content).toContain('colors.error');
    expect(content).toContain('signOutText');
  });

  // AC-43.7: Sign Out visible to all roles (no permission check)
  it('AC-43.7: settings/index.tsx signOut button has no permission guard', () => {
    const content = readSourceFile('app/(tabs)/settings/index.tsx');
    // Find the signOutButton section -- it should NOT be wrapped in hasPermission
    const signOutSection = content.match(/signOutButton[\s\S]*?signOutText/);
    expect(signOutSection).toBeTruthy();
    // No hasPermission check before signOutButton
    expect(signOutSection![0]).not.toContain('hasPermission');
  });

  // EC-43.1: Error handling on sign out failure
  it('EC-43.1: settings/index.tsx handles signOut errors', () => {
    const content = readSourceFile('app/(tabs)/settings/index.tsx');
    expect(content).toContain("catch");
    expect(content).toContain("common.error");
  });

  // Settings index clears React Query cache on sign out
  it('AC-43.4: settings/index.tsx clears queryClient on sign out', () => {
    const content = readSourceFile('app/(tabs)/settings/index.tsx');
    expect(content).toContain("queryClient.clear()");
  });
});

// =============================================================================
// i18n Completeness: CR-32 + CR-43 Keys Across All 3 Languages
// =============================================================================

describe('i18n completeness for CR-3 batch', () => {
  const requiredKeys = {
    // CR-32: About screen
    'about.title': { ptBR: true, en: true, es: true },
    'about.appName': { ptBR: true, en: true, es: true },
    'about.version': { ptBR: true, en: true, es: true },
    'about.credits': { ptBR: true, en: true, es: true },
    'about.creditsValue': { ptBR: true, en: true, es: true },
    'about.support': { ptBR: true, en: true, es: true },

    // CR-43: Sign Out
    'settings.signOut': { ptBR: true, en: true, es: true },
    'settings.signOutTitle': { ptBR: true, en: true, es: true },
    'settings.signOutMessage': { ptBR: true, en: true, es: true },

    // CR-39: Topics search (uses common.search, already existed)
    'common.search': { ptBR: true, en: true, es: true },
    'common.back': { ptBR: true, en: true, es: true },
    'common.close': { ptBR: true, en: true, es: true },
  };

  for (const [key, _] of Object.entries(requiredKeys)) {
    const [ns, k] = key.split('.');

    it(`pt-BR has key ${key}`, () => {
      expect((ptBR as any)[ns]?.[k]).toBeDefined();
      expect((ptBR as any)[ns]?.[k]).not.toBe(undefined);
    });

    it(`en has key ${key}`, () => {
      expect((en as any)[ns]?.[k]).toBeDefined();
      expect((en as any)[ns]?.[k]).not.toBe(undefined);
    });

    it(`es has key ${key}`, () => {
      expect((es as any)[ns]?.[k]).toBeDefined();
      expect((es as any)[ns]?.[k]).not.toBe(undefined);
    });
  }
});

// =============================================================================
// Cross-feature Validation
// =============================================================================

describe('Cross-feature validation', () => {
  // Verify WhatsApp template default does not contain {duracao}
  it('DEFAULT_TEMPLATE_PT_BR does not contain {duracao}', () => {
    expect(DEFAULT_TEMPLATE_PT_BR).not.toContain('{duracao}');
  });

  // Verify formatFullDate consistency across locales
  it('formatFullDate returns consistent structure across locales for the same date', () => {
    const date = '2026-03-01'; // Sunday
    const ptResult = formatFullDate(date, 'pt-BR');
    const enResult = formatFullDate(date, 'en');
    const esResult = formatFullDate(date, 'es');

    // All should contain year
    expect(ptResult).toContain('2026');
    expect(enResult).toContain('2026');
    expect(esResult).toContain('2026');

    // pt-BR and es should have Sunday = Domingo
    expect(ptResult).toContain('Domingo');
    expect(esResult).toContain('Domingo');
    expect(enResult).toContain('Sunday');
  });

  // Verify all permissions are consistent
  it('Secretary permissions include settings:users (CR-37)', () => {
    expect(hasPermission('secretary', 'settings:users')).toBe(true);
  });

  it('Observer does NOT have settings:users', () => {
    expect(hasPermission('observer', 'settings:users')).toBe(false);
  });

  // CSV utilities handle edge cases consistently
  it('generateCsv handles member with null phone gracefully', () => {
    const members = [
      { full_name: 'No Phone', country_code: '+55', phone: null },
    ];
    const csv = generateCsv(members);
    const lines = csv.split('\n');
    expect(lines[1]).toBe('No Phone,');
  });

  it('parseCsv accepts phones of any length matching /^[+\\d]*$/', () => {
    // Short phone is now accepted (no min/max digit length validation)
    const shortCsv = 'Nome,Telefone Completo\nJoao,+12345';
    const shortResult = parseCsv(shortCsv);
    expect(shortResult.success).toBe(true);
    expect(shortResult.members[0].phone).toBe('+12345');

    // Valid length phone
    const validCsv = 'Nome,Telefone Completo\nJoao,+5511999999999';
    const validResult = parseCsv(validCsv);
    expect(validResult.success).toBe(true);
  });

  // Package dependencies for CSV export/import
  it('EC-42.1: package.json includes expo-document-picker', () => {
    const pkg = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, '../../package.json'),
        'utf-8'
      )
    );
    expect(pkg.dependencies['expo-document-picker']).toBeTruthy();
  });

  it('EC-42.1: package.json includes expo-file-system', () => {
    const pkg = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, '../../package.json'),
        'utf-8'
      )
    );
    expect(pkg.dependencies['expo-file-system']).toBeTruthy();
  });

  it('EC-42.1: package.json includes expo-sharing', () => {
    const pkg = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, '../../package.json'),
        'utf-8'
      )
    );
    expect(pkg.dependencies['expo-sharing']).toBeTruthy();
  });
});
