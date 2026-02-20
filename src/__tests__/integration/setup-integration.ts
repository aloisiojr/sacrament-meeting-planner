/**
 * Shared integration test infrastructure.
 * Provides TestWrapper, mock factories, and Supabase mock helpers.
 *
 * IMPORTANT: This file does NOT call vi.mock(). Each test file must
 * call its own vi.mock() at the top level (ADR-059).
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext, type AuthContextValue } from '../../contexts/AuthContext';
import { hasPermission as checkPermission } from '../../lib/permissions';
import { vi } from 'vitest';
import type {
  MeetingActor,
  Member,
  Speech,
  Hymn,
  SundayAgenda,
  SundayException,
  WardTopic,
  ActivityLog,
  Role,
  Permission,
} from '../../types/database';

// ---------------------------------------------------------------------------
// 1. createTestQueryClient
// ---------------------------------------------------------------------------

/**
 * Creates a QueryClient optimized for deterministic tests:
 * - retry: false (no automatic retries)
 * - gcTime: 0 (garbage collect immediately)
 * - staleTime: 0 (always stale, always refetch)
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

// ---------------------------------------------------------------------------
// 2. createMockAuthContext
// ---------------------------------------------------------------------------

const MOCK_USER = {
  id: 'user-1',
  email: 'test@test.com',
  app_metadata: {
    role: 'bishopric' as Role,
    ward_id: 'ward-1',
    full_name: 'Test User',
  },
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2026-01-01T00:00:00Z',
} as any;

const MOCK_SESSION = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: MOCK_USER,
} as any;

/**
 * Factory that returns an AuthContextValue with sensible defaults.
 * Accepts partial overrides to customize any field.
 */
export function createMockAuthContext(overrides?: Partial<AuthContextValue>): AuthContextValue {
  const role = (overrides?.role ?? 'bishopric') as Role;
  return {
    session: MOCK_SESSION,
    user: MOCK_USER,
    role,
    wardId: 'ward-1',
    userName: 'Test User',
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    hasPermission: (perm: Permission) => checkPermission(role, perm),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 3. TestWrapper
// ---------------------------------------------------------------------------

interface TestWrapperProps {
  children: React.ReactNode;
  authOverrides?: Partial<AuthContextValue>;
  queryClient?: QueryClient;
}

/**
 * React component wrapping children in QueryClientProvider + AuthContext.Provider.
 * Creates a fresh QueryClient per render (unless one is provided).
 * Uses mock AuthContext (not real AuthProvider) to avoid side effects.
 */
export function TestWrapper({ children, authOverrides, queryClient }: TestWrapperProps) {
  const client = queryClient ?? createTestQueryClient();
  const authValue = createMockAuthContext(authOverrides);

  return React.createElement(
    QueryClientProvider,
    { client },
    React.createElement(
      AuthContext.Provider,
      { value: authValue },
      children
    )
  );
}

/**
 * Creates a wrapper function suitable for renderHook's `wrapper` option.
 * Optionally takes a specific QueryClient for cache inspection.
 */
export function createWrapper(
  authOverrides?: Partial<AuthContextValue>,
  queryClient?: QueryClient
) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return TestWrapper({ children, authOverrides, queryClient });
  };
}

// ---------------------------------------------------------------------------
// 4. mockSupabaseFrom - Chainable Supabase mock
// ---------------------------------------------------------------------------

/**
 * Configures the mocked supabase.from() to return a chainable query builder
 * that resolves with the given response.
 *
 * Usage:
 *   mockSupabaseFrom('meeting_actors', { data: [...], error: null });
 *   // Now supabase.from('meeting_actors').select('*').eq(...) will resolve with data
 *
 * @param supabaseMock - The mocked supabase module (vi.mocked)
 * @param table - Table name to intercept
 * @param response - The { data, error } to resolve with
 */
export function mockSupabaseFrom(
  supabaseMock: any,
  table: string,
  response: { data: any; error: any }
) {
  const createChain = () => {
    const resolvedPromise = Promise.resolve(response);

    const chain: any = new Proxy(
      {},
      {
        get(_target, prop: string) {
          // Make it thenable so `await` works on the chain directly
          if (prop === 'then') {
            return resolvedPromise.then.bind(resolvedPromise);
          }
          if (prop === 'catch') {
            return resolvedPromise.catch.bind(resolvedPromise);
          }
          if (prop === 'finally') {
            return resolvedPromise.finally.bind(resolvedPromise);
          }
          // All chain methods return the chain itself
          return (..._args: any[]) => chain;
        },
      }
    );

    return chain;
  };

  supabaseMock.from.mockImplementation((requestedTable: string) => {
    if (requestedTable === table) {
      return createChain();
    }
    // Default: return a chain that resolves with empty data
    return createChainWithDefault();
  });
}

/**
 * Configures supabase.from() to handle multiple tables at once.
 */
export function mockSupabaseFromMultiple(
  supabaseMock: any,
  tableResponses: Record<string, { data: any; error: any }>
) {
  supabaseMock.from.mockImplementation((requestedTable: string) => {
    const response = tableResponses[requestedTable];
    if (response) {
      return createChainFor(response);
    }
    return createChainWithDefault();
  });
}

function createChainFor(response: { data: any; error: any }) {
  const resolvedPromise = Promise.resolve(response);

  const chain: any = new Proxy(
    {},
    {
      get(_target, prop: string) {
        if (prop === 'then') return resolvedPromise.then.bind(resolvedPromise);
        if (prop === 'catch') return resolvedPromise.catch.bind(resolvedPromise);
        if (prop === 'finally') return resolvedPromise.finally.bind(resolvedPromise);
        return (..._args: any[]) => chain;
      },
    }
  );

  return chain;
}

function createChainWithDefault() {
  return createChainFor({ data: null, error: null });
}

// ---------------------------------------------------------------------------
// 5. createMockSupabaseAuth
// ---------------------------------------------------------------------------

interface MockSupabaseAuthOptions {
  session?: any;
}

/**
 * Factory for mock supabase.auth with getSession, signInWithPassword,
 * signOut, onAuthStateChange.
 *
 * Returns { auth, getAuthChangeCallback } so tests can trigger auth
 * state changes manually.
 */
export function createMockSupabaseAuth(options?: MockSupabaseAuthOptions) {
  let authChangeCallback: ((event: string, session: any) => void) | null = null;

  const auth = {
    getSession: vi.fn().mockResolvedValue({
      data: { session: options?.session ?? MOCK_SESSION },
      error: null,
    }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn((callback: (event: string, session: any) => void) => {
      authChangeCallback = callback;
      return {
        data: {
          subscription: { unsubscribe: vi.fn() },
        },
      };
    }),
  };

  return {
    auth,
    getAuthChangeCallback: () => authChangeCallback,
  };
}

/**
 * Creates a mock session object with customizable fields.
 */
export function createMockSession(overrides?: {
  role?: Role;
  wardId?: string;
  userName?: string;
  userId?: string;
  email?: string;
  language?: string;
}) {
  const user = {
    id: overrides?.userId ?? 'user-1',
    email: overrides?.email ?? 'test@test.com',
    app_metadata: {
      role: overrides?.role ?? 'bishopric',
      ward_id: overrides?.wardId ?? 'ward-1',
      full_name: overrides?.userName ?? 'Test User',
    },
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-01-01T00:00:00Z',
  };

  return {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user,
  };
}

// ---------------------------------------------------------------------------
// 6. Mock Data Factories
// ---------------------------------------------------------------------------

export function createMockActor(overrides?: Partial<MeetingActor>): MeetingActor {
  return {
    id: 'actor-1',
    ward_id: 'ward-1',
    name: 'Test Actor',
    can_preside: false,
    can_conduct: false,
    can_recognize: false,
    can_music: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function createMockMember(overrides?: Partial<Member>): Member {
  return {
    id: 'member-1',
    ward_id: 'ward-1',
    full_name: 'Test Member',
    country_code: '+55',
    phone: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function createMockSpeech(overrides?: Partial<Speech>): Speech {
  return {
    id: 'speech-1',
    ward_id: 'ward-1',
    sunday_date: '2026-03-01',
    position: 1,
    member_id: null,
    speaker_name: null,
    speaker_phone: null,
    topic_title: null,
    topic_link: null,
    topic_collection: null,
    status: 'not_assigned',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function createMockHymn(overrides?: Partial<Hymn>): Hymn {
  return {
    id: 'hymn-1',
    language: 'pt-BR',
    number: 1,
    title: 'Test Hymn',
    is_sacramental: false,
    ...overrides,
  };
}

export function createMockAgenda(overrides?: Partial<SundayAgenda>): SundayAgenda {
  return {
    id: 'agenda-1',
    ward_id: 'ward-1',
    sunday_date: '2026-03-01',
    presiding_name: null,
    presiding_actor_id: null,
    conducting_name: null,
    conducting_actor_id: null,
    recognized_names: null,
    announcements: null,
    pianist_name: null,
    pianist_actor_id: null,
    conductor_name: null,
    conductor_actor_id: null,
    opening_hymn_id: null,
    opening_prayer_member_id: null,
    opening_prayer_name: null,
    sustaining_releasing: null,
    has_baby_blessing: false,
    baby_blessing_names: null,
    has_baptism_confirmation: false,
    baptism_confirmation_names: null,
    has_stake_announcements: false,
    sacrament_hymn_id: null,
    has_special_presentation: false,
    special_presentation_description: null,
    intermediate_hymn_id: null,
    speaker_1_override: null,
    speaker_2_override: null,
    speaker_3_override: null,
    closing_hymn_id: null,
    closing_prayer_member_id: null,
    closing_prayer_name: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function createMockSundayException(
  overrides?: Partial<SundayException>
): SundayException {
  return {
    id: 'exception-1',
    ward_id: 'ward-1',
    date: '2026-03-01',
    reason: 'speeches',
    ...overrides,
  };
}

export function createMockTopic(overrides?: Partial<WardTopic>): WardTopic {
  return {
    id: 'topic-1',
    ward_id: 'ward-1',
    title: 'Test Topic',
    link: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function createMockActivityLog(overrides?: Partial<ActivityLog>): ActivityLog {
  return {
    id: 'log-1',
    ward_id: 'ward-1',
    user_id: 'user-1',
    user_email: 'test@test.com',
    user_name: 'Test User',
    action_type: 'test:action',
    description: 'Test action description',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}
