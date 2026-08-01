/**
 * Unit tests for extractInviteError (P1 #2): the invited-user screen must read the server error
 * code from a non-2xx functions.invoke result (body on error.context: Response), not just data.error
 * — otherwise token_used/expired/invalid messages are unreachable.
 */
// The screen imports supabase/i18n at module load; stub them so importing the helper is cheap.
jest.mock('../lib/supabase', () => ({ supabase: { functions: { invoke: jest.fn() } } }));
jest.mock('../i18n', () => ({ changeLanguage: jest.fn() }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
jest.mock('../contexts/ThemeContext', () => ({ useTheme: () => ({ colors: {} }) }));
jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({}) }));

import { extractInviteError } from '../app/(auth)/invite/[token]';

describe('extractInviteError', () => {
  it('reads the error code from a non-2xx response body (error.context Response)', async () => {
    const response = {
      data: null,
      error: { context: new Response(JSON.stringify({ error: 'token_used' })) },
    };
    expect(await extractInviteError(response)).toBe('token_used');
  });

  it('falls back to data.error for a 2xx-with-error shape', async () => {
    expect(await extractInviteError({ data: { error: 'token_expired' }, error: null })).toBe('token_expired');
  });

  it('returns undefined on success (no error anywhere)', async () => {
    expect(await extractInviteError({ data: { error: undefined }, error: null })).toBeUndefined();
  });

  it('returns undefined when the error body is not JSON', async () => {
    const response = { data: null, error: { context: new Response('<html>502</html>') } };
    expect(await extractInviteError(response)).toBeUndefined();
  });
});
