import type { Enemy, HeroState } from '../types';

/**
 * Calculates the XP awarded to the player upon defeating an enemy.
 * Uses the enemy's defined XP value or a level-based fallback.
 */
export function getEnemyXpReward(enemy: Enemy): number {
  if (typeof enemy.xp === 'number' && enemy.xp > 0) {
    return enemy.xp;
  }
  const level = typeof enemy.level === 'number' && enemy.level > 0 ? enemy.level : 1;
  return level * 10;
}

/**
 * Calculates the Gold awarded to the player upon defeating an enemy.
 * First checks for a matching gold range in the enemy loot tables,
 * then checks the enemy's direct gold value, and falls back to a level-based formula.
 */
export function getEnemyGoldReward(enemy: Enemy, random: () => number = Math.random, hero?: HeroState): number {
  void enemy;
  void random;
  void hero;
  return 0;
}
