/**
 * Turning a sign-in failure into something true.
 *
 * The login screen used to do `catch { setError(t('auth.loginFailed')) }` — every failure, of any
 * kind, reported as "Incorrect email or password". That is a false statement about the user's
 * credentials when the real cause is no connectivity or a misconfigured backend, and it sends them
 * to reset a password that was never wrong. It also hides the actual error from anyone debugging.
 */

import { isNetworkError } from './offlineMutation';

export type SignInFailure =
  /** The server checked the credentials and rejected them. */
  | { kind: 'invalid-credentials' }
  /** The request never reached the server. */
  | { kind: 'offline' }
  /** Anything else — surfaced verbatim rather than mislabelled. */
  | { kind: 'unexpected'; message: string };

/** Supabase reports a rejected password with this code / message. */
function isInvalidCredentials(err: unknown): boolean {
  const e = err as { code?: unknown; message?: unknown; status?: unknown } | null;
  if (e?.code === 'invalid_credentials') return true;
  if (e?.status === 400 && typeof e?.message === 'string') {
    return /invalid login credentials|invalid_credentials/i.test(e.message);
  }
  return typeof e?.message === 'string' && /invalid login credentials/i.test(e.message);
}

export function classifySignInError(err: unknown): SignInFailure {
  // Offline first: a transport failure can carry a status-less error that would otherwise fall
  // through to "unexpected".
  if (isNetworkError(err)) return { kind: 'offline' };
  if (isInvalidCredentials(err)) return { kind: 'invalid-credentials' };

  const message = (err as { message?: unknown } | null)?.message;
  return {
    kind: 'unexpected',
    message: typeof message === 'string' && message.trim() !== '' ? message : String(err),
  };
}

/**
 * The message to show. `t` is the i18n lookup.
 *
 * An unexpected failure shows its own text: it is untranslated, but a user who can read
 * "Network request failed" or "Invalid API key" can report something actionable, whereas
 * "Incorrect email or password" sends them down the wrong path entirely.
 */
export function describeSignInError(err: unknown, t: (key: string) => string): string {
  const failure = classifySignInError(err);
  switch (failure.kind) {
    case 'offline':
      return t('auth.requiresConnection');
    case 'invalid-credentials':
      return t('auth.loginFailed');
    case 'unexpected':
      return failure.message;
  }
}
