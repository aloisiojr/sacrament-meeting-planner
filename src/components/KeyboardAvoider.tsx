import React from 'react';
import { KeyboardAvoidingView, Platform, type ViewStyle } from 'react-native';

/**
 * Wraps a scrollable form so the keyboard cannot leave its fields unreachable
 * (specs/keyboard-safe-form-fields.md).
 *
 * WHAT THIS DOES, PRECISELY: it shrinks the scrollable area by the keyboard's height, so every
 * field stays REACHABLE BY SCROLLING. It does NOT move a focused field on its own. React Native has
 * no automatic scroll-to-focused-input unless `automaticallyAdjustKeyboardInsets` is set on the
 * ScrollView (the flush-scroll code in ScrollView.js is an imperative API nothing calls), and that
 * prop must not be combined with this wrapper: the native inset is measured before this padding
 * commits, so the two double-count and leave a dead strip.
 *
 * Consequences, by screen shape:
 *   - Long / overflowing form → this is enough; the user scrolls.
 *   - Short, TOP-ALIGNED form → this does NOTHING. Shrinking the viewport cannot move content
 *     anchored to the top, and the on-screen gap works out to
 *     `height - keyboardHeight - fieldBottom + scrollOffset`, which holds no term this component
 *     controls. Such a screen must scroll the field itself — see `handleFieldFocus` in
 *     `app/designations/[date].tsx`, which uses `automaticallyAdjustKeyboardInsets` + `scrollToEnd`
 *     INSTEAD of this wrapper.
 *   - Centred form → works, because `flexGrow: 1` + `justifyContent: 'center'` makes the content
 *     track the viewport. That is why the `(auth)` screens are fine; they inline their own
 *     KeyboardAvoidingView and were left alone.
 *
 * `keyboardVerticalOffset` is additive in `_relativeKeyboardHeight` (padding = keyboardHeight +
 * offset), so it enlarges the shrink. That buys visible clearance only where the content actually
 * moves — on a top-aligned form it changes nothing, which is why raising it from 24 to 40 had no
 * effect on the designations screen. Android stays at 0: the window already resizes
 * (`softwareKeyboardLayoutMode: 'resize'`), and an offset there would compound a double jump with
 * `behavior="height"`.
 *
 * One component rather than the same Platform check in every screen, so the Android half — the
 * fragile one — has a single place to change.
 */

/** Extra clearance on iOS, for screens whose content actually moves. Single knob — tune here. */
const IOS_KEYBOARD_GAP = 40;

export function KeyboardAvoider({
  children,
  testID,
  style,
  keyboardGap = IOS_KEYBOARD_GAP,
}: {
  children: React.ReactNode;
  testID?: string;
  style?: ViewStyle;
  /** Points of clearance above the keyboard; iOS only. */
  keyboardGap?: number;
}) {
  return (
    <KeyboardAvoidingView
      testID={testID}
      style={[{ flex: 1 }, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? keyboardGap : 0}
    >
      {children}
    </KeyboardAvoidingView>
  );
}
