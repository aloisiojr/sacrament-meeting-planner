/**
 * Behavioral tests for the login screen — the entry point every user passes through, and which
 * had no test at all before (0% coverage).
 *
 * Covers: field validation before any network call, the success path delegating to
 * AuthContext.signIn, failure surfacing a message instead of stranding the user, the loading
 * lockout, and the two navigation links.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';

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
    // The shape Supabase actually returns for a rejected password.
    mockSignIn.mockRejectedValue(
      Object.assign(new Error('Invalid login credentials'), {
        status: 400,
        code: 'invalid_credentials',
      })
    );
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

describe('LoginScreen — a failure is described truthfully', () => {
  // It used to be `catch { setError(t('auth.loginFailed')) }`: every failure, of any kind, reported
  // as "Incorrect email or password". Telling someone their password is wrong when they are
  // offline sends them to reset a password that was never wrong.

  async function attempt() {
    await renderLogin();
    await type('login-email-input', 'bishop@ward.org');
    await type('login-password-input', 'secret123');
    await act(async () => {
      submit();
    });
  }

  it.each([
    ['code', Object.assign(new Error('x'), { code: 'invalid_credentials' })],
    ['message', Object.assign(new Error('Invalid login credentials'), { status: 400 })],
  ])('a rejected password (by %s) says the credentials are wrong', async (_l, err) => {
    mockSignIn.mockRejectedValue(err);
    await attempt();
    expect(screen.getByTestId('login-error-text')).toHaveTextContent(/auth.loginFailed/);
  });

  it.each([
    'Network request failed',
    'Failed to fetch',
    'Load failed',
  ])('being offline (%s) says so instead of blaming the password', async (message) => {
    mockSignIn.mockRejectedValue(new TypeError(message));
    await attempt();

    const text = screen.getByTestId('login-error-text');
    expect(text).toHaveTextContent(/auth.requiresConnection/);
    expect(text).not.toHaveTextContent(/auth.loginFailed/);
  });

  it('an unexpected failure shows its own message rather than a wrong claim', async () => {
    // "Invalid API key" means the build is misconfigured. Reporting that as a bad password is how
    // an afternoon disappears.
    mockSignIn.mockRejectedValue(Object.assign(new Error('Invalid API key'), { status: 401 }));
    await attempt();

    const text = screen.getByTestId('login-error-text');
    expect(text).toHaveTextContent(/Invalid API key/);
    expect(text).not.toHaveTextContent(/auth.loginFailed/);
  });
});

describe('LoginScreen — the loading lockout', () => {
  /** A signIn that stays pending until the test releases it. */
  function deferredSignIn() {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    mockSignIn.mockReturnValue(pending);
    return release;
  }

  async function startSignIn() {
    await renderLogin();
    await type('login-email-input', 'bishop@ward.org');
    await type('login-password-input', 'secret123');
    await act(async () => {
      submit();
    });
  }

  it('disables the submit button while the request is in flight', async () => {
    // The header of this file has always claimed to cover the loading lockout. It did not.
    deferredSignIn();
    await startSignIn();

    expect(screen.getByTestId('login-submit-button')).toBeDisabled();
  });

  it('does not fire a second signIn when the button is pressed again mid-request', async () => {
    // Double-submitting a login is how a user ends up with two sessions and a rate-limit block.
    deferredSignIn();
    await startSignIn();

    await act(async () => {
      submit();
      submit();
    });

    expect(mockSignIn).toHaveBeenCalledTimes(1);
  });

  it('releases the lockout once the request settles', async () => {
    const release = deferredSignIn();
    await startSignIn();
    expect(screen.getByTestId('login-submit-button')).toBeDisabled();

    await act(async () => {
      release();
    });

    expect(screen.getByTestId('login-submit-button')).toBeEnabled();
  });

  it('locks the inputs too, so the credentials cannot change under the request', async () => {
    deferredSignIn();
    await startSignIn();

    expect(screen.getByTestId('login-email-input')).toBeDisabled();
    expect(screen.getByTestId('login-password-input')).toBeDisabled();
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
