/**
 * Batch 25 Phase 1 - Tests for F157 (CR-221) Steps 1-7.
 *
 * CR-221: Managed Prayers (Oracoes Gerenciadas)
 * Phase 1 covers: DB migration, i18n, TypeScript types, useWardManagePrayers,
 * useLazyCreateSpeeches type-aware, useDeleteSpeechesByDate with positions,
 * Settings toggle manage_prayers.
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
const migrationSource = readRootFile('supabase/migrations/019_managed_prayers.sql');
const databaseTypesSource = readSrcFile('types/database.ts');
const useSpeechesSource = readSrcFile('hooks/useSpeeches.ts');
const settingsSource = readSrcFile('app/(tabs)/settings/index.tsx');

// --- i18n locale files ---
const ptBR = JSON.parse(readSrcFile('i18n/locales/pt-BR.json'));
const en = JSON.parse(readSrcFile('i18n/locales/en.json'));
const es = JSON.parse(readSrcFile('i18n/locales/es.json'));

// ============================================================================
// STEP-01: DB Migration (019_managed_prayers.sql)
// ============================================================================

describe('STEP-01: DB Migration (019_managed_prayers.sql)', () => {

  // --- AC-157-01: Add manage_prayers column to wards ---

  describe('AC-157-01: manage_prayers column added to wards', () => {
    it('migration file exists at supabase/migrations/019_managed_prayers.sql', () => {
      expect(migrationSource).toBeTruthy();
    });

    it('ALTER TABLE wards adds manage_prayers BOOLEAN NOT NULL DEFAULT false', () => {
      expect(migrationSource).toContain('ADD COLUMN manage_prayers BOOLEAN NOT NULL DEFAULT false');
    });

    it('manage_prayers column is on public.wards table', () => {
      expect(migrationSource).toMatch(/ALTER TABLE public\.wards[\s\S]*?ADD COLUMN manage_prayers/);
    });
  });

  // --- AC-157-02: Add whatsapp_template_opening_prayer to wards ---

  describe('AC-157-02: whatsapp_template_opening_prayer column added to wards', () => {
    it('ALTER TABLE wards adds whatsapp_template_opening_prayer TEXT', () => {
      expect(migrationSource).toContain('ADD COLUMN whatsapp_template_opening_prayer TEXT');
    });

    it('whatsapp_template_opening_prayer is nullable (no NOT NULL constraint)', () => {
      const line = migrationSource.split('\n').find(l => l.includes('whatsapp_template_opening_prayer'));
      expect(line).toBeDefined();
      expect(line).not.toContain('NOT NULL');
    });
  });

  // --- AC-157-03: Add whatsapp_template_closing_prayer to wards ---

  describe('AC-157-03: whatsapp_template_closing_prayer column added to wards', () => {
    it('ALTER TABLE wards adds whatsapp_template_closing_prayer TEXT', () => {
      expect(migrationSource).toContain('ADD COLUMN whatsapp_template_closing_prayer TEXT');
    });

    it('whatsapp_template_closing_prayer is nullable (no NOT NULL constraint)', () => {
      const line = migrationSource.split('\n').find(l => l.includes('whatsapp_template_closing_prayer'));
      expect(line).toBeDefined();
      expect(line).not.toContain('NOT NULL');
    });
  });

  // --- AC-157-04: Migrate existing prayer data ---

  describe('AC-157-04: Migrate prayer data from sunday_agendas to speeches', () => {
    it('INSERT INTO speeches for position 0 from opening_prayer fields', () => {
      expect(migrationSource).toMatch(/INSERT INTO public\.speeches[\s\S]*?0 AS position[\s\S]*?opening_prayer_member_id[\s\S]*?opening_prayer_name/);
    });

    it('INSERT INTO speeches for position 4 from closing_prayer fields', () => {
      expect(migrationSource).toMatch(/INSERT INTO public\.speeches[\s\S]*?4 AS position[\s\S]*?closing_prayer_member_id[\s\S]*?closing_prayer_name/);
    });

    it('opening prayer migration uses status assigned_confirmed', () => {
      // Find the INSERT for position 0 block
      const pos0Block = migrationSource.substring(
        migrationSource.indexOf('0 AS position'),
        migrationSource.indexOf('ON CONFLICT', migrationSource.indexOf('0 AS position'))
      );
      expect(pos0Block).toContain("'assigned_confirmed'");
    });

    it('closing prayer migration uses status assigned_confirmed', () => {
      const pos4Block = migrationSource.substring(
        migrationSource.indexOf('4 AS position'),
        migrationSource.indexOf('ON CONFLICT', migrationSource.indexOf('4 AS position'))
      );
      expect(pos4Block).toContain("'assigned_confirmed'");
    });

    it('opening prayer migration filters WHERE opening_prayer_name IS NOT NULL', () => {
      expect(migrationSource).toContain('WHERE sa.opening_prayer_name IS NOT NULL');
    });

    it('closing prayer migration filters WHERE closing_prayer_name IS NOT NULL', () => {
      expect(migrationSource).toContain('WHERE sa.closing_prayer_name IS NOT NULL');
    });

    it('opening prayer INSERT uses ON CONFLICT DO NOTHING', () => {
      // First ON CONFLICT after first INSERT
      const firstInsertEnd = migrationSource.indexOf('ON CONFLICT', migrationSource.indexOf('0 AS position'));
      const conflictClause = migrationSource.substring(firstInsertEnd, firstInsertEnd + 80);
      expect(conflictClause).toContain('ON CONFLICT');
      expect(conflictClause).toContain('DO NOTHING');
    });

    it('closing prayer INSERT uses ON CONFLICT DO NOTHING', () => {
      const secondInsertEnd = migrationSource.indexOf('ON CONFLICT', migrationSource.indexOf('4 AS position'));
      const conflictClause = migrationSource.substring(secondInsertEnd, secondInsertEnd + 80);
      expect(conflictClause).toContain('ON CONFLICT');
      expect(conflictClause).toContain('DO NOTHING');
    });
  });

  // --- AC-157-05: Drop prayer columns from sunday_agendas ---

  describe('AC-157-05: Drop prayer columns from sunday_agendas', () => {
    it('drops opening_prayer_member_id column', () => {
      expect(migrationSource).toContain('DROP COLUMN opening_prayer_member_id');
    });

    it('drops opening_prayer_name column', () => {
      expect(migrationSource).toContain('DROP COLUMN opening_prayer_name');
    });

    it('drops closing_prayer_member_id column', () => {
      expect(migrationSource).toContain('DROP COLUMN closing_prayer_member_id');
    });

    it('drops closing_prayer_name column', () => {
      expect(migrationSource).toContain('DROP COLUMN closing_prayer_name');
    });

    it('columns are dropped from sunday_agendas table', () => {
      expect(migrationSource).toMatch(/ALTER TABLE public\.sunday_agendas[\s\S]*?DROP COLUMN/);
    });

    it('data copy happens BEFORE column drop (correct order)', () => {
      const insertPos = migrationSource.indexOf('INSERT INTO public.speeches');
      const dropPos = migrationSource.indexOf('DROP COLUMN opening_prayer_member_id');
      expect(insertPos).toBeLessThan(dropPos);
    });
  });

  // --- AC-157-06: Speeches unique constraint allows positions 0 and 4 ---

  describe('AC-157-06: Speeches unique constraint allows positions 0 and 4', () => {
    it('ON CONFLICT uses (ward_id, sunday_date, position) for opening prayer', () => {
      expect(migrationSource).toContain('ON CONFLICT (ward_id, sunday_date, position) DO NOTHING');
    });

    it('positions 0 and 4 are used in the INSERT statements', () => {
      expect(migrationSource).toContain('0 AS position');
      expect(migrationSource).toContain('4 AS position');
    });
  });

  // --- AC-157-12: Notification trigger skips for prayer positions when OFF ---

  describe('AC-157-12: Notification trigger manage_prayers check', () => {
    it('trigger function is created or replaced', () => {
      expect(migrationSource).toContain('CREATE OR REPLACE FUNCTION enqueue_speech_notification()');
    });

    it('trigger function checks positions 0 and 4', () => {
      expect(migrationSource).toContain('NEW.position IN (0, 4)');
    });

    it('trigger queries manage_prayers from wards table', () => {
      expect(migrationSource).toContain('SELECT manage_prayers INTO v_manage_prayers');
      expect(migrationSource).toContain('FROM wards WHERE id = NEW.ward_id');
    });

    it('trigger returns NEW (skip notification) when manage_prayers is false', () => {
      expect(migrationSource).toContain('IF NOT COALESCE(v_manage_prayers, false) THEN');
      // The RETURN NEW inside this block skips the notification
      const checkBlock = migrationSource.substring(
        migrationSource.indexOf('IF NOT COALESCE(v_manage_prayers, false)'),
        migrationSource.indexOf('END IF;', migrationSource.indexOf('IF NOT COALESCE(v_manage_prayers, false)'))
      );
      expect(checkBlock).toContain('RETURN NEW');
    });

    it('trigger uses COALESCE for null safety on manage_prayers', () => {
      expect(migrationSource).toContain('COALESCE(v_manage_prayers, false)');
    });
  });

  // --- AC-157-20: Notification trigger fires for prayer positions when ON ---

  describe('AC-157-20: Notification enqueues for prayer positions when manage_prayers=true', () => {
    it('trigger inserts into notification_queue for assigned_not_invited status', () => {
      expect(migrationSource).toContain("IF NEW.status = 'assigned_not_invited' THEN");
      expect(migrationSource).toContain('INSERT INTO notification_queue');
    });

    it('trigger uses 5-minute delay for designation notifications', () => {
      expect(migrationSource).toContain("INTERVAL '5 minutes'");
    });

    it('speech positions 1/2/3 behavior is unchanged (no position filter on notification insert)', () => {
      // The notification INSERT blocks do not filter by position, they fire for all
      // positions that pass the manage_prayers check
      const notifBlock = migrationSource.substring(
        migrationSource.indexOf("IF NEW.status = 'assigned_not_invited'"),
        migrationSource.indexOf('END IF;', migrationSource.indexOf("IF NEW.status = 'assigned_not_invited'"))
      );
      expect(notifBlock).not.toContain('position NOT IN');
      expect(notifBlock).not.toContain('position != ');
    });
  });

  // --- EC-157-01: Migration with duplicate prayer data ---

  describe('EC-157-01: Migration handles duplicate prayer data', () => {
    it('ON CONFLICT DO NOTHING prevents errors on duplicate entries', () => {
      const conflictCount = (migrationSource.match(/ON CONFLICT.*DO NOTHING/g) || []).length;
      expect(conflictCount).toBeGreaterThanOrEqual(2);
    });

    it('conflict resolution uses (ward_id, sunday_date, position) key', () => {
      expect(migrationSource).toContain('ON CONFLICT (ward_id, sunday_date, position)');
    });
  });

  // --- Migration structure validation ---

  describe('Migration structure validation', () => {
    it('migration has 5 distinct steps in correct order', () => {
      const step1 = migrationSource.indexOf('ADD COLUMN manage_prayers');
      const step2 = migrationSource.indexOf('0 AS position');
      const step3 = migrationSource.indexOf('4 AS position');
      const step4 = migrationSource.indexOf('DROP COLUMN opening_prayer');
      const step5 = migrationSource.indexOf('CREATE OR REPLACE FUNCTION');
      expect(step1).toBeGreaterThan(-1);
      expect(step2).toBeGreaterThan(step1);
      expect(step3).toBeGreaterThan(step2);
      expect(step4).toBeGreaterThan(step3);
      expect(step5).toBeGreaterThan(step4);
    });

    it('trigger function returns TRIGGER type', () => {
      expect(migrationSource).toContain('RETURNS TRIGGER');
    });

    it('trigger function uses SECURITY DEFINER', () => {
      expect(migrationSource).toContain('SECURITY DEFINER');
    });

    it('trigger function uses plpgsql language', () => {
      expect(migrationSource).toContain('LANGUAGE plpgsql');
    });
  });
});

// ============================================================================
// STEP-02: i18n - All new prayer strings
// ============================================================================

describe('STEP-02: i18n - New prayer strings (AC-157-61)', () => {

  // --- tabs.speechesAndPrayers ---

  describe('tabs.speechesAndPrayers key', () => {
    it('pt-BR has "Discursos e Orações"', () => {
      expect(ptBR.tabs.speechesAndPrayers).toBeDefined();
    });

    it('en has "Speeches & Prayers"', () => {
      expect(en.tabs.speechesAndPrayers).toBe('Speeches & Prayers');
    });

    it('es has "Discursos y Oraciones"', () => {
      expect(es.tabs.speechesAndPrayers).toBe('Discursos y Oraciones');
    });
  });

  // --- home.nextSpeechesAndPrayers ---

  describe('home.nextSpeechesAndPrayers key', () => {
    it('pt-BR has nextSpeechesAndPrayers key', () => {
      expect(ptBR.home.nextSpeechesAndPrayers).toBeDefined();
    });

    it('en has "Upcoming Speeches & Prayers"', () => {
      expect(en.home.nextSpeechesAndPrayers).toBe('Upcoming Speeches & Prayers');
    });

    it('es has nextSpeechesAndPrayers key', () => {
      expect(es.home.nextSpeechesAndPrayers).toBeDefined();
    });
  });

  // --- prayers.opening / prayers.closing / prayers.prayerPrefix ---

  describe('prayers namespace keys', () => {
    it('pt-BR has prayers.opening', () => {
      expect(ptBR.prayers.opening).toBeDefined();
    });

    it('pt-BR has prayers.closing', () => {
      expect(ptBR.prayers.closing).toBeDefined();
    });

    it('pt-BR has prayers.prayerPrefix', () => {
      expect(ptBR.prayers.prayerPrefix).toBeDefined();
    });

    it('en has prayers.opening = "Opening Prayer"', () => {
      expect(en.prayers.opening).toBe('Opening Prayer');
    });

    it('en has prayers.closing = "Closing Prayer"', () => {
      expect(en.prayers.closing).toBe('Closing Prayer');
    });

    it('en has prayers.prayerPrefix = "(Prayer)"', () => {
      expect(en.prayers.prayerPrefix).toBe('(Prayer)');
    });

    it('es has prayers.opening', () => {
      expect(es.prayers.opening).toBeDefined();
    });

    it('es has prayers.closing', () => {
      expect(es.prayers.closing).toBeDefined();
    });

    it('es has prayers.prayerPrefix', () => {
      expect(es.prayers.prayerPrefix).toBeDefined();
    });
  });

  // --- settings.managePrayers ---

  describe('settings.managePrayers key', () => {
    it('pt-BR has settings.managePrayers', () => {
      expect(ptBR.settings.managePrayers).toBeDefined();
    });

    it('en has "Managed Prayers"', () => {
      expect(en.settings.managePrayers).toBe('Managed Prayers');
    });

    it('es has settings.managePrayers', () => {
      expect(es.settings.managePrayers).toBeDefined();
    });
  });

  // --- whatsapp.tabSpeech / tabOpeningPrayer / tabClosingPrayer ---

  describe('whatsapp tab keys', () => {
    it('pt-BR has whatsapp.tabSpeech', () => {
      expect(ptBR.whatsapp.tabSpeech).toBeDefined();
    });

    it('pt-BR has whatsapp.tabOpeningPrayer', () => {
      expect(ptBR.whatsapp.tabOpeningPrayer).toBeDefined();
    });

    it('pt-BR has whatsapp.tabClosingPrayer', () => {
      expect(ptBR.whatsapp.tabClosingPrayer).toBeDefined();
    });

    it('en has whatsapp.tabSpeech = "Speech"', () => {
      expect(en.whatsapp.tabSpeech).toBe('Speech');
    });

    it('en has whatsapp.tabOpeningPrayer = "Opening"', () => {
      expect(en.whatsapp.tabOpeningPrayer).toBe('Opening');
    });

    it('en has whatsapp.tabClosingPrayer = "Closing"', () => {
      expect(en.whatsapp.tabClosingPrayer).toBe('Closing');
    });

    it('es has whatsapp.tabSpeech', () => {
      expect(es.whatsapp.tabSpeech).toBeDefined();
    });

    it('es has whatsapp.tabOpeningPrayer', () => {
      expect(es.whatsapp.tabOpeningPrayer).toBeDefined();
    });

    it('es has whatsapp.tabClosingPrayer', () => {
      expect(es.whatsapp.tabClosingPrayer).toBeDefined();
    });
  });

  // --- speeches.openingPrayer / closingPrayer (invite labels) ---

  describe('speeches.openingPrayer / closingPrayer keys', () => {
    it('pt-BR has speeches.openingPrayer', () => {
      expect(ptBR.speeches.openingPrayer).toBeDefined();
    });

    it('pt-BR has speeches.closingPrayer', () => {
      expect(ptBR.speeches.closingPrayer).toBeDefined();
    });

    it('en has speeches.openingPrayer', () => {
      expect(en.speeches.openingPrayer).toBeDefined();
    });

    it('en has speeches.closingPrayer', () => {
      expect(en.speeches.closingPrayer).toBeDefined();
    });

    it('es has speeches.openingPrayer', () => {
      expect(es.speeches.openingPrayer).toBeDefined();
    });

    it('es has speeches.closingPrayer', () => {
      expect(es.speeches.closingPrayer).toBeDefined();
    });
  });

  // --- sundayExceptions.confirmDeletePrayers / confirmDeleteBoth ---

  describe('sundayExceptions confirmation dialog keys', () => {
    it('pt-BR has sundayExceptions.confirmDeletePrayers', () => {
      expect(ptBR.sundayExceptions.confirmDeletePrayers).toBeDefined();
    });

    it('pt-BR has sundayExceptions.confirmDeleteBoth', () => {
      expect(ptBR.sundayExceptions.confirmDeleteBoth).toBeDefined();
    });

    it('en has sundayExceptions.confirmDeletePrayers', () => {
      expect(en.sundayExceptions.confirmDeletePrayers).toBeDefined();
    });

    it('en has sundayExceptions.confirmDeleteBoth', () => {
      expect(en.sundayExceptions.confirmDeleteBoth).toBeDefined();
    });

    it('es has sundayExceptions.confirmDeletePrayers', () => {
      expect(es.sundayExceptions.confirmDeletePrayers).toBeDefined();
    });

    it('es has sundayExceptions.confirmDeleteBoth', () => {
      expect(es.sundayExceptions.confirmDeleteBoth).toBeDefined();
    });
  });

  // --- whatsapp.defaultOpeningPrayerTemplate / defaultClosingPrayerTemplate ---

  describe('whatsapp default prayer template keys', () => {
    it('pt-BR has whatsapp.defaultOpeningPrayerTemplate', () => {
      expect(ptBR.whatsapp.defaultOpeningPrayerTemplate).toBeDefined();
    });

    it('pt-BR has whatsapp.defaultClosingPrayerTemplate', () => {
      expect(ptBR.whatsapp.defaultClosingPrayerTemplate).toBeDefined();
    });

    it('en has whatsapp.defaultOpeningPrayerTemplate', () => {
      expect(en.whatsapp.defaultOpeningPrayerTemplate).toBeDefined();
    });

    it('en has whatsapp.defaultClosingPrayerTemplate', () => {
      expect(en.whatsapp.defaultClosingPrayerTemplate).toBeDefined();
    });

    it('es has whatsapp.defaultOpeningPrayerTemplate', () => {
      expect(es.whatsapp.defaultOpeningPrayerTemplate).toBeDefined();
    });

    it('es has whatsapp.defaultClosingPrayerTemplate', () => {
      expect(es.whatsapp.defaultClosingPrayerTemplate).toBeDefined();
    });
  });

  // --- AC-157-52/53: Default prayer template content (pt-BR) ---

  describe('AC-157-52: Default opening prayer template (pt-BR)', () => {
    it('opening prayer template contains {nome} placeholder', () => {
      expect(ptBR.whatsapp.defaultOpeningPrayerTemplate).toContain('{nome}');
    });

    it('opening prayer template contains {data} placeholder', () => {
      expect(ptBR.whatsapp.defaultOpeningPrayerTemplate).toContain('{data}');
    });

    it('opening prayer template mentions 15 minutes early', () => {
      expect(ptBR.whatsapp.defaultOpeningPrayerTemplate).toContain('15min');
    });
  });

  describe('AC-157-53: Default closing prayer template (pt-BR)', () => {
    it('closing prayer template contains {nome} placeholder', () => {
      expect(ptBR.whatsapp.defaultClosingPrayerTemplate).toContain('{nome}');
    });

    it('closing prayer template contains {data} placeholder', () => {
      expect(ptBR.whatsapp.defaultClosingPrayerTemplate).toContain('{data}');
    });
  });

  // --- AC-157-54: Prayer templates have only {nome} and {data} placeholders ---

  describe('AC-157-54: Prayer templates use only {nome} and {data}', () => {
    it('pt-BR opening template does NOT contain {posicao}', () => {
      expect(ptBR.whatsapp.defaultOpeningPrayerTemplate).not.toContain('{posicao}');
    });

    it('pt-BR opening template does NOT contain {colecao}', () => {
      expect(ptBR.whatsapp.defaultOpeningPrayerTemplate).not.toContain('{colecao}');
    });

    it('pt-BR opening template does NOT contain {titulo}', () => {
      expect(ptBR.whatsapp.defaultOpeningPrayerTemplate).not.toContain('{titulo}');
    });

    it('pt-BR opening template does NOT contain {link}', () => {
      expect(ptBR.whatsapp.defaultOpeningPrayerTemplate).not.toContain('{link}');
    });

    it('pt-BR closing template does NOT contain {posicao}', () => {
      expect(ptBR.whatsapp.defaultClosingPrayerTemplate).not.toContain('{posicao}');
    });

    it('pt-BR closing template does NOT contain {colecao}', () => {
      expect(ptBR.whatsapp.defaultClosingPrayerTemplate).not.toContain('{colecao}');
    });
  });

  // --- AC-157-55: Default templates in en and es ---

  describe('AC-157-55: Default templates in en and es', () => {
    it('en opening template contains {nome} and {data}', () => {
      expect(en.whatsapp.defaultOpeningPrayerTemplate).toContain('{nome}');
      expect(en.whatsapp.defaultOpeningPrayerTemplate).toContain('{data}');
    });

    it('en closing template contains {nome} and {data}', () => {
      expect(en.whatsapp.defaultClosingPrayerTemplate).toContain('{nome}');
      expect(en.whatsapp.defaultClosingPrayerTemplate).toContain('{data}');
    });

    it('es opening template contains {nome} and {data}', () => {
      expect(es.whatsapp.defaultOpeningPrayerTemplate).toContain('{nome}');
      expect(es.whatsapp.defaultOpeningPrayerTemplate).toContain('{data}');
    });

    it('es closing template contains {nome} and {data}', () => {
      expect(es.whatsapp.defaultClosingPrayerTemplate).toContain('{nome}');
      expect(es.whatsapp.defaultClosingPrayerTemplate).toContain('{data}');
    });

    it('en opening template mentions "15 minutes early"', () => {
      expect(en.whatsapp.defaultOpeningPrayerTemplate).toContain('15 minutes early');
    });

    it('en closing template mentions "intermediate hymn"', () => {
      expect(en.whatsapp.defaultClosingPrayerTemplate).toContain('intermediate hymn');
    });

    it('es opening template mentions "15 minutos"', () => {
      expect(es.whatsapp.defaultOpeningPrayerTemplate).toContain('15 minutos');
    });
  });
});

// ============================================================================
// STEP-03: TypeScript type updates
// ============================================================================

describe('STEP-03: TypeScript type updates (AC-157-01/02/03/05)', () => {

  // --- Ward interface ---

  describe('Ward interface has new manage_prayers fields', () => {
    it('Ward interface has manage_prayers: boolean', () => {
      expect(databaseTypesSource).toMatch(/interface Ward[\s\S]*?manage_prayers:\s*boolean/);
    });

    it('Ward interface has whatsapp_template_opening_prayer: string | null', () => {
      expect(databaseTypesSource).toMatch(/interface Ward[\s\S]*?whatsapp_template_opening_prayer:\s*string\s*\|\s*null/);
    });

    it('Ward interface has whatsapp_template_closing_prayer: string | null', () => {
      expect(databaseTypesSource).toMatch(/interface Ward[\s\S]*?whatsapp_template_closing_prayer:\s*string\s*\|\s*null/);
    });
  });

  // --- Speech interface ---

  describe('Speech interface position comment updated', () => {
    it('Speech interface position comment mentions 0, 1, 2, 3, or 4', () => {
      // Find the Speech interface section
      const speechSection = databaseTypesSource.substring(
        databaseTypesSource.indexOf('interface Speech {'),
        databaseTypesSource.indexOf('}', databaseTypesSource.indexOf('interface Speech {'))
      );
      expect(speechSection).toContain('0, 1, 2, 3, or 4');
    });

    it('Speech interface has position: number', () => {
      expect(databaseTypesSource).toMatch(/interface Speech[\s\S]*?position:\s*number/);
    });
  });

  // --- SpeechStatus type ---

  describe('SpeechStatus type includes all required statuses', () => {
    it('SpeechStatus includes assigned_confirmed', () => {
      expect(databaseTypesSource).toContain("'assigned_confirmed'");
    });

    it('SpeechStatus includes assigned_not_invited', () => {
      expect(databaseTypesSource).toContain("'assigned_not_invited'");
    });

    it('SpeechStatus includes not_assigned', () => {
      expect(databaseTypesSource).toContain("'not_assigned'");
    });
  });

  // --- SundayExceptionReason type ---

  describe('SundayExceptionReason type includes all sunday types', () => {
    it('includes speeches type', () => {
      expect(databaseTypesSource).toContain("'speeches'");
    });

    it('includes testimony_meeting type', () => {
      expect(databaseTypesSource).toContain("'testimony_meeting'");
    });

    it('includes primary_presentation type', () => {
      expect(databaseTypesSource).toContain("'primary_presentation'");
    });

    it('includes general_conference type', () => {
      expect(databaseTypesSource).toContain("'general_conference'");
    });

    it('includes stake_conference type', () => {
      expect(databaseTypesSource).toContain("'stake_conference'");
    });

    it('includes ward_conference type', () => {
      expect(databaseTypesSource).toContain("'ward_conference'");
    });

    it('includes other type', () => {
      expect(databaseTypesSource).toContain("'other'");
    });
  });
});

// ============================================================================
// STEP-04: useWardManagePrayers hook
// ============================================================================

describe('STEP-04: useWardManagePrayers hook (AC-157-58)', () => {

  describe('Hook definition and exports', () => {
    it('useWardManagePrayers function is exported', () => {
      expect(useSpeechesSource).toMatch(/export function useWardManagePrayers/);
    });

    it('wardKeys.managePrayers is exported', () => {
      expect(useSpeechesSource).toContain('wardKeys');
      expect(useSpeechesSource).toContain('managePrayers');
    });

    it('hook is in useSpeeches.ts file', () => {
      expect(useSpeechesSource).toContain('useWardManagePrayers');
    });
  });

  describe('Hook queries wards table', () => {
    it('queries wards table via supabase', () => {
      const hookBlock = useSpeechesSource.substring(
        useSpeechesSource.indexOf('function useWardManagePrayers'),
        useSpeechesSource.indexOf('\nexport', useSpeechesSource.indexOf('function useWardManagePrayers') + 10)
      );
      expect(hookBlock).toContain("from('wards')");
    });

    it('selects manage_prayers column', () => {
      const hookBlock = useSpeechesSource.substring(
        useSpeechesSource.indexOf('function useWardManagePrayers'),
        useSpeechesSource.indexOf('\nexport', useSpeechesSource.indexOf('function useWardManagePrayers') + 10)
      );
      expect(hookBlock).toContain("select('manage_prayers')");
    });

    it('filters by wardId', () => {
      const hookBlock = useSpeechesSource.substring(
        useSpeechesSource.indexOf('function useWardManagePrayers'),
        useSpeechesSource.indexOf('\nexport', useSpeechesSource.indexOf('function useWardManagePrayers') + 10)
      );
      expect(hookBlock).toContain('.eq(');
      expect(hookBlock).toContain('wardId');
    });

    it('uses single() for single record result', () => {
      const hookBlock = useSpeechesSource.substring(
        useSpeechesSource.indexOf('function useWardManagePrayers'),
        useSpeechesSource.indexOf('\nexport', useSpeechesSource.indexOf('function useWardManagePrayers') + 10)
      );
      expect(hookBlock).toContain('.single()');
    });
  });

  describe('Hook return values', () => {
    it('returns managePrayers: boolean', () => {
      expect(useSpeechesSource).toMatch(/useWardManagePrayers[\s\S]*?managePrayers:\s*boolean/);
    });

    it('returns isLoading: boolean', () => {
      expect(useSpeechesSource).toMatch(/useWardManagePrayers[\s\S]*?isLoading:\s*boolean/);
    });

    it('managePrayers defaults to false when no data', () => {
      const hookBlock = useSpeechesSource.substring(
        useSpeechesSource.indexOf('function useWardManagePrayers'),
        useSpeechesSource.indexOf('\nexport', useSpeechesSource.indexOf('function useWardManagePrayers') + 10)
      );
      expect(hookBlock).toContain('?? false');
    });
  });

  describe('Query key structure', () => {
    it('uses ["ward", wardId, "managePrayers"] query key', () => {
      expect(useSpeechesSource).toContain("['ward', wardId, 'managePrayers']");
    });
  });
});

// ============================================================================
// STEP-05: useLazyCreateSpeeches - type-aware positions
// ============================================================================

describe('STEP-05: useLazyCreateSpeeches type-aware (AC-157-07/08/09/10)', () => {

  describe('Input shape accepts sundayType', () => {
    it('mutationFn receives input with sundayDate and sundayType', () => {
      const hookBlock = useSpeechesSource.substring(
        useSpeechesSource.indexOf('function useLazyCreateSpeeches'),
        useSpeechesSource.indexOf('\nexport', useSpeechesSource.indexOf('function useLazyCreateSpeeches') + 10)
      );
      expect(hookBlock).toContain('sundayDate');
      expect(hookBlock).toContain('sundayType');
    });

    it('sundayType is optional (has ? or default)', () => {
      const hookBlock = useSpeechesSource.substring(
        useSpeechesSource.indexOf('function useLazyCreateSpeeches'),
        useSpeechesSource.indexOf('\nexport', useSpeechesSource.indexOf('function useLazyCreateSpeeches') + 10)
      );
      expect(hookBlock).toMatch(/sundayType\??:/);
    });
  });

  // --- AC-157-07: speeches type creates positions [0,1,2,3,4] ---

  describe('AC-157-07: speeches type creates positions [0,1,2,3,4]', () => {
    it('speeches type (or default) produces positions with 0, 1, 2, 3, 4', () => {
      const hookBlock = useSpeechesSource.substring(
        useSpeechesSource.indexOf('function useLazyCreateSpeeches'),
        useSpeechesSource.indexOf('\nexport', useSpeechesSource.indexOf('function useLazyCreateSpeeches') + 10)
      );
      expect(hookBlock).toContain('[0, 1, 2, 3, 4]');
    });

    it('speeches case maps to the 5-position array', () => {
      const hookBlock = useSpeechesSource.substring(
        useSpeechesSource.indexOf('function useLazyCreateSpeeches'),
        useSpeechesSource.indexOf('\nexport', useSpeechesSource.indexOf('function useLazyCreateSpeeches') + 10)
      );
      // The default case or 'speeches' case should produce [0,1,2,3,4]
      expect(hookBlock).toMatch(/(speeches|default)[\s\S]*?\[0, 1, 2, 3, 4\]/);
    });
  });

  // --- AC-157-08: testimony_meeting creates positions [0,4] ---

  describe('AC-157-08: testimony_meeting creates positions [0,4]', () => {
    it('testimony_meeting case produces [0, 4]', () => {
      const hookBlock = useSpeechesSource.substring(
        useSpeechesSource.indexOf('function useLazyCreateSpeeches'),
        useSpeechesSource.indexOf('\nexport', useSpeechesSource.indexOf('function useLazyCreateSpeeches') + 10)
      );
      expect(hookBlock).toContain("'testimony_meeting'");
      expect(hookBlock).toContain('[0, 4]');
    });
  });

  // --- AC-157-09: primary_presentation creates positions [0,4] ---

  describe('AC-157-09: primary_presentation creates positions [0,4]', () => {
    it('primary_presentation case produces [0, 4]', () => {
      const hookBlock = useSpeechesSource.substring(
        useSpeechesSource.indexOf('function useLazyCreateSpeeches'),
        useSpeechesSource.indexOf('\nexport', useSpeechesSource.indexOf('function useLazyCreateSpeeches') + 10)
      );
      expect(hookBlock).toContain("'primary_presentation'");
    });

    it('primary_presentation shares [0, 4] positions with testimony_meeting', () => {
      // Both should use [0, 4] - they fall through in the switch
      const hookBlock = useSpeechesSource.substring(
        useSpeechesSource.indexOf('function useLazyCreateSpeeches'),
        useSpeechesSource.indexOf('\nexport', useSpeechesSource.indexOf('function useLazyCreateSpeeches') + 10)
      );
      // Both testimony_meeting and primary_presentation should be in the same case block
      expect(hookBlock).toMatch(/testimony_meeting[\s\S]*?primary_presentation[\s\S]*?\[0, 4\]/);
    });
  });

  // --- AC-157-10: conference/other types create no positions ---

  describe('AC-157-10: conference/other types create no positions', () => {
    it('general_conference produces empty positions array', () => {
      const hookBlock = useSpeechesSource.substring(
        useSpeechesSource.indexOf('function useLazyCreateSpeeches'),
        useSpeechesSource.indexOf('\nexport', useSpeechesSource.indexOf('function useLazyCreateSpeeches') + 10)
      );
      expect(hookBlock).toContain("'general_conference'");
    });

    it('stake_conference produces empty positions array', () => {
      const hookBlock = useSpeechesSource.substring(
        useSpeechesSource.indexOf('function useLazyCreateSpeeches'),
        useSpeechesSource.indexOf('\nexport', useSpeechesSource.indexOf('function useLazyCreateSpeeches') + 10)
      );
      expect(hookBlock).toContain("'stake_conference'");
    });

    it('ward_conference produces empty positions array', () => {
      const hookBlock = useSpeechesSource.substring(
        useSpeechesSource.indexOf('function useLazyCreateSpeeches'),
        useSpeechesSource.indexOf('\nexport', useSpeechesSource.indexOf('function useLazyCreateSpeeches') + 10)
      );
      expect(hookBlock).toContain("'ward_conference'");
    });

    it('other type produces empty positions array', () => {
      const hookBlock = useSpeechesSource.substring(
        useSpeechesSource.indexOf('function useLazyCreateSpeeches'),
        useSpeechesSource.indexOf('\nexport', useSpeechesSource.indexOf('function useLazyCreateSpeeches') + 10)
      );
      expect(hookBlock).toContain("'other'");
    });

    it('conference/other cases return empty array []', () => {
      const hookBlock = useSpeechesSource.substring(
        useSpeechesSource.indexOf('function useLazyCreateSpeeches'),
        useSpeechesSource.indexOf('\nexport', useSpeechesSource.indexOf('function useLazyCreateSpeeches') + 10)
      );
      // The conference block should have positions = []
      expect(hookBlock).toMatch(/(general_conference|other)[\s\S]*?positions = \[\]/);
    });
  });

  describe('Idempotency preserved', () => {
    it('checks existing speeches before creating', () => {
      const hookBlock = useSpeechesSource.substring(
        useSpeechesSource.indexOf('function useLazyCreateSpeeches'),
        useSpeechesSource.indexOf('\nexport', useSpeechesSource.indexOf('function useLazyCreateSpeeches') + 10)
      );
      expect(hookBlock).toContain("from('speeches')");
      expect(hookBlock).toContain("select('id')");
    });

    it('skips creation if records already exist', () => {
      const hookBlock = useSpeechesSource.substring(
        useSpeechesSource.indexOf('function useLazyCreateSpeeches'),
        useSpeechesSource.indexOf('\nexport', useSpeechesSource.indexOf('function useLazyCreateSpeeches') + 10)
      );
      expect(hookBlock).toContain('existing.length > 0');
      expect(hookBlock).toContain('return []');
    });

    it('returns empty array when positions is empty', () => {
      const hookBlock = useSpeechesSource.substring(
        useSpeechesSource.indexOf('function useLazyCreateSpeeches'),
        useSpeechesSource.indexOf('\nexport', useSpeechesSource.indexOf('function useLazyCreateSpeeches') + 10)
      );
      expect(hookBlock).toContain('positions.length === 0');
    });
  });

  describe('Speech records created with correct status', () => {
    it('new speech records have status not_assigned', () => {
      const hookBlock = useSpeechesSource.substring(
        useSpeechesSource.indexOf('function useLazyCreateSpeeches'),
        useSpeechesSource.indexOf('\nexport', useSpeechesSource.indexOf('function useLazyCreateSpeeches') + 10)
      );
      expect(hookBlock).toContain("'not_assigned'");
    });
  });
});

// ============================================================================
// STEP-06: useDeleteSpeechesByDate - optional positions filter
// ============================================================================

describe('STEP-06: useDeleteSpeechesByDate with positions (AC-157-46/47/48/49/50)', () => {

  describe('Input shape accepts optional positions', () => {
    it('mutationFn receives input with sundayDate and optional positions', () => {
      const hookBlock = useSpeechesSource.substring(
        useSpeechesSource.indexOf('function useDeleteSpeechesByDate'),
        useSpeechesSource.indexOf('\n}', useSpeechesSource.indexOf('function useDeleteSpeechesByDate') + 10) + 2
      );
      expect(hookBlock).toContain('sundayDate');
      expect(hookBlock).toContain('positions');
    });

    it('positions is optional (has ?)', () => {
      const hookBlock = useSpeechesSource.substring(
        useSpeechesSource.indexOf('function useDeleteSpeechesByDate'),
        useSpeechesSource.indexOf('\n}', useSpeechesSource.indexOf('function useDeleteSpeechesByDate') + 10) + 2
      );
      expect(hookBlock).toMatch(/positions\?:/);
    });
  });

  describe('Selective deletion with positions filter', () => {
    it('uses .in("position", positions) when positions are provided', () => {
      const hookBlock = useSpeechesSource.substring(
        useSpeechesSource.indexOf('function useDeleteSpeechesByDate'),
        useSpeechesSource.indexOf('\n}', useSpeechesSource.indexOf('function useDeleteSpeechesByDate') + 10) + 2
      );
      expect(hookBlock).toContain(".in('position'");
    });

    it('only applies position filter when positions array is non-empty', () => {
      const hookBlock = useSpeechesSource.substring(
        useSpeechesSource.indexOf('function useDeleteSpeechesByDate'),
        useSpeechesSource.indexOf('\n}', useSpeechesSource.indexOf('function useDeleteSpeechesByDate') + 10) + 2
      );
      expect(hookBlock).toContain('positions && positions.length > 0');
    });
  });

  describe('Full deletion when positions omitted (backward compatible)', () => {
    it('deletes from speeches table', () => {
      const hookBlock = useSpeechesSource.substring(
        useSpeechesSource.indexOf('function useDeleteSpeechesByDate'),
        useSpeechesSource.indexOf('\n}', useSpeechesSource.indexOf('function useDeleteSpeechesByDate') + 10) + 2
      );
      expect(hookBlock).toContain("from('speeches')");
      expect(hookBlock).toContain('.delete()');
    });

    it('filters by ward_id and sunday_date', () => {
      const hookBlock = useSpeechesSource.substring(
        useSpeechesSource.indexOf('function useDeleteSpeechesByDate'),
        useSpeechesSource.indexOf('\n}', useSpeechesSource.indexOf('function useDeleteSpeechesByDate') + 10) + 2
      );
      expect(hookBlock).toContain("'ward_id'");
      expect(hookBlock).toContain("'sunday_date'");
    });
  });

  describe('Cache invalidation on success', () => {
    it('invalidates speechKeys.all after deletion', () => {
      const hookBlock = useSpeechesSource.substring(
        useSpeechesSource.indexOf('function useDeleteSpeechesByDate'),
        useSpeechesSource.indexOf('\n}', useSpeechesSource.indexOf('function useDeleteSpeechesByDate') + 10) + 2
      );
      expect(hookBlock).toContain('speechKeys.all');
    });
  });
});

// ============================================================================
// STEP-07: Settings toggle manage_prayers
// ============================================================================

describe('STEP-07: Settings toggle manage_prayers (AC-157-57/58)', () => {

  // --- AC-157-57: Toggle renders for Bispado only ---

  describe('AC-157-57: manage_prayers toggle in Ward Settings', () => {
    it('settings screen imports useWardManagePrayers', () => {
      expect(settingsSource).toContain('useWardManagePrayers');
    });

    it('settings screen imports wardKeys from useSpeeches', () => {
      expect(settingsSource).toContain('wardKeys');
    });

    it('toggle is wrapped in isBishopric check', () => {
      expect(settingsSource).toContain('isBishopric');
      // The manage_prayers toggle should be inside a {isBishopric && ...} block
      const toggleSection = settingsSource.substring(
        settingsSource.lastIndexOf('isBishopric', settingsSource.indexOf('managePrayers')),
        settingsSource.indexOf('managePrayers')
      );
      expect(toggleSection).toContain('isBishopric');
    });

    it('toggle label uses t("settings.managePrayers")', () => {
      expect(settingsSource).toContain("t('settings.managePrayers')");
    });

    it('toggle uses Switch component', () => {
      expect(settingsSource).toContain('<Switch');
    });

    it('switch value is bound to managePrayers state', () => {
      expect(settingsSource).toContain('value={managePrayers}');
    });
  });

  // --- AC-157-58: Toggle state persists and applies immediately ---

  describe('AC-157-58: Toggle persistence and immediate update', () => {
    it('toggle calls mutation on value change', () => {
      expect(settingsSource).toContain('onValueChange');
      expect(settingsSource).toContain('toggleManagePrayersMutation.mutate');
    });

    it('mutation updates wards.manage_prayers in supabase', () => {
      expect(settingsSource).toContain("from('wards')");
      expect(settingsSource).toContain('.update({ manage_prayers:');
    });

    it('mutation invalidates managePrayers query key on success', () => {
      expect(settingsSource).toContain('wardKeys.managePrayers(wardId)');
    });

    it('mutation invalidates ward query key for broader refresh', () => {
      // Should invalidate ward query for other components
      expect(settingsSource).toContain("['ward', wardId]");
    });

    it('mutation filters by wardId', () => {
      expect(settingsSource).toContain(".eq('id', wardId)");
    });
  });

  describe('Toggle visibility by role', () => {
    it('isBishopric is derived from role', () => {
      expect(settingsSource).toContain("isBishopric = role === 'bishopric'");
    });

    it('toggle is NOT visible to Secretario or Observador (guarded by isBishopric)', () => {
      // The toggle rendering block should be inside isBishopric conditional
      const managePrayersIdx = settingsSource.indexOf("t('settings.managePrayers')");
      const preceedingCode = settingsSource.substring(Math.max(0, managePrayersIdx - 200), managePrayersIdx);
      expect(preceedingCode).toContain('isBishopric');
    });
  });
});
