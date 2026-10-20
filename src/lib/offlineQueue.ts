/**
 * OfflineQueue: persists pending mutations in AsyncStorage.
 * FIFO processing on reconnect. Max 100 entries.
 * Conflict resolution: last-write-wins via updated_at.
 *
 * Hardened per EST-04 (audit v2.0): every read-modify-write runs under an in-memory mutex so two
 * concurrent enqueues cannot interleave into a lost write; a payload that fails to parse is
 * quarantined (preserved under a separate key) instead of being read as `[]` and then crystallised
 * by the next write; and a mutation that exhausts its retry budget moves to a persisted
 * dead-letter list — visible and countable — instead of being dropped with only a console.warn.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Types ---

export interface QueuedMutation {
  id: string;
  table: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'UPSERT';
  data: Record<string, unknown>;
  /**
   * Conflict target for UPSERT replay (e.g. 'ward_id,sunday_date' for sunday_agendas, whose row id
   * is unknown while offline). INSERT replay always upserts on 'id'.
   */
  onConflict?: string;
  timestamp: number;
  retryCount: number;
}

/** A mutation that exhausted its retries: kept, countable, never silently dropped. */
export interface DeadLetterEntry extends QueuedMutation {
  failedAt: number;
}

// --- Constants ---

const QUEUE_KEY = '@offline_mutation_queue';
const QUARANTINE_KEY = '@offline_mutation_queue_quarantine';
const DEAD_LETTER_KEY = '@offline_mutation_dead_letter';
const MAX_QUEUE_SIZE = 100;
const MAX_RETRIES = 3;

// --- In-memory mutex ---

let queueLock: Promise<void> = Promise.resolve();

/**
 * Serialize queue operations. AsyncStorage reads/writes are async, so two overlapping
 * read-modify-write cycles would otherwise both read the same snapshot and the second write would
 * erase the first one's change. The lock is a promise chain: each operation starts only after the
 * previous one settles, and a failed operation releases the lock instead of wedging it.
 */
function withQueueLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queueLock.then(fn, fn);
  queueLock = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

// --- Dead-letter change notification (for the "N unsynced" badge) ---

type DeadLetterListener = (count: number) => void;
const deadLetterListeners = new Set<DeadLetterListener>();

/** Subscribe to dead-letter count changes. Returns an unsubscribe function. */
export function onDeadLetterChange(listener: DeadLetterListener): () => void {
  deadLetterListeners.add(listener);
  return () => {
    deadLetterListeners.delete(listener);
  };
}

function notifyDeadLetter(count: number): void {
  deadLetterListeners.forEach((listener) => {
    try {
      listener(count);
    } catch {
      // A broken badge listener must never break the queue itself.
    }
  });
}

// --- Raw storage helpers (must be called under the lock) ---

/**
 * Read and parse a stored list. A payload that is not a JSON array is quarantined — copied to the
 * quarantine key and removed from the live key — and the list reads as empty. The raw bytes survive
 * for diagnosis; without this, the next ordinary write would persist `[]` over the user's pending
 * edits and the loss would be unrecoverable and invisible.
 */
async function readList<T>(key: string): Promise<T[]> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('stored payload is not an array');
    return parsed as T[];
  } catch {
    await AsyncStorage.setItem(QUARANTINE_KEY, raw);
    await AsyncStorage.removeItem(key);
    return [];
  }
}

async function readQueueLocked(): Promise<QueuedMutation[]> {
  return readList<QueuedMutation>(QUEUE_KEY);
}

async function writeQueue(queue: QueuedMutation[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

async function readDeadLetterLocked(): Promise<DeadLetterEntry[]> {
  return readList<DeadLetterEntry>(DEAD_LETTER_KEY);
}

/** Append the queue head to the dead-letter list and drop it from the queue (lock held). */
async function moveHeadToDeadLetterLocked(queue: QueuedMutation[]): Promise<DeadLetterEntry | null> {
  const [head, ...rest] = queue;
  if (!head) return null;
  const dead: DeadLetterEntry = { ...head, failedAt: Date.now() };
  const deadLetter = await readDeadLetterLocked();
  deadLetter.push(dead);
  await AsyncStorage.setItem(DEAD_LETTER_KEY, JSON.stringify(deadLetter));
  await writeQueue(rest);
  notifyDeadLetter(deadLetter.length);
  return dead;
}

// --- Queue Operations ---

/**
 * Read the current queue from AsyncStorage.
 */
export async function readQueue(): Promise<QueuedMutation[]> {
  return withQueueLock(readQueueLocked);
}

/**
 * Enqueue a new mutation. Returns false if queue is full.
 */
export async function enqueue(mutation: Omit<QueuedMutation, 'retryCount'>): Promise<boolean> {
  return withQueueLock(async () => {
    const queue = await readQueueLocked();
    if (queue.length >= MAX_QUEUE_SIZE) {
      return false;
    }
    queue.push({ ...mutation, retryCount: 0 });
    await writeQueue(queue);
    return true;
  });
}

/**
 * Dequeue the first mutation (FIFO).
 */
export async function dequeue(): Promise<QueuedMutation | null> {
  return withQueueLock(async () => {
    const queue = await readQueueLocked();
    if (queue.length === 0) return null;
    const [first, ...rest] = queue;
    await writeQueue(rest);
    return first;
  });
}

/**
 * Peek at the first mutation without removing it.
 */
export async function peek(): Promise<QueuedMutation | null> {
  return withQueueLock(async () => {
    const queue = await readQueueLocked();
    return queue[0] ?? null;
  });
}

/**
 * Get current queue size.
 */
export async function getQueueSize(): Promise<number> {
  return withQueueLock(async () => {
    const queue = await readQueueLocked();
    return queue.length;
  });
}

/**
 * Clear the entire queue AND the dead-letter list. Called on sign-out (EST-05): pending writes and
 * unsynced failures belong to the user who is leaving and must never replay — or even show a count
 * — under the next session on this device.
 */
export async function clearQueue(): Promise<void> {
  return withQueueLock(async () => {
    await AsyncStorage.removeItem(QUEUE_KEY);
    await AsyncStorage.removeItem(DEAD_LETTER_KEY);
    notifyDeadLetter(0);
  });
}

/**
 * Increment retry count for the first item. Returns true if under max retries. When the budget is
 * exhausted the entry moves to the persisted dead-letter list (visible, countable) instead of being
 * discarded, and false is returned.
 */
export async function incrementRetry(): Promise<boolean> {
  return withQueueLock(async () => {
    const queue = await readQueueLocked();
    if (queue.length === 0) return false;

    queue[0].retryCount += 1;
    if (queue[0].retryCount >= MAX_RETRIES) {
      await moveHeadToDeadLetterLocked(queue);
      return false;
    }

    await writeQueue(queue);
    return true;
  });
}

/**
 * Move the head entry straight to the dead-letter list, regardless of its retry budget. Returns the
 * dead-lettered entry, or null when the queue is empty. Used by the processor for rejections that
 * retrying cannot fix.
 */
export async function deadLetterHead(): Promise<DeadLetterEntry | null> {
  return withQueueLock(async () => {
    const queue = await readQueueLocked();
    return moveHeadToDeadLetterLocked(queue);
  });
}

// --- Dead-letter Operations ---

/** Read the persisted dead-letter list (mutations that never synced). */
export async function readDeadLetter(): Promise<DeadLetterEntry[]> {
  return withQueueLock(readDeadLetterLocked);
}

/** How many mutations are sitting in the dead-letter list — drives the "N unsynced" badge. */
export async function getDeadLetterCount(): Promise<number> {
  return withQueueLock(async () => (await readDeadLetterLocked()).length);
}

/** Read the quarantined raw payload, if any (diagnosis of corrupt storage). */
export async function readQuarantine(): Promise<string | null> {
  return AsyncStorage.getItem(QUARANTINE_KEY);
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
