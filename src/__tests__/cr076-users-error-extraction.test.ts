/**
 * QA Tests for CR-76: Fix Users Screen Edge Function Error (Regression CR-64)
 *
 * Covers:
 * - STEP-01: Verify Edge Function and RPC code correctness
 * - STEP-02: callEdgeFunction error extraction from FunctionsHttpError.context
 * - Existing UI error handling (retry button, i18n messages)
 * - changeRoleMutation and deleteUserMutation onError guards
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

function readMigration(migrationName: string): string {
  return fs.readFileSync(
    path.resolve(__dirname, '../../supabase/migrations', migrationName),
    'utf-8'
  );
}

describe('CR-76: Fix Users Screen Edge Function Error', () => {
  // ---------------------------------------------------------------
  // STEP-01: Verify Edge Function code correctness
  // ---------------------------------------------------------------
  describe('STEP-01: list-users Edge Function code correctness', () => {
    it('should include secretary in allowed roles', () => {
      const source = readEdgeFunction('list-users');
      expect(source).toContain("['bishopric', 'secretary'].includes(userRole)");
    });

    it('should call list_ward_users RPC with target_ward_id', () => {
      const source = readEdgeFunction('list-users');
      expect(source).toContain("rpc('list_ward_users'");
      expect(source).toContain('target_ward_id: wardId');
    });

    it('should return users array with nullish coalescing', () => {
      const source = readEdgeFunction('list-users');
      expect(source).toContain('{ users: wardUsers ?? [] }');
    });

    it('should return 403 with Insufficient permissions for unauthorized roles', () => {
      const source = readEdgeFunction('list-users');
      expect(source).toContain('Insufficient permissions');
    });

    it('should return 500 with Failed to list users on RPC error', () => {
      const source = readEdgeFunction('list-users');
      expect(source).toContain('Failed to list users');
    });
  });

  // ---------------------------------------------------------------
  // STEP-01: Verify list_ward_users RPC migration correctness
  // ---------------------------------------------------------------
  describe('STEP-01: list_ward_users RPC migration correctness', () => {
    it('should define list_ward_users function with target_ward_id uuid parameter', () => {
      const source = readMigration('006_list_ward_users_rpc.sql');
      expect(source).toContain('CREATE OR REPLACE FUNCTION list_ward_users(target_ward_id uuid)');
    });

    it('should use SECURITY DEFINER for elevated access to auth.users', () => {
      const source = readMigration('006_list_ward_users_rpc.sql');
      expect(source).toContain('SECURITY DEFINER');
    });

    it('should return id, email, role, and created_at columns', () => {
      const source = readMigration('006_list_ward_users_rpc.sql');
      expect(source).toContain('id uuid');
      expect(source).toContain('email text');
      expect(source).toContain('role text');
      expect(source).toContain('created_at timestamptz');
    });

    it('should query auth.users filtering by ward_id in app_metadata', () => {
      const source = readMigration('006_list_ward_users_rpc.sql');
      expect(source).toContain("raw_app_meta_data->>'ward_id'");
      expect(source).toContain('target_ward_id::text');
    });

    it('should default role to observer via COALESCE', () => {
      const source = readMigration('006_list_ward_users_rpc.sql');
      expect(source).toContain("COALESCE(u.raw_app_meta_data->>'role', 'observer')");
    });
  });

  // ---------------------------------------------------------------
  // STEP-02: callEdgeFunction error extraction logic
  // ---------------------------------------------------------------
  describe('STEP-02: callEdgeFunction error extraction from FunctionsHttpError.context', () => {
    it('should check for error.context existence', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain('error.context');
    });

    it('should check error.context.json is a function before calling it', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain("typeof error.context.json === 'function'");
    });

    it('should call error.context.json() to extract response body', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain('await error.context.json()');
    });

    it('should extract the error field from the response body JSON', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain('errorBody?.error');
    });

    it('should have try/catch around the context extraction', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      // Verify that the error.context.json() call is inside a try block
      const tryIdx = source.indexOf('try {');
      const contextJsonIdx = source.indexOf('error.context.json()');
      const catchIdx = source.indexOf('} catch {');
      expect(tryIdx).toBeGreaterThan(-1);
      expect(contextJsonIdx).toBeGreaterThan(tryIdx);
      expect(catchIdx).toBeGreaterThan(contextJsonIdx);
    });

    it('should throw new Error with serverMessage falling back to error.message', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain('throw new Error(serverMessage || error.message)');
    });

    it('should declare serverMessage variable with undefined initial value', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain('let serverMessage: string | undefined');
    });
  });

  // ---------------------------------------------------------------
  // Existing UI error handling (verify still works after fix)
  // ---------------------------------------------------------------
  describe('UI error handling elements still present', () => {
    it('should show t(users.loadError) on query error', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain("t('users.loadError')");
    });

    it('should have retry button that calls refetch()', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain('onPress={() => refetch()}');
    });

    it('should show t(common.retry) on retry button', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain("t('common.retry')");
    });

    it('should destructure usersError and refetch from useQuery', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain('error: usersError');
      expect(source).toContain('refetch,');
    });
  });

  // ---------------------------------------------------------------
  // Mutation onError handlers still check err.message
  // ---------------------------------------------------------------
  describe('Mutation onError handlers still use err.message', () => {
    it('changeRoleMutation onError checks err?.message for cannot_change_own_role', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain("err?.message || err?.context?.body?.error");
      expect(source).toContain("msg === 'cannot_change_own_role'");
    });

    it('deleteUserMutation onError checks err?.message for cannot_delete_self', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain("msg === 'cannot_delete_self'");
    });
  });
});
