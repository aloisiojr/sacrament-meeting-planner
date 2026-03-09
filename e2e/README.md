# E2E Testing with Maestro

End-to-end tests for the Sacrament Meeting Planner app using [Maestro](https://maestro.mobile.dev/).

## Prerequisites

- **Maestro CLI** installed: `brew install maestro`
- **Java 17**: `brew install openjdk@17`
- **Xcode** with iOS simulator (iPhone 17, iOS 26.3)
- App built for simulator

## Building the app

```bash
npx expo run:ios
```

## Running tests

Run an individual flow:

```bash
maestro test e2e/maestro/01-register.yaml
```

Run all flows sequentially:

```bash
maestro test e2e/maestro/
```

> **Note:** `01-register` must run before `02-login-logout` because it creates the test credentials used by the login flow. When running the entire directory, Maestro executes files in alphabetical order, so the numbered prefix ensures correct order.

## Test data management

- Tests use **production Supabase** with full RLS isolation.
- Each test creates an isolated ward via the `register-first-user` Edge Function.
- Unique email per run: `e2e-{timestamp}@test.com` (generated via JavaScript `Date.now()`).
- RLS ensures test ward data is completely isolated from real wards.
- **Cleanup:** Delete test wards manually from the Supabase dashboard. Test wards are identifiable by their name ("E2E Test Ward") and email pattern.

## testID convention

All `testID` props follow the format: `{screen}-{element}-{type}` in kebab-case.

| Type suffix | Component | Example |
|-------------|-----------|---------|
| `-input` | TextInput | `login-email-input` |
| `-button` | TouchableOpacity / Pressable | `register-submit-button` |
| `-text` | View (for visibility assertions) | `login-error-text` |
| `-radio` | TouchableOpacity (radio selector) | `register-role-bishopric-radio` |

Dynamic testIDs use template literals for `.map()` rendered elements:
- `register-role-${r}-radio` (bishopric, secretary)
- `register-language-${lang}-radio` (pt-BR, en-US, es-LA)

## Troubleshooting

- **Simulator not found:** Verify an iOS simulator is running (`xcrun simctl list devices booted`).
- **Timeout errors:** Increase `extendedWaitUntil` timeout values in the flow YAML files.
- **Registration fails:** Check Supabase Edge Function logs in the Supabase dashboard.
- **Tab assertion fails:** New wards default to `manage_prayers=false`, so the tab label is "Discursos" (not "Discursos e Oracoes").
