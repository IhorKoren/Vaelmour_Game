import type { Enemy } from '../types';
import type { ItemDefinition } from '../../data/items';
import { lootTables } from '../../data/lootTables';
import { resolveItemDefinitionByIdOrName, resolveManyItemDefinitions } from '../../data/itemResolver';

export type LootDropResult = {
  dropped: boolean;
  itemId?: string;
  itemName?: string;
  itemRarity?: string;
};

type LootTablesData = {
  rarityChances?: Array<{
    source_type: string;
    common_item: number;
    uncommon_item: number;
    rare_item: number;
    epic_item: number;
  }>;
  enemyLoot?: Array<{
    enemy_name: string;
    locations?: string;
    gold_min: string;
    gold_max: string;
    common_item?: number;
    uncommon_item?: number;
    rare_item?: number;
    epic_item?: number;
    material_drop_chance?: number;
    primary_materials?: string;
    unique_notable_drops?: string;
  }>;
  locationLoot?: Array<{
    location_id: string;
    notable_items?: string;
  }>;
  uniqueItemDrops?: Array<{
    item_name: string;
    required_level: string;
    rarity: string;
    drops_from: string;
    location: string;
    drop_chance: string;
  }>;
  bossLoot?: Array<{
    boss_name: string;
    location_id: string;
    gold_min: string;
    gold_max: string;
    epic_drop_chance: number | string;
    material_drops?: string;
    unique_drops?: string;
  }>;
  eliteLootModifiers?: Array<{
    gold_multiplier?: string;
    material_chance_multiplier?: string;
    rare_chance_multiplier?: string;
    epic_chance_multiplier?: string;
  }>;
};

function parseList(rawValue?: string | null): string[] {
  if (!rawValue) return [];
  return rawValue
    .split(/[,/;+]/)
    .map((entry) => entry.replace(/x\d+.*$/i, '').trim())
    .filter(Boolean);
}

function parsePercent(rawValue: number | string | undefined): number {
  if (typeof rawValue === 'number') return rawValue / 100;
  const parsed = Number.parseFloat(String(rawValue ?? '0').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed / 100 : 0;
}

function getEliteModifier(data: LootTablesData): NonNullable<LootTablesData['eliteLootModifiers']>[number] | null {
  return data.eliteLootModifiers?.[0] ?? null;
}

function getRarityRank(rarity: string): number {
  switch (rarity.toLowerCase()) {
    case 'epic':
      return 4;
    case 'rare':
      return 3;
    case 'uncommon':
      return 2;
    case 'common':
    default:
      return 1;
  }
}

function chooseRandomItem(pool: ItemDefinition[], random: () => number): ItemDefinition | null {
  if (pool.length === 0) return null;
  return pool[Math.floor(random() * pool.length)] ?? null;
}

/**
 * Rolls for a chance-based loot drop upon defeating an enemy.
 * Uses a location risk-based drop rate: Safe (25%), Risky (30%), Dangerous (35%).
 * Gaining equipment (weapons/armor) scales with threat zone difficulty and enemy levels:
 * - Safe: 5% chance of equipment (common only)
 * - Risky: 15% chance of equipment (common or uncommon)
 * - Dangerous: 25% chance of equipment (common, uncommon, rare, or epic)
 * Standard material drops and fallback materials are dynamically filtered to match
 * the enemy's level tier: Ceil(Level / 3), capped between 1 and 10.
 */
export function rollLootDrop(
  enemy: Enemy,
  availableItems: ItemDefinition[],
  risk: 'Safe' | 'Risky' | 'Dangerous' = 'Safe',
  random: () => number = Math.random
): LootDropResult {
  if (!availableItems || availableItems.length === 0) {
    return { dropped: false };
  }

  const typedLootTables = lootTables as unknown as LootTablesData;
  const enemyLevel = enemy.level ?? 1;
  const targetTier = Math.max(1, Math.min(10, Math.ceil(enemyLevel / 3)));
  const enemyLootRow = typedLootTables.enemyLoot?.find((entry) => entry.enemy_name === enemy.name);
  const bossLootRow = typedLootTables.bossLoot?.find((entry) => entry.boss_name === enemy.name);
  const eliteModifier = enemy.rank === 'elite' ? getEliteModifier(typedLootTables) : null;

  if (enemy.rank === 'boss' && bossLootRow) {
    const bossUniquePool = resolveManyItemDefinitions(parseList(bossLootRow.unique_drops), availableItems);
    const epicChance = parsePercent(bossLootRow.epic_drop_chance);
    const epicBossItems = bossUniquePool.filter((item) => item.rarity.toLowerCase() === 'epic');
    const rareBossItems = bossUniquePool.filter((item) => getRarityRank(item.rarity) >= getRarityRank('rare'));
    const guaranteedBossItem =
      (random() < epicChance ? chooseRandomItem(epicBossItems, random) : null) ??
      chooseRandomItem(rareBossItems, random) ??
      chooseRandomItem(bossUniquePool, random);

    if (guaranteedBossItem) {
      return {
        dropped: true,
        itemId: guaranteedBossItem.id,
        itemName: guaranteedBossItem.name,
        itemRarity: guaranteedBossItem.rarity
      };
    }

    const bossMaterial = chooseRandomItem(
      resolveManyItemDefinitions(parseList(bossLootRow.material_drops), availableItems).filter((item) => item.category === 'material'),
      random
    );
    if (bossMaterial) {
      return {
        dropped: true,
        itemId: bossMaterial.id,
        itemName: bossMaterial.name,
        itemRarity: bossMaterial.rarity
      };
    }
  }

  const directUniqueCandidates = (typedLootTables.uniqueItemDrops ?? []).filter((entry) => {
    const requiredLevel = Number.parseInt(entry.required_level, 10) || 1;
    if (requiredLevel > enemyLevel + 2) return false;
    if (entry.drops_from === enemy.name) return true;
    if (enemy.rank === 'elite' && entry.drops_from === 'Elite Spawn') return true;
    if (enemy.rank !== 'elite' && enemy.rank !== 'boss' && entry.drops_from === 'Common enemies') return true;
    return false;
  });

  for (const uniqueRow of directUniqueCandidates) {
    const uniqueChance = parsePercent(uniqueRow.drop_chance);
    if (random() >= uniqueChance) continue;
    const uniqueItem = resolveItemDefinitionByIdOrName(uniqueRow.item_name, availableItems);
    if (uniqueItem) {
      return {
        dropped: true,
        itemId: uniqueItem.id,
        itemName: uniqueItem.name,
        itemRarity: uniqueItem.rarity
      };
    }
  }

  // Controlled secondary equipment drops for regular (common) enemies
  const isNormalEnemy = enemy.rank === 'normal' || !enemy.rank;
  if (isNormalEnemy) {
    let secondaryDropChance = 0.015; // early levels default (1.5%)
    if (enemyLevel > 8 && enemyLevel <= 18) {
      secondaryDropChance = 0.02; // mid levels (2.0%)
    } else if (enemyLevel > 18) {
      secondaryDropChance = 0.025; // late levels (2.5%)
    }

    if (random() < secondaryDropChance) {
      const locationNotables = parseList(
        typedLootTables.locationLoot?.find((entry) => entry.location_id === enemy.location)?.notable_items
      );
      const enemyNotables = parseList(enemyLootRow?.unique_notable_drops);
      const candidates = resolveManyItemDefinitions([...enemyNotables, ...locationNotables], availableItems);

      const family = (enemy.family || '').toLowerCase();
      const archetype = (enemy.archetype || '').toLowerCase();
      const name = (enemy.name || '').toLowerCase();

      const isRaider = family.includes('raider') || archetype.includes('berserker') || name.includes('thug') || name.includes('bandit') || name.includes('raider');
      const isBeast = family.includes('wolf') || family.includes('beast') || archetype.includes('hunter') || name.includes('wolf') || name.includes('hound') || name.includes('stalker');
      const isGuard = family.includes('legion') || archetype.includes('defender') || name.includes('guard') || name.includes('warden') || name.includes('protector') || name.includes('soldier');
      const isCultist = family.includes('cult') || family.includes('ash') || archetype.includes('bleeder') || name.includes('priest') || name.includes('disciple') || name.includes('zealot');
      const isArena = family.includes('mercenary') || family.includes('executioner') || archetype.includes('fighter') || archetype.includes('brute') || name.includes('duelist') || name.includes('sellblade') || name.includes('crusher') || name.includes('brute');

      let thematicCats = ['head', 'hands', 'legs', 'feet', 'ring', 'amulet', 'shield'];
      if (isRaider) thematicCats = ['hands', 'feet', 'ring', 'shield'];
      else if (isBeast) thematicCats = ['amulet', 'head', 'hands', 'feet'];
      else if (isGuard) thematicCats = ['shield', 'head', 'legs'];
      else if (isCultist) thematicCats = ['amulet', 'ring'];
      else if (isArena) thematicCats = ['ring', 'shield', 'hands', 'legs', 'feet'];

      let allowedRarities = ['common', 'uncommon'];
      if (enemyLevel > 18) {
        allowedRarities = ['uncommon', 'rare'];
      }

      const secondaryCandidates = candidates.filter((item) => {
        const cat = item.category.toLowerCase();
        const rarity = item.rarity.toLowerCase();

        if (!thematicCats.includes(cat)) return false;
        if (!allowedRarities.includes(rarity)) return false;
        if (item.tier > targetTier + 1) return false;
        return true;
      });

      const rolledSecondary = chooseRandomItem(secondaryCandidates, random);
      if (rolledSecondary) {
        return {
          dropped: true,
          itemId: rolledSecondary.id,
          itemName: rolledSecondary.name,
          itemRarity: rolledSecondary.rarity
        };
      }
    }
  }

  const riskChanceMap = { Safe: 0.22, Risky: 0.28, Dangerous: 0.35 };
  const fallbackDropChance = riskChanceMap[risk];
  const dropChance =
    enemyLootRow && typeof enemyLootRow.material_drop_chance === 'number'
      ? enemyLootRow.material_drop_chance / 100
      : fallbackDropChance;
  const scaledDropChance =
    enemy.rank === 'elite' && eliteModifier
      ? Math.min(1, dropChance * Number.parseFloat(eliteModifier.material_chance_multiplier ?? '1.5'))
      : enemy.rank === 'boss'
        ? 1
        : dropChance;

  if (random() > scaledDropChance) {
    return { dropped: false };
  }

  const locationNotables = parseList(
    typedLootTables.locationLoot?.find((entry) => entry.location_id === enemy.location)?.notable_items
  );
  const enemyNotables = parseList(enemyLootRow?.unique_notable_drops);
  const itemPool = resolveManyItemDefinitions([...enemyNotables, ...locationNotables], availableItems);

  let commonChance = (enemyLootRow?.common_item ?? 10) / 100;
  let uncommonChance = (enemyLootRow?.uncommon_item ?? 3.5) / 100;
  let rareChance = (enemyLootRow?.rare_item ?? 0.6) / 100;
  let epicChance = (enemyLootRow?.epic_item ?? 0.02) / 100;

  if (!enemyLootRow) {
    const sourceType = enemy.rank === 'elite' ? 'Elite Spawn' : 'Common Enemy';
    const rarityRow = typedLootTables.rarityChances?.find((entry) => entry.source_type === sourceType);
    if (rarityRow) {
      commonChance = rarityRow.common_item / 100;
      uncommonChance = rarityRow.uncommon_item / 100;
      rareChance = rarityRow.rare_item / 100;
      epicChance = rarityRow.epic_item / 100;
    }
  }

  if (enemy.rank === 'elite' && eliteModifier) {
    rareChance *= Number.parseFloat(eliteModifier.rare_chance_multiplier ?? '3');
    epicChance *= Number.parseFloat(eliteModifier.epic_chance_multiplier ?? '4');
  }

  const rarityRoll = random();
  let desiredMinRarity: 'common' | 'uncommon' | 'rare' | 'epic' = 'common';
  if (rarityRoll < epicChance) {
    desiredMinRarity = 'epic';
  } else if (rarityRoll < epicChance + rareChance) {
    desiredMinRarity = 'rare';
  } else if (rarityRoll < epicChance + rareChance + uncommonChance) {
    desiredMinRarity = 'uncommon';
  } else if (rarityRoll < epicChance + rareChance + uncommonChance + commonChance) {
    desiredMinRarity = 'common';
  }

  const equipmentCandidates = itemPool.filter((item) => {
    const cat = item.category.toLowerCase();
    if (
      cat !== 'weapon' &&
      cat !== 'armor' &&
      cat !== 'shield' &&
      cat !== 'crafted' &&
      cat !== 'head' &&
      cat !== 'hands' &&
      cat !== 'legs' &&
      cat !== 'feet' &&
      cat !== 'ring' &&
      cat !== 'amulet'
    ) {
      return false;
    }
    if (item.tier > targetTier + 1) return false;
    return getRarityRank(item.rarity) >= getRarityRank(desiredMinRarity);
  });
  const rolledEquipment = chooseRandomItem(equipmentCandidates, random);
  if (rolledEquipment) {
    return {
      dropped: true,
      itemId: rolledEquipment.id,
      itemName: rolledEquipment.name,
      itemRarity: rolledEquipment.rarity
    };
  }

  let candidates = resolveManyItemDefinitions(parseList(enemyLootRow?.primary_materials), availableItems).filter((item) => item.category === 'material');
  if (candidates.length === 0) {
    candidates = availableItems.filter((item) => {
      return (
        item.category === 'material' &&
        (item.rarity === 'common' || item.rarity === 'uncommon') &&
        item.tier === targetTier
      );
    });
  }

  if (candidates.length === 0) {
    candidates = availableItems.filter((item) => item.category === 'material');
  }

  const rolledItem = chooseRandomItem(candidates, random);
  return {
    dropped: true,
    itemId: rolledItem?.id ?? 'MAT_001',
    itemName: rolledItem?.name ?? 'Torn Cloth',
    itemRarity: rolledItem?.rarity ?? 'common'
  };
}
