import React from 'react';
import { KeyboardAvoidingView, Platform, type ViewStyle } from 'react-native';

/**
 * Wraps a scrollable form so the virtual keyboard cannot cover its fields
 * (specs/keyboard-safe-form-fields.md).
 *
 * One component instead of the same Platform check copied into every screen: the Android side of
 * this is the fragile half — `behavior="height"` can fight the native `adjustResize` that
 * `app.json`'s `softwareKeyboardLayoutMode: 'resize'` turns on, producing a double jump. If that
 * shows up on a device, this is the single place to change it.
 *
 * The (auth) screens predate this and inline the same pattern; they work, so they were left alone.
 */
export function KeyboardAvoider({
  children,
  testID,
  style,
}: {
  children: React.ReactNode;
  testID?: string;
  style?: ViewStyle;
}) {
  return (
    <KeyboardAvoidingView
      testID={testID}
      style={[{ flex: 1 }, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {children}
    </KeyboardAvoidingView>
  );
}
