/**
 * Batch 22 Phase 2: Tests for F143, F144.
 * CR-208 (F143): Structured error codes + diagnostic mode in create-invitation
 * CR-204 (F144): External hosting for HTML pages (302 redirect + GitHub Pages)
 *
 * These tests supersede parts of batch22-f138-f139.test.ts and
 * batch22-tester-f138-f139.test.ts for reset-redirect and invite-redirect,
 * which now use 302 redirects instead of inline HTML.
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
// F143: Structured error codes + diagnostic mode in create-invitation (CR-208)
// ============================================================================

describe('F143 (CR-208): Structured error codes + diagnostic mode in create-invitation', () => {
  const source = readEdgeFunction('create-invitation');

  // --- AC-143-01: Structured logging at each failure point ---

  describe('AC-143-01: Structured logging at each failure point', () => {
    it('logs auth_header failure with [create-invitation] prefix', () => {
      expect(source).toContain("[create-invitation] auth_header failed");
    });

    it('logs jwt_validation failure with [create-invitation] prefix', () => {
      expect(source).toContain("[create-invitation] jwt_validation failed:");
    });

    it('logs metadata_check failure with ward_id, role, user_id context', () => {
      expect(source).toContain("[create-invitation] metadata_check failed:");
      expect(source).toContain('ward_id=');
      expect(source).toContain('role=');
      expect(source).toContain('user_id=');
    });

    it('logs role_permission failure with userRole and user_id', () => {
      expect(source).toContain("[create-invitation] role_permission failed:");
      expect(source).toContain('userRole=');
    });

    it('logs payload_validation failures', () => {
      expect(source).toContain("[create-invitation] payload_validation failed:");
    });

    it('logs db_insert failure (replaces generic "Invitation creation error")', () => {
      expect(source).toContain("[create-invitation] db_insert failed:");
      expect(source).not.toContain("console.error('Invitation creation error:'");
    });

    it('all failure logs use console.error', () => {
      const logLines = source.match(/console\.error\(['`]\[create-invitation\]/g);
      expect(logLines).not.toBeNull();
      expect(logLines!.length).toBeGreaterThanOrEqual(6);
    });
  });

  // --- AC-143-02: Error codes in responses ---

  describe('AC-143-02: Error responses include error codes', () => {
    it('401 missing auth header has code auth/missing-header', () => {
      expect(source).toContain("code: 'auth/missing-header'");
    });

    it('401 invalid token has code auth/invalid-token', () => {
      expect(source).toContain("code: 'auth/invalid-token'");
    });

    it('403 missing metadata has code auth/missing-metadata', () => {
      expect(source).toContain("code: 'auth/missing-metadata'");
    });

    it('403 insufficient permissions has code auth/insufficient-permission', () => {
      expect(source).toContain("code: 'auth/insufficient-permission'");
    });

    it('400 missing fields has code validation/missing-fields', () => {
      expect(source).toContain("code: 'validation/missing-fields'");
    });

    it('400 invalid role has code validation/invalid-role', () => {
      expect(source).toContain("code: 'validation/invalid-role'");
    });

    it('400 invalid email has code validation/invalid-email', () => {
      expect(source).toContain("code: 'validation/invalid-email'");
    });

    it('500 insert failed has code invitation/insert-failed', () => {
      expect(source).toContain("code: 'invitation/insert-failed'");
    });

    it('all error responses include both error and code fields', () => {
      // Every JSON.stringify({ error: ..., code: ... }) pattern
      const errorResponses = source.match(/JSON\.stringify\(\{\s*error:/g);
      const codeResponses = source.match(/code:\s*'/g);
      expect(errorResponses).not.toBeNull();
      expect(codeResponses).not.toBeNull();
      // At least 8 error codes for the 8 error types
      expect(codeResponses!.length).toBeGreaterThanOrEqual(8);
    });
  });

  // --- AC-143-03: Diagnostic mode ---

  describe('AC-143-03: Diagnostic mode returns report without DB insert', () => {
    it('checks for diagnose: true in request body', () => {
      expect(source).toContain('input.diagnose === true');
    });

    it('returns diagnostic: true in response', () => {
      expect(source).toContain('diagnostic: true');
    });

    it('returns checks object with all 5 validation steps', () => {
      expect(source).toContain("auth_header: 'pass'");
      expect(source).toContain("jwt_validation: 'pass'");
      expect(source).toContain("metadata_check: 'pass'");
      expect(source).toContain("role_permission: 'pass'");
      expect(source).toContain("payload_validation: 'pass'");
    });

    it('returns user_id and ward_id in diagnostic response', () => {
      // In the diagnostic response block
      const diagIdx = source.indexOf('diagnostic: true');
      const diagBlock = source.substring(diagIdx, diagIdx + 300);
      expect(diagBlock).toContain('user_id:');
      expect(diagBlock).toContain('ward_id:');
    });

    it('returns 200 for diagnostic mode (not 201)', () => {
      const diagIdx = source.indexOf('diagnostic: true');
      const responseBlock = source.substring(diagIdx - 200, diagIdx + 400);
      expect(responseBlock).toContain('status: 200');
    });

    it('diagnostic mode runs BEFORE db insert (skip insert)', () => {
      const diagIdx = source.indexOf('input.diagnose === true');
      const insertIdx = source.indexOf(".from('invitations')");
      expect(diagIdx).toBeGreaterThan(-1);
      expect(insertIdx).toBeGreaterThan(diagIdx);
    });
  });

  // --- AC-143-04: Success response unchanged ---

  describe('AC-143-04: Successful invitation creation unchanged', () => {
    it('returns 201 for successful creation', () => {
      expect(source).toContain('status: 201');
    });

    it('response includes invitation data with deepLink', () => {
      expect(source).toContain('deepLink');
      expect(source).toContain('invitation:');
    });

    it('deepLink uses invite-redirect path', () => {
      expect(source).toContain('invite-redirect?token=');
    });
  });

  // --- EC-143-01: Malformed JSON body handling ---

  describe('EC-143-01/EC-143-06: Malformed JSON body handling', () => {
    it('wraps req.json() in try/catch', () => {
      expect(source).toContain('await req.json()');
      // The try/catch pattern around req.json()
      const jsonIdx = source.indexOf('await req.json()');
      const precedingBlock = source.substring(jsonIdx - 100, jsonIdx);
      expect(precedingBlock).toContain('try');
    });

    it('malformed JSON returns 400 with validation/missing-fields code', () => {
      // The catch block for malformed JSON returns validation/missing-fields
      const jsonIdx = source.indexOf('await req.json()');
      const catchBlock = source.substring(jsonIdx, jsonIdx + 300);
      expect(catchBlock).toContain('catch');
      expect(catchBlock).toContain("validation/missing-fields");
    });
  });

  // --- EC-143-05: Diagnostic mode requires authentication ---

  describe('EC-143-05: Diagnostic mode requires authentication', () => {
    it('auth header check comes before diagnose check', () => {
      const authIdx = source.indexOf("'auth/missing-header'");
      const diagIdx = source.indexOf('input.diagnose');
      expect(authIdx).toBeGreaterThan(-1);
      expect(diagIdx).toBeGreaterThan(authIdx);
    });

    it('JWT validation comes before diagnose check', () => {
      const jwtIdx = source.indexOf("'auth/invalid-token'");
      const diagIdx = source.indexOf('input.diagnose');
      expect(jwtIdx).toBeGreaterThan(-1);
      expect(diagIdx).toBeGreaterThan(jwtIdx);
    });

    it('role permission check comes before diagnose check', () => {
      const roleIdx = source.indexOf("'auth/insufficient-permission'");
      const diagIdx = source.indexOf('input.diagnose');
      expect(roleIdx).toBeGreaterThan(-1);
      expect(diagIdx).toBeGreaterThan(roleIdx);
    });
  });

  // --- Interface includes diagnose field ---

  describe('Interface includes diagnose field', () => {
    it('CreateInvitationInput interface has diagnose?: boolean', () => {
      expect(source).toContain('diagnose?: boolean');
    });
  });

  // --- Backward compatibility ---

  describe('Backward compatibility: existing error messages preserved', () => {
    it('keeps "Missing authorization header" message', () => {
      expect(source).toContain("error: 'Missing authorization header'");
    });

    it('keeps "Invalid or expired token" message', () => {
      expect(source).toContain("error: 'Invalid or expired token'");
    });

    it('keeps "User missing ward or role metadata" message', () => {
      expect(source).toContain("error: 'User missing ward or role metadata'");
    });

    it('keeps "Insufficient permissions" message', () => {
      expect(source).toContain("error: 'Insufficient permissions'");
    });

    it('keeps "Missing required fields: email and role" message', () => {
      expect(source).toContain("error: 'Missing required fields: email and role'");
    });

    it('keeps "Invalid role" message', () => {
      expect(source).toContain("error: 'Invalid role. Must be bishopric, secretary, or observer.'");
    });

    it('keeps "Invalid email format" message', () => {
      expect(source).toContain("error: 'Invalid email format'");
    });

    it('keeps "Failed to create invitation" message', () => {
      expect(source).toContain("error: 'Failed to create invitation'");
    });
  });
});

// ============================================================================
// F144: reset-redirect 302 redirect (CR-204)
// ============================================================================

describe('F144 (CR-204): reset-redirect returns 302 redirect', () => {
  const source = readEdgeFunction('reset-redirect');

  // --- AC-144-01: 302 redirect to external page ---

  describe('AC-144-01: 302 redirect to external reset-password.html', () => {
    it('returns status 302', () => {
      expect(source).toContain('status: 302');
    });

    it('sets Location header with external page URL', () => {
      expect(source).toContain("'Location': redirectUrl");
    });

    it('redirectUrl points to reset-password.html with token and type params', () => {
      expect(source).toContain('reset-password.html?token=${token}&type=${type}');
    });

    it('response body is null (redirect, no content)', () => {
      expect(source).toContain('new Response(null,');
    });

    it('no inline HTML template in file', () => {
      expect(source).not.toContain('<!DOCTYPE html>');
      expect(source).not.toContain('<form');
      expect(source).not.toContain('verifyOtp');
      expect(source).not.toContain('updateUser');
    });

    it('file is under 80 lines total', () => {
      const lineCount = source.split('\n').length;
      expect(lineCount).toBeLessThan(80);
    });
  });

  // --- AC-144-10: 400 for missing token or type ---

  describe('AC-144-10: 400 for missing token or type params', () => {
    it('checks for both token AND type', () => {
      expect(source).toContain('!token || !type');
    });

    it('returns 400 with error message for missing params', () => {
      expect(source).toContain("'Missing required parameters: token and type'");
      expect(source).toContain('status: 400');
    });
  });

  // --- AC-144-12: Token format validation ---

  describe('AC-144-12: Token format validation before redirect', () => {
    it('validates token with alphanumeric regex', () => {
      expect(source).toMatch(/\/\^[^/]*\[a-zA-Z0-9_-\][^/]*\$\/\.test\(token\)/);
    });

    it('returns 400 for invalid token format', () => {
      expect(source).toContain("'Invalid token format'");
    });

    it('validates type against allowed values', () => {
      expect(source).toContain("ALLOWED_TYPES");
      expect(source).toContain("'recovery'");
    });

    it('returns 400 for invalid type', () => {
      expect(source).toContain("'Invalid type format'");
    });
  });

  // --- AC-144-13: CORS headers ---

  describe('AC-144-13: CORS headers on all responses', () => {
    it('defines corsHeaders with Access-Control-Allow-Origin: *', () => {
      expect(source).toContain("'Access-Control-Allow-Origin': '*'");
    });

    it('CORS headers on 302 redirect response', () => {
      expect(source).toContain('...corsHeaders');
    });

    it('OPTIONS returns ok with CORS headers', () => {
      expect(source).toContain("req.method === 'OPTIONS'");
      expect(source).toContain("new Response('ok', { headers: corsHeaders })");
    });
  });

  // --- AC-144-14: EXTERNAL_PAGES_URL configurable ---

  describe('AC-144-14: EXTERNAL_PAGES_URL env var with fallback', () => {
    it('reads EXTERNAL_PAGES_URL from Deno.env', () => {
      expect(source).toContain("Deno.env.get('EXTERNAL_PAGES_URL')");
    });

    it('falls back to GitHub Pages URL', () => {
      expect(source).toContain('https://aloisiojr.github.io/sacrament-meeting-planner');
    });

    it('logs warning when EXTERNAL_PAGES_URL not set', () => {
      expect(source).toContain("[reset-redirect] EXTERNAL_PAGES_URL not set, using default");
    });

    it('logs redirect action', () => {
      expect(source).toContain("[reset-redirect] Redirecting to external page");
    });
  });
});

// ============================================================================
// F144: invite-redirect 302 redirect (CR-204)
// ============================================================================

describe('F144 (CR-204): invite-redirect returns 302 redirect', () => {
  const source = readEdgeFunction('invite-redirect');

  // --- AC-144-02: 302 redirect to external page ---

  describe('AC-144-02: 302 redirect to external accept-invite.html', () => {
    it('returns status 302', () => {
      expect(source).toContain('status: 302');
    });

    it('sets Location header with external page URL', () => {
      expect(source).toContain("'Location': redirectUrl");
    });

    it('redirectUrl points to accept-invite.html with token param', () => {
      expect(source).toContain('accept-invite.html?token=${token}');
    });

    it('response body is null (redirect, no content)', () => {
      expect(source).toContain('new Response(null,');
    });

    it('no inline HTML template in file', () => {
      expect(source).not.toContain('<!DOCTYPE html>');
      expect(source).not.toContain('<form');
      expect(source).not.toContain('register-invited-user');
    });

    it('file is under 65 lines total', () => {
      const lineCount = source.split('\n').length;
      expect(lineCount).toBeLessThanOrEqual(60);
    });
  });

  // --- AC-144-11: 400 for missing token ---

  describe('AC-144-11: 400 for missing token param', () => {
    it('checks for token', () => {
      expect(source).toContain('!token');
    });

    it('returns 400 with error message', () => {
      expect(source).toContain("'Missing required parameter: token'");
      expect(source).toContain('status: 400');
    });
  });

  // --- AC-144-12: Token format validation ---

  describe('AC-144-12: Token format validation before redirect', () => {
    it('validates token as UUID format', () => {
      expect(source).toContain('[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}');
    });

    it('returns 400 for invalid token format', () => {
      expect(source).toContain("'Invalid token format'");
    });
  });

  // --- AC-144-13: CORS headers ---

  describe('AC-144-13: CORS headers on all responses', () => {
    it('defines corsHeaders with Access-Control-Allow-Origin: *', () => {
      expect(source).toContain("'Access-Control-Allow-Origin': '*'");
    });

    it('CORS headers on 302 redirect response', () => {
      expect(source).toContain('...corsHeaders');
    });

    it('OPTIONS returns ok with CORS headers', () => {
      expect(source).toContain("req.method === 'OPTIONS'");
      expect(source).toContain("new Response('ok', { headers: corsHeaders })");
    });
  });

  // --- AC-144-14: EXTERNAL_PAGES_URL configurable ---

  describe('AC-144-14: EXTERNAL_PAGES_URL env var with fallback', () => {
    it('reads EXTERNAL_PAGES_URL from Deno.env', () => {
      expect(source).toContain("Deno.env.get('EXTERNAL_PAGES_URL')");
    });

    it('falls back to GitHub Pages URL', () => {
      expect(source).toContain('https://aloisiojr.github.io/sacrament-meeting-planner');
    });

    it('logs warning when EXTERNAL_PAGES_URL not set', () => {
      expect(source).toContain("[invite-redirect] EXTERNAL_PAGES_URL not set, using default");
    });

    it('logs redirect action', () => {
      expect(source).toContain("[invite-redirect] Redirecting to external page");
    });
  });
});

// ============================================================================
// F144: External reset-password.html page (CR-204)
// ============================================================================

describe('F144 (CR-204): External reset-password.html page', () => {
  const source = readExternalPage('reset-password.html');

  // --- AC-144-03: Page renders as HTML with correct structure ---

  describe('AC-144-03: Page structure and rendering', () => {
    it('has DOCTYPE html declaration', () => {
      expect(source).toContain('<!DOCTYPE html>');
    });

    it('has lang="pt-BR" on html tag', () => {
      expect(source).toContain('lang="pt-BR"');
    });

    it('has page title', () => {
      expect(source).toContain('<title>Planejador de Reuniao Sacramental</title>');
    });

    it('has password form with two password fields', () => {
      expect(source).toContain('id="reset-form"');
      expect(source).toContain('id="password"');
      expect(source).toContain('id="confirm-password"');
    });

    it('has loading spinner', () => {
      expect(source).toContain('id="loading"');
      expect(source).toContain('class="spinner"');
    });

    it('has error container', () => {
      expect(source).toContain('id="error-container"');
      expect(source).toContain('id="error-msg"');
    });

    it('has success container', () => {
      expect(source).toContain('id="success-container"');
      expect(source).toContain('id="success-msg"');
    });
  });

  // --- AC-144-05: Token read from URLSearchParams ---

  describe('AC-144-05: Token and type read from URLSearchParams', () => {
    it('reads token from URLSearchParams', () => {
      expect(source).toContain('new URLSearchParams(window.location.search)');
      expect(source).toContain("params.get('token')");
    });

    it('reads type from URLSearchParams', () => {
      expect(source).toContain("params.get('type')");
    });

    it('does NOT use server-side template interpolation', () => {
      expect(source).not.toContain("'${token}'");
      expect(source).not.toContain("'${type}'");
      expect(source).not.toContain("'${supabaseUrl}'");
      expect(source).not.toContain("'${supabaseAnonKey}'");
    });

    it('shows error for missing params', () => {
      expect(source).toContain('!tokenHash || !tokenType');
      expect(source).toContain('errorMissingParams');
    });
  });

  // --- AC-144-06: Supabase constants ---

  describe('AC-144-06: Supabase URL and anon key as constants', () => {
    it('has hardcoded SUPABASE_URL', () => {
      expect(source).toContain("var SUPABASE_URL = 'https://poizgglzdjqwrhsnhkke.supabase.co'");
    });

    it('has hardcoded SUPABASE_ANON_KEY', () => {
      expect(source).toContain('var SUPABASE_ANON_KEY =');
      // Verify it is a JWT (starts with eyJ)
      expect(source).toMatch(/SUPABASE_ANON_KEY\s*=\s*'eyJ/);
    });

    it('creates Supabase client with constants', () => {
      expect(source).toContain('window.supabase.createClient');
      expect(source).toContain('SUPABASE_URL');
      expect(source).toContain('SUPABASE_ANON_KEY');
    });
  });

  // --- AC-144-07: i18n support ---

  describe('AC-144-07: i18n support (pt-BR, en, es)', () => {
    it('uses navigator.language for detection', () => {
      expect(source).toContain('navigator.language');
    });

    it('has pt-BR translations', () => {
      expect(source).toContain("subtitle: 'Redefinir Senha'");
      expect(source).toContain('Senha atualizada com sucesso');
    });

    it('has English translations', () => {
      expect(source).toContain("subtitle: 'Reset Password'");
      expect(source).toContain('Password updated successfully');
    });

    it('has Spanish translations', () => {
      expect(source).toContain("subtitle: 'Restablecer contrasena'");
      expect(source).toContain('Contrasena actualizada con exito');
    });

    it('has missing params error in all languages', () => {
      expect(source).toContain('Invalid link. Missing required parameters.');
      expect(source).toContain('Enlace invalido. Faltan parametros requeridos.');
      expect(source).toContain('Link invalido. Parametros obrigatorios ausentes.');
    });
  });

  // --- verifyOtp + updateUser flow ---

  describe('verifyOtp + updateUser flow', () => {
    it('calls verifyOtp with token_hash from URL params', () => {
      expect(source).toContain('verifyOtp');
      expect(source).toContain('token_hash: tokenHash');
    });

    it('calls updateUser with password on form submit', () => {
      expect(source).toContain('updateUser');
      expect(source).toContain('updateUser({ password: password })');
    });

    it('validates password >= 6 chars', () => {
      expect(source).toContain('password.length < 6');
    });

    it('validates passwords match', () => {
      expect(source).toContain('password !== confirmPassword');
    });
  });

  // --- CDN loading ---

  describe('CDN loading with onerror handler', () => {
    it('loads Supabase JS from CDN', () => {
      expect(source).toContain('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
    });

    it('has onerror handler on CDN script', () => {
      expect(source).toContain('onerror="handleCdnError()"');
    });

    it('checks window.supabase before use', () => {
      expect(source).toContain("typeof window.supabase === 'undefined'");
    });
  });

  // --- Styling ---

  describe('Styling matches original', () => {
    it('card max-width 400px', () => {
      expect(source).toContain('max-width: 400px');
    });

    it('primary color #4F46E5', () => {
      expect(source).toContain('#4F46E5');
    });

    it('background #f5f5f5', () => {
      expect(source).toContain('background-color: #f5f5f5');
    });
  });
});

// ============================================================================
// F144: External accept-invite.html page (CR-204)
// ============================================================================

describe('F144 (CR-204): External accept-invite.html page', () => {
  const source = readExternalPage('accept-invite.html');

  // --- AC-144-04: Page renders as HTML with correct structure ---

  describe('AC-144-04: Page structure and rendering', () => {
    it('has DOCTYPE html declaration', () => {
      expect(source).toContain('<!DOCTYPE html>');
    });

    it('has lang="pt-BR" on html tag', () => {
      expect(source).toContain('lang="pt-BR"');
    });

    it('has page title', () => {
      expect(source).toContain('<title>Planejador de Reuniao Sacramental</title>');
    });

    it('has invite form with required fields', () => {
      expect(source).toContain('id="invite-form"');
      expect(source).toContain('id="fullname"');
      expect(source).toContain('id="password"');
      expect(source).toContain('id="confirm-password"');
    });

    it('has read-only fields for stake, ward, role, email', () => {
      expect(source).toContain('id="stake"');
      expect(source).toContain('id="ward"');
      expect(source).toContain('id="role"');
      expect(source).toContain('id="email"');
    });

    it('read-only fields are disabled', () => {
      expect(source).toMatch(/id="stake"[^>]*disabled/);
      expect(source).toMatch(/id="ward"[^>]*disabled/);
      expect(source).toMatch(/id="role"[^>]*disabled/);
      expect(source).toMatch(/id="email"[^>]*disabled/);
    });

    it('has loading spinner', () => {
      expect(source).toContain('id="loading"');
      expect(source).toContain('class="spinner"');
    });
  });

  // --- AC-144-05: Token read from URLSearchParams ---

  describe('AC-144-05: Token read from URLSearchParams', () => {
    it('reads token from URLSearchParams', () => {
      expect(source).toContain('new URLSearchParams(window.location.search)');
      expect(source).toContain("params.get('token')");
    });

    it('does NOT use server-side template interpolation', () => {
      expect(source).not.toContain("'${token}'");
      expect(source).not.toContain("'${supabaseUrl}'");
      expect(source).not.toContain("'${supabaseAnonKey}'");
    });

    it('shows error for missing token', () => {
      expect(source).toContain('!inviteToken');
      expect(source).toContain('errorMissingToken');
    });
  });

  // --- AC-144-06: Supabase constants ---

  describe('AC-144-06: Supabase URL and anon key as constants', () => {
    it('has hardcoded SUPABASE_URL', () => {
      expect(source).toContain("var SUPABASE_URL = 'https://poizgglzdjqwrhsnhkke.supabase.co'");
    });

    it('has hardcoded SUPABASE_ANON_KEY', () => {
      expect(source).toContain('var SUPABASE_ANON_KEY =');
      expect(source).toMatch(/SUPABASE_ANON_KEY\s*=\s*'eyJ/);
    });

    it('constructs apiBase from SUPABASE_URL', () => {
      expect(source).toContain("var apiBase = SUPABASE_URL + '/functions/v1'");
    });
  });

  // --- AC-144-07: i18n support ---

  describe('AC-144-07: i18n support (pt-BR, en, es)', () => {
    it('uses navigator.language for detection', () => {
      expect(source).toContain('navigator.language');
    });

    it('has pt-BR translations', () => {
      expect(source).toContain("subtitle: 'Aceitar Convite'");
      expect(source).toContain('Conta criada com sucesso');
    });

    it('has English translations', () => {
      expect(source).toContain("subtitle: 'Accept Invitation'");
      expect(source).toContain('Account created successfully');
    });

    it('has Spanish translations', () => {
      expect(source).toContain("subtitle: 'Aceptar invitacion'");
      expect(source).toContain('Cuenta creada con exito');
    });

    it('has missing token error in all languages', () => {
      expect(source).toContain('Invalid link. Missing invitation token.');
      expect(source).toContain('Enlace invalido. Falta el token de invitacion.');
      expect(source).toContain('Link invalido. Token de convite ausente.');
    });
  });

  // --- Role labels ---

  describe('Role labels translated in all languages', () => {
    it('translates bishopric in pt-BR (Bispado)', () => {
      expect(source).toContain("bishopric: 'Bispado'");
    });

    it('translates bishopric in en (Bishopric)', () => {
      expect(source).toContain("bishopric: 'Bishopric'");
    });

    it('translates bishopric in es (Obispado)', () => {
      expect(source).toContain("bishopric: 'Obispado'");
    });

    it('translates secretary in all languages', () => {
      expect(source).toContain("secretary: 'Secretario'");
      expect(source).toContain("secretary: 'Secretary'");
    });

    it('translates observer in all languages', () => {
      expect(source).toContain("observer: 'Observador'");
      expect(source).toContain("observer: 'Observer'");
    });

    it('has translateRole function with fallback', () => {
      expect(source).toContain('roleLabels[role] || role');
    });
  });

  // --- Token validation + registration fetch flow ---

  describe('Token validation + registration fetch flow', () => {
    it('fetches register-invited-user with token on load', () => {
      expect(source).toContain('register-invited-user');
      expect(source).toContain("JSON.stringify({ token: inviteToken })");
    });

    it('sends apikey header with fetch', () => {
      expect(source).toContain("'apikey': apiKey");
    });

    it('populates read-only fields from response', () => {
      expect(source).toContain('inv.stakeName');
      expect(source).toContain('inv.wardName');
      expect(source).toContain('inv.role');
      expect(source).toContain('inv.email');
    });

    it('sends token, password, fullName on form submit', () => {
      expect(source).toContain('token: inviteToken, password: password, fullName: fullName');
    });

    it('checks for status 201 on registration success', () => {
      expect(source).toContain('regResponse.status === 201');
    });
  });

  // --- Error mapping ---

  describe('Error mapping (token_invalid, token_used, token_expired)', () => {
    it('maps token_invalid error code', () => {
      expect(source).toContain("errorCode === 'token_invalid'");
    });

    it('maps token_used error code', () => {
      expect(source).toContain("errorCode === 'token_used'");
    });

    it('maps token_expired error code', () => {
      expect(source).toContain("errorCode === 'token_expired'");
    });

    it('maps Failed to create user error', () => {
      expect(source).toContain("errorCode === 'Failed to create user'");
    });

    it('has generic fallback', () => {
      expect(source).toContain('return t.errorGeneric');
    });
  });

  // --- Client-side validation ---

  describe('Client-side validation', () => {
    it('validates fullName is not empty', () => {
      expect(source).toContain('!fullName');
    });

    it('validates password >= 6 chars', () => {
      expect(source).toContain('password.length < 6');
    });

    it('validates passwords match', () => {
      expect(source).toContain('password !== confirmPassword');
    });

    it('trims fullName', () => {
      expect(source).toContain('.value.trim()');
    });
  });

  // --- Styling ---

  describe('Styling matches reset-password.html', () => {
    it('card max-width 400px', () => {
      expect(source).toContain('max-width: 400px');
    });

    it('primary color #4F46E5', () => {
      expect(source).toContain('#4F46E5');
    });

    it('background #f5f5f5', () => {
      expect(source).toContain('background-color: #f5f5f5');
    });

    it('disabled input styling', () => {
      expect(source).toContain('input:disabled');
      expect(source).toContain('background-color: #f3f4f6');
    });
  });

  // --- Does NOT use Supabase JS CDN ---

  describe('Uses fetch instead of Supabase JS CDN', () => {
    it('does not load Supabase JS from CDN', () => {
      expect(source).not.toContain('cdn.jsdelivr.net/npm/@supabase/supabase-js');
    });

    it('uses fetch for API calls', () => {
      expect(source).toContain('fetch(apiBase');
    });
  });
});
