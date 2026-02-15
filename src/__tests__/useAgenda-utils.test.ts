/**
 * Tests for useAgenda utilities (pure functions).
 */

import { describe, it, expect } from 'vitest';
import {
  isExcludedFromAgenda,
  isSpecialMeeting,
  EXCLUDED_EXCEPTION_TYPES,
} from '../hooks/useAgenda';

describe('isExcludedFromAgenda', () => {
  it('excludes general_conference', () => {
    expect(isExcludedFromAgenda('general_conference')).toBe(true);
  });

  it('excludes stake_conference', () => {
    expect(isExcludedFromAgenda('stake_conference')).toBe(true);
  });

  it('excludes no_meeting', () => {
    expect(isExcludedFromAgenda('no_meeting')).toBe(true);
  });

  it('includes testimony_meeting', () => {
    expect(isExcludedFromAgenda('testimony_meeting')).toBe(false);
  });

  it('includes ward_conference', () => {
    expect(isExcludedFromAgenda('ward_conference')).toBe(false);
  });

  it('includes special_program', () => {
    expect(isExcludedFromAgenda('special_program')).toBe(false);
  });

  it('includes fast_sunday', () => {
    expect(isExcludedFromAgenda('fast_sunday')).toBe(false);
  });

  it('includes unknown types', () => {
    expect(isExcludedFromAgenda('something_else')).toBe(false);
  });
});

describe('isSpecialMeeting', () => {
  it('returns true for testimony_meeting', () => {
    expect(isSpecialMeeting('testimony_meeting')).toBe(true);
  });

  it('returns true for ward_conference', () => {
    expect(isSpecialMeeting('ward_conference')).toBe(true);
  });

  it('returns true for special_program', () => {
    expect(isSpecialMeeting('special_program')).toBe(true);
  });

  it('returns false for null', () => {
    expect(isSpecialMeeting(null)).toBe(false);
  });

  it('returns false for general_conference', () => {
    expect(isSpecialMeeting('general_conference')).toBe(false);
  });

  it('returns false for stake_conference', () => {
    expect(isSpecialMeeting('stake_conference')).toBe(false);
  });

  it('returns false for no_meeting', () => {
    expect(isSpecialMeeting('no_meeting')).toBe(false);
  });

  it('returns false for fast_sunday', () => {
    expect(isSpecialMeeting('fast_sunday')).toBe(false);
  });
});

describe('EXCLUDED_EXCEPTION_TYPES', () => {
  it('contains exactly 3 types', () => {
    expect(EXCLUDED_EXCEPTION_TYPES.size).toBe(3);
  });

  it('contains the expected types', () => {
    expect(EXCLUDED_EXCEPTION_TYPES.has('general_conference')).toBe(true);
    expect(EXCLUDED_EXCEPTION_TYPES.has('stake_conference')).toBe(true);
    expect(EXCLUDED_EXCEPTION_TYPES.has('no_meeting')).toBe(true);
  });
});
