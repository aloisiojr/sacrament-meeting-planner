/**
 * DebouncedTextInput: TextInput wrapper that debounces save calls.
 * Saves on blur and after a configurable delay (default 800ms).
 * Prevents excessive mutation calls during typing (CR-27).
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { TextInput, type TextInputProps } from 'react-native';

export interface DebouncedTextInputProps extends Omit<TextInputProps, 'onChangeText' | 'value'> {
  /** The current persisted value. */
  value: string;
  /** Called with the debounced value when save triggers. */
  onSave: (text: string) => void;
  /** Debounce delay in ms. Default: 800. */
  delay?: number;
}

export function DebouncedTextInput({
  value,
  onSave,
  delay = 800,
  ...rest
}: DebouncedTextInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestValueRef = useRef(localValue);
  const onSaveRef = useRef(onSave);
  const savedValueRef = useRef(value);

  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);
  useEffect(() => { savedValueRef.current = value; }, [value]);

  // Sync local value when external value changes (e.g., from server)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (latestValueRef.current !== value) {
      onSave(latestValueRef.current);
    }
  }, [value, onSave]);

  const handleChangeText = useCallback(
    (text: string) => {
      setLocalValue(text);
      latestValueRef.current = text;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        onSave(text);
        timerRef.current = null;
      }, delay);
    },
    [delay, onSave]
  );

  const handleBlur = useCallback(
    (e: Parameters<NonNullable<TextInputProps['onBlur']>>[0]) => {
      flush();
      rest.onBlur?.(e);
    },
    [flush, rest.onBlur]
  );

  // Cleanup on unmount - flush pending changes
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (latestValueRef.current !== savedValueRef.current) {
        onSaveRef.current(latestValueRef.current);
      }
    };
  }, []);

  return (
    <TextInput
      {...rest}
      value={localValue}
      onChangeText={handleChangeText}
      onBlur={handleBlur}
    />
  );
}
