/**
 * The process-notifications Edge Function, executed for real.
 *
 * A cron job that pushes to real phones every five minutes. Its failure modes are loud in exactly
 * the wrong way: notifying the wrong ward, notifying the wrong role, sending the same reminder
 * three times instead of grouping it, or never marking entries sent so the whole queue replays on
 * the next tick. Its coverage was source-text assertions plus a hand-rolled re-implementation of
 * the grouping logic in f065-f066-tester, which cannot catch any of that.
 */
import {
  makeAdminClient,
  newRecorder,
  installDeno,
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

/** Rows the fake returns per table. */
let pendingQueue: Record<string, unknown>[];
let wards: { id: string; language: string; timezone: string }[];
let pushTokens: { expo_push_token: string; user_id: string }[];
/** Expo Push API tickets, one per message; undefined = all accepted. */
let pushTickets: { status: string; details?: { error: string } }[] | null;
/** Every payload posted to the Expo Push API. */
let pushed: { to: string; title: string; body: string }[][];
let fetchSpy: jest.SpyInstance;

beforeAll(() => {
  mockCreateClient.mockImplementation(() => makeAdminClient(responses, rec));
  require('../../supabase/functions/process-notifications/index.ts');
});

beforeEach(() => {
  rec = newRecorder();
  pendingQueue = [];
  wards = [{ id: 'w1', language: 'pt-BR', timezone: 'America/Sao_Paulo' }];
  pushTokens = [{ expo_push_token: 'ExpoTok[A]', user_id: 'u1' }];
  pushTickets = null;
  pushed = [];

  responses = {
    select: (table) => {
      if (table === 'notification_queue') return { data: pendingQueue, error: null };
      if (table === 'wards') return { data: wards, error: null };
      if (table === 'device_push_tokens') return { data: pushTokens, error: null };
      return { data: null, error: null };
    },
  };

  fetchSpy = jest.spyOn(globalThis, 'fetch').mockImplementation((async (
    _url: string,
    init: { body: string }
  ) => {
    const messages = JSON.parse(init.body);
    pushed.push(messages);
    return {
      json: async () => ({
        data: pushTickets ?? messages.map(() => ({ status: 'ok' })),
      }),
    };
  }) as unknown as typeof fetch);
});

afterEach(() => {
  fetchSpy.mockRestore();
});

async function run() {
  const res = await handlerRef.current!(new Request('https://example.test/fn', { method: 'POST' }));
  return { status: res.status, body: JSON.parse(await res.text()) };
}

function entry(over: Record<string, unknown> = {}) {
  return {
    id: 'q1',
    ward_id: 'w1',
    type: 'designation',
    sunday_date: '2026-08-09',
    speech_position: 1,
    speaker_name: 'Ana',
    topic_title: null,
    target_role: 'bishopric',
    status: 'pending',
    send_after: '2026-08-01T00:00:00.000Z',
    ...over,
  };
}

/** All messages sent, flattened. */
const allMessages = () => pushed.flat();

describe('process-notifications — the queue read', () => {
  it('does nothing at all when the queue is empty', async () => {
    const res = await run();

    expect(res.body).toEqual({ processed: 0 });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(rec.updates).toEqual([]);
  });

  it('asks only for pending entries that are due', async () => {
    // Without both filters the cron would fire scheduled reminders early, or re-send sent ones.
    pendingQueue = [entry()];
    await run();

    const read = rec.selects.find((s) => s.table === 'notification_queue')!;
    expect(read.filters).toContainEqual(['status', 'pending']);
    expect(read.filters.some(([c]) => c === 'send_after')).toBe(true);
  });

  it('reports the error rather than silently sending nothing', async () => {
    responses.select = (table) =>
      table === 'notification_queue'
        ? { data: null, error: { message: 'db down' } }
        : { data: [], error: null };
    const res = await run();

    expect(res.status).toBe(500);
  });
});

describe('process-notifications — speech designations are grouped', () => {
  it('sends ONE notification for several speakers on the same Sunday', async () => {
    // Three separate pushes for one Sunday is how a ward learns to mute the app.
    pendingQueue = [
      entry({ id: 'q1', speaker_name: 'Ana', speech_position: 1 }),
      entry({ id: 'q2', speaker_name: 'Bruno', speech_position: 2 }),
      entry({ id: 'q3', speaker_name: 'Carla', speech_position: 3 }),
    ];
    const res = await run();

    expect(pushed).toHaveLength(1);
    expect(allMessages()[0].body).toContain('Ana, Bruno e Carla');
    expect(res.body.processed).toBe(3);
  });

  it('does not merge different Sundays', async () => {
    pendingQueue = [
      entry({ id: 'q1', speaker_name: 'Ana', sunday_date: '2026-08-09' }),
      entry({ id: 'q2', speaker_name: 'Bruno', sunday_date: '2026-08-16' }),
    ];
    await run();

    expect(pushed).toHaveLength(2);
  });

  it('does not merge different wards — the tenancy boundary of a push', async () => {
    // Merging would put another ward's member names in this ward's notification.
    wards = [
      { id: 'w1', language: 'pt-BR', timezone: 'X' },
      { id: 'w2', language: 'pt-BR', timezone: 'X' },
    ];
    pendingQueue = [
      entry({ id: 'q1', ward_id: 'w1', speaker_name: 'Ana' }),
      entry({ id: 'q2', ward_id: 'w2', speaker_name: 'Bruno' }),
    ];
    await run();

    expect(pushed).toHaveLength(2);
    const bodies = allMessages().map((m) => m.body);
    expect(bodies.find((b) => b.includes('Ana'))).not.toContain('Bruno');
  });

  it('joins two names with the language conjunction, not a comma', async () => {
    pendingQueue = [
      entry({ id: 'q1', speaker_name: 'Ana' }),
      entry({ id: 'q2', speaker_name: 'Bruno' }),
    ];
    await run();
    expect(allMessages()[0].body).toContain('Ana e Bruno');
  });

  it('uses the ward language, not a fixed one', async () => {
    wards = [{ id: 'w1', language: 'en-US', timezone: 'X' }];
    pendingQueue = [entry()];
    await run();

    expect(allMessages()[0].title).toBe('Speech Assignment');
  });

  it('falls back to en-US for a ward that is missing from the cache', async () => {
    wards = [];
    pendingQueue = [entry()];
    await run();

    expect(allMessages()[0].title).toBe('Speech Assignment');
  });
});

describe('process-notifications — prayers are individual, not grouped', () => {
  it.each([0, 4])('sends position %i on its own', async (position) => {
    pendingQueue = [
      entry({ id: 'q1', speech_position: position, speaker_name: 'Ana' }),
      entry({ id: 'q2', speech_position: position, speaker_name: 'Bruno' }),
    ];
    await run();

    expect(pushed).toHaveLength(2);
  });

  it('names the opening prayer, not a speech', async () => {
    pendingQueue = [entry({ speech_position: 0, speaker_name: 'Ana' })];
    await run();

    expect(allMessages()[0].title).toBe('Designação de Oração');
    expect(allMessages()[0].body).toContain('oração de abertura');
  });

  it('names the closing prayer for position 4', async () => {
    pendingQueue = [entry({ speech_position: 4, speaker_name: 'Ana' })];
    await run();

    expect(allMessages()[0].body).toContain('oração de encerramento');
  });
});

describe('process-notifications — the other entry types', () => {
  it('builds the withdrew text with the ordinal', async () => {
    pendingQueue = [
      entry({ type: 'speaker_withdrew', speaker_name: 'Ana', speech_position: 2 }),
    ];
    await run();

    expect(allMessages()[0].title).toContain('Desistência');
    expect(allMessages()[0].body).toContain('2º discurso');
  });

  it('builds the secretary-review text naming the topic when there is one', async () => {
    pendingQueue = [
      entry({ type: 'secretary_review', speaker_name: 'Ana', topic_title: 'Fé', speech_position: 1 }),
    ];
    await run();

    expect(allMessages()[0].body).toContain('Fé');
    expect(allMessages()[0].body).toContain('Ana');
  });

  it('builds the speaker variant of secretary review when there is no topic', async () => {
    pendingQueue = [
      entry({ type: 'secretary_review', speaker_name: 'Ana', topic_title: null, speech_position: 3 }),
    ];
    await run();

    expect(allMessages()[0].body).toContain('3º discurso');
  });

  // The three-language matrix below replaces process-notifications-secretary-review.test.ts,
  // which asserted a COPY of buildSecretaryReviewText pasted into the test file. These drive the
  // real one, so a change to the shipped text is visible here.
  it.each([
    ['pt-BR', 'Revisão de Designação', 'secretário', '1º'],
    ['en-US', 'Assignment Review', 'the secretary assigned', '1st'],
    ['es-LA', 'Revisión de Asignación', 'el secretario', '1er'],
  ])('secretary review, speaker variant, in %s', async (language, title, phrase, ordinal) => {
    wards = [{ id: 'w1', language, timezone: 'X' }];
    pendingQueue = [
      entry({ type: 'secretary_review', speaker_name: 'Maria', topic_title: null, speech_position: 1 }),
    ];
    await run();

    const m = allMessages()[0];
    expect(m.title).toBe(title);
    expect(m.body).toContain(phrase);
    expect(m.body).toContain('Maria');
    expect(m.body).toContain(ordinal);
    expect(m.body).toContain('2026-08-09');
  });

  it.each([
    ['pt-BR', 'tema Fé em Cristo'],
    ['en-US', 'topic Fé em Cristo'],
    ['es-LA', 'tema Fé em Cristo'],
  ])('secretary review, topic variant, in %s', async (language, phrase) => {
    wards = [{ id: 'w1', language, timezone: 'X' }];
    pendingQueue = [
      entry({
        type: 'secretary_review',
        speaker_name: 'Maria',
        topic_title: 'Fé em Cristo',
        speech_position: 1,
      }),
    ];
    await run();

    expect(allMessages()[0].body).toContain(phrase);
  });

  it('falls back to en-US text for a language with no translation', async () => {
    wards = [{ id: 'w1', language: 'fr-FR', timezone: 'X' }];
    pendingQueue = [entry({ type: 'secretary_review', speaker_name: 'Maria', speech_position: 1 })];
    await run();

    expect(allMessages()[0].title).toBe('Assignment Review');
  });

  it.each(['weekly_assignment', 'weekly_confirmation'])('sends the weekly reminder for %s', async (type) => {
    pendingQueue = [entry({ type })];
    await run();

    expect(allMessages()[0].title).toBe('Lembrete de Discurso');
  });

  it('sends nothing for an unrecognised type, but still retires the entry', async () => {
    // An unknown type must not wedge the queue by being retried forever.
    pendingQueue = [entry({ type: 'something_new' })];
    const res = await run();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(res.body.processed).toBe(1);
  });
});

describe('process-notifications — who receives it', () => {
  it('targets the ward of the entry, and only enabled devices', async () => {
    pendingQueue = [entry({ target_role: 'bishopric' })];
    await run();

    const read = rec.selects.find((s) => s.table === 'device_push_tokens')!;
    expect(read.filters).toContainEqual(['ward_id', 'w1']);
    // The per-user master opt-out (migration 046). Dropping it notifies people who opted out.
    expect(read.filters).toContainEqual(['notifications_enabled', true]);
  });

  it.each([
    ['bishopric', ['bishopric']],
    ['secretary', ['secretary']],
    ['secretary_and_bishopric', ['secretary', 'bishopric']],
  ])('expands target_role %s to %p', async (target_role, roles) => {
    pendingQueue = [entry({ target_role })];
    await run();

    const read = rec.selects.find((s) => s.table === 'device_push_tokens')!;
    expect(read.filters).toContainEqual(['role', roles]);
  });

  it('sends one message per device', async () => {
    pushTokens = [
      { expo_push_token: 'ExpoTok[A]', user_id: 'u1' },
      { expo_push_token: 'ExpoTok[B]', user_id: 'u2' },
    ];
    pendingQueue = [entry()];
    await run();

    expect(allMessages().map((m) => m.to)).toEqual(['ExpoTok[A]', 'ExpoTok[B]']);
  });

  it('does not call the push API when nobody is subscribed', async () => {
    pushTokens = [];
    pendingQueue = [entry()];
    const res = await run();

    expect(fetchSpy).not.toHaveBeenCalled();
    // The entry is still retired: there is nobody to tell, and retrying will not change that.
    expect(res.body.processed).toBe(1);
  });
});

describe('process-notifications — retiring and cleanup', () => {
  it('marks exactly the processed entries as sent', async () => {
    pendingQueue = [entry({ id: 'q1' }), entry({ id: 'q2', sunday_date: '2026-08-16' })];
    await run();

    const update = rec.updates.find((u) => u.table === 'notification_queue')!;
    expect(update.payload).toEqual({ status: 'sent' });
    expect(update.filters).toContainEqual(['id', ['q1', 'q2']]);
  });

  it('drops tokens the push service rejected as unregistered', async () => {
    // A dead token is retried on every tick forever otherwise.
    pushTokens = [
      { expo_push_token: 'ExpoTok[A]', user_id: 'u1' },
      { expo_push_token: 'ExpoTok[B]', user_id: 'u2' },
    ];
    pushTickets = [
      { status: 'error', details: { error: 'DeviceNotRegistered' } },
      { status: 'ok' },
    ];
    pendingQueue = [entry()];
    const res = await run();

    expect(rec.tableDeletes).toContain('device_push_tokens:expo_push_token=ExpoTok[A]');
    expect(res.body.invalidTokensRemoved).toBe(1);
  });

  it('keeps a token that failed for a transient reason', async () => {
    // MessageRateExceeded is not a reason to unregister someone's phone.
    pushTickets = [{ status: 'error', details: { error: 'MessageRateExceeded' } }];
    pendingQueue = [entry()];
    const res = await run();

    expect(res.body.invalidTokensRemoved).toBe(0);
    expect(rec.tableDeletes.some((d) => d.startsWith('device_push_tokens:expo_push_token'))).toBe(
      false
    );
  });

  it('still retires the entries when the push API is unreachable', async () => {
    // Otherwise an outage leaves a growing backlog that all fires at once on recovery.
    fetchSpy.mockRejectedValue(new Error('network'));
    pendingQueue = [entry()];
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await run();
    spy.mockRestore();

    expect(res.body.processed).toBe(1);
    expect(rec.updates.find((u) => u.table === 'notification_queue')).toBeDefined();
  });

  it('sweeps only old, already-finished entries', async () => {
    pendingQueue = [entry()];
    await run();

    const sweep = rec.tableDeletes.filter((d) => d.startsWith('notification_queue:'));
    expect(sweep).toContain('notification_queue:status=sent,cancelled');
    expect(sweep.some((d) => d.startsWith('notification_queue:created_at='))).toBe(true);
  });
});
