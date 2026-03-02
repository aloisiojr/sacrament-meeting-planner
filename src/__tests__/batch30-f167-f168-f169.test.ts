/**
 * Batch 30: Tests for F167, F168, F169 (CRs 240, 241, 242)
 *
 * F167 (CR-240): Fix push notification text for prayer positions
 * F168 (CR-241): Fix DebouncedTextInput flickering during typing
 * F169 (CR-242): Add keyboard avoidance to ActorSelector modal
 *
 * Testing strategy:
 * - F167 client-side: Direct import of buildNotificationText (unit tests for
 *   edge cases EC-167-01, EC-167-02, EC-167-03 + AC-167-03, AC-167-06)
 * - F167 server-side: Source code analysis (AC-167-07 through AC-167-09)
 * - F168: Source code analysis for DebouncedTextInput structural changes
 *   (AC-168-01 through AC-168-09)
 * - F169: Source code analysis for ActorSelector KeyboardAvoidingView
 *   (AC-169-01 through AC-169-07)
 *
 * Note: F167 prayer position happy-path tests (AC-167-10, AC-167-11) are
 * already in useNotifications-utils.test.ts (added by coder in STEP-05).
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  buildNotificationText,
  getOrdinal,
} from '../lib/notificationUtils';
import type { OrdinalLanguage } from '../lib/notificationUtils';

// --- Helpers ---

const ROOT = path.resolve(__dirname, '..', '..');

function readSrcFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(ROOT, 'src', relativePath), 'utf-8');
}

function readRootFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(ROOT, relativePath), 'utf-8');
}

// --- Source files ---
const notificationUtilsSource = readSrcFile('lib/notificationUtils.ts');
const serverNotificationsSource = readRootFile(
  'supabase/functions/process-notifications/index.ts'
);
const debouncedTextInputSource = readSrcFile(
  'components/DebouncedTextInput.tsx'
);
const actorSelectorSource = readSrcFile('components/ActorSelector.tsx');

// =============================================================================
// F167: Fix push notification text for prayer positions (CR-240)
// =============================================================================

describe('F167: Prayer notification text (CR-240)', () => {
  const languages: OrdinalLanguage[] = ['pt-BR', 'en', 'es'];

  // -------------------------------------------------------------------------
  // Client-side: getPrayerLabel helper (via source analysis)
  // -------------------------------------------------------------------------

  describe('getPrayerLabel helper exists in client', () => {
    it('getPrayerLabel function is defined in notificationUtils.ts', () => {
      expect(notificationUtilsSource).toContain('function getPrayerLabel(');
    });

    it('getPrayerLabel returns null for non-prayer positions (via ?? null)', () => {
      expect(notificationUtilsSource).toContain(
        'labels[language]?.[position] ?? null'
      );
    });

    it('getPrayerLabel defines labels for position 0 and 4 in all 3 languages', () => {
      // pt-BR
      expect(notificationUtilsSource).toContain('oração de abertura');
      expect(notificationUtilsSource).toContain('oração de encerramento');
      // en
      expect(notificationUtilsSource).toContain('opening prayer');
      expect(notificationUtilsSource).toContain('closing prayer');
      // es
      expect(notificationUtilsSource).toContain('oración de apertura');
      expect(notificationUtilsSource).toContain('oración de clausura');
    });
  });

  // -------------------------------------------------------------------------
  // AC-167-03: speaker_confirmed for positions 1-3 unchanged
  // -------------------------------------------------------------------------

  describe('AC-167-03: speaker_confirmed unchanged for positions 1-3', () => {
    it.each([1, 2, 3] as const)(
      'position %i returns speech-specific title and body in pt-BR',
      (pos) => {
        const result = buildNotificationText('speaker_confirmed', 'pt-BR', {
          name: 'Test User',
          position: pos,
          date: '2026-03-08',
        });
        expect(result.title).toBe('Orador Confirmado');
        expect(result.body).toContain('discurso');
        expect(result.body).toContain(getOrdinal(pos, 'pt-BR'));
      }
    );

    it.each([1, 2, 3] as const)(
      'position %i returns speech-specific title and body in en',
      (pos) => {
        const result = buildNotificationText('speaker_confirmed', 'en', {
          name: 'Test User',
          position: pos,
          date: '2026-03-08',
        });
        expect(result.title).toBe('Speaker Confirmed');
        expect(result.body).toContain('speech');
        expect(result.body).toContain(getOrdinal(pos, 'en'));
      }
    );

    it.each([1, 2, 3] as const)(
      'position %i returns speech-specific title and body in es',
      (pos) => {
        const result = buildNotificationText('speaker_confirmed', 'es', {
          name: 'Test User',
          position: pos,
          date: '2026-03-08',
        });
        expect(result.title).toBe('Orador Confirmado');
        expect(result.body).toContain('discurso');
        expect(result.body).toContain(getOrdinal(pos, 'es'));
      }
    );
  });

  // -------------------------------------------------------------------------
  // AC-167-06: speaker_withdrew for positions 1-3 unchanged
  // -------------------------------------------------------------------------

  describe('AC-167-06: speaker_withdrew unchanged for positions 1-3', () => {
    it.each([1, 2, 3] as const)(
      'position %i returns speech-specific withdrew text in pt-BR',
      (pos) => {
        const result = buildNotificationText('speaker_withdrew', 'pt-BR', {
          name: 'Test User',
          position: pos,
          date: '2026-03-08',
        });
        expect(result.title).toBe('ATENÇÃO! Desistência');
        expect(result.body).toContain('discurso');
        expect(result.body).toContain(getOrdinal(pos, 'pt-BR'));
        expect(result.body).toContain('outro orador');
      }
    );

    it.each([1, 2, 3] as const)(
      'position %i returns speech-specific withdrew text in en',
      (pos) => {
        const result = buildNotificationText('speaker_withdrew', 'en', {
          name: 'Test User',
          position: pos,
          date: '2026-03-08',
        });
        expect(result.title).toBe('ATTENTION! Speaker Withdrew');
        expect(result.body).toContain('speech');
        expect(result.body).toContain(getOrdinal(pos, 'en'));
        expect(result.body).toContain('another speaker');
      }
    );

    it.each([1, 2, 3] as const)(
      'position %i returns speech-specific withdrew text in es',
      (pos) => {
        const result = buildNotificationText('speaker_withdrew', 'es', {
          name: 'Test User',
          position: pos,
          date: '2026-03-08',
        });
        expect(result.title).toBe('¡ATENCIÓN! Desistimiento');
        expect(result.body).toContain('discurso');
        expect(result.body).toContain(getOrdinal(pos, 'es'));
        expect(result.body).toContain('otro orador');
      }
    );
  });

  // -------------------------------------------------------------------------
  // EC-167-01: Position null/undefined defaults to position 1 (1st speech)
  // -------------------------------------------------------------------------

  describe('EC-167-01: null/undefined position defaults to position 1', () => {
    it.each(languages)(
      'speaker_confirmed with undefined position produces 1st speech text in %s',
      (lang) => {
        const result = buildNotificationText('speaker_confirmed', lang, {
          name: 'Default User',
          position: undefined,
          date: '2026-03-08',
        });
        // Position defaults to 1 via (d.position ?? 1), which is a speech position
        expect(result.body).toContain(getOrdinal(1, lang));
        // Should NOT produce prayer text
        if (lang === 'en') {
          expect(result.body).toContain('speech');
          expect(result.title).toBe('Speaker Confirmed');
        } else {
          expect(result.body).toContain('discurso');
        }
      }
    );

    it.each(languages)(
      'speaker_withdrew with undefined position produces 1st speech text in %s',
      (lang) => {
        const result = buildNotificationText('speaker_withdrew', lang, {
          name: 'Default User',
          position: undefined,
          date: '2026-03-08',
        });
        expect(result.body).toContain(getOrdinal(1, lang));
        if (lang === 'en') {
          expect(result.body).toContain('speech');
        } else {
          expect(result.body).toContain('discurso');
        }
      }
    );
  });

  // -------------------------------------------------------------------------
  // EC-167-02: Out-of-range positions (5, -1) fall through to number string
  // -------------------------------------------------------------------------

  describe('EC-167-02: out-of-range positions fall through to number string', () => {
    it('position 5 uses number "5" as ordinal fallback in en', () => {
      const result = buildNotificationText('speaker_confirmed', 'en', {
        name: 'Edge User',
        position: 5,
        date: '2026-03-08',
      });
      expect(result.title).toBe('Speaker Confirmed');
      expect(result.body).toContain('5');
      expect(result.body).toContain('speech');
    });

    it('position -1 uses number "-1" as ordinal fallback in en', () => {
      const result = buildNotificationText('speaker_confirmed', 'en', {
        name: 'Edge User',
        position: -1,
        date: '2026-03-08',
      });
      expect(result.title).toBe('Speaker Confirmed');
      expect(result.body).toContain('-1');
      expect(result.body).toContain('speech');
    });

    it('position 5 produces withdrew speech text (not prayer) in pt-BR', () => {
      const result = buildNotificationText('speaker_withdrew', 'pt-BR', {
        name: 'Edge User',
        position: 5,
        date: '2026-03-08',
      });
      expect(result.title).toBe('ATENÇÃO! Desistência');
      expect(result.body).toContain('discurso');
      expect(result.body).not.toContain('oração');
    });
  });

  // -------------------------------------------------------------------------
  // EC-167-03: Designation notification for prayer positions remains generic
  // -------------------------------------------------------------------------

  describe('EC-167-03: designation notification does not use prayer text', () => {
    it.each(languages)(
      'designation text is generic regardless of prayer positions in %s',
      (lang) => {
        const result = buildNotificationText('designation', lang, {
          names: ['Prayer Person'],
          date: '2026-03-08',
        });
        // Designation text does NOT include prayer-specific text
        expect(result.body).not.toContain('prayer');
        expect(result.body).not.toContain('oração');
        expect(result.body).not.toContain('oración');
      }
    );
  });

  // -------------------------------------------------------------------------
  // AC-167-07 through AC-167-09: Server-side code (source code analysis)
  // -------------------------------------------------------------------------

  describe('Server-side notification text (AC-167-07 to AC-167-09)', () => {
    it('AC-167-07: server has getPrayerLabel helper function', () => {
      expect(serverNotificationsSource).toContain(
        'function getPrayerLabel(position: number, language: string)'
      );
    });

    it('AC-167-07: server getPrayerLabel has all 3 language labels', () => {
      // Verify the server-side helper has the same labels as the client
      expect(serverNotificationsSource).toContain('oração de abertura');
      expect(serverNotificationsSource).toContain('oração de encerramento');
      expect(serverNotificationsSource).toContain('opening prayer');
      expect(serverNotificationsSource).toContain('closing prayer');
      expect(serverNotificationsSource).toContain('oración de apertura');
      expect(serverNotificationsSource).toContain('oración de clausura');
    });

    it('AC-167-07: server buildConfirmedText checks getPrayerLabel', () => {
      // Verify the function calls getPrayerLabel before falling through
      const confirmedFn = serverNotificationsSource.match(
        /function buildConfirmedText\([^)]+\)[^{]*\{[\s\S]*?^}/m
      );
      expect(confirmedFn).not.toBeNull();
      const confirmedBody = confirmedFn![0];
      expect(confirmedBody).toContain('getPrayerLabel(position, language)');
    });

    it('AC-167-07: server buildConfirmedText returns prayer title for prayer positions', () => {
      // Check that prayer-specific titles exist in the server code
      expect(serverNotificationsSource).toContain("title: 'Oração Confirmada'");
      expect(serverNotificationsSource).toContain("title: 'Prayer Confirmed'");
      expect(serverNotificationsSource).toContain(
        "title: 'Oración Confirmada'"
      );
    });

    it('AC-167-08: server buildWithdrewText checks getPrayerLabel', () => {
      const withdrewFn = serverNotificationsSource.match(
        /function buildWithdrewText\([^)]+\)[^{]*\{[\s\S]*?^}/m
      );
      expect(withdrewFn).not.toBeNull();
      const withdrewBody = withdrewFn![0];
      expect(withdrewBody).toContain('getPrayerLabel(position, language)');
    });

    it('AC-167-08: server buildWithdrewText returns prayer withdrew title for prayer positions', () => {
      expect(serverNotificationsSource).toContain(
        "title: 'ATENÇÃO! Desistência de Oração'"
      );
      expect(serverNotificationsSource).toContain(
        "title: 'ATTENTION! Prayer Withdrew'"
      );
      expect(serverNotificationsSource).toContain(
        "title: '¡ATENCIÓN! Desistimiento de Oración'"
      );
    });

    it('AC-167-09: server buildConfirmedText preserves speech text for positions 1-3', () => {
      // The function should still have the ordinal + speech path
      expect(serverNotificationsSource).toContain(
        "title: 'Orador Confirmado'"
      );
      expect(serverNotificationsSource).toContain(
        "title: 'Speaker Confirmed'"
      );
      // Verify getOrdinal is still used for speech positions
      const confirmedFn = serverNotificationsSource.match(
        /function buildConfirmedText\([^)]+\)[^{]*\{[\s\S]*?^}/m
      );
      expect(confirmedFn![0]).toContain('getOrdinal(position, language)');
    });

    it('AC-167-09: server buildWithdrewText preserves speech text for positions 1-3', () => {
      expect(serverNotificationsSource).toContain(
        "title: 'ATENÇÃO! Desistência'"
      );
      expect(serverNotificationsSource).toContain(
        "title: 'ATTENTION! Speaker Withdrew'"
      );
      const withdrewFn = serverNotificationsSource.match(
        /function buildWithdrewText\([^)]+\)[^{]*\{[\s\S]*?^}/m
      );
      expect(withdrewFn![0]).toContain('getOrdinal(position, language)');
    });

    it('AC-167-09: server uses speech_position ?? 1 fallback for confirmed', () => {
      expect(serverNotificationsSource).toContain(
        'entry.speech_position ?? 1'
      );
    });

    it('server getPrayerLabel returns null via ?? null for non-prayer positions', () => {
      expect(serverNotificationsSource).toContain(
        'labels[language]?.[position] ?? null'
      );
    });
  });

  // -------------------------------------------------------------------------
  // AC-167-12: Existing tests for positions 1-3 verified
  // -------------------------------------------------------------------------

  describe('AC-167-12: existing speech position tests still valid', () => {
    it('confirmed text for position 2 (speech) is still correct in all languages', () => {
      for (const lang of languages) {
        const result = buildNotificationText('speaker_confirmed', lang, {
          name: 'Jane Doe',
          position: 2,
          date: '2026-03-08',
        });
        expect(result.body).toContain('Jane Doe');
        expect(result.body).toContain(getOrdinal(2, lang));
        expect(result.body).toContain('2026-03-08');
      }
    });

    it('withdrew text for position 3 (speech) is still correct in all languages', () => {
      for (const lang of languages) {
        const result = buildNotificationText('speaker_withdrew', lang, {
          name: 'Bob Wilson',
          position: 3,
          date: '2026-03-15',
        });
        expect(result.body).toContain('Bob Wilson');
        expect(result.body).toContain(getOrdinal(3, lang));
      }
    });
  });

  // -------------------------------------------------------------------------
  // Prayer text body content assertions (additional detail)
  // -------------------------------------------------------------------------

  describe('Prayer text body content (additional assertions)', () => {
    it('pt-BR confirmed prayer body uses "para a" (feminine article for oração)', () => {
      const result = buildNotificationText('speaker_confirmed', 'pt-BR', {
        name: 'Test',
        position: 0,
        date: '2026-03-08',
      });
      expect(result.body).toContain('para a oração de abertura');
    });

    it('en confirmed prayer body uses "to give the"', () => {
      const result = buildNotificationText('speaker_confirmed', 'en', {
        name: 'Test',
        position: 0,
        date: '2026-03-08',
      });
      expect(result.body).toContain('to give the opening prayer');
    });

    it('es confirmed prayer body uses "para la" (feminine article for oración)', () => {
      const result = buildNotificationText('speaker_confirmed', 'es', {
        name: 'Test',
        position: 0,
        date: '2026-03-08',
      });
      expect(result.body).toContain('para la oración de apertura');
    });

    it('pt-BR withdrew prayer body says "outra pessoa" not "outro orador"', () => {
      const result = buildNotificationText('speaker_withdrew', 'pt-BR', {
        name: 'Test',
        position: 4,
        date: '2026-03-08',
      });
      expect(result.body).toContain('outra pessoa');
      expect(result.body).not.toContain('outro orador');
    });

    it('en withdrew prayer body says "someone else" not "another speaker"', () => {
      const result = buildNotificationText('speaker_withdrew', 'en', {
        name: 'Test',
        position: 4,
        date: '2026-03-08',
      });
      expect(result.body).toContain('someone else');
      expect(result.body).not.toContain('another speaker');
    });

    it('es withdrew prayer body says "otra persona" not "otro orador"', () => {
      const result = buildNotificationText('speaker_withdrew', 'es', {
        name: 'Test',
        position: 4,
        date: '2026-03-08',
      });
      expect(result.body).toContain('otra persona');
      expect(result.body).not.toContain('otro orador');
    });
  });
});

// =============================================================================
// F168: Fix DebouncedTextInput flickering during typing (CR-241)
// =============================================================================

describe('F168: DebouncedTextInput focus tracking (CR-241)', () => {
  // -------------------------------------------------------------------------
  // AC-168-01: isFocusedRef added to track focus state
  // -------------------------------------------------------------------------

  it('AC-168-01: isFocusedRef is defined as useRef(false)', () => {
    expect(debouncedTextInputSource).toContain(
      'const isFocusedRef = useRef(false)'
    );
  });

  it('AC-168-01: isFocusedRef is declared after timerRef', () => {
    const timerIdx = debouncedTextInputSource.indexOf('const timerRef');
    const focusIdx = debouncedTextInputSource.indexOf('const isFocusedRef');
    expect(timerIdx).toBeGreaterThan(-1);
    expect(focusIdx).toBeGreaterThan(-1);
    expect(focusIdx).toBeGreaterThan(timerIdx);
  });

  // -------------------------------------------------------------------------
  // AC-168-02: Sync useEffect skips update when focused
  // -------------------------------------------------------------------------

  it('AC-168-02: sync useEffect guards setLocalValue with !isFocusedRef.current', () => {
    expect(debouncedTextInputSource).toContain('!isFocusedRef.current');
    // The guard pattern: if (!isFocusedRef.current) { setLocalValue(value); }
    const guardPattern =
      /if\s*\(\s*!isFocusedRef\.current\s*\)\s*\{[\s\S]*?setLocalValue\(value\)/;
    expect(debouncedTextInputSource).toMatch(guardPattern);
  });

  // -------------------------------------------------------------------------
  // AC-168-03: Sync useEffect applies update when NOT focused
  // -------------------------------------------------------------------------

  it('AC-168-03: sync useEffect still calls setLocalValue(value) when not focused', () => {
    // The useEffect with [value] dependency and setLocalValue(value)
    expect(debouncedTextInputSource).toContain('setLocalValue(value)');
    expect(debouncedTextInputSource).toContain('}, [value])');
  });

  // -------------------------------------------------------------------------
  // AC-168-04: onFocus handler sets isFocusedRef to true
  // -------------------------------------------------------------------------

  it('AC-168-04: handleFocus sets isFocusedRef.current = true', () => {
    expect(debouncedTextInputSource).toContain('const handleFocus');
    // Find the handleFocus callback
    const handleFocusMatch = debouncedTextInputSource.match(
      /const handleFocus\s*=\s*useCallback\(\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\},\s*\[[^\]]*\]\s*\)/
    );
    expect(handleFocusMatch).not.toBeNull();
    const handleFocusBody = handleFocusMatch![0];
    expect(handleFocusBody).toContain('isFocusedRef.current = true');
  });

  it('AC-168-04: handleFocus calls rest.onFocus?.(e)', () => {
    const handleFocusMatch = debouncedTextInputSource.match(
      /const handleFocus\s*=\s*useCallback\(\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\},\s*\[[^\]]*\]\s*\)/
    );
    expect(handleFocusMatch).not.toBeNull();
    expect(handleFocusMatch![0]).toContain('rest.onFocus?.(e)');
  });

  // -------------------------------------------------------------------------
  // AC-168-05: onBlur handler sets isFocusedRef to false and flushes
  // -------------------------------------------------------------------------

  it('AC-168-05: handleBlur sets isFocusedRef.current = false', () => {
    const handleBlurMatch = debouncedTextInputSource.match(
      /const handleBlur\s*=\s*useCallback\(\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\},\s*\[[^\]]*\]\s*\)/
    );
    expect(handleBlurMatch).not.toBeNull();
    expect(handleBlurMatch![0]).toContain('isFocusedRef.current = false');
  });

  it('AC-168-05: handleBlur calls flush()', () => {
    const handleBlurMatch = debouncedTextInputSource.match(
      /const handleBlur\s*=\s*useCallback\(\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\},\s*\[[^\]]*\]\s*\)/
    );
    expect(handleBlurMatch).not.toBeNull();
    expect(handleBlurMatch![0]).toContain('flush()');
  });

  it('AC-168-05: handleBlur calls rest.onBlur?.(e)', () => {
    const handleBlurMatch = debouncedTextInputSource.match(
      /const handleBlur\s*=\s*useCallback\(\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\},\s*\[[^\]]*\]\s*\)/
    );
    expect(handleBlurMatch).not.toBeNull();
    expect(handleBlurMatch![0]).toContain('rest.onBlur?.(e)');
  });

  it('AC-168-05: handleBlur sets isFocusedRef false BEFORE calling flush', () => {
    const handleBlurMatch = debouncedTextInputSource.match(
      /const handleBlur\s*=\s*useCallback\(\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\},\s*\[[^\]]*\]\s*\)/
    );
    expect(handleBlurMatch).not.toBeNull();
    const body = handleBlurMatch![0];
    const falseIdx = body.indexOf('isFocusedRef.current = false');
    const flushIdx = body.indexOf('flush()');
    expect(falseIdx).toBeGreaterThan(-1);
    expect(flushIdx).toBeGreaterThan(-1);
    expect(falseIdx).toBeLessThan(flushIdx);
  });

  // -------------------------------------------------------------------------
  // AC-168-06 through AC-168-08: TextInput JSX structure
  // -------------------------------------------------------------------------

  it('AC-168-06/07/08: TextInput has onFocus={handleFocus} and onBlur={handleBlur}', () => {
    // Verify the TextInput renders with both focus handlers
    expect(debouncedTextInputSource).toContain('onFocus={handleFocus}');
    expect(debouncedTextInputSource).toContain('onBlur={handleBlur}');
  });

  it('TextInput still has onChangeText={handleChangeText}', () => {
    expect(debouncedTextInputSource).toContain(
      'onChangeText={handleChangeText}'
    );
  });

  it('TextInput still has value={localValue}', () => {
    expect(debouncedTextInputSource).toContain('value={localValue}');
  });

  // -------------------------------------------------------------------------
  // AC-168-09: Unmount cleanup still saves pending changes
  // -------------------------------------------------------------------------

  it('AC-168-09: unmount cleanup useEffect saves pending changes', () => {
    // The cleanup effect checks latestValueRef vs savedValueRef
    expect(debouncedTextInputSource).toContain(
      'latestValueRef.current !== savedValueRef.current'
    );
    expect(debouncedTextInputSource).toContain(
      'onSaveRef.current(latestValueRef.current)'
    );
  });

  it('AC-168-09: unmount cleanup clears timer', () => {
    expect(debouncedTextInputSource).toContain('clearTimeout(timerRef.current)');
  });

  // -------------------------------------------------------------------------
  // EC-168-01: Multiple rapid saves (structural verification)
  // -------------------------------------------------------------------------

  it('EC-168-01: handleChangeText clears existing timer before setting new one', () => {
    const changeMatch = debouncedTextInputSource.match(
      /const handleChangeText\s*=\s*useCallback\(\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\},\s*\[[^\]]*\]\s*\)/
    );
    expect(changeMatch).not.toBeNull();
    const body = changeMatch![0];
    // Verify clearTimeout is called before setTimeout
    const clearIdx = body.indexOf('clearTimeout(timerRef.current)');
    const setIdx = body.indexOf('setTimeout(');
    expect(clearIdx).toBeGreaterThan(-1);
    expect(setIdx).toBeGreaterThan(-1);
    expect(clearIdx).toBeLessThan(setIdx);
  });

  // -------------------------------------------------------------------------
  // EC-168-03: External onFocus/onBlur handlers preserved
  // -------------------------------------------------------------------------

  it('EC-168-03: handleFocus dependency includes rest.onFocus', () => {
    const handleFocusMatch = debouncedTextInputSource.match(
      /const handleFocus\s*=\s*useCallback\(\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\},\s*\[([^\]]*)\]\s*\)/
    );
    expect(handleFocusMatch).not.toBeNull();
    expect(handleFocusMatch![1]).toContain('rest.onFocus');
  });

  it('EC-168-03: handleBlur dependency includes rest.onBlur', () => {
    const handleBlurMatch = debouncedTextInputSource.match(
      /const handleBlur\s*=\s*useCallback\(\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\},\s*\[([^\]]*)\]\s*\)/
    );
    expect(handleBlurMatch).not.toBeNull();
    expect(handleBlurMatch![1]).toContain('rest.onBlur');
  });

  // -------------------------------------------------------------------------
  // Component uses useRef not useState for focus tracking (ADR-117)
  // -------------------------------------------------------------------------

  it('uses useRef for focus tracking, not useState (ADR-117)', () => {
    expect(debouncedTextInputSource).toContain('useRef(false)');
    // Verify we do NOT have a useState for focus
    expect(debouncedTextInputSource).not.toContain('useState(false)');
  });
});

// =============================================================================
// F169: Add keyboard avoidance to ActorSelector modal (CR-242)
// =============================================================================

describe('F169: ActorSelector KeyboardAvoidingView (CR-242)', () => {
  // -------------------------------------------------------------------------
  // AC-169-01: KeyboardAvoidingView wraps sheet content
  // -------------------------------------------------------------------------

  it('AC-169-01: KeyboardAvoidingView is imported from react-native', () => {
    expect(actorSelectorSource).toContain('KeyboardAvoidingView');
    // Verify it's imported in the react-native import block
    const importMatch = actorSelectorSource.match(
      /import\s*\{[^}]*KeyboardAvoidingView[^}]*\}\s*from\s*'react-native'/
    );
    expect(importMatch).not.toBeNull();
  });

  it('AC-169-01: Platform is imported from react-native', () => {
    const importMatch = actorSelectorSource.match(
      /import\s*\{[^}]*Platform[^}]*\}\s*from\s*'react-native'/
    );
    expect(importMatch).not.toBeNull();
  });

  it('AC-169-01: KeyboardAvoidingView wraps content inside the sheet', () => {
    // KeyboardAvoidingView should appear after the sheet View opening and
    // before the closing </KeyboardAvoidingView> before the sheet closing
    expect(actorSelectorSource).toContain('<KeyboardAvoidingView');
    expect(actorSelectorSource).toContain('</KeyboardAvoidingView>');

    // The opening KAV should appear after the sheet View
    const sheetIdx = actorSelectorSource.indexOf('styles.sheet');
    const kavIdx = actorSelectorSource.indexOf('<KeyboardAvoidingView');
    expect(sheetIdx).toBeGreaterThan(-1);
    expect(kavIdx).toBeGreaterThan(-1);
    expect(kavIdx).toBeGreaterThan(sheetIdx);
  });

  it('AC-169-01: KeyboardAvoidingView has style={{ flex: 1 }}', () => {
    expect(actorSelectorSource).toMatch(
      /<KeyboardAvoidingView[\s\S]*?style=\{\{\s*flex:\s*1\s*\}\}/
    );
  });

  // -------------------------------------------------------------------------
  // AC-169-02: iOS uses behavior='padding'
  // -------------------------------------------------------------------------

  it('AC-169-02: behavior uses Platform.OS === ios conditional', () => {
    expect(actorSelectorSource).toMatch(
      /behavior=\{Platform\.OS\s*===\s*'ios'\s*\?\s*'padding'\s*:\s*undefined\}/
    );
  });

  // -------------------------------------------------------------------------
  // AC-169-03: Android uses undefined behavior
  // -------------------------------------------------------------------------

  it('AC-169-03: Android uses undefined behavior (conditional ternary)', () => {
    // Already covered by AC-169-02 check - the ternary returns undefined for non-iOS
    const behaviorMatch = actorSelectorSource.match(
      /behavior=\{Platform\.OS\s*===\s*'ios'\s*\?\s*'padding'\s*:\s*undefined\}/
    );
    expect(behaviorMatch).not.toBeNull();
  });

  // -------------------------------------------------------------------------
  // AC-169-04/05/06: FlatList and other elements are within KAV
  // -------------------------------------------------------------------------

  it('AC-169-04/05/06: FlatList is inside KeyboardAvoidingView', () => {
    const kavStart = actorSelectorSource.indexOf('<KeyboardAvoidingView');
    const kavEnd = actorSelectorSource.indexOf('</KeyboardAvoidingView>');
    // Use regex to find JSX <FlatList (with newline or space after), not type annotation useRef<FlatList
    const flatListMatch = actorSelectorSource.match(/\n\s*<FlatList\b/);
    expect(kavStart).toBeGreaterThan(-1);
    expect(kavEnd).toBeGreaterThan(-1);
    expect(flatListMatch).not.toBeNull();
    const flatListIdx = flatListMatch!.index!;
    // FlatList should be between KAV open and close tags
    expect(flatListIdx).toBeGreaterThan(kavStart);
    expect(flatListIdx).toBeLessThan(kavEnd);
  });

  it('AC-169-05: add input/button is inside KeyboardAvoidingView', () => {
    const kavStart = actorSelectorSource.indexOf('<KeyboardAvoidingView');
    const kavEnd = actorSelectorSource.indexOf('</KeyboardAvoidingView>');
    // The "Add" button text
    const addBtnIdx = actorSelectorSource.indexOf("t('common.add')");
    expect(addBtnIdx).toBeGreaterThan(-1);
    expect(addBtnIdx).toBeGreaterThan(kavStart);
    expect(addBtnIdx).toBeLessThan(kavEnd);
  });

  it('AC-169-06: SearchInput is inside KeyboardAvoidingView', () => {
    const kavStart = actorSelectorSource.indexOf('<KeyboardAvoidingView');
    const kavEnd = actorSelectorSource.indexOf('</KeyboardAvoidingView>');
    const searchIdx = actorSelectorSource.indexOf('<SearchInput');
    expect(searchIdx).toBeGreaterThan(-1);
    expect(searchIdx).toBeGreaterThan(kavStart);
    expect(searchIdx).toBeLessThan(kavEnd);
  });

  // -------------------------------------------------------------------------
  // AC-169-07: Modal appearance unchanged (sheet height, handle bar, etc.)
  // -------------------------------------------------------------------------

  it('AC-169-07: sheet height is still SCREEN_HEIGHT * 0.67', () => {
    expect(actorSelectorSource).toContain('SCREEN_HEIGHT * 0.67');
  });

  it('AC-169-07: handle bar is still present inside KAV', () => {
    const kavStart = actorSelectorSource.indexOf('<KeyboardAvoidingView');
    const kavEnd = actorSelectorSource.indexOf('</KeyboardAvoidingView>');
    const handleBarIdx = actorSelectorSource.indexOf('styles.handleBar');
    expect(handleBarIdx).toBeGreaterThan(-1);
    expect(handleBarIdx).toBeGreaterThan(kavStart);
    expect(handleBarIdx).toBeLessThan(kavEnd);
  });

  it('AC-169-07: Modal still uses transparent and slide animation', () => {
    expect(actorSelectorSource).toContain('transparent');
    expect(actorSelectorSource).toContain('animationType="slide"');
  });

  // -------------------------------------------------------------------------
  // EC-169-01/02: Short list and large screens (structural check)
  // -------------------------------------------------------------------------

  it('EC-169-01: FlatList still has keyboardShouldPersistTaps="handled"', () => {
    expect(actorSelectorSource).toContain(
      'keyboardShouldPersistTaps="handled"'
    );
  });

  // -------------------------------------------------------------------------
  // EC-169-03: Keyboard dismissed (structural - onBlur in inline edit)
  // -------------------------------------------------------------------------

  it('EC-169-03: inline edit TextInput has onBlur handler', () => {
    // The inline edit TextInput triggers handleEditSave on blur
    expect(actorSelectorSource).toContain('onBlur={() => handleEditSave(');
  });

  // -------------------------------------------------------------------------
  // No keyboardVerticalOffset (ADR-118)
  // -------------------------------------------------------------------------

  it('no keyboardVerticalOffset prop (ADR-118)', () => {
    expect(actorSelectorSource).not.toContain('keyboardVerticalOffset');
  });
});
