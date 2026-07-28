# Clean up all ESLint problems (baseline)

## Problem / intent
`npm run lint` (run by CI) reports 166 problems: 3 errors (`react/no-children-prop`, which fail CI)
and 163 warnings (pre-existing baseline debt). The user wants ALL resolved, with no runtime
behavior change and the suite staying green.

## In scope / Out of scope
- **In:** fix every eslint error and warning reported by `npm run lint`, across `src/`.
- **Out:** changing runtime behavior; disabling rules globally in `eslint.config.js`; removing or
  skipping tests; broad `any`/blanket suppression.

## Baseline (by rule)
`@typescript-eslint/no-unused-vars` 103 · `import/first` 30 · `react-hooks/exhaustive-deps` 19 ·
`import/no-duplicates` 4 · `react/no-children-prop` 3 (errors) ·
`import/no-named-as-default-member` 3 · `@typescript-eslint/array-type` 3 ·
`@typescript-eslint/no-require-imports` 1. 59 files; 35 auto-fixable.

## Acceptance criteria (EARS)
- **AC1:** WHEN `npm run lint` runs, it reports 0 problems (0 errors, 0 warnings).
- **AC2:** WHEN `npx tsc --noEmit` runs, 0 errors.
- **AC3:** WHEN `npm run test:run` runs, all tests pass (≥1834), none removed/skipped.
- **AC4:** No runtime behavior change. For `react-hooks/exhaustive-deps`, add the missing dependency
  ONLY when provably safe; otherwise use a `// eslint-disable-next-line react-hooks/exhaustive-deps`
  with a one-line reason. Never blindly mutate dependency arrays.
- **AC5:** Fixes are local (no rule turned off globally in `eslint.config.js`).

## Plan
1. `npx eslint . --fix` for the auto-fixable (array-type, no-duplicates, some import/first & unused).
2. Manual, per rule: remove genuinely unused vars/imports (`no-unused-vars`); move imports above
   `vi.mock` calls (`import/first`; vitest still hoists mocks); children → 3rd arg of
   `React.createElement` keeping tsc green (`no-children-prop`); proper named imports or justified
   disable (`no-named-as-default-member`); import instead of require (`no-require-imports`).
3. `exhaustive-deps`: inspect each; safe dep → add; otherwise justified disable. Flag any that look
   like a real bug instead of silencing.
4. Verify: lint 0, tsc 0, full suite green.

## Notes / verification
- Delegated to a subagent (context hygiene); verified independently here.
- Only the 3 errors actually fail CI, but all warnings are being cleared per user request.
