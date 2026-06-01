import type { ItemAffix, ItemAffixType } from '../types';

export type AffixDefinition = {
  type: ItemAffixType;
  label: string;
  valueType: 'flat' | 'percent';
  baseValue: number;
  scalePerTier: number;
};

export const WEAPON_AFFIX_POOL: AffixDefinition[] = [
  { type: 'attackPower', label: 'Сила атаки', valueType: 'flat', baseValue: 2, scalePerTier: 2 },
  { type: 'critChance', label: 'Шанс криту', valueType: 'percent', baseValue: 0.01, scalePerTier: 0.005 },
  { type: 'critDamage', label: 'Критичний множник', valueType: 'percent', baseValue: 0.05, scalePerTier: 0.02 },
  { type: 'accuracy', label: 'Точність', valueType: 'percent', baseValue: 0.01, scalePerTier: 0.005 }
];

export const ARMOR_AFFIX_POOL: AffixDefinition[] = [
  { type: 'maxHealth', label: 'Здоров’я', valueType: 'flat', baseValue: 10, scalePerTier: 10 },
  { type: 'armor', label: 'Броня', valueType: 'flat', baseValue: 2, scalePerTier: 2 },
  { type: 'dodgeChance', label: 'Шанс ухилення', valueType: 'percent', baseValue: 0.005, scalePerTier: 0.003 },
  { type: 'healthRegen', label: 'Регенерація HP', valueType: 'flat', baseValue: 1, scalePerTier: 1 }
];

export const ACCESSORY_AFFIX_POOL: AffixDefinition[] = [
  { type: 'critChance', label: 'Шанс криту', valueType: 'percent', baseValue: 0.008, scalePerTier: 0.004 },
  { type: 'dodgeChance', label: 'Шанс ухилення', valueType: 'percent', baseValue: 0.008, scalePerTier: 0.004 },
  { type: 'healthRegen', label: 'Регенерація HP', valueType: 'flat', baseValue: 1, scalePerTier: 1 },
  { type: 'maxHealth', label: 'Здоров’я', valueType: 'flat', baseValue: 8, scalePerTier: 8 }
];

/**
 * Deterministically generates item affixes based on rarity, category/type, and tier.
 * Common: 0 affixes
 * Uncommon: 1 affix
 * Rare: 2 affixes
 * Epic: 3 affixes
 * Legendary: 4 affixes
 */
export function generateItemAffixes(
  rarity: string,
  category: string,
  tier: number = 1,
  random: () => number = Math.random
): ItemAffix[] {
  const normRarity = rarity.toLowerCase().trim();
  const normCat = category.toLowerCase().trim();

  let affixCount = 0;
  if (normRarity === 'uncommon') affixCount = 1;
  else if (normRarity === 'rare') affixCount = 2;
  else if (normRarity === 'epic') affixCount = 3;
  else if (normRarity === 'legendary') affixCount = 4;

  if (affixCount <= 0) return [];

  // Determine affix pool
  let pool = ARMOR_AFFIX_POOL;
  if (normCat === 'weapon') {
    pool = WEAPON_AFFIX_POOL;
  } else if (
    normCat === 'ring' ||
    normCat === 'amulet' ||
    normCat === 'talisman' ||
    normCat === 'charm' ||
    normCat === 'sigil' ||
    normCat === 'accessory'
  ) {
    pool = ACCESSORY_AFFIX_POOL;
  }

  // Shuffle or pick from pool deterministically based on seed random
  const selected: AffixDefinition[] = [];
  const available = [...pool];

  for (let i = 0; i < affixCount; i++) {
    if (available.length === 0) break;
    const index = Math.floor(random() * available.length);
    selected.push(available[index]);
    available.splice(index, 1);
  }

  return selected.map((def, idx) => {
    const value = def.baseValue + (tier - 1) * def.scalePerTier;
    // Round floats appropriately for display
    const finalVal = def.valueType === 'percent' ? Number(value.toFixed(4)) : Math.round(value);

    return {
      id: `${def.type}_affix_${idx + 1}`,
      type: def.type,
      label: def.label,
      value: finalVal,
      valueType: def.valueType
    };
  });
}
