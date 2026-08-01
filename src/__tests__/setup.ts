/**
 * Jest setup — runs after the test framework is installed, for every platform project.
 *
 * Principle: mock ONLY what genuinely cannot run under the test runtime, and prefer the
 * library's own official mock over a hand-written one. The previous vitest setup hand-rolled
 * a 73-line `react-native` replacement, and that stub is exactly what let a large share of the
 * UI assertions pass while proving nothing. Real components render here; do not re-stub them.
 */

// AsyncStorage: native module, no JS fallback. Official mock from the package itself.
jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// NetInfo: native module. Official mock; individual tests override per-scenario.
jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock')
);

// Reanimated: worklets require the native runtime. Official mock.
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// Gesture Handler: installs its own jest globals.
require('react-native-gesture-handler/jestSetup');
