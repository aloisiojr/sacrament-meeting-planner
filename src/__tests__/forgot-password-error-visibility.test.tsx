/**
 * Behavioral tests for the Reset Password screen's error visibility
 * (spec: specs/reset-email-error-visibility.md).
 *
 * `react-native` is aliased to a test stub (see vitest.config.ts), so the screen renders with
 * react-test-renderer under the node environment. Providers + supabase are mocked per-file.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import TestRenderer from 'react-test-renderer';

const { act } = TestRenderer;

// --- Mocks (per-file) --------------------------------------------------------

vi.mock('expo-router', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#000', text: '#fff', textSecondary: '#aaa',
      errorContainer: '#300', error: '#f00', inputBackground: '#111',
      inputBorder: '#333', placeholder: '#666', primary: '#07f', onPrimary: '#fff',
    },
  }),
}));

const invokeMock = vi.fn();
vi.mock('../lib/supabase', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invokeMock(...args) } },
}));

// Import AFTER mocks (vitest hoists vi.mock above imports).
import ForgotPasswordScreen from '../app/(auth)/forgot-password';

// --- Helpers -----------------------------------------------------------------

function renderScreen(): TestRenderer.ReactTestRenderer {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(ForgotPasswordScreen));
  });
  return renderer;
}

// Re-query each time so we call the current render's (fresh-closure) props.
function emailInput(renderer: TestRenderer.ReactTestRenderer) {
  return renderer.root.findAll((n) => typeof n.props.onChangeText === 'function')[0];
}

async function submitWithEmail(renderer: TestRenderer.ReactTestRenderer, email: string) {
  act(() => {
    (emailInput(renderer).props.onChangeText as (v: string) => void)(email);
  });
  await act(async () => {
    await (emailInput(renderer).props.onSubmitEditing as () => Promise<void>)();
  });
}

function renderedText(renderer: TestRenderer.ReactTestRenderer): string {
  return JSON.stringify(renderer.toJSON());
}

// --- Tests -------------------------------------------------------------------

describe('ForgotPasswordScreen — reset email error visibility', () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it('logs the underlying error and shows the failure message when invoke fails (AC1/AC2)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    invokeMock.mockResolvedValue({ data: null, error: { message: 'smtp rejected' } });

    const renderer = renderScreen();
    await submitWithEmail(renderer, 'user@example.com');

    expect(invokeMock).toHaveBeenCalledWith('send-reset-email', {
      body: { email: 'user@example.com' },
    });
    // AC1: the real error is logged (not swallowed) — with the actual error object.
    expect(errorSpy).toHaveBeenCalledWith(
      'Password reset request failed:',
      expect.objectContaining({ message: 'smtp rejected' }),
    );
    // AC2: failure message shown, success state not shown.
    const text = renderedText(renderer);
    expect(text).toContain('auth.resetFailed');
    expect(text).not.toContain('auth.resetEmailSent');

    errorSpy.mockRestore();
  });

  it('shows the success state when invoke succeeds (AC3)', async () => {
    invokeMock.mockResolvedValue({ data: { success: true }, error: null });

    const renderer = renderScreen();
    await submitWithEmail(renderer, 'user@example.com');

    const text = renderedText(renderer);
    expect(text).toContain('auth.resetEmailSent');
    expect(text).not.toContain('auth.resetFailed');
  });
});
