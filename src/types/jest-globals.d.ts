/**
 * `@types/jest` (29.5.x) declares `describe`/`it`/`expect` and the `jest` *namespace*, but not
 * the global `jest` *object*. `@jest/globals` is what types it. Bridging it here keeps the
 * ~115 test files on the bare global (`jest.mock`, `jest.fn`) without a per-file import.
 */
declare global {
  var jest: (typeof import('@jest/globals'))['jest'];
}

export {};
