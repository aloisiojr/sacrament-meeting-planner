/**
 * Tests for Batch 23 Phase 1: Invite Error Handling, WhatsApp Template Disconnect
 *
 * F140 (CR-205): Improve invite user error handling to show server error message
 * F142 (CR-207): Fix WhatsApp send to use ward template instead of hardcoded empty string
 *
 * NOTE: F141 (CR-206) was reverted from Phase 1 due to language code mismatch
 *       (en vs en-US, es vs es-ES). F141 will be re-implemented in Phase 2.
 *
 * Covers acceptance criteria:
 *   AC-140-01..04, AC-142-01..06
 * Covers edge cases:
 *   EC-140-01..03, EC-142-01..03
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function readSourceFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf-8');
}

// =============================================================================
// F140 (CR-205): Improve invite user error handling
// =============================================================================

describe('F140 (CR-205): Invite user error handling', () => {

  const usersSource = readSourceFile('app/(tabs)/settings/users.tsx');
  const layoutSource = readSourceFile('app/_layout.tsx');

  // --- AC-140-01: inviteMutation.onError shows actual error message ---
  describe('AC-140-01: inviteMutation.onError shows the actual error message from the server', () => {
    it('onError receives err parameter typed as Error', () => {
      // The onError callback must receive the error object, not ignore it
      expect(usersSource).toMatch(/onError:\s*\(err:\s*Error\)/);
    });

    it('Alert.alert shows err.message in the error alert', () => {
      expect(usersSource).toContain('err.message');
    });

    it('uses t(\'users.inviteFailed\') as fallback with || operator', () => {
      // err.message || t('users.inviteFailed') pattern
      expect(usersSource).toContain("err.message || t('users.inviteFailed')");
    });

    it('Alert.alert is called with t(\'common.error\') as title', () => {
      // The inviteMutation.onError should call Alert.alert with error title
      const onErrorBlock = usersSource.match(
        /inviteMutation[\s\S]*?onError:\s*\(err:\s*Error\)\s*=>\s*\{[\s\S]*?\}/
      );
      expect(onErrorBlock).not.toBeNull();
      expect(onErrorBlock![0]).toContain("t('common.error')");
    });
  });

  // --- AC-140-02: inviteMutation suppresses global MutationCache error alert ---
  describe('AC-140-02: inviteMutation suppresses the global MutationCache error alert', () => {
    it('inviteMutation has meta: { suppressGlobalError: true }', () => {
      expect(usersSource).toContain('suppressGlobalError: true');
    });

    it('meta is inside inviteMutation useMutation options (near mutationFn)', () => {
      // The meta should be at the same level as mutationFn, onSuccess, onError
      // within the inviteMutation = useMutation({...}) block
      const mutationBlock = usersSource.match(
        /inviteMutation\s*=\s*useMutation\(\{[\s\S]*?suppressGlobalError:\s*true[\s\S]*?\}\)/
      );
      expect(mutationBlock).not.toBeNull();
    });

    it('_layout.tsx MutationCache checks for suppressGlobalError', () => {
      expect(layoutSource).toContain('suppressGlobalError');
    });

    it('_layout.tsx MutationCache returns early when suppressGlobalError is true', () => {
      // The pattern: if (mutation.meta?.suppressGlobalError) return;
      expect(layoutSource).toMatch(
        /if\s*\(\(mutation\s*(as any)\)\.meta\?\.suppressGlobalError\)\s*return/
      );
    });
  });

  // --- AC-140-03: callEdgeFunction error extraction continues to work ---
  describe('AC-140-03: callEdgeFunction error extraction is robust and unchanged', () => {
    it('callEdgeFunction extracts serverMessage from error.context.json()', () => {
      expect(usersSource).toContain('error.context.json()');
    });

    it('callEdgeFunction reads errorBody?.error for the server message', () => {
      expect(usersSource).toContain('errorBody?.error');
    });

    it('callEdgeFunction throws Error with serverMessage or fallback error.message', () => {
      expect(usersSource).toContain('throw new Error(serverMessage || error.message)');
    });

    it('callEdgeFunction has try/catch around error.context.json()', () => {
      // The extraction is wrapped in try/catch to handle cases where json() fails
      const extractionBlock = usersSource.match(
        /try\s*\{[\s\S]*?error\.context\.json\(\)[\s\S]*?\}\s*catch/
      );
      expect(extractionBlock).not.toBeNull();
    });

    it('callEdgeFunction checks typeof error.context.json === function', () => {
      expect(usersSource).toContain("typeof error.context.json === 'function'");
    });
  });

  // --- AC-140-04: Successful invite still works ---
  describe('AC-140-04: Successful invite still works without changes', () => {
    it('inviteMutation.onSuccess sets inviteResult with deepLink', () => {
      expect(usersSource).toContain('setInviteResult');
      expect(usersSource).toContain('data.invitation.deepLink');
    });

    it('onSuccess callback is present in inviteMutation', () => {
      const onSuccessMatch = usersSource.match(
        /inviteMutation[\s\S]*?onSuccess:\s*\(data\)\s*=>/
      );
      expect(onSuccessMatch).not.toBeNull();
    });

    it('inviteMutation.mutationFn calls callEdgeFunction with create-invitation', () => {
      const mutationFnMatch = usersSource.match(
        /inviteMutation[\s\S]*?mutationFn[\s\S]*?callEdgeFunction\(\s*'create-invitation'/
      );
      expect(mutationFnMatch).not.toBeNull();
    });
  });

  // --- EC-140-01: Edge Function returns error with no JSON body ---
  describe('EC-140-01: Edge Function returns error with no JSON body (network error)', () => {
    it('callEdgeFunction catches json() failure and falls through to error.message', () => {
      // The catch block is empty (intentionally) - falls through to throw Error(serverMessage || error.message)
      // where serverMessage is undefined, so error.message is used
      const catchBlock = usersSource.match(
        /catch\s*\{[\s\S]*?\/\/ Extraction failed/
      );
      expect(catchBlock).not.toBeNull();
    });

    it('serverMessage defaults to undefined when json extraction fails', () => {
      // serverMessage is declared as string | undefined
      expect(usersSource).toContain('let serverMessage: string | undefined');
    });

    it('Error is thrown with error.message when serverMessage is undefined', () => {
      // serverMessage || error.message - when serverMessage is undefined, uses error.message
      expect(usersSource).toContain('serverMessage || error.message');
    });
  });

  // --- EC-140-02: Edge Function returns error with JSON body but no 'error' field ---
  describe('EC-140-02: Edge Function returns error with JSON body but no error field', () => {
    it('serverMessage uses optional chaining on errorBody?.error', () => {
      // errorBody?.error returns undefined when 'error' field is missing
      expect(usersSource).toContain('errorBody?.error');
    });

    it('undefined serverMessage causes fallback to error.message in thrown Error', () => {
      // When errorBody?.error is undefined, serverMessage stays undefined
      // throw new Error(undefined || error.message) -> uses error.message
      expect(usersSource).toContain('throw new Error(serverMessage || error.message)');
    });
  });

  // --- EC-140-03: err.message is empty string in onError ---
  describe('EC-140-03: err.message is empty string in onError', () => {
    it('fallback t(users.inviteFailed) is used when err.message is falsy (empty string)', () => {
      // err.message || t('users.inviteFailed')
      // When err.message is '', '' is falsy, so t('users.inviteFailed') is used
      expect(usersSource).toContain("err.message || t('users.inviteFailed')");
    });

    it('Alert.alert displays the fallback message, not empty string', () => {
      // The || operator ensures empty string falls through to the i18n key
      const alertCall = usersSource.match(
        /Alert\.alert\(t\('common\.error'\),\s*err\.message\s*\|\|\s*t\('users\.inviteFailed'\)\)/
      );
      expect(alertCall).not.toBeNull();
    });
  });
});

// =============================================================================
// F142 (CR-207): Fix WhatsApp template disconnect in InviteManagementSection
// =============================================================================

describe('F142 (CR-207): WhatsApp template disconnect fix in InviteManagementSection', () => {

  const inviteSectionSource = readSourceFile('components/InviteManagementSection.tsx');
  const whatsappScreenSource = readSourceFile('app/(tabs)/settings/whatsapp.tsx');

  // --- AC-142-01: InviteManagementSection fetches wards.whatsapp_template ---
  describe('AC-142-01: InviteManagementSection fetches wards.whatsapp_template from the database', () => {
    it('imports useQuery from @tanstack/react-query', () => {
      expect(inviteSectionSource).toMatch(/import\s*\{[^}]*useQuery[^}]*\}\s*from\s*'@tanstack\/react-query'/);
    });

    it('imports supabase from lib/supabase', () => {
      expect(inviteSectionSource).toMatch(/import\s*\{[^}]*supabase[^}]*\}\s*from\s*'\.\.\/lib\/supabase'/);
    });

    it('uses useQuery with queryKey [ward, wardId]', () => {
      expect(inviteSectionSource).toContain("queryKey: ['ward', wardId]");
    });

    it('queries wards table selecting whatsapp_template', () => {
      expect(inviteSectionSource).toContain(".from('wards')");
      // CR-221: select now includes prayer template fields
      expect(inviteSectionSource).toContain(".select('whatsapp_template, whatsapp_template_opening_prayer, whatsapp_template_closing_prayer')");
    });

    it('filters query by wardId', () => {
      expect(inviteSectionSource).toContain(".eq('id', wardId)");
    });

    it('uses .single() for single ward record', () => {
      // The query should fetch a single record
      const queryBlock = inviteSectionSource.match(
        /from\('wards'\)[\s\S]*?\.single\(\)/
      );
      expect(queryBlock).not.toBeNull();
    });

    it('query is enabled only when wardId exists', () => {
      expect(inviteSectionSource).toContain('enabled: !!wardId');
    });
  });

  // --- AC-142-02: buildWhatsAppUrl receives custom template ---
  describe('AC-142-02: buildWhatsAppUrl receives the ward custom template instead of empty string', () => {
    it('passes ward?.whatsapp_template to buildWhatsAppUrl', () => {
      expect(inviteSectionSource).toContain('ward?.whatsapp_template');
    });

    it('uses nullish coalescing with empty string fallback', () => {
      expect(inviteSectionSource).toContain("ward?.whatsapp_template ?? ''");
    });

    it('does NOT hardcode empty string as template parameter', () => {
      // The old pattern was: template: '' (hardcoded)
      // The new pattern is: ward?.whatsapp_template ?? ''
      // Verify the buildWhatsAppUrl call contains the ward template reference
      const buildCall = inviteSectionSource.match(
        /buildWhatsAppUrl\([\s\S]*?ward\?\.whatsapp_template\s*\?\?\s*''/
      );
      expect(buildCall).not.toBeNull();
    });
  });

  // --- AC-142-03: buildWhatsAppUrl uses default template when ward template is null ---
  describe('AC-142-03: buildWhatsAppUrl uses default template when ward template is null', () => {
    it('ward?.whatsapp_template evaluates to undefined when ward is null/undefined', () => {
      // When useQuery hasn't loaded yet, ward is undefined
      // ward?.whatsapp_template is undefined, ?? '' gives ''
      // buildWhatsAppUrl with '' falls back to getDefaultTemplate
      expect(inviteSectionSource).toContain("ward?.whatsapp_template ?? ''");
    });

    it('buildWhatsAppUrl is imported from whatsapp lib', () => {
      expect(inviteSectionSource).toMatch(
        /import\s*\{[^}]*buildWhatsAppUrl[^}]*\}\s*from\s*'\.\.\/lib\/whatsapp'/
      );
    });
  });

  // --- AC-142-04: Ward language is used instead of app language ---
  describe('AC-142-04: Ward language is used instead of app language for WhatsApp messages', () => {
    it('destructures wardLanguage from useAuth()', () => {
      expect(inviteSectionSource).toMatch(/useAuth\(\)[\s\S]*?wardLanguage/);
    });

    it('locale is derived from wardLanguage as SupportedLanguage', () => {
      expect(inviteSectionSource).toContain(
        '(wardLanguage as SupportedLanguage)'
      );
    });

    it('getCurrentLanguage() is only used as fallback', () => {
      // Pattern: wardLanguage as SupportedLanguage || getCurrentLanguage()
      expect(inviteSectionSource).toContain(
        '(wardLanguage as SupportedLanguage) || getCurrentLanguage()'
      );
    });

    it('wardId is destructured from useAuth()', () => {
      const authDestructure = inviteSectionSource.match(
        /const\s*\{[^}]*wardId[^}]*\}\s*=\s*useAuth\(\)/
      );
      expect(authDestructure).not.toBeNull();
    });
  });

  // --- AC-142-05: formatDateHumanReadable uses wardLanguage ---
  describe('AC-142-05: formatDateHumanReadable uses wardLanguage for date formatting', () => {
    it('formatDateHumanReadable is called with locale (ward-language-based)', () => {
      expect(inviteSectionSource).toContain('formatDateHumanReadable(speech.sunday_date, locale');
    });

    it('locale variable is used in formatDateHumanReadable, not getCurrentLanguage()', () => {
      // Should NOT have formatDateHumanReadable(..., getCurrentLanguage())
      const directCallMatch = inviteSectionSource.match(
        /formatDateHumanReadable\([^,]+,\s*getCurrentLanguage\(\)\)/
      );
      expect(directCallMatch).toBeNull();
    });
  });

  // --- AC-142-06: WhatsApp message sent matches what is previewed in Settings ---
  describe('AC-142-06: WhatsApp message sent matches what is previewed in Settings', () => {
    it('InviteManagementSection and whatsapp.tsx use the same query key [ward, wardId]', () => {
      expect(inviteSectionSource).toContain("queryKey: ['ward', wardId]");
      expect(whatsappScreenSource).toContain("queryKey: ['ward', wardId]");
    });

    it('both components access whatsapp_template from the ward query result', () => {
      expect(inviteSectionSource).toContain('whatsapp_template');
      expect(whatsappScreenSource).toContain('whatsapp_template');
    });

    it('both components query the wards table', () => {
      expect(inviteSectionSource).toContain(".from('wards')");
      expect(whatsappScreenSource).toContain(".from('wards')");
    });
  });

  // --- EC-142-01: Ward whatsapp_template is empty string ---
  describe('EC-142-01: Ward whatsapp_template is empty string (user intentionally cleared)', () => {
    it("empty string template falls through via ?? '' to buildWhatsAppUrl", () => {
      // ward?.whatsapp_template is '' (empty string), ?? '' does NOT trigger ('' is not null/undefined)
      // So '' is passed to buildWhatsAppUrl, which then checks: template || getDefaultTemplate(language)
      // '' is falsy, so getDefaultTemplate is used -> correct default behavior
      expect(inviteSectionSource).toContain("ward?.whatsapp_template ?? ''");
    });
  });

  // --- EC-142-02: Ward template query is still loading ---
  describe('EC-142-02: Ward template query is still loading when user clicks WhatsApp button', () => {
    it('ward data defaults to undefined when query is loading', () => {
      // useQuery returns { data: ward } - when loading, ward is undefined
      // ward?.whatsapp_template is undefined, ?? '' gives ''
      // buildWhatsAppUrl receives '' and falls back to default template
      const dataDestructure = inviteSectionSource.match(
        /const\s*\{\s*data:\s*ward\s*\}\s*=\s*useQuery/
      );
      expect(dataDestructure).not.toBeNull();
    });

    it('optional chaining prevents crash when ward is undefined', () => {
      // ward?.whatsapp_template uses ?. so it doesn't crash
      expect(inviteSectionSource).toContain('ward?.whatsapp_template');
    });
  });

  // --- EC-142-03: Speaker has no phone number ---
  describe('EC-142-03: Speaker has no phone number', () => {
    it('handleNotInvitedAction has guard for speech.speaker_phone', () => {
      expect(inviteSectionSource).toContain('if (speech.speaker_phone)');
    });

    it('changeStatus.mutate is called in both if and else blocks (F152 restructured)', () => {
      // SUPERSEDED by F152 (CR-216): changeStatus.mutate is now inside both branches
      // Was: called outside the phone guard (always)
      // Now: inside if block (when phone exists) and inside Alert.alert confirm (when no phone)
      const handleBlock = inviteSectionSource.match(
        /handleNotInvitedAction[\s\S]*?if\s*\(speech\.speaker_phone\)\s*\{[\s\S]*?changeStatus\.mutate/
      );
      expect(handleBlock).not.toBeNull();
    });

    it('ward is in handleNotInvitedAction useCallback deps', () => {
      // CR-221: deps changed from ward?.whatsapp_template to ward (full object)
      // because prayer template selection needs multiple ward fields
      const depsMatch = inviteSectionSource.match(
        /handleNotInvitedAction[\s\S]*?\[\s*changeStatus[\s\S]*?ward[\s\S]*?\]/
      );
      expect(depsMatch).not.toBeNull();
    });
  });
});
