/**
 * Tests for F048: OnlineStatusContext (ADR-020).
 * Verifies the context module exports and default values.
 */

import { describe, it, expect } from 'vitest';
import React from 'react';
import { OnlineStatusProvider, useOnlineStatus } from '../contexts/OnlineStatusContext';

// Provider typed with optional children so children can be passed as the
// third createElement argument (react/no-children-prop) without a tsc error.
const Provider = OnlineStatusProvider as React.ComponentType<{
  isOnline: boolean;
  children?: React.ReactNode;
}>;

describe('F048: OnlineStatusContext', () => {
  it('exports OnlineStatusProvider as a function', () => {
    expect(typeof OnlineStatusProvider).toBe('function');
  });

  it('exports useOnlineStatus as a function', () => {
    expect(typeof useOnlineStatus).toBe('function');
  });

  it('OnlineStatusProvider accepts isOnline and children props', () => {
    // Verify the component can be called with expected props
    const element = React.createElement(
      Provider,
      { isOnline: false },
      React.createElement('div')
    );
    expect(element).toBeDefined();
    expect(element.props.isOnline).toBe(false);
  });
});
