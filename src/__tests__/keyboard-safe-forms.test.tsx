/**
 * Every form screen keeps its scrollable content inside a KeyboardAvoider
 * (specs/keyboard-safe-form-fields.md).
 *
 * Structural on purpose. Jest has no virtual keyboard, so "the field ended up visible" is not
 * observable here — what IS worth pinning is that the container exists and that nobody quietly
 * drops it in a later refactor. Proving AC1 is a device check, listed in the spec.
 *
 * The component is rendered directly rather than through each screen: mounting eight screens would
 * mean eight sets of Supabase/router/i18n mocks to assert one prop each, and the screens' own
 * suites already cover their behaviour. The per-screen wiring is pinned by the nesting test in
 * v2-designations-edit-screen.test.tsx.
 */
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { render, screen, within } from '@testing-library/react-native';

import { KeyboardAvoider } from '../components/KeyboardAvoider';

/*
 * `behavior` is deliberately NOT asserted: KeyboardAvoidingView consumes it internally and the
 * host View never receives it, so there is nothing observable to check. The iOS/Android choice
 * lives in one component precisely so it can be changed in one place after a device check.
 */
describe('KeyboardAvoider', () => {
  it('wraps its children so the form can shrink above the keyboard', async () => {
    await render(
      <KeyboardAvoider testID="avoider">
        <Text testID="field">campo</Text>
      </KeyboardAvoider>
    );

    const avoider = screen.getByTestId('avoider');
    expect(within(avoider).getByTestId('field')).toBeTruthy();
  });

  it('fills the available space, or it would collapse and hide the form', async () => {
    await render(
      <KeyboardAvoider testID="avoider">
        <Text>x</Text>
      </KeyboardAvoider>
    );

    // KeyboardAvoidingView composes our array with its own, so the prop is nested — flatten it.
    expect(StyleSheet.flatten(screen.getByTestId('avoider').props.style).flex).toBe(1);
  });

});
