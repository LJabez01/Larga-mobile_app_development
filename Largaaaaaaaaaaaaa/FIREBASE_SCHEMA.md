# Firebase Schema

## Purpose
This document defines the first backend-safe Firebase structure for the LARGA MVP. It prioritizes secure defaults, Spark-plan compatibility, and future support for driver tracking, commuter visibility, and later admin analytics.

## Core decisions
- Use Cloud Firestore as the main database.
- Keep Firestore in `asia-southeast1` for proximity to Philippines users.
- Start with deny-by-default rules and explicitly open only required reads and writes.
- Keep analytics as future-facing reporting, but store trip and location history in a way that supports later aggregation.

## Role model
- `commuter`: default self-service role for a new signed-in user.
- `driver`: operational role that can create active trips and publish live location.
- `admin`: future role for route management, moderation, and analytics access.

## Role assignment
- Public signup creates only `commuter` user documents.
- `driver` and `admin` should be assigned by a trusted path such as Firebase Console, Admin SDK, or a future protected admin tool.
- Promotion from `commuter` to `driver` or `admin` stays manual through a trusted operator path.
- Do not let public client code freely promote users into `driver` or `admin`.

## Collections

### `users/{uid}`
Profile and role metadata for each authenticated user.

Suggested fields:
- `uid`
- `role`
- `email`
- `displayName`
- `phoneNumber`
- `createdAt`
- `updatedAt`

Rules intent:
- User can create and read their own document.
- User can update only safe profile fields.
- Public create is restricted to `role == 'commuter'`.
- Role is immutable from the client.

### `routes/{routeId}`
Canonical route records managed by admins.

Suggested fields:
- `id`
- `name`
- `code`
- `vehicleType`
- `originTerminalId`
- `destinationTerminalId`
- `directionKey`
- `coordinates`
- `isActive`
- `createdAt`
- `updatedAt`

Rules intent:
- Any signed-in user can read routes.
- Only admins can create or edit routes.

### `terminals/{terminalId}`
Canonical terminal records managed by admins.

Suggested fields:
- `id`
- `name`
- `latitude`
- `longitude`
- `isActive`
- `createdAt`
- `updatedAt`

Rules intent:
- Any signed-in user can read terminals.
- Only admins can create or edit terminals.

### `activeTrips/{driverId}`
One active trip record per driver session. The active trip document ID is the authenticated driver's UID.

Suggested fields:
- `driverId`
- `routeId`
- `status`
- `startedAt`
- `updatedAt`

Rules intent:
- Signed-in users can read active trips for map visibility.
- Driver can create and manage only their own active trip.
- Driver must create the document at `activeTrips/{driverId}` with `driverId == auth.uid`.
- This one-doc-per-driver contract is the MVP rule-layer guard for one active trip per driver.
- Admin can manage any trip.

### `vehicleLocations/{driverId}`
Latest known live location for a driver. Using `driverId` as the document ID keeps the commuter-side read path simple and avoids creating a new top-level document for every GPS ping.

Suggested fields:
- `driverId`
- `tripId`
- `routeId`
- `latitude`
- `longitude`
- `heading`
- `speed`
- `accuracy`
- `recordedAt`
- `updatedAt`

Rules intent:
- Signed-in users can read live vehicle locations.
- Driver can write only their own current location with the full validated latest-location shape.
- Driver location writes must stay bound to the driver's current active trip and route.
- Admin can moderate or clean up records if needed.

### `tripEvents/{eventId}`
Append-only driver event history for reporting and future analytics.

Suggested fields:
- `tripId`
- `driverId`
- `routeId`
- `eventType`
- `recordedAt`
- `metadata`

Example event types:
- `trip_started`
- `trip_stopped`
- `location_ping`
- `route_changed`

Rules intent:
- Driver can create events for their own trip activity with the full validated event shape.
- Driver event writes must stay bound to the driver's current active trip and route.
- Admin can read all events for analytics later.
- Admin can delete exceptional bad records if cleanup is needed.
- Regular commuters should not read full event history by default.

## Spark-plan notes
- Avoid Cloud Functions as a required path for the MVP.
- Avoid heavy polling or unnecessary Firestore writes from GPS updates.
- Keep route reads and active vehicle reads shallow and predictable.
- Use the latest-location document pattern for live tracking, and keep detailed history in `tripEvents` only when necessary.

## Next backend step
After rules are in place, the next implementation slice should be:
1. Create user documents on first sign-in.
2. Add role-aware backend logic for driver versus commuter access.
3. Implement driver trip start and stop writes.
4. Implement live location writes to `vehicleLocations/{driverId}`.
