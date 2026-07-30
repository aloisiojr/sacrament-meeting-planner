/**
 * Behavioral test for the reset-password dead-end fix (P1 #7): when no recovery session can be
 * established, the screen must show an error + a back-to-login escape instead of an infinite spinner.
 *
 * `react-native` is aliased to a test stub (vitest.config.ts). supabase.auth / expo-router are mocked.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import TestRenderer from 'react-test-renderer';

const { act } = TestRenderer;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// --- Mock state, driven per test ---
const params = vi.hoisted(() => ({ value: {} as { token?: string; type?: string } }));
const authMock = vi.hoisted(() => ({
  verifyOtp: vi.fn(() => Promise.resolve({ error: null as unknown })),
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
}));
const replaceMock = vi.hoisted(() => vi.fn());

vi.mock('react-i18next', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, useTranslation: () => ({ t: (k: string) => k }) };
});
vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: { background: '#000', text: '#fff', textSecondary: '#aaa', primary: '#07f', error: '#f00', errorContainer: '#300', inputBackground: '#111', inputBorder: '#222', placeholder: '#555', onPrimary: '#fff' } }),
}));
vi.mock('../lib/supabase', () => ({ supabase: { auth: authMock } }));
vi.mock('expo-router', () => ({
  useRouter: () => ({ replace: replaceMock }),
  useLocalSearchParams: () => params.value,
}));

import ResetPasswordScreen from '../app/(auth)/reset-password';

function renderScreen() {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(ResetPasswordScreen));
  });
  return renderer;
}

beforeEach(() => {
  params.value = {};
  authMock.verifyOtp.mockClear();
  authMock.onAuthStateChange.mockClear();
  authMock.getSession.mockClear();
  replaceMock.mockClear();
  authMock.verifyOtp.mockImplementation(() => Promise.resolve({ error: null }));
  authMock.getSession.mockImplementation(() => Promise.resolve({ data: { session: null } }));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('reset-password dead-end escape (P1 #7)', () => {
  it('expired deep-link token: shows error + back-to-login, not a spinner', async () => {
    params.value = { token: 'tok', type: 'recovery' };
    authMock.verifyOtp.mockImplementation(() => Promise.resolve({ error: { message: 'expired' } }));

    const renderer = renderScreen();
    // Flush the verifyOtp promise.
    await act(async () => { await Promise.resolve(); });

    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('auth.resetExpired');
    expect(json).toContain('auth.backToLogin');

    // Back-to-login escape is wired to router.replace. The error screen has exactly one
    // pressable (the back-to-login link).
    const links = renderer.root.findAll((n) => typeof n.props?.onPress === 'function');
    expect(links.length).toBeGreaterThan(0);
    act(() => { (links[0].props.onPress as () => void)(); });
    expect(replaceMock).toHaveBeenCalledWith('/(auth)/login');
  });

  it('no token and no session: times out to an error + escape instead of spinning forever', async () => {
    vi.useFakeTimers();
    params.value = {};

    const renderer = renderScreen();
    // Flush getSession microtask (resolves to no session).
    await act(async () => { await Promise.resolve(); });
    // Advance past the 8s safety window.
    await act(async () => { vi.advanceTimersByTime(8000); });

    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('auth.resetExpired');
    expect(json).toContain('auth.backToLogin');
  });
});
