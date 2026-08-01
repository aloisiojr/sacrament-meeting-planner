/**
 * Tests for WhatsApp integration utilities.
 */

import {
  resolveTemplate,
  buildWhatsAppUrl,
  getDefaultSpeechTemplate,
  DEFAULT_TEMPLATE_SPEECH_1_PT_BR,
  DEFAULT_TEMPLATE_SPEECH_1_EN,
  DEFAULT_TEMPLATE_SPEECH_1_ES,
  wrapDelegationMessage,
  getDefaultDelegationWrapper,
  DEFAULT_DELEGATION_WRAPPER_PT_BR,
  DEFAULT_DELEGATION_WRAPPER_EN,
  DEFAULT_DELEGATION_WRAPPER_ES,
} from '../lib/whatsappUtils';

describe('resolveTemplate', () => {
  it('replaces all placeholders', () => {
    const template = 'Ola {nome}, discurso no dia {data} sobre {titulo} da {colecao} {link}';
    const result = resolveTemplate(template, {
      speakerName: 'Joao',
      date: '15 FEV',
      topic: 'Fe',
      collection: 'Temas da Ala',
      link: 'https://example.com',
    });

    expect(result).toBe('Ola Joao, discurso no dia 15 FEV sobre Fe da Temas da Ala https://example.com');
  });

  it('handles missing optional placeholders', () => {
    const template = 'Ola {nome}, discurso sobre {titulo} {link}';
    const result = resolveTemplate(template, {
      speakerName: 'Maria',
      date: '22 MAR',
      topic: 'Esperanca',
    });

    expect(result).toBe('Ola Maria, discurso sobre Esperanca');
  });

  it('cleans up double spaces from empty placeholders', () => {
    const template = '{nome}  {colecao}  {titulo}';
    const result = resolveTemplate(template, {
      speakerName: 'Pedro',
      date: '',
      topic: 'Caridade',
    });

    expect(result).toBe('Pedro Caridade');
  });

  it('substitutes English and Spanish token aliases (incl. accented forms) — H1', () => {
    const en = resolveTemplate('Hi {name}, on {date} about {title} from {collection} {link}', {
      speakerName: 'John', date: 'Feb 15', topic: 'Faith', collection: 'Ward Topics', link: 'https://x',
    });
    expect(en).toBe('Hi John, on Feb 15 about Faith from Ward Topics https://x');
    const es = resolveTemplate('Hola {nombre}, el {fecha} sobre {título} de {colección} {enlace}', {
      speakerName: 'Ana', date: '15 feb', topic: 'Fe', collection: 'Temas', link: 'https://y',
    });
    expect(es).toBe('Hola Ana, el 15 feb sobre Fe de Temas https://y');
  });

  it('preserves intentional line breaks in multi-line templates (P2)', () => {
    const template = 'Olá {nome},\n\nSeu discurso é em {data}.\nTema: {titulo}';
    const result = resolveTemplate(template, {
      speakerName: 'Ana',
      date: '10 ABR',
      topic: 'Fé',
    });
    expect(result).toBe('Olá Ana,\n\nSeu discurso é em 10 ABR.\nTema: Fé');
  });
});

describe('buildWhatsAppUrl', () => {
  it('builds URL with phone starting with +', () => {
    const url = buildWhatsAppUrl('+5511987654321', '', '', {
      speakerName: 'Joao',
      date: '15 FEV',
      topic: 'Fe',
    });

    expect(url).toContain('https://wa.me/5511987654321');
    expect(url).toContain('text=');
  });

  it('builds URL with country code prepended', () => {
    const url = buildWhatsAppUrl('11987654321', '+55', '', {
      speakerName: 'Maria',
      date: '22 MAR',
      topic: 'Esperanca',
    });

    expect(url).toContain('https://wa.me/5511987654321');
  });

  it('cleans phone formatting', () => {
    const url = buildWhatsAppUrl('+55 (11) 98765-4321', '', '', {
      speakerName: 'Pedro',
      date: '29 ABR',
      topic: 'Caridade',
    });

    expect(url).toContain('https://wa.me/5511987654321');
  });

  it('uses custom template when provided', () => {
    const url = buildWhatsAppUrl('+5511987654321', '', 'Hello {nome}!', {
      speakerName: 'Ana',
      date: '',
      topic: '',
    });

    expect(url).toContain(encodeURIComponent('Hello Ana!'));
  });

  it('uses default template when empty', () => {
    const url = buildWhatsAppUrl('+5511987654321', '', '', {
      speakerName: 'Joao',
      date: '15 FEV',
      topic: 'Fe',
    });

    // Should contain encoded default template content (en-US fallback)
    expect(url).toContain(encodeURIComponent('Bishopric'));
  });

  it('default template contains proper accents', () => {
    expect(DEFAULT_TEMPLATE_SPEECH_1_PT_BR).toContain('Olá');
    expect(DEFAULT_TEMPLATE_SPEECH_1_PT_BR).toContain('Você');
    expect(DEFAULT_TEMPLATE_SPEECH_1_PT_BR).toContain('falará');
    expect(DEFAULT_TEMPLATE_SPEECH_1_PT_BR).toContain('título');
  });
});

describe('getDefaultSpeechTemplate', () => {
  it('returns pt-BR template for position 1', () => {
    expect(getDefaultSpeechTemplate('pt-BR', 1)).toBe(DEFAULT_TEMPLATE_SPEECH_1_PT_BR);
  });

  it('returns EN template for position 1', () => {
    expect(getDefaultSpeechTemplate('en-US', 1)).toBe(DEFAULT_TEMPLATE_SPEECH_1_EN);
  });

  it('returns ES template for position 1', () => {
    expect(getDefaultSpeechTemplate('es-LA', 1)).toBe(DEFAULT_TEMPLATE_SPEECH_1_ES);
  });

  it('falls back to en-US for unknown language', () => {
    expect(getDefaultSpeechTemplate('fr', 1)).toBe(DEFAULT_TEMPLATE_SPEECH_1_EN);
  });

  it('EN template contains Bishopric', () => {
    expect(DEFAULT_TEMPLATE_SPEECH_1_EN).toContain('Bishopric');
  });

  it('ES template contains Obispado', () => {
    expect(DEFAULT_TEMPLATE_SPEECH_1_ES).toContain('Obispado');
  });
});

describe('buildWhatsAppUrl language parameter', () => {
  const vars = {
    speakerName: 'John',
    date: '15 FEB',
    topic: 'Faith',
  };

  it('uses EN template when language=en-US and no custom template', () => {
    const url = buildWhatsAppUrl('+5511987654321', '', '', vars, 'en-US');
    expect(url).toContain(encodeURIComponent('Bishopric'));
  });

  it('uses ES template when language=es-LA and no custom template', () => {
    const url = buildWhatsAppUrl('+5511987654321', '', '', vars, 'es-LA');
    expect(url).toContain(encodeURIComponent('Obispado'));
  });

  it('uses pt-BR template when language=pt-BR and no custom template', () => {
    const url = buildWhatsAppUrl('+5511987654321', '', '', vars, 'pt-BR');
    expect(url).toContain(encodeURIComponent('Bispado'));
  });

  it('custom template overrides language default', () => {
    const url = buildWhatsAppUrl('+5511987654321', '', 'Hello {nome}!', vars, 'es-LA');
    expect(url).toContain(encodeURIComponent('Hello John!'));
    expect(url).not.toContain(encodeURIComponent('Obispado'));
  });

  it('defaults to en-US when language omitted', () => {
    const url = buildWhatsAppUrl('+5511987654321', '', '', vars);
    expect(url).toContain(encodeURIComponent('Bishopric'));
  });
});

describe('getDefaultDelegationWrapper', () => {
  it('returns the pt-BR wrapper', () => {
    expect(getDefaultDelegationWrapper('pt-BR')).toBe(DEFAULT_DELEGATION_WRAPPER_PT_BR);
  });

  it('returns the es-LA wrapper', () => {
    expect(getDefaultDelegationWrapper('es-LA')).toBe(DEFAULT_DELEGATION_WRAPPER_ES);
  });

  it('returns the en-US wrapper for en-US and unknown languages', () => {
    expect(getDefaultDelegationWrapper('en-US')).toBe(DEFAULT_DELEGATION_WRAPPER_EN);
    expect(getDefaultDelegationWrapper('fr-FR')).toBe(DEFAULT_DELEGATION_WRAPPER_EN);
  });
});

describe('wrapDelegationMessage', () => {
  it('applies a custom ward wrapper template with all tokens', () => {
    const result = wrapDelegationMessage(
      'Base invite',
      'Oi {responsavel}! Convite para {nome}: {mensagem}',
      'Maria',
      'João',
      'pt-BR'
    );
    expect(result).toBe('Oi Maria! Convite para João: Base invite');
  });

  it('falls back to the locale default when wrapper is null (pt-BR)', () => {
    const result = wrapDelegationMessage('MENSAGEM', null, 'Maria', 'João', 'pt-BR');
    expect(result).toBe('Olá Maria, tudo bom? Temos um convite para João:\n\nMENSAGEM');
  });

  it('falls back to the en-US default when wrapper is null and language omitted', () => {
    const result = wrapDelegationMessage('MSG', null, 'Mary', 'John');
    expect(result).toBe('Hi Mary, how are you? We have an invitation for John:\n\nMSG');
  });

  it('uses the es-LA default for language es-LA', () => {
    const result = wrapDelegationMessage('MSG', null, 'Ana', 'Luis', 'es-LA');
    expect(result).toContain('Hola Ana, ¿qué tal?');
    expect(result).toContain('para Luis');
    expect(result.endsWith('\n\nMSG')).toBe(true);
  });

  it('replaces all occurrences of each token', () => {
    const result = wrapDelegationMessage(
      'X',
      '{responsavel} {responsavel} / {nome} {nome} / {mensagem}',
      'R',
      'N'
    );
    expect(result).toBe('R R / N N / X');
  });

  it('does not re-substitute tokens that appear inside the base message', () => {
    // A base message that itself contains {responsavel} must be left intact.
    const result = wrapDelegationMessage('call {responsavel} back', null, 'Maria', 'João', 'pt-BR');
    expect(result).toContain('call {responsavel} back');
  });
});
