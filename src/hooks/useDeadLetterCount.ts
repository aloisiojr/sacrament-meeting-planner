/**
 * Live count of mutations in the offline dead-letter list (EST-04): writes that exhausted their
 * retries and never reached the server. Drives the "N unsynced" badge so a discarded edit is
 * always visible to the user instead of only existing as a console.warn.
 */
import { useEffect, useState } from 'react';
import { getDeadLetterCount, onDeadLetterChange } from '../lib/offlineQueue';

export function useDeadLetterCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getDeadLetterCount()
      .then((n) => {
        if (!cancelled) setCount(n);
      })
      .catch(() => {
        // Storage unreadable: the badge stays hidden rather than crashing the shell.
      });
    const unsubscribe = onDeadLetterChange((n) => {
      if (!cancelled) setCount(n);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return count;
}
