# CONSTRAINTS.md

## Product constraints
- Stay aligned with the current MVP defined in [PRD.md](C:/Users/Carl Lester/OneDrive/Documents/GitHub/Larga-mobile_app_development/PRD.md).
- Keep the system map-first and operationally simple.
- Avoid expanding into admin analytics, dispatching, ticketing, or broad predictive features in the current MVP.

## Role constraints
- Current roles are `commuter`, `driver`, and `admin`.
- One Firebase Auth account may hold multiple role states over time.
- Authorization must come from approved role state, not from a single legacy `role` field.
- Public signup may create:
  - approved `commuter`
  - pending `driver`
  - approved `commuter` plus pending `driver`
- Public signup must not grant approved `driver` or `admin`.
- `driver` approval and `admin` assignment must stay on a trusted path.

## Data-model constraints
- Stored route records are the route source of truth.
- Route branches should be represented as separate route records in MVP.
- Route polyline or path geometry is required for commuter and driver matching logic.
- One driver can have only one active trip at a time.

## Backend constraints
- Firebase should remain usable on a free-first path where possible.
- Avoid making Cloud Functions a required dependency for the initial MVP.
- Prefer direct Firestore-backed operational flows guarded by strong rules.
- Keep live operational reads separate from long-term analytics history.

## Privacy and visibility constraints
- Commuters should not see every vehicle in the system, only route-relevant vehicles.
- Drivers should not see unrelated commuters.
- Do not expose unnecessary personal commuter information.
- Exact commuter locations shown to drivers must remain role-scoped and route-scoped.

## Reliability constraints
- Do not start a driver trip if route loading fails.
- Do not show stale vehicle data beyond the accepted freshness window.
- Do not invent fake traffic data.
- Do not rely on unreliable automatic behaviors without a manual fallback.

## UX constraints
- Keep driver flow low-friction.
- Keep commuter flow location-first with manual fallback support.
- Use empty states that help the user recover instead of dead ends.
- Avoid configuration-heavy screens that interrupt routine use.

## Team and execution constraints
- Current implementation planning should prioritize backend and system foundation work.
- Frontend changes should not be treated as the main execution path unless explicitly approved.
- Prefer incremental changes over large rewrites.
