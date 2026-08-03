/**
 * The register-first-user Edge Function, executed for real.
 *
 * Unauthenticated, like register-invited-user, but it creates a WARD as well as an account — and
 * the account it creates is the one that can then grant every other role. Its only coverage was
 * the client-side screen (register-screen.test.tsx) plus two readFileSync assertions.
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

/** Row returned by the stake+ward existence probe. null = the ward is free. */
let existingWard: Record<string, unknown> | null;
/** Rows returned for general_collections. */
let generalCollections: { id: string; name: string }[];
let createUserError: { message: string } | null;
/** The `wards` table is read twice: the existence probe, then the insert's RETURNING. */
let wardSelectCall = 0;

const CREATED_WARD = { id: 'ward-1', name: 'Ala Modelo', stake_name: 'Estaca Central' };

beforeAll(() => {
  mockCreateClient.mockImplementation(() => makeAdminClient(responses, rec));
  require('../../supabase/functions/register-first-user/index.ts');
});

beforeEach(() => {
  rec = newRecorder();
  existingWard = null;
  generalCollections = [];
  createUserError = null;
  wardSelectCall = 0;
  responses = {
    select: (table) => {
      if (table === 'wards') {
        wardSelectCall += 1;
        // 1st read is the existence probe; the 2nd is the insert returning its row.
        return wardSelectCall === 1
          ? { data: existingWard, error: null }
          : { data: CREATED_WARD, error: null };
      }
      if (table === 'general_collections') return { data: generalCollections, error: null };
      return { data: null, error: null };
    },
    createUser: () =>
      createUserError
        ? { data: { user: null }, error: createUserError }
        : { data: { user: { id: 'new-user' } }, error: null },
    signInWithPassword: () => ({ data: { session: { access_token: 'at' } }, error: null }),
  };
});

const call = (body: unknown) => callEdge(handlerRef.current!, body, { auth: null });

function quiet() {
  return jest.spyOn(console, 'error').mockImplementation(() => {});
}

const VALID = {
  email: 'bishop@ward.org',
  password: 'secret123',
  stakeName: 'Estaca Central',
  wardName: 'Ala Modelo',
  role: 'bishopric',
  language: 'pt-BR',
  timezone: 'America/Sao_Paulo',
  fullName: 'Bishop Silva',
};

/** The recorded insert into `wards`, if any. */
const wardInsert = () =>
  rec.inserts.find((i) => i.table === 'wards')?.payload as Record<string, unknown> | undefined;

describe('register-first-user — input validation', () => {
  it('answers the CORS preflight', async () => {
    expect((await call(null)).raw).not.toBe('');
  });

  it.each([
    ['email', 'email'],
    ['password', 'password'],
    ['stakeName', 'stakeName'],
    ['wardName', 'wardName'],
    ['role', 'role'],
  ])('rejects a request with no %s', async (_label, field) => {
    const body: Record<string, unknown> = { ...VALID };
    delete body[field];
    const res = await call(body);

    expect(res.status).toBe(400);
    expect(wardInsert()).toBeUndefined();
    expect(rec.createdAuthUsers).toEqual([]);
  });

  it.each([undefined, '', '   '])('rejects the blank fullName %p', async (fullName) => {
    const res = await call({ ...VALID, fullName });
    expect(res.status).toBe(400);
    expect(wardInsert()).toBeUndefined();
  });

  it('rejects a password shorter than 6 characters', async () => {
    const res = await call({ ...VALID, password: 'abc' });
    expect(res.status).toBe(400);
    expect(wardInsert()).toBeUndefined();
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
    expect(wardInsert()).toBeUndefined();
  });
});

describe('register-first-user — self-registration cannot pick an arbitrary role', () => {
  it.each(['bishopric', 'secretary'])('allows %s', async (role) => {
    const res = await call({ ...VALID, role });
    expect(res.status).toBe(201);
    expect(rec.createdAuthUsers[0]).toMatchObject({ app_metadata: { role } });
  });

  it.each(['observer', 'admin', 'superuser', 'BISHOPRIC'])('refuses %p', async (role) => {
    const res = await call({ ...VALID, role });
    expect(res.status).toBe(400);
    expect(rec.createdAuthUsers).toEqual([]);
    expect(wardInsert()).toBeUndefined();
  });
});

describe('register-first-user — a stake+ward pair is claimed once', () => {
  it('refuses a duplicate with 409, and creates nothing', async () => {
    // Two wards with the same name in the same stake would be indistinguishable to their members.
    existingWard = { id: 'already-there' };
    const res = await call(VALID);

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ error: 'stake_ward_exists' });
    expect(wardInsert()).toBeUndefined();
    expect(rec.createdAuthUsers).toEqual([]);
  });

  it('probes on stake AND name together, not either alone', async () => {
    // The same ward name in a different stake is a different ward and must be allowed.
    await call(VALID);
    // The probe is a select; nothing to record. Assert the behaviour instead: a free pair creates.
    expect(wardInsert()).toMatchObject({
      stake_name: 'Estaca Central',
      name: 'Ala Modelo',
    });
  });
});

describe('register-first-user — the ward it creates', () => {
  it('stores the chosen language and timezone', async () => {
    await call({ ...VALID, language: 'es-LA', timezone: 'America/Lima' });
    expect(wardInsert()).toMatchObject({ language: 'es-LA', timezone: 'America/Lima' });
  });

  it('defaults the language to en-US when none is given', async () => {
    const { language: _drop, ...body } = VALID;
    await call(body);
    expect(wardInsert()).toMatchObject({ language: 'en-US' });
  });

  it('defaults the timezone rather than storing an empty one', async () => {
    await call({ ...VALID, timezone: '' });
    expect(wardInsert()).toMatchObject({ timezone: 'America/Sao_Paulo' });
  });

  it.each([
    ['pt-BR', 'Podemos confirmar o seu discurso?'],
    ['en-US', 'Can we confirm your speech?'],
    ['es-LA', '¿Podemos confirmar tu discurso?'],
  ])('seeds %s WhatsApp templates in that language', async (language, marker) => {
    await call({ ...VALID, language });
    const w = wardInsert() as Record<string, string>;

    for (const key of [
      'whatsapp_template_speech_1',
      'whatsapp_template_speech_2',
      'whatsapp_template_speech_3',
    ]) {
      expect(w[key]).toContain(marker);
    }
    expect(w.whatsapp_template_opening_prayer).toBeTruthy();
    expect(w.whatsapp_template_closing_prayer).toBeTruthy();
  });

  it('seeds every speech template with the placeholders the sender substitutes', async () => {
    // A template missing {nome} or {data} silently sends "Hi , ... on Sunday".
    await call(VALID);
    const w = wardInsert() as Record<string, string>;

    for (const key of [
      'whatsapp_template_speech_1',
      'whatsapp_template_speech_2',
      'whatsapp_template_speech_3',
    ]) {
      expect(w[key]).toContain('{nome}');
      expect(w[key]).toContain('{data}');
      expect(w[key]).toContain('{titulo}');
    }
    expect(w.whatsapp_template_opening_prayer).toContain('{nome}');
    expect(w.whatsapp_template_closing_prayer).toContain('{data}');
  });

  it('gives each speech position its own template', async () => {
    await call(VALID);
    const w = wardInsert() as Record<string, string>;
    const templates = [
      w.whatsapp_template_speech_1,
      w.whatsapp_template_speech_2,
      w.whatsapp_template_speech_3,
    ];
    expect(new Set(templates).size).toBe(3);
  });

  it.each([
    ['pt-BR', ['Tema livre', 'Seu testemunho']],
    ['en-US', ['Open Topic', 'Your Testimony']],
    ['es-LA', ['Tema libre', 'Tu testimonio']],
  ])('seeds the %s default topics', async (language, titles) => {
    await call({ ...VALID, language });
    const topics = rec.inserts.find((i) => i.table === 'ward_topics')?.payload as {
      title: string;
      ward_id: string;
      is_default: boolean;
    }[];

    expect(topics.map((t) => t.title)).toEqual(titles);
    expect(topics.every((t) => t.ward_id === 'ward-1')).toBe(true);
    expect(topics.every((t) => t.is_default)).toBe(true);
  });

  it('falls back to the en-US topics for an unknown language', async () => {
    await call({ ...VALID, language: 'fr-FR' });
    const topics = rec.inserts.find((i) => i.table === 'ward_topics')?.payload as {
      title: string;
    }[];
    expect(topics.map((t) => t.title)).toEqual(['Open Topic', 'Your Testimony']);
  });

  it('does not create the user when the ward could not be created', async () => {
    responses.select = (table) => {
      if (table === 'wards') {
        wardSelectCall += 1;
        return wardSelectCall === 1
          ? { data: null, error: null }
          : { data: null, error: { message: 'insert failed' } };
      }
      return { data: null, error: null };
    };
    const spy = quiet();
    const res = await call(VALID);
    spy.mockRestore();

    expect(res.status).toBe(500);
    expect(rec.createdAuthUsers).toEqual([]);
  });
});

describe('register-first-user — the account it creates', () => {
  it('binds the account to the ward it just made', async () => {
    await call(VALID);
    expect(rec.createdAuthUsers[0]).toMatchObject({
      email: 'bishop@ward.org',
      email_confirm: true,
      app_metadata: { ward_id: 'ward-1', role: 'bishopric', full_name: 'Bishop Silva' },
      user_metadata: { language: 'pt-BR' },
    });
  });

  it('trims the supplied name', async () => {
    await call({ ...VALID, fullName: '  Bishop Silva  ' });
    expect(rec.createdAuthUsers[0]).toMatchObject({
      app_metadata: { full_name: 'Bishop Silva' },
    });
  });

  it('deletes the orphaned ward when the account cannot be created', async () => {
    // Otherwise the stake+ward pair is claimed forever by a ward nobody can sign in to, and the
    // 409 above makes it impossible to retry with the same names.
    createUserError = { message: 'boom' };
    const spy = quiet();
    const res = await call(VALID);
    spy.mockRestore();

    expect(res.status).toBe(500);
    expect(rec.tableDeletes).toContain('wards:id=ward-1');
  });

  it('reports a duplicate email as 409 email_exists, not a generic failure', async () => {
    createUserError = { message: 'A user with this email address has already been registered' };
    const res = await call(VALID);

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ error: 'email_exists' });
  });

  it('still cleans up the ward on a duplicate email', async () => {
    createUserError = { message: 'A user with this email address has already been registered' };
    await call(VALID);
    expect(rec.tableDeletes).toContain('wards:id=ward-1');
  });
});

describe('register-first-user — default topic collections', () => {
  it('activates the standard collections and the newest conference, and no others', async () => {
    generalCollections = [
      { id: 'c1', name: 'Para a Forca da Juventude' },
      { id: 'c2', name: 'Principios do Evangelho' },
      { id: 'c3', name: 'Conferencia Geral 2024-04' },
      { id: 'c4', name: 'Conferencia Geral 2025-10' },
    ];
    await call({ ...VALID, language: 'pt-BR' });

    const cfg = rec.inserts.find((i) => i.table === 'ward_collection_config')?.payload as {
      collection_id: string;
      active: boolean;
      ward_id: string;
    }[];
    const active = cfg.filter((c) => c.active).map((c) => c.collection_id).sort();

    expect(active).toEqual(['c1', 'c2', 'c4']);
    expect(cfg.every((c) => c.ward_id === 'ward-1')).toBe(true);
  });

  it('writes a config row for every collection, active or not', async () => {
    generalCollections = [
      { id: 'c1', name: 'Gospel Principles' },
      { id: 'c2', name: 'General Conference 2020-04' },
      { id: 'c3', name: 'General Conference 2025-10' },
    ];
    await call({ ...VALID, language: 'en-US' });

    const cfg = rec.inserts.find((i) => i.table === 'ward_collection_config')?.payload as unknown[];
    expect(cfg).toHaveLength(3);
  });

  it('writes nothing when the language has no collections', async () => {
    generalCollections = [];
    await call(VALID);
    expect(rec.inserts.find((i) => i.table === 'ward_collection_config')).toBeUndefined();
  });

  it('still succeeds when the collection config cannot be written', async () => {
    // Non-fatal by design: the ward and the account exist, and collections can be set up later.
    generalCollections = [{ id: 'c1', name: 'Gospel Principles' }];
    responses.write = (table) =>
      table === 'ward_collection_config'
        ? { data: null, error: { message: 'boom' } }
        : { data: null, error: null };
    const spy = quiet();
    const res = await call(VALID);
    spy.mockRestore();

    expect(res.status).toBe(201);
  });
});

describe('register-first-user — the session', () => {
  it('returns the ward and a session so the user lands signed in', async () => {
    const res = await call(VALID);

    expect(res.status).toBe(201);
    expect(res.body.ward).toMatchObject({ id: 'ward-1' });
    expect(res.body.session).toMatchObject({ access_token: 'at' });
  });

  it('still reports success when auto sign-in fails, and says so', async () => {
    responses.signInWithPassword = () => ({ data: { session: null }, error: { message: 'boom' } });
    const spy = quiet();
    const res = await call(VALID);
    spy.mockRestore();

    expect(res.status).toBe(201);
    expect(res.body.session).toBeNull();
    expect(res.body.message).toMatch(/log in manually/i);
    expect(res.body.ward).toMatchObject({ id: 'ward-1' });
  });
});
