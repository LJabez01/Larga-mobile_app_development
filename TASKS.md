# TASKS.md

## Current priority
Build the backend and route-data foundation that supports both the commuter and driver MVP flows.

## Active tasks
- [ ] Review and confirm `PLAN.md`, `TASKS.md`, and `CONSTRAINTS.md`
- [ ] Review and confirm commuter and driver feature design specs
- [ ] Finalize Firestore collection structure for users, routes, terminals, active trips, vehicle locations, and trip events
- [ ] Finalize role assignment flow for `commuter`, `driver`, and `admin`
- [ ] Decide how route and terminal seed data will be created and maintained
- [ ] Prepare initial Firestore rules deployment flow

## Backend foundation tasks
- [ ] Implement first-sign-in user document creation
- [ ] Restrict public-created users to `commuter`
- [ ] Define trusted path for promoting users to `driver` or `admin`
- [ ] Add one-active-trip-per-driver validation
- [ ] Add active trip create, update, and end flow
- [ ] Add latest driver live-location write flow
- [ ] Add route lookup by terminal pair and direction

## Route data tasks
- [ ] Define route document shape
- [ ] Define terminal document shape
- [ ] Define how route branches are represented as separate route records
- [ ] Define route polyline storage format
- [ ] Define configurable route proximity threshold

## Commuter tasks
- [ ] Define commuter reference-point handling
- [ ] Define nearby-route matching query strategy
- [ ] Define vehicle freshness window
- [ ] Define route-relevance filter logic
- [ ] Define moderate ETA heuristic for MVP

## Driver tasks
- [ ] Define `Larga` activation contract
- [ ] Define route-load failure behavior
- [ ] Define arrival detection and manual end fallback
- [ ] Define return-trip confirmation behavior
- [ ] Define simple off-route warning behavior
- [ ] Define simple in-motion safety warning rule

## Deferred tasks
- [ ] Admin analytics dashboard
- [ ] Traffic display with real traffic data
- [ ] Fare payment
- [ ] Booking and reservation
- [ ] Full dispatch management
- [ ] Advanced prediction and notifications

## Definition of progress
- Foundation is complete when the system can securely identify roles, start one driver trip, publish live route-bound driver location, and support commuter-side filtered route visibility on the same route dataset.
