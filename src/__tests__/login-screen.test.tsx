/**
 * Behavioral tests for the login screen — the entry point every user passes through, and which
 * had no test at all before (0% coverage).
 *
 * Covers: field validation before any network call, the success path delegating to
 * AuthContext.signIn, failure surfacing a message instead of stranding the user, the loading
 * lockout, and the two navigation links.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

const mockSignIn = jest.fn();
const mockPush = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    get signIn() {
      return mockSignIn;
    },
  }),
}));
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#000',
      text: '#fff',
      textSecondary: '#aaa',
      primary: '#07f',
      onPrimary: '#fff',
      error: '#f00',
      errorContainer: '#300',
      inputBackground: '#111',
      inputBorder: '#222',
      placeholder: '#555',
    },
  }),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import LoginScreen from '../app/(auth)/login';

async function renderLogin() {
  await render(<LoginScreen />);
}

const type = async (testID: string, value: string) =>
  fireEvent.changeText(screen.getByTestId(testID), value);

const submit = () => fireEvent.press(screen.getByTestId('login-submit-button'));

beforeEach(() => {
  mockSignIn.mockReset();
  mockSignIn.mockResolvedValue(undefined);
  mockPush.mockReset();
});

describe('LoginScreen — validation', () => {
  it('rejects an empty email without calling signIn', async () => {
    await renderLogin();
    await type('login-password-input', 'secret123');
    await submit();

    expect(screen.getByTestId('login-error-text')).toHaveTextContent(/auth.emailRequired/);
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('treats a whitespace-only email as empty', async () => {
    await renderLogin();
    await type('login-email-input', '   ');
    await type('login-password-input', 'secret123');
    await submit();

    expect(screen.getByTestId('login-error-text')).toHaveTextContent(/auth.emailRequired/);
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('rejects an empty password without calling signIn', async () => {
    await renderLogin();
    await type('login-email-input', 'bishop@ward.org');
    await submit();

    expect(screen.getByTestId('login-error-text')).toHaveTextContent(/auth.passwordMinLength/);
    expect(mockSignIn).not.toHaveBeenCalled();
  });
});

describe('LoginScreen — submission', () => {
  it('signs in with the trimmed email and the raw password', async () => {
    await renderLogin();
    await type('login-email-input', '  bishop@ward.org  ');
    await type('login-password-input', 'secret123');
    await submit();

    expect(mockSignIn).toHaveBeenCalledTimes(1);
    expect(mockSignIn).toHaveBeenCalledWith('bishop@ward.org', 'secret123');
  });

  it('surfaces a message when signIn rejects, and does not strand the user in loading', async () => {
    mockSignIn.mockRejectedValue(new Error('invalid credentials'));
    await renderLogin();
    await type('login-email-input', 'bishop@ward.org');
    await type('login-password-input', 'wrong');
    await submit();

    expect(screen.getByTestId('login-error-text')).toHaveTextContent(/auth.loginFailed/);
    // The form is usable again — the finally block must clear `loading`.
    expect(screen.getByTestId('login-submit-button')).toBeEnabled();
  });

  it('clears a previous error when a new attempt starts', async () => {
    await renderLogin();
    await submit(); // empty email -> error shown
    expect(screen.getByTestId('login-error-text')).toBeOnTheScreen();

    await type('login-email-input', 'bishop@ward.org');
    await type('login-password-input', 'secret123');
    await submit();

    expect(screen.queryByTestId('login-error-text')).toBeNull();
  });
});

describe('LoginScreen — navigation', () => {
  it('"create account" pushes the register route', async () => {
    await renderLogin();
    await fireEvent.press(screen.getByTestId('login-create-account-button'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/register');
  });

  it('"forgot password" pushes the recovery route', async () => {
    await renderLogin();
    await fireEvent.press(screen.getByTestId('login-forgot-password-button'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/forgot-password');
  });
});
