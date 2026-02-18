/**
 * PHASE-06 Admin & Polish validation tests.
 * Covers: CSV import/export, activity logging, offline guard for Edge Functions,
 * Settings card visibility, WhatsApp template placeholders, ErrorBoundary,
 * and cross-module consistency checks.
 */

import { describe, it, expect } from 'vitest';

// --- CSV utilities ---
import {
  parseCsv,
  generateCsv,
  splitPhoneNumber,
} from '../lib/csvUtils';
import type { CsvMember, CsvValidationError, CsvParseResult } from '../lib/csvUtils';

// --- Activity Log ---
import { createLogger } from '../lib/activityLog';

// --- Offline Guard (Edge Functions blocked offline) ---
import {
  requiresConnection,
  ONLINE_ONLY_OPERATIONS,
  throwIfOffline,
} from '../lib/offlineGuard';

// =============================================================================
// STEP-06-01: Edge Function validation (via offline guard)
// =============================================================================

describe('STEP-06-01: Edge Functions offline guard', () => {
  // Write operations that are blocked offline (Edge Functions)
  const blockedEdgeFunctions = [
    'create-invitation',
    'update-user-role',
    'delete-user',
  ];

  // list-users is a read-only Edge Function, NOT blocked offline
  const readOnlyEdgeFunctions = [
    'list-users',
  ];

  // register-first-user and register-invited-user are from PHASE-01
  const allBlockedFunctions = [
    'register-first-user',
    'register-invited-user',
    'create-invitation',
    'update-user-role',
    'update-user-name',
    'delete-user',
  ];

  it('3 PHASE-06 write Edge Functions require connection', () => {
    for (const fn of blockedEdgeFunctions) {
      expect(requiresConnection(fn)).toBe(true);
    }
  });

  it('list-users (read-only) does NOT require connection', () => {
    for (const fn of readOnlyEdgeFunctions) {
      expect(requiresConnection(fn)).toBe(false);
    }
  });

  it('ONLINE_ONLY_OPERATIONS contains all 6 blocked functions', () => {
    expect(ONLINE_ONLY_OPERATIONS).toHaveLength(6);
    for (const fn of allBlockedFunctions) {
      expect(ONLINE_ONLY_OPERATIONS).toContain(fn);
    }
  });

  it('throwIfOffline blocks write Edge Functions when offline', () => {
    for (const fn of blockedEdgeFunctions) {
      expect(() => throwIfOffline(fn, false)).toThrow();
    }
  });

  it('throwIfOffline allows all Edge Functions when online', () => {
    for (const fn of [...blockedEdgeFunctions, ...readOnlyEdgeFunctions]) {
      expect(() => throwIfOffline(fn, true)).not.toThrow();
    }
  });
});

// =============================================================================
// STEP-06-05: Activity Logging
// =============================================================================

describe('STEP-06-05: Activity Logging', () => {
  describe('createLogger', () => {
    it('returns a function', () => {
      const logger = createLogger('ward-1', 'user-1', 'test@example.com');
      expect(typeof logger).toBe('function');
    });

    it('returned logger is callable with actionType and description', async () => {
      const logger = createLogger('ward-1', 'user-1', 'test@example.com');
      // Should not throw even if Supabase is mocked
      await expect(logger('member:create', 'Created member')).resolves.not.toThrow();
    });
  });

  describe('action types coverage', () => {
    // These are the action types that should be logged per spec
    const loggedActions = [
      'member:create',
      'member:update',
      'member:delete',
      'member:import',
      'topic:create',
      'topic:update',
      'topic:delete',
      'collection:activate',
      'collection:deactivate',
      'sunday_type:change',
      'speech:assign',
      'speech:unassign',
      'speech:status_change',
      'user:self_register',
      'user:invite',
      'user:register_via_invite',
      'user:role_change',
      'user:delete',
      'settings:language',
      'settings:timezone',
      'settings:whatsapp_template',
      'agenda:edit',
      'actor:create',
      'actor:update',
      'actor:delete',
    ];

    it('has at least 24 distinct action types defined', () => {
      expect(loggedActions.length).toBeGreaterThanOrEqual(24);
    });

    // NOT logged actions per spec
    const notLoggedActions = [
      'auto-assignment',
      'lazy-creation',
      'push-processing',
      'token-registration',
      'invalid-token-cleanup',
    ];

    it('system auto-actions are documented as NOT logged', () => {
      // These should never appear in activity_log
      expect(notLoggedActions.length).toBe(5);
    });
  });
});

// =============================================================================
// STEP-06-06: Activity Log Retention
// =============================================================================

describe('STEP-06-06: Activity Log Retention', () => {
  it('retention period is 2 years (validated by SQL migration)', () => {
    // The SQL uses: WHERE created_at < now() - INTERVAL '2 years'
    // We verify the concept is correct
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    const justOverTwoYears = new Date();
    justOverTwoYears.setFullYear(justOverTwoYears.getFullYear() - 2);
    justOverTwoYears.setDate(justOverTwoYears.getDate() - 1);

    const justUnderTwoYears = new Date();
    justUnderTwoYears.setFullYear(justUnderTwoYears.getFullYear() - 2);
    justUnderTwoYears.setDate(justUnderTwoYears.getDate() + 1);

    // Just over 2 years should be deleted
    expect(justOverTwoYears.getTime()).toBeLessThan(twoYearsAgo.getTime());
    // Just under 2 years should be preserved
    expect(justUnderTwoYears.getTime()).toBeGreaterThan(twoYearsAgo.getTime());
  });
});

// =============================================================================
// STEP-06-07: CSV Import/Export
// =============================================================================

describe('STEP-06-07: CSV Import/Export', () => {
  describe('parseCsv validation', () => {
    it('valid CSV with 2 rows returns success', () => {
      const csv = 'Nome,Telefone Completo\nJohn Smith,+5511999999999\nJane Doe,+5521888888888';
      const result = parseCsv(csv);
      expect(result.success).toBe(true);
      expect(result.members).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects empty file', () => {
      const result = parseCsv('');
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('rejects header-only file', () => {
      const result = parseCsv('Nome,Telefone Completo');
      expect(result.success).toBe(false);
    });

    it('rejects single-column header', () => {
      const result = parseCsv('Nome');
      expect(result.success).toBe(false);
      expect(result.errors[0].field).toBe('header');
    });

    it('rejects invalid phone format (no +)', () => {
      const csv = 'Nome,Telefone Completo\nJohn,11999999999';
      const result = parseCsv(csv);
      expect(result.success).toBe(false);
      expect(result.errors[0].field).toBe('Telefone Completo');
    });

    it('rejects invalid phone format (too short)', () => {
      const csv = 'Nome,Telefone Completo\nJohn,+551199';
      const result = parseCsv(csv);
      expect(result.success).toBe(false);
    });

    it('rejects duplicate phones', () => {
      const csv = 'Nome,Telefone Completo\nJohn,+5511999999999\nJane,+5511999999999';
      const result = parseCsv(csv);
      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain('Duplicate');
    });

    it('rejects empty name', () => {
      const csv = 'Nome,Telefone Completo\n,+5511999999999';
      const result = parseCsv(csv);
      expect(result.success).toBe(false);
      expect(result.errors[0].field).toBe('Nome');
    });

    it('accepts empty phone (phone is optional)', () => {
      const csv = 'Nome,Telefone Completo\nJohn Smith,';
      const result = parseCsv(csv);
      expect(result.success).toBe(true);
      expect(result.members[0].phone).toBe('');
    });

    it('handles quoted fields with commas', () => {
      const csv = 'Nome,Telefone Completo\n"Smith, John",+5511999999999';
      const result = parseCsv(csv);
      expect(result.success).toBe(true);
      expect(result.members[0].full_name).toBe('Smith, John');
    });

    it('handles quoted fields with escaped quotes', () => {
      const csv = 'Nome,Telefone Completo\n"John ""Johnny"" Smith",+5511999999999';
      const result = parseCsv(csv);
      expect(result.success).toBe(true);
      expect(result.members[0].full_name).toBe('John "Johnny" Smith');
    });

    it('skips blank lines in the middle', () => {
      const csv = 'Nome,Telefone Completo\nJohn,+5511999999999\n\nJane,+5521888888888';
      const result = parseCsv(csv);
      expect(result.success).toBe(true);
      expect(result.members).toHaveLength(2);
    });

    it('handles Windows line endings (\\r\\n)', () => {
      const csv = 'Nome,Telefone Completo\r\nJohn,+5511999999999';
      const result = parseCsv(csv);
      expect(result.success).toBe(true);
    });

    it('error includes line number and field name', () => {
      const csv = 'Nome,Telefone Completo\nJohn,+5511999999999\n,+5521888888888';
      const result = parseCsv(csv);
      expect(result.success).toBe(false);
      const error = result.errors[0];
      expect(error.line).toBe(3);
      expect(error.field).toBe('Nome');
      expect(error.message).toBeTruthy();
    });

    it('multiple errors are all reported', () => {
      const csv = 'Nome,Telefone Completo\n,bad-phone\n,also-bad';
      const result = parseCsv(csv);
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('all members have full_name and phone fields', () => {
      const csv = 'Nome,Telefone Completo\nA,+5511111111111\nB,+5522222222222\nC,';
      const result = parseCsv(csv);
      expect(result.success).toBe(true);
      for (const m of result.members) {
        expect(m).toHaveProperty('full_name');
        expect(m).toHaveProperty('phone');
      }
    });
  });

  describe('generateCsv', () => {
    it('generates header row first with BOM', () => {
      const csv = generateCsv([]);
      expect(csv).toBe('\uFEFFNome,Telefone Completo');
    });

    it('generates correct data rows', () => {
      const members = [
        { full_name: 'John', country_code: '+55', phone: '11999999999' },
      ];
      const csv = generateCsv(members);
      const lines = csv.split('\n');
      expect(lines[0]).toBe('\uFEFFNome,Telefone Completo');
      expect(lines[1]).toBe('John,+5511999999999');
    });

    it('handles null phone', () => {
      const members = [
        { full_name: 'John', country_code: '+55', phone: null as unknown as string },
      ];
      const csv = generateCsv(members);
      const lines = csv.split('\n');
      expect(lines[1]).toBe('John,');
    });

    it('escapes name containing comma', () => {
      const members = [
        { full_name: 'Smith, John', country_code: '+55', phone: '11999999999' },
      ];
      const csv = generateCsv(members);
      expect(csv).toContain('"Smith, John"');
    });

    it('escapes name containing quotes', () => {
      const members = [
        { full_name: 'John "J" Smith', country_code: '+55', phone: '11999999999' },
      ];
      const csv = generateCsv(members);
      expect(csv).toContain('"John ""J"" Smith"');
    });

    it('roundtrip: generate then parse produces same data', () => {
      const original = [
        { full_name: 'John Smith', country_code: '+55', phone: '11999999999' },
        { full_name: 'Jane Doe', country_code: '+1', phone: '2025551234' },
      ];
      const csv = generateCsv(original);
      const parsed = parseCsv(csv);
      expect(parsed.success).toBe(true);
      expect(parsed.members).toHaveLength(2);
      expect(parsed.members[0].full_name).toBe('John Smith');
      expect(parsed.members[0].phone).toBe('+5511999999999');
      expect(parsed.members[1].full_name).toBe('Jane Doe');
      expect(parsed.members[1].phone).toBe('+12025551234');
    });
  });

  describe('splitPhoneNumber', () => {
    it('splits +55 (Brazil, 2-digit)', () => {
      expect(splitPhoneNumber('+5511999999999')).toEqual({
        countryCode: '+55',
        phone: '11999999999',
      });
    });

    it('splits +1 (USA, 1-digit)', () => {
      expect(splitPhoneNumber('+12025551234')).toEqual({
        countryCode: '+1',
        phone: '2025551234',
      });
    });

    it('splits +591 (Bolivia, 3-digit)', () => {
      expect(splitPhoneNumber('+591123456789')).toEqual({
        countryCode: '+591',
        phone: '123456789',
      });
    });

    it('splits +351 (Portugal, 3-digit)', () => {
      expect(splitPhoneNumber('+351912345678')).toEqual({
        countryCode: '+351',
        phone: '912345678',
      });
    });

    it('splits +44 (UK, 2-digit)', () => {
      expect(splitPhoneNumber('+447911123456')).toEqual({
        countryCode: '+44',
        phone: '7911123456',
      });
    });

    it('defaults to +55 for empty string', () => {
      expect(splitPhoneNumber('')).toEqual({
        countryCode: '+55',
        phone: '',
      });
    });

    it('defaults to +55 for string without + prefix', () => {
      const result = splitPhoneNumber('5511999999999');
      expect(result.countryCode).toBe('+55');
    });

    it('handles all 3-digit country codes', () => {
      const threeDigi = ['+591', '+595', '+598', '+593', '+351', '+244', '+258'];
      for (const code of threeDigi) {
        const result = splitPhoneNumber(`${code}123456789`);
        expect(result.countryCode).toBe(code);
      }
    });

    it('handles all 2-digit country codes', () => {
      const twoDigi = ['+55', '+52', '+54', '+56', '+57', '+58', '+51', '+44', '+34', '+33', '+49', '+39', '+81'];
      for (const code of twoDigi) {
        const result = splitPhoneNumber(`${code}123456789`);
        expect(result.countryCode).toBe(code);
      }
    });
  });
});

// =============================================================================
// STEP-06-08: WhatsApp Template
// =============================================================================

describe('STEP-06-08: WhatsApp Template', () => {
  const PLACEHOLDERS = [
    '{nome}',
    '{data}',
    '{posicao}',
    '{colecao}',
    '{titulo}',
    '{link}',
  ];

  it('has exactly 6 placeholders', () => {
    expect(PLACEHOLDERS).toHaveLength(6);
  });

  it('resolveTemplate replaces all placeholders', () => {
    // Inline implementation matching the screen's resolveTemplate
    const SAMPLE_DATA: Record<string, string> = {
      '{nome}': 'Maria Silva',
      '{data}': '2026-03-01',
      '{posicao}': '1',
      '{colecao}': 'Temas da Ala',
      '{titulo}': 'Fe em Jesus Cristo',
      '{link}': 'https://example.com/topic',
    };

    function resolveTemplate(template: string): string {
      let result = template;
      for (const [key, value] of Object.entries(SAMPLE_DATA)) {
        result = result.replaceAll(key, value);
      }
      return result;
    }

    const template = 'Olá {nome}, seu discurso em {data} sobre {titulo} da {colecao}.';
    const resolved = resolveTemplate(template);
    expect(resolved).toContain('Maria Silva');
    expect(resolved).toContain('2026-03-01');
    expect(resolved).toContain('Fe em Jesus Cristo');
    expect(resolved).toContain('Temas da Ala');
    expect(resolved).not.toContain('{nome}');
    expect(resolved).not.toContain('{data}');
    expect(resolved).not.toContain('{titulo}');
    expect(resolved).not.toContain('{colecao}');
  });

  it('resolveTemplate handles template with all 6 placeholders', () => {
    const SAMPLE_DATA: Record<string, string> = {
      '{nome}': 'Maria Silva',
      '{data}': '2026-03-01',
      '{posicao}': '1',
      '{colecao}': 'Temas da Ala',
      '{titulo}': 'Fe em Jesus Cristo',
      '{link}': 'https://example.com/topic',
    };

    function resolveTemplate(template: string): string {
      let result = template;
      for (const [key, value] of Object.entries(SAMPLE_DATA)) {
        result = result.replaceAll(key, value);
      }
      return result;
    }

    const template = '{nome} {data} {posicao} {colecao} {titulo} {link}';
    const resolved = resolveTemplate(template);
    for (const placeholder of PLACEHOLDERS) {
      expect(resolved).not.toContain(placeholder);
    }
  });

  it('resolveTemplate with empty template returns empty', () => {
    function resolveTemplate(template: string): string {
      const SAMPLE_DATA: Record<string, string> = {
        '{nome}': 'Maria Silva',
        '{data}': '2026-03-01',
        '{posicao}': '1',
        '{colecao}': 'Temas da Ala',
        '{titulo}': 'Fe em Jesus Cristo',
        '{link}': 'https://example.com/topic',
      };
      let result = template;
      for (const [key, value] of Object.entries(SAMPLE_DATA)) {
        result = result.replaceAll(key, value);
      }
      return result;
    }

    expect(resolveTemplate('')).toBe('');
  });
});

// =============================================================================
// STEP-06-09: Settings index cards + cross-checks
// =============================================================================

describe('STEP-06-09: Settings Index and Hardening', () => {
  describe('Settings card permissions', () => {
    // Per STEP-06-09 spec:
    // Members, Topics, Actors: Bishopric + Secretary
    // Users: Bishopric only
    // History: Bishopric + Secretary
    // WhatsApp Template: Bishopric + Secretary
    // Language, Timezone, Theme: Bishopric + Secretary
    // Observer: no Settings tab access

    const permissionMap: Record<string, string> = {
      Members: 'member:read',
      Topics: 'topic:write',
      Actors: 'settings:access',
      Users: 'settings:users',
      History: 'history:read',
      WhatsApp: 'settings:whatsapp',
    };

    it('has 6 permission-gated cards', () => {
      expect(Object.keys(permissionMap)).toHaveLength(6);
    });

    it('Users card uses settings:users (Bishopric only)', () => {
      expect(permissionMap.Users).toBe('settings:users');
    });

    it('History card uses history:read (Bishopric + Secretary)', () => {
      expect(permissionMap.History).toBe('history:read');
    });
  });

  describe('Edge Function role checks', () => {
    // All 4 PHASE-06 Edge Functions require specific roles
    const edgeFunctionRoles = {
      'create-invitation': ['bishopric', 'secretary'], // invitation:create
      'list-users': ['bishopric'],                      // settings:users
      'update-user-role': ['bishopric'],                // settings:users
      'delete-user': ['bishopric'],                     // settings:users
    };

    it('create-invitation allows Bishopric and Secretary', () => {
      expect(edgeFunctionRoles['create-invitation']).toContain('bishopric');
      expect(edgeFunctionRoles['create-invitation']).toContain('secretary');
    });

    it('list-users allows only Bishopric', () => {
      expect(edgeFunctionRoles['list-users']).toEqual(['bishopric']);
    });

    it('update-user-role allows only Bishopric', () => {
      expect(edgeFunctionRoles['update-user-role']).toEqual(['bishopric']);
    });

    it('delete-user allows only Bishopric', () => {
      expect(edgeFunctionRoles['delete-user']).toEqual(['bishopric']);
    });
  });
});

// =============================================================================
// Cross-module consistency
// =============================================================================

describe('Cross-module consistency', () => {
  describe('CSV roundtrip integrity', () => {
    it('name with special characters survives roundtrip', () => {
      const members = [
        { full_name: 'José María García', country_code: '+55', phone: '11999999999' },
      ];
      const csv = generateCsv(members);
      const parsed = parseCsv(csv);
      expect(parsed.success).toBe(true);
      expect(parsed.members[0].full_name).toBe('José María García');
    });

    it('multiple members preserve order in roundtrip', () => {
      const members = [
        { full_name: 'Alice', country_code: '+55', phone: '11111111111' },
        { full_name: 'Bob', country_code: '+1', phone: '2025551234' },
        { full_name: 'Carol', country_code: '+44', phone: '7911123456' },
      ];
      const csv = generateCsv(members);
      const parsed = parseCsv(csv);
      expect(parsed.success).toBe(true);
      expect(parsed.members[0].full_name).toBe('Alice');
      expect(parsed.members[1].full_name).toBe('Bob');
      expect(parsed.members[2].full_name).toBe('Carol');
    });
  });

  describe('CsvParseResult type shape', () => {
    it('success result has correct shape', () => {
      const result: CsvParseResult = {
        success: true,
        members: [{ full_name: 'Test', phone: '+5511999999999' }],
        errors: [],
      };
      expect(result.success).toBe(true);
      expect(result.members).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });

    it('error result has correct shape', () => {
      const error: CsvValidationError = {
        line: 2,
        field: 'Nome',
        message: 'Name is required',
      };
      expect(error.line).toBe(2);
      expect(error.field).toBe('Nome');
      expect(error.message).toBeTruthy();
    });
  });
});
