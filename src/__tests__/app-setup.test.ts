import { describe, it, expect } from 'vitest';

describe('App Setup', () => {
  it('should have the correct app name in package.json', async () => {
    const pkg = await import('../../package.json');
    expect(pkg.name).toBe('sacrament-meeting-planner');
  });

  it('should use expo-router/entry as main entry point', async () => {
    const pkg = await import('../../package.json');
    expect(pkg.main).toBe('expo-router/entry');
  });

  it('should have all required dependencies', async () => {
    const pkg = await import('../../package.json');
    const deps = pkg.dependencies as Record<string, string>;

    const requiredDeps = [
      'expo',
      'expo-router',
      'expo-linking',
      'expo-status-bar',
      'react',
      'react-native',
      'react-native-gesture-handler',
      'react-native-reanimated',
      'react-native-safe-area-context',
      'react-native-screens',
      '@react-native-async-storage/async-storage',
      '@supabase/supabase-js',
      '@tanstack/react-query',
      'i18next',
      'react-i18next',
    ];

    for (const dep of requiredDeps) {
      expect(deps[dep], `Missing dependency: ${dep}`).toBeDefined();
    }
  });

  it('should target Expo SDK 54', async () => {
    const pkg = await import('../../package.json');
    const deps = pkg.dependencies as Record<string, string>;
    expect(deps.expo).toMatch(/54/);
  });
});
