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

export const WEAPON_AFFIX_POOL: AffixDefinition[] = [
  { type: 'damageBonus', label: 'Шкода', valueType: 'percent', baseValue: 0.02, scalePerTier: 0.005, cap: 0.25 },
  { type: 'accuracy', label: 'Влучність', valueType: 'percent', baseValue: 0.02, scalePerTier: 0.005, cap: 0.25 },
  { type: 'critChance', label: 'Шанс криту', valueType: 'percent', baseValue: 0.015, scalePerTier: 0.004, cap: 0.35 },
  { type: 'critDamage', label: 'Критична шкода', valueType: 'percent', baseValue: 0.1, scalePerTier: 0.015, cap: 0.75 },
  { type: 'attackSpeedBonus', label: 'Швидкість атаки', valueType: 'percent', baseValue: 0.015, scalePerTier: 0.003, cap: 0.25 },
  { type: 'armorPenetration', label: 'Пробиття броні', valueType: 'percent', baseValue: 0.03, scalePerTier: 0.005, cap: 0.6 },
  { type: 'stunChance', label: 'Шанс стану', valueType: 'percent', baseValue: 0.015, scalePerTier: 0.003, cap: 0.3 },
  { type: 'bleedChance', label: 'Шанс кровотечі', valueType: 'percent', baseValue: 0.025, scalePerTier: 0.004, cap: 0.45 }
];

export const ARMOR_AFFIX_POOL: AffixDefinition[] = [
  { type: 'maxHp', label: 'Додаткове HP', valueType: 'flat', baseValue: 8, scalePerTier: 4 },
  { type: 'armor', label: 'Броня', valueType: 'flat', baseValue: 2, scalePerTier: 1 },
  { type: 'healthRegen', label: 'Самолікування', valueType: 'flat', baseValue: 1, scalePerTier: 0.4, cap: 30 },
  { type: 'dodgeChance', label: 'Ухилення', valueType: 'percent', baseValue: 0.015, scalePerTier: 0.003, cap: 0.35 },
  { type: 'stunResist', label: 'Опір стану', valueType: 'percent', baseValue: 0.04, scalePerTier: 0.006, cap: 0.6 },
  { type: 'bleedResist', label: 'Опір кровотечі', valueType: 'percent', baseValue: 0.04, scalePerTier: 0.006, cap: 0.6 },
  { type: 'damageReduction', label: 'Зменшення шкоди', valueType: 'percent', baseValue: 0.01, scalePerTier: 0.003, cap: 0.3 }
];

export const ACCESSORY_AFFIX_POOL: AffixDefinition[] = [
  { type: 'damageBonus', label: 'Шкода', valueType: 'percent', baseValue: 0.02, scalePerTier: 0.005, cap: 0.25 },
  { type: 'accuracy', label: 'Влучність', valueType: 'percent', baseValue: 0.02, scalePerTier: 0.005, cap: 0.25 },
  { type: 'critChance', label: 'Шанс криту', valueType: 'percent', baseValue: 0.015, scalePerTier: 0.004, cap: 0.35 },
  { type: 'critDamage', label: 'Критична шкода', valueType: 'percent', baseValue: 0.1, scalePerTier: 0.015, cap: 0.75 },
  { type: 'armorPenetration', label: 'Пробиття броні', valueType: 'percent', baseValue: 0.03, scalePerTier: 0.005, cap: 0.6 },
  { type: 'lifeSteal', label: 'Вампіризм', valueType: 'percent', baseValue: 0.01, scalePerTier: 0.002, cap: 0.15 },
  { type: 'maxHp', label: 'Додаткове HP', valueType: 'flat', baseValue: 8, scalePerTier: 4 },
  { type: 'healthRegen', label: 'Самолікування', valueType: 'flat', baseValue: 1, scalePerTier: 0.4, cap: 30 },
  { type: 'goldFindBonus', label: 'Бонус золота', valueType: 'percent', baseValue: 0.03, scalePerTier: 0.006, cap: 0.5 },
  { type: 'lootChanceBonus', label: 'Бонус луту', valueType: 'percent', baseValue: 0.02, scalePerTier: 0.004, cap: 0.3 },
  { type: 'rarityFindBonus', label: 'Бонус рідкості', valueType: 'percent', baseValue: 0.01, scalePerTier: 0.002, cap: 0.2 },
  { type: 'stunChance', label: 'Шанс стану', valueType: 'percent', baseValue: 0.015, scalePerTier: 0.003, cap: 0.3 },
  { type: 'bleedChance', label: 'Шанс кровотечі', valueType: 'percent', baseValue: 0.025, scalePerTier: 0.004, cap: 0.45 }
];

export const SHIELD_AFFIX_POOL: AffixDefinition[] = [
  { type: 'armor', label: 'Броня', valueType: 'flat', baseValue: 2, scalePerTier: 1 },
  { type: 'blockChance', label: 'Шанс блоку', valueType: 'percent', baseValue: 0.03, scalePerTier: 0.004, cap: 0.4 },
  { type: 'blockPower', label: 'Сила блоку', valueType: 'flat', baseValue: 5, scalePerTier: 2 },
  { type: 'damageReduction', label: 'Зменшення шкоди', valueType: 'percent', baseValue: 0.01, scalePerTier: 0.003, cap: 0.3 },
  { type: 'maxHp', label: 'Додаткове HP', valueType: 'flat', baseValue: 8, scalePerTier: 4 },
  { type: 'stunResist', label: 'Опір стану', valueType: 'percent', baseValue: 0.04, scalePerTier: 0.006, cap: 0.6 },
  { type: 'bleedResist', label: 'Опір кровотечі', valueType: 'percent', baseValue: 0.04, scalePerTier: 0.006, cap: 0.6 }
];

export function getAffixPool(category: string): AffixDefinition[] {
  const normalized = category.toLowerCase().trim();
  if (normalized === 'weapon') return WEAPON_AFFIX_POOL;
  if (normalized === 'shield') return SHIELD_AFFIX_POOL;
  if (normalized === 'ring' || normalized === 'amulet' || normalized === 'accessory') return ACCESSORY_AFFIX_POOL;
  return ARMOR_AFFIX_POOL;
}

function getAffixCount(rarity: string): number {
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

function getRarityMultiplier(rarity: string): number {
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

export function generateItemAffixes(rarity: string, category: string, tier: number = 1, random: () => number = Math.random): ItemAffix[] {
  const affixCount = getAffixCount(rarity);
  if (affixCount <= 0) return [];

  const pool = [...getAffixPool(category)];
  const selected: ItemAffix[] = [];
  const rarityMultiplier = getRarityMultiplier(rarity);

  for (let index = 0; index < affixCount && pool.length > 0; index += 1) {
    const pickIndex = Math.floor(random() * pool.length);
    const [definition] = pool.splice(pickIndex, 1);
    selected.push(createAffix(definition, tier, rarityMultiplier, random, index));
  }

  return selected;
}
