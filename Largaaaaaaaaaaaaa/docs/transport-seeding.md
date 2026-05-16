# Transport Seeding Workflow

## Purpose
This workflow makes terminals and routes code-owned in the repo, then syncs them into Firestore safely. Do not treat Firebase Console as the long-term source of truth for route and terminal data.

## Source of truth
- Edit transport data in [transport-catalog.ts](</C:/Users/Carl Lester/OneDrive/Documents/GitHub/Larga-mobile_app_development/Largaaaaaaaaaaaaa/lib/seed/transport-catalog.ts>)
- Run the seed script to preview or apply those changes to Firestore

## Local setup
1. Copy [.env.seed.example](</C:/Users/Carl Lester/OneDrive/Documents/GitHub/Larga-mobile_app_development/Largaaaaaaaaaaaaa/.env.seed.example>) to `.env.seed.local`
2. Set:
   - `FIREBASE_SERVICE_ACCOUNT_PATH`
   - optionally `FIREBASE_PROJECT_ID` if you want to override the app project ID
3. The script will automatically reuse `EXPO_PUBLIC_FIREBASE_PROJECT_ID` from [`.env.local`](</C:/Users/Carl Lester/OneDrive/Documents/GitHub/Larga-mobile_app_development/Largaaaaaaaaaaaaa/.env.local>) for dry-run and apply target resolution.
4. Keep `.env.seed.local` local only. It is gitignored.

## Commands
Preview what would be written:

```powershell
cd "C:\Users\Carl Lester\OneDrive\Documents\GitHub\Larga-mobile_app_development\Largaaaaaaaaaaaaa"
npm.cmd run seed:transport
```

Apply to the configured real Firebase project:

```powershell
cd "C:\Users\Carl Lester\OneDrive\Documents\GitHub\Larga-mobile_app_development\Largaaaaaaaaaaaaa"
npm.cmd run seed:transport:apply
```

Apply to the emulator instead:

```powershell
$env:FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
$env:FIREBASE_PROJECT_ID="demo-no-project"
npm.cmd run seed:transport:apply
```

## How to add a new terminal or route
1. Edit [transport-catalog.ts](</C:/Users/Carl Lester/OneDrive/Documents/GitHub/Larga-mobile_app_development/Largaaaaaaaaaaaaa/lib/seed/transport-catalog.ts>)
2. Run `npm.cmd run test`
3. Run `npm.cmd run seed:transport`
4. Review the dry-run output
5. Run `npm.cmd run seed:transport:apply`

## Safety rules
- The seed script defaults to dry-run
- Real-project apply requires an explicit local service-account path
- Dry-run can work from the existing app Firebase project ID in `.env.local`
- Route coordinates are serialized into Firestore-safe objects automatically
- Runtime app code still reads terminals/routes from Firestore, not from screen-local fixtures
