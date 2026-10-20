/**
 * DebouncedTextInput: TextInput wrapper that debounces save calls.
 * Saves on blur and after a configurable delay (default 800ms).
 * Prevents excessive mutation calls during typing.
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
  onFocus,
  onBlur,
  ...rest
}: DebouncedTextInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFocusedRef = useRef(false);
  const latestValueRef = useRef(localValue);
  const onSaveRef = useRef(onSave);
  const savedValueRef = useRef(value);

  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);
  useEffect(() => { savedValueRef.current = value; }, [value]);

  // Sync local value when external value changes (e.g., from server/realtime),
  // but only when the input is NOT focused (to prevent flickering during typing).
  // Also advance latestValueRef so a later blur/unmount flush doesn't revert the newer
  // external value back to the stale one (concurrent-edit data loss).
  useEffect(() => {
    if (!isFocusedRef.current) {
      setLocalValue(value);
      latestValueRef.current = value;
    }
  }, [value]);

  // EST-25: ONE flush path, ref-driven. Timer, blur and unmount all land here. The
  // persisted `value` (tracked in savedValueRef) decides whether there is anything to
  // save, and a successful emit advances savedValueRef immediately — so a later blur or
  // unmount cannot re-save the same text while the parent has not re-rendered yet.
  const flushPending = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (latestValueRef.current !== savedValueRef.current) {
      savedValueRef.current = latestValueRef.current;
      onSaveRef.current(latestValueRef.current);
    }
  }, []);

  const handleChangeText = useCallback(
    (text: string) => {
      setLocalValue(text);
      latestValueRef.current = text;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(flushPending, delay);
    },
    [delay, flushPending]
  );

  const handleFocus = useCallback(
    (e: Parameters<NonNullable<TextInputProps['onFocus']>>[0]) => {
      isFocusedRef.current = true;
      onFocus?.(e);
    },
    [onFocus]
  );

  const handleBlur = useCallback(
    (e: Parameters<NonNullable<TextInputProps['onBlur']>>[0]) => {
      isFocusedRef.current = false;
      flushPending();
      onBlur?.(e);
    },
    [flushPending, onBlur]
  );

  // Cleanup on unmount — flush the pending edit through the same path.
  useEffect(() => {
    return () => {
      flushPending();
    };
  }, [flushPending]);

  return (
    <TextInput
      {...rest}
      value={localValue}
      onChangeText={handleChangeText}
      onFocus={handleFocus}
      onBlur={handleBlur}
    />
  );
}
