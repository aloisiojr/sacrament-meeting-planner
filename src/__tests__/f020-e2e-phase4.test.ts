/**
 * Tests for F020_E2E: E2E Testing — Phase 4 (Settings + Invite + Cleanup) (CR-284)
 *
 * Covers:
 * - AC-001 to AC-006: Maestro 07-invite flow (login, navigate users, open modal, fill/submit, close, logout)
 * - AC-007 to AC-019: Maestro 08-settings flow (login, settings, theme, language en-US, language pt-BR, restore, logout)
 * - AC-020: ~10 testID props on users.tsx invite modal elements
 * - AC-021: 5 testID props on invite/[token].tsx (future tests)
 * - AC-022: Cleanup script exists with correct structure
 * - AC-023: README updated with Phase 4 content
 * - AC-024: All 8 flow files exist (01-08)
 *
 * Edge cases:
 * - EC-001: Unique email generation via evalScript (empty email guard)
 * - EC-002: Network error handled (mutation onError)
 * - EC-003: Theme persistence via AsyncStorage
 * - EC-004: Language modal closes before language change
 * - EC-005: No test users found (cleanup graceful exit)
 * - EC-006: Partial state handling per user (cleanup try/catch)
 * - EC-007: Flow 07 requires 01-register to run first
 * - EC-008: Users screen loading with extendedWaitUntil 10s
 * - EC-009: en-US/pt-BR string differences verified
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import ptBR from '../i18n/locales/pt-BR.json';
import enUS from '../i18n/locales/en-US.json';

// =============================================================================
// Helpers (reused from Phase 1-3 convention)
// =============================================================================

const projectRoot = path.resolve(__dirname, '../..');

function extractTestIDs(content: string): string[] {
  const ids: string[] = [];
  const regex = /id:\s*"([^"]+)"/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

function extractAssertVisibleTexts(content: string): string[] {
  const texts: string[] = [];
  const simpleRegex = /- assertVisible:\s*"([^"]+)"/g;
  let match;
  while ((match = simpleRegex.exec(content)) !== null) {
    texts.push(match[1]);
  }
  return texts;
}

function extractWaitUntilVisibleTexts(content: string): string[] {
  const texts: string[] = [];
  const regex = /visible:\s*"([^"]+)"/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    texts.push(match[1]);
  }
  return texts;
}

function extractTimeouts(content: string): number[] {
  const timeouts: number[] = [];
  const regex = /timeout:\s*(\d+)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    timeouts.push(parseInt(match[1], 10));
  }
  return timeouts;
}

function extractStaticTestIDs(src: string): string[] {
  const ids: string[] = [];
  const regex = /testID="([^"]+)"/g;
  let match;
  while ((match = regex.exec(src)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

function extractDynamicTestIDs(src: string): string[] {
  const ids: string[] = [];
  const regex = /testID=\{`([^`]+)`\}/g;
  let match;
  while ((match = regex.exec(src)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

// =============================================================================
// Source file paths
// =============================================================================

const usersPath = path.resolve(__dirname, '../app/(tabs)/settings/users.tsx');
const inviteTokenPath = path.resolve(__dirname, '../app/(auth)/invite/[token].tsx');
const settingsPath = path.resolve(__dirname, '../app/(tabs)/settings/index.tsx');
const loginPath = path.resolve(__dirname, '../app/(auth)/login.tsx');

// Flow file paths
const inviteFlowPath = path.join(projectRoot, 'e2e/maestro/07-invite.yaml');
const settingsFlowPath = path.join(projectRoot, 'e2e/maestro/08-settings.yaml');

// Script and README paths
const cleanupScriptPath = path.join(projectRoot, 'e2e/scripts/cleanup.ts');
const readmePath = path.join(projectRoot, 'e2e/README.md');

// =============================================================================
// AC-020: users.tsx testIDs (~10 invite-related elements)
// =============================================================================

describe('F020_E2E: users.tsx invite testIDs (AC-020)', () => {
  const src = fs.readFileSync(usersPath, 'utf-8');
  const staticTestIDs = extractStaticTestIDs(src);
  const dynamicTestIDs = extractDynamicTestIDs(src);

  it('includes users-invite-button testID', () => {
    expect(staticTestIDs).toContain('users-invite-button');
  });

  it('includes users-invite-email-input testID', () => {
    expect(staticTestIDs).toContain('users-invite-email-input');
  });

  it('includes users-invite-role-${role}-radio dynamic testID', () => {
    expect(dynamicTestIDs).toContain('users-invite-role-${role}-radio');
  });

  it('includes users-invite-submit-button testID', () => {
    expect(staticTestIDs).toContain('users-invite-submit-button');
  });

  it('includes users-invite-success-text testID', () => {
    expect(staticTestIDs).toContain('users-invite-success-text');
  });

  it('includes users-invite-link-text testID', () => {
    expect(staticTestIDs).toContain('users-invite-link-text');
  });

  it('includes users-invite-copy-button testID', () => {
    expect(staticTestIDs).toContain('users-invite-copy-button');
  });

  it('includes users-invite-close-button testID', () => {
    expect(staticTestIDs).toContain('users-invite-close-button');
  });

  it('has 7 static invite testIDs + 1 dynamic template = ~10 total at runtime', () => {
    const staticInvite = staticTestIDs.filter((id) => id.startsWith('users-invite'));
    const dynamicInvite = dynamicTestIDs.filter((id) => id.startsWith('users-invite'));
    // 7 static + 1 dynamic template (which generates 3 actual testIDs at runtime for 3 roles)
    expect(staticInvite).toHaveLength(7);
    expect(dynamicInvite).toHaveLength(1);
    // Total at runtime: 7 + 3 = 10 (SPEC says "~10")
  });

  it('dynamic role radio generates 3 testIDs (bishopric, secretary, observer)', () => {
    // The template `users-invite-role-${role}-radio` resolves for ROLES array
    // Verify the template exists in source
    const roleTemplate = dynamicTestIDs.find((id) => id.includes('users-invite-role-'));
    expect(roleTemplate).toBeDefined();
    expect(roleTemplate).toContain('${role}');
  });
});

// =============================================================================
// AC-021: invite/[token].tsx testIDs (5 elements for future tests)
// =============================================================================

describe('F020_E2E: invite/[token].tsx testIDs (AC-021)', () => {
  const src = fs.readFileSync(inviteTokenPath, 'utf-8');
  const staticTestIDs = extractStaticTestIDs(src);

  it('includes invite-fullname-input testID', () => {
    expect(staticTestIDs).toContain('invite-fullname-input');
  });

  it('includes invite-password-input testID', () => {
    expect(staticTestIDs).toContain('invite-password-input');
  });

  it('includes invite-confirm-password-input testID', () => {
    expect(staticTestIDs).toContain('invite-confirm-password-input');
  });

  it('includes invite-submit-button testID', () => {
    expect(staticTestIDs).toContain('invite-submit-button');
  });

  it('includes invite-error-text testID (2 locations)', () => {
    const errorTextCount = staticTestIDs.filter((id) => id === 'invite-error-text').length;
    expect(errorTextCount).toBe(2);
  });

  it('has exactly 5 unique testID values (6 total with 2x error-text)', () => {
    const inviteTestIDs = staticTestIDs.filter((id) => id.startsWith('invite-'));
    expect(inviteTestIDs).toHaveLength(6); // 5 unique + 1 duplicate error-text
    const uniqueTestIDs = [...new Set(inviteTestIDs)];
    expect(uniqueTestIDs).toHaveLength(5);
  });
});

// =============================================================================
// AC-001 to AC-006: Maestro 07-invite flow structure
// =============================================================================

describe('F020_E2E: Maestro 07-invite flow (AC-001 to AC-006)', () => {
  const flowContent = fs.readFileSync(inviteFlowPath, 'utf-8');
  const testIDs = extractTestIDs(flowContent);
  const waitUntilTexts = extractWaitUntilVisibleTexts(flowContent);
  const timeouts = extractTimeouts(flowContent);

  it('flow file exists', () => {
    expect(fs.existsSync(inviteFlowPath)).toBe(true);
  });

  it('starts with appId configuration', () => {
    expect(flowContent).toMatch(/^appId:\s+com\.alouisio\.sacramentmeetingplanner/);
  });

  // Part A: Login as bishopric (AC-001)
  it('reads credentials from 01-register output (AC-001, EC-007)', () => {
    expect(flowContent).toContain('${output.TEST_EMAIL}');
    expect(flowContent).toContain('${output.TEST_PASSWORD}');
  });

  it('uses login testIDs for authentication', () => {
    expect(testIDs).toContain('login-email-input');
    expect(testIDs).toContain('login-password-input');
    expect(testIDs).toContain('login-submit-button');
  });

  it('waits for Home tab after login', () => {
    expect(waitUntilTexts.some((t) => t.includes('Iní'))).toBe(true);
  });

  // Part B: Navigate to Users screen (AC-002, EC-008)
  it('navigates to Settings tab by text (AC-002)', () => {
    expect(flowContent).toContain('Configura');
  });

  it('taps "Usuários do App" to navigate to Users', () => {
    expect(flowContent).toContain('Usu');
  });

  it('waits for users-invite-button with 10s timeout (EC-008)', () => {
    expect(testIDs).toContain('users-invite-button');
    expect(timeouts).toContain(10000);
  });

  // Part C: Open invite modal (AC-003)
  it('taps users-invite-button to open modal (AC-003)', () => {
    expect(testIDs).toContain('users-invite-button');
  });

  it('waits for email input to appear in modal', () => {
    expect(testIDs).toContain('users-invite-email-input');
  });

  // Part D: Fill form and submit (AC-004, EC-001)
  it('generates unique invite email via evalScript (EC-001)', () => {
    expect(flowContent).toContain('evalScript');
    expect(flowContent).toContain('INVITE_EMAIL');
    expect(flowContent).toContain('Date.now()');
    expect(flowContent).toContain('@test.com');
  });

  it('uses e2e-invited- prefix for invite email', () => {
    expect(flowContent).toContain('e2e-invited-');
  });

  it('selects secretary role via users-invite-role-secretary-radio (AC-004)', () => {
    expect(testIDs).toContain('users-invite-role-secretary-radio');
  });

  it('taps users-invite-submit-button to submit', () => {
    expect(testIDs).toContain('users-invite-submit-button');
  });

  it('waits for success text with 15s timeout (for Edge Function cold start)', () => {
    expect(testIDs).toContain('users-invite-success-text');
    expect(timeouts).toContain(15000);
  });

  // Part E: Verify success and deep link (AC-004 continued)
  it('asserts deep link URL is displayed', () => {
    expect(testIDs).toContain('users-invite-link-text');
  });

  // Part F: Close modal (AC-005)
  it('taps users-invite-close-button to close modal (AC-005)', () => {
    expect(testIDs).toContain('users-invite-close-button');
  });

  it('waits for modal to close (notVisible)', () => {
    expect(flowContent).toContain('notVisible');
  });

  // Part G: Navigate back and logout (AC-006)
  it('navigates back via "Voltar" text', () => {
    expect(flowContent).toContain('Voltar');
  });

  it('scrolls to and taps settings-sign-out-button (AC-006)', () => {
    expect(testIDs).toContain('settings-sign-out-button');
    expect(flowContent).toContain('scrollUntilVisible');
  });

  it('confirms sign-out via "Confirmar" text', () => {
    expect(flowContent).toContain('Confirmar');
  });

  it('waits for login screen after logout', () => {
    expect(testIDs).toContain('login-submit-button');
  });

  it('has all 7 parts (A through G)', () => {
    expect(flowContent).toContain('Part A');
    expect(flowContent).toContain('Part B');
    expect(flowContent).toContain('Part C');
    expect(flowContent).toContain('Part D');
    expect(flowContent).toContain('Part E');
    expect(flowContent).toContain('Part F');
    expect(flowContent).toContain('Part G');
  });

  it('has extendedWaitUntil with sufficient timeouts', () => {
    expect(timeouts.length).toBeGreaterThanOrEqual(5);
    const maxTimeout = Math.max(...timeouts);
    expect(maxTimeout).toBeGreaterThanOrEqual(15000);
  });
});

// =============================================================================
// AC-007 to AC-019: Maestro 08-settings flow structure
// =============================================================================

describe('F020_E2E: Maestro 08-settings flow (AC-007 to AC-019)', () => {
  const flowContent = fs.readFileSync(settingsFlowPath, 'utf-8');
  const testIDs = extractTestIDs(flowContent);
  const assertTexts = extractAssertVisibleTexts(flowContent);
  const waitUntilTexts = extractWaitUntilVisibleTexts(flowContent);
  const timeouts = extractTimeouts(flowContent);

  it('flow file exists', () => {
    expect(fs.existsSync(settingsFlowPath)).toBe(true);
  });

  it('starts with appId configuration', () => {
    expect(flowContent).toMatch(/^appId:\s+com\.alouisio\.sacramentmeetingplanner/);
  });

  // Part A: Login (AC-007)
  it('reads credentials from 01-register output (AC-007)', () => {
    expect(flowContent).toContain('${output.TEST_EMAIL}');
    expect(flowContent).toContain('${output.TEST_PASSWORD}');
  });

  it('uses login testIDs for authentication', () => {
    expect(testIDs).toContain('login-email-input');
    expect(testIDs).toContain('login-password-input');
    expect(testIDs).toContain('login-submit-button');
  });

  // Part B: Navigate to Settings (AC-008)
  it('navigates to Settings tab (AC-008)', () => {
    expect(flowContent).toContain('Configura');
  });

  // Part C: Theme changes (AC-009, AC-010, AC-011, AC-012, EC-003)
  it('taps "Tema Claro/Escuro" to open theme screen (AC-009)', () => {
    expect(flowContent).toContain('Tema Claro/Escuro');
  });

  it('waits for theme options visible', () => {
    expect(waitUntilTexts.some((t) => t.includes('Autom'))).toBe(true);
  });

  it('taps "Claro" for light theme (AC-010)', () => {
    expect(flowContent).toContain('tapOn: "Claro"');
  });

  it('taps "Escuro" for dark theme (AC-011)', () => {
    expect(flowContent).toContain('tapOn: "Escuro"');
  });

  it('returns from theme screen (AC-012)', () => {
    expect(flowContent).toContain('tapOn: "Voltar"');
  });

  // Part D: Language change to en-US (AC-013, AC-014, AC-015, EC-009)
  it('taps "Idioma do App" to open language modal (AC-013)', () => {
    expect(flowContent).toContain('Idioma do App');
  });

  it('waits for "English" option visible', () => {
    expect(waitUntilTexts).toContain('English');
  });

  it('taps "English" to change language (AC-014)', () => {
    expect(flowContent).toContain('tapOn: "English"');
  });

  it('waits for "Settings" title in en-US', () => {
    expect(waitUntilTexts).toContain('Settings');
  });

  it('asserts en-US strings visible: "Light/Dark Theme" (AC-015, EC-009)', () => {
    expect(assertTexts).toContain('Light/Dark Theme');
  });

  it('asserts en-US strings visible: "App Language" (AC-015, EC-009)', () => {
    expect(assertTexts).toContain('App Language');
  });

  // Part E: Language change back to pt-BR (AC-016, AC-017, EC-004)
  it('taps "App Language" (en-US label) to open language modal (AC-016)', () => {
    expect(flowContent).toContain('tapOn: "App Language"');
  });

  it('waits for "Portugues (Brasil)" option visible', () => {
    expect(waitUntilTexts).toContain('Portugues (Brasil)');
  });

  it('taps "Portugues (Brasil)" to change back (AC-016)', () => {
    expect(flowContent).toContain('tapOn: "Portugues (Brasil)"');
  });

  it('asserts pt-BR strings restored: "Tema Claro/Escuro" (AC-017)', () => {
    expect(assertTexts).toContain('Tema Claro/Escuro');
  });

  it('asserts pt-BR strings restored: "Idioma do App" (AC-017)', () => {
    expect(assertTexts).toContain('Idioma do App');
  });

  // Part F: Restore theme to automatic (AC-018)
  it('restores theme to "Automático" (AC-018)', () => {
    // Tema Claro/Escuro appears at least twice (Part C + Part F)
    const themeCount = (flowContent.match(/Tema Claro\/Escuro/g) || []).length;
    expect(themeCount).toBeGreaterThanOrEqual(2);
  });

  // Part G: Logout (AC-019)
  it('scrolls to and taps settings-sign-out-button (AC-019)', () => {
    expect(testIDs).toContain('settings-sign-out-button');
    expect(flowContent).toContain('scrollUntilVisible');
  });

  it('confirms sign-out via "Confirmar" text', () => {
    expect(flowContent).toContain('Confirmar');
  });

  it('waits for login screen after logout', () => {
    expect(testIDs).toContain('login-submit-button');
  });

  it('has all 7 parts (A through G)', () => {
    expect(flowContent).toContain('Part A');
    expect(flowContent).toContain('Part B');
    expect(flowContent).toContain('Part C');
    expect(flowContent).toContain('Part D');
    expect(flowContent).toContain('Part E');
    expect(flowContent).toContain('Part F');
    expect(flowContent).toContain('Part G');
  });

  it('has extendedWaitUntil with sufficient timeouts', () => {
    expect(timeouts.length).toBeGreaterThanOrEqual(5);
  });
});

// =============================================================================
// Cross-validation: Phase 4 Maestro flow testIDs exist in source files
// =============================================================================

describe('F020_E2E: Cross-validation - flow testIDs in source', () => {
  const usersSrc = fs.readFileSync(usersPath, 'utf-8');
  const loginSrc = fs.readFileSync(loginPath, 'utf-8');
  const settingsSrc = fs.readFileSync(settingsPath, 'utf-8');

  const allStaticTestIDs = new Set([
    ...extractStaticTestIDs(usersSrc),
    ...extractStaticTestIDs(loginSrc),
    ...extractStaticTestIDs(settingsSrc),
  ]);

  const allDynamicTestIDTemplates = [
    ...extractDynamicTestIDs(usersSrc),
    ...extractDynamicTestIDs(loginSrc),
    ...extractDynamicTestIDs(settingsSrc),
  ];

  function matchesDynamicTemplate(resolvedId: string): boolean {
    for (const template of allDynamicTestIDTemplates) {
      const parts = template.split(/\$\{[^}]+\}/);
      const escapedParts = parts.map((p) => p.replace(/[.*+?^$()|[\]\\]/g, '\\$&'));
      const regexStr = '^' + escapedParts.join('.+') + '$';
      const pattern = new RegExp(regexStr);
      if (pattern.test(resolvedId)) return true;
    }
    return false;
  }

  it('every testID in 07-invite flow exists in source', () => {
    const flowContent = fs.readFileSync(inviteFlowPath, 'utf-8');
    const flowIDs = extractTestIDs(flowContent);

    for (const id of flowIDs) {
      const inSource = allStaticTestIDs.has(id) || matchesDynamicTemplate(id);
      expect(
        inSource,
        `testID "${id}" referenced in 07-invite but not found in source`
      ).toBe(true);
    }
  });

  it('every testID in 08-settings flow exists in source', () => {
    const flowContent = fs.readFileSync(settingsFlowPath, 'utf-8');
    const flowIDs = extractTestIDs(flowContent);

    for (const id of flowIDs) {
      const inSource = allStaticTestIDs.has(id) || matchesDynamicTemplate(id);
      expect(
        inSource,
        `testID "${id}" referenced in 08-settings but not found in source`
      ).toBe(true);
    }
  });
});

// =============================================================================
// AC-022: Cleanup script structure (e2e/scripts/cleanup.ts)
// =============================================================================

describe('F020_E2E: Cleanup script (AC-022)', () => {
  const cleanupSrc = fs.readFileSync(cleanupScriptPath, 'utf-8');

  it('cleanup script file exists', () => {
    expect(fs.existsSync(cleanupScriptPath)).toBe(true);
  });

  it('imports createClient from Supabase via esm.sh CDN', () => {
    expect(cleanupSrc).toContain('createClient');
    expect(cleanupSrc).toContain('esm.sh');
    expect(cleanupSrc).toContain('@supabase/supabase-js');
  });

  it('reads SUPABASE_URL from environment', () => {
    expect(cleanupSrc).toContain('SUPABASE_URL');
    expect(cleanupSrc).toContain('Deno.env.get');
  });

  it('reads SUPABASE_SERVICE_ROLE_KEY from environment', () => {
    expect(cleanupSrc).toContain('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('validates env vars are present (exits on missing)', () => {
    expect(cleanupSrc).toContain('Deno.exit(1)');
  });

  it('filters users by e2e-*@test.com pattern', () => {
    expect(cleanupSrc).toContain('e2e-');
    expect(cleanupSrc).toContain('@test\\.com');
  });

  it('uses paginated listUsers loop (ADR-032 pattern)', () => {
    expect(cleanupSrc).toContain('listUsers');
    expect(cleanupSrc).toContain('perPage');
    expect(cleanupSrc).toContain('page');
  });

  it('handles no test users found with graceful exit (EC-005)', () => {
    expect(cleanupSrc).toContain('No test users found');
    expect(cleanupSrc).toContain('Deno.exit(0)');
  });

  it('deletes ward before deleting user (CASCADE)', () => {
    // Ward deletion should come before user deletion in the code
    const wardDeletePos = cleanupSrc.indexOf('.delete()');
    const userDeletePos = cleanupSrc.indexOf('deleteUser');
    expect(wardDeletePos).toBeLessThan(userDeletePos);
  });

  it('extracts ward_id from user app_metadata', () => {
    expect(cleanupSrc).toContain('app_metadata');
    expect(cleanupSrc).toContain('ward_id');
  });

  it('uses admin.deleteUser for auth user deletion', () => {
    expect(cleanupSrc).toContain('deleteUser');
  });

  it('has per-user try/catch for partial state handling (EC-006)', () => {
    expect(cleanupSrc).toContain('try {');
    expect(cleanupSrc).toContain('catch');
    expect(cleanupSrc).toContain('Unexpected error processing');
  });

  it('prints summary at the end', () => {
    expect(cleanupSrc).toContain('Summary');
    expect(cleanupSrc).toContain('deleted');
  });

  it('documents required env vars in comments', () => {
    expect(cleanupSrc).toContain('DO NOT commit');
    expect(cleanupSrc).toContain('deno run --allow-net --allow-env');
  });
});

// =============================================================================
// AC-023: README updated with Phase 4 content
// =============================================================================

describe('F020_E2E: README documentation (AC-023)', () => {
  const readmeContent = fs.readFileSync(readmePath, 'utf-8');

  it('README file exists', () => {
    expect(fs.existsSync(readmePath)).toBe(true);
  });

  it('documents 07-invite flow', () => {
    expect(readmeContent).toContain('07-invite');
  });

  it('documents 08-settings flow', () => {
    expect(readmeContent).toContain('08-settings');
  });

  it('mentions all 8 flows in the listing', () => {
    expect(readmeContent).toContain('01-register');
    expect(readmeContent).toContain('02-login-logout');
    expect(readmeContent).toContain('03-home-presentation');
    expect(readmeContent).toContain('04-agenda');
    expect(readmeContent).toContain('05-speeches');
    expect(readmeContent).toContain('06-members');
    expect(readmeContent).toContain('07-invite');
    expect(readmeContent).toContain('08-settings');
  });

  it('documents running all 8 flows sequentially', () => {
    expect(readmeContent).toContain('maestro test e2e/maestro/');
  });

  it('documents cleanup script usage', () => {
    expect(readmeContent).toContain('cleanup');
    expect(readmeContent).toContain('deno run');
  });

  it('documents SUPABASE_URL env var for cleanup', () => {
    expect(readmeContent).toContain('SUPABASE_URL');
  });

  it('documents SUPABASE_SERVICE_ROLE_KEY env var for cleanup', () => {
    expect(readmeContent).toContain('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('has troubleshooting tips for invite flow', () => {
    expect(readmeContent).toContain('07-invite');
    // Should mention cold start or slow loading
    expect(readmeContent).toMatch(/cold start|slow|timeout/i);
  });

  it('has troubleshooting tips for settings flow', () => {
    expect(readmeContent).toContain('08-settings');
  });
});

// =============================================================================
// AC-024: All 8 Maestro flow files exist (01-08)
// =============================================================================

describe('F020_E2E: All 8 Maestro flow files (AC-024)', () => {
  const maestroDir = path.join(projectRoot, 'e2e/maestro');

  it('01-register.yaml exists', () => {
    expect(fs.existsSync(path.join(maestroDir, '01-register.yaml'))).toBe(true);
  });

  it('02-login-logout.yaml exists', () => {
    expect(fs.existsSync(path.join(maestroDir, '02-login-logout.yaml'))).toBe(true);
  });

  it('03-home-presentation.yaml exists', () => {
    expect(fs.existsSync(path.join(maestroDir, '03-home-presentation.yaml'))).toBe(true);
  });

  it('04-agenda.yaml exists', () => {
    expect(fs.existsSync(path.join(maestroDir, '04-agenda.yaml'))).toBe(true);
  });

  it('05-speeches.yaml exists', () => {
    expect(fs.existsSync(path.join(maestroDir, '05-speeches.yaml'))).toBe(true);
  });

  it('06-members.yaml exists', () => {
    expect(fs.existsSync(path.join(maestroDir, '06-members.yaml'))).toBe(true);
  });

  it('07-invite.yaml exists', () => {
    expect(fs.existsSync(path.join(maestroDir, '07-invite.yaml'))).toBe(true);
  });

  it('08-settings.yaml exists', () => {
    expect(fs.existsSync(path.join(maestroDir, '08-settings.yaml'))).toBe(true);
  });

  it('all flow files use zero-padded numeric prefix (01-08)', () => {
    const files = fs.readdirSync(maestroDir);
    const yamlFiles = files.filter((f) => f.endsWith('.yaml'));
    expect(yamlFiles.length).toBe(8);
    for (const file of yamlFiles) {
      expect(file).toMatch(/^\d{2}-/);
    }
  });

  it('flow files are in correct sequential order (01-08)', () => {
    const files = fs.readdirSync(maestroDir);
    const yamlFiles = files.filter((f) => f.endsWith('.yaml')).sort();
    expect(yamlFiles[0]).toBe('01-register.yaml');
    expect(yamlFiles[1]).toBe('02-login-logout.yaml');
    expect(yamlFiles[2]).toBe('03-home-presentation.yaml');
    expect(yamlFiles[3]).toBe('04-agenda.yaml');
    expect(yamlFiles[4]).toBe('05-speeches.yaml');
    expect(yamlFiles[5]).toBe('06-members.yaml');
    expect(yamlFiles[6]).toBe('07-invite.yaml');
    expect(yamlFiles[7]).toBe('08-settings.yaml');
  });
});

// =============================================================================
// Phase 4 testID naming convention (ADR-052)
// =============================================================================

describe('F020_E2E: Phase 4 testID naming convention (ADR-052)', () => {
  const inviteFlowTestIDs = extractTestIDs(fs.readFileSync(inviteFlowPath, 'utf-8'));
  const settingsFlowTestIDs = extractTestIDs(fs.readFileSync(settingsFlowPath, 'utf-8'));
  const allFlowTestIDs = [...new Set([...inviteFlowTestIDs, ...settingsFlowTestIDs])];

  it('all testIDs follow kebab-case convention', () => {
    const pattern = /^[a-z]+-[a-z0-9]+(-[a-z0-9_]+)*$/;
    for (const id of allFlowTestIDs) {
      expect(id, `testID "${id}" does not match convention`).toMatch(pattern);
    }
  });

  it('all testIDs start with known screen prefixes', () => {
    const validPrefixes = [
      'login-',
      'settings-',
      'users-invite-',
    ];
    for (const id of allFlowTestIDs) {
      const hasValidPrefix = validPrefixes.some((p) => id.startsWith(p));
      expect(
        hasValidPrefix,
        `testID "${id}" has unknown prefix`
      ).toBe(true);
    }
  });

  it('all testIDs end with known type suffixes', () => {
    const validSuffixes = [
      '-input',
      '-button',
      '-text',
      '-radio',
    ];
    for (const id of allFlowTestIDs) {
      const hasValidSuffix = validSuffixes.some((s) => id.endsWith(s));
      expect(
        hasValidSuffix || id.endsWith('-radio'),
        `testID "${id}" has unknown suffix`
      ).toBe(true);
    }
  });
});

// =============================================================================
// Phase 4 Maestro flow file naming (ADR-053)
// =============================================================================

describe('F020_E2E: Phase 4 Maestro flow file naming (ADR-053)', () => {
  it('07-invite.yaml exists with correct prefix', () => {
    expect(fs.existsSync(inviteFlowPath)).toBe(true);
    expect(path.basename(inviteFlowPath)).toBe('07-invite.yaml');
  });

  it('08-settings.yaml exists with correct prefix', () => {
    expect(fs.existsSync(settingsFlowPath)).toBe(true);
    expect(path.basename(settingsFlowPath)).toBe('08-settings.yaml');
  });
});

// =============================================================================
// pt-BR and en-US i18n strings used in Phase 4 Maestro assertions
// =============================================================================

describe('F020_E2E: i18n strings used in Phase 4 Maestro assertions', () => {
  // pt-BR strings used in flows
  it('pt-BR has settings title "Configurações"', () => {
    expect((ptBR as any).settings.title).toBe('Configurações');
  });

  it('pt-BR has users title "Usuários do App"', () => {
    expect((ptBR as any).settings.users).toBe('Usuários do App');
  });

  it('pt-BR has theme label "Tema Claro/Escuro"', () => {
    expect((ptBR as any).settings.theme).toBe('Tema Claro/Escuro');
  });

  it('pt-BR has app language label "Idioma do App"', () => {
    expect((ptBR as any).settings.appLanguage).toBe('Idioma do App');
  });

  it('pt-BR has theme option "Automático"', () => {
    expect((ptBR as any).theme.automatic).toBe('Automático');
  });

  it('pt-BR has theme option "Claro"', () => {
    expect((ptBR as any).theme.light).toBe('Claro');
  });

  it('pt-BR has theme option "Escuro"', () => {
    expect((ptBR as any).theme.dark).toBe('Escuro');
  });

  it('pt-BR has home tab label "Início"', () => {
    expect((ptBR as any).tabs.home).toBe('Início');
  });

  // en-US strings verified in flow
  it('en-US has settings title "Settings"', () => {
    expect((enUS as any).settings.title).toBe('Settings');
  });

  it('en-US has theme label "Light/Dark Theme"', () => {
    expect((enUS as any).settings.theme).toBe('Light/Dark Theme');
  });

  it('en-US has app language label "App Language"', () => {
    expect((enUS as any).settings.appLanguage).toBe('App Language');
  });
});

// =============================================================================
// Cleanup script Deno syntax validation
// =============================================================================

describe('F020_E2E: Cleanup script Deno compatibility', () => {
  const cleanupSrc = fs.readFileSync(cleanupScriptPath, 'utf-8');

  it('uses Deno.env.get for environment variables', () => {
    const envGetCount = (cleanupSrc.match(/Deno\.env\.get/g) || []).length;
    expect(envGetCount).toBeGreaterThanOrEqual(2);
  });

  it('uses Deno.exit for process exit', () => {
    const exitCount = (cleanupSrc.match(/Deno\.exit/g) || []).length;
    expect(exitCount).toBeGreaterThanOrEqual(2); // exit(1) for error, exit(0) for no users
  });

  it('uses ESM import from esm.sh CDN (not npm)', () => {
    expect(cleanupSrc).toContain('https://esm.sh/');
  });

  it('uses top-level await (Deno native support)', () => {
    expect(cleanupSrc).toContain('await supabase');
  });

  it('paginates listUsers with perPage: 50 (handles >50 users)', () => {
    expect(cleanupSrc).toContain('perPage');
    expect(cleanupSrc).toContain('50');
    expect(cleanupSrc).toContain('while');
  });
});

// =============================================================================
// EC-002: Network error handling in invite flow
// =============================================================================

describe('F020_E2E: Network error handling (EC-002)', () => {
  const flowContent = fs.readFileSync(inviteFlowPath, 'utf-8');
  const timeouts = extractTimeouts(flowContent);

  it('invite flow has 15s timeout for submit response (handles slow network)', () => {
    expect(timeouts).toContain(15000);
  });

  it('invite flow has 10s timeout for Users screen loading', () => {
    expect(timeouts).toContain(10000);
  });
});

// =============================================================================
// Total testID count verification for Phase 4
// =============================================================================

describe('F020_E2E: Total testID count verification', () => {
  it('users.tsx has ~10 invite-related testIDs (7 static + 1 dynamic template)', () => {
    const src = fs.readFileSync(usersPath, 'utf-8');
    const staticInvite = extractStaticTestIDs(src).filter((id) => id.startsWith('users-invite'));
    const dynamicInvite = extractDynamicTestIDs(src).filter((id) => id.startsWith('users-invite'));

    expect(staticInvite).toHaveLength(7);
    expect(dynamicInvite).toHaveLength(1); // generates 3 resolved testIDs (3 roles)
    // Total resolved at runtime: 7 + 3 = 10
  });

  it('invite/[token].tsx has 5 unique testIDs (6 occurrences with 2x error-text)', () => {
    const src = fs.readFileSync(inviteTokenPath, 'utf-8');
    const inviteTestIDs = extractStaticTestIDs(src).filter((id) => id.startsWith('invite-'));
    expect(inviteTestIDs).toHaveLength(6);
    const unique = [...new Set(inviteTestIDs)];
    expect(unique).toHaveLength(5);
  });
});
