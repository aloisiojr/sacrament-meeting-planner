/**
 * The send-reset-email Edge Function, executed for real.
 *
 * Unauthenticated by necessity — the user has no session during forgot-password — so anyone can
 * call it with any address. That makes two properties load-bearing:
 *
 *   1. It must not leak WHETHER an address has an account. A 404 here turns the endpoint into a
 *      membership oracle for the whole ward.
 *   2. The recovery link must point at THIS project. A token minted here and validated against a
 *      different project reads to the user as "expired or invalid", with nothing in the logs.
 *
 * It had no test of any kind.
 */
import {
  makeAdminClient,
  newRecorder,
  installDeno,
  callEdge,
  type AdminResponses,
  type AdminRecorder,
} from './helpers/edgeFunctionHarness';

const mockCreateClient = jest.fn();
const mockSmtpSend = jest.fn();
const mockSmtpClose = jest.fn();
const mockSmtpCtor = jest.fn();

jest.mock(
  'https://esm.sh/@supabase/supabase-js@2',
  () => ({ createClient: (...a: unknown[]) => mockCreateClient(...a) }),
  { virtual: true }
);
jest.mock(
  'https://deno.land/x/denomailer@1.6.0/mod.ts',
  () => ({
    SMTPClient: class {
      constructor(cfg: unknown) {
        mockSmtpCtor(cfg);
      }
      send(msg: unknown) {
        return mockSmtpSend(msg);
      }
      close() {
        return mockSmtpClose();
      }
    },
  }),
  { virtual: true }
);

let rec: AdminRecorder;
let responses: AdminResponses;
const handlerRef = installDeno();

/** Pages returned by admin.listUsers. */
let userPages: Record<string, unknown>[][];
let ward: { language: string } | null;
let linkResult: { data: unknown; error: unknown };

beforeAll(() => {
  mockCreateClient.mockImplementation(() => {
    const client = makeAdminClient(responses, rec) as Record<string, unknown> & {
      auth: { admin: Record<string, unknown> };
    };
    let page = 0;
    client.auth.admin.listUsers = async () => {
      const users = userPages[page] ?? [];
      page += 1;
      return { data: { users }, error: null };
    };
    client.auth.admin.generateLink = async () => linkResult;
    return client;
  });
  require('../../supabase/functions/send-reset-email/index.ts');
});

beforeEach(() => {
  rec = newRecorder();
  userPages = [
    [{ id: 'u1', email: 'Bishop@Ward.org', app_metadata: { ward_id: 'w1' }, user_metadata: {} }],
  ];
  ward = { language: 'pt-BR' };
  linkResult = { data: { properties: { hashed_token: 'HASH123' } }, error: null };
  responses = {
    select: (table) => (table === 'wards' ? { data: ward, error: null } : { data: null, error: null }),
  };
  mockSmtpSend.mockReset();
  mockSmtpSend.mockResolvedValue(undefined);
  mockSmtpClose.mockReset();
  mockSmtpCtor.mockReset();
});

const call = (body: unknown, opts?: { method?: string }) =>
  callEdge(handlerRef.current!, body, { auth: null, ...opts });

function quiet() {
  return jest.spyOn(console, 'error').mockImplementation(() => {});
}

/** The single message handed to SMTP, if any. */
const sent = () => mockSmtpSend.mock.calls[0]?.[0] as
  | { to: string; subject: string; html: string; content: string }
  | undefined;

describe('send-reset-email — input validation', () => {
  it('answers the CORS preflight', async () => {
    expect((await call(null, { method: 'OPTIONS' })).raw).toBe('ok');
  });

  it.each([
    ['missing', {}],
    ['null', { email: null }],
    ['a number', { email: 42 }],
  ])('rejects a %s email', async (_label, body) => {
    const res = await call(body);
    expect(res.status).toBe(400);
    expect(mockSmtpSend).not.toHaveBeenCalled();
  });

  it.each(['not-an-email', 'a@b', '@b.co', 'a b@c.co'])('rejects the malformed %p', async (email) => {
    const res = await call({ email });
    expect(res.status).toBe(400);
    expect(mockSmtpSend).not.toHaveBeenCalled();
  });

  it('returns 500 rather than crashing on a malformed body', async () => {
    const req = new Request('https://example.test/fn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const spy = quiet();
    const res = await handlerRef.current!(req);
    spy.mockRestore();

    expect(res.status).toBe(500);
    expect(mockSmtpSend).not.toHaveBeenCalled();
  });
});

describe('send-reset-email — the endpoint is not a membership oracle', () => {
  it('answers success for an address with no account', async () => {
    // A 404 here would let anyone test whether a given person is in the ward.
    userPages = [[]];
    const res = await call({ email: 'stranger@nowhere.test' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true });
    expect(mockSmtpSend).not.toHaveBeenCalled();
  });

  it('answers identically for a known and an unknown address', async () => {
    const known = await call({ email: 'bishop@ward.org' });
    userPages = [[]];
    mockSmtpSend.mockClear();
    const unknown = await call({ email: 'stranger@nowhere.test' });

    expect(unknown.status).toBe(known.status);
    expect(unknown.body).toEqual(known.body);
  });
});

describe('send-reset-email — finding the account', () => {
  it('matches the address case-insensitively', async () => {
    // Stored as 'Bishop@Ward.org'; typed in lowercase.
    await call({ email: 'bishop@ward.org' });
    expect(sent()?.to).toBe('Bishop@Ward.org');
  });

  it('tolerates surrounding whitespace', async () => {
    await call({ email: '  bishop@ward.org  ' });
    expect(mockSmtpSend).toHaveBeenCalled();
  });

  it('pages past the first 50 users', async () => {
    // A ward member on page 2 must still be able to reset their password.
    const filler = Array.from({ length: 50 }, (_, i) => ({
      id: `x${i}`,
      email: `other${i}@ward.org`,
      app_metadata: {},
      user_metadata: {},
    }));
    userPages = [
      filler,
      [{ id: 'u1', email: 'bishop@ward.org', app_metadata: { ward_id: 'w1' }, user_metadata: {} }],
    ];

    await call({ email: 'bishop@ward.org' });
    expect(mockSmtpSend).toHaveBeenCalled();
  });

  it('stops paging on a short page rather than looping forever', async () => {
    userPages = [[{ id: 'z', email: 'someone@else.test', app_metadata: {}, user_metadata: {} }]];
    const res = await call({ email: 'bishop@ward.org' });

    expect(res.status).toBe(200);
    expect(mockSmtpSend).not.toHaveBeenCalled();
  });
});

describe('send-reset-email — which language it writes in', () => {
  it('prefers the user own app language', async () => {
    userPages = [[{
      id: 'u1', email: 'bishop@ward.org',
      app_metadata: { ward_id: 'w1' }, user_metadata: { language: 'es-LA' },
    }]];
    ward = { language: 'pt-BR' };
    await call({ email: 'bishop@ward.org' });

    expect(sent()?.subject).toContain('Restablecer');
  });

  it('falls back to the ward language', async () => {
    ward = { language: 'pt-BR' };
    await call({ email: 'bishop@ward.org' });

    expect(sent()?.subject).toContain('Redefinir');
  });

  it('falls back to en-US when the user has no ward', async () => {
    userPages = [[{ id: 'u1', email: 'bishop@ward.org', app_metadata: {}, user_metadata: {} }]];
    await call({ email: 'bishop@ward.org' });

    expect(sent()?.subject).toContain('Reset password');
  });

  it('falls back to en-US for a language with no template', async () => {
    ward = { language: 'fr-FR' };
    await call({ email: 'bishop@ward.org' });

    expect(sent()?.subject).toContain('Reset password');
  });
});

describe('send-reset-email — the link', () => {
  it('points at THIS project, not a hardcoded one', async () => {
    // The Deno stub returns `test-SUPABASE_URL` for that env var.
    await call({ email: 'bishop@ward.org' });

    expect(sent()?.html).toContain('test-SUPABASE_URL/functions/v1/reset-redirect');
  });

  it('carries the generated recovery token and type', async () => {
    await call({ email: 'bishop@ward.org' });

    expect(sent()?.html).toContain('token=HASH123');
    expect(sent()?.html).toContain('type=recovery');
  });

  it('includes the link in the plain-text part too, for clients that strip HTML', async () => {
    await call({ email: 'bishop@ward.org' });
    expect(sent()?.content).toContain('HASH123');
  });

  it('sends nothing when the token could not be generated', async () => {
    // Mailing a broken link is worse than failing: the user burns their one attempt on it.
    linkResult = { data: null, error: { message: 'boom' } };
    const spy = quiet();
    const res = await call({ email: 'bishop@ward.org' });
    spy.mockRestore();

    expect(res.status).toBe(500);
    expect(mockSmtpSend).not.toHaveBeenCalled();
  });

  it('sends nothing when the generated link carries no token', async () => {
    linkResult = { data: { properties: {} }, error: null };
    const spy = quiet();
    const res = await call({ email: 'bishop@ward.org' });
    spy.mockRestore();

    expect(res.status).toBe(500);
    expect(mockSmtpSend).not.toHaveBeenCalled();
  });
});

describe('send-reset-email — delivery', () => {
  it('sends over authenticated TLS on the submission port', async () => {
    await call({ email: 'bishop@ward.org' });

    expect(mockSmtpCtor).toHaveBeenCalledWith(
      expect.objectContaining({
        connection: expect.objectContaining({ hostname: 'smtp.gmail.com', port: 465, tls: true }),
      })
    );
  });

  it('closes the connection after a successful send', async () => {
    await call({ email: 'bishop@ward.org' });
    expect(mockSmtpClose).toHaveBeenCalled();
  });

  it('closes the connection after a failed send too, so sockets do not leak', async () => {
    mockSmtpSend.mockRejectedValue(new Error('smtp down'));
    const spy = quiet();
    const res = await call({ email: 'bishop@ward.org' });
    spy.mockRestore();

    expect(res.status).toBe(500);
    expect(mockSmtpClose).toHaveBeenCalled();
  });

  it('reports a delivery failure rather than claiming success', async () => {
    mockSmtpSend.mockRejectedValue(new Error('smtp down'));
    const spy = quiet();
    const res = await call({ email: 'bishop@ward.org' });
    spy.mockRestore();

    expect(res.status).toBe(500);
    expect(res.body).not.toMatchObject({ success: true });
  });

  it('reports success on delivery', async () => {
    const res = await call({ email: 'bishop@ward.org' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true });
  });
});
