Date: 2026-05-27
Status: Draft for review

## Purpose
Define the safest route-data fix for the Sta. Maria Bayan to San Jose Terminal corridor issue where the live polyline shows an unnecessary side turn near the Shell Patag area instead of staying on the intended main-road approach.

## Problem summary
The route shown in the live app for:
- `sta-maria-bayan-san-jose`
- `san-jose-sta-maria-bayan`

can drift off the intended road corridor near the San Jose Patag Shell area and display a detour-like turn that should not be part of the route truth.

This is a driver-trust and safety issue because the visible route line can imply a wrong maneuver.

## Confirmed findings from project context
- Stored route records are the operational source of truth.
- Driver rendering currently consumes route data supplied through live route documents and guidance state.
- The checked-in generated geometry for `sta-maria-bayan-san-jose` already ends on the intended main-road segment before the local Patag turn.
- The transport inventory and route-corridor planning docs already state that the official San Jose endpoint should stay on the direct roadside approach and avoid entering the local side-road turn.
- Runtime app code reads active route documents from Firestore, so a stale Firestore route document can still render a bad corridor even if repo-owned geometry is already correct.

## Scope
This fix covers only the Sta. Maria route family:
- `sta-maria-bayan-san-jose`
- `san-jose-sta-maria-bayan`
- `sta-maria-bayan-halang`
- `halang-sta-maria-bayan`
- `sta-maria-bayan-norzagaray`
- `norzagaray-sta-maria-bayan`

## Out of scope
- Driver UI redesign
- Commuter UI changes
- Route-progress algorithm redesign
- Full routing stack replacement
- New navigation or spoken turn-by-turn behavior
- Broad route-authoring tooling beyond what is needed to keep the current seed flow correct

## Goals
- Fix the San Jose corridor in live route data so the polyline stays on the intended main-road segment near Shell Patag.
- Keep Firestore route documents aligned with the repo-owned route catalog.
- Validate the rest of the Sta. Maria route family for the same repo-vs-Firestore drift.
- Avoid changes to unrelated driver, commuter, or rendering behavior unless a validation step proves they are also incorrect.

## Recommended approach
Use the repo-owned generated route geometry and route seed catalog as the source of truth, then re-sync the live Firestore route documents for the Sta. Maria route family through the existing transport seeding workflow.

This fix should treat the bad turn as a route-data synchronization problem first, not as a polyline rendering problem.

## Design

### 1. Source of truth
- Keep `lib/seed/generated/transport-route-geometries.ts` as the checked-in geometry source.
- Keep `lib/seed/transport-catalog.ts` and `ROUTE_SEED` as the route records that should be written to Firestore.
- Do not manually patch route coordinates inside UI code or trip guidance code as a first response.

### 2. Validation flow
Before applying any runtime behavior change:
1. Compare the live Firestore `routes` documents for the Sta. Maria family against the repo-owned `ROUTE_SEED`.
2. Confirm whether `sta-maria-bayan-san-jose` and `san-jose-sta-maria-bayan` are out of sync with the checked-in geometry.
3. Validate whether the other Sta. Maria routes also drifted.
4. If live route docs already match repo truth, stop and re-check the runtime guidance path before making any broader code change.

### 3. Fix flow
If Firestore is out of sync:
1. Re-apply the existing transport seed workflow so route docs match the checked-in route catalog.
2. Prioritize the San Jose corridor pair.
3. Validate the other Sta. Maria route documents in the same pass.
4. Preserve reverse-route symmetry so the reverse San Jose route remains the exact reverse of the forward corridor.

### 4. Safety boundaries
- Do not change the driver map component unless validation proves the bug is not in Firestore route data.
- Do not change active trip lifecycle logic.
- Do not change commuter filtering logic.
- Do not change route-progress or off-route reconnect behavior unless a verified mismatch requires it.
- Prefer the smallest correct fix at the route-truth layer.

## Implementation direction
The implementation should likely focus on:
- inspecting the live transport seed output against Firestore route docs
- ensuring the transport seed apply path is the path used for correction
- adding or refining a focused validation or test layer if needed so route drift is easier to catch next time

The implementation should not begin by editing `DriverMapScreen` or other rendering code unless the data-source validation fails to explain the issue.

## Testing and verification
Run focused validation after the fix:
- route seed and route catalog tests
- checks that San Jose forward and reverse routes are symmetric
- checks that the San Jose endpoint remains on the intended main-road approach
- checks that the other Sta. Maria routes still resolve cleanly

If practical during implementation, verify the resulting live route data before claiming the issue fixed.

## Success criteria
- The San Jose corridor no longer takes the unnecessary side turn near Shell Patag.
- The route remains on the intended straight main-road approach in both directions.
- Firestore route data matches the repo-owned route truth for the Sta. Maria family.
- No unrelated driver or commuter features are removed or changed.

## Risks
- Applying seed data to the wrong Firebase target would update the wrong environment.
- A stale production Firestore document can continue to override correct checked-in geometry until seed apply is run successfully.
- If Firestore already matches repo truth, the issue may instead live in the runtime guidance path and should be re-evaluated before additional edits.

## Current recommendation
Proceed with a route-data-first fix: validate Firestore against `ROUTE_SEED`, re-sync the Sta. Maria route family if needed, and keep rendering logic unchanged unless the validation disproves the current root-cause hypothesis.
