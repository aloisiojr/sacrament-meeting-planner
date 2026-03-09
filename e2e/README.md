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

Run all 8 flows sequentially:

```bash
maestro test e2e/maestro/
```

> **Note:** `01-register` must run before all other flows because it creates the test credentials used by subsequent flows. When running the entire directory, Maestro executes files in alphabetical order, so the numbered prefix ensures correct order.

## Flows

| Flow | Description |
|------|-------------|
| `01-register.yaml` | Register a new ward + bishopric user (creates test credentials) |
| `02-login-logout.yaml` | Login, logout, and invalid login test |
| `03-home-presentation.yaml` | Home tab and Presentation Mode |
| `04-agenda.yaml` | Agenda tab: expand Sunday, assign actors/hymns |
| `05-speeches.yaml` | Speeches tab: assign speaker, change status, topic modal |
| `06-members.yaml` | Members screen: add, edit, search, delete members |
| `07-invite.yaml` | Create invitation for a new user (secretary role) |
| `08-settings.yaml` | Theme changes (light/dark/automatic) + language round-trip (pt-BR/en-US) |

## Test data management

- Tests use **production Supabase** with full RLS isolation.
- Each test creates an isolated ward via the `register-first-user` Edge Function.
- Unique email per run: `e2e-{timestamp}@test.com` (generated via JavaScript `Date.now()`).
- RLS ensures test ward data is completely isolated from real wards.

### Cleanup script

A Deno script is provided to automatically clean up test data:

```bash
SUPABASE_URL=https://{project}.supabase.co \
SUPABASE_SERVICE_ROLE_KEY={service_role_key} \
deno run --allow-net --allow-env e2e/scripts/cleanup.ts
```

The script:
- Lists all auth users and filters by the `e2e-*@test.com` email pattern
- Deletes each user's associated ward (CASCADE deletes all related data)
- Deletes the auth user
- Handles partial state gracefully (per-user try/catch)

**Required environment variables** (do NOT commit these):
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (admin access)

> You can also delete test wards manually from the Supabase dashboard. Test wards are identifiable by their name ("E2E Test Ward") and email pattern.

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
- `users-invite-role-${role}-radio` (bishopric, secretary, observer)

## Troubleshooting

- **Simulator not found:** Verify an iOS simulator is running (`xcrun simctl list devices booted`).
- **Timeout errors:** Increase `extendedWaitUntil` timeout values in the flow YAML files.
- **Registration fails:** Check Supabase Edge Function logs in the Supabase dashboard.
- **Tab assertion fails:** New wards default to `manage_prayers=false`, so the tab label is "Discursos" (not "Discursos e Oracoes").
- **Invite creation slow (07-invite):** The `create-invitation` Edge Function may have a cold start. The flow uses a 15s timeout for the success text assertion. Increase if still flaky.
- **Users list slow to load (07-invite):** The `list-users` Edge Function may be slow. The flow uses a 10s timeout for the invite button to appear.
- **Language change not reflecting (08-settings):** The flow waits for the Settings title text to change (e.g., "Settings" for en-US, "Configuracoes" for pt-BR) with 5s timeouts. Increase if needed.
- **Theme options not tappable (08-settings):** Theme options are targeted by text ("Claro", "Escuro", "Automatico"). If the app language is not pt-BR, these labels will differ.
