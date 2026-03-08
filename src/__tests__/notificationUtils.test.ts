/**
 * F066: Client-side buildNotificationText secretary_review support (CR-276)
 *
 * Tests secretary_review speaker and topic variants across all 3 languages,
 * and verifies existing notification types still work (no regression).
 */

import { describe, it, expect } from 'vitest';
import { buildNotificationText } from '../lib/notificationUtils';

// ============================================================================
// secretary_review - speaker variant
// ============================================================================

describe('buildNotificationText - secretary_review speaker variant', () => {
  it('returns correct speaker review text (pt-BR)', () => {
    const result = buildNotificationText('secretary_review', 'pt-BR', {
      name: 'Maria',
      position: 1,
      date: '15/03',
    });
    expect(result.title).toBe('Revisão de Designação');
    expect(result.body).toBe(
      'Atenção: o secretário designou Maria para o 1º discurso do dia 15/03. Revise a designação.'
    );
  });

  it('returns correct speaker review text (en-US)', () => {
    const result = buildNotificationText('secretary_review', 'en-US', {
      name: 'Maria',
      position: 1,
      date: '03/15',
    });
    expect(result.title).toBe('Assignment Review');
    expect(result.body).toBe(
      'Attention: the secretary assigned Maria to the 1st speech on 03/15. Review the assignment.'
    );
  });

  it('returns correct speaker review text (es-LA)', () => {
    const result = buildNotificationText('secretary_review', 'es-LA', {
      name: 'Maria',
      position: 1,
      date: '15/03',
    });
    expect(result.title).toBe('Revisión de Asignación');
    expect(result.body).toBe(
      'Atención: el secretario asignó a Maria para el 1er discurso del 15/03. Revise la asignación.'
    );
  });
});

// ============================================================================
// secretary_review - topic variant
// ============================================================================

describe('buildNotificationText - secretary_review topic variant', () => {
  it('returns correct topic review text (pt-BR)', () => {
    const result = buildNotificationText('secretary_review', 'pt-BR', {
      name: 'Maria',
      position: 1,
      date: '15/03',
      topic_title: 'Fé em Cristo',
    });
    expect(result.title).toBe('Revisão de Designação');
    expect(result.body).toBe(
      'Atenção: o secretário designou o tema Fé em Cristo para Maria no dia 15/03. Revise a designação.'
    );
  });

  it('returns correct topic review text (en-US)', () => {
    const result = buildNotificationText('secretary_review', 'en-US', {
      name: 'Maria',
      position: 1,
      date: '03/15',
      topic_title: 'Faith in Christ',
    });
    expect(result.title).toBe('Assignment Review');
    expect(result.body).toBe(
      'Attention: the secretary assigned the topic Faith in Christ to Maria on 03/15. Review the assignment.'
    );
  });

  it('returns correct topic review text (es-LA)', () => {
    const result = buildNotificationText('secretary_review', 'es-LA', {
      name: 'Maria',
      position: 1,
      date: '15/03',
      topic_title: 'Fe en Cristo',
    });
    expect(result.title).toBe('Revisión de Asignación');
    expect(result.body).toBe(
      'Atención: el secretario asignó el tema Fe en Cristo a Maria el 15/03. Revise la asignación.'
    );
  });
});

// ============================================================================
// Regression: existing notification types still work
// ============================================================================

describe('buildNotificationText - existing types (no regression)', () => {
  it('designation still works', () => {
    const result = buildNotificationText('designation', 'pt-BR', {
      names: ['João'],
      date: '15/03',
    });
    expect(result.title).toBe('Designação de Discurso');
    expect(result.body).toContain('João');
  });

  it('weekly_assignment still works', () => {
    const result = buildNotificationText('weekly_assignment', 'en-US', {});
    expect(result.title).toBe('Speech Reminder');
  });

  it('speaker_confirmed still works', () => {
    const result = buildNotificationText('speaker_confirmed', 'es-LA', {
      name: 'Pedro',
      position: 2,
      date: '15/03',
    });
    expect(result.title).toBe('Orador Confirmado');
    expect(result.body).toContain('Pedro');
  });

  it('speaker_withdrew still works', () => {
    const result = buildNotificationText('speaker_withdrew', 'pt-BR', {
      name: 'Ana',
      position: 3,
      date: '15/03',
    });
    expect(result.title).toBe('ATENÇÃO! Desistência');
    expect(result.body).toContain('Ana');
  });

  it('unknown type returns empty strings', () => {
    const result = buildNotificationText('unknown_type', 'pt-BR', {});
    expect(result.title).toBe('');
    expect(result.body).toBe('');
  });
});
