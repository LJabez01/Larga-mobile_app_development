# 2026-05-10 Route/Role Foundation Plan

## Goal
Complete the first real backend foundation slice for LARGA so later driver and commuter logic can run on a consistent route, role, and auth model.

## Scope
- Canonical `routes` and `terminals`
- Commuter-only public signup
- First-sign-in `users/{uid}` creation
- Firebase-backed auth services
- Auth-aware routing into `/commuter` or `/driver`

## Task 1: Domain Foundation
Status: completed

Files:
- `Largaaaaaaaaaaaaa/lib/domain/auth.ts`
- `Largaaaaaaaaaaaaa/lib/domain/routes.ts`
- `Largaaaaaaaaaaaaa/lib/domain/users.ts`
- `Largaaaaaaaaaaaaa/lib/domain/__tests__/auth.test.ts`
- `Largaaaaaaaaaaaaa/lib/domain/__tests__/routes.test.ts`
- `Largaaaaaaaaaaaaa/package.json`
- `Largaaaaaaaaaaaaa/tsconfig.json`

Checkpoint:
- Shared route and role helpers are typed and covered by tests.
- Local `npm run test` and `npm run typecheck` support exists for the foundation slice.

## Task 2: Seed Data Foundation
Status: completed

Files:
- `Largaaaaaaaaaaaaa/lib/seed/routes.json`
- `Largaaaaaaaaaaaaa/lib/seed/terminals.json`
- `Largaaaaaaaaaaaaa/lib/seed/validateSeedData.ts`
- `Largaaaaaaaaaaaaa/lib/seed/__tests__/validateSeedData.test.ts`
- `Largaaaaaaaaaaaaa/scripts/seed-foundation.mjs`

Checkpoint:
- Canonical route and terminal records validate locally.
- Dry-run and write-ready seed workflows exist.

## Task 3: Firestore Rule Foundation
Status: completed

Files:
- `Largaaaaaaaaaaaaa/firestore.rules`
- `Largaaaaaaaaaaaaa/FIREBASE_SCHEMA.md`
- `Largaaaaaaaaaaaaa/scripts/rules-smoke.mjs`
- `README.md`

Checkpoint:
- Public client user creation is limited to `commuter`.
- `routes` and `terminals` are typed and admin-managed.
- Driver writes are bound to the driver's active trip and route.
- Auth/Firestore emulator smoke checks pass.

## Task 4: Auth and User Bootstrap
Status: pending

Files:
- `Largaaaaaaaaaaaaa/services/auth.ts`
- `Largaaaaaaaaaaaaa/services/users.ts`
- `Largaaaaaaaaaaaaa/services/__tests__/*`
- `Largaaaaaaaaaaaaa/firebase.ts`

Implementation:
1. Add a typed Firebase auth service for sign-in, commuter sign-up, forgot-password, and sign-out.
2. Add a user bootstrap path that creates `users/{uid}` on first sign-in when missing.
3. Keep bootstrap role fixed to `commuter` for self-service signup.
4. Keep service return values small and app-friendly.

Checkpoint:
- Login, signup, and forgot-password can call real Firebase services.
- First successful commuter sign-in guarantees a matching `users/{uid}` document.

## Task 5: Auth-Aware App Routing
Status: pending

Files:
- `Largaaaaaaaaaaaaa/app/_layout.tsx`
- `Largaaaaaaaaaaaaa/app/index.tsx`
- `Largaaaaaaaaaaaaa/app/(tabs)/login.tsx`
- `Largaaaaaaaaaaaaa/app/(tabs)/registration.tsx`
- `Largaaaaaaaaaaaaa/app/(tabs)/forgot-password.tsx`
- `Largaaaaaaaaaaaaa/components/Guideline.tsx`
- `Largaaaaaaaaaaaaa/app/(tabs)/guideline.tsx`

Implementation:
1. Add session bootstrap and auth-state listening near the app root.
2. Route signed-out users to `/login`.
3. Route signed-in users by stored role into `/commuter` or `/driver`.
4. Stop hardcoding mock navigation from login, registration, and guideline flows.

Checkpoint:
- App launch respects real auth state.
- Commuter signup stays self-service.
- Driver and commuter land on role-correct screens once signed in.

## Verification Sequence
1. `npm run test`
2. `npm run typecheck`
3. `npx -y firebase-tools@latest emulators:exec --only auth,firestore "node scripts/rules-smoke.mjs"`

## Out of Scope for This Plan
- Driver trip start/stop UI
- Live GPS publishing
- Route-aware commuter filtering
- ETA and fare algorithms
