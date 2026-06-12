# Commuter Fare Phase 1 Contract

Last updated: 2026-06-11

## Purpose

This document defines the fare-computation contract for the commuter side of LARGA before implementation begins.

The goal of this phase is to lock the fare source of truth, fare inputs, fare outputs, tariff model, and scope boundaries so later phases can be implemented without hidden assumptions.

## Confirmed current state

Confirmed from the current code:

- The commuter ride panel already receives the selected live vehicle record.
- Fare is still a static string in live vehicle data.
- The ride panel still derives the displayed fare from that static string.
- The commuter presence model stores only a coordinate, a reference source, and nearby route IDs.
- The commuter presence model does not store a fare origin stop or destination stop.

Code evidence:

- `services/live-data/firebase-live-data.ts` currently injects static fare by vehicle type.
- `services/contracts/live-data.ts` still models vehicle fare as a string.
- `components/map/RideInfoPanel.tsx` still parses and displays that vehicle fare string.
- `lib/domain/commuter-visibility.ts` does not store any fare stop identity in commuter presence.

## Product tariff decisions locked for MVP

These are product decisions for the MVP fare engine:

### Decision 1: Fare must not be inferred only from raw GPS

Fare computation must not guess the commuter's origin stop from the raw map coordinate alone.

Reason:

- The current commuter presence record has no stop identity.
- A nearest-point guess can easily select the wrong stop on overlapping or closely spaced route segments.
- A guessed fare origin would create silent pricing errors that are hard to detect in testing.

### Decision 2: MVP fare will use explicit fare endpoints

The fare feature will use two explicit commuter-controlled fare endpoints:

- `fareOriginLocationId`
- `fareDestinationLocationId`

These are fare-selection inputs, not route-matching inputs.

The commuter presence flow for route visibility remains separate and continues to use the current GPS/manual coordinate model.

### Decision 3: Fare will be distance-based, not pair-matrix-based

The MVP fare engine will compute fare from:

- selected route direction
- selected fare origin stop
- selected fare destination stop
- route distance between those two fare stops
- tariff rule mapped from the app vehicle type

This replaces the earlier flat origin-destination fare pair idea.

Reason:

- the product now explicitly wants minimum fare plus succeeding kilometer rate
- that is a tariff formula, not a static origin-destination lookup table
- distance-based calculation scales better when the same tariff applies to multiple stop pairs on the same route

### Decision 4: App vehicle types map to product tariff classes

The app currently exposes only:

- `jeep`
- `bus`

For the MVP fare engine, these app types map to tariff classes as follows:

- `jeep` -> `traditional_jeep`
- `bus` -> `aircon_bus`

This is a product choice for MVP because the current app does not yet distinguish:

- traditional vs modern jeep
- ordinary vs air-conditioned bus

### Decision 5: Discounted fare is derived after base fare resolution

The fare engine must resolve the normal base fare first.

Only after that may the UI derive:

- `normal`
- `discounted`

The discount toggle must not replace base fare computation.

## Tariff values selected for MVP

The MVP tariff basis chosen for implementation is:

- `traditional_jeep`
  - `minimumFare = 14.00`
  - `minimumCoveredDistanceKm = 4`
  - `succeedingDistanceStepKm = 1`
  - `succeedingKilometerRate = 2.00`
  - `succeedingDistanceRounding = 'ceil_step'`
- `aircon_bus`
  - `minimumFare = 18.00`
  - `minimumCoveredDistanceKm = 5`
  - `succeedingDistanceStepKm = 1`
  - `succeedingKilometerRate = 2.98`
  - `succeedingDistanceRounding = 'ceil_step'`

These values are the product tariff inputs chosen for the MVP build.

## Important implementation guardrail

The exact fare math must not hide unverified tariff mechanics in code.

The following tariff mechanics must be stored as explicit tariff data fields, not hardcoded assumptions buried in helper logic:

- `minimumCoveredDistanceKm`
- `succeedingDistanceStepKm`
- `succeedingDistanceRounding`

This keeps the fare engine honest even if the exact LTFRB tariff coverage or rounding rule is refined later.

## Exact fare-computation contract

### Input contract

The fare resolver should accept the following minimum inputs:

```ts
type AppVehicleType = 'bus' | 'jeep';
type FareMode = 'normal' | 'discounted';

type ResolveFareInput = {
  routeId: string;
  vehicleType: AppVehicleType;
  fareOriginLocationId: string | null;
  fareDestinationLocationId: string | null;
  fareMode?: FareMode;
};
```

### Tariff configuration contract

The fare resolver must not embed vehicle pricing directly in UI or live marker data.

It should resolve pricing from code-owned tariff configuration:

```ts
type FareTariffClass = 'traditional_jeep' | 'aircon_bus';
type FareDistanceRounding = 'ceil_step';

type FareTariffRule = {
  tariffClass: FareTariffClass;
  minimumFare: number;
  minimumCoveredDistanceKm: number;
  succeedingDistanceStepKm: number;
  succeedingKilometerRate: number;
  succeedingDistanceRounding: FareDistanceRounding;
};
```

### Route fare stop contract

Each fare-enabled route direction must expose an ordered set of fare stops:

```ts
type RouteFareStop = {
  routeId: string;
  locationId: string;
  orderIndex: number;
  cumulativeDistanceKm: number;
};
```

`cumulativeDistanceKm` is the route-aligned distance from the start of the route direction to that stop.

This lets the resolver compute a stop-to-stop distance without recomputing geometry every time.

### Vehicle-to-tariff mapping contract

The app vehicle type must be translated to the fare tariff class through one explicit mapping:

```ts
const APP_VEHICLE_TARIFF_CLASS: Record<AppVehicleType, FareTariffClass> = {
  jeep: 'traditional_jeep',
  bus: 'aircon_bus',
};
```

### Fare computation algorithm

The resolver should use the following algorithm:

```ts
type FareComputationBreakdown = {
  distanceKm: number;
  chargeableDistanceKm: number;
  succeedingStepCount: number;
  minimumFare: number;
  succeedingKilometerRate: number;
  addedFare: number;
  baseFare: number;
};

function computeBaseFare(
  distanceKm: number,
  tariff: FareTariffRule,
): FareComputationBreakdown {
  const chargeableDistanceKm = Math.max(
    distanceKm - tariff.minimumCoveredDistanceKm,
    0,
  );

  const succeedingStepCount = tariff.succeedingDistanceRounding === 'ceil_step'
    ? Math.ceil(chargeableDistanceKm / tariff.succeedingDistanceStepKm)
    : 0;

  const addedFare = succeedingStepCount * tariff.succeedingKilometerRate;
  const baseFare = tariff.minimumFare + addedFare;

  return {
    distanceKm,
    chargeableDistanceKm,
    succeedingStepCount,
    minimumFare: tariff.minimumFare,
    succeedingKilometerRate: tariff.succeedingKilometerRate,
    addedFare,
    baseFare,
  };
}
```

Implementation note:

- `distanceKm` comes from the directional difference between destination and origin `cumulativeDistanceKm`
- if the destination falls behind the origin on that route direction, the resolver must return `destination_before_origin` instead of pricing the trip
- `ceil_step` means any started step beyond the covered minimum distance is charged as one full succeeding distance step
- this is the implementation rule to seed for MVP so the fare engine stays deterministic; if official route tariff material later requires a different step rule, only tariff configuration and tests should change

### Resolver output contract

The fare resolver should return a structured result rather than a formatted string:

```ts
type FareResolutionStatus =
  | 'ready'
  | 'missing_origin'
  | 'missing_destination'
  | 'same_origin_destination'
  | 'destination_before_origin'
  | 'origin_not_on_route'
  | 'destination_not_on_route'
  | 'route_not_fare_enabled'
  | 'invalid_vehicle_type'
  | 'tariff_not_configured';

type FareResolution = {
  status: FareResolutionStatus;
  routeId: string;
  vehicleType: AppVehicleType;
  tariffClass: FareTariffClass | null;
  fareOriginLocationId: string | null;
  fareDestinationLocationId: string | null;
  baseFare: number | null;
  discountedFare: number | null;
  breakdown: FareComputationBreakdown | null;
};
```

## Discount contract

The fare engine should keep discount application separate from distance calculation:

```ts
type FareDiscountPolicy = {
  percentageOff: number;
};

const MVP_DISCOUNT_POLICY: FareDiscountPolicy = {
  percentageOff: 0.2,
};
```

Recommended calculation:

```ts
function applyDiscount(baseFare: number, policy: FareDiscountPolicy) {
  return Math.max(Math.round(baseFare * (1 - policy.percentageOff)), 0);
}
```

This preserves the existing MVP behavior while keeping the policy isolated.

## Route and data model requirements

The safest MVP path is:

- keep route truth direction-specific through existing `routeId`
- add a fare-stop definition layer that references known transport location IDs
- seed ordered fare stops for each fare-enabled route direction
- seed one tariff rule per supported tariff class
- map app vehicle types to tariff classes explicitly

Recommended implementation direction:

- code-owned fare-stop inventory references existing `TransportLocationSeed` IDs
- each fare-enabled route direction gets ordered fare stops with `cumulativeDistanceKm`
- tariff rules live in a dedicated fare domain module
- commuter UI filters fare-stop options by the selected vehicle's route direction
- the resolver must reject backward stop selections on a directional route instead of converting them into a valid fare

## MVP scope for the fare feature

In scope for the fare MVP:

- explicit commuter fare origin selection
- explicit commuter fare destination selection
- route-direction-aware stop-to-stop distance lookup
- tariff-based base fare computation
- normal and discounted display modes
- incomplete-state handling when one or both fare endpoints are missing
- explicit breakdown-ready fare output from the domain layer

Explicitly out of scope for this fare MVP:

- fare payment
- booking or reservation
- automatic GPS-only fare origin detection
- cross-route transfer fare logic
- admin fare editing
- dynamic traffic-based pricing
- municipality-wide pricing rules beyond the seeded MVP routes

## Phase 2 implementation target

Phase 2 should build the code-owned fare domain and seed data for this contract.

That phase should introduce:

- fare tariff rules
- route fare stop definitions with `cumulativeDistanceKm`
- app-vehicle-to-tariff mapping
- fare lookup helpers
- fare computation helpers
- focused unit tests for tariff resolution and distance charging

Phase 2 is complete in code when:

- the pure fare domain validates tariff and discount inputs
- seeded route fare stops exist for the current fare-enabled routes
- a route-aware resolver returns structured status results and computed fares
- the fare foundation passes focused unit tests and project typecheck

Phase 2 should not build commuter UI yet.

## Phase 3 implementation target

Phase 3 should add the commuter fare endpoint selection flow using the Phase 1 contract.

Recommended MVP interaction:

- selected live vehicle remains the context anchor
- commuter selects fare origin and fare destination from route-relevant options
- the ride panel displays an incomplete state until both are selected
- once both are selected, the ride panel displays resolved normal and discounted fare values

## Validation gate for Phase 1 completion

Phase 1 is complete only if all of the following are true:

- the fare source of truth is defined
- the tariff model is defined
- the fare input contract is defined
- the fare output contract is defined
- the route fare stop model is defined
- explicit scope boundaries are written down
- the Phase 2 and Phase 3 implementation order is clear

## Skills used for this phase

- `$brain-storming` for contract planning
- `$skill-router` for choosing the minimal working stack
- `$avoid-feature-creep` for MVP boundary control
- `$typescript-best-practices` as the target standard for the contract shape
