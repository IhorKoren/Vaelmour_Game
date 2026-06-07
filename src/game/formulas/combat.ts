import type { Armor, Enemy, HeroState, Weapon } from '../types';
import { calculateDerivedStats } from './stats';
import { calculateSecondaryStats } from './secondaryStats';

export type DamageResult = {
  hit: boolean;
  crit: boolean;
  damage: number;
  log: string;
  lifesteal?: number;
  blocked?: boolean;
  counterDamage?: number;
  bleedApplied?: { damage: number; ticks: number };
};

const CRIT_SOFT_CAP = 0.25;
const CRIT_HARD_CAP = 0.4;
const DODGE_CAP = 0.35;
const BLOCK_CAP = 0.45;
const ARMOR_PEN_CAP = 0.6;
const BLEED_CHANCE_CAP = 0.45;
const LIFE_STEAL_CAP = 0.15;
const DAMAGE_REDUCTION_CAP = 0.65;
const MIN_HIT_CHANCE = 0.65;
const MAX_HIT_CHANCE = 0.98;

export function calculateHeroDamage(params: {
  hero: HeroState;
  weapon: Weapon;
  armor: Armor;
  enemy: Enemy;
  currentEnemyHp?: number;
  random?: () => number;
}): DamageResult {
  const random = params.random ?? Math.random;
  const derived = calculateDerivedStats(params.hero.stats, params.hero.baseHp, undefined, params.hero);
  const secondary = calculateSecondaryStats(params.hero);

  const hitChance = clamp(
    derived.accuracy - Math.max(0, params.enemy.dodgeChance ?? 0),
    MIN_HIT_CHANCE,
    MAX_HIT_CHANCE
  );
  if (random() > hitChance) {
    return {
      hit: false,
      crit: false,
      damage: 0,
      log: `${params.hero.name} misses.`
    };
  }

  const weaponRoll = roll(params.weapon.minDamage, params.weapon.maxDamage, random);
  const rawDamage = weaponRoll + derived.attackPower * 0.25;
  const effectiveArmorPenetration = clamp(
    secondary.armorPenetration,
    0,
    ARMOR_PEN_CAP
  );
  const targetArmor = Number(params.enemy.armor ?? params.enemy.defense ?? 0);
  const effectiveArmor = Math.max(0, targetArmor * (1 - effectiveArmorPenetration));
  const armorReduction = getArmorDamageReduction(effectiveArmor, params.enemy.level ?? 1);

  let conditionalMultiplier = 1 + secondary.damageBonus;
  const enemyHpRatio = (params.currentEnemyHp ?? params.enemy.hp) / Math.max(1, params.enemy.hp);
  if (enemyHpRatio <= 0.3 && secondary.executeDamage > 0) {
    conditionalMultiplier *= 1 + secondary.executeDamage;
  }

  const mitigatedDamage = Math.max(
    1,
    Math.round(rawDamage * (1 - armorReduction) * conditionalMultiplier)
  );

  const critChance = applySoftCap(derived.critChance, CRIT_SOFT_CAP, CRIT_HARD_CAP);
  const crit = random() < critChance;
  const critMultiplier = crit ? 1.5 + secondary.critDamageBonus : 1;
  const finalDamage = Math.max(1, Math.round(mitigatedDamage * critMultiplier));
  const lifesteal = Math.max(0, Math.round(finalDamage * clamp(secondary.lifesteal, 0, LIFE_STEAL_CAP)));

  const finalBleedChance = clamp(
    secondary.bleedChance * (1 - Math.max(0, params.enemy.bleedResist ?? 0)),
    0,
    BLEED_CHANCE_CAP
  );
  const bleedApplied = finalBleedChance > 0 && random() < finalBleedChance
    ? {
        damage: Math.max(1, Math.round(rawDamage * (0.2 + secondary.bleedDamage))),
        ticks: 5
      }
    : undefined;

  return {
    hit: true,
    crit,
    damage: finalDamage,
    lifesteal,
    bleedApplied,
    log: `${params.hero.name} hits for ${finalDamage} damage${crit ? ' (crit)' : ''}.`
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

  const dodgeChance = clamp(derived.dodgeChance, 0, DODGE_CAP);
  const hitChance = clamp(1 - dodgeChance, MIN_HIT_CHANCE, MAX_HIT_CHANCE);
  if (random() > hitChance) {
    return {
      hit: false,
      crit: false,
      damage: 0,
      log: `${params.hero.name} dodged ${params.enemy.name}'s attack.`
    };
  }

  let effectiveDefense = secondary.defense;
  if (params.hero.currentHp / Math.max(1, params.hero.maxHp) <= 0.3) {
    effectiveDefense += Math.round(secondary.defense * secondary.lowHpArmorBonus);
  }

  const armorReduction = getArmorDamageReduction(effectiveDefense, params.enemy.level ?? 1);
  const enemyDamageBase =
    params.enemy.damageMin !== undefined && params.enemy.damageMax !== undefined
      ? roll(params.enemy.damageMin, params.enemy.damageMax, random)
      : params.enemy.attack;
  const mitigatedDamage = Math.max(1, Math.round(enemyDamageBase * (1 - armorReduction)));

  const crit = random() < Math.max(0, params.enemy.critChance ?? 0);
  const critMultiplier = crit ? 1.5 : 1;
  let damage = Math.max(1, Math.round(mitigatedDamage * critMultiplier));
  let blocked = false;

  const blockChance = clamp(secondary.blockChance, 0, BLOCK_CAP);
  if (blockChance > 0 && random() < blockChance) {
    blocked = true;
    damage = Math.max(1, damage - Math.round(secondary.blockValue));
  }

  const flatReduction = clamp(secondary.damageReductionHighHp, 0, DAMAGE_REDUCTION_CAP);
  if (flatReduction > 0) {
    damage = Math.max(1, Math.round(damage * (1 - flatReduction)));
  }

  const counterTriggered = secondary.counterChance > 0 && random() < secondary.counterChance;
  const counterDamage = counterTriggered
    ? Math.max(
        1,
        Math.round(calculateDerivedStats(params.hero.stats, params.hero.baseHp, undefined, params.hero).attackPower * (0.35 + secondary.counterDamage))
      )
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

function getArmorDamageReduction(armor: number, attackerLevel: number): number {
  const reduction = armor / (armor + Math.max(1, attackerLevel) * 50);
  return clamp(reduction, 0, DAMAGE_REDUCTION_CAP);
}

function applySoftCap(value: number, softCap: number, hardCap: number): number {
  if (value <= softCap) {
    return value;
  }
  return Math.min(hardCap, softCap + (value - softCap) * 0.5);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roll(min: number, max: number, random: () => number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}
