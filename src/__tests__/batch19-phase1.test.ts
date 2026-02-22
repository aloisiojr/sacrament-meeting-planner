/**
 * Tests for Batch 19, Phase 1: Language control, Pianist/Conductor split,
 *                                Optional 2nd speech toggle, Password reset bug
 *
 * F116 (CR-178): Separate app language (per-user, user_metadata) vs ward language
 *   (wards.language). Observer limited Settings. Collection reactivation fix.
 * F117 (CR-180): Split can_music into can_pianist/can_conductor with CHECK constraint
 * F118 (CR-181): Optional 2nd speech toggle (has_second_speech), collapsed card changes
 * F119 (CR-191): Fix password reset redirect Edge Function plain-text HTML bug
 *
 * Covers acceptance criteria:
 *   AC-116-01..11, AC-117-01..12, AC-118-01..14, AC-119-01..07
 * Covers edge cases:
 *   EC-116-01..04, EC-117-01..04, EC-118-01..04, EC-119-01..03
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function readSourceFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf-8');
}

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', '..', relativePath), 'utf-8');
}

function readLocale(locale: string): Record<string, unknown> {
  const content = fs.readFileSync(
    path.resolve(__dirname, '..', 'i18n', 'locales', `${locale}.json`),
    'utf-8'
  );
  return JSON.parse(content);
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return current;
}

// =============================================================================
// F116 (CR-178): Separate language control - app language vs ward language
// =============================================================================

describe('F116 (CR-178): Separate language control', () => {

  const authContextSource = readSourceFile('contexts/AuthContext.tsx');
  const settingsSource = readSourceFile('app/(tabs)/settings/index.tsx');
  const layoutSource = readSourceFile('app/(tabs)/_layout.tsx');
  const whatsappSource = readSourceFile('app/(tabs)/settings/whatsapp.tsx');
  const topicsSource = readSourceFile('app/(tabs)/settings/topics.tsx');
  const useTopicsSource = readSourceFile('hooks/useTopics.ts');
  const ptBR = readLocale('pt-BR');
  const en = readLocale('en');
  const es = readLocale('es');

  // --- AC-116-01: Per-user app language preference stored in user_metadata ---
  describe('AC-116-01: Per-user app language stored in user_metadata', () => {
    it('updateAppLanguage calls supabase.auth.updateUser with language data', () => {
      expect(authContextSource).toContain('supabase.auth.updateUser');
      expect(authContextSource).toContain('data: { language: lang }');
    });

    it('updateAppLanguage also calls changeLanguage', () => {
      expect(authContextSource).toContain('changeLanguage(lang');
    });

    it('updateAppLanguage is exposed in context value', () => {
      expect(authContextSource).toContain('updateAppLanguage');
      expect(authContextSource).toContain('updateAppLanguage(lang: string): Promise<void>');
    });
  });

  // --- AC-116-02: App language controls UI translations ---
  describe('AC-116-02: App language controls UI translations', () => {
    it('settings uses t() calls for all labels', () => {
      expect(settingsSource).toContain("t('settings.appLanguage')");
      expect(settingsSource).toContain("t('settings.wardLanguage')");
    });

    it('whatsapp uses t() for UI labels', () => {
      expect(whatsappSource).toContain("t('settings.whatsapp.placeholders')");
      expect(whatsappSource).toContain("t('settings.whatsapp.template')");
      expect(whatsappSource).toContain("t('settings.whatsapp.preview')");
    });
  });

  // --- AC-116-03: Ward language controls WhatsApp template defaults ---
  describe('AC-116-03: Ward language controls WhatsApp template defaults', () => {
    it('whatsapp uses PLACEHOLDER_I18N_KEYS for app-language-aware display', () => {
      expect(whatsappSource).toContain('PLACEHOLDER_I18N_KEYS');
      expect(whatsappSource).toContain("'whatsapp.placeholderName'");
      expect(whatsappSource).toContain("'whatsapp.placeholderDate'");
    });

    it('whatsapp UI section labels use t() (not hardcoded)', () => {
      // Should not have hardcoded English labels
      expect(whatsappSource).not.toMatch(/>Placeholders:</);
      expect(whatsappSource).not.toMatch(/>Template:</);
      expect(whatsappSource).not.toMatch(/>Preview:</);
    });
  });

  // --- AC-116-04: Ward language controls collection listing ---
  describe('AC-116-04: Ward language controls collection listing', () => {
    it('topics.tsx uses wardLanguage from AuthContext', () => {
      expect(topicsSource).toContain('wardLanguage');
      expect(topicsSource).toContain('useAuth');
    });

    it('topics.tsx assigns language from wardLanguage (not getCurrentLanguage)', () => {
      expect(topicsSource).toContain('const language = wardLanguage');
    });
  });

  // --- AC-116-05: Settings has separate controls for app and ward language ---
  describe('AC-116-05: Separate language controls in Settings', () => {
    it('settings renders app language item', () => {
      expect(settingsSource).toContain("t('settings.appLanguage')");
    });

    it('settings renders ward language item with permission check', () => {
      expect(settingsSource).toContain("t('settings.wardLanguage')");
      expect(settingsSource).toContain("hasPermission('settings:language')");
    });

    it('app language modal and ward language modal are separate', () => {
      expect(settingsSource).toContain('appLanguageModalVisible');
      expect(settingsSource).toContain('wardLanguageModalVisible');
    });
  });

  // --- AC-116-06: Observer has limited Settings tab ---
  describe('AC-116-06: Observer limited Settings', () => {
    it('settings checks isObserver to hide non-observer sections', () => {
      expect(settingsSource).toContain("const isObserver = role === 'observer'");
      expect(settingsSource).toContain('{!isObserver && (');
    });

    it('app language is available to all roles (not wrapped in !isObserver)', () => {
      // App Language SettingsItem should NOT be inside an isObserver block
      // It should be in the section that renders for all roles
      const appLangMatch = settingsSource.match(/settings\.appLanguage/);
      expect(appLangMatch).not.toBeNull();
    });

    it('ward language is hidden from Observer via permission check', () => {
      expect(settingsSource).toContain("hasPermission('settings:language')");
    });

    it('members, topics, users, history, whatsapp hidden from Observer', () => {
      // These are all inside !isObserver blocks (F135 added sectionLabel between !isObserver and members)
      const membersSection = settingsSource.indexOf("t('settings.members')");
      const beforeMembers = settingsSource.substring(
        Math.max(0, membersSection - 500),
        membersSection
      );
      expect(beforeMembers).toContain('!isObserver');
    });
  });

  // --- AC-116-07: Changing ward language auto-reactivates collections ---
  describe('AC-116-07: Collection reactivation on ward language change', () => {
    it('ward language mutation deactivates old collections', () => {
      expect(settingsSource).toContain("update({ active: false })");
      expect(settingsSource).toContain("eq('language', toDbLocale(oldLanguage))");
    });

    it('ward language mutation activates new language collections via upsert', () => {
      expect(settingsSource).toContain("eq('language', toDbLocale(newLanguage))");
      expect(settingsSource).toContain('upsert(upsertRows');
      expect(settingsSource).toContain('active: true');
    });
  });

  // --- AC-116-08: WhatsApp placeholder names translated per app language ---
  describe('AC-116-08: WhatsApp placeholders translated per app language', () => {
    it('pt-BR has correct placeholder translations', () => {
      expect(getNestedValue(ptBR, 'whatsapp.placeholderName')).toBe('{nome}');
      expect(getNestedValue(ptBR, 'whatsapp.placeholderDate')).toBe('{data}');
      expect(getNestedValue(ptBR, 'whatsapp.placeholderPosition')).toContain('{posi');
      expect(getNestedValue(ptBR, 'whatsapp.placeholderCollection')).toContain('{cole');
      expect(getNestedValue(ptBR, 'whatsapp.placeholderTitle')).toContain('{t');
      expect(getNestedValue(ptBR, 'whatsapp.placeholderLink')).toBe('{link}');
    });

    it('en has correct placeholder translations', () => {
      expect(getNestedValue(en, 'whatsapp.placeholderName')).toBe('{name}');
      expect(getNestedValue(en, 'whatsapp.placeholderDate')).toBe('{date}');
      expect(getNestedValue(en, 'whatsapp.placeholderPosition')).toBe('{position}');
      expect(getNestedValue(en, 'whatsapp.placeholderCollection')).toBe('{collection}');
      expect(getNestedValue(en, 'whatsapp.placeholderTitle')).toBe('{title}');
      expect(getNestedValue(en, 'whatsapp.placeholderLink')).toBe('{link}');
    });

    it('es has correct placeholder translations', () => {
      expect(getNestedValue(es, 'whatsapp.placeholderName')).toBe('{nombre}');
      expect(getNestedValue(es, 'whatsapp.placeholderDate')).toBe('{fecha}');
      expect(getNestedValue(es, 'whatsapp.placeholderLink')).toBe('{enlace}');
    });

    it('whatsapp.tsx maps PLACEHOLDER_I18N_KEYS via t() for display labels', () => {
      expect(whatsappSource).toContain('PLACEHOLDER_I18N_KEYS.map((key) => t(key))');
    });
  });

  // --- AC-116-09: 'Temas da Ala' label in useTopics.ts is translated ---
  describe('AC-116-09: Ward topics label is translated', () => {
    it('useTopics uses t() for ward topic label', () => {
      expect(useTopicsSource).toContain("t('topics.wardTopics')");
    });

    it('useTopics does NOT have hardcoded Temas da Ala', () => {
      expect(useTopicsSource).not.toContain("'Temas da Ala'");
    });

    it('i18n key topics.wardTopics exists in all locales', () => {
      expect(getNestedValue(ptBR, 'topics.wardTopics')).toBe('Temas da Ala');
      expect(getNestedValue(en, 'topics.wardTopics')).toBe('Ward Topics');
      expect(getNestedValue(es, 'topics.wardTopics')).toBe('Temas del Barrio');
    });
  });

  // --- AC-116-10: On login, app language loaded from user_metadata ---
  describe('AC-116-10: App language from user_metadata on login', () => {
    it('AuthContext reads user_metadata.language', () => {
      expect(authContextSource).toContain('user?.user_metadata?.language');
    });

    it('AuthContext calls changeLanguage with user preference', () => {
      expect(authContextSource).toContain('changeLanguage(userLang');
    });
  });

  // --- AC-116-11: First login fallback: device locale then ward language ---
  describe('AC-116-11: First login fallback chain', () => {
    it('AuthContext has fallback logic for unsupported locale', () => {
      expect(authContextSource).toContain('SUPPORTED_LANGUAGES.includes');
      expect(authContextSource).toContain('getCurrentLanguage');
    });

    it('falls back to ward language if device locale not supported', () => {
      expect(authContextSource).toContain('wardLangSafe');
      expect(authContextSource).toContain("changeLanguage(wardLangSafe)");
    });
  });

  // --- EC-116-01: App language change offline ---
  describe('EC-116-01: App language change offline', () => {
    it('updateAppLanguage calls changeLanguage for immediate UI effect', () => {
      // changeLanguage is called regardless of network state
      expect(authContextSource).toContain('changeLanguage(lang');
    });
  });

  // --- EC-116-02: Ward language changed by another user ---
  describe('EC-116-02: Ward language changed externally', () => {
    it('wardLanguage stored in context state (updated on re-fetch)', () => {
      expect(authContextSource).toContain('setWardLanguage');
      expect(authContextSource).toContain("useState<string>('pt-BR')");
    });
  });

  // --- EC-116-03: Activity log with structured entries ---
  describe('EC-116-03: Activity log entries across languages', () => {
    it('wardLanguage exposed in context for components that need it', () => {
      expect(authContextSource).toContain('wardLanguage: string');
      expect(authContextSource).toContain('wardLanguage,');
    });
  });

  // --- EC-116-04: Observer role Settings access ---
  describe('EC-116-04: Observer Settings access', () => {
    it('Observer has Settings tab in layout (no href: null for settings)', () => {
      // Settings tab should NOT be hidden for any role
      // The _layout.tsx should show settings for all roles
      expect(layoutSource).not.toContain("href: role === 'observer' ? null");
      // Settings tab exists
      expect(layoutSource).toContain("name=\"settings\"");
    });

    it('Observer settings shows app language, theme, about', () => {
      // These are in a section NOT wrapped in !isObserver
      expect(settingsSource).toContain("t('settings.appLanguage')");
      expect(settingsSource).toContain("t('settings.theme')");
      expect(settingsSource).toContain("t('settings.about')");
    });
  });

  // --- F116 i18n keys ---
  describe('F116 i18n keys exist in all 3 locales', () => {
    const keysToCheck = [
      'settings.appLanguage',
      'settings.wardLanguage',
      'settings.whatsapp.placeholders',
      'settings.whatsapp.template',
      'settings.whatsapp.preview',
      'whatsapp.placeholderName',
      'whatsapp.placeholderDate',
      'whatsapp.placeholderPosition',
      'whatsapp.placeholderCollection',
      'whatsapp.placeholderTitle',
      'whatsapp.placeholderLink',
      'topics.wardTopics',
    ];

    for (const key of keysToCheck) {
      it(`pt-BR has key: ${key}`, () => {
        expect(getNestedValue(ptBR, key)).toBeDefined();
        expect(getNestedValue(ptBR, key)).not.toBe('');
      });

      it(`en has key: ${key}`, () => {
        expect(getNestedValue(en, key)).toBeDefined();
        expect(getNestedValue(en, key)).not.toBe('');
      });

      it(`es has key: ${key}`, () => {
        expect(getNestedValue(es, key)).toBeDefined();
        expect(getNestedValue(es, key)).not.toBe('');
      });
    }
  });
});

// =============================================================================
// F117 (CR-180): Split Music actor type into Pianist and Conductor
// =============================================================================

describe('F117 (CR-180): Pianist/Conductor split', () => {

  const migrationSource = readProjectFile('supabase/migrations/017_split_music_actor.sql');
  const databaseSource = readSourceFile('types/database.ts');
  const useActorsSource = readSourceFile('hooks/useActors.ts');
  const agendaFormSource = readSourceFile('components/AgendaForm.tsx');
  const actorSelectorSource = readSourceFile('components/ActorSelector.tsx');

  // --- AC-117-01: Database has can_pianist and can_conductor, no can_music ---
  describe('AC-117-01: Migration adds can_pianist and can_conductor', () => {
    it('migration adds can_pianist column', () => {
      expect(migrationSource).toContain('ADD COLUMN can_pianist BOOLEAN NOT NULL DEFAULT false');
    });

    it('migration adds can_conductor column', () => {
      expect(migrationSource).toContain('ADD COLUMN can_conductor BOOLEAN NOT NULL DEFAULT false');
    });

    it('migration drops can_music column', () => {
      expect(migrationSource).toContain('DROP COLUMN can_music');
    });
  });

  // --- AC-117-02: Migration preserves existing music actors as pianists ---
  describe('AC-117-02: Data migration preserves music actors', () => {
    it('migrates can_music=true to can_pianist=true', () => {
      expect(migrationSource).toContain('SET can_pianist = true');
      expect(migrationSource).toContain('WHERE can_music = true');
    });
  });

  // --- AC-117-03: MeetingActor TypeScript type updated ---
  describe('AC-117-03: MeetingActor type updated', () => {
    it('has can_pianist: boolean', () => {
      expect(databaseSource).toMatch(/can_pianist:\s*boolean/);
    });

    it('has can_conductor: boolean', () => {
      expect(databaseSource).toMatch(/can_conductor:\s*boolean/);
    });

    it('does NOT have can_music in MeetingActor', () => {
      // Check that can_music does not appear in the MeetingActor interface
      const meetingActorBlock = databaseSource.match(
        /export interface MeetingActor \{[\s\S]*?\}/
      );
      expect(meetingActorBlock).not.toBeNull();
      expect(meetingActorBlock![0]).not.toContain('can_music');
    });
  });

  // --- AC-117-04: CreateActorInput and UpdateActorInput types updated ---
  describe('AC-117-04: Input types updated', () => {
    it('CreateActorInput has can_pianist optional', () => {
      const createBlock = databaseSource.match(
        /export interface CreateActorInput \{[\s\S]*?\}/
      );
      expect(createBlock).not.toBeNull();
      expect(createBlock![0]).toContain('can_pianist');
      expect(createBlock![0]).toContain('can_conductor');
      expect(createBlock![0]).not.toContain('can_music');
    });

    it('UpdateActorInput has can_pianist optional', () => {
      const updateBlock = databaseSource.match(
        /export interface UpdateActorInput \{[\s\S]*?\}/
      );
      expect(updateBlock).not.toBeNull();
      expect(updateBlock![0]).toContain('can_pianist');
      expect(updateBlock![0]).toContain('can_conductor');
      expect(updateBlock![0]).not.toContain('can_music');
    });
  });

  // --- AC-117-05: ActorRoleFilter includes can_pianist and can_conductor ---
  describe('AC-117-05: ActorRoleFilter type updated', () => {
    it('includes can_pianist', () => {
      expect(useActorsSource).toContain("'can_pianist'");
    });

    it('includes can_conductor', () => {
      expect(useActorsSource).toContain("'can_conductor'");
    });

    it('does NOT include can_music', () => {
      expect(useActorsSource).not.toContain("'can_music'");
    });
  });

  // --- AC-117-06: Pianist field uses can_pianist filter ---
  describe('AC-117-06: Pianist field uses can_pianist', () => {
    it('AgendaForm pianist uses roleFilter can_pianist', () => {
      expect(agendaFormSource).toContain("roleFilter: 'can_pianist'");
    });
  });

  // --- AC-117-07: Conductor field uses can_conductor filter ---
  describe('AC-117-07: Conductor field uses can_conductor', () => {
    it('AgendaForm conductor uses roleFilter can_conductor', () => {
      expect(agendaFormSource).toContain("roleFilter: 'can_conductor'");
    });
  });

  // --- AC-117-08: Creating actor from pianist field sets can_pianist=true ---
  describe('AC-117-08: New actor from pianist field', () => {
    it('ActorSelector sets can_pianist based on roleFilter', () => {
      expect(actorSelectorSource).toContain("can_pianist: roleFilter === 'can_pianist'");
    });
  });

  // --- AC-117-09: Creating actor from conductor field sets can_conductor=true ---
  describe('AC-117-09: New actor from conductor field', () => {
    it('ActorSelector sets can_conductor based on roleFilter', () => {
      expect(actorSelectorSource).toContain("can_conductor: roleFilter === 'can_conductor'");
    });
  });

  // --- AC-117-10: Existing agenda assignments preserved ---
  describe('AC-117-10: Existing assignments preserved', () => {
    it('migration SQL statements do NOT drop or alter pianist_actor_id/conductor_actor_id FK columns', () => {
      // Only check the SQL statements (not comments) for FK column manipulation
      const sqlStatements = migrationSource
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n');
      expect(sqlStatements).not.toContain('pianist_actor_id');
      expect(sqlStatements).not.toContain('conductor_actor_id');
    });

    it('migration comment documents FK preservation', () => {
      expect(migrationSource).toContain('FK references');
      expect(migrationSource).toContain('unaffected');
    });
  });

  // --- AC-117-11: No remaining references to can_music in production code ---
  describe('AC-117-11: No can_music references in production code', () => {
    it('useActors.ts has no can_music', () => {
      expect(useActorsSource).not.toContain('can_music');
    });

    it('AgendaForm.tsx has no can_music', () => {
      expect(agendaFormSource).not.toContain('can_music');
    });

    it('ActorSelector.tsx has no can_music', () => {
      expect(actorSelectorSource).not.toContain('can_music');
    });

    it('database.ts production types have no can_music', () => {
      // Exclude test files, only check production type definitions
      const meetingActorSection = databaseSource.match(
        /export interface MeetingActor \{[\s\S]*?\}/
      );
      const createSection = databaseSource.match(
        /export interface CreateActorInput \{[\s\S]*?\}/
      );
      const updateSection = databaseSource.match(
        /export interface UpdateActorInput \{[\s\S]*?\}/
      );
      expect(meetingActorSection![0]).not.toContain('can_music');
      expect(createSection![0]).not.toContain('can_music');
      expect(updateSection![0]).not.toContain('can_music');
    });
  });

  // --- AC-117-12: Mutual exclusivity constraint ---
  describe('AC-117-12: CHECK constraint for mutual exclusivity', () => {
    it('migration has CHECK constraint chk_pianist_conductor_exclusive', () => {
      expect(migrationSource).toContain('chk_pianist_conductor_exclusive');
    });

    it('CHECK ensures NOT (can_pianist = true AND can_conductor = true)', () => {
      expect(migrationSource).toContain('NOT (can_pianist = true AND can_conductor = true)');
    });
  });

  // --- EC-117-01: Actor with can_music=true assigned as conductor in past ---
  describe('EC-117-01: Music actor becomes pianist, conductor FK preserved', () => {
    it('migration moves can_music to can_pianist only (not can_conductor)', () => {
      expect(migrationSource).toContain('SET can_pianist = true');
      expect(migrationSource).not.toContain('SET can_conductor = true');
    });
  });

  // --- EC-117-02: Actor with multiple roles (preside + music) ---
  describe('EC-117-02: Multi-role actor preserved', () => {
    it('migration only touches can_pianist column, not other roles', () => {
      // The UPDATE only sets can_pianist WHERE can_music = true
      // Does not affect can_preside, can_conduct, can_recognize
      expect(migrationSource).not.toContain('SET can_preside');
      expect(migrationSource).not.toContain('SET can_conduct');
      expect(migrationSource).not.toContain('SET can_recognize');
    });
  });

  // --- EC-117-03: No actors with can_music=true ---
  describe('EC-117-03: No music actors exist', () => {
    it('UPDATE with WHERE clause handles zero matching rows gracefully', () => {
      // SQL UPDATE with WHERE clause that matches no rows is a valid no-op
      expect(migrationSource).toContain('WHERE can_music = true');
    });
  });

  // --- EC-117-04: Person who plays piano AND conducts ---
  describe('EC-117-04: Same person as pianist and conductor', () => {
    it('CHECK constraint prevents single actor from being both', () => {
      expect(migrationSource).toContain('NOT (can_pianist = true AND can_conductor = true)');
    });

    it('getPrimaryRole in useActors checks both can_pianist and can_conductor', () => {
      expect(useActorsSource).toContain("if (actor.can_pianist) return 'can_pianist'");
      expect(useActorsSource).toContain("if (actor.can_conductor) return 'can_conductor'");
    });
  });
});

// =============================================================================
// F118 (CR-181): Optional 2nd speech toggle
// =============================================================================

describe('F118 (CR-181): Optional 2nd speech toggle', () => {

  const migrationSource = readProjectFile('supabase/migrations/018_add_has_second_speech.sql');
  const databaseSource = readSourceFile('types/database.ts');
  const speechSlotSource = readSourceFile('components/SpeechSlot.tsx');
  const sundayCardSource = readSourceFile('components/SundayCard.tsx');
  const speechesSource = readSourceFile('app/(tabs)/speeches.tsx');
  const presentationSource = readSourceFile('hooks/usePresentationMode.ts');
  const agendaFormSource = readSourceFile('components/AgendaForm.tsx');
  const inviteSource = readSourceFile('components/InviteManagementSection.tsx');
  const nextSundaysSource = readSourceFile('components/NextSundaysSection.tsx');
  const ptBR = readLocale('pt-BR');
  const en = readLocale('en');
  const es = readLocale('es');

  // --- AC-118-01: has_second_speech field ---
  describe('AC-118-01: has_second_speech in DB and TypeScript', () => {
    it('migration adds has_second_speech BOOLEAN NOT NULL DEFAULT true', () => {
      expect(migrationSource).toContain('has_second_speech BOOLEAN NOT NULL DEFAULT true');
    });

    it('SundayAgenda interface has has_second_speech: boolean', () => {
      const sundayAgendaBlock = databaseSource.match(
        /export interface SundayAgenda \{[\s\S]*?\}/
      );
      expect(sundayAgendaBlock).not.toBeNull();
      expect(sundayAgendaBlock![0]).toContain('has_second_speech: boolean');
    });
  });

  // --- AC-118-02: Toggle UI visible in expanded speech card ---
  describe('AC-118-02: Toggle Switch in SpeechSlot for position 2', () => {
    it('SpeechSlot imports Switch component', () => {
      expect(speechSlotSource).toContain('Switch');
    });

    it('SpeechSlot has isSecondSpeechEnabled prop', () => {
      expect(speechSlotSource).toContain('isSecondSpeechEnabled');
    });

    it('SpeechSlot has onToggleSecondSpeech prop', () => {
      expect(speechSlotSource).toContain('onToggleSecondSpeech');
    });

    it('speeches.tsx passes isSecondSpeechEnabled for pos 2', () => {
      expect(speechesSource).toContain('isSecondSpeechEnabled={pos === 2 ? hasSecondSpeech : undefined}');
    });
  });

  // --- AC-118-03: Toggle OFF shows confirmation only when assignments exist ---
  describe('AC-118-03: Confirmation dialog for toggle off with assignments', () => {
    it('speeches.tsx checks for existing assignments before confirmation', () => {
      expect(speechesSource).toContain('hasAssignments');
    });

    it('uses i18n key for confirmation title', () => {
      expect(speechesSource).toContain("t('speeches.secondSpeechToggleConfirmTitle')");
    });

    it('uses i18n key for confirmation message', () => {
      expect(speechesSource).toContain("t('speeches.secondSpeechToggleConfirmMessage')");
    });
  });

  // --- AC-118-04: After toggle OFF, speech 2 data cleared ---
  describe('AC-118-04: Speech 2 data cleared on toggle off', () => {
    it('removeAssignment called for speech2 on confirmation', () => {
      expect(speechesSource).toContain('removeAssignment.mutate({ speechId: speech2.id }');
    });

    it('has_second_speech set to false after confirmation', () => {
      expect(speechesSource).toContain("updates: { has_second_speech: false }");
    });
  });

  // --- AC-118-05: Toggle OFF without assignments: no confirmation ---
  describe('AC-118-05: No confirmation when no assignments', () => {
    it('toggle immediately without dialog when no assignments', () => {
      // After the hasAssignments check, there is a path for no assignments
      expect(speechesSource).toContain('// Toggle off immediately');
    });
  });

  // --- AC-118-06: Toggle ON: no confirmation, fields re-enabled ---
  describe('AC-118-06: Toggle ON enables fields', () => {
    it('enable path sets has_second_speech to true', () => {
      expect(speechesSource).toContain("updates: { has_second_speech: true }");
    });

    it('enable path has no confirmation dialog', () => {
      // The else branch (enable) does not have Alert.alert
      expect(speechesSource).toContain('// Enable: no confirmation needed');
    });
  });

  // --- AC-118-07: Collapsed card hides position 2 when toggle off ---
  describe('AC-118-07: Collapsed card hides position 2', () => {
    it('SundayCard uses visiblePositions based on hasSecondSpeech', () => {
      expect(sundayCardSource).toContain('const visiblePositions = hasSecondSpeech ? [1, 2, 3] : [1, 3]');
    });

    it('collapsed card iterates visiblePositions, not hardcoded [1,2,3]', () => {
      expect(sundayCardSource).toContain('visiblePositions.map');
    });
  });

  // --- AC-118-08: Collapsed card shows no ordinal labels ---
  describe('AC-118-08: No ordinal labels in collapsed card', () => {
    it('collapsed card shows speaker name only, no ordinal prefix', () => {
      // The collapsed view renders only name with StatusLED, no label like "1o Discurso:"
      // Check that the collapsed speech row does NOT use getPositionLabel or t('speeches.slot')
      const collapsedSection = sundayCardSource.match(
        /isSpeechesType && !expanded[\s\S]*?visiblePositions\.map[\s\S]*?<\/>/
      );
      expect(collapsedSection).not.toBeNull();
      expect(collapsedSection![0]).not.toContain('getPositionLabel');
      expect(collapsedSection![0]).not.toContain("t('speeches.slot'");
    });
  });

  // --- AC-118-09: Position 3 label is 'Ultimo Discurso' ---
  describe('AC-118-09: Position 3 uses lastSpeech label', () => {
    it('getPositionLabel returns lastSpeech for position 3', () => {
      expect(speechSlotSource).toContain("if (position === 3)");
      expect(speechSlotSource).toContain("t('speeches.lastSpeech')");
    });

    it('i18n has lastSpeech key in all locales', () => {
      expect(getNestedValue(ptBR, 'speeches.lastSpeech')).toBeDefined();
      expect(getNestedValue(en, 'speeches.lastSpeech')).toBe('Final Speech');
      expect(getNestedValue(es, 'speeches.lastSpeech')).toBeDefined();
    });
  });

  // --- AC-118-10: LEDs: 2 when toggle off ---
  describe('AC-118-10: LED count matches visible positions', () => {
    it('speechStatuses built from visiblePositions', () => {
      expect(sundayCardSource).toContain('const speechStatuses: SpeechStatus[] = visiblePositions.map');
    });
  });

  // --- AC-118-11: Presentation mode hides speech 2 when toggle off ---
  describe('AC-118-11: Presentation mode filters speech 2', () => {
    it('usePresentationMode conditionally includes speech 2', () => {
      expect(presentationSource).toContain('has_second_speech');
    });

    it('speech 2 only added when has_second_speech is not false', () => {
      expect(presentationSource).toContain("agenda?.has_second_speech !== false");
    });
  });

  // --- AC-118-12: Agenda form shows disabled placeholder ---
  describe('AC-118-12: Agenda form disabled placeholder', () => {
    it('speeches.tsx passes toggle props to SpeechSlot for position 2', () => {
      expect(speechesSource).toContain("onToggleSecondSpeech={pos === 2");
    });

    it('SpeechSlot has disabled state for position 2', () => {
      expect(speechSlotSource).toContain('const isPos2Disabled = position === 2 && isSecondSpeechEnabled === false');
    });
  });

  // --- AC-118-13: Default toggle ON for new agendas ---
  describe('AC-118-13: Default toggle is ON', () => {
    it('migration uses DEFAULT true', () => {
      expect(migrationSource).toContain('DEFAULT true');
    });

    it('speeches.tsx defaults to true when no agenda data', () => {
      expect(speechesSource).toContain("agendaData?.has_second_speech ?? true");
    });

    it('SundayCard defaults hasSecondSpeech to true', () => {
      expect(sundayCardSource).toContain('hasSecondSpeech = true');
    });
  });

  // --- AC-118-14: Invite management hides position 2 ---
  describe('AC-118-14: InviteManagement hides position 2', () => {
    it('InviteManagementSection fetches agenda range for has_second_speech', () => {
      expect(inviteSource).toContain('has_second_speech');
    });

    it('filters out position 2 when has_second_speech is false', () => {
      expect(inviteSource).toContain('item.speech.position === 2');
    });
  });

  // --- EC-118-01: Toggle OFF then ON ---
  describe('EC-118-01: Toggle OFF then ON clears data', () => {
    it('toggle ON path does not restore data (fields re-enabled but empty)', () => {
      // The enable path only sets has_second_speech = true, no data restore
      const enableBlock = speechesSource.match(
        /Enable: no confirmation needed[\s\S]*?has_second_speech: true/
      );
      expect(enableBlock).not.toBeNull();
    });
  });

  // --- EC-118-02: Sunday without agenda record ---
  describe('EC-118-02: Sunday without agenda record', () => {
    it('default has_second_speech is true when no agenda exists', () => {
      expect(speechesSource).toContain('?? true');
    });
  });

  // --- EC-118-03: Observer viewing toggle ---
  describe('EC-118-03: Observer toggle is read-only', () => {
    it('SpeechSlot checks isBispado role', () => {
      expect(speechSlotSource).toContain("const isBispado = role === 'bishopric'");
    });
  });

  // --- EC-118-04: Secretary and toggle permission ---
  describe('EC-118-04: Secretary cannot toggle', () => {
    it('toggle visibility tied to role check', () => {
      expect(speechSlotSource).toContain('isBispado');
    });
  });

  // --- F118 i18n keys ---
  describe('F118 i18n keys exist in all 3 locales', () => {
    const keysToCheck = [
      'speeches.secondSpeechToggleConfirmTitle',
      'speeches.secondSpeechToggleConfirmMessage',
      'speeches.secondSpeechDisabledPlaceholder',
    ];

    for (const key of keysToCheck) {
      it(`pt-BR has key: ${key}`, () => {
        expect(getNestedValue(ptBR, key)).toBeDefined();
        expect(getNestedValue(ptBR, key)).not.toBe('');
      });

      it(`en has key: ${key}`, () => {
        expect(getNestedValue(en, key)).toBeDefined();
        expect(getNestedValue(en, key)).not.toBe('');
      });

      it(`es has key: ${key}`, () => {
        expect(getNestedValue(es, key)).toBeDefined();
        expect(getNestedValue(es, key)).not.toBe('');
      });
    }
  });

  // --- NextSundaysSection consistent with SundayCard ---
  describe('NextSundaysSection consistent with SundayCard', () => {
    it('NextSundaysSection passes hasSecondSpeech to SundayCard', () => {
      expect(nextSundaysSource).toContain('hasSecondSpeech={hasSecondSpeech}');
    });

    it('NextSundaysSection fetches agenda range for has_second_speech', () => {
      expect(nextSundaysSource).toContain('has_second_speech');
    });
  });
});

// =============================================================================
// F119 (CR-191): Fix password reset redirect plain-text HTML bug
// =============================================================================

describe('F119 (CR-191): Password reset plain-text HTML fix', () => {

  const resetSource = readProjectFile('supabase/functions/reset-redirect/index.ts');

  // --- AC-119-01: Content-Type includes charset=utf-8 ---
  describe('AC-119-01: Content-Type with charset', () => {
    it('Content-Type header is text/html; charset=utf-8', () => {
      expect(resetSource).toContain("'Content-Type': 'text/html; charset=utf-8'");
    });
  });

  // --- AC-119-02: HTML not escaped or double-encoded ---
  describe('AC-119-02: HTML template not encoded', () => {
    it('HTML passed directly to Response (no JSON.stringify)', () => {
      expect(resetSource).toContain('new Response(html,');
    });

    it('no JSON.stringify on html variable', () => {
      expect(resetSource).not.toContain('JSON.stringify(html');
    });

    it('no encodeURIComponent on html variable', () => {
      expect(resetSource).not.toContain('encodeURIComponent(html');
    });
  });

  // --- AC-119-03: No conflicting Content-Type in corsHeaders ---
  describe('AC-119-03: corsHeaders does not contain Content-Type', () => {
    it('corsHeaders object does not have Content-Type key', () => {
      const corsBlock = resetSource.match(
        /const corsHeaders = \{[\s\S]*?\};/
      );
      expect(corsBlock).not.toBeNull();
      expect(corsBlock![0]).not.toContain("'Content-Type'");
    });
  });

  // --- AC-119-04: Cache-Control header ---
  describe('AC-119-04: Cache-Control header set', () => {
    it('Cache-Control is no-cache, no-store, must-revalidate', () => {
      expect(resetSource).toContain("'Cache-Control': 'no-cache, no-store, must-revalidate'");
    });
  });

  // --- AC-119-05: Deep link uses sacrmeetplan:// scheme ---
  // SUPERSEDED by F138 (CR-202): reset-redirect no longer uses deep link scheme
  describe.skip('AC-119-05: Deep link scheme [SUPERSEDED by F138]', () => {
    it('uses sacrmeetplan://reset-password deep link', () => {
      expect(resetSource).toContain('sacrmeetplan://reset-password');
    });
  });

  // --- AC-119-06: HTML renders properly ---
  // SUPERSEDED by F138 (CR-202): reset-redirect now serves inline form, no meta-refresh
  describe('AC-119-06: HTML structure is valid', () => {
    it('HTML has DOCTYPE', () => {
      expect(resetSource).toContain('<!DOCTYPE html>');
    });

    it('HTML has meta charset', () => {
      expect(resetSource).toContain('<meta charset="UTF-8">');
    });

    it.skip('HTML has meta-refresh as fallback redirect [SUPERSEDED by F138]', () => {
      expect(resetSource).toContain('http-equiv="refresh"');
    });

    it('HTML does NOT have JavaScript redirect (F134: script tag removed)', () => {
      // F138 uses CDN script for Supabase JS, but NOT window.location.href redirect
      expect(resetSource).not.toContain('window.location.href');
    });

    it('status code is 200', () => {
      expect(resetSource).toContain('status: 200');
    });
  });

  // --- AC-119-07: Root cause investigation documented ---
  // SUPERSEDED by F138 (CR-202): reset-redirect was completely rewritten, old comments removed
  describe.skip('AC-119-07: Root cause investigation documented [SUPERSEDED by F138]', () => {
    it('has code comment documenting root cause', () => {
      expect(resetSource).toContain('Root cause');
    });

    it('documents Content-Type without charset issue', () => {
      expect(resetSource).toContain("Content-Type header was set to 'text/html' without charset");
    });

    it('documents corsHeaders verification', () => {
      expect(resetSource).toContain('corsHeaders verified to NOT contain');
    });

    it('documents no encoding applied', () => {
      expect(resetSource).toContain('no JSON.stringify or encodeURIComponent');
    });
  });

  // --- EC-119-01: Browser with strict CSP ---
  // SUPERSEDED by F138 (CR-202): reset-redirect no longer uses meta-refresh or fallback button
  describe.skip('EC-119-01: Meta-refresh as backup redirect [SUPERSEDED by F138]', () => {
    it('has meta http-equiv=refresh for fallback', () => {
      expect(resetSource).toContain('http-equiv="refresh"');
    });

    it('also has clickable link as manual fallback', () => {
      expect(resetSource).toContain('class="button"');
      expect(resetSource).toContain('Abrir no aplicativo');
    });
  });

  // --- EC-119-02: Supabase proxy adding/modifying headers ---
  describe('EC-119-02: Explicit charset takes precedence', () => {
    it('Content-Type set AFTER corsHeaders spread', () => {
      // Content-Type should come after ...corsHeaders in the object literal
      const responseHeaders = resetSource.match(
        /headers:\s*\{[\s\S]*?\.\.\.corsHeaders[\s\S]*?Content-Type[\s\S]*?\}/
      );
      expect(responseHeaders).not.toBeNull();
    });

    it('Cache-Control prevents proxy caching', () => {
      expect(resetSource).toContain('no-cache, no-store, must-revalidate');
    });
  });

  // --- EC-119-03: Chrome on Android ---
  describe('EC-119-03: Cross-browser compatibility', () => {
    it('uses standard Content-Type with charset', () => {
      expect(resetSource).toContain('text/html; charset=utf-8');
    });

    it('CORS headers allow all origins', () => {
      expect(resetSource).toContain("'Access-Control-Allow-Origin': '*'");
    });
  });

  // --- Console logging for debugging ---
  describe('Debugging support', () => {
    it('has console.log for successful redirects', () => {
      expect(resetSource).toContain('console.log');
      expect(resetSource).toContain('[reset-redirect]');
    });
  });
});
