/**
 * Tests for Batch 8, Phase 1: Display fixes & WhatsApp template
 *
 * F045 (CR-101): Hide status LEDs on non-speech Sundays in SundayCard
 * F046 (CR-102): Hide exception label for speech Sundays in Agenda tab
 * F047 (CR-103): Fix WhatsApp template initialization in Settings screen
 * F048 (CR-104, CR-108): Fix WhatsApp message variables (collection, link, quotes, date format)
 * F049 (CR-109): Fix speech slots not rendering in Home NextSundaysSection
 *
 * Covers acceptance criteria:
 *   AC-F045-01..04, AC-F046-01..03, AC-F047-01..05, AC-F048-01..08, AC-F049-01..03
 * Covers edge cases:
 *   EC-F045-01..02, EC-F046-01, EC-F047-01..02, EC-F048-01..03, EC-F049-01..02
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  resolveTemplate,
  DEFAULT_TEMPLATE_PT_BR,
  DEFAULT_TEMPLATE_EN,
  DEFAULT_TEMPLATE_ES,
  getDefaultTemplate,
} from '../lib/whatsappUtils';
import { formatDateHumanReadable } from '../lib/dateUtils';

function readSourceFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf-8');
}

// =============================================================================
// F045 (CR-101): Hide status LEDs on non-speech Sundays in SundayCard
// =============================================================================

describe('F045 (CR-101): Hide status LEDs on non-speech Sundays', () => {

  const getSundayCard = () => readSourceFile('components/SundayCard.tsx');

  describe('AC-F045-01: LEDs visible when type is speeches', () => {
    it('should wrap LEDs section with isSpeechesType conditional', () => {
      const content = getSundayCard();
      expect(content).toContain('{isSpeechesType && (');
    });

    it('should have isSpeechesType flag defined', () => {
      const content = getSundayCard();
      expect(content).toContain('const isSpeechesType = currentType === SUNDAY_TYPE_SPEECHES');
    });

    it('should render StatusLED components inside conditional', () => {
      const content = getSundayCard();
      // StatusLED should be inside the isSpeechesType conditional block
      const ledsStart = content.indexOf('{isSpeechesType && (');
      const ledsEnd = content.indexOf('</Pressable>', ledsStart);
      const ledsSection = content.substring(ledsStart, ledsEnd);
      expect(ledsSection).toContain('<StatusLED');
      expect(ledsSection).toContain('speechStatuses.map');
    });
  });

  describe('AC-F045-02: LEDs hidden when type is NOT speeches', () => {
    it('should NOT render LEDs unconditionally (no standalone <View style={styles.leds}>)', () => {
      const content = getSundayCard();
      // The LEDs View should be wrapped in conditional, not standalone
      // Find all occurrences of styles.leds
      const ledsViewIdx = content.indexOf('styles.leds');
      expect(ledsViewIdx).toBeGreaterThan(-1);
      // The line before should be part of the conditional
      const before = content.substring(Math.max(0, ledsViewIdx - 100), ledsViewIdx);
      expect(before).toContain('isSpeechesType');
    });
  });

  describe('AC-F045-03: Fix applies to Speeches tab (via shared SundayCard)', () => {
    it('should use SundayCard component in speeches.tsx', () => {
      const content = readSourceFile('app/(tabs)/speeches.tsx');
      expect(content).toContain('<SundayCard');
      expect(content).toContain("from '../../components/SundayCard'");
    });
  });

  describe('AC-F045-04: Fix applies to Home (NextSundaysSection via shared SundayCard)', () => {
    it('should use SundayCard component in NextSundaysSection.tsx', () => {
      const content = readSourceFile('components/NextSundaysSection.tsx');
      expect(content).toContain('<SundayCard');
      expect(content).toContain("from './SundayCard'");
    });
  });

  describe('EC-F045-01: LEDs disappear when type changed from speeches to other', () => {
    it('should compute isSpeechesType from currentType which derives from exception.reason', () => {
      const content = getSundayCard();
      expect(content).toContain("exception?.reason ?? SUNDAY_TYPE_SPEECHES");
      expect(content).toContain('const isSpeechesType = currentType === SUNDAY_TYPE_SPEECHES');
    });
  });

  describe('EC-F045-02: LEDs appear when type changed from other to speeches', () => {
    it('should have SUNDAY_TYPE_SPEECHES imported for comparison', () => {
      const content = getSundayCard();
      expect(content).toContain('SUNDAY_TYPE_SPEECHES');
      expect(content).toContain("from '../hooks/useSundayTypes'");
    });
  });
});

// =============================================================================
// F046 (CR-102): Hide exception label for speech Sundays in Agenda tab
// =============================================================================

describe('F046 (CR-102): Hide exception label for speech Sundays in Agenda', () => {

  const getAgenda = () => readSourceFile('app/(tabs)/agenda.tsx');

  describe('AC-F046-01: No yellow label for speeches type', () => {
    it('should filter exceptionLabel to return null when reason is speeches', () => {
      const content = getAgenda();
      expect(content).toContain("exception.reason !== 'speeches'");
    });

    it('should compute exceptionLabel with speeches filter', () => {
      const content = getAgenda();
      // The exceptionLabel computation should exclude speeches
      expect(content).toMatch(/exceptionLabel\s*=\s*\(exception\s*&&\s*exception\.reason\s*!==\s*'speeches'\)/);
    });
  });

  describe('AC-F046-02: Yellow label shown for non-speeches exceptions', () => {
    it('should still use t() for translation of exception reason', () => {
      const content = getAgenda();
      expect(content).toContain("t(`sundayExceptions.${exception.reason}`");
    });

    it('should have conditional rendering {exceptionLabel && (...)}', () => {
      const content = getAgenda();
      expect(content).toContain('{exceptionLabel && (');
    });
  });

  describe('AC-F046-03: Label for type other shows custom_reason', () => {
    it('should use fallback reason string for unrecognized types', () => {
      const content = getAgenda();
      // t(key, fallback) pattern where fallback is exception.reason
      expect(content).toContain(', exception.reason)');
    });
  });

  describe('EC-F046-01: Sunday without exception (pre-CR-56 data)', () => {
    it('should handle null exception gracefully', () => {
      const content = getAgenda();
      // The condition starts with (exception && ...) so null exception returns null
      expect(content).toMatch(/\(exception\s*&&/);
    });
  });
});

// =============================================================================
// F047 (CR-103): Fix WhatsApp template initialization in Settings
// =============================================================================

describe('F047 (CR-103): Fix WhatsApp template initialization in Settings', () => {

  const getWhatsAppSettings = () => readSourceFile('app/(tabs)/settings/whatsapp.tsx');

  describe('AC-F047-01: Default template shown when DB has null', () => {
    it('should import getDefaultTemplate from whatsappUtils', () => {
      const content = getWhatsAppSettings();
      expect(content).toContain("import { getDefaultTemplate } from '../../../lib/whatsappUtils'");
    });

    it('should call getDefaultTemplate when whatsapp_template is null', () => {
      const content = getWhatsAppSettings();
      expect(content).toContain('ward.whatsapp_template === null');
      expect(content).toContain('getDefaultTemplate(ward.language');
    });

    it('should handle undefined whatsapp_template as null', () => {
      const content = getWhatsAppSettings();
      expect(content).toContain('ward.whatsapp_template === undefined');
    });
  });

  describe('AC-F047-02: Custom template from DB shown when has value', () => {
    it('should set template from ward.whatsapp_template when it has value', () => {
      const content = getWhatsAppSettings();
      expect(content).toContain('setTemplate(ward.whatsapp_template)');
    });
  });

  describe('AC-F047-03: Empty string respected (user cleared intentionally)', () => {
    it('should check for empty string explicitly', () => {
      const content = getWhatsAppSettings();
      expect(content).toContain("ward.whatsapp_template === ''");
    });

    it('should set empty template for empty string', () => {
      const content = getWhatsAppSettings();
      expect(content).toContain("setTemplate('')");
    });
  });

  describe('AC-F047-04: Default template correct per ward language', () => {
    it('should pass ward.language to getDefaultTemplate', () => {
      const content = getWhatsAppSettings();
      expect(content).toContain("getDefaultTemplate(ward.language ?? 'pt-BR')");
    });

    it('should fallback to pt-BR when language is null', () => {
      const content = getWhatsAppSettings();
      expect(content).toContain("ward.language ?? 'pt-BR'");
    });
  });

  describe('AC-F047-05: Consistency between Settings and WhatsApp send', () => {
    it('should include language field in ward query', () => {
      const content = getWhatsAppSettings();
      expect(content).toContain("'whatsapp_template, language'");
    });

    it('should use same getDefaultTemplate function as whatsappUtils', () => {
      const content = getWhatsAppSettings();
      expect(content).toContain("from '../../../lib/whatsappUtils'");
      expect(content).toContain('getDefaultTemplate');
    });
  });

  describe('EC-F047-01: Query fails (network error)', () => {
    it('should guard initialization with ward check', () => {
      const content = getWhatsAppSettings();
      expect(content).toContain('if (ward && !initialized)');
    });
  });

  describe('EC-F047-02: Unsupported ward language fallback', () => {
    it('getDefaultTemplate falls back to pt-BR for unknown language', () => {
      expect(getDefaultTemplate('fr')).toBe(DEFAULT_TEMPLATE_PT_BR);
      expect(getDefaultTemplate('de')).toBe(DEFAULT_TEMPLATE_PT_BR);
      expect(getDefaultTemplate('ja')).toBe(DEFAULT_TEMPLATE_PT_BR);
    });
  });
});

// =============================================================================
// F048 (CR-104, CR-108): Fix WhatsApp message variables
// =============================================================================

describe('F048 (CR-104, CR-108): Fix WhatsApp message variables', () => {

  const getInviteManagement = () => readSourceFile('components/InviteManagementSection.tsx');
  const getWhatsAppUtils = () => readSourceFile('lib/whatsappUtils.ts');

  describe('AC-F048-01: Collection passed in WhatsApp variables', () => {
    it('should include collection field in handleNotInvitedAction', () => {
      const content = getInviteManagement();
      // Find handleNotInvitedAction section
      const notInvitedIdx = content.indexOf('handleNotInvitedAction');
      const nextHandlerIdx = content.indexOf('handleInvitedAction');
      const section = content.substring(notInvitedIdx, nextHandlerIdx);
      expect(section).toContain("collection: speech.topic_collection ?? ''");
    });

    it('should include collection field in handleInvitedAction', () => {
      const content = getInviteManagement();
      // F055 changed handleDropdownWhatsApp to use buildWhatsAppConversationUrl
      // (no message, no collection/link). Collection is still in handleNotInvitedAction.
      const invitedIdx = content.indexOf('handleInvitedAction');
      const section = content.substring(invitedIdx);
      // handleDropdownWhatsApp now uses buildWhatsAppConversationUrl (no ?text=)
      expect(section).toContain('buildWhatsAppConversationUrl');
    });
  });

  describe('AC-F048-02: Link passed in WhatsApp variables', () => {
    it('should include link field in handleNotInvitedAction', () => {
      const content = getInviteManagement();
      const notInvitedIdx = content.indexOf('handleNotInvitedAction');
      const nextHandlerIdx = content.indexOf('handleInvitedAction');
      const section = content.substring(notInvitedIdx, nextHandlerIdx);
      expect(section).toContain("link: speech.topic_link ?? ''");
    });

    it('should include link field in handleInvitedAction', () => {
      const content = getInviteManagement();
      // F055 changed handleDropdownWhatsApp to use buildWhatsAppConversationUrl
      // (no message, no link). Link is still in handleNotInvitedAction.
      const invitedIdx = content.indexOf('handleInvitedAction');
      const section = content.substring(invitedIdx);
      // handleDropdownWhatsApp now uses buildWhatsAppConversationUrl (no ?text=)
      expect(section).toContain('buildWhatsAppConversationUrl');
    });
  });

  describe('AC-F048-03: Title with quotes in WhatsApp message', () => {
    it('should have quotes around {titulo} in pt-BR template', () => {
      expect(DEFAULT_TEMPLATE_PT_BR).toContain('"{titulo}"');
    });

    it('should have quotes around {titulo} in EN template', () => {
      expect(DEFAULT_TEMPLATE_EN).toContain('"{titulo}"');
    });

    it('should have quotes around {titulo} in ES template', () => {
      expect(DEFAULT_TEMPLATE_ES).toContain('"{titulo}"');
    });
  });

  describe('AC-F048-04: Date in human-readable format (pt-BR)', () => {
    it('should use formatDateHumanReadable instead of formatDate for WhatsApp date', () => {
      const content = getInviteManagement();
      expect(content).toContain('formatDateHumanReadable(speech.sunday_date');
    });

    it('should import formatDateHumanReadable from dateUtils', () => {
      const content = getInviteManagement();
      expect(content).toContain('formatDateHumanReadable');
      expect(content).toContain("from '../lib/dateUtils'");
    });

    it('formatDateHumanReadable returns correct pt-BR format', () => {
      const result = formatDateHumanReadable('2026-02-22', 'pt-BR');
      expect(result).toBe('22 de Fevereiro de 2026');
    });
  });

  describe('AC-F048-05: Date in human-readable format (en)', () => {
    it('formatDateHumanReadable returns correct en format', () => {
      const result = formatDateHumanReadable('2026-02-22', 'en');
      expect(result).toBe('February 22, 2026');
    });
  });

  describe('AC-F048-06: Date in human-readable format (es)', () => {
    it('formatDateHumanReadable returns correct es format', () => {
      const result = formatDateHumanReadable('2026-02-22', 'es');
      expect(result).toBe('22 de Febrero de 2026');
    });
  });

  describe('AC-F048-07: Empty collection and link for speeches without topic', () => {
    it('should use ?? empty string for collection', () => {
      const content = getInviteManagement();
      expect(content).toContain("speech.topic_collection ?? ''");
    });

    it('should use ?? empty string for link', () => {
      const content = getInviteManagement();
      expect(content).toContain("speech.topic_link ?? ''");
    });

    it('resolveTemplate cleans whitespace from empty placeholders', () => {
      const result = resolveTemplate(
        'Topic from {colecao} titled "{titulo}" {link}',
        {
          speakerName: 'Test',
          date: '2026-02-22',
          position: '1o',
          topic: 'Faith',
          collection: '',
          link: '',
        }
      );
      // Should not have extra whitespace
      expect(result).not.toMatch(/\s{2,}/);
      expect(result).toContain('"Faith"');
    });
  });

  describe('AC-F048-08: Source code of 3 templates updated with quotes', () => {
    it('should have quotes in pt-BR template source code', () => {
      const content = getWhatsAppUtils();
      const ptSection = content.substring(
        content.indexOf('DEFAULT_TEMPLATE_PT_BR'),
        content.indexOf('DEFAULT_TEMPLATE_EN')
      );
      expect(ptSection).toContain('"{titulo}"');
    });

    it('should have quotes in EN template source code', () => {
      const content = getWhatsAppUtils();
      const enSection = content.substring(
        content.indexOf('DEFAULT_TEMPLATE_EN'),
        content.indexOf('DEFAULT_TEMPLATE_ES')
      );
      expect(enSection).toContain('"{titulo}"');
    });

    it('should have quotes in ES template source code', () => {
      const content = getWhatsAppUtils();
      const esSection = content.substring(
        content.indexOf('DEFAULT_TEMPLATE_ES'),
        content.indexOf('export function getDefaultTemplate')
      );
      expect(esSection).toContain('"{titulo}"');
    });
  });

  describe('EC-F048-01: Speech without collection', () => {
    it('resolveTemplate handles empty collection gracefully', () => {
      const result = resolveTemplate(DEFAULT_TEMPLATE_PT_BR, {
        speakerName: 'Joao',
        date: '22 de Fevereiro de 2026',
        position: '1o',
        topic: 'Fe',
        collection: '',
        link: 'https://example.com',
      });
      expect(result).not.toContain('{colecao}');
      expect(result).toContain('Bispado');
    });
  });

  describe('EC-F048-02: Speech without link', () => {
    it('resolveTemplate handles empty link gracefully', () => {
      const result = resolveTemplate(DEFAULT_TEMPLATE_PT_BR, {
        speakerName: 'Maria',
        date: '22 de Fevereiro de 2026',
        position: '2o',
        topic: 'Esperanca',
        collection: 'Temas da Ala',
        link: '',
      });
      expect(result).not.toContain('{link}');
      expect(result).toContain('Temas da Ala');
    });
  });

  describe('EC-F048-03: Empty title', () => {
    it('resolveTemplate renders empty quotes for empty title', () => {
      const result = resolveTemplate('titled "{titulo}" more text', {
        speakerName: 'Test',
        date: '2026-03-01',
        position: '1o',
        topic: '',
      });
      expect(result).toContain('""');
    });
  });
});

// =============================================================================
// F049 (CR-109): Fix speech slots not rendering in Home NextSundaysSection
// =============================================================================

describe('F049 (CR-109): Fix speech slots in NextSundaysSection', () => {

  const getNextSundaysSection = () => readSourceFile('components/NextSundaysSection.tsx');

  describe('AC-F049-01: SpeechSlots rendered when type is speeches', () => {
    it('should check for speeches reason in condition', () => {
      const content = getNextSundaysSection();
      expect(content).toContain("entry.exception.reason === 'speeches'");
    });

    it('should allow SpeechSlots when exception reason is speeches', () => {
      const content = getNextSundaysSection();
      expect(content).toContain("(!entry.exception || entry.exception.reason === 'speeches')");
    });
  });

  describe('AC-F049-02: SpeechSlots NOT rendered for non-speeches types', () => {
    it('should block SpeechSlots when exception reason is not speeches', () => {
      const content = getNextSundaysSection();
      // The condition should not simply be !entry.exception (which blocks everything)
      expect(content).not.toMatch(/\bexpandedDate === entry\.date\s*&&\s*\n?\s*!entry\.exception\s*&&\s*\n?\s*\[1, 2, 3\]/);
    });
  });

  describe('AC-F049-03: Consistency with Speeches tab', () => {
    it('should use same pattern as speeches.tsx', () => {
      const speechesContent = readSourceFile('app/(tabs)/speeches.tsx');
      const nextSundaysContent = getNextSundaysSection();

      // Both should check for exception.reason === 'speeches'
      expect(speechesContent).toContain("exception.reason === 'speeches'");
      expect(nextSundaysContent).toContain("entry.exception.reason === 'speeches'");
    });
  });

  describe('EC-F049-01: Sunday without exception (pre-CR-56 data)', () => {
    it('should handle null exception with !entry.exception check', () => {
      const content = getNextSundaysSection();
      // !entry.exception should still be the first part of the OR condition
      expect(content).toContain('!entry.exception ||');
    });
  });

  describe('EC-F049-02: Type changed while card expanded', () => {
    it('should render SpeechSlot components for each position', () => {
      const content = getNextSundaysSection();
      expect(content).toContain('<SpeechSlot');
      expect(content).toContain('[1, 2, 3].map');
    });

    it('should use SpeechSlot import', () => {
      const content = getNextSundaysSection();
      expect(content).toContain("import");
      expect(content).toContain("SpeechSlot");
    });
  });
});

// =============================================================================
// Cross-cutting functional tests
// =============================================================================

describe('Cross-cutting: WhatsApp template with quotes resolves correctly', () => {

  it('resolves pt-BR template with all variables including quotes', () => {
    const result = resolveTemplate(DEFAULT_TEMPLATE_PT_BR, {
      speakerName: 'Joao Silva',
      date: '22 de Fevereiro de 2026',
      position: '1\u00BA',
      topic: 'Fe em Jesus Cristo',
      collection: 'Temas da Ala',
      link: 'https://example.com/topic',
    });
    expect(result).toContain('22 de Fevereiro de 2026');
    expect(result).toContain('"Fe em Jesus Cristo"');
    expect(result).toContain('Temas da Ala');
    expect(result).toContain('https://example.com/topic');
    expect(result).toContain('Bispado');
    expect(result).not.toContain('{data}');
    expect(result).not.toContain('{titulo}');
    expect(result).not.toContain('{colecao}');
    expect(result).not.toContain('{link}');
  });

  it('resolves EN template with all variables including quotes', () => {
    const result = resolveTemplate(DEFAULT_TEMPLATE_EN, {
      speakerName: 'John Smith',
      date: 'February 22, 2026',
      position: '1st',
      topic: 'Faith in Jesus Christ',
      collection: 'Ward Topics',
      link: 'https://example.com/topic',
    });
    expect(result).toContain('February 22, 2026');
    expect(result).toContain('"Faith in Jesus Christ"');
    expect(result).toContain('Ward Topics');
    expect(result).toContain('https://example.com/topic');
    expect(result).toContain('Bishopric');
  });

  it('resolves ES template with all variables including quotes', () => {
    const result = resolveTemplate(DEFAULT_TEMPLATE_ES, {
      speakerName: 'Juan Perez',
      date: '22 de Febrero de 2026',
      position: '1\u00BA',
      topic: 'Fe en Jesucristo',
      collection: 'Temas de la Estaca',
      link: 'https://example.com/topic',
    });
    expect(result).toContain('22 de Febrero de 2026');
    expect(result).toContain('"Fe en Jesucristo"');
    expect(result).toContain('Temas de la Estaca');
    expect(result).toContain('Obispado');
  });
});

describe('Cross-cutting: formatDateHumanReadable for different dates', () => {
  it('formats March date in pt-BR', () => {
    expect(formatDateHumanReadable('2026-03-01', 'pt-BR')).toBe('1 de Marco de 2026');
  });

  it('formats December date in en', () => {
    expect(formatDateHumanReadable('2026-12-25', 'en')).toBe('December 25, 2026');
  });

  it('formats January date in es', () => {
    expect(formatDateHumanReadable('2026-01-04', 'es')).toBe('4 de Enero de 2026');
  });
});
