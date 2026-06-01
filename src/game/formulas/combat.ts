import type { Armor, Enemy, HeroState, Skill, Weapon, EquipmentSlot } from '../types';
import { calculateDerivedStats } from './stats';
import { armors } from '../../data/armors';
import { items } from '../../data/items';
import { calculateSecondaryStats } from './secondaryStats';
import { shields } from '../../data/shields';

type CombatItemStats = {
  defense?: number;
  armor?: number;
  damageBonus?: number;
};

export type DamageResult = {
  hit: boolean;
  crit: boolean;
  damage: number;
  log: string;
  lifesteal?: number;
  blocked?: boolean;
  counterDamage?: number;
  rageRefund?: number;
  bleedApplied?: { damage: number; ticks: number };
  staggerApplied?: number;
  nextHitDamageReduction?: number;
  poiseShred?: number;
};

export function calculateHeroDamage(params: {
  hero: HeroState;
  weapon: Weapon;
  armor: Armor;
  skill: Skill;
  enemy: Enemy;
  currentEnemyHp?: number;
  targetBleeding?: boolean;
  random?: () => number;
}): DamageResult {
  const random = params.random ?? Math.random;
  const derived = calculateDerivedStats(params.hero.stats, params.hero.baseHp, undefined, params.hero);
  const secondary = calculateSecondaryStats(params.hero);

  const hitRoll = random();
  const enemyDodgeRoll = random();

  if (hitRoll > derived.accuracy || enemyDodgeRoll < params.enemy.dodgeChance) {
    return {
      hit: false,
      crit: false,
      damage: 0,
      log: `${params.hero.name} used ${params.skill.name}, but missed.`
    };
  }

  // Calculate sum of damage bonus from all slots
  let totalDamageBonus = secondary.damageBonus;
  const slots: EquipmentSlot[] = ['head', 'chest', 'legs', 'hands', 'feet', 'ring1', 'ring2', 'amulet', 'shield'];
  for (const slot of slots) {
    const itemId = params.hero.equipment?.[slot];
    if (!itemId || itemId.startsWith('fallback_') || itemId.startsWith('blank_')) {
      continue;
    }
    const durability = params.hero.equipmentDurability?.[slot] ?? 100;
    const factor = durability <= 0 ? 0 : 1.0;

    let itemStats: CombatItemStats | undefined = armors.find((a) => a.id.toLowerCase() === itemId.toLowerCase()) as CombatItemStats | undefined;
    if (!itemStats) {
      itemStats = shields.find((s) => s.id.toLowerCase() === itemId.toLowerCase()) as CombatItemStats | undefined;
    }
    if (!itemStats) {
      const it = items.find((entry) => entry.id.toLowerCase() === itemId.toLowerCase());
      if (it) {
        if (it.damageBonus !== undefined || it.defense !== undefined || it.armor !== undefined) {
          itemStats = it;
        } else {
          const tier = it.tier || 1;
          let multiplier = 1.0;
          if (slot === 'head' || slot === 'legs') multiplier = 0.7;
          if (slot === 'hands' || slot === 'feet') multiplier = 0.5;
          if (slot === 'ring1' || slot === 'ring2' || slot === 'amulet') multiplier = 0.2;

          itemStats = { damageBonus: tier * 0.01 * multiplier };
        }
      }
    }
    if (itemStats) {
      totalDamageBonus += (itemStats.damageBonus ?? 0) * factor;
    }
  }

  const weaponRoll = roll(params.weapon.minDamage, params.weapon.maxDamage, random);
  const skillProfile = getSkillProfile(params.skill.id);
  const rawDamage = weaponRoll + derived.attackPower * 0.25;
  const baseSkillDamage = rawDamage * skillProfile.damageMultiplier;
  const enemyDefense = Math.max(0, params.enemy.defense);
  const effectiveArmorPenetration = clampSecondaryValue(secondary.armorPenetration + skillProfile.armorPenetration, 0, 0.6);
  const effectiveEnemyDefense = Math.max(0, enemyDefense * (1 - effectiveArmorPenetration));
  const armorReduction = Math.min(effectiveEnemyDefense / (effectiveEnemyDefense + 100), 0.6);
  let conditionalMultiplier = 1 + totalDamageBonus;
  const enemyHpRatio = (params.currentEnemyHp ?? params.enemy.hp) / Math.max(1, params.enemy.hp);
  if (skillProfile.bonusVsBleeding && params.targetBleeding) {
    conditionalMultiplier *= 1 + skillProfile.bonusVsBleeding;
  }
  if (skillProfile.executeBelowHp && enemyHpRatio <= skillProfile.executeBelowHp) {
    conditionalMultiplier *= 1 + skillProfile.executeBonus + secondary.executeDamage;
  }
  const mitigatedDamage = Math.max(1, Math.round(baseSkillDamage * (1 - armorReduction) * conditionalMultiplier));

  // Sum critDamage affixes from all slots
  let critDamageBonus = 0;
  if (params.hero.equipmentAffixes) {
    const slots: EquipmentSlot[] = ['head', 'chest', 'legs', 'hands', 'feet', 'ring1', 'ring2', 'amulet', 'shield', 'weapon'];
    for (const slot of slots) {
      const durability = params.hero.equipmentDurability?.[slot] ?? 100;
      const factor = durability <= 0 ? 0 : 1.0;
      const slotAffixes = params.hero.equipmentAffixes[slot] ?? [];
      for (const affix of slotAffixes) {
        if (affix.type === 'critDamage') {
          critDamageBonus += affix.value * factor;
        }
      }
    }
  }

  const crit = random() < derived.critChance;
  const critMultiplier = crit ? Math.min(2.2, 1.5 + critDamageBonus + secondary.critDamageBonus) : 1;
  const finalDamage = Math.max(1, Math.round(mitigatedDamage * critMultiplier));
  const lifesteal = secondary.lifesteal > 0 ? Math.max(0, Math.round(finalDamage * secondary.lifesteal)) : 0;
  const bleedApplied = skillProfile.bleedChance > 0
    ? random() < skillProfile.bleedChance
      ? { damage: Math.max(1, Math.round(finalDamage * (skillProfile.bleedDamageRatio + secondary.bleedDamage))), ticks: skillProfile.bleedTicks }
      : undefined
    : undefined;
  const staggerApplied = skillProfile.staggerPower > 0 ? skillProfile.staggerPower + secondary.staggerPower : undefined;
  const rageRefund = crit && skillProfile.rageRefundOnCrit > 0 ? skillProfile.rageRefundOnCrit : 0;

  return {
    hit: true,
    crit,
    damage: finalDamage,
    lifesteal,
    rageRefund,
    bleedApplied,
    staggerApplied,
    nextHitDamageReduction: skillProfile.nextHitDamageReduction,
    poiseShred: skillProfile.poiseShred,
    log: `${params.hero.name} used ${params.skill.name} for ${finalDamage} damage${crit ? ' (crit)' : ''}.`
  };
}

export function calculateEnemyDamage(params: {
  enemy: Enemy;
  hero: HeroState;
  armor: Armor;
  random?: () => number;
}): DamageResult {
  const random = params.random ?? Math.random;
  const derived = calculateDerivedStats(params.hero.stats, params.hero.baseHp, undefined, params.hero);
  const secondary = calculateSecondaryStats(params.hero);

  if (random() < derived.dodgeChance) {
    return {
      hit: false,
      crit: false,
      damage: 0,
      log: `${params.hero.name} dodged ${params.enemy.name}'s attack.`
    };
  }

  // Calculate sum of defense from all slots
  let totalDefense = secondary.defense;
  const slots: EquipmentSlot[] = ['head', 'chest', 'legs', 'hands', 'feet', 'ring1', 'ring2', 'amulet', 'shield'];
  for (const slot of slots) {
    const itemId = params.hero.equipment?.[slot];
    if (!itemId || itemId.startsWith('fallback_') || itemId.startsWith('blank_')) {
      continue;
    }
    const durability = params.hero.equipmentDurability?.[slot] ?? 100;
    const factor = durability <= 0 ? 0 : 1.0;

    let itemStats: CombatItemStats | undefined = armors.find((a) => a.id.toLowerCase() === itemId.toLowerCase()) as CombatItemStats | undefined;
    if (!itemStats) {
      itemStats = shields.find((s) => s.id.toLowerCase() === itemId.toLowerCase()) as CombatItemStats | undefined;
    }
    if (!itemStats) {
      const it = items.find((entry) => entry.id.toLowerCase() === itemId.toLowerCase());
      if (it) {
        if (it.defense !== undefined || it.armor !== undefined || it.damageBonus !== undefined) {
          itemStats = it;
        } else {
          const tier = it.tier || 1;
          let multiplier = 1.0;
          if (slot === 'head' || slot === 'legs') multiplier = 0.7;
          if (slot === 'hands' || slot === 'feet') multiplier = 0.5;
          if (slot === 'ring1' || slot === 'ring2' || slot === 'amulet') multiplier = 0.2;

          itemStats = { defense: Math.round(tier * 5 * multiplier) };
        }
      }
    }
    if (itemStats) {
      totalDefense += (itemStats.defense ?? itemStats.armor ?? 0) * factor;
    }

    // Sum armor affixes from slots
    const slotAffixes = params.hero.equipmentAffixes?.[slot] ?? [];
    for (const affix of slotAffixes) {
      if (affix.type === 'armor') {
        totalDefense += affix.value * factor;
      }
    }
  }

  let effectiveDefense = totalDefense;
  if (params.hero.currentHp / Math.max(1, params.hero.maxHp) <= 0.3) {
    effectiveDefense += Math.round(totalDefense * secondary.lowHpArmorBonus);
  }

  const armorReduction = Math.min(Math.max(0, effectiveDefense) / (Math.max(0, effectiveDefense) + 100), 0.6);
  const mitigatedDamage = Math.max(1, Math.round(params.enemy.attack * (1 - armorReduction)));
  const crit = random() < params.enemy.critChance;
  const critMultiplier = crit ? 1.4 : 1;
  let damage = Math.max(1, Math.round(mitigatedDamage * critMultiplier));
  let blocked = false;

  if (secondary.blockChance > 0 && random() < secondary.blockChance) {
    blocked = true;
    damage = Math.max(1, damage - Math.round(secondary.blockValue));
  }

  if (secondary.damageReductionHighHp > 0 && params.hero.currentHp / Math.max(1, params.hero.maxHp) > 0.7) {
    damage = Math.max(1, Math.round(damage * (1 - secondary.damageReductionHighHp)));
  }

  const counterTriggered = secondary.counterChance > 0 && random() < secondary.counterChance;
  const counterDamage = counterTriggered
    ? Math.max(1, Math.round(calculateDerivedStats(params.hero.stats, params.hero.baseHp, undefined, params.hero).attackPower * (0.35 + secondary.counterDamage)))
    : 0;

  return {
    hit: true,
    crit,
    damage,
    blocked,
    counterDamage,
    log: `${params.enemy.name} hits for ${damage} damage${crit ? ' (crit)' : ''}.`
  };
}

type SkillProfile = {
  damageMultiplier: number;
  armorPenetration: number;
  bleedChance: number;
  bleedDamageRatio: number;
  bleedTicks: number;
  bonusVsBleeding: number;
  rageRefundOnCrit: number;
  staggerPower: number;
  nextHitDamageReduction: number;
  poiseShred: number;
  executeBelowHp: number;
  executeBonus: number;
};

function getSkillProfile(skillId: string): SkillProfile {
  switch (skillId) {
    case 'skill_03_sword_quick_slash':
      return { damageMultiplier: 1.1, armorPenetration: 0, bleedChance: 0, bleedDamageRatio: 0, bleedTicks: 0, bonusVsBleeding: 0, rageRefundOnCrit: 5, staggerPower: 0, nextHitDamageReduction: 0, poiseShred: 0, executeBelowHp: 0, executeBonus: 0 };
    case 'skill_08_sword_guard_counter':
      return { damageMultiplier: 1.3, armorPenetration: 0, bleedChance: 0, bleedDamageRatio: 0, bleedTicks: 0, bonusVsBleeding: 0, rageRefundOnCrit: 0, staggerPower: 0, nextHitDamageReduction: 0.1, poiseShred: 0, executeBelowHp: 0, executeBonus: 0 };
    case 'skill_15_sword_piercing_strike':
      return { damageMultiplier: 1.2, armorPenetration: 0.25, bleedChance: 0, bleedDamageRatio: 0, bleedTicks: 0, bonusVsBleeding: 0, rageRefundOnCrit: 0, staggerPower: 0, nextHitDamageReduction: 0, poiseShred: 0, executeBelowHp: 0, executeBonus: 0 };
    case 'skill_25_sword_blade_flurry':
      return { damageMultiplier: 2.2, armorPenetration: 0, bleedChance: 0, bleedDamageRatio: 0, bleedTicks: 0, bonusVsBleeding: 0, rageRefundOnCrit: 0, staggerPower: 0, nextHitDamageReduction: 0, poiseShred: 0, executeBelowHp: 0, executeBonus: 0 };
    case 'skill_03_axe_cleave':
      return { damageMultiplier: 1.15, armorPenetration: 0, bleedChance: 0.25, bleedDamageRatio: 0.12, bleedTicks: 3, bonusVsBleeding: 0, rageRefundOnCrit: 0, staggerPower: 0, nextHitDamageReduction: 0, poiseShred: 0, executeBelowHp: 0, executeBonus: 0 };
    case 'skill_08_axe_frenzied_swings':
      return { damageMultiplier: 1, armorPenetration: 0, bleedChance: 0, bleedDamageRatio: 0, bleedTicks: 0, bonusVsBleeding: 0, rageRefundOnCrit: 0, staggerPower: 0, nextHitDamageReduction: 0, poiseShred: 0, executeBelowHp: 0, executeBonus: 0 };
    case 'skill_15_axe_executioner_strike':
      return { damageMultiplier: 1.3, armorPenetration: 0, bleedChance: 0, bleedDamageRatio: 0, bleedTicks: 0, bonusVsBleeding: 0.25, rageRefundOnCrit: 0, staggerPower: 0, nextHitDamageReduction: 0, poiseShred: 0, executeBelowHp: 0, executeBonus: 0 };
    case 'skill_25_axe_bloodstorm':
      return { damageMultiplier: 1, armorPenetration: 0, bleedChance: 1, bleedDamageRatio: 0.3, bleedTicks: 5, bonusVsBleeding: 0, rageRefundOnCrit: 0, staggerPower: 0, nextHitDamageReduction: 0, poiseShred: 0, executeBelowHp: 0, executeBonus: 0 };
    case 'skill_03_hammer_crushing_blow':
      return { damageMultiplier: 1.25, armorPenetration: 0, bleedChance: 0, bleedDamageRatio: 0, bleedTicks: 0, bonusVsBleeding: 0, rageRefundOnCrit: 0, staggerPower: 0.28, nextHitDamageReduction: 0, poiseShred: 0, executeBelowHp: 0, executeBonus: 0 };
    case 'skill_08_hammer_iron_impact':
      return { damageMultiplier: 1.15, armorPenetration: 0, bleedChance: 0, bleedDamageRatio: 0, bleedTicks: 0, bonusVsBleeding: 0, rageRefundOnCrit: 0, staggerPower: 0.18, nextHitDamageReduction: 0, poiseShred: 0.1, executeBelowHp: 0, executeBonus: 0 };
    case 'skill_15_hammer_earthbreaker':
      return { damageMultiplier: 1.5, armorPenetration: 0, bleedChance: 0, bleedDamageRatio: 0, bleedTicks: 0, bonusVsBleeding: 0, rageRefundOnCrit: 0, staggerPower: 0.2, nextHitDamageReduction: 0, poiseShred: 0, executeBelowHp: 0, executeBonus: 0.2 };
    case 'skill_25_hammer_skullcrusher':
      return { damageMultiplier: 1.9, armorPenetration: 0, bleedChance: 0, bleedDamageRatio: 0, bleedTicks: 0, bonusVsBleeding: 0, rageRefundOnCrit: 0, staggerPower: 0.35, nextHitDamageReduction: 0, poiseShred: 0, executeBelowHp: 0.3, executeBonus: 0.3 };
    default:
      return { damageMultiplier: 1, armorPenetration: 0, bleedChance: 0, bleedDamageRatio: 0, bleedTicks: 0, bonusVsBleeding: 0, rageRefundOnCrit: 0, staggerPower: 0, nextHitDamageReduction: 0, poiseShred: 0, executeBelowHp: 0, executeBonus: 0 };
  }
}

function clampSecondaryValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roll(min: number, max: number, random: () => number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}
