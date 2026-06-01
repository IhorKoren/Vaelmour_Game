import type { Enemy, Location, HeroState, EncounterRank } from '../types';
import { getEquippedWeaponStats, getEquippedArmorStats } from './equipment';

/**
 * Dynamically scales an enemy's statistics based on the location's level range.
 * If the location level range is higher than the enemy's base level, the enemy's
 * HP, attack, defense, and rewards are scaled conservatively.
 */
export function scaleEnemyForLocation(enemy: Enemy, location: Location, presetLevel?: number): Enemy {
  const minLevel = location.levelRange[0] ?? 1;
  const maxLevel = location.levelRange[1] ?? minLevel;
  
  let targetLevel = presetLevel;
  if (targetLevel === undefined) {
    targetLevel = Math.floor(Math.random() * (maxLevel - minLevel + 1)) + minLevel;
  }
  
  // Guarantee clamp to location range
  targetLevel = Math.max(minLevel, Math.min(maxLevel, targetLevel));
  
  const baseLevel = enemy.level ?? 1;
  const levelDiff = targetLevel - baseLevel;

  if (levelDiff === 0) {
    return {
      ...enemy,
      level: targetLevel
    };
  }

  // hp: 12%, stats: 8%, rewards: 10% per level difference
  const hpFactor = Math.pow(1.12, levelDiff);
  const statFactor = Math.pow(1.08, levelDiff);
  const rewardFactor = Math.pow(1.10, levelDiff);

  return {
    ...enemy,
    level: targetLevel, // Scaled enemy level
    hp: Math.max(10, Math.round(enemy.hp * hpFactor)),
    attack: Math.max(1, Math.round(enemy.attack * statFactor)),
    defense: Math.max(1, Math.round(enemy.defense * statFactor)),
    armor: enemy.armor !== undefined ? Math.max(0, Math.round(enemy.armor * statFactor)) : enemy.armor,
    damageMin: enemy.damageMin !== undefined ? Math.max(1, Math.round(enemy.damageMin * statFactor)) : enemy.damageMin,
    damageMax: enemy.damageMax !== undefined ? Math.max(2, Math.round(enemy.damageMax * statFactor)) : enemy.damageMax,
    xp: Math.max(1, Math.round(enemy.xp * rewardFactor)),
    gold: Math.max(0, Math.round(enemy.gold * rewardFactor)),
    isScaled: true,
    levelDiff: levelDiff
  };
}

/**
 * Computes the hero's current approximate power level based on core stats and equipped items.
 */
export function getHeroPower(hero: HeroState): number {
  const weapon = getEquippedWeaponStats(hero);
  const armor = getEquippedArmorStats(hero);

  const levelPower = hero.level * 10;
  const statsPower = (hero.stats.strength + hero.stats.vitality + hero.stats.agility) * 2;
  const weaponPower = (weapon.minDamage + weapon.maxDamage) * 1.5;
  const armorPower = armor.defense * 2;

  return Math.round(levelPower + statsPower + weaponPower + armorPower);
}

/**
 * Computes the location's approximate threat level based on its max level range.
 */
export function getLocationThreat(location: Location): number {
  const maxLevel = location.levelRange[1];
  // Base threat factor: 15 points of threat per level
  return maxLevel * 15;
}

/**
 * Assesses the danger risk for the player traveling to a specific location.
 */
export function getLocationRiskLabel(
  hero: HeroState,
  location: Location
): 'Safe' | 'Risky' | 'Dangerous' {
  const heroPower = getHeroPower(hero);
  const locationThreat = getLocationThreat(location);

  if (heroPower >= locationThreat * 1.25) {
    return 'Safe';
  } else if (heroPower < locationThreat * 0.85) {
    return 'Dangerous';
  } else {
    return 'Risky';
  }
}

/**
 * Applies elite or boss rank-based scaling to a base scaled enemy.
 * - Elite: HP * 2.2, Damage * 1.5, Gold/XP * 1.8.
 * - Boss: HP * 3.5, Damage * 2.2, Gold/XP * 4.0.
 */
export function applyRankScaling(enemy: Enemy, rank: EncounterRank): Enemy {
  if (rank === 'normal') {
    return { ...enemy, rank };
  }

  const isElite = rank === 'elite';
  const hpMultiplier = isElite ? 2.2 : 3.5;
  const dmgMultiplier = isElite ? 1.5 : 2.2;
  const rewardMultiplier = isElite ? 1.8 : 4.0;

  return {
    ...enemy,
    rank,
    hp: Math.max(10, Math.round(enemy.hp * hpMultiplier)),
    damageMin: enemy.damageMin !== undefined ? Math.max(1, Math.round(enemy.damageMin * dmgMultiplier)) : enemy.damageMin,
    damageMax: enemy.damageMax !== undefined ? Math.max(2, Math.round(enemy.damageMax * dmgMultiplier)) : enemy.damageMax,
    xp: Math.max(1, Math.round(enemy.xp * rewardMultiplier)),
    gold: Math.max(0, Math.round(enemy.gold * rewardMultiplier)),
    notes: enemy.notes + ` [Rank: ${rank}]`
  };
}

export const eliteAffixTranslations: Record<string, string> = {
  'Blood-Starved': 'Кровожерний',
  'Ironbound': 'Залізошкурий',
  'Ash-Cursed': 'Попелястий',
  'Ravager': 'Спустошливий',
  'Undying': 'Безсмертний'
};

/**
 * Deterministically rolls whether a spawned enemy should be upgraded to an elite rank (8% base chance).
 */
export function rollEliteOrNormal(enemy: Enemy, random: () => number = Math.random): Enemy {
  if (random() > 0.08) {
    return { ...enemy, rank: 'normal' as const };
  }

  const affixes = ['Blood-Starved', 'Ironbound', 'Ash-Cursed', 'Ravager', 'Undying'];
  const rolledAffix = affixes[Math.floor(random() * affixes.length)];
  const translatedAffix = eliteAffixTranslations[rolledAffix] || rolledAffix;

  const eliteEnemy = {
    ...enemy,
    name: `${translatedAffix} ${enemy.name}`,
    rank: 'elite' as const
  };

  return applyRankScaling(eliteEnemy, 'elite');
}

/**
 * Triggers a boss encounter based on the location's boss name.
 * Finds the boss definition in bosses.json and returns a scaled Boss Enemy structure.
 */
export function getBossForLocation(
  locationName: string,
  bossName: string,
  bossesList: Array<{ id: string; name: string; level: number; hp: number; damageMin: number; damageMax?: number; phaseMechanics?: string }>
): Enemy | null {
  const bossDef = bossesList.find(b => 
    b.name.toLowerCase() === bossName.toLowerCase() || 
    bossName.toLowerCase().includes(b.name.toLowerCase()) || 
    b.id.toLowerCase().includes(bossName.toLowerCase().replace(/\s+/g, '_'))
  );

  if (!bossDef) return null;

  const baseBoss: Enemy = {
    id: bossDef.id,
    name: bossDef.name,
    level: bossDef.level,
    levelRange: [bossDef.level, bossDef.level],
    hp: bossDef.hp,
    damageMin: bossDef.damageMin,
    damageMax: bossDef.damageMax !== undefined ? Math.abs(bossDef.damageMax) : 40,
    attack: Math.round(bossDef.level * 4),
    defense: Math.round(bossDef.level * 1.5),
    critChance: 0.10,
    dodgeChance: 0.05,
    xp: bossDef.level * 50,
    gold: bossDef.level * 20,
    location: locationName,
    lootTable: 'boss_loot_table',
    behavior: 'boss',
    notes: `Special: ${bossDef.phaseMechanics || ''}`
  };

  return applyRankScaling(baseBoss, 'boss');
}
