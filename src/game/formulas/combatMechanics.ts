// Vaelmour Combat Mechanics - Rage System Foundation

// Constants
export const MAX_RAGE = 100;
export const RAGE_FROM_DAMAGE_DEALT = 0.12;
export const RAGE_FROM_DAMAGE_TAKEN = 0.18;

/**
 * Clamps a Rage value between 0 and the maximum limit.
 */
export function clampRage(value: number, maxRage: number = MAX_RAGE): number {
  return Math.max(0, Math.min(maxRage, Math.round(value)));
}

/**
 * Calculates Rage gained from damage dealt according to the combat design.
 */
export function getRageFromDamageDealt(damage: number, bonusMultiplier = 0): number {
  return clampRage(damage * RAGE_FROM_DAMAGE_DEALT * (1 + bonusMultiplier));
}

/**
 * Calculates Rage gained from damage taken according to the combat design.
 */
export function getRageFromDamageTaken(damage: number): number {
  return clampRage(damage * RAGE_FROM_DAMAGE_TAKEN);
}

/**
 * Validates whether the hero has enough Rage to use a manual skill.
 */
export function canUseSkill(currentRage: number, cost: number): boolean {
  return currentRage >= cost;
}

/**
 * Deducts a skill's Rage cost and clamps the result.
 */
export function spendRage(currentRage: number, cost: number): number {
  return clampRage(currentRage - cost);
}

/**
 * Maps a skill's name or metadata into its temporary target Rage cost.
 */
export function getSkillRageCost(skillName: string, costFromData: number): number {
  const lowerName = skillName.toLowerCase();
  
  // Slash / light offensive skill: 20 Rage
  if (lowerName.includes('slash') || lowerName.includes('cleave')) {
    return 20;
  }
  
  // Guard / defensive skill: 25 Rage
  if (lowerName.includes('guard') || lowerName.includes('counter')) {
    return 25;
  }
  
  // Dodge / mobility / speed skill: 25 Rage
  if (lowerName.includes('step') || lowerName.includes('dodge') || lowerName.includes('flurry')) {
    return 25;
  }

  // Heavy Strike / strong offensive skill: 35 Rage
  if (
    lowerName.includes('strike') || 
    lowerName.includes('swings') || 
    lowerName.includes('blow') || 
    lowerName.includes('impact') || 
    lowerName.includes('breaker') || 
    lowerName.includes('crusher')
  ) {
    return 35;
  }
  
  // Fallback to existing data cost if present, else standard 20
  return costFromData > 0 ? costFromData : 20;
}
