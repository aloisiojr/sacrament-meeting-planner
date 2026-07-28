/**
 * Minimal type declaration for `react-test-renderer` (no @types package installed).
 * Covers only the API surface used by the test helpers: `create`, `act`, and the
 * `ReactTestRenderer` instance type. Kept intentionally small and precise.
 */
declare module 'react-test-renderer' {
  import { ReactElement } from 'react';

  export interface TestInstance {
    type: unknown;
    props: Record<string, unknown>;
    children: TestInstance[];
    findAll(predicate: (node: TestInstance) => boolean): TestInstance[];
    find(predicate: (node: TestInstance) => boolean): TestInstance;
  }

  export interface ReactTestRenderer {
    update(nextElement: ReactElement): void;
    unmount(): void;
    toJSON(): unknown;
    toTree(): unknown;
    getInstance(): unknown;
    root: TestInstance;
  }

  export function create(nextElement: ReactElement, options?: unknown): ReactTestRenderer;

  export function act(callback: () => Promise<void | undefined>): Promise<void>;
  export function act(callback: () => void | undefined): void;
}
