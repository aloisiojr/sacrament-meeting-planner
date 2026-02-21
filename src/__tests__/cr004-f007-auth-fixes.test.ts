/**
 * QA Tests for CR-004 / F007: Auth Fixes
 *
 * Covers:
 * CR-64: Users screen accessible to secretary role (list-users & update-user-role Edge Function fixes)
 * CR-67: Forgot password screen on login page
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function readSourceFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf-8');
}

function readEdgeFunction(functionName: string): string {
  return fs.readFileSync(
    path.resolve(__dirname, '../../supabase/functions', functionName, 'index.ts'),
    'utf-8'
  );
}

function readLocale(locale: string): Record<string, unknown> {
  const filePath = path.resolve(__dirname, '..', 'i18n', 'locales', `${locale}.json`);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

describe('CR-004 F007: Auth Fixes', () => {
  // ---------------------------------------------------------------
  // CR-64: list-users Edge Function allows secretary
  // ---------------------------------------------------------------
  describe('CR-64: list-users Edge Function secretary access', () => {
    it('should allow both bishopric and secretary roles', () => {
      const source = readEdgeFunction('list-users');
      expect(source).toContain("['bishopric', 'secretary'].includes(userRole)");
    });

    it('should NOT have the old single-role check', () => {
      const source = readEdgeFunction('list-users');
      expect(source).not.toContain("userRole !== 'bishopric'");
    });

    it('should deny observer role (not in allowed list)', () => {
      const source = readEdgeFunction('list-users');
      // observer is NOT in the includes list
      expect(source).not.toContain("'observer'");
      // Insufficient permissions response exists
      expect(source).toContain('Insufficient permissions');
    });

    it('should call list_ward_users RPC with ward_id filter', () => {
      const source = readEdgeFunction('list-users');
      expect(source).toContain("rpc('list_ward_users'");
      expect(source).toContain('target_ward_id: wardId');
    });

    it('should return users array in response body', () => {
      const source = readEdgeFunction('list-users');
      expect(source).toContain('JSON.stringify({ users: wardUsers');
    });

    it('should handle CORS preflight requests', () => {
      const source = readEdgeFunction('list-users');
      expect(source).toContain("req.method === 'OPTIONS'");
      expect(source).toContain('Access-Control-Allow-Origin');
      expect(source).toContain('Access-Control-Allow-Headers');
    });

    it('should require Authorization header', () => {
      const source = readEdgeFunction('list-users');
      expect(source).toContain("req.headers.get('Authorization')");
      expect(source).toContain('Missing authorization header');
    });

    it('should verify caller has ward_id and role metadata', () => {
      const source = readEdgeFunction('list-users');
      expect(source).toContain('app_metadata?.ward_id');
      expect(source).toContain('app_metadata?.role');
      expect(source).toContain('User missing ward or role metadata');
    });
  });

  // ---------------------------------------------------------------
  // CR-64: update-user-role Edge Function allows secretary
  // ---------------------------------------------------------------
  describe('CR-64: update-user-role Edge Function secretary access', () => {
    it('should allow both bishopric and secretary roles', () => {
      const source = readEdgeFunction('update-user-role');
      expect(source).toContain("['bishopric', 'secretary']");
      expect(source).toContain('ALLOWED_ROLES.includes(callerRole)');
    });

    it('should NOT have the old single-role check', () => {
      const source = readEdgeFunction('update-user-role');
      expect(source).not.toContain("callerRole !== 'bishopric'");
    });

    it('should deny observer role (not in allowed list)', () => {
      const source = readEdgeFunction('update-user-role');
      // ALLOWED_ROLES only contains bishopric and secretary
      expect(source).toContain("const ALLOWED_ROLES = ['bishopric', 'secretary']");
      // Insufficient permissions response exists for denied roles
      expect(source).toContain('Insufficient permissions');
    });

    it('should preserve cannot_change_own_role guard', () => {
      const source = readEdgeFunction('update-user-role');
      expect(source).toContain('cannot_change_own_role');
    });

    it('should preserve cannot_demote_last_bishopric guard', () => {
      const source = readEdgeFunction('update-user-role');
      expect(source).toContain('cannot_demote_last_bishopric');
    });
  });

  // ---------------------------------------------------------------
  // CR-64: update-user-role Edge Function input validation
  // ---------------------------------------------------------------
  describe('CR-64: update-user-role input validation', () => {
    it('should validate targetUserId is required', () => {
      const source = readEdgeFunction('update-user-role');
      expect(source).toContain('!input.targetUserId');
      expect(source).toContain('Missing required fields: targetUserId and newRole');
    });

    it('should validate newRole is required', () => {
      const source = readEdgeFunction('update-user-role');
      expect(source).toContain('!input.newRole');
    });

    it('should validate role against VALID_ROLES constant', () => {
      const source = readEdgeFunction('update-user-role');
      expect(source).toContain("const VALID_ROLES = ['bishopric', 'secretary', 'observer']");
      expect(source).toContain('VALID_ROLES.includes(input.newRole)');
    });

    it('should return 400 for invalid role value', () => {
      const source = readEdgeFunction('update-user-role');
      expect(source).toContain('Invalid role. Must be bishopric, secretary, or observer.');
    });

    it('should define UpdateRoleInput interface', () => {
      const source = readEdgeFunction('update-user-role');
      expect(source).toContain('interface UpdateRoleInput');
      expect(source).toContain('targetUserId: string');
      expect(source).toContain("newRole: 'bishopric' | 'secretary' | 'observer'");
    });
  });

  // ---------------------------------------------------------------
  // CR-64: update-user-role ward verification
  // ---------------------------------------------------------------
  describe('CR-64: update-user-role ward verification', () => {
    it('should fetch target user by ID via admin API', () => {
      const source = readEdgeFunction('update-user-role');
      expect(source).toContain('auth.admin.getUserById(input.targetUserId)');
    });

    it('should return 404 if target user not found', () => {
      const source = readEdgeFunction('update-user-role');
      expect(source).toContain('Target user not found');
      // Verify 404 status
      const notFoundIdx = source.indexOf('Target user not found');
      const nearbySection = source.slice(Math.max(0, notFoundIdx - 150), notFoundIdx + 50);
      expect(nearbySection).toContain('status: 404');
    });

    it('should verify target user belongs to same ward', () => {
      const source = readEdgeFunction('update-user-role');
      expect(source).toContain("targetUser.app_metadata?.ward_id !== wardId");
      expect(source).toContain('Target user not in your ward');
    });

    it('should return 403 if target user is in different ward', () => {
      const source = readEdgeFunction('update-user-role');
      const wardCheckIdx = source.indexOf('Target user not in your ward');
      const nearbySection = source.slice(wardCheckIdx, wardCheckIdx + 200);
      expect(nearbySection).toContain('status: 403');
    });
  });

  // ---------------------------------------------------------------
  // CR-64: update-user-role last bishopric protection
  // ---------------------------------------------------------------
  describe('CR-64: update-user-role last bishopric protection', () => {
    it('should only check bishopric count when changing FROM bishopric', () => {
      const source = readEdgeFunction('update-user-role');
      expect(source).toContain("currentRole === 'bishopric' && input.newRole !== 'bishopric'");
    });

    it('should use list_ward_users RPC to count bishopric users', () => {
      const source = readEdgeFunction('update-user-role');
      expect(source).toContain("rpc('list_ward_users'");
      expect(source).toContain("u.role === 'bishopric'");
    });

    it('should block demotion if bishopricCount <= 1', () => {
      const source = readEdgeFunction('update-user-role');
      expect(source).toContain('bishopricCount <= 1');
    });

    it('should return 403 with cannot_demote_last_bishopric error code', () => {
      const source = readEdgeFunction('update-user-role');
      const demoteIdx = source.indexOf('cannot_demote_last_bishopric');
      const nearbySection = source.slice(demoteIdx, demoteIdx + 200);
      expect(nearbySection).toContain('status: 403');
    });
  });

  // ---------------------------------------------------------------
  // CR-64: update-user-role metadata update and response
  // ---------------------------------------------------------------
  describe('CR-64: update-user-role metadata update and response', () => {
    it('should use admin.updateUserById to set role', () => {
      const source = readEdgeFunction('update-user-role');
      expect(source).toContain('auth.admin.updateUserById');
    });

    it('should spread existing app_metadata and override role', () => {
      const source = readEdgeFunction('update-user-role');
      expect(source).toContain('...targetUser.app_metadata');
      expect(source).toContain('role: input.newRole');
    });

    it('should return success with previousRole and newRole', () => {
      const source = readEdgeFunction('update-user-role');
      expect(source).toContain('success: true');
      expect(source).toContain('previousRole: currentRole');
      expect(source).toContain('newRole: input.newRole');
    });

    it('should return 200 on successful update', () => {
      const source = readEdgeFunction('update-user-role');
      const successIdx = source.indexOf('success: true');
      const nearbySection = source.slice(successIdx, successIdx + 150);
      expect(nearbySection).toContain('status: 200');
    });
  });

  // ---------------------------------------------------------------
  // CR-64: update-user-role auto-actor creation
  // ---------------------------------------------------------------
  describe('CR-64: update-user-role auto-actor creation on bishopric promotion', () => {
    it('should auto-create actor when promoting TO bishopric', () => {
      const source = readEdgeFunction('update-user-role');
      expect(source).toContain("input.newRole === 'bishopric'");
    });

    it('should derive actor name from email (split @ and capitalize)', () => {
      const source = readEdgeFunction('update-user-role');
      expect(source).toContain("targetUser.email");
      expect(source).toContain(".split('@')[0]");
      expect(source).toContain(".replace(/[._]/g, ' ')");
      expect(source).toContain('c.toUpperCase()');
    });

    it('should use SELECT+conditional INSERT for meeting_actors with preside and conduct flags', () => {
      const source = readEdgeFunction('update-user-role');
      expect(source).toContain("from('meeting_actors')");
      expect(source).toContain('.ilike(');
      expect(source).toContain('.maybeSingle()');
      expect(source).toContain('can_preside: true');
      expect(source).toContain('can_conduct: true');
    });

    it('should use case-insensitive name lookup to avoid duplicate actors', () => {
      const source = readEdgeFunction('update-user-role');
      expect(source).toContain(".ilike('name', actorName)");
    });

    it('should be best-effort (catch errors without failing)', () => {
      const source = readEdgeFunction('update-user-role');
      expect(source).toContain('Auto-actor creation on role change failed');
    });
  });

  // ---------------------------------------------------------------
  // CR-64: update-user-role CORS and auth
  // ---------------------------------------------------------------
  describe('CR-64: update-user-role CORS and auth handling', () => {
    it('should handle CORS preflight requests', () => {
      const source = readEdgeFunction('update-user-role');
      expect(source).toContain("req.method === 'OPTIONS'");
      expect(source).toContain('Access-Control-Allow-Origin');
    });

    it('should require Authorization header', () => {
      const source = readEdgeFunction('update-user-role');
      expect(source).toContain("req.headers.get('Authorization')");
      expect(source).toContain('Missing authorization header');
    });

    it('should return 401 for missing auth', () => {
      const source = readEdgeFunction('update-user-role');
      const missingAuthIdx = source.indexOf('Missing authorization header');
      const nearbySection = source.slice(missingAuthIdx, missingAuthIdx + 200);
      expect(nearbySection).toContain('status: 401');
    });

    it('should validate JWT token via getUser', () => {
      const source = readEdgeFunction('update-user-role');
      expect(source).toContain('auth.getUser(token)');
      expect(source).toContain('Invalid or expired token');
    });

    it('should use service role key for admin operations', () => {
      const source = readEdgeFunction('update-user-role');
      expect(source).toContain('SUPABASE_SERVICE_ROLE_KEY');
    });

    it('should include Content-Type header in all responses', () => {
      const source = readEdgeFunction('update-user-role');
      // Count occurrences of Content-Type header (single quotes in source)
      const matches = source.match(/'Content-Type': 'application\/json'/g);
      // Should have Content-Type on every response path
      expect(matches).not.toBeNull();
      expect(matches!.length).toBeGreaterThanOrEqual(5);
    });
  });

  // ---------------------------------------------------------------
  // CR-64: Users screen error handling with retry
  // ---------------------------------------------------------------
  describe('CR-64: Users screen error handling', () => {
    it('should destructure refetch from useQuery', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain('refetch,');
    });

    it('should show users.loadError instead of common.error on error', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain("t('users.loadError')");
    });

    it('should have a retry button calling refetch()', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain('onPress={() => refetch()}');
    });

    it('should show common.retry text on retry button', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain("t('common.retry')");
    });

    it('should have retryButton styles defined', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain('retryButton:');
      expect(source).toContain('retryButtonText:');
    });

    it('should have retry button with accessibilityLabel', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      // Find retry button section and check accessibility
      const retryIdx = source.indexOf('onPress={() => refetch()}');
      const nearbySection = source.slice(Math.max(0, retryIdx - 200), retryIdx + 200);
      expect(nearbySection).toContain("accessibilityLabel={t('common.retry')}");
    });
  });

  // ---------------------------------------------------------------
  // CR-64: Users screen role selector UI
  // ---------------------------------------------------------------
  describe('CR-64: Users screen role selector', () => {
    it('should define all three roles (bishopric, secretary, observer)', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain("const ROLES: Role[] = ['bishopric', 'secretary', 'observer']");
    });

    it('should render role options with radio accessibilityRole', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain('accessibilityRole="radio"');
    });

    it('should disable role buttons for self (isSelf)', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain('disabled={isSelf || changeRoleMutation.isPending}');
    });

    it('should show (you) label for current user', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain("t('common.you')");
    });

    it('should call update-user-role edge function for role change', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain("callEdgeFunction('update-user-role'");
    });

    it('should invalidate user queries on successful role change', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain('queryClient.invalidateQueries({ queryKey: userManagementKeys.users })');
    });

    it('should handle cannot_change_own_role error from backend', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain("msg === 'cannot_change_own_role'");
      expect(source).toContain("t('users.cannotChangeOwnRole')");
    });

    it('should show roleChangeFailed for other role change errors', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain("t('users.roleChangeFailed')");
    });
  });

  // ---------------------------------------------------------------
  // CR-64: Users screen delete user flow
  // ---------------------------------------------------------------
  describe('CR-64: Users screen delete user flow', () => {
    it('should hide delete button for self', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain('{!isSelf && (');
    });

    it('should show confirmation dialog before deleting', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain("t('users.deleteUser')");
      expect(source).toContain("t('users.deleteConfirm')");
    });

    it('should have destructive style on delete confirmation', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain("style: 'destructive'");
    });

    it('should call delete-user edge function', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain("callEdgeFunction('delete-user'");
    });

    it('should handle cannot_delete_self error', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain("msg === 'cannot_delete_self'");
      expect(source).toContain("t('users.cannotDeleteSelf')");
    });
  });

  // ---------------------------------------------------------------
  // CR-64: Users screen invite modal
  // ---------------------------------------------------------------
  describe('CR-64: Users screen invite modal', () => {
    it('should have invite button in header', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain("t('users.inviteUser')");
      expect(source).toContain('openInviteModal');
    });

    it('should call create-invitation edge function', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain("callEdgeFunction('create-invitation'");
    });

    it('should display deep link on success', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain('inviteResult.deepLink');
    });

    it('should have copy and share link actions', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain("t('users.copyLink')");
      expect(source).toContain("t('users.shareLink')");
    });

    it('should reset modal state on open', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain("setInviteEmail('')");
      expect(source).toContain("setInviteRole('observer')");
      expect(source).toContain('setInviteResult(null)');
    });

    it('should disable invite button when email is empty or submitting', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain('disabled={!inviteEmail.trim() || inviteMutation.isPending}');
    });
  });

  // ---------------------------------------------------------------
  // CR-64: Users screen helper function and query key exports
  // ---------------------------------------------------------------
  describe('CR-64: Users screen architecture', () => {
    it('should export userManagementKeys for query management', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain('export const userManagementKeys');
    });

    it('should NOT have getAccessToken helper (removed in CR-76 v2 -- SDK handles auth automatically)', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).not.toContain('async function getAccessToken');
      // getSession() may exist for session validation guard (ADR-024 / BUG-401),
      // but must NOT be used to extract access_token for manual auth header
      expect(source).not.toContain('session?.access_token');
    });

    it('should NOT pass manual Authorization header to edge functions (CR-76 v2 -- SDK auto-injects auth)', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).not.toContain('Authorization: `Bearer ${token}`');
    });

    it('should use callEdgeFunction with supabase.functions.invoke', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain('supabase.functions.invoke(functionName');
    });
  });

  // ---------------------------------------------------------------
  // CR-67: Forgot password screen exists
  // ---------------------------------------------------------------
  describe('CR-67: Forgot password screen', () => {
    it('forgot-password.tsx file should exist', () => {
      const filePath = path.resolve(__dirname, '..', 'app', '(auth)', 'forgot-password.tsx');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should import supabase', () => {
      const source = readSourceFile('app/(auth)/forgot-password.tsx');
      expect(source).toContain("from '../../lib/supabase'");
    });

    it('should call Edge Function send-reset-email', () => {
      const source = readSourceFile('app/(auth)/forgot-password.tsx');
      expect(source).toContain("functions.invoke");
      expect(source).toContain("'send-reset-email'");
    });

    it('should trim email before sending', () => {
      const source = readSourceFile('app/(auth)/forgot-password.tsx');
      expect(source).toContain('email.trim()');
    });

    it('should validate empty email with emailRequired', () => {
      const source = readSourceFile('app/(auth)/forgot-password.tsx');
      expect(source).toContain("t('auth.emailRequired')");
    });

    it('should show loading spinner when submitting', () => {
      const source = readSourceFile('app/(auth)/forgot-password.tsx');
      expect(source).toContain('ActivityIndicator');
      expect(source).toContain('disabled={loading}');
    });

    it('should show success message on success', () => {
      const source = readSourceFile('app/(auth)/forgot-password.tsx');
      expect(source).toContain("t('auth.resetEmailSent')");
    });

    it('should show error message on failure', () => {
      const source = readSourceFile('app/(auth)/forgot-password.tsx');
      expect(source).toContain("t('auth.resetFailed')");
    });

    it('should have back to login link', () => {
      const source = readSourceFile('app/(auth)/forgot-password.tsx');
      expect(source).toContain("t('auth.backToLogin')");
    });

    it('should use ThemeContext colors', () => {
      const source = readSourceFile('app/(auth)/forgot-password.tsx');
      expect(source).toContain('useTheme');
      expect(source).toContain('colors.background');
      expect(source).toContain('colors.text');
      expect(source).toContain('colors.primary');
    });

    it('should use KeyboardAvoidingView like other auth screens', () => {
      const source = readSourceFile('app/(auth)/forgot-password.tsx');
      expect(source).toContain('KeyboardAvoidingView');
    });

    it('should use useTranslation for i18n', () => {
      const source = readSourceFile('app/(auth)/forgot-password.tsx');
      expect(source).toContain("t('auth.forgotPasswordTitle')");
      expect(source).toContain("t('auth.forgotPasswordDescription')");
      expect(source).toContain("t('auth.sendResetEmail')");
    });

    it('should handle submit via onSubmitEditing on email input', () => {
      const source = readSourceFile('app/(auth)/forgot-password.tsx');
      expect(source).toContain('onSubmitEditing={handleSendReset}');
    });

    it('should show success state with back to login link (not form)', () => {
      const source = readSourceFile('app/(auth)/forgot-password.tsx');
      // After success, the form is replaced by success message
      expect(source).toContain('{success ? (');
      expect(source).toContain('successContainer');
    });

    it('should use router.back() for back to login navigation', () => {
      const source = readSourceFile('app/(auth)/forgot-password.tsx');
      expect(source).toContain('router.back()');
    });

    it('should disable send button opacity when loading', () => {
      const source = readSourceFile('app/(auth)/forgot-password.tsx');
      expect(source).toContain('sendButtonDisabled');
      expect(source).toContain('opacity: 0.7');
    });
  });

  // ---------------------------------------------------------------
  // CR-67: Login screen forgot password link
  // ---------------------------------------------------------------
  describe('CR-67: Login screen forgot password link', () => {
    it('login.tsx should have forgot password link', () => {
      const source = readSourceFile('app/(auth)/login.tsx');
      expect(source).toContain("t('auth.forgotPassword')");
    });

    it('should navigate to forgot-password route', () => {
      const source = readSourceFile('app/(auth)/login.tsx');
      expect(source).toContain("/(auth)/forgot-password");
    });

    it('forgot password link should be disabled when loading', () => {
      const source = readSourceFile('app/(auth)/login.tsx');
      // The link should have disabled={loading}
      const forgotIdx = source.indexOf('forgotPasswordLink');
      const createIdx = source.indexOf('createAccountLink');
      const betweenSection = source.slice(forgotIdx, createIdx);
      expect(betweenSection).toContain('disabled={loading}');
    });

    it('forgot password link should appear before create account', () => {
      const source = readSourceFile('app/(auth)/login.tsx');
      const forgotIdx = source.indexOf("t('auth.forgotPassword')");
      const createIdx = source.indexOf("t('auth.createAccount')");
      expect(forgotIdx).toBeLessThan(createIdx);
      expect(forgotIdx).toBeGreaterThan(-1);
    });

    it('should have forgotPasswordLink styles', () => {
      const source = readSourceFile('app/(auth)/login.tsx');
      expect(source).toContain('forgotPasswordLink:');
      expect(source).toContain('forgotPasswordText:');
    });

    it('login.tsx should use useRouter for navigation', () => {
      const source = readSourceFile('app/(auth)/login.tsx');
      expect(source).toContain('useRouter');
      expect(source).toContain("router.push('/(auth)/forgot-password')");
    });

    it('login.tsx should have create account link after forgot password', () => {
      const source = readSourceFile('app/(auth)/login.tsx');
      expect(source).toContain("t('auth.createAccount')");
      expect(source).toContain("router.push('/(auth)/register')");
    });
  });

  // ---------------------------------------------------------------
  // CR-67: Auth layout auto-discovers forgot-password
  // ---------------------------------------------------------------
  describe('CR-67: Auth layout', () => {
    it('_layout.tsx should use Stack without explicit screens (auto-discover)', () => {
      const source = readSourceFile('app/(auth)/_layout.tsx');
      expect(source).toContain('<Stack');
      expect(source).toContain('/>');
      // Should NOT have Stack.Screen entries (auto-discover)
      expect(source).not.toContain('Stack.Screen');
    });

    it('_layout.tsx should hide header on auth screens', () => {
      const source = readSourceFile('app/(auth)/_layout.tsx');
      expect(source).toContain('headerShown: false');
    });

    it('_layout.tsx should use theme background color', () => {
      const source = readSourceFile('app/(auth)/_layout.tsx');
      expect(source).toContain('useTheme');
      expect(source).toContain('contentStyle: { backgroundColor: colors.background }');
    });
  });

  // ---------------------------------------------------------------
  // i18n keys exist in all locales
  // ---------------------------------------------------------------
  describe('i18n keys for auth fixes', () => {
    (['pt-BR', 'en', 'es'] as const).forEach((locale) => {
      describe(`${locale}`, () => {
        it('auth.forgotPassword should exist', () => {
          const data = readLocale(locale);
          const auth = data.auth as Record<string, string>;
          expect(auth.forgotPassword).toBeDefined();
          expect(auth.forgotPassword.length).toBeGreaterThan(5);
        });

        it('auth.forgotPasswordTitle should exist', () => {
          const data = readLocale(locale);
          const auth = data.auth as Record<string, string>;
          expect(auth.forgotPasswordTitle).toBeDefined();
        });

        it('auth.forgotPasswordDescription should exist', () => {
          const data = readLocale(locale);
          const auth = data.auth as Record<string, string>;
          expect(auth.forgotPasswordDescription).toBeDefined();
          expect(auth.forgotPasswordDescription.length).toBeGreaterThan(20);
        });

        it('auth.sendResetEmail should exist', () => {
          const data = readLocale(locale);
          const auth = data.auth as Record<string, string>;
          expect(auth.sendResetEmail).toBeDefined();
        });

        it('auth.resetEmailSent should exist', () => {
          const data = readLocale(locale);
          const auth = data.auth as Record<string, string>;
          expect(auth.resetEmailSent).toBeDefined();
        });

        it('auth.resetFailed should exist', () => {
          const data = readLocale(locale);
          const auth = data.auth as Record<string, string>;
          expect(auth.resetFailed).toBeDefined();
        });

        it('auth.backToLogin should exist', () => {
          const data = readLocale(locale);
          const auth = data.auth as Record<string, string>;
          expect(auth.backToLogin).toBeDefined();
        });

        it('users.loadError should exist', () => {
          const data = readLocale(locale);
          const users = data.users as Record<string, string>;
          expect(users.loadError).toBeDefined();
        });

        it('common.retry should exist', () => {
          const data = readLocale(locale);
          const common = data.common as Record<string, string>;
          expect(common.retry).toBeDefined();
          expect(common.retry.length).toBeGreaterThan(0);
        });
      });
    });
  });
});
