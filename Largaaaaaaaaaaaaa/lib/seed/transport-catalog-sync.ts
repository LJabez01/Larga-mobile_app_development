import fs from 'node:fs';
import path from 'node:path';

import { serializeRouteCoordinates } from '@/lib/domain/transport';
import { ROUTE_SEED, TERMINAL_SEED } from '@/lib/seed/transport-catalog';

export interface TransportSeedDocument<T> {
  id: string;
  data: T;
}

export interface TransportSeedPayload {
  terminals: TransportSeedDocument<(typeof TERMINAL_SEED)[number]>[];
  routes: TransportSeedDocument<Record<string, unknown>>[];
}

export interface TransportSeedConfig {
  apply: boolean;
  envFilePath: string;
  projectId: string;
  serviceAccountPath: string | null;
  usesEmulator: boolean;
}

type EnvSource = Record<string, string | undefined>;

function stripWrappingQuotes(value: string) {
  if (
    (value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

export function parseEnvFileContents(contents: string) {
  const entries = contents.split(/\r?\n/);
  const values: Record<string, string> = {};

  entries.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex < 1) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = stripWrappingQuotes(trimmed.slice(separatorIndex + 1).trim());

    if (key) {
      values[key] = value;
    }
  });

  return values;
}

export function loadOptionalEnvFile(envFilePath: string) {
  if (!fs.existsSync(envFilePath)) {
    return {};
  }

  return parseEnvFileContents(fs.readFileSync(envFilePath, 'utf8'));
}

function loadSeedEnvSources(primaryEnvFilePath: string, cwd: string) {
  const sources: EnvSource[] = [];

  if (primaryEnvFilePath !== path.resolve(cwd, '.env.local')) {
    sources.push(loadOptionalEnvFile(path.resolve(cwd, '.env.local')));
  }

  sources.push(loadOptionalEnvFile(primaryEnvFilePath));

  return sources;
}

export function buildTransportSeedPayload(): TransportSeedPayload {
  return {
    terminals: TERMINAL_SEED.map((terminal) => ({
      id: terminal.id,
      data: {
        ...terminal,
        coordinate: [...terminal.coordinate] as [number, number],
      },
    })),
    routes: ROUTE_SEED.map((route) => ({
      id: route.id,
      data: {
        ...route,
        coordinates: serializeRouteCoordinates(route.coordinates),
      },
    })),
  };
}

function parseArgs(args: string[]) {
  let apply = false;
  let envFilePath: string | null = null;
  let projectId: string | null = null;

  args.forEach((arg) => {
    if (arg === '--apply') {
      apply = true;
      return;
    }

    if (arg.startsWith('--env-file=')) {
      envFilePath = arg.slice('--env-file='.length);
      return;
    }

    if (arg.startsWith('--project=')) {
      projectId = arg.slice('--project='.length);
    }
  });

  return {
    apply,
    envFilePath,
    projectId,
  };
}

export function resolveTransportSeedConfig(args: string[], cwd: string, baseEnv: EnvSource = process.env): TransportSeedConfig {
  const parsedArgs = parseArgs(args);
  const envFilePath = parsedArgs.envFilePath
    ? path.resolve(cwd, parsedArgs.envFilePath)
    : path.resolve(cwd, '.env.seed.local');
  const combinedEnv = loadSeedEnvSources(envFilePath, cwd).reduce<EnvSource>(
    (merged, source) => ({
      ...merged,
      ...source,
    }),
    {
      ...baseEnv,
    },
  );

  const projectId = parsedArgs.projectId
    || combinedEnv.FIREBASE_PROJECT_ID
    || combinedEnv.GCLOUD_PROJECT
    || combinedEnv.EXPO_PUBLIC_FIREBASE_PROJECT_ID
    || '';
  const usesEmulator = Boolean(combinedEnv.FIRESTORE_EMULATOR_HOST);
  const serviceAccountPath = combinedEnv.FIREBASE_SERVICE_ACCOUNT_PATH
    || combinedEnv.GOOGLE_APPLICATION_CREDENTIALS
    || null;

  if (!projectId) {
    throw new Error(
      'Missing Firebase project ID. Set FIREBASE_PROJECT_ID in .env.seed.local, EXPO_PUBLIC_FIREBASE_PROJECT_ID in .env.local, or pass --project=<id>.',
    );
  }

  if (parsedArgs.apply && !usesEmulator) {
    if (!serviceAccountPath) {
      throw new Error(
        'Missing service-account credentials for real-project seeding. Set FIREBASE_SERVICE_ACCOUNT_PATH or GOOGLE_APPLICATION_CREDENTIALS in .env.seed.local.',
      );
    }

    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error(`Service-account file not found: ${serviceAccountPath}`);
    }
  }

  return {
    apply: parsedArgs.apply,
    envFilePath,
    projectId,
    serviceAccountPath,
    usesEmulator,
  };
}
