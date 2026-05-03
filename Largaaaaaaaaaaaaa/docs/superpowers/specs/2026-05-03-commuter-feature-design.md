# Commuter Feature Design

Date: 2026-05-03
Status: Approved design draft

## Purpose
Document the agreed commuter role boundaries and the current commuter-side feature design for future backend and product reference.

## Role model
- Roles are strictly separate.
- Current roles are `commuter`, `driver`, and `admin`.
- One account has one role only.
- A `driver` account is not also a `commuter`.
- A `commuter` account is not also a `driver`.
- `admin` is assigned manually through a trusted process.
- `driver` is assigned manually through a trusted process.
- Public signup should create `commuter` accounts only.

## Commuter objective
The commuter should see only jeepneys and buses that are currently active and are expected to pass through or near the commuter's current location.

## Feature summary
The commuter experience is location-first and map-first. The system should automatically use the commuter's current location when permission is available, find nearby supported route paths, and show only vehicles whose active route can still pass the commuter's location. When multiple valid routes overlap, the commuter should see matching vehicles first and then narrow results using route chips. If location is unavailable, the commuter should still be able to continue by dropping a pin or choosing a place manually.

## Core commuter behavior
1. The system reads the commuter's location automatically when allowed.
2. If location access is denied or unavailable, the commuter can drop a pin or choose a place manually.
3. The system finds nearby route paths around the commuter reference point.
4. The system loads active vehicles assigned to those routes.
5. The system filters vehicles so only those that can still pass the commuter are shown.
6. The commuter sees matching vehicles on a map-first interface with a bottom sheet or list.
7. When multiple nearby routes overlap, all valid vehicles can appear first and the commuter can narrow them with a route filter.

## Locked commuter decisions
- The commuter flow is location-first.
- The map is the primary presentation, with a bottom sheet or list for comparison.
- Nearby matching vehicles should be shown by default.
- Route filtering should be available when multiple nearby routes overlap.
- Route filtering should use route chips or tabs in the commuter UI.
- Route polyline or path geometry is the primary MVP matching basis.
- Separate route records should be used for each branch or destination in MVP.
- Ordered stops can be added later to improve ETA and route progress logic.
- Route proximity should use one fixed threshold in MVP and remain configurable later.
- Stale vehicle data should be shown only within a small acceptable freshness window.
- ETA should be moderately accurate for MVP and use route path distance plus current speed when available.
- Empty states should help the commuter widen the search area or choose another point instead of ending in a dead state.

## Vehicle matching rules
A vehicle should appear only if:
- it is active
- it has a defined route
- the commuter's reference point is near that route
- the route path segment still reaches the commuter
- the vehicle has not already passed the commuter, when direction or progress can be inferred
- the vehicle does not split away before reaching the commuter

A vehicle should not appear if:
- it is inactive
- its route is unrelated to the commuter's nearby routes
- it already passed the commuter and will not return soon
- its route does not pass near the commuter reference point
- it separates toward a different destination before reaching the commuter

## Route and matching model
For MVP, each destination branch should be its own route record even when multiple routes share the same early road segment. Shared segments are acceptable, but the route should split into separate records once the destination path diverges.

The matching flow should be polyline-first:
1. take the commuter reference point from GPS or manual fallback
2. find nearby route polylines using a fixed proximity threshold
3. load active vehicles assigned to those routes
4. discard stale, inactive, or malformed vehicle records
5. discard vehicles whose route can no longer reach the commuter point
6. compute ETA for remaining vehicles
7. return map-ready and list-ready vehicle results

When multiple valid routes are found, the default behavior should show all valid matching vehicles first, then let the commuter narrow results with route chips.

## Vehicle details to display
- ETA
- current speed when available
- plate number
- vehicle type
- route name
- current vehicle position on the map

## MVP data needs
- commuter latitude and longitude, or manually selected fallback point
- vehicle latitude and longitude
- vehicle speed
- plate number
- vehicle type
- assigned route
- route path geometry
- destination or branch information when routes split
- active status
- latest location timestamp

## Backend behavior
The commuter feature should read from a small operational dataset rather than full trip history. For MVP, the backend should rely on route records, active trip records, latest vehicle location records, and user role records. This keeps reads lighter for the Spark plan and avoids coupling commuter rendering to analytics-oriented history data.

Route geometry and live vehicle state should be treated as first-class backend data. Each active vehicle should have a stable assigned route record, current coordinates, freshness timestamp, vehicle type, plate number, and speed when available. Each route record should contain enough path geometry to determine whether:
- the commuter is near the route
- the vehicle is on a route that still reaches the commuter
- the route separates before reaching the commuter

ETA should be moderately accurate for MVP. It should use remaining route-path distance to the commuter plus current vehicle speed when available, and fall back to a simpler heuristic when speed is missing.

## Known edge cases
- commuter denies location permission
- commuter is not near any supported route
- no active vehicles are available nearby
- vehicle location data is outdated
- vehicle route is missing
- vehicle speed is unavailable
- multiple routes overlap near the commuter
- vehicle shares an early segment but separates before reaching the commuter
- vehicle already passed the commuter

## Error handling and empty states
- If location permission is denied, offer manual place or pin selection immediately.
- If no nearby supported routes are found, explain that clearly and allow the commuter to move the reference point or widen the search area.
- If no active vehicles match, explain that no valid vehicles are currently available for the nearby routes.
- If vehicle data is stale beyond the accepted freshness window, hide the vehicle instead of showing misleading results.
- If speed is missing, still show the vehicle and compute ETA from a fallback heuristic.

## MVP boundaries
Included in MVP:
- location-aware vehicle filtering
- route-aware vehicle visibility
- ETA display
- vehicle detail display
- current vehicle map position
- overlapping route handling
- empty-state recovery flow

Deferred until later:
- fare payment
- ticket booking
- advanced dispatching
- notifications
- full traffic prediction
- complex AI route prediction
- multi-city expansion

## Risks
- route geometry quality is critical; incomplete or inconsistent route paths will reduce filtering accuracy
- stale or missing vehicle updates can weaken ETA quality
- route-to-vehicle assignment must stay clean, otherwise valid vehicles may be hidden or unrelated vehicles may appear

## Current recommendation
Use a polyline-first commuter matching flow for MVP, designed so it can later expand into a hybrid path-plus-stops model without changing the commuter role boundaries.
