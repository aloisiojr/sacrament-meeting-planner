/**
 * The update-user-role Edge Function, executed for real.
 *
 * This is the privilege boundary of the whole app. The client-side gates asserted in
 * settings-role-matrix and users-screen-role-gates are UX: they decide what is shown. This is what
 * actually decides who may grant themselves or anyone else bishopric. It had no test of any kind —
 * `grep update-user-role src/__tests__` found only the client's call site.
 *
 * See helpers/edgeFunctionHarness for how a Deno function is driven from jest.
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

const CALLER = { id: 'me', app_metadata: { ward_id: 'w1', role: 'bishopric' } };
const TARGET = { id: 'u2', app_metadata: { ward_id: 'w1', role: 'observer' } };

beforeAll(() => {
  mockCreateClient.mockImplementation(() => makeAdminClient(responses, rec));
  require('../../supabase/functions/update-user-role/index.ts');
});

beforeEach(() => {
  rec = newRecorder();
  responses = {
    getUser: () => ({ data: { user: CALLER }, error: null }),
    getUserById: () => ({ data: { user: TARGET }, error: null }),
    // Two bishopric users by default, so the last-bishopric guard does not fire.
    rpc: () => ({
      data: [{ role: 'bishopric' }, { role: 'bishopric' }, { role: 'observer' }],
      error: null,
    }),
  };
});

const call = (body: unknown, opts?: { auth?: string | null; method?: string }) =>
  callEdge(handlerRef.current!, body, opts);

/** Silence the function's console.error for the paths that legitimately log. */
function quiet() {
  return jest.spyOn(console, 'error').mockImplementation(() => {});
}

describe('update-user-role — authentication', () => {
  it('answers the CORS preflight', async () => {
    const res = await call(null, { method: 'OPTIONS' });
    expect(res.raw).toBe('ok');
  });

  it('rejects a request with no Authorization header', async () => {
    const res = await call({ targetUserId: 'u2', newRole: 'bishopric' }, { auth: null });
    expect(res.status).toBe(401);
    expect(rec.updatedAuthUsers).toEqual([]);
  });

  it('rejects an invalid token', async () => {
    responses.getUser = () => ({ data: { user: null }, error: { message: 'bad jwt' } });
    const res = await call({ targetUserId: 'u2', newRole: 'bishopric' });
    expect(res.status).toBe(401);
    expect(rec.updatedAuthUsers).toEqual([]);
  });

  it('rejects a caller with no ward in their token', async () => {
    responses.getUser = () => ({
      data: { user: { id: 'me', app_metadata: { role: 'bishopric' } } },
      error: null,
    });
    const res = await call({ targetUserId: 'u2', newRole: 'bishopric' });
    expect(res.status).toBe(403);
  });

  it('rejects a caller with no role in their token', async () => {
    responses.getUser = () => ({
      data: { user: { id: 'me', app_metadata: { ward_id: 'w1' } } },
      error: null,
    });
    const res = await call({ targetUserId: 'u2', newRole: 'bishopric' });
    expect(res.status).toBe(403);
  });
});

describe('update-user-role — who may change roles', () => {
  it.each(['bishopric', 'secretary'])('%s may', async (role) => {
    responses.getUser = () => ({
      data: { user: { ...CALLER, app_metadata: { ward_id: 'w1', role } } },
      error: null,
    });
    const res = await call({ targetUserId: 'u2', newRole: 'secretary' });

    expect(res.status).toBe(200);
    expect(rec.updatedAuthUsers).toHaveLength(1);
  });

  it('observer may not — this is the privilege-escalation guard', async () => {
    // An observer promoting themselves (or a confederate) to bishopric would take over the ward.
    responses.getUser = () => ({
      data: { user: { id: 'me', app_metadata: { ward_id: 'w1', role: 'observer' } } },
      error: null,
    });
    const res = await call({ targetUserId: 'u2', newRole: 'bishopric' });

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'Insufficient permissions' });
    expect(rec.updatedAuthUsers).toEqual([]);
  });

  it('an unrecognised role in the caller token is refused, not treated as privileged', async () => {
    // Fail closed: an unknown value must not fall through the allow-list.
    responses.getUser = () => ({
      data: { user: { id: 'me', app_metadata: { ward_id: 'w1', role: 'superuser' } } },
      error: null,
    });
    const res = await call({ targetUserId: 'u2', newRole: 'bishopric' });

    expect(res.status).toBe(403);
    expect(rec.updatedAuthUsers).toEqual([]);
  });
});

describe('update-user-role — input validation', () => {
  it.each([
    ['no targetUserId', { newRole: 'observer' }],
    ['no newRole', { targetUserId: 'u2' }],
    ['neither', {}],
  ])('rejects %s with 400', async (_label, body) => {
    const res = await call(body);
    expect(res.status).toBe(400);
    expect(rec.updatedAuthUsers).toEqual([]);
  });

  it.each(['superuser', 'admin', 'BISHOPRIC', '', 'bishopric ' ])(
    'refuses to assign the unknown role %p',
    async (newRole) => {
      const res = await call({ targetUserId: 'u2', newRole });
      // Empty string trips the missing-field check first; both are refusals, neither writes.
      expect([400]).toContain(res.status);
      expect(rec.updatedAuthUsers).toEqual([]);
    }
  );

  it.each(['bishopric', 'secretary', 'observer'])('accepts the known role %s', async (newRole) => {
    const res = await call({ targetUserId: 'u2', newRole });
    expect(res.status).toBe(200);
  });

  it('returns 500 rather than crashing on an unparseable body', async () => {
    const req = new Request('https://example.test/fn', {
      method: 'POST',
      headers: { Authorization: 'Bearer tok', 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const spy = quiet();
    const res = await handlerRef.current!(req);
    spy.mockRestore();

    expect(res.status).toBe(500);
    expect(rec.updatedAuthUsers).toEqual([]);
  });
});

describe('update-user-role — you cannot change your own role', () => {
  it('refuses with cannot_change_own_role', async () => {
    // Otherwise a secretary — who IS allowed to change roles — could simply promote themselves.
    responses.getUser = () => ({
      data: { user: { id: 'me', app_metadata: { ward_id: 'w1', role: 'secretary' } } },
      error: null,
    });
    const res = await call({ targetUserId: 'me', newRole: 'bishopric' });

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'cannot_change_own_role' });
    expect(rec.updatedAuthUsers).toEqual([]);
  });

  it('refuses even a no-op self change', async () => {
    const res = await call({ targetUserId: 'me', newRole: 'bishopric' });
    expect(res.body).toMatchObject({ error: 'cannot_change_own_role' });
  });
});

describe('update-user-role — ward isolation', () => {
  it('refuses a target in another ward', async () => {
    responses.getUserById = () => ({
      data: { user: { id: 'u2', app_metadata: { ward_id: 'OTHER', role: 'observer' } } },
      error: null,
    });
    const res = await call({ targetUserId: 'u2', newRole: 'bishopric' });

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'Target user not in your ward' });
    expect(rec.updatedAuthUsers).toEqual([]);
  });

  it('404s an unknown target', async () => {
    responses.getUserById = () => ({ data: { user: null }, error: null });
    const res = await call({ targetUserId: 'ghost', newRole: 'observer' });

    expect(res.status).toBe(404);
    expect(rec.updatedAuthUsers).toEqual([]);
  });

  it('404s when the lookup itself fails, instead of proceeding blind', async () => {
    responses.getUserById = () => ({ data: { user: null }, error: { message: 'boom' } });
    const res = await call({ targetUserId: 'u2', newRole: 'observer' });

    expect(res.status).toBe(404);
    expect(rec.updatedAuthUsers).toEqual([]);
  });
});

describe('update-user-role — the ward keeps at least one bishopric', () => {
  /** Make the target the ward's bishopric, with `others` as the rest of the ward. */
  function bishopricTarget(others: { role: string }[]) {
    responses.getUserById = () => ({
      data: { user: { id: 'u2', app_metadata: { ward_id: 'w1', role: 'bishopric' } } },
      error: null,
    });
    responses.rpc = () => ({ data: [{ role: 'bishopric' }, ...others], error: null });
  }

  it('refuses to demote the only bishopric — that would lock the ward out of itself', async () => {
    bishopricTarget([{ role: 'observer' }, { role: 'secretary' }]);
    const res = await call({ targetUserId: 'u2', newRole: 'observer' });

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'cannot_demote_last_bishopric' });
    expect(rec.updatedAuthUsers).toEqual([]);
  });

  it('allows the demotion when a second bishopric exists', async () => {
    bishopricTarget([{ role: 'bishopric' }]);
    const res = await call({ targetUserId: 'u2', newRole: 'observer' });

    expect(res.status).toBe(200);
    expect(rec.updatedAuthUsers).toHaveLength(1);
  });

  it('does not run the check when the target is not a bishopric', async () => {
    // The RPC is the expensive part; it must not fire for an observer -> secretary change.
    await call({ targetUserId: 'u2', newRole: 'secretary' });
    expect(rec.rpcCalls).toEqual([]);
  });

  it('does not run the check when a bishopric stays a bishopric', async () => {
    bishopricTarget([{ role: 'observer' }]);
    await call({ targetUserId: 'u2', newRole: 'bishopric' });
    expect(rec.rpcCalls).toEqual([]);
  });

  it('scopes the count to this ward', async () => {
    bishopricTarget([{ role: 'bishopric' }]);
    await call({ targetUserId: 'u2', newRole: 'observer' });

    expect(rec.rpcCalls[0]).toMatchObject({
      fn: 'list_ward_users',
      args: { target_ward_id: 'w1' },
    });
  });

  it('refuses rather than guessing when the count cannot be obtained', async () => {
    // Failing open here would let the last bishopric be demoted on a transient error.
    bishopricTarget([{ role: 'bishopric' }]);
    responses.rpc = () => ({ data: null, error: { message: 'rpc down' } });
    const spy = quiet();
    const res = await call({ targetUserId: 'u2', newRole: 'observer' });
    spy.mockRestore();

    expect(res.status).toBe(500);
    expect(rec.updatedAuthUsers).toEqual([]);
  });
});

describe('update-user-role — the write itself', () => {
  it('sets the new role and preserves the rest of app_metadata', async () => {
    // ward_id lives in app_metadata too; replacing the object wholesale would strip the user out
    // of their ward and break every RLS policy for them.
    responses.getUserById = () => ({
      data: {
        user: {
          id: 'u2',
          app_metadata: { ward_id: 'w1', role: 'observer', full_name: 'Ana', provider: 'email' },
        },
      },
      error: null,
    });
    await call({ targetUserId: 'u2', newRole: 'secretary' });

    expect(rec.updatedAuthUsers[0]).toMatchObject({
      id: 'u2',
      attrs: {
        app_metadata: {
          ward_id: 'w1',
          role: 'secretary',
          full_name: 'Ana',
          provider: 'email',
        },
      },
    });
  });

  it('reports the previous and new role on success', async () => {
    const res = await call({ targetUserId: 'u2', newRole: 'secretary' });
    expect(res.body).toMatchObject({
      success: true,
      previousRole: 'observer',
      newRole: 'secretary',
    });
  });

  it('reports a 500 when the write fails, rather than claiming success', async () => {
    responses.updateUserById = () => ({ error: { message: 'boom' } });
    const spy = quiet();
    const res = await call({ targetUserId: 'u2', newRole: 'secretary' });
    spy.mockRestore();

    expect(res.status).toBe(500);
    expect(res.body).not.toMatchObject({ success: true });
  });
});
