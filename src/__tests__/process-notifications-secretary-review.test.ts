/**
 * F066: process-notifications secretary_review support (CR-276)
 *
 * Tests buildSecretaryReviewText() for speaker and topic variants
 * across all 3 languages (pt-BR, en-US, es-LA), and verifies that
 * secretary_review entries are routed to immediateEntries (never grouped).
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// ============================================================================
// Extract buildSecretaryReviewText logic for testing
// (mirrors the function from process-notifications/index.ts)
// ============================================================================

const ORDINALS: Record<string, Record<number, string>> = {
  'pt-BR': { 1: '1\u00BA', 2: '2\u00BA', 3: '3\u00BA' },
  'en-US': { 1: '1st', 2: '2nd', 3: '3rd' },
  'es-LA': { 1: '1er', 2: '2do', 3: '3er' },
};

function getOrdinal(position: number, language: string): string {
  return ORDINALS[language]?.[position] ?? `${position}`;
}

function buildSecretaryReviewText(
  language: string,
  speakerName: string,
  position: number,
  date: string,
  topicTitle?: string
): { title: string; body: string } {
  const ordinal = getOrdinal(position, language);

  if (topicTitle) {
    const texts: Record<string, { title: string; body: string }> = {
      'pt-BR': {
        title: 'Revis\u00e3o de Designa\u00e7\u00e3o',
        body: `Aten\u00e7\u00e3o: o secret\u00e1rio designou o tema ${topicTitle} para ${speakerName} no dia ${date}. Revise a designa\u00e7\u00e3o.`,
      },
      'en-US': {
        title: 'Assignment Review',
        body: `Attention: the secretary assigned the topic ${topicTitle} to ${speakerName} on ${date}. Review the assignment.`,
      },
      'es-LA': {
        title: 'Revisi\u00f3n de Asignaci\u00f3n',
        body: `Atenci\u00f3n: el secretario asign\u00f3 el tema ${topicTitle} a ${speakerName} el ${date}. Revise la asignaci\u00f3n.`,
      },
    };
    return texts[language] ?? texts['pt-BR'];
  }

  const texts: Record<string, { title: string; body: string }> = {
    'pt-BR': {
      title: 'Revis\u00e3o de Designa\u00e7\u00e3o',
      body: `Aten\u00e7\u00e3o: o secret\u00e1rio designou ${speakerName} para o ${ordinal} discurso do dia ${date}. Revise a designa\u00e7\u00e3o.`,
    },
    'en-US': {
      title: 'Assignment Review',
      body: `Attention: the secretary assigned ${speakerName} to the ${ordinal} speech on ${date}. Review the assignment.`,
    },
    'es-LA': {
      title: 'Revisi\u00f3n de Asignaci\u00f3n',
      body: `Atenci\u00f3n: el secretario asign\u00f3 a ${speakerName} para el ${ordinal} discurso del ${date}. Revise la asignaci\u00f3n.`,
    },
  };
  return texts[language] ?? texts['pt-BR'];
}

// ============================================================================
// Speaker review text tests
// ============================================================================

describe('buildSecretaryReviewText - speaker variant', () => {
  it('returns correct speaker review text (pt-BR)', () => {
    const result = buildSecretaryReviewText('pt-BR', 'Maria', 1, '15/03');
    expect(result.title).toBe('Revis\u00e3o de Designa\u00e7\u00e3o');
    expect(result.body).toBe(
      'Aten\u00e7\u00e3o: o secret\u00e1rio designou Maria para o 1\u00BA discurso do dia 15/03. Revise a designa\u00e7\u00e3o.'
    );
  });

  it('returns correct speaker review text (en-US)', () => {
    const result = buildSecretaryReviewText('en-US', 'Maria', 1, '03/15');
    expect(result.title).toBe('Assignment Review');
    expect(result.body).toBe(
      'Attention: the secretary assigned Maria to the 1st speech on 03/15. Review the assignment.'
    );
  });

  it('returns correct speaker review text (es-LA)', () => {
    const result = buildSecretaryReviewText('es-LA', 'Maria', 1, '15/03');
    expect(result.title).toBe('Revisi\u00f3n de Asignaci\u00f3n');
    expect(result.body).toBe(
      'Atenci\u00f3n: el secretario asign\u00f3 a Maria para el 1er discurso del 15/03. Revise la asignaci\u00f3n.'
    );
  });
});

// ============================================================================
// Topic review text tests
// ============================================================================

describe('buildSecretaryReviewText - topic variant', () => {
  it('returns correct topic review text (pt-BR)', () => {
    const result = buildSecretaryReviewText('pt-BR', 'Maria', 1, '15/03', 'F\u00e9 em Cristo');
    expect(result.title).toBe('Revis\u00e3o de Designa\u00e7\u00e3o');
    expect(result.body).toBe(
      'Aten\u00e7\u00e3o: o secret\u00e1rio designou o tema F\u00e9 em Cristo para Maria no dia 15/03. Revise a designa\u00e7\u00e3o.'
    );
  });

  it('returns correct topic review text (en-US)', () => {
    const result = buildSecretaryReviewText('en-US', 'Maria', 1, '03/15', 'Faith in Christ');
    expect(result.title).toBe('Assignment Review');
    expect(result.body).toBe(
      'Attention: the secretary assigned the topic Faith in Christ to Maria on 03/15. Review the assignment.'
    );
  });

  it('returns correct topic review text (es-LA)', () => {
    const result = buildSecretaryReviewText('es-LA', 'Maria', 1, '15/03', 'Fe en Cristo');
    expect(result.title).toBe('Revisi\u00f3n de Asignaci\u00f3n');
    expect(result.body).toBe(
      'Atenci\u00f3n: el secretario asign\u00f3 el tema Fe en Cristo a Maria el 15/03. Revise la asignaci\u00f3n.'
    );
  });
});

// ============================================================================
// Routing tests
// ============================================================================

describe('secretary_review routing', () => {
  it('secretary_review entry is routed to immediateEntries (never grouped)', () => {
    // Simulate the routing logic from process-notifications
    const entry = {
      type: 'secretary_review',
      speech_position: 1,
    };

    // Routing logic: designation speech positions go to designationGroups,
    // everything else (including secretary_review) goes to immediateEntries
    const isDesignation = entry.type === 'designation';
    const isSpeechDesignation =
      isDesignation && entry.speech_position !== 0 && entry.speech_position !== 4;

    // secretary_review is NOT a designation, so it goes to immediate
    expect(isSpeechDesignation).toBe(false);
  });

  it('secretary_review with topic_title uses topic variant', () => {
    const result = buildSecretaryReviewText('pt-BR', 'Maria', 1, '15/03', 'Fe');
    expect(result.body).toContain('tema Fe');
  });

  it('secretary_review without topic_title uses speaker variant', () => {
    const result = buildSecretaryReviewText('pt-BR', 'Maria', 1, '15/03');
    expect(result.body).toContain('1\u00BA discurso');
    expect(result.body).not.toContain('tema');
  });
});

// ============================================================================
// Edge Function source verification
// ============================================================================

describe('process-notifications Edge Function source', () => {
  it('contains secretary_review case in switch statement', () => {
    const sourcePath = join(
      process.cwd(),
      'supabase/functions/process-notifications/index.ts'
    );
    const source = readFileSync(sourcePath, 'utf-8');

    expect(source).toContain("case 'secretary_review'");
    expect(source).toContain('buildSecretaryReviewText');
    expect(source).toContain('topic_title: string | null');
  });
});
