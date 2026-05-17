// Vehicle Fixtures - provide mock vehicle markers for route-based demo trips.
import type { VehicleMarker } from '@/services/contracts/live-data';

export const VEHICLE_FIXTURES: Record<string, VehicleMarker> = {
  'sta-maria-bayan-norzagaray': {
    id: 'vehicle-jeep-001',
    type: 'jeep',
    coordinate: [121.0188, 14.8862],
    routeId: 'sta-maria-bayan-norzagaray',
    routeLabel: 'Sta. Maria Bayan - Norzagaray',
    fare: '15',
    speed: '18 KM / Hour',
    distance: '25 KM',
    eta: '15 Minutes',
  },
  'sta-maria-bayan-halang': {
    id: 'vehicle-bus-001',
    type: 'bus',
    coordinate: [120.9914, 14.8415],
    routeId: 'sta-maria-bayan-halang',
    routeLabel: 'Sta. Maria Bayan - Halang',
    fare: '13',
    speed: '12 KM / Hour',
    distance: '20 KM',
    eta: '10 Minutes',
  },
  'sta-maria-bayan-san-jose': {
    id: 'vehicle-bus-002',
    type: 'bus',
    coordinate: [121.0013, 14.8606],
    routeId: 'sta-maria-bayan-san-jose',
    routeLabel: 'Sta. Maria Bayan - San Jose',
    fare: '16',
    speed: '14 KM / Hour',
    distance: '18 KM',
    eta: '9 Minutes',
  },
};
