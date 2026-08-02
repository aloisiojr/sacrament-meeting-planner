/**
 * Composed jest resolver: react-native-worklets' rules layered on top of React Native's.
 *
 * Reanimated 4 delegates its worklet runtime to react-native-worklets, whose package resolves to
 * native-only entry points by default. Under jest that entry dies on `loadUnpackers`, which takes
 * `react-native-reanimated` down with it — and with it every component that renders an
 * `Animated.View` (AccordionCard, SwipeableCard, the modals).
 *
 * react-native-worklets ships `jest/resolver.js` to fix exactly this by dropping `.native.*`
 * extensions inside its own package, but setting it as jest's `resolver` would replace the one
 * jest-expo installs (@react-native/jest-preset), losing React Native's platform resolution.
 * So: apply the worklets extension filter, then delegate to React Native's resolver.
 */
const rnResolver = require('@react-native/jest-preset/jest/resolver');

/** @type {import('jest-resolve').SyncResolver} */
module.exports = (request, options) => {
  const insideWorklets =
    options.basedir.includes('react-native-worklets') || request.includes('react-native-worklets');

  const nextOptions = insideWorklets
    ? {
        ...options,
        extensions: options.extensions?.filter((ext) => !ext.includes('native')),
      }
    : options;

  return rnResolver(request, nextOptions);
};
