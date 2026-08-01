/**
 * Jest configuration — replaces the previous vitest setup.
 *
 * Why the change: vitest ran under `environment: 'node'` with `react-native` aliased to a
 * 73-line hand-written stub, because vitest/esbuild cannot parse react-native's Flow syntax.
 * That stub silently ignored `Modal.visible`, `Pressable.disabled` and `FlatList.renderItem`,
 * and omitted Linking/Share/useColorScheme/UIManager entirely — so whole screens could not be
 * rendered at all and a large share of the UI assertions could not fail.
 *
 * jest-expo runs against the real React Native, per platform. `react-test-renderer` is gone:
 * React 19 deprecated it, and @testing-library/react-native is the supported replacement.
 */

/** Packages that ship untranspiled ESM/Flow and must be transformed. */
const transformIgnorePatterns = [
  'node_modules/(?!((jest-)?react-native|@react-native(-community)?)' +
    '|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*' +
    '|react-navigation|@react-navigation/.*' +
    '|@testing-library/react-native' +
    '|react-native-svg|react-native-webview|react-native-reanimated|react-native-worklets' +
    '|react-native-gesture-handler|react-native-safe-area-context|react-native-screens' +
    '|react-native-draggable-flatlist' +
    ')',
];

/** Shared by every platform project. */
const common = {
  testMatch: ['<rootDir>/src/**/*.test.ts', '<rootDir>/src/**/*.test.tsx'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns,
  clearMocks: true,
};

module.exports = {
  // Watchman is present on this machine but not usable (fchmod EPERM on its state dir),
  // and jest's haste map hard-errors instead of falling back. Use node crawling.
  watchman: false,
  projects: [
    { ...common, preset: 'jest-expo/ios', displayName: 'ios' },
    { ...common, preset: 'jest-expo/android', displayName: 'android' },
    { ...common, preset: 'jest-expo/web', displayName: 'web' },
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/__tests__/**',
    '!src/**/*.d.ts',
  ],
  coverageReporters: ['text-summary', 'json-summary', 'lcov'],
};
