# LARGA Current State Audit

Last reviewed: 2026-06-12

## Purpose

This document records the current implementation state of the LARGA mobile app and identifies MVP functions that are not yet implemented or are only partially implemented.

It is based on the current project markdown files, the Expo app code under `Largaaaaaaaaaaaaa/`, and local verification through:

```powershell
npm.cmd run typecheck
npm.cmd test
```

Current result: TypeScript passes, and the unit test suite passes 152 of 152 tests.

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
- Commuters can publish GPS presence and see route-relevant vehicles that can still pass their point.
- Drivers can see route-relevant waiting commuters for their active route segment.

The weakest implemented areas are product polish and user-facing completion:

- Fare computation and route-stop selection are connected for the currently seeded fare-enabled routes, but selections are screen-local and route coverage is limited to seeded data.
- The commuter ride-detail panel now follows the selected live vehicle and displays route-aware distance, ETA, and computed fare.
- Notifications are fixture/presentation data, not a real notification system.
- Account and preferences screens are mostly UI-only and do not persist changes.
- Arrival detection, explicit off-route warnings, and in-motion safety warnings are not complete product functions.
- Some planning checkboxes in `TASKS.md` are stale compared with the implementation.

## Latest commuter and driver changes

### Commuter-side changes

- The map now follows the commuter's GPS point automatically.
- Touching and exploring the map temporarily pauses automatic recentering; following resumes after an idle delay.
- Commuters can now switch to a manual pickup-point flow that publishes the actual current map center when live location is unavailable or when the current point needs to be moved.
- Old GPS-sourced commuter presence is no longer treated as a trusted current location when the app cannot get a fresh GPS fix in the current session; manual points still remain intentionally persistent.
- Visible vehicles are ordered by ETA, with unavailable ETAs placed last.
- ETA now uses recent moving-speed samples instead of relying only on one speed reading.
- When a vehicle temporarily stops, the latest reliable ETA is held instead of immediately disappearing or jumping to an unrealistic value.
- The selected live vehicle drives the ride-detail panel, including route, vehicle type, distance, ETA, and speed.
- Boarding and drop-off controls now load route-direction-aware fare stops.
- Normal and discounted fares are computed from the selected route, vehicle type, and fare endpoints.
- New focused tests cover ETA behavior, fare rules, fare resolution, fare-stop ordering, and seeded fare data.

Remaining commuter-side gaps:

- Fare endpoint choices reset when the selected route changes and are not persisted across app restarts.
- Fare computation is available only where the route and fare-stop data have been seeded.

### Driver-side changes

- The driver map now follows the active vehicle while a trip is running.
- Automatic following pauses while the driver explores the map and resumes after an idle delay.
- Camera padding now reacts to the expanded or collapsed trip panel so the vehicle is not hidden behind the overlay.
- Starting a trip centers the vehicle first and then transitions to the route overview.
- The active trip panel has a more compact layout for speed, distance, ETA, destination, route, and commuter visibility.
- Stale or missing GPS state now appears as a visible warning with a manual-end fallback message.
- Driver-facing validation and failure messages were simplified into clearer user language.

Remaining driver-side gaps:

- Arrival detection and destination-proximity handling are not implemented.
- Return-trip preparation exists, but there is no explicit confirmation prompt.
- Guidance fallback warnings exist, but there is no complete sustained off-route state or policy.
- No in-motion interaction safety rule or warning has been implemented.

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
- Session hydration stays in a loading state until Firebase confirms the first authoritative auth result.
- Registration intents for `Commuter`, `Driver`, and `Both`.
- Session routing based on approved and pending role state.
- Pending-driver-only accounts route to the pending access flow.
- Multi-role commuter/driver accounts can use role selection.

Key files:

- `Largaaaaaaaaaaaaa/services/auth/firebase-auth.ts`
- `Largaaaaaaaaaaaaa/services/auth/auth-snapshot-store.ts`
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
- Nearby route matching using route geometry.
- Selected route filter.
- Vehicle freshness filtering.
- Route-position filtering so commuters see only vehicles that can still pass their point.
- Stop-aware ETA using recent moving-speed samples, with short-stop hold behavior.
- ETA-based vehicle ordering.
- Automatic commuter camera following with touch pause and idle resume.
- Selected-vehicle ride details with route-aware fare-stop selection and computed normal or discounted fare.
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

Status: Implemented for the currently seeded fare-enabled routes, with persistence and route-coverage limitations.

What exists:

- A pure fare domain now exists with tariff validation, discount handling, and display helpers.
- Seeded fare tariff rules and route fare stops now exist for the current fare-enabled routes.
- A route-aware fare resolver now supports distance-based base fare and discounted fare resolution from `routeId`, `vehicleType`, `fareOriginLocationId`, and `fareDestinationLocationId`.
- The commuter ride panel now lets the commuter choose boarding and drop-off points from route-direction-aware fare stop options.
- The commuter ride panel now resolves normal and discounted fare values from the seeded fare domain instead of parsing the selected vehicle's static fare string.

What is missing:

- Vehicle markers in the live-data service still carry legacy static fare strings for compatibility, even though the commuter ride panel no longer uses them as its fare source of truth.
- The commuter fare endpoint selection is currently screen-local state and resets when the selected route direction changes.
- The commuter presence/session model does not persist fare endpoint selection across route-context changes or app restarts.

Relevant files:

- `Largaaaaaaaaaaaaa/services/live-data/firebase-live-data.ts`
- `Largaaaaaaaaaaaaa/components/map/RideInfoPanel.tsx`
- `Largaaaaaaaaaaaaa/components/map/commuter/commutermapscreen.tsx`
- `Largaaaaaaaaaaaaa/lib/domain/commuter-fare.ts`
- `Largaaaaaaaaaaaaa/lib/domain/fare.ts`
- `Largaaaaaaaaaaaaa/lib/domain/fare-resolution.ts`
- `Largaaaaaaaaaaaaa/lib/seed/transport-fare.ts`
- `PRD.md`

### 2. Live commuter ride-detail panel

Status: Implemented for the active screen session, with persistence limitations.

What exists:

- Commuters can tap visible bus or jeep markers.
- A ride info modal opens.
- The panel now receives the selected live vehicle record.
- Route distance and ETA now come from route-aware vehicle visibility.
- The panel now exposes route-aware boarding and drop-off selection chips for the selected vehicle's route direction.
- The fare mode toggle now switches between resolved normal and discounted fare values after both fare endpoints are selected.

What is missing:

- The panel does not yet persist fare endpoint selections beyond the current commuter screen session.
- The live-data contract still contains the selected vehicle's legacy static `fare` string even though the panel no longer depends on it.

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

### 10. Manual commuter reference fallback

Status: Implemented.

What exists:

- The live-data contract and presence domain still support `referenceSource: 'manual'`.
- The commuter map has camera control and can detect when the user is exploring the map.
- The commuter UI can enter a dedicated manual pickup-point mode and publish the actual current map center as commuter presence.
- Manual reference mode pauses GPS-driven automatic recentering so the user can move the map without fighting the camera.
- The commuter can switch back to live GPS from the ride panel after a manual point has been saved.

What is missing:

- There is no manual place-search flow yet; the current fallback is pin-based only.

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

1. Add automatic arrival detection plus a clear manual fallback/return prompt.
2. Add explicit off-route warning state and UI copy.
3. Replace notification fixtures with a real notification data source or remove out-of-scope fixture claims.
4. Decide whether commuter fare endpoint selections should stay screen-local or be persisted in live-data state.
5. Remove or repurpose the legacy static vehicle `fare` field now that the commuter ride panel resolves fares from the seeded domain.
6. Connect account/profile and preference screens to persistent data, or mark them as non-MVP placeholders.
7. Run Firebase emulator rules smoke tests and live seed checks before claiming backend readiness.

## Current completion summary

Implemented enough for an MVP foundation:

- Auth and multi-role session model
- Driver approval lifecycle
- Route/terminal seed foundation
- Driver active trip lifecycle
- Driver live location publishing
- Commuter route-aware presence and visibility
- Stop-aware commuter ETA and ETA ordering
- Selected-vehicle ride details and seeded route-aware fare computation
- Commuter and driver automatic map following with touch pause and idle resume
- Driver route-scoped commuter visibility
- Domain and service unit coverage

Not implemented enough for feature-complete MVP:

- Real notifications
- Profile/preferences persistence
- Arrival detection
- Off-route warning behavior
- In-motion safety warning
- Full release/device validation
