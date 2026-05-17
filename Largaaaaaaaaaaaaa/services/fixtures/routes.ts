// Route Fixtures - provide mock terminals and routes from the coded transport catalog.
import { ROUTE_SEED, TERMINAL_SEED } from '@/lib/seed/transport-catalog';

export const TERMINAL_FIXTURES = TERMINAL_SEED.map((terminal) => ({ ...terminal }));

export const ROUTE_FIXTURES = ROUTE_SEED.map((route) => ({
  ...route,
  coordinates: route.coordinates.map((coordinate) => [...coordinate] as [number, number]),
}));
