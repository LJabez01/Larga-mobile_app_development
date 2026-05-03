# PLAN.md

## Purpose
This file defines the initial system plan for LARGA based on the current PRD, the approved commuter feature design, and the approved driver feature design.

## Current project state
- The mobile app currently exists as an early Expo and Mapbox UI shell.
- Firebase setup has been started.
- Initial Firestore rules, Firebase config, and backend schema notes now exist inside the app workspace.
- Approved feature design drafts now exist for:
  - commuter-side route-aware vehicle visibility
  - driver-side route-guided active trip flow

## Planning direction
The current best path is to build the backend and route-data foundation first, because both commuter and driver behavior depend on the same route truth, trip state, and live location model.

## System phases

### Phase 1: Foundation
- Finalize role model: `commuter`, `driver`, `admin`
- Finalize route source of truth using stored route records
- Finalize Firebase project setup and security rules
- Finalize core Firestore collections and ownership rules
- Prepare terminal and route seed data strategy

### Phase 2: Identity and role-safe data
- Implement authentication flow support in Firebase
- Create user documents on first sign-in
- Restrict public signup to `commuter`
- Define trusted process for assigning `driver` and `admin`

### Phase 3: Driver operational flow
- Implement predefined terminal selection data
- Implement route lookup from stored route records
- Implement `Larga` trip start validation
- Enforce one active trip per driver
- Persist active trip state and driver live location
- Support trip end and return-trip confirmation flow

### Phase 4: Commuter route-aware visibility
- Implement commuter reference-point handling
- Support GPS and manual fallback point selection
- Match nearby stored route paths
- Load active vehicles on relevant routes
- Filter only vehicles that can still pass the commuter
- Compute moderate ETA using route-path distance and speed heuristics

### Phase 5: Map integration and live sync
- Connect active trip and vehicle location data to the map view
- Render driver route polyline and live driver position
- Render route-relevant commuter and vehicle markers
- Handle stale data, empty states, and permission failures cleanly

### Phase 6: Hardening
- Validate route branch behavior and overlapping segments
- Validate stale-data handling
- Validate role-based read and write controls
- Check free-tier Firebase usage assumptions
- Prepare admin-side route management and analytics as later work

## Recommended implementation order
1. Route and terminal data model
2. Role-safe auth and user document creation
3. Driver active trip lifecycle
4. Driver live location publishing
5. Commuter route-path matching
6. Commuter filtered vehicle visibility and ETA
7. Final UX integration and validation

## Design references
- [PRD.md](C:/Users/Carl Lester/OneDrive/Documents/GitHub/Larga-mobile_app_development/PRD.md)
- [Commuter Feature Design](C:/Users/Carl Lester/OneDrive/Documents/GitHub/Larga-mobile_app_development/Largaaaaaaaaaaaaa/docs/superpowers/specs/2026-05-03-commuter-feature-design.md)
- [Driver Feature Design](C:/Users/Carl Lester/OneDrive/Documents/GitHub/Larga-mobile_app_development/Largaaaaaaaaaaaaa/docs/superpowers/specs/2026-05-03-driver-feature-design.md)

## Immediate next milestone
Implement the backend-ready route, terminal, user, active trip, and vehicle location foundation so commuter and driver flows can be built on one consistent system model.
