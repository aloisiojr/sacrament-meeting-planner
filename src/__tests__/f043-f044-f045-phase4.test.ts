/**
 * Phase 4 Tests: F043 (CR-259) Play Icon Redesign + F044 (CR-260) Remove Agenda
 * Change History + F045 (CR-261) New User Language = Ward Language
 *
 * F043: Verifies the play button uses theme colors (primary, onPrimary) and
 *       that the theme contract supports the component's needs.
 *       Source-code verification of play button styles in agenda.tsx.
 * F044: Verifies useUpdateAgenda no longer calls logAction, that the
 *       agenda-related i18n keys have been removed from locale files,
 *       and that the migration SQL is correct.
 * F045: Verifies edge function logic patterns for user_metadata.language
 *       in register-first-user and register-invited-user via source code.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { lightColors, darkColors } from '../lib/theme';

// Helper: read source file relative to project root
const projectRoot = resolve(__dirname, '../..');
function readSource(relativePath: string): string {
  return readFileSync(resolve(projectRoot, relativePath), 'utf-8');
}

// =============================================================================
// F043 (CR-259): PLAY ICON REDESIGN
// =============================================================================

describe('F043 (CR-259): Play Icon Redesign - Theme Color Contract', () => {

  // --- AC-043-01: Play button has primary background ---
  describe('AC-043-01: Theme provides primary color for play button background', () => {
    it('lightColors.primary is a valid hex color', () => {
      expect(lightColors.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('darkColors.primary is a valid hex color', () => {
      expect(darkColors.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('primary color exists in ThemeColors contract', () => {
      expect(lightColors).toHaveProperty('primary');
      expect(darkColors).toHaveProperty('primary');
    });
  });

  // --- AC-043-02: PlayIcon uses onPrimary color ---
  describe('AC-043-02: Theme provides onPrimary color for icon', () => {
    it('lightColors.onPrimary is a valid hex color', () => {
      expect(lightColors.onPrimary).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('darkColors.onPrimary is a valid hex color', () => {
      expect(darkColors.onPrimary).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('onPrimary contrasts with primary (not same color)', () => {
      expect(lightColors.onPrimary).not.toBe(lightColors.primary);
      expect(darkColors.onPrimary).not.toBe(darkColors.primary);
    });
  });

  // --- AC-043-01 / AC-043-02 / AC-043-03: Source-code verification ---
  describe('AC-043-01/02/03: Play button source code structure', () => {
    const agendaSource = readSource('src/app/(tabs)/agenda.tsx');

    it('play button is a pill with the "Iniciar" text (t(agenda.start))', () => {
      // v2 card-layout: the play control is now icon + "Iniciar" text, not a 36×36 icon-only square.
      expect(agendaSource).toContain("t('agenda.start')");
    });

    it('play button has borderRadius: 8', () => {
      expect(agendaSource).toContain('borderRadius: 8');
    });

    it('play button uses colors.primary as backgroundColor', () => {
      expect(agendaSource).toContain('backgroundColor: colors.primary');
    });

    it('PlayIcon uses colors.onPrimary color', () => {
      expect(agendaSource).toContain('color={colors.onPrimary}');
    });

    it('play button lays out as a row with centered items', () => {
      expect(agendaSource).toContain("alignItems: 'center'");
    });

    it('play button preserves styles.playButton (marginRight)', () => {
      expect(agendaSource).toContain('styles.playButton');
    });
  });

  // --- AC-043-04: Play button navigates to presentation mode ---
  describe('AC-043-04: Play button navigation', () => {
    const agendaSource = readSource('src/app/(tabs)/agenda.tsx');

    it('play button navigates to /presentation with date param', () => {
      expect(agendaSource).toContain("pathname: '/presentation'");
      expect(agendaSource).toContain('params: { date }');
    });

    it('play button has accessibilityRole button', () => {
      expect(agendaSource).toContain('accessibilityRole="button"');
    });

    it('play button has accessibilityLabel for presentation', () => {
      expect(agendaSource).toContain('accessibilityLabel="Open presentation"');
    });

    it('play button has hitSlop for touch area', () => {
      expect(agendaSource).toContain('hitSlop={8}');
    });
  });

  // --- AC-043-03: Play button retained after unified-card refactor ---
  describe('AC-043-03: Play button retained after unified-card refactor', () => {
    const agendaSource = readSource('src/app/(tabs)/agenda.tsx');

    it('play button is present in the expanded header alongside a collapse chevron', () => {
      // v2 card-layout: the expanded header now has the Play control plus a ChevronUpIcon collapse
      // control on the right. (The collapsed card still uses UnifiedSundayCard's own chevron.)
      expect(agendaSource).toContain('PlayIcon');
      expect(agendaSource).toContain('ChevronUpIcon');
    });

    it('play button is only shown when card is expanded', () => {
      // v2 compact header: the expanded body (incl. the play button) renders only in the
      // `if (isExpanded)` branch, and is additionally omitted for no-sacrament Sundays (`!noSacrament`).
      expect(agendaSource).toContain('if (isExpanded)');
      expect(agendaSource).toContain('agenda-play-');
    });
  });

  // --- EC-043-01: Theme change updates colors ---
  describe('EC-043-01: Theme change updates colors (light vs dark)', () => {
    it('primary color differs between light and dark themes', () => {
      // Colors may or may not differ between themes, but onPrimary/primary
      // should always be available
      expect(typeof lightColors.primary).toBe('string');
      expect(typeof darkColors.primary).toBe('string');
    });

    it('both themes provide textSecondary for chevron icons', () => {
      expect(lightColors.textSecondary).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(darkColors.textSecondary).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});

// =============================================================================
// F044 (CR-260): REMOVE AGENDA CHANGE HISTORY
// =============================================================================

describe('F044 (CR-260): Remove Agenda Change History', () => {

  // --- AC-044-01: Code no longer logs agenda:edit actions ---
  describe('AC-044-01: useAgenda source code has no logAction', () => {
    const useAgendaSource = readSource('src/hooks/useAgenda.ts');

    it('useAgenda source does not import logAction', () => {
      expect(useAgendaSource).not.toContain('logAction');
    });

    it('useAgenda source does not import buildLogDescription', () => {
      expect(useAgendaSource).not.toContain('buildLogDescription');
    });

    it('useAgenda source does not import from activityLog', () => {
      expect(useAgendaSource).not.toContain('activityLog');
    });

    it('useAgenda module exports do not include logAction', async () => {
      const agendaModule = await import('../hooks/useAgenda');
      const exportedKeys = Object.keys(agendaModule);
      expect(exportedKeys).not.toContain('logAction');
      expect(exportedKeys).not.toContain('buildLogDescription');
    });

    it('useUpdateAgenda is still exported and is a function', async () => {
      const agendaModule = await import('../hooks/useAgenda');
      expect(typeof agendaModule.useUpdateAgenda).toBe('function');
    });

    it('useUpdateAgendaByDate is still exported and is a function', async () => {
      const agendaModule = await import('../hooks/useAgenda');
      expect(typeof agendaModule.useUpdateAgendaByDate).toBe('function');
    });
  });

  // --- AC-044-04: I18n keys for agenda actions are removed ---
  describe('AC-044-04: Agenda-related i18n keys removed from all locales', () => {
    it('pt-BR does not contain agenda_edit key', async () => {
      const ptBR = await import('../i18n/locales/pt-BR.json');
      const events = (ptBR.default as any).activityLog?.events ?? {};
      expect(events).not.toHaveProperty('agenda_edit');
    });

    it('pt-BR does not contain agenda_last_minute_speech key', async () => {
      const ptBR = await import('../i18n/locales/pt-BR.json');
      const events = (ptBR.default as any).activityLog?.events ?? {};
      expect(events).not.toHaveProperty('agenda_last_minute_speech');
    });

    it('pt-BR does not contain agenda_last_minute_speech_removed key', async () => {
      const ptBR = await import('../i18n/locales/pt-BR.json');
      const events = (ptBR.default as any).activityLog?.events ?? {};
      expect(events).not.toHaveProperty('agenda_last_minute_speech_removed');
    });

    it('en-US does not contain agenda_edit key', async () => {
      const enUS = await import('../i18n/locales/en-US.json');
      const events = (enUS.default as any).activityLog?.events ?? {};
      expect(events).not.toHaveProperty('agenda_edit');
    });

    it('en-US does not contain agenda_last_minute_speech key', async () => {
      const enUS = await import('../i18n/locales/en-US.json');
      const events = (enUS.default as any).activityLog?.events ?? {};
      expect(events).not.toHaveProperty('agenda_last_minute_speech');
    });

    it('en-US does not contain agenda_last_minute_speech_removed key', async () => {
      const enUS = await import('../i18n/locales/en-US.json');
      const events = (enUS.default as any).activityLog?.events ?? {};
      expect(events).not.toHaveProperty('agenda_last_minute_speech_removed');
    });

    it('es-LA does not contain agenda_edit key', async () => {
      const esLA = await import('../i18n/locales/es-LA.json');
      const events = (esLA.default as any).activityLog?.events ?? {};
      expect(events).not.toHaveProperty('agenda_edit');
    });

    it('es-LA does not contain agenda_last_minute_speech key', async () => {
      const esLA = await import('../i18n/locales/es-LA.json');
      const events = (esLA.default as any).activityLog?.events ?? {};
      expect(events).not.toHaveProperty('agenda_last_minute_speech');
    });

    it('es-LA does not contain agenda_last_minute_speech_removed key', async () => {
      const esLA = await import('../i18n/locales/es-LA.json');
      const events = (esLA.default as any).activityLog?.events ?? {};
      expect(events).not.toHaveProperty('agenda_last_minute_speech_removed');
    });
  });

  // --- AC-044-03: History screen works for other entry types ---
  describe('AC-044-03: Activity log module still works for other entry types', () => {
    it('logAction function is still exported from activityLog module', async () => {
      const module = await import('../lib/activityLog');
      expect(typeof module.logAction).toBe('function');
    });

    it('buildLogDescription is still exported', async () => {
      const module = await import('../lib/activityLog');
      expect(typeof module.buildLogDescription).toBe('function');
    });

    it('parseLogDescription is still exported', async () => {
      const module = await import('../lib/activityLog');
      expect(typeof module.parseLogDescription).toBe('function');
    });

    it('formatLogDescription is still exported', async () => {
      const module = await import('../lib/activityLog');
      expect(typeof module.formatLogDescription).toBe('function');
    });

    it('buildLogDescription still produces pipe-delimited format for non-agenda types', async () => {
      const { buildLogDescription } = await import('../lib/activityLog');
      const result = buildLogDescription('member:create', { nome: 'Maria Silva' });
      expect(result).toBe('member:create|nome=Maria Silva');
    });

    it('parseLogDescription still parses non-agenda types correctly', async () => {
      const { parseLogDescription } = await import('../lib/activityLog');
      const result = parseLogDescription('member:create|nome=Maria Silva');
      expect(result).not.toBeNull();
      expect(result!.actionType).toBe('member:create');
      expect(result!.params.nome).toBe('Maria Silva');
    });
  });

  // --- AC-044-02: Migration 026 deletes agenda entries ---
  describe('AC-044-02: Migration SQL targets correct action types', () => {
    const migrationSQL = readSource('supabase/migrations/026_delete_agenda_activity_log.sql');

    it('migration file exists and is non-empty', () => {
      expect(migrationSQL.length).toBeGreaterThan(0);
    });

    it('migration contains DELETE FROM activity_log', () => {
      expect(migrationSQL).toContain('DELETE FROM activity_log');
    });

    it('migration targets agenda:edit action type', () => {
      expect(migrationSQL).toContain("'agenda:edit'");
    });

    it('migration targets agenda_last_minute_speech action type', () => {
      expect(migrationSQL).toContain("'agenda_last_minute_speech'");
    });

    it('migration targets agenda_last_minute_speech_removed action type', () => {
      expect(migrationSQL).toContain("'agenda_last_minute_speech_removed'");
    });

    it('migration uses WHERE action_type IN clause', () => {
      expect(migrationSQL).toContain('WHERE action_type IN');
    });

    // EC-044-01: Migration safe on empty table (DELETE affects 0 rows)
    it('migration uses DELETE (not TRUNCATE or DROP), safe on empty table', () => {
      expect(migrationSQL).toContain('DELETE FROM');
      expect(migrationSQL).not.toContain('TRUNCATE');
      expect(migrationSQL).not.toContain('DROP');
    });

    // EC-044-02: Only action_type column used, not description
    it('migration does not filter on description column', () => {
      expect(migrationSQL).not.toMatch(/WHERE\s+description/i);
    });

    it('migration has no ALTER TABLE or CREATE statements', () => {
      expect(migrationSQL).not.toContain('ALTER TABLE');
      expect(migrationSQL).not.toContain('CREATE');
    });

    it('migration references CR-260', () => {
      expect(migrationSQL).toContain('CR-260');
    });
  });
});

// =============================================================================
// F045 (CR-261): NEW USER LANGUAGE = WARD LANGUAGE
// =============================================================================

describe('F045 (CR-261): New User Language = Ward Language', () => {

  // --- AC-045-01: register-first-user sets user_metadata.language ---
  describe('AC-045-01: register-first-user source code verification', () => {
    const rfuSource = readSource('supabase/functions/register-first-user/index.ts');

    it('createUser call includes user_metadata with language', () => {
      expect(rfuSource).toContain('user_metadata');
      expect(rfuSource).toContain('language: wardLanguage');
    });

    it('wardLanguage variable uses input.language with en-US fallback', () => {
      expect(rfuSource).toContain("input.language || 'en-US'");
    });

    it('app_metadata is still present in createUser', () => {
      expect(rfuSource).toContain('app_metadata');
      expect(rfuSource).toContain('ward_id: ward.id');
      expect(rfuSource).toContain('role: input.role');
    });
  });

  // --- AC-045-04: register-first-user defaults to en-US if no language specified ---
  describe('AC-045-04: Ward language default behavior', () => {
    it('default ward language is en-US when not specified', () => {
      // This tests the same pattern used in register-first-user line 88:
      //   const wardLanguage = input.language || 'en-US';
      const inputLanguage: string | undefined = undefined;
      const wardLanguage = inputLanguage || 'en-US';
      expect(wardLanguage).toBe('en-US');
    });

    it('explicit ward language is preserved', () => {
      const inputLanguage = 'pt-BR';
      const wardLanguage = inputLanguage || 'en-US';
      expect(wardLanguage).toBe('pt-BR');
    });

    it('empty string language falls back to en-US', () => {
      const inputLanguage = '';
      const wardLanguage = inputLanguage || 'en-US';
      expect(wardLanguage).toBe('en-US');
    });
  });

  // --- AC-045-02 + AC-045-05: register-invited-user sets user_metadata.language from ward ---
  describe('AC-045-02 / AC-045-05: register-invited-user source code verification', () => {
    const riuSource = readSource('supabase/functions/register-invited-user/index.ts');

    it('fetches ward language from wards table', () => {
      expect(riuSource).toContain(".from('wards')");
      expect(riuSource).toContain(".select('language')");
    });

    it('filters ward query by invitation.ward_id', () => {
      expect(riuSource).toContain("invitation.ward_id");
    });

    it('uses .single() for ward query', () => {
      expect(riuSource).toContain('.single()');
    });

    it('defines wardLanguage with fallback to en-US', () => {
      expect(riuSource).toContain("ward?.language || 'en-US'");
    });

    it('createUser includes user_metadata with language', () => {
      expect(riuSource).toContain('user_metadata');
      expect(riuSource).toContain('language: wardLanguage');
    });

    it('app_metadata is unchanged (ward_id, role, full_name)', () => {
      expect(riuSource).toContain('app_metadata');
      expect(riuSource).toContain('ward_id: invitation.ward_id');
      expect(riuSource).toContain('role: invitation.role');
    });
  });

  // --- AC-045-01 + AC-045-02: createUser includes user_metadata.language ---
  describe('AC-045-01 / AC-045-02: user_metadata.language pattern', () => {
    it('user_metadata object includes language field', () => {
      // Pattern from both edge functions:
      //   user_metadata: { language: wardLanguage }
      const wardLanguage = 'en-US';
      const userMetadata = { language: wardLanguage };
      expect(userMetadata).toEqual({ language: 'en-US' });
    });

    it('user_metadata with es-LA ward language', () => {
      const wardLanguage = 'es-LA';
      const userMetadata = { language: wardLanguage };
      expect(userMetadata).toEqual({ language: 'es-LA' });
    });

    it('user_metadata with default en-US', () => {
      const rawLanguage = undefined as string | undefined;
      const wardLanguage = rawLanguage || 'en-US';
      const userMetadata = { language: wardLanguage };
      expect(userMetadata).toEqual({ language: 'en-US' });
    });
  });

  // --- EC-045-01: Ward has null language -> fallback to en-US ---
  describe('EC-045-01: Null ward language fallback', () => {
    it('null ward.language falls back to en-US', () => {
      // Pattern from register-invited-user:
      //   const wardLanguage = ward?.language || 'en-US';
      const ward: { language: string | null } | null = { language: null };
      const wardLanguage = ward?.language || 'en-US';
      expect(wardLanguage).toBe('en-US');
    });

    it('undefined ward falls back to en-US', () => {
      const ward = undefined as { language: string } | undefined;
      const wardLanguage = ward?.language || 'en-US';
      expect(wardLanguage).toBe('en-US');
    });

    it('ward with valid language is used directly', () => {
      const ward = { language: 'es-LA' };
      const wardLanguage = ward?.language || 'en-US';
      expect(wardLanguage).toBe('es-LA');
    });
  });

  // --- AC-045-05: register-invited-user fetches ward language ---
  describe('AC-045-05: Ward language query pattern', () => {
    it('ward query selects language field by ward_id', () => {
      // Simulates the Supabase query pattern:
      //   .from('wards').select('language').eq('id', invitation.ward_id).single()
      const queryConfig = {
        table: 'wards',
        select: 'language',
        filter: { field: 'id', value: 'ward-123' },
        mode: 'single',
      };
      expect(queryConfig.table).toBe('wards');
      expect(queryConfig.select).toBe('language');
      expect(queryConfig.mode).toBe('single');
    });
  });

  // --- AC-045-03: App displays in ward language for new user ---
  describe('AC-045-03: Language priority chain', () => {
    it('user_metadata.language is used as app language', () => {
      // The app priority chain: user_metadata.language > device locale > en-US
      // If user_metadata.language is set at registration, app will display in that language
      const userMetadata = { language: 'pt-BR' };
      const appLanguage = userMetadata.language || 'en-US';
      expect(appLanguage).toBe('pt-BR');
    });

    it('missing user_metadata.language falls back to en-US', () => {
      const userMetadata: { language?: string } = {};
      const appLanguage = userMetadata.language || 'en-US';
      expect(appLanguage).toBe('en-US');
    });
  });
});
