import assert from 'node:assert/strict';
import test from 'node:test';

import { buildTerminalPickerItems } from '@/components/map/driver/terminal-picker-items';
import type { TerminalOption } from '@/lib/domain/transport';
import type { TransportLocationSeed } from '@/lib/seed/transport-location-inventory';

const inventoryTerminal: TransportLocationSeed = {
  id: 'candidate-sta-maria',
  label: 'Sta. Maria Candidate',
  classification: 'operational-terminal-candidate',
  endpointReady: false,
  isActive: true,
  vehicleServices: ['jeep'],
  approximateCoordinate: [120.95, 14.82],
  recommendedMapboxQuery: 'Sta. Maria Candidate, Santa Maria, Bulacan, Philippines',
  coordinatePrecision: 'needs_field_validation',
  confidence: 'likely',
  notes: 'Candidate terminal alias.',
  sourceLabel: 'Test source',
  sourceUrl: 'internal://test',
  linkedTerminalId: 'sta-maria-bayan',
};

const visibleTerminal: TerminalOption = {
  id: 'sta-maria-bayan',
  label: 'Sta. Maria Bayan Terminal',
  coordinate: [120.95, 14.82],
  isActive: true,
};

test('buildTerminalPickerItems keeps inventory-backed selectable terminals visible even when there are no direct terminal rows', () => {
  const items = buildTerminalPickerItems({
    referencePickerLocations: [],
    selectableInventoryLocations: [inventoryTerminal],
    visibleTerminals: [],
  });

  assert.deepEqual(
    items.map((item) => item.kind),
    ['section', 'inventory-terminal'],
  );
});

test('buildTerminalPickerItems includes both selectable sections when inventory and direct terminals coexist', () => {
  const items = buildTerminalPickerItems({
    referencePickerLocations: [inventoryTerminal],
    selectableInventoryLocations: [inventoryTerminal],
    visibleTerminals: [visibleTerminal],
  });

  assert.deepEqual(
    items.map((item) => item.kind),
    ['section', 'inventory-terminal', 'terminal', 'section', 'reference'],
  );
});
