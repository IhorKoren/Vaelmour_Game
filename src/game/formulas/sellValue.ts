import type { Rarity } from '../types';

export type SellValueOptions = {
  itemId: string;
  category: string;
  rarity?: Rarity;
  tier?: number;
  affixesCount?: number;
  baseValueGold?: number;
};

/**
 * Calculates in-game gold sell value for any given item, weapon, or armor.
 * Uses a safe, conservative scaling formula based on rarity, tier, and affixes.
 */
export function calculateItemSellValue(options: SellValueOptions): number {
  // 1. Determine base value from explicit baseValueGold or fallback rarity
  let base: number;
  const rarity = options.rarity || 'common';

  if (options.baseValueGold !== undefined && options.baseValueGold > 0) {
    base = options.baseValueGold;
  } else {
    switch (rarity) {
      case 'uncommon':
        base = 25;
        break;
      case 'rare':
        base = 60;
        break;
      case 'epic':
        base = 150;
        break;
      case 'legendary':
        base = 400;
        break;
      case 'common':
      default:
        base = 10;
        break;
    }
  }

  // 2. Adjust by tier (e.g. +15% per tier above tier 1)
  const tier = options.tier || 1;
  const tierMultiplier = 1 + (tier - 1) * 0.15;

  // 3. Adjust by affixes (+10% per affix)
  const affixesCount = options.affixesCount || 0;
  const affixMultiplier = 1 + affixesCount * 0.10;

  // 4. Return rounded conservative final cost
  return Math.round(base * tierMultiplier * affixMultiplier);
}
