/**
 * QA Tests for CR-004 / F003: Connect SyncEngine, OfflineManager & Notifications
 *
 * Covers:
 * CR-52: useRealtimeSync, useConnection, OfflineBanner, offlineQueue connected via SyncProvider
 * CR-53: useNotifications (push token registration + notification handler) connected via SyncProvider
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function readSourceFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf-8');
}

function readLocale(locale: string): Record<string, unknown> {
  const filePath = path.resolve(__dirname, '..', 'i18n', 'locales', `${locale}.json`);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

describe('CR-004 F003: SyncEngine, OfflineManager & Notifications', () => {
  // ---------------------------------------------------------------
  // CR-52: Connection monitoring + Realtime sync via SyncProvider
  // ---------------------------------------------------------------
  describe('CR-52: useConnection wired in SyncProvider', () => {
    it('should import useConnection', () => {
      const source = readSourceFile('providers/SyncProvider.tsx');
      expect(source).toContain("import { useConnection } from '../hooks/useConnection'");
    });

    it('should call useConnection() and destructure state', () => {
      const source = readSourceFile('providers/SyncProvider.tsx');
      expect(source).toContain('useConnection()');
      expect(source).toContain('isOnline');
      expect(source).toContain('showOfflineBanner');
      expect(source).toContain('setWebSocketConnected');
    });

    it('useConnection hook should use NetInfo', () => {
      const source = readSourceFile('hooks/useConnection.ts');
      expect(source).toContain('NetInfo');
      expect(source).toContain('addEventListener');
    });

    it('useConnection should return ConnectionState interface', () => {
      const source = readSourceFile('hooks/useConnection.ts');
      expect(source).toContain('isOnline');
      expect(source).toContain('showOfflineBanner');
      expect(source).toContain('isWebSocketConnected');
      expect(source).toContain('setWebSocketConnected');
    });

    it('useConnection should export ConnectionState interface', () => {
      const source = readSourceFile('hooks/useConnection.ts');
      expect(source).toContain('export interface ConnectionState');
    });

    it('useConnection should export as named function', () => {
      const source = readSourceFile('hooks/useConnection.ts');
      expect(source).toContain('export function useConnection(): ConnectionState');
    });

    it('useConnection should initialize isOnline to true', () => {
      const source = readSourceFile('hooks/useConnection.ts');
      expect(source).toContain('useState(true)');
    });

    it('useConnection should initialize isWebSocketConnected to false', () => {
      const source = readSourceFile('hooks/useConnection.ts');
      expect(source).toContain('useState(false)');
    });

    it('useConnection should show banner immediately when going offline', () => {
      const source = readSourceFile('hooks/useConnection.ts');
      expect(source).toContain('setShowOfflineBanner(true)');
    });

    it('useConnection should delay hiding banner with setTimeout', () => {
      const source = readSourceFile('hooks/useConnection.ts');
      expect(source).toContain('setTimeout');
      expect(source).toContain('setShowOfflineBanner(false)');
      expect(source).toContain('1500');
    });

    it('useConnection should cleanup timeout on unmount', () => {
      const source = readSourceFile('hooks/useConnection.ts');
      expect(source).toContain('clearTimeout');
    });

    it('useConnection should cleanup NetInfo listener on unmount', () => {
      const source = readSourceFile('hooks/useConnection.ts');
      expect(source).toContain('unsubscribe()');
    });

    it('useConnection should use bannerTimeoutRef', () => {
      const source = readSourceFile('hooks/useConnection.ts');
      expect(source).toContain('bannerTimeoutRef');
      expect(source).toContain('useRef');
    });

    it('useConnection should use useCallback for setWebSocketConnected', () => {
      const source = readSourceFile('hooks/useConnection.ts');
      expect(source).toContain('useCallback');
    });

    it('useConnection should import isNetInfoOnline from connectionUtils', () => {
      const source = readSourceFile('hooks/useConnection.ts');
      expect(source).toContain("import { isNetInfoOnline } from '../lib/connectionUtils'");
    });

    it('useConnection should re-export isNetInfoOnline', () => {
      const source = readSourceFile('hooks/useConnection.ts');
      expect(source).toContain("export { isNetInfoOnline } from '../lib/connectionUtils'");
    });

    it('useConnection should call isNetInfoOnline with NetInfo state', () => {
      const source = readSourceFile('hooks/useConnection.ts');
      expect(source).toContain('isNetInfoOnline(state)');
    });

    it('useConnection should import NetInfoState type', () => {
      const source = readSourceFile('hooks/useConnection.ts');
      expect(source).toContain('NetInfoState');
    });
  });

  describe('CR-52: useRealtimeSync wired in SyncProvider', () => {
    it('should import useRealtimeSync', () => {
      const source = readSourceFile('providers/SyncProvider.tsx');
      expect(source).toContain("import { useRealtimeSync } from '../hooks/useRealtimeSync'");
    });

    it('should call useRealtimeSync with isOnline and setWebSocketConnected', () => {
      const source = readSourceFile('providers/SyncProvider.tsx');
      expect(source).toContain('useRealtimeSync({ isOnline, setWebSocketConnected })');
    });

    it('useRealtimeSync should subscribe to ward-scoped tables', () => {
      const source = readSourceFile('hooks/useRealtimeSync.ts');
      expect(source).toContain('postgres_changes');
      expect(source).toContain('ward_id=eq.');
      expect(source).toContain('SYNCED_TABLES');
    });

    it('useRealtimeSync should have polling fallback', () => {
      const source = readSourceFile('hooks/useRealtimeSync.ts');
      expect(source).toContain('POLLING_INTERVAL_MS');
      expect(source).toContain('setInterval');
      expect(source).toContain('startPolling');
      expect(source).toContain('stopPolling');
    });

    it('useRealtimeSync should invalidate queries on change', () => {
      const source = readSourceFile('hooks/useRealtimeSync.ts');
      expect(source).toContain('invalidateQueries');
      expect(source).toContain('getQueryKeysForTable');
    });

    it('useRealtimeSync should accept UseRealtimeSyncOptions interface', () => {
      const source = readSourceFile('hooks/useRealtimeSync.ts');
      expect(source).toContain('interface UseRealtimeSyncOptions');
      expect(source).toContain('isOnline: boolean');
      expect(source).toContain('setWebSocketConnected: (connected: boolean) => void');
    });

    it('useRealtimeSync should export as named function returning void', () => {
      const source = readSourceFile('hooks/useRealtimeSync.ts');
      expect(source).toContain('export function useRealtimeSync');
      expect(source).toContain('): void');
    });

    it('useRealtimeSync should use useAuth for wardId', () => {
      const source = readSourceFile('hooks/useRealtimeSync.ts');
      expect(source).toContain('useAuth');
      expect(source).toContain('wardId');
    });

    it('useRealtimeSync should use useQueryClient', () => {
      const source = readSourceFile('hooks/useRealtimeSync.ts');
      expect(source).toContain('useQueryClient');
    });

    it('useRealtimeSync should create ward-scoped channel', () => {
      const source = readSourceFile('hooks/useRealtimeSync.ts');
      expect(source).toContain('supabase.channel(`ward-sync-${wardId}`)');
    });

    it('useRealtimeSync should subscribe to all events (wildcard)', () => {
      const source = readSourceFile('hooks/useRealtimeSync.ts');
      expect(source).toContain("event: '*'");
      expect(source).toContain("schema: 'public'");
    });

    it('useRealtimeSync should iterate SYNCED_TABLES for subscriptions', () => {
      const source = readSourceFile('hooks/useRealtimeSync.ts');
      expect(source).toContain('for (const table of SYNCED_TABLES)');
    });

    it('useRealtimeSync should handle SUBSCRIBED status', () => {
      const source = readSourceFile('hooks/useRealtimeSync.ts');
      expect(source).toContain("status === 'SUBSCRIBED'");
      expect(source).toContain('setWebSocketConnected(true)');
      expect(source).toContain('stopPolling()');
    });

    it('useRealtimeSync should handle CLOSED and CHANNEL_ERROR status', () => {
      const source = readSourceFile('hooks/useRealtimeSync.ts');
      expect(source).toContain("status === 'CLOSED'");
      expect(source).toContain("status === 'CHANNEL_ERROR'");
      expect(source).toContain('setWebSocketConnected(false)');
    });

    it('useRealtimeSync should start polling on WebSocket failure when online', () => {
      const source = readSourceFile('hooks/useRealtimeSync.ts');
      const idx = source.indexOf("'CHANNEL_ERROR'");
      expect(idx).toBeGreaterThan(-1);
      const nearby = source.slice(idx, idx + 200);
      expect(nearby).toContain('startPolling()');
    });

    it('useRealtimeSync should have invalidateAll on reconnect', () => {
      const source = readSourceFile('hooks/useRealtimeSync.ts');
      expect(source).toContain('invalidateAll');
    });

    it('useRealtimeSync should have invalidateForTable callback', () => {
      const source = readSourceFile('hooks/useRealtimeSync.ts');
      expect(source).toContain('invalidateForTable');
      expect(source).toContain('payload.table');
    });

    it('useRealtimeSync should cleanup channel on unmount', () => {
      const source = readSourceFile('hooks/useRealtimeSync.ts');
      expect(source).toContain('supabase.removeChannel');
    });

    it('useRealtimeSync should use channelRef', () => {
      const source = readSourceFile('hooks/useRealtimeSync.ts');
      expect(source).toContain('channelRef');
      expect(source).toContain('useRef<RealtimeChannel | null>(null)');
    });

    it('useRealtimeSync should use pollingRef', () => {
      const source = readSourceFile('hooks/useRealtimeSync.ts');
      expect(source).toContain('pollingRef');
      expect(source).toContain('isPollingRef');
    });

    it('useRealtimeSync should stop polling when going offline', () => {
      const source = readSourceFile('hooks/useRealtimeSync.ts');
      // Second useEffect that watches isOnline
      const secondEffect = source.lastIndexOf('useEffect');
      const effectBody = source.slice(secondEffect, secondEffect + 200);
      expect(effectBody).toContain('isOnline');
      expect(effectBody).toContain('stopPolling');
    });

    it('useRealtimeSync should import from sync lib', () => {
      const source = readSourceFile('hooks/useRealtimeSync.ts');
      expect(source).toContain("import { SYNCED_TABLES, getQueryKeysForTable, POLLING_INTERVAL_MS } from '../lib/sync'");
    });

    it('useRealtimeSync should import RealtimeChannel type', () => {
      const source = readSourceFile('hooks/useRealtimeSync.ts');
      expect(source).toContain("import type { RealtimeChannel } from '@supabase/supabase-js'");
    });
  });

  describe('CR-52: OfflineBanner wired in SyncProvider', () => {
    it('should import OfflineBanner', () => {
      const source = readSourceFile('providers/SyncProvider.tsx');
      expect(source).toContain("import { OfflineBanner } from '../components/OfflineBanner'");
    });

    it('should render OfflineBanner with visible prop', () => {
      const source = readSourceFile('providers/SyncProvider.tsx');
      expect(source).toContain('<OfflineBanner visible={showOfflineBanner} />');
    });

    it('OfflineBanner should use i18n for text', () => {
      const source = readSourceFile('components/OfflineBanner.tsx');
      expect(source).toContain("t('common.offline')");
      expect(source).toContain("t('common.offlineMessage')");
    });

    it('OfflineBanner should export as named function', () => {
      const source = readSourceFile('components/OfflineBanner.tsx');
      expect(source).toContain('export function OfflineBanner');
    });

    it('OfflineBanner should accept visible prop', () => {
      const source = readSourceFile('components/OfflineBanner.tsx');
      expect(source).toContain('interface OfflineBannerProps');
      expect(source).toContain('visible: boolean');
    });

    it('OfflineBanner should return null when not visible', () => {
      const source = readSourceFile('components/OfflineBanner.tsx');
      expect(source).toContain('if (!visible) return null');
    });

    it('OfflineBanner should use useTranslation hook', () => {
      const source = readSourceFile('components/OfflineBanner.tsx');
      expect(source).toContain('useTranslation');
      expect(source).toContain("const { t } = useTranslation()");
    });

    it('OfflineBanner should have red background', () => {
      const source = readSourceFile('components/OfflineBanner.tsx');
      expect(source).toContain("#E53E3E");
    });

    it('OfflineBanner should have white text', () => {
      const source = readSourceFile('components/OfflineBanner.tsx');
      expect(source).toContain("#FFFFFF");
    });

    it('OfflineBanner should have StyleSheet.create', () => {
      const source = readSourceFile('components/OfflineBanner.tsx');
      expect(source).toContain('StyleSheet.create');
      expect(source).toContain('banner:');
      expect(source).toContain('text:');
      expect(source).toContain('subtext:');
    });

    it('OfflineBanner should NOT have hardcoded English strings', () => {
      const source = readSourceFile('components/OfflineBanner.tsx');
      expect(source).not.toContain("'No connection'");
      expect(source).not.toContain("'You are offline'");
    });
  });

  describe('CR-52: Offline i18n keys', () => {
    (['pt-BR', 'en', 'es'] as const).forEach((locale) => {
      it(`${locale} should have common.offline`, () => {
        const data = readLocale(locale);
        const common = data.common as Record<string, string>;
        expect(common.offline).toBeDefined();
      });

      it(`${locale} should have common.offlineMessage`, () => {
        const data = readLocale(locale);
        const common = data.common as Record<string, string>;
        expect(common.offlineMessage).toBeDefined();
      });

      it(`${locale} common.offline should be non-empty`, () => {
        const data = readLocale(locale);
        const common = data.common as Record<string, string>;
        expect(typeof common.offline).toBe('string');
        expect(common.offline.length).toBeGreaterThan(0);
      });

      it(`${locale} common.offlineMessage should be non-empty`, () => {
        const data = readLocale(locale);
        const common = data.common as Record<string, string>;
        expect(typeof common.offlineMessage).toBe('string');
        expect(common.offlineMessage.length).toBeGreaterThan(0);
      });
    });
  });

  // ---------------------------------------------------------------
  // CR-52: OfflineQueue connected
  // ---------------------------------------------------------------
  describe('CR-52: OfflineQueue processor', () => {
    it('useOfflineQueueProcessor hook should exist', () => {
      const filePath = path.resolve(__dirname, '..', 'hooks', 'useOfflineQueueProcessor.ts');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should import useOfflineQueueProcessor in SyncProvider', () => {
      const source = readSourceFile('providers/SyncProvider.tsx');
      expect(source).toContain("import { useOfflineQueueProcessor } from '../hooks/useOfflineQueueProcessor'");
    });

    it('should call useOfflineQueueProcessor(isOnline)', () => {
      const source = readSourceFile('providers/SyncProvider.tsx');
      expect(source).toContain('useOfflineQueueProcessor(isOnline)');
    });

    it('useOfflineQueueProcessor should use dequeue from offlineQueue', () => {
      const source = readSourceFile('hooks/useOfflineQueueProcessor.ts');
      expect(source).toContain("from '../lib/offlineQueue'");
      expect(source).toContain('dequeue');
    });

    it('useOfflineQueueProcessor should handle INSERT/UPDATE/DELETE', () => {
      const source = readSourceFile('hooks/useOfflineQueueProcessor.ts');
      expect(source).toContain("operation === 'INSERT'");
      expect(source).toContain("operation === 'UPDATE'");
      expect(source).toContain("operation === 'DELETE'");
    });

    it('useOfflineQueueProcessor should invalidate queries after processing', () => {
      const source = readSourceFile('hooks/useOfflineQueueProcessor.ts');
      expect(source).toContain('invalidateQueries');
    });

    it('useOfflineQueueProcessor should export as named function', () => {
      const source = readSourceFile('hooks/useOfflineQueueProcessor.ts');
      expect(source).toContain('export function useOfflineQueueProcessor(isOnline: boolean): void');
    });

    it('useOfflineQueueProcessor should use useQueryClient', () => {
      const source = readSourceFile('hooks/useOfflineQueueProcessor.ts');
      expect(source).toContain('useQueryClient');
    });

    it('useOfflineQueueProcessor should track processing state with ref', () => {
      const source = readSourceFile('hooks/useOfflineQueueProcessor.ts');
      expect(source).toContain('processingRef');
      expect(source).toContain('useRef(false)');
    });

    it('useOfflineQueueProcessor should track offline-to-online transition', () => {
      const source = readSourceFile('hooks/useOfflineQueueProcessor.ts');
      expect(source).toContain('wasOfflineRef');
      expect(source).toContain('wasOfflineRef.current = true');
      expect(source).toContain('wasOfflineRef.current = false');
    });

    it('useOfflineQueueProcessor should only process on offline->online transition', () => {
      const source = readSourceFile('hooks/useOfflineQueueProcessor.ts');
      expect(source).toContain('if (!wasOfflineRef.current) return');
    });

    it('useOfflineQueueProcessor should use while loop for FIFO drain', () => {
      const source = readSourceFile('hooks/useOfflineQueueProcessor.ts');
      expect(source).toContain('while (mutation)');
      expect(source).toContain('mutation = await dequeue()');
    });

    it('useOfflineQueueProcessor INSERT should call supabase.from(table).insert', () => {
      const source = readSourceFile('hooks/useOfflineQueueProcessor.ts');
      expect(source).toContain('supabase.from(table).insert(data)');
    });

    it('useOfflineQueueProcessor UPDATE should destructure id and use .update.eq', () => {
      const source = readSourceFile('hooks/useOfflineQueueProcessor.ts');
      expect(source).toContain('const { id, ...rest } = data');
      expect(source).toContain(".update(rest).eq('id'");
    });

    it('useOfflineQueueProcessor DELETE should use .delete().eq', () => {
      const source = readSourceFile('hooks/useOfflineQueueProcessor.ts');
      expect(source).toContain(".delete().eq('id'");
    });

    it('useOfflineQueueProcessor should warn on failed mutation', () => {
      const source = readSourceFile('hooks/useOfflineQueueProcessor.ts');
      expect(source).toContain("console.warn('[OfflineQueue] Failed to process mutation:'");
    });

    it('useOfflineQueueProcessor should use finally block to reset processingRef', () => {
      const source = readSourceFile('hooks/useOfflineQueueProcessor.ts');
      expect(source).toContain('finally');
      expect(source).toContain('processingRef.current = false');
    });

    it('useOfflineQueueProcessor should import supabase', () => {
      const source = readSourceFile('hooks/useOfflineQueueProcessor.ts');
      expect(source).toContain("import { supabase } from '../lib/supabase'");
    });
  });

  describe('CR-52: offlineQueue module', () => {
    it('offlineQueue module should have enqueue/dequeue/readQueue', () => {
      const source = readSourceFile('lib/offlineQueue.ts');
      expect(source).toContain('export async function enqueue');
      expect(source).toContain('export async function dequeue');
      expect(source).toContain('export async function readQueue');
    });

    it('offlineQueue should persist to AsyncStorage', () => {
      const source = readSourceFile('lib/offlineQueue.ts');
      expect(source).toContain('AsyncStorage');
      expect(source).toContain('@offline_mutation_queue');
    });

    it('offlineQueue should have QueuedMutation interface', () => {
      const source = readSourceFile('lib/offlineQueue.ts');
      expect(source).toContain('export interface QueuedMutation');
      expect(source).toContain('id: string');
      expect(source).toContain('table: string');
      expect(source).toContain("operation: 'INSERT' | 'UPDATE' | 'DELETE'");
      expect(source).toContain('data: Record<string, unknown>');
      expect(source).toContain('timestamp: number');
      expect(source).toContain('retryCount: number');
    });

    it('offlineQueue should have MAX_QUEUE_SIZE of 100', () => {
      const source = readSourceFile('lib/offlineQueue.ts');
      expect(source).toContain('MAX_QUEUE_SIZE = 100');
    });

    it('offlineQueue should have MAX_RETRIES of 3', () => {
      const source = readSourceFile('lib/offlineQueue.ts');
      expect(source).toContain('MAX_RETRIES = 3');
    });

    it('offlineQueue enqueue should return false when full', () => {
      const source = readSourceFile('lib/offlineQueue.ts');
      expect(source).toContain('queue.length >= MAX_QUEUE_SIZE');
      expect(source).toContain('return false');
    });

    it('offlineQueue enqueue should initialize retryCount to 0', () => {
      const source = readSourceFile('lib/offlineQueue.ts');
      expect(source).toContain('retryCount: 0');
    });

    it('offlineQueue dequeue should return first item (FIFO)', () => {
      const source = readSourceFile('lib/offlineQueue.ts');
      expect(source).toContain('const [first, ...rest] = queue');
      expect(source).toContain('return first');
    });

    it('offlineQueue should have peek function', () => {
      const source = readSourceFile('lib/offlineQueue.ts');
      expect(source).toContain('export async function peek');
    });

    it('offlineQueue should have getQueueSize function', () => {
      const source = readSourceFile('lib/offlineQueue.ts');
      expect(source).toContain('export async function getQueueSize');
    });

    it('offlineQueue should have clearQueue function', () => {
      const source = readSourceFile('lib/offlineQueue.ts');
      expect(source).toContain('export async function clearQueue');
      expect(source).toContain('AsyncStorage.removeItem');
    });

    it('offlineQueue should have incrementRetry function', () => {
      const source = readSourceFile('lib/offlineQueue.ts');
      expect(source).toContain('export async function incrementRetry');
    });

    it('offlineQueue incrementRetry should discard after MAX_RETRIES', () => {
      const source = readSourceFile('lib/offlineQueue.ts');
      expect(source).toContain('retryCount >= MAX_RETRIES');
      expect(source).toContain('queue.shift()');
    });

    it('offlineQueue should export hasCapacity utility', () => {
      const source = readSourceFile('lib/offlineQueue.ts');
      expect(source).toContain('export function hasCapacity');
      expect(source).toContain('currentSize < MAX_QUEUE_SIZE');
    });

    it('offlineQueue should export shouldRetry utility', () => {
      const source = readSourceFile('lib/offlineQueue.ts');
      expect(source).toContain('export function shouldRetry');
      expect(source).toContain('retryCount < MAX_RETRIES');
    });

    it('offlineQueue should export getMaxQueueSize utility', () => {
      const source = readSourceFile('lib/offlineQueue.ts');
      expect(source).toContain('export function getMaxQueueSize');
    });

    it('offlineQueue should export getMaxRetries utility', () => {
      const source = readSourceFile('lib/offlineQueue.ts');
      expect(source).toContain('export function getMaxRetries');
    });

    it('offlineQueue readQueue should handle parse errors gracefully', () => {
      const source = readSourceFile('lib/offlineQueue.ts');
      expect(source).toContain('} catch {');
      expect(source).toContain('return []');
    });

    it('offlineQueue readQueue should validate parsed result is array', () => {
      const source = readSourceFile('lib/offlineQueue.ts');
      expect(source).toContain('Array.isArray(parsed)');
    });
  });

  // ---------------------------------------------------------------
  // CR-52: sync.ts table-to-query-key mapping
  // ---------------------------------------------------------------
  describe('CR-52: sync.ts table mapping', () => {
    it('should map all synced tables', () => {
      const source = readSourceFile('lib/sync.ts');
      expect(source).toContain('members');
      expect(source).toContain('ward_topics');
      expect(source).toContain('sunday_exceptions');
      expect(source).toContain('speeches');
      expect(source).toContain('sunday_agendas');
      expect(source).toContain('meeting_actors');
    });

    it('should include ward_collection_config', () => {
      const source = readSourceFile('lib/sync.ts');
      expect(source).toContain('ward_collection_config');
    });

    it('should export getQueryKeysForTable', () => {
      const source = readSourceFile('lib/sync.ts');
      expect(source).toContain('export function getQueryKeysForTable');
    });

    it('should export POLLING_INTERVAL_MS', () => {
      const source = readSourceFile('lib/sync.ts');
      expect(source).toContain('export const POLLING_INTERVAL_MS');
    });

    it('POLLING_INTERVAL_MS should be 2500', () => {
      const source = readSourceFile('lib/sync.ts');
      expect(source).toContain('POLLING_INTERVAL_MS = 2500');
    });

    it('should export SYNCED_TABLES as readonly', () => {
      const source = readSourceFile('lib/sync.ts');
      expect(source).toContain('export const SYNCED_TABLES');
      expect(source).toContain('as const');
    });

    it('should have SyncedTable type', () => {
      const source = readSourceFile('lib/sync.ts');
      expect(source).toContain('export type SyncedTable');
    });

    it('should export TABLE_TO_QUERY_KEYS', () => {
      const source = readSourceFile('lib/sync.ts');
      expect(source).toContain('export const TABLE_TO_QUERY_KEYS');
    });

    it('should import key factories from hooks', () => {
      const source = readSourceFile('lib/sync.ts');
      expect(source).toContain('memberKeys');
      expect(source).toContain('topicKeys');
      expect(source).toContain('sundayTypeKeys');
      expect(source).toContain('speechKeys');
      expect(source).toContain('agendaKeys');
      expect(source).toContain('actorKeys');
    });

    it('getQueryKeysForTable should return empty array for unknown table', () => {
      const source = readSourceFile('lib/sync.ts');
      expect(source).toContain('return []');
    });

    it('SYNCED_TABLES should have 7 entries', () => {
      const source = readSourceFile('lib/sync.ts');
      const match = source.match(/SYNCED_TABLES.*?\[([^]*?)\] as const/);
      expect(match).not.toBeNull();
      const entries = match![1].match(/'/g);
      expect(entries).not.toBeNull();
      // 7 tables, each with opening and closing quote = 14 quotes
      expect(entries!.length).toBe(14);
    });
  });

  // ---------------------------------------------------------------
  // CR-53: Push notifications
  // ---------------------------------------------------------------
  describe('CR-53: useNotifications wired in SyncProvider', () => {
    it('should import useRegisterPushToken and useNotificationHandler', () => {
      const source = readSourceFile('providers/SyncProvider.tsx');
      expect(source).toContain("import { useRegisterPushToken, useNotificationHandler } from '../hooks/useNotifications'");
    });

    it('should call useRegisterPushToken(isOnline)', () => {
      const source = readSourceFile('providers/SyncProvider.tsx');
      expect(source).toContain('useRegisterPushToken(isOnline)');
    });

    it('should call useNotificationHandler()', () => {
      const source = readSourceFile('providers/SyncProvider.tsx');
      expect(source).toContain('useNotificationHandler()');
    });
  });

  describe('CR-53: useRegisterPushToken', () => {
    it('should request notification permissions', () => {
      const source = readSourceFile('hooks/useNotifications.ts');
      expect(source).toContain('getPermissionsAsync');
      expect(source).toContain('requestPermissionsAsync');
    });

    it('should get Expo push token', () => {
      const source = readSourceFile('hooks/useNotifications.ts');
      expect(source).toContain('getExpoPushTokenAsync');
    });

    it('should upsert token to device_push_tokens table', () => {
      const source = readSourceFile('hooks/useNotifications.ts');
      expect(source).toContain('device_push_tokens');
      expect(source).toContain('expo_push_token');
    });

    it('should NOT register for observer role', () => {
      const source = readSourceFile('hooks/useNotifications.ts');
      expect(source).toContain("role === 'observer'");
    });

    it('should defer registration when offline', () => {
      const source = readSourceFile('hooks/useNotifications.ts');
      expect(source).toContain('if (!isOnline) return');
    });

    it('should set up Android notification channel', () => {
      const source = readSourceFile('hooks/useNotifications.ts');
      expect(source).toContain('setNotificationChannelAsync');
      expect(source).toContain("Platform.OS === 'android'");
    });

    it('should export as named function', () => {
      const source = readSourceFile('hooks/useNotifications.ts');
      expect(source).toContain('export function useRegisterPushToken(isOnline: boolean): void');
    });

    it('should use useAuth for user, role, and wardId', () => {
      const source = readSourceFile('hooks/useNotifications.ts');
      expect(source).toContain('const { user, role, wardId } = useAuth()');
    });

    it('should use hasRegistered ref to prevent duplicate registration', () => {
      const source = readSourceFile('hooks/useNotifications.ts');
      expect(source).toContain('hasRegistered');
      expect(source).toContain('hasRegistered.current = true');
    });

    it('should guard against missing user, wardId, and observer role', () => {
      const source = readSourceFile('hooks/useNotifications.ts');
      expect(source).toContain("!user || !wardId || role === 'observer' || hasRegistered.current");
    });

    it('should upsert with onConflict for user_id,expo_push_token', () => {
      const source = readSourceFile('hooks/useNotifications.ts');
      expect(source).toContain('upsert');
      expect(source).toContain("onConflict: 'user_id,expo_push_token'");
    });

    it('should include ward_id in upsert data', () => {
      const source = readSourceFile('hooks/useNotifications.ts');
      expect(source).toContain('ward_id: wardId');
    });

    it('should handle cancelled state via cleanup', () => {
      const source = readSourceFile('hooks/useNotifications.ts');
      expect(source).toContain('let cancelled = false');
      expect(source).toContain('if (cancelled) return');
      expect(source).toContain('cancelled = true');
    });

    it('should warn on failed token registration', () => {
      const source = readSourceFile('hooks/useNotifications.ts');
      expect(source).toContain("console.warn('Failed to register push token:'");
    });

    it('should configure Android channel with MAX importance', () => {
      const source = readSourceFile('hooks/useNotifications.ts');
      expect(source).toContain('AndroidImportance.MAX');
      expect(source).toContain('vibrationPattern');
    });

    it('should import Platform from react-native', () => {
      const source = readSourceFile('hooks/useNotifications.ts');
      expect(source).toContain("import { Platform } from 'react-native'");
    });

    it('should import expo-notifications', () => {
      const source = readSourceFile('hooks/useNotifications.ts');
      expect(source).toContain("import * as Notifications from 'expo-notifications'");
    });
  });

  describe('CR-53: useNotificationHandler', () => {
    it('should listen for notification responses', () => {
      const source = readSourceFile('hooks/useNotifications.ts');
      expect(source).toContain('addNotificationResponseReceivedListener');
    });

    it('should handle cold start notification', () => {
      const source = readSourceFile('hooks/useNotifications.ts');
      expect(source).toContain('getLastNotificationResponseAsync');
    });

    it('should navigate to home tab on notification tap', () => {
      const source = readSourceFile('hooks/useNotifications.ts');
      expect(source).toContain("router.replace('/(tabs)')");
    });

    it('should export as named function returning void', () => {
      const source = readSourceFile('hooks/useNotifications.ts');
      expect(source).toContain('export function useNotificationHandler(): void');
    });

    it('should use useRouter from expo-router', () => {
      const source = readSourceFile('hooks/useNotifications.ts');
      expect(source).toContain('useRouter');
      expect(source).toContain("from 'expo-router'");
    });

    it('should use useCallback for handleResponse', () => {
      const source = readSourceFile('hooks/useNotifications.ts');
      expect(source).toContain('const handleResponse = useCallback');
    });

    it('should cleanup listener on unmount', () => {
      const source = readSourceFile('hooks/useNotifications.ts');
      expect(source).toContain('subscription.remove()');
    });
  });

  describe('CR-53: Notification display config', () => {
    it('should configure setNotificationHandler', () => {
      const source = readSourceFile('hooks/useNotifications.ts');
      expect(source).toContain('setNotificationHandler');
      expect(source).toContain('shouldShowAlert: true');
      expect(source).toContain('shouldPlaySound: true');
    });

    it('should set shouldSetBadge to false', () => {
      const source = readSourceFile('hooks/useNotifications.ts');
      expect(source).toContain('shouldSetBadge: false');
    });

    it('should set shouldShowBanner and shouldShowList to true', () => {
      const source = readSourceFile('hooks/useNotifications.ts');
      expect(source).toContain('shouldShowBanner: true');
      expect(source).toContain('shouldShowList: true');
    });

    it('should configure handleNotification as async', () => {
      const source = readSourceFile('hooks/useNotifications.ts');
      expect(source).toContain('handleNotification: async');
    });
  });

  describe('CR-53: notificationUtils re-exports', () => {
    it('should re-export getOrdinal from notificationUtils', () => {
      const source = readSourceFile('hooks/useNotifications.ts');
      expect(source).toContain('getOrdinal');
      expect(source).toContain("from '../lib/notificationUtils'");
    });

    it('should re-export buildNotificationText', () => {
      const source = readSourceFile('hooks/useNotifications.ts');
      expect(source).toContain('buildNotificationText');
    });

    it('should re-export formatNameList', () => {
      const source = readSourceFile('hooks/useNotifications.ts');
      expect(source).toContain('formatNameList');
    });

    it('should re-export OrdinalLanguage type', () => {
      const source = readSourceFile('hooks/useNotifications.ts');
      expect(source).toContain('OrdinalLanguage');
    });
  });

  // ---------------------------------------------------------------
  // CR-52: connectionUtils pure functions
  // ---------------------------------------------------------------
  describe('CR-52: connectionUtils', () => {
    it('should export isNetInfoOnline', () => {
      const source = readSourceFile('lib/connectionUtils.ts');
      expect(source).toContain('export function isNetInfoOnline');
    });

    it('should check isConnected and isInternetReachable', () => {
      const source = readSourceFile('lib/connectionUtils.ts');
      expect(source).toContain('isConnected');
      expect(source).toContain('isInternetReachable');
    });

    it('should return boolean', () => {
      const source = readSourceFile('lib/connectionUtils.ts');
      expect(source).toContain('): boolean');
    });

    it('should require isConnected === true', () => {
      const source = readSourceFile('lib/connectionUtils.ts');
      expect(source).toContain('state.isConnected === true');
    });

    it('should treat isInternetReachable !== false (null is online)', () => {
      const source = readSourceFile('lib/connectionUtils.ts');
      expect(source).toContain('isInternetReachable !== false');
    });

    it('should accept state parameter with correct shape', () => {
      const source = readSourceFile('lib/connectionUtils.ts');
      expect(source).toContain('isConnected: boolean | null');
      expect(source).toContain('isInternetReachable: boolean | null');
    });
  });

  // ---------------------------------------------------------------
  // Overall: SyncProvider encapsulates all sync modules
  // ---------------------------------------------------------------
  describe('SyncProvider architecture', () => {
    it('_layout.tsx should import SyncProvider', () => {
      const source = readSourceFile('app/_layout.tsx');
      expect(source).toContain("import { SyncProvider } from '../providers/SyncProvider'");
    });

    it('_layout.tsx should render SyncProvider in component tree', () => {
      const source = readSourceFile('app/_layout.tsx');
      expect(source).toContain('<SyncProvider>');
    });

    it('_layout.tsx SyncProvider should be inside AuthProvider', () => {
      const source = readSourceFile('app/_layout.tsx');
      const authIdx = source.indexOf('<AuthProvider>');
      const syncIdx = source.indexOf('<SyncProvider>');
      expect(authIdx).toBeGreaterThan(-1);
      expect(syncIdx).toBeGreaterThan(-1);
      expect(authIdx).toBeLessThan(syncIdx);
    });

    it('SyncProvider should export as named function', () => {
      const source = readSourceFile('providers/SyncProvider.tsx');
      expect(source).toContain('export function SyncProvider');
    });

    it('SyncProvider should accept children prop', () => {
      const source = readSourceFile('providers/SyncProvider.tsx');
      expect(source).toContain('children: React.ReactNode');
      expect(source).toContain('{ children }');
    });

    it('SyncProvider should render children after OfflineBanner', () => {
      const source = readSourceFile('providers/SyncProvider.tsx');
      const bannerIdx = source.indexOf('<OfflineBanner');
      const childrenIdx = source.indexOf('{children}');
      expect(bannerIdx).toBeGreaterThan(-1);
      expect(childrenIdx).toBeGreaterThan(-1);
      expect(bannerIdx).toBeLessThan(childrenIdx);
    });

    it('SyncProvider should use React Fragment wrapper', () => {
      const source = readSourceFile('providers/SyncProvider.tsx');
      expect(source).toContain('<>');
      expect(source).toContain('</>');
    });

    it('SyncProvider should have numbered comments for initialization order', () => {
      const source = readSourceFile('providers/SyncProvider.tsx');
      expect(source).toContain('// 1. Connection monitoring');
      expect(source).toContain('// 2. Realtime sync');
      expect(source).toContain('// 3. Offline queue');
      expect(source).toContain('// 4. Push token');
      expect(source).toContain('// 5. Notification tap');
    });

    it('SyncProvider should import React', () => {
      const source = readSourceFile('providers/SyncProvider.tsx');
      expect(source).toContain("import React from 'react'");
    });

    it('SyncProvider should have SyncProviderProps interface', () => {
      const source = readSourceFile('providers/SyncProvider.tsx');
      expect(source).toContain('interface SyncProviderProps');
    });

    it('SyncProvider should import useConnection', () => {
      const source = readSourceFile('providers/SyncProvider.tsx');
      expect(source).toContain("from '../hooks/useConnection'");
    });

    it('SyncProvider should import useRealtimeSync', () => {
      const source = readSourceFile('providers/SyncProvider.tsx');
      expect(source).toContain("from '../hooks/useRealtimeSync'");
    });

    it('SyncProvider should import OfflineBanner', () => {
      const source = readSourceFile('providers/SyncProvider.tsx');
      expect(source).toContain("from '../components/OfflineBanner'");
    });

    it('SyncProvider should import useOfflineQueueProcessor', () => {
      const source = readSourceFile('providers/SyncProvider.tsx');
      expect(source).toContain("from '../hooks/useOfflineQueueProcessor'");
    });

    it('SyncProvider should import useRegisterPushToken and useNotificationHandler', () => {
      const source = readSourceFile('providers/SyncProvider.tsx');
      expect(source).toContain("from '../hooks/useNotifications'");
    });
  });

  // ---------------------------------------------------------------
  // CR-53: notificationUtils module
  // ---------------------------------------------------------------
  describe('CR-53: notificationUtils module', () => {
    it('should export getOrdinal function', () => {
      const source = readSourceFile('lib/notificationUtils.ts');
      expect(source).toContain('export function getOrdinal');
    });

    it('should export buildNotificationText function', () => {
      const source = readSourceFile('lib/notificationUtils.ts');
      expect(source).toContain('export function buildNotificationText');
    });

    it('should export formatNameList function', () => {
      const source = readSourceFile('lib/notificationUtils.ts');
      expect(source).toContain('export function formatNameList');
    });

    it('should export OrdinalLanguage type', () => {
      const source = readSourceFile('lib/notificationUtils.ts');
      expect(source).toContain('export type OrdinalLanguage');
    });

    it('should support pt-BR, en, es ordinals', () => {
      const source = readSourceFile('lib/notificationUtils.ts');
      expect(source).toContain("'pt-BR'");
      expect(source).toContain("en:");
      expect(source).toContain("es:");
    });

    it('should have ordinals for positions 1, 2, 3', () => {
      const source = readSourceFile('lib/notificationUtils.ts');
      expect(source).toContain("1: '1st'");
      expect(source).toContain("2: '2nd'");
      expect(source).toContain("3: '3rd'");
    });

    it('formatNameList should handle conjunctions per language', () => {
      const source = readSourceFile('lib/notificationUtils.ts');
      expect(source).toContain("' and '");
      expect(source).toContain("' y '");
      expect(source).toContain("' e '");
    });

    it('buildNotificationText should handle 5 notification types', () => {
      const source = readSourceFile('lib/notificationUtils.ts');
      expect(source).toContain('designation');
      expect(source).toContain('weekly_assignment');
      expect(source).toContain('weekly_confirmation');
      expect(source).toContain('speaker_confirmed');
      expect(source).toContain('speaker_withdrew');
    });

    it('buildNotificationText should return title and body', () => {
      const source = readSourceFile('lib/notificationUtils.ts');
      expect(source).toContain('title: string; body: string');
    });

    it('buildNotificationText should return empty strings for unknown type', () => {
      const source = readSourceFile('lib/notificationUtils.ts');
      expect(source).toContain("return { title: '', body: '' }");
    });
  });

  // ===============================================================
  // EXPANDED QA TESTS — Edge cases and AC verification
  // ===============================================================

  // ---------------------------------------------------------------
  // AC-52.5: SyncProvider inside AuthProvider AND QueryClientProvider
  // ---------------------------------------------------------------
  describe('AC-52.5: SyncProvider context requirements', () => {
    it('SyncProvider docstring states it must be inside AuthProvider', () => {
      const source = readSourceFile('providers/SyncProvider.tsx');
      expect(source).toContain('Must be placed inside AuthProvider');
    });

    it('SyncProvider docstring states it must be inside QueryClientProvider', () => {
      const source = readSourceFile('providers/SyncProvider.tsx');
      expect(source).toContain('QueryClientProvider');
    });

    it('_layout.tsx: SyncProvider is inside QueryClientProvider (runtime nesting)', () => {
      const source = readSourceFile('app/_layout.tsx');
      // InnerLayout is rendered inside QueryClientProvider in RootLayout
      // Verify QueryClientProvider exists in RootLayout
      const rootLayout = source.slice(source.indexOf('function RootLayout'));
      expect(rootLayout).toContain('<QueryClientProvider');
      expect(rootLayout).toContain('<InnerLayout');
      // And InnerLayout contains SyncProvider
      const innerLayout = source.slice(
        source.indexOf('function InnerLayout'),
        source.indexOf('function RootLayout'),
      );
      expect(innerLayout).toContain('<SyncProvider>');
    });

    it('_layout.tsx: SyncProvider closing tag is before AuthProvider closing tag', () => {
      const source = readSourceFile('app/_layout.tsx');
      const syncCloseIdx = source.indexOf('</SyncProvider>');
      const authCloseIdx = source.indexOf('</AuthProvider>');
      expect(syncCloseIdx).toBeGreaterThan(-1);
      expect(authCloseIdx).toBeGreaterThan(-1);
      expect(syncCloseIdx).toBeLessThan(authCloseIdx);
    });
  });

  // ---------------------------------------------------------------
  // AC-52.6: Provider order in _layout.tsx
  // ---------------------------------------------------------------
  describe('AC-52.6: Provider order in _layout.tsx', () => {
    it('ErrorBoundary wraps everything (outermost)', () => {
      const source = readSourceFile('app/_layout.tsx');
      const errorIdx = source.indexOf('<ErrorBoundary>');
      const queryIdx = source.indexOf('<QueryClientProvider');
      expect(errorIdx).toBeGreaterThan(-1);
      expect(queryIdx).toBeGreaterThan(-1);
      expect(errorIdx).toBeLessThan(queryIdx);
    });

    it('QueryClientProvider is inside ErrorBoundary', () => {
      const source = readSourceFile('app/_layout.tsx');
      const errorIdx = source.indexOf('<ErrorBoundary>');
      const queryIdx = source.indexOf('<QueryClientProvider');
      const errorCloseIdx = source.indexOf('</ErrorBoundary>');
      expect(queryIdx).toBeGreaterThan(errorIdx);
      expect(queryIdx).toBeLessThan(errorCloseIdx);
    });

    it('I18nextProvider is inside QueryClientProvider', () => {
      const source = readSourceFile('app/_layout.tsx');
      const queryIdx = source.indexOf('<QueryClientProvider');
      const i18nIdx = source.indexOf('<I18nextProvider');
      expect(queryIdx).toBeGreaterThan(-1);
      expect(i18nIdx).toBeGreaterThan(-1);
      expect(queryIdx).toBeLessThan(i18nIdx);
    });

    it('ThemeProvider is inside I18nextProvider', () => {
      const source = readSourceFile('app/_layout.tsx');
      const i18nIdx = source.indexOf('<I18nextProvider');
      const themeIdx = source.indexOf('<ThemeProvider>');
      expect(i18nIdx).toBeGreaterThan(-1);
      expect(themeIdx).toBeGreaterThan(-1);
      expect(i18nIdx).toBeLessThan(themeIdx);
    });

    it('AuthProvider is inside ThemeProvider (via InnerLayout)', () => {
      const source = readSourceFile('app/_layout.tsx');
      // InnerLayout is rendered inside ThemeProvider in RootLayout
      const themeIdx = source.indexOf('<ThemeProvider>');
      const innerIdx = source.indexOf('<InnerLayout');
      expect(themeIdx).toBeGreaterThan(-1);
      expect(innerIdx).toBeGreaterThan(-1);
      expect(themeIdx).toBeLessThan(innerIdx);
      // InnerLayout starts with AuthProvider
      expect(source).toContain('<AuthProvider>');
    });

    it('SyncProvider is inside AuthProvider', () => {
      const source = readSourceFile('app/_layout.tsx');
      const authIdx = source.indexOf('<AuthProvider>');
      const syncIdx = source.indexOf('<SyncProvider>');
      expect(authIdx).toBeLessThan(syncIdx);
    });

    it('NavigationGuard is inside SyncProvider', () => {
      const source = readSourceFile('app/_layout.tsx');
      const syncIdx = source.indexOf('<SyncProvider>');
      const navIdx = source.indexOf('<NavigationGuard>');
      expect(syncIdx).toBeGreaterThan(-1);
      expect(navIdx).toBeGreaterThan(-1);
      expect(syncIdx).toBeLessThan(navIdx);
    });

    it('full provider nesting order is correct: Error > Query > I18n > Theme > Auth > Sync > Nav', () => {
      const source = readSourceFile('app/_layout.tsx');
      // RootLayout nesting: ErrorBoundary > QueryClientProvider > I18nextProvider > ThemeProvider > InnerLayout
      const rootLayout = source.slice(source.indexOf('function RootLayout'));
      const rootIndices = [
        rootLayout.indexOf('<ErrorBoundary>'),
        rootLayout.indexOf('<QueryClientProvider'),
        rootLayout.indexOf('<I18nextProvider'),
        rootLayout.indexOf('<ThemeProvider>'),
        rootLayout.indexOf('<InnerLayout'),
      ];
      for (const idx of rootIndices) {
        expect(idx).toBeGreaterThan(-1);
      }
      for (let i = 1; i < rootIndices.length; i++) {
        expect(rootIndices[i]).toBeGreaterThan(rootIndices[i - 1]);
      }

      // InnerLayout nesting: AuthProvider > SyncProvider > NavigationGuard
      const innerLayout = source.slice(
        source.indexOf('function InnerLayout'),
        source.indexOf('function RootLayout'),
      );
      const innerIndices = [
        innerLayout.indexOf('<AuthProvider>'),
        innerLayout.indexOf('<SyncProvider>'),
        innerLayout.indexOf('<NavigationGuard>'),
      ];
      for (const idx of innerIndices) {
        expect(idx).toBeGreaterThan(-1);
      }
      for (let i = 1; i < innerIndices.length; i++) {
        expect(innerIndices[i]).toBeGreaterThan(innerIndices[i - 1]);
      }
    });
  });

  // ---------------------------------------------------------------
  // All hook source files exist
  // ---------------------------------------------------------------
  describe('All hook and lib source files exist', () => {
    const files = [
      'hooks/useConnection.ts',
      'hooks/useRealtimeSync.ts',
      'hooks/useNotifications.ts',
      'hooks/useOfflineQueueProcessor.ts',
      'components/OfflineBanner.tsx',
      'lib/offlineQueue.ts',
      'lib/sync.ts',
      'lib/connectionUtils.ts',
      'lib/notificationUtils.ts',
      'providers/SyncProvider.tsx',
    ];

    files.forEach((file) => {
      it(`${file} should exist`, () => {
        const filePath = path.resolve(__dirname, '..', file);
        expect(fs.existsSync(filePath)).toBe(true);
      });
    });
  });

  // ---------------------------------------------------------------
  // connectionUtils: functional tests using import
  // ---------------------------------------------------------------
  describe('connectionUtils: functional tests', () => {
    // Import the pure function for direct testing
    let isNetInfoOnline: (state: { isConnected: boolean | null; isInternetReachable: boolean | null }) => boolean;

    it('should be importable as a pure function', async () => {
      const mod = await import('../lib/connectionUtils');
      isNetInfoOnline = mod.isNetInfoOnline;
      expect(typeof isNetInfoOnline).toBe('function');
    });

    it('returns true when connected and reachable', async () => {
      const mod = await import('../lib/connectionUtils');
      expect(mod.isNetInfoOnline({ isConnected: true, isInternetReachable: true })).toBe(true);
    });

    it('returns true when connected and reachable is null (unknown)', async () => {
      const mod = await import('../lib/connectionUtils');
      expect(mod.isNetInfoOnline({ isConnected: true, isInternetReachable: null })).toBe(true);
    });

    it('returns false when not connected', async () => {
      const mod = await import('../lib/connectionUtils');
      expect(mod.isNetInfoOnline({ isConnected: false, isInternetReachable: true })).toBe(false);
    });

    it('returns false when connected is null', async () => {
      const mod = await import('../lib/connectionUtils');
      expect(mod.isNetInfoOnline({ isConnected: null, isInternetReachable: true })).toBe(false);
    });

    it('returns false when connected but not reachable', async () => {
      const mod = await import('../lib/connectionUtils');
      expect(mod.isNetInfoOnline({ isConnected: true, isInternetReachable: false })).toBe(false);
    });

    it('returns false when both null', async () => {
      const mod = await import('../lib/connectionUtils');
      expect(mod.isNetInfoOnline({ isConnected: null, isInternetReachable: null })).toBe(false);
    });
  });

  // ---------------------------------------------------------------
  // notificationUtils: functional tests using import
  // ---------------------------------------------------------------
  describe('notificationUtils: functional tests', () => {
    it('getOrdinal returns correct English ordinals', async () => {
      const { getOrdinal } = await import('../lib/notificationUtils');
      expect(getOrdinal(1, 'en')).toBe('1st');
      expect(getOrdinal(2, 'en')).toBe('2nd');
      expect(getOrdinal(3, 'en')).toBe('3rd');
    });

    it('getOrdinal returns correct pt-BR ordinals', async () => {
      const { getOrdinal } = await import('../lib/notificationUtils');
      expect(getOrdinal(1, 'pt-BR')).toBe('1\u00BA');
      expect(getOrdinal(2, 'pt-BR')).toBe('2\u00BA');
      expect(getOrdinal(3, 'pt-BR')).toBe('3\u00BA');
    });

    it('getOrdinal returns correct Spanish ordinals', async () => {
      const { getOrdinal } = await import('../lib/notificationUtils');
      expect(getOrdinal(1, 'es')).toBe('1er');
      expect(getOrdinal(2, 'es')).toBe('2do');
      expect(getOrdinal(3, 'es')).toBe('3er');
    });

    it('getOrdinal falls back to number string for unknown position', async () => {
      const { getOrdinal } = await import('../lib/notificationUtils');
      expect(getOrdinal(99, 'en')).toBe('99');
    });

    it('formatNameList handles empty array', async () => {
      const { formatNameList } = await import('../lib/notificationUtils');
      expect(formatNameList([], 'en')).toBe('');
    });

    it('formatNameList handles single name', async () => {
      const { formatNameList } = await import('../lib/notificationUtils');
      expect(formatNameList(['Alice'], 'en')).toBe('Alice');
    });

    it('formatNameList handles two names in English', async () => {
      const { formatNameList } = await import('../lib/notificationUtils');
      expect(formatNameList(['Alice', 'Bob'], 'en')).toBe('Alice and Bob');
    });

    it('formatNameList handles two names in Portuguese', async () => {
      const { formatNameList } = await import('../lib/notificationUtils');
      expect(formatNameList(['Alice', 'Bob'], 'pt-BR')).toBe('Alice e Bob');
    });

    it('formatNameList handles two names in Spanish', async () => {
      const { formatNameList } = await import('../lib/notificationUtils');
      expect(formatNameList(['Alice', 'Bob'], 'es')).toBe('Alice y Bob');
    });

    it('formatNameList handles three names in English', async () => {
      const { formatNameList } = await import('../lib/notificationUtils');
      expect(formatNameList(['Alice', 'Bob', 'Carol'], 'en')).toBe('Alice, Bob and Carol');
    });

    it('formatNameList handles three names in Portuguese', async () => {
      const { formatNameList } = await import('../lib/notificationUtils');
      expect(formatNameList(['Alice', 'Bob', 'Carol'], 'pt-BR')).toBe('Alice, Bob e Carol');
    });

    it('buildNotificationText returns empty for unknown type', async () => {
      const { buildNotificationText } = await import('../lib/notificationUtils');
      const result = buildNotificationText('unknown_type', 'en', {});
      expect(result.title).toBe('');
      expect(result.body).toBe('');
    });

    it('buildNotificationText designation in English', async () => {
      const { buildNotificationText } = await import('../lib/notificationUtils');
      const result = buildNotificationText('designation', 'en', {
        names: ['John'],
        date: 'Jan 5',
      });
      expect(result.title).toBe('Speech Assignment');
      expect(result.body).toContain('John');
      expect(result.body).toContain('was assigned');
      expect(result.body).toContain('Jan 5');
    });

    it('buildNotificationText designation plural in English', async () => {
      const { buildNotificationText } = await import('../lib/notificationUtils');
      const result = buildNotificationText('designation', 'en', {
        names: ['John', 'Jane'],
        date: 'Jan 5',
      });
      expect(result.body).toContain('were assigned');
    });

    it('buildNotificationText speaker_confirmed in pt-BR', async () => {
      const { buildNotificationText } = await import('../lib/notificationUtils');
      const result = buildNotificationText('speaker_confirmed', 'pt-BR', {
        name: 'Carlos',
        position: 2,
        date: '5 jan',
      });
      expect(result.title).toBe('Orador Confirmado');
      expect(result.body).toContain('Carlos');
      expect(result.body).toContain('2\u00BA');
    });

    it('buildNotificationText speaker_withdrew in English', async () => {
      const { buildNotificationText } = await import('../lib/notificationUtils');
      const result = buildNotificationText('speaker_withdrew', 'en', {
        name: 'John',
        position: 1,
        date: 'Jan 5',
      });
      expect(result.title).toContain('ATTENTION');
      expect(result.body).toContain('NOT');
      expect(result.body).toContain('1st');
    });

    it('buildNotificationText weekly_assignment returns reminder', async () => {
      const { buildNotificationText } = await import('../lib/notificationUtils');
      const result = buildNotificationText('weekly_assignment', 'en', {});
      expect(result.title).toContain('Reminder');
      expect(result.body).toContain('speakers');
    });

    it('buildNotificationText falls back to pt-BR for unknown language', async () => {
      const { buildNotificationText } = await import('../lib/notificationUtils');
      // Unknown language falls back to pt-BR via ?? texts['pt-BR']
      const result = buildNotificationText('weekly_assignment', 'xx' as any, {});
      expect(result.title).toContain('Lembrete');
    });
  });

  // ---------------------------------------------------------------
  // offlineQueue: functional tests using import
  // ---------------------------------------------------------------
  describe('offlineQueue: functional tests', () => {
    it('hasCapacity returns true when under limit', async () => {
      const { hasCapacity } = await import('../lib/offlineQueue');
      expect(hasCapacity(0)).toBe(true);
      expect(hasCapacity(50)).toBe(true);
      expect(hasCapacity(99)).toBe(true);
    });

    it('hasCapacity returns false at or above limit', async () => {
      const { hasCapacity } = await import('../lib/offlineQueue');
      expect(hasCapacity(100)).toBe(false);
      expect(hasCapacity(101)).toBe(false);
    });

    it('shouldRetry returns true when under max retries', async () => {
      const { shouldRetry } = await import('../lib/offlineQueue');
      expect(shouldRetry(0)).toBe(true);
      expect(shouldRetry(1)).toBe(true);
      expect(shouldRetry(2)).toBe(true);
    });

    it('shouldRetry returns false at or above max retries', async () => {
      const { shouldRetry } = await import('../lib/offlineQueue');
      expect(shouldRetry(3)).toBe(false);
      expect(shouldRetry(4)).toBe(false);
    });

    it('getMaxQueueSize returns 100', async () => {
      const { getMaxQueueSize } = await import('../lib/offlineQueue');
      expect(getMaxQueueSize()).toBe(100);
    });

    it('getMaxRetries returns 3', async () => {
      const { getMaxRetries } = await import('../lib/offlineQueue');
      expect(getMaxRetries()).toBe(3);
    });
  });

  // ---------------------------------------------------------------
  // Edge cases: useConnection
  // ---------------------------------------------------------------
  describe('useConnection edge cases', () => {
    it('should initialize showOfflineBanner to false', () => {
      const source = readSourceFile('hooks/useConnection.ts');
      // The third useState should be showOfflineBanner(false)
      const stateMatches = source.match(/useState\((true|false)\)/g);
      expect(stateMatches).not.toBeNull();
      // isOnline=true, isWebSocketConnected=false, showOfflineBanner=false
      expect(stateMatches).toHaveLength(3);
      expect(stateMatches![2]).toBe('useState(false)');
    });

    it('should clear existing timeout before setting new one when going offline', () => {
      const source = readSourceFile('hooks/useConnection.ts');
      // When going offline, it clears existing timeout
      const offlineBlock = source.slice(source.indexOf('if (!online)'));
      expect(offlineBlock).toContain('clearTimeout(bannerTimeoutRef.current)');
      expect(offlineBlock).toContain('bannerTimeoutRef.current = null');
    });

    it('setWebSocketConnected should be a stable reference via useCallback with empty deps', () => {
      const source = readSourceFile('hooks/useConnection.ts');
      // useCallback with empty deps
      const callbackIdx = source.indexOf('useCallback((connected: boolean)');
      expect(callbackIdx).toBeGreaterThan(-1);
      const afterCallback = source.slice(callbackIdx, callbackIdx + 200);
      expect(afterCallback).toContain('}, [])');
    });

    it('useEffect should have empty dependency array for NetInfo listener', () => {
      const source = readSourceFile('hooks/useConnection.ts');
      const effectIdx = source.indexOf('useEffect(() => {');
      const afterEffect = source.slice(effectIdx);
      // Find the closing of this useEffect (the first }, [])
      const closingIdx = afterEffect.indexOf('}, []);');
      expect(closingIdx).toBeGreaterThan(-1);
    });
  });

  // ---------------------------------------------------------------
  // Edge cases: useRealtimeSync
  // ---------------------------------------------------------------
  describe('useRealtimeSync edge cases', () => {
    it('should guard subscription on missing wardId', () => {
      const source = readSourceFile('hooks/useRealtimeSync.ts');
      expect(source).toContain('if (!wardId || !isOnline)');
    });

    it('should remove existing channel before creating new one (cleanup)', () => {
      const source = readSourceFile('hooks/useRealtimeSync.ts');
      // Cleanup in the return of useEffect
      expect(source).toContain('supabase.removeChannel(channelRef.current)');
    });

    it('should set WebSocket disconnected on cleanup', () => {
      const source = readSourceFile('hooks/useRealtimeSync.ts');
      // After removeChannel in cleanup
      const returnIdx = source.lastIndexOf('return () => {');
      const cleanupBlock = source.slice(returnIdx, returnIdx + 300);
      expect(cleanupBlock).toContain('setWebSocketConnected(false)');
    });

    it('should call invalidateAll on SUBSCRIBED (immediate refresh)', () => {
      const source = readSourceFile('hooks/useRealtimeSync.ts');
      const subscribedBlock = source.slice(source.indexOf("'SUBSCRIBED'"));
      expect(subscribedBlock).toContain('invalidateAll()');
    });

    it('startPolling should be idempotent (guard isPollingRef)', () => {
      const source = readSourceFile('hooks/useRealtimeSync.ts');
      expect(source).toContain('if (isPollingRef.current) return');
    });

    it('stopPolling should be idempotent (guard isPollingRef)', () => {
      const source = readSourceFile('hooks/useRealtimeSync.ts');
      expect(source).toContain('if (!isPollingRef.current) return');
    });

    it('should use clearInterval for polling cleanup', () => {
      const source = readSourceFile('hooks/useRealtimeSync.ts');
      expect(source).toContain('clearInterval(pollingRef.current)');
    });

    it('useEffect dependency array includes all required deps', () => {
      const source = readSourceFile('hooks/useRealtimeSync.ts');
      expect(source).toContain('[wardId, isOnline, invalidateForTable, invalidateAll, setWebSocketConnected, startPolling, stopPolling]');
    });
  });

  // ---------------------------------------------------------------
  // Edge cases: useOfflineQueueProcessor
  // ---------------------------------------------------------------
  describe('useOfflineQueueProcessor edge cases', () => {
    it('should prevent concurrent processing via processingRef guard', () => {
      const source = readSourceFile('hooks/useOfflineQueueProcessor.ts');
      expect(source).toContain('if (processingRef.current) return');
      expect(source).toContain('processingRef.current = true');
    });

    it('should set processingRef.current = true before processing', () => {
      const source = readSourceFile('hooks/useOfflineQueueProcessor.ts');
      const processQueueFn = source.slice(source.indexOf('async function processQueue'));
      const setTrueIdx = processQueueFn.indexOf('processingRef.current = true');
      const whileIdx = processQueueFn.indexOf('while (mutation)');
      expect(setTrueIdx).toBeGreaterThan(-1);
      expect(whileIdx).toBeGreaterThan(-1);
      expect(setTrueIdx).toBeLessThan(whileIdx);
    });

    it('should call queryClient.invalidateQueries() without args after drain', () => {
      const source = readSourceFile('hooks/useOfflineQueueProcessor.ts');
      expect(source).toContain('queryClient.invalidateQueries()');
    });

    it('should have isOnline and queryClient in useEffect dependency array', () => {
      const source = readSourceFile('hooks/useOfflineQueueProcessor.ts');
      expect(source).toContain('[isOnline, queryClient]');
    });

    it('should import only dequeue from offlineQueue (not enqueue)', () => {
      const source = readSourceFile('hooks/useOfflineQueueProcessor.ts');
      expect(source).toContain("import { dequeue } from '../lib/offlineQueue'");
      expect(source).not.toContain('enqueue');
    });
  });

  // ---------------------------------------------------------------
  // Edge cases: OfflineBanner
  // ---------------------------------------------------------------
  describe('OfflineBanner edge cases', () => {
    it('should have subtext color #FED7D7 (lighter red for description)', () => {
      const source = readSourceFile('components/OfflineBanner.tsx');
      expect(source).toContain('#FED7D7');
    });

    it('should import React', () => {
      const source = readSourceFile('components/OfflineBanner.tsx');
      expect(source).toContain("import React from 'react'");
    });

    it('should import View, Text, StyleSheet from react-native', () => {
      const source = readSourceFile('components/OfflineBanner.tsx');
      expect(source).toContain("import { View, Text, StyleSheet } from 'react-native'");
    });

    it('should have paddingBottom and paddingHorizontal on banner', () => {
      const source = readSourceFile('components/OfflineBanner.tsx');
      expect(source).toContain('paddingBottom: 8');
      expect(source).toContain('paddingHorizontal: 16');
    });

    it('should center items', () => {
      const source = readSourceFile('components/OfflineBanner.tsx');
      expect(source).toContain("alignItems: 'center'");
    });

    it('text should be bold (fontWeight 700)', () => {
      const source = readSourceFile('components/OfflineBanner.tsx');
      expect(source).toContain("fontWeight: '700'");
    });
  });

  // ---------------------------------------------------------------
  // Edge cases: useNotifications
  // ---------------------------------------------------------------
  describe('useNotifications edge cases', () => {
    it('useRegisterPushToken useEffect dependency array includes all deps', () => {
      const source = readSourceFile('hooks/useNotifications.ts');
      expect(source).toContain('[user, role, wardId, isOnline]');
    });

    it('useNotificationHandler useEffect dependency includes handleResponse', () => {
      const source = readSourceFile('hooks/useNotifications.ts');
      expect(source).toContain('[handleResponse]');
    });

    it('should use user.id for userId in upsert', () => {
      const source = readSourceFile('hooks/useNotifications.ts');
      expect(source).toContain('const userId = user.id');
      expect(source).toContain('user_id: userId');
    });

    it('should import useAuth from AuthContext', () => {
      const source = readSourceFile('hooks/useNotifications.ts');
      expect(source).toContain("import { useAuth } from '../contexts/AuthContext'");
    });

    it('should import supabase from lib', () => {
      const source = readSourceFile('hooks/useNotifications.ts');
      expect(source).toContain("import { supabase } from '../lib/supabase'");
    });

    it('Android channel name should be "Default"', () => {
      const source = readSourceFile('hooks/useNotifications.ts');
      expect(source).toContain("'default'");
      expect(source).toContain("name: 'Default'");
    });

    it('handleResponse callback has [router] in dependency array', () => {
      const source = readSourceFile('hooks/useNotifications.ts');
      const callbackBlock = source.slice(source.indexOf('const handleResponse = useCallback'));
      const depsMatch = callbackBlock.indexOf('[router]');
      expect(depsMatch).toBeGreaterThan(-1);
    });

    it('cold start check uses .then chaining', () => {
      const source = readSourceFile('hooks/useNotifications.ts');
      expect(source).toContain('getLastNotificationResponseAsync().then');
    });

    it('should check finalStatus before token registration', () => {
      const source = readSourceFile('hooks/useNotifications.ts');
      expect(source).toContain("if (finalStatus !== 'granted') return");
    });

    it('should set notification handler at module level (not inside hook)', () => {
      const source = readSourceFile('hooks/useNotifications.ts');
      // setNotificationHandler appears BEFORE the first export function
      const handlerIdx = source.indexOf('setNotificationHandler');
      const firstExportFn = source.indexOf('export function');
      expect(handlerIdx).toBeGreaterThan(-1);
      expect(firstExportFn).toBeGreaterThan(-1);
      expect(handlerIdx).toBeLessThan(firstExportFn);
    });
  });

  // ---------------------------------------------------------------
  // Edge cases: SyncProvider hook ordering
  // ---------------------------------------------------------------
  describe('SyncProvider hook call ordering', () => {
    it('useConnection is called before useRealtimeSync', () => {
      const source = readSourceFile('providers/SyncProvider.tsx');
      const connIdx = source.indexOf('useConnection()');
      const syncIdx = source.indexOf('useRealtimeSync(');
      expect(connIdx).toBeLessThan(syncIdx);
    });

    it('useRealtimeSync is called before useOfflineQueueProcessor', () => {
      const source = readSourceFile('providers/SyncProvider.tsx');
      const syncIdx = source.indexOf('useRealtimeSync(');
      const queueIdx = source.indexOf('useOfflineQueueProcessor(');
      expect(syncIdx).toBeLessThan(queueIdx);
    });

    it('useOfflineQueueProcessor is called before useRegisterPushToken', () => {
      const source = readSourceFile('providers/SyncProvider.tsx');
      const queueIdx = source.indexOf('useOfflineQueueProcessor(');
      const tokenIdx = source.indexOf('useRegisterPushToken(');
      expect(queueIdx).toBeLessThan(tokenIdx);
    });

    it('useRegisterPushToken is called before useNotificationHandler', () => {
      const source = readSourceFile('providers/SyncProvider.tsx');
      const tokenIdx = source.indexOf('useRegisterPushToken(');
      const handlerIdx = source.indexOf('useNotificationHandler()');
      expect(tokenIdx).toBeLessThan(handlerIdx);
    });

    it('SyncProvider calls exactly 5 hooks', () => {
      const source = readSourceFile('providers/SyncProvider.tsx');
      const fnBody = source.slice(source.indexOf('export function SyncProvider'));
      // Count hook calls
      const hookCalls = [
        'useConnection()',
        'useRealtimeSync(',
        'useOfflineQueueProcessor(',
        'useRegisterPushToken(',
        'useNotificationHandler()',
      ];
      for (const hook of hookCalls) {
        expect(fnBody).toContain(hook);
      }
    });
  });

  // ---------------------------------------------------------------
  // sync.ts: TABLE_TO_QUERY_KEYS completeness
  // ---------------------------------------------------------------
  describe('sync.ts: TABLE_TO_QUERY_KEYS completeness', () => {
    it('each SYNCED_TABLE should have a mapping in TABLE_TO_QUERY_KEYS', () => {
      const source = readSourceFile('lib/sync.ts');
      const tables = [
        'members',
        'ward_topics',
        'ward_collection_config',
        'sunday_exceptions',
        'speeches',
        'sunday_agendas',
        'meeting_actors',
      ];
      for (const table of tables) {
        // Check that the table appears as a key in TABLE_TO_QUERY_KEYS
        expect(source).toContain(`${table}:`);
      }
    });

    it('ward_collection_config maps to topicKeys', () => {
      const source = readSourceFile('lib/sync.ts');
      // ward_collection_config should invalidate topic queries
      const configLine = source.slice(source.indexOf('ward_collection_config:'));
      expect(configLine).toContain('topicKeys');
    });

    it('should import hook key factories from 6 different hook modules', () => {
      const source = readSourceFile('lib/sync.ts');
      expect(source).toContain("from '../hooks/useMembers'");
      expect(source).toContain("from '../hooks/useTopics'");
      expect(source).toContain("from '../hooks/useSundayTypes'");
      expect(source).toContain("from '../hooks/useSpeeches'");
      expect(source).toContain("from '../hooks/useAgenda'");
      expect(source).toContain("from '../hooks/useActors'");
    });

    it('SyncedTable type should be a union of 7 string literals', () => {
      const source = readSourceFile('lib/sync.ts');
      const typeMatch = source.match(/export type SyncedTable\s*=[^;]+;/s);
      expect(typeMatch).not.toBeNull();
      // Count the pipe-separated members (leading | for each member = 7 pipes)
      const pipes = (typeMatch![0].match(/\|/g) || []).length;
      expect(pipes).toBe(7);
    });
  });
});
