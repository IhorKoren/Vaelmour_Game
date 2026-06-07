import {
  chestConfigs,
  CHEST_SLOT_OPTIONS,
  PREVIEW_SLOT_TO_EQUIPMENT_SLOT,
  type ChestConfig,
  type ChestId,
  type ChestPreviewSlot,
} from '../../data/chestConfigs';
import { getChestEligibleEquipmentLevels } from './equipmentRules';

export type ChestPreview = {
  chestId: ChestId;
  chestNameUk: string;
  futurePriceCoins: number;
  eligibleLevels: number[];
  rarityPreview: ChestConfig['rarityWeights'];
  allowedSlots: ChestPreviewSlot[];
  relicsEligible: boolean;
  relicDropChance: number;
};

export function getChestConfig(chestId: ChestId): ChestConfig {
  const config = chestConfigs.find((entry) => entry.id === chestId);
  if (!config) {
    throw new Error(`Unknown chest config: ${chestId}`);
  }

  return config;
}

export function getChestEligibleItemLevels(heroLevel: number): number[] {
  return getChestEligibleEquipmentLevels(heroLevel);
}

export function selectChestItemLevel(heroLevel: number, random: number): number {
  const levels = getChestEligibleItemLevels(heroLevel);
  if (levels.length === 1) {
    return levels[0];
  }

  const roll = Number.isFinite(random) ? Math.min(0.999999, Math.max(0, random)) : 0;
  const index = Math.min(levels.length - 1, Math.floor(roll * levels.length));
  return levels[index];
}

export function selectChestRarity(chestConfig: ChestConfig, random: number): string | null {
  if (!chestConfig.grantsEquipment || chestConfig.rarityWeights.length === 0) {
    return null;
  }

  const normalizedRoll = Number.isFinite(random) ? Math.min(0.999999, Math.max(0, random)) : 0;
  let cumulativeWeight = 0;

  for (const entry of chestConfig.rarityWeights) {
    cumulativeWeight += entry.weight / 100;
    if (normalizedRoll < cumulativeWeight) {
      return entry.rarity;
    }
  }

  return chestConfig.rarityWeights[chestConfig.rarityWeights.length - 1]?.rarity ?? null;
}

export function selectChestSlot(
  chestConfig: ChestConfig,
  random: number,
  optionalChosenSlot?: ChestPreviewSlot,
): ChestPreviewSlot | null {
  if (!chestConfig.grantsEquipment) {
    return null;
  }

  if (chestConfig.allowsChosenSlot) {
    if (optionalChosenSlot && chestConfig.allowedSlots?.includes(optionalChosenSlot)) {
      return optionalChosenSlot;
    }

    throw new Error(`Chest ${chestConfig.id} requires a valid chosen slot`);
  }

  const allowedSlots = chestConfig.allowedSlots ?? CHEST_SLOT_OPTIONS;
  const normalizedRoll = Number.isFinite(random) ? Math.min(0.999999, Math.max(0, random)) : 0;
  const index = Math.min(allowedSlots.length - 1, Math.floor(normalizedRoll * allowedSlots.length));
  return allowedSlots[index];
}

export function getChestPreview(chestConfig: ChestConfig, heroLevel: number): ChestPreview {
  return {
    chestId: chestConfig.id,
    chestNameUk: chestConfig.nameUk,
    futurePriceCoins: chestConfig.futurePriceCoins,
    eligibleLevels: chestConfig.grantsEquipment ? getChestEligibleItemLevels(heroLevel) : [],
    rarityPreview: chestConfig.rarityWeights,
    allowedSlots: chestConfig.allowedSlots ?? CHEST_SLOT_OPTIONS,
    relicsEligible: chestConfig.relicsEligible,
    relicDropChance: chestConfig.relicDropChance,
  };
}

export function resolvePreviewSlotLabel(slot: ChestPreviewSlot): string {
  const mappedSlot = PREVIEW_SLOT_TO_EQUIPMENT_SLOT[slot];
  const slotLabels: Record<ChestPreviewSlot, string> = {
    weapon: 'Зброя',
    shield: 'Щит',
    head: 'Голова',
    chest: 'Тіло',
    hands: 'Руки',
    legs: 'Ноги',
    feet: 'Взуття',
    ring: 'Кільце',
    amulet: 'Амулет',
  };

  return mappedSlot ? slotLabels[slot] : slot;
}
