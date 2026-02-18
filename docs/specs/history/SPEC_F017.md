# F017 - Push Notifications

## User Stories

| ID | As a | I want to | So that |
|----|------|-----------|---------|
| US-PN-001 | Secretary | receive push 5 min after assignment (grouped by sunday) | invite speaker quickly |
| US-PN-002 | Bishopric | receive weekly reminder Sunday 18h if missing assignments | assign speakers in time |
| US-PN-003 | Secretary | receive weekly reminder Sunday 18h if missing confirmations | invite/confirm speakers in time |
| US-PN-004 | Secretary/Bishopric | receive immediate push when speaker confirms | know speech is guaranteed |
| US-PN-005 | Bishopric | receive immediate push when speaker gives up | assign substitute immediately |
| US-PN-006 | Bishopric/Secretary | configure ward timezone | scheduled notifications arrive at correct time |

## Acceptance Criteria

| ID | Given | When | Then |
|----|-------|------|------|
| AC-PN-001 | Bishopric assigns speaker | 5 min pass without another assignment for same sunday | push sent to Secretary with name and date |
| AC-PN-002 | Bishopric assigns 3 speakers for same sunday in 2 min | 5 min pass since first assignment | single grouped push sent to Secretary with 3 names |
| AC-PN-003 | Bishopric assigns speakers for different sundays in 2 min | 5 min pass | separate pushes for each sunday |
| AC-PN-004 | Sunday 18:00 (ward timezone) | next sunday has type "Speeches" with not_assigned speech(es) | push sent to all Bishopric |
| AC-PN-005 | Sunday 18:00 (ward timezone) | next sunday has type "Speeches" with unconfirmed speech(es) | push sent to Secretary |
| AC-PN-006 | Sunday 18:00 (ward timezone) | next sunday has exception (type != "Speeches") | NO push sent (Cases 2 and 3 suppressed) |
| AC-PN-007 | speech status changes to assigned_confirmed | immediately | push sent to Secretary and Bishopric with name, ordinal, date |
| AC-PN-008 | speech status changes to gave_up | immediately | push sent to Bishopric with name, ordinal, date (urgency text) |
| AC-PN-009 | user logs in or opens app | device registers token | expo_push_token saved in device_push_tokens |
| AC-PN-010 | Observer logs in | device does NOT register token | no push will be received |
| AC-PN-011 | user taps any notification | app opens | navigates to Home tab |
| AC-PN-012-014 | ward language = pt/en/es | push sent | text in corresponding language |

## 5 Notification Cases

### Case 1: Assignment (delayed, grouped by sunday)
- Trigger: Bishopric assigns a speaker
- Delay: 5 minutes
- Grouping: Multiple assignments for SAME sunday within 5 min -> single push. Different sundays -> separate pushes.
- Target: Secretary
- Suppressed if: Sunday has exception (type != "Speeches")
- Text (1): "{name} was assigned to speak on {date}. Time to send the invitation!"
- Text (multiple): "{name1}, {name2} and {name3} were assigned to speak on {date}. Time to send the invitation!"

### Case 2: Weekly reminder - unassigned (Bishopric)
- Trigger: Every Sunday at 18:00 in ward timezone
- Condition: Next sunday has type "Speeches" AND at least 1 speech with status not_assigned
- Target: All Bishopric members
- Text: "There are still speakers to be assigned for next Sunday!"

### Case 3: Weekly reminder - unconfirmed (Secretary)
- Trigger: Every Sunday at 18:00 in ward timezone
- Condition: Next sunday has type "Speeches" AND at least 1 speech with status != assigned_confirmed
- Target: Secretary
- Text: Same as Case 2

### Case 4: Speaker confirmed (immediate)
- Trigger: Speech status changes to assigned_confirmed
- Delay: Immediate
- Target: Secretary AND Bishopric
- Text: "{name} has been confirmed to give the {ordinal} speech on {date}."

### Case 5: Speaker gave up (immediate)
- Trigger: Speech status changes to gave_up
- Delay: Immediate
- Target: Bishopric only
- Text: "ATTENTION! {name} will NOT be able to give the {ordinal} speech on {date}. Assign another speaker!"

## Edge Cases

| ID | Case | Expected Behavior |
|----|------|-------------------|
| EC-PN-001 | Push token expired or invalid | Expo returns error; token removed from device_push_tokens |
| EC-PN-002 | User without registered device (no token) | Notification not sent; no error |
| EC-PN-003 | Assignment made and undone within 5 min | If speech returns to not_assigned before send, notification cancelled (status=cancelled) |
| EC-PN-004 | Sunday changes from "Speeches" to exception before Sunday 18h | Weekly notifications (Cases 2/3) suppressed for that sunday |
| EC-PN-005 | App offline when push should register token | Token registered on next app opening with connection |
| EC-PN-006 | Multiple devices from same user | Push sent to ALL registered devices |
| EC-PN-007 | Ward timezone not configured | Uses default: America/Sao_Paulo |

## Technical Notes
- Expo Push Notifications (expo-notifications) + Supabase Edge Function
- notification_queue table with send_after field
- Edge Function cron (every minute) processes pending notifications with send_after <= now()
- Observers do NOT receive notifications
- Notifications are mandatory (no opt-out)
- Ordinals: "1o"/"2o"/"3o" (pt), "1st"/"2nd"/"3rd" (en), "1er"/"2do"/"3er" (es)
- On tapping any notification: app opens to Home tab
