import {
  BASE_ACCURACY,
  BASE_CRIT_CHANCE,
  BASE_DODGE_CHANCE
} from '../constants';
import type { Armor, CoreStats, DerivedStats, HeroState, EquipmentSlot } from '../types';
import { armors } from '../../data/armors';
import { weapons } from '../../data/weapons';
import { items } from '../../data/items';
import { shields } from '../../data/shields';

type StatsCarrier = {
  dodgeBonus?: number;
  hpBonus?: number;
  maxHealth?: number;
  healthRegen?: number;
  hpRegen?: number;
  regeneration?: number;
  recovery?: number;
  healthRecovery?: number;
  hpRecovery?: number;
  lifeRegen?: number;
};

function extractItemRegen(item: StatsCarrier | undefined): number {
  if (!item) return 0;
  const rawItem = item as Record<string, unknown>;
  return Number(
    rawItem.healthRegen ??
    rawItem.hpRegen ??
    rawItem.regeneration ??
    rawItem.recovery ??
    rawItem.healthRecovery ??
    rawItem.hpRecovery ??
    rawItem.lifeRegen ??
    0
  );
}

export function calculateDerivedStats(stats: CoreStats, baseHp: number, armor?: Armor, hero?: HeroState): DerivedStats {
  let totalDodgeBonus = armor?.dodgeBonus ?? 0;
  let totalHpBonus = armor?.hpBonus ?? 0;
  let totalRegen = extractItemRegen(armor);
  let totalFlatMaxHealth = 0;

  if (hero) {
    totalDodgeBonus = 0;
    totalHpBonus = 0;
    totalRegen = 0;
    totalFlatMaxHealth = 0;

    const slots: EquipmentSlot[] = ['head', 'chest', 'legs', 'hands', 'feet', 'ring1', 'ring2', 'amulet', 'shield', 'weapon'];
    for (const slot of slots) {
      const itemId = hero.equipment?.[slot];
      if (!itemId || itemId.startsWith('fallback_') || itemId.startsWith('blank_')) {
        continue;
      }

      const durability = hero.equipmentDurability?.[slot] ?? 100;
      const factor = durability <= 0 ? 0 : 1.0;

      let itemStats: StatsCarrier | undefined = armors.find((a) => a.id.toLowerCase() === itemId.toLowerCase());
      if (!itemStats) {
        itemStats = weapons.find((w) => w.id.toLowerCase() === itemId.toLowerCase());
      }
      if (!itemStats) {
        itemStats = shields.find((s) => s.id.toLowerCase() === itemId.toLowerCase());
      }

      if (!itemStats) {
        const it = items.find((entry) => entry.id.toLowerCase() === itemId.toLowerCase());
        if (it) {
          if (
            it.dodgeBonus !== undefined ||
            it.hpBonus !== undefined ||
            it.maxHealth !== undefined ||
            it.healthRegen !== undefined
          ) {
            itemStats = it;
          } else {
            const tier = it.tier || 1;
            let multiplier = 1.0;
            if (slot === 'head' || slot === 'legs') multiplier = 0.7;
            if (slot === 'hands' || slot === 'feet') multiplier = 0.5;
            if (slot === 'ring1' || slot === 'ring2' || slot === 'amulet') multiplier = 0.2;

            itemStats = {
              dodgeBonus: tier * 0.008 * multiplier,
              hpBonus: tier * 0.02 * multiplier,
              // Dynamic regen for rings/amulets
              healthRegen: slot === 'ring1' || slot === 'ring2' || slot === 'amulet' ? Math.round(tier * 1.5 * multiplier) : 0
            };
          }
        }
      }

      if (itemStats) {
        totalDodgeBonus += (itemStats.dodgeBonus ?? 0) * factor;
        totalHpBonus += (itemStats.hpBonus ?? 0) * factor;
        totalRegen += extractItemRegen(itemStats) * factor;
        totalFlatMaxHealth += Number(itemStats.maxHealth ?? 0) * factor;
      }
    }
  }

  let affixAttackPower = 0;
  let affixMaxHealth = 0;
  let affixCritChance = 0;
  let affixDodgeChance = 0;
  let affixAccuracy = 0;
  let affixHealthRegen = 0;

  if (hero && hero.equipmentAffixes) {
    const slots: EquipmentSlot[] = ['head', 'chest', 'legs', 'hands', 'feet', 'ring1', 'ring2', 'amulet', 'shield', 'weapon'];
    for (const slot of slots) {
      const durability = hero.equipmentDurability?.[slot] ?? 100;
      const factor = durability <= 0 ? 0 : 1.0;
      const slotAffixes = hero.equipmentAffixes[slot] ?? [];

      for (const affix of slotAffixes) {
        if (affix.type === 'attackPower') affixAttackPower += affix.value * factor;
        else if (affix.type === 'maxHealth') affixMaxHealth += affix.value * factor;
        else if (affix.type === 'critChance') affixCritChance += affix.value * factor;
        else if (affix.type === 'dodgeChance') affixDodgeChance += affix.value * factor;
        else if (affix.type === 'accuracy') affixAccuracy += affix.value * factor;
        else if (affix.type === 'healthRegen') affixHealthRegen += affix.value * factor;
      }
    }
  }

  const hpFromVitality = stats.vitality * 5;
  affixMaxHealth += totalFlatMaxHealth;
  const flatHp = baseHp + hpFromVitality + affixMaxHealth;
  const maxHp = Math.round(flatHp * (1 + totalHpBonus));

  const healthRegenFromVitality = Math.floor(stats.vitality / 5);
  const finalRegen = healthRegenFromVitality + Math.round(totalRegen) + Math.round(affixHealthRegen);

  return {
    attackPower: stats.strength * 2 + affixAttackPower,
    maxHp,
    critChance: clamp(BASE_CRIT_CHANCE + stats.agility * 0.003 + affixCritChance, 0, 0.35),
    dodgeChance: clamp(BASE_DODGE_CHANCE + stats.agility * 0.002 + totalDodgeBonus + affixDodgeChance, 0, 0.25),
    accuracy: clamp(BASE_ACCURACY + stats.agility * 0.0015 + affixAccuracy, 0.65, 0.98),
    healthRegen: finalRegen
  };
}

export function xpToNextLevel(level: number): number {
  if (level >= 30) {
    return 0;
  }

  return Math.round(100 * Math.pow(level, 1.35));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
