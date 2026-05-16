# Firebase Schema

## Purpose
This document defines the current Firebase structure for the LARGA MVP backend foundation. It stays aligned with the current route-first driver flow, Spark-plan constraints, and the code-owned transport catalog used for Firestore seeding.

## Core decisions
- Use Cloud Firestore as the main database.
- Keep deny-by-default rules and open only the reads and writes the MVP needs.
- Keep route and terminal data code-owned in the repo, then sync it into Firestore through the transport seed workflow.
- Keep live operational state separate from long-term history:
  - `activeTrips` and `vehicleLocations` are operational
  - `tripEvents` is append-only history

## Role model
- `commuter`: default self-service role for a new signed-in user.
- `driver`: operational role that can start trips and publish live location.
- `admin`: trusted role for route management, moderation, and cleanup.

## Role assignment
- Public signup creates only `commuter` user documents.
- `driver` and `admin` are assigned through a trusted path.
- Client code must not be able to promote a user into `driver` or `admin`.

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
Canonical route records managed by admins and consumed by both driver and commuter flows.

Suggested fields:
- `id`
- `label`
- `originTerminalId`
- `destinationTerminalId`
- `vehicleType`
- `coordinates`
- `isActive`

Notes:
- Route records are direction-specific.
- Reverse directions are represented as separate route records.
- `coordinates` are stored as ordered route points.

Rules intent:
- Any signed-in user can read routes.
- Only admins can create or edit routes.

### `terminals/{terminalId}`
Canonical terminal records used to construct valid driver route pairs.

Suggested fields:
- `id`
- `label`
- `coordinate`
- `isActive`

Rules intent:
- Any signed-in user can read terminals.
- Only admins can create or edit terminals.

### `activeTrips/{driverId}`
One active trip record per driver. The document ID matches the driver ID to enforce one active trip per driver without Cloud Functions.

Suggested fields:
- `driverId`
- `routeId`
- `originTerminalId`
- `destinationTerminalId`
- `status`
- `startedAt`
- `updatedAt`

Rules intent:
- Signed-in users can read active trips for map visibility.
- Driver can create only one active trip at their own document path.
- Driver cannot update the active trip document in place in the current MVP.
- Ending a trip deletes the operational record.
- Admin can manage any trip.

### `vehicleLocations/{driverId}`
Latest known live vehicle location for the driver’s active trip.

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
- Driver can create or update only their own latest location document.
- Driver location writes must match the driver’s current `activeTrips/{driverId}` route.
- Driver can delete their own latest location document when ending a trip.
- Admin can moderate or clean up records if needed.

### `tripEvents/{eventId}`
Append-only trip event history for reporting and later analytics.

Suggested fields:
- `tripId`
- `driverId`
- `routeId`
- `eventType`
- `recordedAt`
- `metadata`

Current event types:
- `trip_started`
- `trip_ended`

Rules intent:
- Driver can create events only for their own trip activity.
- Regular commuters do not read full trip history.
- Admin can read, moderate, or delete exceptional bad records.

## Transport seeding workflow
- Source of truth: [transport-catalog.ts](</C:/Users/Carl Lester/OneDrive/Documents/GitHub/Larga-mobile_app_development/Largaaaaaaaaaaaaa/lib/seed/transport-catalog.ts>)
- Sync command: [seed-transport-catalog.ts](</C:/Users/Carl Lester/OneDrive/Documents/GitHub/Larga-mobile_app_development/Largaaaaaaaaaaaaa/scripts/seed-transport-catalog.ts>)
- Team instructions: [transport-seeding.md](</C:/Users/Carl Lester/OneDrive/Documents/GitHub/Larga-mobile_app_development/Largaaaaaaaaaaaaa/docs/transport-seeding.md>)

## Spark-plan notes
- Avoid Cloud Functions as a required MVP dependency.
- Keep route reads and active vehicle reads shallow and predictable.
- Use the latest-location document pattern for live tracking.
- Keep heavy analytics and historical processing out of the critical operational path.

## Current backend milestone
The current backend slice is complete when the system can:
1. Create first-sign-in commuter user documents safely
2. Read seeded terminals and routes
3. Resolve a route by terminal pair and direction
4. Start one active driver trip at `activeTrips/{driverId}`
5. Write the latest driver location at `vehicleLocations/{driverId}`
6. End the trip and clean up operational state safely
