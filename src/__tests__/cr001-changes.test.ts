/**
 * Tests for CR-001 changes: sunday type enum, i18n keys, SundayCard behavior,
 * agenda rendering, speech labels, and settings navigation.
 */

import { describe, it, expect } from 'vitest';
import ptBR from '../i18n/locales/pt-BR.json';
import en from '../i18n/locales/en.json';
import es from '../i18n/locales/es.json';
import {
  SUNDAY_TYPE_SPEECHES,
  SUNDAY_TYPE_OPTIONS,
  getAutoAssignedType,
} from '../hooks/useSundayTypes';
import {
  isExcludedFromAgenda,
  isSpecialMeeting,
  EXCLUDED_EXCEPTION_TYPES,
} from '../hooks/useAgenda';
import type { SundayExceptionReason } from '../types/database';

// --- CR-06: Sunday type enum correctness ---

describe('CR-06: Sunday type enum values', () => {
  const VALID_REASONS: SundayExceptionReason[] = [
    'testimony_meeting',
    'general_conference',
    'stake_conference',
    'ward_conference',
    'primary_presentation',
    'other',
  ];

  it('SUNDAY_TYPE_OPTIONS has exactly 7 items (speeches + 6 exception reasons)', () => {
    expect(SUNDAY_TYPE_OPTIONS).toHaveLength(7);
  });

  it('SUNDAY_TYPE_OPTIONS starts with speeches', () => {
    expect(SUNDAY_TYPE_OPTIONS[0]).toBe(SUNDAY_TYPE_SPEECHES);
  });

  it('SUNDAY_TYPE_OPTIONS includes all 6 valid exception reasons', () => {
    for (const reason of VALID_REASONS) {
      expect(SUNDAY_TYPE_OPTIONS).toContain(reason);
    }
  });

  it('does NOT include removed enum values', () => {
    const removedValues = ['fast_sunday', 'special_program', 'no_meeting'];
    for (const removed of removedValues) {
      expect(SUNDAY_TYPE_OPTIONS).not.toContain(removed);
    }
  });

  it('EXCLUDED_EXCEPTION_TYPES has exactly 2 entries (general_conference, stake_conference)', () => {
    expect(EXCLUDED_EXCEPTION_TYPES.size).toBe(2);
    expect(EXCLUDED_EXCEPTION_TYPES.has('general_conference')).toBe(true);
    expect(EXCLUDED_EXCEPTION_TYPES.has('stake_conference')).toBe(true);
  });

  it('isSpecialMeeting includes primary_presentation and other', () => {
    expect(isSpecialMeeting('primary_presentation')).toBe(true);
    expect(isSpecialMeeting('other')).toBe(true);
  });

  it('isExcludedFromAgenda does NOT exclude primary_presentation or other', () => {
    expect(isExcludedFromAgenda('primary_presentation')).toBe(false);
    expect(isExcludedFromAgenda('other')).toBe(false);
  });
});

// --- CR-06: Auto-assignment only produces valid enum values ---

describe('CR-06: Auto-assignment produces only valid types', () => {
  const VALID_REASONS: SundayExceptionReason[] = [
    'testimony_meeting',
    'general_conference',
    'stake_conference',
    'ward_conference',
    'primary_presentation',
    'other',
  ];

  it('auto-assigned types are always valid SundayExceptionReason or speeches', () => {
    // Test all 52 sundays in 2026
    const sundays: Date[] = [];
    const start = new Date(2026, 0, 1);
    while (start.getDay() !== 0) start.setDate(start.getDate() + 1);
    while (start.getFullYear() === 2026) {
      sundays.push(new Date(start));
      start.setDate(start.getDate() + 7);
    }

    for (const sunday of sundays) {
      const type = getAutoAssignedType(sunday);
      const isValid = type === SUNDAY_TYPE_SPEECHES || VALID_REASONS.includes(type as SundayExceptionReason);
      expect(isValid, `Invalid auto-assigned type "${type}" for ${sunday.toISOString()}`).toBe(true);
    }
  });

  it('auto-assignment never produces fast_sunday, special_program, or no_meeting', () => {
    const sundays: Date[] = [];
    const start = new Date(2026, 0, 1);
    while (start.getDay() !== 0) start.setDate(start.getDate() + 1);
    while (start.getFullYear() === 2026) {
      sundays.push(new Date(start));
      start.setDate(start.getDate() + 7);
    }

    for (const sunday of sundays) {
      const type = getAutoAssignedType(sunday);
      expect(type).not.toBe('fast_sunday');
      expect(type).not.toBe('special_program');
      expect(type).not.toBe('no_meeting');
    }
  });
});

// --- CR-04: Exception display i18n keys ---

describe('CR-04: All sundayExceptions i18n keys exist in all locales', () => {
  const requiredKeys = [
    'testimony_meeting',
    'general_conference',
    'stake_conference',
    'ward_conference',
    'primary_presentation',
    'other',
    'speeches',
  ];

  for (const key of requiredKeys) {
    it(`sundayExceptions.${key} exists in pt-BR`, () => {
      expect((ptBR.sundayExceptions as Record<string, string>)[key]).toBeDefined();
    });

    it(`sundayExceptions.${key} exists in en`, () => {
      expect((en.sundayExceptions as Record<string, string>)[key]).toBeDefined();
    });

    it(`sundayExceptions.${key} exists in es`, () => {
      expect((es.sundayExceptions as Record<string, string>)[key]).toBeDefined();
    });
  }

  it('pt-BR has correct translation for primary_presentation', () => {
    expect(ptBR.sundayExceptions.primary_presentation).toBe('Reunião Especial da Primária');
  });

  it('en has correct translation for primary_presentation', () => {
    expect(en.sundayExceptions.primary_presentation).toBe('Primary Special Presentation');
  });

  it('es has correct translation for primary_presentation', () => {
    expect(es.sundayExceptions.primary_presentation).toBe('Presentación Especial de la Primaria');
  });
});

// --- CR-05: Speech label i18n ---

describe('CR-05: Speech slot labels', () => {
  it('pt-BR uses "N Discurso" pattern', () => {
    expect(ptBR.speeches.slot).toBe('{{number}} Discurso');
  });

  it('en uses "N Speech" pattern', () => {
    expect(en.speeches.slot).toBe('{{number}} Speech');
  });

  it('es uses "N Discurso" pattern', () => {
    expect(es.speeches.slot).toBe('{{number}} Discurso');
  });
});

// --- CR-01: Home tab section title ---

describe('CR-01: Home tab section title i18n key', () => {
  it('pt-BR has meetingAgendaTitle', () => {
    expect(ptBR.home.meetingAgendaTitle).toBe('Agenda da Reunião Sacramental');
  });

  it('en has meetingAgendaTitle', () => {
    expect(en.home.meetingAgendaTitle).toBe('Sacrament Meeting Agenda');
  });

  it('es has meetingAgendaTitle', () => {
    expect(es.home.meetingAgendaTitle).toBe('Agenda de la Reunión Sacramental');
  });
});

// --- CR-10: About screen i18n keys ---

describe('CR-10: About screen i18n keys', () => {
  it('pt-BR has about.title', () => {
    expect(ptBR.about.title).toBe('Sobre');
  });

  it('en has about.title', () => {
    expect(en.about.title).toBe('About');
  });

  it('es has about.title', () => {
    expect(es.about.title).toBe('Acerca de');
  });

  it('pt-BR has about.version', () => {
    expect(ptBR.about.version).toBe('Versão');
  });

  it('en has about.version', () => {
    expect(en.about.version).toBe('Version');
  });

  it('es has about.version', () => {
    expect(es.about.version).toBe('Versión');
  });
});

// --- CR-06: Categorization completeness ---

describe('CR-06: Every SundayExceptionReason is categorized', () => {
  const ALL_REASONS: SundayExceptionReason[] = [
    'testimony_meeting',
    'general_conference',
    'stake_conference',
    'ward_conference',
    'primary_presentation',
    'other',
  ];

  for (const reason of ALL_REASONS) {
    it(`${reason} is either excluded or special (not both, not neither)`, () => {
      const excluded = isExcludedFromAgenda(reason);
      const special = isSpecialMeeting(reason);
      // Every exception type must be either excluded (no agenda) or special (shows agenda)
      expect(excluded || special).toBe(true);
      expect(excluded && special).toBe(false);
    });
  }
});
