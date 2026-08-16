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
 *
 * USELESS on a SHORT, TOP-ALIGNED form. Shrinking the viewport cannot move content that is anchored
 * to the top, and the on-screen gap works out to ,
 * which does not contain the offset at all — so no value of it changes anything. Such a screen has
 * to SCROLL the field instead; see the comment on handleFieldFocus in app/designations/[date].tsx.
 * The (auth) screens escape this because their content is centred with flexGrow, so it tracks the
 * viewport.
 *
 * On iOS the padding KeyboardAvoidingView computes is already exactly the keyboard height — the
 * gap problem is elsewhere: RN scrolls the focused field FLUSH against the keyboard on purpose
 * ("pulling the content down so that the target component's bottom meets the keyboard's top",
 * ScrollView.js), so a 1pt border ends up sitting on the boundary. `keyboardVerticalOffset` is
 * purely additive in `_relativeKeyboardHeight` (padding = keyboardHeight + offset), so it buys
 * exactly this many points of breathing room. The RN docs describe the prop as a screen-geometry
 * correction; using it as a gap knob is justified by the source arithmetic, not by that wording —
 * hence this note.
 *
 * Android is deliberately left at 0: the window already resizes (softwareKeyboardLayoutMode), and
 * an offset there would compound the double-jump warned about above.
 *
 * Do NOT also set `automaticallyAdjustKeyboardInsets` on the ScrollView: the native inset is
 * measured before this padding applies, so the two double-count and leave a dead strip.
 */

/** Breathing room between the focused field and the keyboard. Single knob — tune here. */
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
