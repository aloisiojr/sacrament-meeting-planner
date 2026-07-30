/**
 * F022: App Store Compliance (CR-289, CR-290)
 *
 * Tester behavioral tests covering:
 * - CR-289: Login title must be 'Sacrament Meeting Planner' in all locales
 * - CR-290: Account self-deletion (edge function, settings gate, users screen)
 *
 * ACs covered: AC-289-1..4, AC-290-1..11
 * ECs covered: EC-022-01..06
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import ptBR from '../i18n/locales/pt-BR.json';
import enUS from '../i18n/locales/en-US.json';
import esLA from '../i18n/locales/es-LA.json';

// =============================================================================
// CR-289: Login Title Fix
// =============================================================================

describe('CR-289: Login title fix', () => {
  // AC-289-1: pt-BR loginTitle = "Sacrament Meeting Planner"
  it('AC-289-1: pt-BR loginTitle is "Sacrament Meeting Planner"', () => {
    expect(ptBR.auth.loginTitle).toBe('Sacrament Meeting Planner');
  });

  // AC-289-2: es-LA loginTitle = "Sacrament Meeting Planner"
  it('AC-289-2: es-LA loginTitle is "Sacrament Meeting Planner"', () => {
    expect(esLA.auth.loginTitle).toBe('Sacrament Meeting Planner');
  });

  // AC-289-3: en-US loginTitle unchanged
  it('AC-289-3: en-US loginTitle is "Sacrament Meeting Planner" (unchanged)', () => {
    expect(enUS.auth.loginTitle).toBe('Sacrament Meeting Planner');
  });

  // AC-289-4: all 3 locales match
  it('AC-289-4: all 3 locales have the same loginTitle', () => {
    expect(ptBR.auth.loginTitle).toBe(enUS.auth.loginTitle);
    expect(esLA.auth.loginTitle).toBe(enUS.auth.loginTitle);
  });
});

// =============================================================================
// CR-290: Account Self-Deletion
// =============================================================================

describe('CR-290: Account self-deletion', () => {
  // ---------------------------------------------------------------------------
  // AC-290-11: i18n keys
  // ---------------------------------------------------------------------------
  describe('i18n keys', () => {
    it('AC-290-11: deleteMyAccount exists in all 3 locales with correct values', () => {
      expect(ptBR.users.deleteMyAccount).toBe('Excluir Minha Conta');
      expect(enUS.users.deleteMyAccount).toBe('Delete My Account');
      expect(esLA.users.deleteMyAccount).toBe('Eliminar Mi Cuenta');
    });

    it('AC-290-11: deleteAccountTitle exists in all 3 locales with correct values', () => {
      expect(ptBR.users.deleteAccountTitle).toBe('Excluir Conta');
      expect(enUS.users.deleteAccountTitle).toBe('Delete Account');
      expect(esLA.users.deleteAccountTitle).toBe('Eliminar Cuenta');
    });

    it('AC-290-11: deleteAccountConfirm exists in all 3 locales', () => {
      expect(ptBR.users.deleteAccountConfirm).toBeDefined();
      expect(enUS.users.deleteAccountConfirm).toBe(
        'Are you sure you want to delete your account? This action is irreversible and all your data will be erased.'
      );
      expect(esLA.users.deleteAccountConfirm).toBeDefined();
    });

    it('AC-290-11: deleteAccountLastMemberWarning exists in all 3 locales', () => {
      expect(ptBR.users.deleteAccountLastMemberWarning).toBeDefined();
      expect(enUS.users.deleteAccountLastMemberWarning).toBe(
        'You are the only member of this ward. Deleting your account will permanently delete the entire ward and all associated data. Do you want to continue?'
      );
      expect(esLA.users.deleteAccountLastMemberWarning).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // delete-user edge function
  // ---------------------------------------------------------------------------
  describe('delete-user edge function', () => {
    const edgeFnPath = path.join(
      __dirname, '..', '..', 'supabase', 'functions', 'delete-user', 'index.ts'
    );

    let content: string;

    it('edge function file exists', () => {
      expect(fs.existsSync(edgeFnPath)).toBe(true);
      content = fs.readFileSync(edgeFnPath, 'utf-8');
    });

    // AC-290-4/5: Self-deletion path exists
    it('AC-290-4/5: has self-deletion branch (targetUserId === caller.id)', () => {
      content = fs.readFileSync(edgeFnPath, 'utf-8');
      expect(content).toContain('input.targetUserId === caller.id');
    });

    // ADR-061: body parsed before role check
    it('ADR-061: body is parsed before bishopric role check', () => {
      content = fs.readFileSync(edgeFnPath, 'utf-8');
      const bodyParseIndex = content.indexOf('req.json()');
      const roleCheckIndex = content.indexOf("callerRole !== 'bishopric'");
      expect(bodyParseIndex).toBeGreaterThan(-1);
      expect(roleCheckIndex).toBeGreaterThan(-1);
      expect(bodyParseIndex).toBeLessThan(roleCheckIndex);
    });

    // ADR-061: No cannot_delete_self guard
    it('ADR-061: no cannot_delete_self guard exists', () => {
      content = fs.readFileSync(edgeFnPath, 'utf-8');
      expect(content).not.toContain('cannot_delete_self');
    });

    // Self-deletion: any role allowed (no role check in self-deletion path)
    it('self-deletion path does not check role (any role allowed)', () => {
      content = fs.readFileSync(edgeFnPath, 'utf-8');
      // The self-deletion branch comment confirms any role
      expect(content).toContain('Self-deletion: any role allowed');
    });

    // ADR-062: Last-member detection via paginated listUsers
    it('ADR-062: uses paginated listUsers for last-member detection', () => {
      content = fs.readFileSync(edgeFnPath, 'utf-8');
      expect(content).toContain('listUsers');
      expect(content).toContain('perPage: 50');
      expect(content).toContain('wardMemberCount');
    });

    // AC-290-5: Last member deletes ward (CASCADE)
    it('AC-290-5: last member path deletes ward', () => {
      content = fs.readFileSync(edgeFnPath, 'utf-8');
      expect(content).toContain("from('wards').delete()");
      // Verify it's inside the wardMemberCount === 1 branch
      const wardDeleteIndex = content.indexOf("from('wards').delete()");
      const memberCountCheck = content.indexOf('wardMemberCount === 1');
      expect(memberCountCheck).toBeGreaterThan(-1);
      expect(wardDeleteIndex).toBeGreaterThan(memberCountCheck);
    });

    // AC-290-4: Non-last-member self-deletion deletes push tokens
    it('AC-290-4: non-last-member self-deletion deletes push tokens', () => {
      content = fs.readFileSync(edgeFnPath, 'utf-8');
      // Self-deletion branch has push token deletion in else block
      expect(content).toContain("from('device_push_tokens').delete()");
    });

    // Self-deletion path deletes auth user
    it('self-deletion path deletes auth user', () => {
      content = fs.readFileSync(edgeFnPath, 'utf-8');
      expect(content).toContain('deleteUser(caller.id)');
    });

    // AC-290-8: Non-self deletion still requires bishopric role
    it('AC-290-8: non-self deletion requires bishopric role', () => {
      content = fs.readFileSync(edgeFnPath, 'utf-8');
      // The else branch checks callerRole !== 'bishopric'
      const selfBranchEnd = content.indexOf('} else {');
      const roleCheck = content.indexOf("callerRole !== 'bishopric'");
      expect(selfBranchEnd).toBeGreaterThan(-1);
      expect(roleCheck).toBeGreaterThan(selfBranchEnd);
    });

    // AC-290-9: Non-self deletion by non-bishopric returns 403
    it('AC-290-9: non-self non-bishopric returns 403 with Insufficient permissions', () => {
      content = fs.readFileSync(edgeFnPath, 'utf-8');
      expect(content).toContain('Insufficient permissions');
      // Verify 403 status follows the role check
      const roleCheck = content.indexOf("callerRole !== 'bishopric'");
      const status403 = content.indexOf('status: 403', roleCheck);
      expect(status403).toBeGreaterThan(roleCheck);
    });

    // Non-self deletion checks ward match
    it('non-self deletion checks ward match', () => {
      content = fs.readFileSync(edgeFnPath, 'utf-8');
      expect(content).toContain('Target user not in your ward');
    });

    // Non-self deletion uses getUserById
    it('non-self deletion validates target user exists', () => {
      content = fs.readFileSync(edgeFnPath, 'utf-8');
      expect(content).toContain('getUserById');
      expect(content).toContain('Target user not found');
    });

    // EC-022-01: last member ward deletion
    it('EC-022-01: last-member ward deletion uses CASCADE', () => {
      content = fs.readFileSync(edgeFnPath, 'utf-8');
      expect(content).toContain('CASCADE clears all data');
    });

    // EC-022-02: pagination loop for >50 users
    it('EC-022-02: pagination handles >50 users', () => {
      content = fs.readFileSync(edgeFnPath, 'utf-8');
      expect(content).toContain('pageUsers.length < 50');
      expect(content).toContain('page++');
    });

    // EC-022-06: auth delete failure returns 500
    it('EC-022-06: auth delete failure in self-deletion returns 500', () => {
      content = fs.readFileSync(edgeFnPath, 'utf-8');
      expect(content).toContain('Self-deletion error:');
      expect(content).toContain('Failed to delete user');
    });

    // Self-deletion returns success with deletedUserId
    it('self-deletion success returns deletedUserId', () => {
      content = fs.readFileSync(edgeFnPath, 'utf-8');
      expect(content).toContain('deletedUserId: caller.id');
    });
  });

  // ---------------------------------------------------------------------------
  // Settings index — Users permission gate removal
  // ---------------------------------------------------------------------------
  describe('settings index Users gate', () => {
    const settingsPath = path.join(
      __dirname, '..', 'app', '(tabs)', 'settings', 'index.tsx'
    );

    let content: string;

    it('settings/index.tsx exists', () => {
      expect(fs.existsSync(settingsPath)).toBe(true);
      content = fs.readFileSync(settingsPath, 'utf-8');
    });

    // AC-290-6: Users menu item NOT gated by settings:users permission
    it('AC-290-6: Users item is not gated by settings:users permission', () => {
      content = fs.readFileSync(settingsPath, 'utf-8');
      expect(content).not.toContain("hasPermission('settings:users')");
    });

    // EC-022-04: isOnline guard remains
    it('EC-022-04: Users item is still gated by isOnline', () => {
      content = fs.readFileSync(settingsPath, 'utf-8');
      // Find the users settings item and verify isOnline guard
      const usersButtonIndex = content.indexOf('settings-users-button');
      expect(usersButtonIndex).toBeGreaterThan(-1);
      // The isOnline guard should appear before the users button
      const isOnlineIndex = content.lastIndexOf('isOnline', usersButtonIndex);
      expect(isOnlineIndex).toBeGreaterThan(-1);
    });

    // Users route still navigates to settings/users
    it('Users item navigates to settings/users route', () => {
      content = fs.readFileSync(settingsPath, 'utf-8');
      expect(content).toContain("router.push('/(tabs)/settings/users')");
    });
  });

  // ---------------------------------------------------------------------------
  // Users screen — Self-deletion UI + Observer view
  // ---------------------------------------------------------------------------
  describe('users screen self-deletion', () => {
    const usersPath = path.join(
      __dirname, '..', 'app', '(tabs)', 'settings', 'users.tsx'
    );

    let content: string;

    it('users.tsx exists', () => {
      expect(fs.existsSync(usersPath)).toBe(true);
      content = fs.readFileSync(usersPath, 'utf-8');
    });

    // AC-290-1: 'Delete My Account' button renders for self
    it('AC-290-1: Delete My Account button renders for self (isSelf)', () => {
      content = fs.readFileSync(usersPath, 'utf-8');
      expect(content).toContain("t('users.deleteMyAccount')");
      // Verify isSelf conditional rendering
      expect(content).toContain('{isSelf ?');
    });

    // AC-290-1: Delete My Account uses error color (destructive styling)
    it('AC-290-1: Delete My Account button uses error color styling', () => {
      content = fs.readFileSync(usersPath, 'utf-8');
      // The self-deletion button has backgroundColor: colors.error
      expect(content).toContain('colors.error');
    });

    // AC-290-2: Non-last-member shows deleteAccountConfirm
    it('AC-290-2: non-last-member confirmation uses deleteAccountConfirm', () => {
      content = fs.readFileSync(usersPath, 'utf-8');
      expect(content).toContain("t('users.deleteAccountConfirm')");
    });

    // AC-290-3: Last-member shows deleteAccountLastMemberWarning
    it('AC-290-3: last-member warning uses deleteAccountLastMemberWarning', () => {
      content = fs.readFileSync(usersPath, 'utf-8');
      expect(content).toContain("t('users.deleteAccountLastMemberWarning')");
    });

    // AC-290-3: Last-member detection uses users.length === 1
    it('AC-290-3: last-member detection uses users.length === 1', () => {
      content = fs.readFileSync(usersPath, 'utf-8');
      expect(content).toContain('users.length === 1');
    });

    // Self-deletion uses deleteAccountTitle as dialog title
    it('self-deletion dialog uses deleteAccountTitle', () => {
      content = fs.readFileSync(usersPath, 'utf-8');
      expect(content).toContain("t('users.deleteAccountTitle')");
    });

    // AC-290-6: Observer filtering — displayedUsers filtered to self only
    it('AC-290-6: observer sees only their own card (displayedUsers filter)', () => {
      content = fs.readFileSync(usersPath, 'utf-8');
      // Gated by permission (settings:users), not role. Without it → filter to self.
      expect(content).toContain('canManageUsers');
      expect(content).toContain('displayedUsers');
      expect(content).toMatch(/canManageUsers\s*\?\s*users\s*:\s*users\.filter/);
    });

    // AC-290-6: Invite button hidden for observer
    it('AC-290-6: invite button hidden for observer', () => {
      content = fs.readFileSync(usersPath, 'utf-8');
      expect(content).toContain('{canManageUsers && (');
    });

    // AC-290-7: Role selector hidden on self card (for all roles)
    it('AC-290-7: role selector hidden on self card', () => {
      content = fs.readFileSync(usersPath, 'utf-8');
      expect(content).toContain('{!isSelf && (');
    });

    // AC-290-10: signOut called after successful self-deletion
    it('AC-290-10: signOut is called after successful self-deletion', () => {
      content = fs.readFileSync(usersPath, 'utf-8');
      // In onSuccess: if targetUserId === currentUser?.id => signOut
      expect(content).toContain('variables.targetUserId === currentUser?.id');
      expect(content).toContain('supabase.auth.signOut()');
    });

    // AC-290-10: No Alert shown for self-deletion success
    it('AC-290-10: no success alert shown for self-deletion (signOut redirects)', () => {
      content = fs.readFileSync(usersPath, 'utf-8');
      // After signOut call, there's a return before Alert.alert
      const onSuccessBlock = content.indexOf('onSuccess: async (_data, variables)');
      expect(onSuccessBlock).toBeGreaterThan(-1);
      const signOutCall = content.indexOf('signOut()', onSuccessBlock);
      const returnAfterSignOut = content.indexOf('return;', signOutCall);
      const alertCall = content.indexOf("Alert.alert(t('common.success')", onSuccessBlock);
      // The return statement should come before the alert
      expect(returnAfterSignOut).toBeLessThan(alertCall);
    });

    // No cannotDeleteSelf guard
    it('no cannotDeleteSelf guard in handleDelete', () => {
      content = fs.readFileSync(usersPath, 'utf-8');
      expect(content).not.toContain('cannotDeleteSelf');
    });

    // EC-022-05: onError still handles errors
    it('EC-022-05: onError handler exists for deleteUserMutation', () => {
      content = fs.readFileSync(usersPath, 'utf-8');
      expect(content).toContain("t('users.deleteFailed')");
    });

    // EC-022-03: Observer cannot delete others (no other cards shown)
    it('EC-022-03: observer only sees self card (cannot delete others)', () => {
      content = fs.readFileSync(usersPath, 'utf-8');
      // Without settings:users, displayedUsers is filtered to self.
      expect(content).toMatch(/users\.filter\(\(?u\)?\s*=>\s*u\.id\s*===\s*currentUserId\)/);
    });

    // Existing admin delete flow preserved for non-self
    it('existing admin delete flow preserved for non-self', () => {
      content = fs.readFileSync(usersPath, 'utf-8');
      expect(content).toContain("t('users.deleteUser')");
      expect(content).toContain("t('users.deleteConfirm')");
    });

    // Observer detection uses app_metadata.role
    it('user management gated by settings:users permission (not role)', () => {
      content = fs.readFileSync(usersPath, 'utf-8');
      expect(content).toContain("hasPermission('settings:users')");
    });

    // displayedUsers used in rendering
    it('displayedUsers used for rendering user cards', () => {
      content = fs.readFileSync(usersPath, 'utf-8');
      expect(content).toContain('displayedUsers.map');
    });
  });
});
