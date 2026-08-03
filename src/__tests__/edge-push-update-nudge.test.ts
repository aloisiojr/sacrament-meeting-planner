/**
 * The push-update-nudge Edge Function, executed for real.
 *
 * A cron job that pushes "please update" to phones running a version below
 * app_config.min_supported_version. Its header says "Verified live on staging (Deno; not covered
 * by vitest)" — which was true, and is the reason it is the one place in the codebase where the
 * semver comparison exists twice: `isBelowMinimum` is copy-pasted from src/lib/semver.ts because
 * Deno cannot import from src/. A drift between the two means the app's own version gate and the
 * nudge disagree about who is outdated.
 *
 * Two things make this worth pinning: an over-eager comparison nags every user in every ward on a
 * five-minute cron, and a broken interval filter does it repeatedly.
 */
import {
  makeAdminClient,
  newRecorder,
  installDeno,
  type AdminResponses,
  type AdminRecorder,
} from './helpers/edgeFunctionHarness';
import { isBelowMinimum as appIsBelowMinimum } from '../lib/semver';

const mockCreateClient = jest.fn();
jest.mock(
  'https://esm.sh/@supabase/supabase-js@2',
  () => ({ createClient: (...a: unknown[]) => mockCreateClient(...a) }),
  { virtual: true }
);

let rec: AdminRecorder;
let responses: AdminResponses;
const handlerRef = installDeno();

let config: { min_supported_version: string; nudge_interval_days: number | null } | null;
let tokenRows: Record<string, unknown>[];
let tokenError: unknown;
/** Every batch posted to the Expo Push API. */
let pushed: { to: string; title: string; body: string }[][];
let fetchSpy: jest.SpyInstance;

beforeAll(() => {
  mockCreateClient.mockImplementation(() => makeAdminClient(responses, rec));
  require('../../supabase/functions/push-update-nudge/index.ts');
});

beforeEach(() => {
  rec = newRecorder();
  config = { min_supported_version: '2.0.0', nudge_interval_days: 3 };
  tokenRows = [];
  tokenError = null;
  pushed = [];
  responses = {
    select: (table) => {
      if (table === 'app_config') return { data: config, error: null };
      if (table === 'device_push_tokens') return { data: tokenRows, error: tokenError };
      return { data: null, error: null };
    },
  };
  fetchSpy = jest.spyOn(globalThis, 'fetch').mockImplementation((async (
    _url: string,
    init: { body: string }
  ) => {
    pushed.push(JSON.parse(init.body));
    return { json: async () => ({ data: [] }) };
  }) as unknown as typeof fetch);
});

afterEach(() => fetchSpy.mockRestore());

async function run() {
  const res = await handlerRef.current!(new Request('https://x.test/fn', { method: 'POST' }));
  return { status: res.status, body: JSON.parse(await res.text()) };
}

function device(over: Record<string, unknown> = {}) {
  return {
    id: 'd1',
    expo_push_token: 'ExpoTok[A]',
    app_version: '1.0.0',
    ward_id: 'w1',
    wards: { language: 'pt-BR' },
    ...over,
  };
}

const allMessages = () => pushed.flat();

describe('push-update-nudge — who gets nudged', () => {
  it('nudges a device below the minimum', async () => {
    tokenRows = [device({ app_version: '1.9.9' })];
    const res = await run();

    expect(res.body).toEqual({ sent: 1 });
    expect(allMessages()).toHaveLength(1);
  });

  it('leaves a device at the minimum alone', async () => {
    // Off by one here nags every up-to-date user in every ward.
    tokenRows = [device({ app_version: '2.0.0' })];
    const res = await run();

    expect(res.body).toEqual({ sent: 0 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('leaves a device above the minimum alone', async () => {
    tokenRows = [device({ app_version: '2.1.0' })];
    expect((await run()).body).toEqual({ sent: 0 });
  });

  it('nudges a device with an unknown version', async () => {
    // Pre-gate builds (v1.0) never reported one; they are the whole point of the job.
    tokenRows = [device({ app_version: null })];
    expect((await run()).body).toEqual({ sent: 1 });
  });

  it('nudges only the outdated devices out of a mixed set', async () => {
    tokenRows = [
      device({ id: 'd1', expo_push_token: 'A', app_version: '1.0.0' }),
      device({ id: 'd2', expo_push_token: 'B', app_version: '2.0.0' }),
      device({ id: 'd3', expo_push_token: 'C', app_version: null }),
    ];
    const res = await run();

    expect(res.body).toEqual({ sent: 2 });
    expect(allMessages().map((m) => m.to).sort()).toEqual(['A', 'C']);
  });
});

describe('push-update-nudge — its semver copy agrees with the app', () => {
  // isBelowMinimum is duplicated in the Deno function because it cannot import from src/. If the
  // two ever disagree, the app blocks a version the nudge considers fine, or vice versa.
  const CASES = ['0.9.9', '1.0.0', '1.9.9', '2.0.0', '2.0.1', '2.1.0', '3.0.0', '10.0.0', '2.0.0-beta.1'];

  it.each(CASES)('agrees with lib/semver on %s vs 2.0.0', async (version) => {
    tokenRows = [device({ app_version: version })];
    const res = await run();

    const appSaysOutdated = appIsBelowMinimum(version, '2.0.0');
    expect(res.body.sent).toBe(appSaysOutdated ? 1 : 0);
  });

  it('treats a two-part version as its implicit patch zero', async () => {
    config = { min_supported_version: '2.0.1', nudge_interval_days: 3 };
    tokenRows = [device({ app_version: '2.0' })];
    expect((await run()).body).toEqual({ sent: 1 });
  });

  it('compares numerically, not lexically', async () => {
    // '10.0.0' < '2.0.0' as strings; a string comparison would nag every user after v10.
    config = { min_supported_version: '2.0.0', nudge_interval_days: 3 };
    tokenRows = [device({ app_version: '10.0.0' })];
    expect((await run()).body).toEqual({ sent: 0 });
  });
});

describe('push-update-nudge — nobody is nudged twice in one interval', () => {
  it('asks only for devices not nudged within the interval', async () => {
    tokenRows = [device()];
    await run();

    const read = rec.selects.find((s) => s.table === 'device_push_tokens')!;
    const or = read.filters.find(([c]) => c === 'or')?.[1] as string;
    expect(or).toContain('last_update_nudge_at.is.null');
    expect(or).toContain('last_update_nudge_at.lt.');
  });

  it('uses the configured interval, not a fixed one', async () => {
    config = { min_supported_version: '2.0.0', nudge_interval_days: 30 };
    tokenRows = [device()];
    await run();

    const or = rec.selects.find((s) => s.table === 'device_push_tokens')!
      .filters.find(([c]) => c === 'or')![1] as string;
    const cutoff = new Date(or.split('last_update_nudge_at.lt.')[1]).getTime();
    const days = (Date.now() - cutoff) / 86_400_000;
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThan(30.1);
  });

  it('defaults the interval to 7 days when none is configured', async () => {
    config = { min_supported_version: '2.0.0', nudge_interval_days: null };
    tokenRows = [device()];
    await run();

    const or = rec.selects.find((s) => s.table === 'device_push_tokens')!
      .filters.find(([c]) => c === 'or')![1] as string;
    const days = (Date.now() - new Date(or.split('last_update_nudge_at.lt.')[1]).getTime()) / 86_400_000;
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThan(7.1);
  });

  it('stamps only the devices it actually nudged', async () => {
    // Stamping an up-to-date device would suppress its nudge later, when it IS outdated.
    tokenRows = [
      device({ id: 'd1', app_version: '1.0.0' }),
      device({ id: 'd2', app_version: '2.5.0' }),
    ];
    await run();

    const upd = rec.updates.find((u) => u.table === 'device_push_tokens')!;
    expect(upd.payload).toMatchObject({ last_update_nudge_at: expect.any(String) });
    expect(upd.filters).toContainEqual(['id', ['d1']]);
  });

  it('stamps nothing when nothing was sent', async () => {
    tokenRows = [device({ app_version: '2.5.0' })];
    await run();

    expect(rec.updates.find((u) => u.table === 'device_push_tokens')).toBeUndefined();
  });
});

describe('push-update-nudge — the message', () => {
  it.each([
    ['pt-BR', 'Atualização disponível'],
    ['en-US', 'Update available'],
    ['es-LA', 'Actualización disponible'],
  ])('is written in the ward language %s', async (language, title) => {
    tokenRows = [device({ wards: { language } })];
    await run();

    expect(allMessages()[0].title).toBe(title);
  });

  it('falls back to en-US for a ward with an unsupported language', async () => {
    tokenRows = [device({ wards: { language: 'fr-FR' } })];
    await run();

    expect(allMessages()[0].title).toBe('Update available');
  });

  it('falls back to en-US for a device with no ward', async () => {
    tokenRows = [device({ wards: null })];
    await run();

    expect(allMessages()[0].title).toBe('Update available');
  });
});

describe('push-update-nudge — batching and failures', () => {
  it('chunks at 100 messages, the Expo API limit', async () => {
    tokenRows = Array.from({ length: 250 }, (_, i) =>
      device({ id: `d${i}`, expo_push_token: `T${i}`, app_version: '1.0.0' })
    );
    const res = await run();

    expect(res.body).toEqual({ sent: 250 });
    expect(pushed.map((b) => b.length)).toEqual([100, 100, 50]);
  });

  it('does not call the push API when nothing is outdated', async () => {
    tokenRows = [device({ app_version: '2.0.0' })];
    await run();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('does not call the push API when there are no candidate devices', async () => {
    tokenRows = [];
    expect((await run()).body).toEqual({ sent: 0 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('500s when app_config is unreadable rather than assuming a minimum', async () => {
    // Guessing a minimum here would nudge — or fail to nudge — the entire install base.
    config = null;
    const res = await run();

    expect(res.status).toBe(500);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('500s when the device query fails', async () => {
    tokenError = { message: 'db down' };
    const res = await run();

    expect(res.status).toBe(500);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('answers the CORS preflight', async () => {
    const res = await handlerRef.current!(
      new Request('https://x.test/fn', { method: 'OPTIONS' })
    );
    expect(await res.text()).toBe('ok');
  });
});
