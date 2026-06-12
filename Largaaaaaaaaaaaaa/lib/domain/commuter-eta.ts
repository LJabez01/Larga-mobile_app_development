export interface CommuterEtaSpeedSample {
  readonly recordedAtMs: number;
  readonly speedKph: number;
}

export interface CommuterEtaState {
  readonly recentMovingSamples: readonly CommuterEtaSpeedSample[];
  readonly lastObservationRecordedAtMs: number | null;
  readonly heldEtaMinutes: number | null;
  readonly isStopHoldActive: boolean;
}

export interface ResolveStopAwareEtaInput {
  readonly distanceMeters: number;
  readonly speedKph: number | null;
  readonly recordedAt: string;
  readonly previousState?: CommuterEtaState | null;
}

export interface ResolveStopAwareEtaResult {
  readonly etaMinutes: number | null;
  readonly effectiveSpeedKph: number | null;
  readonly mode: 'live' | 'rolling_average' | 'held' | 'unavailable';
  readonly state: CommuterEtaState;
}

export const COMMUTER_ETA_MOVING_SPEED_THRESHOLD_KPH = 5;
export const COMMUTER_ETA_ROLLING_WINDOW_MS = 90 * 1000;

export function createEmptyCommuterEtaState(): CommuterEtaState {
  return {
    recentMovingSamples: [],
    lastObservationRecordedAtMs: null,
    heldEtaMinutes: null,
    isStopHoldActive: false,
  };
}

function parseTimestampMs(value: string) {
  const timestampMs = Date.parse(value);

  return Number.isFinite(timestampMs) ? timestampMs : null;
}

function isUsableMovingSpeed(speedKph: number | null): speedKph is number {
  return typeof speedKph === 'number'
    && Number.isFinite(speedKph)
    && speedKph >= COMMUTER_ETA_MOVING_SPEED_THRESHOLD_KPH;
}

function pruneRecentMovingSamples(
  samples: readonly CommuterEtaSpeedSample[],
  referenceTimeMs: number | null,
) {
  if (referenceTimeMs === null) {
    return [...samples];
  }

  return samples.filter((sample) => (
    referenceTimeMs - sample.recordedAtMs <= COMMUTER_ETA_ROLLING_WINDOW_MS
  ));
}

function computeRollingAverageSpeedKph(
  samples: readonly CommuterEtaSpeedSample[],
) {
  if (samples.length === 0) {
    return null;
  }

  const totalSpeedKph = samples.reduce((sum, sample) => sum + sample.speedKph, 0);

  return totalSpeedKph / samples.length;
}

function computeEtaMinutes(distanceMeters: number, speedKph: number | null) {
  if (
    typeof speedKph !== 'number'
    || !Number.isFinite(speedKph)
    || speedKph < COMMUTER_ETA_MOVING_SPEED_THRESHOLD_KPH
    || !Number.isFinite(distanceMeters)
    || distanceMeters <= 0
  ) {
    return null;
  }

  return Math.max(1, Math.ceil((distanceMeters / 1000) / speedKph * 60));
}

export function resolveStopAwareEta({
  distanceMeters,
  speedKph,
  recordedAt,
  previousState = null,
}: ResolveStopAwareEtaInput): ResolveStopAwareEtaResult {
  const safePreviousState = previousState ?? createEmptyCommuterEtaState();
  const recordedAtMs = parseTimestampMs(recordedAt);
  const referenceTimeMs = recordedAtMs ?? safePreviousState.lastObservationRecordedAtMs;
  const prunedSamples = pruneRecentMovingSamples(
    safePreviousState.recentMovingSamples,
    referenceTimeMs,
  );

  if (isUsableMovingSpeed(speedKph)) {
    const currentSpeedKph: number = speedKph;
    const hasNewObservation = recordedAtMs !== null
      && recordedAtMs !== safePreviousState.lastObservationRecordedAtMs;
    const nextSamples: CommuterEtaSpeedSample[] = hasNewObservation && recordedAtMs !== null
      ? [...prunedSamples, { recordedAtMs, speedKph: currentSpeedKph }]
      : [...prunedSamples];
    const rollingAverageSpeedKph = computeRollingAverageSpeedKph(nextSamples);
    const effectiveSpeedKph = rollingAverageSpeedKph ?? currentSpeedKph;
    const etaMinutes = computeEtaMinutes(distanceMeters, effectiveSpeedKph);

    return {
      etaMinutes,
      effectiveSpeedKph,
      mode: rollingAverageSpeedKph !== null && nextSamples.length > 1
        ? 'rolling_average'
        : 'live',
      state: {
        recentMovingSamples: nextSamples,
        lastObservationRecordedAtMs: referenceTimeMs,
        heldEtaMinutes: etaMinutes,
        isStopHoldActive: false,
      },
    };
  }

  const rollingAverageSpeedKph = computeRollingAverageSpeedKph(prunedSamples);

  if (typeof speedKph === 'number' && Number.isFinite(speedKph)) {
    const heldEtaMinutes = safePreviousState.isStopHoldActive
      ? safePreviousState.heldEtaMinutes
      : (safePreviousState.heldEtaMinutes ?? computeEtaMinutes(distanceMeters, rollingAverageSpeedKph));

    return {
      etaMinutes: heldEtaMinutes,
      effectiveSpeedKph: rollingAverageSpeedKph,
      mode: heldEtaMinutes === null ? 'unavailable' : 'held',
      state: {
        recentMovingSamples: prunedSamples,
        lastObservationRecordedAtMs: referenceTimeMs,
        heldEtaMinutes,
        isStopHoldActive: heldEtaMinutes !== null,
      },
    };
  }

  if (safePreviousState.isStopHoldActive && safePreviousState.heldEtaMinutes !== null) {
    return {
      etaMinutes: safePreviousState.heldEtaMinutes,
      effectiveSpeedKph: rollingAverageSpeedKph,
      mode: 'held',
      state: {
        recentMovingSamples: prunedSamples,
        lastObservationRecordedAtMs: referenceTimeMs,
        heldEtaMinutes: safePreviousState.heldEtaMinutes,
        isStopHoldActive: true,
      },
    };
  }

  const etaMinutes = computeEtaMinutes(distanceMeters, rollingAverageSpeedKph);

  return {
    etaMinutes,
    effectiveSpeedKph: rollingAverageSpeedKph,
    mode: etaMinutes === null ? 'unavailable' : 'rolling_average',
    state: {
      recentMovingSamples: prunedSamples,
      lastObservationRecordedAtMs: referenceTimeMs,
      heldEtaMinutes: etaMinutes,
      isStopHoldActive: false,
    },
  };
}
