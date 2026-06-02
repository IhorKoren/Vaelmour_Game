import type { Enemy, GeneratedEquipmentItem, HeroState, ItemAffix, Rarity } from '../types';
import { calculateDerivedStats } from './stats';
import { calculateSecondaryStats } from './secondaryStats';
import { getEquippedItemStats } from './equipment';

const RARITY_POWER: Record<string, number> = {
  common: 0,
  uncommon: 15,
  rare: 35,
  epic: 70,
  legendary: 120
};

export function calculateItemPower(params: {
  level: number;
  rarity: Rarity;
  stats?: Record<string, number | undefined>;
  affixes?: ItemAffix[];
}): number {
  const stats = params.stats ?? {};
  const affixes = params.affixes ?? [];
  let power = params.level * 10 + (RARITY_POWER[params.rarity] ?? 0);

  power += Number(stats.armor ?? stats.defense ?? 0) * 1.0;
  power += Number(stats.maxHp ?? stats.maxHealth ?? 0) * 0.25;
  power += Number(stats.damageBonus ?? 0) * 8 * 100;
  power += Number(stats.critChance ?? 0) * 10 * 100;
  power += Number(stats.critDamage ?? 0) * 5 * 100;
  power += Number(stats.healthRegen ?? 0) * 6;
  power += Number(stats.armorPenetration ?? 0) * 12 * 100;
  power += Number(stats.stunChance ?? 0) * 10 * 100;
  power += Number(stats.bleedChance ?? 0) * 8 * 100;
  power += Number(stats.minDamage ?? 0) * 1.6 + Number(stats.maxDamage ?? 0) * 1.8;
  power += Number(stats.blockChance ?? 0) * 8 * 100 + Number(stats.blockPower ?? stats.blockValue ?? 0) * 1.5;
  power += Number(stats.dodgeChance ?? 0) * 8 * 100;
  power += Number(stats.accuracy ?? 0) * 5 * 100;
  power += Number(stats.damageReduction ?? 0) * 10 * 100;
  power += Number(stats.lifeSteal ?? 0) * 10 * 100;

  for (const affix of affixes) {
    power += affix.valueType === 'percent' ? affix.value * 100 * 4 : affix.value * 1.5;
  }

  return Math.round(power);
}

export function calculateGeneratedItemPower(item: GeneratedEquipmentItem): number {
  return calculateItemPower({
    level: item.level,
    rarity: item.rarity,
    stats: item.stats as Record<string, number | undefined>,
    affixes: item.affixes
  });
}

export function calculateHeroPower(hero: HeroState): number {
  const equippedSlots = ['weapon', 'shield', 'head', 'chest', 'legs', 'hands', 'feet', 'ring1', 'ring2', 'amulet'] as const;
  let equipmentPower = 0;
  for (const slot of equippedSlots) {
    const itemId = hero.equipment[slot];
    if (!itemId) {
      continue;
    }
    const generated = hero.equippedGeneratedItems?.[slot];
    if (generated) {
      equipmentPower += calculateGeneratedItemPower(generated) * (slot === 'weapon' ? 1.5 : 1);
      continue;
    }
    const equipped = getEquippedItemStats(hero, slot);
    if (!equipped) {
      continue;
    }
    equipmentPower += calculateItemPower({
      level: equipped.tier ?? 1,
      rarity: equipped.rarity ?? 'common',
      stats: equipped as unknown as Record<string, number | undefined>,
      affixes: hero.equipmentAffixes?.[slot] ?? []
    }) * (slot === 'weapon' ? 1.5 : 1);
  }

  const derived = calculateDerivedStats(hero.stats, hero.baseHp, undefined, hero);
  const secondary = calculateSecondaryStats(hero);
  const offensivePower =
    derived.attackPower * 2 +
    derived.critChance * 100 * 5 +
    secondary.damageBonus * 100 * 4;
  const defensivePower =
    derived.maxHp * 0.2 +
    secondary.defense * 1.1 +
    derived.dodgeChance * 100 * 4;

  return Math.round(hero.level * 25 + equipmentPower + offensivePower + defensivePower);
}

export function calculateEnemyPower(enemy: Enemy): number {
  const averageDamage = ((enemy.damageMin ?? enemy.attack) + (enemy.damageMax ?? enemy.attack)) / 2;
  const specialPower =
    (enemy.critChance ?? 0) * 100 * 4 +
    (enemy.dodgeChance ?? 0) * 100 * 4 +
    (enemy.bleedResist ?? 0) * 100 * 2;

  return Math.round(
    (enemy.level ?? 1) * 30 +
      enemy.hp * 0.2 +
      Number(enemy.armor ?? enemy.defense ?? 0) * 1.2 +
      averageDamage * 4 +
      specialPower
  );
}

