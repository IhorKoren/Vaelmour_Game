import type { ItemAffix } from '../types';
import {
  WEAPON_AFFIX_POOL,
  ARMOR_AFFIX_POOL,
  ACCESSORY_AFFIX_POOL
} from './affixes';

/**
 * Calculates gold cost to reroll an affix based on item rarity.
 * Uncommon: 100 gold
 * Rare: 250 gold
 * Epic: 600 gold
 * Legendary: 1500 gold
 * Default: 50 gold
 */
export function calculateRerollCost(rarity: string): number {
  const norm = rarity.toLowerCase().trim();
  if (norm === 'uncommon') return 100;
  if (norm === 'rare') return 250;
  if (norm === 'epic') return 600;
  if (norm === 'legendary') return 1500;
  return 50;
}

/**
 * Rerolls a single affix of an item instance.
 * Replaces the affix at affixIndex with a new one rolled from the correct pool,
 * ensuring no duplicate affixes of the same type are added.
 */
export function rerollItemAffix(params: {
  itemId: string;
  category: string;
  tier: number;
  rarity: string;
  affixes?: ItemAffix[];
  affixIndex: number;
  random?: () => number;
}): ItemAffix[] {
  const { category, tier, affixes, affixIndex } = params;
  const random = params.random ?? Math.random;

  if (!affixes || affixes.length === 0) {
    throw new Error('Item has no affixes to reroll.');
  }

  if (affixIndex < 0 || affixIndex >= affixes.length) {
    throw new Error('Invalid affix index.');
  }

  const normCat = category.toLowerCase().trim();
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

  // Filter out any affix types that already exist on the item
  // EXCEPT the one we are currently replacing!
  const currentAffixes = [...affixes];
  const existingTypes = currentAffixes
    .filter((_, idx) => idx !== affixIndex)
    .map((aff) => aff.type);

  const availableDefs = pool.filter((def) => !existingTypes.includes(def.type));

  // Fallback if the pool is somehow fully exhausted
  const finalPool = availableDefs.length > 0 ? availableDefs : pool;

  // Roll a new affix from the final pool
  const rolledDef = finalPool[Math.floor(random() * finalPool.length)];

  const value = rolledDef.baseValue + (tier - 1) * rolledDef.scalePerTier;
  const finalVal = rolledDef.valueType === 'percent' ? Number(value.toFixed(4)) : Math.round(value);

  // Replace only the target affix at the index
  currentAffixes[affixIndex] = {
    id: `${rolledDef.type}_affix_${affixIndex + 1}`,
    type: rolledDef.type,
    label: rolledDef.label,
    value: finalVal,
    valueType: rolledDef.valueType
  };

  return currentAffixes;
}
