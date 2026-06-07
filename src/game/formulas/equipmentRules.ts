import { EQUIPMENT_LEVELS } from '../equipment/generatedEquipment';
import type { HeroState } from '../types';

type EquippableItemLike = {
  id: string;
  name?: string;
  level?: number;
  requiredLevel?: number;
  tier?: number;
  generatedItem?: {
    level?: number;
  };
};

export type EquipRequirementResult = {
  canEquip: boolean;
  requiredLevel: number;
  heroLevel: number;
  reason?: 'level_too_low';
  message?: string;
  detailLines: [string, string];
};

export function resolveItemRequiredLevel(item: EquippableItemLike): number {
  const requiredLevel = Number(
    item.requiredLevel ??
      item.generatedItem?.level ??
      item.level ??
      item.tier ??
      1,
  );

  if (!Number.isFinite(requiredLevel) || requiredLevel < 1) {
    return 1;
  }

  return Math.min(30, Math.trunc(requiredLevel));
}

export function canEquipItem(hero: Pick<HeroState, 'level'>, item: EquippableItemLike): EquipRequirementResult {
  const requiredLevel = resolveItemRequiredLevel(item);
  const heroLevel = Number.isFinite(hero.level) ? hero.level : 1;
  const canEquip = heroLevel >= requiredLevel;
  const detailLines: [string, string] = [
    `Потрібен рівень: ${requiredLevel}`,
    `Ваш рівень: ${heroLevel}`,
  ];

  if (canEquip) {
    return {
      canEquip: true,
      requiredLevel,
      heroLevel,
      detailLines,
    };
  }

  return {
    canEquip: false,
    requiredLevel,
    heroLevel,
    reason: 'level_too_low',
    message: detailLines.join(' '),
    detailLines,
  };
}

export function getChestEligibleEquipmentLevels(heroLevel: number): number[] {
  const normalizedHeroLevel = Math.max(1, Math.min(30, Math.trunc(heroLevel || 1)));
  const currentTierLevel = [...EQUIPMENT_LEVELS].reverse().find((level) => level <= normalizedHeroLevel) ?? 1;
  const nextTierLevel = EQUIPMENT_LEVELS.find(
    (level) => level > currentTierLevel && level <= Math.min(30, normalizedHeroLevel + 3),
  );

  return nextTierLevel ? [currentTierLevel, nextTierLevel] : [currentTierLevel];
}
