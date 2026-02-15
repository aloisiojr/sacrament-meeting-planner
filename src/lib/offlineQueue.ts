/**
 * OfflineQueue: persists pending mutations in AsyncStorage.
 * FIFO processing on reconnect. Max 100 entries.
 * Conflict resolution: last-write-wins via updated_at.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Types ---

export interface QueuedMutation {
  id: string;
  table: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

// --- Constants ---

const QUEUE_KEY = '@offline_mutation_queue';
const MAX_QUEUE_SIZE = 100;
const MAX_RETRIES = 3;

// --- Queue Operations ---

/**
 * Read the current queue from AsyncStorage.
 */
export async function readQueue(): Promise<QueuedMutation[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

/**
 * Write the queue to AsyncStorage (atomic).
 */
async function writeQueue(queue: QueuedMutation[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/**
 * Enqueue a new mutation. Returns false if queue is full.
 */
export async function enqueue(mutation: Omit<QueuedMutation, 'retryCount'>): Promise<boolean> {
  const queue = await readQueue();
  if (queue.length >= MAX_QUEUE_SIZE) {
    return false;
  }
  queue.push({ ...mutation, retryCount: 0 });
  await writeQueue(queue);
  return true;
}

/**
 * Dequeue the first mutation (FIFO).
 */
export async function dequeue(): Promise<QueuedMutation | null> {
  const queue = await readQueue();
  if (queue.length === 0) return null;
  const [first, ...rest] = queue;
  await writeQueue(rest);
  return first;
}

/**
 * Peek at the first mutation without removing it.
 */
export async function peek(): Promise<QueuedMutation | null> {
  const queue = await readQueue();
  return queue[0] ?? null;
}

/**
 * Get current queue size.
 */
export async function getQueueSize(): Promise<number> {
  const queue = await readQueue();
  return queue.length;
}

/**
 * Clear the entire queue.
 */
export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

/**
 * Increment retry count for the first item. Returns true if under max retries.
 */
export async function incrementRetry(): Promise<boolean> {
  const queue = await readQueue();
  if (queue.length === 0) return false;

  queue[0].retryCount += 1;
  if (queue[0].retryCount >= MAX_RETRIES) {
    // Discard the mutation after max retries
    queue.shift();
    await writeQueue(queue);
    return false;
  }

  await writeQueue(queue);
  return true;
}

// --- Pure utilities for testing ---

/**
 * Check if queue has capacity for more mutations.
 */
export function hasCapacity(currentSize: number): boolean {
  return currentSize < MAX_QUEUE_SIZE;
}

/**
 * Check if a mutation should be retried.
 */
export function shouldRetry(retryCount: number): boolean {
  return retryCount < MAX_RETRIES;
}

/**
 * Get the max queue size constant.
 */
export function getMaxQueueSize(): number {
  return MAX_QUEUE_SIZE;
}

/**
 * Get the max retries constant.
 */
export function getMaxRetries(): number {
  return MAX_RETRIES;
}
