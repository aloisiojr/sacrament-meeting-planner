/**
 * AttendanceBlock: a small, discreet 52×52 tile shown BELOW the DateBlock on past Sundays to
 * record the sacrament-meeting attendance ("Frequência da Reunião Sacramental").
 *
 * Matches the DateBlock footprint (52×52, rounded) but is deliberately understated — a hairline
 * border with muted text — so it reads as a secondary, editable field rather than the primary date.
 * The value is always shown zero-padded to 3 digits (null → "000", 7 → "007"). Tapping turns the
 * number into an inline TextInput (digits only, max 3, clamped 0..999); on blur/submit it parses to
 * an int (empty → null) and calls `onChange`. Reads theme internally (matching the sibling tiles).
 */

import React, { useState, useCallback } from 'react';
import { Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';

export interface AttendanceBlockProps {
  /** Current attendance count; null => not recorded (rendered as "000"). */
  value: number | null;
  /** Called with the parsed int (or null when cleared) on blur/submit. */
  onChange: (v: number | null) => void;
  /** When true the tile is read-only (no inline editing). */
  disabled?: boolean;
  /** Optional testID for E2E / unit targeting (input gets `${testID}-input`). */
  testID?: string;
}

/** Zero-pad to 3 digits: null → "000", 7 → "007", 85 → "085". */
function pad3(value: number | null): string {
  const n = value == null ? 0 : value;
  return String(n).padStart(3, '0');
}

export function AttendanceBlock({ value, onChange, disabled = false, testID }: AttendanceBlockProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const startEditing = useCallback(() => {
    if (disabled) return;
    setDraft(value == null ? '' : String(value));
    setEditing(true);
  }, [disabled, value]);

  const handleChangeText = useCallback((text: string) => {
    // Strip non-digits and cap at 3 digits.
    const digits = text.replace(/[^0-9]/g, '').slice(0, 3);
    setDraft(digits);
  }, []);

  const commit = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed === '') {
      onChange(null);
    } else {
      const parsed = parseInt(trimmed, 10);
      const clamped = Math.max(0, Math.min(999, Number.isNaN(parsed) ? 0 : parsed));
      onChange(clamped);
    }
    setEditing(false);
  }, [draft, onChange]);

  return (
    <Pressable
      style={[styles.block, { borderColor: colors.border }]}
      onPress={editing || disabled ? undefined : startEditing}
      accessibilityRole="button"
      accessibilityLabel={t('agenda.attendanceLabel')}
      testID={testID}
    >
      {editing ? (
        <TextInput
          style={[styles.number, styles.input, { color: colors.textSecondary }]}
          value={draft}
          onChangeText={handleChangeText}
          onBlur={commit}
          onSubmitEditing={commit}
          keyboardType="number-pad"
          maxLength={3}
          autoFocus
          testID={testID ? `${testID}-input` : undefined}
        />
      ) : (
        <Text style={[styles.number, { color: colors.textSecondary }]} testID={testID ? `${testID}-text` : undefined}>
          {pad3(value)}
        </Text>
      )}
      <Text style={[styles.label, { color: colors.textTertiary }]}>
        {t('agenda.attendanceLabel')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  block: {
    width: 52,
    height: 52,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Sized so 3 digits are ~the same width as the "Freq" label; both stack, centered.
  number: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 20,
  },
  input: {
    textAlign: 'center',
    minWidth: 40,
    padding: 0,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 13,
    textTransform: 'uppercase',
  },
});
