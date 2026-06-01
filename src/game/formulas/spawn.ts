import type { Enemy } from '../types';

/**
 * Deterministically (via weighted random logic) selects an enemy from a location's enemy ID pool.
 * If the pool is empty, invalid, or matching enemy IDs do not exist in the database,
 * it returns a safe default fallback enemy to prevent app crashes.
 */
export function selectWeightedEnemy(
  enemyIdsPool: string[],
  allEnemies: Enemy[],
  random: () => number = Math.random
): Enemy {
  // Safe validation guard
  if (!allEnemies || allEnemies.length === 0) {
    throw new Error("No enemies database provided");
  }

  if (!enemyIdsPool || enemyIdsPool.length === 0) {
    return allEnemies[0];
  }

  // Filter the full enemies database to only include those present in the pool
  const matchedEnemies = allEnemies.filter((enemy) => enemyIdsPool.includes(enemy.id));

  // If no enemies match the database, return the first one as a safety fallback
  if (matchedEnemies.length === 0) {
    return allEnemies[0];
  }

  // Calculate weights sum
  let totalWeight = 0;
  const weights = matchedEnemies.map((enemy) => {
    // Fallback to weight 1 if missing, negative, or invalid
    const weight = typeof enemy.spawnWeight === 'number' && enemy.spawnWeight > 0
      ? enemy.spawnWeight
      : 1;
    totalWeight += weight;
    return weight;
  });

  // Roll random index
  const roll = random() * totalWeight;
  let currentSum = 0;

  for (let i = 0; i < matchedEnemies.length; i++) {
    currentSum += weights[i];
    if (roll <= currentSum) {
      return matchedEnemies[i];
    }
  }

  // Final fallback index cover
  return matchedEnemies[matchedEnemies.length - 1];
}
