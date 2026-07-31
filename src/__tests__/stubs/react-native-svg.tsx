/**
 * Test-only stub for `react-native-svg`, wired via a vitest resolve alias (see vitest.config.ts).
 *
 * Why: vitest (`environment: node`) cannot parse the real `react-native-svg` sources. Icons that
 * import Svg/Path/Circle would otherwise fail to transform. This stub renders each SVG primitive as
 * a plain host element via React.createElement so icon-using components render under
 * react-test-renderer. Type-checking of production code still uses the real types (tsc ignores this).
 */
import React from 'react';

type StubProps = Record<string, unknown> & { children?: React.ReactNode };

function host(name: string): React.FC<StubProps> {
  const Component: React.FC<StubProps> = (props) => React.createElement(name, props);
  Component.displayName = name;
  return Component;
}

export const Svg = host('Svg');
export const Path = host('Path');
export const Circle = host('Circle');
export const Line = host('Line');
export const Rect = host('Rect');
export const G = host('G');
export const Polyline = host('Polyline');
export const Polygon = host('Polygon');
export const Ellipse = host('Ellipse');

export default Svg;
