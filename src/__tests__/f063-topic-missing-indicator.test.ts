/**
 * Tests for F063: Missing Topic Indicator in Invite Management (CR-274)
 *
 * STEP-01: i18n key invite.topicMissing exists in all 3 locales
 * STEP-02: Component logic tests for indicator + button disabling
 */

import { describe, it, expect } from 'vitest';
import ptBR from '../i18n/locales/pt-BR.json';
import enUS from '../i18n/locales/en-US.json';
import esLA from '../i18n/locales/es-LA.json';

// =============================================================================
// STEP-01: i18n keys
// =============================================================================

describe('F063 STEP-01: i18n key invite.topicMissing', () => {
  it('pt-BR has invite.topicMissing = "(Falta Tema)"', () => {
    expect((ptBR as any).invite.topicMissing).toBe('(Falta Tema)');
  });

  it('en-US has invite.topicMissing = "(Missing Topic)"', () => {
    expect((enUS as any).invite.topicMissing).toBe('(Missing Topic)');
  });

  it('es-LA has invite.topicMissing = "(Falta Tema)"', () => {
    expect((esLA as any).invite.topicMissing).toBe('(Falta Tema)');
  });
});

// =============================================================================
// STEP-02: Topic-missing logic tests
// =============================================================================

describe('F063 STEP-02: topic-missing boolean logic', () => {
  // Replicate the inline logic from InviteManagementSection
  function computeTopicMissing(position: number, topicTitle: string | null | undefined): boolean {
    const isSpeech = position >= 1 && position <= 3;
    return isSpeech && (!topicTitle || topicTitle.trim() === '');
  }

  function computeIsWhatsAppDisabled(position: number, topicTitle: string | null | undefined, status: string): boolean {
    const topicMissing = computeTopicMissing(position, topicTitle);
    const isNotInvited = status === 'assigned_not_invited';
    return topicMissing && isNotInvited;
  }

  // AC-01: Missing topic indicator for speeches without topic
  it('AC-01: position 1, topic_title=null -> topicMissing=true', () => {
    expect(computeTopicMissing(1, null)).toBe(true);
  });

  it('AC-01: position 2, topic_title="" -> topicMissing=true', () => {
    expect(computeTopicMissing(2, '')).toBe(true);
  });

  it('AC-01: position 3, topic_title="  " (whitespace) -> topicMissing=true (EC-01)', () => {
    expect(computeTopicMissing(3, '   ')).toBe(true);
  });

  // AC-02: No indicator for speeches with topic
  it('AC-02: position 1, topic_title="My Topic" -> topicMissing=false', () => {
    expect(computeTopicMissing(1, 'My Topic')).toBe(false);
  });

  // AC-03: No indicator for prayer positions
  it('AC-03/EC-02: position 0 (prayer), topic_title=null -> topicMissing=false', () => {
    expect(computeTopicMissing(0, null)).toBe(false);
  });

  it('AC-03/EC-03: position 4 (prayer), topic_title=null -> topicMissing=false', () => {
    expect(computeTopicMissing(4, null)).toBe(false);
  });

  // AC-04: WhatsApp button disabled when topic missing (not_invited status)
  it('AC-04: position 1, topic_title=null, status=assigned_not_invited -> isWhatsAppDisabled=true', () => {
    expect(computeIsWhatsAppDisabled(1, null, 'assigned_not_invited')).toBe(true);
  });

  // AC-05: WhatsApp button enabled when topic present
  it('AC-05: position 1, topic_title="My Topic", status=assigned_not_invited -> isWhatsAppDisabled=false', () => {
    expect(computeIsWhatsAppDisabled(1, 'My Topic', 'assigned_not_invited')).toBe(false);
  });

  // AC-06: Dropdown button not affected for invited status
  it('AC-06/EC-04: position 2, topic_title=null, status=assigned_invited -> isWhatsAppDisabled=false', () => {
    expect(computeIsWhatsAppDisabled(2, null, 'assigned_invited')).toBe(false);
  });

  // Edge: position 2, topic_title=null, status=assigned_not_invited -> both indicator AND disabled
  it('Edge: position 2, topic_title=null, status=assigned_not_invited -> isWhatsAppDisabled=true', () => {
    expect(computeIsWhatsAppDisabled(2, null, 'assigned_not_invited')).toBe(true);
  });

  // Edge: position 0 (prayer), topic_title=null, status=assigned_not_invited -> NOT disabled
  it('Edge/EC-02: position 0, topic_title=null, status=assigned_not_invited -> isWhatsAppDisabled=false', () => {
    expect(computeIsWhatsAppDisabled(0, null, 'assigned_not_invited')).toBe(false);
  });

  // Edge: position 4 (prayer), topic_title=null, status=assigned_not_invited -> NOT disabled
  it('Edge/EC-03: position 4, topic_title=null, status=assigned_not_invited -> isWhatsAppDisabled=false', () => {
    expect(computeIsWhatsAppDisabled(4, null, 'assigned_not_invited')).toBe(false);
  });

  // Edge: topic_title=undefined -> treated as missing
  it('Edge: position 1, topic_title=undefined -> topicMissing=true', () => {
    expect(computeTopicMissing(1, undefined)).toBe(true);
  });
});
