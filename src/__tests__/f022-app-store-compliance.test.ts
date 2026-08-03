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
        'You are the only member of this Ward. Deleting your account will permanently delete the entire Ward and all associated data. Do you want to continue?'
      );
      expect(esLA.users.deleteAccountLastMemberWarning).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // delete-user edge function
  // ---------------------------------------------------------------------------
  // The 'delete-user edge function' block that lived here was deleted. It was 17 readFileSync +
  // toContain assertions against the function's own source — e.g. expecting the literal
  // "callerRole !== 'bishopric'" to appear somewhere in the file. That cannot distinguish an
  // authorization check from an inverted one, and this is the endpoint that hard-deletes an auth
  // user and, for a last member, the entire ward.
  //
  // edge-delete-user.test.ts now EXECUTES the function: a virtual mock supplies its URL import and
  // a stubbed Deno.serve captures the handler, which is then driven with real Request objects.
  // Mutation-verified — removing the bishopric check, removing the ward-match check, shifting the
  // last-member threshold, skipping pagination, or counting other wards' users each fail a test.

  // ---------------------------------------------------------------------------
  // Settings index — Users permission gate removal
  // ---------------------------------------------------------------------------
  // The 'settings index Users gate' and 'users screen self-deletion' blocks that lived here were
  // deleted. They were ~20 readFileSync + toContain assertions against the source text of
  // settings/index.tsx and settings/users.tsx: they could not distinguish a working screen from a
  // broken one, and they went red for refactors that changed nothing observable.
  //
  // Every claim they made is now asserted by rendering the real screens:
  //   settings-role-matrix.test.tsx     — the Users entry is NOT gated on settings:users, IS gated
  //                                       on connectivity, and pushes /(tabs)/settings/users
  //   users-screen-role-gates.test.tsx  — Delete My Account renders for self; the last-member vs
  //                                       ordinary confirmation; the deleteAccountTitle dialog;
  //                                       sign-out after self-deletion with no success alert;
  //                                       observer sees only their own card and no invite button;
  //                                       no role selector on your own card.
});
