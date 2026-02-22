/**
 * Batch 22: Tests for F138, F139.
 * CR-202 (F138): Password reset web page (reset-redirect rewrite)
 * CR-203 (F139): Invitation acceptance web page (invite-redirect + create-invitation update)
 *
 * NOTE: F144 (CR-204, Phase 2) moved the inline HTML from reset-redirect and
 * invite-redirect Edge Functions to external pages (docs/public/). The Edge
 * Functions now return 302 redirects. Tests updated accordingly:
 * - EF structure tests verify 302 redirect behavior
 * - HTML content tests verify the external page files
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// --- Helpers ---

const resolve = (...parts: string[]) => path.resolve(__dirname, '..', ...parts);

function readSourceFile(relativePath: string): string {
  return fs.readFileSync(resolve(relativePath), 'utf-8');
}

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
// F138: Password Reset Web Page (CR-202)
// NOTE: F144 moved HTML to docs/public/reset-password.html.
// EF now returns 302 redirect. HTML tests point to external page.
// ============================================================================

describe('F138 (CR-202): Password reset web page (reset-redirect rewrite)', () => {
  const source = readEdgeFunction('reset-redirect');
  const externalPage = readExternalPage('reset-password.html');

  // --- AC-138-01: HTML page with form, no deep link redirect ---

  describe('AC-138-01: HTML page with password reset form (no deep link)', () => {
    it('external page serves HTML with password input fields', () => {
      expect(externalPage).toContain('type="password"');
      expect(externalPage).toContain('id="password"');
      expect(externalPage).toContain('id="confirm-password"');
    });

    it('does NOT contain meta refresh redirect', () => {
      expect(externalPage).not.toContain('http-equiv="refresh"');
    });

    it('does NOT contain deep link text "Redirecionando para o aplicativo"', () => {
      expect(externalPage).not.toContain('Redirecionando para o aplicativo');
    });

    it('does NOT contain sacrmeetplan:// deep link scheme', () => {
      expect(externalPage).not.toContain('sacrmeetplan://');
    });
  });

  // --- AC-138-02: verifyOtp called on load ---

  describe('AC-138-02: verifyOtp called with token_hash and type', () => {
    it('external page calls supabase.auth.verifyOtp with token_hash', () => {
      expect(externalPage).toContain('verifyOtp');
      expect(externalPage).toContain('token_hash');
    });

    it('passes type parameter to verifyOtp', () => {
      expect(externalPage).toMatch(/verifyOtp\(\{[\s\S]*?type:/);
    });
  });

  // --- AC-138-03: Client-side validation ---

  describe('AC-138-03: Client-side validation (password >= 6, match)', () => {
    it('checks password.length < 6', () => {
      expect(externalPage).toContain('password.length < 6');
    });

    it('checks password !== confirmPassword', () => {
      expect(externalPage).toContain('password !== confirmPassword');
    });

    it('shows error for short password in pt-BR', () => {
      expect(externalPage).toContain('A senha deve ter pelo menos 6 caracteres');
    });

    it('shows error for short password in en', () => {
      expect(externalPage).toContain('Password must be at least 6 characters');
    });

    it('shows error for short password in es', () => {
      expect(externalPage).toContain('La contrasena debe tener al menos 6 caracteres');
    });

    it('shows error for non-matching passwords in pt-BR', () => {
      expect(externalPage).toContain('As senhas nao coincidem');
    });

    it('shows error for non-matching passwords in en', () => {
      expect(externalPage).toContain('Passwords do not match');
    });

    it('shows error for non-matching passwords in es', () => {
      expect(externalPage).toContain('Las contrasenas no coinciden');
    });
  });

  // --- AC-138-04: updateUser called on submit ---

  describe('AC-138-04: updateUser called on form submit', () => {
    it('external page calls supabase.auth.updateUser with password', () => {
      expect(externalPage).toContain('updateUser');
      expect(externalPage).toMatch(/updateUser\(\{.*password/);
    });
  });

  // --- AC-138-05: i18n with navigator.language ---

  describe('AC-138-05: i18n with navigator.language detection', () => {
    it('uses navigator.language for detection', () => {
      expect(externalPage).toContain('navigator.language');
    });

    it('detects English with startsWith("en")', () => {
      expect(externalPage).toContain("lang.startsWith('en')");
    });

    it('detects Spanish with startsWith("es")', () => {
      expect(externalPage).toContain("lang.startsWith('es')");
    });

    it('defaults to pt-BR', () => {
      expect(externalPage).toContain('Redefinir Senha');
    });
  });

  // --- AC-138-06: Supabase JS CDN script tag ---

  describe('AC-138-06: Supabase JS loaded from CDN', () => {
    it('external page has script tag with CDN URL', () => {
      expect(externalPage).toContain('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
    });

    it('external page creates Supabase client with constants', () => {
      expect(externalPage).toContain('window.supabase.createClient');
    });
  });

  // --- AC-138-07: send-reset-email NOT modified ---

  describe('AC-138-07: send-reset-email is NOT modified', () => {
    it('send-reset-email file exists and is unchanged (contains deep link email template)', () => {
      const sendResetSource = readEdgeFunction('send-reset-email');
      expect(sendResetSource).toContain('send-reset-email');
      expect(sendResetSource).toContain('getEmailTemplate');
    });
  });

  // --- AC-138-08: 400 for missing params ---

  describe('AC-138-08: 400 for missing token or type params', () => {
    it('EF returns 400 with error message for missing params', () => {
      expect(source).toContain("'Missing required parameters: token and type'");
      expect(source).toContain('status: 400');
    });
  });

  // --- XSS prevention: input format validation (R-1 fix) ---

  describe('R-1 fix: token and type validated before redirect', () => {
    it('validates token with alphanumeric regex', () => {
      expect(source).toMatch(/\/\^[^/]*\[a-zA-Z0-9_-\][^/]*\$\/\.test\(token\)/);
    });

    it('validates type against allowed values whitelist', () => {
      expect(source).toContain("ALLOWED_TYPES");
      expect(source).toContain("'recovery'");
    });

    it('returns 400 for invalid token format', () => {
      expect(source).toContain("'Invalid token format'");
    });

    it('returns 400 for invalid type format', () => {
      expect(source).toContain("'Invalid type format'");
    });
  });

  // --- AC-138-09: Success message ---

  describe('AC-138-09: Success message text', () => {
    it('shows pt-BR success message', () => {
      expect(externalPage).toContain('Senha atualizada com sucesso');
    });

    it('shows en success message', () => {
      expect(externalPage).toContain('Password updated successfully');
    });

    it('shows es success message', () => {
      expect(externalPage).toContain('Contrasena actualizada con exito');
    });
  });

  // --- AC-138-10: Loading spinner ---

  describe('AC-138-10: Loading spinner during verifyOtp', () => {
    it('external page has loading div with spinner', () => {
      expect(externalPage).toContain('id="loading"');
      expect(externalPage).toContain('class="spinner"');
    });

    it('has loading text', () => {
      expect(externalPage).toContain('id="loading-text"');
    });
  });

  // --- AC-138-11: CORS headers ---

  describe('AC-138-11: CORS headers maintained', () => {
    it('defines corsHeaders with Access-Control-Allow-Origin', () => {
      expect(source).toContain("'Access-Control-Allow-Origin': '*'");
    });

    it('defines corsHeaders with Access-Control-Allow-Headers', () => {
      expect(source).toContain('Access-Control-Allow-Headers');
      expect(source).toContain('authorization, x-client-info, apikey, content-type');
    });

    it('OPTIONS returns ok with CORS headers', () => {
      expect(source).toContain("req.method === 'OPTIONS'");
      expect(source).toContain("new Response('ok', { headers: corsHeaders })");
    });
  });

  // --- AC-138-12: F144 changed response to 302 redirect ---

  describe('AC-138-12: EF returns 302 redirect (F144 update)', () => {
    it('EF returns status 302 instead of 200', () => {
      expect(source).toContain('status: 302');
      expect(source).not.toContain('status: 200');
    });

    it('EF includes Location header for redirect', () => {
      expect(source).toContain("'Location': redirectUrl");
    });
  });

  // --- EC-138-01/02: Token expired/used (verifyOtp error) ---

  describe('EC-138-01/02: Token expired or already used shows error', () => {
    it('external page shows pt-BR error for expired/used token', () => {
      expect(externalPage).toContain('Link expirado ou invalido. Solicite um novo link de redefinicao de senha.');
    });

    it('external page shows en error for expired/used token', () => {
      expect(externalPage).toContain('Link expired or invalid. Please request a new password reset link.');
    });

    it('external page shows es error for expired/used token', () => {
      expect(externalPage).toContain('Enlace expirado o invalido. Solicite un nuevo enlace de restablecimiento.');
    });

    it('calls showError with errorExpired when verifyOtp fails', () => {
      expect(externalPage).toContain('showError(t.errorExpired)');
    });
  });

  // --- EC-138-03: CDN failure ---

  describe('EC-138-03: CDN failure handling', () => {
    it('external page has onerror handler on script tag', () => {
      expect(externalPage).toContain('onerror="handleCdnError()"');
    });

    it('checks window.supabase existence before use', () => {
      expect(externalPage).toContain("typeof window.supabase === 'undefined'");
    });

    it('shows pt-BR CDN error message', () => {
      expect(externalPage).toContain('Erro ao carregar a pagina. Tente novamente.');
    });

    it('shows en CDN error message', () => {
      expect(externalPage).toContain('Failed to load page. Please try again.');
    });

    it('shows es CDN error message', () => {
      expect(externalPage).toContain('Error al cargar la pagina. Intentelo de nuevo.');
    });
  });

  // --- EC-138-04: Short password validation ---

  describe('EC-138-04: Short password validation message', () => {
    it('prevents updateUser when password is short', () => {
      const submitIdx = externalPage.indexOf("addEventListener('submit'");
      const lengthCheckIdx = externalPage.indexOf('password.length < 6', submitIdx);
      const updateUserIdx = externalPage.indexOf('updateUser', lengthCheckIdx);
      expect(lengthCheckIdx).toBeGreaterThan(submitIdx);
      expect(updateUserIdx).toBeGreaterThan(lengthCheckIdx);
    });
  });

  // --- EC-138-05: Non-matching password validation ---

  describe('EC-138-05: Non-matching password validation message', () => {
    it('prevents updateUser when passwords do not match', () => {
      const submitIdx = externalPage.indexOf("addEventListener('submit'");
      const mismatchIdx = externalPage.indexOf('password !== confirmPassword', submitIdx);
      const updateUserIdx = externalPage.indexOf('updateUser', mismatchIdx);
      expect(mismatchIdx).toBeGreaterThan(submitIdx);
      expect(updateUserIdx).toBeGreaterThan(mismatchIdx);
    });
  });
});

// ============================================================================
// F139: Invitation Acceptance Web Page (CR-203)
// NOTE: F144 moved HTML to docs/public/accept-invite.html.
// EF now returns 302 redirect. HTML tests point to external page.
// ============================================================================

describe('F139 (CR-203): Invitation acceptance web page', () => {
  const inviteSource = readEdgeFunction('invite-redirect');
  const createInvSource = readEdgeFunction('create-invitation');
  const externalPage = readExternalPage('accept-invite.html');

  // --- AC-139-01: HTML page with invitation form ---

  describe('AC-139-01: External page serves HTML with invitation acceptance form', () => {
    it('external page exists and contains HTML form', () => {
      expect(externalPage).toContain('<!DOCTYPE html>');
      expect(externalPage).toContain('<form');
      expect(externalPage).toContain('id="invite-form"');
    });

    it('EF returns 302 redirect to external page', () => {
      expect(inviteSource).toContain('status: 302');
      expect(inviteSource).toContain("'Location': redirectUrl");
    });
  });

  // --- AC-139-02: Token validation via fetch on load ---

  describe('AC-139-02: fetch to register-invited-user (validate-only) on load', () => {
    it('external page fetches register-invited-user with token', () => {
      expect(externalPage).toContain('register-invited-user');
      expect(externalPage).toContain("JSON.stringify({ token: inviteToken })");
    });

    it('sends apikey header with fetch', () => {
      expect(externalPage).toContain("'apikey': apiKey");
    });
  });

  // --- AC-139-03: Read-only fields ---

  describe('AC-139-03: Read-only fields display invitation data', () => {
    it('has disabled stake input', () => {
      expect(externalPage).toContain('id="stake"');
      expect(externalPage).toMatch(/id="stake"[^>]*disabled/);
    });

    it('has disabled ward input', () => {
      expect(externalPage).toContain('id="ward"');
      expect(externalPage).toMatch(/id="ward"[^>]*disabled/);
    });

    it('has disabled role input', () => {
      expect(externalPage).toContain('id="role"');
      expect(externalPage).toMatch(/id="role"[^>]*disabled/);
    });

    it('has disabled email input', () => {
      expect(externalPage).toContain('id="email"');
      expect(externalPage).toMatch(/id="email"[^>]*disabled/);
    });

    it('populates fields from invitation response data', () => {
      expect(externalPage).toContain('inv.stakeName');
      expect(externalPage).toContain('inv.wardName');
      expect(externalPage).toContain('inv.role');
      expect(externalPage).toContain('inv.email');
    });
  });

  // --- AC-139-04: Client-side validation ---

  describe('AC-139-04: Client-side validation (fullName, password, match)', () => {
    it('validates fullName is not empty', () => {
      expect(externalPage).toContain('!fullName');
    });

    it('validates password >= 6 characters', () => {
      expect(externalPage).toContain('password.length < 6');
    });

    it('validates passwords match', () => {
      expect(externalPage).toContain('password !== confirmPassword');
    });

    it('shows pt-BR error for empty name', () => {
      expect(externalPage).toContain('Nome completo e obrigatorio');
    });

    it('shows en error for empty name', () => {
      expect(externalPage).toContain('Full name is required');
    });

    it('shows es error for empty name', () => {
      expect(externalPage).toContain('El nombre completo es obligatorio');
    });
  });

  // --- AC-139-05: fetch register-invited-user on submit ---

  describe('AC-139-05: fetch register-invited-user with token, password, fullName on submit', () => {
    it('sends token, password, and fullName in fetch body', () => {
      expect(externalPage).toContain('token: inviteToken, password: password, fullName: fullName');
    });

    it('checks for status 201 on success', () => {
      expect(externalPage).toContain('regResponse.status === 201');
    });
  });

  // --- AC-139-06: create-invitation generates HTTPS URL ---

  describe('AC-139-06: create-invitation generates HTTPS URL instead of deep link', () => {
    it('deepLink uses HTTPS URL with invite-redirect path', () => {
      expect(createInvSource).toContain('invite-redirect?token=');
    });

    it('deepLink uses SUPABASE_URL env var', () => {
      expect(createInvSource).toContain("Deno.env.get('SUPABASE_URL')");
      expect(createInvSource).toContain('/functions/v1/invite-redirect');
    });

    it('does NOT contain sacrmeetplan:// deep link', () => {
      expect(createInvSource).not.toContain('sacrmeetplan://');
    });
  });

  // --- AC-139-07: i18n with navigator.language ---

  describe('AC-139-07: i18n with navigator.language detection', () => {
    it('uses navigator.language for detection', () => {
      expect(externalPage).toContain('navigator.language');
    });

    it('detects English with startsWith("en")', () => {
      expect(externalPage).toContain("lang.startsWith('en')");
    });

    it('detects Spanish with startsWith("es")', () => {
      expect(externalPage).toContain("lang.startsWith('es')");
    });

    it('defaults to pt-BR', () => {
      expect(externalPage).toContain('Aceitar Convite');
    });
  });

  // --- AC-139-08: 400 for missing token ---

  describe('AC-139-08: 400 for missing token param', () => {
    it('EF returns 400 with error message', () => {
      expect(inviteSource).toContain("'Missing required parameter: token'");
      expect(inviteSource).toContain('status: 400');
    });
  });

  // --- XSS prevention: token format validation (R-2 fix) ---

  describe('R-2 fix: token validated as UUID before redirect', () => {
    it('validates token matches UUID format', () => {
      expect(inviteSource).toContain('[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}');
    });

    it('returns 400 for invalid token format', () => {
      expect(inviteSource).toContain("'Invalid token format'");
    });
  });

  // --- AC-139-09: Success message ---

  describe('AC-139-09: Success message text', () => {
    it('shows pt-BR success message', () => {
      expect(externalPage).toContain('Conta criada com sucesso');
    });

    it('shows en success message', () => {
      expect(externalPage).toContain('Account created successfully');
    });

    it('shows es success message', () => {
      expect(externalPage).toContain('Cuenta creada con exito');
    });
  });

  // --- AC-139-10: Role translation ---

  describe('AC-139-10: Role displayed translated', () => {
    it('translates bishopric to pt-BR (Bispado)', () => {
      expect(externalPage).toContain("bishopric: 'Bispado'");
    });

    it('translates bishopric to en (Bishopric)', () => {
      expect(externalPage).toContain("bishopric: 'Bishopric'");
    });

    it('translates bishopric to es (Obispado)', () => {
      expect(externalPage).toContain("bishopric: 'Obispado'");
    });

    it('translates secretary to pt-BR (Secretario)', () => {
      expect(externalPage).toContain("secretary: 'Secretario'");
    });

    it('translates observer to pt-BR (Observador)', () => {
      expect(externalPage).toContain("observer: 'Observador'");
    });

    it('uses translateRole function', () => {
      expect(externalPage).toContain('translateRole');
      expect(externalPage).toContain('roleLabels');
    });
  });

  // --- AC-139-11: CORS headers ---

  describe('AC-139-11: CORS headers present', () => {
    it('defines corsHeaders with Access-Control-Allow-Origin', () => {
      expect(inviteSource).toContain("'Access-Control-Allow-Origin': '*'");
    });

    it('defines corsHeaders with Access-Control-Allow-Headers', () => {
      expect(inviteSource).toContain('Access-Control-Allow-Headers');
      expect(inviteSource).toContain('authorization, x-client-info, apikey, content-type');
    });

    it('OPTIONS returns ok with CORS headers', () => {
      expect(inviteSource).toContain("req.method === 'OPTIONS'");
      expect(inviteSource).toContain("new Response('ok', { headers: corsHeaders })");
    });
  });

  // --- AC-139-12: EF returns 302 redirect (F144 update) ---

  describe('AC-139-12: EF returns 302 redirect (F144 update)', () => {
    it('EF returns status 302 instead of 200', () => {
      expect(inviteSource).toContain('status: 302');
      expect(inviteSource).not.toContain('status: 200');
    });

    it('EF includes Location header for redirect', () => {
      expect(inviteSource).toContain("'Location': redirectUrl");
    });
  });

  // --- AC-139-13: register-invited-user NOT modified ---

  describe('AC-139-13: register-invited-user is NOT modified', () => {
    it('register-invited-user file exists with original validate-only mode', () => {
      const regSource = readEdgeFunction('register-invited-user');
      expect(regSource).toContain('body.token && !body.password');
      expect(regSource).toContain('handleValidateToken');
      expect(regSource).toContain('handleRegister');
    });
  });

  // --- EC-139-01: Token invalid ---

  describe('EC-139-01: Token invalid error message', () => {
    it('has pt-BR error for invalid token', () => {
      expect(externalPage).toContain('Convite invalido. Solicite um novo convite ao lider da ala.');
    });

    it('has en error for invalid token', () => {
      expect(externalPage).toContain('Invalid invitation. Please request a new invite from your ward leader.');
    });

    it('has es error for invalid token', () => {
      expect(externalPage).toContain('Invitacion invalida. Solicite una nueva invitacion a su lider de barrio.');
    });
  });

  // --- EC-139-02: Token used ---

  describe('EC-139-02: Token used error message', () => {
    it('has pt-BR error for used token', () => {
      expect(externalPage).toContain('Este convite ja foi utilizado.');
    });

    it('has en error for used token', () => {
      expect(externalPage).toContain('This invitation has already been used.');
    });

    it('has es error for used token', () => {
      expect(externalPage).toContain('Esta invitacion ya fue utilizada.');
    });
  });

  // --- EC-139-03: Token expired ---

  describe('EC-139-03: Token expired error message', () => {
    it('has pt-BR error for expired token', () => {
      expect(externalPage).toContain('Este convite expirou. Solicite um novo convite.');
    });

    it('has en error for expired token', () => {
      expect(externalPage).toContain('This invitation has expired. Please request a new invite.');
    });

    it('has es error for expired token', () => {
      expect(externalPage).toContain('Esta invitacion ha expirado. Solicite una nueva invitacion.');
    });
  });

  // --- EC-139-04: Empty fullName ---

  describe('EC-139-04: Empty fullName validation', () => {
    it('prevents submission when fullName is empty', () => {
      const submitIdx = externalPage.indexOf("addEventListener('submit'");
      const nameCheckIdx = externalPage.indexOf('!fullName', submitIdx);
      expect(nameCheckIdx).toBeGreaterThan(submitIdx);
    });
  });

  // --- EC-139-05: Short password ---

  describe('EC-139-05: Short password validation', () => {
    it('has pt-BR error for short password', () => {
      expect(externalPage).toContain('A senha deve ter pelo menos 6 caracteres');
    });

    it('has en error for short password', () => {
      expect(externalPage).toContain('Password must be at least 6 characters');
    });

    it('has es error for short password', () => {
      expect(externalPage).toContain('La contrasena debe tener al menos 6 caracteres');
    });
  });

  // --- EC-139-06: Non-matching passwords ---

  describe('EC-139-06: Non-matching passwords validation', () => {
    it('has pt-BR error for non-matching passwords', () => {
      expect(externalPage).toContain('As senhas nao coincidem');
    });

    it('has en error for non-matching passwords', () => {
      expect(externalPage).toContain('Passwords do not match');
    });

    it('has es error for non-matching passwords', () => {
      expect(externalPage).toContain('Las contrasenas no coinciden');
    });
  });

  // --- EC-139-07: Failed to create user ---

  describe('EC-139-07: Failed to create user error message', () => {
    it('handles Failed to create user error code', () => {
      expect(externalPage).toContain("'Failed to create user'");
    });

    it('has pt-BR error for create failed', () => {
      expect(externalPage).toContain('Nao foi possivel criar a conta. Este email pode ja estar registrado.');
    });

    it('has en error for create failed', () => {
      expect(externalPage).toContain('Could not create account. This email may already be registered.');
    });

    it('has es error for create failed', () => {
      expect(externalPage).toContain('No se pudo crear la cuenta. Este correo puede ya estar registrado.');
    });
  });
});
