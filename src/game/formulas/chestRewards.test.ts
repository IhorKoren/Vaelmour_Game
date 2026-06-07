import { describe, expect, it } from 'vitest';

import { chestConfigs, type ChestConfig } from '../../data/chestConfigs';
import { XP_RELIC_BONUS_CAP, relicItems } from '../../data/relicItems';
import {
  getChestConfig,
  getChestEligibleItemLevels,
  getChestPreview,
  selectChestItemLevel,
  selectChestRarity,
  selectChestSlot,
} from './chestRewards';

function sumWeights(config: ChestConfig): number {
  return config.rarityWeights.reduce((total, entry) => total + entry.weight, 0);
}

describe('chest reward config foundation', () => {
  it('defines valid chest configs with ids, names, and positive future prices', () => {
    expect(chestConfigs).toHaveLength(5);

    for (const config of chestConfigs) {
      expect(config.id).toMatch(/^chest_/);
      expect(config.nameUk.length).toBeGreaterThan(0);
      expect(config.descriptionUk.length).toBeGreaterThan(0);
      expect(config.futurePriceCoins).toBeGreaterThan(0);
      expect(getChestConfig(config.id)).toBe(config);
    }
  });

  it('keeps rarity weights at 100 for equipment-granting chests', () => {
    for (const config of chestConfigs.filter((entry) => entry.grantsEquipment)) {
      expect(sumWeights(config)).toBe(100);
    }

    expect(sumWeights(getChestConfig('chest_supply'))).toBe(0);
  });

  it('does not allow equipment rolls for Supply Chest', () => {
    const config = getChestConfig('chest_supply');

    expect(config.grantsEquipment).toBe(false);
    expect(selectChestRarity(config, 0.2)).toBeNull();
    expect(selectChestSlot(config, 0.4)).toBeNull();
  });

  it('enforces the intended rarity floors for equipment chests', () => {
    expect(getChestConfig('chest_equipment').minimumRarity).toBe('common');
    expect(getChestConfig('chest_hunter').minimumRarity).toBe('uncommon');
    expect(getChestConfig('chest_relic').minimumRarity).toBe('rare');
    expect(getChestConfig('chest_slot').minimumRarity).toBe('uncommon');
  });

  it('uses the existing chest equipment level helper behavior', () => {
    expect(getChestEligibleItemLevels(1)).toEqual([1, 3]);
    expect(getChestEligibleItemLevels(4)).toEqual([3, 6]);
    expect(getChestEligibleItemLevels(16)).toEqual([15, 18]);
    expect(getChestEligibleItemLevels(30)).toEqual([30]);

    const preview = getChestPreview(getChestConfig('chest_relic'), 16);
    expect(preview.eligibleLevels).toEqual([15, 18]);
  });

  it('selects item levels deterministically from the eligible window', () => {
    expect(selectChestItemLevel(16, 0.0)).toBe(15);
    expect(selectChestItemLevel(16, 0.999)).toBe(18);
    expect(selectChestItemLevel(30, 0.5)).toBe(30);
  });

  it('respects chosen slot for Slot Chest', () => {
    const slotChest = getChestConfig('chest_slot');

    expect(selectChestSlot(slotChest, 0.2, 'amulet')).toBe('amulet');
    expect(selectChestSlot(slotChest, 0.2, 'weapon')).toBe('weapon');
  });

  it('rolls expected rarity bands from config weights', () => {
    const equipmentChest = getChestConfig('chest_equipment');
    const relicChest = getChestConfig('chest_relic');

    expect(selectChestRarity(equipmentChest, 0.0)).toBe('common');
    expect(selectChestRarity(equipmentChest, 0.56)).toBe('uncommon');
    expect(selectChestRarity(relicChest, 0.96)).toBe('legendary');
  });

  it('defines XP relics as fixed level 1 +20% XP items with a 40% cap', () => {
    expect(XP_RELIC_BONUS_CAP).toBe(0.4);
    expect(relicItems).toHaveLength(2);

    for (const relic of relicItems) {
      expect(relic.requiredLevel).toBe(1);
      expect(relic.xpBonus).toBe(0.2);
      expect(relic.uniqueEquipped).toBe(true);
      expect(relic.allowsGeneratedAffixes).toBe(false);
      expect(relic.hasDurability).toBe(false);
      expect(relic.allowsReroll).toBe(false);
    }
  });

  it('only configures XP relic drop chances for approved chest types', () => {
    const configuredRelicChests = chestConfigs
      .filter((config) => config.relicDropChance > 0)
      .map((config) => config.id);

    expect(configuredRelicChests).toEqual(['chest_hunter', 'chest_relic', 'chest_slot']);
    expect(getChestConfig('chest_equipment').relicDropChance).toBe(0);
    expect(getChestConfig('chest_supply').relicDropChance).toBe(0);
  });
});
