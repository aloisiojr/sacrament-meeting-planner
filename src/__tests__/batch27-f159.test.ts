/**
 * Batch 27 - Tests for F159 (CR-231).
 *
 * F159: Individual WhatsApp Templates per Speech Position
 * Covers all 21 ACs (AC-159-01 through AC-159-21).
 *
 * CR-231 splits the single speech WhatsApp template (wards.whatsapp_template)
 * into 3 individual templates (whatsapp_template_speech_1, _speech_2, _speech_3),
 * removes {posicao} placeholder entirely, and expands Settings WhatsApp screen
 * from 3 tabs to 5 tabs (3 speech + 2 prayer).
 *
 * Testing strategy: Source code analysis (fs.readFileSync) following project conventions.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// --- Helpers ---

const ROOT = path.resolve(__dirname, '..', '..');

function readSrcFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(ROOT, 'src', relativePath), 'utf-8');
}

function readRootFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(ROOT, relativePath), 'utf-8');
}

// --- Source files ---
const migrationSource = readRootFile('supabase/migrations/020_split_speech_template.sql');
const databaseTypesSource = readSrcFile('types/database.ts');
const whatsappUtilsSource = readSrcFile('lib/whatsappUtils.ts');
const whatsappSource = readSrcFile('lib/whatsapp.ts');
const inviteManagementSource = readSrcFile('components/InviteManagementSection.tsx');
const whatsappSettingsSource = readSrcFile('app/(tabs)/settings/whatsapp.tsx');
const settingsIndexSource = readSrcFile('app/(tabs)/settings/index.tsx');
const edgeFunctionSource = readRootFile('supabase/functions/register-first-user/index.ts');

// --- i18n locale files ---
const ptBR = JSON.parse(readSrcFile('i18n/locales/pt-BR.json'));
const en = JSON.parse(readSrcFile('i18n/locales/en.json'));
const es = JSON.parse(readSrcFile('i18n/locales/es.json'));

// --- Runtime imports for function testing ---
import {
  getDefaultSpeechTemplate,
  resolveTemplate,
  buildWhatsAppUrl,
} from '../lib/whatsappUtils';
import type { WhatsAppVariables } from '../lib/whatsappUtils';


// ============================================================================
// Migration Tests (AC-159-01 through AC-159-04, AC-159-21)
// ============================================================================

describe('Migration 020: Split speech template', () => {

  // --- AC-159-01: Migration adds whatsapp_template_speech_1 column ---
  it('AC-159-01: adds whatsapp_template_speech_1 column', () => {
    expect(migrationSource).toContain('ADD COLUMN whatsapp_template_speech_1 TEXT');
  });

  // --- AC-159-02: Migration adds whatsapp_template_speech_2 column ---
  it('AC-159-02: adds whatsapp_template_speech_2 column', () => {
    expect(migrationSource).toContain('ADD COLUMN whatsapp_template_speech_2 TEXT');
  });

  // --- AC-159-03: Migration adds whatsapp_template_speech_3 column ---
  it('AC-159-03: adds whatsapp_template_speech_3 column', () => {
    expect(migrationSource).toContain('ADD COLUMN whatsapp_template_speech_3 TEXT');
  });

  // --- AC-159-04: Migration drops old whatsapp_template column ---
  it('AC-159-04: drops old whatsapp_template column', () => {
    expect(migrationSource).toContain('DROP COLUMN whatsapp_template');
  });

  // --- AC-159-21: Migration copies existing data to all 3 columns ---
  it('AC-159-21: copies existing data from whatsapp_template to all 3 new columns', () => {
    expect(migrationSource).toContain('whatsapp_template_speech_1 = whatsapp_template');
    expect(migrationSource).toContain('whatsapp_template_speech_2 = whatsapp_template');
    expect(migrationSource).toContain('whatsapp_template_speech_3 = whatsapp_template');
  });

  it('AC-159-21: columns are nullable (no NOT NULL constraint)', () => {
    // ADD COLUMN should not have NOT NULL
    const addStatements = migrationSource.match(/ADD COLUMN whatsapp_template_speech_\d TEXT/g);
    expect(addStatements).toHaveLength(3);
    // None of them should have NOT NULL
    for (const stmt of addStatements!) {
      expect(stmt).not.toContain('NOT NULL');
    }
  });

  it('data copy happens before drop (correct ordering)', () => {
    const copyIndex = migrationSource.indexOf('whatsapp_template_speech_1 = whatsapp_template');
    const dropIndex = migrationSource.indexOf('DROP COLUMN whatsapp_template');
    expect(copyIndex).toBeGreaterThan(-1);
    expect(dropIndex).toBeGreaterThan(-1);
    expect(copyIndex).toBeLessThan(dropIndex);
  });
});


// ============================================================================
// TypeScript Types (AC-159-05)
// ============================================================================

describe('TypeScript Types: Ward interface', () => {

  // --- AC-159-05: Ward interface has 3 speech template columns ---
  it('AC-159-05: Ward interface has whatsapp_template_speech_1', () => {
    expect(databaseTypesSource).toContain('whatsapp_template_speech_1: string | null');
  });

  it('AC-159-05: Ward interface has whatsapp_template_speech_2', () => {
    expect(databaseTypesSource).toContain('whatsapp_template_speech_2: string | null');
  });

  it('AC-159-05: Ward interface has whatsapp_template_speech_3', () => {
    expect(databaseTypesSource).toContain('whatsapp_template_speech_3: string | null');
  });

  it('AC-159-05: Ward interface does NOT have old whatsapp_template field', () => {
    // Should not match standalone "whatsapp_template:" without speech_N
    const wardBlock = databaseTypesSource.match(/interface Ward \{[\s\S]*?\}/);
    expect(wardBlock).toBeTruthy();
    // The old field was "whatsapp_template: string | null" (without _speech_N)
    // Check that the ward block does not have a line with just "whatsapp_template:"
    // that is not followed by _speech or _opening or _closing
    const lines = wardBlock![0].split('\n');
    const oldFieldLines = lines.filter(
      (l) => l.includes('whatsapp_template:') &&
             !l.includes('whatsapp_template_speech_') &&
             !l.includes('whatsapp_template_opening_') &&
             !l.includes('whatsapp_template_closing_')
    );
    expect(oldFieldLines).toHaveLength(0);
  });
});


// ============================================================================
// Default Templates & Utils (AC-159-06 through AC-159-09)
// ============================================================================

describe('Default Templates & Utils', () => {

  // --- AC-159-06: 9 default templates exist with correct ordinals ---
  it('AC-159-06: 9 default template constants exist', () => {
    expect(whatsappUtilsSource).toContain('DEFAULT_TEMPLATE_SPEECH_1_PT_BR');
    expect(whatsappUtilsSource).toContain('DEFAULT_TEMPLATE_SPEECH_2_PT_BR');
    expect(whatsappUtilsSource).toContain('DEFAULT_TEMPLATE_SPEECH_3_PT_BR');
    expect(whatsappUtilsSource).toContain('DEFAULT_TEMPLATE_SPEECH_1_EN');
    expect(whatsappUtilsSource).toContain('DEFAULT_TEMPLATE_SPEECH_2_EN');
    expect(whatsappUtilsSource).toContain('DEFAULT_TEMPLATE_SPEECH_3_EN');
    expect(whatsappUtilsSource).toContain('DEFAULT_TEMPLATE_SPEECH_1_ES');
    expect(whatsappUtilsSource).toContain('DEFAULT_TEMPLATE_SPEECH_2_ES');
    expect(whatsappUtilsSource).toContain('DEFAULT_TEMPLATE_SPEECH_3_ES');
  });

  it('AC-159-06: templates contain correct ordinal words', () => {
    // pt-BR ordinals
    expect(whatsappUtilsSource).toContain('primeiro discurso');
    expect(whatsappUtilsSource).toContain('segundo discurso');
    expect(whatsappUtilsSource).toContain('terceiro discurso');
    // EN ordinals
    expect(whatsappUtilsSource).toContain('first speech');
    expect(whatsappUtilsSource).toContain('second speech');
    expect(whatsappUtilsSource).toContain('third speech');
    // ES ordinals
    expect(whatsappUtilsSource).toContain('primer discurso');
    expect(whatsappUtilsSource).toContain('tercer discurso');
  });

  it('AC-159-06: no template contains {posicao} placeholder', () => {
    // Extract all template constants
    const templateMatches = whatsappUtilsSource.match(/DEFAULT_TEMPLATE_SPEECH_\d_\w+ =[\s\S]*?';/g);
    expect(templateMatches).toBeTruthy();
    for (const tmpl of templateMatches!) {
      expect(tmpl).not.toContain('{posicao}');
    }
  });

  it('AC-159-06: old default template constants are removed', () => {
    // Should NOT have the old single-language constants
    expect(whatsappUtilsSource).not.toMatch(/export const DEFAULT_TEMPLATE_PT_BR\b/);
    expect(whatsappUtilsSource).not.toMatch(/export const DEFAULT_TEMPLATE_EN\b/);
    expect(whatsappUtilsSource).not.toMatch(/export const DEFAULT_TEMPLATE_ES\b/);
  });

  it('AC-159-06: getDefaultSpeechTemplate returns correct template for each language/position', () => {
    // pt-BR
    expect(getDefaultSpeechTemplate('pt-BR', 1)).toContain('primeiro discurso');
    expect(getDefaultSpeechTemplate('pt-BR', 2)).toContain('segundo discurso');
    expect(getDefaultSpeechTemplate('pt-BR', 3)).toContain('terceiro discurso');
    // en
    expect(getDefaultSpeechTemplate('en', 1)).toContain('first speech');
    expect(getDefaultSpeechTemplate('en', 2)).toContain('second speech');
    expect(getDefaultSpeechTemplate('en', 3)).toContain('third speech');
    // es
    expect(getDefaultSpeechTemplate('es', 1)).toContain('primer discurso');
    expect(getDefaultSpeechTemplate('es', 2)).toContain('segundo discurso');
    expect(getDefaultSpeechTemplate('es', 3)).toContain('tercer discurso');
  });

  it('AC-159-06: getDefaultSpeechTemplate falls back to pt-BR for unsupported language', () => {
    expect(getDefaultSpeechTemplate('fr', 1)).toContain('primeiro discurso');
  });

  // --- AC-159-07: WhatsAppVariables does not have position field ---
  it('AC-159-07: WhatsAppVariables does not have position field', () => {
    const interfaceMatch = whatsappUtilsSource.match(/interface WhatsAppVariables \{[\s\S]*?\}/);
    expect(interfaceMatch).toBeTruthy();
    expect(interfaceMatch![0]).not.toContain('position');
  });

  // --- AC-159-08: resolveTemplate does not replace {posicao} ---
  it('AC-159-08: resolveTemplate does not replace {posicao}', () => {
    const vars: WhatsAppVariables = {
      speakerName: 'Test',
      date: '2026-03-01',
      topic: 'Faith',
      collection: 'Topics',
      link: 'http://example.com',
    };
    const result = resolveTemplate('Hello {posicao} {nome}', vars);
    expect(result).toContain('{posicao}');
    expect(result).toContain('Test');
  });

  it('AC-159-08: resolveTemplate source does not contain posicao replacement', () => {
    const resolveBlock = whatsappUtilsSource.match(/function resolveTemplate[\s\S]*?^}/m);
    expect(resolveBlock).toBeTruthy();
    expect(resolveBlock![0]).not.toContain('posicao');
  });

  // --- AC-159-09: buildWhatsAppUrl uses getDefaultSpeechTemplate ---
  it('AC-159-09: buildWhatsAppUrl has position parameter', () => {
    expect(whatsappUtilsSource).toMatch(/function buildWhatsAppUrl[\s\S]*?position: 1 \| 2 \| 3/);
  });

  it('AC-159-09: buildWhatsAppUrl uses getDefaultSpeechTemplate for fallback', () => {
    expect(whatsappUtilsSource).toContain('getDefaultSpeechTemplate(language, position)');
  });

  it('AC-159-09: buildWhatsAppUrl returns correct URL with position-based default', () => {
    const vars: WhatsAppVariables = {
      speakerName: 'Maria',
      date: '01 MAR',
      topic: 'Fe',
      collection: 'Temas',
      link: '',
    };
    const url = buildWhatsAppUrl('+5511999999999', '', '', vars, 'pt-BR', 2);
    expect(url).toContain('wa.me/5511999999999');
    expect(url).toContain('segundo%20discurso');
  });
});


// ============================================================================
// whatsapp.ts Re-exports
// ============================================================================

describe('whatsapp.ts Re-exports', () => {

  it('getDefaultSpeechTemplate is re-exported', () => {
    expect(whatsappSource).toContain('getDefaultSpeechTemplate');
  });

  it('old default template constants are NOT re-exported', () => {
    expect(whatsappSource).not.toContain('DEFAULT_TEMPLATE_PT_BR');
    expect(whatsappSource).not.toContain('DEFAULT_TEMPLATE_EN');
    expect(whatsappSource).not.toContain('DEFAULT_TEMPLATE_ES');
  });

  it('getDefaultTemplate is NOT re-exported', () => {
    expect(whatsappSource).not.toContain('getDefaultTemplate');
  });

  it('resolveTemplate, buildWhatsAppUrl, buildWhatsAppConversationUrl remain re-exported', () => {
    expect(whatsappSource).toContain('resolveTemplate');
    expect(whatsappSource).toContain('buildWhatsAppUrl');
    expect(whatsappSource).toContain('buildWhatsAppConversationUrl');
  });
});


// ============================================================================
// InviteManagementSection (AC-159-10, AC-159-11)
// ============================================================================

describe('InviteManagementSection', () => {

  // --- AC-159-10: Ward query selects 3 speech template columns ---
  it('AC-159-10: ward query selects whatsapp_template_speech_1', () => {
    expect(inviteManagementSource).toContain('whatsapp_template_speech_1');
  });

  it('AC-159-10: ward query selects whatsapp_template_speech_2', () => {
    expect(inviteManagementSource).toContain('whatsapp_template_speech_2');
  });

  it('AC-159-10: ward query selects whatsapp_template_speech_3', () => {
    expect(inviteManagementSource).toContain('whatsapp_template_speech_3');
  });

  it('AC-159-10: ward query does NOT select old whatsapp_template column', () => {
    const selectMatch = inviteManagementSource.match(/\.select\(['"]([^'"]+)['"]\)/);
    expect(selectMatch).toBeTruthy();
    const selectCols = selectMatch![1];
    // Should not contain standalone "whatsapp_template" (without _speech_N or _opening or _closing)
    const cols = selectCols.split(',').map((c: string) => c.trim());
    const oldCol = cols.find(
      (c: string) => c === 'whatsapp_template'
    );
    expect(oldCol).toBeUndefined();
  });

  // --- AC-159-11: Correct template selected based on speech.position ---
  it('AC-159-11: speech template selection uses position-based mapping', () => {
    expect(inviteManagementSource).toContain('speechTemplateMap');
    expect(inviteManagementSource).toContain('whatsapp_template_speech_1');
    expect(inviteManagementSource).toContain('whatsapp_template_speech_2');
    expect(inviteManagementSource).toContain('whatsapp_template_speech_3');
  });

  it('AC-159-11: position passed to buildWhatsAppUrl as parameter', () => {
    expect(inviteManagementSource).toContain('speech.position as 1 | 2 | 3');
  });

  it('AC-159-11: position NOT included in WhatsAppVariables object', () => {
    // The old code had: position: `${speech.position}\u00BA`
    // Check that this pattern is no longer in the speech template section
    const speechBranch = inviteManagementSource.match(/speechTemplateMap[\s\S]*?buildWhatsAppUrl[\s\S]*?\);/);
    expect(speechBranch).toBeTruthy();
    expect(speechBranch![0]).not.toContain("position: `");
  });
});


// ============================================================================
// Settings WhatsApp Screen (AC-159-12 through AC-159-16)
// ============================================================================

describe('Settings WhatsApp Screen', () => {

  // --- AC-159-12: 5-tab segmented control ---
  it('AC-159-12: ActiveTab type includes speech_1, speech_2, speech_3', () => {
    expect(whatsappSettingsSource).toContain("'speech_1'");
    expect(whatsappSettingsSource).toContain("'speech_2'");
    expect(whatsappSettingsSource).toContain("'speech_3'");
  });

  it('AC-159-12: ActiveTab type does NOT include old speech value', () => {
    // The type should not have just 'speech' as a value
    const typeMatch = whatsappSettingsSource.match(/type ActiveTab = [^;]+;/);
    expect(typeMatch).toBeTruthy();
    // Should contain speech_1 but not standalone 'speech'
    expect(typeMatch![0]).toContain("'speech_1'");
    expect(typeMatch![0]).not.toMatch(/'speech'(?!_)/);
  });

  it('AC-159-12: segmented control always shown (not gated by managePrayers)', () => {
    // The segmented control View should not be wrapped in {managePrayers && ...}
    // Instead, the tabs array should be conditionally built
    expect(whatsappSettingsSource).toContain('managePrayers ? [...speechTabs, ...prayerTabs] : speechTabs');
  });

  it('AC-159-12: default active tab is speech_1', () => {
    expect(whatsappSettingsSource).toContain("useState<ActiveTab>('speech_1')");
  });

  it('AC-159-12: tab labels use t(whatsapp.tabSpeech1/2/3)', () => {
    expect(whatsappSettingsSource).toContain("t('whatsapp.tabSpeech1')");
    expect(whatsappSettingsSource).toContain("t('whatsapp.tabSpeech2')");
    expect(whatsappSettingsSource).toContain("t('whatsapp.tabSpeech3')");
  });

  // --- AC-159-13: Each speech tab edits its own column ---
  it('AC-159-13: 3 separate save mutations exist', () => {
    expect(whatsappSettingsSource).toContain('saveSpeech1Mutation');
    expect(whatsappSettingsSource).toContain('saveSpeech2Mutation');
    expect(whatsappSettingsSource).toContain('saveSpeech3Mutation');
  });

  it('AC-159-13: each mutation updates its own column', () => {
    expect(whatsappSettingsSource).toContain('whatsapp_template_speech_1: newTemplate');
    expect(whatsappSettingsSource).toContain('whatsapp_template_speech_2: newTemplate');
    expect(whatsappSettingsSource).toContain('whatsapp_template_speech_3: newTemplate');
  });

  // --- AC-159-14: Ward query fetches 3 speech columns ---
  it('AC-159-14: ward query fetches 3 speech template columns', () => {
    const selectMatch = whatsappSettingsSource.match(/\.select\(['"]([^'"]+)['"]\)/);
    expect(selectMatch).toBeTruthy();
    expect(selectMatch![1]).toContain('whatsapp_template_speech_1');
    expect(selectMatch![1]).toContain('whatsapp_template_speech_2');
    expect(selectMatch![1]).toContain('whatsapp_template_speech_3');
  });

  it('AC-159-14: ward query does NOT fetch old whatsapp_template', () => {
    const selectMatch = whatsappSettingsSource.match(/\.select\(['"]([^'"]+)['"]\)/);
    expect(selectMatch).toBeTruthy();
    const cols = selectMatch![1].split(',').map((c: string) => c.trim());
    const oldCol = cols.find((c: string) => c === 'whatsapp_template');
    expect(oldCol).toBeUndefined();
  });

  // --- AC-159-15: {posicao} removed from placeholder list ---
  it('AC-159-15: PLACEHOLDER_I18N_KEYS does not contain placeholderPosition', () => {
    expect(whatsappSettingsSource).not.toContain('whatsapp.placeholderPosition');
  });

  it('AC-159-15: PLACEHOLDER_TOKENS does not contain {posicao}', () => {
    const tokensMatch = whatsappSettingsSource.match(/PLACEHOLDER_TOKENS = \[[\s\S]*?\]/);
    expect(tokensMatch).toBeTruthy();
    expect(tokensMatch![0]).not.toContain('{posicao}');
  });

  // --- AC-159-16: SAMPLE_DATA does not contain {posicao} ---
  it('AC-159-16: SAMPLE_DATA does not contain {posicao} key', () => {
    const sampleDataMatch = whatsappSettingsSource.match(/SAMPLE_DATA[^=]*=[\s\S]*?\};/);
    expect(sampleDataMatch).toBeTruthy();
    expect(sampleDataMatch![0]).not.toContain('{posicao}');
  });

  // Additional: 3 separate speech template states
  it('3 separate speech template states exist', () => {
    expect(whatsappSettingsSource).toContain('speech1Template');
    expect(whatsappSettingsSource).toContain('speech2Template');
    expect(whatsappSettingsSource).toContain('speech3Template');
  });

  // Additional: getDefaultSpeechTemplate imported
  it('getDefaultSpeechTemplate imported instead of getDefaultTemplate', () => {
    expect(whatsappSettingsSource).toContain('getDefaultSpeechTemplate');
    expect(whatsappSettingsSource).not.toContain('getDefaultTemplate');
  });

  // Additional: F141 language reset resets all 3 speech initialized flags
  it('F141 language reset resets all 3 speech initialized flags', () => {
    expect(whatsappSettingsSource).toContain('setSpeech1Initialized(false)');
    expect(whatsappSettingsSource).toContain('setSpeech2Initialized(false)');
    expect(whatsappSettingsSource).toContain('setSpeech3Initialized(false)');
  });
});


// ============================================================================
// Edge Function (AC-159-17)
// ============================================================================

describe('Edge Function: register-first-user', () => {

  // --- AC-159-17: Edge function creates ward with 3 speech template columns ---
  it('AC-159-17: ward insert uses whatsapp_template_speech_1', () => {
    expect(edgeFunctionSource).toContain('whatsapp_template_speech_1:');
  });

  it('AC-159-17: ward insert uses whatsapp_template_speech_2', () => {
    expect(edgeFunctionSource).toContain('whatsapp_template_speech_2:');
  });

  it('AC-159-17: ward insert uses whatsapp_template_speech_3', () => {
    expect(edgeFunctionSource).toContain('whatsapp_template_speech_3:');
  });

  it('AC-159-17: ward insert does NOT use old whatsapp_template field', () => {
    const insertBlock = edgeFunctionSource.match(/\.insert\(\{[\s\S]*?\}\)/);
    expect(insertBlock).toBeTruthy();
    const lines = insertBlock![0].split('\n');
    const oldFieldLine = lines.find(
      (l: string) => l.includes('whatsapp_template:') &&
                     !l.includes('whatsapp_template_speech_') &&
                     !l.includes('whatsapp_template_opening_') &&
                     !l.includes('whatsapp_template_closing_')
    );
    expect(oldFieldLine).toBeUndefined();
  });

  it('AC-159-17: templates include ordinal words for pt-BR', () => {
    expect(edgeFunctionSource).toContain('primeiro discurso');
    expect(edgeFunctionSource).toContain('segundo discurso');
    expect(edgeFunctionSource).toContain('terceiro discurso');
  });

  it('AC-159-17: templates include ordinal words for en', () => {
    expect(edgeFunctionSource).toContain('first speech');
    expect(edgeFunctionSource).toContain('second speech');
    expect(edgeFunctionSource).toContain('third speech');
  });

  it('AC-159-17: templates include ordinal words for es', () => {
    expect(edgeFunctionSource).toContain('primer discurso');
    expect(edgeFunctionSource).toContain('tercer discurso');
  });

  it('AC-159-17: no {posicao} placeholder in any template', () => {
    // Extract all template strings from the edge function
    const templateStrings = edgeFunctionSource.match(/defaultSpeech\dTemplate = ['"][\s\S]*?['"];/g) || [];
    for (const tmpl of templateStrings) {
      expect(tmpl).not.toContain('{posicao}');
    }
  });

  it('AC-159-17: templates selected based on language', () => {
    expect(edgeFunctionSource).toContain("case 'en':");
    expect(edgeFunctionSource).toContain("case 'es':");
    expect(edgeFunctionSource).toContain("case 'pt-BR':");
  });
});


// ============================================================================
// i18n (AC-159-18, AC-159-19)
// ============================================================================

describe('i18n Updates', () => {

  // --- AC-159-18: placeholderPosition removed from all locales ---
  it('AC-159-18: placeholderPosition removed from pt-BR', () => {
    expect(ptBR.whatsapp.placeholderPosition).toBeUndefined();
  });

  it('AC-159-18: placeholderPosition removed from en', () => {
    expect(en.whatsapp.placeholderPosition).toBeUndefined();
  });

  it('AC-159-18: placeholderPosition removed from es', () => {
    expect(es.whatsapp.placeholderPosition).toBeUndefined();
  });

  // --- AC-159-19: tabSpeech key removed, tabSpeech1/2/3 added ---
  it('AC-159-19: tabSpeech removed from all locales', () => {
    expect(ptBR.whatsapp.tabSpeech).toBeUndefined();
    expect(en.whatsapp.tabSpeech).toBeUndefined();
    expect(es.whatsapp.tabSpeech).toBeUndefined();
  });

  it('AC-159-19: tabSpeech1 added to all locales with correct values', () => {
    expect(ptBR.whatsapp.tabSpeech1).toBe('1o Disc.');
    expect(en.whatsapp.tabSpeech1).toBe('1st Speech');
    expect(es.whatsapp.tabSpeech1).toBe('1er Disc.');
  });

  it('AC-159-19: tabSpeech2 added to all locales with correct values', () => {
    expect(ptBR.whatsapp.tabSpeech2).toBe('2o Disc.');
    expect(en.whatsapp.tabSpeech2).toBe('2nd Speech');
    expect(es.whatsapp.tabSpeech2).toBe('2o Disc.');
  });

  it('AC-159-19: tabSpeech3 added to all locales with correct values', () => {
    expect(ptBR.whatsapp.tabSpeech3).toBe('3o Disc.');
    expect(en.whatsapp.tabSpeech3).toBe('3rd Speech');
    expect(es.whatsapp.tabSpeech3).toBe('3er Disc.');
  });
});


// ============================================================================
// Language Reset (AC-159-20)
// ============================================================================

describe('Settings Language Reset', () => {

  // --- AC-159-20: Language change resets all 3 speech template columns to null ---
  it('AC-159-20: wardLanguageChangeMutation resets whatsapp_template_speech_1 to null', () => {
    expect(settingsIndexSource).toContain('whatsapp_template_speech_1: null');
  });

  it('AC-159-20: wardLanguageChangeMutation resets whatsapp_template_speech_2 to null', () => {
    expect(settingsIndexSource).toContain('whatsapp_template_speech_2: null');
  });

  it('AC-159-20: wardLanguageChangeMutation resets whatsapp_template_speech_3 to null', () => {
    expect(settingsIndexSource).toContain('whatsapp_template_speech_3: null');
  });

  it('AC-159-20: old whatsapp_template: null is removed from update', () => {
    // The update block should NOT contain standalone "whatsapp_template: null"
    const updateBlock = settingsIndexSource.match(/\.update\(\{[\s\S]*?\}\)/);
    expect(updateBlock).toBeTruthy();
    const lines = updateBlock![0].split('\n');
    const oldFieldLine = lines.find(
      (l: string) => l.includes('whatsapp_template: null') &&
                     !l.includes('whatsapp_template_speech_') &&
                     !l.includes('whatsapp_template_opening_') &&
                     !l.includes('whatsapp_template_closing_')
    );
    expect(oldFieldLine).toBeUndefined();
  });

  it('AC-159-20: prayer template columns also reset to null', () => {
    expect(settingsIndexSource).toContain('whatsapp_template_opening_prayer: null');
    expect(settingsIndexSource).toContain('whatsapp_template_closing_prayer: null');
  });
});
