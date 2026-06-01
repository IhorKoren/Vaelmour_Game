import rawData from './generated/lootTables.json';
import { minorArmorLocationLoot, minorArmorUniqueItemDrops } from './minorArmorLoot';
import { ringLocationLoot, ringUniqueItemDrops } from './ringLoot';
import { shieldLocationLoot, shieldUniqueItemDrops } from './shieldLoot';
import { amuletLocationLoot, amuletUniqueItemDrops } from './amuletLoot';

const baseLootTables = rawData as {
  uniqueItemDrops?: unknown[];
  locationLoot?: Array<{ location_id: string; notable_items?: string; [key: string]: unknown }>;
};

const mergedLocationLootMap = new Map<string, { location_id: string; notable_items: string; [key: string]: unknown }>();

if (baseLootTables.locationLoot) {
  for (const entry of baseLootTables.locationLoot) {
    mergedLocationLootMap.set(entry.location_id, {
      ...entry,
      notable_items: entry.notable_items ?? ''
    });
  }
}

const extraLocationLoots = [
  shieldLocationLoot,
  ringLocationLoot,
  minorArmorLocationLoot,
  amuletLocationLoot
];

for (const lootList of extraLocationLoots) {
  for (const entry of lootList) {
    const existing = mergedLocationLootMap.get(entry.location_id);
    if (existing) {
      if (entry.notable_items) {
        const currentNotables = existing.notable_items ? existing.notable_items.split(',').map(s => s.trim()) : [];
        const newNotables = entry.notable_items.split(',').map(s => s.trim());
        const combined = Array.from(new Set([...currentNotables, ...newNotables])).filter(Boolean).join(', ');
        existing.notable_items = combined;
      }
    } else {
      mergedLocationLootMap.set(entry.location_id, {
        location_id: entry.location_id,
        notable_items: entry.notable_items ?? ''
      });
    }
  }
}

const mergedLocationLoot = Array.from(mergedLocationLootMap.values());

export const lootTables = {
  ...baseLootTables,
  uniqueItemDrops: [...(baseLootTables.uniqueItemDrops ?? []), ...shieldUniqueItemDrops, ...ringUniqueItemDrops, ...minorArmorUniqueItemDrops, ...amuletUniqueItemDrops],
  locationLoot: mergedLocationLoot
};

