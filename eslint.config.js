// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", "coverage/*"],
  },
  {
    // Test-file exceptions. These are jest mechanics, not style drift.
    files: ["src/__tests__/**/*.{ts,tsx}"],
    rules: {
      // babel-plugin-jest-hoist lifts jest.mock() factories above the imports, so a factory
      // cannot close over an imported binding — `require()` inside the factory is the only way
      // to reach React or a real module. Same for jest.requireActual.
      "@typescript-eslint/no-require-imports": "off",
      // Helper signatures were kept during the RNTL migration so the assertions in each test body
      // stayed untouched; the leading parameter is now unused and prefixed with `_`.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // jest.mock() calls are hoisted above imports, so imports legitimately appear after them.
      "import/first": "off",
    },
  },
]);
