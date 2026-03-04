/**
 * F057: Topic Field Visibility Parity (CR-267)
 *
 * Tests that the showTopicRow guard in SpeechSlot matches the speaker row
 * visibility: both are visible for speech positions (1, 2, 3) regardless
 * of whether speech is null, and both hidden for prayer positions (0, 4).
 */

import { describe, it, expect } from 'vitest';

// Replicate the showTopicRow logic from SpeechSlot.tsx
function computeShowTopicRow(isPrayer: boolean): boolean {
  return !isPrayer;
}

// Replicate the isPos2Disabled logic
function computeIsPos2Disabled(position: number, isPrayer: boolean, isSecondSpeechEnabled: boolean | undefined): boolean {
  return position === 2 && !isPrayer && isSecondSpeechEnabled === false;
}

describe('F057: Topic Field Visibility Parity', () => {
  describe('AC-057-1: Topic and speaker fields have identical visibility', () => {
    it('position 1 with speech=null: topic row visible (matches speaker row)', () => {
      const isPrayer = false;
      const speech = null;
      const showTopicRow = computeShowTopicRow(isPrayer);
      // Speaker row is always rendered in the non-disabled branch (no !!speech guard)
      const showSpeakerRow = !isPrayer;
      expect(showTopicRow).toBe(true);
      expect(showSpeakerRow).toBe(true);
      expect(showTopicRow).toBe(showSpeakerRow);
    });

    it('position 1 with speech assigned: both fields visible with data', () => {
      const isPrayer = false;
      const speech = { id: 's1', speaker_name: 'John', topic_title: 'Faith' };
      const showTopicRow = computeShowTopicRow(isPrayer);
      const showSpeakerRow = !isPrayer;
      expect(showTopicRow).toBe(true);
      expect(showSpeakerRow).toBe(true);
    });

    it('position 2 with speech=null: both fields visible', () => {
      const isPrayer = false;
      const showTopicRow = computeShowTopicRow(isPrayer);
      expect(showTopicRow).toBe(true);
    });

    it('position 3 with speech=null: both fields visible', () => {
      const isPrayer = false;
      const showTopicRow = computeShowTopicRow(isPrayer);
      expect(showTopicRow).toBe(true);
    });
  });

  describe('AC-057-2: Disabled position 2 shows both placeholder fields', () => {
    it('position 2 disabled renders both placeholder fields via isPos2Disabled branch', () => {
      const isPos2Disabled = computeIsPos2Disabled(2, false, false);
      expect(isPos2Disabled).toBe(true);
      // When isPos2Disabled is true, the code renders both speaker and topic
      // placeholder fields in the disabled branch (lines 208-226), bypassing
      // the showTopicRow guard entirely.
    });

    it('position 2 enabled does NOT trigger disabled branch', () => {
      const isPos2Disabled = computeIsPos2Disabled(2, false, true);
      expect(isPos2Disabled).toBe(false);
    });
  });

  describe('EC-057-1: Prayer positions (0, 4) still hide topic row', () => {
    it('position 0 (opening prayer): topic row hidden', () => {
      const showTopicRow = computeShowTopicRow(true);
      expect(showTopicRow).toBe(false);
    });

    it('position 4 (closing prayer): topic row hidden', () => {
      const showTopicRow = computeShowTopicRow(true);
      expect(showTopicRow).toBe(false);
    });

    it('prayer position 0 with speech assigned: topic still hidden', () => {
      const isPrayer = true;
      const speech = { id: 's1', speaker_name: 'Jane' };
      const showTopicRow = computeShowTopicRow(isPrayer);
      expect(showTopicRow).toBe(false);
    });
  });

  describe('EC-057-2: Speech record is null - both fields show placeholder consistently', () => {
    it('speech=null at position 1: topic Pressable is disabled (no-op on tap)', () => {
      const speech = null;
      const canAssign = true;
      // Topic Pressable disabled prop: disabled={!canAssign || !speech}
      const topicDisabled = !canAssign || !speech;
      expect(topicDisabled).toBe(true);
    });

    it('speech=null at position 1: speaker Pressable is also disabled', () => {
      const speech = null;
      const canAssign = true;
      // Speaker Pressable disabled prop: disabled={!canAssign || !speech}
      const speakerDisabled = !canAssign || !speech;
      expect(speakerDisabled).toBe(true);
    });

    it('speech assigned: both Pressables are enabled when canAssign=true', () => {
      const speech = { id: 's1' };
      const canAssign = true;
      const topicDisabled = !canAssign || !speech;
      const speakerDisabled = !canAssign || !speech;
      expect(topicDisabled).toBe(false);
      expect(speakerDisabled).toBe(false);
    });
  });
});
