/**
 * Tests for WhatsApp integration utilities.
 */

import {
  resolveTemplate,
  buildWhatsAppUrl,
  getDefaultSpeechTemplate,
  getDefaultPrayerTemplate,
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

describe('resolveTemplate — {nome} vs {nome informal}', () => {
  const both = 'Olá {nome informal}, aqui é para {nome}.';

  it('{nome informal} resolves to the informal name and {nome} to the full name', () => {
    const result = resolveTemplate(both, {
      speakerName: 'Maria Silva',
      speakerInformalName: 'Maria',
      date: '15 FEV',
      topic: 'Fé',
    });

    expect(result).toBe('Olá Maria, aqui é para Maria Silva.');
  });

  it('falls back to the full name when the member has no informal name', () => {
    const empty = resolveTemplate(both, {
      speakerName: 'Maria Silva',
      speakerInformalName: '',
      date: '15 FEV',
      topic: 'Fé',
    });
    const missing = resolveTemplate(both, {
      speakerName: 'Maria Silva',
      date: '15 FEV',
      topic: 'Fé',
    });

    expect(empty).toBe('Olá Maria Silva, aqui é para Maria Silva.');
    expect(missing).toBe('Olá Maria Silva, aqui é para Maria Silva.');
  });

  it('{nome} is the full name — no longer the informal one', () => {
    const result = resolveTemplate('Olá {nome}!', {
      speakerName: 'Maria Silva',
      speakerInformalName: 'Maria',
      date: '',
      topic: '',
    });

    expect(result).toBe('Olá Maria Silva!');
  });

  it('substitutes the English and Spanish aliases of the informal token', () => {
    const vars = { speakerName: 'John Doe', speakerInformalName: 'Johnny', date: '', topic: '' };

    expect(resolveTemplate('Hi {informal name}, {name}', vars)).toBe('Hi Johnny, John Doe');
    expect(resolveTemplate('Hola {nombre informal}, {nombre}', vars)).toBe('Hola Johnny, John Doe');
  });

  it('resolving one name token never corrupts the other', () => {
    // {nome} is a prefix of {nome informal} up to the brace — substituting in the wrong order
    // would leave "Maria Silva informal}" behind.
    const result = resolveTemplate('{nome informal} {nome} {nome informal}', {
      speakerName: 'Maria Silva',
      speakerInformalName: 'Maria',
      date: '',
      topic: '',
    });

    expect(result).toBe('Maria Maria Silva Maria');
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
    expect(url).toContain(encodeURIComponent('bishopric'));
  });

  it('default template contains proper accents', () => {
    expect(DEFAULT_TEMPLATE_SPEECH_1_PT_BR).toContain('Olá');
    expect(DEFAULT_TEMPLATE_SPEECH_1_PT_BR).toContain('Você');
    expect(DEFAULT_TEMPLATE_SPEECH_1_PT_BR).toContain('falará');
    expect(DEFAULT_TEMPLATE_SPEECH_1_PT_BR).toContain('Reunião');
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
    expect(DEFAULT_TEMPLATE_SPEECH_1_EN).toContain('bishopric');
  });

  it('ES template contains Obispado', () => {
    expect(DEFAULT_TEMPLATE_SPEECH_1_ES).toContain('obispado');
  });
});

describe('the approved wording of the default templates', () => {
  // The copy is the deliverable here (specs/whatsapp-unify-default-templates.md), so it is pinned
  // verbatim: a "harmless" reword is a product decision, not a refactor, and must show up as a
  // failing test.
  it('pt-BR reads exactly as approved', () => {
    expect(getDefaultSpeechTemplate('pt-BR', 1)).toBe(
      'Olá {nome informal}, tudo bom? O bispado gostaria de te convidar para fazer o 1º discurso na Reunião Sacramental do domingo dia {data}! Você falará por 5 minutos sobre "{titulo}". {link}\n\nPodemos confirmar o seu discurso?'
    );
    expect(getDefaultSpeechTemplate('pt-BR', 2)).toBe(
      'Olá {nome informal}, tudo bom? O bispado gostaria de te convidar para fazer o 2º discurso na Reunião Sacramental do domingo dia {data}! Você falará por 7-10 minutos sobre "{titulo}". {link}\n\nPodemos confirmar o seu discurso?'
    );
    expect(getDefaultSpeechTemplate('pt-BR', 3)).toBe(
      'Olá {nome informal}, tudo bom? O bispado gostaria de te convidar para fazer o último discurso na Reunião Sacramental do domingo dia {data}! Você falará por 15-20 minutos sobre "{titulo}". {link}\n\nPodemos confirmar o seu discurso?'
    );
    expect(getDefaultPrayerTemplate('pt-BR', 'opening')).toBe(
      'Olá {nome informal}, tudo bom? O bispado gostaria de te convidar para fazer a oração de abertura da Reunião Sacramental do dia {data}.\n\nPodemos contar com você?'
    );
    expect(getDefaultPrayerTemplate('pt-BR', 'closing')).toBe(
      'Olá {nome informal}, tudo bom? O bispado gostaria de te convidar para fazer a oração de encerramento da Reunião Sacramental do dia {data}.\n\nPodemos contar com você?'
    );
  });

  it('en-US reads exactly as approved, using the Church term "talk"', () => {
    expect(getDefaultSpeechTemplate('en-US', 1)).toBe(
      'Hi {nome informal}, how are you? The bishopric would like to invite you to give the 1st talk in sacrament meeting on Sunday {data}! You will speak for 5 minutes about "{titulo}". {link}\n\nCan we count on you?'
    );
    expect(getDefaultSpeechTemplate('en-US', 2)).toBe(
      'Hi {nome informal}, how are you? The bishopric would like to invite you to give the 2nd talk in sacrament meeting on Sunday {data}! You will speak for 7-10 minutes about "{titulo}". {link}\n\nCan we count on you?'
    );
    expect(getDefaultSpeechTemplate('en-US', 3)).toBe(
      'Hi {nome informal}, how are you? The bishopric would like to invite you to give the last talk in sacrament meeting on Sunday {data}! You will speak for 15-20 minutes about "{titulo}". {link}\n\nCan we count on you?'
    );
    expect(getDefaultPrayerTemplate('en-US', 'opening')).toBe(
      'Hi {nome informal}, how are you? The bishopric would like to invite you to give the opening prayer in sacrament meeting on {data}.\n\nCan we count on you?'
    );
    expect(getDefaultPrayerTemplate('en-US', 'closing')).toBe(
      'Hi {nome informal}, how are you? The bishopric would like to invite you to give the closing prayer in sacrament meeting on {data}.\n\nCan we count on you?'
    );
  });

  it('es-LA reads exactly as approved', () => {
    expect(getDefaultSpeechTemplate('es-LA', 1)).toBe(
      'Hola {nome informal}, ¿cómo estás? El obispado quisiera invitarte a dar el primer discurso en la reunión sacramental del domingo {data}. Hablarás por 5 minutos sobre "{titulo}". {link}\n\n¿Podemos confirmar tu discurso?'
    );
    expect(getDefaultSpeechTemplate('es-LA', 2)).toBe(
      'Hola {nome informal}, ¿cómo estás? El obispado quisiera invitarte a dar el segundo discurso en la reunión sacramental del domingo {data}. Hablarás por 7-10 minutos sobre "{titulo}". {link}\n\n¿Podemos confirmar tu discurso?'
    );
    expect(getDefaultSpeechTemplate('es-LA', 3)).toBe(
      'Hola {nome informal}, ¿cómo estás? El obispado quisiera invitarte a dar el último discurso en la reunión sacramental del domingo {data}. Hablarás por 15-20 minutos sobre "{titulo}". {link}\n\n¿Podemos confirmar tu discurso?'
    );
    expect(getDefaultPrayerTemplate('es-LA', 'opening')).toBe(
      'Hola {nome informal}, ¿cómo estás? El obispado quisiera invitarte a ofrecer la oración de apertura en la reunión sacramental del día {data}.\n\n¿Podemos contar contigo?'
    );
    expect(getDefaultPrayerTemplate('es-LA', 'closing')).toBe(
      'Hola {nome informal}, ¿cómo estás? El obispado quisiera invitarte a ofrecer la oración final en la reunión sacramental del día {data}.\n\n¿Podemos contar contigo?'
    );
  });

  it('keeps the blank line before the closing question when resolved', () => {
    const message = resolveTemplate(getDefaultSpeechTemplate('pt-BR', 1), {
      speakerName: 'Maria Silva',
      speakerInformalName: 'Maria',
      date: '1 MAR',
      topic: 'Fé',
      link: 'https://x',
    });

    expect(message).toContain('https://x\n\nPodemos confirmar o seu discurso?');
  });

  it('leaves no double space or orphan line when the speech has no link', () => {
    const message = resolveTemplate(getDefaultSpeechTemplate('pt-BR', 1), {
      speakerName: 'Maria Silva',
      speakerInformalName: 'Maria',
      date: '1 MAR',
      topic: 'Fé',
    });

    // Known cosmetic artifact, unchanged by this spec: the empty {link} leaves a single space
    // before the period ('sobre "Fé" .'). What must not happen is a double space or a blank line
    // opening up where the link was.
    expect(message).toContain('sobre "Fé"');
    expect(message).toContain('Podemos confirmar o seu discurso?');
    expect(message).not.toMatch(/ {2}/);
    expect(message).not.toMatch(/\n{3}/);
  });
});

describe('the shipped default templates greet by the informal name', () => {
  const LANGS = ['pt-BR', 'en-US', 'es-LA'];

  it('every speech default in every language greets with {nome informal}', () => {
    for (const lang of LANGS) {
      for (const position of [1, 2, 3] as const) {
        const template = getDefaultSpeechTemplate(lang, position);
        expect(template).toContain('{nome informal}');
        expect(template).not.toContain('{nome}');
      }
    }
  });

  it('every prayer default in every language greets with {nome informal}, not the full name', () => {
    for (const lang of LANGS) {
      for (const type of ['opening', 'closing'] as const) {
        const template = getDefaultPrayerTemplate(lang, type);
        expect(template).toContain('{nome informal}');
        expect(template).not.toContain('{nome}');
      }
    }
  });

  it('the pt-BR speech defaults still say which speech it is', () => {
    expect(getDefaultSpeechTemplate('pt-BR', 1)).toContain('1º discurso');
    expect(getDefaultSpeechTemplate('pt-BR', 2)).toContain('2º discurso');
    expect(getDefaultSpeechTemplate('pt-BR', 3)).toContain('último discurso');
  });

  it('a member with no informal name is still greeted, by the full name', () => {
    const message = resolveTemplate(getDefaultPrayerTemplate('pt-BR', 'opening'), {
      speakerName: 'Maria Silva',
      speakerInformalName: '',
      date: '1 MAR',
      topic: '',
    });

    expect(message).toContain('Olá Maria Silva, tudo bom? O bispado gostaria de te convidar');
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
    expect(url).toContain(encodeURIComponent('bishopric'));
  });

  it('uses ES template when language=es-LA and no custom template', () => {
    const url = buildWhatsAppUrl('+5511987654321', '', '', vars, 'es-LA');
    expect(url).toContain(encodeURIComponent('obispado'));
  });

  it('uses pt-BR template when language=pt-BR and no custom template', () => {
    const url = buildWhatsAppUrl('+5511987654321', '', '', vars, 'pt-BR');
    expect(url).toContain(encodeURIComponent('bispado'));
  });

  it('custom template overrides language default', () => {
    const url = buildWhatsAppUrl('+5511987654321', '', 'Hello {nome}!', vars, 'es-LA');
    expect(url).toContain(encodeURIComponent('Hello John!'));
    expect(url).not.toContain(encodeURIComponent('obispado'));
  });

  it('defaults to en-US when language omitted', () => {
    const url = buildWhatsAppUrl('+5511987654321', '', '', vars);
    expect(url).toContain(encodeURIComponent('bishopric'));
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
