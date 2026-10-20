/**
 * DEC-08 (specs/cutover-gate.md): the Supabase client must send `x-app-version` on every
 * request so the server-side cutover barrier can read it from `request.headers` — and must
 * send nothing (never a spurious version) when the build has no version.
 */
const mockCreateClient = jest.fn(() => ({}));
jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...(args as [])),
}));

let mockExpoConfig: { version?: string } | null = { version: '2.0.0' };
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return mockExpoConfig;
    },
  },
}));

function loadClientOptions(): { global?: { headers?: Record<string, string> } } {
  jest.resetModules();
  mockCreateClient.mockClear();
  mockCreateClient.mockImplementation(() => ({}));
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../lib/supabase');
  return mockCreateClient.mock.calls[0][2] as { global?: { headers?: Record<string, string> } };
}

describe('supabase client x-app-version header (DEC-08)', () => {
  it('sends the expoConfig version as x-app-version', () => {
    mockExpoConfig = { version: '2.0.0' };
    expect(loadClientOptions().global?.headers).toEqual({ 'x-app-version': '2.0.0' });
  });

  it.each([
    ['expoConfig null', null],
    ['version missing', {}],
  ])('sends no x-app-version header when %s', (_label, cfg) => {
    mockExpoConfig = cfg as { version?: string } | null;
    const headers = loadClientOptions().global?.headers ?? {};
    expect(headers).not.toHaveProperty('x-app-version');
  });
});
