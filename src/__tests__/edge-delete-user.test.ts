/**
 * The delete-user Edge Function, executed for real.
 *
 * This is the most destructive endpoint in the system: it hard-deletes an auth user and, when the
 * caller is the last member of their ward, deletes the WARD — which cascades to every speech,
 * agenda, member and hymn record the ward ever had. Its only coverage was ~17 readFileSync +
 * toContain assertions against its own source text, which cannot tell a working authorization
 * check from an inverted one.
 *
 * It runs under Deno and imports supabase-js from a URL, so it is not part of the app bundle. Both
 * are solvable from jest: a VIRTUAL mock supplies the URL import, and a stubbed `Deno.serve`
 * captures the handler so it can be invoked with real Request objects.
 */

import { hasPermission } from '../lib/permissions';
import type { Role } from '../types/database';

type Handler = (req: Request) => Promise<Response>;

const mockCreateClient = jest.fn();
/** Set by the Deno.serve stub when the module under test loads. */
const mockHandlerRef: { current: Handler | null } = { current: null };

// The function imports from an https URL, which resolves to nothing on disk — hence `virtual`.
jest.mock(
  'https://esm.sh/@supabase/supabase-js@2',
  () => ({ createClient: (...a: unknown[]) => mockCreateClient(...a) }),
  { virtual: true }
);

interface FakeState {
  caller: Record<string, unknown> | null;
  callerError: unknown;
  /** Pages returned by admin.listUsers, in order. */
  userPages: { app_metadata?: Record<string, unknown> }[][];
  targetUser: Record<string, unknown> | null;
  targetError: unknown;
  deleteUserError: unknown;
  /** Every table delete, as `${table}:${column}=${value}`. */
  tableDeletes: string[];
  deletedAuthUsers: string[];
  listUsersError: unknown;
  /** Result of the `delete_ward_if_no_auth_users` RPC. */
  rpcResult: { data: unknown; error: unknown };
  rpcCalls: { fn: string; args: unknown }[];
  /** Ordered log across auth deletes and rpc calls, for ordering assertions. */
  sequence: string[];
}

const state: FakeState = {
  caller: null,
  callerError: null,
  userPages: [],
  targetUser: null,
  targetError: null,
  deleteUserError: null,
  tableDeletes: [],
  deletedAuthUsers: [],
  listUsersError: null,
  rpcResult: { data: false, error: null },
  rpcCalls: [],
  sequence: [],
};

function makeAdminClient() {
  let listCall = 0;
  return {
    auth: {
      getUser: async () => ({
        data: { user: state.caller },
        error: state.callerError,
      }),
      admin: {
        listUsers: async () => {
          if (state.listUsersError) {
            return { data: { users: [] }, error: state.listUsersError };
          }
          const users = state.userPages[listCall] ?? [];
          listCall += 1;
          return { data: { users }, error: null };
        },
        getUserById: async () => ({
          data: { user: state.targetUser },
          error: state.targetError,
        }),
        deleteUser: async (id: string) => {
          if (state.deleteUserError) return { error: state.deleteUserError };
          state.deletedAuthUsers.push(id);
          state.sequence.push(`auth-delete:${id}`);
          return { error: null };
        },
      },
    },
    rpc: async (fn: string, args: unknown) => {
      state.rpcCalls.push({ fn, args });
      state.sequence.push(`rpc:${fn}`);
      return state.rpcResult;
    },
    from: (table: string) => ({
      delete: () => ({
        eq: async (column: string, value: string) => {
          state.tableDeletes.push(`${table}:${column}=${value}`);
          return { error: null };
        },
      }),
    }),
  };
}

beforeAll(() => {
  (globalThis as { Deno?: unknown }).Deno = {
    serve: (h: Handler) => {
      mockHandlerRef.current = h;
    },
    env: { get: (k: string) => `test-${k}` },
  };
  mockCreateClient.mockImplementation(() => makeAdminClient());
  // Loading the module registers the handler through the Deno.serve stub above.
  require('../../supabase/functions/delete-user/index.ts');
});

beforeEach(() => {
  state.caller = {
    id: 'me',
    app_metadata: { ward_id: 'w1', role: 'bishopric' },
  };
  state.callerError = null;
  // One short page => the pagination loop terminates after a single call.
  state.userPages = [[{ app_metadata: { ward_id: 'w1' } }, { app_metadata: { ward_id: 'w1' } }]];
  state.targetUser = { id: 'u2', app_metadata: { ward_id: 'w1' } };
  state.targetError = null;
  state.deleteUserError = null;
  state.listUsersError = null;
  state.tableDeletes = [];
  state.deletedAuthUsers = [];
  state.rpcResult = { data: false, error: null };
  state.rpcCalls = [];
  state.sequence = [];
});

/** Invoke the handler and return `{ status, body }`. */
async function call(
  body: unknown,
  { auth = 'Bearer tok', method = 'POST' }: { auth?: string | null; method?: string } = {}
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) headers.Authorization = auth;

  const req = new Request('https://example.test/delete-user', {
    method,
    headers,
    body: method === 'OPTIONS' ? undefined : JSON.stringify(body),
  });

  const res = await mockHandlerRef.current!(req);
  const text = await res.text();
  return { status: res.status, body: text ? safeParse(text) : null, raw: text };
}

function safeParse(text: string): Record<string, unknown> | string {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

describe('delete-user — the handler is reachable', () => {
  it('registered itself with Deno.serve', () => {
    expect(typeof mockHandlerRef.current).toBe('function');
  });

  it('answers the CORS preflight without touching anything', async () => {
    const res = await call(null, { method: 'OPTIONS' });
    expect(res.raw).toBe('ok');
    expect(state.deletedAuthUsers).toEqual([]);
  });
});

describe('delete-user — authentication', () => {
  it('rejects a request with no Authorization header', async () => {
    const res = await call({ targetUserId: 'u2' }, { auth: null });
    expect(res.status).toBe(401);
    expect(state.deletedAuthUsers).toEqual([]);
  });

  it('rejects an invalid token', async () => {
    state.callerError = { message: 'bad jwt' };
    const res = await call({ targetUserId: 'u2' });
    expect(res.status).toBe(401);
    expect(state.deletedAuthUsers).toEqual([]);
  });

  it('rejects a caller whose token carries no ward', async () => {
    state.caller = { id: 'me', app_metadata: { role: 'bishopric' } };
    const res = await call({ targetUserId: 'u2' });
    expect(res.status).toBe(403);
  });

  it('rejects a caller whose token carries no role', async () => {
    state.caller = { id: 'me', app_metadata: { ward_id: 'w1' } };
    const res = await call({ targetUserId: 'u2' });
    expect(res.status).toBe(403);
  });

  it('rejects a request with no targetUserId', async () => {
    const res = await call({});
    expect(res.status).toBe(400);
    expect(state.deletedAuthUsers).toEqual([]);
  });
});

describe('delete-user — deleting someone else follows settings:users', () => {
  /**
   * Driven by the CLIENT's permission map on purpose.
   *
   * This assertion used to read "refuses a secretary with 403", transcribed from the server. It
   * passed, and so did the client test saying a secretary lists the whole ward — and neither could
   * see that the two disagreed. The client renders a "Delete user" button for anyone holding
   * settings:users, which PERMISSIONS_MAP grants to secretary; the server allowed only bishopric.
   * A secretary got a destructive confirmation dialog followed by "delete failed", every time.
   *
   * Comparing the two descriptions is the only thing that catches that class of defect, so the
   * comparison is now the test: change either side alone and this goes red.
   */
  it.each(['bishopric', 'secretary', 'observer'] as Role[])(
    '%s: the server agrees with PERMISSIONS_MAP',
    async (role) => {
      state.caller = { id: 'me', app_metadata: { ward_id: 'w1', role } };
      const clientWouldOfferIt = hasPermission(role, 'settings:users' as never);
      const res = await call({ targetUserId: 'u2' });

      if (clientWouldOfferIt) {
        expect(res.status).toBe(200);
        expect(state.deletedAuthUsers).toEqual(['u2']);
      } else {
        expect(res.status).toBe(403);
        expect(res.body).toMatchObject({ error: 'Insufficient permissions' });
        expect(state.deletedAuthUsers).toEqual([]);
      }
    }
  );

  it('refuses an observer outright', async () => {
    state.caller = { id: 'me', app_metadata: { ward_id: 'w1', role: 'observer' } };
    const res = await call({ targetUserId: 'u2' });

    expect(res.status).toBe(403);
    expect(state.deletedAuthUsers).toEqual([]);
  });

  it('refuses an unrecognised role rather than treating it as privileged', async () => {
    state.caller = { id: 'me', app_metadata: { ward_id: 'w1', role: 'superuser' } };
    const res = await call({ targetUserId: 'u2' });

    expect(res.status).toBe(403);
    expect(state.deletedAuthUsers).toEqual([]);
  });

  it('allows a bishopric', async () => {
    const res = await call({ targetUserId: 'u2' });
    expect(res.status).toBe(200);
    expect(state.deletedAuthUsers).toEqual(['u2']);
  });

  it('refuses to delete a user from another ward — the tenancy boundary', async () => {
    state.targetUser = { id: 'u2', app_metadata: { ward_id: 'OTHER' } };
    const res = await call({ targetUserId: 'u2' });

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'Target user not in your ward' });
    expect(state.deletedAuthUsers).toEqual([]);
  });

  it('404s when the target does not exist', async () => {
    state.targetUser = null;
    const res = await call({ targetUserId: 'ghost' });

    expect(res.status).toBe(404);
    expect(state.deletedAuthUsers).toEqual([]);
  });

  it('removes the target push tokens before deleting the account', async () => {
    await call({ targetUserId: 'u2' });
    expect(state.tableDeletes).toContain('device_push_tokens:user_id=u2');
  });

  it('never deletes the ward when removing someone else', async () => {
    await call({ targetUserId: 'u2' });
    expect(state.tableDeletes.some((d) => d.startsWith('wards:'))).toBe(false);
  });

  it('reports a 500 when the auth delete fails, rather than claiming success', async () => {
    state.deleteUserError = { message: 'boom' };
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await call({ targetUserId: 'u2' });
    spy.mockRestore();

    expect(res.status).toBe(500);
    expect(res.body).not.toMatchObject({ success: true });
  });
});

describe('delete-user — self-deletion is allowed to every role (ADR-061)', () => {
  it.each(['bishopric', 'secretary', 'observer'])('lets a %s delete their own account', async (role) => {
    state.caller = { id: 'me', app_metadata: { ward_id: 'w1', role } };
    const res = await call({ targetUserId: 'me' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, deletedUserId: 'me' });
    expect(state.deletedAuthUsers).toEqual(['me']);
  });

  it('keeps the ward when the atomic RPC says a member remains (concurrent delete)', async () => {
    // CONF-07: the last-member decision is the RPC's (row lock + recount in one
    // transaction), not a client-side count another delete can race past.
    state.rpcResult = { data: false, error: null };
    const res = await call({ targetUserId: 'me' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, wardDeleted: false });
    expect(state.tableDeletes).toContain('device_push_tokens:user_id=me');
    expect(state.tableDeletes.some((d) => d.startsWith('wards:'))).toBe(false);
    expect(state.rpcCalls).toEqual([
      { fn: 'delete_ward_if_no_auth_users', args: { p_ward_id: 'w1' } },
    ]);
  });

  it('deletes the auth user BEFORE asking the RPC to delete the ward', async () => {
    state.rpcResult = { data: true, error: null };
    const res = await call({ targetUserId: 'me' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, wardDeleted: true });
    // The ward is never deleted directly by the edge function, and never before the
    // auth user is gone — the old order cascaded the ward away first.
    expect(state.tableDeletes.some((d) => d.startsWith('wards:'))).toBe(false);
    expect(state.sequence).toEqual(['auth-delete:me', 'rpc:delete_ward_if_no_auth_users']);
  });

  it('does not touch the ward at all when the auth delete fails (retryable)', async () => {
    state.deleteUserError = { message: 'boom' };
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await call({ targetUserId: 'me' });
    spy.mockRestore();

    expect(res.status).toBe(500);
    expect(state.rpcCalls).toEqual([]);
    expect(state.tableDeletes.some((d) => d.startsWith('wards:'))).toBe(false);
  });

  it('reports a repairable pending ward cleanup when the RPC fails after the auth delete', async () => {
    state.rpcResult = { data: null, error: { message: 'rpc down' } };
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await call({ targetUserId: 'me' });
    spy.mockRestore();

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, wardDeleted: false, wardCleanup: 'pending' });
    expect(state.deletedAuthUsers).toEqual(['me']);
  });

  it('reports a 500 when the auth delete fails, rather than claiming success', async () => {
    state.deleteUserError = { message: 'boom' };
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await call({ targetUserId: 'me' });
    spy.mockRestore();

    expect(res.status).toBe(500);
    expect(res.body).not.toMatchObject({ success: true });
  });
});

describe('delete-user — malformed input', () => {
  it('returns 500 rather than crashing on an unparseable body', async () => {
    const req = new Request('https://example.test/delete-user', {
      method: 'POST',
      headers: { Authorization: 'Bearer tok', 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await mockHandlerRef.current!(req);
    spy.mockRestore();

    expect(res.status).toBe(500);
    expect(state.deletedAuthUsers).toEqual([]);
  });
});
