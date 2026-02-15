/**
 * Tests for offlineQueue and offlineGuard pure utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  hasCapacity,
  shouldRetry,
  getMaxQueueSize,
  getMaxRetries,
} from '../lib/offlineQueue';
import {
  requiresConnection,
  ONLINE_ONLY_OPERATIONS,
} from '../lib/offlineGuard';

describe('offlineQueue utilities', () => {
  describe('hasCapacity', () => {
    it('returns true when under limit', () => {
      expect(hasCapacity(0)).toBe(true);
      expect(hasCapacity(50)).toBe(true);
      expect(hasCapacity(99)).toBe(true);
    });

    it('returns false when at or over limit', () => {
      expect(hasCapacity(100)).toBe(false);
      expect(hasCapacity(150)).toBe(false);
    });
  });

  describe('shouldRetry', () => {
    it('returns true when under max retries', () => {
      expect(shouldRetry(0)).toBe(true);
      expect(shouldRetry(1)).toBe(true);
      expect(shouldRetry(2)).toBe(true);
    });

    it('returns false when at or over max retries', () => {
      expect(shouldRetry(3)).toBe(false);
      expect(shouldRetry(5)).toBe(false);
    });
  });

  describe('getMaxQueueSize', () => {
    it('returns 100', () => {
      expect(getMaxQueueSize()).toBe(100);
    });
  });

  describe('getMaxRetries', () => {
    it('returns 3', () => {
      expect(getMaxRetries()).toBe(3);
    });
  });
});

describe('offlineGuard utilities', () => {
  describe('ONLINE_ONLY_OPERATIONS', () => {
    it('contains 5 operations', () => {
      expect(ONLINE_ONLY_OPERATIONS).toHaveLength(5);
    });

    it('includes register-first-user', () => {
      expect(ONLINE_ONLY_OPERATIONS).toContain('register-first-user');
    });

    it('includes register-invited-user', () => {
      expect(ONLINE_ONLY_OPERATIONS).toContain('register-invited-user');
    });

    it('includes create-invitation', () => {
      expect(ONLINE_ONLY_OPERATIONS).toContain('create-invitation');
    });

    it('includes update-user-role', () => {
      expect(ONLINE_ONLY_OPERATIONS).toContain('update-user-role');
    });

    it('includes delete-user', () => {
      expect(ONLINE_ONLY_OPERATIONS).toContain('delete-user');
    });
  });

  describe('requiresConnection', () => {
    it('returns true for online-only operations', () => {
      expect(requiresConnection('register-first-user')).toBe(true);
      expect(requiresConnection('register-invited-user')).toBe(true);
      expect(requiresConnection('create-invitation')).toBe(true);
      expect(requiresConnection('update-user-role')).toBe(true);
      expect(requiresConnection('delete-user')).toBe(true);
    });

    it('returns false for normal operations', () => {
      expect(requiresConnection('update-member')).toBe(false);
      expect(requiresConnection('create-speech')).toBe(false);
      expect(requiresConnection('')).toBe(false);
    });
  });
});
