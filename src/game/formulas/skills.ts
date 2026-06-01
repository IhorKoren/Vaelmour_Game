import type { Skill } from '../types';

/**
 * Gets the hero level required to unlock a skill.
 * Resolves level from skill data, defaulting to 1.
 */
export function getSkillUnlockLevel(skill: Skill): number {
  return skill.level ?? 1;
}

/**
 * Determines whether a skill is unlocked for a given hero level.
 */
export function isSkillUnlocked(heroLevel: number, skill: Skill): boolean {
  return heroLevel >= getSkillUnlockLevel(skill);
}

/**
 * Filters a list of skills to only include those unlocked by the hero level.
 */
export function getUnlockedSkills(heroLevel: number, allSkills: Skill[]): Skill[] {
  return allSkills.filter((skill) => isSkillUnlocked(heroLevel, skill));
}

/**
 * Returns skills newly unlocked when transitioning from previousLevel to newLevel.
 */
export function getNewlyUnlockedSkills(
  previousLevel: number,
  newLevel: number,
  allSkills: Skill[]
): Skill[] {
  if (newLevel <= previousLevel) {
    return [];
  }
  return allSkills.filter((skill) => {
    const requiredLevel = getSkillUnlockLevel(skill);
    return requiredLevel > previousLevel && requiredLevel <= newLevel;
  });
}

/**
 * Diagnoses why a skill is unavailable for use.
 * Returns:
 * - 'level' if the hero level is too low
 * - 'rage' if the hero has the required level but not enough Rage
 * - null if the skill is fully available
 */
export function getSkillLockReason(
  heroLevel: number,
  heroRage: number,
  skill: Skill,
  rageCost: number
): 'level' | 'rage' | null {
  if (!isSkillUnlocked(heroLevel, skill)) {
    return 'level';
  }
  if (heroRage < rageCost) {
    return 'rage';
  }
  return null;
}
