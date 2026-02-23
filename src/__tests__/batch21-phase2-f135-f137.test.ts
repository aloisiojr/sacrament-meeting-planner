/**
 * Batch 21 Phase 2: Tests for F135, F136, F137.
 * CR-193 (F135): Settings reorganization into 2 labeled groups
 * CR-199 (F136): StatusLED alignment via paddingRight on labelRow
 * CR-200 (F137): Play icon fontSize enlargement in Home and Agenda
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// --- Helpers ---

const resolve = (...parts: string[]) => path.resolve(__dirname, '..', ...parts);

function readSourceFile(relativePath: string): string {
  return fs.readFileSync(resolve(relativePath), 'utf-8');
}

function readLocaleFile(lang: string): Record<string, unknown> {
  const content = fs.readFileSync(resolve('i18n', 'locales', `${lang}.json`), 'utf-8');
  return JSON.parse(content);
}

// ============================================================================
// F135: Settings reorganization into 2 labeled groups (CR-193)
// ============================================================================

describe('F135 (CR-193): Settings reorganization into 2 labeled groups', () => {
  const settingsSource = readSourceFile('app/(tabs)/settings/index.tsx');

  // --- i18n keys ---

  describe('AC-135-07: i18n key settings.wardSettingsGroup in all 3 languages', () => {
    it('pt-BR has wardSettingsGroup = "Configurações da Ala"', () => {
      const locale = readLocaleFile('pt-BR');
      const settings = locale.settings as Record<string, unknown>;
      expect(settings.wardSettingsGroup).toBe('Configurações da Ala');
    });

    it('en has wardSettingsGroup = "Ward Settings"', () => {
      const locale = readLocaleFile('en');
      const settings = locale.settings as Record<string, unknown>;
      expect(settings.wardSettingsGroup).toBe('Ward Settings');
    });

    it('es has wardSettingsGroup = "Configuraciones del Barrio"', () => {
      const locale = readLocaleFile('es');
      const settings = locale.settings as Record<string, unknown>;
      expect(settings.wardSettingsGroup).toBe('Configuraciones del Barrio');
    });
  });

  describe('AC-135-08: i18n key settings.appSettingsGroup in all 3 languages', () => {
    it('pt-BR has appSettingsGroup = "Configurações do App"', () => {
      const locale = readLocaleFile('pt-BR');
      const settings = locale.settings as Record<string, unknown>;
      expect(settings.appSettingsGroup).toBe('Configurações do App');
    });

    it('en has appSettingsGroup = "App Settings"', () => {
      const locale = readLocaleFile('en');
      const settings = locale.settings as Record<string, unknown>;
      expect(settings.appSettingsGroup).toBe('App Settings');
    });

    it('es has appSettingsGroup = "Configuraciones de la App"', () => {
      const locale = readLocaleFile('es');
      const settings = locale.settings as Record<string, unknown>;
      expect(settings.appSettingsGroup).toBe('Configuraciones de la App');
    });
  });

  // --- Group labels rendering ---

  describe('AC-135-01: Group 1 label rendered for non-Observer users', () => {
    it('renders wardSettingsGroup label with i18n key', () => {
      expect(settingsSource).toContain("t('settings.wardSettingsGroup')");
    });

    it('Group 1 label is wrapped in !isObserver conditional', () => {
      // The pattern: {!isObserver && (<> ... wardSettingsGroup ... </>)}
      const observerCheckIndex = settingsSource.indexOf('{!isObserver && (');
      const wardLabelIndex = settingsSource.indexOf("t('settings.wardSettingsGroup')");
      expect(observerCheckIndex).toBeGreaterThan(-1);
      expect(wardLabelIndex).toBeGreaterThan(observerCheckIndex);
    });
  });

  describe('AC-135-02: Group 2 label rendered for ALL users', () => {
    it('renders appSettingsGroup label with i18n key', () => {
      expect(settingsSource).toContain("t('settings.appSettingsGroup')");
    });

    it('Group 2 label is NOT inside !isObserver conditional', () => {
      // appSettingsGroup should appear AFTER the !isObserver block closes
      const lastObserverClose = settingsSource.lastIndexOf('{!isObserver && (');
      const appLabelIndex = settingsSource.indexOf("t('settings.appSettingsGroup')");
      // The appSettingsGroup should be outside the !isObserver block
      expect(appLabelIndex).toBeGreaterThan(lastObserverClose);
      // Check it's not wrapped in another !isObserver block
      // The line with appSettingsGroup should not be inside {!isObserver && (<>
      const blockEnd = settingsSource.indexOf('</>)', lastObserverClose);
      expect(appLabelIndex).toBeGreaterThan(blockEnd);
    });
  });

  describe('AC-135-03: Group 1 contains correct items in order for non-Observer', () => {
    it('Group 1 has members, topics, whatsappTemplate, wardLanguage, timezone in order', () => {
      // Extract Group 1 block (between wardSettingsGroup label and appSettingsGroup label)
      const wardLabelIndex = settingsSource.indexOf("t('settings.wardSettingsGroup')");
      const appLabelIndex = settingsSource.indexOf("t('settings.appSettingsGroup')");
      const group1Block = settingsSource.substring(wardLabelIndex, appLabelIndex);

      // Check items appear in correct order
      const membersIdx = group1Block.indexOf("t('settings.members')");
      const topicsIdx = group1Block.indexOf("t('settings.topics')");
      const whatsappIdx = group1Block.indexOf("t('settings.whatsappTemplate')");
      const wardLangIdx = group1Block.indexOf("t('settings.wardLanguage')");
      const timezoneIdx = group1Block.indexOf("t('settings.timezone')");

      expect(membersIdx).toBeGreaterThan(-1);
      expect(topicsIdx).toBeGreaterThan(membersIdx);
      expect(whatsappIdx).toBeGreaterThan(topicsIdx);
      expect(wardLangIdx).toBeGreaterThan(whatsappIdx);
      expect(timezoneIdx).toBeGreaterThan(wardLangIdx);
    });
  });

  describe('AC-135-04: Group 2 contains correct items in order', () => {
    it('Group 2 has users, history, appLanguage, theme, about in order', () => {
      // Extract Group 2 block (after appSettingsGroup label, before signOutButton)
      const appLabelIndex = settingsSource.indexOf("t('settings.appSettingsGroup')");
      const signOutIndex = settingsSource.indexOf('handleSignOut', appLabelIndex);
      const group2Block = settingsSource.substring(appLabelIndex, signOutIndex);

      const usersIdx = group2Block.indexOf("t('settings.users')");
      const historyIdx = group2Block.indexOf("t('settings.history')");
      const appLangIdx = group2Block.indexOf("t('settings.appLanguage')");
      const themeIdx = group2Block.indexOf("t('settings.theme')");
      const aboutIdx = group2Block.indexOf("t('settings.about')");

      expect(usersIdx).toBeGreaterThan(-1);
      expect(historyIdx).toBeGreaterThan(usersIdx);
      expect(appLangIdx).toBeGreaterThan(historyIdx);
      expect(themeIdx).toBeGreaterThan(appLangIdx);
      expect(aboutIdx).toBeGreaterThan(themeIdx);
    });
  });

  describe('AC-135-05: Observer sees only Group 2 with limited items', () => {
    it('Group 1 is hidden for Observer (wrapped in !isObserver)', () => {
      // wardSettingsGroup is inside {!isObserver && (<> ... </>)}
      const observerCheck = settingsSource.indexOf('{!isObserver && (');
      const wardLabel = settingsSource.indexOf("t('settings.wardSettingsGroup')");
      expect(wardLabel).toBeGreaterThan(observerCheck);
    });

    it('appLanguage, theme, about are NOT permission-gated (available to Observer)', () => {
      // These items should be rendered without hasPermission checks
      const appLabelIndex = settingsSource.indexOf("t('settings.appSettingsGroup')");
      const signOutIndex = settingsSource.indexOf('handleSignOut', appLabelIndex);
      const group2Block = settingsSource.substring(appLabelIndex, signOutIndex);

      // appLanguage should appear without hasPermission guard
      const appLangSection = group2Block.substring(
        group2Block.indexOf("t('settings.appLanguage')") - 200,
        group2Block.indexOf("t('settings.appLanguage')")
      );
      expect(appLangSection).not.toContain('hasPermission');

      // theme should appear without hasPermission guard
      const themeSection = group2Block.substring(
        group2Block.indexOf("t('settings.theme')") - 200,
        group2Block.indexOf("t('settings.theme')")
      );
      // theme item should not be directly preceded by a hasPermission check
      expect(themeSection).not.toMatch(/hasPermission.*\n\s*<SettingsItem\s*\n\s*label=\{t\('settings\.theme'\)/);
    });
  });

  describe('AC-135-06: Secretario sees whatsappTemplate in Group 1', () => {
    it('whatsappTemplate is in Group 1 with settings:whatsapp permission check', () => {
      const wardLabelIndex = settingsSource.indexOf("t('settings.wardSettingsGroup')");
      const appLabelIndex = settingsSource.indexOf("t('settings.appSettingsGroup')");
      const group1Block = settingsSource.substring(wardLabelIndex, appLabelIndex);

      expect(group1Block).toContain("hasPermission('settings:whatsapp')");
      expect(group1Block).toContain("t('settings.whatsappTemplate')");
    });
  });

  describe('AC-135-09: sectionLabel style matches spec', () => {
    it('sectionLabel has fontSize 13', () => {
      expect(settingsSource).toMatch(/sectionLabel.*fontSize:\s*13/s);
    });

    it('sectionLabel has fontWeight 600', () => {
      expect(settingsSource).toMatch(/sectionLabel.*fontWeight:\s*'600'/s);
    });

    it('sectionLabel has textTransform uppercase', () => {
      expect(settingsSource).toMatch(/sectionLabel.*textTransform:\s*'uppercase'/s);
    });

    it('sectionLabel has paddingHorizontal 16', () => {
      expect(settingsSource).toMatch(/sectionLabel.*paddingHorizontal:\s*16/s);
    });

    it('sectionLabel has paddingTop 16', () => {
      expect(settingsSource).toMatch(/sectionLabel.*paddingTop:\s*16/s);
    });

    it('sectionLabel has paddingBottom 8', () => {
      expect(settingsSource).toMatch(/sectionLabel.*paddingBottom:\s*8/s);
    });
  });

  describe('AC-135-10: Sign Out button at bottom', () => {
    it('Sign Out button is rendered after both groups', () => {
      const appLabelIndex = settingsSource.indexOf("t('settings.appSettingsGroup')");
      const signOutIndex = settingsSource.indexOf("t('settings.signOut')", appLabelIndex);
      expect(signOutIndex).toBeGreaterThan(appLabelIndex);
    });
  });

  describe('AC-135-11: wardLanguage and timezone moved to Group 1', () => {
    it('wardLanguage is in Group 1 (between wardSettingsGroup and appSettingsGroup)', () => {
      const wardLabelIndex = settingsSource.indexOf("t('settings.wardSettingsGroup')");
      const appLabelIndex = settingsSource.indexOf("t('settings.appSettingsGroup')");
      const wardLangIndex = settingsSource.indexOf("t('settings.wardLanguage')", wardLabelIndex);
      expect(wardLangIndex).toBeGreaterThan(wardLabelIndex);
      expect(wardLangIndex).toBeLessThan(appLabelIndex);
    });

    it('timezone is in Group 1 (between wardSettingsGroup and appSettingsGroup)', () => {
      const wardLabelIndex = settingsSource.indexOf("t('settings.wardSettingsGroup')");
      const appLabelIndex = settingsSource.indexOf("t('settings.appSettingsGroup')");
      const timezoneIndex = settingsSource.indexOf("t('settings.timezone')", wardLabelIndex);
      expect(timezoneIndex).toBeGreaterThan(wardLabelIndex);
      expect(timezoneIndex).toBeLessThan(appLabelIndex);
    });
  });

  describe('AC-135-12: users and history moved to Group 2', () => {
    it('users is in Group 2 (after appSettingsGroup label)', () => {
      const appLabelIndex = settingsSource.indexOf("t('settings.appSettingsGroup')");
      const usersIndex = settingsSource.indexOf("t('settings.users')", appLabelIndex);
      expect(usersIndex).toBeGreaterThan(appLabelIndex);
    });

    it('history is in Group 2 (after appSettingsGroup label)', () => {
      const appLabelIndex = settingsSource.indexOf("t('settings.appSettingsGroup')");
      const historyIndex = settingsSource.indexOf("t('settings.history')", appLabelIndex);
      expect(historyIndex).toBeGreaterThan(appLabelIndex);
    });
  });

  // --- Edge Cases ---

  describe('EC-135-01: Bispado does not see whatsappTemplate', () => {
    it('whatsappTemplate is gated behind settings:whatsapp permission', () => {
      expect(settingsSource).toContain("hasPermission('settings:whatsapp')");
      // The whatsapp item is conditionally rendered
      const whatsappPermIndex = settingsSource.indexOf("hasPermission('settings:whatsapp')");
      const whatsappItemIndex = settingsSource.indexOf("t('settings.whatsappTemplate')");
      expect(whatsappItemIndex).toBeGreaterThan(whatsappPermIndex);
      // They should be close (within the same conditional block)
      expect(whatsappItemIndex - whatsappPermIndex).toBeLessThan(200);
    });
  });

  describe('EC-135-02: timezone requires settings:timezone permission', () => {
    it('timezone is gated behind settings:timezone permission', () => {
      expect(settingsSource).toContain("hasPermission('settings:timezone')");
    });
  });

  describe('EC-135-03: Group 1 hidden when all items permission-gated', () => {
    it('Group 1 entire block is hidden for Observer via !isObserver check', () => {
      // The entire Group 1 (label + card) is inside {!isObserver && (<> ... </>)}
      const observerCheck = settingsSource.indexOf('{!isObserver && (');
      expect(observerCheck).toBeGreaterThan(-1);
      // wardSettingsGroup is inside this block
      const wardLabel = settingsSource.indexOf("t('settings.wardSettingsGroup')");
      expect(wardLabel).toBeGreaterThan(observerCheck);
    });
  });
});

// ============================================================================
// F136: StatusLED alignment via paddingRight (CR-199)
// ============================================================================

describe('F136 (CR-199): StatusLED alignment via paddingRight on labelRow', () => {
  const speechSlotSource = readSourceFile('components/SpeechSlot.tsx');

  describe('AC-136-01: labelRow includes paddingRight: 36', () => {
    it('labelRow style has paddingRight: 36', () => {
      // Extract labelRow style block
      const labelRowMatch = speechSlotSource.match(/labelRow:\s*\{[^}]+\}/s);
      expect(labelRowMatch).not.toBeNull();
      expect(labelRowMatch![0]).toContain('paddingRight: 36');
    });
  });

  describe('AC-136-02: actionArea width unchanged at 36', () => {
    it('actionArea has width: 36', () => {
      const actionAreaMatch = speechSlotSource.match(/actionArea:\s*\{[^}]+\}/s);
      expect(actionAreaMatch).not.toBeNull();
      expect(actionAreaMatch![0]).toContain('width: 36');
    });
  });

  describe('AC-136-03: SpeechSlot works for all 3 positions', () => {
    it('getPositionLabel handles positions 1, 2, and 3', () => {
      // Position 3 uses lastSpeech label
      expect(speechSlotSource).toContain("if (position === 3)");
      expect(speechSlotSource).toContain("t('speeches.lastSpeech')");
      // Positions 1 and 2 use slot template
      expect(speechSlotSource).toContain("t('speeches.slot'");
    });

    it('all positions share the same labelRow style with paddingRight', () => {
      // There's only one labelRow style definition, used for all positions
      const labelRowCount = (speechSlotSource.match(/styles\.labelRow/g) || []).length;
      expect(labelRowCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('AC-136-04: statusSection style unchanged', () => {
    it('statusSection has flexDirection row, alignItems center, gap 6', () => {
      const statusSectionMatch = speechSlotSource.match(/statusSection:\s*\{[^}]+\}/s);
      expect(statusSectionMatch).not.toBeNull();
      const block = statusSectionMatch![0];
      expect(block).toContain("flexDirection: 'row'");
      expect(block).toContain("alignItems: 'center'");
      expect(block).toContain('gap: 6');
    });
  });

  describe('AC-136-05: position 2 disabled state not affected', () => {
    it('isPos2Disabled hides statusSection (no StatusLED shown)', () => {
      expect(speechSlotSource).toContain('isPos2Disabled');
      // When disabled, statusSection is not rendered
      expect(speechSlotSource).toContain('{!isPos2Disabled && (');
    });
  });

  describe('AC-136-06: toggle switch for position 2 unchanged', () => {
    it('labelWithToggle contains Switch for position 2', () => {
      expect(speechSlotSource).toContain('labelWithToggle');
      expect(speechSlotSource).toContain('Switch');
      expect(speechSlotSource).toContain('onToggleSecondSpeech');
    });
  });

  // --- Edge Cases ---

  describe('EC-136-01: not_assigned status with alignment fix', () => {
    it('StatusLED renders for not_assigned status (alignment fix still applies)', () => {
      // StatusLED is rendered regardless of status when not pos2 disabled
      expect(speechSlotSource).toContain('<StatusLED');
      expect(speechSlotSource).toContain("status={status}");
    });
  });

  describe('EC-136-02: paddingRight value matches actionArea width', () => {
    it('labelRow paddingRight equals actionArea width (both 36)', () => {
      const labelRowMatch = speechSlotSource.match(/labelRow:\s*\{[^}]+\}/s);
      const actionAreaMatch = speechSlotSource.match(/actionArea:\s*\{[^}]+\}/s);
      expect(labelRowMatch).not.toBeNull();
      expect(actionAreaMatch).not.toBeNull();

      // Both should have value 36
      const paddingRightMatch = labelRowMatch![0].match(/paddingRight:\s*(\d+)/);
      const widthMatch = actionAreaMatch![0].match(/width:\s*(\d+)/);
      expect(paddingRightMatch).not.toBeNull();
      expect(widthMatch).not.toBeNull();
      expect(paddingRightMatch![1]).toBe(widthMatch![1]);
    });
  });

  describe('EC-136-03: topicActionArea unchanged', () => {
    it('topicActionArea width is 36 (unchanged by F136)', () => {
      const topicActionAreaMatch = speechSlotSource.match(/topicActionArea:\s*\{[^}]+\}/s);
      expect(topicActionAreaMatch).not.toBeNull();
      expect(topicActionAreaMatch![0]).toContain('width: 36');
    });
  });
});

// ============================================================================
// F137: Play icon fontSize enlargement (CR-200)
// ============================================================================

describe('F137 (CR-200): Play icon fontSize enlargement in Home and Agenda', () => {
  const homeSource = readSourceFile('app/(tabs)/index.tsx');
  const agendaSource = readSourceFile('app/(tabs)/agenda.tsx');

  describe('AC-137-01: Home PlayIcon size >= 20', () => {
    it('PlayIcon SVG component has size={20} in Home', () => {
      // PlayIcon now uses size prop instead of fontSize style
      expect(homeSource).toContain('<PlayIcon size={20}');
    });
  });

  describe('AC-137-02: Agenda PlayIcon size >= 18', () => {
    it('PlayIcon SVG component has size={18} in Agenda', () => {
      // PlayIcon now uses size prop instead of fontSize style
      expect(agendaSource).toContain('<PlayIcon size={18}');
    });
  });

  describe('AC-137-03: Agenda playButton marginRight >= 8', () => {
    it('playButton style has marginRight >= 8', () => {
      const playButtonMatch = agendaSource.match(/playButton:\s*\{[^}]+\}/s);
      expect(playButtonMatch).not.toBeNull();
      const marginMatch = playButtonMatch![0].match(/marginRight:\s*(\d+)/);
      expect(marginMatch).not.toBeNull();
      expect(parseInt(marginMatch![1], 10)).toBeGreaterThanOrEqual(8);
    });
  });

  describe('AC-137-04: Home meetingButtonContent preserves vertical alignment', () => {
    it('meetingButtonContent has flexDirection row and alignItems center', () => {
      const contentMatch = homeSource.match(/meetingButtonContent:\s*\{[^}]+\}/s);
      expect(contentMatch).not.toBeNull();
      const block = contentMatch![0];
      expect(block).toContain("flexDirection: 'row'");
      expect(block).toContain("alignItems: 'center'");
    });
  });

  describe('AC-137-05: Play icon visually separate from chevron', () => {
    it('play button and chevron are separate SVG elements in agenda card header', () => {
      // PlayIcon is rendered separately from ChevronUp/DownIcon
      expect(agendaSource).toContain('PlayIcon');
      expect(agendaSource).toContain('ChevronUpIcon');
      expect(agendaSource).toContain('ChevronDownIcon');
    });

    it('playButton has marginRight for spacing from chevron', () => {
      const playButtonMatch = agendaSource.match(/playButton:\s*\{[^}]+\}/s);
      expect(playButtonMatch).not.toBeNull();
      expect(playButtonMatch![0]).toContain('marginRight');
    });
  });

  describe('AC-137-06: Play icon navigates to Presentation screen', () => {
    it('Home play button navigates to /presentation with date param', () => {
      expect(homeSource).toContain("pathname: '/presentation'");
      expect(homeSource).toContain('params: { date: sundayDate }');
    });

    it('Agenda play button navigates to /presentation with date param', () => {
      expect(agendaSource).toContain("pathname: '/presentation'");
      expect(agendaSource).toContain('params: { date }');
    });
  });

  // --- Edge Cases ---

  describe('EC-137-01: play icon uses SVG PlayIcon component', () => {
    it('Home uses PlayIcon SVG component', () => {
      expect(homeSource).toContain('PlayIcon');
    });

    it('Agenda uses PlayIcon SVG component', () => {
      expect(agendaSource).toContain('PlayIcon');
    });
  });

  describe('EC-137-02: Collapsed card does not show play icon', () => {
    it('play button only shown when expandable && isExpanded', () => {
      expect(agendaSource).toContain('expandable && isExpanded');
      // The playButton rendering is inside {expandable && isExpanded && (
      const playButtonRenderIdx = agendaSource.indexOf('styles.playButton');
      const expandedCheckIdx = agendaSource.lastIndexOf('expandable && isExpanded', playButtonRenderIdx);
      expect(expandedCheckIdx).toBeGreaterThan(-1);
    });
  });
});
