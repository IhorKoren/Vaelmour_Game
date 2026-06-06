/**
 * Pure helper functions for displaying combat status and checking combat conditions.
 */

/**
 * Checks if the hero's health is too low to start a new encounter (below 20% of max HP).
 */
export function isHeroHpTooLow(currentHp: number, maxHp: number): boolean {
  if (maxHp <= 0) return true;
  return currentHp < maxHp * 0.20;
}

/**
 * Calculates the health percentage of the hero.
 */
export function getHpPercent(currentHp: number, maxHp: number): number {
  if (maxHp <= 0) return 0;
  return Math.round((currentHp / maxHp) * 100);
}
