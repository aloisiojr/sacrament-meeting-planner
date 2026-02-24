/**
 * Tests for Batch 9, Phase 1: Bug Fixes, Speech Cards & UX Polish
 *
 * F055 (CR-112): View WhatsApp conversation without resending invite message
 * F056 (CR-113): Change InviteActionDropdown title to 'Alterar status' (i18n)
 * F057 (CR-117): Fix +1 country code showing Canada instead of USA
 * F058 (CR-122): Change '3o Discurso' to 'Ultimo Discurso' label (i18n)
 * F059 (CR-125): Fix closing prayer field visual duplication bug
 *
 * Covers acceptance criteria:
 *   AC-F055-01..04, AC-F056-01..03, AC-F057-01..04, AC-F058-01..06, AC-F059-01..06
 * Covers edge cases:
 *   EC-F055-01..02, EC-F056-01, EC-F057-01..02, EC-F058-01, EC-F059-01..02
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

import {
  buildWhatsAppUrl,
  buildWhatsAppConversationUrl,
} from '../lib/whatsappUtils';

import {
  COUNTRY_CODES,
  getFlagForCode,
  getCountryByLabel,
  splitPhoneNumber,
} from '../lib/countryCodes';

function readSourceFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf-8');
}

function readLocale(locale: string): Record<string, unknown> {
  const content = fs.readFileSync(
    path.resolve(__dirname, '..', 'i18n', 'locales', `${locale}.json`),
    'utf-8'
  );
  return JSON.parse(content);
}

// =============================================================================
// F055 (CR-112): View WhatsApp conversation without resending invite
// =============================================================================

describe('F055 (CR-112): View WhatsApp conversation without resending invite', () => {
  // --- AC-F055-01: Ver Conversa opens WhatsApp without invite text ---
  describe('AC-F055-01: Ver Conversa opens WhatsApp without invite text', () => {
    it('should have handleDropdownWhatsApp that calls buildWhatsAppConversationUrl', () => {
      const content = readSourceFile('components/InviteManagementSection.tsx');
      expect(content).toContain('buildWhatsAppConversationUrl');
      // handleDropdownWhatsApp should use buildWhatsAppConversationUrl
      const handlerMatch = content.indexOf('handleDropdownWhatsApp');
      const handlerEnd = content.indexOf('}', content.indexOf('openWhatsApp(url)', handlerMatch));
      const handlerBody = content.substring(handlerMatch, handlerEnd);
      expect(handlerBody).toContain('buildWhatsAppConversationUrl');
      // Should NOT use buildWhatsAppUrl in handleDropdownWhatsApp
      expect(handlerBody).not.toContain('buildWhatsAppUrl(');
    });

    it('should import buildWhatsAppConversationUrl', () => {
      const content = readSourceFile('components/InviteManagementSection.tsx');
      expect(content).toContain('buildWhatsAppConversationUrl');
      // Import from whatsapp or whatsappUtils
      const importSection = content.substring(0, content.indexOf('export function'));
      expect(importSection).toContain('buildWhatsAppConversationUrl');
    });
  });

  // --- AC-F055-02: Phone number correctly formatted in URL ---
  describe('AC-F055-02: Phone number correctly formatted in URL', () => {
    it('should return URL without ?text= for standard phone number', () => {
      const url = buildWhatsAppConversationUrl('+5511987654321');
      expect(url).toBe('https://wa.me/5511987654321');
      expect(url).not.toContain('?text=');
    });

    it('should strip + from phone number', () => {
      const url = buildWhatsAppConversationUrl('+1234567890');
      expect(url).toBe('https://wa.me/1234567890');
    });

    it('should handle phone number without + prefix', () => {
      const url = buildWhatsAppConversationUrl('5511987654321');
      expect(url).toBe('https://wa.me/5511987654321');
    });
  });

  // --- AC-F055-03: Initial invite button continues sending message ---
  describe('AC-F055-03: Initial invite button continues sending message', () => {
    it('should have handleNotInvitedAction that uses buildWhatsAppUrl (with message)', () => {
      const content = readSourceFile('components/InviteManagementSection.tsx');
      // handleNotInvitedAction should use buildWhatsAppUrl (NOT conversation version)
      const handlerStart = content.indexOf('handleNotInvitedAction');
      const nextHandler = content.indexOf('handleInvitedAction', handlerStart);
      const handlerBody = content.substring(handlerStart, nextHandler);
      expect(handlerBody).toContain('buildWhatsAppUrl(');
      // Should NOT use buildWhatsAppConversationUrl in handleNotInvitedAction
      expect(handlerBody).not.toContain('buildWhatsAppConversationUrl');
    });

    it('buildWhatsAppUrl should still return URL with ?text= parameter', () => {
      const url = buildWhatsAppUrl('+5511987654321', '', '', {
        speakerName: 'Test',
        date: '2026-02-22',
        topic: 'Faith',
        position: '1\u00BA',
      });
      expect(url).toContain('https://wa.me/5511987654321?text=');
    });
  });

  // --- AC-F055-04: Ver Conversa disabled when no phone ---
  describe('AC-F055-04: Ver Conversa disabled when no phone', () => {
    it('should have disabled={!hasPhone} on View Conversation option', () => {
      const content = readSourceFile('components/InviteActionDropdown.tsx');
      expect(content).toContain('disabled={!hasPhone}');
    });

    it('should have reduced opacity style for disabled option', () => {
      const content = readSourceFile('components/InviteActionDropdown.tsx');
      expect(content).toContain('disabledOption');
      expect(content).toContain('opacity');
    });

    it('should check speech.speaker_phone existence for hasPhone', () => {
      const content = readSourceFile('components/InviteActionDropdown.tsx');
      expect(content).toContain('speaker_phone');
    });
  });

  // --- EC-F055-01: Phone number with spaces or dashes ---
  describe('EC-F055-01: Phone number with special characters', () => {
    it('should remove spaces from phone number', () => {
      const url = buildWhatsAppConversationUrl('+55 11 98765 4321');
      expect(url).toBe('https://wa.me/5511987654321');
    });

    it('should remove dashes from phone number', () => {
      const url = buildWhatsAppConversationUrl('+55-11-98765-4321');
      expect(url).toBe('https://wa.me/5511987654321');
    });

    it('should remove parentheses from phone number', () => {
      const url = buildWhatsAppConversationUrl('+55(11)987654321');
      expect(url).toBe('https://wa.me/5511987654321');
    });

    it('should handle mixed special characters', () => {
      const url = buildWhatsAppConversationUrl('+55 (11) 98765-4321');
      expect(url).toBe('https://wa.me/5511987654321');
    });
  });

  // --- EC-F055-02: WhatsApp not installed (error handling) ---
  describe('EC-F055-02: WhatsApp error handling exists', () => {
    it('should have openWhatsApp with error handling via Alert', () => {
      const content = readSourceFile('lib/whatsapp.ts');
      expect(content).toContain('Alert.alert');
      expect(content).toContain('whatsappNotInstalled');
      expect(content).toContain('whatsappFailed');
    });
  });
});

// =============================================================================
// F056 (CR-113): Dialog title 'Alterar status' with i18n
// =============================================================================

describe('F056 (CR-113): InviteActionDropdown title i18n', () => {
  const getDropdownSource = () => readSourceFile('components/InviteActionDropdown.tsx');

  // --- AC-F056-01: Title shows 'Alterar status' in pt-BR ---
  describe('AC-F056-01: Title shows translated text in pt-BR', () => {
    it('should use t("speeches.changeStatus") for title', () => {
      const content = getDropdownSource();
      expect(content).toContain("t('speeches.changeStatus')");
    });

    it('should NOT use speech?.speaker_name as title', () => {
      const content = getDropdownSource();
      // Title should not reference speaker_name
      const titleSection = content.substring(
        content.indexOf('{/* Title'),
        content.indexOf('{/* Option 1')
      );
      expect(titleSection).not.toContain('speaker_name');
    });

    it('pt-BR locale should have speeches.changeStatus = "Alterar status"', () => {
      const locale = readLocale('pt-BR') as { speeches: { changeStatus: string } };
      expect(locale.speeches.changeStatus).toBe('Alterar status');
    });
  });

  // --- AC-F056-02: Title translated correctly in English ---
  describe('AC-F056-02: Title translated correctly in English', () => {
    it('en locale should have speeches.changeStatus = "Change status"', () => {
      const locale = readLocale('en') as { speeches: { changeStatus: string } };
      expect(locale.speeches.changeStatus).toBe('Change status');
    });
  });

  // --- AC-F056-03: Title translated correctly in Spanish ---
  describe('AC-F056-03: Title translated correctly in Spanish', () => {
    it('es locale should have speeches.changeStatus = "Cambiar estado"', () => {
      const locale = readLocale('es') as { speeches: { changeStatus: string } };
      expect(locale.speeches.changeStatus).toBe('Cambiar estado');
    });
  });

  // --- EC-F056-01: Speech null when dropdown visible ---
  describe('EC-F056-01: Title works regardless of speech being null', () => {
    it('title should not depend on speech object', () => {
      const content = getDropdownSource();
      // The title Text uses t('speeches.changeStatus') not speech?.anything
      const titleStart = content.indexOf('styles.title');
      const titleEnd = content.indexOf('</Text>', titleStart);
      const titleSection = content.substring(titleStart, titleEnd);
      expect(titleSection).toContain("t('speeches.changeStatus')");
      expect(titleSection).not.toContain('speech?.');
    });
  });
});

// =============================================================================
// F057 (CR-117): Fix +1 country code showing Canada instead of USA
// =============================================================================

describe('F057 (CR-117): Fix +1 country code showing Canada instead of USA', () => {
  // --- AC-F057-01: USA flag shown for code +1 by default ---
  describe('AC-F057-01: USA flag shown for +1 by default', () => {
    it('getFlagForCode("+1") should return US flag emoji', () => {
      const usFlag = '\u{1F1FA}\u{1F1F8}';
      expect(getFlagForCode('+1')).toBe(usFlag);
    });

    it('USA should appear before Canada in COUNTRY_CODES', () => {
      const usIndex = COUNTRY_CODES.findIndex((c) => c.label === 'United States (+1)');
      const caIndex = COUNTRY_CODES.findIndex((c) => c.label === 'Canada (+1)');
      expect(usIndex).toBeLessThan(caIndex);
      expect(usIndex).toBeGreaterThan(-1);
      expect(caIndex).toBeGreaterThan(-1);
    });
  });

  // --- AC-F057-02: Selection list shows only one country selected for +1 ---
  describe('AC-F057-02: Selection list highlights by label, not code', () => {
    it('should have countryLabel state in MemberEditor', () => {
      const content = readSourceFile('app/(tabs)/settings/members.tsx');
      expect(content).toContain('countryLabel');
      expect(content).toContain('setCountryLabel');
    });

    it('should compare by item.label === countryLabel for highlight', () => {
      const content = readSourceFile('app/(tabs)/settings/members.tsx');
      expect(content).toContain('item.label === countryLabel');
    });

    it('should NOT compare by item.code === countryCode for highlight', () => {
      const content = readSourceFile('app/(tabs)/settings/members.tsx');
      // The highlight condition should not use code comparison
      const flatListSection = content.substring(
        content.indexOf('data={COUNTRY_CODES}'),
        content.indexOf('</FlatList>')
      );
      expect(flatListSection).not.toContain('item.code === countryCode');
    });
  });

  // --- AC-F057-03: Selecting Canada works correctly ---
  describe('AC-F057-03: Selecting Canada works correctly', () => {
    it('should update both countryCode and countryLabel on selection', () => {
      const content = readSourceFile('app/(tabs)/settings/members.tsx');
      expect(content).toContain('setCountryCode(item.code)');
      expect(content).toContain('setCountryLabel(item.label)');
    });

    it('Canada should still exist in COUNTRY_CODES', () => {
      const canada = COUNTRY_CODES.find((c) => c.label === 'Canada (+1)');
      expect(canada).toBeDefined();
      expect(canada!.code).toBe('+1');
    });
  });

  // --- AC-F057-04: Other duplicate codes not negatively affected ---
  describe('AC-F057-04: Other duplicate codes not affected', () => {
    it('Kazakhstan and Russia should both exist with code +7', () => {
      const kz = COUNTRY_CODES.find((c) => c.label === 'Kazakhstan (+7)');
      const ru = COUNTRY_CODES.find((c) => c.label === 'Russia (+7)');
      expect(kz).toBeDefined();
      expect(ru).toBeDefined();
      expect(kz!.code).toBe('+7');
      expect(ru!.code).toBe('+7');
    });

    it('getCountryByLabel should distinguish Kazakhstan and Russia', () => {
      const kz = getCountryByLabel('Kazakhstan (+7)');
      const ru = getCountryByLabel('Russia (+7)');
      expect(kz).toBeDefined();
      expect(ru).toBeDefined();
      expect(kz!.flag).not.toBe(ru!.flag);
    });
  });

  // --- EC-F057-01: Legacy members with +1 ---
  describe('EC-F057-01: Legacy members with +1', () => {
    it('countryLabel should initialize from member.country_code', () => {
      const content = readSourceFile('app/(tabs)/settings/members.tsx');
      // Verify initialization uses COUNTRY_CODES.find
      expect(content).toContain("COUNTRY_CODES.find((c) => c.code === (member?.country_code");
    });
  });

  // --- EC-F057-02: splitPhoneNumber with +1 ---
  describe('EC-F057-02: splitPhoneNumber not affected by reorder', () => {
    it('splitPhoneNumber should still work with +1', () => {
      const result = splitPhoneNumber('+12125551234');
      expect(result.countryCode).toBe('+1');
      expect(result.phone).toBe('2125551234');
    });

    it('splitPhoneNumber should still work with +7', () => {
      const result = splitPhoneNumber('+74951234567');
      expect(result.countryCode).toBe('+7');
      expect(result.phone).toBe('4951234567');
    });

    it('splitPhoneNumber should still work with +55', () => {
      const result = splitPhoneNumber('+5511987654321');
      expect(result.countryCode).toBe('+55');
      expect(result.phone).toBe('11987654321');
    });
  });

  // --- getCountryByLabel function ---
  describe('getCountryByLabel utility function', () => {
    it('should return USA entry for "United States (+1)"', () => {
      const result = getCountryByLabel('United States (+1)');
      expect(result).toBeDefined();
      expect(result!.code).toBe('+1');
      expect(result!.flag).toBe('\u{1F1FA}\u{1F1F8}');
    });

    it('should return Canada entry for "Canada (+1)"', () => {
      const result = getCountryByLabel('Canada (+1)');
      expect(result).toBeDefined();
      expect(result!.code).toBe('+1');
      expect(result!.flag).toBe('\u{1F1E8}\u{1F1E6}');
    });

    it('should return undefined for non-existent label', () => {
      const result = getCountryByLabel('Atlantis (+999)');
      expect(result).toBeUndefined();
    });
  });
});

// =============================================================================
// F058 (CR-122): Change '3o Discurso' to 'Ultimo Discurso' label
// =============================================================================

describe('F058 (CR-122): Change 3rd speech label to Ultimo Discurso', () => {
  // --- AC-F058-01: 3rd speech label in Speeches tab shows 'Ultimo Discurso' (pt-BR) ---
  describe('AC-F058-01: 3rd speech label in SpeechSlot (pt-BR)', () => {
    // F118 (CR-181): getPositionLabel now HAS special case for position 3 (returns lastSpeech)
    it('SpeechSlot getPositionLabel has position 3 special case for lastSpeech (F118/CR-181)', () => {
      const content = readSourceFile('components/SpeechSlot.tsx');
      expect(content).toContain("t('speeches.slot'");
      expect(content).toContain('position === 3');
      expect(content).toContain("t('speeches.lastSpeech')");
    });

    it('pt-BR locale should have speeches.lastSpeech = "Último Discurso"', () => {
      const locale = readLocale('pt-BR') as { speeches: { lastSpeech: string } };
      expect(locale.speeches.lastSpeech).toBe('Último Discurso');
    });
  });

  // --- AC-F058-02: Label translated in English ---
  describe('AC-F058-02: Label translated in English', () => {
    it('en locale should have speeches.lastSpeech = "Final Speech"', () => {
      const locale = readLocale('en') as { speeches: { lastSpeech: string } };
      expect(locale.speeches.lastSpeech).toBe('Final Speech');
    });
  });

  // --- AC-F058-03: Label translated in Spanish ---
  describe('AC-F058-03: Label translated in Spanish', () => {
    it('es locale should have speeches.lastSpeech = "Último Discurso"', () => {
      const locale = readLocale('es') as { speeches: { lastSpeech: string } };
      expect(locale.speeches.lastSpeech).toBe('Último Discurso');
    });
  });

  // --- AC-F058-04: AgendaForm uses 'Ultimo Discurso' for position 3 ---
  describe('AC-F058-04: AgendaForm 3rd speaker label', () => {
    it('should use t("speeches.lastSpeech") for 3rd speaker label', () => {
      const content = readSourceFile('components/AgendaForm.tsx');
      expect(content).toContain("t('speeches.lastSpeech')");
    });

    it('should NOT use "3\\u00BA" ordinal for 3rd speaker label', () => {
      const content = readSourceFile('components/AgendaForm.tsx');
      // Find the SpeakerField for position 3 (getSpeech(3))
      const speech3Idx = content.indexOf('getSpeech(3)');
      const labelBefore = content.lastIndexOf('label=', speech3Idx);
      const labelEnd = content.indexOf('\n', labelBefore);
      const labelLine = content.substring(labelBefore, labelEnd);
      expect(labelLine).not.toContain('3\u00BA');
      expect(labelLine).toContain('lastSpeech');
    });

    it('AgendaForm section header should use t("agenda.sectionLastSpeech")', () => {
      const content = readSourceFile('components/AgendaForm.tsx');
      expect(content).toContain("t('agenda.sectionLastSpeech')");
    });
  });

  // --- AC-F058-05: InviteManagement uses 'Ultimo Discurso' for position 3 ---
  describe('AC-F058-05: InviteManagement position 3 label', () => {
    it('should use t("speeches.lastSpeech") for speech.position === 3', () => {
      const content = readSourceFile('components/InviteManagementSection.tsx');
      expect(content).toContain("t('speeches.lastSpeech')");
      expect(content).toContain('speech.position === 3');
    });

    it('should use conditional: position 3 uses lastSpeech, others use ordinal', () => {
      const content = readSourceFile('components/InviteManagementSection.tsx');
      // CR-221: now chained ternary includes prayer positions (0, 4) before position 3 check
      expect(content).toContain("speech.position === 3");
      expect(content).toContain("t('speeches.lastSpeech')");
      expect(content).toContain("t('speeches.slot'");
    });
  });

  // --- AC-F058-06: 1st and 2nd speech labels not affected ---
  describe('AC-F058-06: 1st and 2nd speech labels unchanged', () => {
    it('SpeechSlot should use ordinal format for positions other than 3', () => {
      const content = readSourceFile('components/SpeechSlot.tsx');
      // getPositionLabel should still use ordinal for non-3 positions
      expect(content).toContain("t('speeches.slot', { number:");
    });

    it('AgendaForm should use ordinal for 1st and 2nd speakers', () => {
      const content = readSourceFile('components/AgendaForm.tsx');
      // Source uses literal \\u00BA escape sequence
      expect(content).toContain("1\\u00BA ${t('speeches.speaker')}");
      expect(content).toContain("2\\u00BA ${t('speeches.speaker')}");
    });
  });

  // --- EC-F058-01: Presentation Mode ---
  describe('EC-F058-01: Presentation Mode uses lastSpeech', () => {
    it('usePresentationMode should use t("speeches.lastSpeech") for 3rd speaker label', () => {
      const content = readSourceFile('hooks/usePresentationMode.ts');
      expect(content).toContain("t('speeches.lastSpeech')");
    });

    it('usePresentationMode should use ordinal for 1st and 2nd speakers', () => {
      const content = readSourceFile('hooks/usePresentationMode.ts');
      // Source uses literal \\u00BA escape sequence
      expect(content).toContain("1\\u00BA ${t('speeches.speaker')}");
      expect(content).toContain("2\\u00BA ${t('speeches.speaker')}");
    });

    it('usePresentationMode 3rd speaker label should NOT use ordinal', () => {
      const content = readSourceFile('hooks/usePresentationMode.ts');
      // Find the last speech card section
      const lastSpeechIdx = content.indexOf("t('speeches.lastSpeech')");
      expect(lastSpeechIdx).toBeGreaterThan(-1);
      // Verify it's not using 3º ordinal
      const nearbyContent = content.substring(Math.max(0, lastSpeechIdx - 50), lastSpeechIdx + 80);
      expect(nearbyContent).not.toContain('3\u00BA');
    });
  });
});

// =============================================================================
// F059 (CR-125): Fix closing prayer field visual duplication
// =============================================================================

describe('F059 (CR-125): Fix closing prayer field visual duplication', () => {
  const getPrayerSelector = () => readSourceFile('components/PrayerSelector.tsx');
  const getAgendaForm = () => readSourceFile('components/AgendaForm.tsx');

  // --- AC-F059-01: Clicking closing prayer does not duplicate ---
  describe('AC-F059-01: No field duplication with modalOnly', () => {
    it('AgendaForm should pass modalOnly={true} to PrayerSelector', () => {
      const content = getAgendaForm();
      expect(content).toContain('modalOnly={true}');
    });

    it('PrayerSelector with modalOnly should be rendered in prayer selectorModal section', () => {
      const content = getAgendaForm();
      // Find the prayer selector modal section (self-closing PrayerSelector tag)
      const prayerSection = content.indexOf("selectorModal?.type === 'prayer'");
      expect(prayerSection).toBeGreaterThan(-1);
      // Find the closing of the PrayerSelector tag (self-closing />)
      const prayerEnd = content.indexOf('/>', prayerSection + 100);
      const prayerBlock = content.substring(prayerSection, prayerEnd);
      expect(prayerBlock).toContain('modalOnly={true}');
      expect(prayerBlock).toContain('visible={true}');
    });
  });

  // --- AC-F059-02: Only ONE selection modal shown ---
  describe('AC-F059-02: Only one modal shown', () => {
    it('PrayerSelector should conditionally hide inline Pressable with modalOnly', () => {
      const content = getPrayerSelector();
      expect(content).toContain('!modalOnly');
    });
  });

  // --- AC-F059-03: Opening prayer also does not duplicate ---
  describe('AC-F059-03: Opening prayer also uses same pattern', () => {
    it('AgendaForm renders both opening and closing prayer through same selectorModal pattern', () => {
      const content = getAgendaForm();
      // Both opening_prayer and closing_prayer use the same selectorModal type 'prayer'
      expect(content).toContain("type: 'prayer', field: 'opening_prayer'");
      expect(content).toContain("type: 'prayer', field: 'closing_prayer'");
    });
  });

  // --- AC-F059-04: Member selection works with modalOnly ---
  describe('AC-F059-04: Member selection works with modalOnly', () => {
    it('PrayerSelector should have handleSelectMember callback', () => {
      const content = getPrayerSelector();
      expect(content).toContain('handleSelectMember');
    });

    it('Modal should still render member FlatList', () => {
      const content = getPrayerSelector();
      // Modal should contain FlatList for members
      const modalSection = content.substring(
        content.indexOf('<Modal'),
        content.indexOf('</Modal>')
      );
      expect(modalSection).toContain('FlatList');
      expect(modalSection).toContain('data={members}');
    });
  });

  // --- AC-F059-05: Custom name works with modalOnly ---
  describe('AC-F059-05: Custom name works with modalOnly', () => {
    it('PrayerSelector should have handleCustomName callback', () => {
      const content = getPrayerSelector();
      expect(content).toContain('handleCustomName');
    });

    it('Modal should have custom name option', () => {
      const content = getPrayerSelector();
      expect(content).toContain('customNameButton');
      expect(content).toContain('customName');
    });
  });

  // --- AC-F059-06: PrayerSelector works normally without modalOnly ---
  describe('AC-F059-06: PrayerSelector standalone (default) mode', () => {
    it('modalOnly should default to false', () => {
      const content = getPrayerSelector();
      expect(content).toContain('modalOnly = false');
    });

    it('inline Pressable should render when modalOnly is false/not set', () => {
      const content = getPrayerSelector();
      // When modalOnly is false, the Pressable is rendered
      expect(content).toContain('{!modalOnly && (');
      // Pressable should exist inside the component
      expect(content).toContain('<Pressable');
    });

    it('PrayerSelectorProps should include modalOnly as optional boolean', () => {
      const content = getPrayerSelector();
      expect(content).toContain('modalOnly?: boolean');
    });
  });

  // --- EC-F059-01: Quick open/close ---
  describe('EC-F059-01: Quick modal open/close state management', () => {
    it('PrayerSelector should reset search and customName on close', () => {
      const content = getPrayerSelector();
      // In the cancel/close handler
      const closeHandler = content.indexOf("onClose?.()");
      expect(closeHandler).toBeGreaterThan(-1);
      expect(content).toContain("setSearch('')");
      expect(content).toContain("setCustomName('')");
    });
  });

  // --- EC-F059-02: Switch between opening and closing prayer ---
  describe('EC-F059-02: Switch between prayer fields', () => {
    it('AgendaForm should have selectorModal state with field info', () => {
      const content = getAgendaForm();
      expect(content).toContain('selectorModal');
      expect(content).toContain('setSelectorModal');
    });

    it('PrayerSelector placeholder should reflect which prayer field is active', () => {
      const content = getAgendaForm();
      expect(content).toContain("selectorModal.field === 'opening_prayer'");
      expect(content).toContain("t('agenda.openingPrayer')");
      expect(content).toContain("t('agenda.closingPrayer')");
    });
  });
});

// =============================================================================
// Cross-feature: i18n key consistency
// =============================================================================

describe('Cross-feature: i18n key consistency', () => {
  it('all 3 locales should have matching speeches keys', () => {
    const ptBR = readLocale('pt-BR') as { speeches: Record<string, string> };
    const en = readLocale('en') as { speeches: Record<string, string> };
    const es = readLocale('es') as { speeches: Record<string, string> };

    // Verify lastSpeech exists in all locales
    expect(ptBR.speeches.lastSpeech).toBeDefined();
    expect(en.speeches.lastSpeech).toBeDefined();
    expect(es.speeches.lastSpeech).toBeDefined();

    // Verify changeStatus exists in all locales
    expect(ptBR.speeches.changeStatus).toBeDefined();
    expect(en.speeches.changeStatus).toBeDefined();
    expect(es.speeches.changeStatus).toBeDefined();

    // Verify slot key still exists
    expect(ptBR.speeches.slot).toBeDefined();
    expect(en.speeches.slot).toBeDefined();
    expect(es.speeches.slot).toBeDefined();
  });

  it('all locale files should be valid JSON', () => {
    // These would throw if invalid
    const ptBR = readLocale('pt-BR');
    const en = readLocale('en');
    const es = readLocale('es');
    expect(ptBR).toBeDefined();
    expect(en).toBeDefined();
    expect(es).toBeDefined();
  });
});
