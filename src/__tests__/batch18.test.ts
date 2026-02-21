/**
 * Tests for Batch 18: Deep link scheme fix, HTTPS email redirect,
 *                      StatusLED right-edge alignment
 *
 * F113 (CR-175): Change deep link scheme from sacrmeetman:// to sacrmeetplan://
 * F114 (CR-176): HTTPS redirect Edge Function for password reset email
 * F115 (CR-177): SpeechSlot StatusLED right-edge alignment with speaker field
 *
 * Covers acceptance criteria:
 *   AC-113-01..06, AC-114-01..08, AC-115-01..08
 * Covers edge cases:
 *   EC-113-01..03, EC-114-01..04, EC-115-01..05
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(
    path.resolve(__dirname, '..', '..', relativePath),
    'utf-8'
  );
}

function readSourceFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf-8');
}

// Helper to recursively get all files in a directory
function getAllFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...getAllFiles(fullPath));
      } else {
        results.push(fullPath);
      }
    }
  } catch {
    // Ignore errors for directories that cannot be read
  }
  return results;
}

// =============================================================================
// F113 (CR-175): Change deep link scheme from sacrmeetman:// to sacrmeetplan://
// =============================================================================

describe('F113 (CR-175): Deep link scheme change to sacrmeetplan://', () => {

  // --- AC-113-01: app.json scheme is sacrmeetplan ---
  describe('AC-113-01: app.json scheme is sacrmeetplan', () => {
    it('expo.scheme is sacrmeetplan', () => {
      const content = readProjectFile('app.json');
      const config = JSON.parse(content);
      expect(config.expo.scheme).toBe('sacrmeetplan');
    });

    it('expo.scheme is NOT sacrmeetman', () => {
      const content = readProjectFile('app.json');
      const config = JSON.parse(content);
      expect(config.expo.scheme).not.toBe('sacrmeetman');
    });

    it('expo.scheme is NOT wardmanager', () => {
      const content = readProjectFile('app.json');
      const config = JSON.parse(content);
      expect(config.expo.scheme).not.toBe('wardmanager');
    });
  });

  // --- AC-113-02: create-invitation uses sacrmeetplan://invite/ ---
  describe('AC-113-02: create-invitation uses sacrmeetplan://invite/', () => {
    it('create-invitation/index.ts contains sacrmeetplan://invite/', () => {
      const content = readProjectFile('supabase/functions/create-invitation/index.ts');
      expect(content).toContain('sacrmeetplan://invite/');
    });
  });

  // --- AC-113-03: send-reset-email no longer uses sacrmeetman:// ---
  describe('AC-113-03: send-reset-email uses HTTPS redirect URL', () => {
    it('send-reset-email/index.ts does NOT contain sacrmeetman://', () => {
      const content = readProjectFile('supabase/functions/send-reset-email/index.ts');
      expect(content).not.toContain('sacrmeetman://');
    });

    it('send-reset-email/index.ts uses HTTPS redirect URL', () => {
      const content = readProjectFile('supabase/functions/send-reset-email/index.ts');
      expect(content).toContain('https://poizgglzdjqwrhsnhkke.supabase.co/functions/v1/reset-redirect');
    });
  });

  // --- AC-113-04: No sacrmeetman:// or wardmanager:// in production code ---
  describe('AC-113-04: No old scheme references in production code', () => {
    it('zero sacrmeetman:// references in src/ production code', () => {
      const srcDir = path.resolve(__dirname, '..');
      const files = getAllFiles(srcDir);
      for (const file of files) {
        if (file.endsWith('.test.ts') || file.endsWith('.test.tsx')) continue;
        const content = fs.readFileSync(file, 'utf-8');
        expect(content).not.toContain('sacrmeetman://');
      }
    });

    it('zero sacrmeetman:// references in supabase/ directory', () => {
      const supabaseDir = path.resolve(__dirname, '..', '..', 'supabase');
      const files = getAllFiles(supabaseDir);
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        expect(content).not.toContain('sacrmeetman://');
      }
    });

    it('zero wardmanager:// references in supabase/ directory', () => {
      const supabaseDir = path.resolve(__dirname, '..', '..', 'supabase');
      const files = getAllFiles(supabaseDir);
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        expect(content).not.toContain('wardmanager://');
      }
    });
  });

  // --- AC-113-05: iOS bundleIdentifier unchanged ---
  describe('AC-113-05: iOS bundleIdentifier unchanged', () => {
    it('expo.ios.bundleIdentifier is com.sacramentmeetingmanager.app', () => {
      const content = readProjectFile('app.json');
      const config = JSON.parse(content);
      expect(config.expo.ios.bundleIdentifier).toBe('com.sacramentmeetingmanager.app');
    });
  });

  // --- AC-113-06: Android package unchanged ---
  describe('AC-113-06: Android package unchanged', () => {
    it('expo.android.package is com.sacramentmeetingmanager.app', () => {
      const content = readProjectFile('app.json');
      const config = JSON.parse(content);
      expect(config.expo.android.package).toBe('com.sacramentmeetingmanager.app');
    });
  });

  // --- EC-113-01: Old sacrmeetman:// invitation links stop working ---
  describe('EC-113-01: Old invitation links stop working (expected)', () => {
    it('create-invitation only uses sacrmeetplan:// (not sacrmeetman://)', () => {
      const content = readProjectFile('supabase/functions/create-invitation/index.ts');
      expect(content).toContain('sacrmeetplan://invite/');
      expect(content).not.toContain('sacrmeetman://');
    });
  });

  // --- EC-113-02: Old password reset emails stop working ---
  describe('EC-113-02: Old reset emails stop working (expected)', () => {
    it('send-reset-email no longer contains sacrmeetman://', () => {
      const content = readProjectFile('supabase/functions/send-reset-email/index.ts');
      expect(content).not.toContain('sacrmeetman://');
    });
  });

  // --- EC-113-03: App not installed on device ---
  describe('EC-113-03: Deep link when app not installed', () => {
    it('scheme is defined in app.json (runtime behavior, not testable in unit tests)', () => {
      const content = readProjectFile('app.json');
      const config = JSON.parse(content);
      expect(config.expo.scheme).toBeDefined();
      expect(typeof config.expo.scheme).toBe('string');
      expect(config.expo.scheme.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// F114 (CR-176): HTTPS redirect Edge Function for password reset email
// =============================================================================

describe('F114 (CR-176): HTTPS redirect Edge Function', () => {

  const resetRedirectPath = 'supabase/functions/reset-redirect/index.ts';

  // --- AC-114-01: Email contains HTTPS link ---
  describe('AC-114-01: Email uses HTTPS redirect URL', () => {
    it('send-reset-email deepLink uses HTTPS URL', () => {
      const content = readProjectFile('supabase/functions/send-reset-email/index.ts');
      expect(content).toContain('https://poizgglzdjqwrhsnhkke.supabase.co/functions/v1/reset-redirect');
    });

    it('send-reset-email deepLink includes token and type params', () => {
      const content = readProjectFile('supabase/functions/send-reset-email/index.ts');
      expect(content).toContain('reset-redirect?token=');
      expect(content).toContain('&type=recovery');
    });
  });

  // --- AC-114-02: reset-redirect Edge Function exists ---
  describe('AC-114-02: reset-redirect Edge Function exists', () => {
    it('reset-redirect/index.ts file exists', () => {
      const filePath = path.resolve(__dirname, '..', '..', resetRedirectPath);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  // --- AC-114-03: reset-redirect returns HTML with auto-redirect ---
  describe('AC-114-03: HTML with auto-redirect', () => {
    it('reset-redirect contains window.location.href redirect', () => {
      const content = readProjectFile(resetRedirectPath);
      expect(content).toContain('window.location.href');
    });

    it('reset-redirect redirect target uses sacrmeetplan://reset-password', () => {
      const content = readProjectFile(resetRedirectPath);
      expect(content).toContain('sacrmeetplan://reset-password');
    });

    it('reset-redirect returns Content-Type text/html', () => {
      const content = readProjectFile(resetRedirectPath);
      expect(content).toContain("'Content-Type': 'text/html'");
    });

    it('reset-redirect contains meta refresh tag', () => {
      const content = readProjectFile(resetRedirectPath);
      expect(content).toContain('meta http-equiv="refresh"');
    });
  });

  // --- AC-114-04: Fallback button ---
  describe('AC-114-04: Fallback button in HTML', () => {
    it('HTML contains a fallback <a> button', () => {
      const content = readProjectFile(resetRedirectPath);
      expect(content).toContain('<a href=');
      expect(content).toContain('class="button"');
    });

    it('fallback button text is Abrir no aplicativo', () => {
      const content = readProjectFile(resetRedirectPath);
      expect(content).toContain('Abrir no aplicativo');
    });

    it('fallback button href uses deepLink variable (sacrmeetplan:// deep link)', () => {
      const content = readProjectFile(resetRedirectPath);
      // The <a href> uses the deepLink template variable which contains sacrmeetplan://
      expect(content).toContain('<a href="${deepLink}"');
      expect(content).toContain('sacrmeetplan://reset-password');
    });
  });

  // --- AC-114-05: Validates required params ---
  describe('AC-114-05: Validates required params', () => {
    it('returns 400 when params are missing', () => {
      const content = readProjectFile(resetRedirectPath);
      expect(content).toContain('status: 400');
    });

    it('checks for token param', () => {
      const content = readProjectFile(resetRedirectPath);
      expect(content).toContain("'token'");
    });

    it('checks for type param', () => {
      const content = readProjectFile(resetRedirectPath);
      expect(content).toContain("'type'");
    });

    it('returns error message about missing params', () => {
      const content = readProjectFile(resetRedirectPath);
      expect(content).toContain('Missing required parameters');
    });
  });

  // --- AC-114-06: CORS preflight handling ---
  describe('AC-114-06: CORS preflight handling', () => {
    it('handles OPTIONS method', () => {
      const content = readProjectFile(resetRedirectPath);
      expect(content).toContain("req.method === 'OPTIONS'");
    });

    it('has CORS headers defined', () => {
      const content = readProjectFile(resetRedirectPath);
      expect(content).toContain('Access-Control-Allow-Origin');
      expect(content).toContain('Access-Control-Allow-Headers');
    });
  });

  // --- AC-114-07: Email CTA clickable (manual test, documented) ---
  describe('AC-114-07: Email CTA is HTTPS (clickable in email clients)', () => {
    it('send-reset-email uses https:// scheme (not custom scheme)', () => {
      const content = readProjectFile('supabase/functions/send-reset-email/index.ts');
      const deepLinkLine = content.match(/const deepLink = `(.*?)`;/);
      expect(deepLinkLine).not.toBeNull();
      expect(deepLinkLine![1]).toMatch(/^https:\/\//);
    });
  });

  // --- AC-114-08: Deep link uses sacrmeetplan:// ---
  describe('AC-114-08: reset-redirect uses sacrmeetplan:// scheme', () => {
    it('reset-redirect deep link uses sacrmeetplan://', () => {
      const content = readProjectFile(resetRedirectPath);
      expect(content).toContain('sacrmeetplan://reset-password');
    });

    it('reset-redirect does NOT use sacrmeetman://', () => {
      const content = readProjectFile(resetRedirectPath);
      expect(content).not.toContain('sacrmeetman://');
    });
  });

  // --- EC-114-01: Desktop browser (app not installed) ---
  describe('EC-114-01: Desktop browser fallback', () => {
    it('fallback button is visible in HTML (not hidden)', () => {
      const content = readProjectFile(resetRedirectPath);
      // The button should be in the HTML body, not display:none
      expect(content).toContain('Abrir no aplicativo');
      expect(content).not.toContain('display:none');
      expect(content).not.toContain('display: none');
    });
  });

  // --- EC-114-02: Token expired or invalid ---
  describe('EC-114-02: No token validation in redirect function', () => {
    it('reset-redirect does NOT import supabase client', () => {
      const content = readProjectFile(resetRedirectPath);
      expect(content).not.toContain('createClient');
      expect(content).not.toContain('@supabase/supabase-js');
    });

    it('reset-redirect does NOT query database', () => {
      const content = readProjectFile(resetRedirectPath);
      expect(content).not.toContain('.from(');
      expect(content).not.toContain('.select(');
    });
  });

  // --- EC-114-03: Auto-redirect blocked ---
  describe('EC-114-03: Multiple redirect mechanisms', () => {
    it('has both meta refresh and JavaScript redirect', () => {
      const content = readProjectFile(resetRedirectPath);
      expect(content).toContain('meta http-equiv="refresh"');
      expect(content).toContain('window.location.href');
    });

    it('has fallback button as third mechanism', () => {
      const content = readProjectFile(resetRedirectPath);
      expect(content).toContain('<a href=');
    });
  });

  // --- EC-114-04: Email client strips JavaScript ---
  describe('EC-114-04: JavaScript only executes in browser', () => {
    it('JavaScript redirect is in HTML body (not in email template)', () => {
      const content = readProjectFile(resetRedirectPath);
      expect(content).toContain('<script>');
      expect(content).toContain('</script>');
    });

    it('email template does NOT contain <script> tags', () => {
      const content = readProjectFile('supabase/functions/send-reset-email/index.ts');
      expect(content).not.toContain('<script>');
    });
  });
});

// =============================================================================
// F115 (CR-177): SpeechSlot StatusLED right-edge alignment
// =============================================================================

describe('F115 (CR-177): SpeechSlot StatusLED right-edge alignment', () => {

  const speechSlotSource = readSourceFile('components/SpeechSlot.tsx');

  // --- AC-115-01: StatusLED right edge aligned with speaker field right edge ---
  describe('AC-115-01: StatusLED in labelRow (leftColumn)', () => {
    it('StatusLED is inside leftColumn (before rightColumn)', () => {
      const leftColumnIdx = speechSlotSource.indexOf('styles.leftColumn');
      const rightColumnIdx = speechSlotSource.indexOf('styles.rightColumn');
      const statusLEDIdx = speechSlotSource.indexOf('<StatusLED');
      expect(statusLEDIdx).toBeGreaterThan(leftColumnIdx);
      expect(statusLEDIdx).toBeLessThan(rightColumnIdx);
    });

    it('StatusLED is inside labelRow section', () => {
      const labelRowIdx = speechSlotSource.indexOf('styles.labelRow');
      const rowIdx = speechSlotSource.indexOf('styles.row');
      const statusLEDIdx = speechSlotSource.indexOf('<StatusLED');
      expect(statusLEDIdx).toBeGreaterThan(labelRowIdx);
      expect(statusLEDIdx).toBeLessThan(rowIdx);
    });
  });

  // --- AC-115-02: Alignment consistent across all 3 positions ---
  describe('AC-115-02: Consistent alignment across positions', () => {
    it('SpeechSlot is a single shared component (used for all positions)', () => {
      expect(speechSlotSource).toContain('export const SpeechSlot');
    });

    it('layout styles are static in StyleSheet.create', () => {
      const styleSheetBlock = speechSlotSource.split('StyleSheet.create')[1];
      expect(styleSheetBlock).toBeDefined();
      expect(styleSheetBlock).toContain('leftColumn:');
      expect(styleSheetBlock).toContain('rightColumn:');
      expect(styleSheetBlock).toContain('statusSection:');
    });
  });

  // --- AC-115-03: Status text visible in labelRow ---
  describe('AC-115-03: Status text visible and pressable', () => {
    it('status text is rendered inside statusSection', () => {
      const statusSectionIdx = speechSlotSource.indexOf('styles.statusSection');
      const statusTextIdx = speechSlotSource.indexOf('styles.statusText', statusSectionIdx);
      expect(statusSectionIdx).toBeGreaterThan(-1);
      expect(statusTextIdx).toBeGreaterThan(statusSectionIdx);
    });

    it('status text style exists', () => {
      expect(speechSlotSource).toContain('statusText:');
    });
  });

  // --- AC-115-04: StatusChangeModal opens on press ---
  describe('AC-115-04: StatusChangeModal opens on press', () => {
    it('statusSection Pressable has onPress={handleStatusPress}', () => {
      const statusSectionIdx = speechSlotSource.indexOf('styles.statusSection');
      const onPressIdx = speechSlotSource.indexOf('onPress={handleStatusPress}', statusSectionIdx - 100);
      expect(onPressIdx).toBeGreaterThan(-1);
      // The onPress should be on the Pressable wrapping statusSection
      expect(onPressIdx).toBeLessThan(statusSectionIdx + 200);
    });

    it('StatusChangeModal still rendered', () => {
      expect(speechSlotSource).toContain('StatusChangeModal');
    });

    it('handleStatusPress opens status modal', () => {
      expect(speechSlotSource).toContain('setStatusModalVisible(true)');
    });
  });

  // --- AC-115-05: X remove button still functional ---
  describe('AC-115-05: X remove button still in rightColumn', () => {
    it('speakerActionWrapper is in rightColumn', () => {
      const rightColumnIdx = speechSlotSource.indexOf('styles.rightColumn');
      const speakerActionIdx = speechSlotSource.indexOf('styles.speakerActionWrapper', rightColumnIdx);
      expect(speakerActionIdx).toBeGreaterThan(rightColumnIdx);
    });

    it('X button has handleRemove onPress', () => {
      expect(speechSlotSource).toContain('onPress={handleRemove}');
    });
  });

  // --- AC-115-06: Topic clear button still functional ---
  describe('AC-115-06: Topic clear button still in rightColumn', () => {
    it('topicActionWrapper is in rightColumn', () => {
      const rightColumnIdx = speechSlotSource.indexOf('styles.rightColumn');
      const topicActionIdx = speechSlotSource.indexOf('styles.topicActionWrapper', rightColumnIdx);
      expect(topicActionIdx).toBeGreaterThan(rightColumnIdx);
    });

    it('topic clear button has handleClearTopic onPress', () => {
      expect(speechSlotSource).toContain('onPress={handleClearTopic}');
    });
  });

  // --- AC-115-07: Layout on narrow screens ---
  describe('AC-115-07: Narrow screen layout', () => {
    it('leftColumn has flex: 1 (responsive width)', () => {
      expect(speechSlotSource).toMatch(/leftColumn:\s*\{[^}]*flex:\s*1/s);
    });

    it('speaker field text has numberOfLines={1} for truncation', () => {
      expect(speechSlotSource).toContain('numberOfLines={1}');
    });

    it('field style has flex: 1 for responsive width', () => {
      const fieldMatch = speechSlotSource.match(/field:\s*\{[^}]*flex:\s*1/s);
      expect(fieldMatch).not.toBeNull();
    });
  });

  // --- AC-115-08: Alignment consistent when X is not visible ---
  describe('AC-115-08: Alignment when X is absent', () => {
    it('rightColumn width is fixed (not conditional)', () => {
      const rightColumnMatch = speechSlotSource.match(
        /rightColumn:\s*\{[^}]*\}/s
      );
      expect(rightColumnMatch).not.toBeNull();
      expect(rightColumnMatch![0]).toContain('width: 36');
      expect(rightColumnMatch![0]).not.toContain('?');
    });

    it('speakerActionWrapper always renders (X conditional inside)', () => {
      expect(speechSlotSource).toContain('styles.speakerActionWrapper');
      expect(speechSlotSource).toContain('hasSpeaker && canUnassign');
    });
  });

  // --- statusSection style ---
  describe('statusSection style', () => {
    it('has flexDirection row', () => {
      expect(speechSlotSource).toMatch(/statusSection:\s*\{[^}]*flexDirection:\s*'row'/s);
    });

    it('has alignItems center', () => {
      expect(speechSlotSource).toMatch(/statusSection:\s*\{[^}]*alignItems:\s*'center'/s);
    });

    it('has gap: 6', () => {
      expect(speechSlotSource).toMatch(/statusSection:\s*\{[^}]*gap:\s*6/s);
    });
  });

  // --- rightColumn no longer contains StatusLED ---
  describe('rightColumn does NOT contain StatusLED', () => {
    it('no <StatusLED in rightColumn section', () => {
      const rightColumnIdx = speechSlotSource.indexOf('styles.rightColumn');
      const closingOfOuterRow = speechSlotSource.indexOf('Status Change Modal', rightColumnIdx);
      const rightColumnSection = speechSlotSource.slice(rightColumnIdx, closingOfOuterRow);
      expect(rightColumnSection).not.toContain('<StatusLED');
    });
  });

  // --- rightColumn has empty spacer/placeholder ---
  describe('rightColumn has empty spacer', () => {
    it('statusLedPlaceholder style exists', () => {
      const styleSheetBlock = speechSlotSource.split('StyleSheet.create')[1];
      expect(styleSheetBlock).toContain('statusLedPlaceholder:');
    });

    it('statusLedPlaceholder is referenced in rightColumn', () => {
      const rightColumnIdx = speechSlotSource.indexOf('styles.rightColumn');
      const placeholderIdx = speechSlotSource.indexOf('styles.statusLedPlaceholder', rightColumnIdx);
      expect(placeholderIdx).toBeGreaterThan(rightColumnIdx);
    });
  });

  // --- rightColumn width is 36 ---
  describe('rightColumn width', () => {
    it('rightColumn width is 36', () => {
      expect(speechSlotSource).toMatch(/rightColumn:\s*\{[^}]*width:\s*36/s);
    });
  });

  // --- EC-115-01: Observer role (no X button, no status press) ---
  describe('EC-115-01: Observer role alignment', () => {
    it('LED pressable disabled for observer', () => {
      expect(speechSlotSource).toContain("disabled={isObserver || status === 'not_assigned'}");
    });

    it('isObserver is derived from role', () => {
      expect(speechSlotSource).toContain("const isObserver = role === 'observer'");
    });
  });

  // --- EC-115-02: Secretary role ---
  describe('EC-115-02: Secretary role alignment', () => {
    it('canUnassign controls X button visibility', () => {
      expect(speechSlotSource).toContain('hasSpeaker && canUnassign');
    });

    it('canChangeStatus controls status press', () => {
      expect(speechSlotSource).toContain("const canChangeStatus = hasPermission('speech:change_status')");
    });
  });

  // --- EC-115-03: Very long status text ---
  describe('EC-115-03: Long status text handling', () => {
    it('status text is in leftColumn (not fixed-width rightColumn)', () => {
      const leftColumnIdx = speechSlotSource.indexOf('styles.leftColumn');
      const rightColumnIdx = speechSlotSource.indexOf('styles.rightColumn');
      const statusTextIdx = speechSlotSource.indexOf('styles.statusText');
      expect(statusTextIdx).toBeGreaterThan(leftColumnIdx);
      expect(statusTextIdx).toBeLessThan(rightColumnIdx);
    });
  });

  // --- EC-115-04: Dark mode ---
  describe('EC-115-04: Dark mode layout unchanged', () => {
    it('layout styles use no hardcoded colors', () => {
      const rightColumnMatch = speechSlotSource.match(
        /rightColumn:\s*\{[^}]*\}/s
      );
      expect(rightColumnMatch).not.toBeNull();
      expect(rightColumnMatch![0]).not.toContain('#');
    });

    it('colors are applied via theme context', () => {
      expect(speechSlotSource).toContain('useTheme');
      expect(speechSlotSource).toContain('colors');
    });
  });

  // --- EC-115-05: Not assigned status ---
  describe('EC-115-05: Not assigned status position unchanged', () => {
    it('StatusLED accepts status prop', () => {
      expect(speechSlotSource).toContain('status={status}');
    });

    it('not_assigned status disables press', () => {
      expect(speechSlotSource).toContain("status === 'not_assigned'");
    });
  });
});

// =============================================================================
// Cross-feature: Regression checks
// =============================================================================

describe('Batch 18 cross-feature regression checks', () => {

  describe('No statusLedWrapper Pressable in rightColumn', () => {
    it('statusLedWrapper style no longer exists in StyleSheet', () => {
      const source = readSourceFile('components/SpeechSlot.tsx');
      const styleSheetBlock = source.split('StyleSheet.create')[1];
      expect(styleSheetBlock).not.toContain('statusLedWrapper:');
    });

    it('no styles.statusLedWrapper reference in component', () => {
      const source = readSourceFile('components/SpeechSlot.tsx');
      expect(source).not.toContain('styles.statusLedWrapper');
    });
  });

  describe('SpeechSlot structural integrity', () => {
    it('SpeechSlot still exports SpeechSlotProps', () => {
      const source = readSourceFile('components/SpeechSlot.tsx');
      expect(source).toContain('export interface SpeechSlotProps');
    });

    it('SpeechSlot still has StatusChangeModal', () => {
      const source = readSourceFile('components/SpeechSlot.tsx');
      expect(source).toContain('StatusChangeModal');
    });

    it('SpeechSlot still imports StatusLED', () => {
      const source = readSourceFile('components/SpeechSlot.tsx');
      expect(source).toContain("import { StatusLED } from './StatusLED'");
    });
  });

  describe('Edge Function integrity', () => {
    it('send-reset-email still has getEmailTemplate function', () => {
      const source = readProjectFile('supabase/functions/send-reset-email/index.ts');
      expect(source).toContain('function getEmailTemplate');
    });

    it('send-reset-email still has 3 language templates', () => {
      const source = readProjectFile('supabase/functions/send-reset-email/index.ts');
      expect(source).toContain("'pt-BR':");
      expect(source).toContain("en:");
      expect(source).toContain("es:");
    });

    it('create-invitation still has invitation creation logic', () => {
      const source = readProjectFile('supabase/functions/create-invitation/index.ts');
      expect(source).toContain('invitations');
      expect(source).toContain('invitationToken');
    });

    it('reset-redirect uses Deno.serve pattern', () => {
      const source = readProjectFile('supabase/functions/reset-redirect/index.ts');
      expect(source).toContain('Deno.serve');
    });
  });
});
