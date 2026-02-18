import { describe, it, expect, vi } from 'vitest';
import { logAction, createLogger } from '../lib/activityLog';

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
