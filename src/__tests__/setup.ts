/**
 * Jest setup — runs after the test framework is installed, for every platform project.
 *
 * Principle: mock ONLY what genuinely cannot run under the test runtime, and prefer the
 * library's own official mock over a hand-written one. The previous vitest setup hand-rolled
 * a 73-line `react-native` replacement, and that stub is exactly what let a large share of the
 * UI assertions pass while proving nothing. Real components render here; do not re-stub them.
 */

// AsyncStorage: native module, no JS fallback. Official mock from the package itself.
// The mock is CommonJS (`module.exports = asMock`) while the app imports the default export,
// so it has to be re-wrapped as an ES module.
jest.mock('@react-native-async-storage/async-storage', () => {
  const asMock = require('@react-native-async-storage/async-storage/jest/async-storage-mock');
  return { __esModule: true, default: asMock, ...asMock };
});

// NetInfo: native module. Official mock; individual tests override per-scenario.
jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock')
);

// Reanimated is intentionally NOT mocked. Its shipped `react-native-reanimated/mock` is broken in
// 4.5.1 — mock.js requires './src/mock', which the published package does not contain, and the
// require dies on `loadUnpackers`. The real module works under babel-preset-expo (which carries
// the reanimated plugin), and using it means Animated.View / LinearTransition actually exist, so
// components like AccordionCard render instead of throwing "Element type is invalid".

// Gesture Handler: installs its own jest globals.
require('react-native-gesture-handler/jestSetup');

// RNTL >= 12.4 registers its element matchers (toBeDisabled, toBeOnTheScreen, ...) from the main
// entry point, so no extend-expect import is needed here.
