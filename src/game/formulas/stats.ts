import { BASE_ACCURACY, BASE_CRIT_CHANCE, BASE_DODGE_CHANCE } from '../constants';
import type { Armor, CoreStats, DerivedStats, EquipmentSlot, HeroState } from '../types';
import { armors } from '../../data/armors';
import { items } from '../../data/items';
import { shields } from '../../data/shields';
import { weapons } from '../../data/weapons';
import { getGeneratedItemFromHero } from '../equipment/generatedEquipment';

type StatsCarrier = {
  accuracy?: number;
  critChance?: number;
  dodgeBonus?: number;
  dodgeChance?: number;
  hpBonus?: number;
  maxHealth?: number;
  maxHp?: number;
  healthRegen?: number;
};

function resolveEquippedItem(itemId: string): StatsCarrier | null {
  return (
    armors.find((entry) => entry.id.toLowerCase() === itemId.toLowerCase()) ??
    shields.find((entry) => entry.id.toLowerCase() === itemId.toLowerCase()) ??
    weapons.find((entry) => entry.id.toLowerCase() === itemId.toLowerCase()) ??
    items.find((entry) => entry.id.toLowerCase() === itemId.toLowerCase()) ??
    null
  );
}

function resolveEquippedItemForHero(hero: HeroState, slot: EquipmentSlot, itemId: string): StatsCarrier | null {
  const generated = hero.equippedGeneratedItems?.[slot] ?? getGeneratedItemFromHero(hero, itemId);
  if (generated) {
    return {
      accuracy: Number(generated.stats.accuracy ?? 0),
      critChance: Number(generated.stats.critChance ?? 0),
      dodgeBonus: Number(generated.stats.dodgeBonus ?? generated.stats.dodgeChance ?? 0),
      dodgeChance: Number(generated.stats.dodgeChance ?? 0),
      hpBonus: Number(generated.stats.hpBonus ?? 0),
      maxHealth: Number(generated.stats.maxHealth ?? generated.stats.maxHp ?? 0),
      maxHp: Number(generated.stats.maxHp ?? generated.stats.maxHealth ?? 0),
      healthRegen: Number(generated.stats.healthRegen ?? 0)
    };
  }
  return resolveEquippedItem(itemId);
}

export function calculateDerivedStats(stats: CoreStats, baseHp: number, armor?: Armor, hero?: HeroState): DerivedStats {
  let totalAccuracy = armor?.accuracy ?? 0;
  let totalCritChance = armor?.critChance ?? 0;
  let totalDodgeBonus = (armor?.dodgeBonus ?? 0) + (armor?.dodgeChance ?? 0);
  let totalHpBonus = armor?.hpBonus ?? 0;
  let totalRegen = armor?.healthRegen ?? 0;
  let totalFlatMaxHealth = Number(armor?.maxHealth ?? armor?.maxHp ?? 0);

  if (hero) {
    totalAccuracy = 0;
    totalCritChance = 0;
    totalDodgeBonus = 0;
    totalHpBonus = 0;
    totalRegen = 0;
    totalFlatMaxHealth = 0;

    const slots: EquipmentSlot[] = ['head', 'chest', 'legs', 'hands', 'feet', 'ring1', 'ring2', 'amulet', 'shield', 'weapon'];
    for (const slot of slots) {
      const itemId = hero.equipment?.[slot];
      if (!itemId || itemId.startsWith('fallback_') || itemId.startsWith('blank_')) continue;

      const item = resolveEquippedItemForHero(hero, slot, itemId);
      if (!item) continue;

      const factor = (hero.equipmentDurability?.[slot] ?? 100) <= 0 ? 0 : 1;
      totalAccuracy += Number(item.accuracy ?? 0) * factor;
      totalCritChance += Number(item.critChance ?? 0) * factor;
      totalDodgeBonus += Number(item.dodgeBonus ?? item.dodgeChance ?? 0) * factor;
      totalHpBonus += Number(item.hpBonus ?? 0) * factor;
      totalRegen += Number(item.healthRegen ?? 0) * factor;
      totalFlatMaxHealth += Number(item.maxHealth ?? item.maxHp ?? 0) * factor;
    }
  }

  let affixAttackPower = 0;
  let affixMaxHealth = 0;
  let affixCritChance = 0;
  let affixDodgeChance = 0;
  let affixAccuracy = 0;
  let affixHealthRegen = 0;

  if (hero?.equipmentAffixes) {
    const slots: EquipmentSlot[] = ['head', 'chest', 'legs', 'hands', 'feet', 'ring1', 'ring2', 'amulet', 'shield', 'weapon'];
    for (const slot of slots) {
      const factor = (hero.equipmentDurability?.[slot] ?? 100) <= 0 ? 0 : 1;
      const isGenerated = Boolean(hero.equippedGeneratedItems?.[slot]);
      const slotAffixes = isGenerated ? [] : (hero.equipmentAffixes[slot] ?? []);

      for (const affix of slotAffixes) {
        if (affix.type === 'attackPower') affixAttackPower += affix.value * factor;
        else if (affix.type === 'maxHealth' || affix.type === 'maxHp') affixMaxHealth += affix.value * factor;
        else if (affix.type === 'critChance') affixCritChance += affix.value * factor;
        else if (affix.type === 'dodgeChance') affixDodgeChance += affix.value * factor;
        else if (affix.type === 'accuracy') affixAccuracy += affix.value * factor;
        else if (affix.type === 'healthRegen') affixHealthRegen += affix.value * factor;
      }
    }
  }

  const hpFromVitality = stats.vitality * 5;
  const flatHp = baseHp + hpFromVitality + totalFlatMaxHealth + affixMaxHealth;
  const maxHp = Math.round(flatHp * (1 + totalHpBonus));
  const healthRegenFromVitality = Math.floor(stats.vitality / 5);

  return {
    attackPower: stats.strength * 2 + affixAttackPower,
    maxHp,
    critChance: clamp(BASE_CRIT_CHANCE + stats.agility * 0.003 + totalCritChance + affixCritChance, 0, 0.35),
    dodgeChance: clamp(BASE_DODGE_CHANCE + stats.agility * 0.002 + totalDodgeBonus + affixDodgeChance, 0, 0.25),
    accuracy: clamp(BASE_ACCURACY + stats.agility * 0.0015 + totalAccuracy + affixAccuracy, 0.6, 0.98),
    healthRegen: Math.max(0, healthRegenFromVitality + Math.round(totalRegen + affixHealthRegen))
  };
}

export function xpToNextLevel(level: number): number {
  if (level >= 30) return 0;
  return Math.round(100 * Math.pow(level, 1.35));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
