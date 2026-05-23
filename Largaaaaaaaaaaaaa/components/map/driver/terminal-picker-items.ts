import type { TerminalOption } from '@/lib/domain/transport';
import type { TransportLocationSeed } from '@/lib/seed/transport-location-inventory';

export type TerminalPickerListItem =
  | {
      kind: 'section';
      id: string;
      title: string;
    }
  | {
      kind: 'inventory-terminal';
      id: string;
      location: TransportLocationSeed;
    }
  | {
      kind: 'terminal';
      id: string;
      terminal: TerminalOption;
    }
  | {
      kind: 'reference';
      id: string;
      location: TransportLocationSeed;
    };

export function buildTerminalPickerItems({
  referencePickerLocations,
  selectableInventoryLocations,
  visibleTerminals,
}: {
  referencePickerLocations: TransportLocationSeed[];
  selectableInventoryLocations: TransportLocationSeed[];
  visibleTerminals: TerminalOption[];
}): TerminalPickerListItem[] {
  const items: TerminalPickerListItem[] = [];
  const hasAvailableTerminalChoices = (
    selectableInventoryLocations.length > 0
    || visibleTerminals.length > 0
  );

  if (hasAvailableTerminalChoices) {
    items.push({
      kind: 'section',
      id: 'available-terminals',
      title: 'Available terminals',
    });
    items.push(
      ...selectableInventoryLocations.map((location) => ({
        kind: 'inventory-terminal' as const,
        id: `inventory-terminal:${location.id}`,
        location,
      })),
    );
    items.push(
      ...visibleTerminals.map((terminal) => ({
        kind: 'terminal' as const,
        id: `terminal:${terminal.id}`,
        terminal,
      })),
    );
  }

  if (referencePickerLocations.length > 0) {
    items.push({
      kind: 'section',
      id: 'reference-locations',
      title: 'Reference locations',
    });
    items.push(
      ...referencePickerLocations.map((location) => ({
        kind: 'reference' as const,
        id: `reference:${location.id}`,
        location,
      })),
    );
  }

  return items;
}
