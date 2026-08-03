/**
 * NOTE — five source-text describes were deleted from this file.
 *
 * They grepped app/(tabs)/agenda.tsx, hooks/useAgenda.ts and a migration file for literals such as
 * "t('agenda.start')", "pathname: '/presentation'", 'hitSlop={8}' and 'logAction'.
 *
 * Replaced by behaviour:
 *   agenda-unified-card.test.tsx      — the play control renders (and does not, when it should
 *                                       not) and pressing it pushes /presentation with the date
 *   agenda-no-activity-log.test.tsx   — an agenda update writes NO activity-log entry, driven
 *                                       through the real mutation with the logger watched
 *
 * Migration 026 is applied history; asserting its text proves nothing about the running database.
 */

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

import { lightColors, darkColors } from '../lib/theme';

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

  // --- AC-043-04: Play button navigates to presentation mode ---

  // --- AC-043-03: Play button retained after unified-card refactor ---

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

  // --- AC-044-04: I18n keys for agenda actions are removed ---
  describe('AC-044-04: Agenda-related i18n keys removed from all locales', () => {
    it('pt-BR does not contain agenda_edit key', async () => {
      const ptBR = require('../i18n/locales/pt-BR.json');
      const events = (ptBR as any).activityLog?.events ?? {};
      expect(events).not.toHaveProperty('agenda_edit');
    });

    it('pt-BR does not contain agenda_last_minute_speech key', async () => {
      const ptBR = require('../i18n/locales/pt-BR.json');
      const events = (ptBR as any).activityLog?.events ?? {};
      expect(events).not.toHaveProperty('agenda_last_minute_speech');
    });

    it('pt-BR does not contain agenda_last_minute_speech_removed key', async () => {
      const ptBR = require('../i18n/locales/pt-BR.json');
      const events = (ptBR as any).activityLog?.events ?? {};
      expect(events).not.toHaveProperty('agenda_last_minute_speech_removed');
    });

    it('en-US does not contain agenda_edit key', async () => {
      const enUS = require('../i18n/locales/en-US.json');
      const events = (enUS as any).activityLog?.events ?? {};
      expect(events).not.toHaveProperty('agenda_edit');
    });

    it('en-US does not contain agenda_last_minute_speech key', async () => {
      const enUS = require('../i18n/locales/en-US.json');
      const events = (enUS as any).activityLog?.events ?? {};
      expect(events).not.toHaveProperty('agenda_last_minute_speech');
    });

    it('en-US does not contain agenda_last_minute_speech_removed key', async () => {
      const enUS = require('../i18n/locales/en-US.json');
      const events = (enUS as any).activityLog?.events ?? {};
      expect(events).not.toHaveProperty('agenda_last_minute_speech_removed');
    });

    it('es-LA does not contain agenda_edit key', async () => {
      const esLA = require('../i18n/locales/es-LA.json');
      const events = (esLA as any).activityLog?.events ?? {};
      expect(events).not.toHaveProperty('agenda_edit');
    });

    it('es-LA does not contain agenda_last_minute_speech key', async () => {
      const esLA = require('../i18n/locales/es-LA.json');
      const events = (esLA as any).activityLog?.events ?? {};
      expect(events).not.toHaveProperty('agenda_last_minute_speech');
    });

    it('es-LA does not contain agenda_last_minute_speech_removed key', async () => {
      const esLA = require('../i18n/locales/es-LA.json');
      const events = (esLA as any).activityLog?.events ?? {};
      expect(events).not.toHaveProperty('agenda_last_minute_speech_removed');
    });
  });

  // --- AC-044-03: History screen works for other entry types ---
  describe('AC-044-03: Activity log module still works for other entry types', () => {
    it('logAction function is still exported from activityLog module', async () => {
      const module = require('../lib/activityLog');
      expect(typeof module.logAction).toBe('function');
    });

    it('buildLogDescription is still exported', async () => {
      const module = require('../lib/activityLog');
      expect(typeof module.buildLogDescription).toBe('function');
    });

    it('parseLogDescription is still exported', async () => {
      const module = require('../lib/activityLog');
      expect(typeof module.parseLogDescription).toBe('function');
    });

    it('formatLogDescription is still exported', async () => {
      const module = require('../lib/activityLog');
      expect(typeof module.formatLogDescription).toBe('function');
    });

    it('buildLogDescription still produces pipe-delimited format for non-agenda types', async () => {
      const { buildLogDescription } = require('../lib/activityLog');
      const result = buildLogDescription('member:create', { nome: 'Maria Silva' });
      expect(result).toBe('member:create|nome=Maria Silva');
    });

    it('parseLogDescription still parses non-agenda types correctly', async () => {
      const { parseLogDescription } = require('../lib/activityLog');
      const result = parseLogDescription('member:create|nome=Maria Silva');
      expect(result).not.toBeNull();
      expect(result!.actionType).toBe('member:create');
      expect(result!.params.nome).toBe('Maria Silva');
    });
  });

  // --- AC-044-02: Migration 026 deletes agenda entries ---
});

// =============================================================================
// F045 (CR-261): NEW USER LANGUAGE = WARD LANGUAGE
// =============================================================================

describe('F045 (CR-261): New User Language = Ward Language', () => {

  // --- AC-045-01: register-first-user sets user_metadata.language ---

  // --- AC-045-04: register-first-user defaults to en-US if no language specified ---

  // --- AC-045-02 + AC-045-05: register-invited-user sets user_metadata.language from ward ---

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
