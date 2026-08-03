/**
 * The create-invitation Edge Function, executed for real.
 *
 * An invitation is a bearer credential: whoever holds the token joins the ward with the role baked
 * into it. So this function decides who may mint ward membership, and at what privilege. It had no
 * test of any kind.
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
jest.mock(
  'https://esm.sh/@supabase/supabase-js@2',
  () => ({ createClient: (...a: unknown[]) => mockCreateClient(...a) }),
  { virtual: true }
);

let rec: AdminRecorder;
let responses: AdminResponses;
const handlerRef = installDeno();

beforeAll(() => {
  mockCreateClient.mockImplementation(() => makeAdminClient(responses, rec));
  require('../../supabase/functions/create-invitation/index.ts');
});

beforeEach(() => {
  rec = newRecorder();
  responses = {
    getUser: () => ({
      data: { user: { id: 'me', app_metadata: { ward_id: 'w1', role: 'bishopric' } } },
      error: null,
    }),
    // The terminal .select().single() after the insert.
    select: () => ({
      data: {
        id: 'inv1',
        email: 'new@ward.org',
        role: 'observer',
        expires_at: '2026-09-02T00:00:00.000Z',
      },
      error: null,
    }),
  };
});

const call = (body: unknown, opts?: { auth?: string | null; method?: string }) =>
  callEdge(handlerRef.current!, body, opts);

function asRole(role: string) {
  responses.getUser = () => ({
    data: { user: { id: 'me', app_metadata: { ward_id: 'w1', role } } },
    error: null,
  });
}

/** The recorded insert into `invitations`, if any. */
function invitationInsert() {
  return rec.inserts.find((i) => i.table === 'invitations')?.payload as
    | Record<string, unknown>
    | undefined;
}

function quiet() {
  return {
    error: jest.spyOn(console, 'error').mockImplementation(() => {}),
    warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
    restore() {
      this.error.mockRestore();
      this.warn.mockRestore();
    },
  };
}

const VALID = { email: 'new@ward.org', role: 'observer' };

describe('create-invitation — authentication', () => {
  it('answers the CORS preflight', async () => {
    expect((await call(null, { method: 'OPTIONS' })).raw).toBe('ok');
  });

  it('rejects a request with no Authorization header', async () => {
    const q = quiet();
    const res = await call(VALID, { auth: null });
    q.restore();

    expect(res.status).toBe(401);
    expect(invitationInsert()).toBeUndefined();
  });

  it('rejects an invalid token', async () => {
    responses.getUser = () => ({ data: { user: null }, error: { message: 'bad jwt' } });
    const q = quiet();
    const res = await call(VALID);
    q.restore();

    expect(res.status).toBe(401);
    expect(invitationInsert()).toBeUndefined();
  });

  it('rejects a caller with no ward metadata', async () => {
    responses.getUser = () => ({
      data: { user: { id: 'me', app_metadata: { role: 'bishopric' } } },
      error: null,
    });
    const q = quiet();
    const res = await call(VALID);
    q.restore();

    expect(res.status).toBe(403);
    expect(invitationInsert()).toBeUndefined();
  });
});

describe('create-invitation — who may mint ward membership', () => {
  it.each(['bishopric', 'secretary'])('%s may', async (role) => {
    asRole(role);
    const q = quiet();
    const res = await call(VALID);
    q.restore();

    expect(res.status).toBe(201);
    expect(invitationInsert()).toBeDefined();
  });

  it('observer may not', async () => {
    asRole('observer');
    const q = quiet();
    const res = await call(VALID);
    q.restore();

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ code: 'auth/insufficient-permission' });
    expect(invitationInsert()).toBeUndefined();
  });

  it('an unrecognised role is refused, not treated as privileged', async () => {
    asRole('superuser');
    const q = quiet();
    const res = await call(VALID);
    q.restore();

    expect(res.status).toBe(403);
    expect(invitationInsert()).toBeUndefined();
  });
});

describe('create-invitation — input validation', () => {
  it.each([
    ['no email', { role: 'observer' }],
    ['no role', { email: 'a@b.co' }],
    ['neither', {}],
  ])('rejects %s', async (_label, body) => {
    const q = quiet();
    const res = await call(body);
    q.restore();

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: 'validation/missing-fields' });
    expect(invitationInsert()).toBeUndefined();
  });

  it('refuses to mint an invitation for an unknown role', async () => {
    const q = quiet();
    const res = await call({ email: 'a@b.co', role: 'superuser' });
    q.restore();

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: 'validation/invalid-role' });
    expect(invitationInsert()).toBeUndefined();
  });

  it.each(['bishopric', 'secretary', 'observer'])('accepts the known role %s', async (role) => {
    const q = quiet();
    const res = await call({ email: 'a@b.co', role });
    q.restore();

    expect(res.status).toBe(201);
    expect(invitationInsert()).toMatchObject({ role });
  });

  it.each(['not-an-email', 'a@b', '@b.co', 'a b@c.co', ''])(
    'rejects the malformed address %p',
    async (email) => {
      const q = quiet();
      const res = await call({ email, role: 'observer' });
      q.restore();

      // '' trips the missing-field check; both are refusals and neither writes.
      expect(res.status).toBe(400);
      expect(invitationInsert()).toBeUndefined();
    }
  );

  it('returns 400, not 500, on a malformed JSON body', async () => {
    const req = new Request('https://example.test/fn', {
      method: 'POST',
      headers: { Authorization: 'Bearer tok', 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const q = quiet();
    const res = await handlerRef.current!(req);
    q.restore();

    expect(res.status).toBe(400);
    expect(invitationInsert()).toBeUndefined();
  });
});

describe('create-invitation — what gets written', () => {
  it('stamps the caller ward, never one supplied in the body', async () => {
    // A body-supplied ward would let a bishopric of one ward mint membership of another.
    const q = quiet();
    await call({ ...VALID, ward_id: 'SOMEONE_ELSE', wardId: 'SOMEONE_ELSE' });
    q.restore();

    expect(invitationInsert()).toMatchObject({ ward_id: 'w1' });
  });

  it('records who created it', async () => {
    const q = quiet();
    await call(VALID);
    q.restore();

    expect(invitationInsert()).toMatchObject({ created_by: 'me' });
  });

  it('mints an unguessable token, different every time', async () => {
    // A predictable token is a free ward membership for anyone who can enumerate it.
    const q = quiet();
    await call(VALID);
    await call(VALID);
    q.restore();

    const tokens = rec.inserts.map((i) => (i.payload as { token: string }).token);
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).not.toBe(tokens[1]);
    expect(tokens[0]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it('sets an expiry 30 days out, not an open-ended credential', async () => {
    const q = quiet();
    await call(VALID);
    q.restore();

    const expires = new Date((invitationInsert() as { expires_at: string }).expires_at).getTime();
    const days = (expires - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThan(30.1);
  });

  it('sweeps this ward expired unused invitations, and only those', async () => {
    const q = quiet();
    await call(VALID);
    q.restore();

    // Scoped by ward, restricted to unused, restricted to already-expired. Dropping any one of the
    // three would revoke live invitations — possibly another ward's.
    const sweep = rec.tableDeletes.filter((d) => d.startsWith('invitations:'));
    expect(sweep).toContain('invitations:ward_id=w1');
    expect(sweep).toContain('invitations:used_at=null');
    expect(sweep.some((d) => d.startsWith('invitations:expires_at='))).toBe(true);
  });

  it('still issues the invitation when the hygiene sweep fails', async () => {
    // The sweep is best-effort housekeeping; it must not block the user's actual request. The
    // sweep is the bare write (no .select()); the insert chains .select().single(), so the two
    // are distinguishable here.
    responses.write = () => ({ data: null, error: { message: 'sweep failed' } });
    const q = quiet();
    const res = await call(VALID);
    q.restore();

    expect(rec.tableDeletes.some((d) => d.startsWith('invitations:'))).toBe(true);
    expect(res.status).toBe(201);
    expect(invitationInsert()).toBeDefined();
  });
});

describe('create-invitation — the response', () => {
  it('returns a redirect link carrying the token', async () => {
    const q = quiet();
    const res = await call(VALID);
    q.restore();

    const invitation = res.body.invitation as { deepLink: string; token: string };
    expect(invitation.deepLink).toContain('/functions/v1/invite-redirect?token=');
    expect(invitation.deepLink).toContain(invitation.token);
  });

  it('echoes the stored row rather than the request', async () => {
    // The client shows what was persisted; echoing the input would hide a server-side coercion.
    const q = quiet();
    const res = await call({ email: 'typed@ward.org', role: 'observer' });
    q.restore();

    expect(res.body.invitation).toMatchObject({ id: 'inv1', email: 'new@ward.org' });
  });

  it('reports a 500 when the insert fails, rather than handing back a token that was never stored', async () => {
    // A deep link whose token is not in the table is an invitation that can never be redeemed.
    responses.select = () => ({ data: null, error: { message: 'unique violation' } });
    const q = quiet();
    const res = await call(VALID);
    q.restore();

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({ code: 'invitation/insert-failed' });
    expect(res.body.invitation).toBeUndefined();
  });
});
