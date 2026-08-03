# Why there are no tests for the notification triggers

`enqueue_speech_notification()` (migrations 028 and 031) is PL/pgSQL. Three test files used to
"cover" it — `migration-031.test.ts`, `f059-designation-notification-guard.test.ts` and the second
half of `f065-f066-tester.test.ts` — with a combined ~90 it-blocks, all built the same way:

```ts
function simulateTrigger(op, NEW, OLD) { /* the SQL, rewritten in JavaScript */ }
it('enqueues on assignment', () => expect(simulateTrigger(...)).toEqual([...]))
```

They asserted the JavaScript copy. Dropping the trigger from the database would not have failed a
single one, and neither would changing it: the copy and the original had already drifted apart with
nobody noticing. They were deleted rather than repaired, because a re-implementation cannot be
repaired into a test of the thing it re-implements.

## What replaced them

Nothing, directly — the SQL is only observable against a real Postgres, which this suite does not
have. What the trigger *feeds* is covered for real:

- `edge-process-notifications.test.ts` executes the Edge Function that drains `notification_queue`:
  grouping per (ward, Sunday), prayers sent individually, `secretary_review` never grouped, the
  three-language texts, role targeting, the `notifications_enabled` opt-out, invalid-token cleanup
  and the retention sweep.
- `f065-f066-tester.test.ts` keeps its genuine halves: `filterMembers`, the permission sets and
  `buildNotificationText`, all imported from `src/`.

## If you want the trigger covered

It needs a test that runs SQL. Options, cheapest first:

1. `supabase db start` + `pgTAP` in CI, asserting on `notification_queue` rows after real UPDATEs.
2. A throwaway Supabase branch and an integration suite gated behind an env var.

Either is a real project. Until one exists, treat the trigger as untested and change it carefully —
that is a more useful thing to know than a green tick that means nothing.
