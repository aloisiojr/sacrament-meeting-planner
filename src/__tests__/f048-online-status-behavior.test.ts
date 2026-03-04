/**
 * F048: OnlineStatusContext Behavioral Tests
 *
 * Tests OnlineStatusProvider and useOnlineStatus hook behavior.
 * Verifies context default values, prop passing, and re-render on change.
 */

import { describe, it, expect } from 'vitest';
import React from 'react';
import TestRenderer from 'react-test-renderer';
import { OnlineStatusProvider, useOnlineStatus } from '../contexts/OnlineStatusContext';

const { act } = TestRenderer;

/**
 * Helper to render a hook within OnlineStatusProvider.
 */
function renderOnlineStatusHook(isOnline?: boolean) {
  const resultRef = { current: false };

  function TestComponent() {
    resultRef.current = useOnlineStatus();
    return null;
  }

  const element = isOnline !== undefined
    ? React.createElement(OnlineStatusProvider, { isOnline }, React.createElement(TestComponent))
    : React.createElement(TestComponent); // no provider

  let renderer: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(element);
  });

  return {
    result: resultRef,
    update: (newIsOnline: boolean) => {
      act(() => {
        renderer.update(
          React.createElement(OnlineStatusProvider, { isOnline: newIsOnline }, React.createElement(TestComponent))
        );
      });
    },
    unmount: () => {
      act(() => {
        renderer.unmount();
      });
    },
  };
}

describe('F048: OnlineStatusContext Behavioral Tests', () => {
  describe('useOnlineStatus default behavior', () => {
    it('returns true when no provider is present (default context value)', () => {
      const { result } = renderOnlineStatusHook();
      expect(result.current).toBe(true);
    });
  });

  describe('useOnlineStatus with provider', () => {
    it('returns true when provider has isOnline=true', () => {
      const { result } = renderOnlineStatusHook(true);
      expect(result.current).toBe(true);
    });

    it('returns false when provider has isOnline=false', () => {
      const { result } = renderOnlineStatusHook(false);
      expect(result.current).toBe(false);
    });
  });

  describe('Re-render on isOnline change', () => {
    it('updates from true to false when isOnline changes', () => {
      const { result, update } = renderOnlineStatusHook(true);
      expect(result.current).toBe(true);

      update(false);
      expect(result.current).toBe(false);
    });

    it('updates from false to true when isOnline changes', () => {
      const { result, update } = renderOnlineStatusHook(false);
      expect(result.current).toBe(false);

      update(true);
      expect(result.current).toBe(true);
    });

    it('does not change when updated with same value', () => {
      const { result, update } = renderOnlineStatusHook(true);
      expect(result.current).toBe(true);

      update(true);
      expect(result.current).toBe(true);
    });
  });

  describe('useOnlineStatus return type', () => {
    it('returns a boolean (not an object)', () => {
      const { result } = renderOnlineStatusHook(true);
      expect(typeof result.current).toBe('boolean');
    });
  });
});
