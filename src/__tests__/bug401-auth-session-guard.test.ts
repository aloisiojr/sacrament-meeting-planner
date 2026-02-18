/**
 * QA Tests for BUG-401: Fix Systemic HTTP 401 on All Authenticated Edge Functions
 *
 * Covers:
 * - STEP-01: Session validation guard in callEdgeFunction (ADR-024)
 * - STEP-02: useQuery enabled guard with !!session (ADR-025)
 * - STEP-03: Existing error handling preserved (retry button, i18n)
 * - STEP-04: All 4 authenticated EF calls routed through callEdgeFunction
 * - CR-76 compatibility: Manual auth header NOT present, error extraction preserved (ADR-022)
 *
 * ACs covered: AC-1..AC-7
 * ECs covered: EC-1..EC-5
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function readSourceFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf-8');
}

/**
 * Extracts the body of callEdgeFunction from users.tsx source.
 * Returns only the function body to scope assertions tightly.
 */
function extractCallEdgeFunctionBody(source: string): string {
  const funcStart = source.indexOf('async function callEdgeFunction');
  if (funcStart === -1) throw new Error('callEdgeFunction not found in source');
  // Find the end of the function: track brace depth
  let braceDepth = 0;
  let funcEnd = -1;
  for (let i = source.indexOf('{', funcStart); i < source.length; i++) {
    if (source[i] === '{') braceDepth++;
    if (source[i] === '}') braceDepth--;
    if (braceDepth === 0) {
      funcEnd = i + 1;
      break;
    }
  }
  return source.slice(funcStart, funcEnd);
}

describe('BUG-401: Fix Systemic HTTP 401 on Authenticated Edge Functions', () => {
  // ---------------------------------------------------------------
  // STEP-01: Session validation guard in callEdgeFunction (ADR-024)
  // ---------------------------------------------------------------
  describe('STEP-01: Session validation guard in callEdgeFunction (ADR-024)', () => {
    it('should call supabase.auth.getSession() inside callEdgeFunction', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      const callEFBody = extractCallEdgeFunctionBody(source);
      expect(callEFBody).toContain('supabase.auth.getSession()');
    });

    it('should destructure session from getSession() result', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      const callEFBody = extractCallEdgeFunctionBody(source);
      expect(callEFBody).toContain('{ session }');
    });

    it('should throw Error with auth/no-session when session is null', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      const callEFBody = extractCallEdgeFunctionBody(source);
      expect(callEFBody).toContain("throw new Error('auth/no-session')");
    });

    it('should check !session before throwing', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      const callEFBody = extractCallEdgeFunctionBody(source);
      expect(callEFBody).toContain('if (!session)');
    });

    it('should call getSession() BEFORE invoke() in the function body', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      const callEFBody = extractCallEdgeFunctionBody(source);
      const getSessionIdx = callEFBody.indexOf('supabase.auth.getSession()');
      const invokeIdx = callEFBody.indexOf('supabase.functions.invoke');
      expect(getSessionIdx).toBeGreaterThan(-1);
      expect(invokeIdx).toBeGreaterThan(-1);
      expect(getSessionIdx).toBeLessThan(invokeIdx);
    });

    it('should have the session guard BEFORE the invoke call with no-session check in between', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      const callEFBody = extractCallEdgeFunctionBody(source);
      const noSessionIdx = callEFBody.indexOf("'auth/no-session'");
      const invokeIdx = callEFBody.indexOf('supabase.functions.invoke');
      expect(noSessionIdx).toBeGreaterThan(-1);
      expect(noSessionIdx).toBeLessThan(invokeIdx);
    });

    it('should include ADR-024 comment referencing session guard', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      const callEFBody = extractCallEdgeFunctionBody(source);
      expect(callEFBody).toContain('ADR-024');
    });

    it('should NOT use getSession result to extract access_token (that was the CR-76 bug)', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      const callEFBody = extractCallEdgeFunctionBody(source);
      expect(callEFBody).not.toContain('access_token');
      expect(callEFBody).not.toContain('session?.access_token');
    });
  });

  // ---------------------------------------------------------------
  // STEP-02: useQuery enabled guard with !!session (ADR-025)
  // ---------------------------------------------------------------
  describe('STEP-02: useQuery enabled guard with !!session (ADR-025)', () => {
    it('should destructure session from useAuth()', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      // Check that useAuth() destructure includes session
      expect(source).toContain('session');
      // More specifically, check the useAuth line
      const useAuthLine = source.split('\n').find((line: string) =>
        line.includes('useAuth()') && line.includes('session')
      );
      expect(useAuthLine).toBeDefined();
    });

    it('should include session in useAuth destructure alongside currentUser', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain('const { user: currentUser, session, userName } = useAuth()');
    });

    it('should include enabled: !!session in useQuery options', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain('enabled: !!session');
    });

    it('should have enabled option in the same useQuery that fetches users', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      // Find the useQuery block by tracking brace depth from useQuery({
      const useQueryStart = source.indexOf('useQuery({');
      let braceDepth = 0;
      let useQueryEnd = -1;
      for (let i = source.indexOf('{', useQueryStart); i < source.length; i++) {
        if (source[i] === '{') braceDepth++;
        if (source[i] === '}') braceDepth--;
        if (braceDepth === 0) {
          useQueryEnd = i + 1;
          break;
        }
      }
      const useQueryBlock = source.slice(useQueryStart, useQueryEnd);
      expect(useQueryBlock).toContain('userManagementKeys.users');
      expect(useQueryBlock).toContain("callEdgeFunction('list-users'");
      expect(useQueryBlock).toContain('enabled: !!session');
    });
  });

  // ---------------------------------------------------------------
  // STEP-03: Error handling for auth/no-session integrates with UI
  // ---------------------------------------------------------------
  describe('STEP-03: Error handling preserved for auth/no-session', () => {
    it('should show t(users.loadError) on query error (including auth/no-session)', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain("t('users.loadError')");
    });

    it('should have retry button calling refetch() for error recovery', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain('onPress={() => refetch()}');
    });

    it('should show common.retry text on retry button', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain("t('common.retry')");
    });

    it('should have usersError destructured from useQuery for error display', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain('error: usersError');
    });

    it('should conditionally render error view when usersError is truthy', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain('{usersError && (');
    });

    it('should have retryButton and retryButtonText styles', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain('retryButton:');
      expect(source).toContain('retryButtonText:');
    });

    it('should have retry button with accessibilityRole and accessibilityLabel', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      const retryIdx = source.indexOf('onPress={() => refetch()}');
      const nearbySection = source.slice(Math.max(0, retryIdx - 300), retryIdx + 300);
      expect(nearbySection).toContain('accessibilityRole="button"');
      expect(nearbySection).toContain("accessibilityLabel={t('common.retry')}");
    });
  });

  // ---------------------------------------------------------------
  // STEP-04: All 4 authenticated EF calls use callEdgeFunction
  // ---------------------------------------------------------------
  describe('STEP-04: All authenticated Edge Functions routed through callEdgeFunction', () => {
    it('should call callEdgeFunction for list-users in useQuery', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain("callEdgeFunction('list-users'");
    });

    it('should call callEdgeFunction for create-invitation in inviteMutation', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain("callEdgeFunction('create-invitation'");
    });

    it('should call callEdgeFunction for update-user-role in changeRoleMutation', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain("callEdgeFunction('update-user-role'");
    });

    it('should call callEdgeFunction for delete-user in deleteUserMutation', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain("callEdgeFunction('delete-user'");
    });

    it('should NOT have any direct supabase.functions.invoke calls outside callEdgeFunction', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      // Get positions of all supabase.functions.invoke calls
      const invokePattern = 'supabase.functions.invoke';
      const allInvokes: number[] = [];
      let searchIdx = 0;
      while (true) {
        const idx = source.indexOf(invokePattern, searchIdx);
        if (idx === -1) break;
        allInvokes.push(idx);
        searchIdx = idx + invokePattern.length;
      }

      // There should be exactly 1 invoke call (inside callEdgeFunction)
      expect(allInvokes).toHaveLength(1);

      // And it should be inside callEdgeFunction
      const callEFStart = source.indexOf('async function callEdgeFunction');
      const callEFBody = extractCallEdgeFunctionBody(source);
      const callEFEnd = callEFStart + callEFBody.length;
      for (const invokeIdx of allInvokes) {
        expect(invokeIdx).toBeGreaterThan(callEFStart);
        expect(invokeIdx).toBeLessThan(callEFEnd);
      }
    });

    it('should pass email and role params to create-invitation', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain("callEdgeFunction('create-invitation', { email, role })");
    });

    it('should pass targetUserId and newRole params to update-user-role', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain("callEdgeFunction('update-user-role', { targetUserId, newRole })");
    });

    it('should pass targetUserId to delete-user', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain("callEdgeFunction('delete-user', { targetUserId })");
    });
  });

  // ---------------------------------------------------------------
  // CR-76 compatibility: manual auth NOT present, error extraction preserved
  // ---------------------------------------------------------------
  describe('CR-76 compatibility: no manual auth, error extraction preserved (ADR-022)', () => {
    it('should NOT contain getAccessToken function', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).not.toContain('async function getAccessToken');
      expect(source).not.toContain('function getAccessToken');
    });

    it('should NOT pass manual Authorization header to invoke', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      const callEFBody = extractCallEdgeFunctionBody(source);
      expect(callEFBody).not.toContain('Authorization');
      expect(callEFBody).not.toContain('Bearer');
      expect(callEFBody).not.toContain('headers:');
    });

    it('should invoke with only { body } parameter (no headers)', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      const callEFBody = extractCallEdgeFunctionBody(source);
      expect(callEFBody).toContain('supabase.functions.invoke(functionName, {');
      expect(callEFBody).toContain('body,');
      expect(callEFBody).not.toContain('headers:');
    });

    it('should preserve error.context existence check (ADR-022)', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      const callEFBody = extractCallEdgeFunctionBody(source);
      expect(callEFBody).toContain('error.context');
    });

    it('should preserve error.context.json type check (ADR-022)', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      const callEFBody = extractCallEdgeFunctionBody(source);
      expect(callEFBody).toContain("typeof error.context.json === 'function'");
    });

    it('should preserve error.context.json() call (ADR-022)', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      const callEFBody = extractCallEdgeFunctionBody(source);
      expect(callEFBody).toContain('await error.context.json()');
    });

    it('should preserve errorBody?.error extraction (ADR-022)', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      const callEFBody = extractCallEdgeFunctionBody(source);
      expect(callEFBody).toContain('errorBody?.error');
    });

    it('should preserve try/catch around error extraction (ADR-022)', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      const callEFBody = extractCallEdgeFunctionBody(source);
      const tryIdx = callEFBody.indexOf('try {');
      const contextJsonIdx = callEFBody.indexOf('error.context.json()');
      const catchIdx = callEFBody.indexOf('} catch {');
      expect(tryIdx).toBeGreaterThan(-1);
      expect(contextJsonIdx).toBeGreaterThan(tryIdx);
      expect(catchIdx).toBeGreaterThan(contextJsonIdx);
    });

    it('should throw Error with serverMessage fallback to error.message', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      const callEFBody = extractCallEdgeFunctionBody(source);
      expect(callEFBody).toContain('throw new Error(serverMessage || error.message)');
    });

    it('should declare serverMessage with string | undefined type', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      const callEFBody = extractCallEdgeFunctionBody(source);
      expect(callEFBody).toContain('let serverMessage: string | undefined');
    });
  });

  // ---------------------------------------------------------------
  // Supabase client configuration (resilientStorage, autoRefreshToken)
  // ---------------------------------------------------------------
  describe('Supabase client configuration for session management', () => {
    it('should have autoRefreshToken: true in supabase client config', () => {
      const source = readSourceFile('lib/supabase.ts');
      expect(source).toContain('autoRefreshToken: true');
    });

    it('should have persistSession: true in supabase client config', () => {
      const source = readSourceFile('lib/supabase.ts');
      expect(source).toContain('persistSession: true');
    });

    it('should use resilientStorage adapter for session persistence', () => {
      const source = readSourceFile('lib/supabase.ts');
      expect(source).toContain('storage: resilientStorage');
    });

    it('resilientStorage.getItem should catch errors and return null', () => {
      const source = readSourceFile('lib/supabase.ts');
      expect(source).toContain('getItem: async');
      expect(source).toContain('AsyncStorage.getItem(key)');
      // Should have try/catch that returns null on error
      const getItemStart = source.indexOf('getItem: async');
      const setItemStart = source.indexOf('setItem: async');
      const getItemBody = source.slice(getItemStart, setItemStart);
      expect(getItemBody).toContain('catch');
      expect(getItemBody).toContain('return null');
    });

    it('resilientStorage.setItem should catch errors silently', () => {
      const source = readSourceFile('lib/supabase.ts');
      expect(source).toContain('setItem: async');
      expect(source).toContain('AsyncStorage.setItem(key, value)');
    });

    it('resilientStorage.removeItem should catch errors silently', () => {
      const source = readSourceFile('lib/supabase.ts');
      expect(source).toContain('removeItem: async');
      expect(source).toContain('AsyncStorage.removeItem(key)');
    });
  });

  // ---------------------------------------------------------------
  // AuthContext session exposure (used by useQuery enabled guard)
  // ---------------------------------------------------------------
  describe('AuthContext exposes session for component guards', () => {
    it('should define session in AuthContext type/interface', () => {
      const source = readSourceFile('contexts/AuthContext.tsx');
      expect(source).toContain('session');
    });

    it('should have session state managed via useState', () => {
      const source = readSourceFile('contexts/AuthContext.tsx');
      expect(source).toContain('useState<Session | null>');
    });

    it('should call supabase.auth.getSession() on mount to hydrate session', () => {
      const source = readSourceFile('contexts/AuthContext.tsx');
      expect(source).toContain('supabase.auth.getSession()');
    });

    it('should expose session in the context value object', () => {
      const source = readSourceFile('contexts/AuthContext.tsx');
      // Look for session in the value memo/object
      const valueIdx = source.indexOf('session,');
      expect(valueIdx).toBeGreaterThan(-1);
    });
  });

  // ---------------------------------------------------------------
  // Mutation error handlers still functional
  // ---------------------------------------------------------------
  describe('Mutation error handlers preserved', () => {
    it('changeRoleMutation should check err?.message for cannot_change_own_role', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain("msg === 'cannot_change_own_role'");
      expect(source).toContain("t('users.cannotChangeOwnRole')");
    });

    it('deleteUserMutation should check err?.message for cannot_delete_self', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain("msg === 'cannot_delete_self'");
      expect(source).toContain("t('users.cannotDeleteSelf')");
    });

    it('inviteMutation should show t(users.inviteFailed) on error', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain("t('users.inviteFailed')");
    });

    it('changeRoleMutation should show t(users.roleChangeFailed) for generic errors', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain("t('users.roleChangeFailed')");
    });

    it('deleteUserMutation should show t(users.deleteFailed) for generic errors', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain("t('users.deleteFailed')");
    });
  });

  // ---------------------------------------------------------------
  // Complete callEdgeFunction structure verification
  // ---------------------------------------------------------------
  describe('callEdgeFunction complete structure', () => {
    it('should accept functionName: string and body: Record<string, unknown> params', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      const callEFBody = extractCallEdgeFunctionBody(source);
      expect(callEFBody).toContain('functionName: string');
      expect(callEFBody).toContain('body: Record<string, unknown>');
    });

    it('should be an async function', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain('async function callEdgeFunction');
    });

    it('should return data on success', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      const callEFBody = extractCallEdgeFunctionBody(source);
      expect(callEFBody).toContain('return data');
    });

    it('should follow the order: session guard -> invoke -> error extraction -> return data', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      const callEFBody = extractCallEdgeFunctionBody(source);

      const sessionGuardIdx = callEFBody.indexOf('supabase.auth.getSession()');
      const noSessionIdx = callEFBody.indexOf("'auth/no-session'");
      const invokeIdx = callEFBody.indexOf('supabase.functions.invoke');
      const errorCheckIdx = callEFBody.indexOf('if (error)');
      const returnIdx = callEFBody.lastIndexOf('return data');

      // All elements must exist
      expect(sessionGuardIdx).toBeGreaterThan(-1);
      expect(noSessionIdx).toBeGreaterThan(-1);
      expect(invokeIdx).toBeGreaterThan(-1);
      expect(errorCheckIdx).toBeGreaterThan(-1);
      expect(returnIdx).toBeGreaterThan(-1);

      // Order must be correct
      expect(sessionGuardIdx).toBeLessThan(noSessionIdx);
      expect(noSessionIdx).toBeLessThan(invokeIdx);
      expect(invokeIdx).toBeLessThan(errorCheckIdx);
      expect(errorCheckIdx).toBeLessThan(returnIdx);
    });
  });
});
