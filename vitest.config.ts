import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Alias the (Flow-syntax, unparseable) `react-native` package to a lightweight test stub so
// components can be rendered with react-test-renderer under the node environment. Exact-match
// regex only — does not affect `react-native-web` or `react-native/...` subpath imports.
const reactNativeStub = path.resolve('src/__tests__/stubs/react-native.tsx');
const reactNativeSvgStub = path.resolve('src/__tests__/stubs/react-native-svg.tsx');

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/__tests__/setup.ts'],
    alias: [
      { find: /^react-native$/, replacement: reactNativeStub },
      { find: /^react-native-svg$/, replacement: reactNativeSvgStub },
    ],
  },
});
