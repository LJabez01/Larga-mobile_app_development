// Seed Validation Helpers - checks coded terminal and route seed data before syncing.
import type { RouteRecord, TerminalRecord } from '@/lib/domain/routes';

export function validateSeedData(input: {
  terminals: ReadonlyArray<TerminalRecord>;
  routes: ReadonlyArray<RouteRecord>;
}) {
  const terminalIds = new Set(input.terminals.map((terminal) => terminal.id));
  const errors: string[] = [];

  for (const route of input.routes) {
    if (!terminalIds.has(route.originTerminalId)) {
      errors.push(`Unknown origin terminal: ${route.originTerminalId}`);
    }

    if (!terminalIds.has(route.destinationTerminalId)) {
      errors.push(`Unknown destination terminal: ${route.destinationTerminalId}`);
    }

    if (route.coordinates.length < 2) {
      errors.push(`Route ${route.id} must have at least two coordinates`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    terminalCount: input.terminals.length,
    routeCount: input.routes.length,
  };
}
