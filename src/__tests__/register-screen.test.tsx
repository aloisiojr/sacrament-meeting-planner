/**
 * Behavioral tests for the first-user registration screen (0% coverage before this).
 *
 * This screen creates the ward AND its first bishopric account in one edge-function call, so its
 * validation order, its payload, and its error mapping all matter: a wrong field here produces a
 * ward nobody can administer.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';

const mockInvoke = jest.fn();
const mockSetSession = jest.fn();
const mockChangeLanguage = jest.fn();
const mockBack = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#000',
      card: '#111',
      text: '#fff',
      textSecondary: '#aaa',
      textTertiary: '#888',
      primary: '#07f',
      primaryContainer: '#013',
      onPrimary: '#fff',
      error: '#f00',
      errorContainer: '#300',
      inputBackground: '#111',
      inputBorder: '#222',
      placeholder: '#555',
      border: '#333',
      surfaceVariant: '#222',
    },
  }),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: jest.fn() }),
}));
jest.mock('../lib/supabase', () => ({
  supabase: {
    get functions() {
      return { invoke: mockInvoke };
    },
    get auth() {
      return { setSession: mockSetSession };
    },
  },
}));
jest.mock('../i18n', () => ({
  changeLanguage: (...args: unknown[]) => mockChangeLanguage(...args),
  SUPPORTED_LANGUAGES: ['pt-BR', 'en-US', 'es-LA'],
  LANGUAGE_LABELS: { 'pt-BR': 'Português', 'en-US': 'English', 'es-LA': 'Español' },
  DEFAULT_TIMEZONES: { 'pt-BR': 'America/Sao_Paulo', 'en-US': 'America/Denver', 'es-LA': 'America/Lima' },
}));

import RegisterScreen from '../app/(auth)/register';

async function renderRegister() {
  await render(<RegisterScreen />);
}

const type = async (testID: string, value: string) =>
  fireEvent.changeText(screen.getByTestId(testID), value);

const submit = async () => fireEvent.press(screen.getByTestId('register-submit-button'));

/** Fill every required field with something valid; callers override one at a time. */
async function fillValid(over: Partial<Record<string, string>> = {}) {
  const values: Record<string, string> = {
    'register-fullname-input': 'Bishop Silva',
    'register-email-input': 'bishop@ward.org',
    'register-stake-input': 'Estaca Central',
    'register-ward-input': 'Ala Modelo',
    'register-password-input': 'secret123',
    'register-confirm-password-input': 'secret123',
    ...over,
  };
  for (const [id, value] of Object.entries(values)) {
    await type(id, value);
  }
}

const errorText = () => screen.queryByTestId('register-error-text');

/**
 * Open the timezone picker, search, and choose an entry — the way a user does. The search step is
 * required, not decoration: the list renders a window of ~10 rows, so most zones are unreachable
 * without filtering.
 */
async function pickTimezone(tz: string) {
  await act(async () => {
    fireEvent.press(screen.getByTestId('register-timezone-input'));
  });
  await act(async () => {
    fireEvent.changeText(screen.getByPlaceholderText('timezoneSelector.search'), tz);
  });
  await act(async () => {
    fireEvent.press(screen.getByText(tz));
  });
}

beforeEach(() => {
  mockInvoke.mockReset();
  mockInvoke.mockResolvedValue({ data: {}, error: null });
  mockSetSession.mockReset();
  mockChangeLanguage.mockReset();
  mockBack.mockReset();
});

describe('RegisterScreen — validation runs before any network call', () => {
  const cases: { label: string; field: string; value: string; expected: RegExp }[] = [
    { label: 'name', field: 'register-fullname-input', value: '   ', expected: /auth.nameRequired/ },
    { label: 'email', field: 'register-email-input', value: '  ', expected: /auth.emailRequired/ },
    { label: 'stake', field: 'register-stake-input', value: '', expected: /auth.stakeRequired/ },
    { label: 'ward', field: 'register-ward-input', value: '', expected: /auth.wardRequired/ },
  ];

  for (const c of cases) {
    it(`rejects a blank ${c.label}`, async () => {
      await renderRegister();
      await fillValid({ [c.field]: c.value });
      await submit();

      expect(errorText()).toHaveTextContent(c.expected);
      expect(mockInvoke).not.toHaveBeenCalled();
    });
  }

  it('rejects a password shorter than 6 characters', async () => {
    await renderRegister();
    await fillValid({ 'register-password-input': 'abc', 'register-confirm-password-input': 'abc' });
    await submit();

    expect(errorText()).toHaveTextContent(/auth.passwordMinLength/);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('rejects mismatched password confirmation', async () => {
    await renderRegister();
    await fillValid({ 'register-confirm-password-input': 'different' });
    await submit();

    expect(errorText()).toHaveTextContent(/auth.passwordMismatch/);
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});

describe('RegisterScreen — payload', () => {
  it('sends trimmed text fields and the raw password to register-first-user', async () => {
    await renderRegister();
    await fillValid({
      'register-fullname-input': '  Bishop Silva  ',
      'register-email-input': '  bishop@ward.org  ',
      'register-stake-input': '  Estaca Central  ',
      'register-ward-input': '  Ala Modelo  ',
    });
    await submit();

    expect(mockInvoke).toHaveBeenCalledTimes(1);
    const [fnName, options] = mockInvoke.mock.calls[0];
    expect(fnName).toBe('register-first-user');
    expect(options.body).toMatchObject({
      email: 'bishop@ward.org',
      fullName: 'Bishop Silva',
      stakeName: 'Estaca Central',
      wardName: 'Ala Modelo',
      password: 'secret123',
    });
  });

  it('defaults to a bishopric account in en-US at the device timezone', async () => {
    // The first account MUST be bishopric: it is the only role that can then grant any other.
    // toBeTruthy() would pass on "observer" just as happily.
    await renderRegister();
    await fillValid();
    await submit();

    const { body } = mockInvoke.mock.calls[0][1];
    expect(body.role).toBe('bishopric');
    expect(body.language).toBe('en-US');
    expect(body.timezone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
  });

  it('sends the selected role and language, not the defaults', async () => {
    await renderRegister();
    await fillValid();
    await act(async () => {
      fireEvent.press(screen.getByTestId('register-role-secretary-radio'));
      fireEvent.press(screen.getByTestId('register-language-pt-BR-radio'));
    });
    await submit();

    const { body } = mockInvoke.mock.calls[0][1];
    expect(body.role).toBe('secretary');
    expect(body.language).toBe('pt-BR');
  });

  it('sends the timezone picked from the selector, not the device one', async () => {
    // The timezone control is a Pressable that opens a picker, NOT a text input — an earlier
    // version of this test used changeText on it, which is a no-op, and then "passed" only
    // because the CI machine happened to sit in the timezone being asserted.
    await renderRegister();
    await fillValid();
    await pickTimezone('America/Denver');
    await submit();

    expect(mockInvoke.mock.calls[0][1].body.timezone).toBe('America/Denver');
  });

  it('does not let a later language choice overwrite a picked timezone', async () => {
    // A ward in Manaus that registers in pt-BR must not be silently moved to Sao Paulo; the
    // meeting times of every future Sunday hang off this field.
    await renderRegister();
    await fillValid();
    await pickTimezone('America/Manaus');
    await act(async () => {
      fireEvent.press(screen.getByTestId('register-language-pt-BR-radio'));
    });
    await submit();

    expect(mockInvoke.mock.calls[0][1].body.timezone).toBe('America/Manaus');
  });
});

describe('RegisterScreen — server error mapping', () => {
  /** Build the supabase-js v2 shape for a non-2xx: data null, body on error.context. */
  function serverError(code: string) {
    return {
      data: null,
      error: { context: new Response(JSON.stringify({ error: code }), { status: 400 }) },
    };
  }

  it('maps email_exists to its own message', async () => {
    mockInvoke.mockResolvedValue(serverError('email_exists'));
    await renderRegister();
    await fillValid();
    await submit();

    expect(errorText()).toHaveTextContent(/auth.emailExists/);
  });

  it('maps stake_ward_exists to its own message', async () => {
    mockInvoke.mockResolvedValue(serverError('stake_ward_exists'));
    await renderRegister();
    await fillValid();
    await submit();

    expect(errorText()).toHaveTextContent(/auth.stakeWardExists/);
  });

  it('falls back to a generic message for an unrecognised error code', async () => {
    mockInvoke.mockResolvedValue(serverError('some_new_code'));
    await renderRegister();
    await fillValid();
    await submit();

    expect(errorText()).toHaveTextContent(/auth.registrationFailed/);
  });

  it('reports a connection problem when the call throws a network error', async () => {
    mockInvoke.mockRejectedValue(new Error('Failed to fetch'));
    await renderRegister();
    await fillValid();
    await submit();

    expect(errorText()).toHaveTextContent(/auth.requiresConnection/);
  });

  it('re-enables the form after a failure instead of stranding it in loading', async () => {
    mockInvoke.mockRejectedValue(new Error('boom'));
    await renderRegister();
    await fillValid();
    await submit();

    expect(screen.getByTestId('register-submit-button')).toBeEnabled();
  });
});

describe('RegisterScreen — success', () => {
  it('establishes the returned session and applies the chosen language', async () => {
    mockInvoke.mockResolvedValue({
      data: { session: { access_token: 'at', refresh_token: 'rt' } },
      error: null,
    });
    await renderRegister();
    await fillValid();
    await act(async () => {
      await submit();
    });

    expect(mockSetSession).toHaveBeenCalledWith({ access_token: 'at', refresh_token: 'rt' });
    expect(mockChangeLanguage).toHaveBeenCalled();
    expect(errorText()).toBeNull();
  });

  it('does not set a session when the server returns none', async () => {
    mockInvoke.mockResolvedValue({ data: {}, error: null });
    await renderRegister();
    await fillValid();
    await submit();

    expect(mockSetSession).not.toHaveBeenCalled();
  });
});

describe('RegisterScreen — navigation', () => {
  it('back returns to the previous screen', async () => {
    await renderRegister();
    await fireEvent.press(screen.getByTestId('register-back-button'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
