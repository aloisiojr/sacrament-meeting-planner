/**
 * Tests for F063: Missing Topic Indicator in Invite Management (CR-274)
 *
 * STEP-01: i18n key invite.topicMissing exists in all 3 locales
 * STEP-02: Component logic tests for indicator + button disabling
 * SUPPLEMENTARY: Integration tests with getInviteItems + additional edge cases
 */

import { describe, it, expect } from 'vitest';
import ptBR from '../i18n/locales/pt-BR.json';
import enUS from '../i18n/locales/en-US.json';
import esLA from '../i18n/locales/es-LA.json';
import { getInviteItems } from '../lib/speechUtils';
import type { Speech } from '../types/database';

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

  // AC-02: Additional positions with topic present
  it('AC-02: position 2, topic_title="Fé" -> topicMissing=false', () => {
    expect(computeTopicMissing(2, 'Fé')).toBe(false);
  });

  it('AC-02: position 3, topic_title="A" (single char) -> topicMissing=false', () => {
    expect(computeTopicMissing(3, 'A')).toBe(false);
  });

  // AC-04: All speech positions disabled when topic missing + not_invited
  it('AC-04: position 3, topic_title=null, status=assigned_not_invited -> isWhatsAppDisabled=true', () => {
    expect(computeIsWhatsAppDisabled(3, null, 'assigned_not_invited')).toBe(true);
  });

  // AC-05: All speech positions enabled when topic present
  it('AC-05: position 2, topic_title="Topic", status=assigned_not_invited -> isWhatsAppDisabled=false', () => {
    expect(computeIsWhatsAppDisabled(2, 'Topic', 'assigned_not_invited')).toBe(false);
  });

  it('AC-05: position 3, topic_title="Topic", status=assigned_not_invited -> isWhatsAppDisabled=false', () => {
    expect(computeIsWhatsAppDisabled(3, 'Topic', 'assigned_not_invited')).toBe(false);
  });

  // AC-06: All speech positions with assigned_invited and missing topic -> dropdown works
  it('AC-06: position 1, topic_title=null, status=assigned_invited -> isWhatsAppDisabled=false', () => {
    expect(computeIsWhatsAppDisabled(1, null, 'assigned_invited')).toBe(false);
  });

  it('AC-06: position 3, topic_title="", status=assigned_invited -> isWhatsAppDisabled=false', () => {
    expect(computeIsWhatsAppDisabled(3, '', 'assigned_invited')).toBe(false);
  });

  // Edge: non-invite statuses should not affect topicMissing (only isWhatsAppDisabled)
  it('Edge: topicMissing is independent of status', () => {
    // topicMissing only depends on position + topic_title, not status
    expect(computeTopicMissing(1, null)).toBe(true);
    expect(computeTopicMissing(1, 'Topic')).toBe(false);
    // isWhatsAppDisabled depends on status too
    expect(computeIsWhatsAppDisabled(1, null, 'confirmed')).toBe(false);
    expect(computeIsWhatsAppDisabled(1, null, 'not_assigned')).toBe(false);
  });

  // Edge: Whitespace-only at different positions
  it('EC-01: position 1, topic_title=" " (single space) -> topicMissing=true', () => {
    expect(computeTopicMissing(1, ' ')).toBe(true);
  });

  it('EC-01: position 2, topic_title="\\t" (tab) -> topicMissing=true', () => {
    expect(computeTopicMissing(2, '\t')).toBe(true);
  });
});

// =============================================================================
// SUPPLEMENTARY: getInviteItems preserves topic_title for topicMissing logic
// =============================================================================

describe('F063 SUPPLEMENTARY: getInviteItems + topicMissing integration', () => {
  // Helper to create a Speech for testing
  function makeSpeech(overrides: Partial<Speech>): Speech {
    return {
      id: `speech-${overrides.position ?? 1}`,
      ward_id: 'ward-1',
      sunday_date: '2026-03-08',
      position: 1,
      member_id: 'member-1',
      speaker_name: 'João Silva',
      speaker_informal_name: 'João',
      speaker_phone: '+5511999990000',
      topic_title: null,
      topic_link: null,
      topic_collection: null,
      assigned_by_role: null,
      status: 'assigned_not_invited',
      contact_phone: null,
      is_delegated: false,
      delegate_for_name: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      ...overrides,
    };
  }

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

  const stubFormat = (date: string) => date; // identity formatter

  it('getInviteItems returns speeches with topic_title=null, enabling topicMissing detection', () => {
    const speeches: Speech[] = [
      makeSpeech({ id: 's1', position: 1, status: 'assigned_not_invited', topic_title: null }),
    ];
    const items = getInviteItems(speeches, 'pt-BR', stubFormat);
    expect(items).toHaveLength(1);
    expect(items[0].speech.topic_title).toBeNull();
    expect(computeTopicMissing(items[0].speech.position, items[0].speech.topic_title)).toBe(true);
    expect(computeIsWhatsAppDisabled(items[0].speech.position, items[0].speech.topic_title, items[0].speech.status)).toBe(true);
  });

  it('getInviteItems returns speeches with topic_title set, topicMissing=false', () => {
    const speeches: Speech[] = [
      makeSpeech({ id: 's1', position: 1, status: 'assigned_not_invited', topic_title: 'Fé em Cristo' }),
    ];
    const items = getInviteItems(speeches, 'pt-BR', stubFormat);
    expect(items).toHaveLength(1);
    expect(items[0].speech.topic_title).toBe('Fé em Cristo');
    expect(computeTopicMissing(items[0].speech.position, items[0].speech.topic_title)).toBe(false);
    expect(computeIsWhatsAppDisabled(items[0].speech.position, items[0].speech.topic_title, items[0].speech.status)).toBe(false);
  });

  it('getInviteItems with mixed speeches: some with topic, some without', () => {
    const speeches: Speech[] = [
      makeSpeech({ id: 's1', position: 1, status: 'assigned_not_invited', topic_title: 'Topic A' }),
      makeSpeech({ id: 's2', position: 2, status: 'assigned_not_invited', topic_title: null }),
      makeSpeech({ id: 's3', position: 3, status: 'assigned_invited', topic_title: '' }),
    ];
    const items = getInviteItems(speeches, 'pt-BR', stubFormat);
    expect(items).toHaveLength(3);

    // Position 1 with topic: no indicator, button enabled
    expect(computeTopicMissing(items[0].speech.position, items[0].speech.topic_title)).toBe(false);
    expect(computeIsWhatsAppDisabled(items[0].speech.position, items[0].speech.topic_title, items[0].speech.status)).toBe(false);

    // Position 2 without topic, not_invited: indicator shown, button disabled
    expect(computeTopicMissing(items[1].speech.position, items[1].speech.topic_title)).toBe(true);
    expect(computeIsWhatsAppDisabled(items[1].speech.position, items[1].speech.topic_title, items[1].speech.status)).toBe(true);

    // Position 3 without topic, invited: indicator shown, dropdown works (isWhatsAppDisabled=false)
    expect(computeTopicMissing(items[2].speech.position, items[2].speech.topic_title)).toBe(true);
    expect(computeIsWhatsAppDisabled(items[2].speech.position, items[2].speech.topic_title, items[2].speech.status)).toBe(false);
  });

  it('getInviteItems with prayer positions: topicMissing always false', () => {
    const speeches: Speech[] = [
      makeSpeech({ id: 's0', position: 0, status: 'assigned_not_invited', topic_title: null }),
      makeSpeech({ id: 's4', position: 4, status: 'assigned_not_invited', topic_title: null }),
    ];
    const items = getInviteItems(speeches, 'pt-BR', stubFormat);
    expect(items).toHaveLength(2);

    // Position 0: prayer, never flagged
    expect(computeTopicMissing(items[0].speech.position, items[0].speech.topic_title)).toBe(false);
    expect(computeIsWhatsAppDisabled(items[0].speech.position, items[0].speech.topic_title, items[0].speech.status)).toBe(false);

    // Position 4: prayer, never flagged
    expect(computeTopicMissing(items[1].speech.position, items[1].speech.topic_title)).toBe(false);
    expect(computeIsWhatsAppDisabled(items[1].speech.position, items[1].speech.topic_title, items[1].speech.status)).toBe(false);
  });

  it('getInviteItems filters out non-invite statuses (not_assigned, confirmed, etc.)', () => {
    const speeches: Speech[] = [
      makeSpeech({ id: 's1', position: 1, status: 'not_assigned', topic_title: null }),
      makeSpeech({ id: 's2', position: 2, status: 'assigned_confirmed', topic_title: null }),
      makeSpeech({ id: 's3', position: 3, status: 'assigned_not_invited', topic_title: null }),
    ];
    const items = getInviteItems(speeches, 'pt-BR', stubFormat);
    // Only assigned_not_invited and assigned_invited pass through getInviteItems
    expect(items).toHaveLength(1);
    expect(items[0].speech.id).toBe('s3');
    expect(computeTopicMissing(items[0].speech.position, items[0].speech.topic_title)).toBe(true);
  });

  it('getInviteItems with whitespace-only topic_title: topicMissing=true after trim', () => {
    const speeches: Speech[] = [
      makeSpeech({ id: 's1', position: 1, status: 'assigned_not_invited', topic_title: '   ' }),
    ];
    const items = getInviteItems(speeches, 'pt-BR', stubFormat);
    expect(items).toHaveLength(1);
    expect(computeTopicMissing(items[0].speech.position, items[0].speech.topic_title)).toBe(true);
    expect(computeIsWhatsAppDisabled(items[0].speech.position, items[0].speech.topic_title, items[0].speech.status)).toBe(true);
  });

  it('getInviteItems sorts by date then position, preserving topic_title', () => {
    const speeches: Speech[] = [
      makeSpeech({ id: 's3', position: 3, sunday_date: '2026-03-08', status: 'assigned_not_invited', topic_title: null }),
      makeSpeech({ id: 's1', position: 1, sunday_date: '2026-03-08', status: 'assigned_not_invited', topic_title: 'Topic' }),
      makeSpeech({ id: 's2', position: 2, sunday_date: '2026-03-15', status: 'assigned_invited', topic_title: null }),
    ];
    const items = getInviteItems(speeches, 'pt-BR', stubFormat);
    expect(items).toHaveLength(3);
    // Sorted: 2026-03-08/pos1, 2026-03-08/pos3, 2026-03-15/pos2
    expect(items[0].speech.position).toBe(1);
    expect(items[0].speech.topic_title).toBe('Topic');
    expect(items[1].speech.position).toBe(3);
    expect(items[1].speech.topic_title).toBeNull();
    expect(items[2].speech.position).toBe(2);
    expect(items[2].speech.topic_title).toBeNull();
  });
});
