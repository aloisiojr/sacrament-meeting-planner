# PLAN_CR4_F003 - Infrastructure Integration (Sync, Offline, Notifications)

## PLAN_SUMMARY

```yaml
type: plan_summary
total_steps: 2
parallel_tracks: 1
estimated_commits: 2
coverage:
  acceptance_criteria: 0/0
  edge_cases: 0/0
critical_path:
  - "STEP-01: Connect SyncEngine + OfflineManager to App (CR-52)"
  - "STEP-02: Connect NotificationModule to App (CR-53)"
main_risks:
  - "CR-52/53 connecting dead code may reveal runtime issues not caught by tests"
  - "Push notifications require Expo project ID configuration"
```

## PLAN

```yaml
type: plan
version: 1
status: draft
features: ["F003"]
spec: "SPEC_CR4_F003"

goal: "Connect the existing SyncEngine, OfflineManager, and NotificationModule hooks to the authenticated app layout"

strategy:
  order: "Connect sync/offline first -> Then notifications (depends on isOnline from sync)"
  commit_strategy: "1 commit per step, conventional commit messages"
  test_strategy: "Integration tests verifying hooks are called in layout"

steps:
  - id: STEP-01
    description: "In the tabs layout or InnerLayout: (a) Call useConnection() to get isOnline, showOfflineBanner, setWebSocketConnected. (b) Call useRealtimeSync({ isOnline, setWebSocketConnected }) after auth. (c) Render OfflineBanner when showOfflineBanner=true. Place these in a component inside AuthProvider so wardId is available."
    files:
      - "src/app/(tabs)/_layout.tsx"
      - "src/components/OfflineBanner.tsx"
    dependencies: []
    parallelizable_with: []
    done_when:
      - "useConnection() called in authenticated layout"
      - "useRealtimeSync() called with connection state"
      - "OfflineBanner rendered when device is offline"
      - "Realtime channel subscribes to ward tables"
      - "Data syncs via Realtime when online, polling as fallback"
    tests:
      - type: integration
        description: "Verify hooks are called in layout. Verify OfflineBanner renders when showOfflineBanner=true."
    covers:
      acceptance_criteria: []
      edge_cases: []
    risks:
      - risk: "Connecting dead code may reveal runtime errors"
        mitigation: "Test thoroughly on device. Verify Supabase Realtime is enabled for the project."

  - id: STEP-02
    description: "In the tabs layout: Call useRegisterPushToken(isOnline) and useNotificationHandler() after auth. These hooks already exist and are complete -- they just need to be imported and called."
    files:
      - "src/app/(tabs)/_layout.tsx"
    dependencies: ["STEP-01"]
    parallelizable_with: []
    done_when:
      - "useRegisterPushToken(isOnline) called in tabs layout"
      - "useNotificationHandler() called in tabs layout"
      - "Push token registered in device_push_tokens table on app mount"
      - "Notification tap navigates to Home tab"
      - "Observer role does not register token"
    tests:
      - type: integration
        description: "Verify hooks are imported and called. Verify push token registration logic executes."
    covers:
      acceptance_criteria: []
      edge_cases: []
    risks:
      - risk: "Push notifications require Expo project ID configuration"
        mitigation: "Token registration is best-effort; errors are logged but don't crash the app"

validation:
  - cr_id: CR-52
    how_to_verify: "useConnection and useRealtimeSync called in authenticated layout. OfflineBanner appears when offline. Realtime sync works when online."
    covered_by_steps: ["STEP-01"]
  - cr_id: CR-53
    how_to_verify: "useRegisterPushToken and useNotificationHandler called in tabs layout. Push token registered on mount. Notification tap navigates to Home."
    covered_by_steps: ["STEP-02"]
```

## Dependency Graph

```
STEP-01 (Connect Sync/Offline)
  └── STEP-02 (Connect Notifications)
```
