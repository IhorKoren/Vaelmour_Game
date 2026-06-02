import type { ItemAffix } from '../types';
import { getAffixPool } from './affixes';

export function calculateRerollCost(input: string | { rarity: string; itemLevel?: number; rerollCount?: number }): number {
  if (typeof input === 'string') {
    switch (input.toLowerCase().trim()) {
      case 'uncommon':
        return 100;
      case 'rare':
        return 250;
      case 'epic':
        return 600;
      case 'legendary':
        return 1500;
      default:
        return 50;
    }
  }
  const rarity = input.rarity;
  const itemLevel = input.itemLevel ?? 1;
  const rerollCount = input.rerollCount ?? 0;
  const rarityMultiplier =
    rarity.toLowerCase().trim() === 'legendary' ? 5 :
    rarity.toLowerCase().trim() === 'epic' ? 3 :
    rarity.toLowerCase().trim() === 'rare' ? 1.8 :
    rarity.toLowerCase().trim() === 'uncommon' ? 1 : 0.75;

  const baseCost = 100;
  const itemLevelMultiplier = 1 + itemLevel * 0.12;
  const rerollAttemptMultiplier = 1 + rerollCount * 0.35;
  return Math.max(25, Math.round(baseCost * itemLevelMultiplier * rarityMultiplier * rerollAttemptMultiplier));
}

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

  const pool = getAffixPool(category);
  const current = [...affixes];
  const existingTypes = new Set(current.filter((_, index) => index !== affixIndex).map((affix) => affix.type));
  const available = pool.filter((affix) => !existingTypes.has(affix.type));
  const source = available.length > 0 ? available : pool;
  const picked = source[Math.floor(random() * source.length)];
  const jitter = 0.85 + random() * 0.3;
  const baseValue = picked.baseValue + Math.max(0, tier - 1) * picked.scalePerTier;
  const rawValue = baseValue * jitter;
  const value = picked.valueType === 'percent'
    ? Math.min(picked.cap ?? Number.POSITIVE_INFINITY, Math.round(rawValue * 200) / 200)
    : Math.min(picked.cap ?? Number.POSITIVE_INFINITY, Math.max(1, Math.round(rawValue)));

  current[affixIndex] = {
    id: `${picked.type}_affix_${affixIndex + 1}`,
    type: picked.type,
    label: picked.label,
    value,
    valueType: picked.valueType
  };

  return current;
}
