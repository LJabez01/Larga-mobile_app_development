# IMPLEMENTATION.md

## Purpose
This file bridges the gap between high-level planning and actual execution. It describes how the system should be implemented in practical stages, what each stage should produce, and what dependencies must be in place before later work begins.

## Source references
- [PRD.md](C:/Users/Carl Lester/OneDrive/Documents/GitHub/Larga-mobile_app_development/PRD.md)
- [PLAN.md](C:/Users/Carl Lester/OneDrive/Documents/GitHub/Larga-mobile_app_development/PLAN.md)
- [TASKS.md](C:/Users/Carl Lester/OneDrive/Documents/GitHub/Larga-mobile_app_development/TASKS.md)
- [CONSTRAINTS.md](C:/Users/Carl Lester/OneDrive/Documents/GitHub/Larga-mobile_app_development/CONSTRAINTS.md)
- [Commuter Feature Design](C:/Users/Carl Lester/OneDrive/Documents/GitHub/Larga-mobile_app_development/Largaaaaaaaaaaaaa/docs/superpowers/specs/2026-05-03-commuter-feature-design.md)
- [Driver Feature Design](C:/Users/Carl Lester/OneDrive/Documents/GitHub/Larga-mobile_app_development/Largaaaaaaaaaaaaa/docs/superpowers/specs/2026-05-03-driver-feature-design.md)

## System implementation strategy
Implement the system from the route and data foundation upward. Both commuter and driver behavior depend on the same route truth, role model, trip state, and live location model, so those pieces should exist before UI-specific behavior is treated as complete.

## Stage 1: Route and role foundation
### Goal
Create the shared system rules that both commuter and driver flows rely on.

### Work
- finalize role-safe Firestore collections
- finalize route and terminal document shapes
- finalize route source of truth using stored route records
- finalize user role assignment rules
- finalize route branch handling using separate route records

### Expected outputs
- stable Firestore schema
- stable security rules direction
- route and terminal data model
- trusted role assignment process

## Stage 2: Identity and user records
### Goal
Make authentication and user role data reliable enough for feature-specific logic.

### Work
- initialize Firebase auth usage in the app
- create user documents on first sign-in
- default public-created users to `commuter`
- define manual promotion path for `driver` and `admin`

### Expected outputs
- authenticated user session support
- `users/{uid}` records created consistently
- role-safe access pattern for future reads and writes

## Stage 3: Driver trip lifecycle
### Goal
Create the operational driver flow that activates route-specific live tracking.

### Work
- define terminal selection data
- resolve route by terminal pair and direction
- validate `Larga` start conditions
- enforce one active trip per driver
- create active trip records
- support trip end and return-trip confirmation

### Expected outputs
- driver can start exactly one valid trip
- route path can be resolved before trip activation
- invalid route start attempts fail cleanly

## Stage 4: Driver live location publishing
### Goal
Publish route-bound live driver state that commuter logic can consume.

### Work
- write latest driver location to operational documents
- attach trip and route IDs to live location state
- define freshness handling for location data
- support off-route warning logic inputs

### Expected outputs
- live vehicle position data
- route-bound active trip state
- freshness metadata for filtering

## Stage 5: Commuter route-aware filtering
### Goal
Show commuters only the vehicles that can still pass their reference point.

### Work
- support GPS and manual fallback commuter reference point
- match nearby route polylines
- load active vehicles on relevant routes
- filter route-relevant vehicles only
- compute moderate ETA

### Expected outputs
- commuter-side filtered route visibility
- map-ready vehicle results
- empty-state handling for no nearby route or no valid vehicles

## Stage 6: Driver-side commuter visibility
### Goal
Show drivers only active commuters relevant to the current route.

### Work
- match active commuters to the driver's active route
- hide unrelated commuters
- apply freshness and route-proximity checks
- preserve privacy boundaries while allowing route-scoped visibility

### Expected outputs
- route-relevant commuter markers for active drivers
- no unrelated commuter leakage

## Stage 7: Hardening and validation
### Goal
Validate that the route-based system behaves correctly under MVP conditions.

### Work
- validate shared-route and branch-route behavior
- validate stale-data handling
- validate permission-denied and empty-state behavior
- validate trip start, trip end, and return-trip flow
- validate Firebase rules against intended read and write ownership

### Expected outputs
- validated backend behavior
- known risks and limitations list
- stable basis for later admin-side work

## Implementation dependencies
- route and terminal data must exist before driver route selection can work
- active trip state must exist before commuter filtering can reliably consume vehicle state
- live location freshness rules must exist before commuter ETA and visibility logic can be trusted
- role-safe user documents must exist before admin, driver, and commuter permissions can be enforced cleanly

## Initial implementation priorities
1. Firestore schema and rules
2. Route and terminal seed data
3. User document creation and role assignment
4. Driver active trip lifecycle
5. Driver live location publishing
6. Commuter route-aware vehicle filtering
7. Validation and cleanup

## Known planning gaps
- fare computation remains in the PRD MVP and still needs a dedicated implementation decision
- admin-side route management is not yet fully specified
- route and terminal seed-data ownership process still needs to be defined clearly

## Non-goals for this initial implementation cycle
- full navigation guidance
- fake or estimated traffic overlays without reliable data
- analytics dashboard implementation
- broad dispatch features
- payment and booking systems
