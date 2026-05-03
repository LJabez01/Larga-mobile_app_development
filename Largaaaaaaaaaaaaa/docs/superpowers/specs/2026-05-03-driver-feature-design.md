# Driver Feature Design

Date: 2026-05-03
Status: Approved design draft

## Purpose
Document the agreed driver role boundaries and the current driver-side feature design for future backend and product reference.

## Role model
- Roles are strictly separate.
- Current roles are `commuter`, `driver`, and `admin`.
- One account has one role only.
- A `driver` account is not also a `commuter`.
- A `commuter` account is not also a `driver`.
- `admin` is assigned manually through a trusted process.
- `driver` is assigned manually through a trusted process.
- Public signup should create `commuter` accounts only.

## Driver objective
The driver should be able to select a valid route by choosing two predefined terminals, start one active trip with a `Larga` action, view the selected route path on the map, and see only active commuters who are relevant to the active route.

## Feature summary
The driver experience is route-first, map-first, and operationally simple. The driver selects an origin terminal and destination terminal from a fixed valid list. The selected pair defines the trip direction. When the driver presses `Larga`, the system loads the stored route path, starts a single active trip, and displays the route path and route-relevant commuter markers on the map. The driver does not see unrelated commuters.

## Core driver behavior
1. The driver opens the route or driver map screen.
2. The driver selects two predefined terminals.
3. The selected origin and destination imply the trip direction.
4. The `Larga` button becomes available only when both terminals are valid and not identical.
5. The system attempts to load the stored route path for the selected direction.
6. If route loading fails, the trip does not start and the driver is prompted to retry or reselect terminals.
7. If route loading succeeds, the system creates one active trip for the driver.
8. The route path appears on the map using a visible polyline.
9. The map recenters to the driver when the trip starts.
10. The driver sees only active commuters whose current location is relevant to the active route.
11. If no commuters match, the route and driver marker remain visible with a simple empty state.
12. If the driver leaves the route path, the trip remains active and a warning is shown.
13. When the driver reaches the destination terminal, the system prompts the driver to confirm ending the trip and supports a return-trip confirmation flow.

## Locked driver decisions
- Use stored route records as the official MVP route source.
- Design the system so it can grow into a hybrid model later, where map-provider features can enhance navigation or traffic without replacing the stored route truth.
- Drivers select terminals from a predefined valid list only.
- One driver can have only one active trip at a time.
- Direction is implied by origin and destination selection.
- Route loading failure prevents trip start.
- Return-trip behavior should use driver confirmation rather than silently switching direction.
- Driver view is map-only in MVP, with no supporting list or bottom sheet.
- Leaving the route path should show a warning but should not auto-stop or silently reroute the trip.
- Traffic display is deferred unless reliable real traffic data already exists.
- A simple non-blocking safety warning is allowed during active trips.
- Trip end should use arrival detection when possible, but still require driver confirmation.
- When no commuters match, show the route and driver marker with a simple empty state.
- Driver sees exact live commuter locations, limited to route-relevant commuters only.

## Terminal and route model
- Terminals come from a fixed predefined list.
- Drivers cannot create custom terminals in the MVP.
- Route direction is determined by the chosen origin and destination terminals.
- `Terminal 1 -> Terminal 2` and `Terminal 2 -> Terminal 1` are treated as separate directions.
- Stored route records are the source of truth for route path geometry.
- Dynamic map-provider routing may be added later as an enhancement layer, not as the core route definition.

## Trip start behavior
The `Larga` button should:
- stay disabled until two different valid terminals are selected
- attempt to load the route path before activating the trip
- create the active trip only after route loading succeeds
- save the selected route and direction as the driver's active route state

If route loading fails:
- do not start the trip
- do not mark the driver active for route operations
- show a clear retry or reselection path

## Route display behavior
- The active route path should appear on the map as a visible line or polyline.
- The route should remain visible while the trip is active.
- The driver's current location should remain visible.
- The map should recenter to the driver when the trip starts.
- If live tracking is available, the driver marker should update as location changes.

## Commuter visibility rules
A commuter should be visible to the driver only if:
- the driver has an active trip
- the commuter is active or waiting
- the commuter's location is near the driver's active route path
- the commuter is not on an unrelated route
- the commuter is within the supported route matching threshold
- the commuter has not already been passed when progress or direction can be inferred

A commuter should not be visible if:
- the commuter is outside the selected route path
- the commuter belongs to a different route
- the commuter location is outdated
- the driver has not started the trip
- the driver is inactive

## Driver-side commuter display
- Commuters are shown as route-relevant markers on the map only.
- No unnecessary commuter personal information should be exposed.
- Exact live commuter locations are allowed in MVP, but only for commuters relevant to the driver's active route.

## Return trip behavior
- When the driver reaches the destination terminal, the system should detect arrival when feasible.
- The system should prepare the reverse route for the return direction.
- The driver should confirm before the return trip starts.
- If automatic arrival detection is unreliable, a manual return-trip action should still be available.

## Safety and route warnings
- If the driver leaves the route path, show a warning and keep the trip active.
- Do not auto-stop the trip because of an off-route event.
- Do not silently reroute the trip in MVP.
- A simple safety warning may appear when the trip is active and repeated screen interaction happens while the vehicle is moving.
- The safety warning must stay short and non-blocking.

## Data needs
- driver ID
- vehicle ID
- vehicle type
- plate number
- driver latitude and longitude
- selected origin terminal
- selected destination terminal
- active route ID
- route direction
- route path coordinates
- trip active status
- trip start time
- latest driver location timestamp
- commuter latitude and longitude
- commuter active status
- commuter intended route or nearby route
- commuter latest location timestamp

## Edge cases
- driver denies location permission
- driver location is unavailable
- route path cannot be loaded
- one or both terminals are missing
- selected terminals are invalid or identical
- no active commuters are found along the route
- commuter location data is outdated
- driver leaves the route path
- driver reaches the destination terminal
- automatic reverse routing fails
- traffic data is unavailable
- safety warning is triggered repeatedly

## MVP boundaries
Included in MVP:
- predefined terminal selection
- `Larga` trip start action
- one active trip per driver
- active route state
- route path display
- driver map recentering
- route-based commuter filtering
- route-relevant commuter markers
- return-trip confirmation flow
- clear warning or fallback behavior when detection is unreliable

Deferred until later:
- full navigation guidance
- spoken turn-by-turn instructions
- fake or estimated traffic overlays without real data
- fare collection
- booking or reservation
- complex dispatching
- advanced driver analytics
- heavy anti-distraction systems

## Risks
- stored route quality is critical for driver and commuter consistency
- route loading failures will block trip start and must be handled cleanly
- exact live commuter visibility needs strict role and route scoping to avoid privacy drift
- arrival detection may be unreliable without strong location quality near terminals

## Current recommendation
Use a stored-route, one-active-trip, route-scoped driver flow for MVP, designed so it can later expand into a hybrid navigation model without changing the route source of truth.
