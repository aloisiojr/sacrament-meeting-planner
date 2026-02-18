/**
 * QA Tests for CR-82: GestureHandlerRootView wrapper in root layout
 *
 * Verifies that GestureHandlerRootView from react-native-gesture-handler
 * is imported and wraps the app tree in src/app/_layout.tsx, enabling
 * GestureDetector usage in SwipeableCard on Members and Topics screens.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function readSourceFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf-8');
}

describe('CR-82: GestureHandlerRootView wrapper in root layout', () => {
  it('should import GestureHandlerRootView from react-native-gesture-handler', () => {
    const source = readSourceFile('app/_layout.tsx');
    expect(source).toContain("import { GestureHandlerRootView } from 'react-native-gesture-handler'");
  });

  it('should wrap provider tree with GestureHandlerRootView', () => {
    const source = readSourceFile('app/_layout.tsx');
    expect(source).toContain('<GestureHandlerRootView');
    expect(source).toContain('</GestureHandlerRootView>');
  });

  it('should apply flex:1 style to GestureHandlerRootView', () => {
    const source = readSourceFile('app/_layout.tsx');
    expect(source).toContain('<GestureHandlerRootView style={{ flex: 1 }}>');
  });

  it('should have SwipeableCard in Members screen (gesture descendant)', () => {
    const source = readSourceFile('app/(tabs)/settings/members.tsx');
    expect(source).toContain('SwipeableCard');
  });

  it('should have SwipeableCard in Topics screen (gesture descendant)', () => {
    const source = readSourceFile('app/(tabs)/settings/topics.tsx');
    expect(source).toContain('SwipeableCard');
  });

  it('should have GestureDetector in SwipeableCard for pan gesture', () => {
    const source = readSourceFile('components/SwipeableCard.tsx');
    expect(source).toContain('GestureDetector');
    expect(source).toContain('Gesture.Pan()');
  });

  it('SwipeableCard should import from react-native-gesture-handler', () => {
    const source = readSourceFile('components/SwipeableCard.tsx');
    expect(source).toContain("from 'react-native-gesture-handler'");
    expect(source).toContain('GestureDetector');
  });

  it('should have GestureHandlerRootView only in root layout (no duplicates)', () => {
    const rootLayout = readSourceFile('app/_layout.tsx');
    expect(rootLayout).toContain('GestureHandlerRootView');

    // Verify sub-layouts do not duplicate the wrapper
    const srcDir = path.join(__dirname, '..');
    const tabsLayout = path.join(srcDir, 'app/(tabs)/_layout.tsx');
    if (fs.existsSync(tabsLayout)) {
      const tabsSource = fs.readFileSync(tabsLayout, 'utf-8');
      expect(tabsSource).not.toContain('GestureHandlerRootView');
    }
    const settingsLayout = path.join(srcDir, 'app/(tabs)/settings/_layout.tsx');
    if (fs.existsSync(settingsLayout)) {
      const settingsSource = fs.readFileSync(settingsLayout, 'utf-8');
      expect(settingsSource).not.toContain('GestureHandlerRootView');
    }
  });

  it('GestureHandlerRootView placement: inside ErrorBoundary, outside QueryClientProvider', () => {
    const source = readSourceFile('app/_layout.tsx');
    const errorBoundaryIdx = source.indexOf('<ErrorBoundary>');
    const gestureIdx = source.indexOf('<GestureHandlerRootView');
    const queryIdx = source.indexOf('<QueryClientProvider');
    expect(errorBoundaryIdx).toBeLessThan(gestureIdx);
    expect(gestureIdx).toBeLessThan(queryIdx);
  });
});
