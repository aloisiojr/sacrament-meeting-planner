/**
 * The app's cache-persistence and retry policy (F047).
 *
 * Replaces f047-cache-persistence.test.ts and f047-cache-persistence-behavior.test.ts, 27
 * it-blocks between them that imported nothing from src/. They re-declared the constants they
 * meant to check —
 *
 *     const SEVEN_DAYS_MS = 1000 * 60 * 60 * 24 * 7;
 *     it('equals 604800000 ms', () => expect(SEVEN_DAYS_MS).toBe(604800000));
 *
 * — and spent the rest of their length exercising @tanstack/query-async-storage-persister, a
 * third-party package with its own test suite. The app's cache could have been configured to
 * expire in an hour and every one of them would have stayed green.
 *
 * The values now live in lib/queryConfig, which app/_layout.tsx imports, so these assert the
 * shipped configuration.
 */
import {
  CACHE_MAX_AGE_MS,
  CACHE_GC_TIME_MS,
  STALE_TIME_MS,
  CACHE_STORAGE_KEY,
  CACHE_THROTTLE_MS,
  CACHE_MAX_BYTES,
  DEFAULT_CACHE_BUSTER,
  cacheBuster,
  shouldPersistQuery,
  shouldDehydratePersistedQuery,
  prunePersistedCache,
  shouldRetryQuery,
  shouldAlertMutationError,
} from '../lib/queryConfig';

describe('cache lifetime', () => {
  it('keeps a persisted cache usable for 7 days offline', () => {
    expect(CACHE_MAX_AGE_MS).toBe(604_800_000);
  });

  it('holds entries in memory at least as long as the persister will restore them', () => {
    // The invariant that makes offline launch work. If gcTime were shorter, the client would evict
    // entries the persister is still willing to hand back, and the app would open empty offline
    // even though a valid cache is sitting on disk.
    expect(CACHE_GC_TIME_MS).toBeGreaterThanOrEqual(CACHE_MAX_AGE_MS);
  });

  it('serves a query for 5 minutes before refetching', () => {
    expect(STALE_TIME_MS).toBe(300_000);
  });

  it('refetches long before the cache expires', () => {
    // staleTime >= maxAge would mean data is never refreshed within its own lifetime.
    expect(STALE_TIME_MS).toBeLessThan(CACHE_MAX_AGE_MS);
  });
});

describe('cache storage', () => {
  it('writes under a single namespaced key', () => {
    expect(CACHE_STORAGE_KEY).toBe('@query_cache');
  });

  it('throttles writes so a burst of updates does not thrash AsyncStorage', () => {
    expect(CACHE_THROTTLE_MS).toBe(1000);
    expect(CACHE_THROTTLE_MS).toBeGreaterThan(0);
  });
});

describe('cacheBuster — a new build must not read an old cache', () => {
  it('uses the app version when there is one', () => {
    expect(cacheBuster('2.0.0')).toBe('2.0.0');
  });

  it.each([undefined, null, ''])('falls back to a fixed value for %p', (version) => {
    // An undefined buster means the cache is never invalidated on upgrade, so a v2 build would
    // read rows persisted by v1 under a schema it no longer understands.
    expect(cacheBuster(version)).toBe(DEFAULT_CACHE_BUSTER);
    expect(cacheBuster(version)).toBeTruthy();
  });

  it('changes when the version changes', () => {
    expect(cacheBuster('2.0.0')).not.toBe(cacheBuster('2.0.1'));
  });
});

describe('shouldRetryQuery', () => {
  it('never retries while offline — the cache is the answer', () => {
    expect(shouldRetryQuery(0, null, false)).toBe(false);
  });

  it.each([400, 401, 403, 404, 422, 499])('never retries HTTP %i', (status) => {
    // The server has given its final answer; retrying just repeats it.
    expect(shouldRetryQuery(0, { status }, true)).toBe(false);
  });

  it.each([500, 502, 503, 504])('retries HTTP %i', (status) => {
    expect(shouldRetryQuery(0, { status }, true)).toBe(true);
  });

  it('retries an error with no status, such as a dropped connection', () => {
    expect(shouldRetryQuery(0, {}, true)).toBe(true);
    expect(shouldRetryQuery(0, null, true)).toBe(true);
  });

  it('gives up after two retries', () => {
    expect(shouldRetryQuery(0, null, true)).toBe(true);
    expect(shouldRetryQuery(1, null, true)).toBe(true);
    expect(shouldRetryQuery(2, null, true)).toBe(false);
    expect(shouldRetryQuery(9, null, true)).toBe(false);
  });

  it('offline beats everything, even a retriable status on the first attempt', () => {
    expect(shouldRetryQuery(0, { status: 500 }, false)).toBe(false);
  });
});

describe('shouldAlertMutationError', () => {
  it('alerts on a genuine server failure', () => {
    expect(shouldAlertMutationError({ message: 'permission denied' }, true)).toBe(true);
  });

  it('stays silent while offline — the queue will replay it', () => {
    // Alerting here would tell the user their edit failed when it is safely queued.
    expect(shouldAlertMutationError({ message: 'permission denied' }, false)).toBe(false);
  });

  it.each(['network request failed', 'Failed to fetch', 'fetch error'])(
    'stays silent for the transport failure %p even when believed online',
    (message) => {
      // onlineManager can lag behind reality by a few seconds.
      expect(shouldAlertMutationError({ message }, true)).toBe(false);
    }
  );

  it('respects a mutation that opted out of the global handler', () => {
    // The invite flow renders its own error inside the modal; a second alert on top is noise.
    expect(
      shouldAlertMutationError({ message: 'boom' }, true, { suppressGlobalError: true })
    ).toBe(false);
  });

  it('alerts when the opt-out is absent or false', () => {
    expect(shouldAlertMutationError({ message: 'boom' }, true, {})).toBe(true);
    expect(
      shouldAlertMutationError({ message: 'boom' }, true, { suppressGlobalError: false })
    ).toBe(true);
  });

  it('alerts on an error with no message rather than swallowing it', () => {
    expect(shouldAlertMutationError({}, true)).toBe(true);
    expect(shouldAlertMutationError(null, true)).toBe(true);
  });
});

describe('RAP-04/DEC-02 — persisted cache allowlist', () => {
  const ward = 'ward-A';

  it.each([
    [['agendas', 'byDateRange', ward, '2026-01-04', '2026-07-05']],
    [['agendas', 'bySunday', ward, '2026-01-04']],
    [['speeches', 'byDateRange', ward, '2026-01-04', '2026-07-05']],
    [['members', 'list', ward]],
    [['topics', 'ward', ward]],
    [['topics', 'active', ward, 'en']],
    [['hymns', 'list', 'en-US']],
  ])('persists the offline query %p', (key) => {
    expect(shouldPersistQuery(key as readonly unknown[], ward)).toBe(true);
  });

  it('never persists the paginated activity log', () => {
    expect(shouldPersistQuery(['activity-log', 'list'], ward)).toBe(false);
    expect(shouldPersistQuery(['activity-log', 'list', 'silva'], ward)).toBe(false);
  });

  it('never persists search queries', () => {
    expect(shouldPersistQuery(['members', 'search', ward, 'ana'], ward)).toBe(false);
  });

  it('never persists another ward\u2019s queries', () => {
    expect(shouldPersistQuery(['members', 'list', 'ward-B'], ward)).toBe(false);
    expect(shouldPersistQuery(['agendas', 'bySunday', 'ward-B', '2026-01-04'], ward)).toBe(false);
    expect(shouldPersistQuery(['topics', 'active', 'ward-B', 'en'], ward)).toBe(false);
  });

  it('persists no ward-scoped query before the ward is known, but hymns still persist', () => {
    expect(shouldPersistQuery(['members', 'list', ward], null)).toBe(false);
    expect(shouldPersistQuery(['hymns', 'list', 'pt-BR'], null)).toBe(true);
  });

  it('only dehydrates successful allowlisted queries', () => {
    const ok = { queryKey: ['members', 'list', ward], state: { status: 'success' } };
    const pending = { queryKey: ['members', 'list', ward], state: { status: 'pending' } };
    const log = { queryKey: ['activity-log', 'list'], state: { status: 'success' } };
    expect(shouldDehydratePersistedQuery(ok, ward)).toBe(true);
    expect(shouldDehydratePersistedQuery(pending, ward)).toBe(false);
    expect(shouldDehydratePersistedQuery(log, ward)).toBe(false);
  });

  it('scopes the buster by ward so another ward\u2019s cache is never restored', () => {
    expect(cacheBuster('2.0.0', 'ward-A')).not.toBe(cacheBuster('2.0.0', 'ward-B'));
    expect(cacheBuster('2.0.0', 'ward-A')).not.toBe(cacheBuster('2.0.0', null));
    expect(cacheBuster('2.0.0', 'ward-A')).toContain('ward-A');
  });
});

describe('RAP-04 — persisted cache size cap', () => {
  it('has a finite cap', () => {
    expect(CACHE_MAX_BYTES).toBeGreaterThan(0);
    expect(CACHE_MAX_BYTES).toBeLessThanOrEqual(4 * 1024 * 1024);
  });

  it('leaves a payload under the cap untouched', () => {
    const small = JSON.stringify({ clientState: { queries: [] } });
    const result = prunePersistedCache(small, 1024);
    expect(result.dropped).toBe(0);
    expect(result.value).toBe(small);
  });

  it('drops the oldest queries first until the payload fits', () => {
    const payload = JSON.stringify({
      timestamp: 1,
      buster: '2.0.0:ward-A',
      clientState: {
        queries: [
          { queryKey: ['members', 'list', 'ward-A'], state: { dataUpdatedAt: 100, data: 'x'.repeat(200) } },
          { queryKey: ['hymns', 'list', 'en-US'], state: { dataUpdatedAt: 300, data: 'y'.repeat(200) } },
          { queryKey: ['topics', 'ward', 'ward-A'], state: { dataUpdatedAt: 200, data: 'z'.repeat(200) } },
        ],
        mutations: [],
      },
    });
    const result = prunePersistedCache(payload, 500);
    expect(result.dropped).toBeGreaterThan(0);
    expect(result.value.length).toBeLessThanOrEqual(500 + 64);
    const kept = JSON.parse(result.value).clientState.queries.map(
      (q: { state: { dataUpdatedAt: number } }) => q.state.dataUpdatedAt
    );
    expect(kept).not.toContain(100);
    expect(kept).toContain(300);
  });
});
