# PRD.md
## Product
LARGA
## Summary
A real-time mobile transportation tracking system for commuters and public utility vehicle drivers in Santa Maria, Bulacan. The system provides live vehicle location visibility, estimated arrival insight, and route-based trip support through a map-centric mobile interface.
## User
Commuters who require real-time visibility of jeepney and bus movement for trip planning, and jeepney or bus drivers who need a low-friction mobile interface for continuous GPS-based location transmission.
## Problem
Public transport users in Santa Maria experience uncertainty in vehicle arrival, route availability, and waiting duration because traditional commuting relies on manual observation and non-digital coordination. Drivers also lack a standardized mobile mechanism to publish live operational location data to commuters in real time.
## MVP
- role-based mobile authentication entry
- commuter and driver application flows
- real-time map interface as the primary operational screen
- driver-side GPS location capture and synchronization
- commuter-side live vehicle visibility by route or selected trip context
- estimated time of arrival computation for approaching vehicles
- route search and selection from the top-level map controls
- fare computation based on origin and destination inputs
- Firebase-backed real-time data updates between driver and commuter sessions
## Out of scope
ticketing, digital payments, dispatching, advanced fleet management, commuter-to-commuter visibility, predictive analytics dashboards, offline synchronization, municipality expansion outside Santa Maria, and non-transport social features
## Workflow
Open app ->
log in ->
enter commuter or driver flow ->
driver starts live trip tracking or commuter selects route context ->
Firebase updates vehicle state in real time ->
Mapbox map renders active vehicle position ->
commuter monitors incoming vehicle and ETA
## UI/UX Direction
The UI should remain mobile-first, map-first, and operationally focused. The current product direction uses a green-and-white visual system, a lightweight login screen, and a simplified live map workspace with top-level controls for route search, profile access, and navigation. The commuter and driver experiences should minimize interaction overhead, prioritize immediate spatial awareness, and avoid dense configuration-heavy flows that interrupt routine use.
## Tech Stack
React Native for cross-platform mobile development, Tailwind CSS utility styling for consistent and maintainable UI composition, Firebase for authentication and real-time data synchronization, and Mapbox for integrated live map rendering and geospatial interaction.
## Technical Scope
- React Native will serve as the frontend application layer for Android and iOS delivery through a shared codebase.
- Tailwind-based styling will standardize spacing, color, typography, and reusable interface patterns across login, map, and role-based screens.
- Firebase will manage authentication, real-time location persistence, user records, and low-latency synchronization between commuter and driver clients.
- Mapbox will provide map rendering, camera control, route-focused visualization, and live vehicle marker presentation.
- Driver devices will use built-in smartphone GPS to publish location updates to Firebase at defined intervals while a trip is active.
- Commuter devices will subscribe to route-relevant vehicle updates and render them on the integrated Mapbox view.
- ETA logic will use current vehicle coordinates, destination context, and route progress to provide commuter-facing arrival estimates.
## Functional Requirements
- The system shall allow a user to enter the application through a mobile login interface.
- The system shall distinguish commuter and driver usage flows after authentication.
- The system shall allow drivers to start and stop live trip tracking from a mobile device.
- The system shall capture driver GPS coordinates and transmit them to Firebase in near real time.
- The system shall render live vehicle positions on the commuter map interface.
- The system shall allow commuters to search or select transport routes from the map screen.
- The system shall display ETA information for active vehicles approaching the commuter context.
- The system shall compute fare information based on selected origin and destination.
- The system shall restrict unnecessary visibility between commuters to preserve privacy and maintain feature focus.
## Non-Functional Requirements
- The system shall prioritize usability and low interaction complexity for repeated daily use.
- The system shall maintain acceptable responsiveness for live map updates under normal mobile network conditions.
- The system shall support Android and iOS through a single React Native codebase.
- The system shall maintain data consistency between active driver and commuter sessions through Firebase synchronization.
- The system shall provide a maintainable frontend structure that supports iterative enhancement without major redesign.
- The system shall depend on internet connectivity and mobile GPS availability for real-time accuracy.
## Success
- enable users to reach their operational flow with minimal startup friction
- reduce commuter uncertainty by exposing live vehicle position and ETA on a single map screen
- allow drivers to activate location sharing in only a few interactions
- provide reliable route visibility under standard mobile connectivity conditions
- maintain a simple technical foundation that supports future iteration, testing, and deployment
