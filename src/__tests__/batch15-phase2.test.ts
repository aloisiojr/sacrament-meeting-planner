/**
 * Tests for Batch 15, Phase 2: Multilingual password reset email via Edge Function,
 *                                Test suite 100% passing
 *
 * F101 (CR-155): Multilingual password reset email via Edge Function
 * F102 (CR-164): Test suite 100% passing
 *
 * Covers acceptance criteria:
 *   AC-101-01..12, AC-102-01..05
 * Covers edge cases:
 *   EC-101-01..06, EC-102-01
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function readSourceFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf-8');
}

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', '..', relativePath), 'utf-8');
}

// =============================================================================
// F101 (CR-155): Multilingual password reset email via Edge Function
// =============================================================================

describe('F101 (CR-155): Edge Function send-reset-email', () => {
  const getEdgeFunction = () =>
    readProjectFile('supabase/functions/send-reset-email/index.ts');

  // --- AC-101-01: Edge Function exists and handles POST ---
  describe('AC-101-01: Edge Function send-reset-email exists', () => {
    it('send-reset-email/index.ts file exists', () => {
      const filePath = path.resolve(
        __dirname,
        '..',
        '..',
        'supabase',
        'functions',
        'send-reset-email',
        'index.ts'
      );
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('uses Deno.serve handler', () => {
      const content = getEdgeFunction();
      expect(content).toContain('Deno.serve');
    });

    it('creates supabaseAdmin with SUPABASE_URL', () => {
      const content = getEdgeFunction();
      expect(content).toContain("Deno.env.get('SUPABASE_URL')");
    });

    it('creates supabaseAdmin with SUPABASE_SERVICE_ROLE_KEY', () => {
      const content = getEdgeFunction();
      expect(content).toContain("Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')");
    });

    it('does not verify JWT (unauthenticated endpoint)', () => {
      const content = getEdgeFunction();
      expect(content).not.toContain('getUser(token)');
      expect(content).not.toContain('Missing authorization header');
    });

    it('validates email from request body', () => {
      const content = getEdgeFunction();
      expect(content).toContain('email');
      expect(content).toMatch(/\^\[\^\\s@\]\+@\[\^\\s@\]\+\\\.\[\^\\s@\]\+\$/);
    });

    it('uses admin.listUsers for user lookup', () => {
      const content = getEdgeFunction();
      expect(content).toContain('admin.listUsers');
    });
  });

  // --- AC-101-09: Anti-enumeration ---
  describe('AC-101-09: Anti-enumeration', () => {
    it('returns success true for non-existent email', () => {
      const content = getEdgeFunction();
      // User not found should return { success: true }
      expect(content).toContain('success: true');
    });

    it('does not reveal user existence in response', () => {
      const content = getEdgeFunction();
      expect(content).not.toContain('User not found');
      expect(content).not.toContain('email not found');
    });
  });

  // --- AC-101-10: Ward language lookup ---
  describe('AC-101-10: Ward language lookup', () => {
    it('gets ward_id from app_metadata', () => {
      const content = getEdgeFunction();
      expect(content).toContain('app_metadata?.ward_id');
    });

    it('queries wards table for language', () => {
      const content = getEdgeFunction();
      expect(content).toContain("from('wards')");
      expect(content).toContain("select('language')");
    });

    it('falls back to pt-BR as default language', () => {
      const content = getEdgeFunction();
      expect(content).toContain("language = 'pt-BR'");
    });
  });

  // --- AC-101-01 continued: generateLink ---
  describe('AC-101-01: Recovery token generation', () => {
    it('calls admin.generateLink with type recovery', () => {
      const content = getEdgeFunction();
      expect(content).toContain('admin.generateLink');
      expect(content).toContain("type: 'recovery'");
    });

    it('extracts hashed_token from properties', () => {
      const content = getEdgeFunction();
      expect(content).toContain('hashed_token');
      expect(content).toContain('properties');
    });
  });

  // --- AC-101-05: Deep link format ---
  describe('AC-101-05: Deep link format', () => {
    it('builds sacrmeetman://reset-password deep link with token and type', () => {
      const content = getEdgeFunction();
      expect(content).toContain('sacrmeetman://reset-password?token=');
      expect(content).toContain('&type=recovery');
    });
  });

  // --- AC-101-02, AC-101-03, AC-101-04: Email templates in 3 languages ---
  describe('AC-101-02: pt-BR email template', () => {
    it('has pt-BR email subject', () => {
      const content = getEdgeFunction();
      expect(content).toContain(
        'Redefinir senha - Gerenciador da Reuniao Sacramental'
      );
    });
  });

  describe('AC-101-03: en email template', () => {
    it('has en email subject', () => {
      const content = getEdgeFunction();
      expect(content).toContain('Reset password - Sacrament Meeting Planner');
    });
  });

  describe('AC-101-04: es email template', () => {
    it('has es email subject', () => {
      const content = getEdgeFunction();
      expect(content).toContain(
        'Restablecer contrasena - Planificador de la Reunion Sacramental'
      );
    });
  });

  // --- AC-101-01 continued: Resend API ---
  describe('AC-101-01: Resend API integration', () => {
    it('sends email via Resend API URL', () => {
      const content = getEdgeFunction();
      expect(content).toContain('https://api.resend.com/emails');
    });

    it('checks RESEND_API_KEY env var', () => {
      const content = getEdgeFunction();
      expect(content).toContain("Deno.env.get('RESEND_API_KEY')");
    });

    it('checks RESEND_FROM_EMAIL env var', () => {
      const content = getEdgeFunction();
      expect(content).toContain("Deno.env.get('RESEND_FROM_EMAIL')");
    });

    it('uses Authorization Bearer header with RESEND_API_KEY', () => {
      const content = getEdgeFunction();
      expect(content).toContain('Bearer ${RESEND_API_KEY}');
    });

    it('email template contains deep link placeholder', () => {
      const content = getEdgeFunction();
      expect(content).toContain('${deepLink}');
    });
  });

  // --- AC-101-11: CORS headers ---
  describe('AC-101-11: CORS headers', () => {
    it('defines corsHeaders with Access-Control-Allow-Origin: *', () => {
      const content = getEdgeFunction();
      expect(content).toContain("'Access-Control-Allow-Origin': '*'");
    });

    it('corsHeaders includes required headers', () => {
      const content = getEdgeFunction();
      expect(content).toContain(
        'authorization, x-client-info, apikey, content-type'
      );
    });

    it('OPTIONS request returns ok with corsHeaders', () => {
      const content = getEdgeFunction();
      expect(content).toContain("'OPTIONS'");
      expect(content).toContain("'ok'");
    });
  });

  // --- EC-101-03, EC-101-04: Error handling ---
  describe('EC-101-03/04: Error handling', () => {
    it('returns 500 when Resend env vars are missing', () => {
      const content = getEdgeFunction();
      expect(content).toContain('Email service not configured');
    });

    it('returns 500 on Resend API failure', () => {
      const content = getEdgeFunction();
      expect(content).toContain('Failed to send email');
    });

    it('has outer catch for unexpected errors', () => {
      const content = getEdgeFunction();
      expect(content).toContain('Internal server error');
    });
  });
});

// =============================================================================
// F101 (CR-155): Client-side changes
// =============================================================================

describe('F101 (CR-155): Client-side changes', () => {
  // --- AC-101-06: forgot-password.tsx calls Edge Function ---
  describe('AC-101-06: forgot-password.tsx calls Edge Function', () => {
    it('has no expo-linking import', () => {
      const content = readSourceFile('app/(auth)/forgot-password.tsx');
      expect(content).not.toContain('expo-linking');
    });

    it('calls functions.invoke with send-reset-email', () => {
      const content = readSourceFile('app/(auth)/forgot-password.tsx');
      expect(content).toContain("functions.invoke");
      expect(content).toContain("'send-reset-email'");
    });

    it('passes email in body to Edge Function', () => {
      const content = readSourceFile('app/(auth)/forgot-password.tsx');
      expect(content).toContain('body: { email');
    });

    it('does not use resetPasswordForEmail', () => {
      const content = readSourceFile('app/(auth)/forgot-password.tsx');
      expect(content).not.toContain('resetPasswordForEmail');
    });

    it('does not use Linking.createURL', () => {
      const content = readSourceFile('app/(auth)/forgot-password.tsx');
      expect(content).not.toContain('Linking.createURL');
    });
  });

  // --- AC-101-07: reset-password.tsx accepts token from deep link ---
  describe('AC-101-07: reset-password.tsx accepts token from deep link', () => {
    it('imports useLocalSearchParams from expo-router', () => {
      const content = readSourceFile('app/(auth)/reset-password.tsx');
      expect(content).toContain('useLocalSearchParams');
      expect(content).toContain("from 'expo-router'");
    });

    it('calls verifyOtp with token_hash', () => {
      const content = readSourceFile('app/(auth)/reset-password.tsx');
      expect(content).toContain('verifyOtp');
      expect(content).toContain('token_hash');
    });

    it('uses recovery type in verifyOtp call', () => {
      const content = readSourceFile('app/(auth)/reset-password.tsx');
      expect(content).toContain("type: 'recovery'");
    });

    it('has PASSWORD_RECOVERY fallback', () => {
      const content = readSourceFile('app/(auth)/reset-password.tsx');
      expect(content).toContain('PASSWORD_RECOVERY');
    });
  });

  // --- AC-101-12: Expired token handling ---
  describe('AC-101-12: Expired token handling', () => {
    it('handles verifyOtp error with resetExpired message', () => {
      const content = readSourceFile('app/(auth)/reset-password.tsx');
      expect(content).toContain('auth.resetExpired');
    });
  });

  // --- AC-101-08: Full flow verification ---
  describe('AC-101-08: Full flow components exist', () => {
    it('forgot-password invokes Edge Function', () => {
      const content = readSourceFile('app/(auth)/forgot-password.tsx');
      expect(content).toContain("'send-reset-email'");
    });

    it('reset-password handles token via verifyOtp', () => {
      const content = readSourceFile('app/(auth)/reset-password.tsx');
      expect(content).toContain('verifyOtp');
    });

    it('reset-password calls updateUser for password change', () => {
      const content = readSourceFile('app/(auth)/reset-password.tsx');
      expect(content).toContain('supabase.auth.updateUser');
    });

    it('reset-password shows success message', () => {
      const content = readSourceFile('app/(auth)/reset-password.tsx');
      expect(content).toContain('auth.passwordUpdated');
    });
  });
});

// =============================================================================
// F102 (CR-164): Test suite 100% passing - bundleIdentifier fix verification
// =============================================================================

describe('F102 (CR-164): bundleIdentifier fix verification', () => {
  // --- AC-102-01: bundleIdentifier test expects correct value ---
  describe('AC-102-01: iOS bundleIdentifier', () => {
    it('batch7 test file uses com.sacramentmeetingmanager.app for iOS', () => {
      const content = readSourceFile('__tests__/batch7-f035-f039.test.ts');
      expect(content).toContain('com.sacramentmeetingmanager.app');
    });

    it('batch7 test file does not use com.wardmanager.app in expect values', () => {
      const content = readSourceFile('__tests__/batch7-f035-f039.test.ts');
      // The test should not expect the old value
      expect(content).not.toMatch(/toBe\('com\.wardmanager\.app'\)/);
    });
  });

  // --- AC-102-02: Android package test expects correct value ---
  describe('AC-102-02: Android package', () => {
    it('app.json ios.bundleIdentifier matches test expectations', () => {
      const content = readProjectFile('app.json');
      const config = JSON.parse(content);
      expect(config.expo.ios.bundleIdentifier).toBe(
        'com.sacramentmeetingmanager.app'
      );
    });

    it('app.json android.package matches test expectations', () => {
      const content = readProjectFile('app.json');
      const config = JSON.parse(content);
      expect(config.expo.android.package).toBe(
        'com.sacramentmeetingmanager.app'
      );
    });
  });

  // --- AC-102-03: forgot-password tests updated ---
  describe('AC-102-03: batch14-phase1 forgot-password tests updated', () => {
    it('batch14-phase1.test.ts verifies functions.invoke', () => {
      const content = readSourceFile('__tests__/batch14-phase1.test.ts');
      expect(content).toContain('functions.invoke');
    });

    it('batch14-phase1.test.ts verifies send-reset-email', () => {
      const content = readSourceFile('__tests__/batch14-phase1.test.ts');
      expect(content).toContain('send-reset-email');
    });

    it('batch14-phase1.test.ts does not expect expo-linking import', () => {
      const content = readSourceFile('__tests__/batch14-phase1.test.ts');
      // The test should check for absence of expo-linking, not presence
      expect(content).toContain('not.toContain("expo-linking")');
    });
  });

  // --- AC-102-04: reset-password tests updated ---
  describe('AC-102-04: batch14-phase1 reset-password tests updated', () => {
    it('batch14-phase1.test.ts verifies useLocalSearchParams', () => {
      const content = readSourceFile('__tests__/batch14-phase1.test.ts');
      expect(content).toContain('useLocalSearchParams');
    });

    it('batch14-phase1.test.ts verifies verifyOtp', () => {
      const content = readSourceFile('__tests__/batch14-phase1.test.ts');
      expect(content).toContain('verifyOtp');
    });
  });
});
