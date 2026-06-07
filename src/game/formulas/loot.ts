import type { Enemy, GeneratedEquipmentItem, HeroState } from '../types';
import type { ItemDefinition } from '../../data/items';
import {
  createGeneratedEquipmentItem,
  getEquipmentLevelForEnemy,
  getGeneratedEquipmentDropChance,
  rollGeneratedEquipmentRarity,
  rollWeightedEquipmentSlot
} from '../equipment/generatedEquipment';
import { calculateSecondaryStats } from './secondaryStats';
import { getRuntimeMaterialDropPool, resolveDropLocation } from './materialDropResolver';

export type LootDropResult = {
  dropped: boolean;
  itemId?: string;
  itemName?: string;
  itemRarity?: string;
};

export type EquipmentDropResult = {
  dropped: boolean;
  item?: GeneratedEquipmentItem;
};

function chooseRandomItem(pool: ItemDefinition[], random: () => number): ItemDefinition | null {
  if (pool.length === 0) return null;
  return pool[Math.floor(random() * pool.length)] ?? null;
}

export function rollLootDrop(
  enemy: Enemy,
  availableItems: ItemDefinition[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _risk: 'Safe' | 'Risky' | 'Dangerous' = 'Safe',
  random: () => number = Math.random,
  location?: { id?: string; name?: string; materials: string[]; levelRange?: [number, number] | number[]; biome?: string; combatIdentity?: string; uniqueLootTheme?: string }
): LootDropResult {
  if (!availableItems || availableItems.length === 0) return { dropped: false };

  const targetLevel = getEquipmentLevelForEnemy(enemy.level ?? 1);
  const resolvedLocation = resolveDropLocation(location);
  const { pool: materialPool } = getRuntimeMaterialDropPool({
    enemy,
    location: resolvedLocation,
    targetLevel,
    availableItems
  });

  const rolledMaterial = chooseRandomItem(materialPool, random);

  if (!rolledMaterial) return { dropped: false };

  return {
    dropped: true,
    itemId: rolledMaterial.id,
    itemName: rolledMaterial.name,
    itemRarity: rolledMaterial.rarity
  };
}

export function rollGeneratedEquipmentDrop(
  enemy: Enemy,
  hero: HeroState,
  locationId?: string,
  random: () => number = Math.random
): EquipmentDropResult {
  const secondary = calculateSecondaryStats(hero);
  const dropChance = getGeneratedEquipmentDropChance(enemy, hero, secondary.lootChanceBonus);
  if (random() > dropChance) {
    return { dropped: false };
  }

  const slot = rollWeightedEquipmentSlot(random);
  const rarity = rollGeneratedEquipmentRarity(enemy, hero, random, secondary.rarityFindBonus);
  const level = getEquipmentLevelForEnemy(enemy.level ?? 1);
  const normalizedSlot = slot === 'ring2' ? 'ring1' : slot;
  const item = createGeneratedEquipmentItem({
    slot: normalizedSlot,
    level,
    rarity,
    enemyId: enemy.id,
    enemyName: enemy.name,
    locationId,
    random
  });

  return {
    dropped: true,
    item
  };
}
