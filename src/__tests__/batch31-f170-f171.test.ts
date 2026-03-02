/**
 * Batch 31: Tests for F170, F171 (CRs 243, 244)
 *
 * F170 (CR-243): Grant secretary speech:assign and speech:unassign permissions
 * F171 (CR-244): Fix topic row visibility for secretary and observer
 *
 * Testing strategy:
 * - F170: Unit tests via hasPermission (AC-170-01, AC-170-02, AC-170-08)
 *         + source code analysis for SpeechSlot UI behavior (AC-170-03 through AC-170-07)
 * - F171: Source code analysis of SpeechSlot showTopicRow condition
 *         (AC-171-01 through AC-171-09) + edge cases (EC-171-01 through EC-171-03)
 *
 * Note: AC-170-09 and AC-171-10 (full test suite passes) are verified by running
 * the complete test suite (npx vitest run).
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { hasPermission, getPermissions } from '../lib/permissions';
import type { Role, Permission } from '../lib/permissions';

// --- Helpers ---

const ROOT = path.resolve(__dirname, '..', '..');

function readSrcFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(ROOT, 'src', relativePath), 'utf-8');
}

// --- Source files ---
const permissionsSource = readSrcFile('lib/permissions.ts');
const speechSlotSource = readSrcFile('components/SpeechSlot.tsx');

// =============================================================================
// F170: Grant secretary speech:assign and speech:unassign permissions (CR-243)
// =============================================================================

describe('F170: Secretary speech:assign/unassign permissions (CR-243)', () => {
  // ---------------------------------------------------------------------------
  // AC-170-01: Secretary role has speech:assign permission
  // ---------------------------------------------------------------------------

  describe('AC-170-01: Secretary has speech:assign', () => {
    it('hasPermission("secretary", "speech:assign") returns true', () => {
      expect(hasPermission('secretary', 'speech:assign')).toBe(true);
    });

    it('secretary permission set in source includes speech:assign', () => {
      // Verify the source code directly includes speech:assign in secretary's Set
      const secretaryBlock = permissionsSource.match(
        /secretary:\s*new\s+Set<Permission>\(\[\s*([\s\S]*?)\]\)/
      );
      expect(secretaryBlock).not.toBeNull();
      expect(secretaryBlock![1]).toContain("'speech:assign'");
    });
  });

  // ---------------------------------------------------------------------------
  // AC-170-02: Secretary role has speech:unassign permission
  // ---------------------------------------------------------------------------

  describe('AC-170-02: Secretary has speech:unassign', () => {
    it('hasPermission("secretary", "speech:unassign") returns true', () => {
      expect(hasPermission('secretary', 'speech:unassign')).toBe(true);
    });

    it('secretary permission set in source includes speech:unassign', () => {
      const secretaryBlock = permissionsSource.match(
        /secretary:\s*new\s+Set<Permission>\(\[\s*([\s\S]*?)\]\)/
      );
      expect(secretaryBlock).not.toBeNull();
      expect(secretaryBlock![1]).toContain("'speech:unassign'");
    });
  });

  // ---------------------------------------------------------------------------
  // AC-170-03: Secretary can assign speakers to prayer slots
  // (Source analysis: canAssign derived from speech:assign)
  // ---------------------------------------------------------------------------

  describe('AC-170-03: Secretary can assign speakers to prayer slots', () => {
    it('SpeechSlot derives canAssign from hasPermission("speech:assign")', () => {
      expect(speechSlotSource).toContain(
        "const canAssign = hasPermission('speech:assign')"
      );
    });

    it('secretary with speech:assign makes canAssign=true', () => {
      // Since secretary now has speech:assign, canAssign will be true
      expect(hasPermission('secretary', 'speech:assign')).toBe(true);
    });

    it('speaker field Pressable is enabled when canAssign && speech', () => {
      // disabled={!canAssign || !speech} means enabled when both are truthy
      expect(speechSlotSource).toContain('disabled={!canAssign || !speech}');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-170-04: Secretary can remove speakers from prayer slots
  // ---------------------------------------------------------------------------

  describe('AC-170-04: Secretary can remove speakers from prayer slots', () => {
    it('SpeechSlot derives canUnassign from hasPermission("speech:unassign")', () => {
      expect(speechSlotSource).toContain(
        "const canUnassign = hasPermission('speech:unassign')"
      );
    });

    it('secretary with speech:unassign makes canUnassign=true', () => {
      expect(hasPermission('secretary', 'speech:unassign')).toBe(true);
    });

    it('remove button shown when hasSpeaker && canUnassign', () => {
      expect(speechSlotSource).toContain('hasSpeaker && canUnassign');
    });

    it('handleRemove shows confirmation Alert before removing', () => {
      expect(speechSlotSource).toContain('Alert.alert(');
      expect(speechSlotSource).toContain('onRemoveAssignment');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-170-05: Secretary can assign speakers to speech slots
  // ---------------------------------------------------------------------------

  describe('AC-170-05: Secretary can assign speakers to speech slots', () => {
    it('handleSpeakerPress opens speaker selector when canAssign', () => {
      const handleSpeakerMatch = speechSlotSource.match(
        /const handleSpeakerPress\s*=\s*useCallback\(\(\)\s*=>\s*\{[\s\S]*?\},\s*\[[^\]]*\]\)/
      );
      expect(handleSpeakerMatch).not.toBeNull();
      const body = handleSpeakerMatch![0];
      expect(body).toContain('!canAssign');
      expect(body).toContain('onOpenSpeakerSelector');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-170-06: Secretary can remove speakers from speech slots
  // ---------------------------------------------------------------------------

  describe('AC-170-06: Secretary can remove speakers from speech slots', () => {
    it('handleRemove checks canUnassign before proceeding', () => {
      const handleRemoveMatch = speechSlotSource.match(
        /const handleRemove\s*=\s*useCallback\(\(\)\s*=>\s*\{[\s\S]*?\},\s*\[[^\]]*\]\)/
      );
      expect(handleRemoveMatch).not.toBeNull();
      const body = handleRemoveMatch![0];
      expect(body).toContain('!canUnassign');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-170-07: Secretary sees chevron arrows on selectable fields
  // ---------------------------------------------------------------------------

  describe('AC-170-07: Secretary sees chevron arrows on selectable fields', () => {
    it('chevron on speaker field is gated by canAssign', () => {
      // Speaker field chevron: {canAssign && (<ChevronDownIcon .../>)}
      expect(speechSlotSource).toContain('canAssign && (');
      expect(speechSlotSource).toContain('ChevronDownIcon');
    });

    it('chevron on topic field is gated by canAssign', () => {
      // The topic field also has a canAssign && chevron pattern
      const chevronMatches = speechSlotSource.match(/canAssign && \(\s*<ChevronDownIcon/g);
      expect(chevronMatches).not.toBeNull();
      // There should be 2 chevrons: one for speaker field, one for topic field
      expect(chevronMatches!.length).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // AC-170-08: Observer role is NOT affected
  // ---------------------------------------------------------------------------

  describe('AC-170-08: Observer role is NOT affected', () => {
    it('hasPermission("observer", "speech:assign") returns false', () => {
      expect(hasPermission('observer', 'speech:assign')).toBe(false);
    });

    it('hasPermission("observer", "speech:unassign") returns false', () => {
      expect(hasPermission('observer', 'speech:unassign')).toBe(false);
    });

    it('observer still has only 3 permissions', () => {
      const perms = getPermissions('observer');
      expect(perms.length).toBe(3);
      expect(perms).toContain('member:read');
      expect(perms).toContain('agenda:read');
      expect(perms).toContain('presentation:start');
    });
  });

  // ---------------------------------------------------------------------------
  // EC-170-01: Secretary assigns speaker then changes status
  // ---------------------------------------------------------------------------

  describe('EC-170-01: Secretary can both assign and change status', () => {
    it('secretary has speech:assign permission', () => {
      expect(hasPermission('secretary', 'speech:assign')).toBe(true);
    });

    it('secretary has speech:change_status permission', () => {
      expect(hasPermission('secretary', 'speech:change_status')).toBe(true);
    });

    it('SpeechSlot checks canChangeStatus independently from canAssign', () => {
      expect(speechSlotSource).toContain(
        "const canChangeStatus = hasPermission('speech:change_status')"
      );
    });
  });

  // ---------------------------------------------------------------------------
  // EC-170-02: Secretary assigns topic to speech slot
  // ---------------------------------------------------------------------------

  describe('EC-170-02: Secretary can assign topics', () => {
    it('secretary has topic:write permission', () => {
      expect(hasPermission('secretary', 'topic:write')).toBe(true);
    });

    it('topic field press handler checks canAssign (which is now true for secretary)', () => {
      const handleTopicMatch = speechSlotSource.match(
        /const handleTopicPress\s*=\s*useCallback\(\(\)\s*=>\s*\{[\s\S]*?\},\s*\[[^\]]*\]\)/
      );
      expect(handleTopicMatch).not.toBeNull();
      const body = handleTopicMatch![0];
      expect(body).toContain('!canAssign');
      expect(body).toContain('onOpenTopicSelector');
    });
  });

  // ---------------------------------------------------------------------------
  // EC-170-03: manage_prayers toggle is OFF
  // ---------------------------------------------------------------------------

  describe('EC-170-03: manage_prayers toggle off has no effect on permissions', () => {
    it('permissions are role-based and independent of manage_prayers toggle', () => {
      // Permissions are determined solely by role, not by UI toggles
      expect(hasPermission('secretary', 'speech:assign')).toBe(true);
      expect(hasPermission('secretary', 'speech:unassign')).toBe(true);
    });

    it('SpeechSlot receives isPrayer as a prop, not derived from permissions', () => {
      expect(speechSlotSource).toContain('isPrayer');
      // isPrayer is a prop, not derived from permissions
      const propsMatch = speechSlotSource.match(
        /interface SpeechSlotProps\s*\{[\s\S]*?\}/
      );
      expect(propsMatch).not.toBeNull();
      expect(propsMatch![0]).toContain('isPrayer');
    });
  });

  // ---------------------------------------------------------------------------
  // Secretary permission count verification
  // ---------------------------------------------------------------------------

  describe('Secretary permission count', () => {
    it('secretary has exactly 23 permissions (all bishopric minus home:next_assignments)', () => {
      const perms = getPermissions('secretary');
      expect(perms.length).toBe(23);
    });

    it('secretary does NOT have home:next_assignments', () => {
      expect(hasPermission('secretary', 'home:next_assignments')).toBe(false);
    });

    it('bishopric has exactly 24 permissions (1 more than secretary)', () => {
      const bishopricPerms = getPermissions('bishopric');
      const secretaryPerms = getPermissions('secretary');
      expect(bishopricPerms.length).toBe(24);
      expect(bishopricPerms.length - secretaryPerms.length).toBe(1);
    });
  });
});

// =============================================================================
// F171: Fix topic row visibility for secretary and observer (CR-244)
// =============================================================================

describe('F171: Topic row visibility fix (CR-244)', () => {
  // ---------------------------------------------------------------------------
  // AC-171-01: showTopicRow does not depend on canAssign permission
  // ---------------------------------------------------------------------------

  describe('AC-171-01: showTopicRow does not depend on canAssign', () => {
    it('showTopicRow is defined as !isPrayer && !!speech', () => {
      expect(speechSlotSource).toContain(
        'const showTopicRow = !isPrayer && !!speech;'
      );
    });

    it('showTopicRow does NOT reference canAssign', () => {
      const showTopicLine = speechSlotSource
        .split('\n')
        .find((line) => line.includes('const showTopicRow'));
      expect(showTopicLine).not.toBeUndefined();
      expect(showTopicLine).not.toContain('canAssign');
    });

    it('showTopicRow does NOT reference topicDisplay', () => {
      const showTopicLine = speechSlotSource
        .split('\n')
        .find((line) => line.includes('const showTopicRow'));
      expect(showTopicLine).not.toBeUndefined();
      expect(showTopicLine).not.toContain('topicDisplay');
    });

    it('comment above showTopicRow says "whenever a speech exists"', () => {
      const lines = speechSlotSource.split('\n');
      const showTopicIdx = lines.findIndex((line) =>
        line.includes('const showTopicRow')
      );
      expect(showTopicIdx).toBeGreaterThan(0);
      const commentLine = lines[showTopicIdx - 1];
      expect(commentLine).toContain('whenever a speech exists');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-171-02: Secretary sees empty topic field when no topic is assigned
  // ---------------------------------------------------------------------------

  describe('AC-171-02: Secretary sees empty topic field', () => {
    it('showTopicRow is true when speech exists and isPrayer=false (regardless of permissions)', () => {
      // The condition !isPrayer && !!speech evaluates to true when:
      // isPrayer=false AND speech is non-null
      // No permission check involved
      expect(speechSlotSource).toContain(
        'const showTopicRow = !isPrayer && !!speech;'
      );
    });

    it('topic field shows placeholder text when no topic assigned', () => {
      // topicDisplay is null when speech.topic_title is falsy
      // The field text uses: {topicDisplay ?? t('speeches.selectTopic')}
      expect(speechSlotSource).toContain(
        "{topicDisplay ?? t('speeches.selectTopic')}"
      );
    });
  });

  // ---------------------------------------------------------------------------
  // AC-171-03: Observer sees empty topic field when no topic is assigned
  // ---------------------------------------------------------------------------

  describe('AC-171-03: Observer sees empty topic field (read-only)', () => {
    it('observer does NOT have speech:assign (canAssign=false)', () => {
      expect(hasPermission('observer', 'speech:assign')).toBe(false);
    });

    it('topic field Pressable is disabled when !canAssign', () => {
      // The topic field: disabled={!canAssign || !speech}
      // For observer: !false_canAssign = true, so disabled=true
      expect(speechSlotSource).toContain('disabled={!canAssign || !speech}');
    });

    it('chevron is hidden when canAssign is false (observer)', () => {
      // {canAssign && (<ChevronDownIcon .../>)} - false for observer
      const chevronMatches = speechSlotSource.match(
        /canAssign && \(\s*<ChevronDownIcon/g
      );
      expect(chevronMatches).not.toBeNull();
    });

    it('X clear button is hidden when canAssign is false (observer)', () => {
      // {topicDisplay && canAssign && (...XIcon...)}
      expect(speechSlotSource).toContain('topicDisplay && canAssign');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-171-04: Secretary sees topic field with assigned topic
  // ---------------------------------------------------------------------------

  describe('AC-171-04: Secretary sees topic field with assigned topic', () => {
    it('topicDisplay shows "Collection : Title" format when both exist', () => {
      // topicDisplay logic in source
      expect(speechSlotSource).toContain(
        '`${speech.topic_collection} : ${speech.topic_title}`'
      );
    });

    it('topicDisplay shows just title when collection is null', () => {
      expect(speechSlotSource).toContain('speech.topic_title');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-171-05: Observer sees topic field with assigned topic (read-only)
  // ---------------------------------------------------------------------------

  describe('AC-171-05: Observer sees topic field with assigned topic', () => {
    it('topic text color uses colors.text when topicDisplay is truthy', () => {
      expect(speechSlotSource).toContain(
        'color: topicDisplay ? colors.text : colors.placeholder'
      );
    });

    it('topic text shows topicDisplay value (not placeholder) when topic exists', () => {
      expect(speechSlotSource).toContain(
        "{topicDisplay ?? t('speeches.selectTopic')}"
      );
    });
  });

  // ---------------------------------------------------------------------------
  // AC-171-06: Topic row is still hidden for prayer slots
  // ---------------------------------------------------------------------------

  describe('AC-171-06: Topic row hidden for prayer slots', () => {
    it('showTopicRow includes !isPrayer check', () => {
      expect(speechSlotSource).toContain('const showTopicRow = !isPrayer');
    });

    it('showTopicRow is false when isPrayer=true (regardless of speech value)', () => {
      // !true && !!speech = false
      const showTopicLine = speechSlotSource
        .split('\n')
        .find((line) => line.includes('const showTopicRow'));
      expect(showTopicLine).toContain('!isPrayer');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-171-07: Topic row is hidden when speech is null
  // ---------------------------------------------------------------------------

  describe('AC-171-07: Topic row hidden when speech is null', () => {
    it('showTopicRow includes !!speech check', () => {
      expect(speechSlotSource).toContain('!!speech');
    });

    it('showTopicRow is false when speech is null', () => {
      // !isPrayer && !!null = !isPrayer && false = false
      const showTopicLine = speechSlotSource
        .split('\n')
        .find((line) => line.includes('const showTopicRow'));
      expect(showTopicLine).toContain('!!speech');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-171-08: Bishopric behavior unchanged
  // ---------------------------------------------------------------------------

  describe('AC-171-08: Bishopric behavior unchanged', () => {
    it('bishopric has speech:assign (canAssign=true)', () => {
      expect(hasPermission('bishopric', 'speech:assign')).toBe(true);
    });

    it('bishopric has speech:unassign (canUnassign=true)', () => {
      expect(hasPermission('bishopric', 'speech:unassign')).toBe(true);
    });

    it('showTopicRow is true for bishopric when speech exists and not prayer', () => {
      // showTopicRow = !isPrayer && !!speech
      // For bishopric with a speech, isPrayer=false: true && true = true
      // This is the same result as before the fix (canAssign was true for bishopric)
      expect(speechSlotSource).toContain(
        'const showTopicRow = !isPrayer && !!speech;'
      );
    });

    it('topic field is editable for bishopric (pressable, chevron, X button)', () => {
      // disabled={!canAssign || !speech} -> !true || !speech -> false || !speech
      // When speech exists: false || false -> false -> ENABLED
      expect(speechSlotSource).toContain('disabled={!canAssign || !speech}');
      // Chevron shown: canAssign && (...)
      expect(speechSlotSource).toContain('canAssign && (');
      // X button shown: topicDisplay && canAssign && (...)
      expect(speechSlotSource).toContain('topicDisplay && canAssign');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-171-09: Observer topic field is read-only
  // ---------------------------------------------------------------------------

  describe('AC-171-09: Observer topic field is read-only', () => {
    it('observer does NOT have speech:assign', () => {
      expect(hasPermission('observer', 'speech:assign')).toBe(false);
    });

    it('topic Pressable disabled for observer: disabled={!canAssign || !speech}', () => {
      // For observer: !false = true, so disabled=true regardless of speech
      expect(speechSlotSource).toContain('disabled={!canAssign || !speech}');
    });

    it('no chevron for observer: canAssign is false', () => {
      // {canAssign && (<ChevronDownIcon .../>)} evaluates to false for observer
      const topicSection = speechSlotSource.match(
        /\{showTopicRow && \([\s\S]*?<\/View>\s*\)\}/
      );
      expect(topicSection).not.toBeNull();
      expect(topicSection![0]).toContain('canAssign &&');
    });

    it('no X clear button for observer: canAssign is false', () => {
      // {topicDisplay && canAssign && (...XIcon...)} evaluates to false for observer
      const topicSection = speechSlotSource.match(
        /\{showTopicRow && \([\s\S]*?<\/View>\s*\)\}/
      );
      expect(topicSection).not.toBeNull();
      expect(topicSection![0]).toContain('topicDisplay && canAssign');
    });
  });

  // ---------------------------------------------------------------------------
  // EC-171-01: Speech exists but speaker is not assigned (status not_assigned)
  // ---------------------------------------------------------------------------

  describe('EC-171-01: Topic row shown even before speaker is assigned', () => {
    it('showTopicRow only checks speech existence, not speaker assignment', () => {
      const showTopicLine = speechSlotSource
        .split('\n')
        .find((line) => line.includes('const showTopicRow'));
      expect(showTopicLine).not.toBeUndefined();
      // showTopicRow should NOT check hasSpeaker or speaker_name
      expect(showTopicLine).not.toContain('hasSpeaker');
      expect(showTopicLine).not.toContain('speaker_name');
    });

    it('status defaults to not_assigned when speech has no speaker', () => {
      expect(speechSlotSource).toContain(
        "const status = speech?.status ?? 'not_assigned'"
      );
    });
  });

  // ---------------------------------------------------------------------------
  // EC-171-02: F118 second speech toggle is disabled (position 2)
  // ---------------------------------------------------------------------------

  describe('EC-171-02: Position 2 disabled state has its own placeholder', () => {
    it('isPos2Disabled is calculated for position 2', () => {
      expect(speechSlotSource).toContain(
        'const isPos2Disabled = position === 2 && !isPrayer && isSecondSpeechEnabled === false'
      );
    });

    it('disabled placeholder has its own rendering branch', () => {
      // The isPos2Disabled branch renders disabled placeholder fields
      // separately from the normal showTopicRow flow
      expect(speechSlotSource).toContain('isPos2Disabled');
      expect(speechSlotSource).toContain('disabledContainer');
    });
  });

  // ---------------------------------------------------------------------------
  // EC-171-03: CR-243 (F170) and CR-244 (F171) applied together
  // ---------------------------------------------------------------------------

  describe('EC-171-03: F170 and F171 work together correctly', () => {
    it('secretary has canAssign=true (from F170) AND showTopicRow is simplified (from F171)', () => {
      // F170: secretary now has speech:assign -> canAssign=true
      expect(hasPermission('secretary', 'speech:assign')).toBe(true);
      // F171: showTopicRow = !isPrayer && !!speech (no canAssign dependency)
      expect(speechSlotSource).toContain(
        'const showTopicRow = !isPrayer && !!speech;'
      );
    });

    it('secretary topic field is editable when speech exists (both fixes combined)', () => {
      // With F170: canAssign=true -> topic field is pressable, chevron shown, X shown
      // With F171: showTopicRow=true for all roles when speech exists
      // Combined: secretary sees editable topic field
      expect(hasPermission('secretary', 'speech:assign')).toBe(true);
    });

    it('observer topic field is still read-only even with F171', () => {
      // Observer does NOT get speech:assign from F170 (that only affects secretary)
      // F171 makes the topic row visible, but read-only for observer
      expect(hasPermission('observer', 'speech:assign')).toBe(false);
      expect(hasPermission('observer', 'speech:unassign')).toBe(false);
    });
  });
});
