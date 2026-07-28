# Reset-password: send via Gmail SMTP (replace Resend)

## Problem / intent
Password reset is broken in production: `send-reset-email` sends via Resend, which has **no
verified domain**, so Resend rejects every recipient except the Resend account owner. The user has
no domain and wants to use the SMP Gmail account. Switch the email transport inside the
`send-reset-email` edge function from Resend to **Gmail SMTP** (authenticated with a Google App
Password). This is a **server-side-only** fix that restores reset for ALL users — including those
on already-shipped app versions — with no app release.

## In scope / Out of scope
- **In:** `supabase/functions/send-reset-email/index.ts` — replace the Resend HTTP call with an
  SMTP send via Gmail (`smtp.gmail.com`) using a Deno SMTP client; read Gmail credentials from new
  Supabase secrets. Keep everything else (recovery-token generation, `reset-redirect` flow, email
  content/link, anti-enumeration, and the client response contract).
- **In:** set Supabase secrets (`GMAIL_USER`, `GMAIL_APP_PASSWORD`); stop using `RESEND_*`.
- **Out:** any client change (none — same `functions.invoke('send-reset-email')`); the
  `reset-redirect` function; the GitHub Pages reset page; the error-visibility hardening
  (separate spec `reset-email-error-visibility.md`).

## Baseline (evidence)
- Reproduced: `send-reset-email` for an external user → `HTTP 500 {"error":"Failed to send email"}`.
- Resend has "No domains yet" (confirmed by user) → test mode, external recipients rejected.
- Function currently POSTs `https://api.resend.com/emails` (~L226-238) using `RESEND_API_KEY` /
  `RESEND_FROM_EMAIL`.

## Acceptance criteria (EARS)
- **AC1:** WHEN `send-reset-email` is invoked for a registered user, the function SHALL send the
  recovery email via Gmail SMTP (`smtp.gmail.com`, authenticated with the App Password) from the
  SMP Gmail address.
- **AC2:** WHEN the SMTP send succeeds, the function SHALL return `200 {success:true}` and the email
  SHALL be delivered to arbitrary external recipients (e.g. a gmail.com user), not only the owner.
- **AC3:** WHEN the SMTP send fails, the function SHALL keep the existing contract
  (`500 {error:"Failed to send email"}`) and log the underlying SMTP error via `console.error`.
- **AC4:** The recovery link, email content, anti-enumeration behavior (user-not-found → 200), and
  the client contract SHALL remain unchanged.
- **AC5:** Gmail credentials SHALL come from Supabase secrets — no secret value committed to the repo.

## Open questions
- **OQ1:** Which SMP Gmail address should be the sender / SMTP user?
- **OQ2:** Can you enable 2FA on that Google account and generate an **App Password**? (Gmail SMTP
  requires it — normal password won't work.)
- **OQ3:** SMTP port — default **465 (implicit TLS)** via a Deno SMTP client (e.g. denomailer);
  fallback 587 STARTTLS. (Sensible default chosen unless you object.)

## Notes / verification
- The edge function runs on **Deno (Supabase)**, NOT covered by the vitest suite (`src/**`). This
  change is verified by **live invocation**: reproduce with an external user → expect `200` +
  actual delivery. No vitest test for the function itself.
- Deploy: `supabase functions deploy send-reset-email` + `supabase secrets set GMAIL_USER=... GMAIL_APP_PASSWORD=...`.
- **mobile-release-advisor:** server-side only, backward-compatible with all shipped clients — no
  app release, no breaking change. Restores reset for old app versions immediately.
