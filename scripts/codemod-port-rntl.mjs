/**
 * One-shot codemod: port a react-test-renderer suite to @testing-library/react-native.
 *
 * Only touches HOW the component is rendered and HOW events are delivered — never the
 * assertions. Helper signatures are preserved (their first parameter becomes unused) so each
 * test body stays byte-identical apart from `await`.
 *
 * Handles the shape shared by this repo's render suites:
 *   act(() => { renderer = TestRenderer.create(<X ... />) })   -> await rtlRender(<X ... />)
 *   node/nodes(renderer, id) via root.findAll(testID)          -> screen.getByTestId / queryAllByTestId
 *   act(() => node(...).props.onPress())                       -> await fireEvent.press(...)
 *
 * RNTL 14 makes render/fireEvent/act async, so call sites gain `await` and `it` callbacks
 * become async.
 *
 * Usage: node scripts/codemod-port-rntl.mjs <file...>
 * Delete this file once the migration has landed.
 */
import fs from 'node:fs';

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('usage: node scripts/codemod-port-rntl.mjs <file...>');
  process.exit(1);
}

for (const file of files) {
  let s = fs.readFileSync(file, 'utf8');
  const before = s;

  // 1. imports
  s = s.replace(
    /import TestRenderer(?:,\s*\{([^}]*)\})?\s+from\s+'react-test-renderer';\n/,
    "import { render as rtlRender, screen, fireEvent } from '@testing-library/react-native';\n"
  );
  s = s.replace(/^const \{ act \} = TestRenderer;\n/m, '');
  s = s.replace(
    /^\(globalThis as \{ IS_REACT_ACT_ENVIRONMENT\?: boolean \}\)\.IS_REACT_ACT_ENVIRONMENT = true;\n/m,
    ''
  );
  s = s.replace(/^(?:global|globalThis)\.IS_REACT_ACT_ENVIRONMENT = true;\n/m, '');

  // 2. render helper: unwrap the act(...) + TestRenderer.create(...) sandwich
  s = s.replace(
    /let (\w+)!: TestRenderer\.ReactTestRenderer;\s*\n\s*act\(\(\) => \{\s*\n\s*\1 = TestRenderer\.create\(([\s\S]*?)\);\s*\n\s*\}\);/g,
    (_m, _name, inner) => `await rtlRender(${inner.trim()});`
  );
  // the same sandwich written on one line
  s = s.replace(
    /let (\w+)!: TestRenderer\.ReactTestRenderer;\s*\n\s*act\(\(\) => \{?\s*\1 = TestRenderer\.create\(([\s\S]*?)\)\s*;?\s*\}?\);/g,
    (_m, _name, inner) => `await rtlRender(${inner.trim()});`
  );

  // 3. tree-access helpers -> screen queries (signatures preserved)
  s = s.replace(
    /function nodes\((\w+): TestRenderer\.ReactTestRenderer, (\w+): string\) \{[\s\S]*?\n\}/g,
    (_m, r, id) =>
      `function nodes(_${r}: unknown, ${id}: string) {\n  return screen.queryAllByTestId(${id});\n}`
  );
  s = s.replace(
    /function node\((\w+): TestRenderer\.ReactTestRenderer, (\w+): string\) \{[\s\S]*?\n\}/g,
    (_m, r, id) =>
      `function node(_${r}: unknown, ${id}: string) {\n  return screen.getByTestId(${id});\n}`
  );

  // 3b. allText(renderer) -> every rendered Text, via screen
  s = s.replace(
    /function allText\((\w+): TestRenderer\.ReactTestRenderer\): string\[\] \{[\s\S]*?\n\}/g,
    (_m, r) =>
      `function allText(_${r}?: unknown): string[] {\n` +
      `  return screen.queryAllByText(/.*/).map((n) => {\n` +
      `    const c = n.props.children;\n` +
      `    return Array.isArray(c) ? c.join('') : String(c);\n` +
      `  });\n}`
  );

  // 3c. a `press` helper that finds by testID then invokes the prop -> real fireEvent
  s = s.replace(
    /function press\((\w+): (?:unknown|TestRenderer\.ReactTestRenderer), (\w+): string\) \{[\s\S]*?\n\}/g,
    (_m, r, id) =>
      `async function press(_${r}: unknown, ${id}: string) {\n` +
      `  await fireEvent.press(screen.getByTestId(${id}));\n}`
  );

  // 3d. Generic tree access. RNTL 14 still exposes the rendered tree, but the traversal method
  //      is `queryAll` on `screen.root` (test-renderer v1) rather than react-test-renderer's
  //      `findAll`. Legitimate where a test asserts on a mocked child's props rather than on
  //      user-visible output; events still go through fireEvent.
  s = s.replace(/\b\w+\.root\s*\n?\s*\.findAll\(/g, 'screen.root!.queryAll(');
  s = s.replace(/\b\w+\.root\.findAll\(/g, 'screen.root!.queryAll(');
  s = s.replace(/\broot\.findAll\(/g, 'screen.root!.queryAll(');
  // helper params that were typed to the old renderer/instance
  s = s.replace(/\((\w+): Node\)/g, '($1?: unknown)');
  s = s.replace(/\((\w+): Node, /g, '($1: unknown, ');

  // 4. direct prop invocation -> real events
  s = s.replace(
    /act\(\(\) => \((?:nodes|node)\([^,]+, '([^']+)'\)(?:\[0\])?\.props\.onPress as \(\) => void\)\(\)\);/g,
    (_m, id) => `await fireEvent.press(screen.getByTestId('${id}'));`
  );
  s = s.replace(
    /act\(\(\) => (?:nodes|node)\([^,]+, '([^']+)'\)(?:\[0\])?\.props\.onPress\(\)\);/g,
    (_m, id) => `await fireEvent.press(screen.getByTestId('${id}'));`
  );

  // 4b. act(() => { (node(..,'id').props.onX as ...)(arg) }) -> await fireEvent.x(el, arg)
  //     Covers the block-bodied form the arrow-bodied rule in 4 does not reach.
  s = s.replace(
    /act\(\(\) => \{\s*\n\s*\((?:nodes|node)\([^,]+, '([^']+)'\)(?:\[0\])?\.props\.onChangeText as [^)]*\)\('([^']*)'\);\s*\n\s*\}\);/g,
    (_m, id, val) => `await fireEvent.changeText(screen.getByTestId('${id}'), '${val}');`
  );
  s = s.replace(
    /act\(\(\) => \{\s*\n\s*\((?:nodes|node)\([^,]+, '([^']+)'\)(?:\[0\])?\.props\.onPress as [^)]*\)\(\);\s*\n\s*\}\);/g,
    (_m, id) => `await fireEvent.press(screen.getByTestId('${id}'));`
  );

  // 4d. single-line act(() => (node(..,'id').props.onX as ...)(arg))
  s = s.replace(
    /act\(\(\) => \((?:nodes|node)\([^,]+, '([^']+)'\)(?:\[0\])?\.props\.onChangeText as [^)]*\)\('([^']*)'\)\);/g,
    (_m, id, val) => `await fireEvent.changeText(screen.getByTestId('${id}'), '${val}');`
  );
  s = s.replace(
    /act\(\(\) => \((?:nodes|node)\([^,]+, '([^']+)'\)(?:\[0\])?\.props\.on(Blur|SubmitEditing|EndEditing|Focus) as [^)]*\)\(\)\);/g,
    (_m, id, ev) =>
      `await fireEvent(screen.getByTestId('${id}'), '${ev.charAt(0).toLowerCase()}${ev.slice(1)}');`
  );

  // 4c. a render helper that returned the now-removed local
  s = s.replace(
    /^(\s*)return renderer;$/m,
    "$1return null; // call-site compatibility; the helpers query `screen`"
  );

  // 5. async call sites
  s = s.replace(
    /(\bit\(\s*(['"`])(?:[^\2\\]|\\.)*?\2\s*,\s*)\(\)\s*=>/g,
    (_m, head) => `${head}async () =>`
  );
  s = s.replace(/=\s*render\(/g, '= await render(');
  s = s.replace(/^(\s*)render\(/gm, '$1await render(');
  s = s.replace(/\bawait await\b/g, 'await');

  // 6. the local render helper is async now
  s = s.replace(/^(?!async )function render\(/m, 'async function render(');

  // 7. the `renderer` local is gone; keep the key so destructuring call sites still work
  s = s.replace(/return \{ (renderer|r|tree)\s*,/g, 'return { $1: null,');
  s = s.replace(/return \{ (renderer|r|tree)\s*\};/g, 'return { $1: null };');

  // 8. leftover type references to the removed renderer
  s = s.replace(/^type Node = TestRenderer\.TestInstance;\n/m, '');

  // 8b. `const { root } = await render()` — the helper no longer returns a renderer.
  s = s.replace(/const \{ root \} = await render\(\);/g, 'await render();');
  s = s.replace(/const \{ root, (\w+) \} = await render\(/g, 'const { $1 } = await render(');

  // 8c. If the file still uses `Node` as a type, point it at test-renderer's TestInstance
  //     (what screen.root.queryAll returns) instead of the deleted react-test-renderer alias.
  if (/\bNode\b\s*(\[\]|\)|;|,|>)/.test(s) && !/type Node =/.test(s)) {
    s = s.replace(
      "import { render as rtlRender",
      "import type { TestInstance as Node } from 'test-renderer';\nimport { render as rtlRender"
    );
  }

  // 8d. RNTL 14's `act` is async. An unawaited `act(() => ...)` lets the next render race the
  //      previous one, which shows up much later as `screen.root` being undefined.
  s = s.replace(/(?<!await )\bact\(\(\) => \{/g, 'await act(async () => {');
  s = s.replace(/\bawait await\b/g, 'await');

  // 9. `act` came from TestRenderer; re-import it from RNTL if the file still uses it.
  if (/\bact\(/.test(s) && !/fireEvent, act \}/.test(s)) {
    s = s.replace(
      "import { render as rtlRender, screen, fireEvent } from '@testing-library/react-native';",
      "import { render as rtlRender, screen, fireEvent, act } from '@testing-library/react-native';"
    );
  }

  // 10. stray `TestRenderer.` type annotations left on helpers the rules above did not match.
  s = s.replace(/:\s*TestRenderer\.ReactTestRenderer\b/g, ': unknown');
  s = s.replace(/:\s*TestRenderer\.TestInstance\b/g, ': unknown');

  if (s !== before) {
    fs.writeFileSync(file, s);
    console.log(`  ported: ${file.replace('src/__tests__/', '')}`);
  } else {
    console.log(`  UNCHANGED (needs manual port): ${file.replace('src/__tests__/', '')}`);
  }
}
