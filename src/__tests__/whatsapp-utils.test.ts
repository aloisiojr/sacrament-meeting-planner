/**
 * Tests for WhatsApp integration utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveTemplate,
  buildWhatsAppUrl,
  DEFAULT_TEMPLATE_PT_BR,
  DEFAULT_TEMPLATE_EN,
  DEFAULT_TEMPLATE_ES,
  getDefaultTemplate,
} from '../lib/whatsappUtils';

describe('resolveTemplate', () => {
  it('replaces all placeholders', () => {
    const template = 'Ola {nome}, discurso {posicao} no dia {data} sobre {titulo} da {colecao} {link}';
    const result = resolveTemplate(template, {
      speakerName: 'Joao',
      date: '15 FEV',
      position: '1o',
      topic: 'Fe',
      collection: 'Temas da Ala',
      link: 'https://example.com',
    });

    expect(result).toBe('Ola Joao, discurso 1o no dia 15 FEV sobre Fe da Temas da Ala https://example.com');
  });

  it('handles missing optional placeholders', () => {
    const template = 'Ola {nome}, discurso {posicao} sobre {titulo} {link}';
    const result = resolveTemplate(template, {
      speakerName: 'Maria',
      date: '22 MAR',
      position: '2o',
      topic: 'Esperanca',
    });

    expect(result).toBe('Ola Maria, discurso 2o sobre Esperanca');
  });

  it('cleans up double spaces from empty placeholders', () => {
    const template = '{nome}  {colecao}  {titulo}';
    const result = resolveTemplate(template, {
      speakerName: 'Pedro',
      date: '',
      position: '',
      topic: 'Caridade',
    });

    expect(result).toBe('Pedro Caridade');
  });
});

describe('buildWhatsAppUrl', () => {
  it('builds URL with phone starting with +', () => {
    const url = buildWhatsAppUrl('+5511987654321', '', '', {
      speakerName: 'Joao',
      date: '15 FEV',
      position: '1o',
      topic: 'Fe',
    });

    expect(url).toContain('https://wa.me/5511987654321');
    expect(url).toContain('text=');
  });

  it('builds URL with country code prepended', () => {
    const url = buildWhatsAppUrl('11987654321', '+55', '', {
      speakerName: 'Maria',
      date: '22 MAR',
      position: '2o',
      topic: 'Esperanca',
    });

    expect(url).toContain('https://wa.me/5511987654321');
  });

  it('cleans phone formatting', () => {
    const url = buildWhatsAppUrl('+55 (11) 98765-4321', '', '', {
      speakerName: 'Pedro',
      date: '29 ABR',
      position: '3o',
      topic: 'Caridade',
    });

    expect(url).toContain('https://wa.me/5511987654321');
  });

  it('uses custom template when provided', () => {
    const url = buildWhatsAppUrl('+5511987654321', '', 'Hello {nome}!', {
      speakerName: 'Ana',
      date: '',
      position: '',
      topic: '',
    });

    expect(url).toContain(encodeURIComponent('Hello Ana!'));
  });

  it('uses default template when empty', () => {
    const url = buildWhatsAppUrl('+5511987654321', '', '', {
      speakerName: 'Joao',
      date: '15 FEV',
      position: '1o',
      topic: 'Fe',
    });

    // Should contain encoded default template content
    expect(url).toContain(encodeURIComponent('Bispado'));
  });

  it('default template contains proper accents', () => {
    expect(DEFAULT_TEMPLATE_PT_BR).toContain('Olá');
    expect(DEFAULT_TEMPLATE_PT_BR).toContain('Você');
    expect(DEFAULT_TEMPLATE_PT_BR).toContain('falará');
    expect(DEFAULT_TEMPLATE_PT_BR).toContain('título');
  });
});

describe('getDefaultTemplate', () => {
  it('returns pt-BR template for pt-BR', () => {
    expect(getDefaultTemplate('pt-BR')).toBe(DEFAULT_TEMPLATE_PT_BR);
  });

  it('returns EN template for en', () => {
    expect(getDefaultTemplate('en')).toBe(DEFAULT_TEMPLATE_EN);
  });

  it('returns ES template for es', () => {
    expect(getDefaultTemplate('es')).toBe(DEFAULT_TEMPLATE_ES);
  });

  it('falls back to pt-BR for unknown language', () => {
    expect(getDefaultTemplate('fr')).toBe(DEFAULT_TEMPLATE_PT_BR);
  });

  it('EN template contains Bishopric', () => {
    expect(DEFAULT_TEMPLATE_EN).toContain('Bishopric');
  });

  it('ES template contains Obispado', () => {
    expect(DEFAULT_TEMPLATE_ES).toContain('Obispado');
  });
});

describe('buildWhatsAppUrl language parameter', () => {
  const vars = {
    speakerName: 'John',
    date: '15 FEB',
    position: '1st',
    topic: 'Faith',
  };

  it('uses EN template when language=en and no custom template', () => {
    const url = buildWhatsAppUrl('+5511987654321', '', '', vars, 'en');
    expect(url).toContain(encodeURIComponent('Bishopric'));
  });

  it('uses ES template when language=es and no custom template', () => {
    const url = buildWhatsAppUrl('+5511987654321', '', '', vars, 'es');
    expect(url).toContain(encodeURIComponent('Obispado'));
  });

  it('uses pt-BR template when language=pt-BR and no custom template', () => {
    const url = buildWhatsAppUrl('+5511987654321', '', '', vars, 'pt-BR');
    expect(url).toContain(encodeURIComponent('Bispado'));
  });

  it('custom template overrides language default', () => {
    const url = buildWhatsAppUrl('+5511987654321', '', 'Hello {nome}!', vars, 'es');
    expect(url).toContain(encodeURIComponent('Hello John!'));
    expect(url).not.toContain(encodeURIComponent('Obispado'));
  });

  it('defaults to pt-BR when language omitted', () => {
    const url = buildWhatsAppUrl('+5511987654321', '', '', vars);
    expect(url).toContain(encodeURIComponent('Bispado'));
  });
});
