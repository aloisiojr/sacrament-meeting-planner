import { describe, it, expect, vi } from 'vitest';
import { logAction, createLogger, buildLogDescription, parseLogDescription, formatLogDescription } from '../lib/activityLog';
import type { TFunction } from 'i18next';

// Mock supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}));

describe('logAction', () => {
  it('does not throw on success', async () => {
    await expect(
      logAction('ward-1', 'user-1', 'user@test.com', 'member:create', 'Created member')
    ).resolves.not.toThrow();
  });

  it('accepts all required parameters', async () => {
    await logAction('ward-1', 'user-1', 'test@test.com', 'test:action', 'Test description');
    // Should not throw
  });

  it('accepts optional userName parameter', async () => {
    await expect(
      logAction('ward-1', 'user-1', 'user@test.com', 'member:create', 'Created member', 'John Smith')
    ).resolves.not.toThrow();
  });

  it('works without userName (backward compatible)', async () => {
    await expect(
      logAction('ward-1', 'user-1', 'user@test.com', 'member:create', 'Created member')
    ).resolves.not.toThrow();
  });
});

describe('createLogger', () => {
  it('returns a function', () => {
    const log = createLogger('ward-1', 'user-1', 'user@test.com');
    expect(typeof log).toBe('function');
  });

  it('returned function calls logAction', async () => {
    const log = createLogger('ward-1', 'user-1', 'user@test.com');
    await expect(log('test:action', 'Test')).resolves.not.toThrow();
  });

  it('accepts optional userName parameter', () => {
    const log = createLogger('ward-1', 'user-1', 'user@test.com', 'John Smith');
    expect(typeof log).toBe('function');
  });

  it('returned function from logger with userName calls logAction', async () => {
    const log = createLogger('ward-1', 'user-1', 'user@test.com', 'John Smith');
    await expect(log('test:action', 'Test')).resolves.not.toThrow();
  });
});

// --- buildLogDescription tests ---

describe('buildLogDescription', () => {
  it('creates pipe-delimited string with action_type and params', () => {
    const result = buildLogDescription('member:create', { nome: 'Maria Silva' });
    expect(result).toBe('member:create|nome=Maria Silva');
  });

  it('handles multiple params', () => {
    const result = buildLogDescription('speech:assign', { nome: 'Joao', N: 2, data: '2025-03-09' });
    expect(result).toBe('speech:assign|nome=Joao|N=2|data=2025-03-09');
  });

  it('escapes pipe characters in values', () => {
    const result = buildLogDescription('topic:create', { titulo: 'A|B' });
    expect(result).toBe('topic:create|titulo=A\\|B');
  });

  it('escapes equals characters in values', () => {
    const result = buildLogDescription('topic:create', { titulo: 'A=B' });
    expect(result).toBe('topic:create|titulo=A\\=B');
  });

  it('escapes backslash characters in values', () => {
    const result = buildLogDescription('topic:create', { titulo: 'A\\B' });
    expect(result).toBe('topic:create|titulo=A\\\\B');
  });

  it('handles empty params', () => {
    const result = buildLogDescription('member:create', {});
    expect(result).toBe('member:create');
  });

  it('handles numeric values', () => {
    const result = buildLogDescription('speech:assign', { N: 1 });
    expect(result).toBe('speech:assign|N=1');
  });
});

// --- parseLogDescription tests ---

describe('parseLogDescription', () => {
  it('returns null for plain text without pipe', () => {
    const result = parseLogDescription('Maria Silva adicionado como membro');
    expect(result).toBeNull();
  });

  it('parses simple pipe-delimited string', () => {
    const result = parseLogDescription('member:create|nome=Maria Silva');
    expect(result).toEqual({
      actionType: 'member:create',
      params: { nome: 'Maria Silva' },
    });
  });

  it('parses multiple params', () => {
    const result = parseLogDescription('speech:assign|nome=Joao|N=2|data=2025-03-09');
    expect(result).toEqual({
      actionType: 'speech:assign',
      params: { nome: 'Joao', N: '2', data: '2025-03-09' },
    });
  });

  it('handles escaped pipes in values', () => {
    const result = parseLogDescription('topic:create|titulo=A\\|B');
    expect(result).toEqual({
      actionType: 'topic:create',
      params: { titulo: 'A|B' },
    });
  });

  it('handles escaped equals in values', () => {
    const result = parseLogDescription('topic:create|titulo=A\\=B');
    expect(result).toEqual({
      actionType: 'topic:create',
      params: { titulo: 'A=B' },
    });
  });

  it('handles escaped backslashes in values', () => {
    const result = parseLogDescription('topic:create|titulo=A\\\\B');
    expect(result).toEqual({
      actionType: 'topic:create',
      params: { titulo: 'A\\B' },
    });
  });

  it('roundtrips with buildLogDescription', () => {
    const original = { nome: 'Maria|Silva', N: 3, data: '2025-01-05' };
    const built = buildLogDescription('speech:assign', original);
    const parsed = parseLogDescription(built);
    expect(parsed).not.toBeNull();
    expect(parsed!.actionType).toBe('speech:assign');
    expect(parsed!.params.nome).toBe('Maria|Silva');
    expect(parsed!.params.N).toBe('3');
    expect(parsed!.params.data).toBe('2025-01-05');
  });

  it('handles action_type-only string with trailing pipe', () => {
    const result = parseLogDescription('member:create|');
    expect(result).not.toBeNull();
    expect(result!.actionType).toBe('member:create');
  });
});

// --- formatLogDescription tests ---

describe('formatLogDescription', () => {
  // Create a mock t function
  const createMockT = (translations: Record<string, string>): TFunction => {
    return ((key: string, options?: Record<string, string> | string) => {
      if (typeof options === 'string') return translations[key] ?? key;
      const template = translations[key];
      if (!template) return key;
      // Simple interpolation
      let result = template;
      if (options && typeof options === 'object') {
        for (const [k, v] of Object.entries(options)) {
          result = result.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
        }
      }
      return result;
    }) as TFunction;
  };

  it('returns raw description for old-format entries (no pipe)', () => {
    const t = createMockT({});
    const result = formatLogDescription('Maria Silva adicionado como membro', t);
    expect(result).toBe('Maria Silva adicionado como membro');
  });

  it('translates structured description using i18n key', () => {
    const t = createMockT({
      'activityLog.events.member_create': '"{{nome}}" added as speaker',
    });
    const desc = buildLogDescription('member:create', { nome: 'Maria Silva' });
    const result = formatLogDescription(desc, t);
    expect(result).toBe('"Maria Silva" added as speaker');
  });

  it('falls back to raw description when i18n key is missing', () => {
    const t = createMockT({});
    const desc = buildLogDescription('unknown:action', { foo: 'bar' });
    const result = formatLogDescription(desc, t);
    // When key is missing, t() returns the key itself, and we fallback to raw
    expect(result).toBe(desc);
  });

  it('translates speech status when present', () => {
    const t = createMockT({
      'activityLog.events.speech_status_change': '{{nome}} status -> {{status}}',
      'speechStatus.assigned_confirmed': 'Confirmed',
    });
    const desc = buildLogDescription('speech:status_change', { nome: 'Joao', status: 'assigned_confirmed', data: '2025-03-09', N: 1 });
    const result = formatLogDescription(desc, t);
    expect(result).toBe('Joao status -> Confirmed');
  });

  it('translates actor role when present', () => {
    const t = createMockT({
      'activityLog.events.actor_create': '"{{nome}}" added for "{{funcao}}"',
      'activityLog.actorRoles.preside': 'preside',
    });
    const desc = buildLogDescription('actor:create', { nome: 'Bishop Jones', funcao: 'can_preside' });
    const result = formatLogDescription(desc, t);
    expect(result).toBe('"Bishop Jones" added for "preside"');
  });

  it('translates sunday type when present', () => {
    const t = createMockT({
      'activityLog.events.sunday_type_change': 'Sunday {{data}} set to {{tipo}}',
      'sundayExceptions.testimony_meeting': 'Testimony Meeting',
    });
    const desc = buildLogDescription('sunday_type:change', { data: '2025-04-06', tipo: 'testimony_meeting' });
    const result = formatLogDescription(desc, t);
    expect(result).toBe('Sunday 2025-04-06 set to Testimony Meeting');
  });
});
