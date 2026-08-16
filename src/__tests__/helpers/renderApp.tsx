import { renderRouter } from 'expo-router/testing-library';

/**
 * Mount an in-memory expo-router tree for navigation tests.
 *
 * WHY THIS WRAPPER EXISTS — do not "simplify" it away. expo-router 57.0.9's `renderRouter` was
 * written against @testing-library/react-native v13, whose `render` was synchronous. RNTL v14 made
 * `render` async, and `renderRouter` does not await it (see its `build/testing-library/index.js`).
 * So it hands back an un-awaited Promise: nothing mounts, `screen` stays unbound ("`render`
 * function has not been called"), and `router.push`/`router.back` silently no-op or throw
 * "Attempted to navigate before mounting the Root Layout component".
 *
 * Awaiting it mounts the tree and binds `screen`. The awaited value is RNTL's result object, which
 * lacks getPathname()/getSegments(), so those are re-attached here — and because RNTL stored this
 * same object as `screen`, mutating it is also what makes `expect(screen).toHavePathname()` work.
 *
 * Note: `return handle` cannot replace the Object.assign — an async function adopts a returned
 * thenable and you would get the bare RNTL result back.
 *
 * Also: `renderRouter` calls jest.useFakeTimers() and never restores it, so callers need
 * `afterEach(() => jest.useRealTimers())`. And `testRouter` is unusable for the same upstream
 * reason — drive navigation with `await act(async () => { router.x(); })`.
 */
export async function renderApp(
  routes: Parameters<typeof renderRouter>[0],
  options?: Parameters<typeof renderRouter>[1]
) {
  const handle = renderRouter(routes, options) as unknown as Promise<Record<string, unknown>> & {
    getPathname(): string;
    getSegments(): string[];
    getSearchParams(): Record<string, string | string[]>;
    getPathnameWithParams(): string;
    getRouterState(): unknown;
  };
  const result = await handle;
  return Object.assign(result, {
    getPathname: handle.getPathname,
    getSegments: handle.getSegments,
    getSearchParams: handle.getSearchParams,
    getPathnameWithParams: handle.getPathnameWithParams,
    getRouterState: handle.getRouterState,
  });
}
