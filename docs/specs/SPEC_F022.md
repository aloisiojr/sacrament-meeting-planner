# F022 - Offline Support

## User Stories

| ID | As a | I want to | So that |
|----|------|-----------|---------|
| US-017 | Any user | app works without internet with sync on reconnect | usable in poor connectivity |

## Technical Notes
- App detects connection loss and shows "Offline" banner
- Mutations queued in AsyncStorage
- UI updates optimistically
- On reconnect: queue processed FIFO, last-write-wins
- User operations (Edge Functions) do NOT work offline
- Limit: 100 mutations in queue
- Conflict resolution: last-write-wins with timestamp

## Operations NOT available offline
- Self-registration
- Invite registration
- User removal/role change
- These show "Requires connection" error and are NOT queued

## Edge Cases

| ID | Case | Expected Behavior |
|----|------|-------------------|
| EC-014 | App offline during editing | Saves locally + syncs on reconnect |
| EC-CR003-6 | Remove/edit user offline | Error "Requires connection"; action NOT queued |
| EC-REG-007 | Self-registration offline | Error "Requires connection"; action NOT queued |
| EC-REG-008 | Invite registration offline | Error "Requires connection"; action NOT queued |
| EC-PN-005 | App offline when push should register token | Token registered on next opening with connection |
| EC-HIST-003 | Action executed offline | Log created when mutation syncs with server |
