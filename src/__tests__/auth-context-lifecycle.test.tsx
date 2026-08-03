/**
 * Lifecycle tests for AuthProvider — session bootstrap, the auth-state listener, role/ward
 * derivation from app_metadata, and hasPermission.
 *
 * The audit found this file at ~54% with only two tests exercising it for real, most references
 * being `vi.mock`ed away. It is the component that decides what every screen is allowed to do.
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react-native';
import { Text } from 'react-native';

type AuthChangeHandler = (event: string, session: unknown) => void;

const mockAuthState: {
  initialSession: unknown;
  handler: AuthChangeHandler | null;
  unsubscribe: jest.Mock;
} = { initialSession: null, handler: null, unsubscribe: jest.fn() };

const mockQueryClientClear = jest.fn();
const mockWardLanguage: { value: string | null } = { value: 'pt-BR' };

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    get clear() {
      return mockQueryClientClear;
    },
  }),
}));

jest.mock('../lib/supabase', () => ({
  supabase: {
    get auth() {
      return {
        getSession: () =>
          Promise.resolve({ data: { session: mockAuthState.initialSession } }),
        onAuthStateChange: (cb: AuthChangeHandler) => {
          mockAuthState.handler = cb;
          return { data: { subscription: { unsubscribe: mockAuthState.unsubscribe } } };
        },
      };
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { language: mockWardLanguage.value } }),
        }),
      }),
    }),
  },
}));

jest.mock('../i18n', () => ({
  changeLanguage: jest.fn(),
  getCurrentLanguage: () => 'pt-BR',
  SUPPORTED_LANGUAGES: ['pt-BR', 'en-US', 'es-LA'],
}));

import { AuthProvider, useAuth } from '../contexts/AuthContext';

/** Renders the auth state as text so assertions read the real context value. */
function Probe() {
  const { role, wardId, userName, loading, wardLanguage, hasPermission } = useAuth();
  return (
    <Text testID="probe">
      {JSON.stringify({
        role,
        wardId,
        userName,
        loading,
        wardLanguage,
        canAssign: hasPermission('speech:assign'),
        canReadAgenda: hasPermission('agenda:read'),
      })}
    </Text>
  );
}

function probeValue() {
  return JSON.parse(screen.getByTestId('probe').props.children as string);
}

function makeSession(appMetadata: Record<string, unknown>) {
  return { user: { id: 'u1', app_metadata: appMetadata, user_metadata: {} } };
}

async function renderProvider() {
  await render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );
  // Flush getSession + the ward-language query.
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  mockAuthState.initialSession = null;
  mockAuthState.handler = null;
  mockAuthState.unsubscribe = jest.fn();
  mockQueryClientClear.mockReset();
  mockWardLanguage.value = 'pt-BR';
});

describe('AuthProvider — bootstrap', () => {
  it('starts signed out: observer, no ward, loading resolved', async () => {
    await renderProvider();
    const v = probeValue();
    expect(v.role).toBe('observer');
    expect(v.wardId).toBe('');
    expect(v.userName).toBe('');
    expect(v.loading).toBe(false);
  });

  it('derives role, ward and name from the restored session app_metadata', async () => {
    mockAuthState.initialSession = makeSession({
      role: 'bishopric',
      ward_id: 'w1',
      full_name: 'Bishop Silva',
    });
    await renderProvider();

    const v = probeValue();
    expect(v.role).toBe('bishopric');
    expect(v.wardId).toBe('w1');
    expect(v.userName).toBe('Bishop Silva');
  });

  it('falls back to observer when app_metadata carries an unknown role', async () => {
    mockAuthState.initialSession = makeSession({ role: 'superuser', ward_id: 'w1' });
    await renderProvider();
    expect(probeValue().role).toBe('observer');
  });

  it('falls back to observer when app_metadata has no role at all', async () => {
    mockAuthState.initialSession = makeSession({ ward_id: 'w1' });
    await renderProvider();
    expect(probeValue().role).toBe('observer');
  });
});

describe('AuthProvider — permissions follow the role', () => {
  it('bishopric can assign speeches', async () => {
    mockAuthState.initialSession = makeSession({ role: 'bishopric', ward_id: 'w1' });
    await renderProvider();
    expect(probeValue().canAssign).toBe(true);
  });

  it('observer cannot assign speeches but can read the agenda', async () => {
    mockAuthState.initialSession = makeSession({ role: 'observer', ward_id: 'w1' });
    await renderProvider();
    const v = probeValue();
    expect(v.canAssign).toBe(false);
    expect(v.canReadAgenda).toBe(true);
  });

  it('a signed-out visitor has observer permissions, not bishopric ones', async () => {
    await renderProvider();
    expect(probeValue().canAssign).toBe(false);
  });
});

describe('AuthProvider — auth state changes', () => {
  it('SIGNED_IN adopts the new session and its role', async () => {
    await renderProvider();
    expect(probeValue().role).toBe('observer');

    await act(async () => {
      mockAuthState.handler?.('SIGNED_IN', makeSession({ role: 'secretary', ward_id: 'w2' }));
    });

    const v = probeValue();
    expect(v.role).toBe('secretary');
    expect(v.wardId).toBe('w2');
  });

  it('TOKEN_REFRESHED updates the session without clearing the query cache', async () => {
    mockAuthState.initialSession = makeSession({ role: 'bishopric', ward_id: 'w1' });
    await renderProvider();

    await act(async () => {
      mockAuthState.handler?.(
        'TOKEN_REFRESHED',
        makeSession({ role: 'bishopric', ward_id: 'w1', full_name: 'Renewed' })
      );
    });

    expect(probeValue().userName).toBe('Renewed');
    expect(mockQueryClientClear).not.toHaveBeenCalled();
  });

  it('SIGNED_OUT clears the query cache so the next user cannot see the prior one\'s data', async () => {
    mockAuthState.initialSession = makeSession({ role: 'bishopric', ward_id: 'w1' });
    await renderProvider();

    await act(async () => {
      mockAuthState.handler?.('SIGNED_OUT', null);
    });

    expect(mockQueryClientClear).toHaveBeenCalledTimes(1);
    const v = probeValue();
    expect(v.role).toBe('observer');
    expect(v.wardId).toBe('');
  });

  it('a server-revoked session drops privileges immediately', async () => {
    mockAuthState.initialSession = makeSession({ role: 'bishopric', ward_id: 'w1' });
    await renderProvider();
    expect(probeValue().canAssign).toBe(true);

    await act(async () => {
      mockAuthState.handler?.('SIGNED_OUT', null);
    });

    expect(probeValue().canAssign).toBe(false);
  });

  it('unsubscribes the listener on unmount', async () => {
    await render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await act(async () => {
      await Promise.resolve();
    });
    await screen.unmount();
    expect(mockAuthState.unsubscribe).toHaveBeenCalledTimes(1);
  });
});

describe('AuthProvider — ward language', () => {
  it('adopts a supported ward language', async () => {
    mockAuthState.initialSession = makeSession({ role: 'bishopric', ward_id: 'w1' });
    mockWardLanguage.value = 'es-LA';
    await renderProvider();
    expect(probeValue().wardLanguage).toBe('es-LA');
  });

  it('falls back to en-US when the ward language is unsupported', async () => {
    mockAuthState.initialSession = makeSession({ role: 'bishopric', ward_id: 'w1' });
    mockWardLanguage.value = 'fr-FR';
    await renderProvider();
    expect(probeValue().wardLanguage).toBe('en-US');
  });

  it('falls back to en-US when the ward has no language set', async () => {
    mockAuthState.initialSession = makeSession({ role: 'bishopric', ward_id: 'w1' });
    mockWardLanguage.value = null;
    await renderProvider();
    expect(probeValue().wardLanguage).toBe('en-US');
  });
});

describe('useAuth', () => {
  it('throws outside an AuthProvider rather than silently returning undefined', async () => {
    // The provider is what supplies role/permissions; a component rendered outside it must fail
    // loudly instead of defaulting to something permissive.
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(render(<Probe />)).rejects.toThrow(/useAuth must be used within an AuthProvider/);
    spy.mockRestore();
  });
});
