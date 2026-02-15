# F021 - Dark/Light Mode

## User Stories

| ID | As a | I want to | So that |
|----|------|-----------|---------|
| US-CR002 | Any user | dark/light mode with system detection | visual comfort |

## Acceptance Criteria

| ID | Given | When | Then |
|----|-------|------|------|
| AC-CR002-1 | system in dark mode, app in Auto | opens app | interface in dark mode |
| AC-CR002-2 | system in light mode, app in Auto | opens app | interface in light mode |
| AC-CR002-3 | in Settings tab | sees theme selector | 3 options: Automatic, Light, Dark |
| AC-CR002-4 | selects Dark | selection saved | immediately switches to dark mode; persists between sessions |
| AC-CR002-5 | selects Automatic | system toggles | interface follows in real time |

## Edge Cases

| ID | Case | Expected Behavior |
|----|------|-------------------|
| EC-CR022-1 | useColorScheme returns null | Fallback to light with log |

## Technical Notes
- 3 options: Automatic (phone icon), Light (sun), Dark (moon)
- "Automatic" follows OS theme in real time
- Preference stored in AsyncStorage (per device, not synced to backend)
- Observer uses system mode only (no manual override)
- WCAG AA contrast in both modes
- 3D LEDs maintain visibility in both modes
- Smooth transition between modes (no white/black flash)
- Icons: phone for Auto, sun for Light, moon for Dark
