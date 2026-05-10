import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { validateSeedData } from '../lib/seed/validateSeedData.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const appEnvPath = path.join(projectRoot, '.env.local');
const terminalsPath = path.join(projectRoot, 'lib', 'seed', 'terminals.json');
const routesPath = path.join(projectRoot, 'lib', 'seed', 'routes.json');
const dryRun = process.argv.includes('--dry-run');

function readEnvFile(filePath) {
  return Object.fromEntries(
    fs
      .readFileSync(filePath, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => line.split('='))
  );
}

const terminals = JSON.parse(fs.readFileSync(terminalsPath, 'utf8'));
const routes = JSON.parse(fs.readFileSync(routesPath, 'utf8'));
const validation = validateSeedData({ terminals, routes });

if (!validation.ok) {
  throw new Error(validation.errors.join('\n'));
}

if (dryRun) {
  console.log(`Validated ${terminals.length} terminals and ${routes.length} routes.`);
  process.exit(0);
}

const env = readEnvFile(appEnvPath);
const firebaseConfig = {
  apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

for (const terminal of terminals) {
  await setDoc(doc(db, 'terminals', terminal.id), terminal);
}

for (const route of routes) {
  await setDoc(doc(db, 'routes', route.id), route);
}

console.log(`Seeded ${terminals.length} terminals and ${routes.length} routes.`);
