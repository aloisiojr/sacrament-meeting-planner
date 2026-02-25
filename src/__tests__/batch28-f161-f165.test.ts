/**
 * Batch 28 - Tests for F161-F165 (CRs 234-238).
 *
 * F161 (CR-234): Welcome new families field in agenda
 * F162 (CR-235): PlayIcon circle-play SVG replacement
 * F163 (CR-236): ActorSelector checkbox SVG replacement
 * F164 (CR-237): selectTopic capitalization fix
 * F165 (CR-238): wardLanguage description text in Settings
 *
 * Covers all 32 ACs (AC-161-01 through AC-165-06).
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
const iconsSource = readSrcFile('components/icons/index.tsx');
const actorSelectorSource = readSrcFile('components/ActorSelector.tsx');
const agendaFormSource = readSrcFile('components/AgendaForm.tsx');
const agendaTabSource = readSrcFile('app/(tabs)/agenda.tsx');
const homeTabSource = readSrcFile('app/(tabs)/index.tsx');
const settingsSource = readSrcFile('app/(tabs)/settings/index.tsx');
const databaseTypesSource = readSrcFile('types/database.ts');
const presentationModeSource = readSrcFile('hooks/usePresentationMode.ts');
const migrationSource = readRootFile('supabase/migrations/022_add_welcome_new_families.sql');

// --- i18n locale files ---
const ptBR = JSON.parse(readSrcFile('i18n/locales/pt-BR.json'));
const en = JSON.parse(readSrcFile('i18n/locales/en.json'));
const es = JSON.parse(readSrcFile('i18n/locales/es.json'));


// ============================================================================
// F164: selectTopic Capitalization (CR-237)
// ============================================================================

describe('F164: selectTopic Capitalization (CR-237)', () => {

  // --- AC-164-01: pt-BR selectTopic uses uppercase Tema ---
  it('AC-164-01: pt-BR selectTopic = "Selecionar Tema"', () => {
    expect(ptBR.speeches.selectTopic).toBe('Selecionar Tema');
  });

  // --- AC-164-02: en selectTopic uses uppercase Topic ---
  it('AC-164-02: en selectTopic = "Select Topic"', () => {
    expect(en.speeches.selectTopic).toBe('Select Topic');
  });

  // --- AC-164-03: es selectTopic uses uppercase Tema ---
  it('AC-164-03: es selectTopic = "Seleccionar Tema"', () => {
    expect(es.speeches.selectTopic).toBe('Seleccionar Tema');
  });
});


// ============================================================================
// F165: wardLanguage Description (CR-238)
// ============================================================================

describe('F165: wardLanguage Description (CR-238)', () => {

  // --- AC-165-04: pt-BR wardLanguageDescription exists ---
  it('AC-165-04: pt-BR wardLanguageDescription has correct text', () => {
    expect(ptBR.settings.wardLanguageDescription).toBe(
      'Altera somente o idioma da coleção de temas disponíveis e dos templates de WhatsApp'
    );
  });

  // --- AC-165-05: en wardLanguageDescription exists ---
  it('AC-165-05: en wardLanguageDescription has correct text', () => {
    expect(en.settings.wardLanguageDescription).toBe(
      'Only changes the language of available topic collections and WhatsApp templates'
    );
  });

  // --- AC-165-06: es wardLanguageDescription exists ---
  it('AC-165-06: es wardLanguageDescription has correct text', () => {
    expect(es.settings.wardLanguageDescription).toBe(
      'Solo cambia el idioma de las colecciones de temas disponibles y los modelos de WhatsApp'
    );
  });

  // --- AC-165-01: Description text rendered below wardLanguage label ---
  it('AC-165-01: description text rendered below wardLanguage label in settings', () => {
    expect(settingsSource).toContain("t('settings.wardLanguageDescription')");
    // Description should have fontSize: 12
    expect(settingsSource).toContain('fontSize: 12');
    // Description should have marginTop: 2
    expect(settingsSource).toContain('marginTop: 2');
  });

  // --- AC-165-02: Ward language item remains tappable (opens modal) ---
  it('AC-165-02: ward language item uses Pressable with onPress to open modal', () => {
    // The wardLanguage section uses Pressable (not SettingsItem)
    // and opens the modal on press
    const wardLangSection = settingsSource.match(
      /hasPermission\('settings:language'\)[\s\S]*?setWardLanguageModalVisible\(true\)/
    );
    expect(wardLangSection).toBeTruthy();
    expect(wardLangSection![0]).toContain('Pressable');
    expect(wardLangSection![0]).toContain('setWardLanguageModalVisible(true)');
  });

  // --- AC-165-03: Value and chevron still shown on right side ---
  it('AC-165-03: value and ChevronRightIcon displayed on right side', () => {
    // The section containing wardLanguage should have itemRight, itemValue, and ChevronRightIcon
    const wardLangBlock = settingsSource.match(
      /t\('settings\.wardLanguage'\)[\s\S]*?ChevronRightIcon/
    );
    expect(wardLangBlock).toBeTruthy();
    expect(wardLangBlock![0]).toContain('styles.itemRight');
    expect(wardLangBlock![0]).toContain('styles.itemValue');
    expect(wardLangBlock![0]).toContain('ChevronRightIcon');
    expect(wardLangBlock![0]).toContain('LANGUAGE_LABELS');
  });
});


// ============================================================================
// F163: Checkbox SVG (CR-236)
// ============================================================================

describe('F163: ActorSelector Checkbox SVG (CR-236)', () => {

  // --- AC-163-01: SquareIcon SVG component exists in icons module ---
  it('AC-163-01: SquareIcon export exists in icons module', () => {
    expect(iconsSource).toContain('export const SquareIcon');
  });

  it('AC-163-01: SquareIcon renders square path', () => {
    const squareBlock = iconsSource.match(/export const SquareIcon[\s\S]*?(?=export const|$)/);
    expect(squareBlock).toBeTruthy();
    expect(squareBlock![0]).toContain('M21 3H3v18h18V3z');
    expect(squareBlock![0]).toContain("fill=\"none\"");
    expect(squareBlock![0]).toContain('strokeWidth={2}');
  });

  // --- AC-163-02: CheckSquareIcon SVG component exists in icons module ---
  it('AC-163-02: CheckSquareIcon export exists in icons module', () => {
    expect(iconsSource).toContain('export const CheckSquareIcon');
  });

  it('AC-163-02: CheckSquareIcon renders square + checkmark paths', () => {
    const checkSquareBlock = iconsSource.match(/export const CheckSquareIcon[\s\S]*?(?=export const|$)/);
    expect(checkSquareBlock).toBeTruthy();
    expect(checkSquareBlock![0]).toContain('M21 3H3v18h18V3z');
    expect(checkSquareBlock![0]).toContain('m9 12 2 2 4-4');
    expect(checkSquareBlock![0]).toContain("fill=\"none\"");
    expect(checkSquareBlock![0]).toContain('strokeWidth={2}');
  });

  // --- AC-163-03: ActorSelector uses SVG icons instead of Unicode ---
  it('AC-163-03: ActorSelector imports CheckSquareIcon and SquareIcon', () => {
    expect(actorSelectorSource).toContain('CheckSquareIcon');
    expect(actorSelectorSource).toContain('SquareIcon');
    expect(actorSelectorSource).toMatch(/import.*CheckSquareIcon.*from.*'\.\/icons'/);
  });

  it('AC-163-03: ActorSelector does not use Unicode checkbox characters', () => {
    expect(actorSelectorSource).not.toContain('\u2611');
    expect(actorSelectorSource).not.toContain('\u2610');
    expect(actorSelectorSource).not.toContain('\\u2611');
    expect(actorSelectorSource).not.toContain('\\u2610');
  });

  // --- AC-163-04: Selected checkbox uses primary color ---
  it('AC-163-04: selected checkbox uses CheckSquareIcon with colors.primary', () => {
    expect(actorSelectorSource).toContain('<CheckSquareIcon size={20} color={colors.primary} />');
  });

  // --- AC-163-05: Unselected checkbox uses textSecondary color ---
  it('AC-163-05: unselected checkbox uses SquareIcon with colors.textSecondary', () => {
    expect(actorSelectorSource).toContain('<SquareIcon size={20} color={colors.textSecondary} />');
  });

  // --- AC-163-06: Checkbox layout spacing preserved (marginRight: 8) ---
  it('AC-163-06: checkbox icon wrapper has marginRight: 8', () => {
    const checkboxBlock = actorSelectorSource.match(
      /CheckSquareIcon[\s\S]*?SquareIcon/
    );
    expect(checkboxBlock).toBeTruthy();
    // The View wrapper around the icons has marginRight: 8
    expect(actorSelectorSource).toContain('marginRight: 8');
  });

  // --- AC-163-07: Single-select mode unchanged ---
  it('AC-163-07: checkbox only shown in multiSelect mode', () => {
    // The multiSelect guard should wrap the checkbox rendering
    const checkboxSection = actorSelectorSource.match(
      /\{multiSelect && \([\s\S]*?CheckSquareIcon[\s\S]*?SquareIcon[\s\S]*?\)\}/
    );
    expect(checkboxSection).toBeTruthy();
  });
});


// ============================================================================
// F162: PlayIcon circle-play (CR-235)
// ============================================================================

describe('F162: PlayIcon circle-play (CR-235)', () => {

  // --- AC-162-01: PlayIcon uses Lucide circle-play SVG path ---
  it('AC-162-01: PlayIcon renders Circle element with cx=12, cy=12, r=10', () => {
    const playBlock = iconsSource.match(/export const PlayIcon[\s\S]*?(?=export const|$)/);
    expect(playBlock).toBeTruthy();
    expect(playBlock![0]).toContain('cx={12}');
    expect(playBlock![0]).toContain('cy={12}');
    expect(playBlock![0]).toContain('r={10}');
  });

  it('AC-162-01: PlayIcon renders inner play triangle path', () => {
    const playBlock = iconsSource.match(/export const PlayIcon[\s\S]*?(?=export const|$)/);
    expect(playBlock).toBeTruthy();
    expect(playBlock![0]).toContain('m10 8 6 4-6 4V8z');
  });

  it('AC-162-01: PlayIcon comment references circle-play', () => {
    expect(iconsSource).toContain('Lucide: circle-play');
  });

  // --- AC-162-02: Agenda tab play icon no longer has circular border container ---
  it('AC-162-02: agenda play button has no circular border styling', () => {
    // The old styling (borderWidth: 1.5, borderRadius: 15, width: 30, height: 30) should be gone
    const playSection = agendaTabSource.match(
      /PlayIcon[\s\S]{0,200}/
    );
    expect(playSection).toBeTruthy();
    // No border properties in the immediate vicinity of PlayIcon in agenda
    expect(agendaTabSource).not.toMatch(/borderRadius:\s*15[\s\S]*?PlayIcon/);
    expect(agendaTabSource).not.toMatch(/borderWidth:\s*1\.5[\s\S]*?PlayIcon/);
  });

  it('AC-162-02: PlayIcon size is 24 in agenda tab', () => {
    expect(agendaTabSource).toContain('<PlayIcon size={24}');
  });

  // --- AC-162-03: Home tab play icon unchanged in usage ---
  it('AC-162-03: home tab PlayIcon uses size={20} and colors.onPrimary', () => {
    expect(homeTabSource).toContain('<PlayIcon size={20} color={colors.onPrimary} />');
  });

  // --- AC-162-04: PlayIcon maintains stroke-based rendering ---
  it('AC-162-04: PlayIcon uses stroke-based rendering (fill="none") for all elements', () => {
    const playBlock = iconsSource.match(/export const PlayIcon[\s\S]*?(?=export const|$)/);
    expect(playBlock).toBeTruthy();
    // Check that fill="none" appears for both Circle and Path
    const fillNoneCount = (playBlock![0].match(/fill="none"/g) || []).length;
    // Should have at least 2 fill="none" (Circle + Path) plus the Svg fill="none"
    expect(fillNoneCount).toBeGreaterThanOrEqual(2);
    // Should use stroke={color}
    const strokeCount = (playBlock![0].match(/stroke=\{color\}/g) || []).length;
    expect(strokeCount).toBeGreaterThanOrEqual(2);
    // Should use strokeWidth=2
    expect(playBlock![0]).toContain('strokeWidth={2}');
  });

  // --- AC-162-05: PlayIcon consumers not modified (same props) ---
  it('AC-162-05: PlayIcon export name unchanged', () => {
    expect(iconsSource).toContain('export const PlayIcon');
  });

  it('AC-162-05: both consumers import PlayIcon', () => {
    expect(agendaTabSource).toMatch(/import.*PlayIcon.*from/);
    expect(homeTabSource).toMatch(/import.*PlayIcon.*from/);
  });
});


// ============================================================================
// F161: Welcome New Families (CR-234)
// ============================================================================

describe('F161: Welcome New Families (CR-234)', () => {

  // --- AC-161-01: Migration adds welcome_new_families column ---
  it('AC-161-01: migration file adds welcome_new_families column', () => {
    expect(migrationSource).toContain('ADD COLUMN welcome_new_families TEXT');
  });

  it('AC-161-01: migration column is nullable (DEFAULT NULL)', () => {
    expect(migrationSource).toContain('DEFAULT NULL');
  });

  it('AC-161-01: migration targets sunday_agendas table', () => {
    expect(migrationSource).toContain('ALTER TABLE sunday_agendas');
  });

  it('AC-161-01: migration has no NOT NULL constraint', () => {
    expect(migrationSource).not.toContain('NOT NULL');
  });

  // --- AC-161-02: SundayAgenda interface has welcome_new_families field ---
  it('AC-161-02: SundayAgenda interface has welcome_new_families: string | null', () => {
    expect(databaseTypesSource).toContain('welcome_new_families: string | null');
  });

  it('AC-161-02: welcome_new_families is between recognized_names and announcements', () => {
    const recognizedIdx = databaseTypesSource.indexOf('recognized_names: string[] | null');
    const welcomeIdx = databaseTypesSource.indexOf('welcome_new_families: string | null');
    const announcementsIdx = databaseTypesSource.indexOf('announcements: string | null');
    expect(recognizedIdx).toBeGreaterThan(-1);
    expect(welcomeIdx).toBeGreaterThan(-1);
    expect(announcementsIdx).toBeGreaterThan(-1);
    expect(welcomeIdx).toBeGreaterThan(recognizedIdx);
    expect(welcomeIdx).toBeLessThan(announcementsIdx);
  });

  // --- AC-161-03: FieldRow appears between Recognizing and Announcements ---
  it('AC-161-03: AgendaForm has welcomeNewFamilies FieldRow', () => {
    expect(agendaFormSource).toContain("t('agenda.welcomeNewFamilies')");
  });

  it('AC-161-03: welcomeNewFamilies FieldRow is between recognizing and announcements', () => {
    const recognizingIdx = agendaFormSource.indexOf("t('agenda.recognizing')");
    const welcomeIdx = agendaFormSource.indexOf("t('agenda.welcomeNewFamilies')");
    const announcementsIdx = agendaFormSource.indexOf("t('agenda.announcements')");
    expect(recognizingIdx).toBeGreaterThan(-1);
    expect(welcomeIdx).toBeGreaterThan(-1);
    expect(announcementsIdx).toBeGreaterThan(-1);
    expect(welcomeIdx).toBeGreaterThan(recognizingIdx);
    expect(welcomeIdx).toBeLessThan(announcementsIdx);
  });

  // --- AC-161-04: Field auto-saves via updateField ---
  it('AC-161-04: welcome_new_families field uses updateField for auto-save', () => {
    expect(agendaFormSource).toContain("updateField('welcome_new_families'");
  });

  it('AC-161-04: welcome_new_families field uses DebouncedTextInput', () => {
    const fieldRow = agendaFormSource.match(
      /welcomeNewFamilies[\s\S]*?DebouncedTextInput[\s\S]*?<\/FieldRow>/
    );
    expect(fieldRow).toBeTruthy();
    expect(fieldRow![0]).toContain('DebouncedTextInput');
  });

  // --- AC-161-05: Field is disabled for observer ---
  it('AC-161-05: welcome_new_families field has editable={!isObserver}', () => {
    const fieldBlock = agendaFormSource.match(
      /welcome_new_families[\s\S]*?editable=\{!isObserver\}/
    );
    expect(fieldBlock).toBeTruthy();
  });

  // --- AC-161-06: Null value coalesced to empty string ---
  it('AC-161-06: welcome_new_families value uses null coalescing', () => {
    expect(agendaFormSource).toContain("agenda.welcome_new_families ?? ''");
  });

  // --- AC-161-07: Appears in presentation Welcome card when non-empty ---
  it('AC-161-07: presentation mode adds welcome_new_families field when truthy', () => {
    expect(presentationModeSource).toContain("agenda?.welcome_new_families");
    expect(presentationModeSource).toContain("t('agenda.welcomeNewFamilies')");
  });

  it('AC-161-07: presentation field has type multiline', () => {
    const welcomeBlock = presentationModeSource.match(
      /welcome_new_families[\s\S]*?type:\s*'multiline'/
    );
    expect(welcomeBlock).toBeTruthy();
  });

  it('AC-161-07: presentation welcome_new_families is after recognized_names and before announcements', () => {
    const recognizedIdx = presentationModeSource.indexOf('recognized_names');
    const welcomeIdx = presentationModeSource.indexOf('welcome_new_families');
    const announcementsIdx = presentationModeSource.indexOf("agenda?.announcements");
    expect(recognizedIdx).toBeGreaterThan(-1);
    expect(welcomeIdx).toBeGreaterThan(-1);
    expect(announcementsIdx).toBeGreaterThan(-1);
    expect(welcomeIdx).toBeGreaterThan(recognizedIdx);
    expect(welcomeIdx).toBeLessThan(announcementsIdx);
  });

  // --- AC-161-08: Omitted from presentation when empty/null ---
  it('AC-161-08: welcome_new_families uses conditional check (if statement)', () => {
    // The field is only added when truthy (if (agenda?.welcome_new_families))
    expect(presentationModeSource).toContain('if (agenda?.welcome_new_families)');
  });

  // --- AC-161-09: pt-BR welcomeNewFamilies i18n key ---
  it('AC-161-09: pt-BR agenda.welcomeNewFamilies has correct text', () => {
    expect(ptBR.agenda.welcomeNewFamilies).toBe('Boas-vindas a Famílias Recém-chegadas');
  });

  // --- AC-161-10: en welcomeNewFamilies i18n key ---
  it('AC-161-10: en agenda.welcomeNewFamilies has correct text', () => {
    expect(en.agenda.welcomeNewFamilies).toBe('Welcome New Families');
  });

  // --- AC-161-11: es welcomeNewFamilies i18n key ---
  it('AC-161-11: es agenda.welcomeNewFamilies has correct text', () => {
    expect(es.agenda.welcomeNewFamilies).toBe('Bienvenida a Familias Recién Llegadas');
  });
});


// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {

  // --- EC-161-01: Welcome new families field uses multiline ---
  it('EC-161-01: welcome_new_families DebouncedTextInput has multiline prop', () => {
    const fieldBlock = agendaFormSource.match(
      /welcome_new_families[\s\S]*?multiline/
    );
    expect(fieldBlock).toBeTruthy();
  });

  // --- EC-161-02: Welcome section renders for all meeting types ---
  it('EC-161-02: welcome_new_families FieldRow is in the welcome section (not gated by meeting type)', () => {
    // The FieldRow for welcomeNewFamilies should not be wrapped in a meeting type conditional
    // It appears in the same section as recognizing and announcements, not guarded by meetingType
    const welcomeIdx = agendaFormSource.indexOf("t('agenda.welcomeNewFamilies')");
    expect(welcomeIdx).toBeGreaterThan(-1);
    // Extract the block around welcomeNewFamilies (500 chars before)
    const blockBefore = agendaFormSource.substring(Math.max(0, welcomeIdx - 500), welcomeIdx);
    // There should be no meetingType conditional guard in the vicinity
    expect(blockBefore).not.toMatch(/meetingType\s*===\s*['"`]/);
    expect(blockBefore).not.toMatch(/meetingType\s*!==\s*['"`]/);
  });

  // --- EC-162-01: PlayIcon at various sizes ---
  it('EC-162-01/EC-162-02: PlayIcon accepts size prop via IconProps', () => {
    const playBlock = iconsSource.match(/export const PlayIcon[\s\S]*?(?=export const|$)/);
    expect(playBlock).toBeTruthy();
    expect(playBlock![0]).toContain('size = 24');
    expect(playBlock![0]).toContain('width={size}');
    expect(playBlock![0]).toContain('height={size}');
  });

  // --- EC-163-01/EC-163-02: Checkbox icons work with theme colors ---
  it('EC-163-01/EC-163-02: checkbox icons use colors.primary and colors.textSecondary', () => {
    expect(actorSelectorSource).toContain('color={colors.primary}');
    expect(actorSelectorSource).toContain('color={colors.textSecondary}');
  });

  // --- EC-165-01: Description text has flex: 1 for proper wrapping ---
  it('EC-165-01: wardLanguage description wrapper has flex: 1 for text wrapping', () => {
    const wardLangBlock = settingsSource.match(
      /wardLanguage[\s\S]*?flex:\s*1[\s\S]*?wardLanguageDescription/
    );
    expect(wardLangBlock).toBeTruthy();
  });

  // --- EC-165-02: Observer does not see wardLanguage (permission guard) ---
  it('EC-165-02: wardLanguage item gated by hasPermission settings:language', () => {
    expect(settingsSource).toContain("hasPermission('settings:language')");
  });
});
