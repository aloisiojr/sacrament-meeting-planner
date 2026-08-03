/**
 * The three small Edge Functions that had no coverage at all: invite-redirect, reset-redirect and
 * app-config.
 *
 * The first two are what a user's finger actually hits — they are the URL inside an invitation or
 * a password-reset email. They take a token straight from the query string and 302 somewhere, so
 * the input validation is the only thing standing between a malformed or hostile link and the
 * accept/reset page. app-config decides whether the app hard-blocks itself on launch.
 */
import { installDeno, type EdgeHandler } from './helpers/edgeFunctionHarness';

const mockCreateClient = jest.fn();
jest.mock(
  'https://esm.sh/@supabase/supabase-js@2',
  () => ({ createClient: (...a: unknown[]) => mockCreateClient(...a) }),
  { virtual: true }
);

let inviteRedirect: EdgeHandler;
let resetRedirect: EdgeHandler;
let appConfig: EdgeHandler;

/** Row returned by the app_config read. */
let configRow: { data: unknown; error: unknown };

beforeAll(() => {
  const ref = installDeno();

  mockCreateClient.mockImplementation(() => ({
    from: () => {
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.single = () => Promise.resolve(configRow);
      return chain;
    },
  }));

  // Each require registers through the same Deno.serve stub; capture immediately.
  require('../../supabase/functions/invite-redirect/index.ts');
  inviteRedirect = ref.current!;
  require('../../supabase/functions/reset-redirect/index.ts');
  resetRedirect = ref.current!;
  require('../../supabase/functions/app-config/index.ts');
  appConfig = ref.current!;
});

beforeEach(() => {
  configRow = {
    data: { min_supported_version: '2.0.0', latest_version: '2.1.0', nudge_interval_days: 3 },
    error: null,
  };
});

function get(handler: EdgeHandler, query: string) {
  return handler(new Request(`https://proj.supabase.co/functions/v1/fn${query}`, { method: 'GET' }));
}

function quiet() {
  return {
    error: jest.spyOn(console, 'error').mockImplementation(() => {}),
    warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
    log: jest.spyOn(console, 'log').mockImplementation(() => {}),
    restore() {
      this.error.mockRestore();
      this.warn.mockRestore();
      this.log.mockRestore();
    },
  };
}

const UUID = '3f8c1a92-2b45-4c1e-9f0a-7d6e5b4c3a21';

describe('invite-redirect', () => {
  it('400s a request with no token instead of redirecting to a broken page', async () => {
    const q = quiet();
    const res = await get(inviteRedirect, '');
    q.restore();

    expect(res.status).toBe(400);
    expect(res.headers.get('Location')).toBeNull();
  });

  it.each([
    ['not-a-uuid', 'abc123'],
    ['truncated', '3f8c1a92-2b45-4c1e-9f0a'],
    ['an injected path', '../../../etc/passwd'],
    ['a full URL', 'https://evil.test/steal'],
    ['script-ish', '<script>alert(1)</script>'],
  ])('400s %s rather than putting it in a Location header', async (_label, token) => {
    // The token lands in a URL the browser follows. Anything not shaped like the UUID this system
    // mints has no business being reflected there.
    const q = quiet();
    const res = await get(inviteRedirect, `?token=${encodeURIComponent(token)}`);
    q.restore();

    expect(res.status).toBe(400);
    expect(res.headers.get('Location')).toBeNull();
  });

  it('302s a well-formed token to the accept page', async () => {
    const q = quiet();
    const res = await get(inviteRedirect, `?token=${UUID}`);
    q.restore();

    expect(res.status).toBe(302);
    const loc = res.headers.get('Location')!;
    expect(loc).toContain('/accept-invite.html');
    expect(loc).toContain(`token=${UUID}`);
  });

  it('tells the page which project owns the invite', async () => {
    // The accept page is shared between projects; without this it would validate the token against
    // the wrong one and report it as invalid.
    const q = quiet();
    const res = await get(inviteRedirect, `?token=${UUID}`);
    q.restore();

    expect(res.headers.get('Location')).toContain(
      `supabase_url=${encodeURIComponent('test-SUPABASE_URL')}`
    );
  });

  it('answers the CORS preflight', async () => {
    const res = await inviteRedirect(
      new Request('https://proj.supabase.co/functions/v1/fn', { method: 'OPTIONS' })
    );
    expect(await res.text()).toBe('ok');
  });
});

describe('reset-redirect', () => {
  const HASH = 'abc123_XYZ-456';

  it.each([
    ['no token', '?type=recovery'],
    ['no type', `?token=${HASH}`],
    ['neither', ''],
  ])('400s with %s', async (_label, query) => {
    const q = quiet();
    const res = await get(resetRedirect, query);
    q.restore();

    expect(res.status).toBe(400);
    expect(res.headers.get('Location')).toBeNull();
  });

  it.each([
    ['a path traversal', '../../secret'],
    ['a URL', 'https://evil.test/'],
    ['spaces', 'abc 123'],
    ['a query injection', 'abc&next=https://evil.test'],
  ])('400s %s in the token', async (_label, token) => {
    const q = quiet();
    const res = await get(resetRedirect, `?token=${encodeURIComponent(token)}&type=recovery`);
    q.restore();

    expect(res.status).toBe(400);
    expect(res.headers.get('Location')).toBeNull();
  });

  it.each(['signup', 'invite', 'magiclink', 'email_change', 'RECOVERY'])(
    'refuses the type %p — only recovery is allowed here',
    async (type) => {
      // The reset page sets a new password. Reaching it with any other flow's token would be a
      // different operation than the one the user was emailed about.
      const q = quiet();
      const res = await get(resetRedirect, `?token=${HASH}&type=${type}`);
      q.restore();

      expect(res.status).toBe(400);
      expect(res.headers.get('Location')).toBeNull();
    }
  );

  it('302s a valid recovery link to the reset page', async () => {
    const q = quiet();
    const res = await get(resetRedirect, `?token=${HASH}&type=recovery`);
    q.restore();

    expect(res.status).toBe(302);
    const loc = res.headers.get('Location')!;
    expect(loc).toContain('/reset-password.html');
    expect(loc).toContain(`token=${HASH}`);
    expect(loc).toContain('type=recovery');
  });

  it('tells the page which project minted the token', async () => {
    const q = quiet();
    const res = await get(resetRedirect, `?token=${HASH}&type=recovery`);
    q.restore();

    expect(res.headers.get('Location')).toContain(
      `supabase_url=${encodeURIComponent('test-SUPABASE_URL')}`
    );
  });
});

describe('app-config', () => {
  it('returns the stored configuration', async () => {
    const res = await appConfig(new Request('https://x.test/fn', { method: 'POST' }));
    expect(await res.json()).toEqual({
      min_supported_version: '2.0.0',
      latest_version: '2.1.0',
      nudge_interval_days: 3,
    });
  });

  it('fails OPEN when the read errors — a config outage must not brick the app', async () => {
    // useVersionGate blocks the app below min_supported_version. Returning an error, or a high
    // minimum, would lock every user out of a working app because one table read failed.
    configRow = { data: null, error: { message: 'db down' } };
    const q = quiet();
    const res = await appConfig(new Request('https://x.test/fn', { method: 'POST' }));
    q.restore();

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ min_supported_version: '0.0.0' });
  });

  it('fails open when the row is missing', async () => {
    configRow = { data: null, error: null };
    const q = quiet();
    const res = await appConfig(new Request('https://x.test/fn', { method: 'POST' }));
    q.restore();

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ min_supported_version: '0.0.0', latest_version: '0.0.0' });
  });

  it('always answers 200, so the client never treats it as a hard failure', async () => {
    configRow = { data: null, error: { message: 'boom' } };
    const q = quiet();
    const res = await appConfig(new Request('https://x.test/fn', { method: 'POST' }));
    q.restore();

    expect(res.status).toBe(200);
  });

  it('answers the CORS preflight', async () => {
    const res = await appConfig(new Request('https://x.test/fn', { method: 'OPTIONS' }));
    expect(await res.text()).toBe('ok');
  });
});
