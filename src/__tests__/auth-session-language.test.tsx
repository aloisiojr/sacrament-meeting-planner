/**
 * EST-10/15 — AuthContext: INITIAL_SESSION nulo, idioma de boot, efeito da ala estável.
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react-native';
import { Text } from 'react-native';

type Handler = (event: string, session: unknown) => void;

const mockState: {
  handler: Handler | null;
  getSessionImpl: () => Promise<{ data: { session: unknown } }>;
  wardSingle: jest.Mock;
  changeLanguage: jest.Mock;
  detected: string;
} = {
  handler: null,
  getSessionImpl: () => Promise.resolve({ data: { session: null } }),
  wardSingle: jest.fn(),
  changeLanguage: jest.fn(),
  detected: 'pt-BR',
};

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ clear: jest.fn() }),
}));

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockState.getSessionImpl(),
      onAuthStateChange: (cb: Handler) => {
        mockState.handler = cb;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      },
      signInWithPassword: jest.fn(() => Promise.resolve({ error: null })),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
      updateUser: jest.fn(() => Promise.resolve({ error: null })),
    },
    from: () => ({
      select: () => ({ eq: () => ({ single: () => mockState.wardSingle() }) }),
    }),
  },
}));

jest.mock('../i18n', () => ({
  changeLanguage: (...a: unknown[]) => mockState.changeLanguage(...(a as [])),
  getCurrentLanguage: () => mockState.detected,
  SUPPORTED_LANGUAGES: ['pt-BR', 'en-US', 'es-LA'],
}));

import { AuthProvider, useAuth } from '../contexts/AuthContext';

function Probe() {
  const { role, wardId, loading, wardLanguage } = useAuth();
  return <Text testID="probe">{JSON.stringify({ role, wardId, loading, wardLanguage })}</Text>;
}
const probe = () => JSON.parse(screen.getByTestId('probe').props.children as string);

function session(lang?: string) {
  return {
    user: {
      id: 'u1',
      app_metadata: { role: 'bishopric', ward_id: 'w1' },
      user_metadata: lang ? { language: lang } : {},
    },
  };
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  mockState.handler = null;
  mockState.changeLanguage.mockReset();
  mockState.detected = 'pt-BR';
  mockState.wardSingle.mockReset();
  mockState.wardSingle.mockResolvedValue({ data: { language: 'es-LA' }, error: null });
  mockState.getSessionImpl = () => Promise.resolve({ data: { session: null } });
});

describe('EST-15 — INITIAL_SESSION', () => {
  it('nulo antes do getSession resolver não encerra o loading nem derruba a sessão', async () => {
    let captured!: (v: { data: { session: unknown } }) => void;
    mockState.getSessionImpl = () => new Promise((res) => { captured = res; });
    await render(<AuthProvider><Probe /></AuthProvider>);
    expect(probe().loading).toBe(true);
    await act(async () => { mockState.handler?.('INITIAL_SESSION', null); });
    expect(probe().loading).toBe(true);
    await act(async () => { captured({ data: { session: session() } }); await Promise.resolve(); });
    await flush();
    expect(probe()).toMatchObject({ loading: false, role: 'bishopric', wardId: 'w1' });
    // E depois de restaurada, outro INITIAL_SESSION nulo também não derruba.
    await act(async () => { mockState.handler?.('INITIAL_SESSION', null); });
    expect(probe()).toMatchObject({ role: 'bishopric', wardId: 'w1' });
  });
});

describe('EST-10 — idioma', () => {
  it('boot impõe o idioma salvo sem o fetch da ala resolver', async () => {
    mockState.wardSingle.mockReturnValue(new Promise(() => {}));
    mockState.getSessionImpl = () => Promise.resolve({ data: { session: session('es-LA') } });
    await render(<AuthProvider><Probe /></AuthProvider>);
    await flush();
    expect(mockState.changeLanguage).toHaveBeenCalledWith('es-LA');
  });

  it('erro da ala mantém o idioma atual (não cai para en-US)', async () => {
    mockState.wardSingle.mockResolvedValue({ data: null, error: { message: 'boom' } });
    mockState.detected = 'ja-JP';
    mockState.getSessionImpl = () => Promise.resolve({ data: { session: session('pt-BR') } });
    await render(<AuthProvider><Probe /></AuthProvider>);
    await flush();
    // Só o boot aplicou pt-BR; o erro não trocou para en-US nem mexeu na wardLanguage.
    expect(mockState.changeLanguage.mock.calls).toEqual([['pt-BR']]);
    expect(probe().wardLanguage).toBe('en-US');
  });

  it('token refresh não refaz fetch da ala nem reaplica o idioma', async () => {
    mockState.detected = 'ja-JP';
    mockState.getSessionImpl = () => Promise.resolve({ data: { session: session() } });
    await render(<AuthProvider><Probe /></AuthProvider>);
    await flush();
    expect(mockState.wardSingle).toHaveBeenCalledTimes(1);
    expect(mockState.changeLanguage.mock.calls).toEqual([['es-LA']]);

    await act(async () => { mockState.handler?.('TOKEN_REFRESHED', session()); });
    await flush();
    expect(mockState.wardSingle).toHaveBeenCalledTimes(1);
    expect(mockState.changeLanguage).toHaveBeenCalledTimes(1);
  });
});
