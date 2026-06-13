# Real Device Validation Plan

## Purpose
This document turns the current LARGA hardening work into a phase-by-phase Android validation workflow.

The goal is to validate the highest-risk real-device flows first, fix only confirmed failures, and avoid introducing new issues by changing too many things at once.

## Validation rules
- Move phase by phase.
- Do not change code during a phase unless that phase exposes a confirmed failure.
- When a failure is found, fix only that confirmed failure.
- Re-run the same phase after the fix before moving to the next one.
- Capture evidence for every failed case using screenshots, exact steps, and visible error text.

## Skills by phase

### Shared routing skill
- `skill-router`
  - Use at the start of each phase to keep the skill stack minimal and relevant.

### Phase-specific skills
- Phase 1: `vercel-react-native-skills`, `firebase-basics`
- Phase 2: `vercel-react-native-skills`, `firebase-basics`
- Phase 3: `vercel-react-native-skills`, `firebase-basics`
- Phase 4: `typescript-best-practices`, `code-craftsman`
- Phase 5: `code-review`, `code-craftsman`

## Phases

### Phase 1: Authentication and session persistence
#### Goal
Validate that Android login, logout, restart, and role/session restoration behave correctly for commuter and driver accounts.

#### Why this comes first
Every other flow depends on a stable signed-in session. If auth hydration or role routing is unstable, later validation results become noisy and misleading.

#### Test cases

##### Test 1: Commuter registration and immediate re-login
Setup:
- App fully closed
- Stable internet connection
- Email address not already registered in Firebase Authentication

Steps:
1. Open the app and create a commuter account.
2. Confirm the commuter flow opens after registration.
3. Log out.
4. Sign in again with the same email and password.

Expected result:
- Registration succeeds without returning to the login form.
- The account remains present after logout.
- Re-login succeeds with the same credentials.
- The commuter lands in the correct commuter flow.

Failure signs:
- Registration appears to succeed but the app returns to login.
- Re-login reports `auth/invalid-credential`.
- The commuter profile is missing or the account is deleted after registration.

##### Test 2: Commuter login
Setup:
- App fully closed
- Stable internet connection

Steps:
1. Open the app.
2. Sign in with a commuter account.

Expected result:
- Login succeeds.
- No splash-loop happens.
- No return to the login form happens after sign-in.
- The commuter lands in the correct commuter flow.

Failure signs:
- The app shows the splash screen again after login.
- The app returns to login unexpectedly.
- The commuter lands in the wrong role flow.

##### Test 3: Driver login
Setup:
- App currently at login or logged out

Steps:
1. Sign in with a driver account.

Expected result:
- Login succeeds.
- No reset loop happens.
- The driver lands in the correct driver flow.
- The app does not bounce back to login.

Failure signs:
- Splash screen appears again after sign-in.
- Login form reappears unexpectedly.
- Driver lands in commuter or pending-access flow incorrectly.

##### Test 4: Restart persistence
Setup:
- Signed in as commuter, then repeat as driver

Steps:
1. Force close the app.
2. Reopen the app.
3. Repeat once for the other role.

Expected result:
- The user stays signed in.
- The correct role flow restores after startup.
- No broken session hydration appears.
- No wrong screen flash persists after startup.

Failure signs:
- User is signed out unexpectedly.
- Wrong role flow is shown after restart.
- App appears to reset and re-route incorrectly.

##### Test 5: Logout correctness
Setup:
- Signed in account

Steps:
1. Tap logout.
2. Confirm the app returns to the login screen.
3. Log in again.

Expected result:
- Logout clears the session correctly.
- The app returns to login cleanly.
- Logging in again works immediately.

Failure signs:
- Logout leaves protected screens visible.
- Login screen does not appear.
- Re-login behaves inconsistently.

##### Test 6: Role-routing stability
Setup:
- Signed in account with a role-specific flow

Steps:
1. Log in.
2. Close and reopen the app.
3. Navigate through the main flow.
4. Return to the main map screen.

Expected result:
- No surprise redirect happens.
- No re-auth glitch happens.
- No role-selection or route-selection confusion appears unless the account truly requires it.

Failure signs:
- App suddenly reroutes without user action.
- Role flow changes unexpectedly mid-session.
- Main screen becomes unstable after navigation.

#### Evidence to capture on failure
- Account type used
- Exact steps performed
- What happened instead
- Screenshot
- Visible error text
- Whether the issue reproduces after a second attempt

#### Phase 1 checkpoint
Phase 1 passes only if:
- commuter registration and immediate re-login pass
- commuter login passes
- driver login passes
- restart persistence passes
- logout/login passes
- role-routing stability passes

Only after all five pass should the team move to Phase 2.

### Phase 2: Commuter live location and manual fallback
#### Goal
Validate commuter live GPS startup, denied-permission behavior, stale GPS suppression, manual `Set point`, and switch-back-to-live behavior.

#### Checkpoint before moving on
- Fresh GPS works.
- Denied GPS does not trust stale GPS presence.
- Manual pickup point works.
- Switching back to live works.

### Phase 3: Driver trip start and live tracking
#### Goal
Validate driver login, trip start, live location publishing, map follow behavior, and trip panel behavior on Android.

#### Checkpoint before moving on
- No auth bounce occurs.
- Trip starts cleanly.
- Driver marker updates stay stable.
- Driver map and panel behavior stay correct.

### Phase 4: Commuter fare and route-aware ride details
#### Goal
Validate boarding point selection, drop-off selection, route-aware fare computation, and ride metrics shown in the commuter panel.

#### Checkpoint before moving on
- Fare stop loading is correct.
- Fare updates correctly.
- Route-aware ride readings stay coherent.

### Phase 5: Focused regression pass
#### Goal
Re-run the highest-risk flows after confirmed fixes to ensure the recent changes did not create new auth, location, trip, or fare regressions.

#### Checkpoint
- No fixed bug reappears.
- No new regression appears in auth, commuter, driver, or fare flows.

## Result log template

Use this format during validation:

```text
Phase:
Test:
Account used:
Result: Passed / Failed
Steps performed:
Observed result:
Expected result:
Screenshot:
Notes:
```

## Current execution order
1. Phase 1: Authentication and session persistence
2. Phase 2: Commuter live location and manual fallback
3. Phase 3: Driver trip start and live tracking
4. Phase 4: Commuter fare and route-aware ride details
5. Phase 5: Focused regression pass
