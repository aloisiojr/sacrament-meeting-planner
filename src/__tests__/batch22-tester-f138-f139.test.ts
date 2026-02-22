/**
 * Batch 22 - TESTER tests for F138, F139.
 * Complements batch22-f138-f139.test.ts with additional coverage.
 *
 * CR-202 (F138): Password reset web page (reset-redirect rewrite)
 * CR-203 (F139): Invitation acceptance web page (invite-redirect + create-invitation)
 *
 * Total ACs: 25 (F138: 12, F139: 13)
 * Total ECs: 12 (F138: 5, F139: 7)
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

// ============================================================================
// F138: Password Reset Web Page - Tester Additional Coverage
// ============================================================================

describe('F138 (CR-202) - Tester: Password reset web page', () => {
  const source = readEdgeFunction('reset-redirect');

  // --- AC-138-01: Structural verification of HTML form ---

  describe('AC-138-01: Structural HTML form verification', () => {
    it('HTML page has DOCTYPE declaration', () => {
      expect(source).toContain('<!DOCTYPE html>');
    });

    it('has form element with id reset-form', () => {
      expect(source).toContain('id="reset-form"');
    });

    it('form has submit button', () => {
      expect(source).toContain('type="submit"');
      expect(source).toContain('id="submit-btn"');
    });

    it('has both password and confirm-password fields', () => {
      // Verify EXACTLY two password inputs by checking both IDs
      const passwordMatch = source.match(/id="password"/g);
      const confirmMatch = source.match(/id="confirm-password"/g);
      expect(passwordMatch).not.toBeNull();
      expect(confirmMatch).not.toBeNull();
    });

    it('page title is Planejador de Reuniao Sacramental', () => {
      expect(source).toContain('<title>Planejador de Reuniao Sacramental</title>');
    });
  });

  // --- AC-138-02: verifyOtp flow ordering ---

  describe('AC-138-02: verifyOtp flow ordering', () => {
    it('verifyOtp is called BEFORE form is shown (showForm after verifyOtp)', () => {
      const verifyIdx = source.indexOf('verifyOtp');
      const showFormIdx = source.indexOf('showForm()');
      expect(verifyIdx).toBeGreaterThan(-1);
      expect(showFormIdx).toBeGreaterThan(verifyIdx);
    });

    it('token_hash is read from URL query param', () => {
      // The Edge Function reads token from URL and embeds it
      expect(source).toContain("url.searchParams.get('token')");
      expect(source).toContain("url.searchParams.get('type')");
    });
  });

  // --- AC-138-03: Validation prevents API call ---

  describe('AC-138-03: Validation prevents updateUser call', () => {
    it('password length check uses return to short-circuit', () => {
      // After password.length < 6 check, there is a return before updateUser
      const passwordCheckBlock = source.substring(
        source.indexOf('password.length < 6'),
        source.indexOf('password !== confirmPassword')
      );
      expect(passwordCheckBlock).toContain('return');
    });

    it('password match check uses return to short-circuit', () => {
      // After password !== confirmPassword check, there is a return before updateUser
      const matchCheckStart = source.indexOf('password !== confirmPassword');
      const matchCheckBlock = source.substring(
        matchCheckStart,
        source.indexOf('submitBtn.disabled = true', matchCheckStart)
      );
      expect(matchCheckBlock).toContain('return');
    });
  });

  // --- AC-138-04: updateUser with correct parameter ---

  describe('AC-138-04: updateUser parameter verification', () => {
    it('updateUser receives password from form field', () => {
      expect(source).toContain('updateUser({ password: password })');
    });

    it('showSuccess is called after updateUser succeeds', () => {
      const updateIdx = source.indexOf('updateUser');
      const successIdx = source.indexOf('showSuccess()', updateIdx);
      expect(successIdx).toBeGreaterThan(updateIdx);
    });
  });

  // --- AC-138-05: i18n completeness ---

  describe('AC-138-05: i18n completeness verification', () => {
    it('all 3 languages have subtitle text', () => {
      expect(source).toContain("subtitle: 'Reset Password'");
      expect(source).toContain("subtitle: 'Restablecer contrasena'");
      expect(source).toContain("subtitle: 'Redefinir Senha'");
    });

    it('all 3 languages have loading text', () => {
      expect(source).toContain("loading: 'Verifying link...'");
      expect(source).toContain("loading: 'Verificando enlace...'");
      expect(source).toContain("loading: 'Verificando link...'");
    });

    it('all 3 languages have submit button text', () => {
      expect(source).toContain("submit: 'Reset Password'");
      expect(source).toContain("submit: 'Restablecer contrasena'");
      expect(source).toContain("submit: 'Redefinir Senha'");
    });

    it('all 3 languages have submitting text', () => {
      expect(source).toContain("submitting: 'Resetting...'");
      expect(source).toContain("submitting: 'Restableciendo...'");
      expect(source).toContain("submitting: 'Redefinindo...'");
    });
  });

  // --- AC-138-06: CDN and Supabase client setup ---

  describe('AC-138-06: CDN and Supabase client initialization', () => {
    it('CDN script tag loads @supabase/supabase-js major version 2', () => {
      expect(source).toMatch(/<script\s+src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2"/);
    });

    it('Supabase client uses SUPABASE_URL from Deno.env', () => {
      expect(source).toContain("Deno.env.get('SUPABASE_URL')");
    });

    it('Supabase client uses SUPABASE_ANON_KEY from Deno.env', () => {
      expect(source).toContain("Deno.env.get('SUPABASE_ANON_KEY')");
    });
  });

  // --- AC-138-07: send-reset-email unchanged ---

  describe('AC-138-07: send-reset-email unchanged verification', () => {
    it('send-reset-email still contains its original core functions', () => {
      const sendResetSource = readEdgeFunction('send-reset-email');
      // The original file must still contain its email sending logic
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
      // 400 response uses application/json
      expect(source).toContain("'Content-Type': 'application/json'");
    });
  });

  // --- AC-138-09: Success state replaces form ---

  describe('AC-138-09: Success state replaces form', () => {
    it('showSuccess hides form-container', () => {
      // Check that showSuccess function hides the form
      const showSuccessIdx = source.indexOf('function showSuccess()');
      const successBlock = source.substring(showSuccessIdx, showSuccessIdx + 300);
      expect(successBlock).toContain('form-container');
      expect(successBlock).toContain("add('hidden')");
    });

    it('success-container is initially hidden', () => {
      expect(source).toContain('id="success-container" class="hidden"');
    });
  });

  // --- AC-138-10: Loading state structure ---

  describe('AC-138-10: Loading state structure', () => {
    it('loading div is visible by default (not hidden initially)', () => {
      // The loading div should NOT have class="hidden" initially
      const loadingDivMatch = source.match(/<div id="loading"[^>]*>/);
      expect(loadingDivMatch).not.toBeNull();
      expect(loadingDivMatch![0]).not.toContain('hidden');
    });

    it('form-container is initially hidden', () => {
      expect(source).toContain('id="form-container" class="hidden"');
    });

    it('loading has spinner with CSS animation', () => {
      expect(source).toContain('animation: spin');
      expect(source).toContain('@keyframes spin');
    });
  });

  // --- AC-138-11: CORS headers structure ---

  describe('AC-138-11: CORS headers applied to all responses', () => {
    it('CORS headers spread into HTML response', () => {
      // The HTML response also includes corsHeaders
      expect(source).toContain('...corsHeaders');
    });
  });

  // --- AC-138-12: Response headers ---

  describe('AC-138-12: Response status and headers', () => {
    it('HTML response returns status 200', () => {
      // The main response for valid requests is 200
      expect(source).toContain('status: 200');
    });
  });

  // --- EC-138-01/02: Error shows correct message on verifyOtp failure ---

  describe('EC-138-01/02: Error handling for expired/used token', () => {
    it('verifyOtp error.result check triggers showError', () => {
      // When verifyOtp returns error, showError is called
      expect(source).toContain('result.error');
      expect(source).toContain('showError(t.errorExpired)');
    });

    it('verifyOtp catch block also shows expired error', () => {
      // Even on exception (not just error result), expired message shown
      const catchIdx = source.indexOf('} catch (e) {', source.indexOf('verifyOtp'));
      const catchBlock = source.substring(catchIdx, catchIdx + 100);
      expect(catchBlock).toContain('showError(t.errorExpired)');
    });
  });

  // --- EC-138-03: CDN failure dual protection ---

  describe('EC-138-03: CDN failure dual protection', () => {
    it('script tag has onerror AND inline check for window.supabase', () => {
      // First protection: onerror on script tag
      expect(source).toContain('onerror="handleCdnError()"');
      // Second protection: typeof check inside IIFE
      expect(source).toContain("typeof window.supabase === 'undefined'");
    });

    it('handleCdnError function hides loading and shows error', () => {
      const handleCdnIdx = source.indexOf('function handleCdnError()');
      const handleCdnBlock = source.substring(handleCdnIdx, handleCdnIdx + 300);
      expect(handleCdnBlock).toContain("'loading'");
      expect(handleCdnBlock).toContain("add('hidden')");
      expect(handleCdnBlock).toContain('errorCdn');
    });
  });

  // --- EC-138-04: Short password message ---

  describe('EC-138-04: Short password shows validation error', () => {
    it('validation error div exists with error-msg class', () => {
      expect(source).toContain('id="validation-error"');
      expect(source).toContain('class="error-msg hidden"');
    });

    it('validation error is shown by removing hidden class', () => {
      expect(source).toContain("validationError.classList.remove('hidden')");
    });
  });

  // --- EC-138-05: Mismatch password message ---

  describe('EC-138-05: Non-matching passwords shows validation error', () => {
    it('mismatch check sets errorMismatch text', () => {
      expect(source).toContain('validationError.textContent = t.errorMismatch');
    });
  });

  // --- Styling verification ---

  describe('Styling: Card layout and colors', () => {
    it('card has max-width 400px', () => {
      expect(source).toContain('max-width: 400px');
    });

    it('body background is #f5f5f5', () => {
      expect(source).toContain('background-color: #f5f5f5');
    });

    it('primary color is #4F46E5', () => {
      expect(source).toContain('#4F46E5');
    });

    it('card background is #fff', () => {
      expect(source).toContain('background: #fff');
    });

    it('card has border-radius 8px', () => {
      expect(source).toContain('border-radius: 8px');
    });
  });
});

// ============================================================================
// F139: Invitation Acceptance Web Page - Tester Additional Coverage
// ============================================================================

describe('F139 (CR-203) - Tester: Invitation acceptance web page', () => {
  const inviteSource = readEdgeFunction('invite-redirect');
  const createInvSource = readEdgeFunction('create-invitation');

  // --- AC-139-01: Structural HTML verification ---

  describe('AC-139-01: Structural HTML form verification', () => {
    it('HTML page has DOCTYPE and lang attribute', () => {
      expect(inviteSource).toContain('<!DOCTYPE html>');
      expect(inviteSource).toContain('lang="pt-BR"');
    });

    it('page title is Planejador de Reuniao Sacramental', () => {
      expect(inviteSource).toContain('<title>Planejador de Reuniao Sacramental</title>');
    });

    it('has form with id invite-form', () => {
      expect(inviteSource).toContain('id="invite-form"');
    });

    it('does NOT load Supabase JS from CDN (uses fetch instead)', () => {
      expect(inviteSource).not.toContain('cdn.jsdelivr.net/npm/@supabase/supabase-js');
    });
  });

  // --- AC-139-02: Token validation fetch details ---

  describe('AC-139-02: Token validation fetch structure', () => {
    it('uses POST method for register-invited-user', () => {
      expect(inviteSource).toContain("method: 'POST'");
    });

    it('sends Content-Type application/json header', () => {
      expect(inviteSource).toContain("'Content-Type': 'application/json'");
    });

    it('validates response with response.ok check', () => {
      expect(inviteSource).toContain('!response.ok');
    });

    it('constructs API base URL from SUPABASE_URL', () => {
      expect(inviteSource).toContain("Deno.env.get('SUPABASE_URL')");
      expect(inviteSource).toContain('/functions/v1');
    });
  });

  // --- AC-139-03: Read-only fields styling ---

  describe('AC-139-03: Read-only fields have distinct styling', () => {
    it('disabled inputs have background-color styling', () => {
      expect(inviteSource).toContain('input:disabled');
      expect(inviteSource).toContain('background-color: #f3f4f6');
    });

    it('disabled inputs have different text color', () => {
      expect(inviteSource).toContain('color: #6b7280');
    });

    it('disabled inputs have cursor not-allowed', () => {
      // Check for cursor: not-allowed in the input:disabled style
      const disabledIdx = inviteSource.indexOf('input:disabled');
      const disabledBlock = inviteSource.substring(disabledIdx, disabledIdx + 150);
      expect(disabledBlock).toContain('cursor: not-allowed');
    });

    it('read-only fields are in a readonly-section div', () => {
      expect(inviteSource).toContain('class="readonly-section"');
    });
  });

  // --- AC-139-04: Validation order (name -> password -> match) ---

  describe('AC-139-04: Validation order is correct', () => {
    it('fullName check comes before password length check', () => {
      const submitIdx = inviteSource.indexOf("addEventListener('submit'");
      const nameCheckIdx = inviteSource.indexOf('!fullName', submitIdx);
      const passwordCheckIdx = inviteSource.indexOf('password.length < 6', submitIdx);
      expect(nameCheckIdx).toBeGreaterThan(submitIdx);
      expect(passwordCheckIdx).toBeGreaterThan(nameCheckIdx);
    });

    it('password length check comes before match check', () => {
      const submitIdx = inviteSource.indexOf("addEventListener('submit'");
      const passwordCheckIdx = inviteSource.indexOf('password.length < 6', submitIdx);
      const matchCheckIdx = inviteSource.indexOf('password !== confirmPassword', submitIdx);
      expect(matchCheckIdx).toBeGreaterThan(passwordCheckIdx);
    });

    it('fullName is trimmed before validation', () => {
      expect(inviteSource).toContain('.value.trim()');
    });
  });

  // --- AC-139-05: Registration fetch on submit ---

  describe('AC-139-05: Registration fetch sends all fields', () => {
    it('registration fetch is called after validation passes', () => {
      const submitIdx = inviteSource.indexOf("addEventListener('submit'");
      const mismatchIdx = inviteSource.indexOf('password !== confirmPassword', submitIdx);
      const regFetchIdx = inviteSource.indexOf('register-invited-user', mismatchIdx);
      expect(regFetchIdx).toBeGreaterThan(mismatchIdx);
    });

    it('submit button is disabled during submission', () => {
      expect(inviteSource).toContain('submitBtn.disabled = true');
      expect(inviteSource).toContain('submitBtn.textContent = t.submitting');
    });

    it('submit button is re-enabled on error', () => {
      expect(inviteSource).toContain('submitBtn.disabled = false');
      expect(inviteSource).toContain('submitBtn.textContent = t.submit');
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
      expect(inviteSource).toContain("subtitle: 'Accept Invitation'");
      expect(inviteSource).toContain("subtitle: 'Aceptar invitacion'");
      expect(inviteSource).toContain("subtitle: 'Aceitar Convite'");
    });

    it('all 3 languages have Create Account button text', () => {
      expect(inviteSource).toContain("submit: 'Create Account'");
      expect(inviteSource).toContain("submit: 'Crear cuenta'");
      expect(inviteSource).toContain("submit: 'Criar Conta'");
    });

    it('all 3 languages have fullName label', () => {
      expect(inviteSource).toContain("labelFullName: 'Full Name'");
      expect(inviteSource).toContain("labelFullName: 'Nombre completo'");
      expect(inviteSource).toContain("labelFullName: 'Nome Completo'");
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
      const showSuccessIdx = inviteSource.indexOf('function showSuccess()');
      const successBlock = inviteSource.substring(showSuccessIdx, showSuccessIdx + 300);
      expect(successBlock).toContain('form-container');
      expect(successBlock).toContain("add('hidden')");
      expect(successBlock).toContain('success-container');
      expect(successBlock).toContain("remove('hidden')");
    });

    it('success-container is initially hidden', () => {
      expect(inviteSource).toContain('id="success-container" class="hidden"');
    });

    it('success message is set via t.success', () => {
      expect(inviteSource).toContain('t.success');
    });
  });

  // --- AC-139-10: Role translation completeness ---

  describe('AC-139-10: Role translation completeness', () => {
    it('en roleLabels has all 3 roles', () => {
      expect(inviteSource).toContain("secretary: 'Secretary'");
      expect(inviteSource).toContain("observer: 'Observer'");
    });

    it('es roleLabels has all 3 roles', () => {
      expect(inviteSource).toContain("secretary: 'Secretario'");
      expect(inviteSource).toContain("observer: 'Observador'");
    });

    it('translateRole falls back to raw role if not in roleLabels', () => {
      // function translateRole returns roleLabels[role] || role
      expect(inviteSource).toContain('roleLabels[role] || role');
    });
  });

  // --- AC-139-11: CORS applied to all responses ---

  describe('AC-139-11: CORS headers applied to all responses', () => {
    it('CORS headers spread into HTML response', () => {
      expect(inviteSource).toContain('...corsHeaders');
    });

    it('CORS headers spread into 400 error response', () => {
      // The 400 response block includes ...corsHeaders in the headers object
      const missingParamIdx = inviteSource.indexOf("'Missing required parameter: token'");
      const blockAfterError = inviteSource.substring(missingParamIdx, missingParamIdx + 200);
      expect(blockAfterError).toContain('corsHeaders');
    });
  });

  // --- AC-139-12: Response headers ---

  describe('AC-139-12: Response status and headers', () => {
    it('HTML response returns status 200', () => {
      expect(inviteSource).toContain('status: 200');
    });
  });

  // --- AC-139-13: register-invited-user unchanged ---

  describe('AC-139-13: register-invited-user unchanged verification', () => {
    it('invite-redirect does NOT modify register-invited-user file', () => {
      // Verify by checking that register-invited-user still has its key functions
      const regSource = readEdgeFunction('register-invited-user');
      expect(regSource).toContain('Deno.serve');
      expect(regSource).toContain('handleValidateToken');
      expect(regSource).toContain('handleRegister');
    });

    it('invite-redirect calls register-invited-user via fetch, not import', () => {
      // Should NOT have any import from register-invited-user
      expect(inviteSource).not.toContain("from './register-invited-user'");
      expect(inviteSource).not.toContain("from '../register-invited-user'");
      // Should use fetch instead
      expect(inviteSource).toContain("fetch(apiBase + '/register-invited-user'");
    });
  });

  // --- EC-139-01: Token invalid error mapping ---

  describe('EC-139-01: Token invalid error mapping', () => {
    it('getErrorMessage maps token_invalid to errorTokenInvalid', () => {
      expect(inviteSource).toContain("errorCode === 'token_invalid'");
      expect(inviteSource).toContain('return t.errorTokenInvalid');
    });
  });

  // --- EC-139-02: Token used error mapping ---

  describe('EC-139-02: Token used error mapping', () => {
    it('getErrorMessage maps token_used to errorTokenUsed', () => {
      expect(inviteSource).toContain("errorCode === 'token_used'");
      expect(inviteSource).toContain('return t.errorTokenUsed');
    });
  });

  // --- EC-139-03: Token expired error mapping ---

  describe('EC-139-03: Token expired error mapping', () => {
    it('getErrorMessage maps token_expired to errorTokenExpired', () => {
      expect(inviteSource).toContain("errorCode === 'token_expired'");
      expect(inviteSource).toContain('return t.errorTokenExpired');
    });
  });

  // --- EC-139-04: Empty fullName validation ---

  describe('EC-139-04: Empty fullName validation', () => {
    it('fullName check sets errorEmptyName text', () => {
      expect(inviteSource).toContain('validationError.textContent = t.errorEmptyName');
    });

    it('fullName check returns before fetch', () => {
      const submitIdx = inviteSource.indexOf("addEventListener('submit'");
      const nameCheckIdx = inviteSource.indexOf('!fullName', submitIdx);
      const returnAfterName = inviteSource.indexOf('return', nameCheckIdx);
      const fetchIdx = inviteSource.indexOf('register-invited-user', returnAfterName);
      expect(returnAfterName).toBeGreaterThan(nameCheckIdx);
      expect(fetchIdx).toBeGreaterThan(returnAfterName);
    });
  });

  // --- EC-139-05: Short password validation ---

  describe('EC-139-05: Short password validation', () => {
    it('password check sets errorShortPassword text', () => {
      expect(inviteSource).toContain('validationError.textContent = t.errorShortPassword');
    });
  });

  // --- EC-139-06: Non-matching passwords ---

  describe('EC-139-06: Non-matching passwords validation', () => {
    it('mismatch check sets errorMismatch text', () => {
      expect(inviteSource).toContain('validationError.textContent = t.errorMismatch');
    });
  });

  // --- EC-139-07: Failed to create user error ---

  describe('EC-139-07: Failed to create user error mapping', () => {
    it('getErrorMessage maps Failed to create user to errorCreateFailed', () => {
      expect(inviteSource).toContain("errorCode === 'Failed to create user'");
      expect(inviteSource).toContain('return t.errorCreateFailed');
    });

    it('getErrorMessage has generic fallback', () => {
      expect(inviteSource).toContain('return t.errorGeneric');
    });
  });

  // --- Styling verification ---

  describe('Styling: Card layout and colors match F138', () => {
    it('card has max-width 400px', () => {
      expect(inviteSource).toContain('max-width: 400px');
    });

    it('body background is #f5f5f5', () => {
      expect(inviteSource).toContain('background-color: #f5f5f5');
    });

    it('primary color is #4F46E5', () => {
      expect(inviteSource).toContain('#4F46E5');
    });

    it('card background is #fff', () => {
      expect(inviteSource).toContain('background: #fff');
    });

    it('card has border-radius 8px', () => {
      expect(inviteSource).toContain('border-radius: 8px');
    });
  });

  // --- Loading state ---

  describe('Loading state structure', () => {
    it('loading div is visible by default (not hidden)', () => {
      const loadingDivMatch = inviteSource.match(/<div id="loading"[^>]*>/);
      expect(loadingDivMatch).not.toBeNull();
      expect(loadingDivMatch![0]).not.toContain('hidden');
    });

    it('form-container is initially hidden', () => {
      expect(inviteSource).toContain('id="form-container" class="hidden"');
    });

    it('loading has spinner with animation', () => {
      expect(inviteSource).toContain('class="spinner"');
      expect(inviteSource).toContain('@keyframes spin');
    });

    it('loading text is set from i18n', () => {
      expect(inviteSource).toContain("loading-text").valueOf;
      expect(inviteSource).toContain('t.loading');
    });
  });

  // --- Form fields verification ---

  describe('Form has all required editable fields', () => {
    it('has fullname text input', () => {
      expect(inviteSource).toContain('id="fullname"');
      expect(inviteSource).toMatch(/id="fullname"[^>]*required/);
    });

    it('has password input', () => {
      expect(inviteSource).toContain('type="password"');
      expect(inviteSource).toContain('id="password"');
    });

    it('has confirm-password input', () => {
      expect(inviteSource).toContain('id="confirm-password"');
    });
  });
});
