/**
 * ARQ-10: authErrors is a pure classifier on the login path — cheap to cover, and
 * its whole job is not lying to the user about why sign-in failed.
 */
import { classifySignInError, describeSignInError } from '../lib/authErrors';

describe('classifySignInError', () => {
  it('transport failures are offline (checked before credentials)', () => {
    expect(classifySignInError(new Error('Network request failed'))).toEqual({ kind: 'offline' });
    expect(classifySignInError({ message: 'Failed to fetch' })).toEqual({ kind: 'offline' });
  });

  it('server-rejected credentials are invalid-credentials', () => {
    expect(classifySignInError({ code: 'invalid_credentials', message: 'Invalid login credentials' }))
      .toEqual({ kind: 'invalid-credentials' });
    expect(classifySignInError({ status: 400, message: 'Invalid login credentials' }))
      .toEqual({ kind: 'invalid-credentials' });
    expect(classifySignInError(new Error('Invalid login credentials')))
      .toEqual({ kind: 'invalid-credentials' });
  });

  it('anything else is unexpected and keeps its own message', () => {
    expect(classifySignInError(new Error('Invalid API key')))
      .toEqual({ kind: 'unexpected', message: 'Invalid API key' });
    expect(classifySignInError('boom')).toEqual({ kind: 'unexpected', message: 'boom' });
  });
});

describe('describeSignInError', () => {
  const t = (key: string) => key;
  it('maps kinds to i18n keys, except unexpected which surfaces verbatim', () => {
    expect(describeSignInError(new Error('Network request failed'), t)).toBe('auth.requiresConnection');
    expect(describeSignInError({ code: 'invalid_credentials' }, t)).toBe('auth.loginFailed');
    expect(describeSignInError(new Error('Invalid API key'), t)).toBe('Invalid API key');
  });
});
