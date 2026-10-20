import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { clearQueue } from '../lib/offlineQueue';
import { CACHE_STORAGE_KEY } from '../lib/queryConfig';
import { hasPermission as checkPermission } from '../lib/permissions';
import { changeLanguage, getCurrentLanguage, SUPPORTED_LANGUAGES, type SupportedLanguage } from '../i18n';
import type { Session, User } from '@supabase/supabase-js';
import type { Role, Permission } from '../types/database';
import { setErrorReporterWardId } from '../lib/errorReporter';

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
  setWardLanguage(lang: string): void;
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
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [wardLanguage, setWardLanguage] = useState<string>('en-US');

  // Derive user, role, wardId, and userName from session
  const user = session?.user ?? null;
  const role = extractRole(user);
  const wardId = extractWardId(user);
  const userName = extractUserName(user);

  // EST-07: o reporter de erros carimba os eventos com a ala corrente.
  useEffect(() => {
    setErrorReporterWardId(wardId || null);
  }, [wardId]);

  // Listen for auth state changes
  useEffect(() => {
    let cancelled = false;
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (cancelled) return;
      setSession(initialSession);
      setLoading(false);
    });

    // Subscribe to auth changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // EST-15: um INITIAL_SESSION nulo pode chegar antes de o getSession resolver (ou
      // depois de uma sessão restaurada); ignorá-lo evita derrubar a sessão e encerrar
      // o loading cedo demais. O getSession é a fonte do estado inicial.
      if (_event === 'INITIAL_SESSION' && !newSession) return;
      // On sign-out (explicit, self-delete, or server-revoked session) drop the query cache so
      // the next user on this device — even in the same ward — can't see the prior user's data.
      // The offline queue and the persisted cache get the same treatment (EST-05): pending writes
      // belong to the user who left, and replaying them under the next session would write one
      // user's edits with another's credentials.
      if (_event === 'SIGNED_OUT') {
        queryClient.clear();
        void clearQueue().catch(() => {
          // Storage failure must not break sign-out; the session is already gone.
        });
        void AsyncStorage.removeItem(CACHE_STORAGE_KEY).catch(() => {});
      }
      setSession(newSession);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
    // queryClient from useQueryClient is stable; the listener should be set up once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // EST-10: primitivas estáveis — refresh de token troca o objeto `user` sem trocar
  // id/idioma, e efeito com dep em objeto refazia fetch e reaplicava o idioma.
  const userId = user?.id;
  const savedLanguage = user?.user_metadata?.language as string | undefined;
  const appliedLanguageRef = useRef<string | null>(null);
  const wardAppliedRef = useRef<string | null>(null);

  // Boot: impõe o idioma salvo em user_metadata assim que a sessão aparece, sem
  // esperar (nem depender de) o fetch da ala.
  useEffect(() => {
    if (!userId || !savedLanguage) return;
    if (!SUPPORTED_LANGUAGES.includes(savedLanguage as SupportedLanguage)) return;
    const key = `${userId}:${savedLanguage}`;
    if (appliedLanguageRef.current === key) return;
    appliedLanguageRef.current = key;
    changeLanguage(savedLanguage as SupportedLanguage);
  }, [userId, savedLanguage]);

  // App language from ward, ward language stored separately.
  // Language priority: user_metadata.language -> device locale -> ward language fallback
  useEffect(() => {
    if (!wardId || !userId) return;
    const fetchKey = `${userId}:${wardId}:${savedLanguage ?? ''}`;
    if (wardAppliedRef.current === fetchKey) return;
    let cancelled = false;

    // Fetch ward language and store it (for ward-level features like collections)
    supabase
      .from('wards')
      .select('language')
      .eq('id', wardId)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        // Erro da ala mantém o idioma (e a linguagem da ala) atuais — cair para
        // en-US por uma falha transitória trocaria o app de idioma sem motivo.
        if (error) return;
        wardAppliedRef.current = fetchKey;
        const lang = data?.language;
        if (lang && SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)) {
          setWardLanguage(lang);
        } else {
          setWardLanguage('en-US');
        }

        // Determine app language: user_metadata > device locale > ward language
        if (savedLanguage && SUPPORTED_LANGUAGES.includes(savedLanguage as SupportedLanguage)) {
          const key = `${userId}:${savedLanguage}`;
          if (appliedLanguageRef.current !== key) {
            appliedLanguageRef.current = key;
            changeLanguage(savedLanguage as SupportedLanguage);
          }
        } else {
          const currentLang = getCurrentLanguage();
          if (!SUPPORTED_LANGUAGES.includes(currentLang as SupportedLanguage)) {
            const wardLangSafe = (lang && SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage))
              ? lang as SupportedLanguage
              : 'en-US';
            const key = `${userId}:${wardLangSafe}`;
            if (appliedLanguageRef.current !== key) {
              appliedLanguageRef.current = key;
              changeLanguage(wardLangSafe);
            }
          }
        }
      });

    return () => {
      cancelled = true;
    };
  }, [wardId, userId, savedLanguage]);

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
      setWardLanguage,
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
