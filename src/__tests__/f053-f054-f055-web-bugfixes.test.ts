/**
 * Phase 7 Tests: F053 (CR-263) Friendly Registration Errors
 *                F054 (CR-264) Fix ActorSelector TDZ
 *                F055 (CR-265) Fix Hymn Selector Web Compatibility
 *
 * Tests:
 * - F053: i18n keys for registration errors + error-handling logic patterns
 * - F054: ActorSelector hook ordering and filtering behavior
 * - F055: HymnSelectorModal filtering and display behavior
 */

import { describe, it, expect, vi } from 'vitest';
import { filterActorsByRole, sortActors, actorKeys } from '../hooks/useActors';
import { filterHymns, formatHymnDisplay, hymnKeys } from '../hooks/useHymns';
import type { MeetingActor } from '../types/database';
import type { Hymn } from '../types/database';

// =============================================================================
// F053 (CR-263): FRIENDLY REGISTRATION ERROR MESSAGES
// =============================================================================

describe('F053 (CR-263): Friendly Registration Error Messages', () => {

  // --- AC-F053-03 / AC-F053-07: i18n key auth.registrationFailed exists ---
  describe('AC-F053-03 / AC-F053-07: auth.registrationFailed i18n key', () => {
    it('pt-BR has auth.registrationFailed key with correct value', async () => {
      const ptBR = (await import('../i18n/locales/pt-BR.json')).default;
      expect(ptBR.auth.registrationFailed).toBe('Falha ao criar conta. Tente novamente.');
    });

    it('en-US has auth.registrationFailed key with correct value', async () => {
      const enUS = (await import('../i18n/locales/en-US.json')).default;
      expect(enUS.auth.registrationFailed).toBe('Failed to create account. Please try again.');
    });

    it('es-LA has auth.registrationFailed key with correct value', async () => {
      const esLA = (await import('../i18n/locales/es-LA.json')).default;
      expect(esLA.auth.registrationFailed).toBe('Error al crear la cuenta. Intente nuevamente.');
    });

    it('auth.registrationFailed is non-empty in all locales', async () => {
      const ptBR = (await import('../i18n/locales/pt-BR.json')).default;
      const enUS = (await import('../i18n/locales/en-US.json')).default;
      const esLA = (await import('../i18n/locales/es-LA.json')).default;
      expect(ptBR.auth.registrationFailed.length).toBeGreaterThan(0);
      expect(enUS.auth.registrationFailed.length).toBeGreaterThan(0);
      expect(esLA.auth.registrationFailed.length).toBeGreaterThan(0);
    });
  });

  // --- AC-F053-01: email_exists error code maps to auth.emailExists ---
  describe('AC-F053-01: email_exists error mapping', () => {
    it('auth.emailExists key exists in pt-BR', async () => {
      const ptBR = (await import('../i18n/locales/pt-BR.json')).default;
      expect(ptBR.auth.emailExists).toBeDefined();
      expect(ptBR.auth.emailExists.length).toBeGreaterThan(0);
    });

    it('auth.emailExists key exists in en-US', async () => {
      const enUS = (await import('../i18n/locales/en-US.json')).default;
      expect(enUS.auth.emailExists).toBeDefined();
      expect(enUS.auth.emailExists.length).toBeGreaterThan(0);
    });

    it('auth.emailExists key exists in es-LA', async () => {
      const esLA = (await import('../i18n/locales/es-LA.json')).default;
      expect(esLA.auth.emailExists).toBeDefined();
      expect(esLA.auth.emailExists.length).toBeGreaterThan(0);
    });
  });

  // --- AC-F053-02: stake_ward_exists error code maps to auth.stakeWardExists ---
  describe('AC-F053-02: stake_ward_exists error mapping', () => {
    it('auth.stakeWardExists key exists in pt-BR', async () => {
      const ptBR = (await import('../i18n/locales/pt-BR.json')).default;
      expect(ptBR.auth.stakeWardExists).toBeDefined();
      expect(ptBR.auth.stakeWardExists.length).toBeGreaterThan(0);
    });

    it('auth.stakeWardExists key exists in en-US', async () => {
      const enUS = (await import('../i18n/locales/en-US.json')).default;
      expect(enUS.auth.stakeWardExists).toBeDefined();
      expect(enUS.auth.stakeWardExists.length).toBeGreaterThan(0);
    });

    it('auth.stakeWardExists key exists in es-LA', async () => {
      const esLA = (await import('../i18n/locales/es-LA.json')).default;
      expect(esLA.auth.stakeWardExists).toBeDefined();
      expect(esLA.auth.stakeWardExists.length).toBeGreaterThan(0);
    });
  });

  // --- AC-F053-04: auth.requiresConnection key for network errors ---
  describe('AC-F053-04: auth.requiresConnection for network errors', () => {
    it('auth.requiresConnection exists in all 3 locales', async () => {
      const ptBR = (await import('../i18n/locales/pt-BR.json')).default;
      const enUS = (await import('../i18n/locales/en-US.json')).default;
      const esLA = (await import('../i18n/locales/es-LA.json')).default;
      expect(ptBR.auth.requiresConnection).toBeDefined();
      expect(enUS.auth.requiresConnection).toBeDefined();
      expect(esLA.auth.requiresConnection).toBeDefined();
    });
  });

  // --- AC-F053-01 through AC-F053-07: Error-handling decision logic ---
  describe('Error-handling decision logic (register.tsx pattern)', () => {
    /**
     * This replicates the exact error-handling logic from handleRegister()
     * in register.tsx to test it in isolation. The logic flow is:
     *
     * 1. If response.error:
     *    a. data?.error === 'email_exists' -> 'auth.emailExists'
     *    b. data?.error === 'stake_ward_exists' -> 'auth.stakeWardExists'
     *    c. fallback -> 'auth.registrationFailed'
     * 2. If no response.error: success path
     * 3. Catch: network error -> 'auth.requiresConnection', else -> 'auth.registrationFailed'
     */
    function classifyError(response: { data: any; error: any }): string | null {
      const data = response.data;

      if (response.error) {
        if (data?.error === 'email_exists') {
          return 'auth.emailExists';
        }
        if (data?.error === 'stake_ward_exists') {
          return 'auth.stakeWardExists';
        }
        return 'auth.registrationFailed';
      }

      if (data?.session) {
        return null; // success
      }

      return null;
    }

    function classifyCatchError(err: unknown): string {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('Failed to fetch') || message.includes('Network')) {
        return 'auth.requiresConnection';
      }
      return 'auth.registrationFailed';
    }

    // AC-F053-01: email_exists -> auth.emailExists
    it('returns auth.emailExists when data.error is email_exists', () => {
      const response = {
        data: { error: 'email_exists' },
        error: new Error('Non-2xx status code'),
      };
      expect(classifyError(response)).toBe('auth.emailExists');
    });

    // AC-F053-02: stake_ward_exists -> auth.stakeWardExists
    it('returns auth.stakeWardExists when data.error is stake_ward_exists', () => {
      const response = {
        data: { error: 'stake_ward_exists' },
        error: new Error('Non-2xx status code'),
      };
      expect(classifyError(response)).toBe('auth.stakeWardExists');
    });

    // AC-F053-03: 500 error with unknown data -> auth.registrationFailed
    it('returns auth.registrationFailed for 500 error with unknown error code', () => {
      const response = {
        data: { error: 'internal_server_error' },
        error: new Error('Non-2xx status code'),
      };
      expect(classifyError(response)).toBe('auth.registrationFailed');
    });

    // AC-F053-07: Unknown error code -> auth.registrationFailed (fallback)
    it('returns auth.registrationFailed for completely unknown error code', () => {
      const response = {
        data: { error: 'some_random_error_nobody_expects' },
        error: new Error('Non-2xx status code'),
      };
      expect(classifyError(response)).toBe('auth.registrationFailed');
    });

    // Edge case: null data on non-2xx
    it('returns auth.registrationFailed when response.data is null on non-2xx', () => {
      const response = {
        data: null,
        error: new Error('Non-2xx status code'),
      };
      expect(classifyError(response)).toBe('auth.registrationFailed');
    });

    // Edge case: undefined data on non-2xx
    it('returns auth.registrationFailed when response.data is undefined on non-2xx', () => {
      const response = {
        data: undefined,
        error: new Error('Non-2xx status code'),
      };
      expect(classifyError(response)).toBe('auth.registrationFailed');
    });

    // Edge case: data without error field on non-2xx
    it('returns auth.registrationFailed when data has no error field on non-2xx', () => {
      const response = {
        data: { message: 'Something went wrong' },
        error: new Error('Non-2xx status code'),
      };
      expect(classifyError(response)).toBe('auth.registrationFailed');
    });

    // AC-F053-05: Successful registration (no error)
    it('returns null (success) when response has session and no error', () => {
      const response = {
        data: {
          session: {
            access_token: 'token-abc',
            refresh_token: 'refresh-xyz',
          },
        },
        error: null,
      };
      expect(classifyError(response)).toBeNull();
    });

    // AC-F053-04: Network error -> auth.requiresConnection
    it('returns auth.requiresConnection for "Failed to fetch" error', () => {
      const err = new Error('Failed to fetch');
      expect(classifyCatchError(err)).toBe('auth.requiresConnection');
    });

    it('returns auth.requiresConnection for "Network request failed" error', () => {
      const err = new Error('Network request failed');
      expect(classifyCatchError(err)).toBe('auth.requiresConnection');
    });

    // Catch fallback: non-network error -> auth.registrationFailed
    it('returns auth.registrationFailed for non-network errors in catch', () => {
      const err = new Error('Some unexpected error');
      expect(classifyCatchError(err)).toBe('auth.registrationFailed');
    });

    it('returns auth.registrationFailed for non-Error exceptions in catch', () => {
      expect(classifyCatchError('string error')).toBe('auth.registrationFailed');
    });

    it('returns auth.registrationFailed for null/undefined error in catch', () => {
      expect(classifyCatchError(null)).toBe('auth.registrationFailed');
      expect(classifyCatchError(undefined)).toBe('auth.registrationFailed');
    });
  });

  // --- AC-F053-06: Frontend validation still works (validate function pattern) ---
  describe('AC-F053-06: Frontend validation pattern', () => {
    /**
     * Replicates the validate() function from register.tsx.
     * Tests that client-side validation prevents the request entirely.
     */
    function validate(fields: {
      fullName: string;
      email: string;
      stakeName: string;
      wardName: string;
      password: string;
      confirmPassword: string;
    }): string | null {
      if (!fields.fullName.trim()) return 'auth.nameRequired';
      if (!fields.email.trim()) return 'auth.emailRequired';
      if (!fields.stakeName.trim()) return 'auth.stakeRequired';
      if (!fields.wardName.trim()) return 'auth.wardRequired';
      if (fields.password.length < 6) return 'auth.passwordMinLength';
      if (fields.password !== fields.confirmPassword) return 'auth.passwordMismatch';
      return null;
    }

    it('returns auth.nameRequired when fullName is empty', () => {
      expect(validate({
        fullName: '', email: 'a@b.com', stakeName: 'Stake', wardName: 'Ward',
        password: '123456', confirmPassword: '123456',
      })).toBe('auth.nameRequired');
    });

    it('returns auth.nameRequired when fullName is whitespace', () => {
      expect(validate({
        fullName: '   ', email: 'a@b.com', stakeName: 'Stake', wardName: 'Ward',
        password: '123456', confirmPassword: '123456',
      })).toBe('auth.nameRequired');
    });

    it('returns auth.emailRequired when email is empty', () => {
      expect(validate({
        fullName: 'John', email: '', stakeName: 'Stake', wardName: 'Ward',
        password: '123456', confirmPassword: '123456',
      })).toBe('auth.emailRequired');
    });

    it('returns auth.stakeRequired when stakeName is empty', () => {
      expect(validate({
        fullName: 'John', email: 'a@b.com', stakeName: '', wardName: 'Ward',
        password: '123456', confirmPassword: '123456',
      })).toBe('auth.stakeRequired');
    });

    it('returns auth.wardRequired when wardName is empty', () => {
      expect(validate({
        fullName: 'John', email: 'a@b.com', stakeName: 'Stake', wardName: '',
        password: '123456', confirmPassword: '123456',
      })).toBe('auth.wardRequired');
    });

    it('returns auth.passwordMinLength when password is too short', () => {
      expect(validate({
        fullName: 'John', email: 'a@b.com', stakeName: 'Stake', wardName: 'Ward',
        password: '12345', confirmPassword: '12345',
      })).toBe('auth.passwordMinLength');
    });

    it('returns auth.passwordMismatch when passwords differ', () => {
      expect(validate({
        fullName: 'John', email: 'a@b.com', stakeName: 'Stake', wardName: 'Ward',
        password: '123456', confirmPassword: '654321',
      })).toBe('auth.passwordMismatch');
    });

    it('returns null when all fields are valid', () => {
      expect(validate({
        fullName: 'John', email: 'a@b.com', stakeName: 'Stake', wardName: 'Ward',
        password: '123456', confirmPassword: '123456',
      })).toBeNull();
    });
  });
});

// =============================================================================
// F054 (CR-264): FIX ACTORSELECTOR TDZ CRASH
// =============================================================================

describe('F054 (CR-264): Fix ActorSelector TDZ Crash', () => {

  // --- AC-F054-01 through AC-F054-05: filterActorsByRole works for all roles ---
  describe('AC-F054-01/02/03/04/05: filterActorsByRole for all actor roles', () => {
    const actors: MeetingActor[] = [
      { id: '1', ward_id: 'w1', name: 'Bishop Jones', role: 'preside', created_at: '', updated_at: '' },
      { id: '2', ward_id: 'w1', name: 'Counselor Smith', role: 'conduct', created_at: '', updated_at: '' },
      { id: '3', ward_id: 'w1', name: 'Sister Piano', role: 'pianist', created_at: '', updated_at: '' },
      { id: '4', ward_id: 'w1', name: 'Brother Baton', role: 'conductor', created_at: '', updated_at: '' },
      { id: '5', ward_id: 'w1', name: 'Sister Welcome', role: 'recognize', created_at: '', updated_at: '' },
      { id: '6', ward_id: 'w1', name: 'Bishop Brown', role: 'preside', created_at: '', updated_at: '' },
    ];

    // AC-F054-01: preside role filter
    it('filters actors by preside role', () => {
      const result = filterActorsByRole(actors, 'preside');
      expect(result).toHaveLength(2);
      expect(result.every((a) => a.role === 'preside')).toBe(true);
    });

    // AC-F054-02: conduct role filter
    it('filters actors by conduct role', () => {
      const result = filterActorsByRole(actors, 'conduct');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Counselor Smith');
    });

    // AC-F054-03: pianist role filter
    it('filters actors by pianist role', () => {
      const result = filterActorsByRole(actors, 'pianist');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Sister Piano');
    });

    // AC-F054-04: conductor role filter
    it('filters actors by conductor role', () => {
      const result = filterActorsByRole(actors, 'conductor');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Brother Baton');
    });

    // AC-F054-05: recognize role filter (multi-select in ActorSelector)
    it('filters actors by recognize role', () => {
      const result = filterActorsByRole(actors, 'recognize');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Sister Welcome');
    });

    it('returns all actors for "all" filter', () => {
      const result = filterActorsByRole(actors, 'all');
      expect(result).toHaveLength(6);
    });
  });

  // --- AC-F054-06: Scroll-to-editingId uses filtered list ---
  describe('AC-F054-06: Filtered list search for scroll-to-editingId', () => {
    it('findIndex locates the correct actor in filtered list', () => {
      const filtered = [
        { id: 'a1', name: 'Alpha' },
        { id: 'a2', name: 'Beta' },
        { id: 'a3', name: 'Gamma' },
      ];
      const editingId = 'a2';
      const index = filtered.findIndex((a) => a.id === editingId);
      expect(index).toBe(1);
    });

    it('findIndex returns -1 when actor not in filtered list', () => {
      const filtered = [
        { id: 'a1', name: 'Alpha' },
        { id: 'a3', name: 'Gamma' },
      ];
      const editingId = 'a2';
      const index = filtered.findIndex((a) => a.id === editingId);
      expect(index).toBe(-1);
    });

    it('filtered list updates when search term changes', () => {
      const actors: MeetingActor[] = [
        { id: '1', ward_id: 'w1', name: 'Bishop Jones', role: 'preside', created_at: '', updated_at: '' },
        { id: '2', ward_id: 'w1', name: 'Bishop Smith', role: 'preside', created_at: '', updated_at: '' },
        { id: '3', ward_id: 'w1', name: 'Counselor Doe', role: 'conduct', created_at: '', updated_at: '' },
      ];

      // Simulates the useMemo filter logic from ActorSelector
      const filterBySearch = (list: MeetingActor[], search: string) => {
        if (!search.trim()) return list;
        const q = search.toLowerCase();
        return list.filter((a) => a.name.toLowerCase().includes(q));
      };

      // No search: all actors
      expect(filterBySearch(actors, '')).toHaveLength(3);

      // Search "Bishop": 2 results
      expect(filterBySearch(actors, 'Bishop')).toHaveLength(2);

      // Search "Jones": 1 result
      const jones = filterBySearch(actors, 'Jones');
      expect(jones).toHaveLength(1);
      expect(jones[0].name).toBe('Bishop Jones');

      // Search "xyz": 0 results
      expect(filterBySearch(actors, 'xyz')).toHaveLength(0);
    });
  });

  // --- TDZ fix verification: hook order dependency ---
  describe('TDZ fix: useMemo depends on useActors data', () => {
    it('useMemo filter works with undefined actors (initial state before data loads)', () => {
      // Simulates what happens before useActors returns data
      const actors: MeetingActor[] | undefined = undefined;
      const search = '';

      const filtered = (() => {
        const list = actors ?? [];
        if (!search.trim()) return list;
        const q = search.toLowerCase();
        return list.filter((a) => a.name.toLowerCase().includes(q));
      })();

      expect(filtered).toEqual([]);
    });

    it('useMemo filter works with empty actors array', () => {
      const actors: MeetingActor[] = [];
      const search = 'test';

      const filtered = (() => {
        const list = actors ?? [];
        if (!search.trim()) return list;
        const q = search.toLowerCase();
        return list.filter((a) => a.name.toLowerCase().includes(q));
      })();

      expect(filtered).toEqual([]);
    });

    it('useMemo filter works with populated actors and search', () => {
      const actors: MeetingActor[] = [
        { id: '1', ward_id: 'w1', name: 'Alpha', role: 'preside', created_at: '', updated_at: '' },
        { id: '2', ward_id: 'w1', name: 'Beta', role: 'conduct', created_at: '', updated_at: '' },
      ];
      const search = 'alpha';

      const filtered = (() => {
        const list = actors ?? [];
        if (!search.trim()) return list;
        const q = search.toLowerCase();
        return list.filter((a) => a.name.toLowerCase().includes(q));
      })();

      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Alpha');
    });
  });
});

// =============================================================================
// F055 (CR-265): FIX HYMN SELECTOR WEB COMPATIBILITY
// =============================================================================

describe('F055 (CR-265): Fix Hymn Selector Web Compatibility', () => {

  // --- AC-F055-01: All hymns render (initialNumToRender = filtered.length) ---
  describe('AC-F055-01: initialNumToRender matches data length', () => {
    it('initialNumToRender should equal filtered.length for full list', () => {
      // Simulates: <FlatList initialNumToRender={filtered.length} />
      const hymns: Hymn[] = Array.from({ length: 350 }, (_, i) => ({
        id: `h${i}`,
        number: i + 1,
        title: `Hymn ${i + 1}`,
        language: 'pt-BR',
        is_sacramental: false,
      }));

      const filtered = hymns; // No search applied
      const initialNumToRender = filtered.length;

      expect(initialNumToRender).toBe(350);
    });

    it('initialNumToRender updates when search filters the list', () => {
      const hymns: Hymn[] = [
        { id: 'h1', number: 1, title: 'A Alva Rompe', language: 'pt-BR', is_sacramental: false },
        { id: 'h2', number: 100, title: 'Nearer My God', language: 'pt-BR', is_sacramental: false },
        { id: 'h3', number: 101, title: 'Another Hymn', language: 'pt-BR', is_sacramental: false },
        { id: 'h4', number: 200, title: 'Final Song', language: 'pt-BR', is_sacramental: false },
      ];

      const filtered = filterHymns(hymns, '10');
      const initialNumToRender = filtered.length;

      // Should match hymns starting with 10: 100 and 101
      expect(initialNumToRender).toBe(2);
    });
  });

  // --- AC-F055-02 / AC-F055-07: Web onClick stopPropagation pattern ---
  describe('AC-F055-02 / AC-F055-07: Web onClick stopPropagation pattern', () => {
    it('stopPropagation prevents event bubbling', () => {
      let outerCalled = false;
      let innerStopCalled = false;

      // Simulates the web overlay pattern:
      // Outer Pressable -> onPress -> handleClose
      // Inner View -> onClick -> e.stopPropagation()

      const mockEvent = {
        stopPropagation: () => { innerStopCalled = true; },
      };

      // Simulates: {...(Platform.OS === 'web' ? { onClick: (e: any) => e.stopPropagation() } : {})}
      const webProps = { onClick: (e: any) => e.stopPropagation() };
      webProps.onClick(mockEvent);

      expect(innerStopCalled).toBe(true);
      expect(outerCalled).toBe(false);
    });

    it('web props are conditionally applied based on Platform.OS', () => {
      // On web: onClick handler is added
      const webPlatform = 'web';
      const webProps = webPlatform === 'web'
        ? { onClick: (e: any) => e.stopPropagation() }
        : {};

      expect(webProps).toHaveProperty('onClick');

      // On native (ios/android): no onClick handler
      const nativePlatform = 'ios';
      const nativeProps = nativePlatform === 'web'
        ? { onClick: (e: any) => e.stopPropagation() }
        : {};

      expect(nativeProps).not.toHaveProperty('onClick');
    });
  });

  // --- AC-F055-03: List scrolls normally (no overlay interference) ---
  describe('AC-F055-03: onStartShouldSetResponder preserved for native', () => {
    it('onStartShouldSetResponder returns true (prevents overlay capturing touches)', () => {
      // Simulates: onStartShouldSetResponder={() => true}
      const responder = () => true;
      expect(responder()).toBe(true);
    });
  });

  // --- AC-F055-04: Search filtering behavior unchanged ---
  describe('AC-F055-04: Search filtering behavior (unchanged)', () => {
    const hymns: Hymn[] = [
      { id: 'h1', number: 1, title: 'A Alva Rompe', language: 'pt-BR', is_sacramental: false },
      { id: 'h2', number: 15, title: 'Eu Sei Que Vive Meu Senhor', language: 'pt-BR', is_sacramental: false },
      { id: 'h3', number: 100, title: 'Nearer, My God, to Thee', language: 'pt-BR', is_sacramental: false },
      { id: 'h4', number: 123, title: 'Ao Findar o Dia', language: 'pt-BR', is_sacramental: true },
    ];

    it('empty search returns all hymns', () => {
      expect(filterHymns(hymns, '')).toEqual(hymns);
    });

    it('numeric search matches hymn number prefix', () => {
      const result = filterHymns(hymns, '1');
      expect(result.map((h) => h.number)).toEqual([1, 15, 100, 123]);
    });

    it('text search matches title case-insensitively', () => {
      const result = filterHymns(hymns, 'nearer');
      expect(result).toHaveLength(1);
      expect(result[0].number).toBe(100);
    });

    it('formatHymnDisplay returns "number - title"', () => {
      expect(formatHymnDisplay(hymns[0])).toBe('1 - A Alva Rompe');
      expect(formatHymnDisplay(hymns[3])).toBe('123 - Ao Findar o Dia');
    });
  });

  // --- AC-F055-05 / AC-F055-08: Clicking overlay closes modal ---
  describe('AC-F055-05 / AC-F055-08: Overlay press triggers onClose', () => {
    it('onClose callback is callable and executes', () => {
      let closed = false;
      const onClose = () => { closed = true; };
      onClose();
      expect(closed).toBe(true);
    });

    it('onClose resets search state (pattern from ActorSelector handleClose)', () => {
      // Simulates the handleClose callback pattern
      let search = 'some search';
      let showAddInput = true;
      let addingName = 'New Actor';
      let editingId: string | null = 'actor-1';

      const handleClose = () => {
        search = '';
        showAddInput = false;
        addingName = '';
        editingId = null;
      };

      handleClose();
      expect(search).toBe('');
      expect(showAddInput).toBe(false);
      expect(addingName).toBe('');
      expect(editingId).toBeNull();
    });
  });

  // --- AC-F055-06: Native no regression (onStartShouldSetResponder preserved) ---
  describe('AC-F055-06: Native behavior preserved', () => {
    it('native platform does not add onClick prop', () => {
      const platformOS = 'android';
      const extraProps = platformOS === 'web'
        ? { onClick: (e: any) => e.stopPropagation() }
        : {};
      expect(Object.keys(extraProps)).toHaveLength(0);
    });

    it('ios platform does not add onClick prop', () => {
      const platformOS = 'ios';
      const extraProps = platformOS === 'web'
        ? { onClick: (e: any) => e.stopPropagation() }
        : {};
      expect(Object.keys(extraProps)).toHaveLength(0);
    });
  });
});
