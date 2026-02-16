/**
 * PHASE-03 extended tests: WhatsApp integration, invite items, and list building.
 */

import { describe, it, expect } from 'vitest';
import { resolveTemplate, buildWhatsAppUrl, DEFAULT_TEMPLATE_PT_BR } from '../lib/whatsappUtils';
import {
  areNext3FullyAssigned,
  findNextPendingSunday,
  getInviteItems,
} from '../lib/speechUtils';
import type { Speech, SpeechBySunday } from '../types/database';

// --- Factories ---

function makeSpeech(overrides: Partial<Speech> = {}): Speech {
  return {
    id: overrides.id ?? `sp-${Math.random().toString(36).slice(2)}`,
    ward_id: 'w-1',
    sunday_date: overrides.sunday_date ?? '2026-03-01',
    position: overrides.position ?? 1,
    member_id: overrides.member_id ?? 'm-1',
    speaker_name: overrides.speaker_name ?? 'Speaker',
    speaker_phone: overrides.speaker_phone ?? '+5511999999999',
    topic_title: overrides.topic_title ?? 'Topic',
    topic_link: overrides.topic_link ?? null,
    topic_collection: overrides.topic_collection ?? 'Collection',
    status: overrides.status ?? 'assigned_not_invited',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeEntry(
  date: string,
  speeches: Partial<Speech>[] = [],
  hasException = false
): SpeechBySunday {
  return {
    date,
    exception: hasException
      ? { id: 'ex-1', ward_id: 'w-1', date, reason: 'testimony_meeting' }
      : null,
    speeches: speeches.map((s, i) =>
      makeSpeech({
        ...s,
        sunday_date: date,
        position: s.position ?? i + 1,
        id: `${date}-${s.position ?? i + 1}`,
      })
    ),
  };
}

// Mock formatDate for getInviteItems
function mockFormatDate(date: string, locale: 'pt-BR' | 'en' | 'es'): string {
  const d = new Date(date + 'T00:00:00');
  const months: Record<string, string[]> = {
    'pt-BR': ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'],
    'en': ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
    'es': ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'],
  };
  const day = String(d.getDate()).padStart(2, '0');
  const month = months[locale][d.getMonth()];
  return `${day} ${month}`;
}

describe('PHASE-03: WhatsApp URL edge cases', () => {
  describe('resolveTemplate', () => {
    it('handles all 6 placeholders', () => {
      const template = '{nome} {data} {posicao} {colecao} {titulo} {link}';
      const result = resolveTemplate(template, {
        speakerName: 'Joao',
        date: '15 FEV',
        position: '1o',
        collection: 'Conference',
        topic: 'Faith',
        link: 'https://example.com',
      });
      expect(result).toBe('Joao 15 FEV 1o Conference Faith https://example.com');
    });

    it('handles template with multiple occurrences of same placeholder', () => {
      const template = '{nome} says {nome} is here';
      const result = resolveTemplate(template, {
        speakerName: 'Maria',
        date: '',
        position: '',
        topic: '',
      });
      expect(result).toBe('Maria says Maria is here');
    });

    it('returns trimmed result when all placeholders are empty', () => {
      const template = '{nome} {data} {posicao}';
      const result = resolveTemplate(template, {
        speakerName: '',
        date: '',
        position: '',
        topic: '',
      });
      expect(result).toBe('');
    });
  });

  describe('buildWhatsAppUrl phone normalization', () => {
    it('handles phone with periods', () => {
      const url = buildWhatsAppUrl('+55.11.98765.4321', '', '', {
        speakerName: 'Test',
        date: '',
        position: '',
        topic: '',
      });
      // periods are NOT cleaned (only spaces, dashes, parentheses are)
      expect(url).toContain('wa.me/');
    });

    it('handles empty phone with country code', () => {
      const url = buildWhatsAppUrl('', '+55', '', {
        speakerName: 'Test',
        date: '',
        position: '',
        topic: '',
      });
      expect(url).toContain('wa.me/55');
    });

    it('does not double-add country code when phone starts with +', () => {
      const url = buildWhatsAppUrl('+5511999999999', '+55', '', {
        speakerName: 'Test',
        date: '',
        position: '',
        topic: '',
      });
      expect(url).toContain('wa.me/5511999999999');
      // Should NOT contain 555511
      expect(url).not.toContain('wa.me/555511');
    });
  });

  describe('DEFAULT_TEMPLATE_PT_BR', () => {
    it('contains all expected placeholders', () => {
      expect(DEFAULT_TEMPLATE_PT_BR).toContain('{posicao}');
      expect(DEFAULT_TEMPLATE_PT_BR).toContain('{data}');
      expect(DEFAULT_TEMPLATE_PT_BR).toContain('{colecao}');
      expect(DEFAULT_TEMPLATE_PT_BR).toContain('{titulo}');
      expect(DEFAULT_TEMPLATE_PT_BR).toContain('{link}');
    });

    it('is in Portuguese', () => {
      expect(DEFAULT_TEMPLATE_PT_BR).toContain('Bispado');
      expect(DEFAULT_TEMPLATE_PT_BR).toContain('discurso');
      expect(DEFAULT_TEMPLATE_PT_BR).toContain('domingo');
    });
  });
});

describe('PHASE-03: getInviteItems comprehensive', () => {
  it('returns empty array when no speeches match invite status', () => {
    const speeches = [
      makeSpeech({ status: 'not_assigned' }),
      makeSpeech({ status: 'assigned_confirmed' }),
      makeSpeech({ status: 'gave_up' }),
    ];
    const result = getInviteItems(speeches, 'pt-BR', mockFormatDate);
    expect(result).toHaveLength(0);
  });

  it('includes assigned_not_invited speeches', () => {
    const speeches = [
      makeSpeech({ status: 'assigned_not_invited' }),
    ];
    const result = getInviteItems(speeches, 'pt-BR', mockFormatDate);
    expect(result).toHaveLength(1);
    expect(result[0].speech.status).toBe('assigned_not_invited');
  });

  it('includes assigned_invited speeches', () => {
    const speeches = [
      makeSpeech({ status: 'assigned_invited' }),
    ];
    const result = getInviteItems(speeches, 'pt-BR', mockFormatDate);
    expect(result).toHaveLength(1);
    expect(result[0].speech.status).toBe('assigned_invited');
  });

  it('sorts by date ascending, then by position ascending', () => {
    const speeches = [
      makeSpeech({ id: 'c', sunday_date: '2026-03-15', position: 2, status: 'assigned_not_invited' }),
      makeSpeech({ id: 'a', sunday_date: '2026-03-01', position: 3, status: 'assigned_invited' }),
      makeSpeech({ id: 'b', sunday_date: '2026-03-01', position: 1, status: 'assigned_not_invited' }),
      makeSpeech({ id: 'd', sunday_date: '2026-03-15', position: 1, status: 'assigned_invited' }),
    ];
    const result = getInviteItems(speeches, 'pt-BR', mockFormatDate);
    expect(result.map((i) => i.speech.id)).toEqual(['b', 'a', 'd', 'c']);
  });

  it('generates correct compact dates in pt-BR locale', () => {
    const speeches = [
      makeSpeech({ sunday_date: '2026-03-01', status: 'assigned_not_invited' }),
    ];
    const result = getInviteItems(speeches, 'pt-BR', mockFormatDate);
    expect(result[0].compactDate).toBe('01 MAR');
  });

  it('generates correct compact dates in en locale', () => {
    const speeches = [
      makeSpeech({ sunday_date: '2026-03-01', status: 'assigned_not_invited' }),
    ];
    const result = getInviteItems(speeches, 'en', mockFormatDate);
    expect(result[0].compactDate).toBe('01 MAR');
  });

  it('generates correct compact dates in es locale', () => {
    const speeches = [
      makeSpeech({ sunday_date: '2026-03-01', status: 'assigned_not_invited' }),
    ];
    const result = getInviteItems(speeches, 'es', mockFormatDate);
    expect(result[0].compactDate).toBe('01 MAR');
  });
});

describe('PHASE-03: areNext3FullyAssigned edge cases', () => {
  it('returns true for empty array (no sundays to check)', () => {
    expect(areNext3FullyAssigned([])).toBe(true);
  });

  it('returns true when only 1 sunday fully assigned (less than 3)', () => {
    const entries = [
      makeEntry('2026-03-01', [
        { position: 1, status: 'assigned_confirmed' },
        { position: 2, status: 'assigned_invited' },
        { position: 3, status: 'assigned_not_invited' },
      ]),
    ];
    expect(areNext3FullyAssigned(entries)).toBe(true);
  });

  it('handles mix of assigned statuses (all valid if not not_assigned or gave_up)', () => {
    const entries = [
      makeEntry('2026-03-01', [
        { position: 1, status: 'assigned_not_invited' },
        { position: 2, status: 'assigned_invited' },
        { position: 3, status: 'assigned_confirmed' },
      ]),
      makeEntry('2026-03-08', [
        { position: 1, status: 'assigned_confirmed' },
        { position: 2, status: 'assigned_not_invited' },
        { position: 3, status: 'assigned_invited' },
      ]),
      makeEntry('2026-03-15', [
        { position: 1, status: 'assigned_invited' },
        { position: 2, status: 'assigned_confirmed' },
        { position: 3, status: 'assigned_not_invited' },
      ]),
    ];
    expect(areNext3FullyAssigned(entries)).toBe(true);
  });

  it('ignores entries beyond index 3', () => {
    const entries = [
      makeEntry('2026-03-01', [
        { position: 1, status: 'assigned_confirmed' },
        { position: 2, status: 'assigned_confirmed' },
        { position: 3, status: 'assigned_confirmed' },
      ]),
      makeEntry('2026-03-08', [
        { position: 1, status: 'assigned_confirmed' },
        { position: 2, status: 'assigned_confirmed' },
        { position: 3, status: 'assigned_confirmed' },
      ]),
      makeEntry('2026-03-15', [
        { position: 1, status: 'assigned_confirmed' },
        { position: 2, status: 'assigned_confirmed' },
        { position: 3, status: 'assigned_confirmed' },
      ]),
      makeEntry('2026-03-22', [
        { position: 1, status: 'not_assigned' }, // Should NOT affect result
      ]),
    ];
    expect(areNext3FullyAssigned(entries)).toBe(true);
  });
});

describe('PHASE-03: findNextPendingSunday edge cases', () => {
  it('returns null when fewer than 4 entries', () => {
    const entries = [
      makeEntry('2026-03-01', []),
      makeEntry('2026-03-08', []),
      makeEntry('2026-03-15', []),
    ];
    // No entry at index 3 or beyond
    expect(findNextPendingSunday(entries)).toBeNull();
  });

  it('finds entry with gave_up as pending', () => {
    const entries = [
      makeEntry('2026-03-01', []),
      makeEntry('2026-03-08', []),
      makeEntry('2026-03-15', []),
      makeEntry('2026-03-22', [
        { position: 1, status: 'assigned_confirmed' },
        { position: 2, status: 'gave_up' }, // gave_up counts as pending
        { position: 3, status: 'assigned_confirmed' },
      ]),
    ];
    expect(findNextPendingSunday(entries)?.date).toBe('2026-03-22');
  });

  it('finds entry with missing positions as pending', () => {
    const entries = [
      makeEntry('2026-03-01', []),
      makeEntry('2026-03-08', []),
      makeEntry('2026-03-15', []),
      makeEntry('2026-03-22', [
        { position: 1, status: 'assigned_confirmed' },
        // Positions 2 and 3 missing
      ]),
    ];
    expect(findNextPendingSunday(entries)?.date).toBe('2026-03-22');
  });
});
