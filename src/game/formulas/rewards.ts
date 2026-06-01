import type { Enemy } from '../types';
import { lootTables } from '../../data/lootTables';

type LootTablesData = {
  enemyLoot?: Array<{
    enemy_name: string;
    gold_min: string;
    gold_max: string;
  }>;
  bossLoot?: Array<{
    boss_name: string;
    gold_min: string;
    gold_max: string;
  }>;
};

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
export function getEnemyGoldReward(enemy: Enemy, random: () => number = Math.random): number {
  let gold = 0;

  const typedLootTables = lootTables as unknown as LootTablesData;
  const bossLootData = typedLootTables.bossLoot?.find((entry) => entry.boss_name === enemy.name);
  if (bossLootData) {
    const min = parseInt(bossLootData.gold_min, 10);
    const max = parseInt(bossLootData.gold_max, 10);
    if (!isNaN(min) && !isNaN(max)) {
      gold = Math.floor(random() * (max - min + 1)) + min;
    }
  }

  const lootData = typedLootTables.enemyLoot?.find((el) => el.enemy_name === enemy.name);
  if (gold === 0 && lootData) {
    const min = parseInt(lootData.gold_min, 10);
    const max = parseInt(lootData.gold_max, 10);
    if (!isNaN(min) && !isNaN(max)) {
      gold = Math.floor(random() * (max - min + 1)) + min;
    }
  }

  if (gold === 0) {
    // 2. Try direct gold property from enemy data
    if (typeof enemy.gold === 'number' && enemy.gold > 0) {
      gold = enemy.gold;
    } else {
      // 3. Fallback level-based calculation
      const level = typeof enemy.level === 'number' && enemy.level > 0 ? enemy.level : 1;
      gold = level * 5;
    }
  }

  // Scale the final rolled gold if the enemy has been scaled
  if (enemy.isScaled && typeof enemy.levelDiff === 'number' && enemy.levelDiff > 0) {
    gold = Math.round(gold * Math.pow(1.10, enemy.levelDiff));
  }

  return gold;
}
