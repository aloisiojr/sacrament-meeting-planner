# Plan: Reset-password send via Gmail SMTP   (spec: specs/reset-email-gmail-smtp.md)

## Reuse (keep, do NOT recreate)
- `supabase/functions/send-reset-email/index.ts` — keep the entire flow except the transport:
  user lookup + pagination (L121-146), anti-enumeration (L148-154), language selection (L156-172),
  `generateLink` recovery token (L174-202), `deepLink` (L205), `getEmailTemplate` (L14-83), CORS,
  and the response contract. Only the Resend block (L210-250) is replaced.

## Steps (1 step = 1 commit)
1. **Replace Resend transport with Gmail SMTP.** In `send-reset-email/index.ts`: import a Deno SMTP
   client (`denomailer`, pinned version); read `GMAIL_USER` + `GMAIL_APP_PASSWORD` from env; if
   either missing → keep `500 "Email service not configured"`; send via `smtp.gmail.com:465` (TLS)
   with `from: "Sacrament Meeting Planner <GMAIL_USER>"`, `to: user.email`, `subject`/`html` from
   the existing template; on SMTP error → `console.error` + keep `500 "Failed to send email"`;
   close the SMTP connection. Update the top comment (Resend → Gmail SMTP). Remove `RESEND_*` usage.
   — covers AC1, AC3, AC4, AC5.
2. **(ops) Set secrets:** `supabase secrets set GMAIL_USER=<addr> GMAIL_APP_PASSWORD=<app-pw>`.
   Needs the user's Gmail address (OQ1) + App Password (OQ2). — AC5.
3. **(deploy)** `supabase functions deploy send-reset-email`.
4. **(verify)** Live invocation with an external test recipient → expect `200 {success:true}` and
   actual delivery; re-test the original failing case (igor). — AC2.

## AC → coverage matrix
| AC  | Step(s) | Verification |
|-----|---------|--------------|
| AC1 | 1,2,3   | live invoke (Deno fn, not vitest) |
| AC2 | 3,4     | live invoke + inbox delivery |
| AC3 | 1       | code review + forced-failure invoke |
| AC4 | 1       | code review (flow/contract unchanged) |
| AC5 | 1,2     | secrets set; no value in repo |

## Risks / deploys
- Edge function deploy + 2 new secrets. `denomailer` must run on the Supabase Deno runtime (pin a
  known-good version). Gmail SMTP over 465/TLS with App Password (2FA required).
- Gmail free limit ~500/day — ample for a ward.
- No vitest coverage possible (Deno function) — verification is live invocation only. Stated in spec.

## Rollback
- Supabase keeps prior function versions (current v8) → redeploy previous, or `git revert` the
  commit and redeploy. RESEND_* secrets remain set, so reverting restores the old behavior instantly.
