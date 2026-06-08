# LARGA System Progress Presentation Guide

Prepared for explaining the current LARGA system to our professor.

This guide is based on the current project files, documentation, routes, components, data models, services, Firebase rules, and configuration. It does not add assumed features.

## Short System Summary

LARGA is a mobile transport tracking system for jeepney and bus routes. It focuses on:

- commuter location
- driver location
- route and terminal visibility
- live vehicle markers
- map-based guidance
- driver trip start and stop
- driver approval before driver access

The strongest working parts are authentication, role handling, driver approval, route data, live trip tracking, driver GPS publishing, commuter GPS publishing, and route-aware vehicle visibility.

The parts that still need work are fare computation, real notifications, account editing, preferences, automatic arrival detection, off-route warning, in-motion safety warning, and full live Firebase/device validation.

## Current App Structure

The app uses Expo Router and React Native.

Main entry files:

| File | Role |
| --- | --- |
| `Largaaaaaaaaaaaaa/app/_layout.tsx` | Starts the app, loads fonts and splash screen, then wraps screens with session and live-data providers. |
| `Largaaaaaaaaaaaaa/app/index.tsx` | Sends the user to login, commuter, driver, admin, or role selection depending on session state. |
| `Largaaaaaaaaaaaaa/components/providers/AppSessionProvider.tsx` | Holds authentication and active role state. |
| `Largaaaaaaaaaaaaa/components/providers/LiveDataProvider.tsx` | Holds live route, trip, vehicle, commuter, and notification state. |
| `Largaaaaaaaaaaaaa/firebase.ts` | Connects the app to Firebase Auth and Firestore using Expo public environment variables. |
| `Largaaaaaaaaaaaaa/components/map/shared/mapbox.utils.ts` | Sets up Mapbox map rendering and shared map constants. |

Basic connection:

`app/_layout.tsx` wraps the app with `AppSessionProvider`, then `LiveDataProvider`. Screens use `useAppSession()` for login and roles, and `useLiveData()` for route, trip, vehicle, and commuter data.

## Feature 1: Authentication and Role-Based Access

### Purpose

This feature lets users log in, register, reset password, and enter the correct flow based on their role.

### How it works for the user

The user opens the app and logs in. If the user is a commuter, the app opens the commuter map. If the user is an approved driver, the app opens the driver map. If the user has both roles, the app asks which mode to use. If the user is an admin, the app opens the admin verification screen.

### Main files involved

| File | Role |
| --- | --- |
| `Largaaaaaaaaaaaaa/app/(auth)/login.tsx` | Login screen. It validates email and password, then calls the session provider sign-in action. |
| `Largaaaaaaaaaaaaa/app/(auth)/registration.tsx` | Registration screen. It collects account information, selected role, and driver documents when needed. |
| `Largaaaaaaaaaaaaa/app/(auth)/forgot-password.tsx` | Password reset screen. |
| `Largaaaaaaaaaaaaa/app/(auth)/role-selection.tsx` | Lets users with commuter and driver access choose which mode to enter. |
| `Largaaaaaaaaaaaaa/components/providers/AppSessionProvider.tsx` | Stores session status, selected role, and default route logic. |
| `Largaaaaaaaaaaaaa/services/auth/firebase-auth.ts` | Real Firebase Auth and Firestore auth service. |
| `Largaaaaaaaaaaaaa/lib/domain/auth.ts` | Role helper logic for `commuter`, `driver`, and `admin`. |

### How the files are connected

The screens call actions from `AppSessionProvider`. The provider calls `authService`, which points to `firebaseAuthService`. The Firebase auth service signs in the user and reads or creates the matching `users/{uid}` Firestore document.

### Data flow

1. User enters login or registration details.
2. Screen validates the form.
3. Screen calls `signIn()` or `register()` from `AppSessionProvider`.
4. `firebase-auth.ts` talks to Firebase Auth.
5. `firebase-auth.ts` reads or writes `users/{uid}` in Firestore.
6. `AppSessionProvider` receives the session.
7. `app/index.tsx` or the auth screen redirects the user to the correct app route.

### Current status

Working.

### Known limitations or missing parts

Profile editing is not connected to Firebase yet. Account changes are still mostly UI-only in `components/account.tsx`.

## Feature 2: Multi-Role Registration and Driver Application

### Purpose

This feature allows public signup for commuter accounts and driver access requests. Driver access is not approved automatically.

### How it works for the user

The user chooses Commuter, Driver, or Both during registration. A commuter account can be approved right away. A driver or both-role account creates a pending driver application. The driver must submit vehicle type, plate number, license number, and ID image.

### Main files involved

| File | Role |
| --- | --- |
| `Largaaaaaaaaaaaaa/app/(auth)/registration.tsx` | Collects role choice and driver document fields. |
| `Largaaaaaaaaaaaaa/validations/validation.ts` | Validates registration and driver fields. |
| `Largaaaaaaaaaaaaa/services/auth/firebase-auth.ts` | Creates the Firebase Auth account and user document. |
| `Largaaaaaaaaaaaaa/services/driver-applications/firebase-driver-applications.ts` | Creates and updates driver application records. |
| `Largaaaaaaaaaaaaa/services/media/cloudinary-upload.ts` | Uploads driver ID image when Cloudinary is configured. |
| `Largaaaaaaaaaaaaa/app/(auth)/pending-access.tsx` | Shows pending access status for driver-only users. |
| `Largaaaaaaaaaaaaa/app/(auth)/driver-application.tsx` | Lets applicants update a driver application when resubmission is requested. |

### How the files are connected

The registration screen calls `register()`. The Firebase auth service creates the user account and role state. If the requested role includes driver, it calls `createDriverApplication()`.

### Data flow

1. User fills out the registration form.
2. Validation checks required fields.
3. Firebase Auth creates the account.
4. Firestore creates `users/{uid}`.
5. If driver access is requested, Firestore creates `roleApplications/driver_{uid}`.
6. If ID upload is configured, the uploaded image URL is saved in the application document.

### Current status

Working for registration and driver application creation. Resubmission support exists.

### Known limitations or missing parts

Live Cloudinary credential behavior was not verified in this guide. The current audit also says live Firebase seeding and live ID upload were not verified.

## Feature 3: Admin Driver Approval

### Purpose

This feature prevents public users from becoming approved drivers without review.

### How it works for the user

An admin logs in and sees a list of driver applications. The admin can open one application, review the applicant details and uploaded ID, then approve, reject, or request an update.

### Main files involved

| File | Role |
| --- | --- |
| `Largaaaaaaaaaaaaa/app/admin/index.tsx` | Shows the driver application queue and status filters. |
| `Largaaaaaaaaaaaaa/app/admin/application/[applicationId].tsx` | Shows one application and review buttons. |
| `Largaaaaaaaaaaaaa/services/admin-review/firebase-admin-review.ts` | Loads applications and writes admin review decisions. |
| `Largaaaaaaaaaaaaa/services/driver-applications/firebase-driver-applications.ts` | Builds application details by joining application and user data. |
| `Largaaaaaaaaaaaaa/firestore.rules` | Restricts review actions to approved admins. |

### How the files are connected

The admin list subscribes to `roleApplications`. The detail screen loads one application. When the admin reviews it, `reviewDriverApplication()` runs a Firestore transaction.

### Data flow

1. Admin opens `/admin`.
2. The app listens to `roleApplications`.
3. Admin opens an application detail page.
4. Admin chooses approve, reject, or request update.
5. `firebase-admin-review.ts` updates the application.
6. If approved, the same transaction adds `driver` to the user's `approvedRoles` and removes `driver` from `pendingRoleRequests`.

### Current status

Working.

### Known limitations or missing parts

Admin assignment itself must still happen through a trusted path. Public signup does not grant admin access.

## Feature 4: Route and Terminal Data

### Purpose

This feature gives LARGA one shared route source for both drivers and commuters.

### How it works for the user

Drivers choose valid terminals. Commuters are matched to nearby routes. Both sides use the same route and terminal records, so the map can show vehicles and commuters based on the same route data.

### Main files involved

| File | Role |
| --- | --- |
| `Largaaaaaaaaaaaaa/lib/seed/transport-catalog.ts` | Defines active terminals and route records used for Firestore seeding. |
| `Largaaaaaaaaaaaaa/lib/seed/transport-location-inventory.ts` | Stores broader transport location inventory and selectable endpoint rules. |
| `Largaaaaaaaaaaaaa/lib/seed/transport-route-templates.ts` | Defines base route templates and reverse route helpers. |
| `Largaaaaaaaaaaaaa/lib/seed/generated/transport-route-geometries.ts` | Stores generated route geometry coordinates. |
| `Largaaaaaaaaaaaaa/scripts/seed-transport-catalog.ts` | Syncs route and terminal data to Firestore. |
| `Largaaaaaaaaaaaaa/scripts/refresh-transport-route-geometries.ts` | Refreshes road-following geometry. |
| `Largaaaaaaaaaaaaa/docs/transport-seeding.md` | Explains how to update and seed transport data. |
| `Largaaaaaaaaaaaaa/FIREBASE_SCHEMA.md` | Documents route and terminal collections. |

### How the files are connected

The seed files define the route and terminal data. The seed script writes them to Firestore. The live-data service reads active `terminals` and `routes` from Firestore. Driver and commuter map screens consume those records from `LiveDataProvider`.

### Data flow

1. Route data is edited in seed files.
2. Geometry is generated or refreshed.
3. Seed script previews or applies the data to Firestore.
4. App listens to active `routes` and `terminals`.
5. Driver and commuter screens use those records for route selection and visibility.

### Current status

Working as a code-owned route foundation.

### Known limitations or missing parts

There is no in-app admin route management screen yet. Route updates still depend on seed files and scripts.

## Feature 5: Driver Terminal Selection and Trip Start

### Purpose

This feature lets an approved driver choose a supported terminal pair and start one live trip.

### How it works for the user

The driver opens Driver Mode, chooses origin and destination terminals, and presses `LARGA`. If the terminal pair has a supported route, the trip starts. The app then begins publishing the driver's live location.

### Main files involved

| File | Role |
| --- | --- |
| `Largaaaaaaaaaaaaa/app/(tabs)/driver.tsx` | Guards driver screen access and mounts the driver map. |
| `Largaaaaaaaaaaaaa/components/map/driver/drivermapscreen.tsx` | Main driver map UI, terminal picker, start button, trip panel, and stop button. |
| `Largaaaaaaaaaaaaa/components/map/driver/terminal-picker-items.ts` | Builds terminal picker list items. |
| `Largaaaaaaaaaaaaa/components/map/driver/driver-location.ts` | Gets and watches driver GPS location. |
| `Largaaaaaaaaaaaaa/services/live-data/firebase-live-data.ts` | Starts active trip, writes vehicle location, and ends trip. |
| `Largaaaaaaaaaaaaa/lib/domain/transport.ts` | Resolves terminal pairs, active routes, trip state, and freshness rules. |

### How the files are connected

The driver screen reads the live-data snapshot. When the driver selects terminals, it calls `selectDriverTerminals()`. When the driver presses `LARGA`, it calls `startTrip()`. The live-data service validates the route and writes the trip to Firestore.

### Data flow

1. Driver chooses origin and destination.
2. `resolveRouteForTerminals()` checks if there is exactly one active route for that pair.
3. Driver presses `LARGA`.
4. `startTrip()` checks signed-in user and approved driver role.
5. Firestore writes `activeTrips/{driverId}`.
6. Firestore writes initial `vehicleLocations/{driverId}`.
7. Firestore writes a `trip_started` event.
8. Driver map changes into active trip mode.

### Current status

Working.

### Known limitations or missing parts

The driver still manually starts and stops trips. Automatic arrival detection is not complete.

## Feature 6: Driver Live Location Publishing

### Purpose

This feature broadcasts the driver's current GPS location to commuters.

### How it works for the user

After starting a trip, the driver keeps the app open. The app watches the driver's location and updates Firestore. Commuters on the relevant route can see the vehicle if the location is fresh.

### Main files involved

| File | Role |
| --- | --- |
| `Largaaaaaaaaaaaaa/components/map/driver/drivermapscreen.tsx` | Starts the location watcher during an active trip. |
| `Largaaaaaaaaaaaaa/components/map/driver/driver-location.ts` | Reads the driver's current GPS and watches updates. |
| `Largaaaaaaaaaaaaa/services/live-data/firebase-live-data.ts` | Writes latest driver location to Firestore. |
| `Largaaaaaaaaaaaaa/services/contracts/live-data.ts` | Defines `PublishDriverLocationInput` and `VehicleMarker`. |
| `Largaaaaaaaaaaaaa/lib/domain/transport.ts` | Defines the 2-minute vehicle freshness window and location status. |
| `Largaaaaaaaaaaaaa/firestore.rules` | Allows approved drivers to write only their own vehicle location for their active route. |

### How the files are connected

The driver map gets GPS updates from `driver-location.ts`. It calls `publishDriverLocation()` from `LiveDataProvider`. The live-data service writes to `vehicleLocations/{driverId}`.

### Data flow

1. Driver has an active trip.
2. Location watcher receives GPS coordinates.
3. Driver map calls `publishDriverLocation()`.
4. Firestore updates `vehicleLocations/{driverId}`.
5. Live-data service listens to `vehicleLocations`.
6. Fresh vehicle records become visible vehicle markers.

### Current status

Working.

### Known limitations or missing parts

The app hides stale locations after 2 minutes, but product-level off-route warning and in-motion safety warning are not complete.

## Feature 7: Driver Route Guidance and Trip Metrics

### Purpose

This feature helps the driver follow the selected route and see trip status.

### How it works for the user

During an active trip, the driver sees the route line, current vehicle marker, destination marker, speed, remaining distance, ETA, signal status, and guidance messages.

### Main files involved

| File | Role |
| --- | --- |
| `Largaaaaaaaaaaaaa/components/map/driver/drivermapscreen.tsx` | Shows route line, trip panel, metrics, and driver markers. |
| `Largaaaaaaaaaaaaa/lib/domain/driver-route-render.ts` | Builds the render model for main route and reconnect line. |
| `Largaaaaaaaaaaaaa/lib/domain/transport.ts` | Builds driver guidance state, route slicing, ETA, and distance metrics. |
| `Largaaaaaaaaaaaaa/services/live-data/mapbox-guidance.ts` | Requests Mapbox Directions route geometry and reconnect guidance. |
| `Largaaaaaaaaaaaaa/services/live-data/guidance-destination.ts` | Finds the destination coordinate for route guidance. |
| `Largaaaaaaaaaaaaa/services/live-data/trip-start-location.ts` | Decides whether the startup GPS location can be trusted. |
| `Largaaaaaaaaaaaaa/lib/config/mapbox.ts` | Resolves Mapbox render and directions tokens. |

### How the files are connected

The live-data service refreshes guidance when the vehicle moves or drifts from the current guidance. It asks `mapbox-guidance.ts` for a route when possible. If Mapbox guidance fails, it falls back to the stored route geometry.

### Data flow

1. Driver starts a trip.
2. App gets current location.
3. `firebase-live-data.ts` calls guidance helpers.
4. `mapbox-guidance.ts` may request Mapbox Directions.
5. If successful, the app uses live guidance geometry.
6. If not successful, the app uses stored route fallback.
7. Driver map renders route and trip metrics.

### Current status

Partially working.

### Known limitations or missing parts

The app can show fallback guidance and route reconnect lines, but there is no full user-facing off-route warning policy yet. Automatic arrival detection is also missing.

## Feature 8: Driver Trip End and Return Route Preparation

### Purpose

This feature lets the driver stop the active trip and prepare the opposite direction.

### How it works for the user

The driver presses `STOP`. The active trip ends, the vehicle marker is removed, and the terminal pair is reversed so the return route is ready to start after another `LARGA` press.

### Main files involved

| File | Role |
| --- | --- |
| `Largaaaaaaaaaaaaa/components/map/driver/drivermapscreen.tsx` | Shows the stop button and active trip panel. |
| `Largaaaaaaaaaaaaa/services/live-data/firebase-live-data.ts` | Ends trip, deletes live vehicle location, writes trip end event, and reverses selected terminals. |
| `Largaaaaaaaaaaaaa/lib/domain/transport.ts` | Provides `buildReverseDriverSelection()`. |

### How the files are connected

The driver map calls `endTrip()`. The live-data service writes a `trip_ended` event, deletes operational trip data, and builds the reverse terminal selection.

### Data flow

1. Driver presses `STOP`.
2. `endTrip()` checks signed-in driver role.
3. Firestore writes `trip_ended`.
4. Firestore deletes `vehicleLocations/{driverId}`.
5. Firestore deletes `activeTrips/{driverId}`.
6. Local driver selection becomes the reverse terminal pair.

### Current status

Partially working.

### Known limitations or missing parts

The reverse route is prepared, but there is no dedicated confirmation screen or clear return-trip prompt yet.

## Feature 9: Commuter Location and Route Matching

### Purpose

This feature lets the system know where the commuter is waiting so it can find nearby routes.

### How it works for the user

The commuter opens Commuter Mode. The app requests location permission, gets the commuter location, and publishes it as commuter presence. The app then finds nearby supported routes.

### Main files involved

| File | Role |
| --- | --- |
| `Largaaaaaaaaaaaaa/app/(tabs)/commuter.tsx` | Guards commuter access and mounts the commuter map. |
| `Largaaaaaaaaaaaaa/components/map/commuter/commutermapscreen.tsx` | Main commuter map UI and commuter location publishing. |
| `Largaaaaaaaaaaaaa/components/map/shared/device-location.ts` | Requests location permission and watches device GPS. |
| `Largaaaaaaaaaaaaa/services/live-data/firebase-live-data.ts` | Writes commuter presence and route-scoped mirrors. |
| `Largaaaaaaaaaaaaa/lib/domain/commuter-visibility.ts` | Finds nearby routes and builds commuter presence records. |
| `Largaaaaaaaaaaaaa/firestore.rules` | Allows commuters to write only their own presence records. |

### How the files are connected

The commuter map gets GPS from `device-location.ts`. It calls `publishCommuterPresence()` from the live-data provider. The service writes the commuter's location to Firestore and mirrors it per nearby route.

### Data flow

1. Commuter opens commuter map.
2. App requests location permission.
3. App gets GPS location.
4. `publishCommuterPresence()` builds nearby route IDs.
5. Firestore writes `commuterPresence/{uid}`.
6. Firestore writes mirrors under `routeCommuterPresence/{routeId}/commuters/{uid}`.
7. Commuter map shows route context and vehicle visibility.

### Current status

Working for GPS-based commuter presence.

### Known limitations or missing parts

The earlier audit mentions a manual map-center fallback issue. In the current commuter map code checked here, GPS publishing is present, but no actual manual map-center button is visible in the current file.

## Feature 10: Commuter Route-Aware Vehicle Visibility

### Purpose

This feature shows commuters only the vehicles that are relevant to their current route and can still pass their point.

### How it works for the user

The commuter sees bus or jeep markers on the map. The app filters vehicles by nearby route, freshness, and route position. It does not show every vehicle in the system.

### Main files involved

| File | Role |
| --- | --- |
| `Largaaaaaaaaaaaaa/components/map/commuter/commutermapscreen.tsx` | Shows visible vehicle markers and selected vehicle state. |
| `Largaaaaaaaaaaaaa/components/map/RideInfoPanel.tsx` | Shows selected vehicle details, ETA, distance, speed, and fare display. |
| `Largaaaaaaaaaaaaa/lib/domain/commuter-visibility.ts` | Filters vehicles by route, freshness, and whether they can still pass the commuter. |
| `Largaaaaaaaaaaaaa/services/live-data/firebase-live-data.ts` | Listens to vehicle locations and builds commuter-visible vehicle lists. |
| `Largaaaaaaaaaaaaa/components/map/shared/MapMarkerIcon.tsx` | Renders bus, jeep, and commuter marker icons. |

### How the files are connected

The live-data service listens to `vehicleLocations`, filters fresh vehicles, and calculates commuter-visible vehicles. The commuter map receives `snapshot.commuterVisibleVehicles` and renders only those markers. The selected vehicle is passed to `RideInfoPanel`.

### Data flow

1. Driver publishes live vehicle location.
2. Commuter publishes current location.
3. `buildCommuterVisibleVehicles()` checks matching route IDs.
4. It checks whether the vehicle location is fresh.
5. It checks whether the vehicle is still before the commuter on the route.
6. It calculates route distance and ETA.
7. Commuter map shows filtered vehicle markers.
8. Ride info panel shows the selected vehicle details.

### Current status

Working for route-aware visibility and selected vehicle details.

### Known limitations or missing parts

Fare is still not a true origin-to-destination fare computation. The fare shown comes from the vehicle marker's base fare text and a simple normal/discounted toggle.

## Feature 11: Driver-Side Commuter Visibility

### Purpose

This feature lets a driver see waiting commuters that are relevant to the active route segment.

### How it works for the user

During an active trip, the driver map can show commuter markers for commuters waiting on the driver's active route and still ahead on the route.

### Main files involved

| File | Role |
| --- | --- |
| `Largaaaaaaaaaaaaa/components/map/driver/drivermapscreen.tsx` | Renders commuter markers on the driver map. |
| `Largaaaaaaaaaaaaa/services/live-data/firebase-live-data.ts` | Subscribes to `routeCommuterPresence/{routeId}/commuters`. |
| `Largaaaaaaaaaaaaa/lib/domain/commuter-visibility.ts` | Filters commuters by route freshness and route segment. |
| `Largaaaaaaaaaaaaa/firestore.rules` | Allows drivers to read route-scoped commuter presence only for their active route. |

### How the files are connected

When a driver has an active trip, the live-data service subscribes to commuter presence only for that trip route. It then filters commuters using route progress.

### Data flow

1. Driver starts a trip.
2. Live-data service reads the driver's active route ID.
3. Service subscribes to `routeCommuterPresence/{routeId}/commuters`.
4. Stale commuter records are removed from the visible list.
5. Commuters behind the driver's progress are filtered out.
6. Driver map renders relevant commuter markers.

### Current status

Working as a route-scoped visibility foundation.

### Known limitations or missing parts

It shows route-relevant waiting commuters, but it is not a booking, pickup request, or dispatch system.

## Feature 12: Ride Information Panel and Fare Display

### Purpose

This feature gives commuters quick travel information for the selected visible vehicle.

### How it works for the user

The commuter taps a bus or jeep marker. The bottom panel shows the route label, availability, speed, distance, ETA, vehicle count, and estimated fare. The commuter can filter all vehicles, buses, or jeeps.

### Main files involved

| File | Role |
| --- | --- |
| `Largaaaaaaaaaaaaa/components/map/commuter/commutermapscreen.tsx` | Selects the visible vehicle and passes it to the panel. |
| `Largaaaaaaaaaaaaa/components/map/RideInfoPanel.tsx` | Displays selected vehicle details and fare toggle. |
| `Largaaaaaaaaaaaaa/components/map/ride-info-panel.styles.ts` | Styles the ride info panel. |
| `Largaaaaaaaaaaaaa/lib/domain/commuter-visibility.ts` | Provides selected vehicle data such as distance and ETA. |
| `Largaaaaaaaaaaaaa/services/contracts/live-data.ts` | Defines vehicle marker and live data types. |

### How the files are connected

The commuter screen receives filtered vehicles from `LiveDataProvider`. It chooses the selected vehicle by ID, then passes that vehicle object to `RideInfoPanel`.

### Data flow

1. Commuter-visible vehicles are calculated.
2. Commuter taps a marker.
3. `selectedVehicleId` is updated.
4. The matching vehicle is passed into `RideInfoPanel`.
5. Panel formats speed, distance, ETA, and fare.

### Current status

Partially working.

### Known limitations or missing parts

Speed, distance, ETA, route label, and selected vehicle are connected. Fare is still basic and not computed from selected origin and destination. There is no full fare matrix yet.

## Feature 13: Notifications Screen

### Purpose

This feature shows notification-style messages for commuter and driver users.

### How it works for the user

The user opens notifications and sees messages. The app also shows unread badge counts on map screens.

### Main files involved

| File | Role |
| --- | --- |
| `Largaaaaaaaaaaaaa/app/(tabs)/notifications.tsx` | Notification route page. |
| `Largaaaaaaaaaaaaa/components/notifications.tsx` | Notification screen UI. |
| `Largaaaaaaaaaaaaa/components/NotificationCard.tsx` | Individual notification card UI. |
| `Largaaaaaaaaaaaaa/services/fixtures/notifications.ts` | Static commuter and driver notification data. |
| `Largaaaaaaaaaaaaa/components/providers/LiveDataProvider.tsx` | Includes notification fixture data in the snapshot. |

### How the files are connected

The live-data provider includes notifications from fixture data. Notification UI reads the current role's fixture notifications.

### Data flow

1. Fixture notifications are loaded.
2. Live-data snapshot includes commuter and driver notification arrays.
3. Screens count unread fixture items.
4. Notification screen displays the list.

### Current status

Placeholder / UI-only.

### Known limitations or missing parts

There is no real Firestore notification collection, subscription service, or saved mark-as-read behavior.

## Feature 14: Account, Settings, Preferences, FAQs, and About Screens

### Purpose

These screens support basic app navigation and user-facing settings content.

### How it works for the user

The user opens the drawer from the map screen and can view account, preferences, FAQs, about, and related screens.

### Main files involved

| File | Role |
| --- | --- |
| `Largaaaaaaaaaaaaa/components/settings.tsx` | Drawer and settings navigation. |
| `Largaaaaaaaaaaaaa/components/account.tsx` | Account screen UI. |
| `Largaaaaaaaaaaaaa/components/preferences.tsx` | Preferences screen UI. |
| `Largaaaaaaaaaaaaa/components/faqs.tsx` | FAQ content screen. |
| `Largaaaaaaaaaaaaa/components/about.tsx` | About screen. |

### How the files are connected

The driver and commuter map screens open `SettingsDrawer`. The drawer switches between settings-related components.

### Data flow

1. User taps menu on map screen.
2. `SettingsDrawer` opens.
3. User chooses a settings page.
4. The chosen component renders inside the drawer flow.

### Current status

Mostly UI-only.

### Known limitations or missing parts

Account edits do not persist to Firebase. Preferences do not save to Firestore or local persistent storage. Theme and notification settings are not fully connected.

## Feature 15: Firebase Data Model and Security Rules

### Purpose

This feature protects the Firestore data used by the app.

### How it works for the user

The user does not directly see this feature. It controls what data each role can read and write.

### Main files involved

| File | Role |
| --- | --- |
| `Largaaaaaaaaaaaaa/FIREBASE_SCHEMA.md` | Documents the Firestore collections and role rules. |
| `Largaaaaaaaaaaaaa/firestore.rules` | Actual Firestore security rules. |
| `Largaaaaaaaaaaaaa/scripts/rules-smoke.ts` | Emulator smoke tests for rules. |
| `Largaaaaaaaaaaaaa/scripts/rules-smoke.mjs` | JavaScript wrapper for rules smoke testing. |
| `Largaaaaaaaaaaaaa/firebase.json` | Firebase project configuration. |

### How the files are connected

The schema document explains the intended data model. `firestore.rules` enforces role and ownership checks. The smoke test scripts help verify the rules in an emulator.

### Data flow

1. App tries to read or write Firestore data.
2. Firestore rules check sign-in state and role.
3. Rules check ownership and document shape.
4. Valid operations pass.
5. Invalid operations are blocked.

### Current status

Working as a documented and tested rule foundation in the repo.

### Known limitations or missing parts

This guide did not rerun emulator smoke tests or live Firebase checks. `CURRENT_STATE.md` says typecheck and unit tests passed as of 2026-06-07.

## Feature 16: Mapbox Map Configuration

### Purpose

This feature provides the map view used by commuter and driver workflows.

### How it works for the user

The map opens centered around the Santa Maria/Bulacan area. It shows commuter, vehicle, terminal, route, and destination markers depending on the screen.

### Main files involved

| File | Role |
| --- | --- |
| `Largaaaaaaaaaaaaa/lib/config/mapbox.ts` | Resolves Mapbox render and directions tokens. |
| `Largaaaaaaaaaaaaa/components/map/shared/mapbox.utils.ts` | Loads the Mapbox native module, sets the token, and defines map style, bounds, zoom, and icons. |
| `Largaaaaaaaaaaaaa/components/map/shared/MapFallback.tsx` | Shows fallback UI when Mapbox cannot load. |
| `Largaaaaaaaaaaaaa/components/map/shared/MapMarkerIcon.tsx` | Shows custom icons for bus, jeep, and commuter markers. |
| `Largaaaaaaaaaaaaa/assets/images/` | Contains marker and app image assets. |

### How the files are connected

Map screens call `getMapbox()` and `ensureMapboxConfigured()`. If Mapbox is ready, the screens render `Mapbox.MapView`. If not, they render `MapFallback`.

### Data flow

1. Map screen opens.
2. App loads the Mapbox native module.
3. App sets the Mapbox token.
4. App renders map view.
5. Route, vehicle, commuter, and destination data are rendered as overlays.

### Current status

Working when Mapbox native module and token are available.

### Known limitations or missing parts

If the native build does not include Mapbox correctly, the map fallback screen appears. Live device validation was not rerun in this guide.

## Main Process Flow for Presentation

### Commuter Flow

1. Commuter logs in.
2. App checks approved commuter role.
3. Commuter map opens.
4. App requests GPS permission.
5. App publishes commuter presence.
6. App finds nearby routes.
7. App reads live vehicle locations.
8. App filters vehicles by route and position.
9. Commuter sees vehicles that can still pass their point.
10. Commuter taps a marker to see ETA, distance, speed, route, and fare display.

### Driver Flow

1. Driver logs in.
2. App checks approved driver role.
3. Driver map opens.
4. Driver selects origin and destination terminals.
5. App resolves the stored route.
6. Driver presses `LARGA`.
7. App creates an active trip.
8. App writes live vehicle location.
9. Driver sees route guidance, speed, distance, ETA, and destination.
10. Commuters on the route can see the vehicle if it can still pass them.
11. Driver presses `STOP`.
12. App ends trip, removes vehicle location, writes trip event, and prepares reverse direction.

### Admin Flow

1. Admin logs in.
2. App checks approved admin role.
3. Admin opens verification queue.
4. Admin reviews driver applications.
5. Admin approves, rejects, or requests update.
6. If approved, driver role is added to the applicant's approved roles.

## Overall Current Status

| Area | Status |
| --- | --- |
| Firebase login and registration | Working |
| Multi-role user model | Working |
| Driver application creation | Working |
| Admin driver approval | Working |
| Route and terminal seed foundation | Working |
| Driver terminal selection | Working |
| Driver active trip start and stop | Working |
| Driver live location publishing | Working |
| Commuter GPS presence | Working |
| Route-aware commuter vehicle visibility | Working |
| Driver route-scoped commuter visibility | Working |
| Driver guidance and route metrics | Partial |
| Ride information panel | Partial |
| Fare computation | Needs fixing |
| Notifications | Placeholder / UI-only |
| Account editing | Placeholder / UI-only |
| Preferences | Placeholder / UI-only |
| Automatic arrival detection | Not implemented |
| Off-route warning policy | Partial |
| In-motion safety warning | Not implemented |
| In-app route management | Not implemented |
| Production release validation | Not complete |

## Simple Talking Points for Professor

1. LARGA already has a working Firebase-backed foundation, not only static screens.
2. The app supports commuter, driver, and admin roles.
3. Driver access is protected by an admin approval process.
4. Routes and terminals are stored as shared operational data, so commuter and driver flows use the same route truth.
5. Drivers can start one active trip, publish live GPS, and end the trip.
6. Commuters can publish their location and only see vehicles relevant to their route.
7. The app filters vehicles so commuters do not see every vehicle in the system.
8. The map is the main workspace for both commuter and driver users.
9. The current MVP foundation is strong, but some user-facing features still need completion.
10. The biggest next steps are real fare computation, better ride details, real notifications, profile persistence, arrival detection, and stronger device/live Firebase validation.

## Recommended Next Work

1. Implement real fare computation using route, origin, destination, and discount type.
2. Finish arrival detection and return-trip confirmation.
3. Add a clear off-route warning state.
4. Add in-motion safety warning for drivers.
5. Replace notification fixtures with real Firestore notifications or remove placeholder claims.
6. Connect account and preference screens to persistent data.
7. Run emulator rule tests and live Firebase seed checks before claiming production readiness.
8. Validate the full trip flow on a real Android device.
