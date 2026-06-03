import { items } from '../../data/items';
import { armors } from '../../data/armors';
import { shields } from '../../data/shields';
import { weapons } from '../../data/weapons';
import { equipmentCatalog } from '../../data/equipmentCatalog';
import { generateItemAffixes } from '../formulas/affixes';
import type {
  Enemy,
  EquipmentSlot,
  GeneratedEquipmentItem,
  GeneratedEquipmentStats,
  HeroState,
  InventoryStack,
  ItemAffix,
  ItemAffixType,
  Rarity
} from '../types';

export const EQUIPMENT_LEVELS: number[] = [1, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30];
export const EQUIPMENT_SLOT_WEIGHTS: Array<{ slot: EquipmentSlot; weight: number }> = [
  { slot: 'weapon', weight: 12 },
  { slot: 'head', weight: 10 },
  { slot: 'chest', weight: 12 },
  { slot: 'hands', weight: 10 },
  { slot: 'legs', weight: 10 },
  { slot: 'feet', weight: 10 },
  { slot: 'shield', weight: 8 },
  { slot: 'ring1', weight: 16 },
  { slot: 'amulet', weight: 6 }
];

const SLOT_LABELS: Record<EquipmentSlot, string> = {
  weapon: 'Blade',
  shield: 'Shield',
  head: 'Helm',
  chest: 'Chestguard',
  legs: 'Legguards',
  hands: 'Gloves',
  feet: 'Boots',
  ring1: 'Ring',
  ring2: 'Ring',
  amulet: 'Amulet'
};

const RARITY_PREFIXES: Record<string, string> = {
  common: 'Worn',
  uncommon: 'Honed',
  rare: 'Runed',
  epic: 'Mythic',
  legendary: 'Ascendant'
};

type AffixTemplate = {
  type: ItemAffixType;
  label: string;
  valueType: 'flat' | 'percent';
  baseValue: number;
  scalePerTier: number;
  cap?: number;
};

export const RING_PRIMARY_POOL: AffixTemplate[] = [
  { type: 'damageBonus', label: 'Damage', valueType: 'percent', baseValue: 0.02, scalePerTier: 0.005, cap: 0.25 },
  { type: 'critChance', label: 'Crit Chance', valueType: 'percent', baseValue: 0.015, scalePerTier: 0.004, cap: 0.35 },
  { type: 'accuracy', label: 'Accuracy', valueType: 'percent', baseValue: 0.02, scalePerTier: 0.005, cap: 0.25 }
];

export const AMULET_PRIMARY_POOL: AffixTemplate[] = [
  { type: 'healthRegen', label: 'Health Regen', valueType: 'flat', baseValue: 1, scalePerTier: 0.5, cap: 30 },
  { type: 'lifeSteal', label: 'Life Steal', valueType: 'percent', baseValue: 0.01, scalePerTier: 0.002, cap: 0.15 },
  { type: 'damageBonus', label: 'Damage', valueType: 'percent', baseValue: 0.02, scalePerTier: 0.005, cap: 0.25 }
];

function rollPrimaryStat(pool: AffixTemplate[], tierIndex: number, random: () => number): { type: ItemAffixType; value: number } {
  const picked = pool[Math.floor(random() * pool.length)];
  const variance = 0.85 + random() * 0.3;
  const baseValue = (picked.baseValue + tierIndex * picked.scalePerTier) * variance;
  const clamped = Math.min(picked.cap ?? Number.POSITIVE_INFINITY, baseValue);
  const value = picked.valueType === 'percent'
    ? Math.round(clamped * 1000) / 1000
    : Math.max(1, Math.round(clamped));
  return { type: picked.type, value };
}

export function getItemBaseStats(item: GeneratedEquipmentItem): GeneratedEquipmentStats {
  const base = { ...item.stats };
  for (const affix of item.affixes) {
    const key = affix.type === 'maxHealth' ? 'maxHp' : affix.type;
    if (base[key as keyof GeneratedEquipmentStats] !== undefined) {
      base[key as keyof GeneratedEquipmentStats] = (Number(base[key as keyof GeneratedEquipmentStats]) - affix.value) as never;
    }
    if (key === 'armor' && base.defense !== undefined) {
      base.defense = Number(base.defense) - affix.value;
    }
    if (key === 'blockPower' && base.blockValue !== undefined) {
      base.blockValue = Number(base.blockValue) - affix.value;
    }
  }
  return base;
}

type StaticDefinition = Record<string, unknown> & {
  id: string;
  name: string;
  category?: string;
  rarity?: Rarity;
  tier?: number;
  description?: string;
};

export function getEquipmentLevelForEnemy(enemyLevel: number): number {
  let result: number = EQUIPMENT_LEVELS[0];
  for (const level of EQUIPMENT_LEVELS) {
    if (level <= enemyLevel) {
      result = level;
    }
  }
  return result;
}

export function getEquipmentTierIndex(level: number): number {
  return Math.max(0, EQUIPMENT_LEVELS.indexOf(getEquipmentLevelForEnemy(level)));
}

export function rollWeightedEquipmentSlot(random: () => number = Math.random): EquipmentSlot {
  const totalWeight = EQUIPMENT_SLOT_WEIGHTS.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = random() * totalWeight;
  for (const entry of EQUIPMENT_SLOT_WEIGHTS) {
    roll -= entry.weight;
    if (roll <= 0) {
      return entry.slot;
    }
  }
  return 'weapon';
}

export function getGeneratedEquipmentDropChance(enemy: Enemy, hero?: HeroState, heroBonusOverride?: number): number {
  const baseChance = enemy.rank === 'boss' ? 0.35 : enemy.rank === 'elite' ? 0.12 : 0.035;
  const heroBonus = heroBonusOverride ?? (hero ? getHeroGeneratedStatTotal(hero, 'lootChanceBonus') : 0);
  const calculatedChance = baseChance * (1 + heroBonus);
  const cap = enemy.rank === 'boss' ? 0.70 : enemy.rank === 'elite' ? 0.30 : 0.15;
  return Math.max(0, Math.min(cap, calculatedChance));
}

export function rollGeneratedEquipmentRarity(
  enemy: Enemy,
  hero?: HeroState,
  random: () => number = Math.random,
  heroBonusOverride?: number
): Rarity {
  const levelFactor = Math.min(1.0, (enemy.level ?? 1) / 30.0);
  const heroBonus = heroBonusOverride ?? (hero ? getHeroGeneratedStatTotal(hero, 'rarityFindBonus') : 0);

  let epicChance: number;
  let rareChance: number;
  let uncommonChance: number;

  if (enemy.rank === 'boss') {
    epicChance = 0.01 + 0.09 * levelFactor;
    rareChance = 0.12 + 0.18 * levelFactor;
    uncommonChance = 0.37 + 0.08 * levelFactor;
  } else if (enemy.rank === 'elite') {
    epicChance = 0.002 + 0.033 * levelFactor;
    rareChance = 0.04 + 0.11 * levelFactor;
    uncommonChance = 0.25 + 0.15 * levelFactor;
  } else {
    epicChance = 0.008 * levelFactor;
    rareChance = 0.005 + 0.045 * levelFactor;
    uncommonChance = 0.15 + 0.15 * levelFactor;
  }

  // Apply player rarity find bonus (capped)
  const baseEpicChance = epicChance;
  const baseRareChance = rareChance;

  const maxEpicChance = enemy.rank === 'boss' ? 0.18 : enemy.rank === 'elite' ? 0.08 : 0.03;
  const maxRareChance = enemy.rank === 'boss' ? 0.45 : enemy.rank === 'elite' ? 0.25 : 0.12;

  epicChance = Math.min(maxEpicChance, baseEpicChance * (1 + heroBonus));
  rareChance = Math.min(maxRareChance, baseRareChance * (1 + heroBonus));

  let commonChance = 1.0 - uncommonChance - rareChance - epicChance;
  if (commonChance < 0) {
    uncommonChance = Math.max(0, uncommonChance + commonChance);
    commonChance = 0;
  }

  const roll = random();
  if (roll <= commonChance) return 'common';
  if (roll <= commonChance + uncommonChance) return 'uncommon';
  if (roll <= commonChance + uncommonChance + rareChance) return 'rare';
  return 'epic';
}

export function buildGeneratedEquipmentName(slot: EquipmentSlot, rarity: Rarity): string {
  return `${RARITY_PREFIXES[rarity] ?? 'Worn'} ${SLOT_LABELS[slot]}`;
}

export function createGeneratedEquipmentItem(params: {
  slot: EquipmentSlot;
  level: number;
  rarity: Rarity;
  enemyId?: string;
  enemyName?: string;
  locationId?: string;
  random?: () => number;
}): GeneratedEquipmentItem {
  const random = params.random ?? Math.random;
  const tierLevel = getEquipmentLevelForEnemy(params.level);
  const tierIndex = getEquipmentTierIndex(tierLevel);
  const slot = params.slot;
  const category = slot === 'ring1' || slot === 'ring2' ? 'ring' : slot;

  const searchSlot = (slot === 'ring1' || slot === 'ring2') ? 'ring' : slot;
  const template = equipmentCatalog.find(
    (t) => t.slot === searchSlot && t.level === tierLevel
  );
  if (!template) {
    throw new Error(`No template found for slot ${searchSlot} and level ${tierLevel}`);
  }

  const stats: GeneratedEquipmentStats = {};
  if (template.stats.minDamage !== undefined) stats.minDamage = template.stats.minDamage;
  if (template.stats.maxDamage !== undefined) stats.maxDamage = template.stats.maxDamage;
  if (template.stats.attackSpeed !== undefined) stats.attackSpeed = template.stats.attackSpeed;
  if (template.stats.armor !== undefined) {
    stats.armor = template.stats.armor;
    stats.defense = template.stats.armor;
  }
  if (template.stats.maxHp !== undefined) {
    stats.maxHp = template.stats.maxHp;
    stats.maxHealth = template.stats.maxHp;
  }
  if (template.stats.accuracy !== undefined) stats.accuracy = template.stats.accuracy;
  if (template.stats.dodgeChance !== undefined) {
    stats.dodgeChance = template.stats.dodgeChance;
    stats.dodgeBonus = template.stats.dodgeChance;
  }
  if (template.stats.blockChance !== undefined) stats.blockChance = template.stats.blockChance;
  if (template.stats.blockPower !== undefined) {
    stats.blockPower = template.stats.blockPower;
    stats.blockValue = template.stats.blockPower;
  }
  if (template.stats.damageBonus !== undefined) stats.damageBonus = template.stats.damageBonus;
  if (template.stats.attackSpeedBonus !== undefined) stats.attackSpeedBonus = template.stats.attackSpeedBonus;
  if (template.stats.damageReduction !== undefined) stats.damageReduction = template.stats.damageReduction;
  if (template.stats.armorPenetration !== undefined) stats.armorPenetration = template.stats.armorPenetration;
  if (template.stats.healthRegen !== undefined) stats.healthRegen = template.stats.healthRegen;

  let primaryType: ItemAffixType | undefined;
  if (category === 'ring') {
    const rolled = rollPrimaryStat(RING_PRIMARY_POOL, tierIndex, random);
    primaryType = rolled.type;
    stats[rolled.type as keyof GeneratedEquipmentStats] = rolled.value as never;
  } else if (category === 'amulet') {
    const rolled = rollPrimaryStat(AMULET_PRIMARY_POOL, tierIndex, random);
    primaryType = rolled.type;
    stats[rolled.type as keyof GeneratedEquipmentStats] = ((stats[rolled.type as keyof GeneratedEquipmentStats] ?? 0) + rolled.value) as never;
  }

  const affixes = generateItemAffixes(params.rarity, searchSlot, tierIndex + 1, random, primaryType);
  applyAffixesToStats(stats, affixes);
  const id = `generated_${slot}_${tierLevel}_${params.rarity}_${Math.floor(random() * 1_000_000_000)}`;

  return {
    id,
    templateId: `generated_${category}`,
    name: buildGeneratedEquipmentName(slot, params.rarity),
    category,
    slot,
    level: tierLevel,
    tier: tierIndex + 1,
    tierIndex,
    rarity: params.rarity,
    stats,
    affixes,
    durability: 100,
    maxDurability: 100,
    source: {
      type: 'enemy_drop',
      enemyId: params.enemyId,
      enemyName: params.enemyName,
      locationId: params.locationId
    }
  };
}

function applyAffixesToStats(stats: GeneratedEquipmentStats, affixes: ItemAffix[]): void {
  for (const affix of affixes) {
    const key = affix.type === 'maxHealth' ? 'maxHp' : affix.type;
    const current = Number(stats[key as keyof GeneratedEquipmentStats] ?? 0);
    stats[key as keyof GeneratedEquipmentStats] = (current + affix.value) as never;
    if (key === 'armor') {
      const currentDefense = Number(stats.defense ?? 0);
      stats.defense = currentDefense + affix.value;
    }
    if (key === 'blockPower') {
      const currentBlockValue = Number(stats.blockValue ?? 0);
      stats.blockValue = currentBlockValue + affix.value;
    }
  }
}


export function findInventoryStackByItemId(hero: HeroState, itemId: string): InventoryStack | null {
  return hero.inventory.find((stack) => stack.itemId.toLowerCase() === itemId.toLowerCase()) ?? null;
}

export function getGeneratedItemFromHero(hero: HeroState, itemId: string): GeneratedEquipmentItem | null {
  const inventoryItem = findInventoryStackByItemId(hero, itemId)?.generatedItem;
  if (inventoryItem) {
    return inventoryItem;
  }
  const equipped = hero.equippedGeneratedItems
    ? Object.values(hero.equippedGeneratedItems).find((item) => item?.id.toLowerCase() === itemId.toLowerCase())
    : null;
  return equipped ?? null;
}

export function resolveEquipmentRecord(hero: HeroState, itemId: string): StaticDefinition | GeneratedEquipmentItem | null {
  const generated = getGeneratedItemFromHero(hero, itemId);
  if (generated) {
    return generated;
  }

  return (
    armors.find((entry) => entry.id.toLowerCase() === itemId.toLowerCase()) ??
    shields.find((entry) => entry.id.toLowerCase() === itemId.toLowerCase()) ??
    weapons.find((entry) => entry.id.toLowerCase() === itemId.toLowerCase()) ??
    items.find((entry) => entry.id.toLowerCase() === itemId.toLowerCase()) ??
    null
  );
}

export function isGeneratedInventoryStack(stack: InventoryStack): boolean {
  return Boolean(stack.generatedItem);
}

export function getHeroGeneratedStatTotal(hero: HeroState, stat: keyof GeneratedEquipmentStats): number {
  let total = 0;
  const slots: EquipmentSlot[] = ['weapon', 'shield', 'head', 'chest', 'legs', 'hands', 'feet', 'ring1', 'ring2', 'amulet'];
  for (const slot of slots) {
    const generated = hero.equippedGeneratedItems?.[slot];
    if (!generated) {
      continue;
    }
    const factor = (hero.equipmentDurability?.[slot] ?? generated.durability ?? 100) <= 0 ? 0 : 1;
    total += Number(generated.stats[stat] ?? 0) * factor;
  }
  return total;
}
