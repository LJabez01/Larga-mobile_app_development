# Multi-Role Account Model Design

Date: 2026-05-19
Status: Implemented foundation

## Purpose
Document the proposed identity-model update that would replace the current `one account = one role` rule with a single Firebase Auth account that can hold multiple role states over time.

## Status note
- This design now matches the current registration and session foundation.
- Source-of-truth docs such as [CONSTRAINTS.md](C:/Users/Carl Lester/OneDrive/Documents/GitHub/Larga-mobile_app_development/CONSTRAINTS.md) and [FIREBASE_SCHEMA.md](C:/Users/Carl Lester/OneDrive/Documents/GitHub/Larga-mobile_app_development/Largaaaaaaaaaaaaa/FIREBASE_SCHEMA.md) have been updated to reflect the multi-role model.
- Trusted approval workflows and later settings-driven role expansion still need completion work.

## Proposed role model
- One Firebase Auth identity can own multiple role states.
- Current role values remain `commuter`, `driver`, and `admin`.
- Access decisions should come from `approvedRoles`, not from a single `role` field.
- `driver` is never auto-approved.
- `commuter` can be approved through the normal verification path.
- `admin` remains trusted and manually assigned.

## Multi-role objective
The system should allow one person to keep a single sign-in identity while holding independent commuter and driver access states. The user should be routed automatically when only one role is approved, shown a chooser when both roles are approved, and shown a pending-access experience when no role is approved yet but a driver request is under review.

## Feature summary
The proposed experience is role-state driven instead of single-role driven. After login, the app hydrates the user profile, reads approved and pending roles, and routes according to the user’s current access state. Settings becomes the place where users request their missing second role. Driver access remains document-based and review-based, while commuter access remains lighter and can be confirmed through email verification.

## Core multi-role behavior
1. A user signs in with one Firebase Auth account.
2. The auth session hydrates `approvedRoles`, `pendingRoleRequests`, and `primaryRole`.
3. If there is exactly one approved role, the app auto-routes to that role.
4. If there are two approved roles, the app always shows role selection after login.
5. If there is no approved role and `driver` is pending, the app shows a pending-access screen.
6. If `commuter` is approved and `driver` is pending, the app enters commuter mode and shows driver-pending status.
7. If `driver` is approved and `commuter` is pending, the app enters driver mode and shows commuter-pending status.
8. Settings lets users request the missing role later without creating a second Firebase Auth account.

## Locked proposed decisions
- One Firebase Auth account may hold multiple role states.
- `approvedRoles` is the access source of truth.
- `pendingRoleRequests` tracks requested but not yet approved roles.
- `primaryRole` is only a profile default, not the authorization source of truth.
- Driver access always requires review and supporting documents.
- Commuter access added later from a driver-only account should use a lighter confirmation path.
- If both commuter and driver are approved, role selection appears every login and is not silently remembered.
- Do not grant immediate driver access during public signup.
- Do not allow clients to self-approve `driver` or `admin`.

## User profile model
Use these logical fields in `users/{uid}`:
- `approvedRoles: ('commuter' | 'driver' | 'admin')[]`
- `pendingRoleRequests: ('commuter' | 'driver')[]`
- `primaryRole: 'commuter' | 'driver' | 'admin' | null`
- `driverApplication`
- existing profile fields remain

## Role application model
Use a dedicated role-request record layer:
- `roleApplications/{applicationId}`

Suggested fields:
- `uid`
- `requestedRole`
- `status`
- `submittedAt`
- `updatedAt`
- `documents`
- `reviewNotes`

Driver applications should store document-driven review history here. Commuter role-addition from a driver account may use a lighter confirmation path, but the final approved access still updates `approvedRoles`.

## Registration behavior
Registration should allow these intents:
- `Commuter`
- `Driver`
- `Both`

### Commuter
- account is created
- commuter becomes approved through the normal verification path

### Driver
- account is created
- driver application is submitted immediately
- no approved role is granted yet unless commuter is also chosen
- user lands on a pending-access screen after login

### Both
- account is created
- commuter can become active on verification
- driver application is submitted and remains pending
- after login, the user enters commuter mode and sees driver-pending status

## Login and routing behavior
After successful login, the app should route using the hydrated role state:

### No approved roles, pending driver exists
- route to a pending-access screen

### Exactly one approved role
- auto-route to that role
- if another role is pending, show pending status inside that approved experience or settings

### Two approved roles
- route to the role-selection screen
- do not silently remember the prior choice

### Approved driver only, later commuter requested
- commuter becomes available only after confirmation
- once approved, future logins show role selection

## Session contract impact
The session layer should expose:
- `approvedRoles`
- `pendingRoles`
- `availableRoleChoices`
- `defaultPostLoginRoute`
- `needsRoleSelection`
- `hasPendingAccessOnly`

## Settings-driven role expansion
Settings becomes the place to request the missing second role.

### From commuter
- `Apply as Driver`
- requires driver application form and required document upload
- creates or updates a `roleApplications` record
- adds `driver` to `pendingRoleRequests`
- does not change routing until approved

### From driver
- `Apply as Commuter`
- uses email confirmation flow
- after confirmation, commuter is added to `approvedRoles`
- no manual review is required

## Pending-access UX
Users with no approved roles but a pending driver request should see a dedicated pending-access experience.

It should show:
- application status
- what happens next
- how to update documents later if needed
- optional sign out

The app should not drop them into commuter or driver by accident.

For users with one approved role plus one pending role:
- allow normal use of the approved side
- show a lightweight pending status in settings or a dismissible notice
- do not force the chooser until the second role becomes approved

## Security and rules impact
Firestore rules must stop trusting a single `role` field and instead gate access from `approvedRoles`.

Rules intent:
- users may create their own profile with allowed initial fields only
- clients cannot directly grant themselves `driver` or `admin`
- clients cannot move roles from pending to approved by themselves
- clients may create their own driver application record
- trusted reviewer or admin paths update:
  - `approvedRoles`
  - `pendingRoleRequests`
  - application status

Driver-only operational flows must check:
- `approvedRoles` contains `driver`

Commuter-only flows must check:
- `approvedRoles` contains `commuter`

## Mock and firebase adapter impact
- `mock` mode should simulate all meaningful role combinations:
  - commuter only
  - driver only approved
  - both approved
  - commuter approved + driver pending
  - driver pending only
- `firebase` mode should hydrate approved and pending role state from Firestore
- keep the service-layer switch intact
- do not reintroduce screen-level auth branching

## Required documentation follow-up if adopted
These docs must be updated if this design is approved and implemented:
- [CONSTRAINTS.md](C:/Users/Carl Lester/OneDrive/Documents/GitHub/Larga-mobile_app_development/CONSTRAINTS.md)
- [PLAN.md](C:/Users/Carl Lester/OneDrive/Documents/GitHub/Larga-mobile_app_development/PLAN.md)
- [TASKS.md](C:/Users/Carl Lester/OneDrive/Documents/GitHub/Larga-mobile_app_development/TASKS.md)
- [FIREBASE_SCHEMA.md](C:/Users/Carl Lester/OneDrive/Documents/GitHub/Larga-mobile_app_development/Largaaaaaaaaaaaaa/FIREBASE_SCHEMA.md)
- the approved commuter and driver feature specs that currently assume one account has one role only

## Proposed test plan
- signup as commuter only results in approved commuter flow
- signup as driver only results in pending-access flow
- signup as both results in commuter access plus driver-pending status
- one approved role auto-routes correctly
- two approved roles always show role selection
- no approved roles plus pending driver shows pending-access screen
- commuter can submit a driver application
- driver can request commuter access
- already-approved or already-pending roles do not show duplicate apply actions
- client cannot add `driver` to `approvedRoles`
- client cannot approve their own driver application
- driver-only backend calls reject users without approved driver role
- firebase session hydration reflects approved and pending roles accurately

## Assumptions and defaults
- One Firebase Auth identity can own multiple roles.
- Role selection is shown on every login when both commuter and driver are approved.
- Driver access always requires approval and supporting documents.
- Commuter access added from a driver-only account activates after confirmation, not staff review.
- `admin` remains trusted and manual only.
- This identity-model update should land before deeper driver operational backend expansion if adopted.
