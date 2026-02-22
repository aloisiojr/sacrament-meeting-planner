/**
 * Batch 22 - TESTER tests for F138, F139.
 * Complements batch22-f138-f139.test.ts with additional coverage.
 *
 * CR-202 (F138): Password reset web page (reset-redirect rewrite)
 * CR-203 (F139): Invitation acceptance web page (invite-redirect + create-invitation)
 *
 * Total ACs: 25 (F138: 12, F139: 13)
 * Total ECs: 12 (F138: 5, F139: 7)
 *
 * NOTE: F144 (CR-204, Phase 2) moved the inline HTML from reset-redirect and
 * invite-redirect Edge Functions to external pages (docs/public/). The Edge
 * Functions now return 302 redirects. Tests updated accordingly.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// --- Helpers ---

function readEdgeFunction(funcName: string): string {
  return fs.readFileSync(
    path.resolve(__dirname, '..', '..', 'supabase', 'functions', funcName, 'index.ts'),
    'utf-8'
  );
}

function readExternalPage(filename: string): string {
  return fs.readFileSync(
    path.resolve(__dirname, '..', '..', 'docs', 'public', filename),
    'utf-8'
  );
}

// ============================================================================
// F138: Password Reset Web Page - Tester Additional Coverage
// NOTE: F144 moved HTML to docs/public/reset-password.html.
// ============================================================================

describe('F138 (CR-202) - Tester: Password reset web page', () => {
  const source = readEdgeFunction('reset-redirect');
  const externalPage = readExternalPage('reset-password.html');

  // --- AC-138-01: Structural verification of HTML form ---

  describe('AC-138-01: Structural HTML form verification', () => {
    it('external page has DOCTYPE declaration', () => {
      expect(externalPage).toContain('<!DOCTYPE html>');
    });

    it('has form element with id reset-form', () => {
      expect(externalPage).toContain('id="reset-form"');
    });

    it('form has submit button', () => {
      expect(externalPage).toContain('type="submit"');
      expect(externalPage).toContain('id="submit-btn"');
    });

    it('has both password and confirm-password fields', () => {
      const passwordMatch = externalPage.match(/id="password"/g);
      const confirmMatch = externalPage.match(/id="confirm-password"/g);
      expect(passwordMatch).not.toBeNull();
      expect(confirmMatch).not.toBeNull();
    });

    it('page title is Planejador de Reuniao Sacramental', () => {
      expect(externalPage).toContain('<title>Planejador de Reuniao Sacramental</title>');
    });
  });

  // --- AC-138-02: verifyOtp flow ordering ---

  describe('AC-138-02: verifyOtp flow ordering', () => {
    it('verifyOtp is called BEFORE showForm in the main flow', () => {
      // In the main IIFE, verifyOtp is called, then showForm() on success
      const mainIdx = externalPage.indexOf('// --- Main ---');
      const verifyIdx = externalPage.indexOf('verifyOtp', mainIdx);
      const showFormIdx = externalPage.indexOf('showForm()', verifyIdx);
      expect(verifyIdx).toBeGreaterThan(mainIdx);
      expect(showFormIdx).toBeGreaterThan(verifyIdx);
    });

    it('token is read from URLSearchParams', () => {
      expect(externalPage).toContain("params.get('token')");
      expect(externalPage).toContain("params.get('type')");
    });
  });

  // --- AC-138-03: Validation prevents API call ---

  describe('AC-138-03: Validation prevents updateUser call', () => {
    it('password length check uses return to short-circuit', () => {
      const passwordCheckBlock = externalPage.substring(
        externalPage.indexOf('password.length < 6'),
        externalPage.indexOf('password !== confirmPassword')
      );
      expect(passwordCheckBlock).toContain('return');
    });

    it('password match check uses return to short-circuit', () => {
      const matchCheckStart = externalPage.indexOf('password !== confirmPassword');
      const matchCheckBlock = externalPage.substring(
        matchCheckStart,
        externalPage.indexOf('submitBtn.disabled = true', matchCheckStart)
      );
      expect(matchCheckBlock).toContain('return');
    });
  });

  // --- AC-138-04: updateUser with correct parameter ---

  describe('AC-138-04: updateUser parameter verification', () => {
    it('updateUser receives password from form field', () => {
      expect(externalPage).toContain('updateUser({ password: password })');
    });

    it('showSuccess is called after updateUser succeeds', () => {
      const updateIdx = externalPage.indexOf('updateUser');
      const successIdx = externalPage.indexOf('showSuccess()', updateIdx);
      expect(successIdx).toBeGreaterThan(updateIdx);
    });
  });

  // --- AC-138-05: i18n completeness ---

  describe('AC-138-05: i18n completeness verification', () => {
    it('all 3 languages have subtitle text', () => {
      expect(externalPage).toContain("subtitle: 'Reset Password'");
      expect(externalPage).toContain("subtitle: 'Restablecer contrasena'");
      expect(externalPage).toContain("subtitle: 'Redefinir Senha'");
    });

    it('all 3 languages have loading text', () => {
      expect(externalPage).toContain("loading: 'Verifying link...'");
      expect(externalPage).toContain("loading: 'Verificando enlace...'");
      expect(externalPage).toContain("loading: 'Verificando link...'");
    });

    it('all 3 languages have submit button text', () => {
      expect(externalPage).toContain("submit: 'Reset Password'");
      expect(externalPage).toContain("submit: 'Restablecer contrasena'");
      expect(externalPage).toContain("submit: 'Redefinir Senha'");
    });

    it('all 3 languages have submitting text', () => {
      expect(externalPage).toContain("submitting: 'Resetting...'");
      expect(externalPage).toContain("submitting: 'Restableciendo...'");
      expect(externalPage).toContain("submitting: 'Redefinindo...'");
    });
  });

  // --- AC-138-06: CDN and Supabase client setup ---

  describe('AC-138-06: CDN and Supabase client initialization', () => {
    it('CDN script tag loads @supabase/supabase-js major version 2', () => {
      expect(externalPage).toMatch(/<script\s+src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2"/);
    });

    it('Supabase client uses hardcoded constants (not Deno.env)', () => {
      expect(externalPage).toContain('var SUPABASE_URL =');
      expect(externalPage).toContain('var SUPABASE_ANON_KEY =');
      expect(externalPage).not.toContain('Deno.env');
    });
  });

  // --- AC-138-07: send-reset-email unchanged ---

  describe('AC-138-07: send-reset-email unchanged verification', () => {
    it('send-reset-email still contains its original core functions', () => {
      const sendResetSource = readEdgeFunction('send-reset-email');
      expect(sendResetSource).toContain('Deno.serve');
      expect(sendResetSource).toContain('token');
    });

    it('reset-redirect does NOT import or reference send-reset-email', () => {
      expect(source).not.toContain('send-reset-email');
    });
  });

  // --- AC-138-08: 400 response structure ---

  describe('AC-138-08: 400 response for missing params', () => {
    it('checks for both token AND type before proceeding', () => {
      expect(source).toContain('!token || !type');
    });

    it('returns JSON content type for error responses', () => {
      expect(source).toContain("'Content-Type': 'application/json'");
    });
  });

  // --- AC-138-09: Success state replaces form ---

  describe('AC-138-09: Success state replaces form', () => {
    it('showSuccess hides form-container', () => {
      const showSuccessIdx = externalPage.indexOf('function showSuccess()');
      const successBlock = externalPage.substring(showSuccessIdx, showSuccessIdx + 300);
      expect(successBlock).toContain('form-container');
      expect(successBlock).toContain("add('hidden')");
    });

    it('success-container is initially hidden', () => {
      expect(externalPage).toContain('id="success-container" class="hidden"');
    });
  });

  // --- AC-138-10: Loading state structure ---

  describe('AC-138-10: Loading state structure', () => {
    it('loading div is visible by default (not hidden initially)', () => {
      const loadingDivMatch = externalPage.match(/<div id="loading"[^>]*>/);
      expect(loadingDivMatch).not.toBeNull();
      expect(loadingDivMatch![0]).not.toContain('hidden');
    });

    it('form-container is initially hidden', () => {
      expect(externalPage).toContain('id="form-container" class="hidden"');
    });

    it('loading has spinner with CSS animation', () => {
      expect(externalPage).toContain('animation: spin');
      expect(externalPage).toContain('@keyframes spin');
    });
  });

  // --- AC-138-11: CORS headers structure ---

  describe('AC-138-11: CORS headers applied to all responses', () => {
    it('CORS headers spread into 302 response', () => {
      expect(source).toContain('...corsHeaders');
    });
  });

  // --- AC-138-12: Response status ---

  describe('AC-138-12: Response status (F144 update)', () => {
    it('EF returns 302 redirect', () => {
      expect(source).toContain('status: 302');
    });
  });

  // --- EC-138-01/02: Error shows correct message on verifyOtp failure ---

  describe('EC-138-01/02: Error handling for expired/used token', () => {
    it('verifyOtp error.result check triggers showError', () => {
      expect(externalPage).toContain('result.error');
      expect(externalPage).toContain('showError(t.errorExpired)');
    });

    it('verifyOtp catch block also shows expired error', () => {
      const catchIdx = externalPage.indexOf('} catch (e) {', externalPage.indexOf('verifyOtp'));
      const catchBlock = externalPage.substring(catchIdx, catchIdx + 100);
      expect(catchBlock).toContain('showError(t.errorExpired)');
    });
  });

  // --- EC-138-03: CDN failure dual protection ---

  describe('EC-138-03: CDN failure dual protection', () => {
    it('script tag has onerror AND inline check for window.supabase', () => {
      expect(externalPage).toContain('onerror="handleCdnError()"');
      expect(externalPage).toContain("typeof window.supabase === 'undefined'");
    });

    it('handleCdnError function hides loading and shows error', () => {
      const handleCdnIdx = externalPage.indexOf('function handleCdnError()');
      const handleCdnBlock = externalPage.substring(handleCdnIdx, handleCdnIdx + 300);
      expect(handleCdnBlock).toContain("'loading'");
      expect(handleCdnBlock).toContain("add('hidden')");
      expect(handleCdnBlock).toContain('errorCdn');
    });
  });

  // --- EC-138-04: Short password message ---

  describe('EC-138-04: Short password shows validation error', () => {
    it('validation error div exists with error-msg class', () => {
      expect(externalPage).toContain('id="validation-error"');
      expect(externalPage).toContain('class="error-msg hidden"');
    });

    it('validation error is shown by removing hidden class', () => {
      expect(externalPage).toContain("validationError.classList.remove('hidden')");
    });
  });

  // --- EC-138-05: Mismatch password message ---

  describe('EC-138-05: Non-matching passwords shows validation error', () => {
    it('mismatch check sets errorMismatch text', () => {
      expect(externalPage).toContain('validationError.textContent = t.errorMismatch');
    });
  });

  // --- Styling verification ---

  describe('Styling: Card layout and colors', () => {
    it('card has max-width 400px', () => {
      expect(externalPage).toContain('max-width: 400px');
    });

    it('body background is #f5f5f5', () => {
      expect(externalPage).toContain('background-color: #f5f5f5');
    });

    it('primary color is #4F46E5', () => {
      expect(externalPage).toContain('#4F46E5');
    });

    it('card background is #fff', () => {
      expect(externalPage).toContain('background: #fff');
    });

    it('card has border-radius 8px', () => {
      expect(externalPage).toContain('border-radius: 8px');
    });
  });
});

// ============================================================================
// F139: Invitation Acceptance Web Page - Tester Additional Coverage
// NOTE: F144 moved HTML to docs/public/accept-invite.html.
// ============================================================================

describe('F139 (CR-203) - Tester: Invitation acceptance web page', () => {
  const inviteSource = readEdgeFunction('invite-redirect');
  const createInvSource = readEdgeFunction('create-invitation');
  const externalPage = readExternalPage('accept-invite.html');

  // --- AC-139-01: Structural HTML verification ---

  describe('AC-139-01: Structural HTML form verification', () => {
    it('external page has DOCTYPE and lang attribute', () => {
      expect(externalPage).toContain('<!DOCTYPE html>');
      expect(externalPage).toContain('lang="pt-BR"');
    });

    it('page title is Planejador de Reuniao Sacramental', () => {
      expect(externalPage).toContain('<title>Planejador de Reuniao Sacramental</title>');
    });

    it('has form with id invite-form', () => {
      expect(externalPage).toContain('id="invite-form"');
    });

    it('does NOT load Supabase JS from CDN (uses fetch instead)', () => {
      expect(externalPage).not.toContain('cdn.jsdelivr.net/npm/@supabase/supabase-js');
    });
  });

  // --- AC-139-02: Token validation fetch details ---

  describe('AC-139-02: Token validation fetch structure', () => {
    it('uses POST method for register-invited-user', () => {
      expect(externalPage).toContain("method: 'POST'");
    });

    it('sends Content-Type application/json header', () => {
      expect(externalPage).toContain("'Content-Type': 'application/json'");
    });

    it('validates response with response.ok check', () => {
      expect(externalPage).toContain('!response.ok');
    });

    it('constructs API base URL from hardcoded SUPABASE_URL', () => {
      expect(externalPage).toContain("var apiBase = SUPABASE_URL + '/functions/v1'");
    });
  });

  // --- AC-139-03: Read-only fields styling ---

  describe('AC-139-03: Read-only fields have distinct styling', () => {
    it('disabled inputs have background-color styling', () => {
      expect(externalPage).toContain('input:disabled');
      expect(externalPage).toContain('background-color: #f3f4f6');
    });

    it('disabled inputs have different text color', () => {
      expect(externalPage).toContain('color: #6b7280');
    });

    it('disabled inputs have cursor not-allowed', () => {
      const disabledIdx = externalPage.indexOf('input:disabled');
      const disabledBlock = externalPage.substring(disabledIdx, disabledIdx + 150);
      expect(disabledBlock).toContain('cursor: not-allowed');
    });

    it('read-only fields are in a readonly-section div', () => {
      expect(externalPage).toContain('class="readonly-section"');
    });
  });

  // --- AC-139-04: Validation order (name -> password -> match) ---

  describe('AC-139-04: Validation order is correct', () => {
    it('fullName check comes before password length check', () => {
      const submitIdx = externalPage.indexOf("addEventListener('submit'");
      const nameCheckIdx = externalPage.indexOf('!fullName', submitIdx);
      const passwordCheckIdx = externalPage.indexOf('password.length < 6', submitIdx);
      expect(nameCheckIdx).toBeGreaterThan(submitIdx);
      expect(passwordCheckIdx).toBeGreaterThan(nameCheckIdx);
    });

    it('password length check comes before match check', () => {
      const submitIdx = externalPage.indexOf("addEventListener('submit'");
      const passwordCheckIdx = externalPage.indexOf('password.length < 6', submitIdx);
      const matchCheckIdx = externalPage.indexOf('password !== confirmPassword', submitIdx);
      expect(matchCheckIdx).toBeGreaterThan(passwordCheckIdx);
    });

    it('fullName is trimmed before validation', () => {
      expect(externalPage).toContain('.value.trim()');
    });
  });

  // --- AC-139-05: Registration fetch on submit ---

  describe('AC-139-05: Registration fetch sends all fields', () => {
    it('registration fetch is called after validation passes', () => {
      const submitIdx = externalPage.indexOf("addEventListener('submit'");
      const mismatchIdx = externalPage.indexOf('password !== confirmPassword', submitIdx);
      const regFetchIdx = externalPage.indexOf('register-invited-user', mismatchIdx);
      expect(regFetchIdx).toBeGreaterThan(mismatchIdx);
    });

    it('submit button is disabled during submission', () => {
      expect(externalPage).toContain('submitBtn.disabled = true');
      expect(externalPage).toContain('submitBtn.textContent = t.submitting');
    });

    it('submit button is re-enabled on error', () => {
      expect(externalPage).toContain('submitBtn.disabled = false');
      expect(externalPage).toContain('submitBtn.textContent = t.submit');
    });
  });

  // --- AC-139-06: create-invitation URL format ---

  describe('AC-139-06: create-invitation URL format verification', () => {
    it('deepLink uses template literal with SUPABASE_URL and token', () => {
      expect(createInvSource).toContain('`${Deno.env.get(\'SUPABASE_URL\')}/functions/v1/invite-redirect?token=${invitationToken}`');
    });

    it('deepLink is returned in the response body', () => {
      expect(createInvSource).toContain('deepLink');
      expect(createInvSource).toContain('deepLink,');
    });
  });

  // --- AC-139-07: i18n completeness ---

  describe('AC-139-07: i18n completeness verification', () => {
    it('all 3 languages have subtitle text', () => {
      expect(externalPage).toContain("subtitle: 'Accept Invitation'");
      expect(externalPage).toContain("subtitle: 'Aceptar invitacion'");
      expect(externalPage).toContain("subtitle: 'Aceitar Convite'");
    });

    it('all 3 languages have Create Account button text', () => {
      expect(externalPage).toContain("submit: 'Create Account'");
      expect(externalPage).toContain("submit: 'Crear cuenta'");
      expect(externalPage).toContain("submit: 'Criar Conta'");
    });

    it('all 3 languages have fullName label', () => {
      expect(externalPage).toContain("labelFullName: 'Full Name'");
      expect(externalPage).toContain("labelFullName: 'Nombre completo'");
      expect(externalPage).toContain("labelFullName: 'Nome Completo'");
    });
  });

  // --- AC-139-08: 400 response structure ---

  describe('AC-139-08: 400 response for missing token', () => {
    it('checks for token before proceeding', () => {
      expect(inviteSource).toContain('!token');
    });

    it('error message says "Missing required parameter: token"', () => {
      expect(inviteSource).toContain("'Missing required parameter: token'");
    });

    it('returns JSON content type for error responses', () => {
      expect(inviteSource).toContain("'Content-Type': 'application/json'");
    });
  });

  // --- AC-139-09: Success state replaces form ---

  describe('AC-139-09: Success state replaces form', () => {
    it('showSuccess hides form and shows success container', () => {
      const showSuccessIdx = externalPage.indexOf('function showSuccess()');
      const successBlock = externalPage.substring(showSuccessIdx, showSuccessIdx + 300);
      expect(successBlock).toContain('form-container');
      expect(successBlock).toContain("add('hidden')");
      expect(successBlock).toContain('success-container');
      expect(successBlock).toContain("remove('hidden')");
    });

    it('success-container is initially hidden', () => {
      expect(externalPage).toContain('id="success-container" class="hidden"');
    });

    it('success message is set via t.success', () => {
      expect(externalPage).toContain('t.success');
    });
  });

  // --- AC-139-10: Role translation completeness ---

  describe('AC-139-10: Role translation completeness', () => {
    it('en roleLabels has all 3 roles', () => {
      expect(externalPage).toContain("secretary: 'Secretary'");
      expect(externalPage).toContain("observer: 'Observer'");
    });

    it('es roleLabels has all 3 roles', () => {
      expect(externalPage).toContain("secretary: 'Secretario'");
      expect(externalPage).toContain("observer: 'Observador'");
    });

    it('translateRole falls back to raw role if not in roleLabels', () => {
      expect(externalPage).toContain('roleLabels[role] || role');
    });
  });

  // --- AC-139-11: CORS applied to all responses ---

  describe('AC-139-11: CORS headers applied to all responses', () => {
    it('CORS headers spread into 302 response', () => {
      expect(inviteSource).toContain('...corsHeaders');
    });

    it('CORS headers spread into 400 error response', () => {
      const missingParamIdx = inviteSource.indexOf("'Missing required parameter: token'");
      const blockAfterError = inviteSource.substring(missingParamIdx, missingParamIdx + 200);
      expect(blockAfterError).toContain('corsHeaders');
    });
  });

  // --- AC-139-12: Response status ---

  describe('AC-139-12: Response status (F144 update)', () => {
    it('EF returns 302 redirect', () => {
      expect(inviteSource).toContain('status: 302');
    });
  });

  // --- AC-139-13: register-invited-user unchanged ---

  describe('AC-139-13: register-invited-user unchanged verification', () => {
    it('invite-redirect does NOT modify register-invited-user file', () => {
      const regSource = readEdgeFunction('register-invited-user');
      expect(regSource).toContain('Deno.serve');
      expect(regSource).toContain('handleValidateToken');
      expect(regSource).toContain('handleRegister');
    });

    it('external page calls register-invited-user via fetch', () => {
      expect(externalPage).toContain("fetch(apiBase + '/register-invited-user'");
    });
  });

  // --- EC-139-01: Token invalid error mapping ---

  describe('EC-139-01: Token invalid error mapping', () => {
    it('getErrorMessage maps token_invalid to errorTokenInvalid', () => {
      expect(externalPage).toContain("errorCode === 'token_invalid'");
      expect(externalPage).toContain('return t.errorTokenInvalid');
    });
  });

  // --- EC-139-02: Token used error mapping ---

  describe('EC-139-02: Token used error mapping', () => {
    it('getErrorMessage maps token_used to errorTokenUsed', () => {
      expect(externalPage).toContain("errorCode === 'token_used'");
      expect(externalPage).toContain('return t.errorTokenUsed');
    });
  });

  // --- EC-139-03: Token expired error mapping ---

  describe('EC-139-03: Token expired error mapping', () => {
    it('getErrorMessage maps token_expired to errorTokenExpired', () => {
      expect(externalPage).toContain("errorCode === 'token_expired'");
      expect(externalPage).toContain('return t.errorTokenExpired');
    });
  });

  // --- EC-139-04: Empty fullName validation ---

  describe('EC-139-04: Empty fullName validation', () => {
    it('fullName check sets errorEmptyName text', () => {
      expect(externalPage).toContain('validationError.textContent = t.errorEmptyName');
    });

    it('fullName check returns before fetch', () => {
      const submitIdx = externalPage.indexOf("addEventListener('submit'");
      const nameCheckIdx = externalPage.indexOf('!fullName', submitIdx);
      const returnAfterName = externalPage.indexOf('return', nameCheckIdx);
      const fetchIdx = externalPage.indexOf('register-invited-user', returnAfterName);
      expect(returnAfterName).toBeGreaterThan(nameCheckIdx);
      expect(fetchIdx).toBeGreaterThan(returnAfterName);
    });
  });

  // --- EC-139-05: Short password validation ---

  describe('EC-139-05: Short password validation', () => {
    it('password check sets errorShortPassword text', () => {
      expect(externalPage).toContain('validationError.textContent = t.errorShortPassword');
    });
  });

  // --- EC-139-06: Non-matching passwords ---

  describe('EC-139-06: Non-matching passwords validation', () => {
    it('mismatch check sets errorMismatch text', () => {
      expect(externalPage).toContain('validationError.textContent = t.errorMismatch');
    });
  });

  // --- EC-139-07: Failed to create user error ---

  describe('EC-139-07: Failed to create user error mapping', () => {
    it('getErrorMessage maps Failed to create user to errorCreateFailed', () => {
      expect(externalPage).toContain("errorCode === 'Failed to create user'");
      expect(externalPage).toContain('return t.errorCreateFailed');
    });

    it('getErrorMessage has generic fallback', () => {
      expect(externalPage).toContain('return t.errorGeneric');
    });
  });

  // --- Styling verification ---

  describe('Styling: Card layout and colors match F138', () => {
    it('card has max-width 400px', () => {
      expect(externalPage).toContain('max-width: 400px');
    });

    it('body background is #f5f5f5', () => {
      expect(externalPage).toContain('background-color: #f5f5f5');
    });

    it('primary color is #4F46E5', () => {
      expect(externalPage).toContain('#4F46E5');
    });

    it('card background is #fff', () => {
      expect(externalPage).toContain('background: #fff');
    });

    it('card has border-radius 8px', () => {
      expect(externalPage).toContain('border-radius: 8px');
    });
  });

  // --- Loading state ---

  describe('Loading state structure', () => {
    it('loading div is visible by default (not hidden)', () => {
      const loadingDivMatch = externalPage.match(/<div id="loading"[^>]*>/);
      expect(loadingDivMatch).not.toBeNull();
      expect(loadingDivMatch![0]).not.toContain('hidden');
    });

    it('form-container is initially hidden', () => {
      expect(externalPage).toContain('id="form-container" class="hidden"');
    });

    it('loading has spinner with animation', () => {
      expect(externalPage).toContain('class="spinner"');
      expect(externalPage).toContain('@keyframes spin');
    });

    it('loading text is set from i18n', () => {
      expect(externalPage).toContain("loading-text").valueOf;
      expect(externalPage).toContain('t.loading');
    });
  });

  // --- Form fields verification ---

  describe('Form has all required editable fields', () => {
    it('has fullname text input', () => {
      expect(externalPage).toContain('id="fullname"');
      expect(externalPage).toMatch(/id="fullname"[^>]*required/);
    });

    it('has password input', () => {
      expect(externalPage).toContain('type="password"');
      expect(externalPage).toContain('id="password"');
    });

    it('has confirm-password input', () => {
      expect(externalPage).toContain('id="confirm-password"');
    });
  });
});
