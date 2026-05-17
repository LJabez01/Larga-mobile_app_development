// Route Domain Helpers - parses stored route records into UI-safe route data.
export type VehicleType = 'jeepney' | 'bus';

export interface TerminalRecord {
  readonly id: string;
  readonly name: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface RouteRecord {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly vehicleType: VehicleType;
  readonly originTerminalId: string;
  readonly destinationTerminalId: string;
  readonly directionKey: string;
  readonly coordinates: ReadonlyArray<readonly [number, number]>;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function buildDirectionKey(
  originTerminalId: string,
  destinationTerminalId: string
): string {
  return `${originTerminalId}__${destinationTerminalId}`;
}

export function buildRouteId(
  vehicleType: VehicleType,
  originTerminalId: string,
  destinationTerminalId: string
): string {
  return `${vehicleType}__${buildDirectionKey(originTerminalId, destinationTerminalId)}`;
}

export function isVehicleTypeSupported(value: string): value is VehicleType {
  return value === 'jeepney' || value === 'bus';
}
