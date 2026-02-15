import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { supabase } from '../lib/supabase';
import { hasPermission as checkPermission } from '../lib/permissions';
import type { Session, User } from '@supabase/supabase-js';
import type { Role, Permission } from '../types/database';

// --- Types ---

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  role: Role;
  wardId: string;
  loading: boolean;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  hasPermission(perm: Permission): boolean;
}

// --- Context ---

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Extract role from Supabase user app_metadata.
 * Falls back to 'observer' if not set.
 */
function extractRole(user: User | null): Role {
  if (!user) return 'observer';
  const metadata = user.app_metadata;
  const role = metadata?.role;
  if (role === 'bishopric' || role === 'secretary' || role === 'observer') {
    return role;
  }
  return 'observer';
}

/**
 * Extract ward_id from Supabase user app_metadata.
 * Returns empty string if not set.
 */
function extractWardId(user: User | null): string {
  if (!user) return '';
  return user.app_metadata?.ward_id ?? '';
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Derive user, role, and wardId from session
  const user = session?.user ?? null;
  const role = extractRole(user);
  const wardId = extractWardId(user);

  // Listen for auth state changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setLoading(false);
    });

    // Subscribe to auth changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  }, []);

  const hasPermission = useCallback(
    (perm: Permission): boolean => {
      return checkPermission(role, perm);
    },
    [role]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      role,
      wardId,
      loading,
      signIn,
      signOut,
      hasPermission,
    }),
    [session, user, role, wardId, loading, signIn, signOut, hasPermission]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

/**
 * Hook to access the current auth state.
 * Must be used within an AuthProvider.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
