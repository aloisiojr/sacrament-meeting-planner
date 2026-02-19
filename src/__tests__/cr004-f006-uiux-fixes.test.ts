/**
 * QA Tests for CR-004 / F006: UI/UX Small Fixes
 *
 * Covers:
 * CR-62: About screen disclaimer + creditsValue fix
 * CR-63: WhatsApp template proper accents
 * CR-65: React.memo optimization on heavy components
 * CR-69: Agenda labels i18n updates
 * CR-70: ActorSelector icon size and touch targets
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function readSourceFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf-8');
}

function readLocale(locale: string): Record<string, unknown> {
  const filePath = path.resolve(__dirname, '..', 'i18n', 'locales', `${locale}.json`);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

describe('CR-004 F006: UI/UX Small Fixes', () => {
  describe('CR-62: About screen disclaimer and credits', () => {
    (['pt-BR', 'en', 'es'] as const).forEach((locale) => {
      it(`${locale}: about.creditsValue should be "Aloisio Almeida Jr"`, () => {
        const data = readLocale(locale);
        const about = data.about as Record<string, string>;
        expect(about.creditsValue).toBe('Aloisio Almeida Jr');
      });

      it(`${locale}: about.disclaimer key should exist and be non-empty`, () => {
        const data = readLocale(locale);
        const about = data.about as Record<string, string>;
        expect(about.disclaimer).toBeDefined();
        expect(about.disclaimer.length).toBeGreaterThan(10);
      });
    });

    it('pt-BR disclaimer should mention Igreja de Jesus Cristo', () => {
      const data = readLocale('pt-BR');
      const about = data.about as Record<string, string>;
      expect(about.disclaimer).toContain('Igreja de Jesus Cristo');
    });

    it('en disclaimer should mention Church of Jesus Christ', () => {
      const data = readLocale('en');
      const about = data.about as Record<string, string>;
      expect(about.disclaimer).toContain('Church of Jesus Christ');
    });

    it('es disclaimer should mention Iglesia de Jesucristo', () => {
      const data = readLocale('es');
      const about = data.about as Record<string, string>;
      expect(about.disclaimer).toContain('Iglesia de Jesucristo');
    });

    it('about.tsx should render disclaimer with correct styles', () => {
      const source = readSourceFile('app/(tabs)/settings/about.tsx');
      expect(source).toContain("t('about.disclaimer')");
      expect(source).toContain('disclaimerContainer');
      expect(source).toContain('disclaimerText');
      expect(source).toContain("fontStyle: 'italic'");
      expect(source).toContain('fontSize: 12');
    });
  });

  describe('CR-63: WhatsApp template proper accents', () => {
    it('DEFAULT_TEMPLATE_PT_BR should have accented characters', () => {
      const source = readSourceFile('lib/whatsappUtils.ts');
      expect(source).toContain('Olá');
      expect(source).toContain('Você');
      expect(source).toContain('falará');
      expect(source).toContain('título');
    });

    it('register-first-user template should have proper accents', () => {
      const edgeFnSource = fs.readFileSync(
        path.resolve(__dirname, '../../supabase/functions/register-first-user/index.ts'),
        'utf-8'
      );
      expect(edgeFnSource).toContain('Olá');
      expect(edgeFnSource).toContain('Você');
      expect(edgeFnSource).toContain('falará');
      expect(edgeFnSource).toContain('título');
      expect(edgeFnSource).toContain('Bispado');
    });
  });

  describe('CR-65: React.memo on heavy components', () => {
    it('SundayCard should be wrapped with React.memo', () => {
      const source = readSourceFile('components/SundayCard.tsx');
      expect(source).toMatch(/export const SundayCard = React\.memo\(function SundayCard\(/);
    });

    it('SpeechSlot should be wrapped with React.memo', () => {
      const source = readSourceFile('components/SpeechSlot.tsx');
      expect(source).toMatch(/export const SpeechSlot = React\.memo\(function SpeechSlot\(/);
    });

    it('AgendaForm should be wrapped with React.memo', () => {
      const source = readSourceFile('components/AgendaForm.tsx');
      expect(source).toMatch(/export const AgendaForm = React\.memo\(function AgendaForm\(/);
    });

    it('SettingsItem should be wrapped with React.memo', () => {
      const source = readSourceFile('app/(tabs)/settings/index.tsx');
      expect(source).toMatch(/const SettingsItem = React\.memo\(function SettingsItem\(/);
    });

    it('YearSeparator should be extracted as React.memo component', () => {
      const source = readSourceFile('app/(tabs)/speeches.tsx');
      expect(source).toMatch(/const YearSeparator = React\.memo\(function YearSeparator\(/);
    });

    it('speeches.tsx renderItem should NOT depend on colors', () => {
      const source = readSourceFile('app/(tabs)/speeches.tsx');
      const renderItemStart = source.indexOf('const renderItem = useCallback(');
      expect(renderItemStart).toBeGreaterThan(-1);
      const renderItemBlock = source.slice(renderItemStart, source.indexOf('if (speechesError'));
      const lastBracketStart = renderItemBlock.lastIndexOf('[');
      const lastBracketEnd = renderItemBlock.lastIndexOf(']');
      const depsStr = renderItemBlock.slice(lastBracketStart, lastBracketEnd + 1);
      expect(depsStr).not.toContain('colors');
    });
  });

  describe('CR-69: Agenda labels i18n updates', () => {
    it('pt-BR: conducting should be "Dirigindo"', () => {
      const agenda = readLocale('pt-BR').agenda as Record<string, string>;
      expect(agenda.conducting).toBe('Dirigindo');
    });

    it('pt-BR: wardBusiness should be "Apoios e Agradecimentos"', () => {
      const agenda = readLocale('pt-BR').agenda as Record<string, string>;
      expect(agenda.wardBusiness).toBe('Apoios e Agradecimentos');
    });

    it('pt-BR: stakeAnnouncements should be "Apoios e Agradecimentos da Estaca"', () => {
      const agenda = readLocale('pt-BR').agenda as Record<string, string>;
      expect(agenda.stakeAnnouncements).toBe('Apoios e Agradecimentos da Estaca');
    });

    it('pt-BR: recognizing should contain "Reconhecendo" and "Presen"', () => {
      const agenda = readLocale('pt-BR').agenda as Record<string, string>;
      expect(agenda.recognizing).toContain('Reconhecendo');
      expect(agenda.recognizing).toContain('Presen');
    });

    it('en: conducting should be "Directing"', () => {
      const agenda = readLocale('en').agenda as Record<string, string>;
      expect(agenda.conducting).toBe('Directing');
    });

    it('en: wardBusiness should be "Sustainings and Releases"', () => {
      const agenda = readLocale('en').agenda as Record<string, string>;
      expect(agenda.wardBusiness).toBe('Sustainings and Releases');
    });

    it('en: stakeAnnouncements should be "Stake Sustainings and Releases"', () => {
      const agenda = readLocale('en').agenda as Record<string, string>;
      expect(agenda.stakeAnnouncements).toBe('Stake Sustainings and Releases');
    });

    it('en: recognizing should be "Recognizing Visitors"', () => {
      const agenda = readLocale('en').agenda as Record<string, string>;
      expect(agenda.recognizing).toBe('Recognizing Visitors');
    });

    it('es: wardBusiness should be "Apoyos y Agradecimientos"', () => {
      const agenda = readLocale('es').agenda as Record<string, string>;
      expect(agenda.wardBusiness).toBe('Apoyos y Agradecimientos');
    });

    it('es: stakeAnnouncements should be "Apoyos y Agradecimientos de Estaca"', () => {
      const agenda = readLocale('es').agenda as Record<string, string>;
      expect(agenda.stakeAnnouncements).toBe('Apoyos y Agradecimientos de Estaca');
    });

    it('es: recognizing should be "Reconociendo la Presencia"', () => {
      const agenda = readLocale('es').agenda as Record<string, string>;
      expect(agenda.recognizing).toBe('Reconociendo la Presencia');
    });

    it('es: conducting should be "Dirigiendo"', () => {
      const agenda = readLocale('es').agenda as Record<string, string>;
      expect(agenda.conducting).toBe('Dirigiendo');
    });
  });

  describe('CR-70: ActorSelector icon size and touch targets', () => {
    it('actionIcon fontSize should be 24', () => {
      const source = readSourceFile('components/ActorSelector.tsx');
      expect(source).toMatch(/actionIcon:\s*\{[^}]*fontSize:\s*24/s);
    });

    it('actionIcon should have padding: 4', () => {
      const source = readSourceFile('components/ActorSelector.tsx');
      expect(source).toMatch(/actionIcon:\s*\{[^}]*padding:\s*4/s);
    });

    it('actorActions gap should be 20', () => {
      const source = readSourceFile('components/ActorSelector.tsx');
      expect(source).toMatch(/actorActions:\s*\{[^}]*gap:\s*20/s);
    });

    it('actorActions marginLeft should be 16', () => {
      const source = readSourceFile('components/ActorSelector.tsx');
      expect(source).toMatch(/actorActions:\s*\{[^}]*marginLeft:\s*16/s);
    });

    it('hitSlop should be 12 for action buttons', () => {
      const source = readSourceFile('components/ActorSelector.tsx');
      const matches = source.match(/hitSlop=\{12\}/g);
      expect(matches).not.toBeNull();
      expect(matches!.length).toBeGreaterThanOrEqual(2);
    });
  });
});
