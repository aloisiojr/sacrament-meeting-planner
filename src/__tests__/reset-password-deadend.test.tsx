/**
 * Behavioral test for the reset-password dead-end fix (P1 #7): when no recovery session can be
 * established, the screen must show an error + a back-to-login escape instead of an infinite spinner.
 *
 * Renders against real React Native via jest-expo; supabase.auth / expo-router are mocked.
 */
import React from 'react';
import { render as rtlRender, screen, fireEvent, act } from '@testing-library/react-native';


// --- Mock state, driven per test ---
const mockParams = { value: {} as { token?: string; type?: string } };
const mockAuthMock = {
  verifyOtp: jest.fn(() => Promise.resolve({ error: null as unknown })),
  onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
  getSession: jest.fn(() => Promise.resolve({ data: { session: null } })),
};
const mockReplaceMock = jest.fn();

jest.mock('react-i18next', () => {
  const actual = (jest.requireActual('react-i18next')) as Record<string, unknown>;
  return { ...actual, useTranslation: () => ({ t: (k: string) => k }) };
});
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: { background: '#000', text: '#fff', textSecondary: '#aaa', primary: '#07f', error: '#f00', errorContainer: '#300', inputBackground: '#111', inputBorder: '#222', placeholder: '#555', onPrimary: '#fff' } }),
}));
// `auth` is a getter on purpose: babel-jest hoists this factory above `const mockAuthMock`, and
// the factory runs while the screen module is being imported — i.e. before that const is
// initialised. Reading it eagerly would capture `undefined`.
jest.mock('../lib/supabase', () => ({
  supabase: {
    get auth() {
      return mockAuthMock;
    },
  },
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplaceMock }),
  useLocalSearchParams: () => mockParams.value,
}));

import ResetPasswordScreen from '../app/(auth)/reset-password';

async function renderScreen() {
  await rtlRender(<ResetPasswordScreen />);
}

beforeEach(() => {
  mockParams.value = {};
  mockAuthMock.verifyOtp.mockClear();
  mockAuthMock.onAuthStateChange.mockClear();
  mockAuthMock.getSession.mockClear();
  mockReplaceMock.mockClear();
  mockAuthMock.verifyOtp.mockImplementation(() => Promise.resolve({ error: null }));
  mockAuthMock.getSession.mockImplementation(() => Promise.resolve({ data: { session: null } }));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('reset-password dead-end escape (P1 #7)', () => {
  it('expired deep-link token: shows error + back-to-login, not a spinner', async () => {
    mockParams.value = { token: 'tok', type: 'recovery' };
    mockAuthMock.verifyOtp.mockImplementation(() => Promise.resolve({ error: { message: 'expired' } }));

    await renderScreen();
    // Flush the verifyOtp promise.
    await act(async () => { await Promise.resolve(); });

    expect(screen.getByText('auth.resetExpired')).toBeOnTheScreen();
    const escape = screen.getByText('auth.backToLogin');

    // Back-to-login escape is wired to router.replace.
    await fireEvent.press(escape);
    expect(mockReplaceMock).toHaveBeenCalledWith('/(auth)/login');
  });

  it('no token and no session: times out to an error + escape instead of spinning forever', async () => {
    jest.useFakeTimers();
    mockParams.value = {};

    await renderScreen();
    // Flush getSession microtask (resolves to no session).
    await act(async () => { await Promise.resolve(); });
    // Advance past the 8s safety window.
    await act(async () => { jest.advanceTimersByTime(8000); });

    expect(screen.getByText('auth.resetExpired')).toBeOnTheScreen();
    expect(screen.getByText('auth.backToLogin')).toBeOnTheScreen();
  });
});
