/**
 * Runs a Supabase Edge Function for real inside jest.
 *
 * The functions run under Deno and import supabase-js from an https URL, so they are not part of
 * the app bundle and looked untestable from here — which is why their only coverage used to be
 * readFileSync + toContain against their own source text. That cannot distinguish an authorization
 * check from an inverted one, on precisely the code that is the security boundary.
 *
 * Two stubs are enough:
 *   - a VIRTUAL jest.mock for the URL import (declared by the caller, since jest.mock is hoisted
 *     per module),
 *   - a `Deno` global whose `serve` captures the handler.
 *
 * The caller then drives the handler with real Request objects and asserts on the real Response.
 */

export type EdgeHandler = (req: Request) => Promise<Response>;

/** Everything the fake admin client did, so tests assert on effects rather than on calls. */
export interface AdminRecorder {
  /** `${table}:${column}=${value}` for each delete. */
  tableDeletes: string[];
  /** `{ table, payload }` for each insert. */
  inserts: { table: string; payload: unknown }[];
  /** `{ table, payload, filters }` for each update. */
  updates: { table: string; payload: unknown; filters: [string, unknown][] }[];
  /** ids passed to auth.admin.deleteUser. */
  deletedAuthUsers: string[];
  /** `{ id, attrs }` for each auth.admin.updateUserById. */
  updatedAuthUsers: { id: string; attrs: Record<string, unknown> }[];
  /** `{ attrs }` for each auth.admin.createUser. */
  createdAuthUsers: Record<string, unknown>[];
  /** `{ fn, args }` for each rpc call. */
  rpcCalls: { fn: string; args: unknown }[];
  /** `{ table, filters }` for each read, so query SCOPING can be asserted. */
  selects: { table: string; filters: [string, unknown][] }[];
}

export function newRecorder(): AdminRecorder {
  return {
    tableDeletes: [],
    inserts: [],
    updates: [],
    deletedAuthUsers: [],
    updatedAuthUsers: [],
    createdAuthUsers: [],
    rpcCalls: [],
    selects: [],
  };
}

/** What the fake client should answer. Every field is a function so tests can vary per call. */
export interface AdminResponses {
  getUser?: () => { data: { user: unknown }; error: unknown };
  getUserById?: () => { data: { user: unknown }; error: unknown };
  listUsers?: () => { data: { users: unknown[] }; error: unknown };
  createUser?: () => { data: { user: unknown }; error: unknown };
  updateUserById?: () => { error: unknown };
  deleteUser?: () => { error: unknown };
  signInWithPassword?: () => { data: { session: unknown }; error: unknown };
  rpc?: (fn: string, args: unknown) => { data: unknown; error: unknown };
  /** Result of a terminal select, keyed by table. */
  select?: (table: string) => { data: unknown; error: unknown };
  /** Result of a write (insert/update/delete), keyed by table. */
  write?: (table: string) => { data: unknown; error: unknown };
}

/**
 * A stand-in for the service-role client.
 *
 * The query builder is a thenable proxy: every method returns the builder, and awaiting it yields
 * the configured result. That matches how postgrest-js is used (chain then await) without
 * modelling postgrest itself.
 */
export function makeAdminClient(responses: AdminResponses, rec: AdminRecorder) {
  const ok = { data: null, error: null };

  function builder(table: string) {
    let kind: 'select' | 'insert' | 'update' | 'delete' = 'select';
    let payload: unknown;
    /** True once .select() is chained — i.e. the write is expected to return the stored row. */
    let returning = false;
    const filters: [string, unknown][] = [];

    const result = () => {
      if (kind === 'insert') rec.inserts.push({ table, payload });
      if (kind === 'update') rec.updates.push({ table, payload, filters: [...filters] });
      if (kind === 'delete') {
        for (const [col, val] of filters) rec.tableDeletes.push(`${table}:${col}=${val}`);
        if (filters.length === 0) rec.tableDeletes.push(`${table}:*`);
      }
      if (kind === 'select') rec.selects.push({ table, filters: [...filters] });
      // A plain read, or a write with `.select()` chained, yields a row; a bare write does not.
      if (kind === 'select' || returning) return responses.select?.(table) ?? ok;
      return responses.write?.(table) ?? ok;
    };

    const chain: Record<string, unknown> = {
      select: (..._a: unknown[]) => {
        returning = true;
        return chain;
      },
      insert: (p: unknown) => {
        kind = 'insert';
        payload = p;
        return chain;
      },
      update: (p: unknown) => {
        kind = 'update';
        payload = p;
        return chain;
      },
      upsert: (p: unknown) => {
        kind = 'insert';
        payload = p;
        return chain;
      },
      delete: () => {
        kind = 'delete';
        return chain;
      },
      eq: (c: string, v: unknown) => {
        filters.push([c, v]);
        return chain;
      },
      neq: (c: string, v: unknown) => {
        filters.push([c, v]);
        return chain;
      },
      gte: (c: string, v: unknown) => {
        filters.push([c, v]);
        return chain;
      },
      lte: (c: string, v: unknown) => {
        filters.push([c, v]);
        return chain;
      },
      lt: (c: string, v: unknown) => {
        filters.push([c, v]);
        return chain;
      },
      gt: (c: string, v: unknown) => {
        filters.push([c, v]);
        return chain;
      },
      in: (c: string, v: unknown) => {
        filters.push([c, v]);
        return chain;
      },
      is: (c: string, v: unknown) => {
        filters.push([c, v]);
        return chain;
      },
      order: () => chain,
      limit: () => chain,
      single: () => Promise.resolve(result()),
      maybeSingle: () => Promise.resolve(result()),
      then: (onOk: (v: unknown) => unknown, onErr?: (e: unknown) => unknown) =>
        Promise.resolve(result()).then(onOk, onErr),
    };
    return chain;
  }

  return {
    auth: {
      getUser: async () => responses.getUser?.() ?? { data: { user: null }, error: null },
      signInWithPassword: async () =>
        responses.signInWithPassword?.() ?? { data: { session: null }, error: null },
      admin: {
        getUserById: async () =>
          responses.getUserById?.() ?? { data: { user: null }, error: null },
        listUsers: async () => responses.listUsers?.() ?? { data: { users: [] }, error: null },
        createUser: async (attrs: Record<string, unknown>) => {
          const res = responses.createUser?.() ?? { data: { user: null }, error: null };
          if (!res.error) rec.createdAuthUsers.push(attrs);
          return res;
        },
        updateUserById: async (id: string, attrs: Record<string, unknown>) => {
          const res = responses.updateUserById?.() ?? { error: null };
          if (!res.error) rec.updatedAuthUsers.push({ id, attrs });
          return res;
        },
        deleteUser: async (id: string) => {
          const res = responses.deleteUser?.() ?? { error: null };
          if (!res.error) rec.deletedAuthUsers.push(id);
          return res;
        },
      },
    },
    from: (table: string) => builder(table),
    rpc: async (fn: string, args: unknown) => {
      rec.rpcCalls.push({ fn, args });
      return responses.rpc?.(fn, args) ?? { data: null, error: null };
    },
  };
}

/** Install the Deno global. Returns a ref that `serve` fills in when the module is required. */
export function installDeno(): { current: EdgeHandler | null } {
  const ref: { current: EdgeHandler | null } = { current: null };
  (globalThis as { Deno?: unknown }).Deno = {
    serve: (h: EdgeHandler) => {
      ref.current = h;
    },
    env: { get: (k: string) => `test-${k}` },
  };
  return ref;
}

/** Build a Request the way the client does. */
export function edgeRequest(
  body: unknown,
  { auth = 'Bearer tok', method = 'POST' }: { auth?: string | null; method?: string } = {}
): Request {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) headers.Authorization = auth;
  return new Request('https://example.test/fn', {
    method,
    headers,
    body: method === 'OPTIONS' || method === 'GET' ? undefined : JSON.stringify(body),
  });
}

/** Invoke a handler and decode its response. */
export async function callEdge(
  handler: EdgeHandler,
  body: unknown,
  opts?: { auth?: string | null; method?: string }
): Promise<{ status: number; body: Record<string, unknown>; raw: string }> {
  const res = await handler(edgeRequest(body, opts));
  const raw = await res.text();
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {};
  }
  return { status: res.status, body: parsed, raw };
}
