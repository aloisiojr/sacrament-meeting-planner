# ARCH_M008 - UIShell

```yaml
type: arch
version: 1
status: complete
module: UIShell
features: [F009, F020, F021]
```

## Overview

```yaml
goal: "Provide the app shell (tabs, navigation, theme, i18n) and the Home tab with role-aware sections"
principles:
  - "Expo Router (file-based) for all navigation"
  - "4 tabs: Home, Agenda, Speeches, Settings"
  - "Role-based sections on Home tab"
  - "System theme detection with manual toggle"
  - "i18n: pt-BR (default), en, es via react-i18next"
```

## Diagram

```
┌────────────────────────────────────────────────┐
│  App Shell (Expo Router)                        │
│  ┌──────┬──────────┬──────────┬─────────────┐  │
│  │ Home │  Agenda  │ Speeches │  Settings*  │  │
│  └──┬───┘          │          │             │  │
│     │              │          │             │  │
│     ▼              │          │             │  │
│  ┌────────────┐    │          │             │  │
│  │ 3 Sundays  │    │          │  *Observer  │  │
│  │ (all roles)│    │          │  no access  │  │
│  ├────────────┤    │          │             │  │
│  │ Next Asgn  │    │          │             │  │
│  │ (Bishopric)│    │          │             │  │
│  ├────────────┤    │          │             │  │
│  │ Invite Mgmt│    │          │             │  │
│  │ (Secretary)│    │          │             │  │
│  └────────────┘    │          │             │  │
└────────────────────┴──────────┴─────────────┘
         │
  ┌──────┴──────┐
  │ ThemeContext │ ──── system detection + toggle
  │ i18nProvider │ ──── react-i18next
  └─────────────┘
```

## Components

| # | Component | Responsibility | Dependencies |
|---|-----------|----------------|--------------|
| 1 | AppLayout | Root layout with Expo Router tabs, theme provider, i18n provider | Expo Router, ThemeContext, i18n |
| 2 | HomeTab | Role-aware sections: next 3 sundays, next assignments, invite management | AuthContext, SpeechModule |
| 3 | NextSundaysSection | Show 3 expandable sunday cards with speeches and sunday type dropdown | SpeechModule, SundayTypeManager |
| 4 | NextAssignmentsSection | Show first pending sunday after the 3 displayed (Bishopric only) | SpeechModule, AuthContext |
| 5 | InviteManagementSection | List unconfirmed speeches for Secretary to manage via WhatsApp | SpeechModule, WhatsAppLauncher |
| 6 | ThemeContext | Dark/light mode with system detection and manual toggle | React Context |
| 7 | I18nProvider | react-i18next setup with pt-BR, en, es locale files | react-i18next |
| 8 | ExitConfirmationDialog | Confirm before closing app | React Native BackHandler |

## Contracts

### ThemeContext

```typescript
// contexts/ThemeContext.ts
interface ThemeContextValue {
  mode: 'light' | 'dark';
  toggleMode(): void;
  colors: ThemeColors;
}

function useTheme(): ThemeContextValue;
```

### I18nProvider

```typescript
// i18n/index.ts
// Locales: src/i18n/locales/pt-BR.json, en.json, es.json
// Namespace: 'translation' (default)
// Init: languageDetector -> ward language setting -> device locale
```

### HomeTab Sections

```typescript
// Visibility rules
function showNextAssignments(role: Role, speeches: Speech[]): boolean;
  // role === 'bishopric' AND all 9 speeches of next 3 sundays are assigned

function showInviteManagement(role: Role): boolean;
  // role === 'secretary'

function showPresentationButton(): boolean;
  // isSunday() === true (any role)
```

## Flows

### App Initialization Flow

```
1. Expo Router mounts AppLayout
2. Check Supabase session:
   a. No session -> LoginScreen
   b. Session valid -> extract role, wardId from app_metadata
3. Initialize ThemeContext (system preference or saved toggle)
4. Initialize i18n (ward language setting or device locale)
5. Register push token (non-observer only)
6. Start Realtime subscriptions for ward
7. Render tab navigator: Home, Agenda, Speeches, Settings
   - Settings tab hidden for Observer
```

### Home Tab Rendering Flow

```
1. Load next 3 sundays with speeches and exceptions
2. Render NextSundaysSection (all roles)
3. If Bishopric AND all 9 speeches assigned:
   render NextAssignmentsSection
4. If Secretary:
   render InviteManagementSection (speeches with status not_invited or invited)
5. If Sunday:
   render "Start Sacrament Meeting" button at top
```

## Navigation Structure (Expo Router)

```
app/
  _layout.tsx          # Root layout (providers)
  (auth)/
    login.tsx          # Login screen
    register.tsx       # Self-registration
    invite/[token].tsx # Invite registration
  (tabs)/
    _layout.tsx        # Tab navigator
    index.tsx          # Home tab
    agenda.tsx         # Agenda tab
    speeches.tsx       # Speeches tab
    settings/
      _layout.tsx      # Settings stack
      index.tsx        # Settings menu
      members.tsx      # Member management
      topics.tsx       # Topic management
      actors.tsx       # Actor management
      users.tsx        # User management
      history.tsx      # Activity log
      whatsapp.tsx     # WhatsApp template
  presentation.tsx     # Presentation Mode (modal)
```

## ADRs

```yaml
adrs:
  - id: ADR-009
    title: "Expo Router file-based routing"
    context: "Need cross-platform navigation with deep link support for invitations"
    decision: "Expo Router with file-based routing"
    consequences:
      - "Convention over configuration for routes"
      - "Deep link support built-in for wardmanager://invite/{token}"
```
