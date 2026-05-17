# LARGA Mobile App Development

## Overview
LARGA is a real-time mobile transportation tracking system for commuters and public utility vehicle drivers in Santa Maria, Bulacan.

The product is built around a map-first mobile experience:
- commuters can see route-relevant vehicles near their location
- drivers can start a route-bound trip and publish live location
- the system uses route-aware filtering instead of showing every vehicle to every user

## Current state
The repository is currently in an early foundation stage.

What already exists:
- Expo Router mobile app scaffold
- Mapbox-based map screen foundation
- Firebase app initialization
- initial Firestore rules and schema notes
- approved commuter-side and driver-side feature design drafts
- root planning documents for execution and constraints

Current implementation priority:
- backend and route-data foundation first
- role-safe Firebase data model
- stored route records as the route source of truth
- driver trip lifecycle and live location publishing
- commuter route-aware vehicle filtering

## Tech stack
- React Native with Expo
- Expo Router
- Mapbox via `@rnmapbox/maps`
- Firebase Authentication
- Cloud Firestore
- TypeScript

## Repository structure
```text
Larga-mobile_app_development/
├── PRD.md
├── PLAN.md
├── TASKS.md
├── CONSTRAINTS.md
├── IMPLEMENTATION.md
├── README.md
└── Largaaaaaaaaaaaaa/
    ├── app/
    ├── components/
    ├── assets/
    ├── firebase.ts
    ├── firebase.json
    ├── firestore.rules
    ├── FIREBASE_SCHEMA.md
    └── docs/superpowers/specs/
```

Note:
- the actual Expo app currently lives inside `Largaaaaaaaaaaaaa/`

## Key planning documents
- [PRD.md](/C:/Users/Carl%20Lester/OneDrive/Documents/GitHub/Larga-mobile_app_development/PRD.md)
- [PLAN.md](/C:/Users/Carl%20Lester/OneDrive/Documents/GitHub/Larga-mobile_app_development/PLAN.md)
- [TASKS.md](/C:/Users/Carl%20Lester/OneDrive/Documents/GitHub/Larga-mobile_app_development/TASKS.md)
- [CONSTRAINTS.md](/C:/Users/Carl%20Lester/OneDrive/Documents/GitHub/Larga-mobile_app_development/CONSTRAINTS.md)
- [IMPLEMENTATION.md](/C:/Users/Carl%20Lester/OneDrive/Documents/GitHub/Larga-mobile_app_development/IMPLEMENTATION.md)

Feature design references:
- [Commuter Feature Design](/C:/Users/Carl%20Lester/OneDrive/Documents/GitHub/Larga-mobile_app_development/Largaaaaaaaaaaaaa/docs/superpowers/specs/2026-05-03-commuter-feature-design.md)
- [Driver Feature Design](/C:/Users/Carl%20Lester/OneDrive/Documents/GitHub/Larga-mobile_app_development/Largaaaaaaaaaaaaa/docs/superpowers/specs/2026-05-03-driver-feature-design.md)

## MVP role model
The current role model is intentionally strict:
- `commuter`
- `driver`
- `admin`

Rules:
- one account has one role only
- public signup should create `commuter` accounts only
- `driver` and `admin` must be assigned through a trusted path

## Route model direction
The current system direction is:
- stored route records are the source of truth
- route branches are represented as separate route records in MVP
- route polyline/path geometry is required for commuter and driver matching logic

This keeps commuter filtering, driver trip guidance, and future admin management aligned to one shared route model.

## Firebase notes
Firebase has already been introduced into the app workspace.

Current supporting files:
- [firebase.ts](/C:/Users/Carl%20Lester/OneDrive/Documents/GitHub/Larga-mobile_app_development/Largaaaaaaaaaaaaa/firebase.ts)
- [firebase.json](/C:/Users/Carl%20Lester/OneDrive/Documents/GitHub/Larga-mobile_app_development/Largaaaaaaaaaaaaa/firebase.json)
- [firestore.rules](/C:/Users/Carl%20Lester/OneDrive/Documents/GitHub/Larga-mobile_app_development/Largaaaaaaaaaaaaa/firestore.rules)
- [FIREBASE_SCHEMA.md](/C:/Users/Carl%20Lester/OneDrive/Documents/GitHub/Larga-mobile_app_development/Largaaaaaaaaaaaaa/FIREBASE_SCHEMA.md)

The current project direction is free-first where possible, so the MVP should avoid unnecessary dependence on paid-only Firebase features.

Current Firebase foundation assumptions:
- public signup creates only `commuter` users
- `driver` and `admin` promotion happens only through a trusted operator path
- the one-active-trip-per-driver MVP guard is enforced by storing each driver's active trip at `activeTrips/{driverId}`

Firebase foundation workflow from the app workspace:

```powershell
npm run seed:foundation:dry
npm run seed:foundation
npx -y firebase-tools@latest emulators:exec --only auth,firestore "node scripts/rules-smoke.mjs"
```

## Local setup
From the Expo app directory:

```powershell
cd "C:\Users\Carl Lester\OneDrive\Documents\GitHub\Larga-mobile_app_development\Largaaaaaaaaaaaaa"
npm install
npx.cmd expo start
```

Useful scripts:
```powershell
npx.cmd expo start
npx.cmd expo start --android
npx.cmd expo start --ios
npx.cmd expo start --web
```

## Environment configuration
The Expo app expects Firebase config in:

`Largaaaaaaaaaaaaa/.env.local`

Using:
```env
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

App mode is now determined by version-controlled runtime defaults instead of relying on each teammate's private `.env.local`:
- development builds default to `mock`
- production builds default to `firebase`
- `EXPO_PUBLIC_APP_MODE` is now only an optional override when someone intentionally needs a different mode

## Current priorities
1. Finalize route and terminal data model.
2. Finalize Firestore collection and rule strategy.
3. Implement first-sign-in user document creation.
4. Implement one-active-trip-per-driver flow.
5. Implement driver live location publishing.
6. Implement commuter route-aware vehicle filtering and ETA.

## Non-goals for the current MVP cycle
- ticketing and digital payments
- dispatch dashboards
- fake traffic overlays
- broad predictive analytics
- complex admin analytics implementation
- multi-city expansion

## Status reminder
This project is not feature-complete yet. The current repository contains planning, Firebase setup, and an early mobile shell. The main system behavior still needs to be implemented on top of the approved route, role, commuter, and driver design decisions.
