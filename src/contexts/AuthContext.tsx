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
import { changeLanguage, getCurrentLanguage, SUPPORTED_LANGUAGES, type SupportedLanguage } from '../i18n';
import type { Session, User } from '@supabase/supabase-js';
import type { Role, Permission } from '../types/database';

// --- Types ---

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  role: Role;
  wardId: string;
  userName: string;
  wardLanguage: string;
  loading: boolean;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  hasPermission(perm: Permission): boolean;
  updateAppLanguage(lang: string): Promise<void>;
}

// --- Context ---

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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

/**
 * Extract full_name from Supabase user app_metadata.
 * Returns empty string if not set.
 */
function extractUserName(user: User | null): string {
  if (!user) return '';
  return user.app_metadata?.full_name ?? '';
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [wardLanguage, setWardLanguage] = useState<string>('pt-BR');

  // Derive user, role, wardId, and userName from session
  const user = session?.user ?? null;
  const role = extractRole(user);
  const wardId = extractWardId(user);
  const userName = extractUserName(user);

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

  // F116 (CR-178): App language from user_metadata, ward language stored separately
  // Language priority: user_metadata.language -> device locale -> ward language fallback
  useEffect(() => {
    if (!wardId) return;

    // Fetch ward language and store it (for ward-level features like collections)
    supabase
      .from('wards')
      .select('language')
      .eq('id', wardId)
      .single()
      .then(({ data }) => {
        const lang = data?.language;
        if (lang && SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)) {
          setWardLanguage(lang);
        } else {
          setWardLanguage('pt-BR');
        }

        // Determine app language: user_metadata > device locale > ward language
        const userLang = user?.user_metadata?.language as string | undefined;
        if (userLang && SUPPORTED_LANGUAGES.includes(userLang as SupportedLanguage)) {
          // User has explicit app language preference
          changeLanguage(userLang as SupportedLanguage);
        }
        // If no user_metadata language, keep i18n's device locale detection (from i18n/index.ts init)
        // which already ran at module load. If device locale is not supported, fallback to ward language.
        else {
          const currentLang = getCurrentLanguage();
          // getCurrentLanguage returns whatever i18n detected at init (device locale or pt-BR fallback)
          // If device locale was detected and is supported, keep it. Otherwise use ward language.
          if (!SUPPORTED_LANGUAGES.includes(currentLang as SupportedLanguage)) {
            const wardLangSafe = (lang && SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage))
              ? lang as SupportedLanguage
              : 'pt-BR';
            changeLanguage(wardLangSafe);
          }
        }
      });
  }, [wardId, user]);

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

  // F116: Update app language in user_metadata and i18n
  const updateAppLanguage = useCallback(async (lang: string) => {
    const { error } = await supabase.auth.updateUser({
      data: { language: lang },
    });
    if (error) throw error;
    changeLanguage(lang as SupportedLanguage);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      role,
      wardId,
      userName,
      wardLanguage,
      loading,
      signIn,
      signOut,
      hasPermission,
      updateAppLanguage,
    }),
    [session, user, role, wardId, userName, wardLanguage, loading, signIn, signOut, hasPermission, updateAppLanguage]
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
