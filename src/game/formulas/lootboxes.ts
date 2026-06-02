import type { HeroState, Rarity, ItemAffix, GeneratedEquipmentItem, EquipmentSlot } from '../types';
import { lootboxDefinitions } from '../../data/lootboxes';
import { items } from '../../data/items';
import { createGeneratedEquipmentItem, getEquipmentLevelForEnemy, rollWeightedEquipmentSlot } from '../equipment/generatedEquipment';

export type LootboxReward = {
  itemId: string;
  qty: number;
  rarity: Rarity;
  affixes?: ItemAffix[];
  generatedItem?: GeneratedEquipmentItem;
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
    let generatedItem: GeneratedEquipmentItem | undefined;

    if (box.rarity === 'common') {
      // 90% materials, 10% common gear
      if (roll < 0.90) {
        const mats = items.filter(it => it.category === 'material');
        const selected = mats[Math.floor(roll * mats.length)] || mats[0];
        itemId = selected.id;
        qty = Math.floor(roll * 2) + 1; // 1-2
      } else {
        const itemLevel = resolveLootboxEquipmentLevel(hero.level, 'common');
        const slot = normalizeLootboxSlot(rollWeightedEquipmentSlot(random));
        generatedItem = createGeneratedEquipmentItem({
          slot,
          level: itemLevel,
          rarity: 'common',
          random
        });
        itemId = generatedItem.id;
        rarity = generatedItem.rarity;
        affixes = generatedItem.affixes;
      }
    } else if (box.rarity === 'uncommon') {
      // 60% materials, 40% uncommon gear
      if (roll < 0.60) {
        const mats = items.filter(it => it.category === 'material' && it.rarity !== 'epic');
        const selected = mats[Math.floor(roll * mats.length)] || mats[0];
        itemId = selected.id;
        qty = Math.floor(roll * 3) + 1; // 1-3
      } else {
        const itemLevel = resolveLootboxEquipmentLevel(hero.level, 'uncommon');
        const slot = normalizeLootboxSlot(rollWeightedEquipmentSlot(random));
        generatedItem = createGeneratedEquipmentItem({
          slot,
          level: itemLevel,
          rarity: 'uncommon',
          random
        });
        itemId = generatedItem.id;
        rarity = generatedItem.rarity;
        affixes = generatedItem.affixes;
      }
    } else if (box.rarity === 'rare') {
      // Guaranteed rare or uncommon equipment
      const isRare = roll < 0.60;
      rarity = isRare ? 'rare' : 'uncommon';
      const itemLevel = resolveLootboxEquipmentLevel(hero.level, 'rare');
      generatedItem = createGeneratedEquipmentItem({
        slot: normalizeLootboxSlot(rollWeightedEquipmentSlot(random)),
        level: itemLevel,
        rarity,
        random
      });
      itemId = generatedItem.id;
      affixes = generatedItem.affixes;
    } else if (box.rarity === 'epic') {
      // Guaranteed epic/rare equipment or high-tier mats
      if (roll < 0.60) {
        const isEpic = roll < 0.30;
        rarity = isEpic ? 'epic' : 'rare';
        const itemLevel = resolveLootboxEquipmentLevel(hero.level, 'epic');
        generatedItem = createGeneratedEquipmentItem({
          slot: normalizeLootboxSlot(rollWeightedEquipmentSlot(random)),
          level: itemLevel,
          rarity,
          random
        });
        itemId = generatedItem.id;
        affixes = generatedItem.affixes;
      } else {
        const mats = items.filter(it => it.category === 'material' && (it.rarity === 'rare' || it.rarity === 'epic'));
        const selected = mats[Math.floor(roll * mats.length)] || mats[0];
        itemId = selected.id;
        rarity = selected.rarity || 'rare';
        qty = Math.floor(roll * 2) + 2; // 2-3
      }
    }

    rewards.push({ itemId, qty, rarity, affixes: affixes.length > 0 ? affixes : undefined, generatedItem });
  }

  // Deduct gold and add rewards to inventory
  const updatedInventory = [...hero.inventory];
  rewards.forEach(reward => {
    // If it is a stackable material, try to merge it
    if (!reward.generatedItem && (!reward.affixes || reward.affixes.length === 0)) {
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
      affixes: reward.affixes,
      durability: reward.generatedItem?.durability,
      rerollCount: reward.generatedItem ? 0 : undefined,
      generatedItem: reward.generatedItem
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

function normalizeLootboxSlot(slot: EquipmentSlot): EquipmentSlot {
  return slot === 'ring2' ? 'ring1' : slot;
}

function resolveLootboxEquipmentLevel(heroLevel: number, lootboxRarity: Rarity): number {
  const floorLevel =
    lootboxRarity === 'epic' ? 18 :
    lootboxRarity === 'rare' ? 12 :
    lootboxRarity === 'uncommon' ? 6 : 1;
  const clampedHeroLevel = Math.max(floorLevel, heroLevel);
  return getEquipmentLevelForEnemy(clampedHeroLevel);
}
