# Driver Routing Corridor Plan

Date: 2026-05-23  
Status: In Progress

## Purpose
Define the implementation plan for fixing the driver route polyline system at the root cause so the map shows one clean, road-aligned, progress-aware guide line for the active route.

## Problem Summary
The current driver route display still has three classes of failures:

1. Official route geometry can contain extra corridor noise, side-road drift, or branch-like shapes.
2. Runtime guidance can bring back already-passed route segments when the driver is off-route or when the corridor passes near itself.
3. The rendered map model still behaves too much like a raw network path instead of a driver guide.

This makes the route harder to follow and weakens trust in the driver experience.

## Goal
Make the driver map render exactly two route pieces only:

- one clean solid line for the remaining official route corridor
- one road-following dashed reconnect path when the driver is off-route

The map should never look like a road network with branches, duplicate stubs, or already-passed segments behind the reconnect path.

## Locked Decisions
- Stored route records remain the operational route source of truth.
- The route source of truth will be cleaned into major-road corridor spines.
- Mapbox Directions will be used only for off-route reconnect guidance, not as the full route-truth authority.
- Driver rendering will consume only:
  - remaining corridor
  - reconnect path
- Already-passed route segments must not be rendered again during the active trip.
- The fix must work for every terminal pair and must not hardcode one-off route patches.

## Constraints
From project docs and current architecture:

- Keep the MVP map-first and operationally simple.
- Stored route records are the route source of truth.
- Route branches should remain separate route records.
- Do not invent fake route geometry.
- Do not replace the routing stack with a new provider or full navigation engine.
- Prefer incremental fixes at the correct layer over UI-only cleanup.

## Target UX
When a trip is active:

1. The driver sees one clean main route line.
2. The line follows the real jeepney or bus corridor on major roads.
3. If the driver is off-route:
   - a dashed reconnect line appears
   - it follows roads to the valid forward rejoin point
   - the map still shows only the remaining route from the rejoin point onward
4. The map never shows:
   - already-passed corridor behind the reconnect line
   - branch-like leftovers
   - duplicate polyline fragments
   - unrelated route segments

## Architecture Direction

### 1. Route Truth Layer
Each terminal pair should resolve to one official cleaned corridor spine.

Responsibilities:
- define official terminal endpoints
- define major-road waypoint anchors
- generate dense road-following geometry
- sanitize geometry before it becomes official route truth

### 2. Runtime Guidance Layer
Runtime guidance should compute:
- current forward route progress
- nearest valid forward rejoin point
- remaining official corridor only
- reconnect path only when off-route

Responsibilities:
- never rejoin behind meaningful progress
- never re-render already-passed route segments
- keep reconnect routing separate from official corridor truth

### 3. Render Layer
The map should render only:
- `mainRouteLine = remaining official corridor`
- `reconnectLine = road-following reconnect path or null`

Responsibilities:
- no raw full-route rendering during active trips
- no drawing from mixed fallback geometry
- no branch or duplicate fragments

## Implementation Phases

### Phase 1: Create a Dedicated Geometry Module
Status: Implemented
Purpose:
Move route-cleaning logic into one maintainable module instead of scattering it across transport helpers.

Files:
- new `lib/domain/route-geometry.ts`
- new `lib/domain/__tests__/route-geometry.test.ts`

Work:
- add reusable geometry helpers for:
  - segment distance
  - bearing change detection
  - short branch detection
  - near-duplicate path detection
  - local loop/noise detection
  - forward corridor slicing
  - optional route simplification without losing corridor meaning
- keep transport-domain business logic separate from raw geometry cleanup

Expected output:
- reusable sanitizer utilities
- reusable corridor slicing helpers

Validation checkpoints:
- tests prove endpoint preservation
- tests prove branch/noise removal
- tests prove the resulting corridor remains continuous

### Phase 2: Build the Route Spine Validator / Sanitizer
Status: Implemented
Purpose:
Ensure official route truth is one dominant corridor spine instead of a noisy geometry dump.

Files:
- `lib/domain/route-geometry.ts`
- `scripts/refresh-transport-route-geometries.ts`
- `lib/seed/generated/transport-route-geometries.ts`

Work:
- take Mapbox-generated raw geometry as input
- detect and discard:
  - short branch stubs
  - self-near local loops
  - duplicate detour fragments
  - side-road noise that does not belong to the actual jeepney or bus path
- apply the cleaning procedure inside `refresh-transport-route-geometries.ts` before any official route coordinates are written into `transport-route-geometries.ts`
- output only the cleaned official corridor spine

Cleaning procedure:
1. Load the raw Mapbox-generated geometry for one route record at a time.
2. Preserve the raw geometry in-memory for validation and debug comparison; do not overwrite it before checks pass.
3. Normalize the geometry:
   - remove exact duplicate adjacent coordinates
   - collapse extremely dense micro-points only when endpoint continuity is preserved
4. Detect candidate noise ranges using `route-geometry.ts`:
   - short rejoining branch stubs
   - self-near loop fragments
   - duplicate local detours that leave and rejoin the same corridor section
5. Score each candidate range against the corridor rules for that route family:
   - keep geometry that matches the intended `Route Path / Major Roads`
   - reject geometry that enters known avoid-corridors or obvious side-road drift
6. Remove only the ranges that satisfy the sanitizer thresholds and still leave one continuous forward corridor.
7. Re-run continuity checks on the cleaned result:
   - at least two coordinates remain
   - start and end still align with the intended terminal corridor edges
   - no broken gap appears between kept segments
8. Compare raw vs cleaned metrics:
   - total point count
   - total path distance
   - detected branch/noise ranges removed
9. Write the cleaned geometry as the official route record only if all validations pass.
10. If validation fails, abort that route refresh and keep the previous official geometry instead of emitting partially cleaned output.

Safety rules:
- Never invent new geometry during cleaning; sanitization may only keep, remove, merge-adjacent, or simplify existing road-following coordinates.
- Never let the cleaner jump across a gap just to make the line look smoother.
- Never clean a route independently of its corridor rules; branch removal must respect the route-family major-road definition.
- Never auto-accept a cleaned route whose endpoint drift exceeds the allowed terminal-corridor tolerance.
- Prefer no refresh over a bad refresh. If the cleaner is uncertain, keep the last known-good official route geometry and surface the route for manual review.

Expected output:
- one clean official geometry per route record
- no branch-like side stubs embedded in official route truth
- every official route record is produced by the same guarded refresh pipeline, not by manual one-off edits

Validation checkpoints:
- sanitized geometry remains road-following
- route point counts reduce or stabilize without breaking continuity
- geometry still starts and ends at the correct terminal corridor edges
- refresh fails loudly instead of writing malformed or over-cleaned geometry

### Phase 3: Reclassify Existing Sta. Maria Routes
Status: Implemented
Purpose:
Re-evaluate each current route using the cleaned geometry model.

Routes in scope:
- `sta-maria-bayan-halang`
- `halang-sta-maria-bayan`
- `sta-maria-bayan-san-jose`
- `san-jose-sta-maria-bayan`
- `sta-maria-bayan-norzagaray`
- `norzagaray-sta-maria-bayan`

Files:
- `lib/seed/transport-route-templates.ts`
- `lib/seed/transport-catalog.ts`
- `lib/seed/generated/transport-route-geometries.ts`

Work:
- classify the current geometry into:
  - official corridor spine
  - discarded branch/noise
- ensure reverse routes are derived from the same cleaned corridor spine reversed

Expected output:
- every active route becomes one clean corridor
- reverse directions stay aligned with the same official path

Validation checkpoints:
- no route contains obvious branch stubs
- reverse paths are exact reversals of the forward corridor

### Phase 4: Align Terminal Endpoints with Route Corridors
Status: Implemented
Purpose:
Ensure route start and end points align with the real operational terminal edges instead of unrelated nearby roads.

Files:
- `lib/seed/transport-catalog.ts`
- `lib/seed/transport-location-inventory.ts`
- `lib/seed/transport-route-templates.ts`

Work:
- confirm terminal endpoint coordinates match the intended corridor entry/exit
- keep terminal truth aligned with the route spine
- ensure waypoint anchors reflect `Route Path / Major Roads`

Expected output:
- terminal markers and corridor endpoints visually align
- route does not start or end on an unrelated side road

Validation checkpoints:
- each route endpoint sits on the same corridor the line uses
- terminal marker and route endpoint mismatch is removed

### Phase 5: Add Forward Progress State
Status: Implemented
Purpose:
Stop already-passed route segments from coming back during off-route scenarios.

Files:
- `lib/domain/transport.ts`
- `services/contracts/live-data.ts`
- `services/live-data/firebase-live-data.ts`

Work:
- persist and update:
  - `routeProgressSegmentIndex`
  - optionally `lastForwardRejoinIndex` if needed later
- constrain rejoin search so it cannot snap behind meaningful progress
- slice the route to only the remaining corridor

Expected output:
- active guidance state contains only the remaining route corridor
- past route segments do not reappear

Validation checkpoints:
- off-route driver never sees already-passed route behind the reconnect line
- self-near routes do not snap backward into previous corridor sections

### Phase 6: Rebuild Reconnect Guidance
Status: Implemented
Purpose:
Use Mapbox Directions only for the off-route reconnect path, not for the whole trip path.

Files:
- `services/live-data/mapbox-guidance.ts`
- `lib/config/mapbox.ts`

Work:
- compute the nearest valid forward rejoin point from the progress-aware corridor
- request road-following geometry only for:
  - `current driver location -> forward rejoin point`
- do not let the reconnect request redefine the official corridor
- if reconnect fails:
  - show remaining corridor only
  - do not invent a fake straight-line reconnect

Expected output:
- dashed line is a real reconnect path
- solid line remains the official remaining corridor

Validation checkpoints:
- reconnect path follows roads
- no fallback straight connector is rendered
- reconnect request does not duplicate or reshape the main corridor

### Phase 7: Simplify Driver Render Model
Status: Implemented
Purpose:
Make the map consume one clean route view model only.

Files:
- `components/map/driver/drivermapscreen.tsx`

Work:
- replace raw route rendering with:
  - `mainRouteLine = remaining corridor`
  - `reconnectLine = road-following reconnect path or null`
- stop rendering:
  - full stored route during active trips
  - branch/noise leftovers
  - past route sections
  - mixed fallback geometry

Expected output:
- one solid route line only
- one dashed reconnect path only when needed

Validation checkpoints:
- no road-network look
- no overlapping branch-like polylines
- no duplicate stubs

### Phase 8: Seed the Cleaned Route Truth
Status: Implemented
Purpose:
Push the corrected terminals and route geometry into the real Firebase project so runtime app behavior matches the cleaned route truth.

Files:
- `scripts/refresh-transport-route-geometries.ts`
- `scripts/seed-transport-catalog.ts`
- `docs/transport-seeding.md`

Commands:
- `npm.cmd run seed:transport:refresh-geometry`
- `npm.cmd run seed:transport:apply`

Expected output:
- Firestore terminals and routes reflect the cleaned corridor definitions

Validation checkpoints:
- route docs in Firebase contain only cleaned corridor geometry
- app runtime is reading updated route truth instead of stale geometry

### Phase 9: Regression Tests
Status: Implemented
Purpose:
Lock the route behavior so future changes do not reintroduce branch noise or backward slicing.

Files:
- `lib/domain/__tests__/route-geometry.test.ts`
- `lib/domain/__tests__/transport.test.ts`
- optional `services/live-data/mapbox-guidance.test.ts`

Required regression tests:
- no past segments after rejoin
- no branch stubs in active route
- one continuous main route line only
- reconnect path road-aligned only
- reverse route uses the same cleaned corridor reversed
- terminal endpoints remain aligned to the corridor

## Concrete File Map

### New
- `lib/domain/route-geometry.ts`
- `lib/domain/__tests__/route-geometry.test.ts`

### Existing to update
- `lib/domain/transport.ts`
- `services/live-data/mapbox-guidance.ts`
- `services/live-data/firebase-live-data.ts`
- `services/contracts/live-data.ts`
- `components/map/driver/drivermapscreen.tsx`
- `lib/seed/transport-route-templates.ts`
- `lib/seed/transport-catalog.ts`
- `lib/seed/generated/transport-route-geometries.ts`
- `scripts/refresh-transport-route-geometries.ts`
- `scripts/seed-transport-catalog.ts`
- `docs/transport-seeding.md`

## Execution Order
1. Create `route-geometry.ts`
2. Add sanitizer tests
3. Add sanitizer into geometry refresh pipeline
4. Clean and regenerate official Sta. Maria route geometry
5. Align terminal endpoints and route templates
6. Harden forward-progress slicing in runtime guidance
7. Restrict reconnect routing to reconnect path only
8. Simplify driver render model
9. Apply transport seed to Firebase
10. Validate on-device route behavior

## Validation Scenarios

### Scenario 1: On-route trip
Trip:
- `Sta. Maria Bayan -> Halang`

Expected:
- one solid route line only
- no branch-like side stubs
- route follows the official corridor

### Scenario 2: Off-route trip
Trip:
- `San Jose -> Sta. Maria Bayan`

Expected:
- dashed reconnect path only
- solid remaining route only after the rejoin point
- no already-passed route behind the dashed path

### Scenario 3: Nearby self-crossing corridor risk
Trip:
- any route where the driver location is near a previous part of the same route

Expected:
- rejoin stays forward
- route does not snap backward into past sections

### Scenario 4: Directions failure
Expected:
- no fake straight connector
- remaining corridor only
- warning state remains non-blocking

## Acceptance Criteria
The plan is complete when:

- each active route renders as one clean, continuous main corridor line
- no duplicate or branch-like polyline stubs remain in the main route
- off-route guidance shows only:
  - road-following reconnect path
  - remaining route to destination
- already-passed route segments never reappear behind the reconnect path
- official route geometry follows the intended jeepney or bus major-road corridor
- the same route behavior works consistently for all active terminal pairs

## What Must Not Be Done
- Do not hide bad geometry with styling-only workarounds.
- Do not hardcode route-specific visual patches.
- Do not let Mapbox live routing replace stored route truth.
- Do not invent fake reconnect geometry when road routing fails.
- Do not render full stored geometry during active off-route trips.

## Immediate Next Step
Start Phase 1 by creating `lib/domain/route-geometry.ts` and moving route sanitization responsibilities there before any more UI or map-layer tweaks.
