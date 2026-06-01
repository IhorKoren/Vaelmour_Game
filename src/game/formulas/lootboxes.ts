import type { HeroState, Rarity, ItemAffix } from '../types';
import { lootboxDefinitions } from '../../data/lootboxes';
import { items } from '../../data/items';
import { weapons } from '../../data/weapons';
import { armors } from '../../data/armors';
import { shields } from '../../data/shields';
import { generateItemAffixes } from './affixes';

export type LootboxReward = {
  itemId: string;
  qty: number;
  rarity: Rarity;
  affixes?: ItemAffix[];
};

export type LootboxOpenResult = {
  success: boolean;
  error?: string;
  rewards: LootboxReward[];
  nextHero: HeroState;
};

/**
 * Simulates opening a lootbox using gold.
 * deducts gold, rolls random items/materials, and appends them directly to player's inventory stack.
 */
export function openLootbox(
  hero: HeroState,
  boxId: string,
  random: () => number = Math.random
): LootboxOpenResult {
  const box = lootboxDefinitions.find(b => b.id === boxId);
  if (!box) {
    return { success: false, error: 'Скриню не знайдено.', rewards: [], nextHero: hero };
  }

  if (hero.gold < box.priceGold) {
    return { success: false, error: 'Недостатньо золота.', rewards: [], nextHero: hero };
  }

  const rewards: LootboxReward[] = [];

  // Generate rewards based on chest rarity
  for (let i = 0; i < box.rewardCount; i++) {
    const roll = random();
    let itemId = 'MAT_001';
    let qty = 1;
    let rarity: Rarity = 'common';
    let affixes: ItemAffix[] = [];

    if (box.rarity === 'common') {
      // 90% materials, 10% common gear
      if (roll < 0.90) {
        const mats = items.filter(it => it.category === 'material');
        const selected = mats[Math.floor(roll * mats.length)] || mats[0];
        itemId = selected.id;
        qty = Math.floor(roll * 2) + 1; // 1-2
      } else {
        const gear = [...weapons, ...armors, ...shields].filter(g => g.rarity === 'common');
        const selected = gear[Math.floor(roll * gear.length)] || gear[0];
        itemId = selected.id;
        rarity = 'common';
      }
    } else if (box.rarity === 'uncommon') {
      // 60% materials, 40% uncommon gear
      if (roll < 0.60) {
        const mats = items.filter(it => it.category === 'material' && it.rarity !== 'epic');
        const selected = mats[Math.floor(roll * mats.length)] || mats[0];
        itemId = selected.id;
        qty = Math.floor(roll * 3) + 1; // 1-3
      } else {
        const gear = [...weapons, ...armors, ...shields];
        const selected = gear[Math.floor(roll * gear.length)] || gear[0];
        itemId = selected.id;
        rarity = 'uncommon';
        affixes = generateItemAffixes('uncommon', selected.id.includes('weapon') ? 'weapon' : 'armor', ('level' in selected ? selected.level : selected.tier) ?? 5, random);
      }
    } else if (box.rarity === 'rare') {
      // Guaranteed rare or uncommon equipment
      const isRare = roll < 0.60;
      const gear = [...weapons, ...armors, ...shields];
      const selected = gear[Math.floor(roll * gear.length)] || gear[0];
      itemId = selected.id;
      rarity = isRare ? 'rare' : 'uncommon';
      affixes = generateItemAffixes(rarity, selected.id.includes('weapon') ? 'weapon' : 'armor', ('level' in selected ? selected.level : selected.tier) ?? 10, random);
    } else if (box.rarity === 'epic') {
      // Guaranteed epic/rare equipment or high-tier mats
      if (roll < 0.60) {
        const isEpic = roll < 0.30;
        const gear = [...weapons, ...armors, ...shields];
        const selected = gear[Math.floor(roll * gear.length)] || gear[0];
        itemId = selected.id;
        rarity = isEpic ? 'epic' : 'rare';
        affixes = generateItemAffixes(rarity, selected.id.includes('weapon') ? 'weapon' : 'armor', ('level' in selected ? selected.level : selected.tier) ?? 15, random);
      } else {
        const mats = items.filter(it => it.category === 'material' && (it.rarity === 'rare' || it.rarity === 'epic'));
        const selected = mats[Math.floor(roll * mats.length)] || mats[0];
        itemId = selected.id;
        rarity = selected.rarity || 'rare';
        qty = Math.floor(roll * 2) + 2; // 2-3
      }
    }

    rewards.push({ itemId, qty, rarity, affixes: affixes.length > 0 ? affixes : undefined });
  }

  // Deduct gold and add rewards to inventory
  const updatedInventory = [...hero.inventory];
  rewards.forEach(reward => {
    // If it is a stackable material, try to merge it
    if (!reward.affixes || reward.affixes.length === 0) {
      const existingIdx = updatedInventory.findIndex(stack => stack.itemId === reward.itemId && (!stack.affixes || stack.affixes.length === 0));
      if (existingIdx >= 0) {
        updatedInventory[existingIdx] = {
          ...updatedInventory[existingIdx],
          qty: updatedInventory[existingIdx].qty + reward.qty
        };
        return;
      }
    }

    // Add as a new stack
    updatedInventory.push({
      itemId: reward.itemId,
      qty: reward.qty,
      affixes: reward.affixes
    });
  });

  const nextHero: HeroState = {
    ...hero,
    gold: hero.gold - box.priceGold,
    inventory: updatedInventory
  };

  return {
    success: true,
    rewards,
    nextHero
  };
}
