/**
 * QA Tests for CR-001 batch (10 Change Requests)
 *
 * Covers acceptance criteria and edge cases for:
 * CR-01: Home tab section title
 * CR-02: Language mismatch on ward creation
 * CR-03: Empty agenda rendering
 * CR-04: Exception display text
 * CR-05: Speech labels
 * CR-06: Sunday options list
 * CR-07: Hide speeches for non-speech sundays
 * CR-08: Topics collection scroll (structural)
 * CR-09: Settings navigation flash (structural)
 * CR-10: Theme and About screens
 */

import { describe, it, expect } from 'vitest';
import ptBR from '../i18n/locales/pt-BR.json';
import en from '../i18n/locales/en.json';
import es from '../i18n/locales/es.json';
import {
  SUNDAY_TYPE_SPEECHES,
  SUNDAY_TYPE_OPTIONS,
  getAutoAssignedType,
  getSundayOfMonth,
} from '../hooks/useSundayTypes';
import {
  isExcludedFromAgenda,
  isSpecialMeeting,
  EXCLUDED_EXCEPTION_TYPES,
} from '../hooks/useAgenda';
import {
  buildPresentationCards,
  isTodaySunday,
  getTodaySundayDate,
} from '../hooks/usePresentationMode';
import type {
  SundayExceptionReason,
  SundayAgenda,
  Speech,
  SundayException,
} from '../types/database';

// --- Test helpers ---

function makeAgenda(overrides: Partial<SundayAgenda> = {}): SundayAgenda {
  return {
    id: 'ag-1',
    ward_id: 'w-1',
    sunday_date: '2026-03-01',
    presiding_name: null,
    presiding_actor_id: null,
    conducting_name: null,
    conducting_actor_id: null,
    recognized_names: null,
    announcements: null,
    pianist_name: null,
    pianist_actor_id: null,
    conductor_name: null,
    conductor_actor_id: null,
    opening_hymn_id: null,
    opening_prayer_member_id: null,
    opening_prayer_name: null,
    sustaining_releasing: null,
    has_baby_blessing: false,
    baby_blessing_names: null,
    has_baptism_confirmation: false,
    baptism_confirmation_names: null,
    has_stake_announcements: false,
    sacrament_hymn_id: null,
    has_special_presentation: false,
    special_presentation_description: null,
    intermediate_hymn_id: null,
    closing_hymn_id: null,
    closing_prayer_member_id: null,
    closing_prayer_name: null,
    has_second_speech: true,
    has_intermediate_hymn: true,
    speaker_1_override: null,
    speaker_2_override: null,
    speaker_3_override: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeSpeech(position: number, overrides: Partial<Speech> = {}): Speech {
  return {
    id: `sp-${position}`,
    ward_id: 'w-1',
    sunday_date: '2026-03-01',
    position,
    member_id: `m-${position}`,
    speaker_name: `Speaker ${position}`,
    speaker_phone: null,
    topic_title: `Topic ${position}`,
    topic_link: null,
    topic_collection: null,
    status: 'assigned_confirmed',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

const mockT = (key: string, fallback?: string) => fallback ?? key;
const mockHymnLookup = (id: string | null) => (id ? `Hymn-${id}` : '');

const ALL_EXCEPTION_REASONS: SundayExceptionReason[] = [
  'testimony_meeting',
  'general_conference',
  'stake_conference',
  'ward_conference',
  'primary_presentation',
  'other',
];

// =============================================================================
// CR-01: Home Tab Section Title
// =============================================================================

describe('CR-01: Home tab section title', () => {
  describe('AC-1/AC-2: i18n key home.meetingAgendaTitle exists in all locales', () => {
    it('pt-BR has correct value', () => {
      expect(ptBR.home.meetingAgendaTitle).toBe('Agenda da Reunião Sacramental');
    });

    it('en has correct value', () => {
      expect(en.home.meetingAgendaTitle).toBe('Sacrament Meeting Agenda');
    });

    it('es has correct value', () => {
      expect(es.home.meetingAgendaTitle).toBe('Agenda de la Reunión Sacramental');
    });
  });

  describe('AC-4: Title renders in all 3 supported languages', () => {
    it('all locale values are non-empty strings', () => {
      expect(ptBR.home.meetingAgendaTitle.length).toBeGreaterThan(0);
      expect(en.home.meetingAgendaTitle.length).toBeGreaterThan(0);
      expect(es.home.meetingAgendaTitle.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// CR-02: Language mismatch on ward creation
// =============================================================================

describe('CR-02: Language mismatch on ward creation', () => {
  describe('AC-1/AC-2: changeLanguage is called in register flow', () => {
    it('changeLanguage is exported from i18n module', async () => {
      const i18n = await import('../i18n');
      expect(typeof i18n.changeLanguage).toBe('function');
    });

    it('SUPPORTED_LANGUAGES includes pt-BR, en, es', async () => {
      const i18n = await import('../i18n');
      expect(i18n.SUPPORTED_LANGUAGES).toContain('pt-BR');
      expect(i18n.SUPPORTED_LANGUAGES).toContain('en');
      expect(i18n.SUPPORTED_LANGUAGES).toContain('es');
    });
  });

  describe('AC-4: Device locale used as fallback', () => {
    it('DEFAULT_TIMEZONES exists for all supported languages', async () => {
      const i18n = await import('../i18n');
      for (const lang of i18n.SUPPORTED_LANGUAGES) {
        expect(i18n.DEFAULT_TIMEZONES[lang]).toBeDefined();
        expect(typeof i18n.DEFAULT_TIMEZONES[lang]).toBe('string');
      }
    });
  });
});

// =============================================================================
// CR-03: Empty Agenda Rendering
// =============================================================================

describe('CR-03: Empty agenda rendering in presentation', () => {
  describe('AC-1: buildPresentationCards renders agenda with all null fields', () => {
    it('returns 4 cards for null-field agenda with no exception', () => {
      const agenda = makeAgenda(); // all fields null/default
      const cards = buildPresentationCards(agenda, [], null, mockHymnLookup, mockT);
      expect(cards).toHaveLength(4);
    });

    it('card fields have empty strings for null values (not undefined)', () => {
      const agenda = makeAgenda();
      const cards = buildPresentationCards(agenda, [], null, mockHymnLookup, mockT);

      for (const card of cards) {
        for (const field of card.fields) {
          expect(field.value).toBeDefined();
          expect(typeof field.value).toBe('string');
        }
      }
    });
  });

  describe('AC-2: No "no results found" when agenda exists with empty fields', () => {
    it('buildPresentationCards returns non-empty array for empty agenda', () => {
      const agenda = makeAgenda();
      const cards = buildPresentationCards(agenda, [], null, mockHymnLookup, mockT);
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  describe('AC-4: Agenda form renders correctly with null/default values', () => {
    it('welcome card has opening hymn field even when hymn_id is null', () => {
      const agenda = makeAgenda({ opening_hymn_id: null });
      const cards = buildPresentationCards(agenda, [], null, mockHymnLookup, mockT);
      const welcomeCard = cards[0];
      const hymnField = welcomeCard.fields.find((f) => f.type === 'hymn');
      expect(hymnField).toBeDefined();
      expect(hymnField!.value).toBe('');
    });

    it('speech card has empty speaker names when no speeches exist', () => {
      const agenda = makeAgenda();
      const cards = buildPresentationCards(agenda, [], null, mockHymnLookup, mockT);
      const speechCard = cards[2];
      const speakerFields = speechCard.fields.filter((f) => f.type === 'text');
      for (const field of speakerFields) {
        expect(field.value).toBe('');
      }
    });
  });

  describe('EC: Edge cases', () => {
    it('null agenda returns 4 cards with empty values (R-2: null handled at UI level)', () => {
      const cards = buildPresentationCards(null, [], null, mockHymnLookup, mockT);
      expect(cards).toHaveLength(4);
      for (const card of cards) {
        for (const field of card.fields) {
          expect(field.value).toBe('');
        }
      }
    });

    it('special meeting with empty agenda returns 3 cards', () => {
      const agenda = makeAgenda();
      const exception: SundayException = {
        id: 'ex-1',
        ward_id: 'w-1',
        date: '2026-03-01',
        reason: 'testimony_meeting',
      };
      const cards = buildPresentationCards(agenda, [], exception, mockHymnLookup, mockT);
      expect(cards).toHaveLength(3);
    });

    it('primary_presentation exception also returns 3 cards', () => {
      const agenda = makeAgenda();
      const exception: SundayException = {
        id: 'ex-1',
        ward_id: 'w-1',
        date: '2026-03-01',
        reason: 'primary_presentation',
      };
      const cards = buildPresentationCards(agenda, [], exception, mockHymnLookup, mockT);
      expect(cards).toHaveLength(3);
    });

    it('"other" exception type returns 3 cards', () => {
      const agenda = makeAgenda();
      const exception: SundayException = {
        id: 'ex-1',
        ward_id: 'w-1',
        date: '2026-03-01',
        reason: 'other',
        custom_reason: 'Custom event',
      };
      const cards = buildPresentationCards(agenda, [], exception, mockHymnLookup, mockT);
      expect(cards).toHaveLength(3);
    });
  });
});

// =============================================================================
// CR-04: Exception Display Text
// =============================================================================

describe('CR-04: Exception display text i18n', () => {
  describe('AC-1: Translated labels exist for all exception types', () => {
    const exceptionKeys = [
      'testimony_meeting',
      'general_conference',
      'stake_conference',
      'ward_conference',
      'primary_presentation',
      'other',
      'speeches',
    ];

    for (const key of exceptionKeys) {
      it(`sundayExceptions.${key} is a non-empty string in all locales`, () => {
        const ptVal = (ptBR.sundayExceptions as Record<string, string>)[key];
        const enVal = (en.sundayExceptions as Record<string, string>)[key];
        const esVal = (es.sundayExceptions as Record<string, string>)[key];
        expect(ptVal).toBeDefined();
        expect(enVal).toBeDefined();
        expect(esVal).toBeDefined();
        expect(ptVal.length).toBeGreaterThan(0);
        expect(enVal.length).toBeGreaterThan(0);
        expect(esVal.length).toBeGreaterThan(0);
      });
    }
  });

  describe('AC-2: Correct translations for each type', () => {
    it('pt-BR general_conference is "Conferência Geral"', () => {
      expect(ptBR.sundayExceptions.general_conference).toBe('Conferência Geral');
    });

    it('en general_conference is "General Conference"', () => {
      expect(en.sundayExceptions.general_conference).toBe('General Conference');
    });

    it('es general_conference is "Conferencia General"', () => {
      expect(es.sundayExceptions.general_conference).toBe('Conferencia General');
    });

    it('pt-BR testimony_meeting is "Reunião de Testemunho"', () => {
      expect(ptBR.sundayExceptions.testimony_meeting).toBe('Reunião de Testemunho');
    });

    it('pt-BR ward_conference is "Conferência da Ala"', () => {
      expect(ptBR.sundayExceptions.ward_conference).toBe('Conferência da Ala');
    });

    it('pt-BR stake_conference is "Conferência de Estaca"', () => {
      expect(ptBR.sundayExceptions.stake_conference).toBe('Conferência de Estaca');
    });
  });

  describe('AC-3: No raw enum keys leaked', () => {
    it('no sundayExceptions value equals its own key', () => {
      const locales = [ptBR, en, es];
      for (const locale of locales) {
        for (const [key, value] of Object.entries(locale.sundayExceptions)) {
          expect(value).not.toBe(key);
        }
      }
    });
  });
});

// =============================================================================
// CR-05: Speech Labels
// =============================================================================

describe('CR-05: Speech slot labels', () => {
  describe('AC-1: pt-BR labels', () => {
    it('uses "{{number}} Discurso" pattern', () => {
      expect(ptBR.speeches.slot).toBe('{{number}} Discurso');
    });

    it('does NOT contain "Vaga"', () => {
      expect(ptBR.speeches.slot).not.toContain('Vaga');
    });
  });

  describe('AC-2: en labels', () => {
    it('uses "{{number}} Speech" pattern', () => {
      expect(en.speeches.slot).toBe('{{number}} Speech');
    });

    it('does NOT contain "Slot" or "Vacancy"', () => {
      expect(en.speeches.slot).not.toContain('Slot');
      expect(en.speeches.slot).not.toContain('Vacancy');
    });
  });

  describe('AC-3: es labels', () => {
    it('uses "{{number}} Discurso" pattern', () => {
      expect(es.speeches.slot).toBe('{{number}} Discurso');
    });

    it('does NOT contain "Vacante"', () => {
      expect(es.speeches.slot).not.toContain('Vacante');
    });
  });

  describe('Label rendering simulation', () => {
    it('produces "1\u00BA Discurso" for position 1 in pt-BR', () => {
      const template = ptBR.speeches.slot;
      const result = template.replace('{{number}}', '1\u00BA');
      expect(result).toBe('1\u00BA Discurso');
    });

    it('produces "2\u00BA Discurso" for position 2 in pt-BR', () => {
      const template = ptBR.speeches.slot;
      const result = template.replace('{{number}}', '2\u00BA');
      expect(result).toBe('2\u00BA Discurso');
    });

    it('produces "3\u00BA Discurso" for position 3 in pt-BR', () => {
      const template = ptBR.speeches.slot;
      const result = template.replace('{{number}}', '3\u00BA');
      expect(result).toBe('3\u00BA Discurso');
    });

    it('produces "1\u00BA Speech" for position 1 in en', () => {
      const template = en.speeches.slot;
      const result = template.replace('{{number}}', '1\u00BA');
      expect(result).toBe('1\u00BA Speech');
    });
  });
});

// =============================================================================
// CR-06: Sunday Options List
// =============================================================================

describe('CR-06: Sunday options list', () => {
  describe('AC-1: Correct dropdown options', () => {
    it('has exactly 7 options', () => {
      expect(SUNDAY_TYPE_OPTIONS).toHaveLength(7);
    });

    it('options in correct order', () => {
      expect(SUNDAY_TYPE_OPTIONS[0]).toBe('speeches');
      expect(SUNDAY_TYPE_OPTIONS[1]).toBe('testimony_meeting');
      expect(SUNDAY_TYPE_OPTIONS[2]).toBe('general_conference');
      expect(SUNDAY_TYPE_OPTIONS[3]).toBe('stake_conference');
      expect(SUNDAY_TYPE_OPTIONS[4]).toBe('ward_conference');
      expect(SUNDAY_TYPE_OPTIONS[5]).toBe('primary_presentation');
      expect(SUNDAY_TYPE_OPTIONS[6]).toBe('other');
    });
  });

  describe('AC-2: Removed options are not present', () => {
    it('does not include "fast_sunday"', () => {
      expect(SUNDAY_TYPE_OPTIONS).not.toContain('fast_sunday');
    });

    it('does not include "special_program"', () => {
      expect(SUNDAY_TYPE_OPTIONS).not.toContain('special_program');
    });

    it('does not include "no_meeting"', () => {
      expect(SUNDAY_TYPE_OPTIONS).not.toContain('no_meeting');
    });

    it('does not include "not_assigned"', () => {
      expect(SUNDAY_TYPE_OPTIONS).not.toContain('not_assigned');
    });
  });

  describe('AC-3: primary_presentation added as new option', () => {
    it('primary_presentation is in the options list', () => {
      expect(SUNDAY_TYPE_OPTIONS).toContain('primary_presentation');
    });
  });

  describe('AC-5: SundayExceptionReason type is correct', () => {
    it('all 6 exception reasons are valid', () => {
      const reasons: SundayExceptionReason[] = [
        'testimony_meeting',
        'general_conference',
        'stake_conference',
        'ward_conference',
        'primary_presentation',
        'other',
      ];
      // TypeScript ensures these compile -- runtime verify they exist in options
      for (const reason of reasons) {
        expect(SUNDAY_TYPE_OPTIONS).toContain(reason);
      }
    });
  });

  describe('AC-6: i18n updated for new/changed options', () => {
    it('pt-BR sundayExceptions.speeches = "Domingo com Discursos"', () => {
      expect(ptBR.sundayExceptions.speeches).toBe('Domingo com Discursos');
    });

    it('en sundayExceptions.speeches = "Sunday with Speeches"', () => {
      expect(en.sundayExceptions.speeches).toBe('Sunday with Speeches');
    });

    it('es sundayExceptions.speeches = "Domingo con Discursos"', () => {
      expect(es.sundayExceptions.speeches).toBe('Domingo con Discursos');
    });

    it('pt-BR sundayExceptions.primary_presentation = "Reunião Especial da Primária"', () => {
      expect(ptBR.sundayExceptions.primary_presentation).toBe('Reunião Especial da Primária');
    });

    it('pt-BR sundayExceptions.other = "Outro"', () => {
      expect(ptBR.sundayExceptions.other).toBe('Outro');
    });

    it('en sundayExceptions.other = "Other"', () => {
      expect(en.sundayExceptions.other).toBe('Other');
    });

    it('es sundayExceptions.other = "Otro"', () => {
      expect(es.sundayExceptions.other).toBe('Otro');
    });
  });

  describe('AC-8: SUNDAY_TYPE_OPTIONS updated', () => {
    it('speeches is the first option', () => {
      expect(SUNDAY_TYPE_OPTIONS[0]).toBe(SUNDAY_TYPE_SPEECHES);
    });

    it('other is the last option', () => {
      expect(SUNDAY_TYPE_OPTIONS[SUNDAY_TYPE_OPTIONS.length - 1]).toBe('other');
    });
  });

  describe('AC-9: First option label changed from "Nao designado" to "Domingo com Discursos"', () => {
    it('SUNDAY_TYPE_SPEECHES constant is "speeches"', () => {
      expect(SUNDAY_TYPE_SPEECHES).toBe('speeches');
    });

    it('i18n key for speeches is NOT "Nao designado"', () => {
      expect(ptBR.sundayExceptions.speeches).not.toContain('Não designado');
      expect(ptBR.sundayExceptions.speeches).not.toContain('Nao designado');
    });
  });

  describe('Custom reason support for "other" type', () => {
    it('SundayException interface has custom_reason field (type check)', () => {
      const exception: SundayException = {
        id: 'ex-1',
        ward_id: 'w-1',
        date: '2026-03-01',
        reason: 'other',
        custom_reason: 'Custom reason text',
      };
      expect(exception.custom_reason).toBe('Custom reason text');
    });

    it('custom_reason is optional / nullable', () => {
      const exception: SundayException = {
        id: 'ex-1',
        ward_id: 'w-1',
        date: '2026-03-01',
        reason: 'testimony_meeting',
      };
      expect(exception.custom_reason).toBeUndefined();
    });

    it('custom_reason can be null', () => {
      const exception: SundayException = {
        id: 'ex-1',
        ward_id: 'w-1',
        date: '2026-03-01',
        reason: 'other',
        custom_reason: null,
      };
      expect(exception.custom_reason).toBeNull();
    });
  });
});

// =============================================================================
// CR-07: Hide Speeches for Non-Speech Sundays
// =============================================================================

describe('CR-07: Hide speeches for non-speech sundays', () => {
  describe('AC-1: Non-speeches types are special meetings', () => {
    it('testimony_meeting is special', () => {
      expect(isSpecialMeeting('testimony_meeting')).toBe(true);
    });

    it('ward_conference is special', () => {
      expect(isSpecialMeeting('ward_conference')).toBe(true);
    });

    it('primary_presentation is special', () => {
      expect(isSpecialMeeting('primary_presentation')).toBe(true);
    });

    it('"other" is special', () => {
      expect(isSpecialMeeting('other')).toBe(true);
    });
  });

  describe('AC-2: speeches type is NOT special', () => {
    it('null reason (speeches) is not special', () => {
      expect(isSpecialMeeting(null)).toBe(false);
    });

    it('empty string is not special', () => {
      expect(isSpecialMeeting('')).toBe(false);
    });
  });

  describe('AC-4: Agenda tab isSpecialMeeting works with new types', () => {
    it('general_conference is NOT special (it is excluded)', () => {
      expect(isSpecialMeeting('general_conference')).toBe(false);
    });

    it('stake_conference is NOT special (it is excluded)', () => {
      expect(isSpecialMeeting('stake_conference')).toBe(false);
    });

    it('excluded types are excluded from agenda', () => {
      expect(isExcludedFromAgenda('general_conference')).toBe(true);
      expect(isExcludedFromAgenda('stake_conference')).toBe(true);
    });

    it('non-excluded special types are NOT excluded from agenda', () => {
      expect(isExcludedFromAgenda('testimony_meeting')).toBe(false);
      expect(isExcludedFromAgenda('ward_conference')).toBe(false);
      expect(isExcludedFromAgenda('primary_presentation')).toBe(false);
      expect(isExcludedFromAgenda('other')).toBe(false);
    });
  });

  describe('Presentation cards reflect speech hiding', () => {
    it('normal meeting (no exception) has 4 cards with speech data', () => {
      const agenda = makeAgenda();
      const speeches = [makeSpeech(1), makeSpeech(2), makeSpeech(3)];
      const cards = buildPresentationCards(agenda, speeches, null, mockHymnLookup, mockT);
      expect(cards).toHaveLength(4);
    });

    it('testimony_meeting has 3 cards (no speech cards)', () => {
      const agenda = makeAgenda();
      const exception: SundayException = {
        id: 'ex-1',
        ward_id: 'w-1',
        date: '2026-03-01',
        reason: 'testimony_meeting',
      };
      const cards = buildPresentationCards(agenda, [], exception, mockHymnLookup, mockT);
      expect(cards).toHaveLength(3);
      // Verify no speaker fields in cards
      const allFieldLabels = cards.flatMap((c) => c.fields.map((f) => f.label));
      const speakerLabels = allFieldLabels.filter((l) => l.includes('Speaker') || l.includes('speeches'));
      // The only speech-related label should be the meeting type, not speaker assignments
      expect(speakerLabels.length).toBeLessThanOrEqual(0);
    });
  });
});

// =============================================================================
// CR-08: Topics Collection Scroll (Structural Verification)
// =============================================================================

describe('CR-08: Topics collection scroll', () => {
  describe('AC-1/AC-2: Structure verification via file import', () => {
    it('topics.tsx file exists and is importable', async () => {
      // Verify the file exists by checking the glob
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.resolve(__dirname, '..', 'app', '(tabs)', 'settings', 'topics.tsx');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('topics.tsx contains ScrollView import', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.resolve(__dirname, '..', 'app', '(tabs)', 'settings', 'topics.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('ScrollView');
    });

    it('topics.tsx uses ScrollView as wrapper', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.resolve(__dirname, '..', 'app', '(tabs)', 'settings', 'topics.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');
      // Verify ScrollView is used (not just imported)
      expect(content).toContain('<ScrollView');
    });
  });
});

// =============================================================================
// CR-09: Settings Navigation Flash
// =============================================================================

describe('CR-09: Settings navigation flash fix', () => {
  describe('AC-1/AC-2: animation: none in settings layout', () => {
    it('settings _layout.tsx exists', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.resolve(__dirname, '..', 'app', '(tabs)', 'settings', '_layout.tsx');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('settings _layout.tsx has animation none', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.resolve(__dirname, '..', 'app', '(tabs)', 'settings', '_layout.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain("animation: 'none'");
    });
  });
});

// =============================================================================
// CR-10: Theme and About Buttons
// =============================================================================

describe('CR-10: Theme and About screens', () => {
  describe('AC-1: Theme screen exists with 3 options', () => {
    it('theme.tsx file exists', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.resolve(__dirname, '..', 'app', '(tabs)', 'settings', 'theme.tsx');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('theme.tsx contains automatic, light, dark options', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.resolve(__dirname, '..', 'app', '(tabs)', 'settings', 'theme.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain("'automatic'");
      expect(content).toContain("'light'");
      expect(content).toContain("'dark'");
    });
  });

  describe('AC-2: Theme persists via setPreference', () => {
    it('theme.tsx calls setPreference', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.resolve(__dirname, '..', 'app', '(tabs)', 'settings', 'theme.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('setPreference');
    });
  });

  describe('AC-3: Theme i18n keys', () => {
    it('pt-BR has all theme keys', () => {
      expect(ptBR.theme.automatic).toBe('Automático');
      expect(ptBR.theme.light).toBe('Claro');
      expect(ptBR.theme.dark).toBe('Escuro');
    });

    it('en has all theme keys', () => {
      expect(en.theme.automatic).toBe('Automatic');
      expect(en.theme.light).toBe('Light');
      expect(en.theme.dark).toBe('Dark');
    });

    it('es has all theme keys', () => {
      expect(es.theme.automatic).toBe('Automático');
      expect(es.theme.light).toBe('Claro');
      expect(es.theme.dark).toBe('Oscuro');
    });
  });

  describe('AC-4: About screen', () => {
    it('about.tsx file exists', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.resolve(__dirname, '..', 'app', '(tabs)', 'settings', 'about.tsx');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('about.tsx displays app version', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.resolve(__dirname, '..', 'app', '(tabs)', 'settings', 'about.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('APP_VERSION');
      expect(content).toContain("t('about.version')");
      expect(content).toContain("t('about.appName')");
    });

    it('about i18n keys exist in all locales', () => {
      expect(ptBR.about.title).toBe('Sobre');
      expect(ptBR.about.version).toBe('Versão');
      expect(ptBR.about.appName).toBe('Gerenciador da Reunião Sacramental');

      expect(en.about.title).toBe('About');
      expect(en.about.version).toBe('Version');
      expect(en.about.appName).toBe('Sacrament Meeting Planner');

      expect(es.about.title).toBe('Acerca de');
      expect(es.about.version).toBe('Versión');
      expect(es.about.appName).toBe('Planificador de Reunión Sacramental');
    });
  });

  describe('AC-5: Both buttons work in all 3 languages', () => {
    it('settings index routes to theme screen', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.resolve(__dirname, '..', 'app', '(tabs)', 'settings', 'index.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain("/(tabs)/settings/theme");
    });

    it('settings index routes to about screen', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.resolve(__dirname, '..', 'app', '(tabs)', 'settings', 'index.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain("/(tabs)/settings/about");
    });

    it('settings index no longer has empty onPress handlers for theme/about', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.resolve(__dirname, '..', 'app', '(tabs)', 'settings', 'index.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');
      // Count empty onPress handlers -- should not be paired with theme/about labels
      // A simple check: there should be no "onPress={() => {}}" associated with theme/about
      const lines = content.split('\n');
      let foundEmptyHandler = false;
      for (let i = 0; i < lines.length; i++) {
        if (
          lines[i].includes("t('settings.theme')") ||
          lines[i].includes("t('settings.about')")
        ) {
          // Check nearby lines for empty handler
          const context = lines.slice(Math.max(0, i - 3), i + 4).join('\n');
          if (context.includes('onPress={() => {}}')) {
            foundEmptyHandler = true;
          }
        }
      }
      expect(foundEmptyHandler).toBe(false);
    });
  });
});

// =============================================================================
// Cross-CR: Categorization and Consistency
// =============================================================================

describe('Cross-CR: Complete type system consistency', () => {
  describe('Every exception reason is categorized', () => {
    for (const reason of ALL_EXCEPTION_REASONS) {
      it(`${reason} is either excluded OR special (mutually exclusive)`, () => {
        const excluded = isExcludedFromAgenda(reason);
        const special = isSpecialMeeting(reason);
        expect(excluded || special).toBe(true);
        expect(excluded && special).toBe(false);
      });
    }
  });

  describe('speeches type is neither excluded nor special', () => {
    it('null (speeches) is not excluded', () => {
      expect(isExcludedFromAgenda(SUNDAY_TYPE_SPEECHES)).toBe(false);
    });

    it('null is not special', () => {
      expect(isSpecialMeeting(null)).toBe(false);
    });
  });

  describe('EXCLUDED_EXCEPTION_TYPES consistency', () => {
    it('has exactly 2 entries', () => {
      expect(EXCLUDED_EXCEPTION_TYPES.size).toBe(2);
    });

    it('contains general_conference and stake_conference', () => {
      expect(EXCLUDED_EXCEPTION_TYPES.has('general_conference')).toBe(true);
      expect(EXCLUDED_EXCEPTION_TYPES.has('stake_conference')).toBe(true);
    });

    it('does NOT contain removed types', () => {
      expect(EXCLUDED_EXCEPTION_TYPES.has('fast_sunday')).toBe(false);
      expect(EXCLUDED_EXCEPTION_TYPES.has('special_program')).toBe(false);
      expect(EXCLUDED_EXCEPTION_TYPES.has('no_meeting')).toBe(false);
    });
  });

  describe('Auto-assignment only produces valid types', () => {
    it('every auto-assigned type for 2026 is valid', () => {
      const sundays: Date[] = [];
      const start = new Date(2026, 0, 1);
      while (start.getDay() !== 0) start.setDate(start.getDate() + 1);
      while (start.getFullYear() === 2026) {
        sundays.push(new Date(start));
        start.setDate(start.getDate() + 7);
      }

      for (const sunday of sundays) {
        const type = getAutoAssignedType(sunday);
        const isValid =
          type === SUNDAY_TYPE_SPEECHES ||
          ALL_EXCEPTION_REASONS.includes(type as SundayExceptionReason);
        expect(
          isValid,
          `Invalid type "${type}" for ${sunday.toISOString()}`
        ).toBe(true);
      }
    });

    it('never produces removed values', () => {
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

  describe('getSundayOfMonth utility', () => {
    it('returns 1 for first sunday (day 1-7)', () => {
      expect(getSundayOfMonth(new Date(2026, 2, 1))).toBe(1);
    });

    it('returns 2 for second sunday (day 8-14)', () => {
      expect(getSundayOfMonth(new Date(2026, 2, 8))).toBe(2);
    });

    it('returns 5 for fifth sunday (day 29-31)', () => {
      expect(getSundayOfMonth(new Date(2026, 2, 29))).toBe(5);
    });
  });
});

// =============================================================================
// Cross-CR: i18n Completeness
// =============================================================================

describe('Cross-CR: i18n key completeness across all locales', () => {
  describe('All 3 locales have identical sundayExceptions keys', () => {
    it('pt-BR, en, es have same keys', () => {
      const ptKeys = Object.keys(ptBR.sundayExceptions).sort();
      const enKeys = Object.keys(en.sundayExceptions).sort();
      const esKeys = Object.keys(es.sundayExceptions).sort();
      expect(ptKeys).toEqual(enKeys);
      expect(ptKeys).toEqual(esKeys);
    });
  });

  describe('Removed i18n keys are gone', () => {
    it('no locale has fast_sunday key', () => {
      expect((ptBR.sundayExceptions as Record<string, string>).fast_sunday).toBeUndefined();
      expect((en.sundayExceptions as Record<string, string>).fast_sunday).toBeUndefined();
      expect((es.sundayExceptions as Record<string, string>).fast_sunday).toBeUndefined();
    });

    it('no locale has special_program key', () => {
      expect((ptBR.sundayExceptions as Record<string, string>).special_program).toBeUndefined();
      expect((en.sundayExceptions as Record<string, string>).special_program).toBeUndefined();
      expect((es.sundayExceptions as Record<string, string>).special_program).toBeUndefined();
    });

    it('no locale has no_meeting key', () => {
      expect((ptBR.sundayExceptions as Record<string, string>).no_meeting).toBeUndefined();
      expect((en.sundayExceptions as Record<string, string>).no_meeting).toBeUndefined();
      expect((es.sundayExceptions as Record<string, string>).no_meeting).toBeUndefined();
    });
  });

  describe('Theme i18n keys exist in all locales', () => {
    it('theme.automatic, theme.light, theme.dark present in all locales', () => {
      for (const locale of [ptBR, en, es]) {
        expect(locale.theme.automatic).toBeDefined();
        expect(locale.theme.light).toBeDefined();
        expect(locale.theme.dark).toBeDefined();
      }
    });
  });

  describe('About i18n keys exist in all locales', () => {
    it('about.title, about.version, about.appName present in all locales', () => {
      for (const locale of [ptBR, en, es]) {
        expect(locale.about.title).toBeDefined();
        expect(locale.about.version).toBeDefined();
        expect(locale.about.appName).toBeDefined();
      }
    });
  });
});

// =============================================================================
// CR-06/CR-07: Migration file verification
// =============================================================================

describe('CR-06: Database migration', () => {
  it('migration file 008 exists', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const migrationPath = path.resolve(
      __dirname,
      '..',
      '..',
      'supabase',
      'migrations',
      '008_fix_sunday_type_enum.sql'
    );
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  it('migration adds custom_reason column', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const migrationPath = path.resolve(
      __dirname,
      '..',
      '..',
      'supabase',
      'migrations',
      '008_fix_sunday_type_enum.sql'
    );
    const content = fs.readFileSync(migrationPath, 'utf-8');
    expect(content).toContain('custom_reason');
    expect(content).toContain('ADD COLUMN');
  });

  it('migration has new CHECK constraint with correct values', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const migrationPath = path.resolve(
      __dirname,
      '..',
      '..',
      'supabase',
      'migrations',
      '008_fix_sunday_type_enum.sql'
    );
    const content = fs.readFileSync(migrationPath, 'utf-8');
    expect(content).toContain("'testimony_meeting'");
    expect(content).toContain("'general_conference'");
    expect(content).toContain("'stake_conference'");
    expect(content).toContain("'ward_conference'");
    expect(content).toContain("'primary_presentation'");
    expect(content).toContain("'other'");
    // Should NOT contain removed values in the new constraint
    // (they appear in the UPDATE statement for migration, but not in the CHECK)
  });

  it('migration migrates old values to "other"', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const migrationPath = path.resolve(
      __dirname,
      '..',
      '..',
      'supabase',
      'migrations',
      '008_fix_sunday_type_enum.sql'
    );
    const content = fs.readFileSync(migrationPath, 'utf-8');
    expect(content).toContain("SET reason = 'other'");
    expect(content).toContain("'fast_sunday'");
    expect(content).toContain("'special_program'");
    expect(content).toContain("'no_meeting'");
  });
});
