/**
 * Batch 24 Phase 1 - Tests for F152, F153, F154 (CR-216, CR-217, CR-219).
 *
 * CR-216 (F152): WhatsApp no-phone dialog with mark-as-invited option
 * CR-217 (F153): Play button circle outline and spacing in Agenda cards
 * CR-219 (F154): Uniform collapsed card height for all types (supersedes F151)
 *
 * Testing strategy: Source code analysis (fs.readFileSync) following project conventions.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// --- Helpers ---

const ROOT = path.resolve(__dirname, '..', '..');

function readSrcFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(ROOT, 'src', relativePath), 'utf-8');
}

// --- Source files ---
const inviteMgmtSource = readSrcFile('components/InviteManagementSection.tsx');
const agendaSource = readSrcFile('app/(tabs)/agenda.tsx');
const sundayCardSource = readSrcFile('components/SundayCard.tsx');
const iconsSource = readSrcFile('components/icons/index.tsx');

// --- i18n locale files ---
const ptBR = JSON.parse(readSrcFile('i18n/locales/pt-BR.json'));
const en = JSON.parse(readSrcFile('i18n/locales/en.json'));
const es = JSON.parse(readSrcFile('i18n/locales/es.json'));

// ============================================================================
// F152 (CR-216): WhatsApp no-phone dialog with mark-as-invited option
// ============================================================================

describe('F152 (CR-216): WhatsApp no-phone dialog', () => {

  // --- AC-152-01: Speaker WITH phone: WhatsApp opens and status changes ---

  describe('AC-152-01: Speaker WITH phone opens WhatsApp + marks invited', () => {
    it('handleNotInvitedAction checks speech.speaker_phone before opening WhatsApp', () => {
      expect(inviteMgmtSource).toContain('if (speech.speaker_phone)');
    });

    it('openWhatsApp is called inside the if(speaker_phone) block', () => {
      // CR-221: The if(speaker_phone) block now contains a nested if/else for prayer positions.
      // openWhatsApp is called after the prayer/speech URL selection, still inside speaker_phone block.
      const fnStart = inviteMgmtSource.indexOf('const handleNotInvitedAction = useCallback(');
      const fnBody = inviteMgmtSource.substring(fnStart, inviteMgmtSource.indexOf('[changeStatus', fnStart));
      expect(fnBody).toContain('await openWhatsApp(url)');
    });

    it('changeStatus.mutate is called inside the if(speaker_phone) block', () => {
      // CR-221: changeStatus.mutate with 'assigned_invited' is still inside speaker_phone block
      const fnStart = inviteMgmtSource.indexOf('const handleNotInvitedAction = useCallback(');
      const fnBody = inviteMgmtSource.substring(fnStart, inviteMgmtSource.indexOf('[changeStatus', fnStart));
      expect(fnBody).toContain("changeStatus.mutate(");
      expect(fnBody).toContain("status: 'assigned_invited'");
    });
  });

  // --- AC-152-02: Speaker WITHOUT phone: dialog appears ---

  describe('AC-152-02: Speaker WITHOUT phone shows Alert.alert dialog', () => {
    it('else block calls Alert.alert', () => {
      const elseBlock = inviteMgmtSource.substring(
        inviteMgmtSource.indexOf('} else {', inviteMgmtSource.indexOf('if (speech.speaker_phone)')),
        inviteMgmtSource.indexOf(');', inviteMgmtSource.indexOf('Alert.alert('))
      );
      expect(elseBlock).toContain('Alert.alert(');
    });

    it('Alert.alert receives title from t("invite.noPhoneTitle")', () => {
      expect(inviteMgmtSource).toContain("t('invite.noPhoneTitle')");
    });

    it('Alert.alert receives message from t("invite.noPhoneMessage")', () => {
      expect(inviteMgmtSource).toContain("t('invite.noPhoneMessage')");
    });

    it('Alert.alert has two buttons array', () => {
      // The Alert.alert call should have an array with 2 button objects
      const alertCall = inviteMgmtSource.substring(
        inviteMgmtSource.indexOf('Alert.alert('),
        inviteMgmtSource.indexOf(');', inviteMgmtSource.indexOf('Alert.alert(')) + 2
      );
      expect(alertCall).toContain("t('common.cancel')");
      expect(alertCall).toContain("t('invite.markAsInvited')");
    });
  });

  // --- AC-152-03: Dialog cancel button does nothing ---

  describe('AC-152-03: Cancel button does not change status', () => {
    it('cancel button has style: "cancel"', () => {
      const alertCall = inviteMgmtSource.substring(
        inviteMgmtSource.indexOf('Alert.alert('),
        inviteMgmtSource.indexOf(');', inviteMgmtSource.indexOf('Alert.alert(')) + 2
      );
      expect(alertCall).toContain("style: 'cancel'");
    });

    it('cancel button does not have onPress calling changeStatus.mutate', () => {
      // The cancel button object ({ text: t('common.cancel'), style: 'cancel' })
      // should NOT have an onPress that calls changeStatus.mutate
      const cancelButton = inviteMgmtSource.substring(
        inviteMgmtSource.indexOf("t('common.cancel')"),
        inviteMgmtSource.indexOf('},', inviteMgmtSource.indexOf("t('common.cancel')"))
      );
      expect(cancelButton).not.toContain('changeStatus.mutate');
    });
  });

  // --- AC-152-04: Dialog confirm button marks as invited ---

  describe('AC-152-04: Confirm button calls changeStatus.mutate', () => {
    it('confirm button has onPress that calls changeStatus.mutate', () => {
      const confirmButton = inviteMgmtSource.substring(
        inviteMgmtSource.indexOf("t('invite.markAsInvited')"),
        inviteMgmtSource.indexOf('},', inviteMgmtSource.indexOf("t('invite.markAsInvited')")) + 2
      );
      expect(confirmButton).toContain('onPress');
    });

    it('confirm button mutates to assigned_invited status', () => {
      const alertCall = inviteMgmtSource.substring(
        inviteMgmtSource.indexOf('Alert.alert('),
        inviteMgmtSource.indexOf(');', inviteMgmtSource.indexOf('Alert.alert(')) + 2
      );
      // The confirm button's onPress calls changeStatus.mutate with assigned_invited
      expect(alertCall).toContain("status: 'assigned_invited'");
    });

    it('confirm button mutates with speech.id', () => {
      const alertCall = inviteMgmtSource.substring(
        inviteMgmtSource.indexOf('Alert.alert('),
        inviteMgmtSource.indexOf(');', inviteMgmtSource.indexOf('Alert.alert(')) + 2
      );
      expect(alertCall).toContain('speechId: speech.id');
    });
  });

  // --- AC-152-05: i18n pt-BR dialog text ---

  describe('AC-152-05: i18n pt-BR dialog text', () => {
    it('invite.noPhoneTitle = "Sem numero cadastrado"', () => {
      expect(ptBR.invite.noPhoneTitle).toContain('Sem n');
      expect(ptBR.invite.noPhoneTitle).toContain('mero cadastrado');
    });

    it('invite.noPhoneMessage contains "discursante" and "telefone"', () => {
      expect(ptBR.invite.noPhoneMessage).toContain('discursante');
      expect(ptBR.invite.noPhoneMessage).toContain('telefone');
    });

    it('invite.markAsInvited = "Marcar como convidado"', () => {
      expect(ptBR.invite.markAsInvited).toBe('Marcar como convidado');
    });
  });

  // --- AC-152-06: i18n en dialog text ---

  describe('AC-152-06: i18n en dialog text', () => {
    it('invite.noPhoneTitle = "No phone number"', () => {
      expect(en.invite.noPhoneTitle).toBe('No phone number');
    });

    it('invite.noPhoneMessage contains "no registered phone number"', () => {
      expect(en.invite.noPhoneMessage).toContain('no registered phone number');
    });

    it('invite.markAsInvited = "Mark as invited"', () => {
      expect(en.invite.markAsInvited).toBe('Mark as invited');
    });
  });

  // --- AC-152-07: i18n es dialog text ---

  describe('AC-152-07: i18n es dialog text', () => {
    it('invite.noPhoneTitle contains "Sin" and "registrado"', () => {
      expect(es.invite.noPhoneTitle).toContain('Sin');
      expect(es.invite.noPhoneTitle).toContain('registrado');
    });

    it('invite.noPhoneMessage contains "orador" and "invitado"', () => {
      expect(es.invite.noPhoneMessage).toContain('orador');
      expect(es.invite.noPhoneMessage).toContain('invitado');
    });

    it('invite.markAsInvited = "Marcar como invitado"', () => {
      expect(es.invite.markAsInvited).toBe('Marcar como invitado');
    });
  });

  // --- AC-152-08: No silent status change when no phone ---

  describe('AC-152-08: No silent status change when no phone', () => {
    it('changeStatus.mutate is NOT called outside if/else blocks', () => {
      // Extract the handleNotInvitedAction function body
      const fnStart = inviteMgmtSource.indexOf('const handleNotInvitedAction = useCallback(');
      const fnEnd = inviteMgmtSource.indexOf(');', inviteMgmtSource.indexOf(']', inviteMgmtSource.indexOf('[changeStatus')));
      const fnBody = inviteMgmtSource.substring(fnStart, fnEnd);

      // Count occurrences of changeStatus.mutate - should be exactly 2
      // (once in the if block for WhatsApp, once in the else block for dialog confirm)
      const mutateCount = (fnBody.match(/changeStatus\.mutate\(/g) || []).length;
      expect(mutateCount).toBe(2);
    });

    it('changeStatus.mutate calls are both inside conditional blocks', () => {
      // CR-221: handleNotInvitedAction now has nested if/else for prayer/speech URL selection.
      // The full function body should contain 2 changeStatus.mutate calls (one in phone block, one in no-phone Alert)
      const fnStart = inviteMgmtSource.indexOf('const handleNotInvitedAction = useCallback(');
      const fnEnd = inviteMgmtSource.indexOf('[changeStatus', fnStart);
      const fnBody = inviteMgmtSource.substring(fnStart, fnEnd);
      const mutateCount = (fnBody.match(/changeStatus\.mutate\(/g) || []).length;
      expect(mutateCount).toBe(2);
    });
  });

  // --- EC-152-01: Empty string instead of null ---

  describe('EC-152-01: Speaker phone empty string treated as falsy', () => {
    it('uses if(speech.speaker_phone) which is falsy for empty string', () => {
      // The condition is if (speech.speaker_phone) not if (speech.speaker_phone !== null)
      expect(inviteMgmtSource).toContain('if (speech.speaker_phone)');
      // Should NOT use strict null check
      const fnBody = inviteMgmtSource.substring(
        inviteMgmtSource.indexOf('const handleNotInvitedAction'),
        inviteMgmtSource.indexOf('[changeStatus')
      );
      expect(fnBody).not.toContain('speaker_phone !== null');
      expect(fnBody).not.toContain('speaker_phone != null');
    });
  });

  // --- EC-152-02: Android back button dismisses dialog ---

  describe('EC-152-02: Alert.alert is modal (default dismiss = cancel)', () => {
    it('cancel button uses style: "cancel" (native platform dismiss behavior)', () => {
      const alertCall = inviteMgmtSource.substring(
        inviteMgmtSource.indexOf('Alert.alert('),
        inviteMgmtSource.indexOf(');', inviteMgmtSource.indexOf('Alert.alert(')) + 2
      );
      expect(alertCall).toContain("style: 'cancel'");
    });
  });

  // --- EC-152-03: Multiple rapid taps blocked by modal dialog ---

  describe('EC-152-03: Alert.alert is modal and blocks further interaction', () => {
    it('uses Alert.alert which is a native modal dialog', () => {
      expect(inviteMgmtSource).toContain('Alert.alert(');
    });

    it('Alert is imported from react-native', () => {
      expect(inviteMgmtSource).toMatch(/import\s*\{[^}]*Alert[^}]*\}\s*from\s*'react-native'/);
    });
  });

  // --- Additional structural tests ---

  describe('Structural: handleNotInvitedAction dependencies', () => {
    it('useCallback dependency array includes t', () => {
      // CR-221: deps changed from ward?.whatsapp_template to ward (full object)
      expect(inviteMgmtSource).toContain('[changeStatus, locale, ward, t]');
    });

    it('Alert is imported from react-native', () => {
      const importLine = inviteMgmtSource.match(/import\s*\{[^}]*\}\s*from\s*'react-native'/);
      expect(importLine).toBeTruthy();
      expect(importLine![0]).toContain('Alert');
    });
  });

  // --- i18n: all 3 locales have all 3 keys ---

  describe('All locales have invite keys', () => {
    it.each(['pt-BR', 'en', 'es'])('%s has invite.noPhoneTitle', (locale) => {
      const data = { 'pt-BR': ptBR, en, es }[locale]!;
      expect(data.invite.noPhoneTitle).toBeTruthy();
    });

    it.each(['pt-BR', 'en', 'es'])('%s has invite.noPhoneMessage', (locale) => {
      const data = { 'pt-BR': ptBR, en, es }[locale]!;
      expect(data.invite.noPhoneMessage).toBeTruthy();
    });

    it.each(['pt-BR', 'en', 'es'])('%s has invite.markAsInvited', (locale) => {
      const data = { 'pt-BR': ptBR, en, es }[locale]!;
      expect(data.invite.markAsInvited).toBeTruthy();
    });
  });
});

// ============================================================================
// F153 (CR-217): Play button circle outline and spacing in Agenda cards
// ============================================================================

describe('F153 (CR-217): Play button circle outline and spacing', () => {

  // --- AC-153-01: Play icon has circle-play SVG pattern ---
  // [SUPERSEDED by CR-235]: Circular border container removed from Pressable.
  // The circle is now part of the PlayIcon SVG itself (circle-play pattern).

  describe('AC-153-01: Play icon has circle in SVG (circle-play pattern)', () => {
    it('PlayIcon SVG has Circle element for the circular outline', () => {
      const playIconBlock = iconsSource.substring(
        iconsSource.indexOf('export const PlayIcon'),
        iconsSource.indexOf('export const PencilIcon')
      );
      // CR-235: PlayIcon uses Circle element instead of container border
      expect(playIconBlock).toContain('Circle');
    });

    it('PlayIcon Circle has r={10} for the circular outline', () => {
      const playIconBlock = iconsSource.substring(
        iconsSource.indexOf('export const PlayIcon'),
        iconsSource.indexOf('export const PencilIcon')
      );
      expect(playIconBlock).toContain('r={10}');
    });

    it('Pressable uses style={styles.playButton} (no inline circle styles)', () => {
      // CR-235: Removed inline circle styles, simplified to just styles.playButton
      expect(agendaSource).toContain('style={styles.playButton}');
    });

    it('Pressable does NOT have inline borderRadius styles', () => {
      // CR-235: No more inline border styles on the Pressable container
      const playButtonRef = agendaSource.indexOf('style={styles.playButton}');
      const surroundingBlock = agendaSource.substring(
        Math.max(0, playButtonRef - 100),
        playButtonRef + 100
      );
      expect(surroundingBlock).not.toContain('borderRadius');
      expect(surroundingBlock).not.toContain('borderWidth');
    });

    it('PlayIcon uses size={24} (enlarged from 18)', () => {
      // CR-235: PlayIcon size changed from 18 to 24
      expect(agendaSource).toContain('<PlayIcon size={24}');
    });
  });

  // --- AC-153-02: Play icon remains outlined (stroke only) ---

  describe('AC-153-02: PlayIcon is stroke-only (no fill)', () => {
    it('PlayIcon SVG has fill="none"', () => {
      const playIconBlock = iconsSource.substring(
        iconsSource.indexOf('export const PlayIcon'),
        iconsSource.indexOf(');', iconsSource.indexOf('export const PlayIcon')) + 2
      );
      expect(playIconBlock).toContain('fill="none"');
    });

    it('PlayIcon Path uses stroke rendering', () => {
      const playIconBlock = iconsSource.substring(
        iconsSource.indexOf('export const PlayIcon'),
        iconsSource.indexOf(');', iconsSource.indexOf('export const PlayIcon')) + 2
      );
      expect(playIconBlock).toContain('stroke={color}');
    });
  });

  // --- AC-153-03: Play button has increased distance from chevron ---

  describe('AC-153-03: Play button marginRight is 16', () => {
    it('playButton style has marginRight: 16', () => {
      const playButtonStyle = agendaSource.match(/playButton:\s*\{[^}]*\}/s);
      expect(playButtonStyle).toBeTruthy();
      expect(playButtonStyle![0]).toContain('marginRight: 16');
    });

    it('playButton marginRight is NOT 8 (old value)', () => {
      const playButtonStyle = agendaSource.match(/playButton:\s*\{[^}]*\}/s);
      expect(playButtonStyle).toBeTruthy();
      expect(playButtonStyle![0]).not.toContain('marginRight: 8');
    });
  });

  // --- AC-153-04: PlayIcon uses theme-appropriate color ---

  describe('AC-153-04: PlayIcon uses colors.textSecondary (theme-aware)', () => {
    it('PlayIcon color is colors.textSecondary', () => {
      // CR-235: PlayIcon size changed from 18 to 24
      expect(agendaSource).toContain('<PlayIcon size={24} color={colors.textSecondary} />');
    });

    it('no hardcoded color in PlayIcon rendering', () => {
      const playIconLine = agendaSource.match(/<PlayIcon[^>]*>/);
      expect(playIconLine).toBeTruthy();
      expect(playIconLine![0]).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    });
  });

  // --- AC-153-05: PlayIcon circle is part of SVG, not container ---
  // [SUPERSEDED by CR-235]: Container centering styles removed; PlayIcon SVG
  // handles its own circle rendering internally.

  describe('AC-153-05: PlayIcon SVG handles circle internally', () => {
    it('PlayIcon SVG has Circle with cx={12} cy={12} for centering', () => {
      const playIconBlock = iconsSource.substring(
        iconsSource.indexOf('export const PlayIcon'),
        iconsSource.indexOf('export const PencilIcon')
      );
      expect(playIconBlock).toContain('cx={12}');
      expect(playIconBlock).toContain('cy={12}');
    });

    it('PlayIcon SVG has play triangle Path inside circle', () => {
      const playIconBlock = iconsSource.substring(
        iconsSource.indexOf('export const PlayIcon'),
        iconsSource.indexOf('export const PencilIcon')
      );
      expect(playIconBlock).toContain('d="m10 8 6 4-6 4V8z"');
    });
  });

  // --- AC-153-06: Tap target includes circle ---

  describe('AC-153-06: Play button tap target includes the circle', () => {
    it('Pressable wraps the PlayIcon with hitSlop={8}', () => {
      expect(agendaSource).toContain('hitSlop={8}');
    });

    it('Pressable onPress navigates to presentation mode', () => {
      const pressableBlock = agendaSource.substring(
        agendaSource.indexOf('styles.playButton') - 200,
        agendaSource.indexOf('styles.playButton')
      );
      expect(pressableBlock).toContain("pathname: '/presentation'");
    });
  });

  // --- AC-153-07: Collapsed cards do not show play button ---

  describe('AC-153-07: Collapsed cards do not render play button', () => {
    it('play button is guarded by expandable && isExpanded', () => {
      expect(agendaSource).toContain('{expandable && isExpanded && (');
    });

    it('play button Pressable is inside the expandable && isExpanded guard', () => {
      const guardIndex = agendaSource.indexOf('{expandable && isExpanded && (');
      const nextPressable = agendaSource.indexOf('<Pressable', guardIndex);
      const closingIndex = agendaSource.indexOf('</Pressable>', nextPressable);
      const guardedBlock = agendaSource.substring(guardIndex, closingIndex + 12);
      expect(guardedBlock).toContain('styles.playButton');
      expect(guardedBlock).toContain('PlayIcon');
    });
  });

  // --- EC-153-01: Card transitions ---

  describe('EC-153-01: Play button appears on card expansion', () => {
    it('isExpanded controls play button visibility (conditional rendering)', () => {
      expect(agendaSource).toContain('expandable && isExpanded');
    });
  });

  // --- EC-153-02: Non-expandable cards ---

  describe('EC-153-02: Non-expandable cards never show play button', () => {
    it('expandable guard prevents rendering on non-expandable cards', () => {
      // The guard checks expandable first, so non-expandable cards never reach isExpanded
      const match = agendaSource.match(/\{expandable && isExpanded && \(/);
      expect(match).toBeTruthy();
    });
  });
});

// ============================================================================
// F154 (CR-219): Uniform collapsed card height for all types
//                (supersedes F151)
// ============================================================================

describe('F154 (CR-219): Uniform collapsed card height for all types', () => {

  // --- AC-154-01: Collapsed speech card (3 positions) height ---

  describe('AC-154-01: Collapsed speech card has minHeight: 62', () => {
    it('[SUPERSEDED] headerCenter uses justifyContent center instead of minHeight', () => {
      // F154 final implementation (d5fbdb0) removed minHeight: 62 and replaced
      // with justifyContent: 'center' in headerCenter style for vertical centering.
      const headerCenterStyle = sundayCardSource.match(/headerCenter:\s*\{[^}]*\}/s);
      expect(headerCenterStyle).toBeTruthy();
      expect(headerCenterStyle![0]).toContain("justifyContent: 'center'");
    });
  });

  // --- AC-154-02: Collapsed speech card (2 positions) same height ---

  describe('AC-154-02: 2-position cards have same minHeight as 3-position', () => {
    it('[SUPERSEDED] no minHeight used; justifyContent center handles alignment', () => {
      // F154 final implementation uses justifyContent: 'center' for uniform
      // vertical alignment regardless of position count.
      expect(sundayCardSource).not.toContain('minHeight: 62');
      const headerCenterStyle = sundayCardSource.match(/headerCenter:\s*\{[^}]*\}/s);
      expect(headerCenterStyle).toBeTruthy();
      expect(headerCenterStyle![0]).toContain("justifyContent: 'center'");
    });
  });

  // --- AC-154-03: Collapsed exception card has same height ---

  describe('AC-154-03: Collapsed exception card has minHeight: 62', () => {
    it('[SUPERSEDED] no minHeight; justifyContent center applies to all cards', () => {
      // F154 final implementation removed minHeight entirely.
      expect(sundayCardSource).not.toContain('minHeight: 62');
    });

    it('[SUPERSEDED] headerCenter style uses justifyContent center', () => {
      const headerCenterStyle = sundayCardSource.match(/headerCenter:\s*\{[^}]*\}/s);
      expect(headerCenterStyle).toBeTruthy();
      expect(headerCenterStyle![0]).toContain("justifyContent: 'center'");
    });
  });

  // --- AC-154-04: All collapsed cards visually identical height ---

  describe('AC-154-04: Uniform height for all collapsed card types', () => {
    // Test removed: [SUPERSEDED by F158 CR-229] headerCenter now uses inline minHeight style

    it('isSpeechesType is NOT in the minHeight condition (supersedes F151)', () => {
      const headerLine = sundayCardSource.match(
        /styles\.headerCenter[^>]*/
      );
      expect(headerLine).toBeTruthy();
      expect(headerLine![0]).not.toContain('isSpeechesType');
    });
  });

  // --- AC-154-05: Expanded cards not affected ---

  describe('AC-154-05: Expanded cards have no minHeight', () => {
    it('[SUPERSEDED] no minHeight used at all; justifyContent handles layout', () => {
      // F154 final implementation removed minHeight entirely.
      // Vertical centering is done via justifyContent: 'center' on headerCenter.
      expect(sundayCardSource).not.toContain('minHeight: 62');
    });

    it('[SUPERSEDED] headerCenter has justifyContent center for all states', () => {
      const headerCenterStyle = sundayCardSource.match(/headerCenter:\s*\{[^}]*\}/s);
      expect(headerCenterStyle).toBeTruthy();
      expect(headerCenterStyle![0]).toContain("justifyContent: 'center'");
    });
  });

  // --- AC-154-06: Exception text vertically positioned ---

  describe('AC-154-06: Header row uses alignItems center', () => {
    it('header style has alignItems: center for vertical centering', () => {
      const headerStyle = sundayCardSource.match(/header:\s*\{[^}]*\}/s);
      expect(headerStyle).toBeTruthy();
      expect(headerStyle![0]).toContain("alignItems: 'center'");
    });
  });

  // --- AC-154-07: Works in both themes ---

  describe('AC-154-07: minHeight is theme-independent', () => {
    it('[SUPERSEDED] justifyContent center is not theme-dependent', () => {
      const headerCenterStyle = sundayCardSource.match(/headerCenter:\s*\{[^}]*\}/s);
      expect(headerCenterStyle).toBeTruthy();
      expect(headerCenterStyle![0]).toContain("justifyContent: 'center'");
    });
  });

  // --- EC-154-01: Non-expandable cards (always collapsed) ---

  describe('EC-154-01: Non-expandable cards always get minHeight', () => {
    it('non-expandable cards have expanded=false by default', () => {
      expect(sundayCardSource).toContain('expanded = false');
    });

    it('[SUPERSEDED] no minHeight; justifyContent center handles layout', () => {
      // F154 final implementation uses justifyContent: 'center' instead of minHeight
      expect(sundayCardSource).not.toContain('minHeight: 62');
    });
  });

  // --- EC-154-02: Card transitions from collapsed to expanded ---

  describe('EC-154-02: Card transitions remove/apply minHeight', () => {
    it('expanded is a reactive prop that re-evaluates the condition', () => {
      expect(sundayCardSource).toContain('expanded = false');
    });

    it('[SUPERSEDED] no minHeight condition; justifyContent center used instead', () => {
      // F154 final implementation removed minHeight entirely
      expect(sundayCardSource).not.toContain('minHeight: 62');
    });
  });

  // --- EC-154-03: Other exception type with long text ---

  describe('EC-154-03: Exception text truncated with numberOfLines={1}', () => {
    it('exceptionText has numberOfLines={1}', () => {
      expect(sundayCardSource).toContain('numberOfLines={1}');
    });
  });

  // --- EC-154-04: Font size accessibility scaling ---

  describe('EC-154-04: minHeight uses "min" (allows growth)', () => {
    it('[SUPERSEDED] minHeight removed; justifyContent center allows natural sizing', () => {
      // F154 final implementation removed minHeight entirely.
      // justifyContent: 'center' allows content to determine its own height.
      expect(sundayCardSource).not.toContain('minHeight: 62');
      const headerCenterStyle = sundayCardSource.match(/headerCenter:\s*\{[^}]*\}/s);
      expect(headerCenterStyle).toBeTruthy();
      expect(headerCenterStyle![0]).not.toContain('height: 62');
    });
  });

  // --- F154 supersedes F151: isSpeechesType removed from condition ---

  describe('F154 supersedes F151: isSpeechesType removed from minHeight condition', () => {
    it('[SUPERSEDED] headerCenter style uses justifyContent center (no minHeight)', () => {
      // F154 final implementation removed minHeight entirely and uses
      // justifyContent: 'center' in headerCenter stylesheet.
      const headerCenterStyle = sundayCardSource.match(/headerCenter:\s*\{[^}]*\}/s);
      expect(headerCenterStyle).toBeTruthy();
      expect(headerCenterStyle![0]).toContain("justifyContent: 'center'");
      expect(headerCenterStyle![0]).not.toContain('minHeight');
    });

    // Test removed: [SUPERSEDED by F158 CR-229] headerCenter now uses inline minHeight style

    it('[SUPERSEDED] no minHeight condition exists (neither expanded nor isSpeechesType)', () => {
      expect(sundayCardSource).not.toContain('!expanded && { minHeight: 62 }');
      expect(sundayCardSource).not.toContain('!expanded && isSpeechesType && { minHeight: 62 }');
    });
  });
});
