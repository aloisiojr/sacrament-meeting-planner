/**
 * The update-user-name Edge Function, executed for real.
 *
 * Small, but it writes app_metadata with the service-role key — the same object that carries
 * ward_id and role. Getting the merge wrong strips the caller out of their ward or, worse, lets a
 * request body reach a field it should never touch. It had no test of any kind.
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

const CALLER = {
  id: 'me',
  app_metadata: { ward_id: 'w1', role: 'secretary', full_name: 'Old Name', provider: 'email' },
};

beforeAll(() => {
  mockCreateClient.mockImplementation(() => makeAdminClient(responses, rec));
  require('../../supabase/functions/update-user-name/index.ts');
});

beforeEach(() => {
  rec = newRecorder();
  responses = { getUser: () => ({ data: { user: CALLER }, error: null }) };
});

const call = (body: unknown, opts?: { auth?: string | null; method?: string }) =>
  callEdge(handlerRef.current!, body, opts);

function quiet() {
  return jest.spyOn(console, 'error').mockImplementation(() => {});
}

describe('update-user-name — authentication', () => {
  it('answers the CORS preflight', async () => {
    expect((await call(null, { method: 'OPTIONS' })).raw).toBe('ok');
  });

  it('rejects a request with no Authorization header', async () => {
    const res = await call({ fullName: 'New' }, { auth: null });
    expect(res.status).toBe(401);
    expect(rec.updatedAuthUsers).toEqual([]);
  });

  it('rejects an invalid token', async () => {
    responses.getUser = () => ({ data: { user: null }, error: { message: 'bad jwt' } });
    const res = await call({ fullName: 'New' });
    expect(res.status).toBe(401);
    expect(rec.updatedAuthUsers).toEqual([]);
  });
});

describe('update-user-name — validation', () => {
  it.each([
    ['missing', {}],
    ['empty', { fullName: '' }],
    ['whitespace only', { fullName: '   ' }],
    ['a number', { fullName: 42 }],
    ['null', { fullName: null }],
    ['an object', { fullName: { toString: 'x' } }],
  ])('rejects a %s name', async (_label, body) => {
    const res = await call(body);
    expect(res.status).toBe(400);
    expect(rec.updatedAuthUsers).toEqual([]);
  });

  it('returns 500 rather than crashing on a malformed body', async () => {
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

describe('update-user-name — the write', () => {
  it('updates only the caller own record', async () => {
    // No target id is accepted: a caller cannot rename anyone else.
    await call({ fullName: 'New Name', targetUserId: 'u2', userId: 'u2' });

    expect(rec.updatedAuthUsers).toHaveLength(1);
    expect(rec.updatedAuthUsers[0].id).toBe('me');
  });

  it('preserves ward_id and role while changing the name', async () => {
    // app_metadata is replaced wholesale by updateUserById; without the spread, the caller loses
    // their ward and role and every RLS policy stops matching them.
    await call({ fullName: 'New Name' });

    expect(rec.updatedAuthUsers[0].attrs).toEqual({
      app_metadata: {
        ward_id: 'w1',
        role: 'secretary',
        full_name: 'New Name',
        provider: 'email',
      },
    });
  });

  it('cannot be used to change the caller own role', async () => {
    // The body is read for `fullName` only; anything else in it must be ignored.
    await call({ fullName: 'New Name', role: 'bishopric', app_metadata: { role: 'bishopric' } });

    expect(rec.updatedAuthUsers[0].attrs).toMatchObject({
      app_metadata: { role: 'secretary' },
    });
  });

  it('trims the name', async () => {
    await call({ fullName: '  New Name  ' });
    expect(rec.updatedAuthUsers[0].attrs).toMatchObject({
      app_metadata: { full_name: 'New Name' },
    });
  });

  it('reports success', async () => {
    const res = await call({ fullName: 'New Name' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true });
  });

  it('reports a 500 when the write fails, rather than claiming success', async () => {
    responses.updateUserById = () => ({ error: { message: 'boom' } });
    const spy = quiet();
    const res = await call({ fullName: 'New Name' });
    spy.mockRestore();

    expect(res.status).toBe(500);
    expect(res.body).not.toMatchObject({ success: true });
  });
});
