/**
 * Vitest setup file: mocks React Native modules that don't work in Node.
 */

// Mock AsyncStorage (used by Supabase auth)
const mockStorage = new Map<string, string>();

const mockAsyncStorage = {
  getItem: async (key: string) => mockStorage.get(key) ?? null,
  setItem: async (key: string, value: string) => { mockStorage.set(key, value); },
  removeItem: async (key: string) => { mockStorage.delete(key); },
  clear: async () => { mockStorage.clear(); },
  getAllKeys: async () => Array.from(mockStorage.keys()),
  multiGet: async (keys: string[]) =>
    keys.map((key) => [key, mockStorage.get(key) ?? null] as [string, string | null]),
  multiSet: async (pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => mockStorage.set(key, value));
  },
  multiRemove: async (keys: string[]) => {
    keys.forEach((key) => mockStorage.delete(key));
  },
};

// Mock the module
import { vi } from 'vitest';
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: mockAsyncStorage,
  __esModule: true,
}));
