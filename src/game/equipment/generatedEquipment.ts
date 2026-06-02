import { items } from '../../data/items';
import { armors } from '../../data/armors';
import { shields } from '../../data/shields';
import { weapons } from '../../data/weapons';
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

const RARITY_RANDOM_STAT_COUNT: Record<string, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4
};

const RARITY_STAT_MULTIPLIER: Record<string, number> = {
  common: 1,
  uncommon: 1,
  rare: 1.1,
  epic: 1.2,
  legendary: 1.35
};

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

const SLOT_AFFIX_POOLS: Record<EquipmentSlot, AffixTemplate[]> = {
  weapon: [
    { type: 'damageBonus', label: 'Damage', valueType: 'percent', baseValue: 0.03, scalePerTier: 0.006, cap: 0.18 },
    { type: 'critChance', label: 'Crit Chance', valueType: 'percent', baseValue: 0.02, scalePerTier: 0.004, cap: 0.16 },
    { type: 'critDamage', label: 'Crit Damage', valueType: 'percent', baseValue: 0.08, scalePerTier: 0.012, cap: 0.5 },
    { type: 'accuracy', label: 'Accuracy', valueType: 'percent', baseValue: 0.02, scalePerTier: 0.003, cap: 0.15 },
    { type: 'bleedChance', label: 'Bleed Chance', valueType: 'percent', baseValue: 0.03, scalePerTier: 0.005, cap: 0.25 },
    { type: 'stunChance', label: 'Stun Chance', valueType: 'percent', baseValue: 0.02, scalePerTier: 0.004, cap: 0.18 },
    { type: 'armorPenetration', label: 'Armor Penetration', valueType: 'percent', baseValue: 0.03, scalePerTier: 0.005, cap: 0.25 }
  ],
  head: [
    { type: 'maxHp', label: 'Max HP', valueType: 'flat', baseValue: 8, scalePerTier: 3, cap: 120 },
    { type: 'armor', label: 'Armor', valueType: 'flat', baseValue: 2, scalePerTier: 1, cap: 25 },
    { type: 'healthRegen', label: 'Health Regen', valueType: 'flat', baseValue: 1, scalePerTier: 0.4, cap: 12 },
    { type: 'stunResist', label: 'Stun Resist', valueType: 'percent', baseValue: 0.03, scalePerTier: 0.004, cap: 0.25 },
    { type: 'bleedResist', label: 'Bleed Resist', valueType: 'percent', baseValue: 0.03, scalePerTier: 0.004, cap: 0.25 }
  ],
  chest: [
    { type: 'maxHp', label: 'Max HP', valueType: 'flat', baseValue: 10, scalePerTier: 4, cap: 160 },
    { type: 'armor', label: 'Armor', valueType: 'flat', baseValue: 3, scalePerTier: 1.2, cap: 35 },
    { type: 'damageReduction', label: 'Damage Reduction', valueType: 'percent', baseValue: 0.02, scalePerTier: 0.004, cap: 0.18 },
    { type: 'stunResist', label: 'Stun Resist', valueType: 'percent', baseValue: 0.04, scalePerTier: 0.005, cap: 0.3 },
    { type: 'bleedResist', label: 'Bleed Resist', valueType: 'percent', baseValue: 0.04, scalePerTier: 0.005, cap: 0.3 },
    { type: 'healthRegen', label: 'Health Regen', valueType: 'flat', baseValue: 1, scalePerTier: 0.5, cap: 14 }
  ],
  hands: [
    { type: 'accuracy', label: 'Accuracy', valueType: 'percent', baseValue: 0.02, scalePerTier: 0.003, cap: 0.14 },
    { type: 'critChance', label: 'Crit Chance', valueType: 'percent', baseValue: 0.015, scalePerTier: 0.003, cap: 0.12 },
    { type: 'critDamage', label: 'Crit Damage', valueType: 'percent', baseValue: 0.06, scalePerTier: 0.01, cap: 0.4 },
    { type: 'attackSpeedBonus', label: 'Attack Speed', valueType: 'percent', baseValue: 0.02, scalePerTier: 0.003, cap: 0.18 },
    { type: 'damageBonus', label: 'Damage', valueType: 'percent', baseValue: 0.02, scalePerTier: 0.004, cap: 0.16 },
    { type: 'armorPenetration', label: 'Armor Penetration', valueType: 'percent', baseValue: 0.02, scalePerTier: 0.004, cap: 0.2 }
  ],
  legs: [
    { type: 'maxHp', label: 'Max HP', valueType: 'flat', baseValue: 8, scalePerTier: 3, cap: 120 },
    { type: 'armor', label: 'Armor', valueType: 'flat', baseValue: 2, scalePerTier: 1, cap: 25 },
    { type: 'damageReduction', label: 'Damage Reduction', valueType: 'percent', baseValue: 0.015, scalePerTier: 0.003, cap: 0.15 },
    { type: 'bleedResist', label: 'Bleed Resist', valueType: 'percent', baseValue: 0.03, scalePerTier: 0.004, cap: 0.22 }
  ],
  feet: [
    { type: 'dodgeChance', label: 'Dodge Chance', valueType: 'percent', baseValue: 0.02, scalePerTier: 0.003, cap: 0.14 },
    { type: 'accuracy', label: 'Accuracy', valueType: 'percent', baseValue: 0.015, scalePerTier: 0.003, cap: 0.12 },
    { type: 'healthRegen', label: 'Health Regen', valueType: 'flat', baseValue: 1, scalePerTier: 0.4, cap: 10 }
  ],
  shield: [
    { type: 'armor', label: 'Armor', valueType: 'flat', baseValue: 3, scalePerTier: 1.2, cap: 30 },
    { type: 'blockChance', label: 'Block Chance', valueType: 'percent', baseValue: 0.03, scalePerTier: 0.004, cap: 0.22 },
    { type: 'blockPower', label: 'Block Power', valueType: 'flat', baseValue: 3, scalePerTier: 1.2, cap: 28 },
    { type: 'maxHp', label: 'Max HP', valueType: 'flat', baseValue: 8, scalePerTier: 3, cap: 100 }
  ],
  ring1: [
    { type: 'damageBonus', label: 'Damage', valueType: 'percent', baseValue: 0.025, scalePerTier: 0.004, cap: 0.16 },
    { type: 'critChance', label: 'Crit Chance', valueType: 'percent', baseValue: 0.018, scalePerTier: 0.003, cap: 0.12 },
    { type: 'accuracy', label: 'Accuracy', valueType: 'percent', baseValue: 0.018, scalePerTier: 0.003, cap: 0.12 },
    { type: 'lootChanceBonus', label: 'Loot Chance', valueType: 'percent', baseValue: 0.03, scalePerTier: 0.004, cap: 0.22 },
    { type: 'goldFindBonus', label: 'Gold Find', valueType: 'percent', baseValue: 0.04, scalePerTier: 0.006, cap: 0.3 }
  ],
  ring2: [],
  amulet: [
    { type: 'maxHp', label: 'Max HP', valueType: 'flat', baseValue: 10, scalePerTier: 4, cap: 140 },
    { type: 'healthRegen', label: 'Health Regen', valueType: 'flat', baseValue: 1, scalePerTier: 0.5, cap: 14 },
    { type: 'rarityFindBonus', label: 'Rarity Find', valueType: 'percent', baseValue: 0.03, scalePerTier: 0.004, cap: 0.22 },
    { type: 'lifeSteal', label: 'Life Steal', valueType: 'percent', baseValue: 0.01, scalePerTier: 0.002, cap: 0.08 },
    { type: 'damageBonus', label: 'Damage', valueType: 'percent', baseValue: 0.02, scalePerTier: 0.004, cap: 0.14 }
  ]
};

SLOT_AFFIX_POOLS.ring2 = SLOT_AFFIX_POOLS.ring1;

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
  return Math.max(0, Math.min(1, baseChance * (1 + heroBonus)));
}

export function rollGeneratedEquipmentRarity(
  enemy: Enemy,
  hero?: HeroState,
  random: () => number = Math.random,
  heroBonusOverride?: number
): Rarity {
  const heroBonus = heroBonusOverride ?? (hero ? getHeroGeneratedStatTotal(hero, 'rarityFindBonus') : 0);
  const table =
    enemy.rank === 'boss'
      ? [
          { rarity: 'common', chance: 0.2 },
          { rarity: 'uncommon', chance: 0.45 },
          { rarity: 'rare', chance: 0.27 },
          { rarity: 'epic', chance: 0.08 }
        ]
      : enemy.rank === 'elite'
        ? [
            { rarity: 'common', chance: 0.45 },
            { rarity: 'uncommon', chance: 0.38 },
            { rarity: 'rare', chance: 0.14 },
            { rarity: 'epic', chance: 0.03 }
          ]
        : [
            { rarity: 'common', chance: 0.7 },
            { rarity: 'uncommon', chance: 0.25 },
            { rarity: 'rare', chance: 0.045 },
            { rarity: 'epic', chance: 0.005 }
          ];

  const cappedEpicChance = enemy.rank === 'boss' ? 0.15 : enemy.rank === 'elite' ? 0.08 : 0.03;
  const boosted = table.map((entry) => ({ ...entry }));
  const epicEntry = boosted.find((entry) => entry.rarity === 'epic');
  if (epicEntry) {
    const nextEpicChance = Math.min(cappedEpicChance, epicEntry.chance * (1 + heroBonus));
    const delta = nextEpicChance - epicEntry.chance;
    epicEntry.chance = nextEpicChance;
    const commonEntry = boosted.find((entry) => entry.rarity === 'common');
    if (commonEntry) {
      commonEntry.chance = Math.max(0, commonEntry.chance - delta);
    }
  }

  let roll = random();
  for (const entry of boosted) {
    roll -= entry.chance;
    if (roll <= 0) {
      return entry.rarity;
    }
  }
  return 'common';
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
  const rarityMultiplier = RARITY_STAT_MULTIPLIER[params.rarity] ?? 1;
  const slot = params.slot;
  const category = slot === 'ring1' || slot === 'ring2' ? 'ring' : slot;
  const stats = generateBaseStats(slot, tierIndex);
  const affixes = generateRandomAffixes(slot, params.rarity, tierIndex, rarityMultiplier, random);
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

function generateBaseStats(slot: EquipmentSlot, tierIndex: number): GeneratedEquipmentStats {
  const pow = Math.pow(1.18, tierIndex);
  switch (slot) {
    case 'weapon': {
      const minDamage = Math.max(2, Math.round(6 * pow));
      const maxDamage = Math.max(minDamage + 2, Math.round(10 * pow));
      return {
        minDamage,
        maxDamage,
        attackSpeed: Number((1 + tierIndex * 0.02).toFixed(2))
      };
    }
    case 'head':
      return { armor: Math.round(6 * pow), defense: Math.round(6 * pow), maxHp: Math.round(10 * pow) };
    case 'chest':
      return { armor: Math.round(10 * pow), defense: Math.round(10 * pow) };
    case 'hands':
      return { armor: Math.round(5 * pow), defense: Math.round(5 * pow), accuracy: Number((0.01 + tierIndex * 0.002).toFixed(3)) };
    case 'legs':
      return { armor: Math.round(7 * pow), defense: Math.round(7 * pow), maxHp: Math.round(8 * pow) };
    case 'feet':
      return { armor: Math.round(5 * pow), defense: Math.round(5 * pow), dodgeChance: Number((0.01 + tierIndex * 0.002).toFixed(3)) };
    case 'shield':
      return {
        armor: Math.round(8 * pow),
        defense: Math.round(8 * pow),
        blockChance: Number((0.08 + tierIndex * 0.01).toFixed(3)),
        blockPower: Math.round(5 * pow)
      };
    case 'ring1':
    case 'ring2':
      return { damageBonus: Number((0.02 + tierIndex * 0.003).toFixed(3)) };
    case 'amulet':
      return { maxHp: Math.round(12 * pow), healthRegen: Math.max(1, Math.round(1 + tierIndex * 0.35)) };
    default:
      return {};
  }
}

function generateRandomAffixes(
  slot: EquipmentSlot,
  rarity: Rarity,
  tierIndex: number,
  rarityMultiplier: number,
  random: () => number
): ItemAffix[] {
  const pool = SLOT_AFFIX_POOLS[slot] ?? [];
  const count = Math.min(pool.length, RARITY_RANDOM_STAT_COUNT[rarity] ?? 0);
  const available = [...pool];
  const affixes: ItemAffix[] = [];

  for (let i = 0; i < count; i += 1) {
    const pickIndex = Math.floor(random() * available.length);
    const picked = available.splice(pickIndex, 1)[0];
    if (!picked) {
      break;
    }
    const variance = 0.85 + random() * 0.3;
    const baseValue = (picked.baseValue + tierIndex * picked.scalePerTier) * rarityMultiplier * variance;
    const clamped = Math.min(picked.cap ?? Number.POSITIVE_INFINITY, baseValue);
    const value = picked.valueType === 'percent'
      ? Math.round(clamped * 1000) / 1000
      : Math.max(1, Math.round(clamped));
    affixes.push({
      id: `${picked.type}_${i + 1}`,
      type: picked.type,
      label: picked.label,
      value,
      valueType: picked.valueType
    });
  }

  return affixes;
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
