import type { RouteCoordinate, RouteRecord, TerminalOption } from '@/lib/domain/transport';

// Destination Coordinate Resolver - prefers route geometry endpoint before falling back to terminal coordinates.
export function getDestinationRouteCoordinate(
  route: RouteRecord,
  terminals: TerminalOption[],
): RouteCoordinate | null {
  const routeDestinationCoordinate = route.coordinates[route.coordinates.length - 1];

  if (routeDestinationCoordinate) {
    return routeDestinationCoordinate;
  }

  const destinationTerminal = terminals.find((terminal) => terminal.id === route.destinationTerminalId);

  return destinationTerminal?.coordinate ?? null;
}
