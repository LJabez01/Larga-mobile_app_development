# LARGA Current State Audit

Last reviewed: 2026-06-07

## Purpose

This document records the current implementation state of the LARGA mobile app and identifies MVP functions that are not yet implemented or are only partially implemented.

It is based on the current project markdown files, the Expo app code under `Largaaaaaaaaaaaaa/`, and local verification through:

```powershell
npm.cmd run typecheck
npm.cmd test
```

Current result: TypeScript passes, and the unit test suite passes 114 of 114 tests.

## High-level progress

LARGA is no longer only an early UI shell. The current app has a working Firebase-backed MVP foundation for authentication, driver approval, route data, active trips, driver live location publishing, commuter presence, and route-aware visibility.

The strongest implemented area is the backend/domain foundation:

- Firebase authentication and session hydration exist.
- Multi-role state exists through `approvedRoles`, `pendingRoleRequests`, and `primaryRole`.
- Driver registration creates a pending driver application.
- Admin review can approve, reject, or request resubmission for driver applications.
- Stored routes and terminals are treated as the operational source of truth.
- Route seed data, generated route geometry, and seed validation tests exist.
- Drivers can select supported terminal pairs, start one active trip, publish GPS updates, and end the trip.
- Commuters can publish GPS or manual reference presence and see route-relevant vehicles that can still pass their point.
- Drivers can see route-relevant waiting commuters for their active route segment.

The weakest implemented areas are product polish and user-facing completion:

- Fare computation is still static and not origin/destination based.
- The commuter ride-detail modal uses hardcoded values instead of the selected live vehicle.
- Notifications are fixture/presentation data, not a real notification system.
- Account and preferences screens are mostly UI-only and do not persist changes.
- Arrival detection, explicit off-route warnings, and in-motion safety warnings are not complete product functions.
- Some planning checkboxes in `TASKS.md` are stale compared with the implementation.

## Implemented functions

### App foundation

- Expo Router app structure exists under `Largaaaaaaaaaaaaa/app/`.
- Shared provider structure exists through `AppSessionProvider` and `LiveDataProvider`.
- Mapbox configuration helpers and map fallbacks exist.
- The runtime now uses Firebase-backed services instead of a separate mock runtime.

Key files:

- `Largaaaaaaaaaaaaa/app/_layout.tsx`
- `Largaaaaaaaaaaaaa/components/providers/AppSessionProvider.tsx`
- `Largaaaaaaaaaaaaa/components/providers/LiveDataProvider.tsx`
- `Largaaaaaaaaaaaaa/lib/config/mapbox.ts`
- `Largaaaaaaaaaaaaa/components/map/shared/mapbox.utils.ts`

### Authentication and role model

Implemented:

- Login through Firebase Auth.
- Registration through Firebase Auth.
- Password-reset request through Firebase Auth.
- First-sign-in user document creation.
- Registration intents for `Commuter`, `Driver`, and `Both`.
- Session routing based on approved and pending role state.
- Pending-driver-only accounts route to the pending access flow.
- Multi-role commuter/driver accounts can use role selection.

Key files:

- `Largaaaaaaaaaaaaa/services/auth/firebase-auth.ts`
- `Largaaaaaaaaaaaaa/lib/domain/auth.ts`
- `Largaaaaaaaaaaaaa/app/(auth)/login.tsx`
- `Largaaaaaaaaaaaaa/app/(auth)/registration.tsx`
- `Largaaaaaaaaaaaaa/app/(auth)/pending-access.tsx`
- `Largaaaaaaaaaaaaa/app/(auth)/role-selection.tsx`

### Driver application and admin review

Implemented:

- Driver application creation during driver or both-role registration.
- Driver document upload path through Cloudinary when configured.
- Pending access status screen.
- Resubmission flow for applications marked `needs_resubmission`.
- Admin application list.
- Admin application detail screen.
- Admin approve, reject, and needs-resubmission decisions.
- Approval grants the driver role and removes the pending driver role request.

Key files:

- `Largaaaaaaaaaaaaa/services/driver-applications/firebase-driver-applications.ts`
- `Largaaaaaaaaaaaaa/services/admin-review/firebase-admin-review.ts`
- `Largaaaaaaaaaaaaa/app/admin/index.tsx`
- `Largaaaaaaaaaaaaa/app/admin/application/[applicationId].tsx`
- `Largaaaaaaaaaaaaa/app/(auth)/driver-application.tsx`
- `Largaaaaaaaaaaaaa/services/media/cloudinary-upload.ts`

### Route and terminal foundation

Implemented:

- Code-owned transport catalog.
- Route and terminal seed data.
- Generated road-following route geometry snapshot.
- Firestore seed/check/apply workflow for transport data.
- Route geometry sanitation and validation tests.
- Route branches represented as separate route records.
- Route lookup by terminal pair and direction.
- Selectable terminal filtering for driver setup.

Key files:

- `Largaaaaaaaaaaaaa/lib/seed/transport-catalog.ts`
- `Largaaaaaaaaaaaaa/lib/seed/transport-location-inventory.ts`
- `Largaaaaaaaaaaaaa/lib/seed/transport-route-templates.ts`
- `Largaaaaaaaaaaaaa/lib/seed/generated/transport-route-geometries.ts`
- `Largaaaaaaaaaaaaa/scripts/seed-transport-catalog.ts`
- `Largaaaaaaaaaaaaa/scripts/refresh-transport-route-geometries.ts`
- `Largaaaaaaaaaaaaa/docs/transport-seeding.md`

### Driver trip flow

Implemented:

- Driver terminal selection.
- Supported route resolution before trip start.
- One-active-trip-per-driver validation using `activeTrips/{driverId}`.
- Active trip creation.
- Initial driver location write at trip start.
- Continuous driver location publishing while a trip is active.
- Live/stale/missing location status derivation.
- Trip end flow.
- Vehicle location cleanup on trip end.
- Trip event writes for `trip_started` and `trip_ended`.
- Reverse route selection is prepared after trip end.
- Driver route rendering can show remaining route and reconnect guidance.
- Driver trip metrics can calculate remaining distance and ETA when live speed is available.

Key files:

- `Largaaaaaaaaaaaaa/services/live-data/firebase-live-data.ts`
- `Largaaaaaaaaaaaaa/components/map/driver/drivermapscreen.tsx`
- `Largaaaaaaaaaaaaa/components/map/driver/driver-location.ts`
- `Largaaaaaaaaaaaaa/lib/domain/transport.ts`
- `Largaaaaaaaaaaaaa/lib/domain/driver-route-render.ts`
- `Largaaaaaaaaaaaaa/services/live-data/mapbox-guidance.ts`
- `Largaaaaaaaaaaaaa/services/live-data/trip-start-location.ts`

### Commuter route-aware visibility

Implemented:

- Commuter GPS presence publishing.
- Manual fallback presence publishing.
- Nearby route matching using route geometry.
- Selected route filter.
- Vehicle freshness filtering.
- Route-position filtering so commuters see only vehicles that can still pass their point.
- ETA estimate using live speed when available and a fallback speed when not.
- Driver-side route-scoped commuter visibility through `routeCommuterPresence/{routeId}/commuters/{uid}`.

Key files:

- `Largaaaaaaaaaaaaa/components/map/commuter/commutermapscreen.tsx`
- `Largaaaaaaaaaaaaa/components/map/shared/device-location.ts`
- `Largaaaaaaaaaaaaa/lib/domain/commuter-visibility.ts`
- `Largaaaaaaaaaaaaa/services/live-data/firebase-live-data.ts`

### Firebase schema and security direction

Implemented or documented:

- Firestore schema notes exist.
- Firestore rules exist and include operational collections.
- Emulator smoke tests exist for rule behavior.
- Operational state is separated from longer-term trip events.
- Commuter profile data is not stored in commuter presence records.

Key files:

- `Largaaaaaaaaaaaaa/FIREBASE_SCHEMA.md`
- `Largaaaaaaaaaaaaa/firestore.rules`
- `Largaaaaaaaaaaaaa/scripts/rules-smoke.ts`
- `Largaaaaaaaaaaaaa/scripts/rules-smoke.mjs`

## Not implemented or partially implemented functions

### 1. Fare computation by origin and destination

Status: Not implemented as an MVP-complete function.

What exists:

- Vehicle markers currently carry static fare strings based on vehicle type.
- The ride info panel uses hardcoded fare values.

What is missing:

- No origin/destination fare matrix.
- No commuter origin/drop-off input flow.
- No fare computation service based on selected origin and destination.
- No discounted fare rule implementation beyond static UI buttons.

Relevant files:

- `Largaaaaaaaaaaaaa/services/live-data/firebase-live-data.ts`
- `Largaaaaaaaaaaaaa/components/map/RideInfoPanel.tsx`
- `PRD.md`

### 2. Live commuter ride-detail panel

Status: Partially implemented.

What exists:

- Commuters can tap visible bus or jeep markers.
- A ride info modal opens.

What is missing:

- The modal does not receive the selected live vehicle record.
- Route, speed, distance, ETA, and fare shown in the modal are hardcoded.
- If multiple vehicles of the same type are visible, the panel cannot distinguish which exact vehicle was selected.

Relevant file:

- `Largaaaaaaaaaaaaa/components/map/RideInfoPanel.tsx`

### 3. Notification system

Status: UI-only / fixture-backed.

What exists:

- Notification list UI.
- Unread filter UI.
- Role-specific notification fixture data.
- Notification badges use fixture unread counts.

What is missing:

- No Firestore notification collection.
- No notification subscription service.
- No mark-as-read persistence.
- No real events create notifications.
- Some fixture content references out-of-scope concepts such as passenger requests, earnings, pickup requests, or route optimization.

Relevant files:

- `Largaaaaaaaaaaaaa/services/fixtures/notifications.ts`
- `Largaaaaaaaaaaaaa/components/notifications.tsx`
- `Largaaaaaaaaaaaaa/app/(tabs)/notifications.tsx`

### 4. Account profile editing

Status: UI-only.

What exists:

- Account screen with editable full name and email fields.
- Delete account confirmation dialog.
- Save Changes button.

What is missing:

- Values are initialized from hardcoded local state, not the signed-in Firebase profile.
- Save Changes does not persist to Firebase Auth or Firestore.
- Change password, username, and email rows do not navigate to real flows.
- Delete Account confirmation does not delete the Firebase Auth account or Firestore profile.

Relevant file:

- `Largaaaaaaaaaaaaa/components/account.tsx`

### 5. Preferences

Status: UI-only.

What exists:

- Preferences screen.
- Appearance toggle local state.
- Notification preference rows.

What is missing:

- Preferences are not stored in Firestore or local persistent storage.
- Appearance choice does not apply a real app theme.
- Notification settings, notification sound, and notification interval rows do not open real controls.

Relevant file:

- `Largaaaaaaaaaaaaa/components/preferences.tsx`

### 6. Automatic arrival detection

Status: Not implemented as a complete function.

What exists:

- Drivers can manually end a trip with the STOP control.
- Route progress segment index is persisted during guidance refresh.
- Destination and ETA metrics exist when route guidance and live speed are available.

What is missing:

- No automatic detection that the driver has arrived at the destination.
- No arrival threshold policy.
- No arrival prompt that asks the driver to end or start the return trip.
- No automatic trip state transition based on proximity to destination.

Relevant files:

- `Largaaaaaaaaaaaaa/components/map/driver/drivermapscreen.tsx`
- `Largaaaaaaaaaaaaa/services/live-data/firebase-live-data.ts`
- `TASKS.md`

### 7. Return-trip confirmation flow

Status: Partially implemented.

What exists:

- After ending a trip, the selected terminal pair is reversed.
- The UI shows a hint that the return route is ready when a reverse route resolves.
- The driver must press LARGA again before starting the return trip.

What is missing:

- No explicit confirmation prompt or dedicated return-trip screen state.
- No separate return-trip copy explaining the reversed direction before activation.

Relevant files:

- `Largaaaaaaaaaaaaa/services/live-data/firebase-live-data.ts`
- `Largaaaaaaaaaaaaa/components/map/driver/drivermapscreen.tsx`

### 8. Explicit off-route warning behavior

Status: Partially implemented.

What exists:

- Driver guidance can refresh when the driver moves meaningfully or drifts away from current guidance.
- Stored-route fallback guidance can display a warning when live road guidance is unavailable.
- Reconnect path rendering exists.

What is missing:

- No explicit user-facing "off route" warning policy.
- No separate off-route status in trip state.
- No threshold-specific off-route notice that distinguishes GPS drift from real route deviation.
- No tested UI behavior for sustained off-route travel.

Relevant files:

- `Largaaaaaaaaaaaaa/lib/domain/transport.ts`
- `Largaaaaaaaaaaaaa/services/live-data/mapbox-guidance.ts`
- `Largaaaaaaaaaaaaa/components/map/driver/drivermapscreen.tsx`

### 9. In-motion safety warning

Status: Not implemented.

What exists:

- Driver speed is read from GPS and displayed in the active trip panel when available.

What is missing:

- No rule that warns drivers against interacting with setup controls while moving.
- No speed threshold for showing a safety warning.
- No blocked or delayed UI actions while the vehicle is in motion.

Relevant files:

- `Largaaaaaaaaaaaaa/components/map/driver/drivermapscreen.tsx`
- `TASKS.md`

### 10. Manual commuter reference point accuracy

Status: Partially implemented.

What exists:

- A "Use map center" manual fallback button exists.
- Manual presence is published with `referenceSource: 'manual'`.

What is missing:

- The current handler uses `INITIAL_CENTER_COORDINATE`, not the actual current Mapbox camera center.
- This means "Use map center" does not yet reflect where the user has panned the map.

Relevant file:

- `Largaaaaaaaaaaaaa/components/map/commuter/commutermapscreen.tsx`

### 11. Route management and admin route editing

Status: Deferred / not implemented in app UI.

What exists:

- Code-owned route seed workflow.
- Admin driver-application review UI.
- Firestore schema allows admin-owned route edits in principle.

What is missing:

- No admin route management screen.
- No route create/edit/deactivate UI.
- No in-app terminal management UI.
- No production operator workflow for maintaining route data beyond seed scripts.

Relevant files:

- `Largaaaaaaaaaaaaa/docs/transport-seeding.md`
- `Largaaaaaaaaaaaaa/FIREBASE_SCHEMA.md`
- `CONSTRAINTS.md`

### 12. Live Firebase environment verification

Status: Not verified by this audit.

What exists:

- Seed scripts and Firestore rules exist.
- Unit tests and typecheck pass locally.

What is missing:

- This audit did not run live Firebase seeding.
- This audit did not run the Firebase emulator smoke test.
- This audit did not verify that the deployed Firestore data matches the repo-owned route catalog.
- This audit did not verify Cloudinary credentials or live ID upload behavior.

Relevant commands:

```powershell
npm.cmd run seed:transport
npm.cmd run seed:transport:check-live
npm.cmd run seed:transport:apply
npm.cmd run rules:smoke
```

### 13. Production deployment readiness

Status: Not complete.

What exists:

- Expo app configuration exists.
- Native Android folder exists.
- EAS config exists.
- Typecheck and domain/service tests pass.

What is missing:

- No documented release checklist.
- No confirmed iOS build validation in this audit.
- No current Android emulator validation in this audit.
- No end-to-end route/trip test on a real device.
- No performance validation for live map subscriptions.
- No Firebase cost/usage validation for sustained live tracking.

## Stale or conflicting documentation notes

The current code is ahead of parts of `TASKS.md`.

Examples:

- `TASKS.md` still marks route and terminal document shapes as incomplete, but `FIREBASE_SCHEMA.md`, the seed catalog, seed scripts, and tests now define a practical route/terminal shape.
- `TASKS.md` still marks commuter and driver route logic items as mixed, while core commuter visibility and driver live trip behavior are already implemented.
- `README.md` still says the repository contains "planning, Firebase setup, and an early mobile shell," which understates the current Firebase-backed trip and visibility foundation.

Recommended documentation cleanup:

1. Update `TASKS.md` to split implemented, partially implemented, and not implemented items.
2. Update `README.md` current-state language so it reflects the active-trip and commuter-visibility foundation.
3. Keep this file as a dated audit snapshot rather than the permanent source of truth.

## Recommended next implementation order

1. Connect `RideInfoPanel` to selected live vehicle data instead of hardcoded vehicle-type data.
2. Implement fare computation rules using route, origin, destination, and discount type.
3. Fix manual commuter reference so it uses the actual current map center.
4. Add automatic arrival detection plus a clear manual fallback/return prompt.
5. Add explicit off-route warning state and UI copy.
6. Replace notification fixtures with a real notification data source or remove out-of-scope fixture claims.
7. Connect account/profile and preference screens to persistent data, or mark them as non-MVP placeholders.
8. Run Firebase emulator rules smoke tests and live seed checks before claiming backend readiness.

## Current completion summary

Implemented enough for an MVP foundation:

- Auth and multi-role session model
- Driver approval lifecycle
- Route/terminal seed foundation
- Driver active trip lifecycle
- Driver live location publishing
- Commuter route-aware presence and visibility
- Driver route-scoped commuter visibility
- Domain and service unit coverage

Not implemented enough for feature-complete MVP:

- Real fare computation
- Live selected-vehicle ride detail
- Real notifications
- Profile/preferences persistence
- Arrival detection
- Off-route warning behavior
- In-motion safety warning
- Full release/device validation
