/**
 * The list-users Edge Function, executed for real.
 *
 * It runs with the SERVICE ROLE key, so RLS does not apply to it: whatever scoping exists is the
 * scoping this function writes by hand. If it queried without `target_ward_id`, every ward's
 * member emails would be returned to any caller. It had no test of any kind.
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

const WARD_USERS = [
  { id: 'me', email: 'me@ward.org', role: 'bishopric' },
  { id: 'u2', email: 'sec@ward.org', role: 'secretary' },
];

beforeAll(() => {
  mockCreateClient.mockImplementation(() => makeAdminClient(responses, rec));
  require('../../supabase/functions/list-users/index.ts');
});

beforeEach(() => {
  rec = newRecorder();
  responses = {
    getUser: () => ({
      data: { user: { id: 'me', app_metadata: { ward_id: 'w1', role: 'bishopric' } } },
      error: null,
    }),
    rpc: () => ({ data: WARD_USERS, error: null }),
  };
});

const call = (body: unknown, opts?: { auth?: string | null; method?: string }) =>
  callEdge(handlerRef.current!, body, opts);

/**
 * `wardId` is passed explicitly rather than defaulted: `f(x, undefined)` takes the DEFAULT value,
 * so a default of 'w1' would silently turn the no-ward test into a has-ward test.
 */
function asRole(role: string, wardId: string | null = 'w1') {
  responses.getUser = () => ({
    data: {
      user: { id: 'me', app_metadata: { ...(wardId === null ? {} : { ward_id: wardId }), role } },
    },
    error: null,
  });
}

describe('list-users — authentication', () => {
  it('answers the CORS preflight', async () => {
    expect((await call(null, { method: 'OPTIONS' })).raw).toBe('ok');
  });

  it('rejects a request with no Authorization header', async () => {
    const res = await call({}, { auth: null });
    expect(res.status).toBe(401);
    expect(rec.rpcCalls).toEqual([]);
  });

  it('rejects an invalid token', async () => {
    responses.getUser = () => ({ data: { user: null }, error: { message: 'bad jwt' } });
    const res = await call({});
    expect(res.status).toBe(401);
    expect(rec.rpcCalls).toEqual([]);
  });

  it('rejects a caller with no ward in their token', async () => {
    asRole('bishopric', null);
    const res = await call({});
    expect(res.status).toBe(403);
    expect(rec.rpcCalls).toEqual([]);
  });
});

describe('list-users — who may see the ward roster', () => {
  it.each(['bishopric', 'secretary'])('%s may', async (role) => {
    asRole(role);
    const res = await call({});
    expect(res.status).toBe(200);
    expect(res.body.users).toEqual(WARD_USERS);
  });

  it('observer may not — the roster is emails plus roles', async () => {
    asRole('observer');
    const res = await call({});

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'Insufficient permissions' });
    expect(rec.rpcCalls).toEqual([]);
    expect(res.body.users).toBeUndefined();
  });

  it('an unrecognised role is refused, not treated as privileged', async () => {
    asRole('superuser');
    const res = await call({});
    expect(res.status).toBe(403);
    expect(rec.rpcCalls).toEqual([]);
  });
});

describe('list-users — ward scoping', () => {
  it('asks only for THIS ward — the function runs as service role, so RLS will not do it', async () => {
    asRole('bishopric');
    await call({});

    expect(rec.rpcCalls).toHaveLength(1);
    expect(rec.rpcCalls[0]).toEqual({
      fn: 'list_ward_users',
      args: { target_ward_id: 'w1' },
    });
  });

  it('uses the ward from the caller token, not one supplied in the body', async () => {
    // A client that could name its own ward could read any ward's roster.
    asRole('bishopric');
    await call({ wardId: 'SOMEONE_ELSE', target_ward_id: 'SOMEONE_ELSE' });

    expect(rec.rpcCalls[0].args).toEqual({ target_ward_id: 'w1' });
  });
});

describe('list-users — failure paths', () => {
  it('returns 500 when the query fails, not an empty roster', async () => {
    // An empty list reads as "your ward has no users" and would render an empty screen.
    responses.rpc = () => ({ data: null, error: { message: 'boom' } });
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await call({});
    spy.mockRestore();

    expect(res.status).toBe(500);
    expect(res.body.users).toBeUndefined();
  });

  it('returns an empty array, never null, when the ward genuinely has no rows', async () => {
    // The client does `result?.users ?? []`, but a null here would still be a lie about the shape.
    responses.rpc = () => ({ data: null, error: null });
    const res = await call({});

    expect(res.status).toBe(200);
    expect(res.body.users).toEqual([]);
  });
});
