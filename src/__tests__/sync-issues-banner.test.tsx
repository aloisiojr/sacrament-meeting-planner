/**
 * The dead-letter badge (EST-04): a mutation that exhausted its retries used to vanish with
 * only a console.warn. The shell now always shows how many changes never synced — and stops
 * showing it when the list is cleared (sign-out).
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number }) => `${key}:${opts?.count ?? ''}`,
  }),
}));
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: { error: '#c00', textInverse: '#fff' } }),
}));

import { SyncIssuesBanner } from '../components/SyncIssuesBanner';
import { enqueue, incrementRetry, clearQueue, getMaxRetries } from '../lib/offlineQueue';

async function deadLetterOne() {
  await enqueue({
    id: 'd1',
    table: 'speeches',
    operation: 'UPDATE',
    data: { id: 'sp1', topic_title: 'Faith' },
    timestamp: 1,
  });
  for (let i = 0; i < getMaxRetries(); i++) {
    await incrementRetry();
  }
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('SyncIssuesBanner (EST-04)', () => {
  it('renders nothing while every change has synced', async () => {
    await render(<SyncIssuesBanner />);
    expect(screen.queryByTestId('sync-issues-banner')).toBeNull();
  });

  it('shows the unsynced count once a mutation is dead-lettered, and hides after clear', async () => {
    await render(<SyncIssuesBanner />);
    expect(screen.queryByTestId('sync-issues-banner')).toBeNull();

    await act(async () => {
      await deadLetterOne();
    });

    expect(screen.getByTestId('sync-issues-banner')).toHaveTextContent('offline.unsyncedCount:1');

    await act(async () => {
      await clearQueue();
    });
    expect(screen.queryByTestId('sync-issues-banner')).toBeNull();
  });

  it('shows a pre-existing dead-letter count on mount (cold start)', async () => {
    await deadLetterOne();
    await deadLetterOne();

    await render(<SyncIssuesBanner />);
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId('sync-issues-banner')).toHaveTextContent('offline.unsyncedCount:2');
  });
});
