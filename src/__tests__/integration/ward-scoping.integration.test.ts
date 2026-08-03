/**
 * Ward-scoping tests: every read of ward-owned data must be filtered by ward_id.
 *
 * These were impossible before. The shared Supabase mock was a Proxy that returned itself for
 * every property and discarded the arguments, so dropping `.eq('ward_id', wardId)` from a query
 * still passed — a cross-ward data-leak class of bug, in a multi-tenant app, in the exact layer
 * everyone assumed covered it. The chain now records its calls (see setup-integration).
 *
 * RLS is the real enforcement and belongs in pgTAP; this is the client-side half, which is what
 * decides whether a query even asks for the right rows.
 */
import * as supabaseModule from '../../lib/supabase';
import {
  renderHook,
  createWrapper,
  mockSupabaseFromMultiple,
  resetQueryLog,
  wasScopedBy,
  queryArgs,
  getQueryLog,
} from './setup-integration';

jest.mock('../../lib/supabase', () => ({
  supabase: { from: jest.fn(), auth: {}, channel: jest.fn(), removeChannel: jest.fn() },
}));

const supabaseMock = supabaseModule.supabase as unknown as { from: jest.Mock };

const WARD_ID = 'ward-alpha';

/** Every ward-owned table the hooks read, with an empty result. */
const EMPTY_TABLES = {
  speeches: { data: [], error: null },
  members: { data: [], error: null },
  sunday_agendas: { data: [], error: null },
  sunday_exceptions: { data: [], error: null },
  ward_topics: { data: [], error: null },
  wards: { data: null, error: null },
  activity_log: { data: [], error: null },
};

beforeEach(() => {
  jest.clearAllMocks();
  resetQueryLog();
  mockSupabaseFromMultiple(supabaseMock, EMPTY_TABLES);
});

/**
 * Asserts the query was scoped to the CALLER'S ward — not merely that a ward_id filter exists.
 * Presence alone would accept a hardcoded ward id, which leaks exactly as badly as no filter.
 */
function expectScopedToCallerWard(table: string, wardId = WARD_ID) {
  expect(wasScopedBy(table, 'ward_id')).toBe(true);
  const eqCalls = getQueryLog(table).filter((c) => c.method === 'eq' && c.args[0] === 'ward_id');
  expect(eqCalls.length).toBeGreaterThan(0);
  for (const call of eqCalls) {
    expect(call.args[1]).toBe(wardId);
  }
}

/** Run a hook to completion under a wrapper carrying WARD_ID. */
async function run(useHook: () => unknown) {
  const wrapper = createWrapper({ wardId: WARD_ID });
  await renderHook(useHook, { wrapper });
}

describe('ward scoping — member data', () => {
  it('useMembers filters by ward_id', async () => {
    const { useMembers } = require('../../hooks/useMembers');
    await run(() => useMembers());

    expectScopedToCallerWard('members');
  });

  it('useMembers asks for the caller\'s ward, not a hardcoded one', async () => {
    const { useMembers } = require('../../hooks/useMembers');
    const wrapper = createWrapper({ wardId: 'ward-beta' });
    await renderHook(() => useMembers(), { wrapper });

    expect(queryArgs('members', 'eq')).toEqual(['ward_id', 'ward-beta']);
  });
});

describe('ward scoping — speeches', () => {
  it('useSpeeches filters by ward_id', async () => {
    const { useSpeeches } = require('../../hooks/useSpeeches');
    await run(() => useSpeeches({ start: '2026-08-01', end: '2026-08-31' }));

    expectScopedToCallerWard('speeches');
  });

  it('useSpeechCounts filters by ward_id', async () => {
    const { useSpeechCounts } = require('../../hooks/useSpeechCounts');
    await run(() => useSpeechCounts());

    expectScopedToCallerWard('speeches');
  });
});

describe('ward scoping — agendas and exceptions', () => {
  it('useAgenda filters by ward_id', async () => {
    const { useAgenda } = require('../../hooks/useAgenda');
    await run(() => useAgenda('2026-08-02'));

    expectScopedToCallerWard('sunday_agendas');
  });

  it('useSundayTypes filters exceptions by ward_id', async () => {
    const { useSundayExceptions } = require('../../hooks/useSundayTypes');
    await run(() => useSundayExceptions('2026-08-01', '2026-08-31'));

    expectScopedToCallerWard('sunday_exceptions');
  });
});

describe('ward scoping — activity log', () => {
  it('useActivityLog filters by ward_id', async () => {
    const { useActivityLog } = require('../../hooks/useActivityLog');
    await run(() => useActivityLog());

    expectScopedToCallerWard('activity_log');
  });
});

describe('ward scoping — the recorder itself', () => {
  it('records the query chain so a missing filter is visible', async () => {
    const { useMembers } = require('../../hooks/useMembers');
    await run(() => useMembers());

    const log = getQueryLog('members');
    // Not asserting the exact chain (it may legitimately change) — only that calls ARE recorded,
    // which is what makes every assertion above meaningful rather than vacuous.
    expect(log.length).toBeGreaterThan(0);
    expect(log.every((c) => c.table === 'members')).toBe(true);
  });
});
