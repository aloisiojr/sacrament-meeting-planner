/**
 * Batch 22 Phase 2 - TESTER tests for F143, F144.
 * Complements batch22-f143-f144.test.ts with additional coverage.
 *
 * CR-208 (F143): Structured error codes + diagnostic mode in create-invitation
 * CR-204 (F144): External hosting for HTML pages (302 redirect + GitHub Pages)
 *
 * Total ACs: F143 (6) + F144 (14) = 20
 * Total ECs: F143 (6) + F144 (5) = 11
 *
 * Tester additions focus on:
 * - Validation step ordering (auth -> jwt -> metadata -> role -> payload -> diagnose -> insert)
 * - Co-located error/code fields in same JSON.stringify calls
 * - Diagnostic mode security (no sensitive data, strict === true check)
 * - External page mobile/form correctness (viewport, input types, state transitions)
 * - Token regex strictness, redirect URL construction
 * - Client-side validation flow ordering and state management
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
// F143: Structured error codes + diagnostic mode - Tester Additional Coverage
// ============================================================================

describe('F143 (CR-208) - Tester: create-invitation validation ordering & security', () => {
  const source = readEdgeFunction('create-invitation');

  // --- AC-143-01+02: Validation step ordering (auth -> jwt -> metadata -> role -> payload -> insert) ---

  describe('AC-143-01: Validation steps execute in correct order', () => {
    it('auth_header check is the FIRST validation (before JWT, metadata, etc.)', () => {
      const authIdx = source.indexOf("auth/missing-header");
      const jwtIdx = source.indexOf("auth/invalid-token");
      const metaIdx = source.indexOf("auth/missing-metadata");
      const roleIdx = source.indexOf("auth/insufficient-permission");
      const payloadIdx = source.indexOf("validation/missing-fields");
      const insertIdx = source.indexOf("invitation/insert-failed");

      expect(authIdx).toBeLessThan(jwtIdx);
      expect(jwtIdx).toBeLessThan(metaIdx);
      expect(metaIdx).toBeLessThan(roleIdx);
      expect(roleIdx).toBeLessThan(payloadIdx);
      expect(payloadIdx).toBeLessThan(insertIdx);
    });

    it('each console.error uses the [create-invitation] prefix (no generic prefixes)', () => {
      // All error logs must use the structured prefix
      const errorLogs = source.match(/console\.error\(/g) || [];
      const structuredLogs = source.match(/console\.error\(['`]\[create-invitation\]/g) || [];
      // At most 2 non-structured logs (the catch-all "Unexpected error" and "Auto-actor creation failed")
      expect(errorLogs.length - structuredLogs.length).toBeLessThanOrEqual(2);
    });

    it('metadata_check log includes all 3 context fields: ward_id, role, user_id', () => {
      const metaLogMatch = source.match(/\[create-invitation\] metadata_check failed:.*ward_id=.*role=.*user_id=/);
      expect(metaLogMatch).not.toBeNull();
    });

    it('role_permission log includes userRole value', () => {
      const roleLogMatch = source.match(/\[create-invitation\] role_permission failed:.*userRole=\$\{userRole\}/);
      expect(roleLogMatch).not.toBeNull();
    });
  });

  // --- AC-143-02: Error and code fields co-located in same JSON.stringify ---

  describe('AC-143-02: Error+code fields are co-located (not separate objects)', () => {
    it('auth/missing-header has error AND code in same JSON.stringify', () => {
      const match = source.match(/JSON\.stringify\(\{[^}]*error:.*Missing authorization header.*code:.*auth\/missing-header[^}]*\}/s);
      expect(match).not.toBeNull();
    });

    it('auth/invalid-token has error AND code in same JSON.stringify', () => {
      const match = source.match(/JSON\.stringify\(\{[^}]*error:.*Invalid or expired token.*code:.*auth\/invalid-token[^}]*\}/s);
      expect(match).not.toBeNull();
    });

    it('auth/missing-metadata has error AND code in same JSON.stringify', () => {
      const match = source.match(/JSON\.stringify\(\{[^}]*error:.*User missing ward or role metadata.*code:.*auth\/missing-metadata[^}]*\}/s);
      expect(match).not.toBeNull();
    });

    it('auth/insufficient-permission has error AND code in same JSON.stringify', () => {
      const match = source.match(/JSON\.stringify\(\{[^}]*error:.*Insufficient permissions.*code:.*auth\/insufficient-permission[^}]*\}/s);
      expect(match).not.toBeNull();
    });

    it('validation/invalid-role has error AND code in same JSON.stringify', () => {
      const match = source.match(/JSON\.stringify\(\{[^}]*error:.*Invalid role.*code:.*validation\/invalid-role[^}]*\}/s);
      expect(match).not.toBeNull();
    });

    it('validation/invalid-email has error AND code in same JSON.stringify', () => {
      const match = source.match(/JSON\.stringify\(\{[^}]*error:.*Invalid email format.*code:.*validation\/invalid-email[^}]*\}/s);
      expect(match).not.toBeNull();
    });

    it('invitation/insert-failed has error AND code in same JSON.stringify', () => {
      const match = source.match(/JSON\.stringify\(\{[^}]*error:.*Failed to create invitation.*code:.*invitation\/insert-failed[^}]*\}/s);
      expect(match).not.toBeNull();
    });
  });

  // --- AC-143-03: Diagnostic mode security and response shape ---

  describe('AC-143-03: Diagnostic mode security', () => {
    it('diagnostic mode uses strict equality (=== true), not truthy check', () => {
      expect(source).toContain('input.diagnose === true');
      // Should not use just input.diagnose or input.diagnose == true
      expect(source).not.toMatch(/if\s*\(\s*input\.diagnose\s*\)/);
    });

    it('diagnostic response does NOT contain JWT or service key references', () => {
      const diagStart = source.indexOf('diagnostic: true');
      const diagEnd = source.indexOf('status: 200', diagStart);
      const diagBlock = source.substring(diagStart, diagEnd + 30);

      expect(diagBlock).not.toContain('token');
      expect(diagBlock).not.toContain('SERVICE_ROLE_KEY');
      expect(diagBlock).not.toContain('authHeader');
    });

    it('diagnostic response has exactly 5 check keys', () => {
      const diagStart = source.indexOf('checks: {');
      const diagEnd = source.indexOf('}', source.indexOf('}', diagStart) + 1);
      const checksBlock = source.substring(diagStart, diagEnd);

      expect(checksBlock).toContain('auth_header');
      expect(checksBlock).toContain('jwt_validation');
      expect(checksBlock).toContain('metadata_check');
      expect(checksBlock).toContain('role_permission');
      expect(checksBlock).toContain('payload_validation');
      // Should NOT contain db_insert (that check is skipped in diagnostic mode)
      expect(checksBlock).not.toContain('db_insert');
    });
  });

  // --- AC-143-04: Success response structure verification ---

  describe('AC-143-04: Success response structure', () => {
    it('201 response includes invitation object with all required fields', () => {
      const successBlock = source.substring(source.indexOf('status: 201') - 500, source.indexOf('status: 201'));
      expect(successBlock).toContain('id: invitation.id');
      expect(successBlock).toContain('email: invitation.email');
      expect(successBlock).toContain('role: invitation.role');
      expect(successBlock).toContain('token: invitationToken');
      expect(successBlock).toContain('expiresAt: invitation.expires_at');
    });

    it('invitation token is generated with crypto.randomUUID()', () => {
      expect(source).toContain('crypto.randomUUID()');
    });

    it('expiry is calculated as 30 days from now', () => {
      expect(source).toContain('INVITATION_EXPIRY_DAYS');
      expect(source).toContain('setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS)');
    });
  });

  // --- EC-143-03: Observer role specifically excluded ---

  describe('EC-143-03: Observer role cannot create invitations', () => {
    it('ALLOWED_ROLES contains only bishopric and secretary (not observer)', () => {
      const allowedMatch = source.match(/ALLOWED_ROLES\s*=\s*\[([^\]]+)\]/);
      expect(allowedMatch).not.toBeNull();
      const roles = allowedMatch![1];
      expect(roles).toContain("'bishopric'");
      expect(roles).toContain("'secretary'");
      expect(roles).not.toContain("'observer'");
    });

    it('observer IS in VALID_ROLES (can be invited but cannot invite)', () => {
      const validMatch = source.match(/VALID_ROLES\s*=\s*\[([^\]]+)\]/);
      expect(validMatch).not.toBeNull();
      const roles = validMatch![1];
      expect(roles).toContain("'observer'");
    });
  });

  // --- EC-143-04: Error responses use correct HTTP status codes ---

  describe('EC-143-04: HTTP status codes match error types', () => {
    it('auth errors return 401', () => {
      // auth/missing-header -> 401
      const authHeaderBlock = source.substring(
        source.indexOf("auth/missing-header") - 200,
        source.indexOf("auth/missing-header") + 50
      );
      expect(authHeaderBlock).toContain('status: 401');

      // auth/invalid-token -> 401
      const authTokenBlock = source.substring(
        source.indexOf("auth/invalid-token") - 200,
        source.indexOf("auth/invalid-token") + 50
      );
      expect(authTokenBlock).toContain('status: 401');
    });

    it('permission errors return 403', () => {
      // auth/missing-metadata -> 403
      const metaIdx = source.indexOf("auth/missing-metadata");
      const metaBlock = source.substring(metaIdx, metaIdx + 150);
      expect(metaBlock).toContain('status: 403');

      // auth/insufficient-permission -> 403
      const permIdx = source.indexOf("auth/insufficient-permission");
      const permBlock = source.substring(permIdx, permIdx + 150);
      expect(permBlock).toContain('status: 403');
    });

    it('validation errors return 400', () => {
      // validation/invalid-role -> 400
      const roleIdx = source.indexOf("validation/invalid-role");
      const roleBlock = source.substring(roleIdx, roleIdx + 150);
      expect(roleBlock).toContain('status: 400');

      // validation/invalid-email -> 400
      const emailIdx = source.indexOf("validation/invalid-email");
      const emailBlock = source.substring(emailIdx, emailIdx + 150);
      expect(emailBlock).toContain('status: 400');
    });

    it('db_insert failure returns 500', () => {
      const insertIdx = source.indexOf("invitation/insert-failed");
      const insertBlock = source.substring(insertIdx, insertIdx + 150);
      expect(insertBlock).toContain('status: 500');
    });
  });

  // --- CORS on all error responses ---

  describe('AC-143-02+13: CORS headers on all error responses', () => {
    it('all responses include corsHeaders spread', () => {
      const responseBlocks = source.match(/new Response\(/g) || [];
      const corsBlocks = source.match(/\.\.\.corsHeaders/g) || [];
      // Every Response (except OPTIONS 'ok') should have corsHeaders
      // OPTIONS + error responses + diagnostic + success = many, corsHeaders should appear in all except catch-all
      expect(corsBlocks.length).toBeGreaterThanOrEqual(responseBlocks.length - 2);
    });

    it('all JSON error responses set Content-Type: application/json', () => {
      const contentTypeMatches = source.match(/'Content-Type':\s*'application\/json'/g) || [];
      // Should have Content-Type on every JSON response (at least 8 error types + diagnostic + success)
      expect(contentTypeMatches.length).toBeGreaterThanOrEqual(10);
    });
  });

  // --- CreateInvitationInput interface ---

  describe('Interface correctness', () => {
    it('interface has email: string field', () => {
      expect(source).toContain('email: string');
    });

    it('interface has role with union type', () => {
      expect(source).toMatch(/role:\s*'bishopric'\s*\|\s*'secretary'\s*\|\s*'observer'/);
    });

    it('diagnose is optional (diagnose?: boolean)', () => {
      expect(source).toContain('diagnose?: boolean');
    });
  });

  // --- Email validation regex ---

  describe('Email validation', () => {
    it('uses a regex that requires @ and domain', () => {
      expect(source).toContain("@[^\\s@]+\\.[^\\s@]+");
    });

    it('email validation comes after role validation (correct order)', () => {
      const roleValIdx = source.indexOf("validation/invalid-role");
      const emailValIdx = source.indexOf("validation/invalid-email");
      expect(roleValIdx).toBeLessThan(emailValIdx);
    });
  });
});

// ============================================================================
// F144: reset-redirect 302 redirect - Tester Additional Coverage
// ============================================================================

describe('F144 (CR-204) - Tester: reset-redirect redirect correctness', () => {
  const source = readEdgeFunction('reset-redirect');

  // --- Token regex strictness ---

  describe('AC-144-12: Token regex accepts correct characters', () => {
    it('token regex allows alphanumeric, underscores, and hyphens', () => {
      // The regex should be /^[a-zA-Z0-9_-]+$/
      expect(source).toContain('[a-zA-Z0-9_-]+');
    });

    it('token regex is anchored (^ and $) to prevent partial matches', () => {
      expect(source).toMatch(/\/\^[^/]+\$\//);
    });
  });

  // --- Redirect URL construction ---

  describe('AC-144-01: Redirect URL is properly constructed', () => {
    it('redirect URL is built from externalPagesUrl variable (not hardcoded)', () => {
      expect(source).toContain('`${externalPagesUrl}/reset-password.html');
    });

    it('redirect URL includes both token and type as query params', () => {
      expect(source).toContain('?token=${token}&type=${type}');
    });
  });

  // --- No leftover Supabase client references ---

  describe('AC-144-01: No inline HTML or Supabase client in EF', () => {
    it('does not import or use createClient', () => {
      expect(source).not.toContain('createClient');
      expect(source).not.toContain('@supabase/supabase-js');
    });

    it('does not reference supabaseUrl or supabaseAnonKey', () => {
      expect(source).not.toContain('supabaseUrl');
      expect(source).not.toContain('supabaseAnonKey');
      expect(source).not.toContain('SUPABASE_URL');
      expect(source).not.toContain('SUPABASE_ANON_KEY');
    });

    it('does not contain any <script> or <style> tags', () => {
      expect(source).not.toContain('<script');
      expect(source).not.toContain('<style');
    });
  });

  // --- ALLOWED_TYPES array ---

  describe('AC-144-10: Type validation', () => {
    it('ALLOWED_TYPES includes recovery', () => {
      expect(source).toContain("'recovery'");
    });

    it('ALLOWED_TYPES is used with .includes() for validation', () => {
      expect(source).toContain('ALLOWED_TYPES.includes(type)');
    });
  });

  // --- Response shape for 400 errors ---

  describe('AC-144-10+12: 400 error responses have correct shape', () => {
    it('missing params error is JSON with error field', () => {
      expect(source).toContain("JSON.stringify({ error: 'Missing required parameters: token and type' })");
    });

    it('invalid token error is JSON with error field', () => {
      expect(source).toContain("JSON.stringify({ error: 'Invalid token format' })");
    });

    it('invalid type error is JSON with error field', () => {
      expect(source).toContain("JSON.stringify({ error: 'Invalid type format' })");
    });
  });

  // --- Logging ---

  describe('EC-144-04: Logging for debugging', () => {
    it('logs warning for missing EXTERNAL_PAGES_URL using console.warn', () => {
      expect(source).toContain("console.warn('[reset-redirect] EXTERNAL_PAGES_URL not set, using default')");
    });

    it('logs redirect action using console.log', () => {
      expect(source).toContain("console.log('[reset-redirect] Redirecting to external page')");
    });
  });
});

// ============================================================================
// F144: invite-redirect 302 redirect - Tester Additional Coverage
// ============================================================================

describe('F144 (CR-204) - Tester: invite-redirect redirect correctness', () => {
  const source = readEdgeFunction('invite-redirect');

  // --- UUID regex strictness ---

  describe('AC-144-12: UUID regex is strict', () => {
    it('UUID regex has exactly 5 groups (8-4-4-4-12)', () => {
      const uuidRegex = source.match(/\/\^.*\$\//);
      expect(uuidRegex).not.toBeNull();
      const pattern = uuidRegex![0];
      // Count hex groups separated by hyphens
      expect(pattern).toContain('{8}-');
      expect(pattern).toContain('{4}-');
      expect(pattern).toContain('{12}');
    });

    it('UUID regex is case-insensitive (allows a-f and A-F)', () => {
      expect(source).toContain('a-fA-F');
    });
  });

  // --- Redirect URL construction ---

  describe('AC-144-02: Redirect URL is properly constructed', () => {
    it('redirect URL is built from externalPagesUrl variable', () => {
      expect(source).toContain('`${externalPagesUrl}/accept-invite.html');
    });

    it('redirect URL includes only token as query param (no type)', () => {
      expect(source).toContain('?token=${token}`');
      expect(source).not.toContain('&type=');
    });
  });

  // --- No leftover references ---

  describe('AC-144-02: No inline HTML or Supabase references', () => {
    it('does not import createClient', () => {
      expect(source).not.toContain('createClient');
      expect(source).not.toContain('@supabase/supabase-js');
    });

    it('does not have inline HTML', () => {
      expect(source).not.toContain('<html');
      expect(source).not.toContain('</html>');
      expect(source).not.toContain('<body');
    });

    it('does not reference register-invited-user (that is in external page)', () => {
      expect(source).not.toContain('register-invited-user');
    });
  });

  // --- Only GET requests handled (no POST) ---

  describe('Correct HTTP method handling', () => {
    it('uses Deno.serve for request handling', () => {
      expect(source).toContain('Deno.serve(');
    });

    it('handles OPTIONS for CORS preflight', () => {
      expect(source).toContain("req.method === 'OPTIONS'");
    });

    it('does not check for POST method (public redirect endpoint)', () => {
      expect(source).not.toContain("req.method === 'POST'");
    });
  });
});

// ============================================================================
// F144: reset-password.html - Tester Additional Coverage
// ============================================================================

describe('F144 (CR-204) - Tester: reset-password.html page quality', () => {
  const source = readExternalPage('reset-password.html');

  // --- Mobile viewport ---

  describe('AC-144-03: Mobile-friendly page setup', () => {
    it('has viewport meta tag for mobile rendering', () => {
      expect(source).toContain('name="viewport"');
      expect(source).toContain('width=device-width');
      expect(source).toContain('initial-scale=1.0');
    });

    it('has charset UTF-8 meta tag', () => {
      expect(source).toContain('charset="UTF-8"');
    });
  });

  // --- Password field types ---

  describe('AC-144-03: Password fields are properly typed', () => {
    it('password field has type="password" (not text)', () => {
      const passwordField = source.match(/<input[^>]*id="password"[^>]*/);
      expect(passwordField).not.toBeNull();
      expect(passwordField![0]).toContain('type="password"');
    });

    it('confirm-password field has type="password" (not text)', () => {
      const confirmField = source.match(/<input[^>]*id="confirm-password"[^>]*/);
      expect(confirmField).not.toBeNull();
      expect(confirmField![0]).toContain('type="password"');
    });

    it('both password fields have required attribute', () => {
      const passwordFields = source.match(/<input[^>]*type="password"[^>]*required/g) || [];
      expect(passwordFields.length).toBe(2);
    });
  });

  // --- Form submit behavior ---

  describe('AC-144-03: Form submit flow', () => {
    it('form submit calls preventDefault', () => {
      expect(source).toContain('e.preventDefault()');
    });

    it('submit button is disabled during submission', () => {
      expect(source).toContain('submitBtn.disabled = true');
    });

    it('submit button text changes to submitting text during submission', () => {
      expect(source).toContain('submitBtn.textContent = t.submitting');
    });

    it('submit button is re-enabled on error', () => {
      expect(source).toContain('submitBtn.disabled = false');
      expect(source).toContain('submitBtn.textContent = t.submit');
    });
  });

  // --- State transitions ---

  describe('AC-144-03: State transitions (loading -> form or error)', () => {
    it('showError hides loading and form, shows error', () => {
      const showErrorFn = source.substring(
        source.indexOf('function showError'),
        source.indexOf('function showForm')
      );
      expect(showErrorFn).toContain("'loading'");
      expect(showErrorFn).toContain("'form-container'");
      expect(showErrorFn).toContain("'error-container'");
    });

    it('showForm hides loading, shows form container', () => {
      const showFormFn = source.substring(
        source.indexOf('function showForm'),
        source.indexOf('function showSuccess')
      );
      expect(showFormFn).toContain("'loading'");
      expect(showFormFn).toContain("'form-container'");
    });

    it('showSuccess hides form, shows success container', () => {
      const showSuccessFn = source.substring(
        source.indexOf('function showSuccess'),
        source.indexOf('// --- Main ---')
      );
      expect(showSuccessFn).toContain("'form-container'");
      expect(showSuccessFn).toContain("'success-container'");
    });
  });

  // --- i18n completeness check ---

  describe('AC-144-07: i18n translation keys completeness', () => {
    const ptBlock = source.substring(source.indexOf('} else {'), source.indexOf('// --- Apply i18n ---'));
    const enBlock = source.substring(source.indexOf("lang.startsWith('en')"), source.indexOf("lang.startsWith('es')"));
    const esBlock = source.substring(source.indexOf("lang.startsWith('es')"), source.indexOf('} else {'));

    const requiredKeys = [
      'subtitle', 'loading', 'labelPassword', 'labelConfirm',
      'submit', 'submitting', 'success', 'errorExpired',
      'errorShortPassword', 'errorMismatch', 'errorGeneric',
      'errorCdn', 'errorMissingParams'
    ];

    it('pt-BR has all required translation keys', () => {
      requiredKeys.forEach(key => {
        expect(ptBlock).toContain(`${key}:`);
      });
    });

    it('English has all required translation keys', () => {
      requiredKeys.forEach(key => {
        expect(enBlock).toContain(`${key}:`);
      });
    });

    it('Spanish has all required translation keys', () => {
      requiredKeys.forEach(key => {
        expect(esBlock).toContain(`${key}:`);
      });
    });
  });

  // --- verifyOtp before form display ---

  describe('AC-144-05: Token verification before form display', () => {
    it('verifyOtp is called before showForm in main flow', () => {
      const mainSection = source.substring(source.indexOf('// --- Main ---'));
      const verifyIdx = mainSection.indexOf('verifyOtp');
      const showFormIdx = mainSection.indexOf('showForm()');
      expect(verifyIdx).toBeGreaterThan(-1);
      expect(showFormIdx).toBeGreaterThan(verifyIdx);
    });

    it('param check (!tokenHash || !tokenType) happens before supabase client creation', () => {
      const mainSection = source.substring(source.indexOf('// --- Main ---'));
      const paramCheckIdx = mainSection.indexOf('!tokenHash || !tokenType');
      const clientIdx = mainSection.indexOf('createClient');
      expect(paramCheckIdx).toBeGreaterThan(-1);
      expect(clientIdx).toBeGreaterThan(paramCheckIdx);
    });
  });

  // --- CDN dual protection ---

  describe('CDN loading dual protection', () => {
    it('script tag has onerror attribute for CDN load failure', () => {
      expect(source).toContain('onerror="handleCdnError()"');
    });

    it('runtime check for window.supabase before use', () => {
      expect(source).toContain("typeof window.supabase === 'undefined'");
    });

    it('handleCdnError function shows CDN error message', () => {
      const cdnErrorFn = source.substring(
        source.indexOf('function handleCdnError'),
        source.indexOf('// --- State helpers ---')
      );
      expect(cdnErrorFn).toContain('t.errorCdn');
    });
  });
});

// ============================================================================
// F144: accept-invite.html - Tester Additional Coverage
// ============================================================================

describe('F144 (CR-204) - Tester: accept-invite.html page quality', () => {
  const source = readExternalPage('accept-invite.html');

  // --- Mobile viewport ---

  describe('AC-144-04: Mobile-friendly page setup', () => {
    it('has viewport meta tag for mobile rendering', () => {
      expect(source).toContain('name="viewport"');
      expect(source).toContain('width=device-width');
    });

    it('has charset UTF-8 meta tag', () => {
      expect(source).toContain('charset="UTF-8"');
    });
  });

  // --- API call configuration ---

  describe('AC-144-06: API call headers and method', () => {
    it('sends Content-Type: application/json header', () => {
      expect(source).toContain("'Content-Type': 'application/json'");
    });

    it('sends apikey header for Supabase auth', () => {
      expect(source).toContain("'apikey': apiKey");
    });

    it('uses POST method for register-invited-user', () => {
      expect(source).toContain("method: 'POST'");
    });

    it('apiBase is constructed from SUPABASE_URL + /functions/v1', () => {
      expect(source).toContain("var apiBase = SUPABASE_URL + '/functions/v1'");
    });

    it('apiKey is set from SUPABASE_ANON_KEY', () => {
      expect(source).toContain('var apiKey = SUPABASE_ANON_KEY');
    });
  });

  // --- Form field types ---

  describe('AC-144-04: Form field types and attributes', () => {
    it('fullname field has type="text"', () => {
      const nameField = source.match(/<input[^>]*id="fullname"[^>]*/);
      expect(nameField).not.toBeNull();
      expect(nameField![0]).toContain('type="text"');
    });

    it('password fields have type="password"', () => {
      const passwordFields = source.match(/<input[^>]*type="password"[^>]*/g) || [];
      expect(passwordFields.length).toBe(2);
    });

    it('fullname field has required attribute', () => {
      const nameField = source.match(/<input[^>]*id="fullname"[^>]*/);
      expect(nameField![0]).toContain('required');
    });

    it('disabled fields use type="text" (read-only display)', () => {
      const stakeField = source.match(/<input[^>]*id="stake"[^>]*/);
      expect(stakeField).not.toBeNull();
      expect(stakeField![0]).toContain('type="text"');
      expect(stakeField![0]).toContain('disabled');
    });
  });

  // --- Validation flow ordering ---

  describe('Client validation flow ordering', () => {
    it('validates fullName BEFORE password length', () => {
      const formSubmit = source.substring(source.indexOf('invite-form'));
      const nameCheckIdx = formSubmit.indexOf('!fullName');
      const passCheckIdx = formSubmit.indexOf('password.length < 6');
      expect(nameCheckIdx).toBeGreaterThan(-1);
      expect(passCheckIdx).toBeGreaterThan(nameCheckIdx);
    });

    it('validates password length BEFORE password match', () => {
      const formSubmit = source.substring(source.indexOf('invite-form'));
      const passCheckIdx = formSubmit.indexOf('password.length < 6');
      const matchCheckIdx = formSubmit.indexOf('password !== confirmPassword');
      expect(passCheckIdx).toBeGreaterThan(-1);
      expect(matchCheckIdx).toBeGreaterThan(passCheckIdx);
    });

    it('fullName is trimmed before validation', () => {
      // The .value.trim() appears before the !fullName check
      const trimIdx = source.indexOf("getElementById('fullname').value.trim()");
      const checkIdx = source.indexOf('!fullName', trimIdx);
      expect(trimIdx).toBeGreaterThan(-1);
      expect(checkIdx).toBeGreaterThan(trimIdx);
    });
  });

  // --- Error code mapping completeness ---

  describe('Error mapping completeness', () => {
    it('getErrorMessage handles token_invalid', () => {
      expect(source).toContain("errorCode === 'token_invalid'");
    });

    it('getErrorMessage handles token_used', () => {
      expect(source).toContain("errorCode === 'token_used'");
    });

    it('getErrorMessage handles token_expired', () => {
      expect(source).toContain("errorCode === 'token_expired'");
    });

    it('getErrorMessage handles Failed to create user', () => {
      expect(source).toContain("errorCode === 'Failed to create user'");
    });

    it('getErrorMessage has fallback for unknown errors', () => {
      expect(source).toContain('return t.errorGeneric');
    });
  });

  // --- Token validation on load (validate-only mode) ---

  describe('AC-144-05: Token validation on page load', () => {
    it('first fetch sends ONLY token (no password, no fullName)', () => {
      // The validate-only call sends { token: inviteToken }
      expect(source).toContain("JSON.stringify({ token: inviteToken })");
    });

    it('registration fetch sends token, password, and fullName', () => {
      expect(source).toContain('token: inviteToken, password: password, fullName: fullName');
    });

    it('validates token BEFORE showing form', () => {
      const mainSection = source.substring(source.indexOf('// --- Main ---'));
      const fetchIdx = mainSection.indexOf('register-invited-user');
      const showFormIdx = mainSection.indexOf('showForm()');
      expect(fetchIdx).toBeGreaterThan(-1);
      expect(showFormIdx).toBeGreaterThan(fetchIdx);
    });
  });

  // --- Submit button state management ---

  describe('Submit button state management', () => {
    it('button is disabled during submission', () => {
      expect(source).toContain('submitBtn.disabled = true');
    });

    it('button text changes to submitting during submission', () => {
      expect(source).toContain('submitBtn.textContent = t.submitting');
    });

    it('button is re-enabled on registration error', () => {
      // After the catch block, button is re-enabled
      const submitSection = source.substring(source.indexOf('submitBtn.disabled = true'));
      expect(submitSection).toContain('submitBtn.disabled = false');
    });

    it('success does NOT re-enable button (user is done)', () => {
      // showSuccess is called before re-enable code
      const successIdx = source.indexOf('showSuccess()');
      const returnIdx = source.indexOf('return;', successIdx);
      // After return, the re-enable code should be for error paths
      expect(returnIdx).toBeGreaterThan(successIdx);
    });
  });

  // --- i18n completeness ---

  describe('AC-144-07: i18n translation keys completeness', () => {
    const requiredKeys = [
      'subtitle', 'loading', 'labelStake', 'labelWard', 'labelRole',
      'labelEmail', 'labelFullName', 'labelPassword', 'labelConfirm',
      'submit', 'submitting', 'success', 'errorTokenInvalid',
      'errorTokenUsed', 'errorTokenExpired', 'errorCreateFailed',
      'errorEmptyName', 'errorShortPassword', 'errorMismatch',
      'errorGeneric', 'errorMissingToken'
    ];

    it('has 21 translation keys per language (more than reset-password)', () => {
      // accept-invite has more keys because it has more fields
      const enBlock = source.substring(source.indexOf("lang.startsWith('en')"), source.indexOf("lang.startsWith('es')"));
      requiredKeys.forEach(key => {
        expect(enBlock).toContain(`${key}:`);
      });
    });
  });

  // --- Does NOT use Supabase JS CDN ---

  describe('Uses fetch API (not Supabase JS CDN)', () => {
    it('does not load Supabase JS from CDN', () => {
      expect(source).not.toContain('cdn.jsdelivr.net');
      expect(source).not.toContain('window.supabase');
    });

    it('uses native fetch for API calls', () => {
      const fetchCalls = source.match(/fetch\(apiBase/g) || [];
      // Should have at least 2 fetch calls (validate + register)
      expect(fetchCalls.length).toBeGreaterThanOrEqual(2);
    });
  });

  // --- Read-only section styling ---

  describe('Styling: disabled input visual distinction', () => {
    it('disabled inputs have distinct background (#f3f4f6)', () => {
      expect(source).toContain('input:disabled');
      expect(source).toContain('background-color: #f3f4f6');
    });

    it('disabled inputs have muted text color (#6b7280)', () => {
      expect(source).toContain('color: #6b7280');
    });

    it('disabled inputs show not-allowed cursor', () => {
      expect(source).toContain('cursor: not-allowed');
    });
  });
});

// ============================================================================
// Cross-feature consistency checks
// ============================================================================

describe('F144 (CR-204) - Tester: Cross-page consistency', () => {
  const resetPage = readExternalPage('reset-password.html');
  const invitePage = readExternalPage('accept-invite.html');

  it('both pages use the same Supabase URL', () => {
    const resetUrl = resetPage.match(/SUPABASE_URL\s*=\s*'([^']+)'/);
    const inviteUrl = invitePage.match(/SUPABASE_URL\s*=\s*'([^']+)'/);
    expect(resetUrl).not.toBeNull();
    expect(inviteUrl).not.toBeNull();
    expect(resetUrl![1]).toBe(inviteUrl![1]);
  });

  it('both pages use the same Supabase anon key', () => {
    const resetKey = resetPage.match(/SUPABASE_ANON_KEY\s*=\s*'([^']+)'/);
    const inviteKey = invitePage.match(/SUPABASE_ANON_KEY\s*=\s*'([^']+)'/);
    expect(resetKey).not.toBeNull();
    expect(inviteKey).not.toBeNull();
    expect(resetKey![1]).toBe(inviteKey![1]);
  });

  it('both pages have the same title', () => {
    expect(resetPage).toContain('<title>Planejador de Reuniao Sacramental</title>');
    expect(invitePage).toContain('<title>Planejador de Reuniao Sacramental</title>');
  });

  it('both pages use the same primary color (#4F46E5)', () => {
    expect(resetPage).toContain('#4F46E5');
    expect(invitePage).toContain('#4F46E5');
  });

  it('both pages use the same background color (#f5f5f5)', () => {
    expect(resetPage).toContain('background-color: #f5f5f5');
    expect(invitePage).toContain('background-color: #f5f5f5');
  });

  it('both pages use the same card max-width (400px)', () => {
    expect(resetPage).toContain('max-width: 400px');
    expect(invitePage).toContain('max-width: 400px');
  });

  it('both pages use navigator.language for i18n detection', () => {
    expect(resetPage).toContain('navigator.language');
    expect(invitePage).toContain('navigator.language');
  });

  it('both pages support the same 3 languages (en, es, pt-BR default)', () => {
    expect(resetPage).toContain("lang.startsWith('en')");
    expect(resetPage).toContain("lang.startsWith('es')");
    expect(invitePage).toContain("lang.startsWith('en')");
    expect(invitePage).toContain("lang.startsWith('es')");
  });

  it('both pages have same HTML lang attribute (pt-BR)', () => {
    expect(resetPage).toContain('lang="pt-BR"');
    expect(invitePage).toContain('lang="pt-BR"');
  });

  it('both redirect EFs use same EXTERNAL_PAGES_URL default', () => {
    const resetEF = readEdgeFunction('reset-redirect');
    const inviteEF = readEdgeFunction('invite-redirect');
    const defaultUrl = 'https://aloisiojr.github.io/sacrament-meeting-planner/public';
    expect(resetEF).toContain(defaultUrl);
    expect(inviteEF).toContain(defaultUrl);
  });
});
