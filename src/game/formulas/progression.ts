export type CoreStats = {
  strength: number;
  vitality: number;
  agility: number;
};

export type StatBonuses = {
  hpBonus?: number;
  dodgeBonus?: number;
  critBonus?: number;
  armorValue?: number;
  critDamageBonus?: number; // Optional custom extension for robust support
};

export type FullDerivedStats = {
  maxHp: number;
  attackPower: number;
  critChance: number;
  critDamageMultiplier: number;
  dodgeChance: number;
  armorReduction: number;
};

export type EnemyScaledStats = {
  hp: number;
  damage: number;
  armor: number;
  critChance: number;
};

/**
 * Calculates base HP based on player level and vitality points.
 * Formula: 100 + level * 10 + vitality * 5
 */
export function calculateBaseHp(level: number, vitality: number): number {
  return 100 + level * 10 + vitality * 5;
}

/**
 * Recalculates player derived combat stats based on core attributes, levels,
 * armor ratings, and optional stat modifiers.
 * All derived parameters are clamped to authoritative PvE caps.
 */
export function calculateFullDerivedStats(
  stats: CoreStats,
  level: number,
  armorValue?: number,
  bonuses?: StatBonuses
): FullDerivedStats {
  // 1. Max HP calculation with hpBonus multiplier
  const baseHp = calculateBaseHp(level, stats.vitality);
  const hpBonusVal = bonuses?.hpBonus ?? 0;
  const maxHp = Math.round(baseHp * (1 + hpBonusVal));

  // 2. Attack Power (Strength * 2)
  const attackPower = stats.strength * 2;

  // 3. Crit Chance (5% base + Agility * 0.1% + bonuses)
  // PvE Cap: 35% (0.35)
  const critChanceBase = 0.05 + stats.agility * 0.001 + (bonuses?.critBonus ?? 0);
  const critChance = Math.max(0, Math.min(0.35, critChanceBase));

  // 4. Crit Damage Multiplier (150% base + bonuses)
  // PvE Cap: 220% (2.20)
  const critDamageBase = 1.50 + (bonuses?.critDamageBonus ?? 0);
  const critDamageMultiplier = Math.max(0, Math.min(2.20, critDamageBase));

  // 5. Dodge Chance (Agility * 0.05% + bonuses)
  // PvE Cap: 30% (0.30)
  const dodgeChanceBase = stats.agility * 0.0005 + (bonuses?.dodgeBonus ?? 0);
  const dodgeChance = Math.max(0, Math.min(0.30, dodgeChanceBase));

  // 6. Armor Reduction (Armor / (Armor + 100))
  // PvE Cap: 60% (0.60)
  const totalArmor = (armorValue ?? 0) + (bonuses?.armorValue ?? 0);
  const armorReduction = totalArmor > 0 
    ? Math.max(0, Math.min(0.60, totalArmor / (totalArmor + 100)))
    : 0;

  return {
    maxHp,
    attackPower,
    critChance,
    critDamageMultiplier,
    dodgeChance,
    armorReduction,
  };
}

/**
 * Calculates XP required to advance from the current level to the next.
 * Cap: Max level is 30, returns 0.
 */
export function xpRequiredForLevel(level: number): number {
  if (level >= 30) {
    return 0;
  }
  return Math.round(100 * Math.pow(level, 1.35));
}

/**
 * Evaluates whether the hero gains any levels based on current level and accumulated XP.
 * Continuously advances levels and awards 3 attribute points per level gained.
 */
export function checkLevelUp(
  currentLevel: number,
  currentXp: number
): { newLevel: number; remainingXp: number; statPointsGained: number } {
  let newLevel = currentLevel;
  let remainingXp = currentXp;
  let statPointsGained = 0;

  while (newLevel < 30) {
    const requiredXp = xpRequiredForLevel(newLevel);
    if (remainingXp >= requiredXp) {
      remainingXp -= requiredXp;
      newLevel += 1;
      statPointsGained += 3;
    } else {
      break;
    }
  }

  return {
    newLevel,
    remainingXp,
    statPointsGained,
  };
}

/**
 * Spends one unspent attribute point to increment a chosen core stat.
 * Returns unmodified values if no unspent points are available.
 */
export function allocateStatPoint(
  stats: CoreStats,
  stat: "strength" | "vitality" | "agility",
  unspentPoints: number
): { stats: CoreStats; unspentPoints: number } {
  if (unspentPoints <= 0) {
    return { stats, unspentPoints };
  }

  const updatedStats = {
    ...stats,
    [stat]: stats[stat] + 1,
  };

  return {
    stats: updatedStats,
    unspentPoints: unspentPoints - 1,
  };
}

/**
 * Scales enemy stats (HP, Damage, Armor, Crit) dynamically based on their level and archetype.
 */
export function calculateEnemyStats(
  level: number,
  archetype: "normal" | "elite" | "boss",
  archetypeBonus?: number
): EnemyScaledStats {
  const bonus = archetypeBonus ?? 0;

  // 1. Enemy HP (80 + Level * 18 + TierBonus)
  const baseHp = 80 + level * 18 + bonus;
  let hp = baseHp;
  if (archetype === "elite") {
    hp = Math.round(baseHp * 1.8);
  } else if (archetype === "boss") {
    hp = Math.round(baseHp * 3.5);
  }

  // 2. Enemy Damage (WeaponBase + Level * 1.8)
  const weaponBase = 5; // Baselines matching early Rust-Cut weapons (Tier 1 Sword: 4-7 damage)
  const baseDamage = weaponBase + level * 1.8;
  let damage = baseDamage;
  if (archetype === "elite") {
    damage = Math.round(baseDamage * 1.25);
  } else if (archetype === "boss") {
    damage = Math.round(baseDamage * 1.45);
  }

  // 3. Enemy Armor (Level * 2.2 + archetype bonus)
  const armor = Math.round(level * 2.2 + bonus);

  // 4. Enemy Crit Chance (3% + Level * 0.2%)
  // Normal enemies are capped at 12% (0.12)
  const baseCrit = 0.03 + level * 0.002;
  let critChance = baseCrit;
  if (archetype === "normal") {
    critChance = Math.min(0.12, baseCrit);
  }

  return {
    hp,
    damage: Math.round(damage),
    armor,
    critChance,
  };
}
