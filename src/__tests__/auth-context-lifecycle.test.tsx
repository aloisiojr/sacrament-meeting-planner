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
const mockSignInWithPassword = jest.fn();
const mockSignOut = jest.fn();
const mockUpdateUser = jest.fn();
const mockChangeLanguage = jest.fn();
/** What i18n detected at init — the middle rung of the language priority chain. */
const mockDetectedLanguage = { value: 'pt-BR' };

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
        signInWithPassword: (...a: unknown[]) => mockSignInWithPassword(...a),
        signOut: (...a: unknown[]) => mockSignOut(...a),
        updateUser: (...a: unknown[]) => mockUpdateUser(...a),
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
  changeLanguage: (...a: unknown[]) => mockChangeLanguage(...a),
  getCurrentLanguage: () => mockDetectedLanguage.value,
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

function makeSession(
  appMetadata: Record<string, unknown>,
  userMetadata: Record<string, unknown> = {}
) {
  return { user: { id: 'u1', app_metadata: appMetadata, user_metadata: userMetadata } };
}

/** Exposes the context's action functions to the test. */
const actionsRef: { current: ReturnType<typeof useAuth> | null } = { current: null };

function ActionProbe() {
  const auth = useAuth();
  React.useEffect(() => {
    actionsRef.current = auth;
  }, [auth]);
  return <Text testID="actions">ready</Text>;
}

async function renderActions(session: unknown = makeSession({ role: 'bishopric', ward_id: 'w1' })) {
  mockAuthState.initialSession = session;
  await render(
    <AuthProvider>
      <ActionProbe />
    </AuthProvider>
  );
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
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
  actionsRef.current = null;
  mockChangeLanguage.mockReset();
  mockDetectedLanguage.value = 'pt-BR';
  mockSignInWithPassword.mockReset();
  mockSignInWithPassword.mockResolvedValue({ error: null });
  mockSignOut.mockReset();
  mockSignOut.mockResolvedValue({ error: null });
  mockUpdateUser.mockReset();
  mockUpdateUser.mockResolvedValue({ error: null });
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

describe('AuthProvider — app language priority: user preference > device locale > ward', () => {
  // The whole chain ran on every bootstrap but nothing asserted its OUTCOME, so any of its three
  // rungs could be reordered or deleted without a test noticing.

  it('an explicit user preference wins over both the device locale and the ward', async () => {
    mockWardLanguage.value = 'es-LA';
    mockDetectedLanguage.value = 'en-US';
    mockAuthState.initialSession = makeSession(
      { role: 'bishopric', ward_id: 'w1' },
      { language: 'pt-BR' }
    );
    await renderProvider();

    expect(mockChangeLanguage).toHaveBeenCalledWith('pt-BR');
  });

  it('ignores an unsupported user preference and keeps the supported device locale', async () => {
    mockWardLanguage.value = 'es-LA';
    mockDetectedLanguage.value = 'en-US';
    mockAuthState.initialSession = makeSession(
      { role: 'bishopric', ward_id: 'w1' },
      { language: 'fr-FR' }
    );
    await renderProvider();

    // Neither the bogus preference nor a needless switch away from what i18n already detected.
    expect(mockChangeLanguage).not.toHaveBeenCalled();
  });

  it('leaves a supported device locale alone when the user has no preference', async () => {
    mockWardLanguage.value = 'es-LA';
    mockDetectedLanguage.value = 'pt-BR';
    mockAuthState.initialSession = makeSession({ role: 'bishopric', ward_id: 'w1' });
    await renderProvider();

    expect(mockChangeLanguage).not.toHaveBeenCalled();
  });

  it('falls back to the ward language when the device locale is unsupported', async () => {
    mockWardLanguage.value = 'es-LA';
    mockDetectedLanguage.value = 'ja-JP';
    mockAuthState.initialSession = makeSession({ role: 'bishopric', ward_id: 'w1' });
    await renderProvider();

    expect(mockChangeLanguage).toHaveBeenCalledWith('es-LA');
  });

  it('falls back to en-US when neither the device locale nor the ward language is supported', async () => {
    mockWardLanguage.value = 'fr-FR';
    mockDetectedLanguage.value = 'ja-JP';
    mockAuthState.initialSession = makeSession({ role: 'bishopric', ward_id: 'w1' });
    await renderProvider();

    expect(mockChangeLanguage).toHaveBeenCalledWith('en-US');
  });

  it('does not query the ward at all before a ward is known', async () => {
    // `if (!wardId) return` — a signed-out visitor must not trigger a ward lookup or a language
    // switch.
    await renderProvider();
    expect(mockChangeLanguage).not.toHaveBeenCalled();
  });
});

describe('AuthProvider — signIn', () => {
  it('passes the credentials straight through', async () => {
    await renderActions();
    await act(async () => {
      await actionsRef.current?.signIn('bishop@ward.org', 'secret123');
    });

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'bishop@ward.org',
      password: 'secret123',
    });
  });

  it('rethrows the server error instead of resolving as if it worked', async () => {
    // The login screen decides what to show from this rejection. Swallowing it would leave the
    // user staring at an unchanged form with no explanation.
    const denial = { message: 'Invalid login credentials' };
    mockSignInWithPassword.mockResolvedValue({ error: denial });
    await renderActions();

    await expect(actionsRef.current?.signIn('a@b.c', 'wrong')).rejects.toBe(denial);
  });
});

describe('AuthProvider — signOut', () => {
  it('calls through to supabase', async () => {
    await renderActions();
    await act(async () => {
      await actionsRef.current?.signOut();
    });

    expect(mockSignOut).toHaveBeenCalled();
  });

  it('rethrows a failed sign-out rather than pretending the user is out', async () => {
    // Reporting success on a failed sign-out is the dangerous direction: the session survives
    // while the UI says it is gone.
    const failure = { message: 'network' };
    mockSignOut.mockResolvedValue({ error: failure });
    await renderActions();

    await expect(actionsRef.current?.signOut()).rejects.toBe(failure);
  });
});

describe('AuthProvider — updateAppLanguage', () => {
  it('persists the choice to user_metadata and applies it', async () => {
    await renderActions();
    mockChangeLanguage.mockReset();

    await act(async () => {
      await actionsRef.current?.updateAppLanguage('es-LA');
    });

    expect(mockUpdateUser).toHaveBeenCalledWith({ data: { language: 'es-LA' } });
    expect(mockChangeLanguage).toHaveBeenCalledWith('es-LA');
  });

  it('does not switch the UI when persisting failed', async () => {
    // Changing the UI on a failed write would silently disagree with what the next launch shows.
    mockUpdateUser.mockResolvedValue({ error: { message: 'boom' } });
    await renderActions();
    mockChangeLanguage.mockReset();

    await expect(actionsRef.current?.updateAppLanguage('es-LA')).rejects.toMatchObject({
      message: 'boom',
    });
    expect(mockChangeLanguage).not.toHaveBeenCalled();
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
