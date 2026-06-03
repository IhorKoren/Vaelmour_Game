import type { ItemAffix, ItemAffixType } from '../types';

export type AffixDefinition = {
  type: ItemAffixType;
  label: string;
  valueType: 'flat' | 'percent';
  baseValue: number;
  scalePerTier: number;
  cap?: number;
};

const roundPercent = (value: number): number => Math.round(value * 200) / 200;

function rollPercent(baseValue: number, scalePerTier: number, tier: number, rarityMultiplier: number, random: () => number, cap?: number): number {
  const scaled = (baseValue + Math.max(0, tier - 1) * scalePerTier) * rarityMultiplier * (0.85 + random() * 0.3);
  const rounded = roundPercent(scaled);
  return cap !== undefined ? Math.min(rounded, cap) : rounded;
}

function rollFlat(baseValue: number, scalePerTier: number, tier: number, rarityMultiplier: number, random: () => number, cap?: number): number {
  const scaled = (baseValue + Math.max(0, tier - 1) * scalePerTier) * rarityMultiplier * (0.85 + random() * 0.3);
  const rounded = Math.max(1, Math.round(scaled));
  return cap !== undefined ? Math.min(rounded, cap) : rounded;
}

function createAffix(def: AffixDefinition, tier: number, rarityMultiplier: number, random: () => number, index: number): ItemAffix {
  const value = def.valueType === 'percent'
    ? rollPercent(def.baseValue, def.scalePerTier, tier, rarityMultiplier, random, def.cap)
    : rollFlat(def.baseValue, def.scalePerTier, tier, rarityMultiplier, random, def.cap);

  return {
    id: `${def.type}_affix_${index + 1}`,
    type: def.type,
    label: def.label,
    value,
    valueType: def.valueType
  };
}

export const SLOT_AFFIX_POOLS: Record<string, AffixDefinition[]> = {
  weapon: [
    { type: 'damageBonus', label: 'Шкода', valueType: 'percent', baseValue: 0.03, scalePerTier: 0.006, cap: 0.18 },
    { type: 'critChance', label: 'Шанс криту', valueType: 'percent', baseValue: 0.02, scalePerTier: 0.004, cap: 0.16 },
    { type: 'critDamage', label: 'Критична шкода', valueType: 'percent', baseValue: 0.08, scalePerTier: 0.012, cap: 0.5 },
    { type: 'accuracy', label: 'Влучність', valueType: 'percent', baseValue: 0.02, scalePerTier: 0.003, cap: 0.15 },
    { type: 'bleedChance', label: 'Шанс кровотечі', valueType: 'percent', baseValue: 0.03, scalePerTier: 0.005, cap: 0.25 },
    { type: 'stunChance', label: 'Шанс стану', valueType: 'percent', baseValue: 0.02, scalePerTier: 0.004, cap: 0.18 },
    { type: 'armorPenetration', label: 'Пробиття броні', valueType: 'percent', baseValue: 0.03, scalePerTier: 0.005, cap: 0.25 }
  ],
  head: [
    { type: 'maxHp', label: 'Додаткове HP', valueType: 'flat', baseValue: 8, scalePerTier: 3, cap: 120 },
    { type: 'armor', label: 'Броня', valueType: 'flat', baseValue: 2, scalePerTier: 1, cap: 25 },
    { type: 'healthRegen', label: 'Регенерація', valueType: 'flat', baseValue: 1, scalePerTier: 0.4, cap: 12 },
    { type: 'stunResist', label: 'Опір стану', valueType: 'percent', baseValue: 0.03, scalePerTier: 0.004, cap: 0.25 },
    { type: 'bleedResist', label: 'Опір кровотечі', valueType: 'percent', baseValue: 0.03, scalePerTier: 0.004, cap: 0.25 }
  ],
  chest: [
    { type: 'maxHp', label: 'Додаткове HP', valueType: 'flat', baseValue: 10, scalePerTier: 4, cap: 160 },
    { type: 'armor', label: 'Броня', valueType: 'flat', baseValue: 3, scalePerTier: 1.2, cap: 35 },
    { type: 'damageReduction', label: 'Зменшення шкоди', valueType: 'percent', baseValue: 0.02, scalePerTier: 0.004, cap: 0.18 },
    { type: 'stunResist', label: 'Опір стану', valueType: 'percent', baseValue: 0.04, scalePerTier: 0.005, cap: 0.3 },
    { type: 'bleedResist', label: 'Опір кровотечі', valueType: 'percent', baseValue: 0.04, scalePerTier: 0.005, cap: 0.3 },
    { type: 'healthRegen', label: 'Регенерація', valueType: 'flat', baseValue: 1, scalePerTier: 0.5, cap: 14 }
  ],
  hands: [
    { type: 'accuracy', label: 'Влучність', valueType: 'percent', baseValue: 0.02, scalePerTier: 0.003, cap: 0.14 },
    { type: 'critChance', label: 'Шанс криту', valueType: 'percent', baseValue: 0.015, scalePerTier: 0.003, cap: 0.12 },
    { type: 'critDamage', label: 'Критична шкода', valueType: 'percent', baseValue: 0.06, scalePerTier: 0.01, cap: 0.4 },
    { type: 'attackSpeedBonus', label: 'Швидкість атаки', valueType: 'percent', baseValue: 0.02, scalePerTier: 0.003, cap: 0.18 },
    { type: 'damageBonus', label: 'Шкода', valueType: 'percent', baseValue: 0.02, scalePerTier: 0.004, cap: 0.16 },
    { type: 'armorPenetration', label: 'Пробиття броні', valueType: 'percent', baseValue: 0.02, scalePerTier: 0.004, cap: 0.2 }
  ],
  legs: [
    { type: 'maxHp', label: 'Додаткове HP', valueType: 'flat', baseValue: 8, scalePerTier: 3, cap: 120 },
    { type: 'armor', label: 'Броня', valueType: 'flat', baseValue: 2, scalePerTier: 1, cap: 25 },
    { type: 'damageReduction', label: 'Зменшення шкоди', valueType: 'percent', baseValue: 0.015, scalePerTier: 0.003, cap: 0.15 },
    { type: 'bleedResist', label: 'Опір кровотечі', valueType: 'percent', baseValue: 0.03, scalePerTier: 0.004, cap: 0.22 }
  ],
  feet: [
    { type: 'dodgeChance', label: 'Ухилення', valueType: 'percent', baseValue: 0.02, scalePerTier: 0.003, cap: 0.14 },
    { type: 'accuracy', label: 'Влучність', valueType: 'percent', baseValue: 0.015, scalePerTier: 0.003, cap: 0.12 },
    { type: 'healthRegen', label: 'Регенерація', valueType: 'flat', baseValue: 1, scalePerTier: 0.4, cap: 10 }
  ],
  shield: [
    { type: 'armor', label: 'Броня', valueType: 'flat', baseValue: 3, scalePerTier: 1.2, cap: 30 },
    { type: 'blockChance', label: 'Шанс блоку', valueType: 'percent', baseValue: 0.03, scalePerTier: 0.004, cap: 0.22 },
    { type: 'blockPower', label: 'Сила блоку', valueType: 'flat', baseValue: 3, scalePerTier: 1.2, cap: 28 },
    { type: 'maxHp', label: 'Додаткове HP', valueType: 'flat', baseValue: 8, scalePerTier: 3, cap: 100 }
  ],
  ring: [
    { type: 'damageBonus', label: 'Шкода', valueType: 'percent', baseValue: 0.025, scalePerTier: 0.004, cap: 0.16 },
    { type: 'critChance', label: 'Шанс криту', valueType: 'percent', baseValue: 0.018, scalePerTier: 0.003, cap: 0.12 },
    { type: 'accuracy', label: 'Влучність', valueType: 'percent', baseValue: 0.018, scalePerTier: 0.003, cap: 0.12 },
    { type: 'lootChanceBonus', label: 'Бонус луту', valueType: 'percent', baseValue: 0.03, scalePerTier: 0.004, cap: 0.22 },
    { type: 'goldFindBonus', label: 'Бонус золота', valueType: 'percent', baseValue: 0.04, scalePerTier: 0.006, cap: 0.3 }
  ],
  amulet: [
    { type: 'maxHp', label: 'Додаткове HP', valueType: 'flat', baseValue: 10, scalePerTier: 4, cap: 140 },
    { type: 'healthRegen', label: 'Регенерація', valueType: 'flat', baseValue: 1, scalePerTier: 0.5, cap: 14 },
    { type: 'rarityFindBonus', label: 'Бонус рідкості', valueType: 'percent', baseValue: 0.03, scalePerTier: 0.004, cap: 0.22 },
    { type: 'lifeSteal', label: 'Вампіризм', valueType: 'percent', baseValue: 0.01, scalePerTier: 0.002, cap: 0.08 },
    { type: 'damageBonus', label: 'Шкода', valueType: 'percent', baseValue: 0.02, scalePerTier: 0.004, cap: 0.14 }
  ]
};

export const WEAPON_AFFIX_POOL = SLOT_AFFIX_POOLS.weapon;
export const SHIELD_AFFIX_POOL = SLOT_AFFIX_POOLS.shield;
export const ACCESSORY_AFFIX_POOL = SLOT_AFFIX_POOLS.ring;
export const ARMOR_AFFIX_POOL = SLOT_AFFIX_POOLS.chest;

export function getAffixPool(category: string): AffixDefinition[] {
  const normalized = category.toLowerCase().trim();
  if (normalized === 'ring1' || normalized === 'ring2' || normalized === 'ring') return SLOT_AFFIX_POOLS.ring;
  if (normalized === 'amulet') return SLOT_AFFIX_POOLS.amulet;
  if (normalized === 'accessory') return SLOT_AFFIX_POOLS.ring;
  if (SLOT_AFFIX_POOLS[normalized]) {
    return SLOT_AFFIX_POOLS[normalized];
  }
  if (normalized === 'weapon') return SLOT_AFFIX_POOLS.weapon;
  if (normalized === 'shield') return SLOT_AFFIX_POOLS.shield;
  return SLOT_AFFIX_POOLS.chest; // Default fallback (armor/chest)
}

export function getAffixCount(rarity: string): number {
  switch (rarity.toLowerCase().trim()) {
    case 'uncommon':
      return 1;
    case 'rare':
      return 2;
    case 'epic':
      return 3;
    case 'legendary':
      return 4;
    default:
      return 0;
  }
}

export function getRarityMultiplier(rarity: string): number {
  switch (rarity.toLowerCase().trim()) {
    case 'rare':
      return 1.15;
    case 'epic':
      return 1.3;
    case 'legendary':
      return 1.45;
    default:
      return 1;
  }
}

export function generateItemAffixes(
  rarity: string,
  category: string,
  tier: number = 1,
  random: () => number = Math.random,
  excludeType?: ItemAffixType
): ItemAffix[] {
  const affixCount = getAffixCount(rarity);
  if (affixCount <= 0) return [];

  const basePool = getAffixPool(category);
  const pool = basePool.filter((affix) => affix.type !== excludeType);
  const selected: ItemAffix[] = [];
  const rarityMultiplier = getRarityMultiplier(rarity);

  for (let index = 0; index < affixCount && pool.length > 0; index += 1) {
    const pickIndex = Math.floor(random() * pool.length);
    const [definition] = pool.splice(pickIndex, 1);
    selected.push(createAffix(definition, tier, rarityMultiplier, random, index));
  }

  return selected;
}

