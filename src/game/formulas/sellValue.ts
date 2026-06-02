import type { Rarity } from '../types';
import { calculateItemPower } from './power';

export type SellValueOptions = {
  itemId: string;
  category: string;
  rarity?: Rarity;
  tier?: number;
  level?: number;
  affixesCount?: number;
  baseValueGold?: number;
  stats?: Record<string, number | undefined>;
};

/**
 * Calculates in-game gold sell value for any given item, weapon, or armor.
 * Uses a safe, conservative scaling formula based on rarity, tier, and affixes.
 */
export function calculateItemSellValue(options: SellValueOptions): number {
  const rarity = options.rarity || 'common';
  if (options.baseValueGold !== undefined && options.baseValueGold > 0) {
    return Math.round(options.baseValueGold);
  }

  if (options.level === undefined && options.stats === undefined) {
    let base: number;
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
    const tier = options.tier || 1;
    const tierMultiplier = 1 + (tier - 1) * 0.15;
    const affixMultiplier = 1 + (options.affixesCount || 0) * 0.1;
    return Math.round(base * tierMultiplier * affixMultiplier);
  }

  const level = options.level ?? options.tier ?? 1;
  const raritySellMultiplier =
    rarity === 'legendary' ? 7 :
    rarity === 'epic' ? 4 :
    rarity === 'rare' ? 2.4 :
    rarity === 'uncommon' ? 1.5 : 1;
  const levelMultiplier = 1 + level * 0.05;
  const itemPower = calculateItemPower({
    level,
    rarity,
    stats: options.stats,
    affixes: Array.from({ length: options.affixesCount ?? 0 }).map((_, index) => ({
      id: `virtual_${index}`,
      type: 'damageBonus',
      label: 'Virtual',
      value: 1,
      valueType: 'flat'
    }))
  });
  const itemGoldValue = itemPower * levelMultiplier * raritySellMultiplier;
  return Math.max(1, Math.round(itemGoldValue * 0.25));
}
