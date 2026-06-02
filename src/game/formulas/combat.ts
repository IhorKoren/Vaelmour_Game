import type { Armor, Enemy, HeroState, Skill, Weapon } from '../types';
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
  rageRefund?: number;
  bleedApplied?: { damage: number; ticks: number };
  staggerApplied?: number;
  nextHitDamageReduction?: number;
  poiseShred?: number;
};

const CRIT_SOFT_CAP = 0.25;
const CRIT_HARD_CAP = 0.4;
const DODGE_CAP = 0.35;
const BLOCK_CAP = 0.45;
const ARMOR_PEN_CAP = 0.6;
const STUN_CHANCE_CAP = 0.3;
const BLEED_CHANCE_CAP = 0.45;
const LIFE_STEAL_CAP = 0.15;
const DAMAGE_REDUCTION_CAP = 0.65;
const MIN_HIT_CHANCE = 0.65;
const MAX_HIT_CHANCE = 0.98;

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
  const skillProfile = getSkillProfile(params.skill.id);

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
      log: `${params.hero.name} used ${params.skill.name}, but missed.`
    };
  }

  const weaponRoll = roll(params.weapon.minDamage, params.weapon.maxDamage, random);
  const rawDamage = weaponRoll + derived.attackPower * 0.25;
  const baseSkillDamage = rawDamage * skillProfile.damageMultiplier;
  const effectiveArmorPenetration = clamp(
    secondary.armorPenetration + skillProfile.armorPenetration,
    0,
    ARMOR_PEN_CAP
  );
  const targetArmor = Number(params.enemy.armor ?? params.enemy.defense ?? 0);
  const effectiveArmor = Math.max(0, targetArmor * (1 - effectiveArmorPenetration));
  const armorReduction = getArmorDamageReduction(effectiveArmor, params.enemy.level ?? 1);

  let conditionalMultiplier = 1 + secondary.damageBonus;
  const enemyHpRatio = (params.currentEnemyHp ?? params.enemy.hp) / Math.max(1, params.enemy.hp);
  if (skillProfile.bonusVsBleeding && params.targetBleeding) {
    conditionalMultiplier *= 1 + skillProfile.bonusVsBleeding;
  }
  if (skillProfile.executeBelowHp && enemyHpRatio <= skillProfile.executeBelowHp) {
    conditionalMultiplier *= 1 + skillProfile.executeBonus + secondary.executeDamage;
  }

  const mitigatedDamage = Math.max(
    1,
    Math.round(baseSkillDamage * (1 - armorReduction) * conditionalMultiplier)
  );

  const critChance = applySoftCap(derived.critChance, CRIT_SOFT_CAP, CRIT_HARD_CAP);
  const crit = random() < critChance;
  const critMultiplier = crit ? 1.5 + secondary.critDamageBonus : 1;
  const finalDamage = Math.max(1, Math.round(mitigatedDamage * critMultiplier));
  const lifesteal = Math.max(0, Math.round(finalDamage * clamp(secondary.lifesteal, 0, LIFE_STEAL_CAP)));

  const finalBleedChance = clamp(
    (secondary.bleedChance + skillProfile.bleedChance) * (1 - Math.max(0, params.enemy.bleedResist ?? 0)),
    0,
    BLEED_CHANCE_CAP
  );
  const bleedApplied = finalBleedChance > 0 && random() < finalBleedChance
    ? {
        damage: Math.max(1, Math.round(rawDamage * (skillProfile.bleedDamageRatio + 0.2 + secondary.bleedDamage))),
        ticks: Math.max(1, skillProfile.bleedTicks || 5)
      }
    : undefined;

  const finalStunChance = clamp(skillProfile.staggerPower, 0, STUN_CHANCE_CAP);
  const staggerApplied = finalStunChance > 0 && random() < finalStunChance ? 1 : 0;
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
      return { damageMultiplier: 1.15, armorPenetration: 0, bleedChance: 0.25, bleedDamageRatio: 0.12, bleedTicks: 5, bonusVsBleeding: 0, rageRefundOnCrit: 0, staggerPower: 0, nextHitDamageReduction: 0, poiseShred: 0, executeBelowHp: 0, executeBonus: 0 };
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

