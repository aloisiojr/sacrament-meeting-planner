/**
 * Tests for WhatsApp integration utilities.
 */

import { describe, it, expect } from 'vitest';
import { resolveTemplate, buildWhatsAppUrl } from '../lib/whatsappUtils';

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
});
