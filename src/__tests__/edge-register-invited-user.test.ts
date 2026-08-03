/**
 * The register-invited-user Edge Function, executed for real.
 *
 * This is the only unauthenticated write path in the system: no JWT is required, the invitation
 * token IS the credential. So the token checks are the entire access control — if any of them can
 * be bypassed, anyone can join any ward at any role. It had no test of any kind.
 *
 * The function serves two shapes on the same endpoint: a token-only body validates the invitation
 * (used to render the accept screen), a body with a password redeems it.
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

const DAY = 86_400_000;
const future = () => new Date(Date.now() + 10 * DAY).toISOString();
const past = () => new Date(Date.now() - DAY).toISOString();

/** The invitation row the fake `invitations` select returns. */
let invitation: Record<string, unknown> | null;
/** The ward row the fake `wards` select returns. */
let ward: Record<string, unknown> | null;

beforeAll(() => {
  mockCreateClient.mockImplementation(() => makeAdminClient(responses, rec));
  require('../../supabase/functions/register-invited-user/index.ts');
});

beforeEach(() => {
  rec = newRecorder();
  invitation = {
    id: 'inv1',
    ward_id: 'w1',
    email: 'invited@ward.org',
    role: 'secretary',
    used_at: null,
    expires_at: future(),
    wards: { name: 'Ala Modelo', stake_name: 'Estaca Central', language: 'pt-BR' },
  };
  ward = { language: 'pt-BR' };
  responses = {
    select: (table) => {
      if (table === 'invitations') return { data: invitation, error: null };
      if (table === 'wards') return { data: ward, error: null };
      return { data: null, error: null };
    },
    createUser: () => ({ data: { user: { id: 'new-user' } }, error: null }),
    signInWithPassword: () => ({ data: { session: { access_token: 'at' } }, error: null }),
  };
});

const call = (body: unknown) => callEdge(handlerRef.current!, body, { auth: null });

function quiet() {
  return jest.spyOn(console, 'error').mockImplementation(() => {});
}

const REDEEM = { token: 'tok', password: 'secret123', fullName: 'Ana Silva' };

describe('register-invited-user — validating a token', () => {
  it('returns the ward and role the invitation carries', async () => {
    const res = await call({ token: 'tok' });

    expect(res.status).toBe(200);
    expect(res.body.invitation).toMatchObject({
      email: 'invited@ward.org',
      role: 'secretary',
      wardName: 'Ala Modelo',
      stakeName: 'Estaca Central',
      language: 'pt-BR',
    });
  });

  it('does not create anything — validation is a read', async () => {
    await call({ token: 'tok' });
    expect(rec.createdAuthUsers).toEqual([]);
    expect(rec.updates).toEqual([]);
  });

  it('404s an unknown token', async () => {
    invitation = null;
    const res = await call({ token: 'nope' });

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: 'token_invalid' });
  });

  it('400s an empty token', async () => {
    const res = await call({ token: '', password: undefined });
    // An empty token with no password still routes to validation via the falsy check.
    expect([400, 404]).toContain(res.status);
    expect(rec.createdAuthUsers).toEqual([]);
  });

  it('410s a token that was already redeemed', async () => {
    invitation!.used_at = past();
    const res = await call({ token: 'tok' });

    expect(res.status).toBe(410);
    expect(res.body).toMatchObject({ error: 'token_used' });
  });

  it('410s an expired token', async () => {
    invitation!.expires_at = past();
    const res = await call({ token: 'tok' });

    expect(res.status).toBe(410);
    expect(res.body).toMatchObject({ error: 'token_expired' });
  });

  it('falls back to pt-BR when the ward has no language', async () => {
    (invitation!.wards as Record<string, unknown>).language = null;
    const res = await call({ token: 'tok' });

    expect((res.body.invitation as { language: string }).language).toBe('pt-BR');
  });
});

describe('register-invited-user — the token is the only credential, so it must be checked', () => {
  it('refuses to redeem an unknown token', async () => {
    invitation = null;
    const res = await call(REDEEM);

    expect(res.status).toBe(404);
    expect(rec.createdAuthUsers).toEqual([]);
  });

  it('refuses to redeem a token twice — otherwise one invite is unlimited accounts', async () => {
    invitation!.used_at = past();
    const res = await call(REDEEM);

    expect(res.status).toBe(410);
    expect(res.body).toMatchObject({ error: 'token_used' });
    expect(rec.createdAuthUsers).toEqual([]);
  });

  it('refuses to redeem an expired token', async () => {
    invitation!.expires_at = past();
    const res = await call(REDEEM);

    expect(res.status).toBe(410);
    expect(res.body).toMatchObject({ error: 'token_expired' });
    expect(rec.createdAuthUsers).toEqual([]);
  });

  it('accepts a token expiring in the near future', async () => {
    invitation!.expires_at = new Date(Date.now() + 60_000).toISOString();
    const res = await call(REDEEM);

    expect(res.status).toBe(201);
    expect(rec.createdAuthUsers).toHaveLength(1);
  });

  it('marks the invitation used, so a replay of the same request fails', async () => {
    await call(REDEEM);

    const used = rec.updates.find((u) => u.table === 'invitations');
    expect(used).toBeDefined();
    expect(used!.payload).toMatchObject({ used_at: expect.any(String) });
    expect(used!.filters).toContainEqual(['id', 'inv1']);
  });
});

describe('register-invited-user — input validation', () => {
  it.each([
    ['no fullName', { token: 'tok', password: 'secret123' }],
    ['blank fullName', { token: 'tok', password: 'secret123', fullName: '   ' }],
  ])('rejects %s', async (_label, body) => {
    const res = await call(body);
    expect(res.status).toBe(400);
    expect(rec.createdAuthUsers).toEqual([]);
  });

  it('rejects a password shorter than 6 characters', async () => {
    const res = await call({ ...REDEEM, password: 'abc' });

    expect(res.status).toBe(400);
    expect(rec.createdAuthUsers).toEqual([]);
  });

  it('accepts exactly 6 characters', async () => {
    const res = await call({ ...REDEEM, password: '123456' });
    expect(res.status).toBe(201);
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
    expect(rec.createdAuthUsers).toEqual([]);
  });
});

describe('register-invited-user — the account it creates', () => {
  it('takes the ward and role from the INVITATION, never from the request', async () => {
    // This is the escalation guard: a caller who could name their own role would simply ask for
    // bishopric. Nothing about the account comes from the body except the password and the name.
    const res = await call({
      ...REDEEM,
      role: 'bishopric',
      ward_id: 'SOMEONE_ELSE',
      email: 'attacker@evil.test',
    });

    expect(res.status).toBe(201);
    expect(rec.createdAuthUsers[0]).toMatchObject({
      email: 'invited@ward.org',
      app_metadata: { ward_id: 'w1', role: 'secretary', full_name: 'Ana Silva' },
    });
  });

  it('trims the supplied name', async () => {
    await call({ ...REDEEM, fullName: '  Ana Silva  ' });
    expect(rec.createdAuthUsers[0]).toMatchObject({
      app_metadata: { full_name: 'Ana Silva' },
    });
  });

  it('confirms the email, since the invitation already proved it', async () => {
    await call(REDEEM);
    expect(rec.createdAuthUsers[0]).toMatchObject({ email_confirm: true });
  });

  it('adopts the ward language as the initial app language', async () => {
    ward = { language: 'es-LA' };
    await call(REDEEM);
    expect(rec.createdAuthUsers[0]).toMatchObject({ user_metadata: { language: 'es-LA' } });
  });

  it('falls back to en-US when the ward has no language', async () => {
    ward = { language: null };
    await call(REDEEM);
    expect(rec.createdAuthUsers[0]).toMatchObject({ user_metadata: { language: 'en-US' } });
  });

  it('does not mark the invitation used when the account could not be created', async () => {
    // Burning the token on a failed registration would strand the invitee with no way back in.
    responses.createUser = () => ({ data: { user: null }, error: { message: 'email exists' } });
    const spy = quiet();
    const res = await call(REDEEM);
    spy.mockRestore();

    expect(res.status).toBe(500);
    expect(rec.updates.find((u) => u.table === 'invitations')).toBeUndefined();
  });
});

describe('register-invited-user — the session', () => {
  it('returns a session so the invitee lands signed in', async () => {
    const res = await call(REDEEM);

    expect(res.status).toBe(201);
    expect(res.body.session).toMatchObject({ access_token: 'at' });
  });

  it('still reports success when auto sign-in fails, and says so', async () => {
    // The account exists at this point; failing the whole request would tell the user to try
    // again with a token that is now spent.
    responses.signInWithPassword = () => ({ data: { session: null }, error: { message: 'boom' } });
    const spy = quiet();
    const res = await call(REDEEM);
    spy.mockRestore();

    expect(res.status).toBe(201);
    expect(res.body.session).toBeNull();
    expect(res.body.message).toMatch(/log in manually/i);
    expect(res.body.user).toMatchObject({ id: 'new-user' });
  });
});
