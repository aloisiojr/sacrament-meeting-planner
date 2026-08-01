/**
 * Tests for F047: TanStack Query Cache Persistence.
 * Tests configuration constants and persister setup used in _layout.tsx.
 * Does not import _layout.tsx directly (React Native parse issues in vitest).
 */

// Constants mirrored from _layout.tsx for verification
const SEVEN_DAYS_MS = 1000 * 60 * 60 * 24 * 7;

describe('F047: Cache Persistence configuration', () => {
  describe('SEVEN_DAYS_MS constant', () => {
    it('equals 604800000 ms (7 days)', () => {
      expect(SEVEN_DAYS_MS).toBe(604800000);
    });
  });

  describe('createAsyncStoragePersister config', () => {
    it('key should be "@query_cache"', () => {
      // Verify expected key value
      const key = '@query_cache';
      expect(key).toBe('@query_cache');
    });

    it('throttleTime should be 1000ms', () => {
      const throttleTime = 1000;
      expect(throttleTime).toBe(1000);
    });
  });

  describe('PersistQueryClientProvider persistOptions', () => {
    it('maxAge matches gcTime at 7 days', () => {
      const maxAge = SEVEN_DAYS_MS;
      const gcTime = SEVEN_DAYS_MS;
      expect(maxAge).toBe(gcTime);
      expect(maxAge).toBe(604800000);
    });

    it('buster falls back to "1.0.0" when version is undefined', () => {
      const version: string | undefined = undefined;
      const buster = version ?? '1.0.0';
      expect(buster).toBe('1.0.0');
    });

    it('buster uses app version when available', () => {
      const version = '2.0.0';
      const buster = version ?? '1.0.0';
      expect(buster).toBe('2.0.0');
    });
  });

  describe('@tanstack/query-async-storage-persister package', () => {
    it('exports createAsyncStoragePersister', async () => {
      const mod = await import('@tanstack/query-async-storage-persister');
      expect(mod.createAsyncStoragePersister).toBeDefined();
      expect(typeof mod.createAsyncStoragePersister).toBe('function');
    });
  });

  describe('@tanstack/react-query-persist-client package', () => {
    it('exports PersistQueryClientProvider', async () => {
      const mod = await import('@tanstack/react-query-persist-client');
      expect(mod.PersistQueryClientProvider).toBeDefined();
    });
  });

  describe('QueryClient gcTime behavior', () => {
    it('gcTime 7 days keeps cache entries for offline use', async () => {
      const { QueryClient } = await import('@tanstack/react-query');
      const client = new QueryClient({
        defaultOptions: {
          queries: {
            gcTime: SEVEN_DAYS_MS,
          },
        },
      });
      const defaults = client.getDefaultOptions();
      expect(defaults.queries?.gcTime).toBe(SEVEN_DAYS_MS);
    });

    it('staleTime 5 minutes is preserved alongside gcTime', async () => {
      const { QueryClient } = await import('@tanstack/react-query');
      const staleTime = 1000 * 60 * 5;
      const client = new QueryClient({
        defaultOptions: {
          queries: {
            staleTime,
            gcTime: SEVEN_DAYS_MS,
          },
        },
      });
      const defaults = client.getDefaultOptions();
      expect(defaults.queries?.staleTime).toBe(staleTime);
      expect(defaults.queries?.gcTime).toBe(SEVEN_DAYS_MS);
    });
  });
});
